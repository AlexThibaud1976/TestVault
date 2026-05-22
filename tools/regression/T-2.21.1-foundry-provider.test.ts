import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21.1 Azure AI Foundry provider regression.
// Verifies the Foundry provider implementation is correct and meets security constraints.

const ROOT = resolve(__dirname, "../..");
const FOUNDRY_PROVIDER = resolve(
	ROOT,
	"apps/argos-extension/src/hub/llm/azure-ai-foundry-provider.ts"
);

describe("T-2.21.1 AzureAIFoundryProvider", () => {
	it("file exists and has content", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("exports AzureAIFoundryProvider", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("AzureAIFoundryProvider");
	});

	it("exports normalizeFoundryEndpoint function", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("normalizeFoundryEndpoint");
		expect(src).toContain("export function normalizeFoundryEndpoint");
	});

	it("has isConfigured method", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("isConfigured");
	});

	it("has validateConfig method", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("validateConfig");
	});

	it("has generateTestCases method", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("generateTestCases");
	});

	it("uses api-key header (Azure auth pattern, not Bearer)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("api-key");
	});

	it("does not use Authorization Bearer header", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).not.toMatch(/Authorization.*Bearer/);
	});

	it("uses /chat/completions endpoint (Foundry format, not /deployments/)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("/chat/completions");
	});

	it("does NOT use /openai/deployments/ path (that is Azure OpenAI classic only)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).not.toContain("/openai/deployments/");
	});

	it("does NOT use api-version query parameter (Foundry uses /v1 in path instead)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).not.toContain("api-version=");
	});

	it("passes deploymentName as model parameter in body (Foundry pattern)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("model:");
		expect(src).toContain("deploymentName");
	});

	it("sets max_tokens in request body", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("max_tokens");
	});

	it("uses response_format json_object for structured output", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("json_object");
	});

	it("throws on non-ok HTTP response", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toMatch(/response\.ok/);
		expect(src).toMatch(/throw\s+new\s+Error/);
	});

	it("does NOT log to console (no API key leakage via logs)", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).not.toMatch(/console\.(log|info|debug)\s*\(/);
	});

	it("does NOT use localStorage or sessionStorage", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).not.toContain("localStorage");
		expect(src).not.toContain("sessionStorage");
	});

	it("has AbortController timeout for generation calls", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("AbortController");
		expect(src).toContain("GENERATION_TIMEOUT_MS");
	});

	it("readonly name is azure-ai-foundry", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain('"azure-ai-foundry"');
	});
});
