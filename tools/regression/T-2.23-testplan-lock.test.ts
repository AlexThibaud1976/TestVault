// T-2.23 -- TestPlan Lock/Unlock UI regression guard (Sprint 2.23 CHECKPOINT B).
//
// Pre-Sprint 2.23 state : TestPlanFormView already had full create/edit mode
// (useTestPlanDetail hook + update path). What was missing was the
// Lock/Unlock UX on top of the SDK's already-implemented lock() / unlock()
// methods.
//
// Sprint 2.23 wires :
//   - Display the Test Plan state (Draft / Locked / Closed) as a badge.
//   - Lock button visible on Draft plans, calls testPlanService.lock(planId).
//   - Unlock button visible on Locked plans (placeholder for Admin role
//     check -- TECH-DEBT for this sprint).
//   - When state is Locked, the edit affordances (inputs, Save button) are
//     disabled with a tooltip / inline note.
//
// Structural guard only. RTL behaviour lives in TestPlanFormView.test.tsx.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const TP_FORM_VIEW = resolve(
	ROOT,
	"apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx"
);

describe("T-2.23 -- TestPlanFormView Lock/Unlock regression guard", () => {
	it("TestPlanFormView consumes testPlanService.lock for the Lock action", () => {
		const src = readFileSync(TP_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testPlanService\.lock\b/);
	});

	it("TestPlanFormView consumes testPlanService.unlock for the Unlock action", () => {
		const src = readFileSync(TP_FORM_VIEW, "utf-8");
		expect(src).toMatch(/testPlanService\.unlock\b/);
	});

	it("TestPlanFormView exposes Lock and Unlock testids", () => {
		const src = readFileSync(TP_FORM_VIEW, "utf-8");
		expect(src).toMatch(/tp-lock-btn/);
		expect(src).toMatch(/tp-unlock-btn/);
	});

	it("TestPlanFormView reads the plan state from the loaded Test Plan", () => {
		const src = readFileSync(TP_FORM_VIEW, "utf-8");
		// We expect a planState local variable / state derived from
		// existingPlan.state (Draft / Locked / Closed).
		expect(src).toMatch(/planState|currentState|existingPlan\.state/);
	});
});
