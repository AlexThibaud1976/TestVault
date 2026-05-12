import type { ImportResult, ParsedTestCase, ParsedTestStep } from "./types.js";

type CucumberStep = {
	keyword?: string;
	name?: string;
	result?: { status?: string; error_message?: string };
};

type CucumberElement = {
	id?: string;
	name?: string;
	type?: string;
	description?: string;
	tags?: Array<{ name?: string }>;
	steps?: CucumberStep[];
};

type CucumberFeature = {
	name?: string;
	elements?: CucumberElement[];
};

export function parseCucumber(source: string): ImportResult {
	let features: CucumberFeature[];
	try {
		features = JSON.parse(source) as CucumberFeature[];
		if (!Array.isArray(features)) throw new Error("Expected array");
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { items: [], errors: [{ message: `JSON parse error: ${msg}` }] };
	}

	const items: ParsedTestCase[] = [];

	for (const feature of features) {
		const featureName = feature.name ?? "";
		const elements = feature.elements ?? [];

		for (const element of elements) {
			if (element.type === "background") continue;

			const title = element.name ?? "";
			const tags: string[] = [featureName].filter(Boolean);
			for (const t of element.tags ?? []) {
				const name = (t.name ?? "").replace(/^@/, "");
				if (name) tags.push(name);
			}

			const steps: ParsedTestStep[] = [];
			let failureDesc: string | undefined;
			for (const step of element.steps ?? []) {
				const keyword = (step.keyword ?? "").trimEnd();
				const action = `${keyword} ${step.name ?? ""}`.trim();
				steps.push({ action, expected: "" });
				if (step.result?.error_message && !failureDesc) {
					failureDesc = step.result.error_message;
				}
			}

			const item: ParsedTestCase = {
				title,
				automationKey: element.id,
				tags: tags.length > 0 ? tags : undefined,
				steps: steps.length > 0 ? steps : undefined,
			};
			if (failureDesc) item.description = failureDesc;

			items.push(item);
		}
	}

	return { items, errors: [] };
}
