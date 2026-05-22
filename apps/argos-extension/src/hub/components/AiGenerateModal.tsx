import { useState } from "react";
import { Button, Select } from "../design-system/index.js";
import { useAiGeneration } from "../hooks/use-ai-generation.js";
import { useLlmConfig } from "../hooks/use-llm-config.js";
import type { TestCaseSuggestion } from "../llm/llm-provider.js";
import { useServices } from "../services-context.js";
import type { WorkItemResult } from "../services/ado-work-items-service.js";
import { AiSuggestionCard } from "./AiSuggestionCard.js";
import { LlmConfigStatus } from "./LlmConfigStatus.js";
import { useArgosToast } from "./Toast.js";
import { WorkItemPicker } from "./WorkItemPicker.js";

const COUNT_OPTIONS = [
	{ value: "3", label: "3 test cases" },
	{ value: "5", label: "5 test cases" },
	{ value: "7", label: "7 test cases" },
	{ value: "10", label: "10 test cases" },
];

interface AiGenerateModalProps {
	onClose: () => void;
	onCreated: (count: number) => void;
}

type ModalStep = "select" | "generating" | "suggestions";

export function AiGenerateModal({ onClose, onCreated }: AiGenerateModalProps) {
	const { testCaseService, workItemLinkService } = useServices();
	const { config, isLoading: isLoadingConfig } = useLlmConfig();
	const {
		suggestions,
		isLoading: isGenerating,
		error: genError,
		generate,
		reset,
	} = useAiGeneration();
	const toast = useArgosToast();

	const [step, setStep] = useState<ModalStep>("select");
	const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemResult | null>(null);
	const [targetCount, setTargetCount] = useState("5");
	const [localSuggestions, setLocalSuggestions] = useState<TestCaseSuggestion[]>([]);
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
	const [isCreating, setIsCreating] = useState(false);

	async function handleGenerate() {
		if (!config || !selectedWorkItem) return;
		setStep("generating");
		reset();
		try {
			const results = await generate(config, {
				sourceWorkItem: {
					id: selectedWorkItem.id,
					type: selectedWorkItem.type,
					title: selectedWorkItem.title,
					description: selectedWorkItem.description,
					acceptanceCriteria: selectedWorkItem.acceptanceCriteria,
				},
				targetCount: Number(targetCount),
			});
			const initialSelection = new Set(results.map((_, i) => i));
			setLocalSuggestions(results);
			setSelectedIndices(initialSelection);
			setStep("suggestions");
		} catch {
			setStep("select");
		}
	}

	function handleToggle(idx: number) {
		setSelectedIndices((prev) => {
			const next = new Set(prev);
			if (next.has(idx)) next.delete(idx);
			else next.add(idx);
			return next;
		});
	}

	function handleEdit(idx: number, updated: TestCaseSuggestion) {
		setLocalSuggestions((prev) => prev.map((s, i) => (i === idx ? updated : s)));
	}

	async function handleCreate() {
		if (!selectedWorkItem) return;
		const toCreate = localSuggestions.filter((_, i) => selectedIndices.has(i));
		if (toCreate.length === 0) return;

		setIsCreating(true);
		try {
			const created: number[] = [];
			for (const s of toCreate) {
				const tc = await testCaseService.create({
					title: s.title,
					areaPath: "",
					description: s.description || undefined,
					priority: s.priority === "P1" ? 1 : s.priority === "P2" ? 2 : s.priority === "P3" ? 3 : 4,
					tags: s.tags.length > 0 ? s.tags : undefined,
					steps: s.steps.map((step, i) => ({
						index: i + 1,
						action: step.action,
						expected: step.expected,
					})),
				});
				created.push(tc.id);
			}

			// Link each created test case to the source work item
			for (const tcId of created) {
				await workItemLinkService
					.addLink(tcId, selectedWorkItem.id, "TestVault.TestedBy")
					.catch(() => {});
			}

			toast.success(
				`${created.length} test case${created.length !== 1 ? "s" : ""} created from ${selectedWorkItem.type} #${selectedWorkItem.id}`
			);
			onCreated(created.length);
		} catch (err) {
			toast.error(`Failed to create test cases: ${(err as Error).message}`);
		} finally {
			setIsCreating(false);
		}
	}

	const selectedCount = selectedIndices.size;

	return (
		<dialog
			open
			aria-label="Generate Test Cases with AI"
			data-testid="ai-generate-modal"
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
					width: "600px",
					maxWidth: "95vw",
					maxHeight: "90vh",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Header */}
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
						<span style={{ fontWeight: 700, fontSize: "15px" }}>Generate Test Cases with AI</span>
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

				{/* Body */}
				<div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
					{step === "select" && (
						<>
							<div style={{ marginBottom: "16px" }}>
								<p style={{ fontWeight: 600, fontSize: "13px", margin: "0 0 6px" }}>
									Select source User Story / Bug / Requirement:
								</p>
								<WorkItemPicker value={selectedWorkItem} onChange={setSelectedWorkItem} />
							</div>

							{selectedWorkItem && (
								<div
									data-testid="selected-work-item"
									style={{
										padding: "8px 12px",
										background: "#e8f0fe",
										borderRadius: "4px",
										marginBottom: "16px",
										fontSize: "13px",
									}}
								>
									Selected: <strong>#{selectedWorkItem.id}</strong> — {selectedWorkItem.title}
								</div>
							)}

							<div style={{ marginBottom: "16px" }}>
								<label
									htmlFor="ai-count"
									style={{
										fontWeight: 600,
										fontSize: "13px",
										display: "block",
										marginBottom: "6px",
									}}
								>
									Number of test cases:
								</label>
								<Select
									id="ai-count"
									value={targetCount}
									onChange={(e) => setTargetCount(e.target.value)}
									options={COUNT_OPTIONS}
								/>
							</div>

							{!config && !isLoadingConfig && (
								<div
									style={{ color: "#c62828", fontSize: "12px", marginBottom: "12px" }}
									data-testid="no-config-warning"
								>
									AI is not configured. Go to Settings to add your Azure OpenAI credentials.
								</div>
							)}
						</>
					)}

					{step === "generating" && (
						<div
							data-testid="generating-state"
							style={{ textAlign: "center", padding: "40px 0", color: "#555" }}
						>
							<div style={{ fontSize: "24px", marginBottom: "12px" }}>Generating...</div>
							<div style={{ fontSize: "13px" }}>
								AI is analyzing the work item and generating test cases. This may take 5-10 seconds.
							</div>
						</div>
					)}

					{step === "suggestions" && (
						<>
							{selectedWorkItem && (
								<div style={{ marginBottom: "12px", fontSize: "13px", color: "#555" }}>
									Source: {selectedWorkItem.type} <strong>#{selectedWorkItem.id}</strong> —{" "}
									{selectedWorkItem.title}
								</div>
							)}

							{genError && (
								<div
									data-testid="gen-error"
									style={{ color: "#c62828", fontSize: "13px", marginBottom: "12px" }}
								>
									{genError.message}
								</div>
							)}

							<div data-testid="suggestions-list">
								{(localSuggestions.length > 0 ? localSuggestions : suggestions).map((s, i) => (
									<AiSuggestionCard
										key={s.title}
										suggestion={s}
										index={i}
										selected={selectedIndices.has(i)}
										onToggle={() => handleToggle(i)}
										onEdit={(updated) => handleEdit(i, updated)}
									/>
								))}
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div
					style={{
						padding: "12px 20px",
						borderTop: "1px solid #e0e0e0",
						display: "flex",
						gap: "8px",
						justifyContent: "flex-end",
					}}
				>
					{step === "suggestions" && (
						<Button
							variant="secondary"
							onClick={() => {
								reset();
								setStep("select");
							}}
						>
							Regenerate
						</Button>
					)}
					<Button variant="subtle" onClick={onClose} disabled={isCreating}>
						Cancel
					</Button>
					{step === "select" && (
						<Button
							variant="primary"
							onClick={handleGenerate}
							disabled={!selectedWorkItem || !config || isGenerating}
							data-testid="generate-suggestions-button"
						>
							Generate suggestions
						</Button>
					)}
					{step === "suggestions" && (
						<Button
							variant="primary"
							onClick={handleCreate}
							disabled={selectedCount === 0 || isCreating}
							data-testid="create-selected-button"
						>
							{isCreating ? "Creating..." : `Create ${selectedCount} selected`}
						</Button>
					)}
				</div>
			</div>
		</dialog>
	);
}
