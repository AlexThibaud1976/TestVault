import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-plans
 * Verifies that PlansView renders the real TestPlanForm, not a placeholder.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { MainContent } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-plans", () => {
	it("PlansView renders TestPlanForm (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<MainContent />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		// Plans is the default view — TestPlanForm should be visible immediately
		await waitFor(() => expect(screen.getByTestId("tp-name-input")).toBeDefined());
		expect(screen.queryByTestId("plans-empty-state")).toBeNull();
	});
});
