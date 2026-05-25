import { Button } from "../design-system/index.js";

export type ReplaceOrAppendChoice = "replace" | "append" | "cancel";

interface ReplaceOrAppendModalProps {
	existingCount: number;
	newCount: number;
	onChoose: (choice: ReplaceOrAppendChoice) => void;
}

export function ReplaceOrAppendModal({
	existingCount,
	newCount,
	onChoose,
}: ReplaceOrAppendModalProps) {
	return (
		<dialog
			open
			aria-label="Replace or append suggested steps"
			data-testid="replace-or-append-modal"
			style={{
				position: "fixed",
				inset: 0,
				border: "none",
				background: "rgba(0,0,0,0.55)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1100,
				padding: 0,
				maxWidth: "100vw",
				maxHeight: "100vh",
				width: "100vw",
				height: "100vh",
			}}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: "8px",
					boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
					width: "480px",
					maxWidth: "95vw",
					padding: "20px 22px 16px",
				}}
			>
				<div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>
					Existing steps detected
				</div>
				<div style={{ fontSize: "13px", color: "#444", marginBottom: "16px" }}>
					This Test Case already contains <strong>{existingCount}</strong> step
					{existingCount === 1 ? "" : "s"}. How do you want to apply the <strong>{newCount}</strong>{" "}
					AI-suggested step{newCount === 1 ? "" : "s"}?
				</div>
				<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
					<Button variant="subtle" onClick={() => onChoose("cancel")} data-testid="roa-cancel">
						Cancel
					</Button>
					<Button variant="secondary" onClick={() => onChoose("append")} data-testid="roa-append">
						Append to existing
					</Button>
					<Button variant="primary" onClick={() => onChoose("replace")} data-testid="roa-replace">
						Replace existing
					</Button>
				</div>
			</div>
		</dialog>
	);
}
