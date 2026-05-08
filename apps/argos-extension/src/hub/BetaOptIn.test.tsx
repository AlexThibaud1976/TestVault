import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BetaOptIn } from "./BetaOptIn.js";
import type { IBetaFlagService } from "./beta-flag-service.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeService(enrolled = false): IBetaFlagService {
	return {
		isEnrolled: vi.fn().mockResolvedValue(enrolled),
		enroll: vi.fn().mockResolvedValue(undefined),
		unenroll: vi.fn().mockResolvedValue(undefined),
	};
}

describe("BetaOptIn", () => {
	it("shows loading initially", () => {
		render(<BetaOptIn service={makeService()} />);
		expect(screen.getByTestId("beta-loading")).toBeDefined();
	});

	it("shows opt-in UI after load", async () => {
		render(<BetaOptIn service={makeService(false)} />);
		await waitFor(() => expect(screen.getByTestId("beta-opt-in")).toBeDefined());
	});

	it("toggle is unchecked when not enrolled", async () => {
		render(<BetaOptIn service={makeService(false)} />);
		await waitFor(() => screen.getByTestId("beta-toggle"));
		const toggle = screen.getByTestId("beta-toggle") as HTMLInputElement;
		expect(toggle.checked ?? toggle.getAttribute("aria-checked")).toBeFalsy();
	});

	it("shows enrolled badge when enrolled", async () => {
		render(<BetaOptIn service={makeService(true)} />);
		await waitFor(() => expect(screen.getByTestId("beta-enrolled-badge")).toBeDefined());
	});

	it("calls enroll when toggle switched on", async () => {
		const service = makeService(false);
		const user = userEvent.setup();
		render(<BetaOptIn service={service} />);
		await waitFor(() => screen.getByTestId("beta-toggle"));
		await user.click(screen.getByTestId("beta-toggle"));
		await waitFor(() => expect(vi.mocked(service.enroll)).toHaveBeenCalled());
	});

	it("calls unenroll when Opt out is clicked", async () => {
		const service = makeService(true);
		const user = userEvent.setup();
		render(<BetaOptIn service={service} />);
		await waitFor(() => screen.getByTestId("beta-unenroll-button"));
		await user.click(screen.getByTestId("beta-unenroll-button"));
		await waitFor(() => expect(vi.mocked(service.unenroll)).toHaveBeenCalled());
	});

	it("opt-out button is disabled when not enrolled", async () => {
		render(<BetaOptIn service={makeService(false)} />);
		await waitFor(() => screen.getByTestId("beta-unenroll-button"));
		expect(screen.getByTestId("beta-unenroll-button")).toHaveProperty("disabled", true);
	});
});
