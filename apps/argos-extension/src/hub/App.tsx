import { FluentProvider, Text, webLightTheme } from "@fluentui/react-components";
import { useState } from "react";
import { LlmProviderSettings } from "./LlmProviderSettings.js";
import { PreconditionForm } from "./PreconditionForm.js";
import { TestCaseForm } from "./TestCaseForm.js";
import { TestPlanForm } from "./TestPlanForm.js";
import { TestSetForm } from "./TestSetForm.js";
import { ServicesProvider, useServices } from "./services-context.js";

type View = "plans" | "cases" | "sets" | "preconditions" | "reports" | "settings";

const NAV_ITEMS: Array<{ id: View; label: string; testId: string }> = [
	{ id: "plans", label: "Plans", testId: "nav-plans" },
	{ id: "cases", label: "Cases", testId: "nav-cases" },
	{ id: "sets", label: "Sets", testId: "nav-sets" },
	{ id: "preconditions", label: "Precond.", testId: "nav-preconditions" },
	{ id: "reports", label: "Reports", testId: "nav-reports" },
];

function NavItem({
	label,
	testId,
	active,
	onClick,
}: {
	label: string;
	testId: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			data-testid={testId}
			onClick={onClick}
			style={{
				display: "block",
				width: "100%",
				textAlign: "left",
				padding: "6px 12px",
				border: "none",
				background: active ? "#e8f0fe" : "transparent",
				cursor: "pointer",
				fontWeight: active ? 600 : 400,
				borderLeft: active ? "3px solid #0078d4" : "3px solid transparent",
				fontSize: "14px",
			}}
		>
			{label}
		</button>
	);
}

function PlansView() {
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

function CasesView() {
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

function SetsView() {
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

function PreconditionsView() {
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

function ReportsView() {
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

function SettingsView() {
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

export function MainContent() {
	const [currentView, setCurrentView] = useState<View>("plans");

	function renderMain() {
		switch (currentView) {
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

	return (
		<div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
			<div
				style={{
					width: "180px",
					borderRight: "1px solid #e0e0e0",
					paddingTop: "16px",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						padding: "0 12px 8px",
						fontSize: "12px",
						color: "#666",
						fontWeight: 600,
						textTransform: "uppercase",
					}}
				>
					Argos
				</div>
				{NAV_ITEMS.map((item) => (
					<NavItem
						key={item.id}
						label={item.label}
						testId={item.testId}
						active={currentView === item.id}
						onClick={() => setCurrentView(item.id)}
					/>
				))}
				<div
					style={{
						padding: "16px 12px 8px",
						fontSize: "12px",
						color: "#666",
						fontWeight: 600,
						textTransform: "uppercase",
					}}
				>
					Settings
				</div>
				<NavItem
					label="AI / Config"
					testId="nav-settings"
					active={currentView === "settings"}
					onClick={() => setCurrentView("settings")}
				/>
			</div>
			<div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>{renderMain()}</div>
		</div>
	);
}

export function App() {
	return (
		<FluentProvider theme={webLightTheme}>
			<ServicesProvider>
				<MainContent />
			</ServicesProvider>
		</FluentProvider>
	);
}
