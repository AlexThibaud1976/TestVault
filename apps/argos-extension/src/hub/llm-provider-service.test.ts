import { describe, expect, it, vi } from "vitest";
import { type IAiSettingsStore, createLlmProviderService } from "./llm-provider-service.js";
import type { LlmProvider } from "./llm-provider-service.js";

function makeStore(providers: LlmProvider[] = []): IAiSettingsStore {
	return {
		getAll: vi.fn().mockResolvedValue(providers),
		set: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		getFlag: vi.fn().mockResolvedValue(false),
		setFlag: vi.fn().mockResolvedValue(undefined),
	};
}

describe("LlmProviderService", () => {
	it("list returns all providers from store", async () => {
		const p: LlmProvider = {
			id: "p1",
			type: "anthropic",
			label: "Claude",
			modelId: "claude-haiku-4-5-20251001",
			maskedKey: "****ABCD",
			isActive: true,
			addedAt: "2026-01-01T00:00:00Z",
			addedBy: "admin",
		};
		const svc = createLlmProviderService(makeStore([p]));
		const providers = await svc.list();
		expect(providers).toHaveLength(1);
		expect(providers[0]?.id).toBe("p1");
	});

	it("add stores provider and returns it with masked key", async () => {
		const store = makeStore();
		const svc = createLlmProviderService(store);
		const result = await svc.add({
			type: "openai",
			label: "GPT-4",
			modelId: "gpt-4.1",
			apiKey: "sk-proj-xxxx-WXYZ",
		});
		expect(result.maskedKey.endsWith("WXYZ")).toBe(true);
		expect(result.maskedKey).not.toContain("sk-proj");
		expect(vi.mocked(store.set)).toHaveBeenCalledWith(
			"llm-providers",
			expect.objectContaining({ type: "openai", label: "GPT-4" })
		);
	});

	it("add sets isActive to true", async () => {
		const svc = createLlmProviderService(makeStore());
		const result = await svc.add({
			type: "anthropic",
			label: "Claude",
			modelId: "claude-haiku-4-5-20251001",
			apiKey: "sk-ant-test-1234",
		});
		expect(result.isActive).toBe(true);
	});

	it("add sets addedAt to ISO timestamp", async () => {
		const svc = createLlmProviderService(makeStore());
		const result = await svc.add({
			type: "anthropic",
			label: "Claude",
			modelId: "claude-haiku-4-5-20251001",
			apiKey: "sk-ant-test-1234",
		});
		expect(() => new Date(result.addedAt).toISOString()).not.toThrow();
	});

	it("remove calls store.delete with provider id", async () => {
		const store = makeStore();
		const svc = createLlmProviderService(store);
		await svc.remove("p1");
		expect(vi.mocked(store.delete)).toHaveBeenCalledWith("llm-providers", "p1");
	});

	it("testConnection returns success result", async () => {
		const svc = createLlmProviderService(makeStore());
		const result = await svc.testConnection("p1");
		expect(result.success).toBe(true);
		expect(typeof result.message).toBe("string");
	});

	it("masked key shows last 4 chars only", async () => {
		const svc = createLlmProviderService(makeStore());
		const result = await svc.add({
			type: "anthropic",
			label: "Claude",
			modelId: "claude-haiku-4-5-20251001",
			apiKey: "sk-anthropic-key-ENDS",
		});
		expect(result.maskedKey).toMatch(/^\*+ENDS$/);
	});

	it("add stores baseUrl when provided for Azure OpenAI", async () => {
		const store = makeStore();
		const svc = createLlmProviderService(store);
		const result = await svc.add({
			type: "azure-openai",
			label: "Azure GPT",
			modelId: "gpt-4",
			apiKey: "azure-key-1234",
			baseUrl: "https://mycompany.openai.azure.com",
		});
		expect(result.baseUrl).toBe("https://mycompany.openai.azure.com");
	});
});
