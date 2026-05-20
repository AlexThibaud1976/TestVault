import type { TestVaultTestPlan } from "@atconseil/argos-types";
import { useCallback, useMemo, useState } from "react";
import {
	Badge,
	type BadgeKind,
	Button,
	type Column,
	EmptyState,
	FilterChip,
	Input,
	Table,
} from "../../design-system/index.js";
import { useArgosList } from "../../hooks/use-argos-list.js";
import { useServices } from "../../services-context.js";
import "./TestPlansListView.css";

interface TestPlanRow {
	id: number;
	name: string;
	state: string;
	owner: string;
	iterationPath: string;
	casesCount: number;
	createdAt: string;
}

function mapPlansToRows(plans: TestVaultTestPlan[]): TestPlanRow[] {
	return plans.map((p) => ({
		id: p.id,
		name: p.name,
		state: p.state,
		owner: p.owner,
		iterationPath: p.iterationPath,
		casesCount: p.additionalTestCaseIds.length + p.testSetIds.length,
		createdAt: p.createdAt,
	}));
}

function stateToBadgeKind(state: string): BadgeKind {
	const s = state.toLowerCase();
	if (s === "locked") return "info";
	if (s === "closed" || s === "completed") return "success";
	if (s === "removed") return "warning";
	return "neutral";
}

function formatRelative(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	const days = Math.floor((Date.now() - d.getTime()) / 86400000);
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days}d ago`;
	return d.toLocaleDateString();
}

interface TestPlansListViewProps {
	onCreateNew: () => void;
}

export function TestPlansListView({ onCreateNew }: TestPlansListViewProps) {
	const { testPlanService } = useServices();
	const fetchFn = useCallback(() => testPlanService.list(), [testPlanService]);
	const { items, isLoading, error } = useArgosList({ fetchFn });

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "active">("all");

	const rows = useMemo(() => mapPlansToRows(items), [items]);

	const filteredRows = useMemo(
		() =>
			rows.filter((r) => {
				if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
				if (statusFilter === "active" && r.state.toLowerCase() !== "active") return false;
				return true;
			}),
		[rows, searchQuery, statusFilter]
	);

	const columns: Column<TestPlanRow>[] = [
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
			key: "state",
			header: "Status",
			width: "120px",
			render: (r) => (
				<Badge kind={stateToBadgeKind(r.state)} dot>
					{r.state}
				</Badge>
			),
		},
		{
			key: "casesCount",
			header: "Cases",
			width: "80px",
			render: (r) => String(r.casesCount),
		},
		{
			key: "owner",
			header: "Owner",
			width: "140px",
			render: (r) => r.owner || "Unassigned",
		},
		{
			key: "iterationPath",
			header: "Iteration",
			width: "160px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.iterationPath || "—"}
				</span>
			),
		},
		{
			key: "createdAt",
			header: "Created",
			width: "100px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{formatRelative(r.createdAt)}
				</span>
			),
		},
	];

	return (
		<div className="test-plans-list-view" data-testid="view-plans">
			<header className="content-header">
				<div className="content-title">
					<h1>Test Plans</h1>
					<span className="count">
						{rows.length} plan{rows.length !== 1 ? "s" : ""}
					</span>
				</div>
				<div className="content-actions">
					<Button variant="secondary">Import</Button>
					<Button variant="primary" onClick={onCreateNew}>
						+ New Test Plan
					</Button>
				</div>
			</header>

			<div className="filter-bar">
				<div className="filter-search">
					<Input
						type="search"
						placeholder="Search test plans..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<FilterChip
					active={statusFilter === "active"}
					onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
				>
					Status: Active
				</FilterChip>
				<FilterChip>Owner: All</FilterChip>
				<FilterChip>Tags</FilterChip>
			</div>

			<div className="content-body">
				{isLoading && <div className="loading-state">Loading test plans...</div>}
				{!isLoading && error !== null && (
					<div className="error-state">Failed to load: {error.message}</div>
				)}
				{!isLoading && error === null && (
					<Table
						columns={columns}
						rows={filteredRows}
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
										<rect x="8" y="12" width="32" height="28" rx="2" />
										<path d="M16 8h16" />
										<path d="M18 22h12M18 28h8" />
									</svg>
								}
								title="No test plans yet"
								description="Create your first test plan to start organizing test execution."
								action={
									<Button variant="primary" onClick={onCreateNew}>
										Create Test Plan
									</Button>
								}
							/>
						}
					/>
				)}
			</div>
		</div>
	);
}
