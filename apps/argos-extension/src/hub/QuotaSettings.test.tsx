import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuotaSettings } from "./QuotaSettings.js";
import type { IQuotaSettingsService, OrgQuotaConfig } from "./QuotaSettings.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeConfig(overrides?: Partial<OrgQuotaConfig>): OrgQuotaConfig {
	return {
		limitPerUser: 100,
		mode: "hard",
		feature: "tc-generation",
		resetDay: 1,
		...overrides,
	};
}

function makeService(config: OrgQuotaConfig = makeConfig()): IQuotaSettingsService {
	return {
		getConfig: vi.fn().mockResolvedValue(config),
		setConfig: vi.fn().mockResolvedValue(undefined),
	};
}

describe("QuotaSettings", () => {
	it("shows loading state initially", () => {
		render(<QuotaSettings service={makeService()} isAdmin />);
		expect(screen.getByTestId("quota-settings-loading")).toBeDefined();
	});

	it("shows current limit after load", async () => {
		render(<QuotaSettings service={makeService(makeConfig({ limitPerUser: 50 }))} isAdmin />);
		await waitFor(() => screen.getByTestId("quota-settings"));
		const input = screen.getByTestId("quota-limit-input") as HTMLInputElement;
		expect(input.value).toBe("50");
	});

	it("shows no-permission when isAdmin=false", async () => {
		render(<QuotaSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => expect(screen.getByTestId("quota-no-permission")).toBeDefined());
	});

	it("calls service.setConfig when Save is clicked", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<QuotaSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("save-quota-button"));
		await user.click(screen.getByTestId("save-quota-button"));
		await waitFor(() => expect(vi.mocked(service.setConfig)).toHaveBeenCalled());
	});

	it("shows hard mode and soft mode options", async () => {
		render(<QuotaSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("quota-settings"));
		expect(screen.getByTestId("quota-mode-hard")).toBeDefined();
		expect(screen.getByTestId("quota-mode-soft")).toBeDefined();
	});

	it("updates limitPerUser when limit input changes", async () => {
		const user = userEvent.setup();
		const service = makeService();
		render(<QuotaSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("quota-limit-input"));
		const input = screen.getByTestId("quota-limit-input") as HTMLInputElement;
		await user.clear(input);
		await user.type(input, "50");
		await user.click(screen.getByTestId("save-quota-button"));
		await waitFor(() =>
			expect(vi.mocked(service.setConfig)).toHaveBeenCalledWith(
				expect.objectContaining({ limitPerUser: 50 })
			)
		);
	});

	it("updates mode when soft radio is selected", async () => {
		const user = userEvent.setup();
		const service = makeService();
		render(<QuotaSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("quota-mode-soft"));
		await user.click(screen.getByTestId("quota-mode-soft"));
		await user.click(screen.getByTestId("save-quota-button"));
		await waitFor(() =>
			expect(vi.mocked(service.setConfig)).toHaveBeenCalledWith(
				expect.objectContaining({ mode: "soft" })
			)
		);
	});
});
