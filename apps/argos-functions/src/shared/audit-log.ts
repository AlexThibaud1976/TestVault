export type AuditOperation =
	| "llm.provider.add"
	| "llm.provider.update"
	| "llm.provider.remove"
	| "llm.provider.rotate"
	| "llm.provider.rotate-complete"
	| "llm.provider.test-connection"
	| "llm.quota.set"
	| "llm.quota.reset"
	| "llm.global.enable"
	| "llm.global.disable"
	| "llm.prompt.update"
	| "audit.retention.set"
	| "webhook.add"
	| "webhook.remove"
	| "process.install"
	| "process.update";

export interface AuditEntry {
	operation: AuditOperation;
	actor: string;
	timestamp: string;
	oldValue?: string;
	newValue?: string;
	metadata?: Record<string, string>;
}

export interface IAuditLogger {
	write(entry: Omit<AuditEntry, "timestamp">): Promise<void>;
}

export class NoopAuditLogger implements IAuditLogger {
	async write(_entry: Omit<AuditEntry, "timestamp">): Promise<void> {}
}

export function createAuditEntry(entry: Omit<AuditEntry, "timestamp">): AuditEntry {
	return { ...entry, timestamp: new Date().toISOString() };
}

export function maskSecret(value: string): string {
	if (value.length <= 4) return value;
	return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}
