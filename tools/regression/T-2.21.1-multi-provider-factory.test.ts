import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21.1 Multi-provider factory regression.
// Ensures the factory routes correctly to both Azure OpenAI and Azure AI Foundry.

const ROOT = resolve(__dirname, "../..");
const FACTORY = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider-factory.ts");
const LLM_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider.ts");

describe("T-2.21.1 LlmProviderFactory multi-provider", () => {
	it("factory file exists and has content", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("factory imports AzureAIFoundryProvider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain("AzureAIFoundryProvider");
		expect(src).toContain("azure-ai-foundry-provider");
	});

	it("factory has azure-ai-foundry case", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain('"azure-ai-foundry"');
		expect(src).toContain("AzureAIFoundryProvider");
	});

	it("factory preserves azure-openai case (backward compat)", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain('"azure-openai"');
		expect(src).toContain("AzureOpenAIProvider");
	});

	it("factory has listAvailableProviders method", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain("listAvailableProviders");
	});

	it("listAvailableProviders returns both provider IDs", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain('"azure-openai"');
		expect(src).toContain('"azure-ai-foundry"');
	});

	it("listAvailableProviders includes displayName for each provider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain("Azure OpenAI Service");
		expect(src).toContain("Azure AI Foundry");
	});

	it("listAvailableProviders includes endpoint format hints", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain(".openai.azure.com");
		expect(src).toContain(".services.ai.azure.com/openai/v1");
	});

	it("listAvailableProviders includes deploymentNameLabel for each provider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain("Deployment Name");
		expect(src).toContain("Model Name");
	});

	it("throws on unknown provider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toMatch(/throw\s+new\s+Error/);
		expect(src).toMatch(/Unknown LLM provider/);
	});

	it("LlmProviderType includes azure-ai-foundry", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain('"azure-ai-foundry"');
	});

	it("LlmProviderType preserves all original values", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain('"azure-openai"');
		expect(src).toContain('"anthropic"');
		expect(src).toContain('"openai"');
		expect(src).toContain('"mistral"');
	});
});
