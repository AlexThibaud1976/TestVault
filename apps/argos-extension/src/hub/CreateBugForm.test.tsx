import type { BugDraft, IBugCreationService } from "@atconseil/argos-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateBugForm } from "./CreateBugForm.js";

afterEach(cleanup);

function makeDraft(overrides?: Partial<BugDraft>): BugDraft {
	return {
		title: "[Fail] Login with invalid credentials — QA",
		description: "Test execution #99 failed.",
		reproSteps: "Step 2: Enter wrong password\nObserved: Error not shown",
		severity: "2 - High",
		environment: "QA",
		areaPath: "MyProject\\QA",
		...overrides,
	};
}

function makeService(overrides?: Partial<IBugCreationService>): IBugCreationService {
	return {
		createBug: vi.fn().mockResolvedValue({
			id: 200,
			url: "https://dev.azure.com/org/MyProject/_workitems/edit/200",
		}),
		...overrides,
	};
}

describe("CreateBugForm", () => {
	it("renders pre-filled title", () => {
		render(<CreateBugForm draft={makeDraft()} service={makeService()} executionId={99} />);
		const input = screen.getByTestId("create-bug-title") as HTMLInputElement;
		expect(input.value).toBe("[Fail] Login with invalid credentials — QA");
	});

	it("renders pre-filled reproSteps", () => {
		render(<CreateBugForm draft={makeDraft()} service={makeService()} executionId={99} />);
		const textarea = screen.getByTestId("create-bug-repro") as HTMLTextAreaElement;
		expect(textarea.value).toContain("Enter wrong password");
	});

	it("renders severity selector pre-set to '2 - High'", () => {
		render(<CreateBugForm draft={makeDraft()} service={makeService()} executionId={99} />);
		const select = screen.getByTestId("create-bug-severity") as HTMLSelectElement;
		expect(select.value).toBe("2 - High");
	});

	it("user can edit the title before submitting", async () => {
		const user = userEvent.setup();
		render(<CreateBugForm draft={makeDraft()} service={makeService()} executionId={99} />);
		const input = screen.getByTestId("create-bug-title");
		await user.clear(input);
		await user.type(input, "Custom bug title");
		expect((input as HTMLInputElement).value).toBe("Custom bug title");
	});

	it("calls service.createBug with the current draft on submit", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<CreateBugForm draft={makeDraft()} service={service} executionId={99} />);
		await user.click(screen.getByTestId("create-bug-submit"));
		await waitFor(() => expect(vi.mocked(service.createBug)).toHaveBeenCalledOnce());
		expect(vi.mocked(service.createBug)).toHaveBeenCalledWith(
			expect.objectContaining({ title: "[Fail] Login with invalid credentials — QA" }),
			99
		);
	});

	it("shows create-bug-success with bug ID after successful creation", async () => {
		const user = userEvent.setup();
		render(<CreateBugForm draft={makeDraft()} service={makeService()} executionId={99} />);
		await user.click(screen.getByTestId("create-bug-submit"));
		await waitFor(() => expect(screen.getByTestId("create-bug-success")).toBeDefined());
		expect(screen.getByTestId("create-bug-success").textContent).toContain("200");
	});

	it("shows create-bug-error when service throws", async () => {
		const service = makeService({
			createBug: vi.fn().mockRejectedValue(new Error("ADO error")),
		});
		const user = userEvent.setup();
		render(<CreateBugForm draft={makeDraft()} service={service} executionId={99} />);
		await user.click(screen.getByTestId("create-bug-submit"));
		await waitFor(() => expect(screen.getByTestId("create-bug-error")).toBeDefined());
		expect(screen.getByTestId("create-bug-error").textContent).toContain("ADO error");
	});

	it("calls onCreated callback with the bug id after success", async () => {
		const onCreated = vi.fn();
		const user = userEvent.setup();
		render(
			<CreateBugForm
				draft={makeDraft()}
				service={makeService()}
				executionId={99}
				onCreated={onCreated}
			/>
		);
		await user.click(screen.getByTestId("create-bug-submit"));
		await waitFor(() => expect(onCreated).toHaveBeenCalledWith(200));
	});

	it("calls onCancelled when Cancel is clicked", async () => {
		const onCancelled = vi.fn();
		const user = userEvent.setup();
		render(
			<CreateBugForm
				draft={makeDraft()}
				service={makeService()}
				executionId={99}
				onCancelled={onCancelled}
			/>
		);
		await user.click(screen.getByTestId("create-bug-cancel"));
		expect(onCancelled).toHaveBeenCalledOnce();
	});
});
