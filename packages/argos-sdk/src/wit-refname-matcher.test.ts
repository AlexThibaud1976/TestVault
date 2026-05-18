import { describe, expect, it } from "vitest";
import {
	findSchemaFieldByAdoRefName,
	findSchemaWitByAdoRefName,
	isArgosField,
	isArgosWit,
	schemaToAdoFieldRefName,
} from "./wit-refname-matcher.js";

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

// ─── Field refName translation (Sprint 2.11) ──────────────────────────────────

describe("schemaToAdoFieldRefName", () => {
	it("translates TestVault.* to Custom.TestVault* (camel-preserved)", () => {
		expect(schemaToAdoFieldRefName("TestVault.Priority")).toBe("Custom.TestVaultPriority");
		expect(schemaToAdoFieldRefName("TestVault.Severity")).toBe("Custom.TestVaultSeverity");
		expect(schemaToAdoFieldRefName("TestVault.Environment")).toBe("Custom.TestVaultEnvironment");
		expect(schemaToAdoFieldRefName("TestVault.Steps")).toBe("Custom.TestVaultSteps");
		expect(schemaToAdoFieldRefName("TestVault.TestCaseRef")).toBe("Custom.TestVaultTestCaseRef");
		expect(schemaToAdoFieldRefName("TestVault.GherkinFeature")).toBe(
			"Custom.TestVaultGherkinFeature"
		);
		expect(schemaToAdoFieldRefName("TestVault.AutomationStatus")).toBe(
			"Custom.TestVaultAutomationStatus"
		);
		expect(schemaToAdoFieldRefName("TestVault.EstimatedDuration")).toBe(
			"Custom.TestVaultEstimatedDuration"
		);
	});

	it("passes through System.* fields unchanged", () => {
		expect(schemaToAdoFieldRefName("System.Title")).toBe("System.Title");
		expect(schemaToAdoFieldRefName("System.Description")).toBe("System.Description");
		expect(schemaToAdoFieldRefName("System.State")).toBe("System.State");
		expect(schemaToAdoFieldRefName("System.AssignedTo")).toBe("System.AssignedTo");
	});

	it("passes through Microsoft.* fields unchanged", () => {
		expect(schemaToAdoFieldRefName("Microsoft.VSTS.Common.Priority")).toBe(
			"Microsoft.VSTS.Common.Priority"
		);
		expect(schemaToAdoFieldRefName("Microsoft.VSTS.TCM.Steps")).toBe("Microsoft.VSTS.TCM.Steps");
	});

	it("throws on invalid TestVault.* format (more than 2 parts)", () => {
		expect(() => schemaToAdoFieldRefName("TestVault.A.B")).toThrow(/Invalid schema field refName/);
		expect(() => schemaToAdoFieldRefName("TestVault.A.B.C")).toThrow(
			/Invalid schema field refName/
		);
	});

	it("throws on TestVault. with empty suffix", () => {
		expect(() => schemaToAdoFieldRefName("TestVault.")).toThrow();
	});
});

describe("isArgosField", () => {
	it("matches ADO refName generated from TestVault schema field", () => {
		expect(isArgosField("Custom.TestVaultPriority", "TestVault.Priority")).toBe(true);
		expect(isArgosField("Custom.TestVaultSteps", "TestVault.Steps")).toBe(true);
		expect(isArgosField("Custom.TestVaultGherkinFeature", "TestVault.GherkinFeature")).toBe(true);
		expect(isArgosField("Custom.TestVaultTestCaseRef", "TestVault.TestCaseRef")).toBe(true);
		expect(isArgosField("Custom.TestVaultSeverity", "TestVault.Severity")).toBe(true);
	});

	it("does not match wrong prefix", () => {
		expect(isArgosField("TestVault.Priority", "TestVault.Priority")).toBe(false);
		expect(isArgosField("Custom.Priority", "TestVault.Priority")).toBe(false);
		expect(isArgosField("MyOrg.TestVaultPriority", "TestVault.Priority")).toBe(false);
	});

	it("does not match wrong suffix", () => {
		expect(isArgosField("Custom.TestVaultSeverity", "TestVault.Priority")).toBe(false);
		expect(isArgosField("Custom.TestVaultPriorityX", "TestVault.Priority")).toBe(false);
		expect(isArgosField("Custom.TestVaultpriority", "TestVault.Priority")).toBe(false);
	});

	it("does not match System or Microsoft fields", () => {
		expect(isArgosField("System.Title", "TestVault.Priority")).toBe(false);
		expect(isArgosField("Microsoft.VSTS.Common.Priority", "TestVault.Priority")).toBe(false);
	});

	it("handles invalid schema refName gracefully (returns false, no throw)", () => {
		expect(isArgosField("Custom.TestVaultPriority", "TestVault.A.B")).toBe(false);
		expect(isArgosField("Custom.TestVaultPriority", "")).toBe(false);
	});
});

describe("findSchemaFieldByAdoRefName", () => {
	const schemaFields = [
		{ referenceName: "TestVault.Priority" },
		{ referenceName: "TestVault.Severity" },
		{ referenceName: "TestVault.Steps" },
		{ referenceName: "TestVault.GherkinFeature" },
		{ referenceName: "TestVault.AutomationStatus" },
	];

	it("finds matching schema entry from ADO refName", () => {
		expect(
			findSchemaFieldByAdoRefName("Custom.TestVaultSeverity", schemaFields)?.referenceName
		).toBe("TestVault.Severity");
		expect(findSchemaFieldByAdoRefName("Custom.TestVaultSteps", schemaFields)?.referenceName).toBe(
			"TestVault.Steps"
		);
		expect(
			findSchemaFieldByAdoRefName("Custom.TestVaultGherkinFeature", schemaFields)?.referenceName
		).toBe("TestVault.GherkinFeature");
		expect(
			findSchemaFieldByAdoRefName("Custom.TestVaultAutomationStatus", schemaFields)?.referenceName
		).toBe("TestVault.AutomationStatus");
	});

	it("returns undefined if no match", () => {
		expect(findSchemaFieldByAdoRefName("Custom.OtherField", schemaFields)).toBeUndefined();
		expect(findSchemaFieldByAdoRefName("System.Title", schemaFields)).toBeUndefined();
		expect(findSchemaFieldByAdoRefName("TestVault.Priority", schemaFields)).toBeUndefined();
	});

	it("returns undefined for empty array", () => {
		expect(findSchemaFieldByAdoRefName("Custom.TestVaultPriority", [])).toBeUndefined();
	});
});
