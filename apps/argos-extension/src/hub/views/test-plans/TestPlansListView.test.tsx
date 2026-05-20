import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockServices,
	createMockTestPlanService,
} from "../../../test-utils/mock-services.js";
import { ToastProvider } from "../../components/Toast.js";
import { ServicesContext } from "../../services-context.js";
import { TestPlansListView } from "./TestPlansListView.js";

afterEach(cleanup);

const PLAN_A = {
	id: 1001,
	name: "Sprint 25 Regression",
	state: "Draft",
	owner: "Alice",
	iterationPath: "BCEE-QA\\Sprint 25",
	description: "",
	environments: [],
	testSetIds: [10, 20],
	additionalTestCaseIds: [30],
	createdBy: "Alice",
	createdAt: new Date().toISOString(),
};

const PLAN_B = {
	id: 1002,
	name: "Smoke Suite",
	state: "Locked",
	owner: "Bob",
	iterationPath: "",
	description: "",
	environments: [],
	testSetIds: [],
	additionalTestCaseIds: [],
	createdBy: "Bob",
	createdAt: new Date().toISOString(),
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCreateNew = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestPlansListView onCreateNew={onCreateNew} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCreateNew };
}

describe("TestPlansListView (Sprint 2.18)", () => {
	it("shows loading state initially", () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading test plans/i)).toBeDefined();
	});

	it("shows error state on rejection", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockRejectedValue(new Error("Network timeout")),
			}),
		});
		await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeDefined());
	});

	it("shows empty state when no plans", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText(/no test plans yet/i)).toBeDefined());
	});

	it("renders plan rows after load", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([PLAN_A, PLAN_B]),
			}),
		});
		await waitFor(() => {
			expect(screen.getByText("Sprint 25 Regression")).toBeDefined();
			expect(screen.getByText("Smoke Suite")).toBeDefined();
		});
	});

	it("shows plan count in header", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([PLAN_A, PLAN_B]),
			}),
		});
		await waitFor(() => expect(screen.getByText("2 plans")).toBeDefined());
	});

	it("shows singular 'plan' for one item", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([PLAN_A]),
			}),
		});
		await waitFor(() => expect(screen.getByText("1 plan")).toBeDefined());
	});

	it("filters plans by search query", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([PLAN_A, PLAN_B]),
			}),
		});
		await waitFor(() => screen.getByText("Sprint 25 Regression"));
		const searchInput = screen.getByPlaceholderText(/search test plans/i);
		await userEvent.type(searchInput, "smoke");
		expect(screen.queryByText("Sprint 25 Regression")).toBeNull();
		expect(screen.getByText("Smoke Suite")).toBeDefined();
	});

	it("calls onCreateNew when New Test Plan button is clicked", async () => {
		const { onCreateNew } = renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => screen.getByText(/new test plan/i));
		await userEvent.click(screen.getByText(/\+ new test plan/i));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("calls onCreateNew from empty state Create button", async () => {
		const { onCreateNew } = renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => screen.getByText(/create test plan/i));
		await userEvent.click(screen.getByText("Create Test Plan"));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("renders the view with data-testid for routing guards", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByTestId("view-plans")).toBeDefined();
	});

	it("shows owner column with Unassigned fallback", async () => {
		const planNoOwner = { ...PLAN_A, owner: "" };
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([planNoOwner]),
			}),
		});
		await waitFor(() => expect(screen.getByText("Unassigned")).toBeDefined());
	});

	it("shows — for empty iterationPath", async () => {
		renderView({
			testPlanService: createMockTestPlanService({
				list: vi.fn().mockResolvedValue([PLAN_B]),
			}),
		});
		await waitFor(() => expect(screen.getByText("—")).toBeDefined());
	});
});
