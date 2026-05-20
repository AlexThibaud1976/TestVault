import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 TestExecutionsListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("TestExecutionsListView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestExecutionsListView.tsx"))).toBe(true);
	});

	it("TestExecutionsListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "TestExecutionsListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("TestExecutionsListView has data-testid view-test-executions", () => {
		const c = readFileSync(resolve(views, "TestExecutionsListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-test-executions"');
	});

	it("TestExecutionsListView accepts onCreateNew prop", () => {
		const c = readFileSync(resolve(views, "TestExecutionsListView.tsx"), "utf8");
		expect(c).toContain("onCreateNew");
	});

	it("TestExecutionFormView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestExecutionFormView.tsx"))).toBe(true);
	});

	it("TestExecutionFormView imports ExecutionDraft from argos-sdk", () => {
		const c = readFileSync(resolve(views, "TestExecutionFormView.tsx"), "utf8");
		expect(c).toContain("ExecutionDraft");
		expect(c).toContain("argos-sdk");
	});

	it("TestExecutionsListView test file exists", () => {
		expect(existsSync(resolve(views, "TestExecutionsListView.test.tsx"))).toBe(true);
	});
});
