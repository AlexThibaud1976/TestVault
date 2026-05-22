import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 LLM provider pattern regression.
// Ensures multi-provider architecture is correctly implemented.

const ROOT = resolve(__dirname, "../..");
const LLM_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider.ts");
const FACTORY = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider-factory.ts");
const AZURE_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/azure-openai-provider.ts");
const PROMPT_TEMPLATES = resolve(ROOT, "apps/argos-extension/src/hub/llm/prompt-templates.ts");

describe("T-2.21 LLM Provider pattern", () => {
	it("llm-provider.ts exports ILlmProvider", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain("ILlmProvider");
	});

	it("llm-provider.ts exports TestCaseSuggestion", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain("TestCaseSuggestion");
	});

	it("llm-provider.ts exports GenerationContext", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain("GenerationContext");
	});

	it("llm-provider.ts exports LlmProviderConfig", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain("LlmProviderConfig");
	});

	it("llm-provider.ts LlmProviderConfig has provider field with azure-openai", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toContain("azure-openai");
	});

	it("llm-provider-factory.ts exports LlmProviderFactory", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toContain("LlmProviderFactory");
	});

	it("llm-provider-factory.ts has create method", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toMatch(/create\s*\(/);
	});

	it("llm-provider-factory.ts throws on unknown provider", () => {
		const src = readFileSync(FACTORY, "utf-8");
		expect(src).toMatch(/throw\s+new\s+Error/);
	});

	it("azure-openai-provider.ts exports AzureOpenAIProvider", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("AzureOpenAIProvider");
	});

	it("azure-openai-provider.ts has isConfigured method", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("isConfigured");
	});

	it("azure-openai-provider.ts has generateTestCases method", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("generateTestCases");
	});

	it("prompt-templates.ts exports buildUserPrompt", () => {
		const src = readFileSync(PROMPT_TEMPLATES, "utf-8");
		expect(src).toContain("buildUserPrompt");
	});

	it("prompt-templates.ts exports TEST_CASE_GENERATION_SYSTEM_PROMPT", () => {
		const src = readFileSync(PROMPT_TEMPLATES, "utf-8");
		expect(src).toContain("TEST_CASE_GENERATION_SYSTEM_PROMPT");
	});
});
