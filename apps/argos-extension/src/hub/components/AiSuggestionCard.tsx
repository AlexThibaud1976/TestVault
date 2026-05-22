import { useState } from "react";
import { Button } from "../design-system/index.js";
import type { TestCaseSuggestion } from "../llm/llm-provider.js";

const PRIORITY_COLORS: Record<string, { bg: string; color: string } | undefined> = {
	P1: { bg: "#fce8e6", color: "#c62828" },
	P2: { bg: "#fff3e0", color: "#e65100" },
	P3: { bg: "#e8f5e9", color: "#1b5e20" },
	P4: { bg: "#f5f5f5", color: "#555" },
};

const DEFAULT_PRIORITY_STYLE = { bg: "#f5f5f5", color: "#555" };

const COVERAGE_LABELS: Record<string, string> = {
	happy_path: "Happy path",
	edge_case: "Edge case",
	error_case: "Error case",
	acceptance_criterion: "Acceptance criterion",
};

interface AiSuggestionCardProps {
	suggestion: TestCaseSuggestion;
	index: number;
	selected: boolean;
	onToggle: () => void;
	onEdit: (updated: TestCaseSuggestion) => void;
}

export function AiSuggestionCard({
	suggestion,
	index,
	selected,
	onToggle,
	onEdit,
}: AiSuggestionCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(suggestion.title);
	const [editDescription, setEditDescription] = useState(suggestion.description);
	const [showSteps, setShowSteps] = useState(false);

	const priorityStyle = PRIORITY_COLORS[suggestion.priority] ?? DEFAULT_PRIORITY_STYLE;

	function handleSaveEdit() {
		onEdit({ ...suggestion, title: editTitle, description: editDescription });
		setIsEditing(false);
	}

	return (
		<div
			data-testid={`suggestion-card-${index}`}
			style={{
				border: "1px solid",
				borderColor: selected ? "#0078d4" : "#e0e0e0",
				borderRadius: "6px",
				padding: "10px 12px",
				marginBottom: "8px",
				background: selected ? "#f0f6ff" : "#fff",
			}}
		>
			<div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
				<input
					type="checkbox"
					checked={selected}
					onChange={onToggle}
					aria-label={`Select suggestion: ${suggestion.title}`}
					data-testid={`suggestion-checkbox-${index}`}
					style={{ marginTop: "3px", cursor: "pointer" }}
				/>

				<div style={{ flex: 1 }}>
					{isEditing ? (
						<div>
							<input
								type="text"
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								style={{
									width: "100%",
									padding: "4px 6px",
									fontSize: "13px",
									fontWeight: 600,
									border: "1px solid #ccc",
									borderRadius: "3px",
									marginBottom: "4px",
								}}
								data-testid={`suggestion-edit-title-${index}`}
							/>
							<textarea
								value={editDescription}
								onChange={(e) => setEditDescription(e.target.value)}
								rows={2}
								style={{
									width: "100%",
									padding: "4px 6px",
									fontSize: "12px",
									border: "1px solid #ccc",
									borderRadius: "3px",
									resize: "vertical",
								}}
								data-testid={`suggestion-edit-desc-${index}`}
							/>
							<div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
								<Button variant="primary" size="small" onClick={handleSaveEdit}>
									Save
								</Button>
								<Button
									variant="subtle"
									size="small"
									onClick={() => {
										setEditTitle(suggestion.title);
										setEditDescription(suggestion.description);
										setIsEditing(false);
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<>
							<div
								style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}
							>
								<span
									style={{
										padding: "1px 7px",
										borderRadius: "10px",
										fontSize: "11px",
										fontWeight: 700,
										background: priorityStyle.bg,
										color: priorityStyle.color,
									}}
								>
									{suggestion.priority}
								</span>
								<span style={{ fontWeight: 600, fontSize: "13px" }}>{suggestion.title}</span>
							</div>
							<div style={{ fontSize: "12px", color: "#555", marginBottom: "3px" }}>
								{COVERAGE_LABELS[suggestion.coverage_type] ?? suggestion.coverage_type}
								{" — "}
								{suggestion.steps.length} step{suggestion.steps.length !== 1 ? "s" : ""}
								{suggestion.tags.length > 0 && (
									<span style={{ marginLeft: "6px", color: "#0078d4" }}>
										{suggestion.tags.join(" ")}
									</span>
								)}
							</div>
						</>
					)}
				</div>

				{!isEditing && (
					<div style={{ display: "flex", gap: "4px" }}>
						<Button
							variant="subtle"
							size="small"
							onClick={() => setIsEditing(true)}
							data-testid={`suggestion-edit-btn-${index}`}
						>
							Edit
						</Button>
						<Button
							variant="subtle"
							size="small"
							onClick={() => setShowSteps((v) => !v)}
							data-testid={`suggestion-preview-btn-${index}`}
						>
							{showSteps ? "Hide" : "Preview"}
						</Button>
					</div>
				)}
			</div>

			{showSteps && !isEditing && (
				<ol
					data-testid={`suggestion-steps-${index}`}
					style={{ margin: "8px 0 0 28px", padding: 0, fontSize: "12px" }}
				>
					{suggestion.steps.map((step, si) => (
						<li key={`step-${si}-${step.action.slice(0, 20)}`} style={{ marginBottom: "4px" }}>
							<span style={{ fontWeight: 500 }}>{step.action}</span>
							{step.expected && <span style={{ color: "#555" }}> &rarr; {step.expected}</span>}
						</li>
					))}
				</ol>
			)}
		</div>
	);
}
