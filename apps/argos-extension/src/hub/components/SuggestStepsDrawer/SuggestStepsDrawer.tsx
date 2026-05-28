import {
	DrawerBody,
	DrawerFooter,
	DrawerHeader,
	DrawerHeaderTitle,
	OverlayDrawer,
	Spinner,
} from "@fluentui/react-components";
import { Button } from "../../design-system/index.js";
import type { TestStepSuggestion } from "../../llm/llm-provider.js";

// Sprint 2.21 part 3 CHECKPOINT A.2 -- Drawer UX around the existing Sprint
// 2.22 Replace / Append / Cancel logic for AI Suggest Steps.
//
// Wrapper rule (per CLAUDE_TASK): the Drawer MUST NOT re-implement the
// merge logic that Sprint 2.22 owns inside TestCaseFormView. The Drawer
// renders the generated steps preview + 3 buttons and forwards user
// intent through onReplace / onComplete / onCancel callbacks. The parent
// (TestCaseFormView) then runs the existing applySteps() / handleReplaceOrAppend()
// flow.

export interface SuggestStepsDrawerProps {
	isOpen: boolean;
	generatedSteps: TestStepSuggestion[];
	hasExistingSteps: boolean;
	isGenerating?: boolean;
	errorMessage?: string;
	onReplace: () => void;
	onComplete: () => void;
	onCancel: () => void;
}

export function SuggestStepsDrawer({
	isOpen,
	generatedSteps,
	hasExistingSteps,
	isGenerating,
	errorMessage,
	onReplace,
	onComplete,
	onCancel,
}: SuggestStepsDrawerProps) {
	if (!isOpen) return null;

	const showActions = !isGenerating && generatedSteps.length > 0;
	const replaceLabel = hasExistingSteps ? "Replace" : "Insert";

	return (
		<OverlayDrawer
			open={isOpen}
			position="end"
			size="medium"
			onOpenChange={(_e, data) => {
				if (!data.open) onCancel();
			}}
			data-testid="suggest-steps-drawer"
		>
			<DrawerHeader>
				<DrawerHeaderTitle>✨ AI Suggest Steps</DrawerHeaderTitle>
			</DrawerHeader>
			<DrawerBody>
				{errorMessage && (
					<div
						data-testid="suggest-steps-error"
						style={{ color: "#c62828", fontSize: 13, marginBottom: 12 }}
					>
						{errorMessage}
					</div>
				)}

				{isGenerating && (
					<div
						data-testid="suggest-steps-generating"
						style={{ textAlign: "center", padding: "24px 0", color: "#555" }}
					>
						<Spinner label="Generating steps..." />
						<div style={{ fontSize: 13, marginTop: 8 }}>
							AI is drafting steps for the current Test Case. This may take 5-10 seconds.
						</div>
					</div>
				)}

				{!isGenerating && generatedSteps.length === 0 && !errorMessage && (
					<div
						data-testid="suggest-steps-empty"
						style={{ textAlign: "center", padding: "16px 0", color: "#888", fontSize: 13 }}
					>
						No steps generated yet.
					</div>
				)}

				{!isGenerating && generatedSteps.length > 0 && (
					<div data-testid="suggest-steps-preview">
						<div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
							Review the suggested steps before applying:
						</div>
						{generatedSteps.map((s, idx) => (
							<div
								key={`step-${idx}-${s.action.slice(0, 20)}`}
								data-testid={`suggest-step-${idx}`}
								style={{
									border: "1px solid #e0e0e0",
									borderRadius: 4,
									padding: "8px 10px",
									marginBottom: 6,
									display: "grid",
									gridTemplateColumns: "auto 1fr",
									columnGap: 8,
									rowGap: 4,
									alignItems: "center",
								}}
							>
								<span style={{ fontWeight: 600, fontSize: 12, color: "#888" }}>#{idx + 1}</span>
								<span style={{ fontSize: 13 }}>{s.action}</span>
								<span style={{ fontWeight: 600, fontSize: 12, color: "#888" }}>=</span>
								<span style={{ fontSize: 13, color: "#444" }}>{s.expected}</span>
							</div>
						))}
					</div>
				)}
			</DrawerBody>
			<DrawerFooter>
				<Button variant="subtle" onClick={onCancel} data-testid="suggest-steps-cancel">
					Cancel
				</Button>
				{showActions && hasExistingSteps && (
					<Button variant="secondary" onClick={onComplete} data-testid="suggest-steps-complete">
						Complete
					</Button>
				)}
				{showActions && (
					<Button variant="primary" onClick={onReplace} data-testid="suggest-steps-replace">
						{replaceLabel}
					</Button>
				)}
			</DrawerFooter>
		</OverlayDrawer>
	);
}
