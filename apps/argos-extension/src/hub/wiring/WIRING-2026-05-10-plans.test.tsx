import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-plans
 * Verifies that PlansView renders the real TestPlanForm, not a placeholder.
 * Sprint 4: renders PlansView directly (no sidebar nav -- each hub is a separate ADO contribution).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { PlansView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-plans", () => {
	it("PlansView renders TestPlanForm (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<PlansView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await waitFor(() => expect(screen.getByTestId("tp-name-input")).toBeDefined());
		expect(screen.queryByTestId("plans-empty-state")).toBeNull();
	});
});
