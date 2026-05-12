import type { ImportResult, ParsedTestCase } from "./types.js";
import { tryParseXml } from "./xml-utils.js";

function lastName(dotted: string): string {
	return dotted.split(".").at(-1) ?? dotted;
}

function collectTestcases(suites: unknown[]): ParsedTestCase[] {
	const items: ParsedTestCase[] = [];
	for (const suite of suites) {
		if (typeof suite !== "object" || suite === null) continue;
		const s = suite as Record<string, unknown>;

		const cases = Array.isArray(s.testcase) ? (s.testcase as unknown[]) : [];
		for (const tc of cases) {
			if (typeof tc !== "object" || tc === null) continue;
			const t = tc as Record<string, unknown>;
			const name = String(t["@_name"] ?? "");
			const classname = String(t["@_classname"] ?? "");
			const key = classname ? `${classname}.${name}` : name;
			const item: ParsedTestCase = {
				title: name,
				automationKey: key,
				tags: [lastName(classname)].filter(Boolean),
			};
			const failure = t.failure as Record<string, unknown> | string | undefined;
			if (failure) {
				const msg =
					typeof failure === "object"
						? String((failure as Record<string, unknown>)["@_message"] ?? failure["#text"] ?? "")
						: String(failure);
				if (msg) item.description = msg;
			}
			items.push(item);
		}

		const nested = Array.isArray(s.testsuite) ? (s.testsuite as unknown[]) : [];
		if (nested.length > 0) items.push(...collectTestcases(nested));
	}
	return items;
}

export function parseJUnit(source: string): ImportResult {
	const { doc, errors } = tryParseXml(source);
	if (errors.length > 0) return { items: [], errors };

	const root = doc as Record<string, unknown>;
	const suites: unknown[] = [];

	if (root.testsuites) {
		const ts = root.testsuites as Record<string, unknown>;
		const arr = Array.isArray(ts.testsuite) ? (ts.testsuite as unknown[]) : [];
		suites.push(...arr);
	} else if (root.testsuite) {
		const arr = Array.isArray(root.testsuite) ? (root.testsuite as unknown[]) : [root.testsuite];
		suites.push(...arr);
	}

	return { items: collectTestcases(suites), errors: [] };
}
