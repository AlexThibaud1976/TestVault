import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 PreconditionsListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("PreconditionsListView.tsx exists", () => {
		expect(existsSync(resolve(views, "PreconditionsListView.tsx"))).toBe(true);
	});

	it("PreconditionsListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "PreconditionsListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("PreconditionsListView has data-testid view-preconditions", () => {
		const c = readFileSync(resolve(views, "PreconditionsListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-preconditions"');
	});

	it("PreconditionsListView accepts onCreateNew prop", () => {
		const c = readFileSync(resolve(views, "PreconditionsListView.tsx"), "utf8");
		expect(c).toContain("onCreateNew");
	});

	it("PreconditionFormView.tsx exists", () => {
		expect(existsSync(resolve(views, "PreconditionFormView.tsx"))).toBe(true);
	});

	it("PreconditionFormView imports PreconditionDraft from argos-sdk", () => {
		const c = readFileSync(resolve(views, "PreconditionFormView.tsx"), "utf8");
		expect(c).toContain("PreconditionDraft");
		expect(c).toContain("argos-sdk");
	});

	it("PreconditionsListView test file exists", () => {
		expect(existsSync(resolve(views, "PreconditionsListView.test.tsx"))).toBe(true);
	});
});
