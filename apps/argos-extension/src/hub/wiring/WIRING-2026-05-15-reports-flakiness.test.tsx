import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-reports-flakiness
 * Verifies that ReportsView "Flakiness" tab renders FlakinessReport
 * (not the placeholder). With Cloud-Plus stub returning [], shows flakiness-empty.
 * Sprint 2.5d: Phase 6 wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { ReportsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderReportsView() {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<ReportsView />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-reports-flakiness", () => {
	it("ReportsView has a Flakiness tab", async () => {
		renderReportsView();
		await waitFor(() => expect(screen.getByRole("tab", { name: "Flakiness" })).toBeDefined());
	});

	it("clicking Flakiness tab renders FlakinessReport (not placeholder text)", async () => {
		renderReportsView();
		await waitFor(() => screen.getByRole("tab", { name: "Flakiness" }));
		fireEvent.click(screen.getByRole("tab", { name: "Flakiness" }));
		await waitFor(() => expect(screen.getByTestId("flakiness-empty")).toBeDefined());
	});
});
