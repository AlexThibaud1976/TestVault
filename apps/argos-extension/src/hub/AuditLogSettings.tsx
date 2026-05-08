import { Button, Input, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { AuditLogEntry, AuditLogFilter, IAuditLogService } from "./audit-log-service.js";

export interface AuditLogSettingsProps {
	service: IAuditLogService;
	isAdmin: boolean;
}

export function AuditLogSettings({ service, isAdmin }: AuditLogSettingsProps) {
	const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
	const [retentionDays, setRetentionDays] = useState<number | null>(null);
	const [retentionInput, setRetentionInput] = useState("");
	const [savingRetention, setSavingRetention] = useState(false);
	const [retentionError, setRetentionError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);
	const filter: AuditLogFilter = {};

	useEffect(() => {
		Promise.all([service.list(filter), service.getRetentionDays()]).then(([list, days]) => {
			setEntries(list);
			setRetentionDays(days);
			setRetentionInput(String(days));
		});
	}, [service]);

	async function handleSaveRetention() {
		const days = Number(retentionInput);
		setSavingRetention(true);
		setRetentionError(null);
		try {
			await service.setRetentionDays(days);
			setRetentionDays(days);
		} catch (err) {
			setRetentionError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSavingRetention(false);
		}
	}

	async function handleExport() {
		setExporting(true);
		try {
			const csv = await service.exportCsv(filter);
			const blob = new Blob([csv], { type: "text/csv" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "audit-log.csv";
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	}

	if (entries === null) {
		return <div data-testid="audit-log-loading">Loading…</div>;
	}

	if (!isAdmin) {
		return (
			<div data-testid="audit-log-settings">
				<div data-testid="audit-log-no-permission">
					You need Project Administrator permissions to view the audit log.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="audit-log-settings" style={{ padding: "24px", maxWidth: "800px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				Audit Log
			</Text>

			<div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
				<Text weight="semibold">Retention (days):</Text>
				<Input
					data-testid="retention-days-input"
					type="number"
					value={retentionInput}
					onChange={(_, d) => setRetentionInput(d.value)}
					style={{ width: "100px" }}
				/>
				<Button
					appearance="primary"
					data-testid="save-retention-button"
					disabled={savingRetention}
					onClick={handleSaveRetention}
				>
					{savingRetention ? "Saving…" : "Save"}
				</Button>
				<Button
					appearance="subtle"
					data-testid="export-csv-button"
					disabled={exporting}
					onClick={handleExport}
				>
					{exporting ? "Exporting…" : "Export CSV"}
				</Button>
			</div>

			{retentionError && (
				<div data-testid="retention-error" style={{ color: "red", marginBottom: "8px" }}>
					{retentionError}
				</div>
			)}

			{entries.length === 0 ? (
				<div data-testid="audit-log-empty">No audit log entries found.</div>
			) : (
				<ul style={{ listStyle: "none", padding: 0 }}>
					{entries.map((e) => (
						<li
							key={e.id}
							data-testid={`audit-log-entry-${e.id}`}
							style={{
								border: "1px solid #e0e0e0",
								borderRadius: "4px",
								padding: "8px 12px",
								marginBottom: "4px",
							}}
						>
							<Text block size={300} weight="semibold">
								{e.operation}
							</Text>
							<Text block size={200} style={{ color: "#666" }}>
								{e.actor} · {e.timestamp}
							</Text>
						</li>
					))}
				</ul>
			)}

			{retentionDays !== null && (
				<Text size={200} style={{ color: "#999" }} block>
					Current retention: <span data-testid="current-retention">{retentionDays}</span> days
				</Text>
			)}
		</div>
	);
}
