import { FluentProvider, Text, webLightTheme } from "@fluentui/react-components";
import * as SDK from "azure-devops-extension-sdk";
import { useEffect, useState } from "react";
import { LlmProviderSettings } from "./LlmProviderSettings.js";
import { PreconditionForm } from "./PreconditionForm.js";
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

export function PlansView() {
	const { testPlanService, project } = useServices();
	return (
		<div data-testid="view-plans">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Plans
			</Text>
			<TestPlanForm service={testPlanService} project={project} />
		</div>
	);
}

export function CasesView() {
	const { testCaseService, project } = useServices();
	return (
		<div data-testid="view-cases">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Test Cases
			</Text>
			<TestCaseForm service={testCaseService} project={project} />
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
	const { llmProviderService } = useServices();
	return (
		<div data-testid="view-settings">
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Settings
			</Text>
			<LlmProviderSettings service={llmProviderService} isAdmin={true} />
			<div style={{ marginTop: 24, padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
				<Text size={200} style={{ color: "#666" }}>
					Audit Log, Repo Mapping, Quotas, Webhooks, and Beta opt-in are tracked as backlog item
					Sprint 2.5b.
				</Text>
			</div>
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
