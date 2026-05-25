import { afterEach, describe, expect, it, vi } from "vitest";
import { AzureOpenAIProvider } from "./azure-openai-provider.js";
import { LlmTruncationError, MAX_TOKENS_DEFAULT } from "./llm-provider.js";

// Sprint 2.21 part 2 CHECKPOINT C -- behavioural tests for the BCEE-QA
// truncation bug observed on 2026-05-22 (10 Test Cases with max_tokens=4000
// hard-coded -> response truncated -> "Parse error" leaked to UI).
// The provider MUST detect finish_reason="length" before parsing and throw a
// typed LlmTruncationError instead.

afterEach(() => {
	vi.restoreAllMocks();
});

function makeProvider(maxTokens?: number) {
	return new AzureOpenAIProvider({
		provider: "azure-openai",
		apiKey: "test-key",
		endpoint: "https://test.openai.azure.com",
		deploymentName: "gpt-4o-mini",
		maxTokens,
	});
}

function mockFetchTruncated(): void {
	vi.spyOn(global, "fetch").mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({
			choices: [
				{
					message: { content: '{"test_cases":[' /* truncated JSON */ },
					finish_reason: "length",
				},
			],
		}),
	} as unknown as Response);
}

function mockFetchOk() {
	return vi.spyOn(global, "fetch").mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({
			choices: [
				{
					message: {
						content: JSON.stringify({
							test_cases: [
								{
									title: "Sample TC",
									description: "d",
									priority: "P2",
									steps: [{ action: "a", expected: "e" }],
									tags: [],
									coverage_type: "happy_path",
								},
							],
						}),
					},
					finish_reason: "stop",
				},
			],
		}),
	} as unknown as Response);
}

describe("AzureOpenAIProvider -- truncation detection (BCEE-QA bug 2026-05-22)", () => {
	it("throws LlmTruncationError when fetch returns finish_reason='length'", async () => {
		mockFetchTruncated();
		const provider = makeProvider(4000);
		await expect(
			provider.generateTestCases({
				sourceWorkItem: {
					id: 1,
					type: "User Story",
					title: "Login flow",
					description: "Login with valid credentials",
				},
				targetCount: 10,
			})
		).rejects.toBeInstanceOf(LlmTruncationError);
	});

	it("does NOT leak the raw 'Parse error' to the caller when truncation occurs", async () => {
		mockFetchTruncated();
		const provider = makeProvider(4000);
		let thrown: Error | undefined;
		try {
			await provider.generateTestCases({
				sourceWorkItem: { id: 1, type: "User Story", title: "x", description: "x" },
			});
		} catch (e) {
			thrown = e as Error;
		}
		expect(thrown).toBeDefined();
		expect(thrown?.message ?? "").not.toMatch(/parse|JSON/i);
	});
});

describe("AzureOpenAIProvider -- max_tokens is configurable, not hard-coded", () => {
	it("sends config.maxTokens in the fetch payload when explicitly set", async () => {
		const fetchSpy = mockFetchOk();
		const provider = makeProvider(8000);
		await provider.generateTestCases({
			sourceWorkItem: { id: 1, type: "User Story", title: "x", description: "x" },
		});

		const call = fetchSpy.mock.calls[0];
		expect(call).toBeDefined();
		const init = call?.[1] as RequestInit | undefined;
		const body = JSON.parse(String(init?.body ?? "{}"));
		expect(body.max_tokens).toBe(8000);
	});

	it("falls back to MAX_TOKENS_DEFAULT (4000) when config.maxTokens is undefined", async () => {
		const fetchSpy = mockFetchOk();
		const provider = makeProvider(undefined);
		await provider.generateTestCases({
			sourceWorkItem: { id: 1, type: "User Story", title: "x", description: "x" },
		});

		const call = fetchSpy.mock.calls[0];
		const init = call?.[1] as RequestInit | undefined;
		const body = JSON.parse(String(init?.body ?? "{}"));
		expect(body.max_tokens).toBe(MAX_TOKENS_DEFAULT);
	});
});
