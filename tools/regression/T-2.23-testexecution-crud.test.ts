// T-2.23 -- TestExecution CRUD regression guard (Sprint 2.23 CHECKPOINT D).
//
// Pre-Sprint 2.23 state : TestExecutionFormView handled the manual run
// (create) path. The executionId prop was declared but ignored
// (executionId: _executionId), so opening an existing TestExecution
// showed a blank create form instead of a read-only display.
//
// Sprint 2.23 wires :
//   - Display-only mode when executionId is set. NO Save / Update / Edit
//     button. Constitution S3.5 immutability (TestExecution is never
//     PATCHed after creation).
//   - Re-run button on display mode creates a new TestExecution
//     (delegates to routing.goToTestExecutionForm without executionId
//     but with the testCaseId from the loaded execution).
//   - Run button in TestCaseFormView edit mode navigates to the form.
//   - computeGlobalStatus exported from argos-sdk as a pure helper.
//
// Structural guard only.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const TE_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestExecutionFormView.tsx");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");
const SDK_EXEC = resolve(ROOT, "packages/argos-sdk/src/test-execution-service.ts");

describe("T-2.23 -- TestExecution CRUD regression guard", () => {
	it("TestExecutionFormView no longer ignores the executionId prop", () => {
		const src = readFileSync(TE_FORM_VIEW, "utf-8");
		expect(src).not.toMatch(/executionId:\s*_executionId/);
	});

	it("TestExecutionFormView consumes testExecutionService.getById/read for display mode", () => {
		const src = readFileSync(TE_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testExecutionService\s*\.\s*(read|getById)/);
	});

	it("TestExecutionFormView display mode renders a Re-run button (data-testid=te-rerun-btn)", () => {
		const src = readFileSync(TE_FORM_VIEW, "utf-8");
		expect(src).toMatch(/te-rerun-btn/);
	});

	it("TestCaseFormView edit mode renders a Run Test button (data-testid=tc-run-btn)", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/tc-run-btn/);
	});

	it("argos-sdk exports computeGlobalStatus as a public pure helper", () => {
		const src = readFileSync(SDK_EXEC, "utf-8");
		expect(src).toMatch(/export\s+function\s+computeGlobalStatus/);
	});
});
