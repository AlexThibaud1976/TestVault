import type { ImportResult, ParsedTestCase } from "./types.js";
import { tryParseXml } from "./xml-utils.js";

function lastName(dotted: string): string {
	return dotted.split(".").at(-1) ?? dotted;
}

export function parseXUnit(source: string): ImportResult {
	const { doc, errors } = tryParseXml(source);
	if (errors.length > 0) return { items: [], errors };

	const root = doc as Record<string, unknown>;
	const assembliesRaw = root.assemblies;
	if (!assembliesRaw) return { items: [], errors: [] };

	const assemblies = Array.isArray(assembliesRaw)
		? assembliesRaw
		: (assembliesRaw as Record<string, unknown>).assembly != null
			? Array.isArray((assembliesRaw as Record<string, unknown>).assembly)
				? ((assembliesRaw as Record<string, unknown>).assembly as unknown[])
				: [(assembliesRaw as Record<string, unknown>).assembly]
			: [];

	const items: ParsedTestCase[] = [];

	for (const assembly of assemblies) {
		if (typeof assembly !== "object" || assembly === null) continue;
		const a = assembly as Record<string, unknown>;

		const collections = Array.isArray(a.collection) ? (a.collection as unknown[]) : [];
		for (const col of collections) {
			if (typeof col !== "object" || col === null) continue;
			const c = col as Record<string, unknown>;
			const tests = Array.isArray(c.test) ? (c.test as unknown[]) : [];
			for (const t of tests) {
				if (typeof t !== "object" || t === null) continue;
				const test = t as Record<string, unknown>;
				const fullName = String(test["@_name"] ?? "");
				const method = String(test["@_method"] ?? lastName(fullName));
				const typeName = String(test["@_type"] ?? "");
				const item: ParsedTestCase = {
					title: method,
					automationKey: fullName || `${typeName}.${method}`,
					tags: [lastName(typeName)].filter(Boolean),
				};

				const failure = test.failure as Record<string, unknown> | undefined;
				if (failure) {
					const msg = String(
						(failure.message as Record<string, unknown>)?.["#text"] ?? failure.message ?? ""
					);
					if (msg) item.description = msg;
				}

				const reason = test.reason as Record<string, unknown> | string | undefined;
				if (reason) {
					const msg =
						typeof reason === "object"
							? String((reason as Record<string, unknown>)["#text"] ?? "")
							: String(reason);
					if (msg) item.description = msg;
				}

				items.push(item);
			}
		}
	}

	return { items, errors: [] };
}
