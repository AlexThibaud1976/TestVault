import type { ReactNode } from "react";
import { useState } from "react";
import "./SectionCollapsible.css";

interface SectionCollapsibleProps {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	statusBadge?: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
}

export function SectionCollapsible({
	title,
	subtitle,
	icon,
	statusBadge,
	defaultOpen = true,
	children,
}: SectionCollapsibleProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className="ds-section">
			<button
				type="button"
				className="ds-section-header"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
			>
				{icon !== undefined && <div className="ds-section-icon">{icon}</div>}
				<div className="ds-section-title-block">
					<div className="ds-section-title">{title}</div>
					{subtitle !== undefined && <div className="ds-section-subtitle">{subtitle}</div>}
				</div>
				{statusBadge !== undefined && <div className="ds-section-status">{statusBadge}</div>}
				<svg
					className={`ds-section-chevron${isOpen ? " open" : ""}`}
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					aria-hidden="true"
				>
					<path d="M4 6l4 4 4-4" />
				</svg>
			</button>
			{isOpen && <div className="ds-section-body">{children}</div>}
		</div>
	);
}
