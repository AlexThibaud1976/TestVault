import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-settings-environments
 * Verifies that SettingsView renders the real EnvironmentSettings component,
 * not a placeholder.
 * Sprint 2.5b: Phase 2 wiring.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { SettingsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

describe("WIRING-2026-05-15-settings-environments", () => {
	it("SettingsView renders EnvironmentSettings section (not a placeholder)", async () => {
		const services = createMockServices();
		render(
			<FluentProvider theme={webLightTheme}>
				<ServicesContext.Provider value={services}>
					<SettingsView />
				</ServicesContext.Provider>
			</FluentProvider>
		);
		await waitFor(() => expect(screen.getByTestId("env-settings")).toBeDefined());
	});
});
