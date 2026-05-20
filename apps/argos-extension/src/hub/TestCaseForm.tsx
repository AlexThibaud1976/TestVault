import type { ITestCaseService, TestCaseDraft } from "@atconseil/argos-sdk";
import type { TestVaultTestCase } from "@atconseil/argos-types";
import { Button, Field, Input, Select, Text, Textarea } from "@fluentui/react-components";
import { useState } from "react";
import { GherkinEditor } from "./GherkinEditor.js";
import { useArgosToast } from "./components/Toast.js";

type Step = { id: string; action: string; expected: string };

let stepCounter = 0;
function newStep(): Step {
	return { id: `step-${++stepCounter}`, action: "", expected: "" };
}

function tcToFormState(tc: TestVaultTestCase): FormState {
	return {
		title: tc.title,
		areaPath: tc.areaPath,
		priority: tc.priority,
		automationStatus: tc.automationStatus,
		steps: tc.steps.map((s) => ({
			id: `step-${++stepCounter}`,
			action: s.action,
			expected: s.expected,
		})),
		gherkin: tc.gherkin,
	};
}

type FormState = {
	title: string;
	areaPath: string;
	priority: 1 | 2 | 3 | 4;
	automationStatus: "Manual" | "Planned" | "Automated";
	steps: Step[];
	gherkin?: string;
};

export interface TestCaseFormProps {
	service: ITestCaseService;
	project: string;
	initialValue?: TestVaultTestCase;
	onSaved?: (tc: TestVaultTestCase) => void;
	onDeleted?: () => void;
}

export function TestCaseForm({
	service,
	project: _project,
	initialValue,
	onSaved,
	onDeleted,
}: TestCaseFormProps) {
	const [form, setForm] = useState<FormState>(
		initialValue
			? tcToFormState(initialValue)
			: { title: "", areaPath: "", priority: 3, automationStatus: "Manual", steps: [] }
	);
	const [bddMode, setBddMode] = useState(() => Boolean(initialValue?.gherkin));
	const [titleError, setTitleError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const toast = useArgosToast();

	function updateStep(index: number, field: keyof Step, value: string) {
		setForm((prev) => {
			const steps = prev.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s));
			return { ...prev, steps };
		});
	}

	function addStep() {
		setForm((prev) => ({
			...prev,
			steps: [...prev.steps, newStep()],
		}));
	}

	function removeStep(index: number) {
		setForm((prev) => ({
			...prev,
			steps: prev.steps.filter((_, i) => i !== index),
		}));
	}

	function moveStepDown(index: number) {
		setForm((prev) => {
			if (index >= prev.steps.length - 1) return prev;
			const steps = [...prev.steps];
			const a = steps[index];
			const b = steps[index + 1];
			if (!a || !b) return prev;
			steps[index] = b;
			steps[index + 1] = a;
			return { ...prev, steps };
		});
	}

	function moveStepUp(index: number) {
		setForm((prev) => {
			if (index === 0) return prev;
			const steps = [...prev.steps];
			const a = steps[index - 1];
			const b = steps[index];
			if (!a || !b) return prev;
			steps[index - 1] = b;
			steps[index] = a;
			return { ...prev, steps };
		});
	}

	async function handleSave() {
		if (!form.title.trim()) {
			setTitleError(true);
			return;
		}
		setTitleError(false);
		setSaving(true);
		try {
			const draft: TestCaseDraft = {
				title: form.title,
				areaPath: form.areaPath,
				priority: form.priority,
				automationStatus: form.automationStatus,
				steps: form.steps.map((s, i) => ({ index: i + 1, action: s.action, expected: s.expected })),
				gherkin: form.gherkin,
			};
			const result = initialValue
				? await service.update(initialValue.id, draft)
				: await service.create(draft);
			const action = initialValue ? "updated" : "created";
			toast.success(`Test Case #${result.id} ${action}`);
			if (!initialValue) {
				setForm({ title: "", areaPath: "", priority: 3, automationStatus: "Manual", steps: [] });
			}
			onSaved?.(result);
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Unknown error";
			toast.error(`Failed to save Test Case: ${msg}`);
		} finally {
			setSaving(false);
		}
	}

	async function handleConfirmDelete() {
		if (!initialValue) return;
		await service.delete(initialValue.id);
		onDeleted?.();
	}

	return (
		<div style={{ padding: "24px", maxWidth: "640px" }}>
			<Field
				label="Title"
				required
				validationMessage={titleError ? "Title is required" : undefined}
				validationState={titleError ? "error" : "none"}
				style={{ marginBottom: "12px" }}
			>
				<Input
					data-testid="tc-title-input"
					value={form.title}
					onChange={(_, d) => setForm((prev) => ({ ...prev, title: d.value }))}
				/>
			</Field>
			{titleError && <span data-testid="title-error" style={{ display: "none" }} />}

			<div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
				<Field label="Priority">
					<Select
						value={String(form.priority)}
						onChange={(_, d) =>
							setForm((prev) => ({ ...prev, priority: Number(d.value) as 1 | 2 | 3 | 4 }))
						}
					>
						<option value="1">1 — Critical</option>
						<option value="2">2 — High</option>
						<option value="3">3 — Medium</option>
						<option value="4">4 — Low</option>
					</Select>
				</Field>
				<Field label="Automation">
					<Select
						value={form.automationStatus}
						onChange={(_, d) =>
							setForm((prev) => ({
								...prev,
								automationStatus: d.value as "Manual" | "Planned" | "Automated",
							}))
						}
					>
						<option value="Manual">Manual</option>
						<option value="Planned">Planned</option>
						<option value="Automated">Automated</option>
					</Select>
				</Field>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<Button
					data-testid="bdd-mode-toggle"
					appearance="subtle"
					onClick={() => setBddMode((prev) => !prev)}
					style={{ marginBottom: "8px" }}
				>
					{bddMode ? "Switch to Manual Steps" : "Switch to BDD / Gherkin"}
				</Button>
				{bddMode && (
					<GherkinEditor
						value={form.gherkin ?? ""}
						onChange={(v) => setForm((prev) => ({ ...prev, gherkin: v }))}
					/>
				)}
			</div>

			{!bddMode && (
				<>
					<Text weight="semibold" block style={{ marginBottom: "8px" }}>
						Steps
					</Text>
					{form.steps.map((step, i) => (
						<div
							key={step.id}
							style={{
								border: "1px solid #e0e0e0",
								borderRadius: "4px",
								padding: "8px",
								marginBottom: "8px",
							}}
						>
							<Text size={200} block style={{ marginBottom: "4px" }}>
								Step {i + 1}
							</Text>
							<Field label="Action" style={{ marginBottom: "4px" }}>
								<Textarea
									data-testid={`step-action-${i}`}
									value={step.action}
									onChange={(_, d) => updateStep(i, "action", d.value)}
									resize="vertical"
								/>
							</Field>
							<Field label="Expected result" style={{ marginBottom: "4px" }}>
								<Textarea
									data-testid={`step-expected-${i}`}
									value={step.expected}
									onChange={(_, d) => updateStep(i, "expected", d.value)}
									resize="vertical"
								/>
							</Field>
							<div style={{ display: "flex", gap: "4px" }}>
								<Button
									size="small"
									data-testid={`step-up-${i}`}
									disabled={i === 0}
									onClick={() => moveStepUp(i)}
								>
									↑
								</Button>
								<Button
									size="small"
									data-testid={`step-down-${i}`}
									disabled={i === form.steps.length - 1}
									onClick={() => moveStepDown(i)}
								>
									↓
								</Button>
								<Button
									size="small"
									appearance="subtle"
									data-testid={`remove-step-${i}`}
									onClick={() => removeStep(i)}
								>
									Remove
								</Button>
							</div>
						</div>
					))}
					<Button data-testid="add-step-button" onClick={addStep} style={{ marginBottom: "16px" }}>
						+ Add Step
					</Button>
				</>
			)}

			<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
				<Button
					appearance="primary"
					data-testid="save-button"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Saving…" : initialValue ? "Save Changes" : "Create Test Case"}
				</Button>

				{initialValue && !showDeleteConfirm && (
					<Button
						appearance="subtle"
						data-testid="delete-button"
						onClick={() => setShowDeleteConfirm(true)}
					>
						Delete
					</Button>
				)}
			</div>

			{showDeleteConfirm && (
				<div
					data-testid="delete-confirm-section"
					style={{
						marginTop: "12px",
						padding: "12px",
						border: "1px solid #f0a0a0",
						borderRadius: "4px",
					}}
				>
					<Text block style={{ marginBottom: "8px" }}>
						Are you sure you want to delete this Test Case? This cannot be undone.
					</Text>
					<div style={{ display: "flex", gap: "8px" }}>
						<Button
							appearance="primary"
							data-testid="delete-confirm-button"
							onClick={handleConfirmDelete}
						>
							Yes, delete
						</Button>
						<Button data-testid="delete-cancel-button" onClick={() => setShowDeleteConfirm(false)}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
