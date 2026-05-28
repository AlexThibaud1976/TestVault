import {
	DrawerBody,
	DrawerFooter,
	DrawerHeader,
	DrawerHeaderTitle,
	OverlayDrawer,
	Spinner,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { Button } from "../../design-system/index.js";
import type { TestCaseSuggestion } from "../../llm/llm-provider.js";

// Sprint 2.21 part 3 CHECKPOINT A.1 -- Drawer UX for "Suggest Tests".
//
// Presentational drawer surface. The component is multi-step ready: parent
// controls which phase is active by composing props:
//   - When suggestions[] is supplied -> renders the review body (Accept All /
//     Accept Selected / Dismiss + per-card edit).
//   - When isGenerating === true -> renders a generating placeholder.
//   - Otherwise -> renders selectPhaseSlot (the parent injects the count +
//     area path + iteration path + Generate button UX).
//
// CoveragePanel orchestrates the phases and the LLM call -- this component
// stays free of services context so it can be rendered in isolated tests.

export interface SuggestTestsDrawerProps {
	isOpen: boolean;
	suggestions?: TestCaseSuggestion[];
	isGenerating?: boolean;
	selectPhaseSlot?: React.ReactNode;
	headerTitle?: string;
	sourceLabel?: string;
	errorMessage?: string;
	onAccept: (accepted: TestCaseSuggestion[]) => Promise<void> | void;
	onDismiss: () => void;
}

interface EditState {
	title: string;
	description: string;
}

function StepCountBadge({ count }: { count: number }) {
	return (
		<span style={{ fontSize: 12, color: "#555" }}>
			{count} step{count === 1 ? "" : "s"}
		</span>
	);
}

export function SuggestTestsDrawer({
	isOpen,
	suggestions,
	isGenerating,
	selectPhaseSlot,
	headerTitle = "✨ Suggest Test Cases with AI",
	sourceLabel,
	errorMessage,
	onAccept,
	onDismiss,
}: SuggestTestsDrawerProps) {
	const [local, setLocal] = useState<TestCaseSuggestion[]>(suggestions ?? []);
	const [checked, setChecked] = useState<Set<number>>(
		() => new Set((suggestions ?? []).map((_, i) => i))
	);
	const [editIdx, setEditIdx] = useState<number | null>(null);
	const [edit, setEdit] = useState<EditState>({ title: "", description: "" });
	const [isAccepting, setIsAccepting] = useState(false);

	// Reset local state when a new batch of suggestions arrives.
	useEffect(() => {
		setLocal(suggestions ?? []);
		setChecked(new Set((suggestions ?? []).map((_, i) => i)));
		setEditIdx(null);
		setIsAccepting(false);
	}, [suggestions]);

	if (!isOpen) return null;

	function toggle(idx: number) {
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(idx)) next.delete(idx);
			else next.add(idx);
			return next;
		});
	}

	function startEdit(idx: number) {
		const s = local[idx];
		if (!s) return;
		setEdit({ title: s.title, description: s.description });
		setEditIdx(idx);
	}

	function saveEdit() {
		if (editIdx === null) return;
		setLocal((prev) =>
			prev.map((s, i) =>
				i === editIdx ? { ...s, title: edit.title, description: edit.description } : s
			)
		);
		setEditIdx(null);
	}

	async function accept(items: TestCaseSuggestion[]) {
		if (items.length === 0) return;
		setIsAccepting(true);
		try {
			await onAccept(items);
		} finally {
			setIsAccepting(false);
		}
	}

	const hasSuggestions = Array.isArray(local) && local.length > 0;
	const acceptAll = () => accept(local);
	const acceptSelected = () => accept(local.filter((_, i) => checked.has(i)));

	const renderBody = () => {
		if (isGenerating) {
			return (
				<div
					data-testid="suggest-tests-generating"
					style={{ textAlign: "center", padding: "32px 0", color: "#555" }}
				>
					<Spinner label="Generating test cases..." />
					<div style={{ fontSize: 13, marginTop: 8 }}>
						AI is analyzing the work item. This may take 5-10 seconds.
					</div>
				</div>
			);
		}
		if (hasSuggestions) {
			return (
				<div data-testid="suggest-tests-review">
					{errorMessage && (
						<div
							data-testid="suggest-tests-error"
							style={{ color: "#c62828", fontSize: 13, marginBottom: 12 }}
						>
							{errorMessage}
						</div>
					)}
					{local.map((s, i) => {
						const isEditing = editIdx === i;
						return (
							<div
								key={`${i}-${s.title}`}
								data-testid={`suggest-test-card-${i}`}
								style={{
									border: "1px solid",
									borderColor: checked.has(i) ? "#0078d4" : "#e0e0e0",
									borderRadius: 6,
									padding: "10px 12px",
									marginBottom: 8,
									background: checked.has(i) ? "#f0f6ff" : "#fff",
								}}
							>
								<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
									<input
										type="checkbox"
										data-testid={`suggest-test-checkbox-${i}`}
										aria-label={`Select ${s.title}`}
										checked={checked.has(i)}
										onChange={() => toggle(i)}
										style={{ marginTop: 4, cursor: "pointer" }}
									/>
									<div style={{ flex: 1 }}>
										{isEditing ? (
											<>
												<input
													data-testid={`suggest-test-title-input-${i}`}
													type="text"
													value={edit.title}
													onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))}
													style={{
														width: "100%",
														padding: "4px 6px",
														fontSize: 13,
														fontWeight: 600,
														border: "1px solid #ccc",
														borderRadius: 3,
														marginBottom: 6,
													}}
												/>
												<textarea
													data-testid={`suggest-test-desc-input-${i}`}
													value={edit.description}
													onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
													rows={2}
													style={{
														width: "100%",
														padding: "4px 6px",
														fontSize: 12,
														border: "1px solid #ccc",
														borderRadius: 3,
														resize: "vertical",
													}}
												/>
												<div style={{ display: "flex", gap: 6, marginTop: 6 }}>
													<Button
														variant="primary"
														size="small"
														onClick={saveEdit}
														data-testid={`suggest-test-save-btn-${i}`}
													>
														Save
													</Button>
													<Button
														variant="subtle"
														size="small"
														onClick={() => setEditIdx(null)}
														data-testid={`suggest-test-cancel-edit-btn-${i}`}
													>
														Cancel
													</Button>
												</div>
											</>
										) : (
											<>
												<div
													style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}
												>
													<span style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</span>
												</div>
												<div style={{ fontSize: 12, color: "#555" }}>
													<StepCountBadge count={s.steps.length} />
													<span style={{ marginLeft: 6 }}>{s.priority}</span>
												</div>
											</>
										)}
									</div>
									{!isEditing && (
										<Button
											variant="subtle"
											size="small"
											onClick={() => startEdit(i)}
											data-testid={`suggest-test-edit-btn-${i}`}
										>
											Edit
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			);
		}
		return <div data-testid="suggest-tests-select">{selectPhaseSlot}</div>;
	};

	const selectedCount = Array.from(checked).filter((i) => i < local.length).length;

	return (
		<OverlayDrawer
			open={isOpen}
			position="end"
			size="medium"
			onOpenChange={(_e, data) => {
				if (!data.open) onDismiss();
			}}
			data-testid="suggest-tests-drawer"
		>
			<DrawerHeader>
				<DrawerHeaderTitle>{headerTitle}</DrawerHeaderTitle>
				{sourceLabel && (
					<div
						data-testid="suggest-tests-source"
						style={{
							marginTop: 8,
							padding: "6px 10px",
							background: "#e8f0fe",
							borderRadius: 4,
							fontSize: 13,
						}}
					>
						{sourceLabel}
					</div>
				)}
			</DrawerHeader>
			<DrawerBody>{renderBody()}</DrawerBody>
			<DrawerFooter>
				<Button
					variant="subtle"
					onClick={onDismiss}
					disabled={isAccepting}
					data-testid="suggest-tests-dismiss"
				>
					Dismiss
				</Button>
				{hasSuggestions && !isGenerating && (
					<>
						<Button
							variant="secondary"
							onClick={() => void acceptAll()}
							disabled={isAccepting || local.length === 0}
							data-testid="suggest-tests-accept-all"
						>
							{isAccepting ? "Creating..." : "Accept All"}
						</Button>
						<Button
							variant="primary"
							onClick={() => void acceptSelected()}
							disabled={isAccepting || selectedCount === 0}
							data-testid="suggest-tests-accept-selected"
						>
							{isAccepting ? "Creating..." : `Accept Selected (${selectedCount})`}
						</Button>
					</>
				)}
			</DrawerFooter>
		</OverlayDrawer>
	);
}
