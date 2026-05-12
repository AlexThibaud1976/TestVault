import { describe, expect, it, vi } from "vitest";
import { AdoNotFoundError } from "./ado-client.js";
import type { IAdoClient, RawWorkItem, WorkItemRelation } from "./ado-client.js";
import { WI_LINK_TYPE_ATTR, createWorkItemLinkService } from "./work-item-link-service.js";
import type { WiLinkType } from "./work-item-link-service.js";

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn(),
		createWorkItem: vi.fn(),
		updateWorkItem: vi.fn().mockResolvedValue({ id: 1, rev: 2, url: "", fields: {} }),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn(),
		uploadAttachment: vi.fn(),
		...overrides,
	};
}

function rawTc(relations?: WorkItemRelation[]): RawWorkItem {
	return {
		id: 42,
		rev: 1,
		url: "https://dev.azure.com/org/MyProject/_apis/wit/workitems/42",
		fields: { "System.WorkItemType": "TestVault.TestCase" },
		relations,
	};
}

function rawTarget(id: number): RawWorkItem {
	return {
		id,
		rev: 1,
		url: `https://dev.azure.com/org/MyProject/_apis/wit/workitems/${id}`,
		fields: { "System.WorkItemType": "User Story" },
	};
}

function tvRelation(targetId: number, linkType: WiLinkType): WorkItemRelation {
	return {
		rel: "System.LinkTypes.Related",
		url: `https://dev.azure.com/org/MyProject/_apis/wit/workitems/${targetId}`,
		attributes: { [WI_LINK_TYPE_ATTR]: linkType },
	};
}

// ─── listLinks ────────────────────────────────────────────────────────────────

describe("listLinks", () => {
	it("returns empty array when WI has no relations", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTc()),
		});
		const service = createWorkItemLinkService(adoClient);
		const links = await service.listLinks(42);
		expect(links).toHaveLength(0);
	});

	it("returns only relations tagged with WI_LINK_TYPE_ATTR", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(
				rawTc([
					tvRelation(100, "TestVault.TestedBy"),
					{
						rel: "System.LinkTypes.Related",
						url: "https://dev.azure.com/org/x/_apis/wit/workitems/200",
					},
				])
			),
		});
		const service = createWorkItemLinkService(adoClient);
		const links = await service.listLinks(42);
		expect(links).toHaveLength(1);
		expect(links[0]?.targetId).toBe(100);
	});

	it("extracts targetId from the relation URL", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTc([tvRelation(99, "TestVault.Validates")])),
		});
		const service = createWorkItemLinkService(adoClient);
		const links = await service.listLinks(42);
		expect(links[0]?.targetId).toBe(99);
	});

	it("maps the link type from the relation attributes", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTc([tvRelation(99, "TestVault.Covers")])),
		});
		const service = createWorkItemLinkService(adoClient);
		const links = await service.listLinks(42);
		expect(links[0]?.linkType).toBe("TestVault.Covers");
	});

	it("sets isOrphan to false by default", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTc([tvRelation(99, "TestVault.TestedBy")])),
		});
		const service = createWorkItemLinkService(adoClient);
		const links = await service.listLinks(42);
		expect(links[0]?.isOrphan).toBe(false);
	});
});

// ─── addLink ──────────────────────────────────────────────────────────────────

describe("addLink", () => {
	it("fetches the target WI to get its URL", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.addLink(42, 100, "TestVault.TestedBy");
		expect(vi.mocked(adoClient.fetchWorkItem)).toHaveBeenCalledWith(100);
	});

	it("calls updateWorkItem on the TC with a /relations/- patch", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.addLink(42, 100, "TestVault.TestedBy");
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const relationPatch = patches.find((p) => p.path === "/relations/-");
		expect(relationPatch).toBeDefined();
		expect(relationPatch?.op).toBe("add");
	});

	it("relation value includes rel='System.LinkTypes.Related' and target URL", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.addLink(42, 100, "TestVault.TestedBy");
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const relationPatch = patches.find((p) => p.path === "/relations/-");
		const value = relationPatch?.value as { rel: string; url: string };
		expect(value.rel).toBe("System.LinkTypes.Related");
		expect(value.url).toContain("100");
	});

	it("relation attributes carry the WI_LINK_TYPE_ATTR with the link type", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.addLink(42, 100, "TestVault.Validates");
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const value = patches.find((p) => p.path === "/relations/-")?.value as {
			attributes: Record<string, unknown>;
		};
		expect(value.attributes[WI_LINK_TYPE_ATTR]).toBe("TestVault.Validates");
	});

	it("updateWorkItem is called on the TC (not the target WI)", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.addLink(42, 100, "TestVault.TestedBy");
		expect(vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[0]).toBe(42);
	});
});

// ─── removeLink ───────────────────────────────────────────────────────────────

describe("removeLink", () => {
	it("calls updateWorkItem with op=remove on the correct relation index", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValue(
					rawTc([tvRelation(99, "TestVault.TestedBy"), tvRelation(100, "TestVault.Validates")])
				),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.removeLink(42, 100, "TestVault.Validates");
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const removePatch = patches.find((p) => p.op === "remove");
		expect(removePatch?.path).toBe("/relations/1");
	});

	it("does nothing when the relation is not found", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi.fn().mockResolvedValue(rawTc([tvRelation(99, "TestVault.TestedBy")])),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.removeLink(42, 999, "TestVault.TestedBy");
		expect(vi.mocked(adoClient.updateWorkItem)).not.toHaveBeenCalled();
	});

	it("removes only the matching linkType even if same target has multiple types", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValue(
					rawTc([tvRelation(99, "TestVault.TestedBy"), tvRelation(99, "TestVault.Covers")])
				),
		});
		const service = createWorkItemLinkService(adoClient);
		await service.removeLink(42, 99, "TestVault.Covers");
		const patches = vi.mocked(adoClient.updateWorkItem).mock.lastCall?.[1] ?? [];
		const removePatch = patches.find((p) => p.op === "remove");
		expect(removePatch?.path).toBe("/relations/1");
	});
});

// ─── detectOrphanLinks ────────────────────────────────────────────────────────

describe("detectOrphanLinks", () => {
	it("returns links with isOrphan=true when target WI no longer exists", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValueOnce(rawTc([tvRelation(999, "TestVault.TestedBy")]))
				.mockRejectedValueOnce(new AdoNotFoundError()),
		});
		const service = createWorkItemLinkService(adoClient);
		const orphans = await service.detectOrphanLinks(42);
		expect(orphans).toHaveLength(1);
		expect(orphans[0]?.isOrphan).toBe(true);
		expect(orphans[0]?.targetId).toBe(999);
	});

	it("returns only the orphan links, not the live ones", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValueOnce(
					rawTc([tvRelation(100, "TestVault.TestedBy"), tvRelation(999, "TestVault.Covers")])
				)
				.mockResolvedValueOnce(rawTarget(100))
				.mockRejectedValueOnce(new AdoNotFoundError()),
		});
		const service = createWorkItemLinkService(adoClient);
		const orphans = await service.detectOrphanLinks(42);
		expect(orphans).toHaveLength(1);
		expect(orphans[0]?.targetId).toBe(999);
	});

	it("returns empty array when all linked WIs exist", async () => {
		const adoClient = makeAdoClient({
			fetchWorkItem: vi
				.fn()
				.mockResolvedValueOnce(rawTc([tvRelation(100, "TestVault.TestedBy")]))
				.mockResolvedValueOnce(rawTarget(100)),
		});
		const service = createWorkItemLinkService(adoClient);
		const orphans = await service.detectOrphanLinks(42);
		expect(orphans).toHaveLength(0);
	});
});
