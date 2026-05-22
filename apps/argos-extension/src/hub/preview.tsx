import type { TestVaultTestPlan } from "@atconseil/argos-types";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./design-system/tokens.css";
import { ToastProvider } from "./components/Toast.js";
import { InstallationContext } from "./installation-context.js";
import { ServicesContext } from "./services-context.js";
import type { Services } from "./services.js";
import { AppShell } from "./views/AppShell.js";
import { Sidebar } from "./views/Sidebar.js";
import { TestPlanFormView } from "./views/test-plans/TestPlanFormView.js";
import { TestPlansListView } from "./views/test-plans/TestPlansListView.js";

// Sprint 2.19: replace with real testPlanService.list() / create() calls
let nextId = 1005;

const INITIAL_MOCK_PLANS: TestVaultTestPlan[] = [
	{
		id: 1001,
		name: "Sprint 2 Regression",
		description: "Full regression for Sprint 2 features",
		state: "Draft",
		iterationPath: "BCEE-QA\\Sprint 25",
		owner: "Alexandre Thibaud",
		environments: ["Chrome", "Firefox"],
		testSetIds: [201, 202],
		additionalTestCaseIds: [301, 302, 303],
		createdBy: "Alexandre Thibaud",
		createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
	},
	{
		id: 1002,
		name: "Smoke Tests — Production",
		description: "Smoke test suite for prod deploy validation",
		state: "Locked",
		iterationPath: "BCEE-QA\\Sprint 25",
		owner: "Alice Martin",
		environments: ["Chrome"],
		testSetIds: [203],
		additionalTestCaseIds: [304],
		createdBy: "Alice Martin",
		createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
	},
	{
		id: 1003,
		name: "Accessibility Audit",
		description: "",
		state: "Draft",
		iterationPath: "",
		owner: "",
		environments: [],
		testSetIds: [],
		additionalTestCaseIds: [305, 306, 307, 308],
		createdBy: "Bob Dupont",
		createdAt: new Date().toISOString(),
	},
	{
		id: 1004,
		name: "Performance Baseline",
		description: "Load tests for API endpoints",
		state: "Closed",
		iterationPath: "BCEE-QA\\Sprint 26",
		owner: "Alexandre Thibaud",
		environments: [],
		testSetIds: [204, 205],
		additionalTestCaseIds: [],
		createdBy: "Alexandre Thibaud",
		createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
	},
];

// Mutable store so create() adds to the list
let mockPlanStore: TestVaultTestPlan[] = [...INITIAL_MOCK_PLANS];

const mockServices = {
	testPlanService: {
		// Simulate 600ms network delay
		list: () =>
			new Promise<TestVaultTestPlan[]>((resolve) =>
				setTimeout(() => resolve([...mockPlanStore]), 600)
			),
		// Simulate 1s create delay, then return the new plan
		create: (draft: {
			name: string;
			owner: string;
			description?: string;
			iterationPath?: string;
		}) =>
			new Promise<TestVaultTestPlan>((resolve) =>
				setTimeout(() => {
					const newPlan: TestVaultTestPlan = {
						id: nextId++,
						name: draft.name,
						description: draft.description ?? "",
						state: "Draft",
						iterationPath: draft.iterationPath ?? "",
						owner: draft.owner,
						environments: [],
						testSetIds: [],
						additionalTestCaseIds: [],
						createdBy: draft.owner,
						createdAt: new Date().toISOString(),
					};
					mockPlanStore = [...mockPlanStore, newPlan];
					resolve(newPlan);
				}, 1000)
			),
	},
} as unknown as Services;

type SidebarKey =
	| "test-plans"
	| "test-cases"
	| "test-sets"
	| "preconditions"
	| "reports"
	| "settings";

type PreviewView = "list" | "form";

function PreviewApp() {
	const [activeKey, setActiveKey] = useState<SidebarKey>("test-plans");
	const [view, setView] = useState<PreviewView>("list");

	function handleNavigate(key: string) {
		setActiveKey(key as SidebarKey);
		setView("list");
	}

	return (
		<ToastProvider>
			<ServicesContext.Provider value={mockServices}>
				<InstallationContext.Provider value={{ canCreate: true }}>
					<AppShell sidebar={<Sidebar activeKey={activeKey} onNavigate={handleNavigate} />}>
						{activeKey === "test-plans" ? (
							view === "form" ? (
								<TestPlanFormView
									onCancel={() => setView("list")}
									onSuccess={() => setView("list")}
								/>
							) : (
								<TestPlansListView
									onCreateNew={() => setView("form")}
									onEditPlan={() => setView("form")}
								/>
							)
						) : (
							<div
								style={{
									padding: "4rem",
									textAlign: "center",
									color: "var(--neutral-7)",
									fontSize: "var(--t-h3)",
								}}
							>
								{activeKey} — coming soon
							</div>
						)}
					</AppShell>
				</InstallationContext.Provider>
			</ServicesContext.Provider>
		</ToastProvider>
	);
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<PreviewApp />);
