import { readFileSync } from "node:fs";
import { createAdoClient, createTestCaseService } from "@atconseil/argos-sdk";
import { featureToTestCases } from "@atconseil/testvault-gherkin";

export type BddSyncOptions = {
	orgUrl: string;
	project: string;
	pat: string;
	areaPath: string;
	featurePaths: string[];
};

export type BddSyncSummary = {
	files: number;
	created: number;
	updated: number;
};

export async function processBddSync(opts: BddSyncOptions): Promise<BddSyncSummary> {
	const client = createAdoClient({ baseUrl: opts.orgUrl, project: opts.project, pat: opts.pat });
	const tcService = createTestCaseService(client, opts.project);

	const allTcs = await tcService.list({ areaPath: opts.areaPath });
	const existingByTitle = new Map(allTcs.map((tc) => [tc.title, tc]));

	let created = 0;
	let updated = 0;

	for (const filePath of opts.featurePaths) {
		const content = readFileSync(filePath, "utf-8");
		const drafts = featureToTestCases(content, opts.areaPath);

		for (const draft of drafts) {
			const existing = existingByTitle.get(draft.title);
			if (existing) {
				await tcService.update(existing.id, {
					gherkin: draft.gherkin,
					steps: draft.steps,
				});
				updated++;
			} else {
				const newTc = await tcService.create(draft);
				existingByTitle.set(draft.title, newTc);
				created++;
			}
		}
	}

	return { files: opts.featurePaths.length, created, updated };
}
