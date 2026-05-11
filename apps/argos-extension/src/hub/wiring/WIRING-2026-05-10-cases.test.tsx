import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-cases
 * Verifies that CasesView renders the real TestCaseForm, not a placeholder.
 * Sprint 4: renders CasesView directly (no sidebar nav -- each hub is a separate ADO contribution).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { CasesView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-cases", () => {
	it("CasesView renders TestCaseForm (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<CasesView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await waitFor(() => expect(screen.getByTestId("tc-title-input")).toBeDefined());
	});
});
