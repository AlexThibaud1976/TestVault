import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiCandidatesModal } from "./AiCandidatesModal.js";
import type { TcCandidate } from "./AiCandidatesModal.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const CANDIDATES: TcCandidate[] = [
	{
		title: "Login with valid credentials",
		steps: [{ action: "Open login page", expected: "Login form shown" }],
		tags: ["smoke"],
	},
	{
		title: "Login with invalid credentials",
		steps: [{ action: "Enter wrong password", expected: "Error shown" }],
		tags: [],
	},
];

describe("AiCandidatesModal", () => {
	it("renders all candidate titles", () => {
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={vi.fn()}
				onCancel={vi.fn()}
				quotaRemaining={8}
			/>
		);
		expect(screen.getByTestId("candidate-0")).toBeDefined();
		expect(screen.getByTestId("candidate-1")).toBeDefined();
	});

	it("shows quota remaining", () => {
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={vi.fn()}
				onCancel={vi.fn()}
				quotaRemaining={7}
			/>
		);
		expect(screen.getByTestId("quota-remaining").textContent).toContain("7");
	});

	it("calls onCancel when Cancel is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={vi.fn()}
				onCancel={onCancel}
				quotaRemaining={5}
			/>
		);
		await user.click(screen.getByTestId("cancel-button"));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("calls onAccept with all candidates when Accept All is clicked", async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={onAccept}
				onCancel={vi.fn()}
				quotaRemaining={5}
			/>
		);
		await user.click(screen.getByTestId("accept-all-button"));
		expect(onAccept).toHaveBeenCalledWith(CANDIDATES);
	});

	it("calls onAccept with only selected candidates when accepting individually", async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={onAccept}
				onCancel={vi.fn()}
				quotaRemaining={5}
			/>
		);
		await user.click(screen.getByTestId("accept-candidate-0"));
		await waitFor(() => expect(onAccept).toHaveBeenCalledWith([CANDIDATES[0]]));
	});

	it("shows candidate step count", () => {
		render(
			<AiCandidatesModal
				candidates={CANDIDATES}
				onAccept={vi.fn()}
				onCancel={vi.fn()}
				quotaRemaining={5}
			/>
		);
		const c0 = screen.getByTestId("candidate-0");
		expect(c0.textContent).toContain("1");
	});
});
