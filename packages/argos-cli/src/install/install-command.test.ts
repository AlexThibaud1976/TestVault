import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@atconseil/argos-sdk", () => ({
	createProcessInstallService: vi.fn(),
	ProcessPermissionError: class extends Error {
		constructor(msg?: string) {
			super(msg);
			this.name = "ProcessPermissionError";
		}
	},
}));

vi.mock("./prompts.js", () => ({
	promptForMissing: vi.fn(),
	promptForConfirm: vi.fn().mockResolvedValue(true),
	promptForSchemaUpdate: vi.fn().mockResolvedValue(true),
}));

vi.mock("./console-progress.js", () => ({
	renderProgressStep: vi.fn(),
}));

import { createProcessInstallService } from "@atconseil/argos-sdk";
import { runInstallCommand } from "./install-command.js";

const mockCreateService = createProcessInstallService as unknown as ReturnType<typeof vi.fn>;

describe("install-command", () => {
	let detectInstallState: ReturnType<typeof vi.fn>;
	let install: ReturnType<typeof vi.fn>;
	// biome-ignore lint/suspicious/noExplicitAny: vitest spy types vary per target
	let exitSpy: any;
	// biome-ignore lint/suspicious/noExplicitAny: vitest spy types vary per target
	let logSpy: any;
	// biome-ignore lint/suspicious/noExplicitAny: vitest spy types vary per target
	let _errorSpy: any;

	beforeEach(() => {
		detectInstallState = vi.fn();
		install = vi.fn();
		mockCreateService.mockReturnValue({ detectInstallState, install });
		exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
		_errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("exits with code 1 if required options missing in no-prompt mode", async () => {
		await runInstallCommand({ prompt: false });
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("skips install if already installed with matching schema", async () => {
		detectInstallState.mockResolvedValue({
			status: "installed",
			processId: "p1",
			processName: "Custom",
			schemaVersion: "1.0.0",
		});
		await runInstallCommand({
			orgUrl: "https://dev.azure.com/x",
			project: "P",
			pat: "fake",
			prompt: false,
		});
		expect(install).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("already installed"));
	});

	it("triggers install if not-installed", async () => {
		detectInstallState.mockResolvedValue({ status: "not-installed" });
		install.mockResolvedValue({ processId: "p2", processName: "Argos Inherited" });
		await runInstallCommand({
			orgUrl: "https://dev.azure.com/x",
			project: "P",
			pat: "fake",
			prompt: false,
			skipConfirm: true,
		});
		expect(install).toHaveBeenCalledWith({
			processName: "Argos Inherited",
			baseProcess: "Agile",
			onProgress: expect.any(Function),
		});
	});

	it("handles partial state with fallback to full install", async () => {
		detectInstallState.mockResolvedValue({
			status: "partial",
			processId: "p3",
			processName: "Existing Custom",
			missingWitRefs: ["TestVault.TestPlan", "TestVault.TestSet"],
		});
		install.mockResolvedValue({ processId: "p3", processName: "Existing Custom" });
		await runInstallCommand({
			orgUrl: "https://dev.azure.com/x",
			project: "P",
			pat: "fake",
			prompt: false,
			skipConfirm: true,
		});
		expect(install).toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("partially installed"));
	});

	it("exits with code 2 on detection error", async () => {
		detectInstallState.mockRejectedValue(new Error("Network error"));
		await runInstallCommand({
			orgUrl: "https://dev.azure.com/x",
			project: "P",
			pat: "fake",
			prompt: false,
		});
		expect(exitSpy).toHaveBeenCalledWith(2);
	});

	it("exits with code 3 on install error", async () => {
		detectInstallState.mockResolvedValue({ status: "not-installed" });
		install.mockRejectedValue(new Error("Permission denied"));
		await runInstallCommand({
			orgUrl: "https://dev.azure.com/x",
			project: "P",
			pat: "fake",
			prompt: false,
			skipConfirm: true,
		});
		expect(exitSpy).toHaveBeenCalledWith(3);
	});
});
