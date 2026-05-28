import type { IPreconditionService } from "@atconseil/argos-sdk";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createMockPreconditionService,
	createMockServices,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { PreconditionFormView } from "./PreconditionFormView.js";

afterEach(cleanup);

function makePreconditionRecord(overrides?: Record<string, unknown>) {
	return {
		id: 55,
		title: "Existing precondition",
		description: "Existing desc",
		state: "Active" as const,
		areaPath: "Proj\\X",
		tags: ["smoke"],
		createdBy: "alex@example.com",
		createdAt: "2026-05-28T10:00:00Z",
		modifiedBy: "alex@example.com",
		modifiedAt: "2026-05-28T10:00:00Z",
		...overrides,
	};
}

interface RenderOpts {
	preconditionService?: IPreconditionService;
	preconditionId?: number;
}

function renderForm(opts: RenderOpts = {}) {
	const services = createMockServices({
		preconditionService: opts.preconditionService ?? createMockPreconditionService(),
	});
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<ToastProvider>
					<PreconditionFormView
						onCancel={vi.fn()}
						onSuccess={vi.fn()}
						preconditionId={opts.preconditionId}
					/>
				</ToastProvider>
			</ServicesContext.Provider>
		</FluentProvider>
	);
}

describe("T-2.23 -- PreconditionFormView edit mode", () => {
	it("create mode (no preconditionId) does NOT call preconditionService.read", async () => {
		const readMock = vi.fn();
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
		});
		await new Promise((r) => setTimeout(r, 50));
		expect(readMock).not.toHaveBeenCalled();
	});

	it("edit mode calls preconditionService.read with the provided id", async () => {
		const readMock = vi.fn().mockResolvedValue(makePreconditionRecord());
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
			preconditionId: 55,
		});
		await waitFor(() => expect(readMock).toHaveBeenCalledWith(55));
	});

	it("edit mode shows a loading state while fetching", async () => {
		const deferred: { resolve?: (v: unknown) => void } = {};
		const readMock = vi.fn().mockImplementation(
			() =>
				new Promise((res) => {
					deferred.resolve = res;
				})
		);
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
			preconditionId: 55,
		});
		await waitFor(() => expect(screen.getByTestId("precondition-form-loading")).toBeDefined());
		deferred.resolve?.(makePreconditionRecord());
	});

	it("edit mode populates title from the fetched Precondition", async () => {
		const readMock = vi.fn().mockResolvedValue(makePreconditionRecord({ title: "DB seeded" }));
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
			preconditionId: 55,
		});
		await waitFor(() => {
			const titleInput = document.getElementById("pc-title") as HTMLInputElement | null;
			expect(titleInput?.value).toBe("DB seeded");
		});
	});

	it("edit mode shows an error state if the fetch rejects", async () => {
		const readMock = vi.fn().mockRejectedValue(new Error("Precondition 55 not found"));
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
			preconditionId: 55,
		});
		await waitFor(() => {
			expect(screen.getByTestId("precondition-form-error").textContent).toContain("not found");
		});
	});

	it("edit mode replaces the Create button with an Update button", async () => {
		const readMock = vi.fn().mockResolvedValue(makePreconditionRecord());
		renderForm({
			preconditionService: createMockPreconditionService({ read: readMock }),
			preconditionId: 55,
		});
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: /Create Precondition/i })).toBeNull();
			expect(screen.getByRole("button", { name: /Update Precondition|Save/i })).toBeDefined();
		});
	});
});
