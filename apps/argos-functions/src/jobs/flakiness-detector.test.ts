import { describe, expect, it } from "vitest";
import { type ExecutionRecord, computeFlakinessScore } from "./flakiness-detector.js";

function makeRuns(statuses: ("Pass" | "Fail")[]): ExecutionRecord[] {
	return statuses.map((status, i) => ({
		executionId: i + 1,
		status,
		runAt: new Date(Date.now() - i * 86_400_000).toISOString(),
	}));
}

describe("computeFlakinessScore", () => {
	it("returns 0 for all-pass runs", () => {
		expect(computeFlakinessScore(makeRuns(["Pass", "Pass", "Pass", "Pass"]))).toBe(0);
	});

	it("returns 0 for all-fail runs (consistent, not flaky)", () => {
		expect(computeFlakinessScore(makeRuns(["Fail", "Fail", "Fail", "Fail"]))).toBe(0);
	});

	it("returns 100 for perfectly alternating Pass/Fail", () => {
		const score = computeFlakinessScore(makeRuns(["Pass", "Fail", "Pass", "Fail"]));
		expect(score).toBeGreaterThan(0);
	});

	it("returns 0 for empty run list", () => {
		expect(computeFlakinessScore([])).toBe(0);
	});

	it("returns 0 for single run", () => {
		expect(computeFlakinessScore(makeRuns(["Pass"]))).toBe(0);
	});

	it("score is between 0 and 100", () => {
		const score = computeFlakinessScore(makeRuns(["Pass", "Fail", "Pass", "Fail", "Pass"]));
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(100);
	});

	it("returns non-zero for mixed results", () => {
		const score = computeFlakinessScore(makeRuns(["Pass", "Pass", "Fail", "Pass", "Pass"]));
		expect(score).toBeGreaterThan(0);
	});
});
