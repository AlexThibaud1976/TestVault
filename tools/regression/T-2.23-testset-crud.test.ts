// T-2.23 -- TestSet CRUD regression guard (Sprint 2.23 CHECKPOINT A).
//
// Pre-Sprint 2.23 state : TestSetFormView already handled create mode +
// inline TC composition via `tcIdInput` + `Add` button. The `setId` prop
// was declared but ignored (setId: _setId), so opening an existing
// TestSet showed an empty form.
//
// Sprint 2.23 wires the edit mode :
//   - When setId is defined, the view fetches the existing TestSet via
//     testSetService.read(setId), populates name / description / tags /
//     linkedTcIds.
//   - Submit switches to testSetService.update(id, patch).
//   - Loading state (testset-form-loading) + error state (testset-form-error).
//
// Structural guard only. RTL behaviour lives in TestSetFormView.test.tsx.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const TS_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestSetFormView.tsx");

describe("T-2.23 -- TestSetFormView edit mode regression guard", () => {
	it("TestSetFormView no longer ignores the setId prop", () => {
		const src = readFileSync(TS_FORM_VIEW, "utf-8");
		expect(src).not.toMatch(/setId:\s*_setId/);
	});

	it("TestSetFormView consumes testSetService.read for the edit mode", () => {
		const src = readFileSync(TS_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testSetService\.read/);
	});

	it("TestSetFormView exposes loading and error states", () => {
		const src = readFileSync(TS_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testset-form-loading|isLoadingTestSet/);
		expect(src).toMatch(/testset-form-error|loadError/);
	});

	it("TestSetFormView uses testSetService.update when editing", () => {
		const src = readFileSync(TS_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testSetService\.update/);
	});
});
