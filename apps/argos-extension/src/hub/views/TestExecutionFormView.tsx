import type { ExecutionDraft } from "@atconseil/argos-sdk";
import { useCallback, useState } from "react";
import { Badge, Button, Input, SectionCollapsible, Select } from "../design-system/index.js";
import { useArgosCreate } from "../hooks/use-argos-create.js";
import { useServices } from "../services-context.js";
import "./wit-form-view.css";

const ENV_OPTIONS = [
	{ value: "dev", label: "Development" },
	{ value: "qa", label: "QA" },
	{ value: "staging", label: "Staging" },
	{ value: "prod", label: "Production" },
];

const RESULT_OPTIONS = [
	{ value: "", label: "-- Not Run --" },
	{ value: "Pass", label: "Pass" },
	{ value: "Fail", label: "Fail" },
	{ value: "Blocked", label: "Blocked" },
];

interface TestExecutionFormViewProps {
	onCancel: () => void;
	onSuccess: (id: number) => void;
	executionId?: number;
}

export function TestExecutionFormView({
	onCancel,
	onSuccess,
	executionId: _executionId,
}: TestExecutionFormViewProps) {
	const { testExecutionService } = useServices();

	const [testPlanId, setTestPlanId] = useState("");
	const [testCaseId, setTestCaseId] = useState("");
	const [environment, setEnvironment] = useState("qa");
	const [actualResult, setActualResult] = useState("");
	const [notes, setNotes] = useState("");
	const [stepStatus, setStepStatus] = useState("");

	const createFn = useCallback(
		(draft: ExecutionDraft) => testExecutionService.startRun(draft),
		[testExecutionService]
	);

	const { mutate, isCreating } = useArgosCreate<ExecutionDraft>({
		kind: "TestExecution",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const planIdNum = Number.parseInt(testPlanId.trim(), 10);
	const caseIdNum = Number.parseInt(testCaseId.trim(), 10);
	const isValid =
		!Number.isNaN(planIdNum) &&
		planIdNum > 0 &&
		!Number.isNaN(caseIdNum) &&
		caseIdNum > 0 &&
		environment !== "";

	async function handleSubmit() {
		if (!isValid) return;
		const draft: ExecutionDraft = {
			testPlanId: planIdNum,
			testCaseId: caseIdNum,
			environment,
			source: "Manual",
		};
		await mutate(draft).catch(() => {});
	}

	const passCount = stepStatus === "Pass" ? 1 : 0;
	const failCount = stepStatus === "Fail" ? 1 : 0;
	const blockedCount = stepStatus === "Blocked" ? 1 : 0;

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
					<h1 className="wit-form-title">New Test Execution</h1>
				</div>
				<div className="wit-form-header-actions">
					<Button variant="subtle" onClick={onCancel} disabled={isCreating}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={!isValid || isCreating}>
						{isCreating ? "Starting..." : "Start Run"}
					</Button>
				</div>
			</header>

			<div className="wit-form-body">
				<SectionCollapsible
					title="Execution Configuration"
					subtitle="Test plan, case and environment"
					statusBadge={
						isValid ? (
							<Badge kind="success" dot>
								Ready
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
						<label className="wit-field-label" htmlFor="ex-plan">
							Test Plan ID <span className="wit-field-required">*</span>
						</label>
						<Input
							id="ex-plan"
							type="number"
							value={testPlanId}
							onChange={(e) => setTestPlanId(e.target.value)}
							placeholder="Enter test plan ID"
						/>
						<span className="wit-field-hint">Sprint 2.20: real test plan picker from ADO</span>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ex-case">
							Test Case ID <span className="wit-field-required">*</span>
						</label>
						<Input
							id="ex-case"
							type="number"
							value={testCaseId}
							onChange={(e) => setTestCaseId(e.target.value)}
							placeholder="Enter test case ID"
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ex-env">
							Environment <span className="wit-field-required">*</span>
						</label>
						<Select
							id="ex-env"
							value={environment}
							onChange={(e) => setEnvironment(e.target.value)}
							options={ENV_OPTIONS}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Test Results"
					subtitle="Record execution outcome"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ex-result">
							Overall result
						</label>
						<Select
							id="ex-result"
							value={stepStatus}
							onChange={(e) => setStepStatus(e.target.value)}
							options={RESULT_OPTIONS}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ex-actual">
							Actual result <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="ex-actual"
							className="wit-textarea"
							value={actualResult}
							onChange={(e) => setActualResult(e.target.value)}
							placeholder="What actually happened during execution..."
							rows={3}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ex-notes">
							Notes <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="ex-notes"
							className="wit-textarea"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Additional notes or observations..."
							rows={2}
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
						Attachment upload -- Sprint 2.22
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Summary"
					subtitle="Auto-calculated pass/fail/blocked counts"
					statusBadge={
						<Badge kind="neutral" dot>
							Info
						</Badge>
					}
				>
					<div className="wit-summary-stats">
						<div className="wit-summary-stat">
							<span
								className="wit-summary-stat__value"
								style={{ color: "var(--success-fg, #0d7a40)" }}
							>
								{passCount}
							</span>
							<span className="wit-summary-stat__label">Passed</span>
						</div>
						<div className="wit-summary-stat">
							<span className="wit-summary-stat__value" style={{ color: "var(--error-fg, #c00)" }}>
								{failCount}
							</span>
							<span className="wit-summary-stat__label">Failed</span>
						</div>
						<div className="wit-summary-stat">
							<span className="wit-summary-stat__value" style={{ color: "var(--neutral-7)" }}>
								{blockedCount}
							</span>
							<span className="wit-summary-stat__label">Blocked</span>
						</div>
						<div className="wit-summary-stat">
							<span className="wit-summary-stat__value">1</span>
							<span className="wit-summary-stat__label">Total</span>
						</div>
					</div>
				</SectionCollapsible>
			</div>
		</div>
	);
}
