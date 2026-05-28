import type { TestCaseDraft, TestCasePatch } from "@atconseil/argos-sdk";
import { useCallback, useEffect, useState } from "react";
import { GherkinEditor } from "../GherkinEditor.js";
import { AiSuggestStepsModal } from "../components/AiSuggestStepsModal.js";
import { AreaPathPicker } from "../components/AreaPathPicker.js";
import { IterationPathPicker } from "../components/IterationPathPicker.js";
import { StepsEditor } from "../components/StepsEditor/index.js";
import { SuggestStepsDrawer } from "../components/SuggestStepsDrawer/index.js";
import { Badge, Button, Input, SectionCollapsible, Select } from "../design-system/index.js";
import { useArgosCreate } from "../hooks/use-argos-create.js";
import type { TestStepSuggestion } from "../llm/llm-provider.js";
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

export function TestCaseFormView({ onCancel, onSuccess, caseId }: TestCaseFormViewProps) {
	const { testCaseService, project } = useServices();
	const [aiModalOpen, setAiModalOpen] = useState(false);
	const [pendingSteps, setPendingSteps] = useState<TestStepSuggestion[] | null>(null);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<"1" | "2" | "3" | "4">("2");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [nextStepId, setNextStepId] = useState(2);
	const [steps, setSteps] = useState<TestStep[]>([{ id: 1, action: "", expected: "" }]);
	const [expectedResult, setExpectedResult] = useState("");
	const [linkedIds, setLinkedIds] = useState("");
	const [areaPath, setAreaPath] = useState("");
	const [iterationPath, setIterationPath] = useState("");
	const [gherkin, setGherkin] = useState("");
	// Sprint 2.23 -- in edit mode the TC carries TestVault.PreconditionLinks
	// (Option A: number[] field). We display the linked Precondition ids as
	// a read-only preamble. Fetching their titles is left to a future sprint
	// (TECH-DEBT) to avoid an extra N+1 read here.
	const [preconditionLinks, setPreconditionLinks] = useState<number[]>([]);

	// Sprint 2.22 -- edit mode (caseId set) fetches the existing WIT via
	// testCaseService.read and populates the form. Create mode (caseId
	// undefined) keeps the original empty form behaviour.
	const isEditMode = caseId !== undefined;
	const [isLoadingTestCase, setIsLoadingTestCase] = useState(isEditMode);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	useEffect(() => {
		if (caseId === undefined) return;
		let cancelled = false;
		setIsLoadingTestCase(true);
		setLoadError(null);
		testCaseService
			.read(caseId)
			.then((tc) => {
				if (cancelled) return;
				setTitle(tc.title);
				setDescription(tc.description ?? "");
				setPriority(String(tc.priority) as "1" | "2" | "3" | "4");
				setTags(tc.tags ?? []);
				setAreaPath(tc.areaPath ?? "");
				setIterationPath(tc.iterationPath ?? "");
				setGherkin(tc.gherkin ?? "");
				const fetchedSteps = (tc.steps ?? []).map((s, i) => ({
					id: i + 1,
					action: s.action ?? "",
					expected: s.expected ?? "",
				}));
				setSteps(fetchedSteps.length > 0 ? fetchedSteps : [{ id: 1, action: "", expected: "" }]);
				setNextStepId(Math.max(fetchedSteps.length, 1) + 1);
				setPreconditionLinks(tc.preconditionLinks ?? []);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setLoadError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setIsLoadingTestCase(false);
			});
		return () => {
			cancelled = true;
		};
	}, [caseId, testCaseService]);

	const createFn = useCallback(
		(draft: TestCaseDraft) => testCaseService.create(draft),
		[testCaseService]
	);

	const { mutate, isCreating } = useArgosCreate<TestCaseDraft>({
		kind: "TestCase",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const isValid = title.trim().length > 0 && areaPath.trim().length > 0;

	async function handleSubmit() {
		if (!isValid) return;
		const draft: TestCaseDraft = {
			title: title.trim(),
			areaPath: areaPath.trim(),
			description: description.trim() || undefined,
			priority: Number(priority) as 1 | 2 | 3 | 4,
			tags: tags.length > 0 ? tags : undefined,
			iterationPath: iterationPath.trim() || undefined,
			steps: steps
				.filter((s) => s.action.trim())
				.map((s, i) => ({ index: i + 1, action: s.action.trim(), expected: s.expected.trim() })),
			gherkin: gherkin.trim() || undefined,
		};
		if (isEditMode && caseId !== undefined) {
			setIsUpdating(true);
			try {
				const patch: TestCasePatch = draft;
				const updated = await testCaseService.update(caseId, patch);
				onSuccess(updated.id);
			} catch {
				// Errors surfaced via toast in a follow-up sprint; keep form usable.
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

	// Sprint 2.22 -- inline add/remove/update step handlers extracted into
	// StepsEditor component. The id allocation counter (nextStepId /
	// setNextStepId) is still owned here because applySteps below mints
	// ids for steps coming back from the AI Suggest Steps flow.

	// Sprint 2.22 T-2.22.2: lenient activation -- title OR at least one
	// linked work item id. Decision Q7 (Alex 2026-05-22 evening).
	const aiButtonEnabled =
		title.trim().length > 0 || linkedIds.split(",").some((s) => s.trim().length > 0);

	function applySteps(newSteps: TestStepSuggestion[], mode: "replace" | "append") {
		const sanitized = newSteps
			.map((s) => ({ action: s.action.trim(), expected: s.expected.trim() }))
			.filter((s) => s.action.length > 0);
		if (sanitized.length === 0) return;
		if (mode === "replace") {
			let counter = nextStepId;
			const replaced: TestStep[] = sanitized.map((s) => {
				const id = counter;
				counter += 1;
				return { id, action: s.action, expected: s.expected };
			});
			setSteps(replaced);
			setNextStepId(counter);
		} else {
			const existing = steps.filter((s) => s.action.trim().length > 0);
			let counter = nextStepId;
			const appended: TestStep[] = sanitized.map((s) => {
				const id = counter;
				counter += 1;
				return { id, action: s.action, expected: s.expected };
			});
			setSteps([...existing, ...appended]);
			setNextStepId(counter);
		}
	}

	// Sprint 2.22 Replace / Append / Cancel logic. Sprint 2.21 part 3 wraps
	// these in the SuggestStepsDrawer footer buttons -- callbacks only,
	// merge logic stays here (applySteps).
	function handleDrawerReplace() {
		if (!pendingSteps) return;
		applySteps(pendingSteps, "replace");
		setPendingSteps(null);
	}

	function handleDrawerComplete() {
		if (!pendingSteps) return;
		applySteps(pendingSteps, "append");
		setPendingSteps(null);
	}

	function handleDrawerCancel() {
		setPendingSteps(null);
	}

	const section1Complete = title.trim().length > 0;

	if (isLoadingTestCase) {
		return (
			<div
				className="wit-form-view"
				data-testid="tc-form-loading"
				style={{ padding: 32, textAlign: "center", color: "#555" }}
			>
				Loading Test Case #{caseId}...
			</div>
		);
	}

	if (loadError) {
		return (
			<div
				className="wit-form-view"
				data-testid="tc-form-error"
				style={{ padding: 32, color: "#c62828" }}
			>
				Failed to load Test Case #{caseId}: {loadError}
				<div style={{ marginTop: 12 }}>
					<Button variant="subtle" onClick={onCancel}>
						Back to list
					</Button>
				</div>
			</div>
		);
	}

	const headerTitle = isEditMode ? `Edit Test Case #${caseId}` : "New Test Case";
	const submitInFlight = isCreating || isUpdating;
	const submitIdleLabel = isEditMode ? "Update Test Case" : "Create Test Case";
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
							disabled={!aiButtonEnabled}
							title={
								!aiButtonEnabled
									? "Set a title or link a requirement to enable AI suggestions"
									: undefined
							}
							data-testid="ai-suggest-steps-button"
						>
							✨ AI Suggest Steps
						</Button>
					</div>
					<StepsEditor steps={steps} onChange={setSteps} />
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

				{isEditMode && preconditionLinks.length > 0 && (
					<SectionCollapsible
						title="Preconditions"
						subtitle={`${preconditionLinks.length} linked precondition${
							preconditionLinks.length === 1 ? "" : "s"
						} (read-only)`}
						statusBadge={
							<Badge kind="neutral" dot>
								Linked
							</Badge>
						}
					>
						<div className="wit-form-field" data-testid="tc-precondition-links">
							<ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
								{preconditionLinks.map((pcId) => (
									<li key={pcId}>Precondition #{pcId}</li>
								))}
							</ul>
						</div>
					</SectionCollapsible>
				)}

				<SectionCollapsible
					title="BDD / Gherkin"
					subtitle="Feature / Scenario / Given / When / Then (Monaco editor)"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
				>
					<div className="wit-form-field">
						<GherkinEditor value={gherkin} onChange={setGherkin} />
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
					subtitle="Area path and iteration"
					statusBadge={
						areaPath.trim().length > 0 ? (
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
						<label className="wit-field-label" htmlFor="tc-area-path">
							Area Path <span className="wit-field-required">*</span>
						</label>
						<AreaPathPicker
							id="tc-area-path"
							value={areaPath}
							onChange={setAreaPath}
							projectId={project}
							required
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="tc-iteration-path">
							Iteration Path <span className="wit-field-optional">Optional</span>
						</label>
						<IterationPathPicker
							id="tc-iteration-path"
							value={iterationPath}
							onChange={setIterationPath}
							projectId={project}
						/>
					</div>
				</SectionCollapsible>
			</div>

			{aiModalOpen && (
				<AiSuggestStepsModal
					context={{
						title: title.trim() || undefined,
						description: description.trim() || undefined,
						tags: tags.length > 0 ? tags : undefined,
						priority: Number(priority) as 1 | 2 | 3 | 4,
						areaPath: areaPath.trim() || undefined,
					}}
					onClose={() => setAiModalOpen(false)}
					onApply={(newSteps) => {
						const meaningful = steps.filter((s) => s.action.trim().length > 0);
						if (meaningful.length === 0) {
							applySteps(newSteps, "replace");
						} else {
							setPendingSteps(newSteps);
						}
						setAiModalOpen(false);
					}}
				/>
			)}

			<SuggestStepsDrawer
				isOpen={pendingSteps !== null}
				generatedSteps={pendingSteps ?? []}
				hasExistingSteps={steps.some((s) => s.action.trim().length > 0)}
				onReplace={handleDrawerReplace}
				onComplete={handleDrawerComplete}
				onCancel={handleDrawerCancel}
			/>
		</div>
	);
}
