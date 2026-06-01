import type { TestVaultTestCase } from "@atconseil/argos-types";
import { schemaToAdoFieldRefName, schemaToAdoStateName } from "@atconseil/argos-wit-schema";
import { AdoForbiddenError } from "./ado-client.js";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SnapshotNameConflictError extends Error {
	constructor(name: string, testCaseId: number) {
		super(`Snapshot name "${name}" is already used for Test Case #${testCaseId}`);
		this.name = "SnapshotNameConflictError";
	}
}

export class SnapshotImmutableError extends Error {
	constructor() {
		super("Snapshot is immutable — it cannot be modified after creation");
		this.name = "SnapshotImmutableError";
	}
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type TestCaseVersionDraft = {
	name: string;
	comment?: string;
	parentTestCaseId: number;
};

export type TestVaultTestCaseVersion = {
	id: number;
	name: string;
	comment: string;
	parentTestCaseId: number;
	snapshotTitle: string;
	snapshotDescription: string;
	snapshotSteps: string;
	snapshotTags: string;
	createdBy: string;
	createdAt: string;
	immutable: true;
};

export interface ITestCaseVersionService {
	createSnapshot(
		testCase: TestVaultTestCase,
		draft: TestCaseVersionDraft
	): Promise<TestVaultTestCaseVersion>;
	listSnapshots(testCaseId: number): Promise<TestVaultTestCaseVersion[]>;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function fromRaw(wi: RawWorkItem): TestVaultTestCaseVersion {
	const f = wi.fields;
	return {
		id: wi.id,
		name: f["TestVault.SnapshotName"] as string,
		comment: (f["TestVault.SnapshotComment"] as string | undefined) ?? "",
		parentTestCaseId: f["TestVault.ParentTestCaseId"] as number,
		snapshotTitle: f["TestVault.SnapshotTitle"] as string,
		snapshotDescription: (f["TestVault.SnapshotDescription"] as string | undefined) ?? "",
		snapshotSteps: (f["TestVault.SnapshotSteps"] as string | undefined) ?? "[]",
		snapshotTags: (f["TestVault.SnapshotTags"] as string | undefined) ?? "[]",
		createdBy: f["System.CreatedBy"] as string,
		createdAt: f["System.CreatedDate"] as string,
		immutable: true,
	};
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTestCaseVersionService(adoClient: IAdoClient): ITestCaseVersionService {
	return {
		async createSnapshot(testCase, draft) {
			const existing = await this.listSnapshots(testCase.id);
			if (existing.some((s) => s.name === draft.name)) {
				throw new SnapshotNameConflictError(draft.name, testCase.id);
			}

			const patches: WorkItemFieldPatch[] = [
				{ op: "add", path: "/fields/System.State", value: schemaToAdoStateName("Frozen") },
				{ op: "add", path: "/fields/TestVault.ParentTestCaseId", value: testCase.id },
				{ op: "add", path: "/fields/TestVault.SnapshotName", value: draft.name },
				{
					op: "add",
					path: "/fields/TestVault.SnapshotComment",
					value: draft.comment ?? "",
				},
				{ op: "add", path: "/fields/TestVault.SnapshotTitle", value: testCase.title },
				{
					op: "add",
					path: "/fields/TestVault.SnapshotDescription",
					value: testCase.description,
				},
				{
					op: "add",
					path: "/fields/TestVault.SnapshotSteps",
					value: JSON.stringify(testCase.steps),
				},
				{
					op: "add",
					path: "/fields/TestVault.SnapshotTags",
					value: JSON.stringify(testCase.tags),
				},
			];

			try {
				const raw = await adoClient.createWorkItem("TestVault.TestCaseVersion", patches);
				return fromRaw(raw);
			} catch (err) {
				if (err instanceof AdoForbiddenError) throw new SnapshotImmutableError();
				throw err;
			}
		},

		async listSnapshots(testCaseId) {
			const parentField = schemaToAdoFieldRefName("TestVault.ParentTestCaseId");
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault Test Case Version' AND [${parentField}] = ${testCaseId} ORDER BY [System.CreatedDate] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			const items = await Promise.all(ids.map((id) => adoClient.fetchWorkItem(id)));
			return items.map(fromRaw);
		},
	};
}
