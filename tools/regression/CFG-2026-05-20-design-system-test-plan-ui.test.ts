import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG design system + Test Plan UI Sprint 2.18", () => {
	const root = resolve(__dirname, "../..");
	const ds = resolve(root, "apps/argos-extension/src/hub/design-system");
	const views = resolve(root, "apps/argos-extension/src/hub/views");
	const hooks = resolve(root, "apps/argos-extension/src/hub/hooks");

	// --- Design system components ---
	it("Button component exists", () => {
		expect(existsSync(resolve(ds, "components/Button.tsx"))).toBe(true);
	});

	it("Button exports primary/secondary/subtle/danger variants", () => {
		const c = readFileSync(resolve(ds, "components/Button.tsx"), "utf8");
		expect(c).toContain('"primary"');
		expect(c).toContain('"secondary"');
		expect(c).toContain('"subtle"');
		expect(c).toContain('"danger"');
	});

	it("Button exports small/medium/large sizes", () => {
		const c = readFileSync(resolve(ds, "components/Button.tsx"), "utf8");
		expect(c).toContain('"small"');
		expect(c).toContain('"medium"');
		expect(c).toContain('"large"');
	});

	it("Badge component exists", () => {
		expect(existsSync(resolve(ds, "components/Badge.tsx"))).toBe(true);
	});

	it("Badge exports all 5 variants in the BadgeKind type", () => {
		const c = readFileSync(resolve(ds, "components/Badge.tsx"), "utf8");
		expect(c).toContain('"neutral"');
		expect(c).toContain('"success"');
		expect(c).toContain('"warning"');
		expect(c).toContain('"error"');
		expect(c).toContain('"info"');
	});

	it("Badge supports dot prop", () => {
		const c = readFileSync(resolve(ds, "components/Badge.tsx"), "utf8");
		expect(c).toContain("ds-badge-dot");
	});

	it("FilterChip component exists", () => {
		expect(existsSync(resolve(ds, "components/FilterChip.tsx"))).toBe(true);
	});

	it("FilterChip supports active prop", () => {
		const c = readFileSync(resolve(ds, "components/FilterChip.tsx"), "utf8");
		expect(c).toContain("active");
	});

	it("Input component exists", () => {
		expect(existsSync(resolve(ds, "components/Input.tsx"))).toBe(true);
	});

	it("Input uses inputSize prop (not native size attr) to avoid HTML conflict", () => {
		const c = readFileSync(resolve(ds, "components/Input.tsx"), "utf8");
		expect(c).toContain("inputSize");
		expect(c).not.toContain("size?: ");
	});

	it("Select component exists", () => {
		expect(existsSync(resolve(ds, "components/Select.tsx"))).toBe(true);
	});

	it("Table component exists", () => {
		expect(existsSync(resolve(ds, "components/Table.tsx"))).toBe(true);
	});

	it("EmptyState component exists", () => {
		expect(existsSync(resolve(ds, "components/EmptyState.tsx"))).toBe(true);
	});

	it("SectionCollapsible component exists", () => {
		expect(existsSync(resolve(ds, "components/SectionCollapsible.tsx"))).toBe(true);
	});

	it("design-system index re-exports all components", () => {
		const indexPath = resolve(ds, "index.ts");
		expect(existsSync(indexPath)).toBe(true);
		const c = readFileSync(indexPath, "utf8");
		expect(c).toContain("Button");
		expect(c).toContain("Badge");
		expect(c).toContain("FilterChip");
		expect(c).toContain("Input");
		expect(c).toContain("Select");
		expect(c).toContain("Table");
		expect(c).toContain("EmptyState");
	});

	// --- Test Plan UI ---
	it("TestPlansListView file exists", () => {
		expect(existsSync(resolve(views, "test-plans/TestPlansListView.tsx"))).toBe(true);
	});

	it("TestPlansListView has view-plans testid", () => {
		const c = readFileSync(resolve(views, "test-plans/TestPlansListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-plans"');
	});

	it("TestPlansListView accepts onCreateNew prop", () => {
		const c = readFileSync(resolve(views, "test-plans/TestPlansListView.tsx"), "utf8");
		expect(c).toContain("onCreateNew");
	});

	it("TestPlansListView CSS file exists", () => {
		expect(existsSync(resolve(views, "test-plans/TestPlansListView.css"))).toBe(true);
	});

	it("TestPlanFormView file exists", () => {
		expect(existsSync(resolve(views, "test-plans/TestPlanFormView.tsx"))).toBe(true);
	});

	it("TestPlanFormView applies Bug A fix (iterationPath conditional)", () => {
		const c = readFileSync(resolve(views, "test-plans/TestPlanFormView.tsx"), "utf8");
		expect(c).toContain("iterationPath.trim()");
	});

	it("TestPlanFormView uses Back to list aria-label", () => {
		const c = readFileSync(resolve(views, "test-plans/TestPlanFormView.tsx"), "utf8");
		expect(c).toContain("Back to list");
	});

	it("TestPlanFormView uses onSuccess and onCancel props", () => {
		const c = readFileSync(resolve(views, "test-plans/TestPlanFormView.tsx"), "utf8");
		expect(c).toContain("onSuccess");
		expect(c).toContain("onCancel");
	});

	it("TestPlanFormView CSS file exists", () => {
		expect(existsSync(resolve(views, "test-plans/TestPlanFormView.css"))).toBe(true);
	});

	it("_mock-data.ts file exists", () => {
		expect(existsSync(resolve(views, "_mock-data.ts"))).toBe(true);
	});

	it("_mock-data.ts documents Sprint 2.19 replacement intent", () => {
		const c = readFileSync(resolve(views, "_mock-data.ts"), "utf8");
		expect(c).toContain("Sprint 2.19");
		expect(c).toContain("TECH-DEBT-061");
	});

	// --- Routing hook ---
	it("use-argos-routing hook file exists", () => {
		expect(existsSync(resolve(hooks, "use-argos-routing.ts"))).toBe(true);
	});

	it("useArgosRouting exports goToTestPlansList, goToTestPlanForm, goToTab, navigate", () => {
		const c = readFileSync(resolve(hooks, "use-argos-routing.ts"), "utf8");
		expect(c).toContain("goToTestPlansList");
		expect(c).toContain("goToTestPlanForm");
		expect(c).toContain("goToTab");
		expect(c).toContain("navigate");
	});

	it("sidebarKeyForView is exported from use-argos-routing", () => {
		const c = readFileSync(resolve(hooks, "use-argos-routing.ts"), "utf8");
		expect(c).toContain("export function sidebarKeyForView");
	});

	it("ArgosView discriminated union covers all 7 view kinds", () => {
		const c = readFileSync(resolve(hooks, "use-argos-routing.ts"), "utf8");
		expect(c).toContain("test-plans-list");
		expect(c).toContain("test-plans-form");
		expect(c).toContain("test-cases-list");
		expect(c).toContain("test-sets-list");
		expect(c).toContain("preconditions-list");
		expect(c).toContain("reports");
		expect(c).toContain("settings");
	});

	// --- App.tsx routing integration ---
	it("App.tsx imports and uses useArgosRouting", () => {
		const c = readFileSync(resolve(root, "apps/argos-extension/src/hub/App.tsx"), "utf8");
		expect(c).toContain("useArgosRouting");
	});

	it("App.tsx uses ArgosView type (not string section)", () => {
		const c = readFileSync(resolve(root, "apps/argos-extension/src/hub/App.tsx"), "utf8");
		expect(c).toContain("ArgosView");
	});

	it("App.tsx passes initialView to AppInner", () => {
		const c = readFileSync(resolve(root, "apps/argos-extension/src/hub/App.tsx"), "utf8");
		expect(c).toContain("initialView");
	});
});
