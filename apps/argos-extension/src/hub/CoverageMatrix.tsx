import type { MatrixInput } from "@atconseil/testvault-sdk";
import { buildCoverageMatrix } from "@atconseil/testvault-sdk";
import { Text } from "@fluentui/react-components";
import { useMemo, useState } from "react";

const STATUS_COLOR: Record<string, string> = {
	Pass: "#e6ffed",
	Fail: "#ffeef0",
	Blocked: "#fff8e1",
	"N/A": "#f5f5f5",
};

export interface CoverageMatrixProps {
	input: MatrixInput;
	environments?: string[];
}

export function CoverageMatrix({ input, environments }: CoverageMatrixProps) {
	const [filterEnv, setFilterEnv] = useState<string>("");

	const matrix = useMemo(
		() => buildCoverageMatrix({ ...input, filterEnvironment: filterEnv || undefined }),
		[input, filterEnv]
	);

	return (
		<div data-testid="coverage-matrix" style={{ padding: "16px" }}>
			{environments && environments.length > 0 && (
				<div style={{ marginBottom: "12px" }}>
					<label htmlFor="env-filter" style={{ marginRight: "8px" }}>
						Environment:
					</label>
					<select
						id="env-filter"
						data-testid="env-filter"
						value={filterEnv}
						onChange={(e) => setFilterEnv(e.target.value)}
					>
						<option value="">All</option>
						{environments.map((env) => (
							<option key={env} value={env}>
								{env}
							</option>
						))}
					</select>
				</div>
			)}

			{matrix.rows.length === 0 ? (
				<div data-testid="matrix-empty" style={{ color: "#666" }}>
					No coverage data. Link Test Cases to Work Items to build the matrix.
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table
						style={{
							borderCollapse: "collapse",
							fontSize: "12px",
							minWidth: "100%",
						}}
					>
						<thead>
							<tr>
								<th
									style={{
										padding: "6px 8px",
										borderBottom: "2px solid #e0e0e0",
										textAlign: "left",
										minWidth: "160px",
									}}
								>
									Work Item
								</th>
								{matrix.columns.map((col) => (
									<th
										key={col.testCaseId}
										data-testid={`matrix-col-${col.testCaseId}`}
										style={{
											padding: "6px 8px",
											borderBottom: "2px solid #e0e0e0",
											textAlign: "center",
											minWidth: "80px",
											maxWidth: "120px",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
										title={col.testCaseTitle}
									>
										{col.testCaseTitle}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{matrix.rows.map((row) => (
								<tr key={row.workItemId} data-testid={`matrix-row-${row.workItemId}`}>
									<td
										style={{
											padding: "6px 8px",
											borderBottom: "1px solid #f0f0f0",
											fontWeight: 600,
										}}
									>
										<Text>{row.workItemTitle}</Text>
									</td>
									{row.cells.map((cell) => (
										<td
											key={cell.testCaseId}
											data-testid={`matrix-cell-${row.workItemId}-${cell.testCaseId}`}
											style={{
												padding: "4px 8px",
												borderBottom: "1px solid #f0f0f0",
												textAlign: "center",
												background: cell.linked
													? cell.latestStatus
														? (STATUS_COLOR[cell.latestStatus] ?? "#f0f7ff")
														: "#f0f7ff"
													: "transparent",
											}}
										>
											{cell.linked ? (cell.latestStatus ?? "—") : "—"}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
