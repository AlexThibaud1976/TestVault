import type { GlobalStatus } from "@atconseil/testvault-types";

// ─── Input / Output types ─────────────────────────────────────────────────────

export type MatrixWorkItem = { id: number; title: string };
export type MatrixTestCase = { id: number; title: string };
export type MatrixLink = { workItemId: number; testCaseId: number };
export type MatrixExecution = {
	testCaseId: number;
	status: GlobalStatus;
	environment: string;
	createdAt: string;
};

export type MatrixInput = {
	workItems: MatrixWorkItem[];
	testCases: MatrixTestCase[];
	links: MatrixLink[];
	executions: MatrixExecution[];
	filterEnvironment?: string;
};

export type MatrixCell = {
	testCaseId: number;
	linked: boolean;
	latestStatus?: GlobalStatus;
};

export type MatrixRow = {
	workItemId: number;
	workItemTitle: string;
	cells: MatrixCell[];
};

export type MatrixColumn = {
	testCaseId: number;
	testCaseTitle: string;
};

export type CoverageMatrix = {
	rows: MatrixRow[];
	columns: MatrixColumn[];
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildCoverageMatrix(input: MatrixInput): CoverageMatrix {
	const { workItems, testCases, links, executions, filterEnvironment } = input;

	// Index links: WI → set of TC IDs
	const wiToTcs = new Map<number, Set<number>>();
	for (const link of links) {
		let set = wiToTcs.get(link.workItemId);
		if (!set) {
			set = new Set();
			wiToTcs.set(link.workItemId, set);
		}
		set.add(link.testCaseId);
	}

	// Linked TC IDs (for columns)
	const linkedTcIds = new Set(links.map((l) => l.testCaseId));

	// Latest status per TC ID (filtered by environment if specified)
	const latestByTc = new Map<number, GlobalStatus>();
	const filtered = filterEnvironment
		? executions.filter((e) => e.environment === filterEnvironment)
		: executions;
	// Sort descending so first encountered per TC is the latest
	const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	for (const exec of sorted) {
		if (!latestByTc.has(exec.testCaseId)) {
			latestByTc.set(exec.testCaseId, exec.status);
		}
	}

	// Columns: only TCs linked to at least one WI
	const columns: MatrixColumn[] = testCases
		.filter((tc) => linkedTcIds.has(tc.id))
		.map((tc) => ({ testCaseId: tc.id, testCaseTitle: tc.title }));

	const columnTcIds = columns.map((c) => c.testCaseId);

	// Rows: only WIs that have at least one linked TC
	const rows: MatrixRow[] = workItems
		.filter((wi) => (wiToTcs.get(wi.id)?.size ?? 0) > 0)
		.map((wi) => {
			const linkedSet = wiToTcs.get(wi.id) ?? new Set<number>();
			const cells: MatrixCell[] = columnTcIds.map((tcId) => {
				const linked = linkedSet.has(tcId);
				return {
					testCaseId: tcId,
					linked,
					latestStatus: linked ? latestByTc.get(tcId) : undefined,
				};
			});
			return { workItemId: wi.id, workItemTitle: wi.title, cells };
		});

	return { rows, columns };
}
