import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import { createPreconditionService } from "./precondition-service.js";

const PROJECT = "MyProject";
const NOW = "2026-05-08T15:00:00.000Z";

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

function rawPrecondition(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return {
		id: 30,
		rev: 1,
		url: `https://dev.azure.com/org/${PROJECT}/_apis/wit/workitems/30`,
		fields: {
			"System.Title": "User must be logged out",
			"System.Description": "Ensure no active session exists.",
			"System.Tags": "auth; session",
			"System.CreatedBy": "alice@example.com",
			"System.CreatedDate": NOW,
			"TestVault.LinkedTestCaseIds": JSON.stringify([1, 2]),
			...fieldOverrides,
		},
	};
}

// ─── create ───────────────────────────────────────────────────────────────────

describe("create", () => {
	it("calls createWorkItem with WIT type TestVault.Precondition and title patch", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).create({
			title: "User must be logged out",
		});
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.Precondition",
			expect.arrayContaining([
				expect.objectContaining({
					path: "/fields/System.Title",
					value: "User must be logged out",
				}),
			])
		);
	});

	it("throws 'Title is required' when title is blank", async () => {
		const service = createPreconditionService(makeAdoClient(), PROJECT);
		await expect(service.create({ title: "  " })).rejects.toThrow("Title is required");
	});

	it("serializes tags as semicolon-separated string", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).create({
			title: "Precond",
			tags: ["auth", "session"],
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/System.Tags");
		expect(p?.value).toBe("auth; session");
	});

	it("serializes linkedTestCaseIds as JSON string", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).create({
			title: "Precond",
			linkedTestCaseIds: [1, 2],
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.LinkedTestCaseIds");
		expect(JSON.parse(p?.value as string)).toEqual([1, 2]);
	});
});

// ─── read ─────────────────────────────────────────────────────────────────────

describe("read", () => {
	it("maps ADO fields to domain type", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		const precond = await createPreconditionService(adoClient, PROJECT).read(30);
		expect(precond.id).toBe(30);
		expect(precond.title).toBe("User must be logged out");
		expect(precond.description).toBe("Ensure no active session exists.");
		expect(precond.tags).toEqual(["auth", "session"]);
		expect(precond.linkedTestCaseIds).toEqual([1, 2]);
	});

	it("returns empty arrays when JSON fields are null", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawPrecondition({
					"System.Tags": null,
					"TestVault.LinkedTestCaseIds": null,
				})
			),
		});
		const precond = await createPreconditionService(adoClient, PROJECT).read(30);
		expect(precond.tags).toEqual([]);
		expect(precond.linkedTestCaseIds).toEqual([]);
	});
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("update", () => {
	it("patches title correctly", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).update(30, {
			title: "Renamed precond",
		});
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			30,
			expect.arrayContaining([
				expect.objectContaining({
					path: "/fields/System.Title",
					value: "Renamed precond",
				}),
			])
		);
	});

	it("throws 'Title is required' when title patch is empty", async () => {
		const service = createPreconditionService(makeAdoClient(), PROJECT);
		await expect(service.update(30, { title: "" })).rejects.toThrow("Title is required");
	});
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("delete", () => {
	it("deletes only the precondition WI", async () => {
		const adoClient = makeAdoClient({
			deleteWorkItem: vi.fn().mockResolvedValue(undefined),
		});
		await createPreconditionService(adoClient, PROJECT).delete(30);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledWith(30);
	});
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("list", () => {
	it("queries WIQL for TestVault.Precondition type", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		await createPreconditionService(adoClient, PROJECT).list();
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("TestVault.Precondition");
	});

	it("fetches each returned ID", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([30, 31]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		const results = await createPreconditionService(adoClient, PROJECT).list();
		expect(results).toHaveLength(2);
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledTimes(2);
	});
});

// ─── linkTestCase ─────────────────────────────────────────────────────────────

describe("linkTestCase", () => {
	it("adds TC ID to linkedTestCaseIds and updates", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
			updateWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).linkTestCase(30, 99);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.LinkedTestCaseIds");
		expect(JSON.parse(p?.value as string)).toContain(99);
	});

	it("deduplicates when TC ID is already linked", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
			updateWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).linkTestCase(30, 2);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.LinkedTestCaseIds");
		const ids: number[] = JSON.parse(p?.value as string);
		expect(ids.filter((x) => x === 2)).toHaveLength(1);
	});
});

// ─── unlinkTestCase ───────────────────────────────────────────────────────────

describe("unlinkTestCase", () => {
	it("removes TC ID from linkedTestCaseIds and updates", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
			updateWorkItem: vi.fn().mockResolvedValue(rawPrecondition()),
		});
		await createPreconditionService(adoClient, PROJECT).unlinkTestCase(30, 1);
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const p = patches.find((x) => x.path === "/fields/TestVault.LinkedTestCaseIds");
		expect(JSON.parse(p?.value as string)).not.toContain(1);
		expect(JSON.parse(p?.value as string)).toContain(2);
	});
});

// ─── getForTestCase ───────────────────────────────────────────────────────────

describe("getForTestCase", () => {
	it("returns only preconditions linked to the given TC ID", async () => {
		const linkedPrecond = rawPrecondition({ "TestVault.LinkedTestCaseIds": JSON.stringify([5]) });
		const unlinkedPrecond = rawPrecondition({
			id: 31,
			"TestVault.LinkedTestCaseIds": JSON.stringify([99]),
		});
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([30, 31]),
			fetchWorkItem: vi
				.fn()
				.mockResolvedValueOnce(linkedPrecond)
				.mockResolvedValueOnce(unlinkedPrecond),
		});
		const results = await createPreconditionService(adoClient, PROJECT).getForTestCase(5);
		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe(30);
	});

	it("returns empty array when no preconditions are linked", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		const results = await createPreconditionService(adoClient, PROJECT).getForTestCase(5);
		expect(results).toEqual([]);
	});
});
