import {
	parseCsv,
	parseCucumber,
	parseExcel,
	parseJUnit,
	parseNUnit,
	parseTestNG,
	parseXUnit,
} from "@atconseil/testvault-importers";
import type { ImportError, ImportResult, ParsedTestCase } from "@atconseil/testvault-importers";
import { Button, Text } from "@fluentui/react-components";
import { useRef, useState } from "react";

type Format = "CSV" | "Excel" | "JUnit" | "NUnit" | "xUnit" | "TestNG" | "Cucumber" | "Unknown";

type Step = "upload" | "preview";

function detectFormat(file: File, text: string): Format {
	const name = file.name.toLowerCase();
	if (name.endsWith(".csv")) return "CSV";
	if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "Excel";
	if (name.endsWith(".json")) return "Cucumber";
	if (name.endsWith(".xml")) {
		if (text.includes("<testsuites") || text.includes("<testsuite")) return "JUnit";
		if (text.includes("<test-run") || text.includes("<test-results")) return "NUnit";
		if (text.includes("<assemblies")) return "xUnit";
		if (text.includes("<testng-results")) return "TestNG";
	}
	return "Unknown";
}

async function parseSource(
	format: Format,
	text: string,
	buffer: ArrayBuffer
): Promise<ImportResult> {
	switch (format) {
		case "CSV":
			return parseCsv(text);
		case "Excel":
			return parseExcel(buffer);
		case "JUnit":
			return parseJUnit(text);
		case "NUnit":
			return parseNUnit(text);
		case "xUnit":
			return parseXUnit(text);
		case "TestNG":
			return parseTestNG(text);
		case "Cucumber":
			return parseCucumber(text);
		default:
			return { items: [], errors: [{ message: `Unsupported format: ${format}` }] };
	}
}

function downloadErrors(errors: ImportError[]): void {
	const lines = errors.map((e) => {
		const row = e.row != null ? `row ${e.row}: ` : "";
		const field = e.field ? `[${e.field}] ` : "";
		return `${row}${field}${e.message}`;
	});
	const blob = new Blob([lines.join("\n")], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "import-errors.txt";
	a.click();
	URL.revokeObjectURL(url);
}

export interface ImportWizardProps {
	onImport: (items: ParsedTestCase[]) => void;
}

export function ImportWizard({ onImport }: ImportWizardProps) {
	const [step, setStep] = useState<Step>("upload");
	const [items, setItems] = useState<ParsedTestCase[]>([]);
	const [errors, setErrors] = useState<ImportError[]>([]);
	const [format, setFormat] = useState<Format>("Unknown");
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function readText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	}

	function readBuffer(file: File): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as ArrayBuffer);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});
	}

	async function handleFile(file: File) {
		const text = await readText(file);
		const buffer = await readBuffer(file);
		const detected = detectFormat(file, text);
		const result = await parseSource(detected, text, buffer);
		setFormat(detected);
		setItems(result.items);
		setErrors(result.errors);
		setStep("preview");
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) void handleFile(file);
	}

	function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) void handleFile(file);
	}

	if (step === "preview") {
		return (
			<div data-testid="import-wizard" style={{ padding: "16px" }}>
				<div data-testid="preview-step">
					<div style={{ marginBottom: "12px", display: "flex", gap: "16px", alignItems: "center" }}>
						<Text weight="semibold">Format detected:</Text>
						<Text data-testid="detected-format">{format}</Text>
					</div>
					<div style={{ marginBottom: "12px", display: "flex", gap: "16px" }}>
						<Text>
							Items to import: <span data-testid="preview-count">{items.length}</span>
						</Text>
						{errors.length > 0 && (
							<Text style={{ color: "#d13438" }}>
								Errors: <span data-testid="error-count">{errors.length}</span>
							</Text>
						)}
					</div>

					{items.length > 0 && (
						<div
							style={{
								maxHeight: "240px",
								overflowY: "auto",
								border: "1px solid #e0e0e0",
								borderRadius: "4px",
								marginBottom: "12px",
							}}
						>
							<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
								<thead>
									<tr>
										<th
											style={{
												padding: "4px 8px",
												textAlign: "left",
												borderBottom: "1px solid #e0e0e0",
											}}
										>
											Title
										</th>
										<th
											style={{
												padding: "4px 8px",
												textAlign: "left",
												borderBottom: "1px solid #e0e0e0",
											}}
										>
											AutomationKey
										</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item, i) => (
										<tr key={`${item.title}-${i}`} data-testid={`preview-row-${i}`}>
											<td style={{ padding: "4px 8px", borderBottom: "1px solid #f5f5f5" }}>
												{item.title}
											</td>
											<td
												style={{
													padding: "4px 8px",
													borderBottom: "1px solid #f5f5f5",
													color: "#666",
												}}
											>
												{item.automationKey ?? "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<div style={{ display: "flex", gap: "8px" }}>
						<Button
							data-testid="back-button"
							appearance="secondary"
							onClick={() => {
								setStep("upload");
								setItems([]);
								setErrors([]);
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
						>
							Back
						</Button>
						<Button
							data-testid="confirm-import-button"
							appearance="primary"
							disabled={items.length === 0}
							onClick={() => onImport(items)}
						>
							Import {items.length} test case{items.length !== 1 ? "s" : ""}
						</Button>
						{errors.length > 0 && (
							<Button
								data-testid="download-errors-button"
								appearance="secondary"
								onClick={() => downloadErrors(errors)}
							>
								Download errors ({errors.length})
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div data-testid="import-wizard" style={{ padding: "16px" }}>
			<div
				data-testid="file-drop-zone"
				onDrop={onDrop}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				style={{
					border: `2px dashed ${dragging ? "#0078d4" : "#c8c8c8"}`,
					borderRadius: "8px",
					textAlign: "center",
					background: dragging ? "#f0f7ff" : "transparent",
				}}
			>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						width: "100%",
						padding: "40px",
					}}
				>
					<Text>Drop a file here or click to browse</Text>
					<br />
					<Text size={200} style={{ color: "#666" }}>
						Supported: CSV, Excel (.xlsx), JUnit/NUnit/xUnit/TestNG XML, Cucumber JSON
					</Text>
				</button>
				<input
					ref={fileInputRef}
					data-testid="file-input"
					type="file"
					style={{ display: "none" }}
					accept=".csv,.xlsx,.xls,.xml,.json"
					onChange={onFileChange}
				/>
			</div>
		</div>
	);
}
