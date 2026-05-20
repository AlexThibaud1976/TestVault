import { useCallback } from "react";
import type { AuditLogEntry } from "../audit-log-service.js";
import { WitListHeader } from "../components/WitListHeader.js";
import { WitStatusBadge } from "../components/WitStatusBadge.js";
import { type Column, EmptyState, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

export function AuditLogListView() {
	const { auditLogService } = useServices();
	const fetchFn = useCallback(async () => auditLogService.list(), [auditLogService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	async function handleExportCsv() {
		await auditLogService.exportCsv().catch(() => {});
	}

	const columns: Column<AuditLogEntry>[] = [
		{
			key: "id",
			header: "ID",
			width: "80px",
			render: (r) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: "var(--t-small)",
						color: "var(--neutral-8)",
					}}
				>
					{r.id.slice(0, 8)}
				</span>
			),
		},
		{
			key: "timestamp",
			header: "Timestamp",
			width: "160px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}
				</span>
			),
		},
		{
			key: "actor",
			header: "Actor",
			width: "140px",
			render: (r) => r.actor || "-",
		},
		{
			key: "operation",
			header: "Operation",
			width: "130px",
			render: (r) => <WitStatusBadge status={r.operation} />,
		},
		{
			key: "oldValue",
			header: "Details",
			render: (r) => {
				if (r.oldValue || r.newValue) {
					return (
						<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
							{r.oldValue ?? "-"} {"→"} {r.newValue ?? "-"}
						</span>
					);
				}
				return <span style={{ color: "var(--neutral-6)" }}>-</span>;
			},
		},
	];

	return (
		<div className="wit-list-view" data-testid="view-audit-log">
			<WitListHeader
				title="Audit Log"
				count={items.length}
				onImport={undefined}
				onCreate={handleExportCsv}
				createLabel="Export CSV"
			/>
			<div className="wit-list-view-body">
				{isLoading && <div className="wit-list-view-loading">Loading audit log...</div>}
				{!isLoading && error !== null && (
					<div className="wit-list-view-error">Failed to load: {error.message}</div>
				)}
				{!isLoading && error === null && (
					<Table
						columns={columns}
						rows={items}
						emptyState={
							<EmptyState
								icon={
									<svg
										width="48"
										height="48"
										viewBox="0 0 48 48"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-hidden="true"
									>
										<rect x="10" y="8" width="28" height="32" rx="2" />
										<path d="M16 18h16M16 24h16M16 30h10" />
									</svg>
								}
								title="Audit log is empty"
								description="Administrative actions will be recorded here automatically."
							/>
						}
					/>
				)}
			</div>
		</div>
	);
}
