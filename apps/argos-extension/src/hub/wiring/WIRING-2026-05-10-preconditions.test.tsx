import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-preconditions
 * Verifies that PreconditionsView renders the real PreconditionForm, not a placeholder.
 * Sprint 4: renders PreconditionsView directly (no sidebar nav -- each hub is a separate ADO contribution).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { PreconditionsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-preconditions", () => {
	it("PreconditionsView renders PreconditionForm (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<PreconditionsView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await waitFor(() => expect(screen.getByTestId("pc-title-input")).toBeDefined());
	});
});
