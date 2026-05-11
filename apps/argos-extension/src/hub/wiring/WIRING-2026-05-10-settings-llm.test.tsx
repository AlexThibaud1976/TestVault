import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-10-settings-llm
 * Verifies that SettingsView renders the real LlmProviderSettings, not a placeholder.
 * Sprint 4: renders SettingsView directly (no sidebar nav -- each hub is a separate ADO contribution).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { SettingsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-10-settings-llm", () => {
	it("SettingsView renders LlmProviderSettings (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<SettingsView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		// LlmProviderSettings loads and shows empty state (no providers in mock)
		await waitFor(() => expect(screen.getByTestId("llm-provider-empty")).toBeDefined());
	});
});
