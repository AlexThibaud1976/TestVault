import type { ImportResult, ParsedTestCase } from "./types.js";
import { tryParseXml } from "./xml-utils.js";

function lastName(dotted: string): string {
	return dotted.split(".").at(-1) ?? dotted;
}

export function parseTestNG(source: string): ImportResult {
	const { doc, errors } = tryParseXml(source);
	if (errors.length > 0) return { items: [], errors };

	const root = doc as Record<string, unknown>;
	const resultsRaw = root["testng-results"];
	if (!resultsRaw) return { items: [], errors: [] };

	const results = resultsRaw as Record<string, unknown>;
	const suites = Array.isArray(results.suite) ? (results.suite as unknown[]) : [];
	const items: ParsedTestCase[] = [];

	for (const suite of suites) {
		if (typeof suite !== "object" || suite === null) continue;
		const s = suite as Record<string, unknown>;
		const tests = Array.isArray(s.test) ? (s.test as unknown[]) : [];

		for (const t of tests) {
			if (typeof t !== "object" || t === null) continue;
			const test = t as Record<string, unknown>;
			const classes = Array.isArray(test.class) ? (test.class as unknown[]) : [];

			for (const cls of classes) {
				if (typeof cls !== "object" || cls === null) continue;
				const c = cls as Record<string, unknown>;
				const className = String(c["@_name"] ?? "");
				const methods = Array.isArray(c["test-method"]) ? (c["test-method"] as unknown[]) : [];

				for (const method of methods) {
					if (typeof method !== "object" || method === null) continue;
					const m = method as Record<string, unknown>;
					const name = String(m["@_name"] ?? "");
					const item: ParsedTestCase = {
						title: name,
						automationKey: `${className}.${name}`,
						tags: [lastName(className)].filter(Boolean),
					};

					const exception = m.exception as Record<string, unknown> | undefined;
					if (exception) {
						const msgNode = exception.message as Record<string, unknown> | string | undefined;
						const msg =
							typeof msgNode === "object" && msgNode !== null
								? String((msgNode as Record<string, unknown>)["#text"] ?? "")
								: String(msgNode ?? "");
						if (msg) item.description = msg;
					}

					items.push(item);
				}
			}
		}
	}

	return { items, errors: [] };
}
