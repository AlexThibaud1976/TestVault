import type { IPreconditionService, PreconditionDraft } from "@atconseil/argos-sdk";
import type { TestVaultPrecondition } from "@atconseil/argos-types";
import { Button, Field, Input, Textarea } from "@fluentui/react-components";
import { useState } from "react";

type FormState = {
	title: string;
	description: string;
	tags: string[];
	linkedTestCaseIds: number[];
};

function precondToFormState(p: TestVaultPrecondition): FormState {
	return {
		title: p.title,
		description: p.description,
		tags: p.tags,
		linkedTestCaseIds: p.linkedTestCaseIds,
	};
}

export interface PreconditionFormProps {
	service: IPreconditionService;
	project: string;
	initialValue?: TestVaultPrecondition;
	onSaved?: (precond: TestVaultPrecondition) => void;
	onDeleted?: () => void;
}

export function PreconditionForm({
	service,
	project: _project,
	initialValue,
	onSaved,
	onDeleted,
}: PreconditionFormProps) {
	const [form, setForm] = useState<FormState>(
		initialValue
			? precondToFormState(initialValue)
			: { title: "", description: "", tags: [], linkedTestCaseIds: [] }
	);
	const [addTagInput, setAddTagInput] = useState("");
	const [addTcIdInput, setAddTcIdInput] = useState("");
	const [titleError, setTitleError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	function handleAddTag() {
		const val = addTagInput.trim();
		if (!val || form.tags.includes(val)) {
			setAddTagInput("");
			return;
		}
		setForm((prev) => ({ ...prev, tags: [...prev.tags, val] }));
		setAddTagInput("");
	}

	function handleRemoveTag(val: string) {
		setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== val) }));
	}

	function handleAddTcId() {
		const id = Number(addTcIdInput.trim());
		if (!id || Number.isNaN(id) || form.linkedTestCaseIds.includes(id)) {
			setAddTcIdInput("");
			return;
		}
		setForm((prev) => ({ ...prev, linkedTestCaseIds: [...prev.linkedTestCaseIds, id] }));
		setAddTcIdInput("");
	}

	function handleRemoveTcId(id: number) {
		setForm((prev) => ({
			...prev,
			linkedTestCaseIds: prev.linkedTestCaseIds.filter((x) => x !== id),
		}));
	}

	async function handleSave() {
		if (!form.title.trim()) {
			setTitleError(true);
			return;
		}
		setTitleError(false);
		setSaving(true);
		try {
			const draft: PreconditionDraft = {
				title: form.title,
				description: form.description,
				tags: form.tags,
				linkedTestCaseIds: form.linkedTestCaseIds,
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
				label="Title"
				required
				validationMessage={titleError ? "Title is required" : undefined}
				validationState={titleError ? "error" : "none"}
				style={{ marginBottom: "12px" }}
			>
				<Input
					data-testid="pc-title-input"
					value={form.title}
					onChange={(_, d) => setForm((prev) => ({ ...prev, title: d.value }))}
				/>
			</Field>
			{titleError && <span data-testid="title-error" style={{ display: "none" }} />}

			<Field label="Description" style={{ marginBottom: "12px" }}>
				<Textarea
					data-testid="pc-description-input"
					value={form.description}
					onChange={(_, d) => setForm((prev) => ({ ...prev, description: d.value }))}
					resize="vertical"
					rows={4}
				/>
			</Field>

			<div style={{ marginBottom: "12px" }}>
				<div style={{ fontWeight: 600, marginBottom: "6px" }}>Tags</div>
				<ul style={{ listStyle: "none", padding: 0, margin: "0 0 6px 0" }}>
					{form.tags.map((tag) => (
						<li
							key={tag}
							data-testid={`tag-${tag}`}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
								marginRight: "6px",
								marginBottom: "4px",
							}}
						>
							<span>{tag}</span>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-tag-${tag}`}
								onClick={() => handleRemoveTag(tag)}
							>
								×
							</Button>
						</li>
					))}
				</ul>
				<div style={{ display: "flex", gap: "8px" }}>
					<Input
						data-testid="add-tag-input"
						placeholder="e.g. auth"
						value={addTagInput}
						onChange={(_, d) => setAddTagInput(d.value)}
						style={{ width: "140px" }}
					/>
					<Button data-testid="add-tag-button" onClick={handleAddTag}>
						Add
					</Button>
				</div>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<div style={{ fontWeight: 600, marginBottom: "6px" }}>Linked Test Cases</div>
				<ul style={{ listStyle: "none", padding: 0, margin: "0 0 6px 0" }}>
					{form.linkedTestCaseIds.map((id) => (
						<li
							key={id}
							data-testid={`tc-id-${id}`}
							style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}
						>
							<span>#{id}</span>
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
						value={addTcIdInput}
						onChange={(_, d) => setAddTcIdInput(d.value)}
						style={{ width: "140px" }}
					/>
					<Button data-testid="add-tc-id-button" onClick={handleAddTcId}>
						Add
					</Button>
				</div>
			</div>

			<div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
				<Button
					appearance="primary"
					data-testid="save-button"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Saving…" : initialValue ? "Save Changes" : "Create Precondition"}
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
					<div style={{ marginBottom: "8px" }}>
						Delete this Precondition? Linked Test Cases will not be deleted.
					</div>
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
