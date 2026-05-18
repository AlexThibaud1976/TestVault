import { describe, expect, it } from "vitest";
import {
	findSchemaWitByAdoRefName,
	isArgosField,
	isArgosWit,
	schemaToAdoFieldName,
	schemaToAdoFieldRefName,
	schemaToAdoStateName,
	schemaWitRefNameToAdoSuffix,
	validateAdoFieldName,
	validateAdoStateName,
} from "./naming.js";

describe("schemaWitRefNameToAdoSuffix", () => {
	it("strips 'TestVault.' prefix and returns suffix", () => {
		expect(schemaWitRefNameToAdoSuffix("TestVault.TestCase")).toBe("TestVaultTestCase");
		expect(schemaWitRefNameToAdoSuffix("TestVault.TestPlan")).toBe("TestVaultTestPlan");
		expect(schemaWitRefNameToAdoSuffix("TestVault.AuditLog")).toBe("TestVaultAuditLog");
	});

	it("throws for non-TestVault schema refNames", () => {
		expect(() => schemaWitRefNameToAdoSuffix("System.Bug")).toThrow("TestVault.");
		expect(() => schemaWitRefNameToAdoSuffix("")).toThrow();
	});
});

describe("isArgosWit (Sprint 2.10 + Sprint 2.15)", () => {
	it("matches ADO refName with dynamic process prefix", () => {
		expect(isArgosWit("ArgosInheritedDemo.TestVaultTestCase")).toBe(true);
		expect(isArgosWit("MyOtherProcess.TestVaultTestPlan")).toBe(true);
		expect(isArgosWit("BCEE.TestVaultAuditLog")).toBe(true);
		expect(isArgosWit("SomeOrg123.TestVaultTestCaseVersion")).toBe(true);
	});

	it("matches direct schema refName (for tests / internal use)", () => {
		expect(isArgosWit("TestVault.TestCase")).toBe(true);
		expect(isArgosWit("TestVault.TestPlan")).toBe(true);
		expect(isArgosWit("TestVault.TestCaseVersion")).toBe(true);
	});

	it("rejects non-Argos ADO refNames", () => {
		expect(isArgosWit("Microsoft.VSTS.WorkItemTypes.Bug")).toBe(false);
		expect(isArgosWit("MyProcess.OtherCustomType")).toBe(false);
		expect(isArgosWit("System.WorkItemTypes.Task")).toBe(false);
	});

	it("rejects unknown schema refNames", () => {
		expect(isArgosWit("TestVault.UnknownType")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isArgosWit("")).toBe(false);
	});
});

describe("findSchemaWitByAdoRefName (Sprint 2.15)", () => {
	it("resolves ADO refName with process prefix to schema WIT", () => {
		const wit = findSchemaWitByAdoRefName("ArgosInheritedDemo.TestVaultTestCase");
		expect(wit).toBeDefined();
		expect(wit?.referenceName).toBe("TestVault.TestCase");
	});

	it("resolves direct schema refName", () => {
		const wit = findSchemaWitByAdoRefName("TestVault.TestPlan");
		expect(wit).toBeDefined();
		expect(wit?.referenceName).toBe("TestVault.TestPlan");
	});

	it("returns undefined for non-Argos refName", () => {
		expect(findSchemaWitByAdoRefName("Microsoft.VSTS.WorkItemTypes.Bug")).toBeUndefined();
		expect(findSchemaWitByAdoRefName("")).toBeUndefined();
	});
});

describe("schemaToAdoFieldRefName (Sprint 2.11)", () => {
	it("translates TestVault. field to Custom.TestVault prefix", () => {
		expect(schemaToAdoFieldRefName("TestVault.Priority")).toBe("Custom.TestVaultPriority");
		expect(schemaToAdoFieldRefName("TestVault.TestCaseRef")).toBe("Custom.TestVaultTestCaseRef");
	});

	it("passes through System.* and Microsoft.* fields unchanged", () => {
		expect(schemaToAdoFieldRefName("System.Title")).toBe("System.Title");
		expect(schemaToAdoFieldRefName("Microsoft.VSTS.Common.Priority")).toBe(
			"Microsoft.VSTS.Common.Priority"
		);
	});
});

describe("isArgosField", () => {
	it("returns true for Custom.TestVault fields", () => {
		expect(isArgosField("Custom.TestVaultPriority")).toBe(true);
		expect(isArgosField("Custom.TestVaultSeverity")).toBe(true);
	});

	it("returns false for non-custom fields", () => {
		expect(isArgosField("System.Title")).toBe(false);
		expect(isArgosField("Microsoft.VSTS.Common.Priority")).toBe(false);
		expect(isArgosField("Custom.OtherField")).toBe(false);
	});
});

describe("schemaToAdoFieldName (Sprint 2.13)", () => {
	it("prefixes display name with 'TestVault '", () => {
		expect(schemaToAdoFieldName("Priority")).toBe("TestVault Priority");
		expect(schemaToAdoFieldName("Severity")).toBe("TestVault Severity");
	});

	it("is idempotent — no double prefix", () => {
		expect(schemaToAdoFieldName("TestVault Priority")).toBe("TestVault Priority");
	});

	it("throws for empty display name", () => {
		expect(() => schemaToAdoFieldName("")).toThrow("Empty");
		expect(() => schemaToAdoFieldName("   ")).toThrow("Empty");
	});

	it("throws for name exceeding 100 chars", () => {
		expect(() => schemaToAdoFieldName("X".repeat(101))).toThrow("100 chars");
	});
});

describe("schemaToAdoStateName (Sprint 2.14)", () => {
	it("prefixes state name with 'TestVault '", () => {
		expect(schemaToAdoStateName("Active")).toBe("TestVault Active");
		expect(schemaToAdoStateName("Draft")).toBe("TestVault Draft");
		expect(schemaToAdoStateName("Closed")).toBe("TestVault Closed");
	});

	it("is idempotent — no double prefix", () => {
		expect(schemaToAdoStateName("TestVault Active")).toBe("TestVault Active");
	});

	it("throws for empty state name", () => {
		expect(() => schemaToAdoStateName("")).toThrow("Empty");
	});

	it("throws for name exceeding 100 chars", () => {
		expect(() => schemaToAdoStateName("X".repeat(101))).toThrow("100 chars");
	});
});

describe("validateAdoFieldName & validateAdoStateName", () => {
	it("returns null for valid names", () => {
		expect(validateAdoFieldName("TestVault Priority")).toBeNull();
		expect(validateAdoStateName("TestVault Active")).toBeNull();
	});

	it("returns error for names exceeding 128 chars", () => {
		const longName = "X".repeat(129);
		expect(validateAdoFieldName(longName)).toContain("128");
		expect(validateAdoStateName(longName)).toContain("128");
	});

	it("returns error for forbidden characters", () => {
		expect(validateAdoFieldName("Test.Field")).toContain("forbidden");
		expect(validateAdoFieldName("Priority;Value")).toContain("forbidden");
		expect(validateAdoStateName("Active|Done")).toContain("forbidden");
	});
});
