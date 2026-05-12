import type { ITestPlanService, TestPlanDraft } from "@atconseil/argos-sdk";
import type { TestVaultTestPlan } from "@atconseil/argos-types";
import { Button, Field, Input } from "@fluentui/react-components";
import { useState } from "react";

type FormState = {
	name: string;
	owner: string;
	iterationPath: string;
	environments: string[];
	testSetIds: number[];
	additionalTestCaseIds: number[];
};

function planToFormState(p: TestVaultTestPlan): FormState {
	return {
		name: p.name,
		owner: p.owner,
		iterationPath: p.iterationPath,
		environments: p.environments,
		testSetIds: p.testSetIds,
		additionalTestCaseIds: p.additionalTestCaseIds,
	};
}

export interface TestPlanFormProps {
	service: ITestPlanService;
	project: string;
	initialValue?: TestVaultTestPlan;
	onSaved?: (plan: TestVaultTestPlan) => void;
	onDeleted?: () => void;
}

export function TestPlanForm({
	service,
	project: _project,
	initialValue,
	onSaved,
	onDeleted,
}: TestPlanFormProps) {
	const [form, setForm] = useState<FormState>(
		initialValue
			? planToFormState(initialValue)
			: {
					name: "",
					owner: "",
					iterationPath: "",
					environments: [],
					testSetIds: [],
					additionalTestCaseIds: [],
				}
	);
	const [addEnvInput, setAddEnvInput] = useState("");
	const [addSetIdInput, setAddSetIdInput] = useState("");
	const [addTcIdInput, setAddTcIdInput] = useState("");
	const [nameError, setNameError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	function handleAddEnv() {
		const val = addEnvInput.trim();
		if (!val || form.environments.includes(val)) {
			setAddEnvInput("");
			return;
		}
		setForm((prev) => ({ ...prev, environments: [...prev.environments, val] }));
		setAddEnvInput("");
	}

	function handleRemoveEnv(val: string) {
		setForm((prev) => ({ ...prev, environments: prev.environments.filter((e) => e !== val) }));
	}

	function handleAddSetId() {
		const id = Number(addSetIdInput.trim());
		if (!id || Number.isNaN(id) || form.testSetIds.includes(id)) {
			setAddSetIdInput("");
			return;
		}
		setForm((prev) => ({ ...prev, testSetIds: [...prev.testSetIds, id] }));
		setAddSetIdInput("");
	}

	function handleRemoveSetId(id: number) {
		setForm((prev) => ({ ...prev, testSetIds: prev.testSetIds.filter((x) => x !== id) }));
	}

	function handleAddTcId() {
		const id = Number(addTcIdInput.trim());
		if (!id || Number.isNaN(id) || form.additionalTestCaseIds.includes(id)) {
			setAddTcIdInput("");
			return;
		}
		setForm((prev) => ({ ...prev, additionalTestCaseIds: [...prev.additionalTestCaseIds, id] }));
		setAddTcIdInput("");
	}

	function handleRemoveTcId(id: number) {
		setForm((prev) => ({
			...prev,
			additionalTestCaseIds: prev.additionalTestCaseIds.filter((x) => x !== id),
		}));
	}

	async function handleSave() {
		if (!form.name.trim()) {
			setNameError(true);
			return;
		}
		setNameError(false);
		setSaving(true);
		try {
			const draft: TestPlanDraft = {
				name: form.name,
				owner: form.owner,
				iterationPath: form.iterationPath,
				environments: form.environments,
				testSetIds: form.testSetIds,
				additionalTestCaseIds: form.additionalTestCaseIds,
			};
			const result = initialValue
				? await service.update(initialValue.id, draft)
				: await service.create(draft);
			onSaved?.(result);
		} finally {
			setSaving(false);
		}
	}

	async function handleLock() {
		if (!initialValue) return;
		const result = await service.lock(initialValue.id);
		onSaved?.(result);
	}

	async function handleUnlock() {
		if (!initialValue) return;
		const result = await service.unlock(initialValue.id);
		onSaved?.(result);
	}

	async function handleConfirmDelete() {
		if (!initialValue) return;
		await service.delete(initialValue.id);
		onDeleted?.();
	}

	const isLocked = initialValue?.state === "Locked";

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
					data-testid="tp-name-input"
					value={form.name}
					onChange={(_, d) => setForm((prev) => ({ ...prev, name: d.value }))}
				/>
			</Field>
			{nameError && <span data-testid="name-error" style={{ display: "none" }} />}

			<Field label="Owner" style={{ marginBottom: "12px" }}>
				<Input
					data-testid="tp-owner-input"
					value={form.owner}
					onChange={(_, d) => setForm((prev) => ({ ...prev, owner: d.value }))}
				/>
			</Field>

			<Field label="Iteration Path" style={{ marginBottom: "12px" }}>
				<Input
					data-testid="tp-iteration-input"
					value={form.iterationPath}
					onChange={(_, d) => setForm((prev) => ({ ...prev, iterationPath: d.value }))}
				/>
			</Field>

			<div style={{ marginBottom: "12px" }}>
				<div style={{ fontWeight: 600, marginBottom: "6px" }}>Environments</div>
				<ul style={{ listStyle: "none", padding: 0, margin: "0 0 6px 0" }}>
					{form.environments.map((env) => (
						<li
							key={env}
							data-testid={`env-${env}`}
							style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}
						>
							<span>{env}</span>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-env-${env}`}
								onClick={() => handleRemoveEnv(env)}
							>
								×
							</Button>
						</li>
					))}
				</ul>
				<div style={{ display: "flex", gap: "8px" }}>
					<Input
						data-testid="add-env-input"
						placeholder="e.g. QA"
						value={addEnvInput}
						onChange={(_, d) => setAddEnvInput(d.value)}
						style={{ width: "160px" }}
					/>
					<Button data-testid="add-env-button" onClick={handleAddEnv}>
						Add
					</Button>
				</div>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<div style={{ fontWeight: 600, marginBottom: "6px" }}>Test Sets</div>
				<ul style={{ listStyle: "none", padding: 0, margin: "0 0 6px 0" }}>
					{form.testSetIds.map((id) => (
						<li
							key={id}
							data-testid={`set-id-${id}`}
							style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}
						>
							<span>#{id}</span>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-set-${id}`}
								onClick={() => handleRemoveSetId(id)}
							>
								×
							</Button>
						</li>
					))}
				</ul>
				<div style={{ display: "flex", gap: "8px" }}>
					<Input
						data-testid="add-set-id-input"
						placeholder="Work item ID"
						value={addSetIdInput}
						onChange={(_, d) => setAddSetIdInput(d.value)}
						style={{ width: "140px" }}
					/>
					<Button data-testid="add-set-id-button" onClick={handleAddSetId}>
						Add
					</Button>
				</div>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<div style={{ fontWeight: 600, marginBottom: "6px" }}>Additional Test Cases</div>
				<ul style={{ listStyle: "none", padding: 0, margin: "0 0 6px 0" }}>
					{form.additionalTestCaseIds.map((id) => (
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
					{saving ? "Saving…" : initialValue ? "Save Changes" : "Create Test Plan"}
				</Button>

				{initialValue && !isLocked && (
					<Button data-testid="lock-button" onClick={handleLock}>
						Lock
					</Button>
				)}

				{initialValue && isLocked && (
					<Button data-testid="unlock-button" onClick={handleUnlock}>
						Unlock
					</Button>
				)}

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
						Delete this Test Plan? The Test Sets and Test Cases it references will not be deleted.
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
