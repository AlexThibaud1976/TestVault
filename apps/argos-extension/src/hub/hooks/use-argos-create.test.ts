import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useArgosCreate } from "./use-argos-create.js";

// useArgosToast uses a default no-op context, so no ToastProvider wrapper needed in unit tests.

describe("useArgosCreate hook (Sprint 2.17)", () => {
	it("calls onSuccess callback after create", async () => {
		const createFn = vi.fn().mockResolvedValue({ id: 42 });
		const onSuccess = vi.fn();

		const { result } = renderHook(() => useArgosCreate({ kind: "TestPlan", createFn, onSuccess }));

		await act(async () => {
			await result.current.mutate({ "System.Title": "Test" });
		});

		expect(createFn).toHaveBeenCalledWith({ "System.Title": "Test" });
		expect(onSuccess).toHaveBeenCalledWith({ id: 42 });
	});

	it("sets isCreating true during mutation then false after", async () => {
		let resolve: (v: { id: number }) => void;
		const createFn = vi.fn(
			() =>
				new Promise<{ id: number }>((r) => {
					resolve = r;
				})
		);

		const { result } = renderHook(() => useArgosCreate({ kind: "TestPlan", createFn }));

		expect(result.current.isCreating).toBe(false);

		let promise: Promise<unknown>;
		act(() => {
			promise = result.current.mutate({});
		});

		await act(async () => {
			expect(result.current.isCreating).toBe(true);
			resolve({ id: 1 });
			await promise;
		});

		expect(result.current.isCreating).toBe(false);
	});

	it("re-throws error and does not call onSuccess on failure", async () => {
		const createFn = vi.fn().mockRejectedValue(new Error("Network down"));
		const onSuccess = vi.fn();

		const { result } = renderHook(() => useArgosCreate({ kind: "TestPlan", createFn, onSuccess }));

		await expect(
			act(async () => {
				await result.current.mutate({});
			})
		).rejects.toThrow("Network down");

		expect(onSuccess).not.toHaveBeenCalled();
		expect(result.current.isCreating).toBe(false);
	});

	it("supports all 7 WIT kinds without error", () => {
		const createFn = vi.fn().mockResolvedValue({ id: 1 });
		const kinds = [
			"TestCase",
			"TestPlan",
			"TestSet",
			"Precondition",
			"TestExecution",
			"TestCaseVersion",
			"AuditLog",
		] as const;

		for (const kind of kinds) {
			const { result } = renderHook(() => useArgosCreate({ kind, createFn }));
			expect(result.current.mutate).toBeDefined();
			expect(result.current.isCreating).toBe(false);
		}
	});
});
