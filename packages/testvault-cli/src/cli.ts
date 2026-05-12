#!/usr/bin/env node
import {
	createAdoClient,
	createTestCaseService,
	createTestPlanService,
} from "@atconseil/argos-sdk";
import { Command } from "commander";
import { processUploadResults } from "./upload-results.js";

function getRequired(name: string, flagVal: string | undefined, envVar: string): string {
	const val = flagVal ?? process.env[envVar];
	if (!val) throw new Error(`Missing required option: --${name} (or env ${envVar})`);
	return val;
}

function makeClient(opts: { pat?: string; orgUrl?: string; project?: string }) {
	const pat = getRequired("pat", opts.pat, "TESTVAULT_PAT");
	const orgUrl = getRequired("org-url", opts.orgUrl, "TESTVAULT_ORG_URL");
	const project = getRequired("project", opts.project, "TESTVAULT_PROJECT");
	return { client: createAdoClient({ baseUrl: orgUrl, project, pat }), project };
}

const program = new Command();

program
	.name("testvault")
	.description("TestVault CLI — manage test assets in Azure DevOps")
	.version("0.0.1");

// ─── auth ─────────────────────────────────────────────────────────────────────

const auth = program.command("auth");

auth
	.command("login")
	.description("Verify that PAT + org-url credentials are valid")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL (e.g. https://dev.azure.com/acme)")
	.option("--project <name>", "ADO project name")
	.action(async (opts: { pat?: string; orgUrl?: string; project?: string }) => {
		const { client, project } = makeClient(opts);
		const tcSvc = createTestCaseService(client, project);
		await tcSvc.list({ top: 1 });
		const orgUrl = getRequired("org-url", opts.orgUrl, "TESTVAULT_ORG_URL");
		console.log(`✔ Authenticated to ${orgUrl} / ${project}`);
	});

// ─── tc ───────────────────────────────────────────────────────────────────────

const tc = program.command("tc");

tc.command("list")
	.description("List test cases in a project")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL")
	.option("--project <name>", "ADO project name")
	.option("--tag <tag>", "Filter by tag")
	.option("--top <n>", "Maximum number of results", "50")
	.action(
		async (opts: {
			pat?: string;
			orgUrl?: string;
			project?: string;
			tag?: string;
			top?: string;
		}) => {
			const { client, project } = makeClient(opts);
			const tcSvc = createTestCaseService(client, project);
			const top = Number.parseInt(opts.top ?? "50", 10);
			const items = await tcSvc.list({ top, tag: opts.tag });
			console.log(JSON.stringify(items, null, 2));
		}
	);

tc.command("create")
	.description("Create a new test case")
	.requiredOption("--title <title>", "Test case title")
	.requiredOption("--area-path <path>", "ADO area path for the work item")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL")
	.option("--project <name>", "ADO project name")
	.option("--description <desc>", "Test case description")
	.option("--tags <tags>", "Tags (comma-separated)")
	.option("--automation-key <key>", "Automation key for CI matching")
	.action(
		async (opts: {
			title: string;
			areaPath: string;
			pat?: string;
			orgUrl?: string;
			project?: string;
			description?: string;
			tags?: string;
			automationKey?: string;
		}) => {
			const { client, project } = makeClient(opts);
			const tcSvc = createTestCaseService(client, project);
			const item = await tcSvc.create({
				title: opts.title,
				areaPath: opts.areaPath,
				description: opts.description,
				tags: opts.tags?.split(","),
				automationKey: opts.automationKey,
			});
			console.log(JSON.stringify(item, null, 2));
		}
	);

tc.command("upload-results")
	.description("Upload CI test results and match by automationKey")
	.requiredOption("--file <path>", "Results file (JUnit .xml, Cucumber .json)")
	.requiredOption("--plan-id <id>", "Target Test Plan ID")
	.requiredOption("--env <environment>", "Target environment name")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL")
	.option("--project <name>", "ADO project name")
	.option("--area-path <path>", "Area path for auto-created test cases")
	.option("--auto-create", "Auto-create missing test cases")
	.option("--strict", "Fail if any result has no matching test case")
	.action(
		async (opts: {
			file: string;
			planId: string;
			env: string;
			pat?: string;
			orgUrl?: string;
			project?: string;
			areaPath?: string;
			autoCreate?: boolean;
			strict?: boolean;
		}) => {
			const pat = getRequired("pat", opts.pat, "TESTVAULT_PAT");
			const orgUrl = getRequired("org-url", opts.orgUrl, "TESTVAULT_ORG_URL");
			const project = getRequired("project", opts.project, "TESTVAULT_PROJECT");
			const summary = await processUploadResults({
				file: opts.file,
				planId: Number.parseInt(opts.planId, 10),
				environment: opts.env,
				pat,
				orgUrl,
				project,
				areaPath: opts.areaPath,
				autoCreate: opts.autoCreate,
				strict: opts.strict,
			});
			console.log(
				`Results: ${summary.total} total | ${summary.matched} matched | ${summary.unmatched} unmatched | ${summary.created} created | ${summary.errors} parse errors`
			);
			if (summary.errors > 0) process.exit(1);
		}
	);

// ─── plan ─────────────────────────────────────────────────────────────────────

const plan = program.command("plan");

plan
	.command("show")
	.description("Show a Test Plan")
	.requiredOption("--plan-id <id>", "Test Plan ID")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL")
	.option("--project <name>", "ADO project name")
	.action(async (opts: { planId: string; pat?: string; orgUrl?: string; project?: string }) => {
		const { client, project } = makeClient(opts);
		const planSvc = createTestPlanService(client, project);
		const p = await planSvc.read(Number.parseInt(opts.planId, 10));
		console.log(JSON.stringify(p, null, 2));
	});

plan
	.command("export")
	.description("Export a Test Plan release-readiness report as Excel or PDF")
	.requiredOption("--plan-id <id>", "Test Plan ID")
	.option("--format <fmt>", "Output format: excel or pdf", "excel")
	.option("--out <path>", "Output file path")
	.option("--pat <token>", "ADO Personal Access Token")
	.option("--org-url <url>", "ADO organisation URL")
	.option("--project <name>", "ADO project name")
	.action(
		async (opts: {
			planId: string;
			format?: string;
			out?: string;
			pat?: string;
			orgUrl?: string;
			project?: string;
		}) => {
			const { client, project } = makeClient(opts);
			const planSvc = createTestPlanService(client, project);
			const p = await planSvc.read(Number.parseInt(opts.planId, 10));

			const { exportReleaseReadinessToPdf, exportReleaseReadinessToExcel } = await import(
				"@atconseil/argos-exporters"
			);
			const { writeFileSync } = await import("node:fs");

			const report = {
				planTitle: p.name ?? `Plan ${opts.planId}`,
				items: [],
			};

			const fmt = opts.format ?? "excel";
			const outPath = opts.out ?? `plan-${opts.planId}.${fmt === "pdf" ? "html" : "xlsx"}`;

			if (fmt === "pdf") {
				writeFileSync(outPath, exportReleaseReadinessToPdf(report));
			} else {
				const buf = await exportReleaseReadinessToExcel(report);
				writeFileSync(outPath, buf);
			}
			console.log(`Exported to ${outPath}`);
		}
	);

program.parseAsync(process.argv).catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
