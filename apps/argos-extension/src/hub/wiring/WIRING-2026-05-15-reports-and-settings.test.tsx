import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke tests WIRING-2026-05-15-reports-and-settings
 * Verifies that:
 * - ReportsView exposes a Coverage tab with CoverageMatrix
 * - SettingsView renders WebhookAdmin section
 * Sprint 2.5c: Phase 3+4 wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { ReportsView, SettingsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderWithServices(ui: React.ReactElement) {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>{ui}</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-reports-coverage", () => {
	it("ReportsView has a Coverage tab that renders CoverageMatrix (not a placeholder)", async () => {
		renderWithServices(<ReportsView />);
		await waitFor(() => screen.getByRole("tab", { name: "Coverage" }));
		fireEvent.click(screen.getByRole("tab", { name: "Coverage" }));
		await waitFor(() => expect(screen.getByTestId("coverage-matrix")).toBeDefined());
	});
});

describe("WIRING-2026-05-15-settings-webhooks", () => {
	it("SettingsView renders WebhookAdmin section (not a placeholder)", async () => {
		renderWithServices(<SettingsView />);
		await waitFor(() => expect(screen.getByTestId("webhook-admin")).toBeDefined());
	});
});
