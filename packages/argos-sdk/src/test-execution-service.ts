import type {
	EvidenceRef,
	GlobalStatus,
	TestStepResult,
	TestVaultTestExecution,
} from "@atconseil/argos-types";
import { AdoForbiddenError } from "./ado-client.js";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";

// ─── Error ────────────────────────────────────────────────────────────────────

export class TestExecutionImmutableError extends AdoForbiddenError {
	constructor(id: number) {
		super(`TestExecution ${id} is finalized and immutable — create a new run to re-execute`);
		this.name = "TestExecutionImmutableError";
	}
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ListExecutionsOptions = {
	testCaseId: number;
	environment?: string;
	status?: GlobalStatus;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
};

export type ExecutionPage = {
	items: TestVaultTestExecution[];
	total: number;
	page: number;
	pageSize: number;
};

export type ExecutionDraft = {
	testPlanId: number;
	testCaseId: number;
	environment: string;
	source?: "Manual" | "CI";
	testCaseVersionId?: number;
};

export type InProgressExecution = {
	id: number;
	testPlanId: number;
	testCaseId: number;
	testCaseVersionId?: number;
	environment: string;
	stepResults: TestStepResult[];
	evidence: EvidenceRef[];
	bugLinks: number[];
	source: "Manual" | "CI";
	executedBy: string;
};

export interface ITestExecutionService {
	startRun(draft: ExecutionDraft): Promise<InProgressExecution>;
	saveStepResult(id: number, result: TestStepResult): Promise<InProgressExecution>;
	attachEvidence(id: number, evidence: EvidenceRef): Promise<InProgressExecution>;
	finalizeRun(id: number): Promise<TestVaultTestExecution>;
	linkBug(id: number, bugId: number): Promise<TestVaultTestExecution>;
	listExecutions(options: ListExecutionsOptions): Promise<ExecutionPage>;
}

// ─── Field mapping helpers ────────────────────────────────────────────────────

function parseJsonArray<T>(raw: unknown): T[] {
	if (typeof raw !== "string" || !raw) return [];
	try {
		return JSON.parse(raw) as T[];
	} catch {
		return [];
	}
}

function fromRawInProgress(wi: RawWorkItem): InProgressExecution {
	const f = wi.fields;
	return {
		id: wi.id,
		testPlanId: f["TestVault.TestPlanId"] as number,
		testCaseId: f["TestVault.TestCaseId"] as number,
		testCaseVersionId: f["TestVault.TestCaseVersionId"] as number | undefined,
		environment: f["TestVault.Environment"] as string,
		stepResults: parseJsonArray<TestStepResult>(f["TestVault.StepResults"]),
		evidence: parseJsonArray<EvidenceRef>(f["TestVault.Evidence"]),
		bugLinks: parseJsonArray<number>(f["TestVault.BugLinks"]),
		source: (f["TestVault.ExecutionSource"] as "Manual" | "CI" | undefined) ?? "Manual",
		executedBy: f["System.CreatedBy"] as string,
	};
}

function fromRawFinalized(wi: RawWorkItem): TestVaultTestExecution {
	const f = wi.fields;
	return {
		id: wi.id,
		testPlanId: f["TestVault.TestPlanId"] as number,
		testCaseId: f["TestVault.TestCaseId"] as number,
		testCaseVersionId: f["TestVault.TestCaseVersionId"] as number | undefined,
		environment: f["TestVault.Environment"] as string,
		globalStatus: f["TestVault.GlobalStatus"] as GlobalStatus,
		stepResults: parseJsonArray<TestStepResult>(f["TestVault.StepResults"]),
		evidence: parseJsonArray<EvidenceRef>(f["TestVault.Evidence"]),
		bugLinks: parseJsonArray<number>(f["TestVault.BugLinks"]),
		source: (f["TestVault.ExecutionSource"] as "Manual" | "CI") ?? "Manual",
		executedBy: f["System.CreatedBy"] as string,
		executedAt: f["System.CreatedDate"] as string,
		immutable: true,
	};
}

function calcGlobalStatus(results: TestStepResult[]): GlobalStatus {
	if (results.length === 0) return "Unexecuted";
	if (results.some((r) => r.status === "Fail")) return "Fail";
	if (results.some((r) => r.status === "Blocked")) return "Blocked";
	if (results.every((r) => r.status === "Skipped")) return "Skipped";
	return "Pass";
}

function isCompleted(wi: RawWorkItem): boolean {
	return wi.fields["System.State"] === "Completed";
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTestExecutionService(
	adoClient: IAdoClient,
	_project: string
): ITestExecutionService {
	return {
		async startRun(draft) {
			if (!draft.environment?.trim()) throw new Error("Environment is required");

			const patches: WorkItemFieldPatch[] = [
				{ op: "add", path: "/fields/System.State", value: "InProgress" },
				{ op: "add", path: "/fields/TestVault.TestPlanId", value: draft.testPlanId },
				{ op: "add", path: "/fields/TestVault.TestCaseId", value: draft.testCaseId },
				{ op: "add", path: "/fields/TestVault.Environment", value: draft.environment },
				{
					op: "add",
					path: "/fields/TestVault.ExecutionSource",
					value: draft.source ?? "Manual",
				},
				{ op: "add", path: "/fields/TestVault.GlobalStatus", value: "Unexecuted" },
				{ op: "add", path: "/fields/TestVault.StepResults", value: JSON.stringify([]) },
				{ op: "add", path: "/fields/TestVault.Evidence", value: JSON.stringify([]) },
				{ op: "add", path: "/fields/TestVault.BugLinks", value: JSON.stringify([]) },
			];

			if (draft.testCaseVersionId !== undefined) {
				patches.push({
					op: "add",
					path: "/fields/TestVault.TestCaseVersionId",
					value: draft.testCaseVersionId,
				});
			}

			const raw = await adoClient.createWorkItem("TestVault.TestExecution", patches);
			return fromRawInProgress(raw);
		},

		async saveStepResult(id, result) {
			const raw = await adoClient.fetchWorkItem(id);
			if (isCompleted(raw)) throw new TestExecutionImmutableError(id);

			const current = parseJsonArray<TestStepResult>(raw.fields["TestVault.StepResults"]);
			const updated = [...current, result];
			const updatedRaw = await adoClient.updateWorkItem(id, [
				{
					op: "add",
					path: "/fields/TestVault.StepResults",
					value: JSON.stringify(updated),
				},
			]);
			return fromRawInProgress(updatedRaw);
		},

		async attachEvidence(id, evidence) {
			const raw = await adoClient.fetchWorkItem(id);
			if (isCompleted(raw)) throw new TestExecutionImmutableError(id);

			const current = parseJsonArray<EvidenceRef>(raw.fields["TestVault.Evidence"]);
			const updated = [...current, evidence];
			const updatedRaw = await adoClient.updateWorkItem(id, [
				{
					op: "add",
					path: "/fields/TestVault.Evidence",
					value: JSON.stringify(updated),
				},
			]);
			return fromRawInProgress(updatedRaw);
		},

		async finalizeRun(id) {
			const raw = await adoClient.fetchWorkItem(id);
			if (isCompleted(raw)) throw new TestExecutionImmutableError(id);

			const stepResults = parseJsonArray<TestStepResult>(raw.fields["TestVault.StepResults"]);
			const globalStatus = calcGlobalStatus(stepResults);

			const updatedRaw = await adoClient.updateWorkItem(id, [
				{ op: "add", path: "/fields/System.State", value: "Completed" },
				{ op: "add", path: "/fields/TestVault.GlobalStatus", value: globalStatus },
			]);
			return fromRawFinalized(updatedRaw);
		},

		async linkBug(id, bugId) {
			const raw = await adoClient.fetchWorkItem(id);
			if (!isCompleted(raw)) throw new Error(`TestExecution ${id} is not finalized`);

			const current = parseJsonArray<number>(raw.fields["TestVault.BugLinks"]);
			const updated = [...current, bugId];
			const updatedRaw = await adoClient.updateWorkItem(id, [
				{
					op: "add",
					path: "/fields/TestVault.BugLinks",
					value: JSON.stringify(updated),
				},
			]);
			return fromRawFinalized(updatedRaw);
		},

		async listExecutions(options) {
			const page = options.page ?? 1;
			const pageSize = options.pageSize ?? 20;

			let wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault.TestExecution' AND [TestVault.TestCaseId] = ${options.testCaseId}`;
			if (options.environment) {
				wiql += ` AND [TestVault.Environment] = '${options.environment}'`;
			}
			if (options.status) {
				wiql += ` AND [TestVault.GlobalStatus] = '${options.status}'`;
			}
			if (options.from) {
				wiql += ` AND [System.CreatedDate] >= '${options.from}'`;
			}
			if (options.to) {
				wiql += ` AND [System.CreatedDate] <= '${options.to}'`;
			}
			wiql += " ORDER BY [System.CreatedDate] DESC";

			const allIds = await adoClient.queryByWiql(wiql);
			const total = allIds.length;
			const start = (page - 1) * pageSize;
			const pageIds = allIds.slice(start, start + pageSize);

			const items = await Promise.all(pageIds.map((id) => adoClient.fetchWorkItem(id)));
			return { items: items.map(fromRawFinalized), total, page, pageSize };
		},
	};
}
