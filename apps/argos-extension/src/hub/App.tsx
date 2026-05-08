import { FluentProvider, Text, webLightTheme } from "@fluentui/react-components";
import { useState } from "react";

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
	return (
		<div>
			<div
				data-testid="active-plans-panel"
				style={{
					border: "1px solid #e0e0e0",
					borderRadius: "4px",
					padding: "16px",
					marginBottom: "16px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px",
					}}
				>
					<Text weight="semibold">Test Plans actifs</Text>
					<button
						type="button"
						data-testid="new-plan-button"
						style={{
							padding: "4px 12px",
							background: "#0078d4",
							color: "white",
							border: "none",
							borderRadius: "3px",
							cursor: "pointer",
							fontSize: "13px",
						}}
					>
						+ New Plan
					</button>
				</div>
				<Text style={{ color: "#666", fontStyle: "italic" }} data-testid="plans-empty-state">
					No active test plans. Create your first plan to get started.
				</Text>
			</div>

			<div
				data-testid="recently-failed-panel"
				style={{
					border: "1px solid #e0e0e0",
					borderRadius: "4px",
					padding: "16px",
				}}
			>
				<Text weight="semibold" block style={{ marginBottom: "12px" }}>
					Recently failed (last 24h)
				</Text>
				<Text style={{ color: "#666", fontStyle: "italic" }} data-testid="no-failures-state">
					No recent failures. Test executions are available from Phase 2.
				</Text>
			</div>
		</div>
	);
}

function PlaceholderView({ name, testId }: { name: string; testId: string }) {
	return (
		<div data-testid={testId} style={{ padding: "16px" }}>
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				{name}
			</Text>
			<Text style={{ color: "#666" }}>
				This section is available. Use the form components to manage {name.toLowerCase()}.
			</Text>
		</div>
	);
}

function SettingsView() {
	return (
		<div data-testid="view-settings" style={{ padding: "16px" }}>
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
				Settings
			</Text>
			<Text style={{ color: "#666" }}>AI, Audit Log, and License configuration — Phase 6.</Text>
		</div>
	);
}

export function App() {
	const [currentView, setCurrentView] = useState<View>("plans");

	function renderMain() {
		switch (currentView) {
			case "plans":
				return <PlansView />;
			case "cases":
				return <PlaceholderView name="Test Cases" testId="view-cases" />;
			case "sets":
				return <PlaceholderView name="Test Sets" testId="view-sets" />;
			case "preconditions":
				return <PlaceholderView name="Preconditions" testId="view-preconditions" />;
			case "reports":
				return <PlaceholderView name="Reports" testId="view-reports" />;
			case "settings":
				return <SettingsView />;
		}
	}

	return (
		<FluentProvider theme={webLightTheme}>
			<div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
				{/* Sidebar */}
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

				{/* Main content */}
				<div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>{renderMain()}</div>
			</div>
		</FluentProvider>
	);
}
