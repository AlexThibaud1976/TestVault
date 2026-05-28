import { useEffect, useState } from "react";
import { AreaPathPicker } from "../../components/AreaPathPicker.js";
import { IterationPicker } from "../../components/IterationPicker.js";
import { useArgosToast } from "../../components/Toast.js";
import { Badge, Button, Input, SectionCollapsible } from "../../design-system/index.js";
import { useTestPlanDetail } from "../../hooks/use-test-plan-detail.js";
import { useServices } from "../../services-context.js";
import "./TestPlanFormView.css";

interface TestPlanFormViewProps {
	planId?: number;
	onCancel: () => void;
	onSuccess: (planId: number) => void;
}

export function TestPlanFormView({ planId, onCancel, onSuccess }: TestPlanFormViewProps) {
	const { testPlanService, project } = useServices();
	const toast = useArgosToast();
	const isEditMode = planId !== undefined;

	const { plan: existingPlan, isLoading: isLoadingPlan } = useTestPlanDetail(planId);

	const [name, setName] = useState("");
	const [owner, setOwner] = useState("");
	const [description, setDescription] = useState("");
	const [areaPath, setAreaPath] = useState("");
	const [iterationPath, setIterationPath] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<Error | null>(null);
	// Sprint 2.23 -- planState reflects the SDK-side state of the Test Plan
	// (Draft / Locked / Closed). When the plan transitions via lock() or
	// unlock() we update it locally so the UI reflects the new state without
	// a full refetch.
	const [planState, setPlanState] = useState<"Draft" | "Locked" | "Closed" | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);

	// Pre-fill form when existing plan loads in edit mode
	useEffect(() => {
		if (!existingPlan) return;
		setName(existingPlan.name);
		setOwner(existingPlan.owner ?? "");
		setDescription(existingPlan.description ?? "");
		setIterationPath(existingPlan.iterationPath ?? "");
		setTags(existingPlan.environments ?? []);
		setPlanState(existingPlan.state as "Draft" | "Locked" | "Closed");
	}, [existingPlan]);

	const isLocked = planState === "Locked";
	const isValid = name.trim().length > 0;

	async function handleLock() {
		if (planId === undefined) return;
		setIsTransitioning(true);
		try {
			const locked = await testPlanService.lock(planId);
			setPlanState(locked.state as "Draft" | "Locked" | "Closed");
			toast.success(`Test Plan #${locked.id} locked`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Unknown error";
			toast.error(`Failed to lock Test Plan: ${msg}`);
		} finally {
			setIsTransitioning(false);
		}
	}

	async function handleUnlock() {
		if (planId === undefined) return;
		setIsTransitioning(true);
		try {
			const unlocked = await testPlanService.unlock(planId);
			setPlanState(unlocked.state as "Draft" | "Locked" | "Closed");
			toast.success(`Test Plan #${unlocked.id} unlocked`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Unknown error";
			toast.error(`Failed to unlock Test Plan: ${msg}`);
		} finally {
			setIsTransitioning(false);
		}
	}

	async function handleSubmit() {
		if (!isValid) return;
		setSaveError(null);
		setIsSaving(true);
		try {
			const draft = {
				name: name.trim(),
				owner: owner.trim(),
				...(description.trim() ? { description: description.trim() } : {}),
				// iterationPath uses real ADO Iteration classification nodes picker
				...(iterationPath.trim() ? { iterationPath: iterationPath.trim() } : {}),
				...(tags.length > 0 ? { environments: tags } : {}),
			};
			if (isEditMode) {
				const updated = await testPlanService.update(planId, draft);
				toast.success(`Test Plan #${updated.id} updated`);
				onSuccess(updated.id);
			} else {
				const created = await testPlanService.create(draft);
				toast.success(`Test Plan #${created.id} created`);
				onSuccess(created.id);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Unknown error";
			toast.error(`Failed to save Test Plan: ${msg}`);
			setSaveError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			setIsSaving(false);
		}
	}

	function addTag() {
		const t = tagInput.trim();
		if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
		setTagInput("");
	}

	function removeTag(t: string) {
		setTags((prev) => prev.filter((x) => x !== t));
	}

	const section1Complete = name.trim().length > 0;

	if (isEditMode && isLoadingPlan) {
		return (
			<div className="test-plan-form-view">
				<div className="form-loading">Loading Test Plan...</div>
			</div>
		);
	}

	return (
		<div className="test-plan-form-view">
			<header className="form-header">
				<div className="form-header-left">
					<button
						type="button"
						className="form-back-btn"
						onClick={onCancel}
						disabled={isSaving}
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
					<h1 className="form-title">{isEditMode ? "Edit Test Plan" : "New Test Plan"}</h1>
				</div>
				<div className="form-header-actions">
					{isEditMode && planState === "Draft" && (
						<Button
							variant="secondary"
							onClick={handleLock}
							disabled={isSaving || isTransitioning}
							data-testid="tp-lock-btn"
						>
							{isTransitioning ? "Locking…" : "Lock"}
						</Button>
					)}
					{isEditMode && planState === "Locked" && (
						<Button
							variant="secondary"
							onClick={handleUnlock}
							disabled={isSaving || isTransitioning}
							data-testid="tp-unlock-btn"
						>
							{isTransitioning ? "Unlocking…" : "Unlock"}
						</Button>
					)}
					<Button variant="subtle" onClick={onCancel} disabled={isSaving}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={!isValid || isSaving || isLocked}
					>
						{isSaving
							? isEditMode
								? "Saving…"
								: "Creating…"
							: isEditMode
								? "Save changes"
								: "Create Test Plan"}
					</Button>
				</div>
			</header>

			{isLocked && (
				<output
					data-testid="tp-locked-notice"
					style={{
						background: "#fff3e0",
						border: "1px solid #ffb74d",
						borderRadius: 4,
						padding: "8px 12px",
						margin: "8px 16px",
						fontSize: 13,
						color: "#5d4037",
					}}
				>
					Test Plan locked. Unlock to modify (Admin only).
				</output>
			)}

			{saveError && (
				<div className="form-error" role="alert">
					{saveError.message}
				</div>
			)}

			<div className="form-body">
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
					<div className="form-field">
						<label className="field-label" htmlFor="tp-name">
							Plan name <span className="field-required">*</span>
						</label>
						<Input
							id="tp-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Sprint 25 -- Regression suite"
							inputSize="large"
							autoFocus={!isEditMode}
						/>
					</div>

					<div className="form-field">
						<label className="field-label" htmlFor="tp-owner">
							Owner <span className="field-optional">Optional</span>
						</label>
						<Input
							id="tp-owner"
							type="text"
							value={owner}
							onChange={(e) => setOwner(e.target.value)}
							placeholder="e.g. Alexandre Thibaud"
						/>
					</div>

					<div className="form-field">
						<label className="field-label" htmlFor="tp-tags">
							Tags <span className="field-optional">Optional</span>
						</label>
						<div className="tag-input-row">
							<Input
								id="tp-tags"
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
							<div className="tag-list">
								{tags.map((t) => (
									<button
										key={t}
										type="button"
										className="tag-chip"
										onClick={() => removeTag(t)}
										aria-label={`Remove tag ${t}`}
									>
										{t}
										<span className="tag-remove" aria-hidden="true">
											x
										</span>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="form-field">
						<label className="field-label" htmlFor="tp-desc">
							Description <span className="field-optional">Optional</span>
						</label>
						<textarea
							id="tp-desc"
							className="ds-textarea"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the scope and goals of this test plan..."
							rows={3}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Test scope"
					subtitle="Area path, iteration and environments for this plan"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div className="form-field">
						<label className="field-label" htmlFor="tp-area">
							Area path <span className="field-optional">Optional</span>
						</label>
						<AreaPathPicker
							id="tp-area"
							value={areaPath}
							onChange={setAreaPath}
							projectId={project}
						/>
					</div>

					<div className="form-field">
						<label className="field-label" htmlFor="tp-iteration">
							Iteration path <span className="field-optional">Optional</span>
						</label>
						<IterationPicker
							id="tp-iteration"
							value={iterationPath}
							onChange={setIterationPath}
							projectId={project}
						/>
					</div>

					<div className="form-field">
						<p className="field-label">
							Linked test cases <span className="field-optional">Sprint 2.21+</span>
						</p>
						<div className="coming-soon-placeholder">
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								aria-hidden="true"
							>
								<circle cx="10" cy="10" r="8" />
								<path d="M10 6v4l2.5 2.5" />
							</svg>
							Drag-to-reorder linked test cases -- coming in Sprint 2.21.
						</div>
					</div>
				</SectionCollapsible>

				<div className="form-deferred-sections">
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
					Schedule, Notifications and Permissions sections -- coming in Sprint 2.21.
				</div>
			</div>
		</div>
	);
}
