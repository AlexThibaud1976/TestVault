import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21.1 No-regression on Azure OpenAI Service (classic).
// Sprint 2.21 part 1 delivered AzureOpenAIProvider. This sprint must not break it.

const ROOT = resolve(__dirname, "../..");
const AZURE_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/azure-openai-provider.ts");
const FACTORY = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider-factory.ts");
const CONFIG_SERVICE = resolve(ROOT, "apps/argos-extension/src/hub/services/llm-config-service.ts");

describe("T-2.21.1 No regression on Azure OpenAI Service (Sprint 2.21 part 1)", () => {
	it("AzureOpenAIProvider file still exists", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("AzureOpenAIProvider still uses /openai/deployments/ URL pattern", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("/openai/deployments/");
	});

	it("AzureOpenAIProvider still uses api-version=2024-02-01", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("2024-02-01");
	});

	it("AzureOpenAIProvider still uses api-key header", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("api-key");
	});

	it("AzureOpenAIProvider still has isConfigured, validateConfig, generateTestCases", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("isConfigured");
		expect(src).toContain("validateConfig");
		expect(src).toContain("generateTestCases");
	});

	it("AzureOpenAIProvider still does NOT use localStorage or sessionStorage", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toContain("localStorage");
		expect(src).not.toContain("sessionStorage");
	});

	it("AzureOpenAIProvider still does NOT log to console", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toMatch(/console\.(log|info|debug)\s*\(/);
	});

	it("factory still has azure-openai case routing to AzureOpenAIProvider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain('"azure-openai"');
		expect(src).toContain("AzureOpenAIProvider");
	});

	it("factory azure-openai case NOT removed and NOT broken", () => {
		const src = readFileSync(FACTORY, "utf-8");
		// azure-openai appears before azure-ai-foundry in the switch (backward compat first)
		const azureOpenAiIdx = src.indexOf('"azure-openai"');
		const foundryIdx = src.indexOf('"azure-ai-foundry"');
		expect(azureOpenAiIdx).toBeGreaterThan(-1);
		expect(foundryIdx).toBeGreaterThan(-1);
		expect(azureOpenAiIdx).toBeLessThan(foundryIdx);
	});

	it("LlmConfigService getConfig defaults missing provider to azure-openai (backward compat)", () => {
		const src = readFileSync(CONFIG_SERVICE, "utf-8");
		// Should handle configs saved before Sprint 2.21.1 (no provider field)
		expect(src).toContain("azure-openai");
		expect(src).toContain("provider");
	});
});
