import * as XLSX from "xlsx";
import type { ImportError, ImportResult, ParsedTestCase } from "./types.js";

export function parseExcel(source: ArrayBuffer): ImportResult {
	const items: ParsedTestCase[] = [];
	const errors: ImportError[] = [];

	const wb = XLSX.read(source, { type: "array" });
	const sheetName = wb.SheetNames[0];
	if (!sheetName) return { items, errors };

	const ws = wb.Sheets[sheetName];
	if (!ws) return { items, errors };

	const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
		defval: "",
		raw: false,
	});

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i] ?? {};
		const rowNum = i + 2;

		const title = (row.title ?? "").trim();
		if (!title) {
			errors.push({ row: rowNum, field: "title", message: "Missing required field: title" });
			continue;
		}

		const tc: ParsedTestCase = { title };

		const description = (row.description ?? "").trim();
		if (description) tc.description = description;

		const tagsRaw = (row.tags ?? "").trim();
		if (tagsRaw) {
			const parts = tagsRaw
				.split(/[;,]/)
				.map((t) => t.trim())
				.filter(Boolean);
			if (parts.length > 0) tc.tags = parts;
		}

		const automationKey = (row.automationKey ?? "").trim();
		if (automationKey) tc.automationKey = automationKey;

		items.push(tc);
	}

	return { items, errors };
}
