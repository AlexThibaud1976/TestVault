import type { TestVaultTestSet } from "@atconseil/argos-types";
import type { ITestSetService, TestSetDraft } from "@atconseil/testvault-sdk";
import { Button, Field, Input, Text, Textarea } from "@fluentui/react-components";
import { useState } from "react";

type Mode = "static" | "dynamic";

type FormState = {
	name: string;
	description: string;
	mode: Mode;
	testCaseIds: number[];
	wiqlQuery: string;
};

function setToFormState(s: TestVaultTestSet): FormState {
	return {
		name: s.name,
		description: s.description,
		mode: s.wiqlQuery ? "dynamic" : "static",
		testCaseIds: s.testCaseIds,
		wiqlQuery: s.wiqlQuery ?? "",
	};
}

export interface TestSetFormProps {
	service: ITestSetService;
	project: string;
	initialValue?: TestVaultTestSet;
	onSaved?: (set: TestVaultTestSet) => void;
	onDeleted?: () => void;
}

export function TestSetForm({
	service,
	project,
	initialValue,
	onSaved,
	onDeleted,
}: TestSetFormProps) {
	const [form, setForm] = useState<FormState>(
		initialValue
			? setToFormState(initialValue)
			: { name: "", description: "", mode: "static", testCaseIds: [], wiqlQuery: "" }
	);
	const [addIdInput, setAddIdInput] = useState("");
	const [nameError, setNameError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	function handleAddTcId() {
		const id = Number(addIdInput.trim());
		if (!id || Number.isNaN(id)) return;
		if (form.testCaseIds.includes(id)) {
			setAddIdInput("");
			return;
		}
		setForm((prev) => ({ ...prev, testCaseIds: [...prev.testCaseIds, id] }));
		setAddIdInput("");
	}

	function handleRemoveTcId(id: number) {
		setForm((prev) => ({ ...prev, testCaseIds: prev.testCaseIds.filter((x) => x !== id) }));
	}

	async function handleSave() {
		if (!form.name.trim()) {
			setNameError(true);
			return;
		}
		setNameError(false);
		setSaving(true);
		try {
			const draft: TestSetDraft = {
				name: form.name,
				areaPath: project,
				description: form.description,
				testCaseIds: form.mode === "static" ? form.testCaseIds : [],
				wiqlQuery: form.mode === "dynamic" ? form.wiqlQuery : undefined,
			};
			const result = initialValue
				? await service.update(initialValue.id, draft)
				: await service.create(draft);
			onSaved?.(result);
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
		<div style={{ padding: "24px", maxWidth: "560px" }}>
			<Field
				label="Name"
				required
				validationMessage={nameError ? "Name is required" : undefined}
				validationState={nameError ? "error" : "none"}
				style={{ marginBottom: "12px" }}
			>
				<Input
					data-testid="ts-name-input"
					value={form.name}
					onChange={(_, d) => setForm((prev) => ({ ...prev, name: d.value }))}
				/>
			</Field>
			{nameError && <span data-testid="name-error" style={{ display: "none" }} />}

			<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
				<Button
					data-testid="mode-static"
					appearance={form.mode === "static" ? "primary" : "secondary"}
					onClick={() => setForm((prev) => ({ ...prev, mode: "static" }))}
				>
					Static
				</Button>
				<Button
					data-testid="mode-dynamic"
					appearance={form.mode === "dynamic" ? "primary" : "secondary"}
					onClick={() => setForm((prev) => ({ ...prev, mode: "dynamic" }))}
				>
					Dynamic (WIQL)
				</Button>
			</div>

			{form.mode === "static" && (
				<div data-testid="static-tc-section">
					<Text weight="semibold" block style={{ marginBottom: "8px" }}>
						Test Cases
					</Text>
					<ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px 0" }}>
						{form.testCaseIds.map((id) => (
							<li
								key={id}
								data-testid={`tc-id-${id}`}
								style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
							>
								<Text>#{id}</Text>
								<Button
									size="small"
									appearance="subtle"
									data-testid={`remove-tc-${id}`}
									onClick={() => handleRemoveTcId(id)}
								>
									×
								</Button>
							</li>
						))}
					</ul>
					<div style={{ display: "flex", gap: "8px" }}>
						<Input
							data-testid="add-tc-id-input"
							placeholder="Work item ID"
							value={addIdInput}
							onChange={(_, d) => setAddIdInput(d.value)}
							style={{ width: "140px" }}
						/>
						<Button data-testid="add-tc-id-button" onClick={handleAddTcId}>
							Add
						</Button>
					</div>
				</div>
			)}

			{form.mode === "dynamic" && (
				<Field label="WIQL Query" style={{ marginBottom: "12px" }}>
					<Textarea
						data-testid="wiql-textarea"
						value={form.wiqlQuery}
						onChange={(_, d) => setForm((prev) => ({ ...prev, wiqlQuery: d.value }))}
						resize="vertical"
						rows={4}
					/>
				</Field>
			)}

			<div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
				<Button
					appearance="primary"
					data-testid="save-button"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Saving…" : initialValue ? "Save Changes" : "Create Test Set"}
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
						Delete this Test Set? The Test Cases it references will not be deleted.
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
