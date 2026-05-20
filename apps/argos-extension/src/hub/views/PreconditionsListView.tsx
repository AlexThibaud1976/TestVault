import type { TestVaultPrecondition } from "@atconseil/argos-types";
import { useCallback, useMemo, useState } from "react";
import { WitFilterBar } from "../components/WitFilterBar.js";
import { WitListHeader } from "../components/WitListHeader.js";
import { type Column, EmptyState, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

interface PreconditionsListViewProps {
	onCreateNew: () => void;
}

export function PreconditionsListView({ onCreateNew }: PreconditionsListViewProps) {
	const { preconditionService } = useServices();
	const fetchFn = useCallback(() => preconditionService.list(), [preconditionService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	const [searchQuery, setSearchQuery] = useState("");

	const filtered = useMemo(
		() =>
			items.filter((p) => {
				if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
				return true;
			}),
		[items, searchQuery]
	);

	const columns: Column<TestVaultPrecondition>[] = [
		{
			key: "id",
			header: "ID",
			width: "80px",
			render: (r) => (
				<span
					style={{
						fontFamily: "var(--font-mono)",
						fontSize: "var(--t-small)",
						color: "var(--neutral-8)",
					}}
				>
					#{r.id}
				</span>
			),
		},
		{
			key: "title",
			header: "Name",
			render: (r) => <strong>{r.title}</strong>,
		},
		{
			key: "linkedTestCaseIds",
			header: "Used by",
			width: "100px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.linkedTestCaseIds.length} case{r.linkedTestCaseIds.length !== 1 ? "s" : ""}
				</span>
			),
		},
		{
			key: "tags",
			header: "Tags",
			width: "160px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.tags.length > 0 ? r.tags.join(", ") : "-"}
				</span>
			),
		},
	];

	return (
		<div className="wit-list-view" data-testid="view-preconditions">
			<WitListHeader
				title="Preconditions"
				count={items.length}
				onCreate={onCreateNew}
				createLabel="+ New Precondition"
			/>
			<WitFilterBar
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				searchPlaceholder="Search preconditions..."
			/>
			<div className="wit-list-view-body">
				{isLoading && <div className="wit-list-view-loading">Loading preconditions...</div>}
				{!isLoading && error !== null && (
					<div className="wit-list-view-error">Failed to load: {error.message}</div>
				)}
				{!isLoading && error === null && (
					<Table
						columns={columns}
						rows={filtered}
						emptyState={
							<EmptyState
								icon={
									<svg
										width="48"
										height="48"
										viewBox="0 0 48 48"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-hidden="true"
									>
										<path d="M24 4L44 40H4L24 4z" />
										<path d="M24 18v10M24 32v2" />
									</svg>
								}
								title="No preconditions yet"
								description="Create reusable preconditions to share setup steps across test cases."
								action={
									<button
										type="button"
										onClick={onCreateNew}
										style={{
											padding: "var(--s-2) var(--s-4)",
											background: "var(--argos-blue-primary)",
											color: "#fff",
											border: "none",
											borderRadius: "var(--r-1)",
											cursor: "pointer",
											fontSize: "var(--t-body)",
										}}
									>
										Create Precondition
									</button>
								}
							/>
						}
					/>
				)}
			</div>
		</div>
	);
}
