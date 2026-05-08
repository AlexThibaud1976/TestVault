import type { TestVaultTestCase } from "@atconseil/testvault-types";
import { describe, expect, it, vi } from "vitest";
import { AdoForbiddenError } from "./ado-client.js";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import {
	SnapshotImmutableError,
	SnapshotNameConflictError,
	createTestCaseVersionService,
} from "./test-case-version-service.js";

const NOW = "2026-05-08T12:00:00.000Z";

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn(),
		createWorkItem: vi.fn(),
		updateWorkItem: vi.fn(),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn().mockResolvedValue([]),
		uploadAttachment: vi.fn(),
		...overrides,
	};
}

function makeTestCase(overrides?: Partial<TestVaultTestCase>): TestVaultTestCase {
	return {
		id: 42,
		title: "Login test",
		description: "Validates login flow",
		state: "Active",
		areaPath: "MyProject\\QA",
		iterationPath: "",
		tags: ["auth", "smoke"],
		steps: [
			{ index: 0, action: "Open login page", expected: "Login form visible" },
			{ index: 1, action: "Enter credentials", expected: "Dashboard shown" },
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

function rawVersion(id: number, name: string): RawWorkItem {
	return {
		id,
		rev: 1,
		url: `https://dev.azure.com/org/MyProject/_apis/wit/workitems/${id}`,
		fields: {
			"System.State": "Frozen",
			"System.CreatedBy": "alice@example.com",
			"System.CreatedDate": NOW,
			"TestVault.ParentTestCaseId": 42,
			"TestVault.SnapshotName": name,
			"TestVault.SnapshotComment": "",
			"TestVault.SnapshotTitle": "Login test",
			"TestVault.SnapshotDescription": "Validates login flow",
			"TestVault.SnapshotSteps": JSON.stringify([]),
			"TestVault.SnapshotTags": JSON.stringify(["auth"]),
		},
	};
}

// ─── createSnapshot ───────────────────────────────────────────────────────────

describe("createSnapshot", () => {
	it("calls createWorkItem with type TestVault.TestCaseVersion", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawVersion(200, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		await service.createSnapshot(makeTestCase(), { name: "v1.0", parentTestCaseId: 42 });
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.TestCaseVersion",
			expect.any(Array)
		);
	});

	it("sets System.State to Frozen", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawVersion(200, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		await service.createSnapshot(makeTestCase(), { name: "v1.0", parentTestCaseId: 42 });
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const statePatch = patches.find((p) => p.path === "/fields/System.State");
		expect(statePatch?.value).toBe("Frozen");
	});

	it("stores the snapshot name and parent TC ID", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawVersion(200, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		await service.createSnapshot(makeTestCase(), { name: "v1.0", parentTestCaseId: 42 });
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const namePatch = patches.find((p) => p.path === "/fields/TestVault.SnapshotName");
		const parentPatch = patches.find((p) => p.path === "/fields/TestVault.ParentTestCaseId");
		expect(namePatch?.value).toBe("v1.0");
		expect(parentPatch?.value).toBe(42);
	});

	it("snapshots the testCase title, steps, and tags", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawVersion(200, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		const tc = makeTestCase();
		await service.createSnapshot(tc, { name: "v1.0", parentTestCaseId: 42 });
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const titlePatch = patches.find((p) => p.path === "/fields/TestVault.SnapshotTitle");
		const stepsPatch = patches.find((p) => p.path === "/fields/TestVault.SnapshotSteps");
		const tagsPatch = patches.find((p) => p.path === "/fields/TestVault.SnapshotTags");
		expect(titlePatch?.value).toBe(tc.title);
		expect(stepsPatch?.value).toBe(JSON.stringify(tc.steps));
		expect(tagsPatch?.value).toBe(JSON.stringify(tc.tags));
	});

	it("throws SnapshotNameConflictError when the name is already used by this TC", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([301]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawVersion(301, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		await expect(
			service.createSnapshot(makeTestCase(), { name: "v1.0", parentTestCaseId: 42 })
		).rejects.toThrow(SnapshotNameConflictError);
	});

	it("wraps AdoForbiddenError from createWorkItem as SnapshotImmutableError", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockRejectedValue(new AdoForbiddenError()),
		});
		const service = createTestCaseVersionService(adoClient);
		await expect(
			service.createSnapshot(makeTestCase(), { name: "v1.0", parentTestCaseId: 42 })
		).rejects.toThrow(SnapshotImmutableError);
	});

	it("returns a TestVaultTestCaseVersion with the created WI id", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawVersion(200, "v1.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		const version = await service.createSnapshot(makeTestCase(), {
			name: "v1.0",
			parentTestCaseId: 42,
		});
		expect(version.id).toBe(200);
		expect(version.name).toBe("v1.0");
		expect(version.immutable).toBe(true);
	});
});

// ─── listSnapshots ────────────────────────────────────────────────────────────

describe("listSnapshots", () => {
	it("queries WIQL for TestVault.TestCaseVersion by parentTestCaseId", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([]),
		});
		const service = createTestCaseVersionService(adoClient);
		await service.listSnapshots(42);
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("TestVault.TestCaseVersion");
		expect(wiql).toContain("42");
	});

	it("returns snapshots with name and immutable=true", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([301, 302]),
			fetchWorkItem: vi
				.fn()
				.mockResolvedValueOnce(rawVersion(301, "v1.0"))
				.mockResolvedValueOnce(rawVersion(302, "v2.0")),
		});
		const service = createTestCaseVersionService(adoClient);
		const snapshots = await service.listSnapshots(42);
		expect(snapshots).toHaveLength(2);
		expect(snapshots[0]?.name).toBe("v1.0");
		expect(snapshots[0]?.immutable).toBe(true);
	});

	it("returns empty array when no snapshots exist", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([]),
		});
		const service = createTestCaseVersionService(adoClient);
		const snapshots = await service.listSnapshots(42);
		expect(snapshots).toHaveLength(0);
	});
});
