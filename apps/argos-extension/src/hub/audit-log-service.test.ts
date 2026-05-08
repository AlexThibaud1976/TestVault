import { describe, expect, it, vi } from "vitest";
import { createAuditLogService } from "./audit-log-service.js";
import type { AuditLogEntry } from "./audit-log-service.js";

function makeEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
	return {
		id: "e1",
		operation: "llm.provider.add",
		actor: "admin-1",
		timestamp: "2026-05-01T12:00:00Z",
		...overrides,
	};
}

function makeStore(entries: AuditLogEntry[] = [], retentionDays = 730) {
	return {
		getAll: vi.fn().mockResolvedValue(entries),
		set: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue({ days: retentionDays }),
	};
}

describe("AuditLogService", () => {
	it("list returns all entries when no filter", async () => {
		const entries = [makeEntry(), makeEntry({ id: "e2", operation: "llm.global.disable" })];
		const svc = createAuditLogService(makeStore(entries));
		const result = await svc.list();
		expect(result).toHaveLength(2);
	});

	it("list filters by operation", async () => {
		const entries = [
			makeEntry({ operation: "llm.provider.add" }),
			makeEntry({ id: "e2", operation: "llm.global.disable" }),
		];
		const svc = createAuditLogService(makeStore(entries));
		const result = await svc.list({ operation: "llm.provider.add" });
		expect(result).toHaveLength(1);
		expect(result[0]?.operation).toBe("llm.provider.add");
	});

	it("list filters by actor", async () => {
		const entries = [makeEntry({ actor: "admin-1" }), makeEntry({ id: "e2", actor: "admin-2" })];
		const svc = createAuditLogService(makeStore(entries));
		const result = await svc.list({ actor: "admin-1" });
		expect(result).toHaveLength(1);
	});

	it("list filters by date range", async () => {
		const entries = [
			makeEntry({ timestamp: "2026-01-01T00:00:00Z" }),
			makeEntry({ id: "e2", timestamp: "2026-06-01T00:00:00Z" }),
		];
		const svc = createAuditLogService(makeStore(entries));
		const result = await svc.list({ from: "2026-03-01T00:00:00Z" });
		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("e2");
	});

	it("getRetentionDays returns stored value", async () => {
		const svc = createAuditLogService(makeStore([], 365));
		expect(await svc.getRetentionDays()).toBe(365);
	});

	it("getRetentionDays defaults to 730 when not set", async () => {
		const store = {
			getAll: vi.fn().mockResolvedValue([]),
			set: vi.fn(),
			get: vi.fn().mockResolvedValue(undefined),
		};
		const svc = createAuditLogService(store);
		expect(await svc.getRetentionDays()).toBe(730);
	});

	it("setRetentionDays stores value", async () => {
		const store = makeStore();
		const svc = createAuditLogService(store);
		await svc.setRetentionDays(365);
		expect(vi.mocked(store.set)).toHaveBeenCalledWith(
			"audit-config",
			expect.objectContaining({ days: 365 })
		);
	});

	it("setRetentionDays throws when value is below 90", async () => {
		const svc = createAuditLogService(makeStore());
		await expect(svc.setRetentionDays(30)).rejects.toThrow("90 days");
	});

	it("exportCsv returns CSV with header row", async () => {
		const svc = createAuditLogService(makeStore([makeEntry()]));
		const csv = await svc.exportCsv();
		expect(csv.startsWith("id,operation,actor,timestamp")).toBe(true);
	});

	it("exportCsv includes entry data", async () => {
		const e = makeEntry({ operation: "llm.global.disable" });
		const svc = createAuditLogService(makeStore([e]));
		const csv = await svc.exportCsv();
		expect(csv).toContain("llm.global.disable");
		expect(csv).toContain("admin-1");
	});
});
