import { type ProcessInstallState, createProcessInstallService } from "@atconseil/argos-sdk";
import { renderProgressStep } from "./console-progress.js";
import { promptForConfirm, promptForMissing, promptForSchemaUpdate } from "./prompts.js";

export interface InstallCommandOptions {
	orgUrl?: string;
	org?: string;
	project?: string;
	pat?: string;
	baseProcess?: "Agile" | "Scrum" | "CMMI";
	processName?: string;
	prompt?: boolean;
	skipConfirm?: boolean;
}

export async function runInstallCommand(opts: InstallCommandOptions): Promise<void> {
	const interactive = opts.prompt !== false;

	const orgUrl =
		opts.orgUrl ??
		opts.org ??
		process.env.ARGOS_ORG_URL ??
		(interactive ? await promptForMissing("orgUrl") : null);
	const project =
		opts.project ??
		process.env.ARGOS_PROJECT ??
		(interactive ? await promptForMissing("project") : null);
	const pat =
		opts.pat ?? process.env.ARGOS_PAT ?? (interactive ? await promptForMissing("pat") : null);

	if (!orgUrl || !project || !pat) {
		console.error(
			"Missing required options. Use --org-url, --project, --pat (or env vars ARGOS_ORG_URL, ARGOS_PROJECT, ARGOS_PAT)."
		);
		process.exit(1);
		return;
	}

	const baseProcess = opts.baseProcess ?? "Agile";
	const processName = opts.processName ?? "Argos Inherited";

	const service = createProcessInstallService({
		orgUrl,
		getAuthHeader: async () => `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
	});

	console.log(`Checking Argos installation state on ${orgUrl}/${project}...`);
	let state: ProcessInstallState;
	try {
		state = await service.detectInstallState();
	} catch (err) {
		console.error(`Detection failed: ${err instanceof Error ? err.message : String(err)}`);
		if (err instanceof Error && err.message.toLowerCase().includes("forbidden")) {
			console.error("Make sure your PAT has 'Process (Read & manage)' scope.");
		}
		process.exit(2);
		return;
	}

	switch (state.status) {
		case "installed":
			console.log(
				`[OK] Argos already installed (process: ${state.processName}, schema: ${state.schemaVersion})`
			);
			console.log("Nothing to do.");
			return;

		case "partial":
			console.log(`[WARN] Argos partially installed in process "${state.processName}"`);
			console.log(`Missing WIT types: ${state.missingWitRefs.join(", ")}`);
			if (interactive && !opts.skipConfirm) {
				const confirmed = await promptForSchemaUpdate(state);
				if (!confirmed) {
					console.log("Aborted by user.");
					return;
				}
			}
			console.log(
				"[INFO] Partial sync not yet supported. Will run full install on top of existing process."
			);
			await doInstall(service, processName, baseProcess);
			return;

		case "not-installed":
			console.log("[INFO] Argos not installed. Will create new process inheritance.");
			console.log(`  Base process: ${baseProcess}`);
			console.log(`  New process name: ${processName}`);
			if (interactive && !opts.skipConfirm) {
				const confirmed = await promptForConfirm("Proceed with installation?");
				if (!confirmed) {
					console.log("Aborted by user.");
					return;
				}
			}
			await doInstall(service, processName, baseProcess);
			return;
	}
}

async function doInstall(
	service: ReturnType<typeof createProcessInstallService>,
	processName: string,
	baseProcess: "Agile" | "Scrum" | "CMMI"
): Promise<void> {
	try {
		const result = await service.install({
			processName,
			baseProcess,
			onProgress: renderProgressStep,
		});
		console.log("");
		console.log("[OK] Installation complete!");
		console.log(`  Process ID: ${result.processId}`);
		console.log(`  Process name: ${result.processName}`);
		console.log("");
		console.log("Next steps:");
		console.log("  1. In ADO, assign your project to this new process:");
		console.log("     Organization Settings > Process > [your custom process] > Assign to project");
		console.log("  2. Refresh the Argos extension to see Custom WIT available");
	} catch (err) {
		console.error(`Installation failed: ${err instanceof Error ? err.message : String(err)}`);
		if (err instanceof Error && err.name === "ProcessPermissionError") {
			console.error("Your PAT lacks Project Collection Administrator permissions.");
		}
		process.exit(3);
		return;
	}
}
