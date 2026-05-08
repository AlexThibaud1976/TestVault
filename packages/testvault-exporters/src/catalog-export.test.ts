import { describe, expect, it } from "vitest";
import { exportCatalogToExcel, exportCatalogToPdf } from "./catalog-export.js";
import type { CatalogItem, ExportOptions } from "./types.js";

function makeItems(): CatalogItem[] {
	return [
		{
			title: "TC-Login",
			description: "Verify user can log in",
			tags: ["smoke", "auth"],
			automationKey: "com.example.LoginTest",
			steps: [
				{ action: "Navigate to login page", expected: "Login form visible" },
				{ action: "Enter credentials", expected: "Fields filled" },
			],
		},
		{
			title: "TC-Logout",
			description: "Verify user can log out",
			tags: [],
		},
	];
}

describe("exportCatalogToExcel", () => {
	it("returns a non-empty ArrayBuffer", () => {
		const buf = exportCatalogToExcel(makeItems());
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBeGreaterThan(0);
	});

	it("output starts with PK magic bytes (XLSX format)", () => {
		const buf = exportCatalogToExcel(makeItems());
		const view = new Uint8Array(buf);
		expect(view[0]).toBe(0x50);
		expect(view[1]).toBe(0x4b);
	});

	it("handles empty catalog", () => {
		const buf = exportCatalogToExcel([]);
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBeGreaterThan(0);
	});

	it("includes header row", async () => {
		const buf = exportCatalogToExcel(makeItems());
		const XLSX = await import("xlsx");
		const wb = XLSX.read(buf, { type: "array" });
		const ws = wb.Sheets[wb.SheetNames[0] ?? ""] ?? {};
		expect(ws.A1?.v).toBe("Title");
	});

	it("includes TC title in first data row", async () => {
		const buf = exportCatalogToExcel(makeItems());
		const XLSX = await import("xlsx");
		const wb = XLSX.read(buf, { type: "array" });
		const ws = wb.Sheets[wb.SheetNames[0] ?? ""] ?? {};
		expect(ws.A2?.v).toBe("TC-Login");
	});
});

describe("exportCatalogToPdf", () => {
	it("returns a non-empty HTML string", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(typeof html).toBe("string");
		expect(html).toContain("<!DOCTYPE html>");
	});

	it("includes TC title in output", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(html).toContain("TC-Login");
	});

	it("includes description in output", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(html).toContain("Verify user can log in");
	});

	it("includes tags in output", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(html).toContain("smoke");
	});

	it("includes step action text in output", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(html).toContain("Navigate to login page");
	});

	it("includes logo img tag when logoDataUri is provided", () => {
		const options: ExportOptions = { logoDataUri: "data:image/png;base64,ABC" };
		const html = exportCatalogToPdf(makeItems(), options);
		expect(html).toContain("<img");
		expect(html).toContain("data:image/png;base64,ABC");
	});

	it("does not include logo img when no options given", () => {
		const html = exportCatalogToPdf(makeItems());
		expect(html).not.toContain("<img");
	});

	it("uses custom title when provided", () => {
		const options: ExportOptions = { title: "Sprint 42 TC Catalog" };
		const html = exportCatalogToPdf(makeItems(), options);
		expect(html).toContain("Sprint 42 TC Catalog");
	});
});
