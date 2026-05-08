import type { TestVaultPrecondition } from "@atconseil/testvault-types";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";

export type PreconditionDraft = {
	title: string;
	description?: string;
	tags?: string[];
	linkedTestCaseIds?: number[];
};

export type PreconditionPatch = Partial<PreconditionDraft>;

export interface IPreconditionService {
	create(draft: PreconditionDraft): Promise<TestVaultPrecondition>;
	read(id: number): Promise<TestVaultPrecondition>;
	update(id: number, patch: PreconditionPatch): Promise<TestVaultPrecondition>;
	delete(id: number): Promise<void>;
	list(): Promise<TestVaultPrecondition[]>;
	linkTestCase(precondId: number, tcId: number): Promise<TestVaultPrecondition>;
	unlinkTestCase(precondId: number, tcId: number): Promise<TestVaultPrecondition>;
	getForTestCase(tcId: number): Promise<TestVaultPrecondition[]>;
}

// ─── Field mapping ────────────────────────────────────────────────────────────

function fromRaw(wi: RawWorkItem): TestVaultPrecondition {
	const f = wi.fields;

	const tagsRaw = f["System.Tags"] as string | null | undefined;
	const tags = tagsRaw
		? tagsRaw
				.split(";")
				.map((t) => t.trim())
				.filter(Boolean)
		: [];

	const idsRaw = f["TestVault.LinkedTestCaseIds"];
	let linkedTestCaseIds: number[] = [];
	if (typeof idsRaw === "string" && idsRaw) {
		try {
			linkedTestCaseIds = JSON.parse(idsRaw) as number[];
		} catch {
			linkedTestCaseIds = [];
		}
	}

	return {
		id: wi.id,
		title: f["System.Title"] as string,
		description: (f["System.Description"] as string | undefined) ?? "",
		tags,
		linkedTestCaseIds,
	};
}

function toPatches(patch: PreconditionPatch): WorkItemFieldPatch[] {
	const ops: WorkItemFieldPatch[] = [];

	if (patch.title !== undefined)
		ops.push({ op: "add", path: "/fields/System.Title", value: patch.title });
	if (patch.description !== undefined)
		ops.push({ op: "add", path: "/fields/System.Description", value: patch.description });
	if (patch.tags !== undefined)
		ops.push({ op: "add", path: "/fields/System.Tags", value: patch.tags.join("; ") });
	if (patch.linkedTestCaseIds !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.LinkedTestCaseIds",
			value: JSON.stringify(patch.linkedTestCaseIds),
		});

	return ops;
}

function assertTitle(title: string | undefined): void {
	if (title !== undefined && !title.trim()) throw new Error("Title is required");
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPreconditionService(
	adoClient: IAdoClient,
	project: string
): IPreconditionService {
	async function readById(id: number): Promise<TestVaultPrecondition> {
		const raw = await adoClient.fetchWorkItem(id);
		return fromRaw(raw);
	}

	return {
		async create(draft) {
			assertTitle(draft.title);
			const raw = await adoClient.createWorkItem("TestVault.Precondition", toPatches(draft));
			return fromRaw(raw);
		},

		async read(id) {
			return readById(id);
		},

		async update(id, patch) {
			assertTitle(patch.title);
			const raw = await adoClient.updateWorkItem(id, toPatches(patch));
			return fromRaw(raw);
		},

		async delete(id) {
			await adoClient.deleteWorkItem(id);
		},

		async list() {
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault.Precondition' AND [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			return Promise.all(ids.map(readById));
		},

		async linkTestCase(precondId, tcId) {
			const precond = await readById(precondId);
			const merged = Array.from(new Set([...precond.linkedTestCaseIds, tcId]));
			const raw = await adoClient.updateWorkItem(
				precondId,
				toPatches({ linkedTestCaseIds: merged })
			);
			return fromRaw(raw);
		},

		async unlinkTestCase(precondId, tcId) {
			const precond = await readById(precondId);
			const filtered = precond.linkedTestCaseIds.filter((id) => id !== tcId);
			const raw = await adoClient.updateWorkItem(
				precondId,
				toPatches({ linkedTestCaseIds: filtered })
			);
			return fromRaw(raw);
		},

		async getForTestCase(tcId) {
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault.Precondition' AND [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			const all = await Promise.all(ids.map(readById));
			return all.filter((p) => p.linkedTestCaseIds.includes(tcId));
		},
	};
}
