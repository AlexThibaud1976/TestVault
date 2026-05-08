import type { CoverageMatrix } from "@atconseil/testvault-sdk";
import * as XLSX from "xlsx";

// ─── Excel export ─────────────────────────────────────────────────────────────

const STATUS_FILL: Record<string, { fgColor: { rgb: string } }> = {
	Pass: { fgColor: { rgb: "C6EFCE" } },
	Fail: { fgColor: { rgb: "FFC7CE" } },
	Blocked: { fgColor: { rgb: "FFEB9C" } },
};

export function exportMatrixToExcel(matrix: CoverageMatrix): ArrayBuffer {
	const wb = XLSX.utils.book_new();

	// Header row: ["Work Item", ...TC titles]
	const header = ["Work Item", ...matrix.columns.map((c) => c.testCaseTitle)];

	// Data rows
	const rows: (string | undefined)[][] = matrix.rows.map((row) => [
		row.workItemTitle,
		...row.cells.map((cell) => (cell.linked ? (cell.latestStatus ?? "—") : "—")),
	]);

	const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

	// Apply conditional fill to data cells
	matrix.rows.forEach((row, rIdx) => {
		row.cells.forEach((cell, cIdx) => {
			if (!cell.linked || !cell.latestStatus) return;
			const cellAddr = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx + 1 });
			const fill = STATUS_FILL[cell.latestStatus];
			if (fill && ws[cellAddr]) {
				ws[cellAddr].s = { fill: { patternType: "solid", ...fill } };
			}
		});
	});

	XLSX.utils.book_append_sheet(wb, ws, "Coverage Matrix");
	return XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true }) as ArrayBuffer;
}

// ─── PDF (HTML) export ────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
	Pass: "#c6efce",
	Fail: "#ffc7ce",
	Blocked: "#ffeb9c",
};

export function exportMatrixToPdf(matrix: CoverageMatrix): string {
	const headerCells = [
		`<th style="padding:6px 10px;border:1px solid #ccc;background:#f0f0f0">Work Item</th>`,
		...matrix.columns.map(
			(c) =>
				`<th style="padding:6px 10px;border:1px solid #ccc;background:#f0f0f0">${escHtml(c.testCaseTitle)}</th>`
		),
	].join("");

	const bodyRows = matrix.rows
		.map((row) => {
			const cells = [
				`<td style="padding:6px 10px;border:1px solid #ccc;font-weight:600">${escHtml(row.workItemTitle)}</td>`,
				...row.cells.map((cell) => {
					const text = cell.linked ? (cell.latestStatus ?? "—") : "—";
					const bg =
						cell.linked && cell.latestStatus ? (STATUS_BG[cell.latestStatus] ?? "#dbeafe") : "";
					const style = `padding:6px 10px;border:1px solid #ccc;text-align:center${bg ? `;background:${bg}` : ""}`;
					return `<td style="${style}">${escHtml(text)}</td>`;
				}),
			].join("");
			return `<tr>${cells}</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Coverage Matrix</title>
<style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}</style>
</head>
<body>
<h1>Requirements Coverage Matrix</h1>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`;
}

function escHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
