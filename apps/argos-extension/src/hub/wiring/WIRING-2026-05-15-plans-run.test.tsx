import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-plans-run
 * Verifies that PlansView exposes a Run tab that renders the real RunInterface
 * component (with EvidencePanel + CreateBugForm integrated), not a placeholder.
 * Sprint 2.5b: Phase 2 wiring.
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

describe("WIRING-2026-05-15-plans-run", () => {
	it("PlansView renders both Plan Details and Run tabs", async () => {
		renderPlansView();
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Plan Details" })).toBeDefined();
			expect(screen.getByRole("tab", { name: "Run" })).toBeDefined();
		});
	});

	it("clicking Run tab renders RunInterface (not a placeholder)", async () => {
		renderPlansView();
		await waitFor(() => screen.getByRole("tab", { name: "Run" }));
		fireEvent.click(screen.getByRole("tab", { name: "Run" }));
		await waitFor(() => expect(screen.getByTestId("env-selector")).toBeDefined());
	});
});
