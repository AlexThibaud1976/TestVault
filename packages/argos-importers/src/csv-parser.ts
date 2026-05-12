import type { ImportError, ImportResult, ParsedTestCase, ParsedTestStep } from "./types.js";

function detectDelimiter(line: string): string {
	const commas = (line.match(/,/g) ?? []).length;
	const semis = (line.match(/;/g) ?? []).length;
	return semis > commas ? ";" : ",";
}

function parseLine(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let current = "";
	let inQuote = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuote && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuote = !inQuote;
			}
		} else if (ch === delimiter && !inQuote) {
			fields.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	fields.push(current);
	return fields;
}

function parseStepsField(raw: string): ParsedTestStep[] | undefined {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw);
		const arr: ParsedTestStep[] = [];
		for (const item of Array.isArray(parsed) ? parsed : []) {
			if (typeof item === "object" && item !== null && "action" in item) {
				arr.push({ action: String(item.action), expected: String(item.expected ?? "") });
			}
		}
		return arr.length > 0 ? arr : undefined;
	} catch {
		return undefined;
	}
}

export function parseCsv(source: string): ImportResult {
	const items: ParsedTestCase[] = [];
	const errors: ImportError[] = [];

	const lines = source.split(/\r?\n/);
	const nonBlank = lines.filter((l) => l.trim().length > 0);
	if (nonBlank.length < 1) return { items, errors };

	const headerLine = nonBlank[0] ?? "";
	const delimiter = detectDelimiter(headerLine);
	const headers = parseLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

	const idx = (name: string) => headers.indexOf(name);

	for (let i = 1; i < nonBlank.length; i++) {
		const row = i + 1;
		const fields = parseLine(nonBlank[i] ?? "", delimiter);

		const titleIdx = idx("title");
		const title = titleIdx >= 0 ? (fields[titleIdx] ?? "").trim() : "";

		if (!title) {
			errors.push({ row, field: "title", message: "Missing required field: title" });
			continue;
		}

		const tc: ParsedTestCase = { title };

		const descIdx = idx("description");
		if (descIdx >= 0 && fields[descIdx]) tc.description = fields[descIdx];

		const tagsIdx = idx("tags");
		if (tagsIdx >= 0 && fields[tagsIdx]) {
			const raw = fields[tagsIdx] ?? "";
			const parts = raw
				.split(/[;,]/)
				.map((t) => t.trim())
				.filter(Boolean);
			if (parts.length > 0) tc.tags = parts;
		}

		const keyIdx = idx("automationkey");
		if (keyIdx >= 0 && fields[keyIdx]) tc.automationKey = fields[keyIdx];

		const stepsIdx = idx("steps");
		if (stepsIdx >= 0 && fields[stepsIdx]) {
			const steps = parseStepsField(fields[stepsIdx] ?? "");
			if (steps) tc.steps = steps;
		}

		items.push(tc);
	}

	return { items, errors };
}
