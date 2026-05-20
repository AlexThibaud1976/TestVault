import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockServices,
	createMockTestCaseVersionService,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestCaseVersionsListView } from "./TestCaseVersionsListView.js";

afterEach(cleanup);

const VER_A = {
	id: 10,
	name: "v1.0",
	comment: "Initial snapshot",
	parentTestCaseId: 42,
	snapshotTitle: "Login flow",
	snapshotDescription: "",
	snapshotSteps: "[]",
	snapshotTags: "[]",
	createdBy: "Alice",
	createdAt: new Date().toISOString(),
	immutable: true as const,
};

const VER_B = {
	...VER_A,
	id: 11,
	name: "v1.1",
	comment: "Post-fix",
	snapshotTitle: "Login flow v2",
	createdBy: "Bob",
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestCaseVersionsListView />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services };
}

describe("TestCaseVersionsListView (Sprint 2.19)", () => {
	it("renders with data-testid view-test-case-versions", () => {
		renderView();
		expect(screen.getByTestId("view-test-case-versions")).toBeDefined();
	});

	it("renders WitListHeader title Test Case Versions", () => {
		renderView();
		expect(screen.getByText("Test Case Versions")).toBeDefined();
	});

	it("renders search input for test case ID", () => {
		renderView();
		expect(screen.getByPlaceholderText(/enter test case id/i)).toBeDefined();
	});

	it("shows empty state prompt before any search", () => {
		renderView();
		expect(screen.getByText(/enter a test case id/i)).toBeDefined();
	});

	it("calls listSnapshots with entered ID when Search clicked", async () => {
		const listSnapshots = vi.fn().mockResolvedValue([VER_A, VER_B]);
		renderView({
			testCaseVersionService: createMockTestCaseVersionService({ listSnapshots }),
		});
		const input = screen.getByPlaceholderText(/enter test case id/i);
		await userEvent.type(input, "42");
		await userEvent.click(screen.getByText("Search"));
		await waitFor(() => expect(listSnapshots).toHaveBeenCalledWith(42));
	});

	it("renders snapshot rows after search", async () => {
		const listSnapshots = vi.fn().mockResolvedValue([VER_A, VER_B]);
		renderView({
			testCaseVersionService: createMockTestCaseVersionService({ listSnapshots }),
		});
		const input = screen.getByPlaceholderText(/enter test case id/i);
		await userEvent.type(input, "42");
		await userEvent.click(screen.getByText("Search"));
		await waitFor(() => {
			expect(screen.getByText("v1.0")).toBeDefined();
			expect(screen.getByText("v1.1")).toBeDefined();
		});
	});

	it("triggers search on Enter key", async () => {
		const listSnapshots = vi.fn().mockResolvedValue([]);
		renderView({
			testCaseVersionService: createMockTestCaseVersionService({ listSnapshots }),
		});
		const input = screen.getByPlaceholderText(/enter test case id/i);
		await userEvent.type(input, "99{Enter}");
		await waitFor(() => expect(listSnapshots).toHaveBeenCalledWith(99));
	});
});
