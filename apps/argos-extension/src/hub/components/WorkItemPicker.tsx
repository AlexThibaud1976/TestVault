import { useState } from "react";
import { Input } from "../design-system/index.js";
import { useAdoWorkItems } from "../hooks/use-ado-work-items.js";
import type { WorkItemResult } from "../services/ado-work-items-service.js";

const TYPE_OPTIONS = ["User Story", "Bug", "Requirement"];

interface WorkItemPickerProps {
	value: WorkItemResult | null;
	onChange: (item: WorkItemResult | null) => void;
}

export function WorkItemPicker({ value, onChange }: WorkItemPickerProps) {
	const [query, setQuery] = useState("");
	const [activeTypes, setActiveTypes] = useState<string[]>(TYPE_OPTIONS);
	const { items, isLoading, error } = useAdoWorkItems(query, activeTypes);

	function toggleType(type: string) {
		setActiveTypes((prev) =>
			prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
		);
	}

	return (
		<div data-testid="work-item-picker">
			<div style={{ marginBottom: "8px" }}>
				<Input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search work items..."
					data-testid="work-item-search"
				/>
			</div>

			<div
				style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}
				data-testid="type-filters"
			>
				{TYPE_OPTIONS.map((type) => (
					<button
						key={type}
						type="button"
						data-testid={`type-filter-${type.toLowerCase().replace(/ /g, "-")}`}
						onClick={() => toggleType(type)}
						style={{
							padding: "2px 10px",
							borderRadius: "12px",
							fontSize: "12px",
							fontWeight: 500,
							cursor: "pointer",
							border: "1px solid",
							background: activeTypes.includes(type) ? "#0078d4" : "#fff",
							color: activeTypes.includes(type) ? "#fff" : "#333",
							borderColor: activeTypes.includes(type) ? "#0078d4" : "#ccc",
						}}
					>
						{type}
					</button>
				))}
			</div>

			{isLoading && (
				<div data-testid="work-item-loading" style={{ color: "#666", fontSize: "13px" }}>
					Loading work items...
				</div>
			)}
			{error && (
				<div data-testid="work-item-error" style={{ color: "#c62828", fontSize: "13px" }}>
					Failed to load work items: {error.message}
				</div>
			)}

			{!isLoading && !error && (
				<ul
					data-testid="work-item-results"
					style={{
						listStyle: "none",
						padding: 0,
						margin: 0,
						maxHeight: "240px",
						overflowY: "auto",
					}}
				>
					{items.length === 0 && (
						<li style={{ color: "#666", fontSize: "13px", padding: "8px 0" }}>
							No work items found.
						</li>
					)}
					{items.map((item) => (
						<li key={item.id}>
							<button
								type="button"
								data-testid={`work-item-${item.id}`}
								onClick={() => onChange(value?.id === item.id ? null : item)}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "8px 10px",
									borderRadius: "4px",
									border: "1px solid",
									borderColor: value?.id === item.id ? "#0078d4" : "#e0e0e0",
									background: value?.id === item.id ? "#e8f0fe" : "#fff",
									cursor: "pointer",
									marginBottom: "4px",
									display: "block",
								}}
							>
								<span style={{ fontWeight: 600, fontSize: "13px" }}>#{item.id}</span>
								<span
									style={{
										marginLeft: "6px",
										fontSize: "11px",
										color: "#0078d4",
										background: "#e8f0fe",
										padding: "1px 6px",
										borderRadius: "8px",
									}}
								>
									{item.type}
								</span>
								<span style={{ marginLeft: "8px", fontSize: "13px" }}>{item.title}</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
