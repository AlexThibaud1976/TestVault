import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-cases
 * Verifies that CasesView renders the real TestCaseForm, not a placeholder.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { MainContent } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-cases", () => {
	it("CasesView renders TestCaseForm (not a placeholder)", async () => {
		const user = userEvent.setup();
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<MainContent />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await user.click(screen.getByTestId("nav-cases"));
		await waitFor(() => expect(screen.getByTestId("tc-title-input")).toBeDefined());
	});
});
