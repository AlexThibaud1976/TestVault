import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 TestCaseVersionsListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("TestCaseVersionsListView.tsx exists", () => {
		expect(existsSync(resolve(views, "TestCaseVersionsListView.tsx"))).toBe(true);
	});

	it("TestCaseVersionsListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "TestCaseVersionsListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("TestCaseVersionsListView has data-testid view-test-case-versions", () => {
		const c = readFileSync(resolve(views, "TestCaseVersionsListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-test-case-versions"');
	});

	it("TestCaseVersionsListView imports TestVaultTestCaseVersion from argos-sdk", () => {
		const c = readFileSync(resolve(views, "TestCaseVersionsListView.tsx"), "utf8");
		expect(c).toContain("TestVaultTestCaseVersion");
		expect(c).toContain("argos-sdk");
	});

	it("TestCaseVersionsListView calls listSnapshots", () => {
		const c = readFileSync(resolve(views, "TestCaseVersionsListView.tsx"), "utf8");
		expect(c).toContain("listSnapshots");
	});

	it("TestCaseVersionsListView has ID search input", () => {
		const c = readFileSync(resolve(views, "TestCaseVersionsListView.tsx"), "utf8");
		expect(c).toContain("confirmedCaseId");
	});

	it("TestCaseVersionsListView test file exists", () => {
		expect(existsSync(resolve(views, "TestCaseVersionsListView.test.tsx"))).toBe(true);
	});
});
