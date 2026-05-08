import type { ITestCaseService, TestCaseDraft } from "@atconseil/testvault-sdk";
import type { TestVaultTestCase } from "@atconseil/testvault-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestCaseForm } from "./TestCaseForm.js";

afterEach(cleanup);

const NOW = "2026-05-08T15:00:00.000Z";

function makeService(overrides?: Partial<ITestCaseService>): ITestCaseService {
	return {
		create: vi.fn().mockResolvedValue(makeTestCase()),
		read: vi.fn().mockResolvedValue(makeTestCase()),
		update: vi.fn().mockResolvedValue(makeTestCase()),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

function makeTestCase(overrides?: Partial<TestVaultTestCase>): TestVaultTestCase {
	return {
		id: 42,
		title: "Login flow",
		description: "",
		state: "Design",
		areaPath: "MyProject\\Auth",
		iterationPath: "MyProject\\Sprint 1",
		tags: [],
		steps: [],
		priority: 3,
		automationStatus: "Manual",
		preconditionLinks: [],
		createdBy: "alice@example.com",
		createdAt: NOW,
		modifiedBy: "alice@example.com",
		modifiedAt: NOW,
		...overrides,
	};
}

describe("TestCaseForm", () => {
	it("renders title input and steps add button", () => {
		render(<TestCaseForm service={makeService()} project="MyProject" />);
		expect(screen.getByTestId("tc-title-input")).toBeDefined();
		expect(screen.getByTestId("add-step-button")).toBeDefined();
	});

	it("pre-populates fields when initialValue is provided", async () => {
		const initial = makeTestCase({ title: "Existing TC", steps: [] });
		render(<TestCaseForm service={makeService()} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("tc-title-input") as HTMLInputElement;
		expect(input.value).toBe("Existing TC");
	});

	it("shows 'Title is required' error when Save clicked with empty title", async () => {
		const user = userEvent.setup();
		render(<TestCaseForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("title-error")).toBeDefined();
	});

	it("can add a step and shows the step action input", async () => {
		const user = userEvent.setup();
		render(<TestCaseForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("add-step-button"));
		expect(screen.getByTestId("step-action-0")).toBeDefined();
		expect(screen.getByTestId("step-expected-0")).toBeDefined();
	});

	it("can remove a step", async () => {
		const user = userEvent.setup();
		render(<TestCaseForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("add-step-button"));
		await user.click(screen.getByTestId("add-step-button"));
		expect(screen.queryAllByTestId(/^step-action-/)).toHaveLength(2);
		await user.click(screen.getByTestId("remove-step-0"));
		expect(screen.queryAllByTestId(/^step-action-/)).toHaveLength(1);
	});

	it("can move a step down", async () => {
		const user = userEvent.setup();
		render(<TestCaseForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("add-step-button"));
		await user.click(screen.getByTestId("add-step-button"));
		const firstAction = screen.getByTestId("step-action-0") as HTMLTextAreaElement;
		await user.type(firstAction, "Step A");
		const secondAction = screen.getByTestId("step-action-1") as HTMLTextAreaElement;
		await user.type(secondAction, "Step B");
		await user.click(screen.getByTestId("step-down-0"));
		expect((screen.getByTestId("step-action-0") as HTMLTextAreaElement).value).toBe("Step B");
		expect((screen.getByTestId("step-action-1") as HTMLTextAreaElement).value).toBe("Step A");
	});

	it("calls service.create with correct payload on Save (create mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<TestCaseForm service={service} project="MyProject" />);
		await user.type(screen.getByTestId("tc-title-input"), "New TC");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.create)).toHaveBeenCalledWith(
				expect.objectContaining<Partial<TestCaseDraft>>({ title: "New TC" })
			)
		);
	});

	it("calls service.update when initialValue is provided (edit mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		const initial = makeTestCase({ title: "Old Title" });
		render(<TestCaseForm service={service} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("tc-title-input");
		await user.clear(input);
		await user.type(input, "New Title");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.update)).toHaveBeenCalledWith(
				42,
				expect.objectContaining({ title: "New Title" })
			)
		);
	});

	it("shows delete confirmation section when Delete button clicked", async () => {
		const user = userEvent.setup();
		const initial = makeTestCase();
		render(<TestCaseForm service={makeService()} project="MyProject" initialValue={initial} />);
		await user.click(screen.getByTestId("delete-button"));
		expect(screen.getByTestId("delete-confirm-button")).toBeDefined();
		expect(screen.getByTestId("delete-cancel-button")).toBeDefined();
	});

	it("calls service.delete and onDeleted when confirm delete clicked", async () => {
		const service = makeService();
		const onDeleted = vi.fn();
		const user = userEvent.setup();
		const initial = makeTestCase();
		render(
			<TestCaseForm
				service={service}
				project="MyProject"
				initialValue={initial}
				onDeleted={onDeleted}
			/>
		);
		await user.click(screen.getByTestId("delete-button"));
		await user.click(screen.getByTestId("delete-confirm-button"));
		await waitFor(() => expect(vi.mocked(service.delete)).toHaveBeenCalledWith(42));
		await waitFor(() => expect(onDeleted).toHaveBeenCalled());
	});

	it("calls onSaved with result after successful save", async () => {
		const onSaved = vi.fn();
		const user = userEvent.setup();
		render(<TestCaseForm service={makeService()} project="MyProject" onSaved={onSaved} />);
		await user.type(screen.getByTestId("tc-title-input"), "TC");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 42 })));
	});
});
