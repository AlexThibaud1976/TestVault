import type { GlobalStatus } from "@atconseil/argos-types";
import type {
	ITestExecutionService,
	IWorkItemLinkService,
	WorkItemLink,
} from "@atconseil/testvault-sdk";
import { Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface CoveragePanelProps {
	workItemId: number;
	linkService: IWorkItemLinkService;
	executionService: ITestExecutionService;
}

type CoverageRow = {
	link: WorkItemLink;
	latestStatus: GlobalStatus | null;
};

export function CoveragePanel({ workItemId, linkService, executionService }: CoveragePanelProps) {
	const [rows, setRows] = useState<CoverageRow[]>([]);
	const [loaded, setLoaded] = useState(false);

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

	if (rows.length === 0) {
		return (
			<div data-testid="coverage-panel" style={{ padding: "16px" }}>
				<div data-testid="coverage-empty" style={{ color: "#666" }}>
					No linked Test Cases.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="coverage-panel" style={{ padding: "16px" }}>
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
		</div>
	);
}
