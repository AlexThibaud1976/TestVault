import type { IProcessInstallService } from "@atconseil/argos-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallWizard } from "./InstallWizard.js";

afterEach(cleanup);

function makeService(overrides?: Partial<IProcessInstallService>): IProcessInstallService {
	return {
		detectInstallState: vi.fn().mockResolvedValue({ status: "not-installed" }),
		install: vi.fn().mockResolvedValue({ processId: "new-guid", processName: "TestVault - Agile" }),
		upgradeSchema: vi.fn().mockResolvedValue({
			processId: "new-guid",
			fieldsAdded: 0,
			statesAdded: 0,
			markerUpdated: true,
		}),
		...overrides,
	};
}

describe("InstallWizard", () => {
	it("shows spinner while detecting install state", () => {
		const service = makeService({
			detectInstallState: vi.fn<IProcessInstallService["detectInstallState"]>(
				() => new Promise(() => {})
			), // never resolves
		});
		render(<InstallWizard service={service} />);
		expect(screen.getByText(/detecting/i)).toBeDefined();
	});

	it("shows configure step when not installed", async () => {
		render(<InstallWizard service={makeService()} />);
		await waitFor(() => expect(screen.getByTestId("process-name-input")).toBeDefined());
		expect(screen.getByTestId("base-process-select")).toBeDefined();
	});

	it("shows already-installed message when installed", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "installed",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				schemaVersion: "1.0.0",
			}),
		});
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByText(/already installed/i)).toBeDefined());
	});

	it("shows partial installation warning when partial", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "partial",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				missingWitRefs: ["TestVault.TestSet", "TestVault.AuditLog"],
			}),
		});
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByText(/partial installation/i)).toBeDefined());
	});

	it("shows permission error message on ProcessPermissionError", async () => {
		const permError = new Error("forbidden");
		permError.name = "ProcessPermissionError";
		const service = makeService({
			detectInstallState: vi.fn().mockRejectedValue(permError),
		});
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByText(/insufficient permissions/i)).toBeDefined());
	});

	it("advances to preview step on 'Next: Preview' click", async () => {
		const user = userEvent.setup();
		render(<InstallWizard service={makeService()} />);
		await waitFor(() => screen.getByTestId("process-name-input"));
		await user.click(screen.getByText(/next: preview/i));
		expect(screen.getByTestId("wit-list")).toBeDefined();
		expect(screen.getByText("Test Case (Argos)")).toBeDefined();
	});

	it("calls service.install with correct options when Install is clicked", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<InstallWizard service={service} />);
		await waitFor(() => screen.getByTestId("process-name-input"));
		await user.click(screen.getByText(/next: preview/i));
		await user.click(screen.getByTestId("install-button"));
		await waitFor(() =>
			expect(vi.mocked(service.install)).toHaveBeenCalledWith(
				expect.objectContaining({ processName: "TestVault - Agile", baseProcess: "Agile" })
			)
		);
	});

	it("shows success message after successful install", async () => {
		const user = userEvent.setup();
		render(<InstallWizard service={makeService()} />);
		await waitFor(() => screen.getByTestId("process-name-input"));
		await user.click(screen.getByText(/next: preview/i));
		await user.click(screen.getByTestId("install-button"));
		await waitFor(() => expect(screen.getByTestId("success-message")).toBeDefined());
	});

	it("calls onInstalled callback with processId after success", async () => {
		const onInstalled = vi.fn();
		const user = userEvent.setup();
		render(<InstallWizard service={makeService()} onInstalled={onInstalled} />);
		await waitFor(() => screen.getByTestId("process-name-input"));
		await user.click(screen.getByText(/next: preview/i));
		await user.click(screen.getByTestId("install-button"));
		await waitFor(() => expect(onInstalled).toHaveBeenCalledWith("new-guid"));
	});
});

// ─── InstallWizard -- needs-upgrade (Runner 0.6.0 B4) ────────────────────────

describe("InstallWizard -- needs-upgrade (Runner 0.6.0)", () => {
	it("shows needs-upgrade screen (not already-installed) when state is needs-upgrade", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "needs-upgrade",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				schemaVersion: "1.0.0",
				expectedVersion: "1.1.0",
			}),
		});
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByTestId("needs-upgrade-screen")).toBeDefined());
		expect(screen.queryByTestId("already-installed-screen")).toBeNull();
	});

	it("shows installed and expected versions on needs-upgrade screen", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "needs-upgrade",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				schemaVersion: "1.0.0",
				expectedVersion: "1.1.0",
			}),
		});
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByTestId("needs-upgrade-screen")).toBeDefined());
		expect(screen.getByTestId("needs-upgrade-screen").textContent).toMatch(/1\.0\.0/);
		expect(screen.getByTestId("needs-upgrade-screen").textContent).toMatch(/1\.1\.0/);
	});

	it("calls upgradeSchema and shows upgrade-done screen on Upgrade Now", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "needs-upgrade",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				schemaVersion: "1.0.0",
				expectedVersion: "1.1.0",
			}),
		});
		const user = userEvent.setup();
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByTestId("needs-upgrade-screen")).toBeDefined());
		await user.click(screen.getByTestId("upgrade-now-button"));
		await waitFor(() =>
			expect(vi.mocked(service.upgradeSchema)).toHaveBeenCalledWith({ processId: "tv-guid" })
		);
		await waitFor(() => expect(screen.getByTestId("upgrade-done-screen")).toBeDefined());
	});

	it("shows already-installed screen when Skip is clicked", async () => {
		const service = makeService({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "needs-upgrade",
				processId: "tv-guid",
				processName: "TestVault - Agile",
				schemaVersion: "1.0.0",
				expectedVersion: "1.1.0",
			}),
		});
		const user = userEvent.setup();
		render(<InstallWizard service={service} />);
		await waitFor(() => expect(screen.getByTestId("needs-upgrade-screen")).toBeDefined());
		await user.click(screen.getByTestId("upgrade-skip-button"));
		await waitFor(() => expect(screen.getByTestId("already-installed-screen")).toBeDefined());
	});
});
