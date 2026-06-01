import type {
	EvidenceRef,
	GlobalStatus,
	TestStepResult,
	TestVaultTestExecution,
} from "@atconseil/argos-types";
import { schemaToAdoFieldRefName, schemaToAdoStateName } from "@atconseil/argos-wit-schema";
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
	previousExecutionId?: number;
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
	previousExecutionId?: number;
};

export interface ITestExecutionService {
	startRun(draft: ExecutionDraft): Promise<InProgressExecution>;
	saveStepResult(id: number, result: TestStepResult): Promise<InProgressExecution>;
	attachEvidence(id: number, evidence: EvidenceRef): Promise<InProgressExecution>;
	finalizeRun(id: number, globalStatusOverride?: GlobalStatus): Promise<TestVaultTestExecution>;
	abortRun(id: number): Promise<TestVaultTestExecution>;
	linkBug(id: number, bugId: number): Promise<TestVaultTestExecution>;
	listExecutions(options: ListExecutionsOptions): Promise<ExecutionPage>;
	// Sprint 2.23 -- display-only mode for an existing execution. The
	// finalized TestExecution is immutable per spec US-2.1 (a completed run
	// is frozen; re-running creates a new execution); this method only reads
	// it. (Constitution S3.5 covers the TestPulse integration, not this.)
	read(id: number): Promise<TestVaultTestExecution>;
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
		previousExecutionId: f["TestVault.PreviousExecutionId"] as number | undefined,
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
		globalStatusOverridden: (f["TestVault.GlobalStatusOverridden"] as boolean | undefined) ?? false,
		previousExecutionId: f["TestVault.PreviousExecutionId"] as number | undefined,
		immutable: true,
	};
}

/**
 * Compute the global execution status from the per-step results.
 *
 * Rules (US-2.1) :
 *   - empty -> Unexecuted
 *   - any step Fail -> Fail (Fail wins over Blocked)
 *   - any step Blocked (no Fail) -> Blocked
 *   - all steps Skipped -> Skipped
 *   - otherwise -> Pass
 *
 * Exported (Sprint 2.23 / TECH-DEBT-T222 surface) so the UI execution
 * form can preview the global status while the user fills the
 * step-by-step grid, without re-implementing the rule.
 */
export function computeGlobalStatus(results: TestStepResult[]): GlobalStatus {
	if (results.length === 0) return "Unexecuted";
	if (results.some((r) => r.status === "Fail")) return "Fail";
	if (results.some((r) => r.status === "Blocked")) return "Blocked";
	if (results.every((r) => r.status === "Skipped")) return "Skipped";
	return "Pass";
}

// Kept as an internal alias so the existing call sites below stay
// unchanged. Could be inlined in a follow-up cleanup sprint.
const calcGlobalStatus = computeGlobalStatus;

function isCompleted(wi: RawWorkItem): boolean {
	return wi.fields["System.State"] === schemaToAdoStateName("Completed");
}

// A run is terminal (frozen at the application level) once Completed or Aborted.
function isTerminal(wi: RawWorkItem): boolean {
	const state = wi.fields["System.State"];
	return state === schemaToAdoStateName("Completed") || state === schemaToAdoStateName("Aborted");
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
				{
					op: "add",
					path: "/fields/System.Title",
					value: `Run TC-${draft.testCaseId} | ${draft.environment}`,
				},
				{ op: "add", path: "/fields/System.State", value: schemaToAdoStateName("InProgress") },
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
				{ op: "add", path: "/fields/TestVault.GlobalStatusOverridden", value: false },
			];

			if (draft.testCaseVersionId !== undefined) {
				patches.push({
					op: "add",
					path: "/fields/TestVault.TestCaseVersionId",
					value: draft.testCaseVersionId,
				});
			}

			if (draft.previousExecutionId !== undefined) {
				patches.push({
					op: "add",
					path: "/fields/TestVault.PreviousExecutionId",
					value: draft.previousExecutionId,
				});
			}

			const raw = await adoClient.createWorkItem("TestVault.TestExecution", patches);
			return fromRawInProgress(raw);
		},

		async saveStepResult(id, result) {
			const raw = await adoClient.fetchWorkItem(id);
			if (isTerminal(raw)) throw new TestExecutionImmutableError(id);

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
			if (isTerminal(raw)) throw new TestExecutionImmutableError(id);

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

		async finalizeRun(id, globalStatusOverride) {
			const raw = await adoClient.fetchWorkItem(id);
			if (isTerminal(raw)) throw new TestExecutionImmutableError(id);

			const stepResults = parseJsonArray<TestStepResult>(raw.fields["TestVault.StepResults"]);
			// Without an override the global status is the computed suggestion. With
			// an explicit override the forced value is written and the run is flagged;
			// the original suggestion stays auditable (recomputable from the steps).
			const globalStatus = globalStatusOverride ?? calcGlobalStatus(stepResults);
			const overridden = globalStatusOverride !== undefined;

			const updatedRaw = await adoClient.updateWorkItem(id, [
				{ op: "add", path: "/fields/System.State", value: schemaToAdoStateName("Completed") },
				{ op: "add", path: "/fields/TestVault.GlobalStatus", value: globalStatus },
				{ op: "add", path: "/fields/TestVault.GlobalStatusOverridden", value: overridden },
			]);
			return fromRawFinalized(updatedRaw);
		},

		async abortRun(id) {
			const raw = await adoClient.fetchWorkItem(id);
			// A terminal run (Completed or Aborted) cannot be aborted.
			if (isTerminal(raw)) throw new TestExecutionImmutableError(id);

			const updatedRaw = await adoClient.updateWorkItem(id, [
				{ op: "add", path: "/fields/System.State", value: schemaToAdoStateName("Aborted") },
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

			const tcIdField = schemaToAdoFieldRefName("TestVault.TestCaseId");
			const envField = schemaToAdoFieldRefName("TestVault.Environment");
			const statusField = schemaToAdoFieldRefName("TestVault.GlobalStatus");

			let wiql =
				"SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'TestVault Test Execution'";
			if (options.testCaseId > 0) {
				wiql += ` AND [${tcIdField}] = ${options.testCaseId}`;
			}
			if (options.environment) {
				wiql += ` AND [${envField}] = '${options.environment}'`;
			}
			if (options.status) {
				wiql += ` AND [${statusField}] = '${options.status}'`;
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

		async read(id) {
			const raw = await adoClient.fetchWorkItem(id);
			return fromRawFinalized(raw);
		},
	};
}
