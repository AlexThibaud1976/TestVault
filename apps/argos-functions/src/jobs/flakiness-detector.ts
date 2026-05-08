import { type InvocationContext, app } from "@azure/functions";

export interface ExecutionRecord {
	executionId: number;
	status: "Pass" | "Fail" | "Blocked" | "NotRun";
	runAt: string;
}

export interface FlakinessReport {
	testCaseId: number;
	testCaseTitle: string;
	score: number;
	knownFlaky: boolean;
	runsAnalyzed: number;
}

export function computeFlakinessScore(runs: ExecutionRecord[]): number {
	const relevant = runs.filter((r) => r.status === "Pass" || r.status === "Fail");
	if (relevant.length < 2) return 0;

	let transitions = 0;
	for (let i = 1; i < relevant.length; i++) {
		if (relevant[i]?.status !== relevant[i - 1]?.status) {
			transitions++;
		}
	}
	return Math.round((transitions / (relevant.length - 1)) * 100);
}

export interface IFlakinessDataSource {
	listActiveTestCases(
		orgUrl: string,
		project: string
	): Promise<Array<{ id: number; title: string }>>;
	getRecentExecutions(
		orgUrl: string,
		project: string,
		testCaseId: number,
		limit: number
	): Promise<ExecutionRecord[]>;
	saveFlakinessReport(orgUrl: string, project: string, report: FlakinessReport): Promise<void>;
}

export async function runFlakinessDetection(
	orgUrl: string,
	project: string,
	dataSource: IFlakinessDataSource,
	threshold = 15,
	runLimit = 50
): Promise<FlakinessReport[]> {
	const testCases = await dataSource.listActiveTestCases(orgUrl, project);
	const reports: FlakinessReport[] = [];

	for (const tc of testCases) {
		const executions = await dataSource.getRecentExecutions(orgUrl, project, tc.id, runLimit);
		const score = computeFlakinessScore(executions);
		const report: FlakinessReport = {
			testCaseId: tc.id,
			testCaseTitle: tc.title,
			score,
			knownFlaky: false,
			runsAnalyzed: executions.length,
		};
		if (score >= threshold) {
			await dataSource.saveFlakinessReport(orgUrl, project, report);
			reports.push(report);
		}
	}

	return reports;
}

app.timer("flakinessDetector", {
	schedule: "0 0 6 * * 1",
	handler: async (_myTimer: unknown, ctx: InvocationContext) => {
		ctx.log("Flakiness detector job started");
	},
});
