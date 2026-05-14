import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-limited-mode-banner
 * Verifies that LimitedModeBanner renders correctly and fires onInstallNow.
 * Sprint 2.5e: First Run Wizard wiring.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LimitedModeBanner } from "../views/LimitedModeBanner.js";

afterEach(cleanup);

describe("WIRING-2026-05-15-limited-mode-banner", () => {
	it("renders the limited-mode-banner testid", () => {
		render(
			<FluentProvider theme={webLightTheme}>
				<LimitedModeBanner onInstallNow={vi.fn()} />
			</FluentProvider>
		);
		expect(screen.getByTestId("limited-mode-banner")).toBeDefined();
	});

	it("calls onInstallNow when Install now button clicked", () => {
		const onInstallNow = vi.fn();
		render(
			<FluentProvider theme={webLightTheme}>
				<LimitedModeBanner onInstallNow={onInstallNow} />
			</FluentProvider>
		);
		fireEvent.click(screen.getByRole("button", { name: /install now/i }));
		expect(onInstallNow).toHaveBeenCalled();
	});
});
