import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke tests WIRING-2026-05-15-plans-snapshots-import
 * Verifies that PlansView exposes:
 * - A Snapshots tab with SnapshotPanel + snapshot-diff-panel container
 * - An Import button that opens ImportWizard
 * Sprint 2.5c: Phase 3+4 wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { PlansView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderPlansView() {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<PlansView />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-plans-snapshots-import", () => {
	it("PlansView renders a Snapshots tab with SnapshotPanel", async () => {
		renderPlansView();
		await waitFor(() => screen.getByRole("tab", { name: "Snapshots" }));
		fireEvent.click(screen.getByRole("tab", { name: "Snapshots" }));
		await waitFor(() => expect(screen.getByTestId("snapshot-panel")).toBeDefined());
	});

	it("Snapshots tab always renders snapshot-diff-panel container", async () => {
		renderPlansView();
		await waitFor(() => screen.getByRole("tab", { name: "Snapshots" }));
		fireEvent.click(screen.getByRole("tab", { name: "Snapshots" }));
		await waitFor(() => expect(screen.getByTestId("snapshot-diff-panel")).toBeDefined());
	});

	it("Import button opens ImportWizard dialog", async () => {
		renderPlansView();
		await waitFor(() => screen.getByRole("button", { name: "Import" }));
		fireEvent.click(screen.getByRole("button", { name: "Import" }));
		await waitFor(() => expect(screen.getByTestId("import-wizard-dialog")).toBeDefined());
	});
});
