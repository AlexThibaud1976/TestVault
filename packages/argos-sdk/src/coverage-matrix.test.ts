import { describe, expect, it } from "vitest";
import { buildCoverageMatrix } from "./coverage-matrix.js";
import type { MatrixInput } from "./coverage-matrix.js";

const NOW = "2026-05-08T12:00:00.000Z";

function makeInput(overrides?: Partial<MatrixInput>): MatrixInput {
	return {
		workItems: [
			{ id: 100, title: "User Story A" },
			{ id: 101, title: "User Story B" },
		],
		testCases: [
			{ id: 1, title: "TC Login" },
			{ id: 2, title: "TC Logout" },
		],
		links: [
			{ workItemId: 100, testCaseId: 1 },
			{ workItemId: 101, testCaseId: 2 },
		],
		executions: [],
		...overrides,
	};
}

describe("buildCoverageMatrix", () => {
	it("returns one row per Work Item", () => {
		const matrix = buildCoverageMatrix(makeInput());
		expect(matrix.rows).toHaveLength(2);
		expect(matrix.rows[0]?.workItemId).toBe(100);
		expect(matrix.rows[1]?.workItemId).toBe(101);
	});

	it("returns one column per Test Case linked to any WI", () => {
		const matrix = buildCoverageMatrix(makeInput());
		expect(matrix.columns).toHaveLength(2);
		const ids = matrix.columns.map((c) => c.testCaseId);
		expect(ids).toContain(1);
		expect(ids).toContain(2);
	});

	it("cell is null when WI and TC are not linked", () => {
		const matrix = buildCoverageMatrix(makeInput());
		// WI 100 is linked to TC 1 but not TC 2
		const row = matrix.rows.find((r) => r.workItemId === 100);
		const cell = row?.cells.find((c) => c.testCaseId === 2);
		expect(cell?.linked).toBe(false);
	});

	it("cell is linked=true when WI and TC are linked", () => {
		const matrix = buildCoverageMatrix(makeInput());
		const row = matrix.rows.find((r) => r.workItemId === 100);
		const cell = row?.cells.find((c) => c.testCaseId === 1);
		expect(cell?.linked).toBe(true);
	});

	it("cell status is undefined when no executions exist", () => {
		const matrix = buildCoverageMatrix(makeInput());
		const row = matrix.rows.find((r) => r.workItemId === 100);
		const cell = row?.cells.find((c) => c.testCaseId === 1);
		expect(cell?.latestStatus).toBeUndefined();
	});

	it("cell status reflects the latest execution status for that TC", () => {
		const input = makeInput({
			executions: [
				{ testCaseId: 1, status: "Pass", environment: "QA", createdAt: NOW },
				{ testCaseId: 1, status: "Fail", environment: "QA", createdAt: "2026-05-07T10:00:00.000Z" },
			],
		});
		const matrix = buildCoverageMatrix(input);
		const row = matrix.rows.find((r) => r.workItemId === 100);
		const cell = row?.cells.find((c) => c.testCaseId === 1);
		expect(cell?.latestStatus).toBe("Pass");
	});

	it("filters by environment when provided", () => {
		const input = makeInput({
			executions: [
				{ testCaseId: 1, status: "Pass", environment: "QA", createdAt: NOW },
				{ testCaseId: 1, status: "Fail", environment: "Staging", createdAt: NOW },
			],
			filterEnvironment: "QA",
		});
		const matrix = buildCoverageMatrix(input);
		const row = matrix.rows.find((r) => r.workItemId === 100);
		const cell = row?.cells.find((c) => c.testCaseId === 1);
		expect(cell?.latestStatus).toBe("Pass");
	});

	it("returns empty rows and columns when inputs are empty", () => {
		const matrix = buildCoverageMatrix({ workItems: [], testCases: [], links: [], executions: [] });
		expect(matrix.rows).toHaveLength(0);
		expect(matrix.columns).toHaveLength(0);
	});

	it("filters out WIs with no linked TCs", () => {
		const input = makeInput({
			workItems: [
				{ id: 100, title: "Covered" },
				{ id: 999, title: "Uncovered" },
			],
			links: [{ workItemId: 100, testCaseId: 1 }],
		});
		const matrix = buildCoverageMatrix(input);
		expect(matrix.rows.every((r) => r.workItemId !== 999)).toBe(true);
	});

	it("includes only TC columns that are linked to at least one WI", () => {
		const input = makeInput({
			testCases: [
				{ id: 1, title: "TC Login" },
				{ id: 99, title: "Orphan TC" },
			],
			links: [{ workItemId: 100, testCaseId: 1 }],
		});
		const matrix = buildCoverageMatrix(input);
		expect(matrix.columns.every((c) => c.testCaseId !== 99)).toBe(true);
	});
});
