import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sidebarKeyForView, useArgosRouting } from "./use-argos-routing.js";

describe("useArgosRouting (Sprint 2.18)", () => {
	it("defaults to test-plans-list", () => {
		const { result } = renderHook(() => useArgosRouting());
		expect(result.current.view.kind).toBe("test-plans-list");
	});

	it("respects the initial view argument", () => {
		const { result } = renderHook(() => useArgosRouting({ kind: "reports" }));
		expect(result.current.view.kind).toBe("reports");
	});

	it("goToTestPlansList navigates to list", () => {
		const { result } = renderHook(() => useArgosRouting({ kind: "reports" }));
		act(() => result.current.goToTestPlansList());
		expect(result.current.view.kind).toBe("test-plans-list");
	});

	it("goToTestPlanForm navigates to form without planId", () => {
		const { result } = renderHook(() => useArgosRouting());
		act(() => result.current.goToTestPlanForm());
		expect(result.current.view.kind).toBe("test-plans-form");
		if (result.current.view.kind === "test-plans-form") {
			expect(result.current.view.planId).toBeUndefined();
		}
	});

	it("goToTestPlanForm passes planId", () => {
		const { result } = renderHook(() => useArgosRouting());
		act(() => result.current.goToTestPlanForm(42));
		expect(result.current.view.kind).toBe("test-plans-form");
		if (result.current.view.kind === "test-plans-form") {
			expect(result.current.view.planId).toBe(42);
		}
	});

	it("goToTab maps all sidebar keys correctly", () => {
		const cases: Array<[string, string]> = [
			["test-plans", "test-plans-list"],
			["test-cases", "test-cases-list"],
			["test-sets", "test-sets-list"],
			["preconditions", "preconditions-list"],
			["reports", "reports"],
			["settings", "settings"],
		];
		for (const [tabKey, expectedKind] of cases) {
			const { result } = renderHook(() => useArgosRouting());
			act(() => result.current.goToTab(tabKey));
			expect(result.current.view.kind).toBe(expectedKind);
		}
	});

	it("goToTab ignores unknown keys", () => {
		const { result } = renderHook(() => useArgosRouting());
		act(() => result.current.goToTab("unknown-key"));
		expect(result.current.view.kind).toBe("test-plans-list");
	});

	it("navigate sets view directly", () => {
		const { result } = renderHook(() => useArgosRouting());
		act(() => result.current.navigate({ kind: "settings" }));
		expect(result.current.view.kind).toBe("settings");
	});
});

describe("sidebarKeyForView", () => {
	it.each([
		[{ kind: "test-plans-list" as const }, "test-plans"],
		[{ kind: "test-plans-form" as const }, "test-plans"],
		[{ kind: "test-cases-list" as const }, "test-cases"],
		[{ kind: "test-sets-list" as const }, "test-sets"],
		[{ kind: "preconditions-list" as const }, "preconditions"],
		[{ kind: "reports" as const }, "reports"],
		[{ kind: "settings" as const }, "settings"],
	])("view %o → sidebar key %s", (view, expected) => {
		expect(sidebarKeyForView(view)).toBe(expected);
	});
});
