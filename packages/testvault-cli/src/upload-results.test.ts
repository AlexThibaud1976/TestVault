import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadResultsOptions } from "./upload-results.js";
import { processUploadResults } from "./upload-results.js";

vi.mock("@atconseil/testvault-importers", () => ({
	parseCsv: vi.fn(),
	parseJUnit: vi.fn(),
	parseNUnit: vi.fn(),
	parseXUnit: vi.fn(),
	parseTestNG: vi.fn(),
	parseCucumber: vi.fn(),
	parseExcel: vi.fn(),
}));

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockStartRun = vi.fn();
const mockSaveStepResult = vi.fn();
const mockFinalizeRun = vi.fn();

vi.mock("@atconseil/argos-sdk", () => ({
	createAdoClient: vi.fn(() => ({})),
	createTestCaseService: vi.fn(() => ({
		list: mockList,
		create: mockCreate,
	})),
	createTestExecutionService: vi.fn(() => ({
		startRun: mockStartRun,
		saveStepResult: mockSaveStepResult,
		finalizeRun: mockFinalizeRun,
	})),
}));

const BASE_OPTS: UploadResultsOptions = {
	file: "results.xml",
	planId: 42,
	environment: "CI",
	pat: "fake-pat",
	orgUrl: "https://dev.azure.com/acme",
	project: "MyProject",
};

describe("processUploadResults", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStartRun.mockResolvedValue({ id: 999 });
		mockSaveStepResult.mockResolvedValue(undefined);
		mockFinalizeRun.mockResolvedValue(undefined);
	});

	it("records a Pass execution for each matched test case", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue(
			`<testsuite><testcase classname="com.LoginTest" name="testLogin"/></testsuite>`
		);
		vi.mocked(parseJUnit).mockReturnValue({
			items: [{ title: "testLogin", automationKey: "com.LoginTest.testLogin" }],
			errors: [],
		});
		mockList.mockResolvedValue([{ id: 101, automationKey: "com.LoginTest.testLogin" }]);

		const result = await processUploadResults(BASE_OPTS);

		expect(mockStartRun).toHaveBeenCalledWith(
			expect.objectContaining({ testCaseId: 101, testPlanId: 42, environment: "CI", source: "CI" })
		);
		expect(mockSaveStepResult).toHaveBeenCalledWith(
			999,
			expect.objectContaining({ status: "Pass" })
		);
		expect(mockFinalizeRun).toHaveBeenCalledWith(999);
		expect(result.matched).toBe(1);
		expect(result.unmatched).toBe(0);
	});

	it("records a Fail execution when the parsed item has a description (failure message)", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue(
			`<testsuite><testcase classname="X" name="y"/></testsuite>`
		);
		vi.mocked(parseJUnit).mockReturnValue({
			items: [{ title: "y", automationKey: "X.y", description: "Assertion failed" }],
			errors: [],
		});
		mockList.mockResolvedValue([{ id: 102, automationKey: "X.y" }]);

		await processUploadResults(BASE_OPTS);

		expect(mockSaveStepResult).toHaveBeenCalledWith(
			999,
			expect.objectContaining({ status: "Fail" })
		);
	});

	it("reports unmatched when no TC has the automationKey", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue(
			`<testsuite><testcase classname="X" name="y"/></testsuite>`
		);
		vi.mocked(parseJUnit).mockReturnValue({
			items: [{ title: "y", automationKey: "X.y" }],
			errors: [],
		});
		mockList.mockResolvedValue([]);

		const result = await processUploadResults(BASE_OPTS);

		expect(mockStartRun).not.toHaveBeenCalled();
		expect(result.unmatched).toBe(1);
	});

	it("auto-creates missing TC when autoCreate is set", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue(
			`<testsuite><testcase classname="X" name="y"/></testsuite>`
		);
		vi.mocked(parseJUnit).mockReturnValue({
			items: [{ title: "y", automationKey: "X.y" }],
			errors: [],
		});
		mockList.mockResolvedValue([]);
		mockCreate.mockResolvedValue({ id: 200, automationKey: "X.y" });

		const result = await processUploadResults({ ...BASE_OPTS, autoCreate: true });

		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({ title: "y", automationKey: "X.y" })
		);
		expect(mockStartRun).toHaveBeenCalledWith(expect.objectContaining({ testCaseId: 200 }));
		expect(result.created).toBe(1);
		expect(result.matched).toBe(1);
	});

	it("throws in strict mode when a TC is unmatched", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue(
			`<testsuite><testcase classname="X" name="y"/></testsuite>`
		);
		vi.mocked(parseJUnit).mockReturnValue({
			items: [{ title: "y", automationKey: "X.y" }],
			errors: [],
		});
		mockList.mockResolvedValue([]);

		await expect(processUploadResults({ ...BASE_OPTS, strict: true })).rejects.toThrow(/nmatched/);
	});

	it("detects JUnit format from .xml file extension", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseJUnit } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue("<testsuite></testsuite>");
		vi.mocked(parseJUnit).mockReturnValue({ items: [], errors: [] });
		mockList.mockResolvedValue([]);

		await processUploadResults({ ...BASE_OPTS, file: "junit.xml" });

		expect(parseJUnit).toHaveBeenCalled();
	});

	it("detects Cucumber format from .json file extension", async () => {
		const { readFileSync } = await import("node:fs");
		const { parseCucumber } = await import("@atconseil/testvault-importers");

		vi.mocked(readFileSync).mockReturnValue("[]");
		vi.mocked(parseCucumber).mockReturnValue({ items: [], errors: [] });
		mockList.mockResolvedValue([]);

		await processUploadResults({ ...BASE_OPTS, file: "cucumber.json" });

		expect(parseCucumber).toHaveBeenCalled();
	});
});
