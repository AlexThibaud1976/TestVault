import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 LLM config encryption regression.
// Ensures API keys are never stored in clear text and never logged.
// Privacy-by-design: direct browser-to-LLM, no Argos proxy.

const ROOT = resolve(__dirname, "../..");
const LLM_CONFIG_SERVICE = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/llm-config-service.ts"
);
const AZURE_PROVIDER = resolve(ROOT, "apps/argos-extension/src/hub/llm/azure-openai-provider.ts");
const USE_LLM_CONFIG = resolve(ROOT, "apps/argos-extension/src/hub/hooks/use-llm-config.ts");
const AI_GEN_SERVICE = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/ai-generation-service.ts"
);

describe("T-2.21 LLM config encryption (security regression)", () => {
	it("llm-config-service.ts does not use localStorage", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).not.toContain("localStorage");
	});

	it("llm-config-service.ts does not use sessionStorage", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).not.toContain("sessionStorage");
	});

	it("llm-config-service.ts uses extension data client (ADO encrypted storage)", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).toMatch(/dataClient|extensionDataClient|IExtensionDataClient/);
	});

	it("llm-config-service.ts exports ILlmConfigService", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).toContain("ILlmConfigService");
	});

	it("llm-config-service.ts exports createLlmConfigService", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).toContain("createLlmConfigService");
	});

	it("llm-config-service.ts has getConfig, setConfig, clearConfig methods", () => {
		const src = readFileSync(LLM_CONFIG_SERVICE, "utf-8");
		expect(src).toContain("getConfig");
		expect(src).toContain("setConfig");
		expect(src).toContain("clearConfig");
	});

	it("azure-openai-provider.ts does not use localStorage", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toContain("localStorage");
	});

	it("azure-openai-provider.ts does not use sessionStorage", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toContain("sessionStorage");
	});

	it("azure-openai-provider.ts does not log to console", () => {
		const src = readFileSync(AZURE_PROVIDER, "utf-8");
		expect(src).not.toMatch(/console\.(log|info|debug|warn)\s*\(/);
	});

	it("use-llm-config.ts does not use localStorage", () => {
		const src = readFileSync(USE_LLM_CONFIG, "utf-8");
		expect(src).not.toContain("localStorage");
	});

	it("use-llm-config.ts exports useLlmConfig", () => {
		const src = readFileSync(USE_LLM_CONFIG, "utf-8");
		expect(src).toContain("useLlmConfig");
	});

	it("ai-generation-service.ts does not hardcode API keys", () => {
		const src = readFileSync(AI_GEN_SERVICE, "utf-8");
		expect(src).not.toMatch(/apiKey\s*=\s*["'][^"']{8,}/);
	});

	it("ai-generation-service.ts does not use localStorage", () => {
		const src = readFileSync(AI_GEN_SERVICE, "utf-8");
		expect(src).not.toContain("localStorage");
	});
});
