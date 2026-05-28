import type { TestSetDraft, TestSetPatch } from "@atconseil/argos-sdk";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, SectionCollapsible } from "../design-system/index.js";
import { useArgosCreate } from "../hooks/use-argos-create.js";
import { useServices } from "../services-context.js";
import "./wit-form-view.css";

interface TestSetFormViewProps {
	onCancel: () => void;
	onSuccess: (setId: number) => void;
	setId?: number;
}

export function TestSetFormView({ onCancel, onSuccess, setId }: TestSetFormViewProps) {
	const { testSetService } = useServices();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [tcIdInput, setTcIdInput] = useState("");
	const [linkedTcIds, setLinkedTcIds] = useState<number[]>([]);

	// Sprint 2.23 -- edit mode (setId set) fetches the existing TestSet
	// via testSetService.read and populates the form. Create mode keeps
	// the original empty-form behaviour.
	const isEditMode = setId !== undefined;
	const [isLoadingTestSet, setIsLoadingTestSet] = useState(isEditMode);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	useEffect(() => {
		if (setId === undefined) return;
		let cancelled = false;
		setIsLoadingTestSet(true);
		setLoadError(null);
		testSetService
			.read(setId)
			.then((ts) => {
				if (cancelled) return;
				setName(ts.name);
				setDescription(ts.description ?? "");
				setTags(ts.tags ?? []);
				setLinkedTcIds(ts.testCaseIds ?? []);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setLoadError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setIsLoadingTestSet(false);
			});
		return () => {
			cancelled = true;
		};
	}, [setId, testSetService]);

	const createFn = useCallback(
		(draft: TestSetDraft) => testSetService.create(draft),
		[testSetService]
	);

	const { mutate, isCreating } = useArgosCreate<TestSetDraft>({
		kind: "TestSet",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const isValid = name.trim().length > 0;

	async function handleSubmit() {
		if (!isValid) return;
		const draft: TestSetDraft = {
			name: name.trim(),
			areaPath: "",
			description: description.trim() || undefined,
			tags: tags.length > 0 ? tags : undefined,
			testCaseIds: linkedTcIds.length > 0 ? linkedTcIds : undefined,
		};
		if (isEditMode && setId !== undefined) {
			setIsUpdating(true);
			try {
				const patch: TestSetPatch = draft;
				const updated = await testSetService.update(setId, patch);
				onSuccess(updated.id);
			} catch {
				// Surfaced via toast in a follow-up sprint.
			} finally {
				setIsUpdating(false);
			}
			return;
		}
		await mutate(draft).catch(() => {});
	}

	function addTag() {
		const t = tagInput.trim();
		if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
		setTagInput("");
	}

	function removeTag(t: string) {
		setTags((prev) => prev.filter((x) => x !== t));
	}

	function addTcId() {
		const n = Number.parseInt(tcIdInput.trim(), 10);
		if (!Number.isNaN(n) && n > 0 && !linkedTcIds.includes(n)) {
			setLinkedTcIds((prev) => [...prev, n]);
		}
		setTcIdInput("");
	}

	function removeTcId(id: number) {
		setLinkedTcIds((prev) => prev.filter((x) => x !== id));
	}

	const section1Complete = name.trim().length > 0;

	if (isLoadingTestSet) {
		return (
			<div
				className="wit-form-view"
				data-testid="testset-form-loading"
				style={{ padding: 32, textAlign: "center", color: "#555" }}
			>
				Loading Test Set #{setId}...
			</div>
		);
	}

	if (loadError) {
		return (
			<div
				className="wit-form-view"
				data-testid="testset-form-error"
				style={{ padding: 32, color: "#c62828" }}
			>
				Failed to load Test Set #{setId}: {loadError}
				<div style={{ marginTop: 12 }}>
					<Button variant="subtle" onClick={onCancel}>
						Back to list
					</Button>
				</div>
			</div>
		);
	}

	const headerTitle = isEditMode ? `Edit Test Set #${setId}` : "New Test Set";
	const submitInFlight = isCreating || isUpdating;
	const submitIdleLabel = isEditMode ? "Update Test Set" : "Create Test Set";
	const submitBusyLabel = isEditMode ? "Saving..." : "Creating...";

	return (
		<div className="wit-form-view">
			<header className="wit-form-header">
				<div className="wit-form-header-left">
					<button
						type="button"
						className="wit-form-back-btn"
						onClick={onCancel}
						disabled={submitInFlight}
						aria-label="Back to list"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-hidden="true"
						>
							<path d="M10 3L5 8l5 5" />
						</svg>
					</button>
					<h1 className="wit-form-title">{headerTitle}</h1>
				</div>
				<div className="wit-form-header-actions">
					<Button variant="subtle" onClick={onCancel} disabled={submitInFlight}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={!isValid || submitInFlight}>
						{submitInFlight ? submitBusyLabel : submitIdleLabel}
					</Button>
				</div>
			</header>

			<div className="wit-form-body">
				<SectionCollapsible
					title="General information"
					subtitle="Name, description and tags"
					statusBadge={
						section1Complete ? (
							<Badge kind="success" dot>
								Complete
							</Badge>
						) : (
							<Badge kind="neutral" dot>
								Required
							</Badge>
						)
					}
					defaultOpen
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ts-name">
							Name <span className="wit-field-required">*</span>
						</label>
						<Input
							id="ts-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Authentication smoke suite"
							inputSize="large"
							autoFocus
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ts-desc">
							Description <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="ts-desc"
							className="wit-textarea"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the purpose of this test set..."
							rows={3}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ts-tags">
							Tags <span className="wit-field-optional">Optional</span>
						</label>
						<div className="wit-tag-input-row">
							<Input
								id="ts-tags"
								type="text"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addTag();
									}
								}}
								placeholder="Type a tag and press Enter"
							/>
							<Button variant="secondary" size="small" onClick={addTag}>
								Add
							</Button>
						</div>
						{tags.length > 0 && (
							<div className="wit-tag-list">
								{tags.map((t) => (
									<button
										key={t}
										type="button"
										className="wit-tag-chip"
										onClick={() => removeTag(t)}
										aria-label={`Remove tag ${t}`}
									>
										{t}
										<span className="wit-tag-remove" aria-hidden="true">
											x
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Linked Test Cases"
					subtitle="Test cases included in this set (Sprint 2.23: drag-reorder)"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ts-tcid">
							Add Test Case by ID
						</label>
						<div className="wit-tag-input-row">
							<Input
								id="ts-tcid"
								type="number"
								value={tcIdInput}
								onChange={(e) => setTcIdInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addTcId();
									}
								}}
								placeholder="Enter test case ID"
							/>
							<Button variant="secondary" size="small" onClick={addTcId}>
								Add
							</Button>
						</div>
					</div>
					{linkedTcIds.length > 0 && (
						<div className="wit-tc-checkbox-list">
							{linkedTcIds.map((id) => (
								<div key={id} className="wit-tc-checkbox-row">
									<span style={{ flex: 1 }}>Test Case #{id}</span>
									<Button
										variant="subtle"
										size="small"
										onClick={() => removeTcId(id)}
										aria-label={`Remove test case ${id}`}
									>
										x
									</Button>
								</div>
							))}
						</div>
					)}
				</SectionCollapsible>

				<SectionCollapsible
					title="Execution Settings"
					subtitle="Default environment and tester"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
				>
					<div className="wit-coming-soon-placeholder">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-hidden="true"
						>
							<circle cx="8" cy="8" r="6" />
							<path d="M8 5v3l1.5 1.5" />
						</svg>
						Default environment and tester assignment -- Sprint 2.20
					</div>
				</SectionCollapsible>
			</div>
		</div>
	);
}
