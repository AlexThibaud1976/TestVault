import { describe, expect, it, vi } from "vitest";
import type { IAdoClient, RawWorkItem } from "./ado-client.js";
import { createTestCaseService } from "./test-case-service.js";

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

function rawTestCase(fieldOverrides?: Record<string, unknown>): RawWorkItem {
	return {
		id: 42,
		rev: 1,
		url: `https://dev.azure.com/org/${PROJECT}/_apis/wit/workitems/42`,
		fields: {
			"System.Title": "Login flow",
			"System.Description": "<p>Test description</p>",
			"System.State": "Design",
			"System.AreaPath": "MyProject\\Auth",
			"System.IterationPath": "MyProject\\Sprint 1",
			"System.Tags": "auth; login",
			"System.AssignedTo": undefined,
			"System.CreatedBy": "alice@example.com",
			"System.CreatedDate": NOW,
			"System.ChangedBy": "alice@example.com",
			"System.ChangedDate": NOW,
			"TestVault.Priority": 2,
			"TestVault.Steps": JSON.stringify([
				{ index: 1, action: "Open login page", expected: "Page loads" },
			]),
			"TestVault.AutomationStatus": "Manual",
			"TestVault.AutomationKey": undefined,
			"TestVault.Gherkin": undefined,
			"TestVault.EstimatedDuration": undefined,
			"TestVault.PreconditionLinks": undefined,
			...fieldOverrides,
		},
	};
}

// ─── create ───────────────────────────────────────────────────────────────────

describe("create", () => {
	it("calls createWorkItem with correct WIT type and title patch", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		await createTestCaseService(adoClient, PROJECT).create({
			title: "Login flow",
			areaPath: "MyProject\\Auth",
		});
		expect(vi.mocked(adoClient.createWorkItem)).toHaveBeenCalledWith(
			"TestVault.TestCase",
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Login flow" }),
			])
		);
	});

	it("throws 'Title is required' when title is blank", async () => {
		const service = createTestCaseService(makeAdoClient(), PROJECT);
		await expect(service.create({ title: "  ", areaPath: "MyProject" })).rejects.toThrow(
			"Title is required"
		);
	});

	it("serializes steps array as JSON string", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const steps = [{ index: 1, action: "Do X", expected: "See Y" }];
		await createTestCaseService(adoClient, PROJECT).create({
			title: "TC",
			areaPath: "MyProject",
			steps,
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		const stepsPatch = patches.find((p) => p.path === "/fields/TestVault.Steps");
		expect(typeof stepsPatch?.value).toBe("string");
		expect(JSON.parse(stepsPatch?.value as string)).toEqual(steps);
	});

	it("includes areaPath patch", async () => {
		const adoClient = makeAdoClient({
			createWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		await createTestCaseService(adoClient, PROJECT).create({
			title: "TC",
			areaPath: "MyProject\\Auth",
		});
		const patches = vi.mocked(adoClient.createWorkItem).mock.lastCall?.[1] ?? [];
		expect(patches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: "/fields/System.AreaPath",
					value: "MyProject\\Auth",
				}),
			])
		);
	});
});

// ─── read ─────────────────────────────────────────────────────────────────────

describe("read", () => {
	it("maps ADO fields to domain type", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const tc = await createTestCaseService(adoClient, PROJECT).read(42);
		expect(tc.id).toBe(42);
		expect(tc.title).toBe("Login flow");
		expect(tc.priority).toBe(2);
		expect(tc.state).toBe("Design");
		expect(tc.areaPath).toBe("MyProject\\Auth");
		expect(tc.automationStatus).toBe("Manual");
	});

	it("parses Steps JSON back to array", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const tc = await createTestCaseService(adoClient, PROJECT).read(42);
		expect(tc.steps).toHaveLength(1);
		expect(tc.steps[0]?.action).toBe("Open login page");
	});

	it("splits Tags string into array and trims whitespace", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const tc = await createTestCaseService(adoClient, PROJECT).read(42);
		expect(tc.tags).toEqual(["auth", "login"]);
	});

	it("returns empty steps array when Steps field is null", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase({ "TestVault.Steps": null })),
		});
		const tc = await createTestCaseService(adoClient, PROJECT).read(42);
		expect(tc.steps).toEqual([]);
	});

	it("returns empty tags array when Tags field is null", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase({ "System.Tags": null })),
		});
		const tc = await createTestCaseService(adoClient, PROJECT).read(42);
		expect(tc.tags).toEqual([]);
	});
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("update", () => {
	it("calls updateWorkItem with patched title", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		await createTestCaseService(adoClient, PROJECT).update(42, { title: "Updated" });
		expect(vi.mocked(adoClient.updateWorkItem)).toHaveBeenCalledWith(
			42,
			expect.arrayContaining([
				expect.objectContaining({ path: "/fields/System.Title", value: "Updated" }),
			])
		);
	});

	it("throws 'Title is required' when title patch is empty string", async () => {
		const service = createTestCaseService(makeAdoClient(), PROJECT);
		await expect(service.update(42, { title: "" })).rejects.toThrow("Title is required");
	});

	it("only sends fields present in the patch object", async () => {
		const adoClient = makeAdoClient({
			updateWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		await createTestCaseService(adoClient, PROJECT).update(42, { priority: 1 });
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		expect(patches.some((p) => p.path.includes("System.Title"))).toBe(false);
		expect(patches.some((p) => p.path.includes("TestVault.Priority"))).toBe(true);
	});
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("delete", () => {
	it("delegates to adoClient.deleteWorkItem", async () => {
		const adoClient = makeAdoClient({
			deleteWorkItem: vi.fn().mockResolvedValue(undefined),
		});
		await createTestCaseService(adoClient, PROJECT).delete(42);
		expect(vi.mocked(adoClient.deleteWorkItem)).toHaveBeenCalledWith(42);
	});
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe("list", () => {
	it("queries WIQL for TestVault.TestCase type", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		await createTestCaseService(adoClient, PROJECT).list();
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("TestVault Test Case");
	});

	it("filters by areaPath when provided", async () => {
		const adoClient = makeAdoClient({ queryByWiql: vi.fn().mockResolvedValue([]) });
		await createTestCaseService(adoClient, PROJECT).list({ areaPath: "MyProject\\Auth" });
		const wiql = vi.mocked(adoClient.queryByWiql).mock.lastCall?.[0] ?? "";
		expect(wiql).toContain("MyProject\\Auth");
	});

	it("fetches each returned ID and maps to domain type", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([42, 43]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const results = await createTestCaseService(adoClient, PROJECT).list();
		expect(results).toHaveLength(2);
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledTimes(2);
	});

	it("respects top limit", async () => {
		const adoClient = makeAdoClient({
			queryByWiql: vi.fn().mockResolvedValue([1, 2, 3, 4, 5]),
			fetchWorkItem: vi.fn().mockResolvedValue(rawTestCase()),
		});
		const results = await createTestCaseService(adoClient, PROJECT).list({ top: 2 });
		expect(results).toHaveLength(2);
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledTimes(2);
	});
});
