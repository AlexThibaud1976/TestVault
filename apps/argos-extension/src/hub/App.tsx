import type { TestVaultTestCase } from "@atconseil/argos-types";
import { FluentProvider, Tab, TabList, Text, webLightTheme } from "@fluentui/react-components";
import * as SDK from "azure-devops-extension-sdk";
import { useEffect, useState } from "react";
import { EnvironmentSettings } from "./EnvironmentSettings.js";
import { ExecutionHistory } from "./ExecutionHistory.js";
import { LlmProviderSettings } from "./LlmProviderSettings.js";
import { PreconditionForm } from "./PreconditionForm.js";
import { RunInterface } from "./RunInterface.js";
import { TestCaseForm } from "./TestCaseForm.js";
import { TestPlanForm } from "./TestPlanForm.js";
import { TestSetForm } from "./TestSetForm.js";
import { ServicesProvider, useServices } from "./services-context.js";

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

export function PlansView() {
	const { testPlanService, project } = useServices();
	const [tab, setTab] = useState<"details" | "run">("details");
	return (
		<div data-testid="view-plans">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Plans
			</Text>
			<TabList
				selectedValue={tab}
				onTabSelect={(_, d) => setTab(d.value as "details" | "run")}
				style={{ marginBottom: "16px" }}
			>
				<Tab value="details">Plan Details</Tab>
				<Tab value="run">Run</Tab>
			</TabList>
			{tab === "details" && <TestPlanForm service={testPlanService} project={project} />}
			{tab === "run" && <RunTab />}
		</div>
	);
}

export function CasesView() {
	const { testCaseService, testExecutionService, project } = useServices();
	const [tab, setTab] = useState<"details" | "executions">("details");
	return (
		<div data-testid="view-cases">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Cases
			</Text>
			<TabList
				selectedValue={tab}
				onTabSelect={(_, d) => setTab(d.value as "details" | "executions")}
				style={{ marginBottom: "16px" }}
			>
				<Tab value="details">Case Details</Tab>
				<Tab value="executions">Executions</Tab>
			</TabList>
			{tab === "details" && <TestCaseForm service={testCaseService} project={project} />}
			{tab === "executions" && (
				<ExecutionHistory
					testCaseId={0}
					executionService={testExecutionService}
					availableEnvironments={[]}
				/>
			)}
		</div>
	);
}

export function SetsView() {
	const { testSetService, project } = useServices();
	return (
		<div data-testid="view-sets">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Sets
			</Text>
			<TestSetForm service={testSetService} project={project} />
		</div>
	);
}

export function PreconditionsView() {
	const { preconditionService, project } = useServices();
	return (
		<div data-testid="view-preconditions">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Preconditions
			</Text>
			<PreconditionForm service={preconditionService} project={project} />
		</div>
	);
}

export function ReportsView() {
	return (
		<div data-testid="view-reports" style={{ padding: 16 }}>
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Reports
			</Text>
			<Text style={{ color: "#666" }} block>
				Flakiness reports require a backend service not yet implemented.
			</Text>
			<Text style={{ color: "#666", fontSize: "12px" }} block>
				Tracked as backlog item WIRING-CLOUD-PLUS (FlakinessReportService implementation).
			</Text>
		</div>
	);
}

export function SettingsView() {
	const { llmProviderService, environmentConfigService } = useServices();
	return (
		<div data-testid="view-settings">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Settings
			</Text>
			<LlmProviderSettings service={llmProviderService} isAdmin={true} />
			<EnvironmentSettings service={environmentConfigService} isAdmin={true} />
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
			<ServicesProvider>
				<div style={{ padding: "24px", fontFamily: "Segoe UI, sans-serif" }}>
					<HubContent section={section} />
				</div>
			</ServicesProvider>
		</FluentProvider>
	);
}
