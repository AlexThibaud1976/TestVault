import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockAuditLogService, createMockServices } from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { AuditLogListView } from "./AuditLogListView.js";

afterEach(cleanup);

const LOG_A = {
	id: "entry-001",
	operation: "Create",
	actor: "Alice",
	timestamp: new Date().toISOString(),
	oldValue: undefined,
	newValue: "Test Plan #1",
};

const LOG_B = {
	id: "entry-002",
	operation: "Delete",
	actor: "Bob",
	timestamp: new Date().toISOString(),
	oldValue: "Test Case #5",
	newValue: undefined,
};

function renderView(overrides?: Parameters<typeof createMockServices>[0]) {
	const services = createMockServices(overrides);
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<AuditLogListView />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services };
}

describe("AuditLogListView (Sprint 2.19)", () => {
	it("shows loading state initially", () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockReturnValue(new Promise(() => {})),
			}),
		});
		expect(screen.getByText(/loading audit log/i)).toBeDefined();
	});

	it("shows empty state when no entries", async () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText(/audit log is empty/i)).toBeDefined());
	});

	it("renders audit log rows after load", async () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockResolvedValue([LOG_A, LOG_B]),
			}),
		});
		await waitFor(() => {
			expect(screen.getByText("Alice")).toBeDefined();
			expect(screen.getByText("Bob")).toBeDefined();
		});
	});

	it("renders with data-testid view-audit-log", () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByTestId("view-audit-log")).toBeDefined();
	});

	it("renders WitListHeader title Audit Log", async () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		await waitFor(() => expect(screen.getByText("Audit Log")).toBeDefined());
	});

	it("renders Export CSV button", () => {
		renderView({
			auditLogService: createMockAuditLogService({
				list: vi.fn().mockResolvedValue([]),
			}),
		});
		expect(screen.getByText(/export csv/i)).toBeDefined();
	});
});
