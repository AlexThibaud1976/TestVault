import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseExcel } from "./excel-parser.js";

async function makeXlsx(rows: Record<string, string>[]): Promise<Uint8Array> {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Sheet1");
	const first = rows[0];
	if (first) {
		const headers = Object.keys(first);
		ws.addRow(headers);
		for (const row of rows) {
			ws.addRow(headers.map((h) => row[h] ?? ""));
		}
	}
	const raw = await wb.xlsx.writeBuffer();
	return raw as unknown as Uint8Array;
}

describe("parseExcel", () => {
	it("parses rows with title and description", async () => {
		const buf = await makeXlsx([
			{ title: "TC-01", description: "Login flow" },
			{ title: "TC-02", description: "Logout flow" },
		]);
		const result = await parseExcel(buf);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.title).toBe("TC-01");
		expect(result.items[1]?.description).toBe("Logout flow");
	});

	it("reports error for rows without title", async () => {
		const buf = await makeXlsx([{ description: "No title" }]);
		const result = await parseExcel(buf);
		expect(result.errors).toHaveLength(1);
		expect(result.items).toHaveLength(0);
	});

	it("parses tags from semicolon-separated string", async () => {
		const buf = await makeXlsx([{ title: "TC", tags: "smoke;auth" }]);
		const result = await parseExcel(buf);
		expect(result.items[0]?.tags).toEqual(["smoke", "auth"]);
	});

	it("parses automationKey column", async () => {
		const buf = await makeXlsx([{ title: "TC", automationKey: "com.example.Test" }]);
		const result = await parseExcel(buf);
		expect(result.items[0]?.automationKey).toBe("com.example.Test");
	});

	it("returns empty result for empty workbook", async () => {
		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet("Sheet1");
		ws.addRow(["title"]); // header only, no data rows
		const raw = await wb.xlsx.writeBuffer();
		const result = await parseExcel(raw as unknown as Uint8Array);
		expect(result.items).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});
});
