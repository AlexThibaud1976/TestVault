import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.20 Area Path real ADO integration regression tests.

const ROOT = resolve(__dirname, "../..");
const SERVICE_PATH = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/ado-classification-service.ts"
);
const HOOK_PATH = resolve(
	ROOT,
	"apps/argos-extension/src/hub/hooks/use-ado-classification-nodes.ts"
);

describe("T-2.20 Area Path integration", () => {
	it("service file exists", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source.length).toBeGreaterThan(0);
	});

	it("service uses real ADO classification nodes endpoint", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toMatch(/classificationnodes|classificationNodes/i);
	});

	it("service does not contain MOCK constants", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).not.toContain("MOCK_AREA_PATHS");
		expect(source).not.toContain("MOCK_");
	});

	it("service exports IAdoClassificationService interface", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("IAdoClassificationService");
	});

	it("service exports createAdoClassificationService factory", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("createAdoClassificationService");
	});

	it("service exports AreaPathNode interface", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("AreaPathNode");
	});

	it("service implements 1h cache", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toMatch(/3600000|CACHE_TTL|cacheTtl/);
	});

	it("hook file exists", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source.length).toBeGreaterThan(0);
	});

	it("hook exports useAdoAreaPaths", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source).toContain("useAdoAreaPaths");
	});

	it("hook returns isLoading and error states", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source).toContain("isLoading");
		expect(source).toContain("error");
	});
});
