import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-get-started-wizard
 * Verifies that GetStartedView renders Welcome step initially,
 * navigates to Detection/wizard step, and calls onSkip.
 * Sprint 2.5e: First Run Wizard wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockProcessInstallService } from "../../test-utils/mock-services.js";
import { GetStartedView } from "../views/GetStartedView.js";

afterEach(cleanup);

function renderGetStarted(onSkip = vi.fn(), onComplete = vi.fn()) {
	const service = createMockProcessInstallService({
		detectInstallState: async () => ({ status: "not-installed" }),
	});
	render(
		<FluentProvider theme={webLightTheme}>
			<GetStartedView
				initialState={{ status: "not-installed" }}
				service={service}
				onComplete={onComplete}
				onSkip={onSkip}
			/>
		</FluentProvider>
	);
	return { service, onSkip, onComplete };
}

describe("WIRING-2026-05-15-get-started-wizard", () => {
	it("renders Welcome step initially", () => {
		renderGetStarted();
		expect(screen.getByTestId("wizard-step-welcome")).toBeDefined();
	});

	it("navigates to Detection step on Get Started click", async () => {
		renderGetStarted();
		fireEvent.click(screen.getByRole("button", { name: /get started/i }));
		await waitFor(() => expect(screen.getByTestId("wizard-step-detection")).toBeDefined());
	});

	it("calls onSkip when Skip for now clicked", () => {
		const onSkip = vi.fn();
		renderGetStarted(onSkip);
		fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
		expect(onSkip).toHaveBeenCalled();
	});

	it("renders get-started-view wrapper testid", () => {
		renderGetStarted();
		expect(screen.getByTestId("get-started-view")).toBeDefined();
	});
});
