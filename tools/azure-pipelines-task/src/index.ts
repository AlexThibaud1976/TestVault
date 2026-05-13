import { execSync } from "node:child_process";
import * as tl from "azure-pipelines-task-lib/task.js";

export type TaskInputs = {
	pat: string;
	orgUrl: string;
	project: string;
	planId: string;
	resultsFile: string;
	environment: string;
	autoCreate: boolean;
	strict: boolean;
	areaPath: string;
};

export function getTaskInputs(): TaskInputs {
	return {
		pat: tl.getInput("pat", true) ?? "",
		orgUrl: tl.getInput("orgUrl", true) ?? "",
		project: tl.getInput("project", true) ?? "",
		planId: tl.getInput("planId", true) ?? "",
		resultsFile: tl.getInput("resultsFile", true) ?? "",
		environment: tl.getInput("environment", true) ?? "",
		autoCreate: tl.getBoolInput("autoCreate", false),
		strict: tl.getBoolInput("strict", false),
		areaPath: tl.getInput("areaPath", false) ?? "",
	};
}

export function buildCliArgs(inputs: TaskInputs): string[] {
	const args = [
		"--file",
		inputs.resultsFile,
		"--plan-id",
		inputs.planId,
		"--env",
		inputs.environment,
	];
	if (inputs.autoCreate) args.push("--auto-create");
	if (inputs.strict) args.push("--strict");
	if (inputs.areaPath) {
		args.push("--area-path", inputs.areaPath);
	}
	return args;
}

async function run(): Promise<void> {
	try {
		const inputs = getTaskInputs();
		const args = buildCliArgs(inputs);

		const cmd = `argos tc upload-results ${args.map((a) => `"${a}"`).join(" ")}`;

		execSync(cmd, {
			stdio: "inherit",
			env: {
				...process.env,
				ARGOS_PAT: inputs.pat,
				ARGOS_ORG_URL: inputs.orgUrl,
				ARGOS_PROJECT: inputs.project,
			},
		});

		tl.setResult(tl.TaskResult.Succeeded, "Results uploaded successfully");
	} catch (err) {
		tl.setResult(tl.TaskResult.Failed, err instanceof Error ? err.message : String(err));
	}
}

void run();
