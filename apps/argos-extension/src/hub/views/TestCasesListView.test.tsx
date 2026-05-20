import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockServices, createMockTestCaseService } from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestCasesListView } from "./TestCasesListView.js";

afterEach(cleanup);

const TC_A = {
	id: 101,
	title: "Login with valid credentials",
	description: "",
	state: "Active",
	areaPath: "BCEE-QA",
	iterationPath: "BCEE-QA\\Sprint 25",
	tags: ["auth"],
	steps: [],
	priority: 1 as const,
	automationStatus: "Manual" as const,
	preconditionLinks: [],
	createdBy: "Alice",
	createdAt: new Date().toISOString(),
	modifiedBy: "Alice",
	modifiedAt: new Date().toISOString(),
};

const TC_B = {
	...TC_A,
	id: 102,
	title: "Password reset flow",
	state: "Draft",
	tags: [],
	priority: 2 as const,
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCreateNew = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestCasesListView onCreateNew={onCreateNew} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCreateNew };
}

describe("TestCasesListView (Sprint 2.19)", () => {
	it("shows loading state initially", () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading test cases/i)).toBeDefined();
	});

	it("shows error state on rejection", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockRejectedValue(new Error("Network timeout")),
			}),
		});
		await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeDefined());
	});

	it("shows empty state when no test cases", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText(/no test cases yet/i)).toBeDefined());
	});

	it("renders test case rows after load", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([TC_A, TC_B]),
			}),
		});
		await waitFor(() => {
			expect(screen.getByText("Login with valid credentials")).toBeDefined();
			expect(screen.getByText("Password reset flow")).toBeDefined();
		});
	});

	it("shows count in header", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([TC_A, TC_B]),
			}),
		});
		await waitFor(() => expect(screen.getByText("2")).toBeDefined());
	});

	it("filters test cases by search query", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([TC_A, TC_B]),
			}),
		});
		await waitFor(() => screen.getByText("Login with valid credentials"));
		const searchInput = screen.getByPlaceholderText(/search test cases/i);
		await userEvent.type(searchInput, "password");
		expect(screen.queryByText("Login with valid credentials")).toBeNull();
		expect(screen.getByText("Password reset flow")).toBeDefined();
	});

	it("calls onCreateNew when + New Test Case is clicked", async () => {
		const { onCreateNew } = renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => screen.getByText(/new test case/i));
		await userEvent.click(screen.getByText(/\+ new test case/i));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("renders the view with data-testid for routing guards", () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByTestId("view-test-cases")).toBeDefined();
	});

	it("renders WitListHeader with title Test Cases", async () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText("Test Cases")).toBeDefined());
	});

	it("renders search input", () => {
		renderView({
			testCaseService: createMockTestCaseService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByPlaceholderText(/search test cases/i)).toBeDefined();
	});
});
