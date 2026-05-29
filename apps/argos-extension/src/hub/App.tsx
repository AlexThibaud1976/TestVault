import type { MatrixInput } from "@atconseil/argos-sdk";
import type { TestVaultTestCase } from "@atconseil/argos-types";
import {
	Button,
	FluentProvider,
	Spinner,
	Tab,
	TabList,
	Text,
	webLightTheme,
} from "@fluentui/react-components";
import * as SDK from "azure-devops-extension-sdk";
import { useEffect, useState } from "react";
import { AiCandidatesModal } from "./AiCandidatesModal.js";
import type { TcCandidate } from "./AiCandidatesModal.js";
import { AuditLogSettings } from "./AuditLogSettings.js";
import { BetaOptIn } from "./BetaOptIn.js";
import { CoverageMatrix } from "./CoverageMatrix.js";
import { EnvironmentSettings } from "./EnvironmentSettings.js";
import { ExecutionHistory } from "./ExecutionHistory.js";
import { FlakinessReport } from "./FlakinessReport.js";
import { GherkinEditor } from "./GherkinEditor.js";
import { ImportWizard } from "./ImportWizard.js";
import { LlmProviderSettings } from "./LlmProviderSettings.js";
import { OfflineBanner } from "./OfflineBanner.js";
import { PreconditionForm } from "./PreconditionForm.js";
import { QuotaSettings } from "./QuotaSettings.js";
import { RepoMappingSettings } from "./RepoMappingSettings.js";
import { RunInterface } from "./RunInterface.js";
import { SnapshotPanel } from "./SnapshotPanel.js";
import { TestCaseForm } from "./TestCaseForm.js";
import { TestPlanForm } from "./TestPlanForm.js";
import { TestSetForm } from "./TestSetForm.js";
import { WebhookAdmin } from "./WebhookAdmin.js";
import { WorkItemLinkPanel } from "./WorkItemLinkPanel.js";
import { ToastProvider } from "./components/Toast.js";
import "./design-system/tokens.css";
import { type ArgosView, sidebarKeyForView, useArgosRouting } from "./hooks/use-argos-routing.js";
import { InstallationContext, useInstallationContext } from "./installation-context.js";
import { ServicesProvider, useServices } from "./services-context.js";
import { AppShell } from "./views/AppShell.js";
import { AuditLogListView } from "./views/AuditLogListView.js";
import { GetStartedView } from "./views/GetStartedView.js";
import { LimitedModeBanner } from "./views/LimitedModeBanner.js";
import { PreconditionFormView } from "./views/PreconditionFormView.js";
import { PreconditionsListView } from "./views/PreconditionsListView.js";
import { SettingsView as SettingsViewPage } from "./views/SettingsView.js";
import { Sidebar } from "./views/Sidebar.js";
import { TestCaseFormView } from "./views/TestCaseFormView.js";
import { TestCaseVersionsListView } from "./views/TestCaseVersionsListView.js";
import { TestCasesListView } from "./views/TestCasesListView.js";
import { TestExecutionFormView } from "./views/TestExecutionFormView.js";
import { TestExecutionsListView } from "./views/TestExecutionsListView.js";
import { TestSetFormView } from "./views/TestSetFormView.js";
import { TestSetsListView } from "./views/TestSetsListView.js";
import { TestPlanFormView } from "./views/test-plans/TestPlanFormView.js";
import { TestPlansListView } from "./views/test-plans/TestPlansListView.js";

// Sprint 2.18.3: single hub — always open on Test Plans list
const DEFAULT_INITIAL_VIEW: ArgosView = { kind: "test-plans-list" };

function getInitialView(): ArgosView {
	return DEFAULT_INITIAL_VIEW;
}

const PLACEHOLDER_MATRIX_INPUT: MatrixInput = {
	workItems: [],
	testCases: [],
	links: [],
	executions: [],
};

const PLACEHOLDER_TEST_CASE: TestVaultTestCase = {
	id: 0,
	title: "",
	description: "",
	state: "Design",
	areaPath: "",
	iterationPath: "",
	tags: [],
	steps: [],
	priority: 2,
	automationStatus: "Manual",
	preconditionLinks: [],
	createdBy: "",
	createdAt: new Date(0).toISOString(),
	modifiedBy: "",
	modifiedAt: new Date(0).toISOString(),
};

function RunTab() {
	const { testExecutionService, evidenceUploadService, bugCreationService } = useServices();
	return (
		<RunInterface
			testCase={PLACEHOLDER_TEST_CASE}
			testPlanId={0}
			availableEnvironments={[]}
			executionService={testExecutionService}
			uploadService={evidenceUploadService}
			bugService={bugCreationService}
		/>
	);
}

function SnapshotTab() {
	const { testCaseVersionService } = useServices();
	return (
		<div>
			<SnapshotPanel testCase={PLACEHOLDER_TEST_CASE} service={testCaseVersionService} />
			<div data-testid="snapshot-diff-panel" />
		</div>
	);
}

export function PlansView() {
	const { testPlanService, project } = useServices();
	const { canCreate } = useInstallationContext();
	const [tab, setTab] = useState<"details" | "run" | "snapshots">("details");
	const [importOpen, setImportOpen] = useState(false);
	return (
		<div data-testid="view-plans">
			<div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
				<Text as="h2" size={500} weight="semibold" block style={{ flex: 1, marginBottom: 0 }}>
					Test Plans
				</Text>
				<Button appearance="primary" onClick={() => setImportOpen(true)}>
					Import
				</Button>
			</div>
			<TabList
				selectedValue={tab}
				onTabSelect={(_, d) => setTab(d.value as "details" | "run" | "snapshots")}
				style={{ marginBottom: "16px" }}
			>
				<Tab value="details">Plan Details</Tab>
				<Tab value="run">Run</Tab>
				<Tab value="snapshots">Snapshots</Tab>
			</TabList>
			<fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0 }}>
				{tab === "details" && <TestPlanForm service={testPlanService} project={project} />}
				{tab === "run" && <RunTab />}
				{tab === "snapshots" && <SnapshotTab />}
			</fieldset>
			{importOpen && (
				<div data-testid="import-wizard-dialog">
					<ImportWizard onImport={() => setImportOpen(false)} />
				</div>
			)}
		</div>
	);
}

type CasesTab = "details" | "executions" | "traceability" | "gherkin";

export function CasesView() {
	const { testCaseService, testExecutionService, workItemLinkService, project } = useServices();
	const { canCreate } = useInstallationContext();
	const [tab, setTab] = useState<CasesTab>("details");
	const [aiOpen, setAiOpen] = useState(false);
	const [aiCandidates] = useState<TcCandidate[]>([]);
	const [gherkinValue, setGherkinValue] = useState(PLACEHOLDER_TEST_CASE.gherkin ?? "");
	return (
		<div data-testid="view-cases">
			<div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
				<Text as="h2" size={500} weight="semibold" block style={{ flex: 1, marginBottom: 0 }}>
					Test Cases
				</Text>
				<Button onClick={() => setAiOpen(true)}>AI Suggest</Button>
			</div>
			<TabList
				selectedValue={tab}
				onTabSelect={(_, d) => setTab(d.value as CasesTab)}
				style={{ marginBottom: "16px" }}
			>
				<Tab value="details">Case Details</Tab>
				<Tab value="executions">Executions</Tab>
				<Tab value="traceability">Traceability</Tab>
				<Tab value="gherkin">Gherkin</Tab>
			</TabList>
			<fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0 }}>
				{tab === "details" && <TestCaseForm service={testCaseService} project={project} />}
				{tab === "executions" && (
					<ExecutionHistory
						testCaseId={0}
						executionService={testExecutionService}
						availableEnvironments={[]}
					/>
				)}
				{tab === "traceability" && (
					<WorkItemLinkPanel testCaseId={0} service={workItemLinkService} />
				)}
				{tab === "gherkin" && <GherkinEditor value={gherkinValue} onChange={setGherkinValue} />}
			</fieldset>
			{aiOpen && (
				<div data-testid="ai-candidates-dialog">
					<AiCandidatesModal
						candidates={aiCandidates}
						quotaRemaining={100}
						onAccept={() => setAiOpen(false)}
						onCancel={() => setAiOpen(false)}
					/>
				</div>
			)}
		</div>
	);
}

export function SetsView() {
	const { testSetService, project } = useServices();
	const { canCreate } = useInstallationContext();
	return (
		<div data-testid="view-sets">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Sets
			</Text>
			<fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0 }}>
				<TestSetForm service={testSetService} project={project} />
			</fieldset>
		</div>
	);
}

export function PreconditionsView() {
	const { preconditionService, project } = useServices();
	const { canCreate } = useInstallationContext();
	return (
		<div data-testid="view-preconditions">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Preconditions
			</Text>
			<fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0 }}>
				<PreconditionForm service={preconditionService} project={project} />
			</fieldset>
		</div>
	);
}

export function ReportsView() {
	const { flakinessReportService } = useServices();
	const [tab, setTab] = useState<"coverage" | "flakiness">("coverage");
	return (
		<div data-testid="view-reports">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Reports
			</Text>
			<TabList
				selectedValue={tab}
				onTabSelect={(_, d) => setTab(d.value as "coverage" | "flakiness")}
				style={{ marginBottom: "16px" }}
			>
				<Tab value="coverage">Coverage</Tab>
				<Tab value="flakiness">Flakiness</Tab>
			</TabList>
			{tab === "coverage" && <CoverageMatrix input={PLACEHOLDER_MATRIX_INPUT} />}
			{tab === "flakiness" && <FlakinessReport service={flakinessReportService} />}
		</div>
	);
}

export function SettingsView() {
	const {
		llmProviderService,
		environmentConfigService,
		webhookAdminService,
		auditLogService,
		repoMappingService,
		betaFlagService,
		quotaSettingsService,
	} = useServices();
	return (
		<div data-testid="view-settings">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Settings
			</Text>
			<LlmProviderSettings service={llmProviderService} isAdmin={true} />
			<EnvironmentSettings service={environmentConfigService} isAdmin={true} />
			<WebhookAdmin service={webhookAdminService} />
			<AuditLogSettings service={auditLogService} isAdmin={true} />
			<RepoMappingSettings service={repoMappingService} isAdmin={true} />
			<QuotaSettings service={quotaSettingsService} isAdmin={true} />
			<BetaOptIn service={betaFlagService} />
		</div>
	);
}

function ComingSoonView({ title, sprint }: { title: string; sprint: string }) {
	return (
		<div
			style={{
				padding: "var(--s-9)",
				textAlign: "center",
				color: "var(--neutral-7)",
			}}
		>
			<div
				style={{
					fontSize: "var(--t-h2)",
					fontWeight: 600,
					color: "var(--neutral-9)",
					marginBottom: "var(--s-3)",
				}}
			>
				{title}
			</div>
			<div style={{ fontSize: "var(--t-body)" }}>
				Coming in Sprint {sprint}. Test Plans is the design system POC — other WIT follow the same
				patterns.
			</div>
		</div>
	);
}

function RouteRenderer({
	view,
	routing,
}: {
	view: ArgosView;
	routing: ReturnType<typeof useArgosRouting>;
}) {
	switch (view.kind) {
		case "test-plans-list":
			return (
				<TestPlansListView
					onCreateNew={() => routing.goToTestPlanForm()}
					onEditPlan={(planId) => routing.goToTestPlanForm(planId)}
				/>
			);
		case "test-plans-form":
			return (
				<TestPlanFormView
					planId={(view as { kind: "test-plans-form"; planId?: number }).planId}
					onCancel={routing.goToTestPlansList}
					onSuccess={routing.goToTestPlansList}
				/>
			);
		case "test-cases-list":
			return <TestCasesListView onCreateNew={() => routing.goToTestCaseForm()} />;
		case "test-case-form":
			return (
				<TestCaseFormView
					onCancel={routing.goToTestCasesList}
					onSuccess={routing.goToTestCasesList}
					caseId={(view as { kind: "test-case-form"; caseId?: number }).caseId}
					onRunTest={(id) => routing.goToRunTestForCase(id)}
				/>
			);
		case "test-sets-list":
			return <TestSetsListView onCreateNew={() => routing.goToTestSetForm()} />;
		case "test-set-form":
			return (
				<TestSetFormView
					onCancel={routing.goToTestSetsList}
					onSuccess={routing.goToTestSetsList}
					setId={(view as { kind: "test-set-form"; setId?: number }).setId}
				/>
			);
		case "preconditions-list":
			return <PreconditionsListView onCreateNew={() => routing.goToPreconditionForm()} />;
		case "precondition-form":
			return (
				<PreconditionFormView
					onCancel={routing.goToPreconditionsList}
					onSuccess={routing.goToPreconditionsList}
					preconditionId={
						(view as { kind: "precondition-form"; preconditionId?: number }).preconditionId
					}
				/>
			);
		case "test-executions-list":
			return <TestExecutionsListView onCreateNew={() => routing.goToTestExecutionForm()} />;
		case "test-execution-form":
			return (
				<TestExecutionFormView
					onCancel={routing.goToTestExecutionsList}
					onSuccess={routing.goToTestExecutionsList}
					executionId={(view as { kind: "test-execution-form"; executionId?: number }).executionId}
					prefillTestCaseId={
						(view as { kind: "test-execution-form"; prefillTestCaseId?: number }).prefillTestCaseId
					}
				/>
			);
		case "test-case-versions-list":
			return <TestCaseVersionsListView />;
		case "audit-log-list":
			return <AuditLogListView />;
		case "reports":
			return (
				<div data-testid="view-reports">
					<ComingSoonView title="Reports" sprint="2.20" />
				</div>
			);
		case "settings":
			return <SettingsViewPage />;
		case "dashboard":
			return (
				<div data-testid="view-dashboard">
					<ComingSoonView title="Dashboard" sprint="2.20" />
				</div>
			);
	}
}

export function AppInner({ initialView }: { initialView: ArgosView }) {
	const { connectivityService, extensionDataClient, detectInstalled, baseUrl, project } =
		useServices();
	const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
	const [userSkipped, setUserSkipped] = useState(false);
	const routing = useArgosRouting(initialView);

	useEffect(() => {
		extensionDataClient
			.getValue<boolean>("argos:install:skipped")
			.then((val) => {
				if (val) setUserSkipped(true);
			})
			.catch(() => {});
		detectInstalled()
			.then(setIsInstalled)
			.catch((err: unknown) => {
				console.error("Install detection failed", err);
				setIsInstalled(false);
			});
	}, [detectInstalled, extensionDataClient]);

	if (isInstalled === null) {
		return (
			<div style={{ padding: 32, textAlign: "center" }}>
				<Spinner label="Detecting Argos installation..." />
			</div>
		);
	}

	function handleSkip() {
		setUserSkipped(true);
		extensionDataClient.setValue("argos:install:skipped", true).catch(() => {});
	}

	async function handleRefreshDetection() {
		const installed = await detectInstalled();
		setIsInstalled(installed);
	}

	if (!isInstalled && !userSkipped) {
		return (
			<GetStartedView
				isInstalled={isInstalled}
				orgUrl={baseUrl}
				projectName={project}
				onRefreshDetection={handleRefreshDetection}
				onSkip={handleSkip}
			/>
		);
	}

	return (
		<>
			<OfflineBanner connectivity={connectivityService} />
			{!isInstalled && userSkipped && (
				<LimitedModeBanner onInstallNow={() => setUserSkipped(false)} />
			)}
			<InstallationContext.Provider value={{ canCreate: isInstalled }}>
				<AppShell
					sidebar={
						<Sidebar activeKey={sidebarKeyForView(routing.view)} onNavigate={routing.goToTab} />
					}
				>
					<RouteRenderer view={routing.view} routing={routing} />
				</AppShell>
			</InstallationContext.Provider>
		</>
	);
}

export function App() {
	const [initialView, setInitialView] = useState<ArgosView | null>(null);

	useEffect(() => {
		SDK.init()
			.then(() => {
				setInitialView(getInitialView());
				SDK.notifyLoadSucceeded();
			})
			.catch((err) => {
				console.error("SDK init failed", err);
				SDK.notifyLoadFailed(err);
			});
	}, []);

	if (initialView === null) {
		return <div data-testid="hub-loading">Loading...</div>;
	}

	return (
		<FluentProvider theme={webLightTheme}>
			<ToastProvider>
				<ServicesProvider>
					<AppInner initialView={initialView} />
				</ServicesProvider>
			</ToastProvider>
		</FluentProvider>
	);
}
