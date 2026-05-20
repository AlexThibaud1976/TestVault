import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-installation-guard
 * Verifies that AppInner routes to GetStartedView when WIT not installed,
 * renders hub normally when installed, and shows LimitedModeBanner on skip.
 * Sprint 2.5f-fix: pivot to schema-reader detection (detectInstalled).
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { AppInner } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderAppInner(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<AppInner initialView={{ kind: "test-plans-list" }} />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-installation-guard", () => {
	it("shows GetStartedView when detectInstalled returns false", async () => {
		renderAppInner({
			detectInstalled: vi.fn().mockResolvedValue(false),
		});
		await waitFor(() => expect(screen.getByTestId("get-started-view")).toBeDefined());
	});

	it("renders hub normally when detectInstalled returns true", async () => {
		renderAppInner({
			detectInstalled: vi.fn().mockResolvedValue(true),
		});
		await waitFor(() => expect(screen.queryByTestId("get-started-view")).toBeNull());
	});

	it("shows LimitedModeBanner after user skips installation", async () => {
		renderAppInner({
			detectInstalled: vi.fn().mockResolvedValue(false),
		});
		await waitFor(() => screen.getByTestId("get-started-view"));
		fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
		await waitFor(() => expect(screen.getByTestId("limited-mode-banner")).toBeDefined());
	});

	it("shows hub with LimitedModeBanner (canCreate=false) when skipped and not installed", async () => {
		renderAppInner({
			detectInstalled: vi.fn().mockResolvedValue(false),
		});
		await waitFor(() => screen.getByTestId("get-started-view"));
		fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
		await waitFor(() => {
			expect(screen.getByTestId("limited-mode-banner")).toBeDefined();
			expect(screen.queryByTestId("get-started-view")).toBeNull();
		});
	});
});
