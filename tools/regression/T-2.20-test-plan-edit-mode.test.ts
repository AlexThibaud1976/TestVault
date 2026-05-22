import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.20 Test Plan edit mode regression tests.

const ROOT = resolve(__dirname, "../..");
const FORM_VIEW = resolve(
	ROOT,
	"apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx"
);
const LIST_VIEW = resolve(
	ROOT,
	"apps/argos-extension/src/hub/views/test-plans/TestPlansListView.tsx"
);
const DETAIL_HOOK = resolve(ROOT, "apps/argos-extension/src/hub/hooks/use-test-plan-detail.ts");
const APP = resolve(ROOT, "apps/argos-extension/src/hub/App.tsx");

describe("T-2.20 Test Plan edit mode", () => {
	it("use-test-plan-detail hook exists", () => {
		const source = readFileSync(DETAIL_HOOK, "utf-8");
		expect(source.length).toBeGreaterThan(0);
	});

	it("use-test-plan-detail exports useTestPlanDetail", () => {
		const source = readFileSync(DETAIL_HOOK, "utf-8");
		expect(source).toContain("useTestPlanDetail");
	});

	it("use-test-plan-detail returns isLoading state", () => {
		const source = readFileSync(DETAIL_HOOK, "utf-8");
		expect(source).toContain("isLoading");
	});

	it("TestPlanFormView accepts planId prop", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toContain("planId");
	});

	it("TestPlanFormView has edit-mode title string", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toContain("Edit Test Plan");
	});

	it("TestPlanFormView has Save changes button text", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toContain("Save changes");
	});

	it("TestPlanFormView calls update for edit mode", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toMatch(/\.update\s*\(/);
	});

	it("TestPlanFormView calls create for new mode", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toMatch(/\.create\s*\(/);
	});

	it("TestPlansListView accepts onEditPlan prop", () => {
		const source = readFileSync(LIST_VIEW, "utf-8");
		expect(source).toContain("onEditPlan");
	});

	it("App.tsx passes planId to TestPlanFormView", () => {
		const source = readFileSync(APP, "utf-8");
		expect(source).toContain("planId");
	});

	it("App.tsx wires onEditPlan to TestPlansListView", () => {
		const source = readFileSync(APP, "utf-8");
		expect(source).toContain("onEditPlan");
	});
});
