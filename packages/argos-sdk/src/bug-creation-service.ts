import type { TestVaultTestCase, TestVaultTestExecution } from "@atconseil/argos-types";
import type { IAdoClient, WorkItemFieldPatch } from "./ado-client.js";
import type { ITestExecutionService } from "./test-execution-service.js";

export type BugDraft = {
	title: string;
	description: string;
	reproSteps: string;
	severity: string;
	environment: string;
	areaPath: string;
};

export interface IBugCreationService {
	createBug(draft: BugDraft, executionId: number): Promise<{ id: number; url: string }>;
}

export function buildBugDraft(exec: TestVaultTestExecution, testCase: TestVaultTestCase): BugDraft {
	const failedResults = exec.stepResults.filter((r) => r.status === "Fail");

	const reproSteps = failedResults
		.map((r) => {
			const step = testCase.steps.find((s) => s.index === r.stepIndex);
			const lines = [
				`Step ${r.stepIndex + 1}: ${step?.action ?? "(unknown action)"}`,
				`Expected: ${step?.expected ?? "(unknown)"}`,
			];
			if (r.comment) lines.push(`Observed: ${r.comment}`);
			return lines.join("\n");
		})
		.join("\n\n");

	return {
		title: `[Fail] ${testCase.title} — ${exec.environment}`,
		description: `Test execution #${exec.id} failed in environment "${exec.environment}".\nTest Case: ${testCase.title} (#${testCase.id})`,
		reproSteps,
		severity: "2 - High",
		environment: exec.environment,
		areaPath: testCase.areaPath,
	};
}

export function createBugCreationService(
	adoClient: IAdoClient,
	testExecutionService: ITestExecutionService
): IBugCreationService {
	return {
		async createBug(draft, executionId) {
			const patches: WorkItemFieldPatch[] = [
				{ op: "add", path: "/fields/System.Title", value: draft.title },
				{ op: "add", path: "/fields/System.Description", value: draft.description },
				{ op: "add", path: "/fields/Microsoft.VSTS.TCM.ReproSteps", value: draft.reproSteps },
				{ op: "add", path: "/fields/Microsoft.VSTS.Common.Severity", value: draft.severity },
				{ op: "add", path: "/fields/System.AreaPath", value: draft.areaPath },
				{
					op: "add",
					path: "/fields/Microsoft.VSTS.Common.Activity",
					value: "Testing",
				},
			];

			const bugWi = await adoClient.createWorkItem("Bug", patches);
			const bugId = bugWi.id;
			const bugUrl = bugWi.url;

			const execWi = await adoClient.fetchWorkItem(executionId);

			await adoClient.updateWorkItem(bugId, [
				{
					op: "add",
					path: "/relations/-",
					value: { rel: "System.LinkTypes.Related", url: execWi.url },
				},
			]);

			await testExecutionService.linkBug(executionId, bugId);

			return { id: bugId, url: bugUrl };
		},
	};
}
