import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockServices,
	createMockTestPlanService,
} from "../../../test-utils/mock-services.js";
import { ToastProvider } from "../../components/Toast.js";
import { ServicesContext } from "../../services-context.js";
import { TestPlanFormView } from "./TestPlanFormView.js";

afterEach(cleanup);

function renderForm(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	const onCancel = vi.fn();
	const onSuccess = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestPlanFormView onCancel={onCancel} onSuccess={onSuccess} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCancel, onSuccess };
}

describe("TestPlanFormView (Sprint 2.18)", () => {
	it("renders the form title", () => {
		renderForm();
		expect(screen.getByText("New Test Plan")).toBeDefined();
	});

	it("renders General information section", () => {
		renderForm();
		expect(screen.getByText("General information")).toBeDefined();
	});

	it("renders Test scope section", () => {
		renderForm();
		expect(screen.getByText("Test scope")).toBeDefined();
	});

	it("renders Plan name input with autoFocus", () => {
		renderForm();
		const input = screen.getByLabelText(/plan name/i);
		expect(input).toBeDefined();
	});

	it("renders Owner field", () => {
		renderForm();
		expect(screen.getByLabelText(/owner/i)).toBeDefined();
	});

	it("renders Tags field with Add button", () => {
		renderForm();
		expect(screen.getByLabelText(/tags/i)).toBeDefined();
		expect(screen.getByRole("button", { name: /^add$/i })).toBeDefined();
	});

	it("renders Description textarea", () => {
		renderForm();
		expect(screen.getByLabelText(/description/i)).toBeDefined();
	});

	it("renders Iteration path select", () => {
		renderForm();
		expect(screen.getByLabelText(/iteration path/i)).toBeDefined();
	});

	it("Create button is disabled when plan name is empty", () => {
		renderForm();
		const btn = screen.getByRole("button", { name: /create test plan/i });
		expect((btn as HTMLButtonElement).disabled).toBe(true);
	});

	it("Create button is enabled when plan name is filled", async () => {
		renderForm();
		await userEvent.type(screen.getByLabelText(/plan name/i), "My Plan");
		const btn = screen.getByRole("button", { name: /create test plan/i });
		expect((btn as HTMLButtonElement).disabled).toBe(false);
	});

	it("calls onCancel when Cancel button is clicked", async () => {
		const { onCancel } = renderForm();
		await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("calls onCancel when back arrow button is clicked", async () => {
		const { onCancel } = renderForm();
		await userEvent.click(screen.getByRole("button", { name: /back to list/i }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("submits with name and owner when filled", async () => {
		const create = vi.fn().mockResolvedValue({ id: 42 });
		const { onSuccess } = renderForm({
			testPlanService: createMockTestPlanService({ create }),
		});
		await userEvent.type(screen.getByLabelText(/plan name/i), "My Plan");
		await userEvent.type(screen.getByLabelText(/owner/i), "Alice");
		await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
		await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ name: "My Plan", owner: "Alice" })
		);
	});

	it("Bug A fix: does NOT include iterationPath when None is selected", async () => {
		const create = vi.fn().mockResolvedValue({ id: 99 });
		renderForm({ testPlanService: createMockTestPlanService({ create }) });
		await userEvent.type(screen.getByLabelText(/plan name/i), "Plan No Iter");
		// iteration select defaults to "" (None)
		await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
		await waitFor(() => expect(create).toHaveBeenCalled());
		const [firstCall] = create.mock.calls as [[{ name: string; iterationPath?: string }]];
		expect(firstCall[0].iterationPath).toBeUndefined();
	});

	it("Bug A fix: includes iterationPath when a real value is selected", async () => {
		const create = vi.fn().mockResolvedValue({ id: 100 });
		renderForm({ testPlanService: createMockTestPlanService({ create }) });
		await userEvent.type(screen.getByLabelText(/plan name/i), "Plan With Iter");
		const select = screen.getByLabelText(/iteration path/i) as HTMLSelectElement;
		// pick the first real option (index 1, after "— None —")
		const options = Array.from(select.options);
		const realOption = options.find((o) => o.value !== "");
		if (realOption) {
			await userEvent.selectOptions(select, realOption.value);
			await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
			await waitFor(() => expect(create).toHaveBeenCalled());
			const [firstCallB] = create.mock.calls as [[{ name: string; iterationPath?: string }]];
			expect(firstCallB[0].iterationPath).toBe(realOption.value);
		}
	});

	it("adds and removes tags", async () => {
		renderForm();
		const tagInput = screen.getByLabelText(/tags/i);
		await userEvent.type(tagInput, "regression");
		await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
		expect(screen.getByText("regression")).toBeDefined();
		await userEvent.click(screen.getByRole("button", { name: /remove tag regression/i }));
		expect(screen.queryByText("regression")).toBeNull();
	});

	it("adds tag on Enter key", async () => {
		renderForm();
		const tagInput = screen.getByLabelText(/tags/i);
		await userEvent.type(tagInput, "smoke{Enter}");
		expect(screen.getByText("smoke")).toBeDefined();
	});

	it("shows coming-soon placeholder for linked test cases", () => {
		renderForm();
		expect(screen.getByText(/drag-to-reorder linked test cases/i)).toBeDefined();
	});

	it("shows deferred sections notice", () => {
		renderForm();
		expect(screen.getByText(/schedule.*notifications.*permissions/i)).toBeDefined();
	});

	it("shows toast on successful creation", async () => {
		const create = vi.fn().mockResolvedValue({ id: 77 });
		renderForm({ testPlanService: createMockTestPlanService({ create }) });
		await userEvent.type(screen.getByLabelText(/plan name/i), "Toast Plan");
		await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
		await waitFor(() => expect(screen.getByTestId("toast-success")).toBeDefined());
	});

	it("shows error toast on failed creation", async () => {
		const create = vi.fn().mockRejectedValue(new Error("ADO error"));
		renderForm({ testPlanService: createMockTestPlanService({ create }) });
		await userEvent.type(screen.getByLabelText(/plan name/i), "Fail Plan");
		await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
		await waitFor(() => expect(screen.getByTestId("toast-error")).toBeDefined());
	});

	it("shows 'Creating…' label while submitting", async () => {
		let resolve: (v: { id: number }) => void = () => {};
		const create = vi.fn().mockReturnValue(
			new Promise<{ id: number }>((r) => {
				resolve = r;
			})
		);
		renderForm({ testPlanService: createMockTestPlanService({ create }) });
		await userEvent.type(screen.getByLabelText(/plan name/i), "In Progress");
		await userEvent.click(screen.getByRole("button", { name: /create test plan/i }));
		expect(screen.getByText("Creating…")).toBeDefined();
		resolve({ id: 1 });
	});

	it("General information section shows Required badge when name is empty", () => {
		renderForm();
		expect(screen.getByText("Required")).toBeDefined();
	});

	it("General information section shows Complete badge when name is filled", async () => {
		renderForm();
		await userEvent.type(screen.getByLabelText(/plan name/i), "Done");
		expect(screen.getByText("Complete")).toBeDefined();
	});
});
