import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import { createTestSetService } from "./test-set-service.js";

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

function rawTestSet(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return {
		id: 10,
		rev: 1,
		url: `https://dev.azure.com/org/${PROJECT}/_apis/wit/workitems/10`,
		fields: {
			"System.Title": "Auth Tests",
			"System.Description": "",
			"System.State": "Active",
			"System.AreaPath": "MyProject\\Auth",
			"System.Tags": "",
			"System.CreatedBy": "alice@example.com",
			"System.CreatedDate": NOW,
			"System.ChangedBy": "alice@example.com",
			"System.ChangedDate": NOW,
			"TestVault.TestCaseIds": JSON.stringify([1, 2, 3]),
			"TestVault.WiqlQuery": undefined,
			...fieldOverrides,
		},
	};
}

// ─── create ───────────────────────────────────────────────────────────────────

describe("create", () => {
	it("calls createWorkItem with WIT type TestVault.TestSet and name patch", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).create({
			name: "Auth Tests",
			areaPath: "MyProject\\Auth",
		});
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.TestSet",
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Auth Tests" }),
			])
		);
	});

	it("throws 'Name is required' when name is blank", async () => {
		const service = createTestSetService(makeAdoClient(), PROJECT);
		await expect(service.create({ name: "  ", areaPath: "MyProject" })).rejects.toThrow(
			"Name is required"
		);
	});

	it("serializes testCaseIds as JSON string", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).create({
			name: "Set",
			areaPath: "MyProject",
			testCaseIds: [1, 2, 3],
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.TestCaseIds");
		expect(typeof p?.value).toBe("string");
		expect(JSON.parse(p?.value as string)).toEqual([1, 2, 3]);
	});
});

// ─── read ─────────────────────────────────────────────────────────────────────

describe("read", () => {
	it("maps ADO fields to domain type", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		const set = await createTestSetService(adoClient, PROJECT).read(10);
		expect(set.id).toBe(10);
		expect(set.name).toBe("Auth Tests");
		expect(set.areaPath).toBe("MyProject\\Auth");
		expect(set.testCaseIds).toEqual([1, 2, 3]);
		expect(set.wiqlQuery).toBeUndefined();
	});

	it("returns empty testCaseIds when field is null", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet({ "TestVault.TestCaseIds": null })),
		});
		const set = await createTestSetService(adoClient, PROJECT).read(10);
		expect(set.testCaseIds).toEqual([]);
	});

	it("maps wiqlQuery field when present", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValue(
					rawTestSet({ "TestVault.WiqlQuery": "SELECT [System.Id] FROM WorkItems" })
				),
		});
		const set = await createTestSetService(adoClient, PROJECT).read(10);
		expect(set.wiqlQuery).toBe("SELECT [System.Id] FROM WorkItems");
	});
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("update", () => {
	it("calls updateWorkItem with patched name", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).update(10, { name: "Renamed" });
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			10,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Renamed" }),
			])
		);
	});

	it("throws 'Name is required' when name patch is empty", async () => {
		const service = createTestSetService(makeAdoClient(), PROJECT);
		await expect(service.update(10, { name: "" })).rejects.toThrow("Name is required");
	});
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("delete", () => {
	it("deletes only the set WI — does not touch TC IDs", async () => {
		const adoClient = makeAdoClient({
			deleteWorkItem: vi.fn().mockResolvedValue(undefined),
		});
		await createTestSetService(adoClient, PROJECT).delete(10);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledWith(10);
	});
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("list", () => {
	it("queries WIQL for TestVault.TestSet type", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		await createTestSetService(adoClient, PROJECT).list();
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("TestVault Test Set");
	});

	it("fetches each returned ID", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([10, 11]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		const results = await createTestSetService(adoClient, PROJECT).list();
		expect(results).toHaveLength(2);
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledTimes(2);
	});
});

// ─── addTestCases ─────────────────────────────────────────────────────────────

describe("addTestCases", () => {
	it("merges new IDs with existing ones and updates", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
			updateWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).addTestCases(10, [4, 5]);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.TestCaseIds");
		expect(JSON.parse(p?.value as string)).toEqual([1, 2, 3, 4, 5]);
	});

	it("deduplicates IDs when adding an already-present ID", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
			updateWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).addTestCases(10, [2, 4]);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.TestCaseIds");
		expect(JSON.parse(p?.value as string)).toEqual([1, 2, 3, 4]);
	});
});

// ─── removeTestCases ──────────────────────────────────────────────────────────

describe("removeTestCases", () => {
	it("removes specified IDs and updates", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
			updateWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		await createTestSetService(adoClient, PROJECT).removeTestCases(10, [2]);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.TestCaseIds");
		expect(JSON.parse(p?.value as string)).toEqual([1, 3]);
	});
});

// ─── resolveTestCaseIds ───────────────────────────────────────────────────────

describe("resolveTestCaseIds", () => {
	it("returns static testCaseIds when wiqlQuery is absent", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestSet()),
		});
		const ids = await createTestSetService(adoClient, PROJECT).resolveTestCaseIds(10);
		expect(ids).toEqual([1, 2, 3]);
		expect(vi.mocked(adoClient.queryByWiql)).not.toHaveBeenCalled();
	});

	it("runs wiqlQuery and returns IDs when dynamic", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawTestSet({
					"TestVault.TestCaseIds": null,
					"TestVault.WiqlQuery":
						"SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault.TestCase'",
				})
			),
			queryByWiql: vi.fn().mockResolvedValue([7, 8, 9]),
		});
		const ids = await createTestSetService(adoClient, PROJECT).resolveTestCaseIds(10);
		expect(ids).toEqual([7, 8, 9]);
		expect(vi.mocked(adoClient.queryByWiql)).toHaveBeenCalledOnce();
	});
});
