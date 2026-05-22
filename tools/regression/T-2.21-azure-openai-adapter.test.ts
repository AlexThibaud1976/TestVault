import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 Azure OpenAI adapter regression.
// Ensures the provider implementation is correct and respects security constraints.

const ROOT = resolve(__dirname, "../..");
const AZURE_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/azure-openai-provider.ts");

describe("T-2.21 Azure OpenAI adapter", () => {
	it("file exists and has content", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("uses api-key header (Azure auth pattern, not Bearer)", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("api-key");
	});

	it("does not use Authorization Bearer header", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toMatch(/Authorization.*Bearer/);
	});

	it("targets /openai/deployments/ endpoint", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("/openai/deployments/");
	});

	it("uses api-version=2024-02-01", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("2024-02-01");
	});

	it("sets max_tokens in request body", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("max_tokens");
	});

	it("uses response_format json_object for structured output", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("json_object");
	});

	it("throws on non-ok HTTP response", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toMatch(/response\.ok|res\.ok/);
		expect(src).toMatch(/throw\s+new\s+Error/);
	});

	it("does NOT log to console (no API key leakage via logs)", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toMatch(/console\.(log|info|debug)\s*\(/);
	});

	it("does NOT use localStorage or sessionStorage", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toContain("localStorage");
		expect(src).not.toContain("sessionStorage");
	});

	it("isConfigured checks apiKey, endpoint and deploymentName", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("apiKey");
		expect(src).toContain("endpoint");
		expect(src).toContain("deploymentName");
	});

	it("has validateConfig method", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).toContain("validateConfig");
	});
});
