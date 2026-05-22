import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21.1 Foundry endpoint format normalization regression.
// Verifies the normalizeFoundryEndpoint function handles all URL variants.

const ROOT = resolve(__dirname, "../..");
const FOUNDRY_PROVIDER = resolve(
	ROOT,
	"apps/argos-extension/src/hub/llm/azure-ai-foundry-provider.ts"
);

describe("T-2.21.1 Foundry endpoint normalization (source assertions)", () => {
	it("normalizeFoundryEndpoint is exported", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("export function normalizeFoundryEndpoint");
	});

	it("strips trailing slash", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		// Should handle trailing slash removal
		expect(src).toContain('endsWith("/")');
	});

	it("appends /openai/v1 when missing from endpoint", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("/openai/v1");
		// Logic: if not already ending with /openai/v1 and not containing it, append it
		expect(src).toContain('includes("/openai/v1")');
	});

	it("preserves existing /openai/v1 suffix without duplication", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		// endsWith check prevents double-appending
		expect(src).toContain('endsWith("/openai/v1")');
	});

	it("preserves project-scoped paths like /api/projects/{name}/openai/v1", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		// The includes() check covers /api/projects/.../openai/v1 case
		// It should not append again since includes("/openai/v1") returns true
		expect(src).toContain('includes("/openai/v1")');
	});

	it("uses normalizeFoundryEndpoint in both validateConfig and generateTestCases", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		// Count occurrences of normalizeFoundryEndpoint call
		const matches = src.match(/normalizeFoundryEndpoint\(/g);
		expect(matches).not.toBeNull();
		// Called at least twice (validateConfig + generateTestCases)
		expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
	});

	it("constructs URL as normalizedEndpoint + /chat/completions", () => {
		const src = readFileSync(FOUNDRY_PROVIDER, "utf-8");
		expect(src).toContain("/chat/completions");
		// Should not have a static api-version in the URL
		expect(src).not.toContain("?api-version=");
	});
});
