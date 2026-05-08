export type GherkinError = {
	line: number;
	message: string;
};

export type GherkinValidationResult = {
	valid: boolean;
	errors: GherkinError[];
	scenarioCount: number;
};

const FEATURE_RE = /^\s*(?:@\S+\s*)*Feature:/m;

type LineKind =
	| "feature"
	| "background"
	| "scenario"
	| "scenario-outline"
	| "examples"
	| "step"
	| "tag"
	| "table"
	| "comment"
	| "blank"
	| "other";

function classifyLine(raw: string): LineKind {
	const t = raw.trim();
	if (t === "") return "blank";
	if (t.startsWith("#")) return "comment";
	if (/^@/.test(t)) return "tag";
	if (/^Feature:/.test(t)) return "feature";
	if (/^Background:/.test(t)) return "background";
	if (/^Scenario Outline:/.test(t)) return "scenario-outline";
	if (/^Scenario:/.test(t)) return "scenario";
	if (/^Examples:/.test(t)) return "examples";
	if (/^(Given|When|Then|And|But)\s/.test(t)) return "step";
	if (t.startsWith("|")) return "table";
	return "other";
}

export function validateGherkin(text: string): GherkinValidationResult {
	const errors: GherkinError[] = [];

	if (!text.trim()) {
		return {
			valid: false,
			errors: [{ line: 1, message: "Feature text must not be empty" }],
			scenarioCount: 0,
		};
	}

	if (!FEATURE_RE.test(text)) {
		errors.push({ line: 1, message: "Missing Feature: keyword" });
		return { valid: false, errors, scenarioCount: 0 };
	}

	const lines = text.split("\n");
	const kinds = lines.map(classifyLine);

	// Find all scenario block start indices
	const scenarioStarts: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		const k = kinds[i];
		if (k === "scenario" || k === "scenario-outline") {
			scenarioStarts.push(i);
		}
	}

	if (scenarioStarts.length === 0) {
		errors.push({
			line: lines.findIndex((l) => /^\s*Feature:/.test(l)) + 1 || 1,
			message: "No Scenario or Scenario Outline found — at least one scenario is required",
		});
		return { valid: false, errors, scenarioCount: 0 };
	}

	// Validate each scenario block
	for (let s = 0; s < scenarioStarts.length; s++) {
		const start = scenarioStarts[s] ?? 0;
		const end =
			s + 1 < scenarioStarts.length ? (scenarioStarts[s + 1] ?? lines.length) : lines.length;
		const blockKinds = kinds.slice(start + 1, end);

		const isOutline = kinds[start] === "scenario-outline";
		const hasSteps = blockKinds.some((k) => k === "step");
		const hasExamples = blockKinds.some((k) => k === "examples");

		if (!hasSteps) {
			errors.push({
				line: start + 1,
				message: `Scenario at line ${start + 1} has no steps (Given/When/Then expected)`,
			});
		}

		if (isOutline && !hasExamples) {
			errors.push({
				line: start + 1,
				message: `Scenario Outline at line ${start + 1} is missing an Examples: section`,
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		scenarioCount: scenarioStarts.length,
	};
}
