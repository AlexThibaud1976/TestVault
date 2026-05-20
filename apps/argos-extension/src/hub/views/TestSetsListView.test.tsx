import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockServices, createMockTestSetService } from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestSetsListView } from "./TestSetsListView.js";

afterEach(cleanup);

const SET_A = {
	id: 1,
	name: "Auth smoke suite",
	description: "",
	areaPath: "BCEE-QA",
	tags: ["auth"],
	testCaseIds: [101, 102],
};

const SET_B = {
	id: 2,
	name: "Regression suite",
	description: "",
	areaPath: "BCEE-QA",
	tags: [],
	testCaseIds: [],
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCreateNew = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestSetsListView onCreateNew={onCreateNew} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCreateNew };
}

describe("TestSetsListView (Sprint 2.19)", () => {
	it("shows loading state initially", () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading test sets/i)).toBeDefined();
	});

	it("shows empty state when no test sets", async () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText(/no test sets yet/i)).toBeDefined());
	});

	it("renders test set rows after load", async () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([SET_A, SET_B]),
			}),
		});
		await waitFor(() => {
			expect(screen.getByText("Auth smoke suite")).toBeDefined();
			expect(screen.getByText("Regression suite")).toBeDefined();
		});
	});

	it("filters test sets by search query", async () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([SET_A, SET_B]),
			}),
		});
		await waitFor(() => screen.getByText("Auth smoke suite"));
		const searchInput = screen.getByPlaceholderText(/search test sets/i);
		await userEvent.type(searchInput, "regression");
		expect(screen.queryByText("Auth smoke suite")).toBeNull();
		expect(screen.getByText("Regression suite")).toBeDefined();
	});

	it("calls onCreateNew when + New Test Set is clicked", async () => {
		const { onCreateNew } = renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => screen.getByText(/new test set/i));
		await userEvent.click(screen.getByText(/\+ new test set/i));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("renders with data-testid view-test-sets", () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByTestId("view-test-sets")).toBeDefined();
	});

	it("renders WitListHeader title Test Sets", async () => {
		renderView({
			testSetService: createMockTestSetService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText("Test Sets")).toBeDefined());
	});
});
