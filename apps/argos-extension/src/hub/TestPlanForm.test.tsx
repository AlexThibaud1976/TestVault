import type { TestVaultTestPlan } from "@atconseil/argos-types";
import type { ITestPlanService, TestPlanDraft } from "@atconseil/testvault-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestPlanForm } from "./TestPlanForm.js";

afterEach(cleanup);

function makeService(overrides?: Partial<ITestPlanService>): ITestPlanService {
	return {
		create: vi.fn().mockResolvedValue(makePlan()),
		read: vi.fn().mockResolvedValue(makePlan()),
		update: vi.fn().mockResolvedValue(makePlan()),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		lock: vi.fn().mockResolvedValue(makePlan({ state: "Locked" })),
		unlock: vi.fn().mockResolvedValue(makePlan()),
		lockWithAutoSnapshot: vi.fn().mockResolvedValue(makePlan({ state: "Locked" })),
		...overrides,
	};
}

function makePlan(overrides?: Partial<TestVaultTestPlan>): TestVaultTestPlan {
	return {
		id: 20,
		name: "Sprint 42 Plan",
		description: "",
		state: "Draft",
		iterationPath: "MyProject\\Sprint 42",
		owner: "alice@example.com",
		environments: ["QA", "Staging"],
		testSetIds: [10, 11],
		additionalTestCaseIds: [5],
		createdBy: "alice@example.com",
		createdAt: "2026-05-08T15:00:00.000Z",
		...overrides,
	};
}

describe("TestPlanForm", () => {
	it("renders name input and save button", () => {
		render(<TestPlanForm service={makeService()} project="MyProject" />);
		expect(screen.getByTestId("tp-name-input")).toBeDefined();
		expect(screen.getByTestId("save-button")).toBeDefined();
	});

	it("shows 'Name is required' error when Save clicked with empty name", async () => {
		const user = userEvent.setup();
		render(<TestPlanForm service={makeService()} project="MyProject" />);
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("name-error")).toBeDefined();
	});

	it("pre-populates form when initialValue is provided", () => {
		const initial = makePlan({ name: "Existing Plan" });
		render(<TestPlanForm service={makeService()} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("tp-name-input") as HTMLInputElement;
		expect(input.value).toBe("Existing Plan");
	});

	it("renders pre-populated environments", () => {
		const initial = makePlan({ environments: ["QA", "Staging"] });
		render(<TestPlanForm service={makeService()} project="MyProject" initialValue={initial} />);
		expect(screen.getByTestId("env-QA")).toBeDefined();
		expect(screen.getByTestId("env-Staging")).toBeDefined();
	});

	it("can add an environment", async () => {
		const user = userEvent.setup();
		render(<TestPlanForm service={makeService()} project="MyProject" />);
		await user.type(screen.getByTestId("add-env-input"), "Prod");
		await user.click(screen.getByTestId("add-env-button"));
		expect(screen.getByTestId("env-Prod")).toBeDefined();
	});

	it("can remove an environment", async () => {
		const user = userEvent.setup();
		const initial = makePlan({ environments: ["QA"] });
		render(<TestPlanForm service={makeService()} project="MyProject" initialValue={initial} />);
		await user.click(screen.getByTestId("remove-env-QA"));
		expect(screen.queryByTestId("env-QA")).toBeNull();
	});

	it("calls service.create with environments and testSetIds on save (create mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<TestPlanForm service={service} project="MyProject" />);
		await user.type(screen.getByTestId("tp-name-input"), "New Plan");
		await user.type(screen.getByTestId("add-env-input"), "QA");
		await user.click(screen.getByTestId("add-env-button"));
		await user.type(screen.getByTestId("add-set-id-input"), "10");
		await user.click(screen.getByTestId("add-set-id-button"));
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.create)).toHaveBeenCalledWith(
				expect.objectContaining<Partial<TestPlanDraft>>({
					name: "New Plan",
					environments: ["QA"],
					testSetIds: [10],
				})
			)
		);
	});

	it("calls service.update when initialValue provided (edit mode)", async () => {
		const service = makeService();
		const user = userEvent.setup();
		const initial = makePlan({ name: "Old Plan" });
		render(<TestPlanForm service={service} project="MyProject" initialValue={initial} />);
		const input = screen.getByTestId("tp-name-input");
		await user.clear(input);
		await user.type(input, "Renamed Plan");
		await user.click(screen.getByTestId("save-button"));
		await waitFor(() =>
			expect(vi.mocked(service.update)).toHaveBeenCalledWith(
				20,
				expect.objectContaining({ name: "Renamed Plan" })
			)
		);
	});

	it("shows lock button in edit mode when state is Draft", () => {
		render(<TestPlanForm service={makeService()} project="MyProject" initialValue={makePlan()} />);
		expect(screen.getByTestId("lock-button")).toBeDefined();
		expect(screen.queryByTestId("unlock-button")).toBeNull();
	});

	it("calls service.lock on lock button click", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<TestPlanForm service={service} project="MyProject" initialValue={makePlan()} />);
		await user.click(screen.getByTestId("lock-button"));
		await waitFor(() => expect(vi.mocked(service.lock)).toHaveBeenCalledWith(20));
	});

	it("shows unlock button when state is Locked", () => {
		const initial = makePlan({ state: "Locked" });
		render(<TestPlanForm service={makeService()} project="MyProject" initialValue={initial} />);
		expect(screen.getByTestId("unlock-button")).toBeDefined();
		expect(screen.queryByTestId("lock-button")).toBeNull();
	});

	it("calls service.unlock on unlock button click", async () => {
		const service = makeService();
		const user = userEvent.setup();
		const initial = makePlan({ state: "Locked" });
		render(<TestPlanForm service={service} project="MyProject" initialValue={initial} />);
		await user.click(screen.getByTestId("unlock-button"));
		await waitFor(() => expect(vi.mocked(service.unlock)).toHaveBeenCalledWith(20));
	});

	it("shows delete confirmation and calls service.delete on confirm", async () => {
		const service = makeService();
		const onDeleted = vi.fn();
		const user = userEvent.setup();
		render(
			<TestPlanForm
				service={service}
				project="MyProject"
				initialValue={makePlan()}
				onDeleted={onDeleted}
			/>
		);
		await user.click(screen.getByTestId("delete-button"));
		await user.click(screen.getByTestId("delete-confirm-button"));
		await waitFor(() => expect(vi.mocked(service.delete)).toHaveBeenCalledWith(20));
		await waitFor(() => expect(onDeleted).toHaveBeenCalled());
	});
});
