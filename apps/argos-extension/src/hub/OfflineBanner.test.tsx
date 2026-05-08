import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "./OfflineBanner.js";
import type { IConnectivityService } from "./offline-service.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeConnectivity(online: boolean): IConnectivityService {
	return {
		isOnline: vi.fn().mockReturnValue(online),
		subscribe: vi.fn().mockReturnValue(() => {}),
	};
}

describe("OfflineBanner", () => {
	it("renders nothing when online", () => {
		render(<OfflineBanner connectivity={makeConnectivity(true)} />);
		expect(screen.queryByTestId("offline-banner")).toBeNull();
	});

	it("renders banner when offline", () => {
		render(<OfflineBanner connectivity={makeConnectivity(false)} />);
		expect(screen.getByTestId("offline-banner")).toBeDefined();
	});

	it("banner contains read-only mode text", () => {
		render(<OfflineBanner connectivity={makeConnectivity(false)} />);
		expect(screen.getByTestId("offline-banner").textContent).toContain("Read-only mode");
	});

	it("shows queued count when queuedCount > 0", () => {
		render(<OfflineBanner connectivity={makeConnectivity(false)} queuedCount={3} />);
		expect(screen.getByTestId("queued-count").textContent).toContain("3");
	});

	it("does not show queued count element when queuedCount = 0", () => {
		render(<OfflineBanner connectivity={makeConnectivity(false)} queuedCount={0} />);
		expect(screen.queryByTestId("queued-count")).toBeNull();
	});

	it("subscribes to connectivity service on mount", () => {
		const connectivity = makeConnectivity(false);
		render(<OfflineBanner connectivity={connectivity} />);
		expect(vi.mocked(connectivity.subscribe)).toHaveBeenCalledTimes(1);
	});
});
