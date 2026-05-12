import { featureToTestCases, parseFeature } from "@atconseil/argos-gherkin";
import type { FeatureTestCaseDraft } from "@atconseil/argos-gherkin";

export type GitPushChangedFile = {
	path: string;
	changeType: "add" | "edit" | "delete";
};

export type GitPushEvent = {
	repoUrl: string;
	branch: string;
	changedFiles: GitPushChangedFile[];
};

export type SyncResult = {
	created: number;
	updated: number;
	deprecated: number;
	skipped: number;
};

export interface IFileReader {
	read(repoUrl: string, branch: string, path: string): Promise<string>;
}

export interface IBddMappingReader {
	listMappings(): Promise<
		Array<{ repoUrl: string; branch: string; pathGlob: string; areaPath: string }>
	>;
}

export interface IBddTcService {
	list(opts?: { areaPath?: string }): Promise<
		Array<{ id: number; title: string; gherkin?: string }>
	>;
	create(draft: FeatureTestCaseDraft): Promise<{ id: number; title: string }>;
	update(id: number, patch: Partial<FeatureTestCaseDraft>): Promise<void>;
	deprecate(id: number): Promise<void>;
}

function matchesGlob(filePath: string, glob: string): boolean {
	const path = filePath.startsWith("/") ? filePath.slice(1) : filePath;
	const regexStr = glob
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*\//g, "(?:[^/]+/)*")
		.replace(/\*\*/g, ".*")
		.replace(/\*/g, "[^/]*");
	return new RegExp(`^${regexStr}$`).test(path);
}

export async function handleGitPush(
	event: GitPushEvent,
	mappingReader: IBddMappingReader,
	tcService: IBddTcService,
	fileReader: IFileReader
): Promise<SyncResult> {
	const result: SyncResult = { created: 0, updated: 0, deprecated: 0, skipped: 0 };
	const mappings = await mappingReader.listMappings();

	for (const file of event.changedFiles) {
		if (!file.path.endsWith(".feature")) {
			result.skipped++;
			continue;
		}

		const matched = mappings.filter(
			(m) =>
				m.repoUrl === event.repoUrl &&
				m.branch === event.branch &&
				matchesGlob(file.path, m.pathGlob)
		);

		if (matched.length === 0) {
			result.skipped++;
			continue;
		}

		for (const mapping of matched) {
			if (file.changeType === "delete") {
				const existing = await tcService.list({ areaPath: mapping.areaPath });
				for (const tc of existing) {
					if (tc.gherkin) {
						await tcService.deprecate(tc.id);
						result.deprecated++;
					}
				}
			} else {
				const content = await fileReader.read(event.repoUrl, event.branch, file.path);
				const feature = parseFeature(content);
				const currentTitles = new Set(feature.scenarios.map((s) => s.title));

				const existing = await tcService.list({ areaPath: mapping.areaPath });
				const existingByTitle = new Map(existing.map((tc) => [tc.title, tc]));

				const drafts = featureToTestCases(content, mapping.areaPath);
				for (const draft of drafts) {
					const existingTc = existingByTitle.get(draft.title);
					if (existingTc) {
						await tcService.update(existingTc.id, {
							gherkin: draft.gherkin,
							steps: draft.steps,
						});
						result.updated++;
					} else {
						await tcService.create(draft);
						result.created++;
					}
				}

				for (const tc of existing) {
					if (tc.gherkin && !currentTitles.has(tc.title)) {
						await tcService.deprecate(tc.id);
						result.deprecated++;
					}
				}
			}
		}
	}

	return result;
}
