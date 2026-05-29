/**
 * Regression T223-ExecPath -- TestExecution display-mode immutability.
 *
 * Per constitution S3.5 a TestExecution is immutable once created. In display
 * mode (executionId set) the form previously enforced this only by hiding the
 * Save path; the input fields themselves stayed editable. This guards that the
 * fields are actually disabled when consulting a past execution.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockServices,
	createMockTestExecutionService,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestExecutionFormView } from "./TestExecutionFormView.js";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

async function renderDisplayMode() {
	const services = createMockServices({
		testExecutionService: createMockTestExecutionService({
			read: vi.fn().mockResolvedValue({ id: 99, testCaseId: 7, testPlanId: 3, environment: "qa" }),
		}),
	});
	const { container } = render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestExecutionFormView executionId={99} onCancel={vi.fn()} onSuccess={vi.fn()} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	// Wait until the loaded (display) form replaces the loading placeholder.
	await screen.findByTestId("te-rerun-btn");
	return container;
}

describe("T223-ExecPath -- TestExecution display-mode immutability", () => {
	it.each(["#ex-plan", "#ex-case", "#ex-env", "#ex-result", "#ex-actual"])(
		"field %s is disabled in display mode",
		async (selector) => {
			const container = await renderDisplayMode();
			await waitFor(() => {
				const el = container.querySelector<HTMLElement>(selector);
				expect(el).not.toBeNull();
				expect((el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled).toBe(
					true
				);
			});
		}
	);
});
