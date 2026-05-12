export type ParsedStep = {
	keyword: string;
	text: string;
};

export type ExamplesTable = {
	headers: string[];
	rows: string[][];
};

export type ParsedScenario = {
	title: string;
	tags: string[];
	steps: ParsedStep[];
	isOutline: boolean;
	examples?: ExamplesTable;
};

export type ParsedFeature = {
	title: string;
	description: string;
	background: ParsedStep[];
	scenarios: ParsedScenario[];
};

export type FeatureTestCaseDraft = {
	title: string;
	areaPath: string;
	priority: 1 | 2 | 3 | 4;
	automationStatus: "Manual" | "Planned" | "Automated";
	gherkin?: string;
	steps: Array<{ index: number; action: string; expected: string }>;
};

function parseTableRow(line: string): string[] {
	return line
		.trim()
		.slice(1, -1)
		.split("|")
		.map((c) => c.trim());
}

export function parseFeature(text: string): ParsedFeature {
	const lines = text.split("\n");

	let featureTitle = "";
	const descLines: string[] = [];
	const background: ParsedStep[] = [];
	const scenarios: ParsedScenario[] = [];

	let pendingTags: string[] = [];
	let currentScenario: ParsedScenario | null = null;
	let inBackground = false;
	let inFeatureDesc = false;
	let inExamples = false;
	let examplesHeaders: string[] = [];
	let examplesRows: string[][] = [];

	function closeScenario() {
		if (!currentScenario) return;
		if (examplesHeaders.length > 0) {
			currentScenario.examples = { headers: examplesHeaders, rows: examplesRows };
		}
		scenarios.push(currentScenario);
		currentScenario = null;
		inExamples = false;
		examplesHeaders = [];
		examplesRows = [];
	}

	for (const raw of lines) {
		const t = raw.trim();

		if (t === "" || t.startsWith("#")) continue;

		if (/^Feature:/.test(t)) {
			featureTitle = t.slice("Feature:".length).trim();
			inFeatureDesc = true;
			inBackground = false;
			continue;
		}

		if (/^Background:/.test(t)) {
			inFeatureDesc = false;
			inBackground = true;
			closeScenario();
			continue;
		}

		if (/^@/.test(t)) {
			inFeatureDesc = false;
			pendingTags = t
				.split(/\s+/)
				.filter((s) => s.startsWith("@"))
				.map((s) => s.slice(1));
			continue;
		}

		if (/^Scenario Outline:/.test(t)) {
			inFeatureDesc = false;
			inBackground = false;
			closeScenario();
			currentScenario = {
				title: t.slice("Scenario Outline:".length).trim(),
				tags: pendingTags,
				steps: [],
				isOutline: true,
			};
			pendingTags = [];
			continue;
		}

		if (/^Scenario:/.test(t)) {
			inFeatureDesc = false;
			inBackground = false;
			closeScenario();
			currentScenario = {
				title: t.slice("Scenario:".length).trim(),
				tags: pendingTags,
				steps: [],
				isOutline: false,
			};
			pendingTags = [];
			continue;
		}

		if (/^Examples:/.test(t)) {
			inExamples = true;
			continue;
		}

		if (inExamples && t.startsWith("|")) {
			const cells = parseTableRow(raw);
			if (examplesHeaders.length === 0) {
				examplesHeaders = cells;
			} else {
				examplesRows.push(cells);
			}
			continue;
		}

		const stepMatch = t.match(/^(Given|When|Then|And|But)\s+(.*)/);
		if (stepMatch) {
			const step: ParsedStep = { keyword: stepMatch[1] ?? "", text: stepMatch[2] ?? "" };
			if (inBackground) {
				background.push(step);
			} else if (currentScenario) {
				currentScenario.steps.push(step);
			}
			inExamples = false;
			continue;
		}

		if (inFeatureDesc) {
			descLines.push(t);
		}
	}

	closeScenario();

	return {
		title: featureTitle,
		description: descLines.join("\n"),
		background,
		scenarios,
	};
}

export function featureToTestCases(text: string, areaPath: string): FeatureTestCaseDraft[] {
	const feature = parseFeature(text);
	return feature.scenarios.map((scenario) => {
		const gherkinLines: string[] = [`Feature: ${feature.title}`];
		if (scenario.tags.length > 0) {
			gherkinLines.push(`  ${scenario.tags.map((t) => `@${t}`).join(" ")}`);
		}
		const kw = scenario.isOutline ? "Scenario Outline" : "Scenario";
		gherkinLines.push(`  ${kw}: ${scenario.title}`);
		for (const step of scenario.steps) {
			gherkinLines.push(`    ${step.keyword} ${step.text}`);
		}
		if (scenario.examples) {
			gherkinLines.push("    Examples:");
			gherkinLines.push(`      | ${scenario.examples.headers.join(" | ")} |`);
			for (const row of scenario.examples.rows) {
				gherkinLines.push(`      | ${row.join(" | ")} |`);
			}
		}

		return {
			title: scenario.title,
			areaPath,
			priority: 3,
			automationStatus: "Planned",
			gherkin: gherkinLines.join("\n"),
			steps: scenario.steps.map((s, idx) => ({
				index: idx + 1,
				action: `${s.keyword} ${s.text}`,
				expected: "",
			})),
		};
	});
}
