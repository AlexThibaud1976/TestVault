import type { ParsedScenario, ParsedStep } from "./parser.js";
import { parseFeature } from "./parser.js";

export function generateFeature(
	featureTitle: string,
	scenarios: ParsedScenario[],
	background?: ParsedStep[]
): string {
	const lines: string[] = [`Feature: ${featureTitle}`];

	if (background && background.length > 0) {
		lines.push("");
		lines.push("  Background:");
		for (const step of background) {
			lines.push(`    ${step.keyword} ${step.text}`);
		}
	}

	for (const scenario of scenarios) {
		lines.push("");
		if (scenario.tags.length > 0) {
			lines.push(`  ${scenario.tags.map((t) => `@${t}`).join(" ")}`);
		}
		const kw = scenario.isOutline ? "Scenario Outline" : "Scenario";
		lines.push(`  ${kw}: ${scenario.title}`);
		for (const step of scenario.steps) {
			lines.push(`    ${step.keyword} ${step.text}`);
		}
		if (scenario.examples) {
			lines.push("");
			lines.push("    Examples:");
			lines.push(`      | ${scenario.examples.headers.join(" | ")} |`);
			for (const row of scenario.examples.rows) {
				lines.push(`      | ${row.join(" | ")} |`);
			}
		}
	}

	return `${lines.join("\n")}\n`;
}

export function testCasesToFeature(
	featureTitle: string,
	testCases: Array<{ title: string; gherkin?: string }>
): string {
	const scenarios: ParsedScenario[] = [];
	for (const tc of testCases) {
		if (!tc.gherkin) continue;
		const parsed = parseFeature(tc.gherkin);
		for (const s of parsed.scenarios) {
			scenarios.push(s);
		}
	}
	return generateFeature(featureTitle, scenarios);
}
