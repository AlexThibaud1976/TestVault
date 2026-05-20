import type { TestVaultTestSet } from "@atconseil/argos-types";
import { useCallback, useMemo, useState } from "react";
import { WitFilterBar } from "../components/WitFilterBar.js";
import { WitListHeader } from "../components/WitListHeader.js";
import { type Column, EmptyState, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

interface TestSetsListViewProps {
	onCreateNew: () => void;
}

export function TestSetsListView({ onCreateNew }: TestSetsListViewProps) {
	const { testSetService } = useServices();
	const fetchFn = useCallback(() => testSetService.list(), [testSetService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	const [searchQuery, setSearchQuery] = useState("");

	const filtered = useMemo(
		() =>
			items.filter((ts) => {
				if (searchQuery && !ts.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
				return true;
			}),
		[items, searchQuery]
	);

	const columns: Column<TestVaultTestSet>[] = [
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
			key: "name",
			header: "Name",
			render: (r) => <strong>{r.name}</strong>,
		},
		{
			key: "testCaseIds",
			header: "Test Cases",
			width: "100px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.testCaseIds.length}
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
		<div className="wit-list-view" data-testid="view-test-sets">
			<WitListHeader
				title="Test Sets"
				count={items.length}
				onImport={() => {}}
				onCreate={onCreateNew}
				createLabel="+ New Test Set"
			/>
			<WitFilterBar
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				searchPlaceholder="Search test sets..."
			/>
			<div className="wit-list-view-body">
				{isLoading && <div className="wit-list-view-loading">Loading test sets...</div>}
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
										<path d="M6 12a3 3 0 0 1 3-3h9l6 6h18a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V12z" />
									</svg>
								}
								title="No test sets yet"
								description="Create your first test set to group related test cases."
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
										Create Test Set
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
