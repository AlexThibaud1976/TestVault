import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-installation-guard
 * Verifies that AppInner routes to GetStartedView when WIT not installed,
 * renders hub normally when installed, and shows LimitedModeBanner on skip.
 * Sprint 2.5e: First Run Wizard wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	createMockProcessInstallService,
	createMockServices,
} from "../../test-utils/mock-services.js";
import { AppInner } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderAppInner(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<AppInner section="plans" />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-installation-guard", () => {
	it("shows GetStartedView when status=not-installed", async () => {
		renderAppInner({
			processInstallService: createMockProcessInstallService({
				detectInstallState: async () => ({ status: "not-installed" }),
			}),
		});
		await waitFor(() => expect(screen.getByTestId("get-started-view")).toBeDefined());
	});

	it("shows GetStartedView when status=partial", async () => {
		renderAppInner({
			processInstallService: createMockProcessInstallService({
				detectInstallState: async () => ({
					status: "partial",
					processId: "p1",
					processName: "Custom",
					missingWitRefs: ["TestVault.TestExecution"],
				}),
			}),
		});
		await waitFor(() => expect(screen.getByTestId("get-started-view")).toBeDefined());
	});

	it("renders hub normally when status=installed", async () => {
		renderAppInner({
			processInstallService: createMockProcessInstallService({
				detectInstallState: async () => ({
					status: "installed",
					processId: "p1",
					processName: "Custom",
					schemaVersion: "1.0.0",
				}),
			}),
		});
		await waitFor(() => expect(screen.queryByTestId("get-started-view")).toBeNull());
	});

	it("shows LimitedModeBanner after user skips", async () => {
		renderAppInner({
			processInstallService: createMockProcessInstallService({
				detectInstallState: async () => ({ status: "not-installed" }),
			}),
		});
		await waitFor(() => screen.getByTestId("get-started-view"));
		fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
		await waitFor(() => expect(screen.getByTestId("limited-mode-banner")).toBeDefined());
	});
});
