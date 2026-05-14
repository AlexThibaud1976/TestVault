import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-settings-audit-repo-beta-quota
 * Verifies that SettingsView renders 4 new sections:
 * - AuditLogSettings (audit-log-settings)
 * - RepoMappingSettings (repo-mapping-settings)
 * - BetaOptIn (beta-opt-in)
 * - QuotaSettings (quota-settings)
 * Sprint 2.5d: Phase 5+6 wiring.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { SettingsView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderSettingsView() {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<SettingsView />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-settings-audit-repo-beta-quota", () => {
	it("SettingsView renders AuditLogSettings section", async () => {
		renderSettingsView();
		await waitFor(() => expect(screen.getByTestId("audit-log-settings")).toBeDefined());
	});

	it("SettingsView renders RepoMappingSettings section", async () => {
		renderSettingsView();
		await waitFor(() => expect(screen.getByTestId("repo-mapping-settings")).toBeDefined());
	});

	it("SettingsView renders BetaOptIn section", async () => {
		renderSettingsView();
		await waitFor(() => expect(screen.getByTestId("beta-opt-in")).toBeDefined());
	});

	it("SettingsView renders QuotaSettings section", async () => {
		renderSettingsView();
		await waitFor(() => expect(screen.getByTestId("quota-settings")).toBeDefined());
	});
});
