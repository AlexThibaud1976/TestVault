import type { TestCaseDraft } from "@atconseil/argos-sdk";
import { useCallback, useState } from "react";
import { AiGenerateModal } from "../components/AiGenerateModal.js";
import { Badge, Button, Input, SectionCollapsible, Select } from "../design-system/index.js";
import { useArgosCreate } from "../hooks/use-argos-create.js";
import { useServices } from "../services-context.js";
import "./wit-form-view.css";

const PRIORITY_OPTIONS = [
	{ value: "1", label: "P1 - Critical" },
	{ value: "2", label: "P2 - High" },
	{ value: "3", label: "P3 - Medium" },
	{ value: "4", label: "P4 - Low" },
];

interface TestStep {
	id: number;
	action: string;
	expected: string;
}

interface TestCaseFormViewProps {
	onCancel: () => void;
	onSuccess: (caseId: number) => void;
	caseId?: number;
}

export function TestCaseFormView({ onCancel, onSuccess, caseId: _caseId }: TestCaseFormViewProps) {
	const { testCaseService } = useServices();
	const [aiModalOpen, setAiModalOpen] = useState(false);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<"1" | "2" | "3" | "4">("2");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [nextStepId, setNextStepId] = useState(2);
	const [steps, setSteps] = useState<TestStep[]>([{ id: 1, action: "", expected: "" }]);
	const [expectedResult, setExpectedResult] = useState("");
	const [linkedIds, setLinkedIds] = useState("");

	const createFn = useCallback(
		(draft: TestCaseDraft) => testCaseService.create(draft),
		[testCaseService]
	);

	const { mutate, isCreating } = useArgosCreate<TestCaseDraft>({
		kind: "TestCase",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const isValid = title.trim().length > 0;

	async function handleSubmit() {
		if (!isValid) return;
		const draft: TestCaseDraft = {
			title: title.trim(),
			areaPath: "",
			description: description.trim() || undefined,
			priority: Number(priority) as 1 | 2 | 3 | 4,
			tags: tags.length > 0 ? tags : undefined,
			steps: steps
				.filter((s) => s.action.trim())
				.map((s, i) => ({ index: i + 1, action: s.action.trim(), expected: s.expected.trim() })),
		};
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

	function addStep() {
		setSteps((prev) => [...prev, { id: nextStepId, action: "", expected: "" }]);
		setNextStepId((n) => n + 1);
	}

	function removeStep(idx: number) {
		setSteps((prev) => prev.filter((_, i) => i !== idx));
	}

	function updateStep(idx: number, field: "action" | "expected", value: string) {
		setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
	}

	const section1Complete = title.trim().length > 0;

	return (
		<div className="wit-form-view">
			<header className="wit-form-header">
				<div className="wit-form-header-left">
					<button
						type="button"
						className="wit-form-back-btn"
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
					<h1 className="wit-form-title">New Test Case</h1>
				</div>
				<div className="wit-form-header-actions">
					<Button variant="subtle" onClick={onCancel} disabled={isCreating}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={!isValid || isCreating}>
						{isCreating ? "Creating..." : "Create Test Case"}
					</Button>
				</div>
			</header>

			<div className="wit-form-body">
				<SectionCollapsible
					title="General information"
					subtitle="Title, description, priority and tags"
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
						<label className="wit-field-label" htmlFor="tc-title">
							Title <span className="wit-field-required">*</span>
						</label>
						<Input
							id="tc-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Login with valid credentials"
							inputSize="large"
							autoFocus
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="tc-priority">
							Priority <span className="wit-field-optional">Optional</span>
						</label>
						<Select
							id="tc-priority"
							value={priority}
							onChange={(e) => setPriority(e.target.value as "1" | "2" | "3" | "4")}
							options={PRIORITY_OPTIONS}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="tc-tags">
							Tags <span className="wit-field-optional">Optional</span>
						</label>
						<div className="wit-tag-input-row">
							<Input
								id="tc-tags"
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

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="tc-desc">
							Description <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="tc-desc"
							className="wit-textarea"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the purpose of this test case..."
							rows={3}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Test Steps"
					subtitle="Step-by-step actions and expected results"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div style={{ marginBottom: "8px" }}>
						<Button
							variant="secondary"
							size="small"
							onClick={() => setAiModalOpen(true)}
							data-testid="ai-generate-button"
						>
							AI Generate
						</Button>
					</div>
					<div className="wit-steps-list">
						{steps.map((step, idx) => (
							<div key={step.id} className="wit-step-row">
								<span className="wit-step-index">{idx + 1}</span>
								<div className="wit-step-fields">
									<Input
										type="text"
										value={step.action}
										onChange={(e) => updateStep(idx, "action", e.target.value)}
										placeholder="Action (e.g. Click Login button)"
									/>
									<Input
										type="text"
										value={step.expected}
										onChange={(e) => updateStep(idx, "expected", e.target.value)}
										placeholder="Expected result"
									/>
								</div>
								{steps.length > 1 && (
									<Button
										variant="subtle"
										size="small"
										onClick={() => removeStep(idx)}
										aria-label={`Remove step ${idx + 1}`}
									>
										x
									</Button>
								)}
							</div>
						))}
					</div>
					<Button variant="secondary" size="small" onClick={addStep}>
						+ Add Step
					</Button>
				</SectionCollapsible>

				<SectionCollapsible
					title="Expected Results"
					subtitle="Overall expected behavior"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
				>
					<div className="wit-form-field">
						<textarea
							className="wit-textarea"
							value={expectedResult}
							onChange={(e) => setExpectedResult(e.target.value)}
							placeholder="Describe the expected behavior overall..."
							rows={3}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Linked Items"
					subtitle="User stories and bugs (Sprint 2.20: real ADO picker)"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="tc-links">
							Linked work item IDs <span className="wit-field-optional">comma-separated</span>
						</label>
						<Input
							id="tc-links"
							type="text"
							value={linkedIds}
							onChange={(e) => setLinkedIds(e.target.value)}
							placeholder="e.g. 123, 456"
						/>
					</div>
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
						Real ADO work item picker -- Sprint 2.20
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Metadata"
					subtitle="Area path and iteration (Sprint 2.20: real ADO integration)"
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
						Area path and iteration -- Sprint 2.20 (TECH-DEBT-061)
					</div>
				</SectionCollapsible>
			</div>

			{aiModalOpen && (
				<AiGenerateModal
					onClose={() => setAiModalOpen(false)}
					onCreated={() => {
						setAiModalOpen(false);
					}}
				/>
			)}
		</div>
	);
}
