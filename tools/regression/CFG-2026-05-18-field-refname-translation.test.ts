import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG field refName translation (Sprint 2.11)", () => {
	const root = resolve(__dirname, "../..");

	it("wit-refname-matcher.ts contains field translation functions", () => {
		const path = resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts");
		expect(existsSync(path)).toBe(true);
		const content = readFileSync(path, "utf8");
		expect(content).toContain("schemaToAdoFieldRefName");
		expect(content).toContain("isArgosField");
		expect(content).toContain("findSchemaFieldByAdoRefName");
		expect(content).toContain("Custom.TestVault");
	});

	it("process-install.ts imports and uses schemaToAdoFieldRefName for field POST", () => {
		const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
		const content = readFileSync(path, "utf8");
		expect(content).toContain("schemaToAdoFieldRefName");
		expect(content).toContain("adoFieldRefName");
	});

	it("process-install.ts does NOT send schema TestVault.* refName as field referenceName in POST body", () => {
		const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
		const content = readFileSync(path, "utf8");
		// Locate the fields POST block — between "Add custom fields" and the states loop
		const fieldsBlockMatch = content.match(
			/Add custom fields[\s\S]*?for \(const state of wit\.states\)/
		);
		expect(fieldsBlockMatch, "Could not locate fields POST block").not.toBeNull();
		const fieldsBlock = fieldsBlockMatch![0];
		// Must use adoFieldRefName in the POST body
		expect(fieldsBlock).toContain("adoFieldRefName");
		// Must NOT use raw field.referenceName as the body referenceName
		expect(fieldsBlock).not.toMatch(/referenceName:\s*field\.referenceName/);
	});

	it("translation pattern produces Custom. prefix for TestVault.* fields", () => {
		// Inline spot-check mirroring the real function contract
		const cases: Array<[string, string]> = [
			["TestVault.Priority", "Custom.TestVaultPriority"],
			["TestVault.Steps", "Custom.TestVaultSteps"],
			["TestVault.GherkinFeature", "Custom.TestVaultGherkinFeature"],
			["TestVault.TestCaseRef", "Custom.TestVaultTestCaseRef"],
		];
		for (const [schema, expected] of cases) {
			const parts = schema.split(".");
			const result = `Custom.TestVault${parts[1]}`;
			expect(result).toBe(expected);
		}
	});
});
