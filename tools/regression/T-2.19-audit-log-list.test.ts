import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("T-2.19 AuditLogListView file-system checks", () => {
	const root = resolve(__dirname, "../..");
	const views = resolve(root, "apps/argos-extension/src/hub/views");

	it("AuditLogListView.tsx exists", () => {
		expect(existsSync(resolve(views, "AuditLogListView.tsx"))).toBe(true);
	});

	it("AuditLogListView imports WitListHeader", () => {
		const c = readFileSync(resolve(views, "AuditLogListView.tsx"), "utf8");
		expect(c).toContain("WitListHeader");
	});

	it("AuditLogListView has data-testid view-audit-log", () => {
		const c = readFileSync(resolve(views, "AuditLogListView.tsx"), "utf8");
		expect(c).toContain('data-testid="view-audit-log"');
	});

	it("AuditLogListView imports AuditLogEntry from audit-log-service", () => {
		const c = readFileSync(resolve(views, "AuditLogListView.tsx"), "utf8");
		expect(c).toContain("AuditLogEntry");
		expect(c).toContain("audit-log-service");
	});

	it("AuditLogListView calls auditLogService.list", () => {
		const c = readFileSync(resolve(views, "AuditLogListView.tsx"), "utf8");
		expect(c).toContain("auditLogService");
		expect(c).toContain(".list()");
	});

	it("AuditLogListView exposes Export CSV action", () => {
		const c = readFileSync(resolve(views, "AuditLogListView.tsx"), "utf8");
		expect(c).toContain("Export CSV");
	});

	it("AuditLogListView test file exists", () => {
		expect(existsSync(resolve(views, "AuditLogListView.test.tsx"))).toBe(true);
	});
});
