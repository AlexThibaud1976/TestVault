import type { TestVaultTestExecution } from "@atconseil/argos-types";
import { useCallback, useMemo, useState } from "react";
import { WitFilterBar } from "../components/WitFilterBar.js";
import { WitListHeader } from "../components/WitListHeader.js";
import { WitStatusBadge } from "../components/WitStatusBadge.js";
import { type Column, EmptyState, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

const STATUS_FILTERS = [
	{ key: "Pass", label: "Pass" },
	{ key: "Fail", label: "Fail" },
	{ key: "Blocked", label: "Blocked" },
	{ key: "Unexecuted", label: "Pending" },
];

interface TestExecutionsListViewProps {
	onCreateNew: () => void;
}

export function TestExecutionsListView({ onCreateNew }: TestExecutionsListViewProps) {
	const { testExecutionService } = useServices();
	const fetchFn = useCallback(async () => {
		const page = await testExecutionService.listExecutions({
			testCaseId: 0,
			page: 1,
			pageSize: 50,
		});
		return page.items;
	}, [testExecutionService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<string[]>([]);

	const filtered = useMemo(
		() =>
			items.filter((ex) => {
				if (
					searchQuery &&
					!ex.environment.toLowerCase().includes(searchQuery.toLowerCase()) &&
					!String(ex.id).includes(searchQuery)
				)
					return false;
				if (activeFilters.length > 0 && !activeFilters.includes(ex.globalStatus)) return false;
				return true;
			}),
		[items, searchQuery, activeFilters]
	);

	function toggleFilter(key: string) {
		setActiveFilters((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
		);
	}

	const columns: Column<TestVaultTestExecution>[] = [
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
			key: "testCaseId",
			header: "Test Case",
			width: "100px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					#{r.testCaseId}
				</span>
			),
		},
		{
			key: "globalStatus",
			header: "Status",
			width: "120px",
			render: (r) => <WitStatusBadge status={r.globalStatus} />,
		},
		{
			key: "environment",
			header: "Environment",
			width: "120px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.environment || "-"}
				</span>
			),
		},
		{
			key: "executedBy",
			header: "Executed by",
			width: "140px",
			render: (r) => r.executedBy || "-",
		},
		{
			key: "executedAt",
			header: "Date",
			width: "110px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.executedAt ? new Date(r.executedAt).toLocaleDateString() : "-"}
				</span>
			),
		},
	];

	return (
		<div className="wit-list-view" data-testid="view-test-executions">
			<WitListHeader
				title="Test Executions"
				count={items.length}
				onCreate={onCreateNew}
				createLabel="+ New Run"
			/>
			<WitFilterBar
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				searchPlaceholder="Search executions..."
				filters={STATUS_FILTERS}
				activeFilters={activeFilters}
				onFilterToggle={toggleFilter}
			/>
			<div className="wit-list-view-body">
				{isLoading && <div className="wit-list-view-loading">Loading test executions...</div>}
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
										<circle cx="24" cy="24" r="20" />
										<path d="M18 24l4 4 8-8" />
									</svg>
								}
								title="No test executions yet"
								description="Start a new run to record test execution results."
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
										Start New Run
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
