import type { IPreconditionService, PreconditionDraft } from "@atconseil/testvault-sdk";
import type { TestVaultPrecondition } from "@atconseil/testvault-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreconditionForm } from "./PreconditionForm.js";

afterEach(cleanup);

function makeService(overrides?: Partial<IPreconditionService>): IPreconditionService {
	return {
		create: vi.fn().mockResolvedValue(makePrecond()),
		read: vi.fn().mockResolvedValue(makePrecond()),
		update: vi.fn().mockResolvedValue(makePrecond()),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		linkTestCase: vi.fn().mockResolvedValue(makePrecond()),
		unlinkTestCase: vi.fn().mockResolvedValue(makePrecond()),
		getForTestCase: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

function makePrecond(overrides?: Partial<TestVaultPrecondition>): TestVaultPrecondition {
	return {
		id: 30,
		title: "User must be logged out",
		description: "Ensure no active session exists.",
		tags: ["auth", "session"],
		linkedTestCaseIds: [1, 2],
		...overrides,
	};
}

describe("PreconditionForm", () => {
	it("renders title input and save button", () => {
		render(<PreconditionForm service={makeService()} project="MyProject" />);
		expect(screen.getByTestId("pc-title-input")).toBeDefined();
		expect(screen.getByTestId("save-button")).toBeDefined();
	});

	it("shows 'Title is required' error when Save clicked with empty title", async () => {
		const user = userEvent.setup();
		render(<PreconditionForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("title-error")).toBeDefined();
	});

	it("pre-populates form when initialValue is provided", () => {
		const initial = makePrecond({ title: "Existing Precond" });
		render(<PreconditionForm service={makeService()} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("pc-title-input") as HTMLInputElement;
		expect(input.value).toBe("Existing Precond");
	});

	it("renders pre-populated tags", () => {
		const initial = makePrecond({ tags: ["auth", "session"] });
		render(<PreconditionForm service={makeService()} project="MyProject" initialValue={initial} />);
		expect(screen.getByTestId("tag-auth")).toBeDefined();
		expect(screen.getByTestId("tag-session")).toBeDefined();
	});

	it("can add a tag", async () => {
		const user = userEvent.setup();
		render(<PreconditionForm service={makeService()} project="MyProject" />);
		await user.type(screen.getByTestId("add-tag-input"), "setup");
		await user.click(screen.getByTestId("add-tag-button"));
		expect(screen.getByTestId("tag-setup")).toBeDefined();
	});

	it("can remove a tag", async () => {
		const user = userEvent.setup();
		const initial = makePrecond({ tags: ["auth"] });
		render(<PreconditionForm service={makeService()} project="MyProject" initialValue={initial} />);
		await user.click(screen.getByTestId("remove-tag-auth"));
		expect(screen.queryByTestId("tag-auth")).toBeNull();
	});

	it("can add a linked TC ID", async () => {
		const user = userEvent.setup();
		render(<PreconditionForm service={makeService()} project="MyProject" />);
		await user.type(screen.getByTestId("add-tc-id-input"), "99");
		await user.click(screen.getByTestId("add-tc-id-button"));
		expect(screen.getByTestId("tc-id-99")).toBeDefined();
	});

	it("can remove a linked TC ID", async () => {
		const user = userEvent.setup();
		const initial = makePrecond({ linkedTestCaseIds: [5] });
		render(<PreconditionForm service={makeService()} project="MyProject" initialValue={initial} />);
		await user.click(screen.getByTestId("remove-tc-5"));
		expect(screen.queryByTestId("tc-id-5")).toBeNull();
	});

	it("calls service.create with title and tags on save (create mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<PreconditionForm service={service} project="MyProject" />);
		await user.type(screen.getByTestId("pc-title-input"), "New Precond");
		await user.type(screen.getByTestId("add-tag-input"), "auth");
		await user.click(screen.getByTestId("add-tag-button"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.create)).toHaveBeenCalledWith(
				expect.objectContaining<Partial<PreconditionDraft>>({
					title: "New Precond",
					tags: ["auth"],
				})
			)
		);
	});

	it("calls service.update when initialValue provided (edit mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		const initial = makePrecond({ title: "Old Title" });
		render(<PreconditionForm service={service} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("pc-title-input");
		await user.clear(input);
		await user.type(input, "New Title");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.update)).toHaveBeenCalledWith(
				30,
				expect.objectContaining({ title: "New Title" })
			)
		);
	});

	it("shows delete confirmation and calls service.delete on confirm", async () => {
		const service = makeService();
		const onDeleted = vi.fn();
		const user = userEvent.setup();
		render(
			<PreconditionForm
				service={service}
				project="MyProject"
				initialValue={makePrecond()}
				onDeleted={onDeleted}
			/>
		);
		await user.click(screen.getByTestId("delete-button"));
		await user.click(screen.getByTestId("delete-confirm-button"));
		await waitFor(() => expect(vi.mocked(service.delete)).toHaveBeenCalledWith(30));
		await waitFor(() => expect(onDeleted).toHaveBeenCalled());
	});
});
