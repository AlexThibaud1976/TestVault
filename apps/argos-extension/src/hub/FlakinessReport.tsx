import { Button, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface FlakinessEntry {
	testCaseId: number;
	testCaseTitle: string;
	score: number;
	runsAnalyzed: number;
	knownFlaky: boolean;
	recommendation: string;
}

export interface IFlakinessReportService {
	getReport(): Promise<FlakinessEntry[]>;
	markKnownFlaky(testCaseId: number): Promise<void>;
}

export interface FlakinessReportProps {
	service: IFlakinessReportService;
}

export function FlakinessReport({ service }: FlakinessReportProps) {
	const [entries, setEntries] = useState<FlakinessEntry[] | null>(null);
	const [marking, setMarking] = useState<Set<number>>(new Set());

	useEffect(() => {
		service.getReport().then(setEntries);
	}, [service]);

	async function handleMarkFlaky(id: number) {
		setMarking((prev) => new Set(prev).add(id));
		try {
			await service.markKnownFlaky(id);
			setEntries((prev) => prev?.filter((e) => e.testCaseId !== id) ?? null);
		} finally {
			setMarking((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	}

	if (entries === null) {
		return <div data-testid="flakiness-loading">Loading…</div>;
	}

	if (entries.length === 0) {
		return <div data-testid="flakiness-empty">No flaky tests detected.</div>;
	}

	return (
		<div style={{ padding: "24px", maxWidth: "640px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				Flakiness Report
			</Text>
			<ul style={{ listStyle: "none", padding: 0 }}>
				{entries.map((e) => (
					<li
						key={e.testCaseId}
						data-testid={`flakiness-entry-${e.testCaseId}`}
						style={{
							border: "1px solid #e0e0e0",
							borderRadius: "4px",
							padding: "10px 12px",
							marginBottom: "6px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<div style={{ flex: 1 }}>
							<Text block size={300} weight="semibold">
								{e.testCaseTitle}
							</Text>
							<Text block size={200} style={{ color: "#666" }}>
								Score: {e.score} · {e.runsAnalyzed} runs · {e.recommendation}
							</Text>
						</div>
						<Button
							size="small"
							data-testid={`mark-flaky-${e.testCaseId}`}
							disabled={marking.has(e.testCaseId)}
							onClick={() => handleMarkFlaky(e.testCaseId)}
						>
							Mark Known Flaky
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
