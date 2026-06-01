import type {
	BaseProcessType,
	IProcessInstallService,
	InstallProgressStep,
	ProcessInstallState,
} from "@atconseil/argos-sdk";
import {
	Button,
	Divider,
	Field,
	Input,
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	Select,
	Spinner,
	Text,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";

type WizardStep =
	| { id: "detecting" }
	| { id: "not-installed"; processName: string; baseProcess: BaseProcessType }
	| { id: "preview"; processName: string; baseProcess: BaseProcessType }
	| { id: "installing"; progress: InstallProgressStep[] }
	| { id: "done"; processId: string; processName: string }
	| { id: "already-installed"; state: Extract<ProcessInstallState, { status: "installed" }> }
	| { id: "needs-upgrade"; state: Extract<ProcessInstallState, { status: "needs-upgrade" }> }
	| { id: "upgrading" }
	| { id: "upgrade-done" }
	| { id: "partial"; state: Extract<ProcessInstallState, { status: "partial" }> }
	| { id: "error"; message: string; noPermission?: boolean };

const TESTVAULT_WIT_NAMES = [
	"Test Case (Argos)",
	"Test Plan (Argos)",
	"Test Set (Argos)",
	"Precondition (Argos)",
	"Test Execution (Argos)",
	"Test Case Version (Argos)",
	"Audit Log (Argos)",
];

export interface InstallWizardProps {
	service: IProcessInstallService;
	onInstalled?: (processId: string) => void;
}

export function InstallWizard({ service, onInstalled }: InstallWizardProps) {
	const [step, setStep] = useState<WizardStep>({ id: "detecting" });

	useEffect(() => {
		service
			.detectInstallState()
			.then((state) => {
				if (state.status === "not-installed") {
					setStep({ id: "not-installed", processName: "TestVault - Agile", baseProcess: "Agile" });
				} else if (state.status === "needs-upgrade") {
					setStep({ id: "needs-upgrade", state });
				} else if (state.status === "installed") {
					setStep({ id: "already-installed", state });
				} else {
					setStep({ id: "partial", state });
				}
			})
			.catch((err: Error) => {
				setStep({
					id: "error",
					message: err.message,
					noPermission: err.name === "ProcessPermissionError",
				});
			});
	}, [service]);

	if (step.id === "detecting") {
		return (
			<div style={{ padding: "32px", textAlign: "center" }}>
				<Spinner label="Detecting installation state..." />
			</div>
		);
	}

	if (step.id === "error") {
		return (
			<MessageBar intent={step.noPermission ? "warning" : "error"}>
				<MessageBarTitle>
					{step.noPermission ? "Insufficient permissions" : "Detection failed"}
				</MessageBarTitle>
				<MessageBarBody>
					{step.noPermission
						? "Process creation requires Project Collection Admin permissions. Ask your ADO administrator to grant you this role, then reload Argos."
						: step.message}
				</MessageBarBody>
			</MessageBar>
		);
	}

	if (step.id === "already-installed") {
		return (
			<MessageBar data-testid="already-installed-screen" intent="success">
				<MessageBarTitle>TestVault already installed</MessageBarTitle>
				<MessageBarBody>
					Process: <strong>{step.state.processName}</strong> — Schema{" "}
					<strong>v{step.state.schemaVersion}</strong>. No action needed.
				</MessageBarBody>
			</MessageBar>
		);
	}

	if (step.id === "needs-upgrade") {
		return (
			<div data-testid="needs-upgrade-screen" style={{ padding: "24px" }}>
				<MessageBar intent="warning">
					<MessageBarTitle>Schema Upgrade Available</MessageBarTitle>
					<MessageBarBody>
						Installed: <strong>v{step.state.schemaVersion}</strong> — Expected:{" "}
						<strong>v{step.state.expectedVersion}</strong>. The process schema must be upgraded to
						use new 0.6.0 fields (Evidence, BugLinks, GlobalStatusOverridden, PreviousExecutionId)
						and states (InProgress, Aborted).
					</MessageBarBody>
				</MessageBar>
				<div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
					<Button
						data-testid="upgrade-now-button"
						appearance="primary"
						onClick={async () => {
							setStep({ id: "upgrading" });
							await service.upgradeSchema({ processId: step.state.processId });
							setStep({ id: "upgrade-done" });
						}}
					>
						Upgrade Now
					</Button>
					<Button
						data-testid="upgrade-skip-button"
						appearance="secondary"
						onClick={() =>
							setStep({
								id: "already-installed",
								state: { ...step.state, status: "installed" as const },
							})
						}
					>
						Skip (use as is)
					</Button>
				</div>
			</div>
		);
	}

	if (step.id === "upgrading") {
		return (
			<div style={{ padding: "32px", textAlign: "center" }}>
				<Spinner label="Upgrading schema..." />
			</div>
		);
	}

	if (step.id === "upgrade-done") {
		return (
			<MessageBar data-testid="upgrade-done-screen" intent="success">
				<MessageBarTitle>Schema upgraded to v1.1.0</MessageBarTitle>
				<MessageBarBody>
					Reload required to use new fields (Evidence, BugLinks, GlobalStatusOverridden,
					PreviousExecutionId) and states (InProgress, Aborted).
				</MessageBarBody>
			</MessageBar>
		);
	}

	if (step.id === "partial") {
		return (
			<MessageBar intent="warning">
				<MessageBarTitle>Partial installation detected</MessageBarTitle>
				<MessageBarBody>
					Process: <strong>{step.state.processName}</strong>. Missing WITs:{" "}
					{step.state.missingWitRefs.join(", ")}. Please contact support or re-run the installer.
				</MessageBarBody>
			</MessageBar>
		);
	}

	if (step.id === "not-installed") {
		return (
			<div style={{ padding: "24px", maxWidth: "480px" }}>
				<Text as="h2" size={600} weight="semibold" block>
					Install TestVault Custom Process
				</Text>
				<Text as="p" block style={{ marginBottom: "16px" }}>
					Argos requires a Custom Process with 7 new Work Item Types. This wizard will create it for
					you.
				</Text>
				<Field label="Process name" required style={{ marginBottom: "12px" }}>
					<Input
						data-testid="process-name-input"
						value={step.processName}
						onChange={(_, d) => setStep({ ...step, processName: d.value })}
					/>
				</Field>
				<Field label="Base process" required style={{ marginBottom: "16px" }}>
					<Select
						data-testid="base-process-select"
						value={step.baseProcess}
						onChange={(_, d) => setStep({ ...step, baseProcess: d.value as BaseProcessType })}
					>
						<option value="Agile">Agile</option>
						<option value="Scrum">Scrum</option>
						<option value="CMMI">CMMI</option>
					</Select>
				</Field>
				<Button
					appearance="primary"
					onClick={() =>
						setStep({ id: "preview", processName: step.processName, baseProcess: step.baseProcess })
					}
					disabled={!step.processName.trim()}
				>
					Next: Preview
				</Button>
			</div>
		);
	}

	if (step.id === "preview") {
		return (
			<div style={{ padding: "24px", maxWidth: "480px" }}>
				<Text as="h2" size={600} weight="semibold" block>
					Preview
				</Text>
				<Text as="p" block>
					The following will be created in your ADO organization:
				</Text>
				<Text as="p" block>
					<strong>Process:</strong> {step.processName} (inheriting from {step.baseProcess})
				</Text>
				<Divider style={{ margin: "12px 0" }} />
				<Text as="p" weight="semibold" block>
					7 Custom Work Item Types:
				</Text>
				<ul data-testid="wit-list">
					{TESTVAULT_WIT_NAMES.map((name) => (
						<li key={name}>{name}</li>
					))}
				</ul>
				<div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
					<Button
						onClick={() =>
							setStep({
								id: "not-installed",
								processName: step.processName,
								baseProcess: step.baseProcess,
							})
						}
					>
						Back
					</Button>
					<Button
						appearance="primary"
						data-testid="install-button"
						onClick={() => {
							setStep({ id: "installing", progress: [] });
							service
								.install({
									processName: step.processName,
									baseProcess: step.baseProcess,
									onProgress: (p) =>
										setStep((prev) =>
											prev.id === "installing"
												? { id: "installing", progress: [...prev.progress, p] }
												: prev
										),
								})
								.then(({ processId, processName }) => {
									setStep({ id: "done", processId, processName });
									onInstalled?.(processId);
								})
								.catch((err: Error) =>
									setStep({
										id: "error",
										message: err.message,
										noPermission: err.name === "ProcessPermissionError",
									})
								);
						}}
					>
						Install
					</Button>
				</div>
			</div>
		);
	}

	if (step.id === "installing") {
		const last = step.progress.at(-1);
		return (
			<div style={{ padding: "24px", textAlign: "center" }}>
				<Spinner label={last?.message ?? "Installing..."} />
				{last?.total !== undefined && (
					<Text as="p" block style={{ marginTop: "8px" }}>
						{last.current} / {last.total} WITs created
					</Text>
				)}
			</div>
		);
	}

	// step.id === "done"
	return (
		<MessageBar intent="success" data-testid="success-message">
			<MessageBarTitle>Installation complete!</MessageBarTitle>
			<MessageBarBody>
				Process <strong>{step.processName}</strong> is ready. Assign it to your ADO projects to
				start using Argos.
			</MessageBarBody>
		</MessageBar>
	);
}
