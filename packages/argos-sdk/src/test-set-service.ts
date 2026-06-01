import type { TestVaultTestSet } from "@atconseil/argos-types";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";

export type TestSetDraft = {
	name: string;
	areaPath: string;
	description?: string;
	tags?: string[];
	testCaseIds?: number[];
	wiqlQuery?: string;
};

export type TestSetPatch = Partial<TestSetDraft>;

export interface ITestSetService {
	create(draft: TestSetDraft): Promise<TestVaultTestSet>;
	read(id: number): Promise<TestVaultTestSet>;
	update(id: number, patch: TestSetPatch): Promise<TestVaultTestSet>;
	delete(id: number): Promise<void>;
	list(options?: { areaPath?: string; top?: number }): Promise<TestVaultTestSet[]>;
	addTestCases(setId: number, tcIds: number[]): Promise<TestVaultTestSet>;
	removeTestCases(setId: number, tcIds: number[]): Promise<TestVaultTestSet>;
	resolveTestCaseIds(setId: number): Promise<number[]>;
}

// ─── Field mapping ────────────────────────────────────────────────────────────

function fromRaw(wi: RawWorkItem): TestVaultTestSet {
	const f = wi.fields;

	const tagsRaw = f["System.Tags"] as string | null | undefined;
	const tags = tagsRaw
		? tagsRaw
				.split(";")
				.map((t) => t.trim())
				.filter(Boolean)
		: [];

	const idsRaw = f["TestVault.TestCaseIds"];
	let testCaseIds: number[] = [];
	if (typeof idsRaw === "string" && idsRaw) {
		try {
			testCaseIds = JSON.parse(idsRaw) as number[];
		} catch {
			testCaseIds = [];
		}
	}

	const wiqlRaw = f["TestVault.WiqlQuery"];
	const wiqlQuery = typeof wiqlRaw === "string" && wiqlRaw ? wiqlRaw : undefined;

	return {
		id: wi.id,
		name: f["System.Title"] as string,
		description: (f["System.Description"] as string | undefined) ?? "",
		areaPath: f["System.AreaPath"] as string,
		tags,
		testCaseIds,
		wiqlQuery,
	};
}

function toPatches(patch: TestSetPatch): WorkItemFieldPatch[] {
	const ops: WorkItemFieldPatch[] = [];

	if (patch.name !== undefined)
		ops.push({ op: "add", path: "/fields/System.Title", value: patch.name });
	if (patch.description !== undefined)
		ops.push({ op: "add", path: "/fields/System.Description", value: patch.description });
	if (patch.areaPath !== undefined)
		ops.push({ op: "add", path: "/fields/System.AreaPath", value: patch.areaPath });
	if (patch.tags !== undefined)
		ops.push({ op: "add", path: "/fields/System.Tags", value: patch.tags.join("; ") });
	if (patch.testCaseIds !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.TestCaseIds",
			value: JSON.stringify(patch.testCaseIds),
		});
	if (patch.wiqlQuery !== undefined)
		ops.push({ op: "add", path: "/fields/TestVault.WiqlQuery", value: patch.wiqlQuery });

	return ops;
}

function assertName(name: string | undefined): void {
	if (name !== undefined && !name.trim()) throw new Error("Name is required");
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTestSetService(adoClient: IAdoClient, project: string): ITestSetService {
	async function readById(id: number): Promise<TestVaultTestSet> {
		const raw = await adoClient.fetchWorkItem(id);
		return fromRaw(raw);
	}

	return {
		async create(draft) {
			assertName(draft.name);
			const raw = await adoClient.createWorkItem("TestVault.TestSet", toPatches(draft));
			return fromRaw(raw);
		},

		async read(id) {
			return readById(id);
		},

		async update(id, patch) {
			assertName(patch.name);
			const raw = await adoClient.updateWorkItem(id, toPatches(patch));
			return fromRaw(raw);
		},

		async delete(id) {
			await adoClient.deleteWorkItem(id);
		},

		async list(options) {
			const conditions: string[] = [
				`[System.WorkItemType] = 'TestVault Test Set'`,
				`[System.TeamProject] = '${project}'`,
			];
			if (options?.areaPath) conditions.push(`[System.AreaPath] UNDER '${options.areaPath}'`);
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.Id] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			const limited = options?.top !== undefined ? ids.slice(0, options.top) : ids;
			return Promise.all(limited.map(readById));
		},

		async addTestCases(setId, tcIds) {
			const set = await readById(setId);
			const merged = Array.from(new Set([...set.testCaseIds, ...tcIds]));
			const raw = await adoClient.updateWorkItem(setId, toPatches({ testCaseIds: merged }));
			return fromRaw(raw);
		},

		async removeTestCases(setId, tcIds) {
			const set = await readById(setId);
			const toRemove = new Set(tcIds);
			const filtered = set.testCaseIds.filter((id) => !toRemove.has(id));
			const raw = await adoClient.updateWorkItem(setId, toPatches({ testCaseIds: filtered }));
			return fromRaw(raw);
		},

		async resolveTestCaseIds(setId) {
			const set = await readById(setId);
			if (set.wiqlQuery) {
				return adoClient.queryByWiql(set.wiqlQuery);
			}
			return set.testCaseIds;
		},
	};
}
