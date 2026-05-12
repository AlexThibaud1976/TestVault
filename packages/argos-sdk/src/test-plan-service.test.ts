import type { TestVaultTestCase } from "@atconseil/argos-types";
import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import type {
	ITestCaseVersionService,
	TestVaultTestCaseVersion,
} from "./test-case-version-service.js";
import { createTestPlanService } from "./test-plan-service.js";
import type { ITestSetService } from "./test-set-service.js";

const PROJECT = "MyProject";
const NOW = "2026-05-08T15:00:00.000Z";

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn(),
		createWorkItem: vi.fn(),
		updateWorkItem: vi.fn(),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn(),
		uploadAttachment: vi.fn(),
		...overrides,
	};
}

function rawTestPlan(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return {
		id: 20,
		rev: 1,
		url: `https://dev.azure.com/org/${PROJECT}/_apis/wit/workitems/20`,
		fields: {
			"System.Title": "Sprint 42 Plan",
			"System.Description": "",
			"System.State": "Draft",
			"System.IterationPath": "MyProject\\Sprint 42",
			"System.AssignedTo": "alice@example.com",
			"System.CreatedBy": "alice@example.com",
			"System.CreatedDate": NOW,
			"TestVault.Environments": JSON.stringify(["QA", "Staging"]),
			"TestVault.TestSetIds": JSON.stringify([10, 11]),
			"TestVault.AdditionalTestCaseIds": JSON.stringify([5]),
			"TestVault.LockedSnapshotIds": undefined,
			...fieldOverrides,
		},
	};
}

// ─── create ───────────────────────────────────────────────────────────────────

describe("create", () => {
	it("calls createWorkItem with WIT type TestVault.TestPlan and name patch", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		await createTestPlanService(adoClient, PROJECT).create({
			name: "Sprint 42 Plan",
			owner: "alice@example.com",
		});
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.TestPlan",
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Sprint 42 Plan" }),
			])
		);
	});

	it("throws 'Name is required' when name is blank", async () => {
		const service = createTestPlanService(makeAdoClient(), PROJECT);
		await expect(service.create({ name: "", owner: "alice@example.com" })).rejects.toThrow(
			"Name is required"
		);
	});

	it("serializes environments and testSetIds as JSON strings", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		await createTestPlanService(adoClient, PROJECT).create({
			name: "Plan",
			owner: "alice@example.com",
			environments: ["QA", "Prod"],
			testSetIds: [10, 11],
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const envPatch = patches.find((p) => p.path === "/fields/TestVault.Environments");
		const setPatch = patches.find((p) => p.path === "/fields/TestVault.TestSetIds");
		expect(JSON.parse(envPatch?.value as string)).toEqual(["QA", "Prod"]);
		expect(JSON.parse(setPatch?.value as string)).toEqual([10, 11]);
	});
});

// ─── read ─────────────────────────────────────────────────────────────────────

describe("read", () => {
	it("maps ADO fields to domain type", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		const plan = await createTestPlanService(adoClient, PROJECT).read(20);
		expect(plan.id).toBe(20);
		expect(plan.name).toBe("Sprint 42 Plan");
		expect(plan.state).toBe("Draft");
		expect(plan.owner).toBe("alice@example.com");
		expect(plan.environments).toEqual(["QA", "Staging"]);
		expect(plan.testSetIds).toEqual([10, 11]);
		expect(plan.additionalTestCaseIds).toEqual([5]);
	});

	it("returns empty arrays when JSON fields are null", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"TestVault.Environments": null,
					"TestVault.TestSetIds": null,
					"TestVault.AdditionalTestCaseIds": null,
				})
			),
		});
		const plan = await createTestPlanService(adoClient, PROJECT).read(20);
		expect(plan.environments).toEqual([]);
		expect(plan.testSetIds).toEqual([]);
		expect(plan.additionalTestCaseIds).toEqual([]);
	});

	it("maps lockedSnapshotIds when present", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValue(
					rawTestPlan({ "TestVault.LockedSnapshotIds": JSON.stringify([100, 101]) })
				),
		});
		const plan = await createTestPlanService(adoClient, PROJECT).read(20);
		expect(plan.lockedSnapshotIds).toEqual([100, 101]);
	});
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("update", () => {
	it("patches name correctly", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		await createTestPlanService(adoClient, PROJECT).update(20, { name: "Renamed" });
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			20,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Renamed" }),
			])
		);
	});

	it("throws 'Name is required' when name patch is empty", async () => {
		const service = createTestPlanService(makeAdoClient(), PROJECT);
		await expect(service.update(20, { name: "" })).rejects.toThrow("Name is required");
	});

	it("throws 'Test Plan is locked' when patching testSetIds on a Locked plan", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestPlan({ "System.State": "Locked" })),
		});
		const service = createTestPlanService(adoClient, PROJECT);
		await expect(service.update(20, { testSetIds: [99] })).rejects.toThrow("Test Plan is locked");
	});

	it("throws 'Test Plan is locked' when patching additionalTestCaseIds on a Locked plan", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestPlan({ "System.State": "Locked" })),
		});
		const service = createTestPlanService(adoClient, PROJECT);
		await expect(service.update(20, { additionalTestCaseIds: [42] })).rejects.toThrow(
			"Test Plan is locked"
		);
	});

	it("does NOT fetch current state when non-composition fields are patched", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		await createTestPlanService(adoClient, PROJECT).update(20, { name: "New name" });
		expect(vi.mocked(adoClient.fetchWorkItem)).not.toHaveBeenCalled();
	});
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("delete", () => {
	it("deletes only the plan WI", async () => {
		const adoClient = makeAdoClient({
			deleteWorkItem: vi.fn().mockResolvedValue(undefined),
		});
		await createTestPlanService(adoClient, PROJECT).delete(20);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledWith(20);
	});
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("list", () => {
	it("queries WIQL for TestVault.TestPlan type", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		await createTestPlanService(adoClient, PROJECT).list();
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("TestVault.TestPlan");
	});

	it("fetches each returned ID", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([20, 21]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		const results = await createTestPlanService(adoClient, PROJECT).list();
		expect(results).toHaveLength(2);
	});
});

// ─── lock ─────────────────────────────────────────────────────────────────────

describe("lock", () => {
	it("calls updateWorkItem with State=Locked", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan({ "System.State": "Locked" })),
		});
		await createTestPlanService(adoClient, PROJECT).lock(20);
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			20,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.State", value: "Locked" }),
			])
		);
	});

	it("does NOT create snapshots (deferred to T-3.x)", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan({ "System.State": "Locked" })),
		});
		await createTestPlanService(adoClient, PROJECT).lock(20);
		expect(vi.mocked(adoClient.createWorkItem)).not.toHaveBeenCalled();
	});
});

// ─── unlock ───────────────────────────────────────────────────────────────────

describe("unlock", () => {
	it("calls updateWorkItem with State=Draft", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
		});
		await createTestPlanService(adoClient, PROJECT).unlock(20);
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			20,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.State", value: "Draft" }),
			])
		);
	});
});

// ─── lockWithAutoSnapshot ─────────────────────────────────────────────────────

function makeTC(id: number): TestVaultTestCase {
	return {
		id,
		title: `TC ${id}`,
		description: "",
		state: "Active",
		areaPath: "MyProject\\QA",
		iterationPath: "",
		tags: [],
		steps: [],
		priority: 2,
		automationStatus: "Manual",
		preconditionLinks: [],
		createdBy: "alice@example.com",
		createdAt: NOW,
		modifiedBy: "alice@example.com",
		modifiedAt: NOW,
	};
}

function makeVersion(id: number, tcId: number): TestVaultTestCaseVersion {
	return {
		id,
		name: `auto-lock-20-${tcId}`,
		comment: "",
		parentTestCaseId: tcId,
		snapshotTitle: `TC ${tcId}`,
		snapshotDescription: "",
		snapshotSteps: "[]",
		snapshotTags: "[]",
		createdBy: "alice@example.com",
		createdAt: NOW,
		immutable: true,
	};
}

function makeTestSetService(tcIds: number[]): ITestSetService {
	return {
		create: vi.fn(),
		read: vi.fn().mockResolvedValue({ id: 10, testCaseIds: tcIds }),
		update: vi.fn(),
		delete: vi.fn(),
		list: vi.fn(),
		addTestCases: vi.fn(),
		removeTestCases: vi.fn(),
		resolveTestCaseIds: vi.fn().mockResolvedValue(tcIds),
	};
}

function makeVersionService(tcToVersionId: Record<number, number>): ITestCaseVersionService {
	return {
		listSnapshots: vi.fn().mockResolvedValue([]),
		createSnapshot: vi
			.fn()
			.mockImplementation((_tc: TestVaultTestCase) =>
				Promise.resolve(makeVersion(tcToVersionId[_tc.id] ?? 999, _tc.id))
			),
	};
}

describe("lockWithAutoSnapshot", () => {
	it("creates a snapshot for each TC in the plan (testSets + additionalTestCaseIds)", async () => {
		// Plan has testSetIds=[10] with TC 5, and additionalTestCaseIds=[6] (different TC)
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValue(rawTestPlan({ "TestVault.AdditionalTestCaseIds": JSON.stringify([6]) })),
			updateWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"System.State": "Locked",
					"TestVault.LockedSnapshotIds": JSON.stringify([100, 101]),
				})
			),
		});
		const testSetService = makeTestSetService([5]); // set 10 has TC 5; set 11 has TC 5 (deduped to [5])
		const tcFetcher = vi.fn().mockResolvedValueOnce(makeTC(5)).mockResolvedValueOnce(makeTC(6));
		const versionService = makeVersionService({ 5: 100, 6: 101 });
		const service = createTestPlanService(adoClient, PROJECT);
		await service.lockWithAutoSnapshot(20, {
			testSetService,
			fetchTestCase: tcFetcher,
			versionService,
		});
		expect(vi.mocked(versionService.createSnapshot)).toHaveBeenCalledTimes(2);
	});

	it("stores snapshot IDs in LockedSnapshotIds and sets State=Locked", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestPlan()),
			updateWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"System.State": "Locked",
					"TestVault.LockedSnapshotIds": JSON.stringify([100]),
				})
			),
		});
		const testSetService = makeTestSetService([]);
		const tcFetcher = vi.fn().mockResolvedValue(makeTC(5));
		const versionService = makeVersionService({ 5: 100 });
		// Plan with only additionalTestCaseIds=[5]
		adoClient.fetchWorkItem = vi.fn().mockResolvedValue(
			rawTestPlan({
				"TestVault.TestSetIds": JSON.stringify([]),
				"TestVault.AdditionalTestCaseIds": JSON.stringify([5]),
			})
		);
		const service = createTestPlanService(adoClient, PROJECT);
		await service.lockWithAutoSnapshot(20, {
			testSetService,
			fetchTestCase: tcFetcher,
			versionService,
		});
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const statePatch = patches.find((p) => p.path === "/fields/System.State");
		const snapshotPatch = patches.find((p) => p.path === "/fields/TestVault.LockedSnapshotIds");
		expect(statePatch?.value).toBe("Locked");
		expect(JSON.parse(snapshotPatch?.value as string)).toContain(100);
	});

	it("works with an empty plan (no TCs) — still sets State=Locked", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"TestVault.TestSetIds": JSON.stringify([]),
					"TestVault.AdditionalTestCaseIds": JSON.stringify([]),
				})
			),
			updateWorkItem: vi.fn().mockResolvedValue(rawTestPlan({ "System.State": "Locked" })),
		});
		const testSetService = makeTestSetService([]);
		const versionService = makeVersionService({});
		const service = createTestPlanService(adoClient, PROJECT);
		await service.lockWithAutoSnapshot(20, {
			testSetService,
			fetchTestCase: vi.fn(),
			versionService,
		});
		expect(vi.mocked(versionService.createSnapshot)).not.toHaveBeenCalled();
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			20,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.State", value: "Locked" }),
			])
		);
	});

	it("returns the locked plan with lockedSnapshotIds populated", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"TestVault.TestSetIds": JSON.stringify([]),
					"TestVault.AdditionalTestCaseIds": JSON.stringify([5]),
				})
			),
			updateWorkItem: vi.fn().mockResolvedValue(
				rawTestPlan({
					"System.State": "Locked",
					"TestVault.LockedSnapshotIds": JSON.stringify([100]),
				})
			),
		});
		const testSetService = makeTestSetService([]);
		const tcFetcher = vi.fn().mockResolvedValue(makeTC(5));
		const versionService = makeVersionService({ 5: 100 });
		const service = createTestPlanService(adoClient, PROJECT);
		const locked = await service.lockWithAutoSnapshot(20, {
			testSetService,
			fetchTestCase: tcFetcher,
			versionService,
		});
		expect(locked.state).toBe("Locked");
		expect(locked.lockedSnapshotIds).toContain(100);
	});
});
