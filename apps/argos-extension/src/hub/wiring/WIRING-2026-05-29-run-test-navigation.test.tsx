/**
 * Regression WIRING-2026-05-29-run-test-navigation (T223-Routing)
 *
 * The "Run Test" button on an existing Test Case must navigate to a NEW
 * Test Execution form, pre-filled with that Test Case, instead of returning
 * to the Test Cases list (the placeholder behaviour shipped in Sprint 2.23,
 * tracked as TECH-DEBT-T223).
 *
 * Two contracts proven here:
 *  1. TestCaseFormView routes the click through an `onRunTest(caseId)` callback
 *     (NOT `onSuccess`, which goes back to the list).
 *  2. TestExecutionFormView, in create mode, pre-fills the Test Case ID from a
 *     `prefillTestCaseId` prop.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockServices, createMockTestCaseService } from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestCaseFormView } from "../views/TestCaseFormView.js";
import { TestExecutionFormView } from "../views/TestExecutionFormView.js";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("WIRING-2026-05-29-run-test-navigation (T223-Routing)", () => {
	it("Run Test invokes onRunTest(caseId), not onSuccess (back-to-list)", async () => {
		const user = userEvent.setup();
		const services = createMockServices({
			testCaseService: createMockTestCaseService({
				read: vi.fn().mockResolvedValue({ id: 42, title: "Login", steps: [] }),
			}),
		});
		const onSuccess = vi.fn();
		const onRunTest = vi.fn();
		render(
			<ServicesContext.Provider value={services}>
				<ToastProvider>
					<TestCaseFormView
						caseId={42}
						onCancel={vi.fn()}
						onSuccess={onSuccess}
						onRunTest={onRunTest}
					/>
				</ToastProvider>
			</ServicesContext.Provider>
		);

		const runBtn = await screen.findByTestId("tc-run-btn");
		await user.click(runBtn);

		expect(onRunTest).toHaveBeenCalledWith(42);
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("TestExecutionFormView (create mode) pre-fills Test Case ID from prefillTestCaseId", () => {
		const services = createMockServices();
		const { container } = render(
			<ServicesContext.Provider value={services}>
				<ToastProvider>
					<TestExecutionFormView onCancel={vi.fn()} onSuccess={vi.fn()} prefillTestCaseId={42} />
				</ToastProvider>
			</ServicesContext.Provider>
		);

		const caseInput = container.querySelector<HTMLInputElement>("#ex-case");
		expect(caseInput).not.toBeNull();
		expect(caseInput?.value).toBe("42");
	});
});
