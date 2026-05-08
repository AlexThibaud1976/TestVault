import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogSettings } from "./AuditLogSettings.js";
import type { AuditLogEntry, IAuditLogService } from "./audit-log-service.js";

beforeEach(() => {
	URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
	URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
	return {
		id: "entry-1",
		operation: "llm.provider.add",
		actor: "user@example.com",
		timestamp: "2026-05-08T10:00:00Z",
		...overrides,
	};
}

function makeService(entries: AuditLogEntry[] = [], retentionDays = 730): IAuditLogService {
	return {
		list: vi.fn().mockResolvedValue(entries),
		getRetentionDays: vi.fn().mockResolvedValue(retentionDays),
		setRetentionDays: vi.fn().mockResolvedValue(undefined),
		exportCsv: vi.fn().mockResolvedValue("id,operation,actor,timestamp,oldValue,newValue"),
	};
}

describe("AuditLogSettings", () => {
	it("shows loading state initially", () => {
		render(<AuditLogSettings service={makeService()} isAdmin />);
		expect(screen.getByTestId("audit-log-loading")).toBeDefined();
	});

	it("shows no-permission when isAdmin=false", async () => {
		render(<AuditLogSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => expect(screen.getByTestId("audit-log-no-permission")).toBeDefined());
	});

	it("shows empty state when no entries", async () => {
		render(<AuditLogSettings service={makeService([])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId("audit-log-empty")).toBeDefined());
	});

	it("renders audit log entries", async () => {
		const e = makeEntry();
		render(<AuditLogSettings service={makeService([e])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId(`audit-log-entry-${e.id}`)).toBeDefined());
	});

	it("shows current retention days", async () => {
		render(<AuditLogSettings service={makeService([], 365)} isAdmin />);
		await waitFor(() => screen.getByTestId("current-retention"));
		expect(screen.getByTestId("current-retention").textContent).toBe("365");
	});

	it("calls setRetentionDays when Save is clicked", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<AuditLogSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("save-retention-button"));
		await user.click(screen.getByTestId("save-retention-button"));
		await waitFor(() => expect(vi.mocked(service.setRetentionDays)).toHaveBeenCalled());
	});

	it("shows retention error when setRetentionDays throws", async () => {
		const service = makeService();
		vi.mocked(service.setRetentionDays).mockRejectedValue(
			new Error("Retention minimum is 90 days")
		);
		const user = userEvent.setup();
		render(<AuditLogSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("save-retention-button"));
		await user.click(screen.getByTestId("save-retention-button"));
		await waitFor(() => expect(screen.getByTestId("retention-error")).toBeDefined());
		expect(screen.getByTestId("retention-error").textContent).toContain("90");
	});

	it("calls exportCsv when Export CSV is clicked", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<AuditLogSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("export-csv-button"));
		await user.click(screen.getByTestId("export-csv-button"));
		await waitFor(() => expect(vi.mocked(service.exportCsv)).toHaveBeenCalled());
	});

	it("entry shows operation and actor", async () => {
		const e = makeEntry({ operation: "llm.quota.set", actor: "admin@corp.com" });
		render(<AuditLogSettings service={makeService([e])} isAdmin />);
		await waitFor(() => screen.getByTestId(`audit-log-entry-${e.id}`));
		const item = screen.getByTestId(`audit-log-entry-${e.id}`);
		expect(item.textContent).toContain("llm.quota.set");
		expect(item.textContent).toContain("admin@corp.com");
	});
});
