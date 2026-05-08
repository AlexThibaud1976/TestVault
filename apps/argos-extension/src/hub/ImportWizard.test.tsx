import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportWizard } from "./ImportWizard.js";

vi.mock("@atconseil/testvault-importers", () => ({
	parseCsv: vi.fn().mockReturnValue({
		items: [
			{ title: "TC-01", description: "Login flow" },
			{ title: "TC-02", description: "Logout flow" },
		],
		errors: [],
	}),
	parseExcel: vi.fn().mockReturnValue({ items: [], errors: [] }),
	parseJUnit: vi.fn().mockReturnValue({ items: [], errors: [] }),
	parseNUnit: vi.fn().mockReturnValue({ items: [], errors: [] }),
	parseXUnit: vi.fn().mockReturnValue({ items: [], errors: [] }),
	parseTestNG: vi.fn().mockReturnValue({ items: [], errors: [] }),
	parseCucumber: vi.fn().mockReturnValue({ items: [], errors: [] }),
}));

function makeFile(name: string, content: string, type = "text/plain"): File {
	return new File([content], name, { type });
}

async function uploadFile(input: HTMLElement, file: File) {
	await act(async () => {
		Object.defineProperty(input, "files", { value: [file], writable: false, configurable: true });
		fireEvent.change(input);
		await new Promise((r) => setTimeout(r, 20));
	});
}

describe("ImportWizard", () => {
	const onImport = vi.fn();
	beforeEach(() => onImport.mockClear());
	afterEach(cleanup);

	it("renders the upload step initially", () => {
		render(<ImportWizard onImport={onImport} />);
		expect(screen.getByTestId("import-wizard")).toBeDefined();
		expect(screen.getByTestId("file-drop-zone")).toBeDefined();
	});

	it("shows preview after file is selected", async () => {
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("test.csv", "title\nTC-01"));
		await waitFor(() => expect(screen.getByTestId("preview-step")).toBeDefined());
		expect(screen.getByTestId("preview-count").textContent).toBe("2");
	});

	it("shows detected format CSV after file selection", async () => {
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("results.csv", "title\nTC-01"));
		await waitFor(() => {
			expect(screen.getByTestId("detected-format").textContent).toBe("CSV");
		});
	});

	it("calls onImport with parsed items when Confirm is clicked", async () => {
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("test.csv", "title\nTC-01"));
		await waitFor(() => screen.getByTestId("confirm-import-button"));
		await userEvent.click(screen.getByTestId("confirm-import-button"));
		expect(onImport).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ title: "TC-01" })])
		);
	});

	it("shows error count when parser returns errors", async () => {
		const { parseCsv } = await import("@atconseil/testvault-importers");
		vi.mocked(parseCsv).mockReturnValueOnce({
			items: [{ title: "TC-01" }],
			errors: [{ row: 3, message: "Missing title" }],
		});
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("test.csv", "title\nTC-01"));
		await waitFor(() => {
			expect(screen.getByTestId("error-count").textContent).toBe("1");
		});
	});

	it("shows download-errors button when there are errors", async () => {
		const { parseCsv } = await import("@atconseil/testvault-importers");
		vi.mocked(parseCsv).mockReturnValueOnce({
			items: [],
			errors: [{ row: 2, message: "Missing title" }],
		});
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("test.csv", "title\n"));
		await waitFor(() => expect(screen.getByTestId("download-errors-button")).toBeDefined());
	});

	it("allows going back to upload step", async () => {
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		await uploadFile(input, makeFile("test.csv", "title\nTC-01"));
		await waitFor(() => screen.getByTestId("back-button"));
		await userEvent.click(screen.getByTestId("back-button"));
		expect(screen.getByTestId("file-drop-zone")).toBeDefined();
	});

	it("detects JUnit format from .xml file with JUnit content", async () => {
		const { parseJUnit } = await import("@atconseil/testvault-importers");
		vi.mocked(parseJUnit).mockReturnValueOnce({
			items: [{ title: "testLogin", automationKey: "com.example.LoginTest.testLogin" }],
			errors: [],
		});
		render(<ImportWizard onImport={onImport} />);
		const input = screen.getByTestId("file-input");
		const xml = `<testsuite name="T"><testcase classname="C" name="testLogin"/></testsuite>`;
		await uploadFile(input, makeFile("results.xml", xml, "text/xml"));
		await waitFor(() => {
			expect(screen.getByTestId("detected-format").textContent).toBe("JUnit");
		});
	});
});
