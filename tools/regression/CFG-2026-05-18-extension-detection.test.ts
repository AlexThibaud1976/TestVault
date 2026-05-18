import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG extension detection Sprint 2.15", () => {
	const root = resolve(__dirname, "../..");

	it("argos-wit-schema/src/naming.ts exports isArgosWit + findSchemaWitByAdoRefName", () => {
		const content = readFileSync(resolve(root, "packages/argos-wit-schema/src/naming.ts"), "utf8");
		expect(content).toContain("isArgosWit");
		expect(content).toContain("findSchemaWitByAdoRefName");
		expect(content).toContain("schemaToAdoFieldRefName");
		expect(content).toContain("schemaToAdoStateName");
	});

	it("argos-wit-schema/src/index.ts re-exports from naming.js", () => {
		const content = readFileSync(resolve(root, "packages/argos-wit-schema/src/index.ts"), "utf8");
		expect(content).toContain("./naming.js");
		expect(content).toContain("isArgosWit");
	});

	it("argos-detection-api imports from @atconseil/argos-wit-schema not argos-sdk", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-detection-api/src/wit-schema-reader.ts"),
			"utf8"
		);
		expect(content).toContain("@atconseil/argos-wit-schema");
		expect(content).toContain("isArgosWit");
		expect(content).not.toContain('from "@atconseil/argos-sdk"');
	});

	it("argos-detection-api package.json depends on argos-wit-schema", () => {
		const pkg = JSON.parse(
			readFileSync(resolve(root, "packages/argos-detection-api/package.json"), "utf8")
		);
		const deps = { ...pkg.dependencies, ...pkg.devDependencies };
		expect(deps["@atconseil/argos-wit-schema"]).toBeDefined();
	});

	it("argos-detection-api uses TestVault.TestCaseVersion (not TestPlanEntry)", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-detection-api/src/wit-schema-reader.ts"),
			"utf8"
		);
		expect(content).toContain("TestVault.TestCaseVersion");
		expect(content).not.toContain("TestPlanEntry");
	});

	it("argos-extension services.ts uses isArgosWit for detection (not exact match)", () => {
		const content = readFileSync(resolve(root, "apps/argos-extension/src/hub/services.ts"), "utf8");
		expect(content).toContain("isArgosWit");
		expect(content).not.toContain('"TestVault.TestCase"');
	});

	it("argos-extension package.json depends on argos-wit-schema", () => {
		const pkg = JSON.parse(
			readFileSync(resolve(root, "apps/argos-extension/package.json"), "utf8")
		);
		const deps = { ...pkg.dependencies, ...pkg.devDependencies };
		expect(deps["@atconseil/argos-wit-schema"]).toBeDefined();
	});
});
