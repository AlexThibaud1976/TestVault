import type { IEnvironmentConfigService } from "@atconseil/argos-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentSettings } from "./EnvironmentSettings.js";

afterEach(cleanup);

function makeService(
	envs: string[] = ["Dev", "QA", "Staging"],
	overrides?: Partial<IEnvironmentConfigService>
): IEnvironmentConfigService {
	return {
		getEnvironments: vi.fn().mockResolvedValue(envs),
		saveEnvironments: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("EnvironmentSettings", () => {
	it("renders the stored environment list on mount", async () => {
		render(<EnvironmentSettings service={makeService()} isAdmin />);
		await waitFor(() => expect(screen.getByTestId("env-item-Dev")).toBeDefined());
		expect(screen.getByTestId("env-item-QA")).toBeDefined();
		expect(screen.getByTestId("env-item-Staging")).toBeDefined();
	});

	it("shows no-permission-message when isAdmin=false", async () => {
		render(<EnvironmentSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => expect(screen.getByTestId("no-permission-message")).toBeDefined());
	});

	it("does NOT show form controls when isAdmin=false", async () => {
		render(<EnvironmentSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => screen.getByTestId("no-permission-message"));
		expect(screen.queryByTestId("new-env-input")).toBeNull();
		expect(screen.queryByTestId("save-env-button")).toBeNull();
	});

	it("adds new environment to the list when Add is clicked", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService(["Dev"])} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.type(screen.getByTestId("new-env-input"), "Production");
		await user.click(screen.getByTestId("add-env-button"));
		expect(screen.getByTestId("env-item-Production")).toBeDefined();
	});

	it("clears the input after a successful Add", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService(["Dev"])} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.type(screen.getByTestId("new-env-input"), "Production");
		await user.click(screen.getByTestId("add-env-button"));
		expect((screen.getByTestId("new-env-input") as HTMLInputElement).value).toBe("");
	});

	it("shows env-name-error when Add is clicked with blank input", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.click(screen.getByTestId("add-env-button"));
		expect(screen.getByTestId("env-name-error")).toBeDefined();
	});

	it("shows env-duplicate-error when adding an already-existing name (case-insensitive)", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService(["Dev", "QA"])} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.type(screen.getByTestId("new-env-input"), "dev");
		await user.click(screen.getByTestId("add-env-button"));
		expect(screen.getByTestId("env-duplicate-error")).toBeDefined();
	});

	it("removes environment from the list when remove button is clicked", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService(["Dev", "QA"])} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-QA"));
		await user.click(screen.getByTestId("remove-env-QA"));
		expect(screen.queryByTestId("env-item-QA")).toBeNull();
		expect(screen.getByTestId("env-item-Dev")).toBeDefined();
	});

	it("calls service.saveEnvironments with the current list on Save", async () => {
		const service = makeService(["Dev", "QA"]);
		const user = userEvent.setup();
		render(<EnvironmentSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.click(screen.getByTestId("save-env-button"));
		await waitFor(() =>
			expect(vi.mocked(service.saveEnvironments)).toHaveBeenCalledWith(["Dev", "QA"])
		);
	});

	it("shows saved-confirmation after successful save", async () => {
		const user = userEvent.setup();
		render(<EnvironmentSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("env-item-Dev"));
		await user.click(screen.getByTestId("save-env-button"));
		await waitFor(() => expect(screen.getByTestId("save-confirmation")).toBeDefined());
	});

	it("disables the Save button while saving", async () => {
		let resolvePromise!: () => void;
		const deferred = new Promise<void>((r) => {
			resolvePromise = r;
		});
		const service = makeService([], {
			saveEnvironments: vi.fn().mockReturnValue(deferred),
		});
		const user = userEvent.setup();
		render(<EnvironmentSettings service={service} isAdmin />);
		await waitFor(() => expect(screen.queryByTestId("save-env-button")).toBeDefined());
		await user.click(screen.getByTestId("save-env-button"));
		expect((screen.getByTestId("save-env-button") as HTMLButtonElement).disabled).toBe(true);
		resolvePromise();
	});

	it("shows an empty-list placeholder when no environments are configured", async () => {
		render(<EnvironmentSettings service={makeService([])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId("env-empty-message")).toBeDefined());
	});
});
