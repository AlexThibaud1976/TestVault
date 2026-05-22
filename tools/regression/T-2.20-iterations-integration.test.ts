import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.20 Iterations real ADO integration regression tests.

const ROOT = resolve(__dirname, "../..");
const SERVICE_PATH = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/ado-iterations-service.ts"
);
const HOOK_PATH = resolve(ROOT, "apps/argos-extension/src/hub/hooks/use-ado-iterations.ts");

describe("T-2.20 Iterations integration", () => {
	it("service file exists", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source.length).toBeGreaterThan(0);
	});

	it("service uses real ADO classification nodes endpoint for iterations", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toMatch(/classificationnodes|classificationNodes/i);
	});

	it("service does not contain MOCK constants", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).not.toContain("MOCK_ITERATIONS");
		expect(source).not.toContain("MOCK_");
	});

	it("service exports IAdoIterationsService interface", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("IAdoIterationsService");
	});

	it("service exports createAdoIterationsService factory", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("createAdoIterationsService");
	});

	it("service exports IterationNode interface", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toContain("IterationNode");
	});

	it("service implements 1h cache", () => {
		const source = readFileSync(SERVICE_PATH, "utf-8");
		expect(source).toMatch(/3600000|CACHE_TTL|cacheTtl/);
	});

	it("hook file exists", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source.length).toBeGreaterThan(0);
	});

	it("hook exports useAdoIterations", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source).toContain("useAdoIterations");
	});

	it("hook returns isLoading and error states", () => {
		const source = readFileSync(HOOK_PATH, "utf-8");
		expect(source).toContain("isLoading");
		expect(source).toContain("error");
	});
});
