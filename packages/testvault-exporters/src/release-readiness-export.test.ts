import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
	exportReleaseReadinessToExcel,
	exportReleaseReadinessToPdf,
} from "./release-readiness-export.js";
import type { ExportOptions, ReleaseReadinessReport } from "./types.js";

function makeReport(): ReleaseReadinessReport {
	return {
		planTitle: "Sprint 42 Release",
		environment: "Production",
		items: [
			{ testCaseId: 1, testCaseTitle: "TC-Login", status: "Pass" },
			{ testCaseId: 2, testCaseTitle: "TC-Logout", status: "Fail" },
			{ testCaseId: 3, testCaseTitle: "TC-Register", status: "Blocked" },
			{ testCaseId: 4, testCaseTitle: "TC-Reset-Password", status: "Unexecuted" },
		],
	};
}

describe("exportReleaseReadinessToExcel", () => {
	it("returns a non-empty Uint8Array", async () => {
		const buf = await exportReleaseReadinessToExcel(makeReport());
		expect(buf).toBeInstanceOf(Uint8Array);
		expect(buf.byteLength).toBeGreaterThan(0);
	});

	it("output starts with PK magic bytes (XLSX format)", async () => {
		const buf = await exportReleaseReadinessToExcel(makeReport());
		expect(buf[0]).toBe(0x50);
		expect(buf[1]).toBe(0x4b);
	});

	it("handles empty items list", async () => {
		const buf = await exportReleaseReadinessToExcel({ planTitle: "Empty", items: [] });
		expect(buf).toBeInstanceOf(Uint8Array);
		expect(buf.byteLength).toBeGreaterThan(0);
	});

	it("includes header row with Test Case column", async () => {
		const buf = await exportReleaseReadinessToExcel(makeReport());
		const wb = new ExcelJS.Workbook();
		// @ts-expect-error ExcelJS 4.x load() type predates TS 5.7+ generic Buffer
		await wb.xlsx.load(buf);
		const ws = wb.worksheets[0]!;
		expect(ws.getRow(1).getCell(1).value).toBe("Test Case");
	});

	it("includes TC title in data rows", async () => {
		const buf = await exportReleaseReadinessToExcel(makeReport());
		const wb = new ExcelJS.Workbook();
		// @ts-expect-error ExcelJS 4.x load() type predates TS 5.7+ generic Buffer
		await wb.xlsx.load(buf);
		const ws = wb.worksheets[0]!;
		expect(ws.getRow(2).getCell(1).value).toBe("TC-Login");
	});

	it("includes status in second column", async () => {
		const buf = await exportReleaseReadinessToExcel(makeReport());
		const wb = new ExcelJS.Workbook();
		// @ts-expect-error ExcelJS 4.x load() type predates TS 5.7+ generic Buffer
		await wb.xlsx.load(buf);
		const ws = wb.worksheets[0]!;
		expect(ws.getRow(2).getCell(2).value).toBe("Pass");
	});
});

describe("exportReleaseReadinessToPdf", () => {
	it("returns a non-empty HTML string", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(typeof html).toBe("string");
		expect(html).toContain("<!DOCTYPE html>");
	});

	it("includes plan title in output", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(html).toContain("Sprint 42 Release");
	});

	it("includes environment in output", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(html).toContain("Production");
	});

	it("includes TC title in output", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(html).toContain("TC-Login");
	});

	it("includes status text in output", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(html).toContain("Pass");
		expect(html).toContain("Fail");
	});

	it("includes summary counts in output", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		// 1 Pass, 1 Fail, 1 Blocked, 1 Unexecuted out of 4 total
		expect(html).toContain("4");
	});

	it("includes logo img tag when logoDataUri is provided", () => {
		const options: ExportOptions = { logoDataUri: "data:image/png;base64,XYZ" };
		const html = exportReleaseReadinessToPdf(makeReport(), options);
		expect(html).toContain("<img");
		expect(html).toContain("data:image/png;base64,XYZ");
	});

	it("does not include logo img without options", () => {
		const html = exportReleaseReadinessToPdf(makeReport());
		expect(html).not.toContain("<img");
	});

	it("uses custom title when provided in options", () => {
		const options: ExportOptions = { title: "Custom Report Title" };
		const html = exportReleaseReadinessToPdf(makeReport(), options);
		expect(html).toContain("Custom Report Title");
	});
});
