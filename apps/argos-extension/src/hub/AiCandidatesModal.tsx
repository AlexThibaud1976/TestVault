import { Button, Text } from "@fluentui/react-components";

export interface TcCandidate {
	title: string;
	steps: Array<{ action: string; expected: string }>;
	tags: string[];
	description?: string;
}

export interface AiCandidatesModalProps {
	candidates: TcCandidate[];
	onAccept: (candidates: TcCandidate[]) => void;
	onCancel: () => void;
	quotaRemaining: number;
}

export function AiCandidatesModal({
	candidates,
	onAccept,
	onCancel,
	quotaRemaining,
}: AiCandidatesModalProps) {
	return (
		<div data-testid="ai-candidates-modal" style={{ padding: "24px", maxWidth: "640px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "8px" }}>
				AI Test Case Suggestions
			</Text>
			<Text size={200} block style={{ color: "#666", marginBottom: "16px" }}>
				Quota remaining: <span data-testid="quota-remaining">{quotaRemaining}</span>
			</Text>

			<ul style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}>
				{candidates.map((c, i) => (
					<li
						key={c.title}
						data-testid={`candidate-${i}`}
						style={{
							border: "1px solid #e0e0e0",
							borderRadius: "4px",
							padding: "10px 12px",
							marginBottom: "6px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<div style={{ flex: 1 }}>
							<Text block size={300} weight="semibold">
								{c.title}
							</Text>
							<Text block size={200} style={{ color: "#666" }}>
								{c.steps.length} step{c.steps.length !== 1 ? "s" : ""}
								{c.tags.length > 0 ? ` · ${c.tags.join(", ")}` : ""}
							</Text>
						</div>
						<Button
							size="small"
							appearance="primary"
							data-testid={`accept-candidate-${i}`}
							onClick={() => onAccept([c])}
						>
							Accept
						</Button>
					</li>
				))}
			</ul>

			<div style={{ display: "flex", gap: "8px" }}>
				<Button
					appearance="primary"
					data-testid="accept-all-button"
					onClick={() => onAccept(candidates)}
				>
					Accept All
				</Button>
				<Button appearance="subtle" data-testid="cancel-button" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	);
}
