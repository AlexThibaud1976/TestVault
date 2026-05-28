import type {
	ITestExecutionService,
	IWorkItemLinkService,
	WorkItemLink,
} from "@atconseil/argos-sdk";
import type { GlobalStatus, TestVaultTestCase } from "@atconseil/argos-types";
import { Text } from "@fluentui/react-components";
import { useContext, useEffect, useState } from "react";
import { AreaPathPicker } from "./components/AreaPathPicker.js";
import { IterationPathPicker } from "./components/IterationPathPicker.js";
import { LlmConfigStatus } from "./components/LlmConfigStatus.js";
import { SuggestTestsDrawer } from "./components/SuggestTestsDrawer/index.js";
import { useArgosToast } from "./components/Toast.js";
import { Button, Select } from "./design-system/index.js";
import { useAiGeneration } from "./hooks/use-ai-generation.js";
import { useLlmConfig } from "./hooks/use-llm-config.js";
import type { TestCaseSuggestion } from "./llm/llm-provider.js";
import { ServicesContext, useServices } from "./services-context.js";

const AI_ELIGIBLE_TYPES = new Set(["User Story", "Bug", "Requirement"]);

// Sprint 2.21 part 3 -- source work item context for the AI Suggest Tests
// flow. Inlined here (TECH-DEBT-T2213-B sprint, 2026-05-28) so the
// dead AiSuggestTestsModal component that originally defined this type
// can be deleted without breaking CoveragePanelSuggestTestsFlow's props.
export interface AiSuggestTestsSourceWorkItem {
	id: number;
	type: string;
	title?: string;
	description?: string;
	acceptanceCriteria?: string;
	areaPath?: string;
	iterationPath?: string;
}

const COUNT_OPTIONS = [
	{ value: "3", label: "3 test cases" },
	{ value: "5", label: "5 test cases" },
	{ value: "7", label: "7 test cases" },
	{ value: "10", label: "10 test cases" },
];

export interface CoveragePanelProps {
	workItemId: number;
	linkService: IWorkItemLinkService;
	executionService: ITestExecutionService;
	// Sprint 2.22 T-2.22.3: drives visibility of the "Suggest Tests" button
	// in the panel header. Provided by the widget entry from the ADO
	// work-item-form service. When undefined or not in
	// {User Story, Bug, Requirement}, the button is hidden (e.g. Test Case).
	workItemType?: string;
	// Optional context passed to the AI drawer. The widget entry fills it
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
	// Sprint 2.22 -- enriched display. When ServicesContext is available
	// the panel hydrates each row via testCaseService.read; otherwise the
	// hydration stays null and the panel falls back to the minimal id-only
	// display (kept for the basic CoveragePanel tests that render without
	// a Provider).
	tc: TestVaultTestCase | null;
};

const PRIORITY_LABELS: Record<1 | 2 | 3 | 4, string> = {
	1: "P1",
	2: "P2",
	3: "P3",
	4: "P4",
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
	const [drawerOpen, setDrawerOpen] = useState(false);
	// useContext, not useServices: useServices throws when no provider is
	// mounted (basic CoveragePanel tests render without one). useContext
	// returns null which lets us gracefully skip the enrichment step.
	const services = useContext(ServicesContext);
	const tcReader = services?.testCaseService;

	useEffect(() => {
		void (async () => {
			const links = await linkService.listLinks(workItemId);
			const coverageRows = await Promise.all(
				links.map(async (link) => {
					const page = await executionService.listExecutions({
						testCaseId: link.targetId,
						pageSize: 1,
					});
					const tc = tcReader ? await tcReader.read(link.targetId).catch(() => null) : null;
					return {
						link,
						latestStatus: page.items[0]?.globalStatus ?? null,
						tc,
					};
				})
			);
			setRows(coverageRows);
			setLoaded(true);
		})();
	}, [linkService, executionService, workItemId, tcReader]);

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
					onClick={() => setDrawerOpen(true)}
					data-testid="suggest-tests-button"
				>
					✨ Suggest Tests
				</Button>
			</div>
		);
	}

	const drawer = sourceWorkItem ? (
		<CoveragePanelSuggestTestsFlow
			isOpen={drawerOpen}
			sourceWorkItem={sourceWorkItem}
			onDismiss={() => setDrawerOpen(false)}
		/>
	) : null;

	if (rows.length === 0) {
		return (
			<div data-testid="coverage-panel" style={{ padding: "16px" }}>
				{renderHeader()}
				<div data-testid="coverage-empty" style={{ color: "#666" }}>
					No linked Test Cases.
				</div>
				{drawer}
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
							State
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Priority
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Steps
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Assigned
						</th>
						<th style={{ textAlign: "left", padding: "6px", borderBottom: "1px solid #e0e0e0" }}>
							Latest Status
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ link, latestStatus, tc }) => (
						<tr
							key={`${link.targetId}-${link.linkType}`}
							data-testid={`coverage-row-${link.targetId}`}
							style={{ borderBottom: "1px solid #f0f0f0" }}
						>
							<td style={{ padding: "6px" }}>
								<span data-testid={`coverage-row-title-${link.targetId}`}>
									{tc ? `#${link.targetId} -- ${tc.title}` : `#${link.targetId}`}
								</span>
							</td>
							<td style={{ padding: "6px", fontSize: "12px", color: "#444" }}>
								{tc ? tc.state : "-"}
							</td>
							<td style={{ padding: "6px", fontSize: "12px", color: "#444" }}>
								{tc ? PRIORITY_LABELS[tc.priority] : "-"}
							</td>
							<td style={{ padding: "6px", fontSize: "12px", color: "#444" }}>
								{tc ? `${tc.steps.length} step${tc.steps.length === 1 ? "" : "s"}` : "-"}
							</td>
							<td style={{ padding: "6px", fontSize: "12px", color: "#444" }}>
								{tc?.assignedTo ?? "-"}
							</td>
							<td style={{ padding: "6px" }}>{latestStatus ?? "No executions"}</td>
						</tr>
					))}
				</tbody>
			</table>
			{drawer}
		</div>
	);
}

interface CoveragePanelSuggestTestsFlowProps {
	isOpen: boolean;
	sourceWorkItem: AiSuggestTestsSourceWorkItem;
	onDismiss: () => void;
}

// Sprint 2.21 part 3 -- multi-step Drawer orchestration. Kept in a sub
// component so the parent CoveragePanel can be rendered in unit tests
// without wiring ServicesContext / ToastProvider when workItemType is
// not in the AI-eligible set.
function CoveragePanelSuggestTestsFlow({
	isOpen,
	sourceWorkItem,
	onDismiss,
}: CoveragePanelSuggestTestsFlowProps) {
	const { testCaseService, workItemLinkService, project } = useServices();
	const { config, isLoading: isLoadingConfig } = useLlmConfig();
	const { suggestions, isLoading: isGenerating, generate, reset } = useAiGeneration();
	const toast = useArgosToast();

	const [targetCount, setTargetCount] = useState("5");
	const [areaPath, setAreaPath] = useState(sourceWorkItem.areaPath ?? "");
	const [iterationPath, setIterationPath] = useState(sourceWorkItem.iterationPath ?? "");
	const [error, setError] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (!isOpen) {
			reset();
			setError(undefined);
		}
	}, [isOpen, reset]);

	async function handleGenerate() {
		if (!config) return;
		setError(undefined);
		try {
			await generate(config, {
				sourceWorkItem: {
					id: sourceWorkItem.id,
					type: sourceWorkItem.type,
					title: sourceWorkItem.title ?? `${sourceWorkItem.type} #${sourceWorkItem.id}`,
					description: sourceWorkItem.description ?? "",
					acceptanceCriteria: sourceWorkItem.acceptanceCriteria,
				},
				targetCount: Number(targetCount),
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed");
		}
	}

	async function handleAccept(accepted: TestCaseSuggestion[]) {
		try {
			const created: number[] = [];
			for (const s of accepted) {
				const tc = await testCaseService.create({
					title: s.title,
					areaPath: areaPath.trim(),
					iterationPath: iterationPath.trim() || undefined,
					description: s.description || undefined,
					priority: s.priority === "P1" ? 1 : s.priority === "P2" ? 2 : s.priority === "P3" ? 3 : 4,
					tags: s.tags.length > 0 ? s.tags : undefined,
					steps: s.steps.map((step, i) => ({
						index: i + 1,
						action: step.action,
						expected: step.expected,
					})),
				});
				created.push(tc.id);
			}
			for (const tcId of created) {
				await workItemLinkService
					.addLink(tcId, sourceWorkItem.id, "TestVault.TestedBy")
					.catch(() => {});
			}
			toast.success(
				`${created.length} test case${created.length !== 1 ? "s" : ""} created from ${sourceWorkItem.type} #${sourceWorkItem.id}`
			);
			onDismiss();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toast.error(`Failed to create test cases: ${msg}`);
			setError(msg);
		}
	}

	const areaPathReady = areaPath.trim().length > 0;
	const sourceLabel = `Source: ${sourceWorkItem.type} #${sourceWorkItem.id}${
		sourceWorkItem.title ? ` -- ${sourceWorkItem.title}` : ""
	}`;

	const selectPhaseSlot = (
		<div>
			<div style={{ marginBottom: 12 }}>
				<LlmConfigStatus config={config} isLoading={isLoadingConfig} />
			</div>

			<div style={{ marginBottom: 12 }}>
				<label
					htmlFor="suggest-tests-count"
					style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}
				>
					Number of test cases:
				</label>
				<Select
					id="suggest-tests-count"
					value={targetCount}
					onChange={(e) => setTargetCount(e.target.value)}
					options={COUNT_OPTIONS}
				/>
			</div>

			<div style={{ marginBottom: 12 }}>
				<label
					htmlFor="suggest-tests-area-path"
					style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}
				>
					Area Path <span style={{ color: "#c62828" }}>*</span>
				</label>
				<AreaPathPicker
					id="suggest-tests-area-path"
					value={areaPath}
					onChange={setAreaPath}
					projectId={project}
					required
				/>
			</div>

			<div style={{ marginBottom: 16 }}>
				<label
					htmlFor="suggest-tests-iteration-path"
					style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}
				>
					Iteration Path <span style={{ color: "#666" }}>(optional)</span>
				</label>
				<IterationPathPicker
					id="suggest-tests-iteration-path"
					value={iterationPath}
					onChange={setIterationPath}
					projectId={project}
				/>
			</div>

			{!config && !isLoadingConfig && (
				<div
					style={{ color: "#c62828", fontSize: 12, marginBottom: 12 }}
					data-testid="no-config-warning"
				>
					AI is not configured. Go to Settings to add your LLM credentials.
				</div>
			)}

			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<Button
					variant="primary"
					onClick={() => void handleGenerate()}
					disabled={!config || !areaPathReady || isGenerating}
					data-testid="suggest-tests-generate"
				>
					Generate suggestions
				</Button>
			</div>
		</div>
	);

	return (
		<SuggestTestsDrawer
			isOpen={isOpen}
			suggestions={suggestions.length > 0 ? suggestions : undefined}
			isGenerating={isGenerating}
			selectPhaseSlot={selectPhaseSlot}
			sourceLabel={sourceLabel}
			errorMessage={error}
			onAccept={handleAccept}
			onDismiss={onDismiss}
		/>
	);
}
