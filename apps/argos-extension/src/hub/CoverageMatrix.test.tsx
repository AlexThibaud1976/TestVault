import type { MatrixInput } from "@atconseil/argos-sdk";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CoverageMatrix } from "./CoverageMatrix.js";

afterEach(cleanup);

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

describe("CoverageMatrix", () => {
	it("renders the matrix-container", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("coverage-matrix")).toBeDefined();
	});

	it("renders a column header for each linked TC", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("matrix-col-1")).toBeDefined();
		expect(screen.getByTestId("matrix-col-2")).toBeDefined();
	});

	it("renders a row for each WI that has linked TCs", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("matrix-row-100")).toBeDefined();
		expect(screen.getByTestId("matrix-row-101")).toBeDefined();
	});

	it("renders matrix-cell-{wiId}-{tcId} for each combination", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("matrix-cell-100-1")).toBeDefined();
		expect(screen.getByTestId("matrix-cell-101-2")).toBeDefined();
	});

	it("shows matrix-empty when no links exist", () => {
		render(<CoverageMatrix input={makeInput({ links: [] })} />);
		expect(screen.getByTestId("matrix-empty")).toBeDefined();
	});

	it("cell for a linked TC shows the execution status", () => {
		const input = makeInput({
			executions: [
				{ testCaseId: 1, status: "Pass", environment: "QA", createdAt: "2026-05-08T12:00:00.000Z" },
			],
		});
		render(<CoverageMatrix input={input} />);
		const cell = screen.getByTestId("matrix-cell-100-1");
		expect(cell.textContent).toContain("Pass");
	});

	it("cell for an unlinked TC shows a dash", () => {
		render(<CoverageMatrix input={makeInput()} />);
		// WI 100 is not linked to TC 2
		const cell = screen.getByTestId("matrix-cell-100-2");
		expect(cell.textContent).toContain("—");
	});

	it("filters matrix by environment when env-filter changes", async () => {
		const user = userEvent.setup();
		const input = makeInput({
			executions: [
				{ testCaseId: 1, status: "Pass", environment: "QA", createdAt: "2026-05-08T12:00:00.000Z" },
				{
					testCaseId: 1,
					status: "Fail",
					environment: "Staging",
					createdAt: "2026-05-08T12:00:00.000Z",
				},
			],
		});
		render(<CoverageMatrix input={input} environments={["QA", "Staging"]} />);
		const filter = screen.getByTestId("env-filter");
		await user.selectOptions(filter, "Staging");
		const cell = screen.getByTestId("matrix-cell-100-1");
		expect(cell.textContent).toContain("Fail");
	});

	it("renders export-excel-button", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("export-excel-button")).toBeDefined();
	});

	it("renders export-pdf-button", () => {
		render(<CoverageMatrix input={makeInput()} />);
		expect(screen.getByTestId("export-pdf-button")).toBeDefined();
	});
});
