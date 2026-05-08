export interface AuditLogEntry {
	id: string;
	operation: string;
	actor: string;
	timestamp: string;
	oldValue?: string;
	newValue?: string;
	metadata?: Record<string, string>;
}

export interface AuditLogFilter {
	operation?: string;
	actor?: string;
	from?: string;
	to?: string;
}

export interface IAuditLogService {
	list(filter?: AuditLogFilter): Promise<AuditLogEntry[]>;
	getRetentionDays(): Promise<number>;
	setRetentionDays(days: number): Promise<void>;
	exportCsv(filter?: AuditLogFilter): Promise<string>;
}

export function createAuditLogService(store: {
	getAll(collection: string): Promise<unknown[]>;
	set(collection: string, doc: { id: string } & Record<string, unknown>): Promise<void>;
	get(collection: string, id: string): Promise<unknown>;
}): IAuditLogService {
	return {
		async list(filter) {
			const all = (await store.getAll("audit-log")) as AuditLogEntry[];
			return all.filter((e) => {
				if (filter?.operation && e.operation !== filter.operation) return false;
				if (filter?.actor && e.actor !== filter.actor) return false;
				if (filter?.from && e.timestamp < filter.from) return false;
				if (filter?.to && e.timestamp > filter.to) return false;
				return true;
			});
		},
		async getRetentionDays() {
			const val = (await store.get("audit-config", "retention")) as { days?: number } | undefined;
			return val?.days ?? 730;
		},
		async setRetentionDays(days) {
			if (days < 90) throw new Error("Retention minimum is 90 days");
			await store.set("audit-config", { id: "retention", days });
		},
		async exportCsv(filter) {
			const entries = await this.list(filter);
			const header = "id,operation,actor,timestamp,oldValue,newValue";
			const rows = entries.map(
				(e) =>
					`${e.id},${e.operation},${e.actor},${e.timestamp},${e.oldValue ?? ""},${e.newValue ?? ""}`
			);
			return [header, ...rows].join("\n");
		},
	};
}
