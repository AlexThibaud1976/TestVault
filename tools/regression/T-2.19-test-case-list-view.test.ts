import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 TestCasesListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("TestCasesListView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestCasesListView.tsx"))).toBe(true);
	});

	it("TestCasesListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "TestCasesListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("TestCasesListView has data-testid view-test-cases", () => {
		const c = readFileSync(resolve(views, "TestCasesListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-test-cases"');
	});

	it("TestCasesListView accepts onCreateNew prop", () => {
		const c = readFileSync(resolve(views, "TestCasesListView.tsx"), "utf8");
		expect(c).toContain("onCreateNew");
	});

	it("TestCasesListView imports from design-system", () => {
		const c = readFileSync(resolve(views, "TestCasesListView.tsx"), "utf8");
		expect(c).toContain("design-system");
	});

	it("TestCaseFormView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestCaseFormView.tsx"))).toBe(true);
	});

	it("TestCaseFormView imports TestCaseDraft from argos-sdk", () => {
		const c = readFileSync(resolve(views, "TestCaseFormView.tsx"), "utf8");
		expect(c).toContain("TestCaseDraft");
		expect(c).toContain("argos-sdk");
	});

	it("TestCasesListView test file exists", () => {
		expect(existsSync(resolve(views, "TestCasesListView.test.tsx"))).toBe(true);
	});
});
