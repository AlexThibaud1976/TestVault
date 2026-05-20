import type { ReactNode } from "react";

interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "var(--s-9)",
				textAlign: "center",
				color: "var(--neutral-8)",
			}}
		>
			{icon !== undefined && (
				<div style={{ fontSize: "48px", marginBottom: "var(--s-4)", opacity: 0.4 }}>{icon}</div>
			)}
			<div
				style={{
					fontSize: "var(--t-h3)",
					fontWeight: 600,
					color: "var(--neutral-9)",
					marginBottom: "var(--s-2)",
				}}
			>
				{title}
			</div>
			{description !== undefined && (
				<div
					style={{ fontSize: "var(--t-body)", maxWidth: "400px", lineHeight: "var(--lh-relaxed)" }}
				>
					{description}
				</div>
			)}
			{action !== undefined && <div style={{ marginTop: "var(--s-5)" }}>{action}</div>}
		</div>
	);
}
