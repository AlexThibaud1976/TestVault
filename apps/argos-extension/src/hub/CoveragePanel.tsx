import type {
	ITestExecutionService,
	IWorkItemLinkService,
	WorkItemLink,
} from "@atconseil/argos-sdk";
import type { GlobalStatus } from "@atconseil/argos-types";
import { Text } from "@fluentui/react-components";
import { useState } from "react";
import { useEffect } from "react";
import {
	AiSuggestTestsModal,
	type AiSuggestTestsSourceWorkItem,
} from "./components/AiSuggestTestsModal.js";
import { Button } from "./design-system/index.js";

const AI_ELIGIBLE_TYPES = new Set(["User Story", "Bug", "Requirement"]);

export interface CoveragePanelProps {
	workItemId: number;
	linkService: IWorkItemLinkService;
	executionService: ITestExecutionService;
	// Sprint 2.22 T-2.22.3: drives visibility of the "Suggest Tests" button
	// in the panel header. Provided by the widget entry from the ADO
	// work-item-form service. When undefined or not in
	// {User Story, Bug, Requirement}, the button is hidden (e.g. Test Case).
	workItemType?: string;
	// Optional context passed to the AI modal. The widget entry fills it
	// from the work-item-form service; not required for the button to render.
	workItemTitle?: string;
	workItemDescription?: string;
	workItemAcceptanceCriteria?: string;
	workItemAreaPath?: string;
	workItemIterationPath?: string;
}

type CoverageRow = {
	link: WorkItemLink;
	latestStatus: GlobalStatus | null;
};

export function CoveragePanel({
	workItemId,
	linkService,
	executionService,
	workItemType,
	workItemTitle,
	workItemDescription,
	workItemAcceptanceCriteria,
	workItemAreaPath,
	workItemIterationPath,
}: CoveragePanelProps) {
	const [rows, setRows] = useState<CoverageRow[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [aiModalOpen, setAiModalOpen] = useState(false);

	useEffect(() => {
		void (async () => {
			const links = await linkService.listLinks(workItemId);
			const coverageRows = await Promise.all(
				links.map(async (link) => {
					const page = await executionService.listExecutions({
						testCaseId: link.targetId,
						pageSize: 1,
					});
					return {
						link,
						latestStatus: page.items[0]?.globalStatus ?? null,
					};
				})
			);
			setRows(coverageRows);
			setLoaded(true);
		})();
	}, [linkService, executionService, workItemId]);

	if (!loaded) return null;

	const showSuggestTests = !!workItemType && AI_ELIGIBLE_TYPES.has(workItemType);

	const sourceWorkItem: AiSuggestTestsSourceWorkItem | null = showSuggestTests
		? {
				id: workItemId,
				type: workItemType ?? "",
				title: workItemTitle,
				description: workItemDescription,
				acceptanceCriteria: workItemAcceptanceCriteria,
				areaPath: workItemAreaPath,
				iterationPath: workItemIterationPath,
			}
		: null;

	function renderHeader() {
		if (!showSuggestTests) return null;
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					marginBottom: "12px",
				}}
			>
				<Button
					variant="secondary"
					size="small"
					onClick={() => setAiModalOpen(true)}
					data-testid="suggest-tests-button"
				>
					✨ Suggest Tests
				</Button>
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div data-testid="coverage-panel" style={{ padding: "16px" }}>
				{renderHeader()}
				<div data-testid="coverage-empty" style={{ color: "#666" }}>
					No linked Test Cases.
				</div>

				{aiModalOpen && sourceWorkItem && (
					<AiSuggestTestsModal
						sourceWorkItem={sourceWorkItem}
						onClose={() => setAiModalOpen(false)}
						onCreated={() => {
							setAiModalOpen(false);
						}}
					/>
				)}
			</div>
		);
	}

	return (
		<div data-testid="coverage-panel" style={{ padding: "16px" }}>
			{renderHeader()}
			<Text weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Coverage
			</Text>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Test Case
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Link Type
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Latest Status
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ link, latestStatus }) => (
						<tr
							key={`${link.targetId}-${link.linkType}`}
							data-testid={`coverage-row-${link.targetId}`}
							style={{ borderBottom: "1px solid #f0f0f0" }}
						>
							<td style={{ padding: "6px" }}>#{link.targetId}</td>
							<td style={{ padding: "6px", fontSize: "12px", color: "#666" }}>
								{link.linkType.replace("TestVault.", "")}
							</td>
							<td style={{ padding: "6px" }}>{latestStatus ?? "No executions"}</td>
						</tr>
					))}
				</tbody>
			</table>

			{aiModalOpen && sourceWorkItem && (
				<AiSuggestTestsModal
					sourceWorkItem={sourceWorkItem}
					onClose={() => setAiModalOpen(false)}
					onCreated={() => {
						setAiModalOpen(false);
						setRefreshNonce((n) => n + 1);
					}}
				/>
			)}
		</div>
	);
}
