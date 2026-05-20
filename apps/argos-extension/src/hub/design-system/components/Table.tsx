import type { KeyboardEvent, ReactNode } from "react";
import "./Table.css";

export interface Column<T> {
	key: string;
	header: ReactNode;
	render: (row: T) => ReactNode;
	width?: string;
}

interface TableProps<T extends { id: string | number }> {
	columns: Column<T>[];
	rows: T[];
	onRowClick?: (row: T) => void;
	emptyState?: ReactNode;
}

export function Table<T extends { id: string | number }>({
	columns,
	rows,
	onRowClick,
	emptyState,
}: TableProps<T>) {
	if (rows.length === 0 && emptyState !== undefined) {
		return <div className="ds-table-empty">{emptyState}</div>;
	}

	function handleRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onRowClick?.(row);
		}
	}

	return (
		<table className="ds-table">
			<thead>
				<tr>
					{columns.map((col) => (
						<th key={col.key} style={col.width !== undefined ? { width: col.width } : undefined}>
							{col.header}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr
						key={row.id}
						onClick={onRowClick !== undefined ? () => onRowClick(row) : undefined}
						onKeyDown={onRowClick !== undefined ? (e) => handleRowKeyDown(e, row) : undefined}
						className={onRowClick !== undefined ? "ds-table-row-clickable" : undefined}
						role={onRowClick !== undefined ? "button" : undefined}
						tabIndex={onRowClick !== undefined ? 0 : undefined}
					>
						{columns.map((col) => (
							<td key={col.key}>{col.render(row)}</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
