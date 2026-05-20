import type { ReactNode } from "react";
import "./FilterChip.css";

interface FilterChipProps {
	active?: boolean;
	onClick?: () => void;
	children: ReactNode;
}

export function FilterChip({ active = false, onClick, children }: FilterChipProps) {
	return (
		<button type="button" className={`ds-filter-chip${active ? " active" : ""}`} onClick={onClick}>
			{children}
		</button>
	);
}
