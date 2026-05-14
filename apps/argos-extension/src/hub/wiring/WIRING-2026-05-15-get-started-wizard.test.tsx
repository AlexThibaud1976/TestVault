import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-get-started-wizard
 * Verifies GetStartedView: Welcome -> Detection -> InstallGuide flow.
 * Sprint 2.5f-fix: adapted to 3-step wizard (Welcome/Detection/InstallGuide).
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GetStartedView } from "../views/GetStartedView.js";

afterEach(cleanup);

function renderGetStarted({
	isInstalled = false,
	onSkip = vi.fn(),
	onRefreshDetection = vi.fn().mockResolvedValue(undefined),
} = {}) {
	render(
		<FluentProvider theme={webLightTheme}>
			<GetStartedView
				isInstalled={isInstalled}
				orgUrl="https://dev.azure.com/MockOrg"
				projectName="MockProject"
				onRefreshDetection={onRefreshDetection}
				onSkip={onSkip}
			/>
		</FluentProvider>
	);
	return { onSkip, onRefreshDetection };
}

describe("WIRING-2026-05-15-get-started-wizard", () => {
	it("renders Welcome step initially", () => {
		renderGetStarted();
		expect(screen.getByTestId("wizard-step-welcome")).toBeDefined();
	});

	it("renders get-started-view wrapper testid", () => {
		renderGetStarted();
		expect(screen.getByTestId("get-started-view")).toBeDefined();
	});

	it("navigates to Detection step on Get Started click", async () => {
		renderGetStarted();
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => expect(screen.getByTestId("wizard-step-detection")).toBeDefined());
	});

	it("calls onSkip when Skip for now clicked on Welcome step", () => {
		const onSkip = vi.fn();
		renderGetStarted({ onSkip });
		fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
		expect(onSkip).toHaveBeenCalled();
	});

	it("Detection step shows warning when isInstalled=false", async () => {
		renderGetStarted({ isInstalled: false });
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => {
			expect(screen.getByTestId("wizard-step-detection")).toBeDefined();
			expect(screen.getByRole("button", { name: /show install instructions/i })).toBeDefined();
		});
	});

	it("Detection step shows success when isInstalled=true", async () => {
		renderGetStarted({ isInstalled: true });
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => {
			expect(screen.getByTestId("wizard-step-detection")).toBeDefined();
			expect(screen.getByRole("button", { name: /go to dashboard/i })).toBeDefined();
		});
	});

	it("navigates to InstallGuide step from Detection", async () => {
		renderGetStarted({ isInstalled: false });
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => screen.getByTestId("wizard-step-detection"));
		fireEvent.click(screen.getByRole("button", { name: /show install instructions/i }));
		await waitFor(() => expect(screen.getByTestId("wizard-step-install-guide")).toBeDefined());
	});

	it("InstallGuide shows CLI command with orgUrl and projectName", async () => {
		renderGetStarted({ isInstalled: false });
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => screen.getByTestId("wizard-step-detection"));
		fireEvent.click(screen.getByRole("button", { name: /show install instructions/i }));
		await waitFor(() => {
			const cmd = screen.getByTestId("cli-command");
			expect(cmd.textContent).toContain("@atconseil/argos-cli install");
			expect(cmd.textContent).toContain("MockOrg");
			expect(cmd.textContent).toContain("MockProject");
		});
	});

	it("calls onRefreshDetection when refresh button clicked", async () => {
		const onRefreshDetection = vi.fn().mockResolvedValue(undefined);
		renderGetStarted({ isInstalled: false, onRefreshDetection });
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => screen.getByTestId("wizard-step-detection"));
		fireEvent.click(screen.getByRole("button", { name: /show install instructions/i }));
		await waitFor(() => screen.getByTestId("wizard-step-install-guide"));
		fireEvent.click(screen.getByRole("button", { name: /refresh detection/i }));
		await waitFor(() => expect(onRefreshDetection).toHaveBeenCalled());
	});
});
