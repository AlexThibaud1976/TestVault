import { useState } from "react";
import { Button, Input, Select } from "../design-system/index.js";
import { useLlmConfig } from "../hooks/use-llm-config.js";
import type { TestStepSuggestion } from "../llm/llm-provider.js";
import { useServices } from "../services-context.js";
import { LlmConfigStatus } from "./LlmConfigStatus.js";
import { useArgosToast } from "./Toast.js";

const COUNT_OPTIONS = [
	{ value: "3", label: "3 steps" },
	{ value: "5", label: "5 steps" },
	{ value: "7", label: "7 steps" },
	{ value: "10", label: "10 steps" },
	{ value: "15", label: "15 steps" },
];

export interface AiSuggestStepsContext {
	title?: string;
	description?: string;
	tags?: string[];
	priority?: 1 | 2 | 3 | 4;
	areaPath?: string;
	linkedWorkItems?: Array<{
		id: number;
		type: string;
		title: string;
		description?: string;
		acceptanceCriteria?: string;
	}>;
}

interface AiSuggestStepsModalProps {
	context: AiSuggestStepsContext;
	onClose: () => void;
	onApply: (steps: TestStepSuggestion[]) => void;
}

type ModalStep = "select" | "generating" | "preview";

export function AiSuggestStepsModal({ context, onClose, onApply }: AiSuggestStepsModalProps) {
	const { aiGenerationService } = useServices();
	const { config, isLoading: isLoadingConfig } = useLlmConfig();
	const toast = useArgosToast();

	const [step, setStep] = useState<ModalStep>("select");
	const [targetCount, setTargetCount] = useState("5");
	const [suggestions, setSuggestions] = useState<TestStepSuggestion[]>([]);
	const [error, setError] = useState<string | null>(null);

	async function handleGenerate() {
		if (!config) return;
		setStep("generating");
		setError(null);
		try {
			const result = await aiGenerationService.generateSteps(config, {
				testCase: {
					title: context.title,
					description: context.description,
					tags: context.tags,
					priority: context.priority,
					areaPath: context.areaPath,
				},
				linkedWorkItems: context.linkedWorkItems,
				targetCount: Number(targetCount),
			});
			setSuggestions(result.steps);
			setStep("preview");
			if (result.truncated) {
				toast.info(
					"Response truncated by max_tokens. Increase the setting or ask for fewer steps."
				);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "LLM provider did not respond";
			setError(msg);
			setStep("select");
		}
	}

	function updateSuggestion(idx: number, field: "action" | "expected", value: string) {
		setSuggestions((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
	}

	function handleAccept() {
		const valid = suggestions.filter((s) => s.action.trim().length > 0);
		onApply(valid);
	}

	return (
		<dialog
			open
			aria-label="Suggest Test Steps with AI"
			data-testid="ai-suggest-steps-modal"
			style={{
				position: "fixed",
				inset: 0,
				border: "none",
				background: "rgba(0,0,0,0.4)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
				padding: 0,
				maxWidth: "100vw",
				maxHeight: "100vh",
				width: "100vw",
				height: "100vh",
			}}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: "8px",
					boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
					width: "640px",
					maxWidth: "95vw",
					maxHeight: "90vh",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid #e0e0e0",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ fontWeight: 700, fontSize: "15px" }}>✨ AI Suggest Steps</span>
						<div style={{ marginTop: "4px" }}>
							<LlmConfigStatus config={config} isLoading={isLoadingConfig} />
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close modal"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: "18px",
							color: "#555",
							padding: "4px",
						}}
					>
						x
					</button>
				</div>

				<div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
					{!config && !isLoadingConfig && (
						<div
							style={{ color: "#c62828", fontSize: "12px", marginBottom: "12px" }}
							data-testid="no-config-warning"
						>
							AI is not configured. Go to Settings to add your LLM credentials.
						</div>
					)}

					{error && (
						<div
							style={{ color: "#c62828", fontSize: "13px", marginBottom: "12px" }}
							data-testid="ai-suggest-steps-error"
						>
							{error}
						</div>
					)}

					<div style={{ marginBottom: "16px" }}>
						<label
							htmlFor="ai-steps-count"
							style={{
								fontWeight: 600,
								fontSize: "13px",
								display: "block",
								marginBottom: "6px",
							}}
						>
							Number of steps:
						</label>
						<Select
							id="ai-steps-count"
							value={targetCount}
							onChange={(e) => setTargetCount(e.target.value)}
							options={COUNT_OPTIONS}
						/>
					</div>

					{step === "generating" && (
						<div
							data-testid="ai-suggest-steps-generating"
							style={{ textAlign: "center", padding: "32px 0", color: "#555" }}
						>
							<div style={{ fontSize: "20px", marginBottom: "12px" }}>Generating...</div>
							<div style={{ fontSize: "13px" }}>
								AI is drafting steps for the current Test Case. This may take 5-10 seconds.
							</div>
						</div>
					)}

					{step === "preview" && suggestions.length > 0 && (
						<div data-testid="ai-suggest-steps-preview">
							<div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
								Review and edit the suggested steps:
							</div>
							{suggestions.map((s, idx) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: order is stable within one preview session and items never reorder
									key={`ai-step-${idx}`}
									style={{
										border: "1px solid #e0e0e0",
										borderRadius: "4px",
										padding: "8px 10px",
										marginBottom: "8px",
										display: "grid",
										gridTemplateColumns: "auto 1fr",
										gap: "8px 12px",
										alignItems: "center",
									}}
								>
									<span style={{ fontWeight: 600, fontSize: "12px", color: "#888" }}>
										#{idx + 1}
									</span>
									<Input
										data-testid={`ai-step-action-${idx}`}
										type="text"
										value={s.action}
										onChange={(e) => updateSuggestion(idx, "action", e.target.value)}
										placeholder="Action"
									/>
									<span style={{ fontWeight: 600, fontSize: "12px", color: "#888" }}>=</span>
									<Input
										data-testid={`ai-step-expected-${idx}`}
										type="text"
										value={s.expected}
										onChange={(e) => updateSuggestion(idx, "expected", e.target.value)}
										placeholder="Expected result"
									/>
								</div>
							))}
						</div>
					)}

					{step === "preview" && suggestions.length === 0 && (
						<div
							style={{ textAlign: "center", padding: "24px 0", color: "#888", fontSize: "13px" }}
						>
							AI did not return any usable step. Try again or refine the inputs.
						</div>
					)}
				</div>

				<div
					style={{
						padding: "12px 20px",
						borderTop: "1px solid #e0e0e0",
						display: "flex",
						gap: "8px",
						justifyContent: "flex-end",
					}}
				>
					{step === "preview" && (
						<Button
							variant="secondary"
							onClick={() => {
								setSuggestions([]);
								void handleGenerate();
							}}
						>
							Regenerate
						</Button>
					)}
					<Button variant="subtle" onClick={onClose}>
						Cancel
					</Button>
					{step === "select" && (
						<Button
							variant="primary"
							onClick={() => void handleGenerate()}
							disabled={!config}
							data-testid="ai-suggest-steps-generate"
						>
							Generate
						</Button>
					)}
					{step === "preview" && (
						<Button
							variant="primary"
							onClick={handleAccept}
							disabled={suggestions.length === 0}
							data-testid="ai-suggest-steps-accept"
						>
							Accept
						</Button>
					)}
				</div>
			</div>
		</dialog>
	);
}
