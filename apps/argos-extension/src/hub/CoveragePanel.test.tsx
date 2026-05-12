import type {
	ExecutionPage,
	ITestExecutionService,
	IWorkItemLinkService,
	WorkItemLink,
} from "@atconseil/argos-sdk";
import type { TestVaultTestExecution } from "@atconseil/argos-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoveragePanel } from "./CoveragePanel.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";

function makeLink(tcId: number): WorkItemLink {
	return {
		targetId: tcId,
		targetUrl: `https://dev.azure.com/org/Proj/_apis/wit/workitems/${tcId}`,
		linkType: "TestVault.TestedBy",
		isOrphan: false,
	};
}

function makeExec(
	tcId: number,
	status: TestVaultTestExecution["globalStatus"]
): TestVaultTestExecution {
	return {
		id: tcId * 100,
		testPlanId: 10,
		testCaseId: tcId,
		environment: "QA",
		globalStatus: status,
		stepResults: [],
		evidence: [],
		bugLinks: [],
		source: "Manual",
		executedBy: "tester@example.com",
		executedAt: NOW,
		immutable: true,
	};
}

function makeExecPage(items: TestVaultTestExecution[]): ExecutionPage {
	return { items, total: items.length, page: 1, pageSize: 20 };
}

function makeLinkService(overrides?: Partial<IWorkItemLinkService>): IWorkItemLinkService {
	return {
		listLinks: vi.fn().mockResolvedValue([makeLink(42), makeLink(43)]),
		addLink: vi.fn(),
		removeLink: vi.fn(),
		detectOrphanLinks: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

function makeExecService(overrides?: Partial<ITestExecutionService>): ITestExecutionService {
	return {
		startRun: vi.fn(),
		saveStepResult: vi.fn(),
		attachEvidence: vi.fn(),
		finalizeRun: vi.fn(),
		linkBug: vi.fn(),
		listExecutions: vi
			.fn()
			.mockImplementation(({ testCaseId }: { testCaseId: number }) =>
				Promise.resolve(makeExecPage([makeExec(testCaseId, testCaseId === 42 ? "Pass" : "Fail")]))
			),
		...overrides,
	};
}

describe("CoveragePanel", () => {
	it("calls listLinks on mount with the workItemId", async () => {
		const linkService = makeLinkService();
		render(
			<CoveragePanel
				workItemId={10}
				linkService={linkService}
				executionService={makeExecService()}
			/>
		);
		await waitFor(() => expect(vi.mocked(linkService.listLinks)).toHaveBeenCalledWith(10));
	});

	it("shows a coverage-row for each linked TC", async () => {
		render(
			<CoveragePanel
				workItemId={10}
				linkService={makeLinkService()}
				executionService={makeExecService()}
			/>
		);
		await waitFor(() => expect(screen.getByTestId("coverage-row-42")).toBeDefined());
		expect(screen.getByTestId("coverage-row-43")).toBeDefined();
	});

	it("each row shows the TC id and latest execution status", async () => {
		render(
			<CoveragePanel
				workItemId={10}
				linkService={makeLinkService()}
				executionService={makeExecService()}
			/>
		);
		await waitFor(() => expect(screen.getByTestId("coverage-row-42")).toBeDefined());
		expect(screen.getByTestId("coverage-row-42").textContent).toContain("42");
		expect(screen.getByTestId("coverage-row-42").textContent).toContain("Pass");
		expect(screen.getByTestId("coverage-row-43").textContent).toContain("Fail");
	});

	it("shows coverage-empty when no linked TCs found", async () => {
		const linkService = makeLinkService({ listLinks: vi.fn().mockResolvedValue([]) });
		render(
			<CoveragePanel
				workItemId={10}
				linkService={linkService}
				executionService={makeExecService()}
			/>
		);
		await waitFor(() => expect(screen.getByTestId("coverage-empty")).toBeDefined());
	});

	it("shows 'No executions' when a TC has no execution history", async () => {
		const execService = makeExecService({
			listExecutions: vi.fn().mockResolvedValue(makeExecPage([])),
		});
		render(
			<CoveragePanel
				workItemId={10}
				linkService={makeLinkService({ listLinks: vi.fn().mockResolvedValue([makeLink(42)]) })}
				executionService={execService}
			/>
		);
		await waitFor(() => expect(screen.getByTestId("coverage-row-42")).toBeDefined());
		expect(screen.getByTestId("coverage-row-42").textContent).toContain("No executions");
	});

	it("calls listExecutions for each linked TC", async () => {
		const execService = makeExecService();
		render(
			<CoveragePanel
				workItemId={10}
				linkService={makeLinkService()}
				executionService={execService}
			/>
		);
		await waitFor(() => expect(screen.getByTestId("coverage-row-42")).toBeDefined());
		expect(vi.mocked(execService.listExecutions)).toHaveBeenCalledWith(
			expect.objectContaining({ testCaseId: 42 })
		);
		expect(vi.mocked(execService.listExecutions)).toHaveBeenCalledWith(
			expect.objectContaining({ testCaseId: 43 })
		);
	});
});
