import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcel } from "./excel-parser.js";

function makeXlsx(rows: Record<string, string>[]): ArrayBuffer {
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
	return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseExcel", () => {
	it("parses rows with title and description", () => {
		const buf = makeXlsx([
			{ title: "TC-01", description: "Login flow" },
			{ title: "TC-02", description: "Logout flow" },
		]);
		const result = parseExcel(buf);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.title).toBe("TC-01");
		expect(result.items[1]?.description).toBe("Logout flow");
	});

	it("reports error for rows without title", () => {
		const buf = makeXlsx([{ description: "No title" }]);
		const result = parseExcel(buf);
		expect(result.errors).toHaveLength(1);
		expect(result.items).toHaveLength(0);
	});

	it("parses tags from semicolon-separated string", () => {
		const buf = makeXlsx([{ title: "TC", tags: "smoke;auth" }]);
		const result = parseExcel(buf);
		expect(result.items[0]?.tags).toEqual(["smoke", "auth"]);
	});

	it("parses automationKey column", () => {
		const buf = makeXlsx([{ title: "TC", automationKey: "com.example.Test" }]);
		const result = parseExcel(buf);
		expect(result.items[0]?.automationKey).toBe("com.example.Test");
	});

	it("returns empty result for empty workbook", () => {
		const ws = XLSX.utils.aoa_to_sheet([["title"]]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
		const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
		const result = parseExcel(buf);
		expect(result.items).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});
});
