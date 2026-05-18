import { describe, expect, it } from "vitest";
import { findSchemaWitByAdoRefName, isArgosWit } from "./wit-refname-matcher.js";

describe("isArgosWit", () => {
	it("matches ADO refName generated from TestVault schema entries", () => {
		expect(isArgosWit("ArgosInheritedDemo.TestVaultTestCase", "TestVault.TestCase")).toBe(true);
		expect(isArgosWit("AnyProcess.TestVaultTestPlan", "TestVault.TestPlan")).toBe(true);
		expect(isArgosWit("X.TestVaultPrecondition", "TestVault.Precondition")).toBe(true);
		expect(isArgosWit("X.TestVaultTestCaseVersion", "TestVault.TestCaseVersion")).toBe(true);
		expect(isArgosWit("X.TestVaultAuditLog", "TestVault.AuditLog")).toBe(true);
		expect(isArgosWit("X.TestVaultTestSet", "TestVault.TestSet")).toBe(true);
		expect(isArgosWit("X.TestVaultTestExecution", "TestVault.TestExecution")).toBe(true);
	});

	it("does not match Microsoft native WITs", () => {
		expect(isArgosWit("Microsoft.VSTS.WorkItemTypes.TestCase", "TestVault.TestCase")).toBe(false);
		expect(isArgosWit("Microsoft.TestPlan", "TestVault.TestPlan")).toBe(false);
	});

	it("does not match custom WITs without TestVault prefix in ado part", () => {
		expect(isArgosWit("AnyProcess.MyTestCase", "TestVault.TestCase")).toBe(false);
		expect(isArgosWit("AnyProcess.TestCaseSomething", "TestVault.TestCase")).toBe(false);
		expect(isArgosWit("AnyProcess.OtherTestVaultTestCase", "TestVault.TestCase")).toBe(false);
	});

	it("requires schema refName to start with TestVault.", () => {
		expect(isArgosWit("X.TestVaultTestCase", "Other.TestCase")).toBe(false);
		expect(isArgosWit("X.TestVaultTestCase", "")).toBe(false);
	});

	it("requires exactly 2 dot-separated parts in ado refName", () => {
		expect(isArgosWit("X.Y.Z.TestVaultTestCase", "TestVault.TestCase")).toBe(false);
		expect(isArgosWit("NoDotsHere", "TestVault.TestCase")).toBe(false);
	});

	it("is case-sensitive", () => {
		expect(isArgosWit("X.testVaultTestCase", "TestVault.TestCase")).toBe(false);
		expect(isArgosWit("X.TestVaulttestcase", "TestVault.TestCase")).toBe(false);
	});
});

describe("findSchemaWitByAdoRefName", () => {
	const schemaWits = [
		{ referenceName: "TestVault.TestCase" },
		{ referenceName: "TestVault.TestPlan" },
		{ referenceName: "TestVault.AuditLog" },
	];

	it("finds the matching schema entry from an ADO refName", () => {
		const result = findSchemaWitByAdoRefName("SomeProcess.TestVaultTestPlan", schemaWits);
		expect(result?.referenceName).toBe("TestVault.TestPlan");
	});

	it("finds TestCase entry", () => {
		const result = findSchemaWitByAdoRefName("ArgosInheritedDemo.TestVaultTestCase", schemaWits);
		expect(result?.referenceName).toBe("TestVault.TestCase");
	});

	it("returns undefined if no match", () => {
		expect(findSchemaWitByAdoRefName("SomeProcess.SomethingElse", schemaWits)).toBeUndefined();
	});

	it("returns undefined for empty array", () => {
		expect(findSchemaWitByAdoRefName("X.TestVaultTestCase", [])).toBeUndefined();
	});
});
