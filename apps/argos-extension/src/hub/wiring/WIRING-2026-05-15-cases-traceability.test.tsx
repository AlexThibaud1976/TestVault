import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-cases-traceability
 * Verifies that CasesView exposes a Traceability tab that renders the real
 * WorkItemLinkPanel component, not a placeholder.
 * Sprint 2.5c: Phase 3 wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { CasesView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderCasesView() {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<CasesView />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-cases-traceability", () => {
	it("CasesView renders a Traceability tab", async () => {
		renderCasesView();
		await waitFor(() => expect(screen.getByRole("tab", { name: "Traceability" })).toBeDefined());
	});

	it("clicking Traceability tab renders WorkItemLinkPanel (not a placeholder)", async () => {
		renderCasesView();
		await waitFor(() => screen.getByRole("tab", { name: "Traceability" }));
		fireEvent.click(screen.getByRole("tab", { name: "Traceability" }));
		await waitFor(() => expect(screen.getByTestId("link-panel")).toBeDefined());
	});
});
