import { FilterChip, Input } from "../design-system/index.js";
import "./WitFilterBar.css";

interface FilterOption {
	key: string;
	label: string;
	count?: number;
}

interface WitFilterBarProps {
	searchValue: string;
	onSearchChange: (value: string) => void;
	searchPlaceholder?: string;
	filters?: FilterOption[];
	activeFilters?: string[];
	onFilterToggle?: (key: string) => void;
}

export function WitFilterBar({
	searchValue,
	onSearchChange,
	searchPlaceholder = "Search...",
	filters,
	activeFilters,
	onFilterToggle,
}: WitFilterBarProps) {
	return (
		<div className="argos-filter-bar">
			<div className="argos-filter-bar__search">
				<Input
					type="search"
					placeholder={searchPlaceholder}
					value={searchValue}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>
			{filters !== undefined && filters.length > 0 && (
				<div className="argos-filter-bar__chips">
					{filters.map((filter) => (
						<FilterChip
							key={filter.key}
							active={activeFilters?.includes(filter.key) ?? false}
							onClick={() => onFilterToggle?.(filter.key)}
						>
							{filter.count !== undefined ? `${filter.label} (${filter.count})` : filter.label}
						</FilterChip>
					))}
				</div>
			)}
		</div>
	);
}
