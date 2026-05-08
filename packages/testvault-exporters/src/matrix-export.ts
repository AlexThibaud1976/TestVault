import type { CoverageMatrix } from "@atconseil/testvault-sdk";
import ExcelJS from "exceljs";

// ARGB format: FF + RGB (e.g. FFC6EFCE = opaque green)
const STATUS_ARGB: Record<string, string> = {
	Pass: "FFC6EFCE",
	Fail: "FFFFC7CE",
	Blocked: "FFFFEB9C",
};

// ─── Excel export ─────────────────────────────────────────────────────────────

export async function exportMatrixToExcel(matrix: CoverageMatrix): Promise<Uint8Array> {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Coverage Matrix");

	ws.addRow(["Work Item", ...matrix.columns.map((c) => c.testCaseTitle)]);

	for (const row of matrix.rows) {
		const dataRow = ws.addRow([
			row.workItemTitle,
			...row.cells.map((cell) => (cell.linked ? (cell.latestStatus ?? "—") : "—")),
		]);
		row.cells.forEach((cell, cIdx) => {
			if (!cell.linked || !cell.latestStatus) return;
			const argb = STATUS_ARGB[cell.latestStatus];
			if (!argb) return;
			// +2: 1-based column index, offset by the leading "Work Item" column
			dataRow.getCell(cIdx + 2).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb },
			};
		});
	}

	const raw = await wb.xlsx.writeBuffer();
	return raw as unknown as Uint8Array;
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
