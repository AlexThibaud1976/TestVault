import ExcelJS from "exceljs";
import type { ImportError, ImportResult, ParsedTestCase } from "./types.js";

export async function parseExcel(source: ArrayBuffer | Uint8Array): Promise<ImportResult> {
	const items: ParsedTestCase[] = [];
	const errors: ImportError[] = [];

	const wb = new ExcelJS.Workbook();
	// @ts-expect-error ExcelJS 4.x load() type predates TS 5.7+ generic Buffer/Uint8Array
	await wb.xlsx.load(source);

	const ws = wb.worksheets[0];
	if (!ws) return { items, errors };

	// Build a map of lowercase column name → 1-based column index from the header row
	const colMap: Record<string, number> = {};
	ws.getRow(1).eachCell((cell, colNum) => {
		const name = String(cell.value ?? "")
			.trim()
			.toLowerCase();
		if (name) colMap[name] = colNum;
	});

	ws.eachRow((row, rowNum) => {
		if (rowNum === 1) return; // skip header

		const getVal = (field: string): string => {
			const col = colMap[field];
			if (!col) return "";
			return String(row.getCell(col).value ?? "").trim();
		};

		const title = getVal("title");
		if (!title) {
			errors.push({ row: rowNum, field: "title", message: "Missing required field: title" });
			return;
		}

		const tc: ParsedTestCase = { title };

		const description = getVal("description");
		if (description) tc.description = description;

		const tagsRaw = getVal("tags");
		if (tagsRaw) {
			const parts = tagsRaw
				.split(/[;,]/)
				.map((t) => t.trim())
				.filter(Boolean);
			if (parts.length > 0) tc.tags = parts;
		}

		const automationKey = getVal("automationkey");
		if (automationKey) tc.automationKey = automationKey;

		items.push(tc);
	});

	return { items, errors };
}
