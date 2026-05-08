import type { ImportResult, ParsedTestCase } from "./types.js";
import { tryParseXml } from "./xml-utils.js";

function lastName(dotted: string): string {
	return dotted.split(".").at(-1) ?? dotted;
}

function collectNUnit3Cases(node: unknown): ParsedTestCase[] {
	if (typeof node !== "object" || node === null) return [];
	const items: ParsedTestCase[] = [];
	const n = node as Record<string, unknown>;

	const cases = Array.isArray(n["test-case"]) ? (n["test-case"] as unknown[]) : [];
	for (const tc of cases) {
		if (typeof tc !== "object" || tc === null) continue;
		const t = tc as Record<string, unknown>;
		const fullname = String(t["@_fullname"] ?? t["@_name"] ?? "");
		const name = String(t["@_name"] ?? "");
		const item: ParsedTestCase = {
			title: lastName(name) || name,
			automationKey: fullname,
			tags: [lastName(fullname.split(".").slice(0, -1).join("."))].filter(Boolean),
		};
		const failure = t.failure as Record<string, unknown> | undefined;
		if (failure) {
			const msg = String(
				(failure.message as Record<string, unknown>)?.["#text"] ?? failure.message ?? ""
			);
			if (msg) item.description = msg;
		}
		items.push(item);
	}

	for (const key of ["test-suite", "test-run"]) {
		const children = Array.isArray(n[key]) ? (n[key] as unknown[]) : [];
		for (const child of children) items.push(...collectNUnit3Cases(child));
	}

	return items;
}

function collectNUnit2Cases(node: unknown): ParsedTestCase[] {
	if (typeof node !== "object" || node === null) return [];
	const items: ParsedTestCase[] = [];
	const n = node as Record<string, unknown>;

	const cases = Array.isArray(n["test-case"]) ? (n["test-case"] as unknown[]) : [];
	for (const tc of cases) {
		if (typeof tc !== "object" || tc === null) continue;
		const t = tc as Record<string, unknown>;
		const fullname = String(t["@_name"] ?? "");
		const parts = fullname.split(".");
		items.push({
			title: parts.at(-1) ?? fullname,
			automationKey: fullname,
		});
	}

	const suites = Array.isArray(n["test-suite"]) ? (n["test-suite"] as unknown[]) : [];
	for (const s of suites) {
		const sr = s as Record<string, unknown>;
		const results = sr.results as Record<string, unknown> | undefined;
		if (results) items.push(...collectNUnit2Cases(results));
		items.push(...collectNUnit2Cases(s));
	}

	return items;
}

export function parseNUnit(source: string): ImportResult {
	const { doc, errors } = tryParseXml(source);
	if (errors.length > 0) return { items: [], errors };

	const root = doc as Record<string, unknown>;

	if (root["test-run"]) {
		const run = root["test-run"] as Record<string, unknown>;
		return { items: collectNUnit3Cases(run), errors: [] };
	}

	if (root["test-results"]) {
		const res = root["test-results"] as Record<string, unknown>;
		return { items: collectNUnit2Cases(res), errors: [] };
	}

	return { items: [], errors: [] };
}
