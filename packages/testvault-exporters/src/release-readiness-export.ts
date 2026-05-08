import * as XLSX from "xlsx";
import type { ExportOptions, ReleaseReadinessReport } from "./types.js";

const STATUS_FILL: Record<string, { fgColor: { rgb: string } }> = {
	Pass: { fgColor: { rgb: "C6EFCE" } },
	Fail: { fgColor: { rgb: "FFC7CE" } },
	Blocked: { fgColor: { rgb: "FFEB9C" } },
	Unexecuted: { fgColor: { rgb: "DDDDDD" } },
};

const STATUS_BG: Record<string, string> = {
	Pass: "#c6efce",
	Fail: "#ffc7ce",
	Blocked: "#ffeb9c",
	Unexecuted: "#eeeeee",
};

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportReleaseReadinessToExcel(report: ReleaseReadinessReport): ArrayBuffer {
	const wb = XLSX.utils.book_new();
	const header = ["Test Case", "Status"];
	const rows = report.items.map((item) => [item.testCaseTitle, item.status]);
	const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

	// Bold header
	for (let c = 0; c < header.length; c++) {
		const addr = XLSX.utils.encode_cell({ r: 0, c });
		if (ws[addr]) ws[addr].s = { font: { bold: true } };
	}

	// Color status cells
	report.items.forEach((item, rIdx) => {
		const addr = XLSX.utils.encode_cell({ r: rIdx + 1, c: 1 });
		const fill = STATUS_FILL[item.status];
		if (fill && ws[addr]) {
			ws[addr].s = { fill: { patternType: "solid", ...fill } };
		}
	});

	XLSX.utils.book_append_sheet(wb, ws, "Release Readiness");
	return XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true }) as ArrayBuffer;
}

// ─── PDF (HTML) ───────────────────────────────────────────────────────────────

export function exportReleaseReadinessToPdf(
	report: ReleaseReadinessReport,
	options?: ExportOptions
): string {
	const title = options?.title ?? `Release Readiness — ${report.planTitle}`;
	const logoHtml = options?.logoDataUri
		? `<img src="${options.logoDataUri}" alt="Logo" style="height:48px;float:right">`
		: "";

	const total = report.items.length;
	const counts = countStatuses(report.items.map((i) => i.status));
	const passRate = total > 0 ? Math.round(((counts.Pass ?? 0) / total) * 100) : 0;

	const summaryHtml = `
<table style="border-collapse:collapse;margin-bottom:16px">
  <tr>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#f5f5f5">Total</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${total}</td>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#c6efce">Pass</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${counts.Pass}</td>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#ffc7ce">Fail</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${counts.Fail}</td>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#ffeb9c">Blocked</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${counts.Blocked}</td>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#eeeeee">Unexecuted</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${counts.Unexecuted}</td>
    <td style="padding:4px 12px;border:1px solid #ddd;background:#f5f5f5">Pass rate</td>
    <td style="padding:4px 12px;border:1px solid #ddd;font-weight:bold">${passRate}%</td>
  </tr>
</table>`;

	const rows = report.items
		.map((item, i) => {
			const bg = STATUS_BG[item.status] ?? "#ffffff";
			return `
<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9f9f9"}">
  <td style="padding:6px 10px;border:1px solid #ddd">${escHtml(item.testCaseTitle)}</td>
  <td style="padding:6px 10px;border:1px solid #ddd;background:${bg};text-align:center">${escHtml(item.status)}</td>
</tr>`;
		})
		.join("\n");

	const envLine = report.environment
		? `<p style="color:#555;margin:0 0 12px">Environment: <b>${escHtml(report.environment)}</b></p>`
		: "";

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body{font-family:sans-serif;font-size:12px;margin:24px}
  table.main{border-collapse:collapse;width:100%}
  th{background:#0078d4;color:#fff;padding:6px 10px;border:1px solid #005a9e;text-align:left}
  h1{margin:0 0 8px}
</style>
</head>
<body>
${logoHtml}
<h1>${escHtml(title)}</h1>
${envLine}
${summaryHtml}
<table class="main">
<thead><tr><th>Test Case</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function countStatuses(statuses: string[]): Record<string, number> {
	const counts: Record<string, number> = { Pass: 0, Fail: 0, Blocked: 0, Unexecuted: 0 };
	for (const s of statuses) {
		counts[s] = (counts[s] ?? 0) + 1;
	}
	return counts;
}

function escHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
