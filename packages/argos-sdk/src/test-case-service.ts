import type { AutomationStatus, TestVaultTestCase } from "@atconseil/argos-types";
import { schemaFromAdoStateName } from "@atconseil/argos-wit-schema";
import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "./ado-client.js";

export type TestCaseDraft = {
	title: string;
	areaPath: string;
	description?: string;
	iterationPath?: string;
	tags?: string[];
	priority?: 1 | 2 | 3 | 4;
	automationStatus?: AutomationStatus;
	automationKey?: string;
	gherkin?: string;
	estimatedDuration?: number;
	steps?: Array<{ index: number; action: string; expected: string; data?: string }>;
};

export type TestCasePatch = Partial<TestCaseDraft>;

export interface ListOptions {
	areaPath?: string;
	tag?: string;
	top?: number;
}

export interface ITestCaseService {
	create(draft: TestCaseDraft): Promise<TestVaultTestCase>;
	read(id: number): Promise<TestVaultTestCase>;
	update(id: number, patch: TestCasePatch): Promise<TestVaultTestCase>;
	delete(id: number): Promise<void>;
	list(options?: ListOptions): Promise<TestVaultTestCase[]>;
}

// ─── Field mapping helpers ────────────────────────────────────────────────────

function fromRaw(wi: RawWorkItem): TestVaultTestCase {
	const f = wi.fields;

	const tagsRaw = f["System.Tags"] as string | null | undefined;
	const tags = tagsRaw
		? tagsRaw
				.split(";")
				.map((t) => t.trim())
				.filter(Boolean)
		: [];

	const stepsRaw = f["TestVault.Steps"];
	let steps: TestVaultTestCase["steps"] = [];
	if (typeof stepsRaw === "string" && stepsRaw) {
		try {
			steps = JSON.parse(stepsRaw) as TestVaultTestCase["steps"];
		} catch {
			steps = [];
		}
	}

	const precondRaw = f["TestVault.PreconditionLinks"];
	let preconditionLinks: number[] = [];
	if (typeof precondRaw === "string" && precondRaw) {
		try {
			preconditionLinks = JSON.parse(precondRaw) as number[];
		} catch {
			preconditionLinks = [];
		}
	}

	return {
		id: wi.id,
		title: f["System.Title"] as string,
		description: (f["System.Description"] as string | undefined) ?? "",
		state: schemaFromAdoStateName(f["System.State"] as string) as TestVaultTestCase["state"],
		areaPath: f["System.AreaPath"] as string,
		iterationPath: (f["System.IterationPath"] as string | undefined) ?? "",
		tags,
		steps,
		priority: ((f["TestVault.Priority"] as number | undefined) ?? 3) as 1 | 2 | 3 | 4,
		automationStatus: ((f["TestVault.AutomationStatus"] as string | undefined) ??
			"Manual") as AutomationStatus,
		preconditionLinks,
		assignedTo: f["System.AssignedTo"] as string | undefined,
		automationKey: f["TestVault.AutomationKey"] as string | undefined,
		gherkin: f["TestVault.Gherkin"] as string | undefined,
		estimatedDuration: f["TestVault.EstimatedDuration"] as number | undefined,
		createdBy: f["System.CreatedBy"] as string,
		createdAt: f["System.CreatedDate"] as string,
		modifiedBy: f["System.ChangedBy"] as string,
		modifiedAt: f["System.ChangedDate"] as string,
	};
}

function toPatches(patch: TestCasePatch): WorkItemFieldPatch[] {
	const ops: WorkItemFieldPatch[] = [];

	if (patch.title !== undefined)
		ops.push({ op: "add", path: "/fields/System.Title", value: patch.title });
	if (patch.description !== undefined)
		ops.push({ op: "add", path: "/fields/System.Description", value: patch.description });
	if (patch.areaPath !== undefined)
		ops.push({ op: "add", path: "/fields/System.AreaPath", value: patch.areaPath });
	if (patch.iterationPath !== undefined)
		ops.push({ op: "add", path: "/fields/System.IterationPath", value: patch.iterationPath });
	if (patch.tags !== undefined)
		ops.push({ op: "add", path: "/fields/System.Tags", value: patch.tags.join("; ") });
	if (patch.priority !== undefined)
		ops.push({ op: "add", path: "/fields/TestVault.Priority", value: patch.priority });
	if (patch.automationStatus !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.AutomationStatus",
			value: patch.automationStatus,
		});
	if (patch.automationKey !== undefined)
		ops.push({ op: "add", path: "/fields/TestVault.AutomationKey", value: patch.automationKey });
	if (patch.gherkin !== undefined)
		ops.push({ op: "add", path: "/fields/TestVault.Gherkin", value: patch.gherkin });
	if (patch.estimatedDuration !== undefined)
		ops.push({
			op: "add",
			path: "/fields/TestVault.EstimatedDuration",
			value: patch.estimatedDuration,
		});
	if (patch.steps !== undefined)
		ops.push({ op: "add", path: "/fields/TestVault.Steps", value: JSON.stringify(patch.steps) });

	return ops;
}

function assertTitle(title: string | undefined): void {
	if (title !== undefined && !title.trim()) throw new Error("Title is required");
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTestCaseService(adoClient: IAdoClient, project: string): ITestCaseService {
	async function readById(id: number): Promise<TestVaultTestCase> {
		const raw = await adoClient.fetchWorkItem(id);
		return fromRaw(raw);
	}

	return {
		async create(draft) {
			assertTitle(draft.title);
			const raw = await adoClient.createWorkItem("TestVault.TestCase", toPatches(draft));
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

		async list(options) {
			const conditions: string[] = [
				`[System.WorkItemType] = 'TestVault Test Case'`,
				`[System.TeamProject] = '${project}'`,
			];
			if (options?.areaPath) conditions.push(`[System.AreaPath] UNDER '${options.areaPath}'`);
			if (options?.tag) conditions.push(`[System.Tags] CONTAINS '${options.tag}'`);

			const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.Id] DESC`;
			const ids = await adoClient.queryByWiql(wiql);
			const limited = options?.top !== undefined ? ids.slice(0, options.top) : ids;
			return Promise.all(limited.map(readById));
		},
	};
}
