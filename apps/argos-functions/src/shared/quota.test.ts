import { describe, expect, it, vi } from "vitest";
import type { IQuotaStore, QuotaState } from "./quota.js";
import { checkAndDecrementQuota, nextMonthlyReset } from "./quota.js";

function makeStore(state?: QuotaState): IQuotaStore {
	return {
		get: vi.fn().mockResolvedValue(state),
		set: vi.fn().mockResolvedValue(undefined),
	};
}

describe("checkAndDecrementQuota", () => {
	const BASE = { orgUrl: "https://dev.azure.com/acme", userId: "u1", feature: "tc-generation" };

	it("returns allowed=true with MAX_SAFE_INTEGER remaining when no quota configured", async () => {
		const result = await checkAndDecrementQuota({ ...BASE, store: makeStore(undefined) });
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
	});

	it("allows and decrements when under hard limit", async () => {
		const store = makeStore({ used: 3, limit: 10, mode: "hard", resetAt: "2026-06-01T00:00:00Z" });
		const result = await checkAndDecrementQuota({ ...BASE, store });
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(6);
		expect(vi.mocked(store.set)).toHaveBeenCalledWith(
			BASE.orgUrl,
			BASE.userId,
			BASE.feature,
			expect.objectContaining({ used: 4 })
		);
	});

	it("blocks when hard limit is reached", async () => {
		const store = makeStore({ used: 10, limit: 10, mode: "hard", resetAt: "2026-06-01T00:00:00Z" });
		const result = await checkAndDecrementQuota({ ...BASE, store });
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
		expect(vi.mocked(store.set)).not.toHaveBeenCalled();
	});

	it("allows but warns when soft limit is reached", async () => {
		const store = makeStore({ used: 10, limit: 10, mode: "soft", resetAt: "2026-06-01T00:00:00Z" });
		const result = await checkAndDecrementQuota({ ...BASE, store });
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(0);
	});

	it("remaining clamps to 0 when over limit in soft mode", async () => {
		const store = makeStore({ used: 15, limit: 10, mode: "soft", resetAt: "2026-06-01T00:00:00Z" });
		const result = await checkAndDecrementQuota({ ...BASE, store });
		expect(result.remaining).toBe(0);
	});
});

describe("nextMonthlyReset", () => {
	it("returns a future ISO date on the 1st of next month at 00:00:00Z", () => {
		const reset = nextMonthlyReset();
		const d = new Date(reset);
		expect(d > new Date()).toBe(true);
		expect(d.getUTCDate()).toBe(1);
		expect(d.getUTCHours()).toBe(0);
		expect(d.getUTCMinutes()).toBe(0);
	});
});
