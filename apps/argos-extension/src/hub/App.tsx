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
import { InstallationContext, useInstallationContext } from "./installation-context.js";
import { ServicesProvider, useServices } from "./services-context.js";
import { GetStartedView } from "./views/GetStartedView.js";
import { LimitedModeBanner } from "./views/LimitedModeBanner.js";

type Section = "plans" | "cases" | "sets" | "preconditions" | "reports" | "settings";

// Full contribution IDs (publisher.extension.contribution-id format, case-sensitive)
const CONTRIBUTION_ID_TO_SECTION: Record<string, Section> = {
	"AlexThibaud.ArgosTesting.argos-hub-plans": "plans",
	"AlexThibaud.ArgosTesting.argos-hub-cases": "cases",
	"AlexThibaud.ArgosTesting.argos-hub-sets": "sets",
	"AlexThibaud.ArgosTesting.argos-hub-preconditions": "preconditions",
	"AlexThibaud.ArgosTesting.argos-hub-reports": "reports",
	"AlexThibaud.ArgosTesting.argos-hub-settings": "settings",
};

const DEFAULT_SECTION: Section = "plans";

function resolveSection(contributionId: string | undefined): Section {
	if (!contributionId) return DEFAULT_SECTION;
	return CONTRIBUTION_ID_TO_SECTION[contributionId] ?? DEFAULT_SECTION;
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

function HubContent({ section }: { section: Section }) {
	switch (section) {
		case "plans":
			return <PlansView />;
		case "cases":
			return <CasesView />;
		case "sets":
			return <SetsView />;
		case "preconditions":
			return <PreconditionsView />;
		case "reports":
			return <ReportsView />;
		case "settings":
			return <SettingsView />;
	}
}

export function AppInner({ section }: { section: Section }) {
	const { connectivityService, extensionDataClient, detectInstalled, baseUrl, project } =
		useServices();
	const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
	const [userSkipped, setUserSkipped] = useState(false);

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
				<div style={{ padding: "24px", fontFamily: "Segoe UI, sans-serif" }}>
					<HubContent section={section} />
				</div>
			</InstallationContext.Provider>
		</>
	);
}

export function App() {
	const [section, setSection] = useState<Section>(DEFAULT_SECTION);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		SDK.init()
			.then(() => {
				setSection(resolveSection(SDK.getContributionId()));
				setIsReady(true);
				SDK.notifyLoadSucceeded();
			})
			.catch((err) => {
				console.error("SDK init failed", err);
				SDK.notifyLoadFailed(err);
			});
	}, []);

	if (!isReady) {
		return <div data-testid="hub-loading">Loading...</div>;
	}

	return (
		<FluentProvider theme={webLightTheme}>
			<ToastProvider>
				<ServicesProvider>
					<AppInner section={section} />
				</ServicesProvider>
			</ToastProvider>
		</FluentProvider>
	);
}
