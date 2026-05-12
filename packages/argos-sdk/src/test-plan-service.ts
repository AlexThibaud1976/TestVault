import type { TestVaultTestCase, TestVaultTestPlan } from "@atconseil/argos-types";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";
import type { ITestCaseVersionService } from "./test-case-version-service.js";
import type { ITestSetService } from "./test-set-service.js";

export type TestPlanDraft = {
	name: string;
	owner: string;
	description?: string;
	iterationPath?: string;
	environments?: string[];
	testSetIds?: number[];
	additionalTestCaseIds?: number[];
};

export type TestPlanPatch = Partial<TestPlanDraft>;

export type AutoSnapshotServices = {
	testSetService: ITestSetService;
	fetchTestCase: (id: number) => Promise<TestVaultTestCase>;
	versionService: ITestCaseVersionService;
};

export interface ITestPlanService {
	create(draft: TestPlanDraft): Promise<TestVaultTestPlan>;
	read(id: number): Promise<TestVaultTestPlan>;
	update(id: number, patch: TestPlanPatch): Promise<TestVaultTestPlan>;
	delete(id: number): Promise<void>;
	list(): Promise<TestVaultTestPlan[]>;
	lock(id: number): Promise<TestVaultTestPlan>;
	unlock(id: number): Promise<TestVaultTestPlan>;
	lockWithAutoSnapshot(id: number, services: AutoSnapshotServices): Promise<TestVaultTestPlan>;
}

// ─── Field mapping ────────────────────────────────────────────────────────────

function parseJsonArray<T>(raw: unknown): T[] {
	if (typeof raw !== "string" || !raw) return [];
	try {
		return JSON.parse(raw) as T[];
	} catch {
		return [];
	}
}

function fromRaw(wi: RawWorkItem): TestVaultTestPlan {
	const f = wi.fields;

	const lockedRaw = f["TestVault.LockedSnapshotIds"];
	const lockedSnapshotIds =
		typeof lockedRaw === "string" && lockedRaw ? (JSON.parse(lockedRaw) as number[]) : undefined;

	return {
		id: wi.id,
		name: f["System.Title"] as string,
		description: (f["System.Description"] as string | undefined) ?? "",
		state: f["System.State"] as TestVaultTestPlan["state"],
		iterationPath: (f["System.IterationPath"] as string | undefined) ?? "",
		owner: f["System.AssignedTo"] as string,
		environments: parseJsonArray<string>(f["TestVault.Environments"]),
		testSetIds: parseJsonArray<number>(f["TestVault.TestSetIds"]),
		additionalTestCaseIds: parseJsonArray<number>(f["TestVault.AdditionalTestCaseIds"]),
		lockedSnapshotIds,
		createdBy: f["System.CreatedBy"] as string,
		createdAt: f["System.CreatedDate"] as string,
	};
}

function toPatches(patch: TestPlanPatch): WorkItemFieldPatch[] {
	const ops: WorkItemFieldPatch[] = [];

	if (patch.name !== undefined)
		ops.push({ op: "add", path: "/fields/System.Title", value: patch.name });
	if (patch.description !== undefined)
		ops.push({ op: "add", path: "/fields/System.Description", value: patch.description });
	if (patch.owner !== undefined)
		ops.push({ op: "add", path: "/fields/System.AssignedTo", value: patch.owner });
	if (patch.iterationPath !== undefined)
		ops.push({ op: "add", path: "/fields/System.IterationPath", value: patch.iterationPath });
	if (patch.environments !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.Environments",
			value: JSON.stringify(patch.environments),
		});
	if (patch.testSetIds !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.TestSetIds",
			value: JSON.stringify(patch.testSetIds),
		});
	if (patch.additionalTestCaseIds !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.AdditionalTestCaseIds",
			value: JSON.stringify(patch.additionalTestCaseIds),
		});

	return ops;
}

function assertName(name: string | undefined): void {
	if (name !== undefined && !name.trim()) throw new Error("Name is required");
}

const COMPOSITION_FIELDS: Array<keyof TestPlanPatch> = ["testSetIds", "additionalTestCaseIds"];

function touchesComposition(patch: TestPlanPatch): boolean {
	return COMPOSITION_FIELDS.some((f) => f in patch);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTestPlanService(adoClient: IAdoClient, project: string): ITestPlanService {
	async function readById(id: number): Promise<TestVaultTestPlan> {
		const raw = await adoClient.fetchWorkItem(id);
		return fromRaw(raw);
	}

	return {
		async create(draft) {
			assertName(draft.name);
			const raw = await adoClient.createWorkItem("TestVault.TestPlan", toPatches(draft));
			return fromRaw(raw);
		},

		async read(id) {
			return readById(id);
		},

		async update(id, patch) {
			assertName(patch.name);
			if (touchesComposition(patch)) {
				const current = await readById(id);
				if (current.state === "Locked") throw new Error("Test Plan is locked");
			}
			const raw = await adoClient.updateWorkItem(id, toPatches(patch));
			return fromRaw(raw);
		},

		async delete(id) {
			await adoClient.deleteWorkItem(id);
		},

		async list() {
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault.TestPlan' AND [System.TeamProject] = '${project}' ORDER BY [System.Id] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			return Promise.all(ids.map(readById));
		},

		async lock(id) {
			const raw = await adoClient.updateWorkItem(id, [
				{ op: "add", path: "/fields/System.State", value: "Locked" },
			]);
			return fromRaw(raw);
		},

		async unlock(id) {
			const raw = await adoClient.updateWorkItem(id, [
				{ op: "add", path: "/fields/System.State", value: "Draft" },
			]);
			return fromRaw(raw);
		},

		async lockWithAutoSnapshot(id, { testSetService, fetchTestCase, versionService }) {
			const plan = await readById(id);

			// Collect all TC IDs: from each test set + additionalTestCaseIds
			const setTcIds = (
				await Promise.all(plan.testSetIds.map((setId) => testSetService.resolveTestCaseIds(setId)))
			).flat();
			const allTcIds = Array.from(new Set([...setTcIds, ...plan.additionalTestCaseIds]));

			// Create a snapshot for each TC
			const testCases = await Promise.all(allTcIds.map(fetchTestCase));
			const snapshots = await Promise.all(
				testCases.map((tc) =>
					versionService.createSnapshot(tc, {
						name: `auto-lock-${id}-${tc.id}`,
						parentTestCaseId: tc.id,
					})
				)
			);
			const snapshotIds = snapshots.map((s) => s.id);

			// Lock the plan with snapshot IDs stored
			const patches: WorkItemFieldPatch[] = [
				{ op: "add", path: "/fields/System.State", value: "Locked" },
				{
					op: "add",
					path: "/fields/TestVault.LockedSnapshotIds",
					value: JSON.stringify(snapshotIds),
				},
			];
			const raw = await adoClient.updateWorkItem(id, patches);
			return fromRaw(raw);
		},
	};
}
