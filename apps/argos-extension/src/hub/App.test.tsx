import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockServices } from "../test-utils/mock-services.js";
import { App, MainContent } from "./App.js";
import { ServicesContext } from "./services-context.js";

afterEach(cleanup);

vi.mock("azure-devops-extension-sdk", () => ({
	init: vi.fn(),
	ready: vi.fn(() => Promise.resolve()),
}));

vi.mock("azure-devops-extension-api", () => ({
	CommonServiceIds: {
		ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
		ExtensionDataService: "ms.vss-features.extension-data-service",
	},
}));

function renderWithMockServices(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	return render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<MainContent />
			</ServicesContext.Provider>
		</FluentProvider>
	);
}

describe("Argos Hub", () => {
	it("renders the sidebar nav", () => {
		renderWithMockServices();
		expect(screen.getByTestId("nav-plans")).toBeDefined();
		expect(screen.getByTestId("nav-cases")).toBeDefined();
		expect(screen.getByTestId("nav-sets")).toBeDefined();
		expect(screen.getByTestId("nav-preconditions")).toBeDefined();
		expect(screen.getByTestId("nav-reports")).toBeDefined();
	});

	it("shows the Plans view by default", async () => {
		renderWithMockServices();
		await waitFor(() => expect(screen.getByTestId("view-plans")).toBeDefined());
	});

	it("navigates to Cases view on nav click", async () => {
		const user = userEvent.setup();
		renderWithMockServices();
		await user.click(screen.getByTestId("nav-cases"));
		expect(screen.getByTestId("view-cases")).toBeDefined();
		expect(screen.queryByTestId("view-plans")).toBeNull();
	});

	it("navigates to Sets view on nav click", async () => {
		const user = userEvent.setup();
		renderWithMockServices();
		await user.click(screen.getByTestId("nav-sets"));
		expect(screen.getByTestId("view-sets")).toBeDefined();
	});

	it("navigates to Preconditions view on nav click", async () => {
		const user = userEvent.setup();
		renderWithMockServices();
		await user.click(screen.getByTestId("nav-preconditions"));
		expect(screen.getByTestId("view-preconditions")).toBeDefined();
	});

	it("navigates to Reports view on nav click", async () => {
		const user = userEvent.setup();
		renderWithMockServices();
		await user.click(screen.getByTestId("nav-reports"));
		expect(screen.getByTestId("view-reports")).toBeDefined();
	});

	it("navigates back to Plans view when Plans nav is clicked", async () => {
		const user = userEvent.setup();
		renderWithMockServices();
		await user.click(screen.getByTestId("nav-cases"));
		await user.click(screen.getByTestId("nav-plans"));
		expect(screen.getByTestId("view-plans")).toBeDefined();
	});

	it("App renders ServicesProvider loading state", () => {
		render(<App />);
		expect(screen.getByTestId("services-loading")).toBeDefined();
	});
});
