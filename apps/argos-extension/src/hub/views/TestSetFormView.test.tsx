import type { ITestSetService } from "@atconseil/argos-sdk";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockServices, createMockTestSetService } from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestSetFormView } from "./TestSetFormView.js";

afterEach(cleanup);

function makeTestSetRecord(overrides?: Record<string, unknown>) {
	return {
		id: 77,
		name: "Existing TS",
		description: "Existing desc",
		state: "Draft" as const,
		areaPath: "Proj\\X",
		tags: ["smoke"],
		testCaseIds: [101, 102],
		createdBy: "alex@example.com",
		createdAt: "2026-05-28T10:00:00Z",
		modifiedBy: "alex@example.com",
		modifiedAt: "2026-05-28T10:00:00Z",
		...overrides,
	};
}

interface RenderOpts {
	testSetService?: ITestSetService;
	setId?: number;
}

function renderForm(opts: RenderOpts = {}) {
	const services = createMockServices({
		testSetService: opts.testSetService ?? createMockTestSetService(),
	});
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<ToastProvider>
					<TestSetFormView onCancel={vi.fn()} onSuccess={vi.fn()} setId={opts.setId} />
				</ToastProvider>
			</ServicesContext.Provider>
		</FluentProvider>
	);
}

describe("T-2.23 -- TestSetFormView edit mode (fetch by setId)", () => {
	it("create mode (no setId) does NOT call testSetService.read", async () => {
		const readMock = vi.fn();
		renderForm({ testSetService: createMockTestSetService({ read: readMock }) });
		await new Promise((r) => setTimeout(r, 50));
		expect(readMock).not.toHaveBeenCalled();
	});

	it("edit mode (setId set) calls testSetService.read with the provided id", async () => {
		const readMock = vi.fn().mockResolvedValue(makeTestSetRecord());
		renderForm({ testSetService: createMockTestSetService({ read: readMock }), setId: 77 });
		await waitFor(() => expect(readMock).toHaveBeenCalledWith(77));
	});

	it("edit mode shows a loading state while the WIT is being fetched", async () => {
		const deferred: { resolve?: (v: unknown) => void } = {};
		const readMock = vi.fn().mockImplementation(
			() =>
				new Promise((res) => {
					deferred.resolve = res;
				})
		);
		renderForm({ testSetService: createMockTestSetService({ read: readMock }), setId: 77 });
		await waitFor(() => expect(screen.getByTestId("testset-form-loading")).toBeDefined());
		deferred.resolve?.(makeTestSetRecord());
	});

	it("edit mode populates name and description from fetched TestSet", async () => {
		const readMock = vi
			.fn()
			.mockResolvedValue(makeTestSetRecord({ name: "Login set", description: "Auth bundle" }));
		renderForm({ testSetService: createMockTestSetService({ read: readMock }), setId: 77 });
		await waitFor(() => {
			const nameInput = screen.getByPlaceholderText(/Auth smoke|Test Set name|Name/i) as
				| HTMLInputElement
				| undefined;
			expect(nameInput?.value).toBe("Login set");
		});
	});

	it("edit mode shows an error state if the fetch rejects", async () => {
		const readMock = vi.fn().mockRejectedValue(new Error("TestSet 77 not found"));
		renderForm({ testSetService: createMockTestSetService({ read: readMock }), setId: 77 });
		await waitFor(() => {
			expect(screen.getByTestId("testset-form-error").textContent).toContain("not found");
		});
	});

	it("edit mode replaces the Create button with an Update button", async () => {
		const readMock = vi.fn().mockResolvedValue(makeTestSetRecord());
		renderForm({ testSetService: createMockTestSetService({ read: readMock }), setId: 77 });
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: /Create Test Set/i })).toBeNull();
			expect(screen.getByRole("button", { name: /Update Test Set|Save/i })).toBeDefined();
		});
	});
});
