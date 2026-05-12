import { describe, expect, it, vi } from "vitest";
import { paginate, paginateAsync } from "./paginator.js";

describe("paginate", () => {
	it("splits items into pages of the given size", () => {
		const items = [1, 2, 3, 4, 5];
		const pages = paginate(items, 2);
		expect(pages).toEqual([[1, 2], [3, 4], [5]]);
	});

	it("returns a single page when items fit within pageSize", () => {
		const pages = paginate([1, 2, 3], 10);
		expect(pages).toEqual([[1, 2, 3]]);
	});

	it("returns empty array for empty input", () => {
		expect(paginate([], 5)).toEqual([]);
	});

	it("handles exactly page-sized input", () => {
		const pages = paginate([1, 2, 3], 3);
		expect(pages).toEqual([[1, 2, 3]]);
	});
});

describe("paginateAsync", () => {
	it("calls fetchFn repeatedly and yields each page", async () => {
		const data = [[10, 20], [30, 40], []];
		let call = 0;
		const fetchFn = vi.fn(async (_skip: number, _top: number) => data[call++] ?? []);

		const pages: number[][] = [];
		for await (const page of paginateAsync(fetchFn, 2)) {
			pages.push(page);
		}

		expect(pages).toEqual([
			[10, 20],
			[30, 40],
		]);
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it("stops immediately when first page is empty", async () => {
		const fetchFn = vi.fn(async () => []);
		const pages: unknown[][] = [];
		for await (const page of paginateAsync(fetchFn, 10)) {
			pages.push(page);
		}
		expect(pages).toHaveLength(0);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("uses default page size of 200 when not specified", async () => {
		let capturedTop = 0;
		const fetchFn = vi.fn(async (_skip: number, top: number) => {
			capturedTop = top;
			return [];
		});
		for await (const _ of paginateAsync(fetchFn)) {
			// nothing
		}
		expect(capturedTop).toBe(200);
	});

	it("yields each page with the fetched items", async () => {
		const fetchFn = vi.fn(async (skip: number, _top: number) => {
			if (skip === 0) return ["a", "b"];
			return [];
		});
		const pages: string[][] = [];
		for await (const page of paginateAsync(fetchFn, 2)) {
			pages.push(page);
		}
		expect(pages).toEqual([["a", "b"]]);
	});
});
