import { describe, expect, it } from "vitest";
import { computeFlaky } from "./computeFlaky.js";

/**
 * Unit tests for the flaky detection helper (Runner 0.6.0 / US-2.6).
 *
 * Rule: a Test Case is flaky for a given environment if, among its 5 most
 * recent runs with the same environment (runs sorted newest-first), the
 * filtered subsequence of Pass/Fail results contains at least one alternation
 * Pass<->Fail. Runs with status Blocked/Skipped/Unexecuted/Aborted are ignored.
 */

describe("computeFlaky", () => {
	it("detects flaky when Pass and Fail alternate in QA", () => {
		const runs = [
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
		];
		expect(computeFlaky(runs).has("QA")).toBe(true);
	});

	it("does not flag as flaky when all results are Pass", () => {
		const runs = [
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
		];
		expect(computeFlaky(runs).has("QA")).toBe(false);
	});

	it("ignores Blocked/Skipped/Unexecuted in alternation calculation", () => {
		const runs = [
			{ globalStatus: "Blocked" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Blocked" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
		];
		// Filtered: [Pass, Fail, Pass] -> alternation -> flaky
		expect(computeFlaky(runs).has("QA")).toBe(true);
	});

	it("ignores Aborted runs in alternation calculation", () => {
		const runs = [
			{ globalStatus: "Unexecuted" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
		];
		// Filtered: [Pass, Pass] -> no alternation -> not flaky
		expect(computeFlaky(runs).has("QA")).toBe(false);
	});

	it("returns empty set when fewer than 2 significant runs per environment", () => {
		const runs = [
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Blocked" as const, environment: "QA" },
		];
		// Only 1 Pass/Fail -> cannot alternate
		expect(computeFlaky(runs).size).toBe(0);
	});

	it("considers only the 5 most recent runs per environment", () => {
		// Oldest 3 runs are Fail (index 5,6,7), newest 5 are all Pass -> not flaky
		const runs = [
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
		];
		// Runs is sorted newest-first; top 5 are all Pass -> not flaky
		expect(computeFlaky(runs).has("QA")).toBe(false);
	});

	it("detects flaky per-environment independently", () => {
		const runs = [
			{ globalStatus: "Pass" as const, environment: "QA" },
			{ globalStatus: "Fail" as const, environment: "QA" },
			{ globalStatus: "Pass" as const, environment: "Dev" },
			{ globalStatus: "Pass" as const, environment: "Dev" },
		];
		const result = computeFlaky(runs);
		expect(result.has("QA")).toBe(true);
		expect(result.has("Dev")).toBe(false);
	});
});
