import { Button, Input } from "../../design-system/index.js";

// Sprint 2.22 -- StepsEditor extracted from TestCaseFormView inline CRUD.
// Adds Move Up / Move Down reordering on top of the existing add / edit /
// remove behaviour. Pure presentational, controlled component -- parent
// owns the steps state and the id allocation strategy.

export interface Step {
	id: number;
	action: string;
	expected: string;
}

export interface StepsEditorProps {
	steps: Step[];
	onChange: (steps: Step[]) => void;
	readOnly?: boolean;
}

let counterFallback = 1_000_000;
function nextId(steps: Step[]): number {
	const max = steps.reduce((m, s) => Math.max(m, s.id), 0);
	if (max >= counterFallback) counterFallback = max + 1;
	return max + 1 || ++counterFallback;
}

export function StepsEditor({ steps, onChange, readOnly }: StepsEditorProps) {
	function updateField(idx: number, field: "action" | "expected", value: string) {
		onChange(steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
	}

	function addStep() {
		onChange([...steps, { id: nextId(steps), action: "", expected: "" }]);
	}

	function removeStep(idx: number) {
		onChange(steps.filter((_, i) => i !== idx));
	}

	function moveUp(idx: number) {
		if (idx === 0) return;
		const next = [...steps];
		const prev = next[idx - 1];
		const cur = next[idx];
		if (!prev || !cur) return;
		next[idx - 1] = cur;
		next[idx] = prev;
		onChange(next);
	}

	function moveDown(idx: number) {
		if (idx >= steps.length - 1) return;
		const next = [...steps];
		const cur = next[idx];
		const after = next[idx + 1];
		if (!cur || !after) return;
		next[idx] = after;
		next[idx + 1] = cur;
		onChange(next);
	}

	const lastIdx = steps.length - 1;

	return (
		<div data-testid="steps-editor">
			<div className="wit-steps-list">
				{steps.map((step, idx) => (
					<div
						key={step.id}
						data-testid={`step-row-${idx}`}
						className="wit-step-row"
						style={{
							display: "grid",
							gridTemplateColumns: "32px 1fr auto",
							gap: 8,
							alignItems: "start",
							marginBottom: 8,
						}}
					>
						<span className="wit-step-index" style={{ fontWeight: 600, color: "#666" }}>
							{idx + 1}
						</span>
						<div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
							<Input
								data-testid={`step-action-${idx}`}
								type="text"
								value={step.action}
								onChange={(e) => updateField(idx, "action", e.target.value)}
								placeholder="Action (e.g. Click Login button)"
								disabled={readOnly}
							/>
							<Input
								data-testid={`step-expected-${idx}`}
								type="text"
								value={step.expected}
								onChange={(e) => updateField(idx, "expected", e.target.value)}
								placeholder="Expected result"
								disabled={readOnly}
							/>
						</div>
						{!readOnly && (
							<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
								<Button
									variant="subtle"
									size="small"
									data-testid={`step-move-up-btn-${idx}`}
									onClick={() => moveUp(idx)}
									disabled={idx === 0}
									aria-label={`Move step ${idx + 1} up`}
								>
									↑
								</Button>
								<Button
									variant="subtle"
									size="small"
									data-testid={`step-move-down-btn-${idx}`}
									onClick={() => moveDown(idx)}
									disabled={idx === lastIdx}
									aria-label={`Move step ${idx + 1} down`}
								>
									↓
								</Button>
								{steps.length > 1 && (
									<Button
										variant="subtle"
										size="small"
										data-testid={`step-remove-btn-${idx}`}
										onClick={() => removeStep(idx)}
										aria-label={`Remove step ${idx + 1}`}
									>
										x
									</Button>
								)}
							</div>
						)}
					</div>
				))}
			</div>
			{!readOnly && (
				<Button variant="secondary" size="small" data-testid="step-add-btn" onClick={addStep}>
					+ Add Step
				</Button>
			)}
		</div>
	);
}
