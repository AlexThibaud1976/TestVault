import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import {
	TestExecutionImmutableError,
	createTestExecutionService,
} from "./test-execution-service.js";

const PROJECT = "MyProject";
const NOW = "2026-05-08T12:00:00.000Z";

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn(),
		createWorkItem: vi.fn(),
		updateWorkItem: vi.fn(),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn(),
		...overrides,
	};
}

function rawExecution(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return {
		id: 99,
		rev: 1,
		url: `https://dev.azure.com/org/${PROJECT}/_apis/wit/workitems/99`,
		fields: {
			"System.State": "InProgress",
			"System.CreatedBy": "tester@example.com",
			"System.CreatedDate": NOW,
			"TestVault.TestPlanId": 10,
			"TestVault.TestCaseId": 5,
			"TestVault.Environment": "QA",
			"TestVault.GlobalStatus": "Unexecuted",
			"TestVault.StepResults": JSON.stringify([]),
			"TestVault.Evidence": JSON.stringify([]),
			"TestVault.BugLinks": JSON.stringify([]),
			"TestVault.ExecutionSource": "Manual",
			...fieldOverrides,
		},
	};
}

function rawCompleted(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return rawExecution({
		"System.State": "Completed",
		"TestVault.GlobalStatus": "Pass",
		"TestVault.StepResults": JSON.stringify([
			{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
		]),
		...fieldOverrides,
	});
}

// ─── startRun ─────────────────────────────────────────────────────────────────

describe("startRun", () => {
	it("creates a TestVault.TestExecution WI with InProgress state", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawExecution()),
		});
		await createTestExecutionService(adoClient, PROJECT).startRun({
			testPlanId: 10,
			testCaseId: 5,
			environment: "QA",
		});
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.TestExecution",
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.State", value: "InProgress" }),
				expect.objectContaining({ path: "/fields/TestVault.TestPlanId", value: 10 }),
				expect.objectContaining({ path: "/fields/TestVault.TestCaseId", value: 5 }),
				expect.objectContaining({ path: "/fields/TestVault.Environment", value: "QA" }),
			])
		);
	});

	it("returns an InProgressExecution with empty stepResults and evidence", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawExecution()),
		});
		const run = await createTestExecutionService(adoClient, PROJECT).startRun({
			testPlanId: 10,
			testCaseId: 5,
			environment: "QA",
		});
		expect(run.id).toBe(99);
		expect(run.testPlanId).toBe(10);
		expect(run.testCaseId).toBe(5);
		expect(run.environment).toBe("QA");
		expect(run.stepResults).toEqual([]);
		expect(run.evidence).toEqual([]);
		expect(run.bugLinks).toEqual([]);
		expect(run.source).toBe("Manual");
	});

	it("defaults source to Manual when not provided", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawExecution()),
		});
		await createTestExecutionService(adoClient, PROJECT).startRun({
			testPlanId: 1,
			testCaseId: 2,
			environment: "Dev",
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const sourcePatch = patches.find((p) => p.path === "/fields/TestVault.ExecutionSource");
		expect(sourcePatch?.value).toBe("Manual");
	});

	it("throws when environment is blank", async () => {
		const service = createTestExecutionService(makeAdoClient(), PROJECT);
		await expect(
			service.startRun({ testPlanId: 1, testCaseId: 2, environment: "" })
		).rejects.toThrow("Environment is required");
	});
});

// ─── saveStepResult ───────────────────────────────────────────────────────────

describe("saveStepResult", () => {
	it("appends a step result and writes the updated JSON array", async () => {
		const existing = rawExecution({
			"TestVault.StepResults": JSON.stringify([
				{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
			]),
		});
		const updated = rawExecution({
			"TestVault.StepResults": JSON.stringify([
				{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
				{ stepIndex: 1, status: "Fail", comment: "Observed 500", evidenceIds: [] },
			]),
		});
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(existing),
			updateWorkItem: vi.fn().mockResolvedValue(updated),
		});
		const run = await createTestExecutionService(adoClient, PROJECT).saveStepResult(99, {
			stepIndex: 1,
			status: "Fail",
			comment: "Observed 500",
			evidenceIds: [],
		});
		expect(run.stepResults).toHaveLength(2);
		expect(run.stepResults[1]?.status).toBe("Fail");
	});

	it("throws TestExecutionImmutableError when execution is Completed", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawCompleted()),
		});
		await expect(
			createTestExecutionService(adoClient, PROJECT).saveStepResult(99, {
				stepIndex: 0,
				status: "Pass",
				comment: "",
				evidenceIds: [],
			})
		).rejects.toThrow(TestExecutionImmutableError);
	});
});

// ─── attachEvidence ───────────────────────────────────────────────────────────

describe("attachEvidence", () => {
	it("appends an EvidenceRef and writes the updated JSON array", async () => {
		const evidenceRef = {
			attachmentId: "att-abc",
			filename: "screenshot.png",
			contentType: "image/png",
			sizeBytes: 12_000,
			uploadedAt: NOW,
		};
		const updated = rawExecution({
			"TestVault.Evidence": JSON.stringify([evidenceRef]),
		});
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawExecution()),
			updateWorkItem: vi.fn().mockResolvedValue(updated),
		});
		const run = await createTestExecutionService(adoClient, PROJECT).attachEvidence(
			99,
			evidenceRef
		);
		expect(run.evidence).toHaveLength(1);
		expect(run.evidence[0]?.attachmentId).toBe("att-abc");
	});

	it("throws TestExecutionImmutableError when execution is Completed", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawCompleted()),
		});
		await expect(
			createTestExecutionService(adoClient, PROJECT).attachEvidence(99, {
				attachmentId: "x",
				filename: "f.png",
				contentType: "image/png",
				sizeBytes: 1,
				uploadedAt: NOW,
			})
		).rejects.toThrow(TestExecutionImmutableError);
	});
});

// ─── finalizeRun ──────────────────────────────────────────────────────────────

describe("finalizeRun", () => {
	it("transitions state to Completed and writes globalStatus", async () => {
		const inProgress = rawExecution({
			"TestVault.StepResults": JSON.stringify([
				{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
				{ stepIndex: 1, status: "Pass", comment: "", evidenceIds: [] },
			]),
		});
		const finalized = rawCompleted({
			"TestVault.StepResults": inProgress.fields["TestVault.StepResults"],
			"TestVault.GlobalStatus": "Pass",
		});
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(inProgress),
			updateWorkItem: vi.fn().mockResolvedValue(finalized),
		});
		const exec = await createTestExecutionService(adoClient, PROJECT).finalizeRun(99);
		expect(exec.globalStatus).toBe("Pass");
		expect(exec.immutable).toBe(true);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		expect(patches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.State", value: "Completed" }),
				expect.objectContaining({ path: "/fields/TestVault.GlobalStatus", value: "Pass" }),
			])
		);
	});

	it("throws TestExecutionImmutableError when already Completed", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawCompleted()),
		});
		await expect(createTestExecutionService(adoClient, PROJECT).finalizeRun(99)).rejects.toThrow(
			TestExecutionImmutableError
		);
	});

	it("throws TestExecutionImmutableError with statusCode 403", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawCompleted()),
		});
		await expect(
			createTestExecutionService(adoClient, PROJECT).finalizeRun(99)
		).rejects.toMatchObject({ statusCode: 403 });
	});
});

// ─── linkBug ──────────────────────────────────────────────────────────────────

describe("linkBug", () => {
	it("appends a bug ID to bugLinks of a finalized execution", async () => {
		const updated = rawCompleted({
			"TestVault.BugLinks": JSON.stringify([42]),
		});
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawCompleted()),
			updateWorkItem: vi.fn().mockResolvedValue(updated),
		});
		const exec = await createTestExecutionService(adoClient, PROJECT).linkBug(99, 42);
		expect(exec.bugLinks).toContain(42);
	});

	it("throws when called on an InProgress execution", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawExecution()),
		});
		await expect(createTestExecutionService(adoClient, PROJECT).linkBug(99, 42)).rejects.toThrow(
			"not finalized"
		);
	});
});

// ─── globalStatus derivation ──────────────────────────────────────────────────

describe("globalStatus derivation (via finalizeRun)", () => {
	function makeServiceWithSteps(
		steps: Array<{ stepIndex: number; status: string; comment: string; evidenceIds: string[] }>
	) {
		const stepsJson = JSON.stringify(steps);
		const inProgress = rawExecution({ "TestVault.StepResults": stepsJson });
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(inProgress),
			updateWorkItem: vi.fn().mockImplementation((_id, patches) => {
				const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
					(p) => p.path === "/fields/TestVault.GlobalStatus"
				);
				return Promise.resolve(
					rawCompleted({
						"TestVault.StepResults": stepsJson,
						"TestVault.GlobalStatus": statusPatch?.value ?? "Unexecuted",
					})
				);
			}),
		});
		return { service: createTestExecutionService(adoClient, PROJECT), adoClient };
	}

	it("all Pass → Pass", async () => {
		const { service, adoClient } = makeServiceWithSteps([
			{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
			{ stepIndex: 1, status: "Pass", comment: "", evidenceIds: [] },
		]);
		await service.finalizeRun(99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
			(p) => p.path === "/fields/TestVault.GlobalStatus"
		);
		expect(statusPatch?.value).toBe("Pass");
	});

	it("one Fail → Fail", async () => {
		const { service, adoClient } = makeServiceWithSteps([
			{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
			{ stepIndex: 1, status: "Fail", comment: "err", evidenceIds: [] },
		]);
		await service.finalizeRun(99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
			(p) => p.path === "/fields/TestVault.GlobalStatus"
		);
		expect(statusPatch?.value).toBe("Fail");
	});

	it("Blocked no Fail → Blocked", async () => {
		const { service, adoClient } = makeServiceWithSteps([
			{ stepIndex: 0, status: "Pass", comment: "", evidenceIds: [] },
			{ stepIndex: 1, status: "Blocked", comment: "blocked", evidenceIds: [] },
		]);
		await service.finalizeRun(99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
			(p) => p.path === "/fields/TestVault.GlobalStatus"
		);
		expect(statusPatch?.value).toBe("Blocked");
	});

	it("all Skipped → Skipped", async () => {
		const { service, adoClient } = makeServiceWithSteps([
			{ stepIndex: 0, status: "Skipped", comment: "", evidenceIds: [] },
		]);
		await service.finalizeRun(99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
			(p) => p.path === "/fields/TestVault.GlobalStatus"
		);
		expect(statusPatch?.value).toBe("Skipped");
	});

	it("no steps → Unexecuted", async () => {
		const { service, adoClient } = makeServiceWithSteps([]);
		await service.finalizeRun(99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statusPatch = (patches as Array<{ path: string; value: unknown }>).find(
			(p) => p.path === "/fields/TestVault.GlobalStatus"
		);
		expect(statusPatch?.value).toBe("Unexecuted");
	});
});
