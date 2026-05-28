// T-2.23 -- Precondition CRUD regression guard (Sprint 2.23 CHECKPOINT C).
//
// Pre-Sprint 2.23 state : PreconditionFormView already handled create
// mode. The preconditionId prop was declared but ignored
// (preconditionId: _preconditionId), so opening an existing Precondition
// showed an empty form.
//
// Sprint 2.23 wires :
//   - Edit mode : fetch via preconditionService.read(id), populate
//     title / description / tags / area path.
//   - Submit switches to preconditionService.update(id, patch).
//   - Loading state (precondition-form-loading) + error state.
//   - TestCaseFormView gains a read-only "Preconditions" section that
//     lists the linked preconditions by id (TestVault.PreconditionLinks
//     JSON, Option A from plan.md S3.3).
//
// Structural guard only.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const PC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/PreconditionFormView.tsx");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");

describe("T-2.23 -- Precondition CRUD regression guard", () => {
	it("PreconditionFormView no longer ignores the preconditionId prop", () => {
		const src = readFileSync(PC_FORM_VIEW, "utf-8");
		expect(src).not.toMatch(/preconditionId:\s*_preconditionId/);
	});

	it("PreconditionFormView consumes preconditionService.read for the edit mode", () => {
		const src = readFileSync(PC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/preconditionService\.read/);
	});

	it("PreconditionFormView exposes loading and error states", () => {
		const src = readFileSync(PC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/precondition-form-loading|isLoadingPrecondition/);
		expect(src).toMatch(/precondition-form-error|loadError/);
	});

	it("PreconditionFormView uses preconditionService.update when editing", () => {
		const src = readFileSync(PC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/preconditionService\.update/);
	});

	it("TestCaseFormView renders a 'Preconditions' display section that consumes preconditionLinks", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toMatch(/preconditionLinks/);
		expect(src).toContain("Preconditions");
	});
});
