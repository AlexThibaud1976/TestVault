import type { TestVaultTestExecution } from "@atconseil/argos-types";
import type { ExecutionPage, ITestExecutionService } from "@atconseil/testvault-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExecutionHistory } from "./ExecutionHistory.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";
const EARLIER = "2026-05-07T10:00:00.000Z";

function makeFinalizedExec(
	id: number,
	env: string,
	status: TestVaultTestExecution["globalStatus"],
	date = NOW
): TestVaultTestExecution {
	return {
		id,
		testPlanId: 10,
		testCaseId: 5,
		environment: env,
		globalStatus: status,
		stepResults: [],
		evidence: [],
		bugLinks: [],
		source: "Manual",
		executedBy: "tester@example.com",
		executedAt: date,
		immutable: true,
	};
}

function makePage(
	items: TestVaultTestExecution[],
	overrides?: Partial<ExecutionPage>
): ExecutionPage {
	return { items, total: items.length, page: 1, pageSize: 20, ...overrides };
}

function makeService(overrides?: Partial<ITestExecutionService>): ITestExecutionService {
	return {
		startRun: vi.fn(),
		saveStepResult: vi.fn(),
		attachEvidence: vi.fn(),
		finalizeRun: vi.fn(),
		linkBug: vi.fn(),
		listExecutions: vi
			.fn()
			.mockResolvedValue(
				makePage([
					makeFinalizedExec(1, "QA", "Pass", NOW),
					makeFinalizedExec(2, "Dev", "Fail", EARLIER),
				])
			),
		...overrides,
	};
}

const ENVS = ["Dev", "QA", "Staging"];

describe("ExecutionHistory", () => {
	it("calls listExecutions on mount with the testCaseId", async () => {
		const service = makeService();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenCalledWith(
				expect.objectContaining({ testCaseId: 5 })
			)
		);
	});

	it("renders a row for each returned execution", async () => {
		const service = makeService();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("execution-row-1")).toBeDefined());
		expect(screen.getByTestId("execution-row-2")).toBeDefined();
	});

	it("each row shows the environment and global status", async () => {
		const service = makeService();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("execution-row-1")).toBeDefined());
		expect(screen.getByTestId("execution-row-1").textContent).toContain("QA");
		expect(screen.getByTestId("execution-row-1").textContent).toContain("Pass");
		expect(screen.getByTestId("execution-row-2").textContent).toContain("Dev");
		expect(screen.getByTestId("execution-row-2").textContent).toContain("Fail");
	});

	it("shows executions-empty when no executions returned", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(makePage([])),
		});
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("executions-empty")).toBeDefined());
	});

	it("applying environment filter calls listExecutions with the selected environment", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(makePage([])),
		});
		const user = userEvent.setup();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await user.selectOptions(screen.getByTestId("filter-environment"), "QA");
		await user.click(screen.getByTestId("apply-filters"));
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenLastCalledWith(
				expect.objectContaining({ environment: "QA" })
			)
		);
	});

	it("applying status filter calls listExecutions with the selected status", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(makePage([])),
		});
		const user = userEvent.setup();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await user.selectOptions(screen.getByTestId("filter-status"), "Fail");
		await user.click(screen.getByTestId("apply-filters"));
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenLastCalledWith(
				expect.objectContaining({ status: "Fail" })
			)
		);
	});

	it("applying from date calls listExecutions with the from value", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(makePage([])),
		});
		const user = userEvent.setup();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await user.type(screen.getByTestId("filter-from"), "2026-05-01");
		await user.click(screen.getByTestId("apply-filters"));
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenLastCalledWith(
				expect.objectContaining({ from: "2026-05-01" })
			)
		);
	});

	it("applying to date calls listExecutions with the to value", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(makePage([])),
		});
		const user = userEvent.setup();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await user.type(screen.getByTestId("filter-to"), "2026-05-31");
		await user.click(screen.getByTestId("apply-filters"));
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenLastCalledWith(
				expect.objectContaining({ to: "2026-05-31" })
			)
		);
	});

	it("shows pagination controls when total > pageSize", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(
				makePage(
					Array.from({ length: 10 }, (_, i) => makeFinalizedExec(i + 1, "QA", "Pass")),
					{ total: 25, pageSize: 10, page: 1 }
				)
			),
		});
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("pagination-next")).toBeDefined());
	});

	it("clicking next page calls listExecutions with page 2", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(
				makePage(
					Array.from({ length: 10 }, (_, i) => makeFinalizedExec(i + 1, "QA", "Pass")),
					{ total: 25, pageSize: 10, page: 1 }
				)
			),
		});
		const user = userEvent.setup();
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("pagination-next")).toBeDefined());
		await user.click(screen.getByTestId("pagination-next"));
		await waitFor(() =>
			expect(vi.mocked(service.listExecutions)).toHaveBeenLastCalledWith(
				expect.objectContaining({ page: 2 })
			)
		);
	});

	it("prev page button is disabled on page 1", async () => {
		const service = makeService({
			listExecutions: vi.fn().mockResolvedValue(
				makePage(
					Array.from({ length: 10 }, (_, i) => makeFinalizedExec(i + 1, "QA", "Pass")),
					{ total: 25, pageSize: 10, page: 1 }
				)
			),
		});
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("pagination-prev")).toBeDefined());
		expect((screen.getByTestId("pagination-prev") as HTMLButtonElement).disabled).toBe(true);
	});

	it("environment matrix shows latest status per environment", async () => {
		const service = makeService({
			listExecutions: vi
				.fn()
				.mockResolvedValue(
					makePage([
						makeFinalizedExec(1, "QA", "Pass", NOW),
						makeFinalizedExec(2, "Dev", "Fail", EARLIER),
					])
				),
		});
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("env-matrix")).toBeDefined());
		expect(screen.getByTestId("env-matrix-QA").textContent).toContain("Pass");
		expect(screen.getByTestId("env-matrix-Dev").textContent).toContain("Fail");
	});

	it("env-matrix cell shows — for environments with no executions in current page", async () => {
		const service = makeService({
			listExecutions: vi
				.fn()
				.mockResolvedValue(makePage([makeFinalizedExec(1, "QA", "Pass", NOW)])),
		});
		render(
			<ExecutionHistory testCaseId={5} executionService={service} availableEnvironments={ENVS} />
		);
		await waitFor(() => expect(screen.getByTestId("env-matrix")).toBeDefined());
		expect(screen.getByTestId("env-matrix-Staging").textContent).toContain("—");
	});
});
