import type {
	ExecutionPage,
	ITestExecutionService,
	IWorkItemLinkService,
	WorkItemLink,
} from "@atconseil/argos-sdk";
import type { TestVaultTestExecution } from "@atconseil/argos-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockAdoClassificationService,
	createMockAdoIterationsService,
	createMockAiGenerationService,
	createMockLlmConfigService,
	createMockServices,
	createMockTestCaseService,
	createMockWorkItemLinkService as createMockWILService,
} from "../test-utils/mock-services.js";
import { CoveragePanel } from "./CoveragePanel.js";
import { ToastProvider } from "./components/Toast.js";
import { ServicesContext } from "./services-context.js";

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

// =============================================================================
// T-2.22.3 -- "Suggest Tests" button (Sprint 2.21 part 1 regression: misplaced AI button)
// Spec: spec.md US-5.1, T-6.6 (legacy)
// =============================================================================

const AREA_PATHS = [
	{ id: 1, name: "MockProject", path: "MockProject", hasChildren: true },
	{ id: 2, name: "Auth", path: "MockProject\\Auth", hasChildren: false },
];
const ITERATIONS = [{ id: 10, name: "MockProject", path: "MockProject", hasChildren: true }];
const LLM_CONFIG = {
	provider: "azure-openai" as const,
	apiKey: "test-key-1234",
	endpoint: "https://example.openai.azure.com",
	deploymentName: "gpt-4o",
};

interface RenderAiOptions {
	workItemType: string;
	listLinks?: () => Promise<WorkItemLink[]>;
}

function renderWithServices(opts: RenderAiOptions) {
	const linkServiceMock = createMockWILService({
		listLinks: vi.fn(opts.listLinks ?? (() => Promise.resolve([]))),
	});
	const execServiceMock = makeExecService({
		listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
	});
	const services = createMockServices({
		workItemLinkService: linkServiceMock,
		testExecutionService: execServiceMock,
		adoClassificationService: createMockAdoClassificationService({
			getAreaPaths: vi.fn().mockResolvedValue(AREA_PATHS),
		}),
		adoIterationsService: createMockAdoIterationsService({
			getIterations: vi.fn().mockResolvedValue(ITERATIONS),
		}),
		testCaseService: createMockTestCaseService(),
		aiGenerationService: createMockAiGenerationService({
			generate: vi.fn().mockResolvedValue([]),
		}),
		llmConfigService: createMockLlmConfigService({
			getConfig: vi.fn().mockResolvedValue(LLM_CONFIG),
		}),
	});
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<CoveragePanel
					workItemId={10}
					workItemType={opts.workItemType}
					linkService={linkServiceMock}
					executionService={execServiceMock}
				/>
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services };
}

describe("T-2.22.3 -- CoveragePanel Suggest Tests button", () => {
	it("renders the 'Suggest Tests' button when workItemType is 'User Story'", async () => {
		renderWithServices({ workItemType: "User Story" });
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /Suggest Tests/i })).toBeDefined();
		});
	});

	it("renders the 'Suggest Tests' button when workItemType is 'Bug'", async () => {
		renderWithServices({ workItemType: "Bug" });
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /Suggest Tests/i })).toBeDefined();
		});
	});

	it("renders the 'Suggest Tests' button when workItemType is 'Requirement'", async () => {
		renderWithServices({ workItemType: "Requirement" });
		await waitFor(() => {
			expect(screen.getByRole("button", { name: /Suggest Tests/i })).toBeDefined();
		});
	});

	it("does NOT render the 'Suggest Tests' button when workItemType is 'Test Case'", async () => {
		renderWithServices({ workItemType: "Test Case" });
		// Wait for the panel to settle (empty state)
		await waitFor(() => expect(screen.getByTestId("coverage-panel")).toBeDefined());
		expect(screen.queryByRole("button", { name: /Suggest Tests/i })).toBeNull();
	});

	it("clicking 'Suggest Tests' opens the SuggestTestsDrawer (Sprint 2.21 part 3 migration)", async () => {
		const user = userEvent.setup();
		renderWithServices({ workItemType: "User Story" });
		const btn = await screen.findByRole("button", { name: /Suggest Tests/i });
		await user.click(btn);
		await waitFor(() => {
			// Sprint 2.21 part 3 replaced the AiSuggestTestsModal (dialog) with the
			// multi-step SuggestTestsDrawer (Fluent OverlayDrawer).
			const drawer = screen.queryByTestId("suggest-tests-drawer");
			expect(drawer).not.toBeNull();
		});
	});
});
