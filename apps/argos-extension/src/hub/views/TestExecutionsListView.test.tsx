import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockServices,
	createMockTestExecutionService,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestExecutionsListView } from "./TestExecutionsListView.js";

afterEach(cleanup);

const EXEC_A = {
	id: 1,
	testPlanId: 1,
	testCaseId: 101,
	environment: "qa",
	globalStatus: "Pass" as const,
	stepResults: [],
	evidence: [],
	executedBy: "Alice",
	executedAt: new Date().toISOString(),
	bugLinks: [],
	source: "Manual" as const,
	immutable: true as const,
};

const EXEC_B = {
	...EXEC_A,
	id: 2,
	globalStatus: "Fail" as const,
	environment: "prod",
	executedBy: "Bob",
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCreateNew = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestExecutionsListView onCreateNew={onCreateNew} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCreateNew };
}

describe("TestExecutionsListView (Sprint 2.19)", () => {
	it("shows loading state initially", () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading test executions/i)).toBeDefined();
	});

	it("shows empty state when no executions", async () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
			}),
		});
		await waitFor(() => expect(screen.getByText(/no test executions yet/i)).toBeDefined());
	});

	it("renders execution rows after load", async () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi
					.fn()
					.mockResolvedValue({ items: [EXEC_A, EXEC_B], total: 2, page: 1, pageSize: 50 }),
			}),
		});
		await waitFor(() => {
			expect(screen.getAllByText(/qa|prod/i).length).toBeGreaterThan(0);
		});
	});

	it("calls onCreateNew when + New Run is clicked", async () => {
		const { onCreateNew } = renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
			}),
		});
		await waitFor(() => screen.getByText(/new run/i));
		await userEvent.click(screen.getByText(/\+ new run/i));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("renders with data-testid view-test-executions", () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
			}),
		});
		expect(screen.getByTestId("view-test-executions")).toBeDefined();
	});

	it("renders WitListHeader title Test Executions", async () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
			}),
		});
		await waitFor(() => expect(screen.getByText("Test Executions")).toBeDefined());
	});

	it("renders search input", () => {
		renderView({
			testExecutionService: createMockTestExecutionService({
				listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
			}),
		});
		expect(screen.getByPlaceholderText(/search executions/i)).toBeDefined();
	});
});
