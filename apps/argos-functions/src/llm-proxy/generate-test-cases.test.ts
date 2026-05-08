import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { encryptApiKey } from "../shared/crypto.js";
import type { ILlmClient, TcCandidate } from "../shared/llm-client.js";
import type { IQuotaStore } from "../shared/quota.js";
import type { IProviderConfigStore, LlmGenerateRequest } from "./generate-test-cases.js";
import { handleGenerateTestCases } from "./generate-test-cases.js";

const MASTER_KEY = randomBytes(32);
const ORG_URL = "https://dev.azure.com/acme";

const CANDIDATES: TcCandidate[] = [
	{
		title: "Login with valid credentials",
		steps: [{ action: "Open login page", expected: "Login form visible" }],
		tags: ["smoke"],
	},
	{
		title: "Login with invalid credentials",
		steps: [{ action: "Enter wrong password", expected: "Error message shown" }],
		tags: [],
	},
];

function makeProviderStore(encrypted?: ReturnType<typeof encryptApiKey>): IProviderConfigStore {
	const enc = encrypted ?? encryptApiKey("sk-real-key", ORG_URL, MASTER_KEY, "admin");
	return {
		get: vi.fn().mockResolvedValue({
			id: "p1",
			type: "anthropic" as const,
			modelId: "claude-haiku-4-5-20251001",
			apiKeyEncrypted: enc,
		}),
	};
}

function makeQuotaStore(allowed = true): IQuotaStore {
	return {
		get: vi
			.fn()
			.mockResolvedValue(
				allowed
					? { used: 2, limit: 100, mode: "hard" as const, resetAt: "2026-06-01T00:00:00Z" }
					: { used: 100, limit: 100, mode: "hard" as const, resetAt: "2026-06-01T00:00:00Z" }
			),
		set: vi.fn().mockResolvedValue(undefined),
	};
}

function makeLlmClient(candidates: TcCandidate[] = CANDIDATES): ILlmClient {
	return {
		call: vi.fn().mockResolvedValue({
			content: JSON.stringify({ candidates }),
			usage: { inputTokens: 100, outputTokens: 200 },
		}),
	};
}

const BASE_REQUEST: LlmGenerateRequest = {
	orgUrl: ORG_URL,
	userId: "user-42",
	providerId: "p1",
	workItemTitle: "Login feature",
	workItemDescription: "As a user I want to log in so that I can access the system",
	params: { temperature: 0.3, maxTokens: 4000, count: 2 },
};

describe("handleGenerateTestCases", () => {
	it("returns candidates when all checks pass", async () => {
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(true),
			makeLlmClient(),
			MASTER_KEY
		);
		expect(result.status).toBe(200);
		expect(result.candidates).toHaveLength(2);
		expect(result.candidates[0]?.title).toBe("Login with valid credentials");
	});

	it("returns 402 when quota is exhausted in hard mode", async () => {
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(false),
			makeLlmClient(),
			MASTER_KEY
		);
		expect(result.status).toBe(402);
		expect(result.candidates).toBeUndefined();
	});

	it("includes quotaRemaining in successful response", async () => {
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(true),
			makeLlmClient(),
			MASTER_KEY
		);
		expect(typeof result.quotaRemaining).toBe("number");
	});

	it("returns 400 when work item description is too short", async () => {
		const result = await handleGenerateTestCases(
			{ ...BASE_REQUEST, workItemDescription: "short" },
			makeProviderStore(),
			makeQuotaStore(true),
			makeLlmClient(),
			MASTER_KEY
		);
		expect(result.status).toBe(400);
	});

	it("calls LLM client with correct provider type", async () => {
		const llm = makeLlmClient();
		await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(true),
			llm,
			MASTER_KEY
		);
		expect(vi.mocked(llm.call)).toHaveBeenCalledWith(
			expect.objectContaining({ provider: "anthropic" })
		);
	});

	it("retries once when LLM returns malformed JSON", async () => {
		const llm: ILlmClient = {
			call: vi
				.fn()
				.mockResolvedValueOnce({
					content: "not valid json",
					usage: { inputTokens: 50, outputTokens: 10 },
				})
				.mockResolvedValueOnce({
					content: JSON.stringify({ candidates: CANDIDATES }),
					usage: { inputTokens: 100, outputTokens: 200 },
				}),
		};
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(true),
			llm,
			MASTER_KEY
		);
		expect(result.status).toBe(200);
		expect(vi.mocked(llm.call)).toHaveBeenCalledTimes(2);
	});

	it("returns 502 when LLM fails after retry", async () => {
		const llm: ILlmClient = {
			call: vi.fn().mockResolvedValue({
				content: "always invalid json {{{{",
				usage: { inputTokens: 50, outputTokens: 10 },
			}),
		};
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			makeProviderStore(),
			makeQuotaStore(true),
			llm,
			MASTER_KEY
		);
		expect(result.status).toBe(502);
	});

	it("returns 404 when provider not found", async () => {
		const store: IProviderConfigStore = { get: vi.fn().mockResolvedValue(undefined) };
		const result = await handleGenerateTestCases(
			BASE_REQUEST,
			store,
			makeQuotaStore(true),
			makeLlmClient(),
			MASTER_KEY
		);
		expect(result.status).toBe(404);
	});
});
