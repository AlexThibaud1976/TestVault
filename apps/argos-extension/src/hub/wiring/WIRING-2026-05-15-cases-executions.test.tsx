import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-cases-executions
 * Verifies that CasesView exposes an Executions tab that renders the real
 * ExecutionHistory component, not a placeholder.
 * Sprint 2.5b: Phase 2 wiring.
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

describe("WIRING-2026-05-15-cases-executions", () => {
	it("CasesView renders both Case Details and Executions tabs", async () => {
		renderCasesView();
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: "Case Details" })).toBeDefined();
			expect(screen.getByRole("tab", { name: "Executions" })).toBeDefined();
		});
	});

	it("clicking Executions tab renders ExecutionHistory (not a placeholder)", async () => {
		renderCasesView();
		await waitFor(() => screen.getByRole("tab", { name: "Executions" }));
		fireEvent.click(screen.getByRole("tab", { name: "Executions" }));
		await waitFor(() => expect(screen.getByTestId("execution-history")).toBeDefined());
	});
});
