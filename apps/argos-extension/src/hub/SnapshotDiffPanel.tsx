import type { StepDiffEntry, TestVaultTestCaseVersion } from "@atconseil/testvault-sdk";
import { diffSnapshots } from "@atconseil/testvault-sdk";
import { Text } from "@fluentui/react-components";
import { useMemo } from "react";

export interface SnapshotDiffPanelProps {
	before: TestVaultTestCaseVersion;
	after: TestVaultTestCaseVersion;
}

type StepRow = { key: string; testId: string; entry: StepDiffEntry };

function buildStepRows(steps: StepDiffEntry[]): StepRow[] {
	let counter = 0;
	return steps.map((entry) => {
		const pos = counter++;
		return {
			key: `step-${pos}`,
			testId: `diff-step-${entry.type}-${pos}`,
			entry,
		};
	});
}

export function SnapshotDiffPanel({ before, after }: SnapshotDiffPanelProps) {
	const diff = useMemo(() => diffSnapshots(before, after), [before, after]);
	const stepRows = useMemo(() => buildStepRows(diff.steps), [diff.steps]);

	const hasAnyChange =
		diff.title.changed ||
		diff.description.changed ||
		diff.tags.changed ||
		diff.steps.some((s) => s.type !== "equal");

	return (
		<div data-testid="diff-panel" style={{ padding: "16px", fontFamily: "monospace" }}>
			{!hasAnyChange && (
				<div data-testid="diff-no-changes" style={{ color: "#666" }}>
					No changes between these two versions.
				</div>
			)}

			{diff.title.changed && (
				<div data-testid="diff-title-changed" style={{ marginBottom: "12px" }}>
					<Text weight="semibold">Title</Text>
					<div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
						<div
							style={{ flex: 1, background: "#ffeef0", padding: "4px 6px", borderRadius: "3px" }}
						>
							<span style={{ color: "#cb2431" }}>− {diff.title.before}</span>
						</div>
						<div
							style={{ flex: 1, background: "#e6ffed", padding: "4px 6px", borderRadius: "3px" }}
						>
							<span style={{ color: "#22863a" }}>+ {diff.title.after}</span>
						</div>
					</div>
				</div>
			)}

			{diff.description.changed && (
				<div data-testid="diff-description-changed" style={{ marginBottom: "12px" }}>
					<Text weight="semibold">Description</Text>
					<div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
						<div
							style={{ flex: 1, background: "#ffeef0", padding: "4px 6px", borderRadius: "3px" }}
						>
							<span style={{ color: "#cb2431" }}>− {diff.description.before}</span>
						</div>
						<div
							style={{ flex: 1, background: "#e6ffed", padding: "4px 6px", borderRadius: "3px" }}
						>
							<span style={{ color: "#22863a" }}>+ {diff.description.after}</span>
						</div>
					</div>
				</div>
			)}

			{diff.tags.changed && (
				<div style={{ marginBottom: "12px" }}>
					<Text weight="semibold">Tags</Text>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
						{diff.tags.removed.map((t) => (
							<span
								key={t}
								data-testid={`diff-tag-removed-${t}`}
								style={{
									background: "#ffeef0",
									color: "#cb2431",
									padding: "2px 8px",
									borderRadius: "12px",
									fontSize: "12px",
								}}
							>
								− {t}
							</span>
						))}
						{diff.tags.added.map((t) => (
							<span
								key={t}
								data-testid={`diff-tag-added-${t}`}
								style={{
									background: "#e6ffed",
									color: "#22863a",
									padding: "2px 8px",
									borderRadius: "12px",
									fontSize: "12px",
								}}
							>
								+ {t}
							</span>
						))}
					</div>
				</div>
			)}

			{diff.steps.length > 0 && (
				<div>
					<Text weight="semibold">Steps</Text>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							marginTop: "8px",
							fontSize: "13px",
						}}
					>
						<thead>
							<tr>
								<th
									style={{
										width: "50%",
										textAlign: "left",
										padding: "4px 8px",
										borderBottom: "1px solid #e0e0e0",
									}}
								>
									Before
								</th>
								<th
									style={{
										width: "50%",
										textAlign: "left",
										padding: "4px 8px",
										borderBottom: "1px solid #e0e0e0",
									}}
								>
									After
								</th>
							</tr>
						</thead>
						<tbody>
							{stepRows.map(({ key, testId, entry }) => {
								if (entry.type === "equal") {
									return (
										<tr key={key} data-testid={testId}>
											<td style={{ padding: "4px 8px", verticalAlign: "top" }}>
												{entry.left.action}
											</td>
											<td style={{ padding: "4px 8px", verticalAlign: "top" }}>
												{entry.right.action}
											</td>
										</tr>
									);
								}
								if (entry.type === "removed") {
									return (
										<tr key={key} data-testid={testId} style={{ background: "#ffeef0" }}>
											<td style={{ padding: "4px 8px", color: "#cb2431", verticalAlign: "top" }}>
												− {entry.left.action}
											</td>
											<td />
										</tr>
									);
								}
								return (
									<tr key={key} data-testid={testId} style={{ background: "#e6ffed" }}>
										<td />
										<td style={{ padding: "4px 8px", color: "#22863a", verticalAlign: "top" }}>
											+ {entry.right.action}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
