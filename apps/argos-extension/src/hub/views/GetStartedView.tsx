import {
	Button,
	Card,
	CardHeader,
	MessageBar,
	MessageBarActions,
	MessageBarBody,
	Spinner,
	Text,
} from "@fluentui/react-components";
import { useState } from "react";

type Step = "welcome" | "detection" | "installGuide";

export interface GetStartedViewProps {
	isInstalled: boolean;
	orgUrl: string;
	projectName: string;
	onRefreshDetection: () => Promise<void>;
	onSkip: () => void;
}

export function GetStartedView({
	isInstalled,
	orgUrl,
	projectName,
	onRefreshDetection,
	onSkip,
}: GetStartedViewProps) {
	const [step, setStep] = useState<Step>("welcome");
	const [refreshing, setRefreshing] = useState(false);
	const [refreshResult, setRefreshResult] = useState<"none" | "still-missing">("none");

	async function handleRefresh() {
		setRefreshing(true);
		setRefreshResult("none");
		try {
			await onRefreshDetection();
			setRefreshResult("still-missing");
		} finally {
			setRefreshing(false);
		}
	}

	return (
		<div data-testid="get-started-view" style={{ padding: 32, maxWidth: 760, margin: "0 auto" }}>
			<Text as="h1" size={700} weight="bold" block style={{ marginBottom: 24 }}>
				Welcome to Argos
			</Text>

			{step === "welcome" && (
				<div data-testid="wizard-step-welcome">
					<Card>
						<CardHeader
							header={
								<Text size={400} weight="semibold">
									Industrial-grade test management for Azure DevOps
								</Text>
							}
						/>
						<div style={{ padding: 16 }}>
							<Text block>
								Argos uses custom work item types (TestVault.*) to provide a complete test
								management experience within Azure DevOps. These types coexist peacefully with
								Microsoft Test Plans.
							</Text>
							<Text block style={{ marginTop: 12 }}>
								Before you can create test plans, cases, and runs, Argos requires its custom work
								item types to be installed in your Azure DevOps process. This is a one-time admin
								operation.
							</Text>
							<div style={{ marginTop: 24, display: "flex", gap: 8 }}>
								<Button appearance="primary" onClick={() => setStep("detection")}>
									Get Started
								</Button>
								<Button onClick={onSkip}>Skip for now</Button>
							</div>
						</div>
					</Card>
				</div>
			)}

			{step === "detection" && (
				<div data-testid="wizard-step-detection">
					<Card>
						<CardHeader
							header={
								<Text size={400} weight="semibold">
									Installation status
								</Text>
							}
						/>
						<div style={{ padding: 16 }}>
							{isInstalled ? (
								<MessageBar intent="success">
									<MessageBarBody>
										Argos custom work item types are installed in this project. You&apos;re all set!
									</MessageBarBody>
								</MessageBar>
							) : (
								<>
									<MessageBar intent="warning">
										<MessageBarBody>
											Argos custom work item types are NOT installed in project &quot;
											{projectName}&quot;.
										</MessageBarBody>
									</MessageBar>
									<Text block style={{ marginTop: 16 }}>
										To install them, your Azure DevOps administrator needs to run the Argos CLI with
										a Personal Access Token (PAT). See next step for instructions.
									</Text>
								</>
							)}
							<div style={{ marginTop: 24, display: "flex", gap: 8 }}>
								{!isInstalled && (
									<Button appearance="primary" onClick={() => setStep("installGuide")}>
										Show install instructions
									</Button>
								)}
								{isInstalled && (
									<Button appearance="primary" onClick={onSkip}>
										Go to dashboard
									</Button>
								)}
							</div>
						</div>
					</Card>
				</div>
			)}

			{step === "installGuide" && (
				<div data-testid="wizard-step-install-guide">
					<Card>
						<CardHeader
							header={
								<Text size={400} weight="semibold">
									Install Argos schema
								</Text>
							}
						/>
						<div style={{ padding: 16 }}>
							<Text block weight="semibold" style={{ marginBottom: 8 }}>
								Option 1 (recommended): Use Argos CLI
							</Text>
							<Text block style={{ marginBottom: 8 }}>
								Run this command in a terminal with Node.js installed:
							</Text>
							<pre
								data-testid="cli-command"
								style={{
									background: "#f3f2f1",
									padding: 12,
									borderRadius: 4,
									fontSize: 13,
									overflowX: "auto",
								}}
							>
								{`npx @atconseil/argos-cli install --org ${orgUrl} --project "${projectName}"`}
							</pre>
							<Text block style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
								You will be prompted for an Azure DevOps Personal Access Token with &quot;Process
								(Read &amp; manage)&quot; scope.
							</Text>

							<Text block weight="semibold" style={{ marginTop: 20, marginBottom: 8 }}>
								Option 2: Manual install via Azure DevOps portal
							</Text>
							<Text block>
								Follow the manual install guide in the Argos documentation: docs/install-manual.md
							</Text>

							<div style={{ marginTop: 24, display: "flex", gap: 8 }}>
								<Button appearance="primary" disabled={refreshing} onClick={handleRefresh}>
									{refreshing ? <Spinner size="tiny" /> : "I've installed, refresh detection"}
								</Button>
								<Button onClick={onSkip}>Skip for now</Button>
							</div>

							{refreshResult === "still-missing" && (
								<MessageBar intent="warning" style={{ marginTop: 12 }}>
									<MessageBarBody>
										Argos schema still not detected. Make sure the CLI install completed
										successfully.
									</MessageBarBody>
									<MessageBarActions />
								</MessageBar>
							)}
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
