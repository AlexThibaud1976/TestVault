import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-app-offline
 * Verifies that OfflineBanner is wired into the hub via connectivityService.
 * Sprint 2.5d: Phase 7 wiring.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	createMockConnectivityService,
	createMockServices,
} from "../../test-utils/mock-services.js";
import { OfflineBanner } from "../OfflineBanner.js";
import { ServicesContext } from "../services-context.js";
import { useServices } from "../services-context.js";

afterEach(cleanup);

function OfflineBannerHarness() {
	const { connectivityService } = useServices();
	return <OfflineBanner connectivity={connectivityService} />;
}

function renderOfflineHub(online: boolean) {
	const services = createMockServices({
		connectivityService: createMockConnectivityService(online),
	});
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<OfflineBannerHarness />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-app-offline", () => {
	it("offline-banner appears when connectivityService is offline", async () => {
		renderOfflineHub(false);
		await waitFor(() => expect(screen.getByTestId("offline-banner")).toBeDefined());
	});

	it("offline-banner is absent when connectivityService is online", async () => {
		renderOfflineHub(true);
		await waitFor(() => expect(screen.queryByTestId("offline-banner")).toBeNull());
	});
});
