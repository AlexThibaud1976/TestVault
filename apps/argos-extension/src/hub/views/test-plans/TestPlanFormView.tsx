import type { TestPlanDraft } from "@atconseil/argos-sdk";
import { useCallback, useState } from "react";
import { Badge, Button, Input, SectionCollapsible, Select } from "../../design-system/index.js";
import { useArgosCreate } from "../../hooks/use-argos-create.js";
import { useServices } from "../../services-context.js";
import { MOCK_ITERATIONS } from "../_mock-data.js";
import "./TestPlanFormView.css";

interface TestPlanFormViewProps {
	onCancel: () => void;
	onSuccess: (planId: number) => void;
}

export function TestPlanFormView({ onCancel, onSuccess }: TestPlanFormViewProps) {
	const { testPlanService } = useServices();

	const [name, setName] = useState("");
	const [owner, setOwner] = useState("");
	const [description, setDescription] = useState("");
	const [iterationPath, setIterationPath] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	const createFn = useCallback(
		(draft: TestPlanDraft) => testPlanService.create(draft),
		[testPlanService]
	);

	const { mutate, isCreating } = useArgosCreate<TestPlanDraft>({
		kind: "TestPlan",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const isValid = name.trim().length > 0;

	async function handleSubmit() {
		if (!isValid) return;
		const draft: TestPlanDraft = {
			name: name.trim(),
			owner: owner.trim(),
		};
		if (description.trim()) draft.description = description.trim();
		// Bug A fix: only include iterationPath if non-empty (avoids TF401347)
		if (iterationPath.trim()) draft.iterationPath = iterationPath.trim();
		if (tags.length > 0) {
			// tags stored as environments for now; linked cases in Sprint 2.19+
			draft.environments = tags;
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

	const section1Complete = name.trim().length > 0;

	return (
		<div className="test-plan-form-view">
			<header className="form-header">
				<div className="form-header-left">
					<button
						type="button"
						className="form-back-btn"
						onClick={onCancel}
						disabled={isCreating}
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
					<h1 className="form-title">New Test Plan</h1>
				</div>
				<div className="form-header-actions">
					<Button variant="subtle" onClick={onCancel} disabled={isCreating}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={!isValid || isCreating}>
						{isCreating ? "Creating…" : "Create Test Plan"}
					</Button>
				</div>
			</header>

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
							placeholder="e.g. Sprint 25 — Regression suite"
							inputSize="large"
							autoFocus
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
											×
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
							placeholder="Describe the scope and goals of this test plan…"
							rows={3}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Test scope"
					subtitle="Iteration and environments for this plan"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div className="form-field">
						<label className="field-label" htmlFor="tp-iteration">
							Iteration path <span className="field-optional">Optional</span>
						</label>
						<Select
							id="tp-iteration"
							value={iterationPath}
							onChange={(e) => setIterationPath(e.target.value)}
							options={[{ value: "", label: "— None —" }, ...MOCK_ITERATIONS]}
						/>
						<span className="field-hint">
							Sprint 2.19 will load real iteration paths from ADO (TECH-DEBT-061).
						</span>
					</div>

					<div className="form-field">
						<p className="field-label">
							Linked test cases <span className="field-optional">Sprint 2.19+</span>
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
							Drag-to-reorder linked test cases — coming in Sprint 2.19.
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
					Schedule, Notifications and Permissions sections — coming in Sprint 2.19.
				</div>
			</div>
		</div>
	);
}
