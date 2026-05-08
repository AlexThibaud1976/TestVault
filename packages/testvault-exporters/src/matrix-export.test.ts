import type { CoverageMatrix } from "@atconseil/testvault-sdk";
import { describe, expect, it } from "vitest";
import { exportMatrixToExcel, exportMatrixToPdf } from "./matrix-export.js";

function makeMatrix(): CoverageMatrix {
	return {
		columns: [
			{ testCaseId: 1, testCaseTitle: "TC Login" },
			{ testCaseId: 2, testCaseTitle: "TC Logout" },
		],
		rows: [
			{
				workItemId: 100,
				workItemTitle: "User Story A",
				cells: [
					{ testCaseId: 1, linked: true, latestStatus: "Pass" },
					{ testCaseId: 2, linked: false },
				],
			},
			{
				workItemId: 101,
				workItemTitle: "User Story B",
				cells: [
					{ testCaseId: 1, linked: false },
					{ testCaseId: 2, linked: true, latestStatus: "Fail" },
				],
			},
		],
	};
}

describe("exportMatrixToExcel", () => {
	it("returns a non-empty ArrayBuffer", () => {
		const buf = exportMatrixToExcel(makeMatrix());
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBeGreaterThan(0);
	});

	it("output starts with PK magic bytes (ZIP/XLSX format)", () => {
		const buf = exportMatrixToExcel(makeMatrix());
		// XLSX is a ZIP file — magic bytes 0x50 0x4B
		const view = new Uint8Array(buf);
		expect(view[0]).toBe(0x50);
		expect(view[1]).toBe(0x4b);
	});

	it("returns an ArrayBuffer for an empty matrix", () => {
		const buf = exportMatrixToExcel({ rows: [], columns: [] });
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBeGreaterThan(0);
	});
});

describe("exportMatrixToPdf", () => {
	it("returns a non-empty string (HTML)", () => {
		const html = exportMatrixToPdf(makeMatrix());
		expect(typeof html).toBe("string");
		expect(html.length).toBeGreaterThan(0);
	});

	it("includes Work Item title in the output", () => {
		const html = exportMatrixToPdf(makeMatrix());
		expect(html).toContain("User Story A");
	});

	it("includes TC column header in the output", () => {
		const html = exportMatrixToPdf(makeMatrix());
		expect(html).toContain("TC Login");
	});

	it("includes Pass status text for linked Pass cell", () => {
		const html = exportMatrixToPdf(makeMatrix());
		expect(html).toContain("Pass");
	});

	it("returns valid HTML with table tags", () => {
		const html = exportMatrixToPdf(makeMatrix());
		expect(html).toContain("<table");
		expect(html).toContain("</table>");
	});
});
