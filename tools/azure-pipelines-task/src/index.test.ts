import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskInputs } from "./index.js";
import { buildCliArgs, getTaskInputs } from "./index.js";

const { mockGetInput, mockGetBoolInput } = vi.hoisted(() => ({
	mockGetInput: vi.fn(),
	mockGetBoolInput: vi.fn(),
}));

vi.mock("azure-pipelines-task-lib/task.js", () => ({
	getInput: mockGetInput,
	getBoolInput: mockGetBoolInput,
	setResult: vi.fn(),
	TaskResult: { Succeeded: 0, Failed: 2 },
}));

describe("getTaskInputs", () => {
	beforeEach(() => {
		mockGetInput.mockReset();
		mockGetBoolInput.mockReset();
		mockGetInput.mockImplementation((name: string) => {
			const map: Record<string, string> = {
				pat: "token123",
				orgUrl: "https://dev.azure.com/acme",
				project: "MyProject",
				planId: "42",
				resultsFile: "junit.xml",
				environment: "CI",
				areaPath: "",
			};
			return map[name] ?? "";
		});
		mockGetBoolInput.mockImplementation((name: string) => {
			const map: Record<string, boolean> = { autoCreate: false, strict: false };
			return map[name] ?? false;
		});
	});

	afterEach(() => vi.clearAllMocks());

	it("reads all required inputs from the task lib", () => {
		const inputs = getTaskInputs();
		expect(inputs.pat).toBe("token123");
		expect(inputs.orgUrl).toBe("https://dev.azure.com/acme");
		expect(inputs.project).toBe("MyProject");
		expect(inputs.planId).toBe("42");
		expect(inputs.resultsFile).toBe("junit.xml");
		expect(inputs.environment).toBe("CI");
	});

	it("reads boolean inputs correctly", () => {
		mockGetBoolInput.mockImplementation((name: string) => name === "autoCreate");
		const inputs = getTaskInputs();
		expect(inputs.autoCreate).toBe(true);
		expect(inputs.strict).toBe(false);
	});
});

describe("buildCliArgs", () => {
	const baseInputs: TaskInputs = {
		pat: "token",
		orgUrl: "https://dev.azure.com/acme",
		project: "P",
		planId: "42",
		resultsFile: "junit.xml",
		environment: "CI",
		autoCreate: false,
		strict: false,
		areaPath: "",
	};

	it("builds required CLI arguments", () => {
		const args = buildCliArgs(baseInputs);
		expect(args).toContain("--file");
		expect(args).toContain("junit.xml");
		expect(args).toContain("--plan-id");
		expect(args).toContain("42");
		expect(args).toContain("--env");
		expect(args).toContain("CI");
	});

	it("includes --auto-create when autoCreate is true", () => {
		const args = buildCliArgs({ ...baseInputs, autoCreate: true });
		expect(args).toContain("--auto-create");
	});

	it("does not include --auto-create when autoCreate is false", () => {
		const args = buildCliArgs(baseInputs);
		expect(args).not.toContain("--auto-create");
	});

	it("includes --strict when strict is true", () => {
		const args = buildCliArgs({ ...baseInputs, strict: true });
		expect(args).toContain("--strict");
	});

	it("includes --area-path when areaPath is non-empty", () => {
		const args = buildCliArgs({ ...baseInputs, areaPath: "MyProject\\Team A" });
		expect(args).toContain("--area-path");
		expect(args).toContain("MyProject\\Team A");
	});

	it("does not include --area-path when areaPath is empty", () => {
		const args = buildCliArgs(baseInputs);
		expect(args).not.toContain("--area-path");
	});
});
