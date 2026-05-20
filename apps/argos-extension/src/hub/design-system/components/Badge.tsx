import type { ReactNode } from "react";
import "./Badge.css";

export type BadgeKind = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
	kind?: BadgeKind;
	dot?: boolean;
	children: ReactNode;
}

export function Badge({ kind = "neutral", dot = false, children }: BadgeProps) {
	return (
		<span className={`ds-badge ds-badge-${kind}`}>
			{dot && <span className="ds-badge-dot" />}
			{children}
		</span>
	);
}
