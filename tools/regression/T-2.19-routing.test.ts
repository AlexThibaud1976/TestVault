import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 routing covers all 15 view kinds", () => {
	const root = resolve(__dirname, "../..");
	const routingFile = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-routing.ts");

	const REQUIRED_KINDS = [
		"test-plans-list",
		"test-plans-form",
		"test-cases-list",
		"test-case-form",
		"test-sets-list",
		"test-set-form",
		"preconditions-list",
		"precondition-form",
		"test-executions-list",
		"test-execution-form",
		"test-case-versions-list",
		"audit-log-list",
		"reports",
		"settings",
		"dashboard",
	];

	for (const kind of REQUIRED_KINDS) {
		it(`ArgosView union includes "${kind}"`, () => {
			const c = readFileSync(routingFile, "utf8");
			expect(c).toContain(`"${kind}"`);
		});
	}

	it("sidebarKeyForView is exhaustive (no default fallthrough)", () => {
		const c = readFileSync(routingFile, "utf8");
		expect(c).toContain("export function sidebarKeyForView");
		expect(c).not.toContain("default:");
	});

	it("goToTab uses TAB_TO_VIEW map", () => {
		const c = readFileSync(routingFile, "utf8");
		expect(c).toContain("TAB_TO_VIEW");
		expect(c).toContain("goToTab");
	});

	it("App.tsx RouteRenderer handles all sprint-2.19 routes", () => {
		const appFile = resolve(root, "apps/argos-extension/src/hub/App.tsx");
		const c = readFileSync(appFile, "utf8");
		expect(c).toContain("TestCasesListView");
		expect(c).toContain("TestSetsListView");
		expect(c).toContain("PreconditionsListView");
		expect(c).toContain("TestExecutionsListView");
		expect(c).toContain("TestCaseVersionsListView");
		expect(c).toContain("AuditLogListView");
	});
});
