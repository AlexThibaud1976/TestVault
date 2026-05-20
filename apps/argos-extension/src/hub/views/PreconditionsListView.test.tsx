import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockPreconditionService,
	createMockServices,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { PreconditionsListView } from "./PreconditionsListView.js";

afterEach(cleanup);

const PC_A = {
	id: 1,
	title: "User logged in as admin",
	description: "Ensures admin session is active",
	tags: ["auth"],
	linkedTestCaseIds: [101, 102],
};

const PC_B = {
	id: 2,
	title: "Database initialized with sample data",
	description: "",
	tags: ["db"],
	linkedTestCaseIds: [],
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCreateNew = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<PreconditionsListView onCreateNew={onCreateNew} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCreateNew };
}

describe("PreconditionsListView (Sprint 2.19)", () => {
	it("shows loading state initially", () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading preconditions/i)).toBeDefined();
	});

	it("shows empty state when no preconditions", async () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText(/no preconditions yet/i)).toBeDefined());
	});

	it("renders precondition rows after load", async () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([PC_A, PC_B]),
			}),
		});
		await waitFor(() => {
			expect(screen.getByText("User logged in as admin")).toBeDefined();
			expect(screen.getByText("Database initialized with sample data")).toBeDefined();
		});
	});

	it("filters preconditions by search query", async () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([PC_A, PC_B]),
			}),
		});
		await waitFor(() => screen.getByText("User logged in as admin"));
		const searchInput = screen.getByPlaceholderText(/search preconditions/i);
		await userEvent.type(searchInput, "database");
		expect(screen.queryByText("User logged in as admin")).toBeNull();
		expect(screen.getByText("Database initialized with sample data")).toBeDefined();
	});

	it("calls onCreateNew when + New Precondition is clicked", async () => {
		const { onCreateNew } = renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => screen.getByText(/new precondition/i));
		await userEvent.click(screen.getByText(/\+ new precondition/i));
		expect(onCreateNew).toHaveBeenCalledOnce();
	});

	it("renders with data-testid view-preconditions", () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByTestId("view-preconditions")).toBeDefined();
	});

	it("renders WitListHeader title Preconditions", async () => {
		renderView({
			preconditionService: createMockPreconditionService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText("Preconditions")).toBeDefined());
	});
});
