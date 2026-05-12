export type WiqlOptions = {
	workItemType?: string;
	tags?: string[];
	state?: string;
	fields?: string[];
	asOf?: string;
};

const DEFAULT_FIELDS = ["System.Id", "System.Title", "System.State", "System.WorkItemType"];

export function buildWiqlQuery(projectName: string, options: WiqlOptions = {}): string {
	const fields = options.fields ?? DEFAULT_FIELDS;
	const select = fields.map((f) => `[${f}]`).join(", ");

	const conditions: string[] = [`[System.TeamProject] = '${esc(projectName)}'`];

	if (options.workItemType) {
		conditions.push(`[System.WorkItemType] = '${esc(options.workItemType)}'`);
	}
	if (options.state) {
		conditions.push(`[System.State] = '${esc(options.state)}'`);
	}
	for (const tag of options.tags ?? []) {
		conditions.push(`[System.Tags] CONTAINS '${esc(tag)}'`);
	}

	const where = `WHERE ${conditions.join(" AND ")}`;
	const asOf = options.asOf ? ` ASOF '${options.asOf}'` : "";

	return `SELECT ${select} FROM WorkItems ${where}${asOf}`;
}

export function buildTestCaseQuery(projectName: string, options: WiqlOptions = {}): string {
	return buildWiqlQuery(projectName, { ...options, workItemType: "TestVault.TestCase" });
}

function esc(s: string): string {
	return s.replace(/'/g, "''");
}
