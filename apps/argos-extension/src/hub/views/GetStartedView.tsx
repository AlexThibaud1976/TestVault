import type { IProcessInstallService, ProcessInstallState } from "@atconseil/argos-sdk";
import {
	Button,
	Card,
	CardHeader,
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	Text,
} from "@fluentui/react-components";
import { useState } from "react";
import { InstallWizard } from "../InstallWizard.js";

type GetStartedStep = "welcome" | "wizard";

export interface GetStartedViewProps {
	initialState: ProcessInstallState;
	service: IProcessInstallService;
	onComplete: () => void;
	onSkip: () => void;
}

function DetectionSummary({ state }: { state: ProcessInstallState }) {
	if (state.status === "not-installed") {
		return (
			<div data-testid="wizard-step-detection">
				<MessageBar intent="info">
					<MessageBarTitle>Not installed</MessageBarTitle>
					<MessageBarBody>
						No Argos Custom Process found in your organization. The wizard will create one with 7
						Work Item Types.
					</MessageBarBody>
				</MessageBar>
			</div>
		);
	}
	if (state.status === "partial") {
		return (
			<div data-testid="wizard-step-detection">
				<MessageBar intent="warning">
					<MessageBarTitle>Partial installation</MessageBarTitle>
					<MessageBarBody>
						Process <strong>{state.processName}</strong> found but missing:{" "}
						{state.missingWitRefs.join(", ")}. The wizard will add the missing types.
					</MessageBarBody>
				</MessageBar>
			</div>
		);
	}
	return null;
}

export function GetStartedView({ initialState, service, onComplete, onSkip }: GetStartedViewProps) {
	const [step, setStep] = useState<GetStartedStep>("welcome");

	return (
		<div data-testid="get-started-view" style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
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
								Before you can create test plans, cases, and runs, Argos needs to install 7 custom
								work item types into your process. This requires Project Collection Admin
								permissions.
							</Text>
							<div style={{ marginTop: 24, display: "flex", gap: 8 }}>
								<Button appearance="primary" onClick={() => setStep("wizard")}>
									Get Started
								</Button>
								<Button onClick={onSkip}>Skip for now</Button>
							</div>
						</div>
					</Card>
				</div>
			)}

			{step === "wizard" && (
				<>
					<DetectionSummary state={initialState} />
					<div style={{ marginTop: 16 }}>
						<InstallWizard service={service} onInstalled={() => onComplete()} />
					</div>
				</>
			)}
		</div>
	);
}
