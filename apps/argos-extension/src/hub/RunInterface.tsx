import type {
	IEvidenceUploadService,
	ITestExecutionService,
	InProgressExecution,
} from "@atconseil/testvault-sdk";
import type {
	TestVaultPrecondition,
	TestVaultTestCase,
	TestVaultTestExecution,
} from "@atconseil/testvault-types";
import { Button, Text, Textarea } from "@fluentui/react-components";
import { useState } from "react";
import { EvidencePanel } from "./EvidencePanel.js";

type StepStatus = "Pass" | "Fail" | "Blocked" | "Skipped";

type StepState = {
	status: StepStatus | null;
	comment: string;
};

export interface RunInterfaceProps {
	testCase: TestVaultTestCase;
	testPlanId: number;
	availableEnvironments: string[];
	executionService: ITestExecutionService;
	uploadService?: IEvidenceUploadService;
	preconditions?: TestVaultPrecondition[];
	onSaved?: (exec: TestVaultTestExecution) => void;
	onCancelled?: () => void;
	onCreateBug?: (exec: TestVaultTestExecution) => void;
}

function calcGlobalStatus(stepStates: Record<number, StepState>): string {
	const statuses = Object.values(stepStates)
		.map((s) => s.status)
		.filter((s): s is StepStatus => s !== null);
	if (statuses.length === 0) return "Unexecuted";
	if (statuses.some((s) => s === "Fail")) return "Fail";
	if (statuses.some((s) => s === "Blocked")) return "Blocked";
	if (statuses.every((s) => s === "Skipped")) return "Skipped";
	return "Pass";
}

export function RunInterface({
	testCase,
	testPlanId,
	availableEnvironments,
	executionService,
	uploadService,
	preconditions,
	onSaved,
	onCancelled,
	onCreateBug: _onCreateBug,
}: RunInterfaceProps) {
	const [environment, setEnvironment] = useState("");
	const [stepStates, setStepStates] = useState<Record<number, StepState>>({});
	const [saving, setSaving] = useState(false);
	const [savedExec, setSavedExec] = useState<TestVaultTestExecution | null>(null);
	const [envRequired, setEnvRequired] = useState(false);
	const [commentErrors, setCommentErrors] = useState<Set<number>>(new Set());
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [evidenceError, setEvidenceError] = useState<string | undefined>();
	const [uploading, setUploading] = useState(false);

	function setStepStatus(index: number, status: StepStatus) {
		setStepStates((prev) => ({
			...prev,
			[index]: { status, comment: prev[index]?.comment ?? "" },
		}));
	}

	function setStepComment(index: number, comment: string) {
		setStepStates((prev) => ({
			...prev,
			[index]: { status: prev[index]?.status ?? null, comment },
		}));
	}

	function handleFileSelected(file: File) {
		setEvidenceError(undefined);
		setPendingFiles((prev) => [...prev, file]);
	}

	async function handleSave() {
		if (!environment) {
			setEnvRequired(true);
			return;
		}
		setEnvRequired(false);

		const failsWithoutComment = testCase.steps
			.map((s) => s.index)
			.filter((i) => stepStates[i]?.status === "Fail" && !stepStates[i]?.comment?.trim());

		if (failsWithoutComment.length > 0) {
			setCommentErrors(new Set(failsWithoutComment));
			return;
		}
		setCommentErrors(new Set());

		setSaving(true);
		try {
			const run: InProgressExecution = await executionService.startRun({
				testPlanId,
				testCaseId: testCase.id,
				environment,
			});

			if (uploadService && pendingFiles.length > 0) {
				setUploading(true);
				try {
					for (const file of pendingFiles) {
						await uploadService.upload(run.id, file);
					}
				} catch (err) {
					setEvidenceError(err instanceof Error ? err.message : "Evidence upload failed");
				} finally {
					setUploading(false);
				}
			}

			for (const step of testCase.steps) {
				const state = stepStates[step.index];
				if (!state?.status) continue;
				await executionService.saveStepResult(run.id, {
					stepIndex: step.index,
					status: state.status,
					comment: state.comment ?? "",
					evidenceIds: [],
				});
			}

			const finalized = await executionService.finalizeRun(run.id);
			setSavedExec(finalized);
			onSaved?.(finalized);
		} finally {
			setSaving(false);
		}
	}

	const globalStatus = calcGlobalStatus(stepStates);

	if (savedExec) {
		return (
			<div style={{ padding: "24px", display: "flex", gap: "24px" }}>
				<div style={{ flex: 1 }}>
					<div data-testid="saved-status" style={{ marginBottom: "16px" }}>
						Run saved — {savedExec.globalStatus}
					</div>
					{savedExec.globalStatus === "Fail" && (
						<Button data-testid="create-bug-button" appearance="primary">
							Create Bug
						</Button>
					)}
				</div>
				<div
					data-testid="evidence-panel"
					style={{
						width: "280px",
						padding: "12px",
						border: "1px solid #e0e0e0",
						borderRadius: "4px",
					}}
				>
					<Text weight="semibold" block style={{ marginBottom: "8px" }}>
						Evidence
					</Text>
					<EvidencePanel evidence={savedExec.evidence} onFileSelected={() => undefined} />
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: "24px", display: "flex", gap: "24px" }}>
			<div style={{ flex: 1 }}>
				<div style={{ marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
					<label htmlFor="env-selector">Environment</label>
					<select
						id="env-selector"
						data-testid="env-selector"
						value={environment}
						onChange={(e) => setEnvironment(e.target.value)}
					>
						<option value="">— select —</option>
						{availableEnvironments.map((env) => (
							<option key={env} value={env}>
								{env}
							</option>
						))}
					</select>
					{envRequired && (
						<span data-testid="env-required-error" style={{ color: "red" }}>
							Environment is required
						</span>
					)}
				</div>

				<div data-testid="global-status" style={{ marginBottom: "16px" }}>
					Global status: {globalStatus}
				</div>

				{preconditions && preconditions.length > 0 && (
					<div data-testid="precondition-section" style={{ marginBottom: "16px" }}>
						<Text weight="semibold" block>
							Preconditions
						</Text>
						<ul style={{ listStyle: "none", padding: 0 }}>
							{preconditions.map((p) => (
								<li key={p.id}>{p.title}</li>
							))}
						</ul>
					</div>
				)}

				<div style={{ marginBottom: "16px" }}>
					{testCase.steps.map((step) => {
						const state = stepStates[step.index];
						const status = state?.status ?? null;
						const hasCommentError = commentErrors.has(step.index);
						return (
							<div
								key={step.index}
								data-testid={`step-${step.index}`}
								style={{
									marginBottom: "16px",
									padding: "12px",
									border: "1px solid #e0e0e0",
									borderRadius: "4px",
								}}
							>
								<div style={{ marginBottom: "8px" }}>
									<Text weight="semibold">{step.action}</Text>
									<Text style={{ marginLeft: "16px", color: "#666" }}>{step.expected}</Text>
								</div>
								<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
									{(["Pass", "Fail", "Blocked", "Skipped"] as StepStatus[]).map((s) => (
										<Button
											key={s}
											data-testid={`step-${step.index}-status-${s.toLowerCase()}`}
											appearance={status === s ? "primary" : "secondary"}
											size="small"
											onClick={() => setStepStatus(step.index, s)}
										>
											{s}
										</Button>
									))}
								</div>
								{status === "Fail" && (
									<>
										<Textarea
											data-testid={`step-${step.index}-comment`}
											placeholder="Describe the failure…"
											value={state?.comment ?? ""}
											onChange={(_, d) => setStepComment(step.index, d.value)}
											resize="vertical"
											rows={2}
										/>
										{hasCommentError && (
											<span
												data-testid={`step-${step.index}-comment-error`}
												style={{ color: "red" }}
											>
												Comment required for failed steps
											</span>
										)}
									</>
								)}
							</div>
						);
					})}
				</div>

				<div style={{ display: "flex", gap: "8px" }}>
					<Button
						data-testid="save-button"
						appearance="primary"
						onClick={handleSave}
						disabled={saving}
					>
						{saving ? "Saving…" : "Save Run"}
					</Button>
					<Button data-testid="cancel-button" appearance="secondary" onClick={onCancelled}>
						Cancel
					</Button>
				</div>
			</div>

			<div
				data-testid="evidence-panel"
				style={{
					width: "280px",
					padding: "12px",
					border: "1px solid #e0e0e0",
					borderRadius: "4px",
				}}
			>
				<Text weight="semibold" block style={{ marginBottom: "8px" }}>
					Evidence
				</Text>
				<EvidencePanel
					evidence={[]}
					onFileSelected={handleFileSelected}
					uploading={uploading}
					error={evidenceError}
				/>
				{pendingFiles.length > 0 && (
					<ul style={{ listStyle: "none", padding: 0, marginTop: "8px" }}>
						{pendingFiles.map((f, i) => (
							<li key={`${f.name}-${i}`} style={{ fontSize: "12px", color: "#444" }}>
								{f.name}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
