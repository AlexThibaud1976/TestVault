import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-sets
 * Verifies that SetsView renders the real TestSetForm, not a placeholder.
 * Sprint 4: renders SetsView directly (no sidebar nav -- each hub is a separate ADO contribution).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { SetsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-sets", () => {
	it("SetsView renders TestSetForm (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<SetsView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await waitFor(() => expect(screen.getByTestId("ts-name-input")).toBeDefined());
	});
});
