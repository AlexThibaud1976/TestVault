import { readFileSync } from "node:fs";
import {
	parseCucumber,
	parseJUnit,
	parseNUnit,
	parseTestNG,
	parseXUnit,
} from "@atconseil/testvault-importers";
import type { ImportResult } from "@atconseil/testvault-importers";
import {
	createAdoClient,
	createTestCaseService,
	createTestExecutionService,
} from "@atconseil/testvault-sdk";

export type UploadResultsOptions = {
	file: string;
	planId: number;
	environment: string;
	pat: string;
	orgUrl: string;
	project: string;
	areaPath?: string;
	autoCreate?: boolean;
	strict?: boolean;
};

export type UploadResultsSummary = {
	total: number;
	matched: number;
	unmatched: number;
	created: number;
	errors: number;
};

export async function processUploadResults(
	opts: UploadResultsOptions
): Promise<UploadResultsSummary> {
	const source = readFileSync(opts.file, "utf-8");
	const parsed = parseFile(opts.file, source);

	const client = createAdoClient({ baseUrl: opts.orgUrl, project: opts.project, pat: opts.pat });
	const tcService = createTestCaseService(client, opts.project);
	const execService = createTestExecutionService(client, opts.project);

	// Build automationKey → TC id map from all TCs in the project
	const allTcs = await tcService.list({ top: 2000 });
	const autoKeyMap = new Map<string, number>();
	for (const tc of allTcs) {
		if (tc.automationKey) autoKeyMap.set(tc.automationKey, tc.id);
	}

	let matched = 0;
	let unmatched = 0;
	let created = 0;
	const errors = parsed.errors.length;

	for (const item of parsed.items) {
		if (!item.automationKey) {
			unmatched++;
			continue;
		}

		let tcId = autoKeyMap.get(item.automationKey);

		if (!tcId) {
			if (opts.strict) {
				throw new Error(
					`Unmatched: automationKey="${item.automationKey}" not found in project "${opts.project}"`
				);
			}
			if (opts.autoCreate) {
				const areaPath = opts.areaPath ?? opts.project;
				const newTc = await tcService.create({
					title: item.title,
					areaPath,
					automationKey: item.automationKey,
					description: item.description,
					tags: item.tags,
				});
				tcId = newTc.id;
				autoKeyMap.set(item.automationKey, tcId);
				created++;
			} else {
				unmatched++;
				continue;
			}
		}

		const isFail = Boolean(item.description);
		const run = await execService.startRun({
			testPlanId: opts.planId,
			testCaseId: tcId,
			environment: opts.environment,
			source: "CI",
		});
		await execService.saveStepResult(run.id, {
			stepIndex: 0,
			status: isFail ? "Fail" : "Pass",
			comment: item.description,
			evidenceIds: [],
		});
		await execService.finalizeRun(run.id);
		matched++;
	}

	return { total: parsed.items.length, matched, unmatched, created, errors };
}

function parseFile(filePath: string, source: string): ImportResult {
	const lower = filePath.toLowerCase();
	if (lower.endsWith(".json")) return parseCucumber(source);
	if (lower.endsWith(".xml")) {
		if (source.includes("<test-run") || source.includes("<test-results")) return parseNUnit(source);
		if (source.includes("<assemblies")) return parseXUnit(source);
		if (source.includes("<testng-results")) return parseTestNG(source);
		return parseJUnit(source);
	}
	throw new Error(
		`Unsupported file format: ${filePath}. Supported: .xml (JUnit/NUnit/xUnit/TestNG), .json (Cucumber)`
	);
}
