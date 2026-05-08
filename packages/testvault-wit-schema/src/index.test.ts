import { describe, expect, it } from "vitest";
import {
	AUDIT_LOG_WIT,
	PRECONDITION_WIT,
	TESTVAULT_SCHEMA,
	TEST_CASE_VERSION_WIT,
	TEST_CASE_WIT,
	TEST_EXECUTION_WIT,
	TEST_PLAN_WIT,
	TEST_SET_WIT,
} from "./index.js";
import { TestvaultSchemaSchema, WitDefinitionSchema } from "./model.js";

const ALL_WITS = [
	TEST_CASE_WIT,
	TEST_PLAN_WIT,
	TEST_SET_WIT,
	PRECONDITION_WIT,
	TEST_EXECUTION_WIT,
	TEST_CASE_VERSION_WIT,
	AUDIT_LOG_WIT,
];

// ─── Structural invariants ────────────────────────────────────────────────────

describe("WIT definitions — structural validity", () => {
	it("all 7 WIT definitions pass WitDefinitionSchema validation", () => {
		for (const wit of ALL_WITS) {
			expect(() => WitDefinitionSchema.parse(wit), `${wit.referenceName} failed`).not.toThrow();
		}
	});

	it("all referenceName values are prefixed 'TestVault.'", () => {
		for (const wit of ALL_WITS) {
			expect(wit.referenceName).toMatch(/^TestVault\./);
		}
	});

	it("all 7 referenceName values are unique", () => {
		const names = ALL_WITS.map((w) => w.referenceName);
		expect(new Set(names).size).toBe(7);
	});

	it("every WIT includes System.Title as a required string field", () => {
		for (const wit of ALL_WITS) {
			const f = wit.fields.find((f) => f.referenceName === "System.Title");
			expect(f, `${wit.referenceName} missing System.Title`).toBeDefined();
			expect(f!.required).toBe(true);
			expect(f!.type).toBe("string");
		}
	});

	it("every WIT has at least one state", () => {
		for (const wit of ALL_WITS) {
			expect(wit.states.length, `${wit.referenceName} has no states`).toBeGreaterThanOrEqual(1);
		}
	});

	it("state colors are valid hex", () => {
		for (const wit of ALL_WITS) {
			for (const state of wit.states) {
				expect(state.color, `${wit.referenceName}/${state.name}`).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		}
	});

	it("WIT colors are valid hex", () => {
		for (const wit of ALL_WITS) {
			expect(wit.color).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});
});

// ─── TestCase ────────────────────────────────────────────────────────────────

describe("TestVault.TestCase", () => {
	it("has exactly 5 states: Design / Ready / Active / Closed / Deprecated", () => {
		const names = TEST_CASE_WIT.states.map((s) => s.name);
		expect(names).toHaveLength(5);
		expect(names).toEqual(
			expect.arrayContaining(["Design", "Ready", "Active", "Closed", "Deprecated"])
		);
	});

	it("Priority is a picklistInteger with allowed values [1,2,3,4] and default 3", () => {
		const f = TEST_CASE_WIT.fields.find((f) => f.referenceName === "TestVault.Priority");
		expect(f).toBeDefined();
		expect(f!.type).toBe("picklistInteger");
		expect(f!.allowedValues).toEqual([1, 2, 3, 4]);
		expect(f!.defaultValue).toBe(3);
	});

	it("AutomationStatus is a picklistString with Manual/Planned/Automated, default Manual", () => {
		const f = TEST_CASE_WIT.fields.find((f) => f.referenceName === "TestVault.AutomationStatus");
		expect(f).toBeDefined();
		expect(f!.type).toBe("picklistString");
		expect(f!.allowedValues).toEqual(["Manual", "Planned", "Automated"]);
		expect(f!.defaultValue).toBe("Manual");
	});

	it("Steps and PreconditionLinks are longText fields", () => {
		const steps = TEST_CASE_WIT.fields.find((f) => f.referenceName === "TestVault.Steps");
		const precond = TEST_CASE_WIT.fields.find(
			(f) => f.referenceName === "TestVault.PreconditionLinks"
		);
		expect(steps!.type).toBe("longText");
		expect(precond!.type).toBe("longText");
	});

	it("System.AreaPath is a required treePath field", () => {
		const f = TEST_CASE_WIT.fields.find((f) => f.referenceName === "System.AreaPath");
		expect(f!.type).toBe("treePath");
		expect(f!.required).toBe(true);
	});
});

// ─── TestPlan ─────────────────────────────────────────────────────────────────

describe("TestVault.TestPlan", () => {
	it("has exactly 3 states: Draft / Locked / Closed", () => {
		const names = TEST_PLAN_WIT.states.map((s) => s.name);
		expect(names).toHaveLength(3);
		expect(names).toEqual(expect.arrayContaining(["Draft", "Locked", "Closed"]));
	});

	it("Environments, TestSetIds, AdditionalTestCaseIds are longText fields", () => {
		for (const refName of [
			"TestVault.Environments",
			"TestVault.TestSetIds",
			"TestVault.AdditionalTestCaseIds",
		]) {
			const f = TEST_PLAN_WIT.fields.find((f) => f.referenceName === refName);
			expect(f, `missing ${refName}`).toBeDefined();
			expect(f!.type).toBe("longText");
		}
	});
});

// ─── TestSet ──────────────────────────────────────────────────────────────────

describe("TestVault.TestSet", () => {
	it("has TestCaseIds as a longText field", () => {
		const f = TEST_SET_WIT.fields.find((f) => f.referenceName === "TestVault.TestCaseIds");
		expect(f!.type).toBe("longText");
	});

	it("has optional WiqlQuery as a longText field", () => {
		const f = TEST_SET_WIT.fields.find((f) => f.referenceName === "TestVault.WiqlQuery");
		expect(f!.type).toBe("longText");
		expect(f!.required).toBe(false);
	});
});

// ─── TestExecution ────────────────────────────────────────────────────────────

describe("TestVault.TestExecution", () => {
	it("is marked isImmutableAfterCreate", () => {
		expect(TEST_EXECUTION_WIT.isImmutableAfterCreate).toBe(true);
	});

	it("GlobalStatus is a picklistString with Pass/Fail/Blocked/Unexecuted/Skipped", () => {
		const f = TEST_EXECUTION_WIT.fields.find((f) => f.referenceName === "TestVault.GlobalStatus");
		expect(f).toBeDefined();
		expect(f!.type).toBe("picklistString");
		expect(f!.allowedValues).toEqual(["Pass", "Fail", "Blocked", "Unexecuted", "Skipped"]);
	});

	it("ExecutionSource is a picklistString with Manual/CI", () => {
		const f = TEST_EXECUTION_WIT.fields.find(
			(f) => f.referenceName === "TestVault.ExecutionSource"
		);
		expect(f!.type).toBe("picklistString");
		expect(f!.allowedValues).toEqual(["Manual", "CI"]);
	});

	it("StepResults is a longText field", () => {
		const f = TEST_EXECUTION_WIT.fields.find((f) => f.referenceName === "TestVault.StepResults");
		expect(f!.type).toBe("longText");
	});

	it("TestCaseId is a required integer field", () => {
		const f = TEST_EXECUTION_WIT.fields.find((f) => f.referenceName === "TestVault.TestCaseId");
		expect(f!.type).toBe("integer");
		expect(f!.required).toBe(true);
	});
});

// ─── TestCaseVersion ──────────────────────────────────────────────────────────

describe("TestVault.TestCaseVersion", () => {
	it("is marked isImmutableAfterCreate", () => {
		expect(TEST_CASE_VERSION_WIT.isImmutableAfterCreate).toBe(true);
	});

	it("FrozenFields is a longText field", () => {
		const f = TEST_CASE_VERSION_WIT.fields.find(
			(f) => f.referenceName === "TestVault.FrozenFields"
		);
		expect(f!.type).toBe("longText");
	});

	it("ParentTestCaseId is a required integer field", () => {
		const f = TEST_CASE_VERSION_WIT.fields.find(
			(f) => f.referenceName === "TestVault.ParentTestCaseId"
		);
		expect(f!.type).toBe("integer");
		expect(f!.required).toBe(true);
	});
});

// ─── AuditLog ─────────────────────────────────────────────────────────────────

describe("TestVault.AuditLog", () => {
	it("is marked isImmutableAfterCreate", () => {
		expect(AUDIT_LOG_WIT.isImmutableAfterCreate).toBe(true);
	});

	it("Operation picklist contains all 14 defined operations", () => {
		const f = AUDIT_LOG_WIT.fields.find((f) => f.referenceName === "TestVault.Operation");
		expect(f).toBeDefined();
		expect(f!.type).toBe("picklistString");
		expect(f!.allowedValues).toHaveLength(14);
	});

	it("ContextMetadata is a longText field", () => {
		const f = AUDIT_LOG_WIT.fields.find((f) => f.referenceName === "TestVault.ContextMetadata");
		expect(f!.type).toBe("longText");
	});
});

// ─── TESTVAULT_SCHEMA bundle ──────────────────────────────────────────────────

describe("TESTVAULT_SCHEMA", () => {
	it("passes TestvaultSchemaSchema validation", () => {
		expect(() => TestvaultSchemaSchema.parse(TESTVAULT_SCHEMA)).not.toThrow();
	});

	it("contains exactly 7 WITs", () => {
		expect(TESTVAULT_SCHEMA.wits).toHaveLength(7);
	});

	it("contains all 7 expected referenceName values", () => {
		const refs = TESTVAULT_SCHEMA.wits.map((w) => w.referenceName);
		expect(refs).toEqual(
			expect.arrayContaining([
				"TestVault.TestCase",
				"TestVault.TestPlan",
				"TestVault.TestSet",
				"TestVault.Precondition",
				"TestVault.TestExecution",
				"TestVault.TestCaseVersion",
				"TestVault.AuditLog",
			])
		);
	});

	it("version is a semver string", () => {
		expect(TESTVAULT_SCHEMA.version).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("generatedAt is a valid ISO datetime", () => {
		expect(() => new Date(TESTVAULT_SCHEMA.generatedAt)).not.toThrow();
		expect(new Date(TESTVAULT_SCHEMA.generatedAt).toISOString()).toBe(TESTVAULT_SCHEMA.generatedAt);
	});
});
