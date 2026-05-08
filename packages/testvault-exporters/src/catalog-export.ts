import * as XLSX from "xlsx";
import type { CatalogItem, ExportOptions } from "./types.js";

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportCatalogToExcel(items: CatalogItem[]): ArrayBuffer {
	const wb = XLSX.utils.book_new();
	const header = ["Title", "Description", "Tags", "AutomationKey", "Steps"];
	const rows = items.map((item) => [
		item.title,
		item.description ?? "",
		(item.tags ?? []).join("; "),
		item.automationKey ?? "",
		(item.steps ?? []).map((s) => `${s.action} → ${s.expected}`).join(" | "),
	]);
	const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
	// Bold header row
	for (let c = 0; c < header.length; c++) {
		const addr = XLSX.utils.encode_cell({ r: 0, c });
		if (ws[addr]) ws[addr].s = { font: { bold: true } };
	}
	XLSX.utils.book_append_sheet(wb, ws, "Test Case Catalog");
	return XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true }) as ArrayBuffer;
}

// ─── PDF (HTML) ───────────────────────────────────────────────────────────────

export function exportCatalogToPdf(items: CatalogItem[], options?: ExportOptions): string {
	const title = options?.title ?? "Test Case Catalog";
	const logoHtml = options?.logoDataUri
		? `<img src="${options.logoDataUri}" alt="Logo" style="height:48px;float:right">`
		: "";

	const rows = items
		.map((item, i) => {
			const tags = (item.tags ?? []).join(", ");
			const stepsHtml =
				item.steps && item.steps.length > 0
					? `<ol style="margin:4px 0;padding-left:16px">${item.steps.map((s) => `<li><b>${escHtml(s.action)}</b> → ${escHtml(s.expected)}</li>`).join("")}</ol>`
					: "";
			return `
<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9f9f9"}">
  <td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;white-space:nowrap">${escHtml(item.title)}</td>
  <td style="padding:6px 10px;border:1px solid #ddd">${escHtml(item.description ?? "")}</td>
  <td style="padding:6px 10px;border:1px solid #ddd;white-space:nowrap">${escHtml(tags)}</td>
  <td style="padding:6px 10px;border:1px solid #ddd;font-size:10px;color:#555">${escHtml(item.automationKey ?? "")}</td>
  <td style="padding:6px 10px;border:1px solid #ddd">${stepsHtml}</td>
</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body{font-family:sans-serif;font-size:12px;margin:24px}
  table{border-collapse:collapse;width:100%}
  th{background:#0078d4;color:#fff;padding:6px 10px;border:1px solid #005a9e;text-align:left}
  h1{margin:0 0 16px}
</style>
</head>
<body>
${logoHtml}
<h1>${escHtml(title)}</h1>
<table>
<thead>
<tr>
  <th>Title</th><th>Description</th><th>Tags</th><th>Automation Key</th><th>Steps</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

function escHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
