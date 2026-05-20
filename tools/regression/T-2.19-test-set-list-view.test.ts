import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 TestSetsListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("TestSetsListView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestSetsListView.tsx"))).toBe(true);
	});

	it("TestSetsListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "TestSetsListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("TestSetsListView has data-testid view-test-sets", () => {
		const c = readFileSync(resolve(views, "TestSetsListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-test-sets"');
	});

	it("TestSetsListView accepts onCreateNew prop", () => {
		const c = readFileSync(resolve(views, "TestSetsListView.tsx"), "utf8");
		expect(c).toContain("onCreateNew");
	});

	it("TestSetFormView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestSetFormView.tsx"))).toBe(true);
	});

	it("TestSetFormView imports TestSetDraft from argos-sdk", () => {
		const c = readFileSync(resolve(views, "TestSetFormView.tsx"), "utf8");
		expect(c).toContain("TestSetDraft");
		expect(c).toContain("argos-sdk");
	});

	it("TestSetsListView test file exists", () => {
		expect(existsSync(resolve(views, "TestSetsListView.test.tsx"))).toBe(true);
	});
});
