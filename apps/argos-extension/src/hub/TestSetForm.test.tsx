import type { TestVaultTestSet } from "@atconseil/argos-types";
import type { ITestSetService, TestSetDraft } from "@atconseil/testvault-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestSetForm } from "./TestSetForm.js";

afterEach(cleanup);

function makeService(overrides?: Partial<ITestSetService>): ITestSetService {
	return {
		create: vi.fn().mockResolvedValue(makeTestSet()),
		read: vi.fn().mockResolvedValue(makeTestSet()),
		update: vi.fn().mockResolvedValue(makeTestSet()),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		addTestCases: vi.fn().mockResolvedValue(makeTestSet()),
		removeTestCases: vi.fn().mockResolvedValue(makeTestSet()),
		resolveTestCaseIds: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

function makeTestSet(overrides?: Partial<TestVaultTestSet>): TestVaultTestSet {
	return {
		id: 10,
		name: "Auth Tests",
		description: "",
		areaPath: "MyProject\\Auth",
		tags: [],
		testCaseIds: [1, 2, 3],
		...overrides,
	};
}

describe("TestSetForm", () => {
	it("renders name input and save button", () => {
		render(<TestSetForm service={makeService()} project="MyProject" />);
		expect(screen.getByTestId("ts-name-input")).toBeDefined();
		expect(screen.getByTestId("save-button")).toBeDefined();
	});

	it("shows 'Name is required' error when Save clicked with empty name", async () => {
		const user = userEvent.setup();
		render(<TestSetForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("name-error")).toBeDefined();
	});

	it("pre-populates name when initialValue is provided", () => {
		const initial = makeTestSet({ name: "Existing Set" });
		render(<TestSetForm service={makeService()} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("ts-name-input") as HTMLInputElement;
		expect(input.value).toBe("Existing Set");
	});

	it("defaults to static mode and shows TC ID list", () => {
		render(<TestSetForm service={makeService()} project="MyProject" />);
		expect(screen.getByTestId("static-tc-section")).toBeDefined();
	});

	it("shows dynamic WIQL textarea when dynamic mode is selected", async () => {
		const user = userEvent.setup();
		render(<TestSetForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("mode-dynamic"));
		expect(screen.getByTestId("wiql-textarea")).toBeDefined();
	});

	it("can add a TC ID in static mode", async () => {
		const user = userEvent.setup();
		render(<TestSetForm service={makeService()} project="MyProject" />);
		await user.type(screen.getByTestId("add-tc-id-input"), "42");
		await user.click(screen.getByTestId("add-tc-id-button"));
		expect(screen.getByTestId("tc-id-42")).toBeDefined();
	});

	it("can remove a TC ID in static mode", async () => {
		const user = userEvent.setup();
		const initial = makeTestSet({ testCaseIds: [5, 6] });
		render(<TestSetForm service={makeService()} project="MyProject" initialValue={initial} />);
		expect(screen.getByTestId("tc-id-5")).toBeDefined();
		await user.click(screen.getByTestId("remove-tc-5"));
		expect(screen.queryByTestId("tc-id-5")).toBeNull();
	});

	it("calls service.create with static testCaseIds on Save (create mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<TestSetForm service={service} project="MyProject" />);
		await user.type(screen.getByTestId("ts-name-input"), "New Set");
		await user.type(screen.getByTestId("add-tc-id-input"), "99");
		await user.click(screen.getByTestId("add-tc-id-button"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.create)).toHaveBeenCalledWith(
				expect.objectContaining<Partial<TestSetDraft>>({
					name: "New Set",
					testCaseIds: [99],
				})
			)
		);
	});

	it("calls service.update when initialValue provided (edit mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		const initial = makeTestSet({ name: "Old Name" });
		render(<TestSetForm service={service} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("ts-name-input");
		await user.clear(input);
		await user.type(input, "New Name");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.update)).toHaveBeenCalledWith(
				10,
				expect.objectContaining({ name: "New Name" })
			)
		);
	});

	it("adding a duplicate TC ID does not add it twice", async () => {
		const user = userEvent.setup();
		render(<TestSetForm service={makeService()} project="MyProject" />);
		await user.type(screen.getByTestId("add-tc-id-input"), "42");
		await user.click(screen.getByTestId("add-tc-id-button"));
		await user.type(screen.getByTestId("add-tc-id-input"), "42");
		await user.click(screen.getByTestId("add-tc-id-button"));
		const items = screen.queryAllByTestId("tc-id-42");
		expect(items).toHaveLength(1);
	});

	it("shows delete confirmation and calls service.delete on confirm", async () => {
		const service = makeService();
		const onDeleted = vi.fn();
		const user = userEvent.setup();
		render(
			<TestSetForm
				service={service}
				project="MyProject"
				initialValue={makeTestSet()}
				onDeleted={onDeleted}
			/>
		);
		await user.click(screen.getByTestId("delete-button"));
		await user.click(screen.getByTestId("delete-confirm-button"));
		await waitFor(() => expect(vi.mocked(service.delete)).toHaveBeenCalledWith(10));
		await waitFor(() => expect(onDeleted).toHaveBeenCalled());
	});
});
