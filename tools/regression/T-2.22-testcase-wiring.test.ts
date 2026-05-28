// T-2.22 -- TestCase wiring regression guard (Sprint 2.22).
//
// Sprint 2.22 wires TestCaseFormView to load an existing Test Case by id
// (the caseId prop was declared but ignored in earlier sprints). The view
// now distinguishes:
//   - Create mode  : caseId === undefined -> empty form, "Create Test Case"
//   - Edit mode    : caseId set            -> fetches via testCaseService.read,
//                                             populates the form, shows
//                                             loading and error states.
//
// Structural guard only. RTL behaviour lives in TestCaseFormView.test.tsx.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");
const APP = resolve(ROOT, "apps/argos-extension/src/hub/App.tsx");

describe("T-2.22 -- TestCase wiring regression guard", () => {
	it("TestCaseFormView no longer ignores the caseId prop", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		// The earlier sprint accepted `caseId: _caseId` (intentionally unused).
		// After Sprint 2.22 the prop is consumed -- the leading underscore
		// pattern must be gone.
		expect(src).not.toMatch(/caseId:\s*_caseId/);
		expect(src).toMatch(/caseId/);
	});

	it("TestCaseFormView consumes testCaseService.read for the edit mode", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		// Read call wired through useServices().testCaseService.
		expect(src).toMatch(/testCaseService\.read/);
	});

	it("TestCaseFormView exposes loading and error states for the fetch", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/tc-form-loading|isLoadingTestCase/);
		expect(src).toMatch(/tc-form-error|loadError/);
	});

	it("hub App.tsx still routes test-case-form to TestCaseFormView with caseId", () => {
		const src = readFileSync(APP, "utf-8");
		expect(src).toContain("TestCaseFormView");
		expect(src).toMatch(/caseId/);
	});
});
