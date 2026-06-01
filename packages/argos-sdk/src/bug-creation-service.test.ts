import type { TestVaultTestCase, TestVaultTestExecution } from "@atconseil/argos-types";
import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import { buildBugDraft, createBugCreationService } from "./bug-creation-service.js";
import type { ITestExecutionService } from "./test-execution-service.js";

const NOW = "2026-05-08T12:00:00.000Z";

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn().mockResolvedValue({
			id: 99,
			rev: 1,
			url: "https://dev.azure.com/org/MyProject/_apis/wit/workitems/99",
			fields: {},
		} satisfies RawWorkItem),
		createWorkItem: vi.fn().mockResolvedValue({
			id: 200,
			rev: 1,
			url: "https://dev.azure.com/org/MyProject/_apis/wit/workitems/200",
			fields: { "System.Title": "[Fail] Login test — QA" },
		} satisfies RawWorkItem),
		updateWorkItem: vi.fn().mockResolvedValue({
			id: 200,
			rev: 2,
			url: "https://dev.azure.com/org/MyProject/_apis/wit/workitems/200",
			fields: {},
		} satisfies RawWorkItem),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn(),
		uploadAttachment: vi.fn(),
		...overrides,
	};
}

function makeExecService(overrides?: Partial<ITestExecutionService>): ITestExecutionService {
	return {
		startRun: vi.fn(),
		saveStepResult: vi.fn(),
		attachEvidence: vi.fn(),
		finalizeRun: vi.fn(),
		abortRun: vi.fn().mockResolvedValue({} as TestVaultTestExecution),
		linkBug: vi.fn().mockResolvedValue({} as TestVaultTestExecution),
		listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
		read: vi.fn().mockResolvedValue({} as TestVaultTestExecution),
		...overrides,
	};
}

function makeTestCase(overrides?: Partial<TestVaultTestCase>): TestVaultTestCase {
	return {
		id: 42,
		title: "Login with invalid credentials",
		description: "",
		state: "Active",
		areaPath: "MyProject\\QA",
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

function makeExecution(overrides?: Partial<TestVaultTestExecution>): TestVaultTestExecution {
	return {
		id: 99,
		testPlanId: 10,
		testCaseId: 42,
		environment: "QA",
		globalStatus: "Fail",
		stepResults: [
			{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [], defectIds: [] },
			{ stepIndex: 1, status: "Fail", comment: "Error not shown", evidenceIds: [], defectIds: [] },
		],
		evidence: [],
		bugLinks: [],
		source: "Manual",
		executedBy: "alice@example.com",
		executedAt: NOW,
		globalStatusOverridden: false,
		immutable: true,
		...overrides,
	};
}

// ─── buildBugDraft ────────────────────────────────────────────────────────────

describe("buildBugDraft", () => {
	it("title includes testCase.title and environment", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.title).toContain("Login with invalid credentials");
		expect(draft.title).toContain("QA");
	});

	it("title starts with [Fail]", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.title).toMatch(/^\[Fail\]/);
	});

	it("reproSteps includes action text of each failed step", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.reproSteps).toContain("Enter wrong password");
	});

	it("reproSteps does NOT include action text of passed steps", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.reproSteps).not.toContain("Open login page");
	});

	it("reproSteps includes the step comment", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.reproSteps).toContain("Error not shown");
	});

	it("reproSteps is empty when no steps failed", () => {
		const exec = makeExecution({
			stepResults: [{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [], defectIds: [] }],
		});
		const draft = buildBugDraft(exec, makeTestCase());
		expect(draft.reproSteps).toBe("");
	});

	it("areaPath matches testCase.areaPath", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.areaPath).toBe("MyProject\\QA");
	});

	it("environment matches execution environment", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.environment).toBe("QA");
	});

	it("severity defaults to '2 - High'", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.severity).toBe("2 - High");
	});

	it("description references the execution id", () => {
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		expect(draft.description).toContain("99");
	});
});

// ─── createBug ────────────────────────────────────────────────────────────────

describe("createBug", () => {
	it("calls createWorkItem with type 'Bug'", async () => {
		const adoClient = makeAdoClient();
		const service = createBugCreationService(adoClient, makeExecService());
		await service.createBug(buildBugDraft(makeExecution(), makeTestCase()), 99);
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"Bug",
			expect.arrayContaining([expect.objectContaining({ path: "/fields/System.Title" })])
		);
	});

	it("createWorkItem receives the draft title", async () => {
		const adoClient = makeAdoClient();
		const service = createBugCreationService(adoClient, makeExecService());
		const draft = buildBugDraft(makeExecution(), makeTestCase());
		await service.createBug(draft, 99);
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const titlePatch = patches.find((p) => p.path === "/fields/System.Title");
		expect(titlePatch?.value).toBe(draft.title);
	});

	it("fetches the execution WI to get its URL for the relation link", async () => {
		const adoClient = makeAdoClient();
		const service = createBugCreationService(adoClient, makeExecService());
		await service.createBug(buildBugDraft(makeExecution(), makeTestCase()), 99);
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledWith(99);
	});

	it("adds a System.LinkTypes.Related relation from bug to execution", async () => {
		const adoClient = makeAdoClient();
		const service = createBugCreationService(adoClient, makeExecService());
		await service.createBug(buildBugDraft(makeExecution(), makeTestCase()), 99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const linkPatch = patches.find((p) => p.path === "/relations/-");
		expect(linkPatch?.value).toMatchObject({
			rel: "System.LinkTypes.Related",
			url: "https://dev.azure.com/org/MyProject/_apis/wit/workitems/99",
		});
	});

	it("calls testExecutionService.linkBug with execution id and new bug id", async () => {
		const execService = makeExecService();
		const service = createBugCreationService(makeAdoClient(), execService);
		await service.createBug(buildBugDraft(makeExecution(), makeTestCase()), 99);
		expect(vi.mocked(execService.linkBug)).toHaveBeenCalledWith(99, 200);
	});

	it("returns the id and url of the created bug WI", async () => {
		const service = createBugCreationService(makeAdoClient(), makeExecService());
		const result = await service.createBug(buildBugDraft(makeExecution(), makeTestCase()), 99);
		expect(result.id).toBe(200);
		expect(result.url).toBe("https://dev.azure.com/org/MyProject/_apis/wit/workitems/200");
	});
});
