import type { TestVaultTestCase } from "@atconseil/argos-types";
import { useCallback, useMemo, useState } from "react";
import { WitFilterBar } from "../components/WitFilterBar.js";
import { WitListHeader } from "../components/WitListHeader.js";
import { WitStatusBadge } from "../components/WitStatusBadge.js";
import { Badge, type Column, EmptyState, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

const STATUS_FILTERS = [
	{ key: "Design", label: "Design" },
	{ key: "Ready", label: "Ready" },
	{ key: "Active", label: "Active" },
	{ key: "Deprecated", label: "Deprecated" },
];

function priorityLabel(p: number): string {
	return `P${p}`;
}

interface TestCasesListViewProps {
	onCreateNew: () => void;
}

export function TestCasesListView({ onCreateNew }: TestCasesListViewProps) {
	const { testCaseService } = useServices();
	const fetchFn = useCallback(() => testCaseService.list(), [testCaseService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<string[]>([]);

	const filtered = useMemo(
		() =>
			items.filter((tc) => {
				if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase()))
					return false;
				if (activeFilters.length > 0 && !activeFilters.includes(tc.state)) return false;
				return true;
			}),
		[items, searchQuery, activeFilters]
	);

	function toggleFilter(key: string) {
		setActiveFilters((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
		);
	}

	const columns: Column<TestVaultTestCase>[] = [
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
			header: "Title",
			render: (r) => <strong>{r.title}</strong>,
		},
		{
			key: "state",
			header: "Status",
			width: "120px",
			render: (r) => <WitStatusBadge status={r.state} />,
		},
		{
			key: "priority",
			header: "Priority",
			width: "80px",
			render: (r) => <Badge kind="neutral">{priorityLabel(r.priority)}</Badge>,
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
		{
			key: "modifiedAt",
			header: "Last Modified",
			width: "120px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.modifiedAt ? new Date(r.modifiedAt).toLocaleDateString() : "-"}
				</span>
			),
		},
	];

	return (
		<div className="wit-list-view" data-testid="view-test-cases">
			<WitListHeader
				title="Test Cases"
				count={items.length}
				onImport={() => {}}
				onCreate={onCreateNew}
				createLabel="+ New Test Case"
			/>
			<WitFilterBar
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				searchPlaceholder="Search test cases..."
				filters={STATUS_FILTERS}
				activeFilters={activeFilters}
				onFilterToggle={toggleFilter}
			/>
			<div className="wit-list-view-body">
				{isLoading && <div className="wit-list-view-loading">Loading test cases...</div>}
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
										<path d="M8 12l4 4 8-8" />
										<rect x="4" y="4" width="40" height="40" rx="4" />
										<path d="M16 24h16M16 32h10" />
									</svg>
								}
								title="No test cases yet"
								description="Create your first test case to start building your test suite."
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
										Create Test Case
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
