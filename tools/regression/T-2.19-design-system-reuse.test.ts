import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 design system reuse across all 6 new list views", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	const LIST_VIEWS = [
		"TestCasesListView.tsx",
		"TestSetsListView.tsx",
		"PreconditionsListView.tsx",
		"TestExecutionsListView.tsx",
		"TestCaseVersionsListView.tsx",
		"AuditLogListView.tsx",
	];

	for (const file of LIST_VIEWS) {
		it(`${file} uses WitListHeader`, () => {
			const c = readFileSync(resolve(views, file), "utf8");
			expect(c).toContain("WitListHeader");
		});

		it(`${file} imports from design-system`, () => {
			const c = readFileSync(resolve(views, file), "utf8");
			expect(c).toContain("design-system");
		});

		it(`${file} imports wit-list-view.css`, () => {
			const c = readFileSync(resolve(views, file), "utf8");
			expect(c).toContain("wit-list-view.css");
		});
	}

	it("shared wit-list-view.css exists", () => {
		const { existsSync } = require("node:fs");
		expect(existsSync(resolve(views, "wit-list-view.css"))).toBe(true);
	});

	it("WitListHeader component exists", () => {
		const { existsSync } = require("node:fs");
		const components = resolve(root, "apps/argos-extension/src/hub/components");
		expect(existsSync(resolve(components, "WitListHeader.tsx"))).toBe(true);
	});

	it("WitFilterBar component exists", () => {
		const { existsSync } = require("node:fs");
		const components = resolve(root, "apps/argos-extension/src/hub/components");
		expect(existsSync(resolve(components, "WitFilterBar.tsx"))).toBe(true);
	});

	it("WitStatusBadge component exists", () => {
		const { existsSync } = require("node:fs");
		const components = resolve(root, "apps/argos-extension/src/hub/components");
		expect(existsSync(resolve(components, "WitStatusBadge.tsx"))).toBe(true);
	});
});
