import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepoMappingSettings } from "./RepoMappingSettings.js";
import type { IRepoMappingService, RepoMapping } from "./repo-mapping-service.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeMapping(overrides?: Partial<RepoMapping>): RepoMapping {
	return {
		id: "m1",
		repoUrl: "https://dev.azure.com/org/proj/_git/MyRepo",
		branch: "main",
		pathGlob: "**/*.feature",
		areaPath: "MyProject\\Auth",
		...overrides,
	};
}

function makeService(
	mappings: RepoMapping[] = [],
	overrides?: Partial<IRepoMappingService>
): IRepoMappingService {
	return {
		list: vi.fn().mockResolvedValue(mappings),
		add: vi.fn().mockImplementation(async (m) => ({ ...m, id: "new-id" })),
		remove: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("RepoMappingSettings", () => {
	it("shows loading state initially", () => {
		const service = makeService();
		render(<RepoMappingSettings service={service} isAdmin />);
		expect(screen.getByTestId("repo-mapping-loading")).toBeDefined();
	});

	it("renders mapping list after load", async () => {
		const m = makeMapping();
		render(<RepoMappingSettings service={makeService([m])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId(`repo-mapping-${m.id}`)).toBeDefined());
	});

	it("shows repo URL and area path in each mapping row", async () => {
		const m = makeMapping();
		render(<RepoMappingSettings service={makeService([m])} isAdmin />);
		await waitFor(() => screen.getByTestId(`repo-mapping-${m.id}`));
		const row = screen.getByTestId(`repo-mapping-${m.id}`);
		expect(row.textContent).toContain(m.repoUrl);
		expect(row.textContent).toContain(m.areaPath);
	});

	it("shows empty state when no mappings exist", async () => {
		render(<RepoMappingSettings service={makeService([])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId("repo-mapping-empty")).toBeDefined());
	});

	it("shows no-permission-message when isAdmin=false", async () => {
		render(<RepoMappingSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => expect(screen.getByTestId("no-permission-message")).toBeDefined());
	});

	it("does not show form when isAdmin=false", async () => {
		render(<RepoMappingSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => screen.getByTestId("no-permission-message"));
		expect(screen.queryByTestId("add-mapping-button")).toBeNull();
	});

	it("branch input defaults to 'main'", async () => {
		render(<RepoMappingSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("repo-mapping-settings"));
		const input = screen.getByTestId("branch-input") as HTMLInputElement;
		expect(input.value).toBe("main");
	});

	it("pathGlob input defaults to '**/*.feature'", async () => {
		render(<RepoMappingSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("repo-mapping-settings"));
		const input = screen.getByTestId("path-glob-input") as HTMLInputElement;
		expect(input.value).toBe("**/*.feature");
	});

	it("shows repo-url-error when Add is clicked with empty repoUrl", async () => {
		const user = userEvent.setup();
		render(<RepoMappingSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("add-mapping-button"));
		await user.click(screen.getByTestId("add-mapping-button"));
		expect(screen.getByTestId("repo-url-error")).toBeDefined();
	});

	it("shows area-path-error when Add is clicked with empty areaPath", async () => {
		const user = userEvent.setup();
		render(<RepoMappingSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("add-mapping-button"));
		await user.type(
			screen.getByTestId("repo-url-input"),
			"https://dev.azure.com/org/proj/_git/Repo"
		);
		await user.click(screen.getByTestId("add-mapping-button"));
		expect(screen.getByTestId("area-path-error")).toBeDefined();
	});

	it("calls service.add with correct fields on Add click", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<RepoMappingSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("add-mapping-button"));
		await user.type(
			screen.getByTestId("repo-url-input"),
			"https://dev.azure.com/org/proj/_git/Repo"
		);
		await user.type(screen.getByTestId("area-path-input"), "MyProject\\Auth");
		await user.click(screen.getByTestId("add-mapping-button"));
		await waitFor(() =>
			expect(vi.mocked(service.add)).toHaveBeenCalledWith(
				expect.objectContaining({
					repoUrl: "https://dev.azure.com/org/proj/_git/Repo",
					areaPath: "MyProject\\Auth",
					branch: "main",
					pathGlob: "**/*.feature",
				})
			)
		);
	});

	it("newly added mapping appears in list", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<RepoMappingSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("add-mapping-button"));
		await user.type(
			screen.getByTestId("repo-url-input"),
			"https://dev.azure.com/org/proj/_git/Repo"
		);
		await user.type(screen.getByTestId("area-path-input"), "MyProject\\Auth");
		await user.click(screen.getByTestId("add-mapping-button"));
		await waitFor(() => expect(screen.getByTestId("repo-mapping-new-id")).toBeDefined());
	});

	it("calls service.remove when remove button is clicked", async () => {
		const m = makeMapping();
		const service = makeService([m]);
		const user = userEvent.setup();
		render(<RepoMappingSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`remove-mapping-${m.id}`));
		await user.click(screen.getByTestId(`remove-mapping-${m.id}`));
		await waitFor(() => expect(vi.mocked(service.remove)).toHaveBeenCalledWith(m.id));
	});

	it("removed mapping disappears from the list", async () => {
		const m = makeMapping();
		const service = makeService([m]);
		const user = userEvent.setup();
		render(<RepoMappingSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`remove-mapping-${m.id}`));
		await user.click(screen.getByTestId(`remove-mapping-${m.id}`));
		await waitFor(() => expect(screen.queryByTestId(`repo-mapping-${m.id}`)).toBeNull());
	});
});
