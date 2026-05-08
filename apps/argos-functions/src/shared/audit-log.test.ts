import { describe, expect, it } from "vitest";
import { NoopAuditLogger, createAuditEntry, maskSecret } from "./audit-log.js";

describe("createAuditEntry", () => {
	it("adds ISO timestamp", () => {
		const entry = createAuditEntry({ operation: "llm.provider.add", actor: "user-1" });
		expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
	});

	it("preserves operation and actor", () => {
		const entry = createAuditEntry({ operation: "llm.global.disable", actor: "admin-42" });
		expect(entry.operation).toBe("llm.global.disable");
		expect(entry.actor).toBe("admin-42");
	});

	it("preserves optional fields", () => {
		const entry = createAuditEntry({
			operation: "llm.provider.update",
			actor: "user-1",
			oldValue: "old",
			newValue: "new",
			metadata: { providerId: "p1" },
		});
		expect(entry.oldValue).toBe("old");
		expect(entry.newValue).toBe("new");
		expect(entry.metadata?.providerId).toBe("p1");
	});
});

describe("maskSecret", () => {
	it("masks all but last 4 chars for long values", () => {
		expect(maskSecret("sk-abcdefghijklmnop-WXYZ")).toBe("********************WXYZ");
	});

	it("returns full value when length <= 4", () => {
		expect(maskSecret("abc")).toBe("abc");
		expect(maskSecret("abcd")).toBe("abcd");
	});

	it("masks a typical API key", () => {
		const masked = maskSecret("sk-ant-api03-xxxxxxxxxxxxxxxx-1234");
		expect(masked.endsWith("1234")).toBe(true);
		expect(masked.startsWith("*")).toBe(true);
	});
});

describe("NoopAuditLogger", () => {
	it("write resolves without throwing", async () => {
		const logger = new NoopAuditLogger();
		await expect(
			logger.write({ operation: "llm.provider.add", actor: "test" })
		).resolves.toBeUndefined();
	});
});
