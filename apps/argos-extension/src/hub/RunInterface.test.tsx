import type { ITestExecutionService, InProgressExecution } from "@atconseil/testvault-sdk";
import type {
	TestVaultPrecondition,
	TestVaultTestCase,
	TestVaultTestExecution,
} from "@atconseil/testvault-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunInterface } from "./RunInterface.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";

function makeTC(overrides?: Partial<TestVaultTestCase>): TestVaultTestCase {
	return {
		id: 42,
		title: "Login with invalid credentials",
		description: "",
		state: "Active",
		areaPath: "MyProject",
		iterationPath: "",
		tags: [],
		steps: [
			{ index: 0, action: "Open login page", expected: "Login form visible" },
			{ index: 1, action: "Enter wrong password", expected: "Error message shown" },
		],
		priority: 2,
		automationStatus: "Manual",
		preconditionLinks: [],
		createdBy: "alice@example.com",
		createdAt: NOW,
		modifiedBy: "alice@example.com",
		modifiedAt: NOW,
		...overrides,
	};
}

const inProgressExec: InProgressExecution = {
	id: 99,
	testPlanId: 10,
	testCaseId: 42,
	environment: "QA",
	stepResults: [],
	evidence: [],
	bugLinks: [],
	source: "Manual",
	executedBy: "alice@example.com",
};

function makeFinalizedExec(
	globalStatus: TestVaultTestExecution["globalStatus"] = "Pass"
): TestVaultTestExecution {
	return {
		id: 99,
		testPlanId: 10,
		testCaseId: 42,
		environment: "QA",
		globalStatus,
		stepResults: [],
		evidence: [],
		bugLinks: [],
		source: "Manual",
		executedBy: "alice@example.com",
		executedAt: NOW,
		immutable: true,
	};
}

function makeExecService(
	globalStatus: TestVaultTestExecution["globalStatus"] = "Pass"
): ITestExecutionService {
	return {
		startRun: vi.fn().mockResolvedValue(inProgressExec),
		saveStepResult: vi.fn().mockResolvedValue(inProgressExec),
		attachEvidence: vi.fn().mockResolvedValue(inProgressExec),
		finalizeRun: vi.fn().mockResolvedValue(makeFinalizedExec(globalStatus)),
		linkBug: vi.fn().mockResolvedValue(makeFinalizedExec(globalStatus)),
	};
}

const ENVS = ["Dev", "QA", "Staging"];

describe("RunInterface", () => {
	it("renders environment selector with available environments", () => {
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
			/>
		);
		expect(screen.getByTestId("env-selector")).toBeDefined();
		expect(screen.getByRole("option", { name: "QA" })).toBeDefined();
	});

	it("shows env-required-error when Save clicked without selecting environment", async () => {
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
			/>
		);
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("env-required-error")).toBeDefined();
	});

	it("renders each step with action and expected text", () => {
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
			/>
		);
		expect(screen.getByText("Open login page")).toBeDefined();
		expect(screen.getByText("Login form visible")).toBeDefined();
		expect(screen.getByText("Enter wrong password")).toBeDefined();
		expect(screen.getByText("Error message shown")).toBeDefined();
	});

	it("shows precondition-section when preconditions prop is non-empty", () => {
		const preconditions: TestVaultPrecondition[] = [
			{
				id: 5,
				title: "User has no active session",
				description: "App is in a clean state",
				tags: [],
				linkedTestCaseIds: [42],
			},
		];
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
				preconditions={preconditions}
			/>
		);
		expect(screen.getByTestId("precondition-section")).toBeDefined();
		expect(screen.getByText("User has no active session")).toBeDefined();
	});

	it("does NOT show precondition-section when preconditions is empty or undefined", () => {
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
			/>
		);
		expect(screen.queryByTestId("precondition-section")).toBeNull();
	});

	it("updates global status to Fail in real-time when a step is marked Fail", async () => {
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService("Fail")}
			/>
		);
		expect(screen.getByTestId("global-status").textContent).toMatch(/Unexecuted/);
		await user.click(screen.getByTestId("step-0-status-fail"));
		expect(screen.getByTestId("global-status").textContent).toMatch(/Fail/);
	});

	it("shows step-0-comment-error when Fail step has no comment on Save", async () => {
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-fail"));
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("step-0-comment-error")).toBeDefined();
	});

	it("calls startRun, saveStepResult for each marked step, and finalizeRun on Save", async () => {
		const execService = makeExecService();
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-pass"));
		await user.click(screen.getByTestId("step-1-status-pass"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(vi.mocked(execService.finalizeRun)).toHaveBeenCalledWith(99));
		expect(vi.mocked(execService.startRun)).toHaveBeenCalledWith(
			expect.objectContaining({ testPlanId: 10, testCaseId: 42, environment: "QA" })
		);
		expect(vi.mocked(execService.saveStepResult)).toHaveBeenCalledTimes(2);
	});

	it("only calls saveStepResult for explicitly marked steps", async () => {
		const execService = makeExecService();
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-pass")); // only step 0 marked
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(vi.mocked(execService.finalizeRun)).toHaveBeenCalledWith(99));
		expect(vi.mocked(execService.saveStepResult)).toHaveBeenCalledTimes(1);
	});

	it("shows saved-status after successful save", async () => {
		const execService = makeExecService("Pass");
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-pass"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(screen.getByTestId("saved-status")).toBeDefined());
		expect(screen.getByTestId("saved-status").textContent).toMatch(/Pass/);
	});

	it("shows create-bug-button after save with Fail globalStatus", async () => {
		const execService = makeExecService("Fail");
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-fail"));
		await user.type(screen.getByTestId("step-0-comment"), "Something failed");
		await user.click(screen.getByTestId("step-1-status-pass"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(screen.getByTestId("create-bug-button")).toBeDefined());
	});

	it("does NOT show create-bug-button after save with Pass globalStatus", async () => {
		const execService = makeExecService("Pass");
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-pass"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(screen.getByTestId("saved-status")).toBeDefined());
		expect(screen.queryByTestId("create-bug-button")).toBeNull();
	});

	it("calls onCancelled when Cancel is clicked", async () => {
		const onCancelled = vi.fn();
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={makeExecService()}
				onCancelled={onCancelled}
			/>
		);
		await user.click(screen.getByTestId("cancel-button"));
		expect(onCancelled).toHaveBeenCalledOnce();
	});

	it("calls onSaved with the finalized execution after successful save", async () => {
		const onSaved = vi.fn();
		const execService = makeExecService("Pass");
		const user = userEvent.setup();
		render(
			<RunInterface
				testCase={makeTC()}
				testPlanId={10}
				availableEnvironments={ENVS}
				executionService={execService}
				onSaved={onSaved}
			/>
		);
		await user.selectOptions(screen.getByTestId("env-selector"), "QA");
		await user.click(screen.getByTestId("step-0-status-pass"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
		expect(onSaved.mock.calls[0]?.[0].globalStatus).toBe("Pass");
	});
});
