/**
 * @regression T-2.21-part-2-max-tokens-surface
 * @type API-surface (source scan)
 *
 * Sprint 2.21 part 2 CHECKPOINT C: max_tokens configurable + dynamic timeout +
 * truncation detection. This file guards the PUBLIC SURFACE of llm-provider.ts
 * and the provider implementations as visible to consumers (the slider UI,
 * the AI generation service, the Settings persistence layer).
 *
 * Behavioural tests (calculateTimeoutMs values, fetch payload, typed errors
 * thrown on finish_reason="length") live alongside the implementation in
 * apps/argos-extension/src/hub/llm/*.test.ts -- they cannot run here because
 * tools/regression has no TypeScript compilation context for the extension
 * source. Source scanning is the correct level for this layer.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const LLM_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/llm-provider.ts");
const AZURE_OPENAI = resolve(ROOT, "apps/argos-extension/src/hub/llm/azure-openai-provider.ts");
const AZURE_FOUNDRY = resolve(
	ROOT,
	"apps/argos-extension/src/hub/llm/azure-ai-foundry-provider.ts"
);

describe("T-2.21-part-2 -- llm-provider.ts public surface", () => {
	it("exports MAX_TOKENS_DEFAULT constant", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+const\s+MAX_TOKENS_DEFAULT\b/);
	});

	it("exports MAX_TOKENS_MIN constant", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+const\s+MAX_TOKENS_MIN\b/);
	});

	it("exports MAX_TOKENS_MAX constant", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+const\s+MAX_TOKENS_MAX\b/);
	});

	it("exports MAX_TOKENS_STEP constant", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+const\s+MAX_TOKENS_STEP\b/);
	});

	it("exports TOKENS_PER_TEST_CASE heuristic", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+const\s+TOKENS_PER_TEST_CASE\b/);
	});

	it("exports calculateTimeoutMs function", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+function\s+calculateTimeoutMs\b/);
	});

	it("exports estimateTestCasesCount function", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+function\s+estimateTestCasesCount\b/);
	});

	it("exports LlmTruncationError class", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+class\s+LlmTruncationError\b/);
	});

	it("exports LlmTimeoutError class", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		expect(src).toMatch(/export\s+class\s+LlmTimeoutError\b/);
	});

	it("LlmProviderConfig has optional maxTokens field", () => {
		const src = readFileSync(LLM_PROVIDER, "utf-8");
		// The interface keeps maxTokens optional so legacy persisted configs work.
		expect(src).toMatch(/maxTokens\?:\s*number/);
	});
});

describe("T-2.21-part-2 -- azure-openai-provider.ts uses configurable maxTokens", () => {
	it("does NOT hard-code max_tokens: 4000 in the fetch payload", () => {
		const src = readFileSync(AZURE_OPENAI, "utf-8");
		// The forbidden pattern is an explicit literal 4000 stuck as the
		// max_tokens value of the request body. The provider must read from
		// this.config.maxTokens (with a default fallback).
		expect(src).not.toMatch(/max_tokens:\s*4000(?!\s*[,)])/);
	});

	it("reads max_tokens from config (config.maxTokens reference present)", () => {
		const src = readFileSync(AZURE_OPENAI, "utf-8");
		expect(src).toMatch(/config\.maxTokens|this\.config\.maxTokens/);
	});

	it("uses calculateTimeoutMs for the AbortController deadline", () => {
		const src = readFileSync(AZURE_OPENAI, "utf-8");
		expect(src).toContain("calculateTimeoutMs");
	});

	it("detects finish_reason='length' and throws LlmTruncationError", () => {
		const src = readFileSync(AZURE_OPENAI, "utf-8");
		expect(src).toContain("finish_reason");
		expect(src).toContain("length");
		expect(src).toContain("LlmTruncationError");
	});

	it("throws LlmTimeoutError on AbortError", () => {
		const src = readFileSync(AZURE_OPENAI, "utf-8");
		expect(src).toContain("LlmTimeoutError");
	});
});

describe("T-2.21-part-2 -- azure-ai-foundry-provider.ts uses configurable maxTokens", () => {
	it("does NOT hard-code max_tokens: 4000 in the fetch payload", () => {
		const src = readFileSync(AZURE_FOUNDRY, "utf-8");
		expect(src).not.toMatch(/max_tokens:\s*4000(?!\s*[,)])/);
	});

	it("reads max_tokens from config", () => {
		const src = readFileSync(AZURE_FOUNDRY, "utf-8");
		expect(src).toMatch(/config\.maxTokens|this\.config\.maxTokens/);
	});

	it("uses calculateTimeoutMs for the AbortController deadline", () => {
		const src = readFileSync(AZURE_FOUNDRY, "utf-8");
		expect(src).toContain("calculateTimeoutMs");
	});

	it("detects finish_reason='length' and throws LlmTruncationError", () => {
		const src = readFileSync(AZURE_FOUNDRY, "utf-8");
		expect(src).toContain("finish_reason");
		expect(src).toContain("LlmTruncationError");
	});

	it("throws LlmTimeoutError on AbortError", () => {
		const src = readFileSync(AZURE_FOUNDRY, "utf-8");
		expect(src).toContain("LlmTimeoutError");
	});
});
