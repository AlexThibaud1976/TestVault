import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Sprint 2.19.1 hotfix: TF51005 regression guard.
// Verifies that listExecutions() uses resolved ADO field names (Custom.TestVaultX)
// instead of raw schema names (TestVault.X) in its WIQL query string.
// See: TECH-DEBT-070 for test-case-version-service (same latent pattern, not yet fixed).

describe("T-2.19.1 test-execution-service WIQL field name resolution", () => {
	const root = resolve(__dirname, "../..");
	const svcPath = resolve(root, "packages/argos-sdk/src/test-execution-service.ts");

	it("imports schemaToAdoFieldRefName from @atconseil/argos-wit-schema", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).toContain("schemaToAdoFieldRefName");
		expect(src).toContain("@atconseil/argos-wit-schema");
	});

	it("does not hardcode [TestVault.TestCaseId] in WIQL string", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).not.toContain("[TestVault.TestCaseId]");
	});

	it("does not hardcode [TestVault.Environment] in WIQL string", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).not.toContain("[TestVault.Environment]");
	});

	it("does not hardcode [TestVault.GlobalStatus] in WIQL string", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).not.toContain("[TestVault.GlobalStatus]");
	});

	it("uses schemaToAdoFieldRefName call for TestVault.TestCaseId", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).toContain('schemaToAdoFieldRefName("TestVault.TestCaseId")');
	});

	it("guards testCaseId > 0 before including it in WIQL (no AND field = 0)", () => {
		const src = readFileSync(svcPath, "utf8");
		expect(src).toContain("testCaseId > 0");
	});
});
