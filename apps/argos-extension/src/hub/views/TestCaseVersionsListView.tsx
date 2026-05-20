import type { TestVaultTestCaseVersion } from "@atconseil/argos-sdk";
import { useCallback, useState } from "react";
import { WitListHeader } from "../components/WitListHeader.js";
import { type Column, EmptyState, Input, Table } from "../design-system/index.js";
import { useArgosList } from "../hooks/use-argos-list.js";
import { useServices } from "../services-context.js";
import "./wit-list-view.css";

interface TestCaseVersionsListViewProps {
	onCreateNew?: () => void;
}

export function TestCaseVersionsListView({
	onCreateNew: _onCreateNew,
}: TestCaseVersionsListViewProps) {
	const { testCaseVersionService } = useServices();
	const [caseIdInput, setCaseIdInput] = useState("");
	const [confirmedCaseId, setConfirmedCaseId] = useState(0);

	const fetchFn = useCallback(async () => {
		if (confirmedCaseId <= 0) return [];
		return testCaseVersionService.listSnapshots(confirmedCaseId);
	}, [testCaseVersionService, confirmedCaseId]);

	const { items, isLoading, error } = useArgosList({ fetchFn });

	function handleSearch() {
		const n = Number.parseInt(caseIdInput.trim(), 10);
		setConfirmedCaseId(Number.isNaN(n) || n <= 0 ? 0 : n);
	}

	const columns: Column<TestVaultTestCaseVersion>[] = [
		{
			key: "id",
			header: "Version ID",
			width: "90px",
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
			header: "Snapshot Name",
			width: "160px",
			render: (r) => <span style={{ fontSize: "var(--t-small)", fontWeight: 500 }}>{r.name}</span>,
		},
		{
			key: "snapshotTitle",
			header: "Title at this version",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.snapshotTitle || "-"}
				</span>
			),
		},
		{
			key: "createdBy",
			header: "Changed by",
			width: "140px",
			render: (r) => r.createdBy || "-",
		},
		{
			key: "createdAt",
			header: "Date",
			width: "110px",
			render: (r) => (
				<span style={{ fontSize: "var(--t-small)", color: "var(--neutral-8)" }}>
					{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
				</span>
			),
		},
	];

	return (
		<div className="wit-list-view" data-testid="view-test-case-versions">
			<WitListHeader title="Test Case Versions" count={confirmedCaseId > 0 ? items.length : 0} />
			<div
				style={{
					background: "var(--neutral-0)",
					borderBottom: "1px solid var(--neutral-4)",
					padding: "var(--s-3) var(--s-6)",
					display: "flex",
					gap: "var(--s-2)",
					alignItems: "center",
				}}
			>
				<Input
					type="number"
					value={caseIdInput}
					onChange={(e) => setCaseIdInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSearch();
					}}
					placeholder="Enter Test Case ID..."
					style={{ width: "200px" }}
				/>
				<button
					type="button"
					onClick={handleSearch}
					style={{
						padding: "var(--s-1) var(--s-4)",
						background: "var(--argos-blue-primary)",
						color: "#fff",
						border: "none",
						borderRadius: "var(--r-1)",
						cursor: "pointer",
						fontSize: "var(--t-body)",
					}}
				>
					Search
				</button>
			</div>
			<div className="wit-list-view-body">
				{confirmedCaseId <= 0 && (
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
								<path d="M16 24h16M24 16v16" />
							</svg>
						}
						title="Enter a Test Case ID to view its versions"
						description="Type a Test Case ID in the search box above and press Search."
					/>
				)}
				{confirmedCaseId > 0 && isLoading && (
					<div className="wit-list-view-loading">Loading snapshots...</div>
				)}
				{confirmedCaseId > 0 && !isLoading && error !== null && (
					<div className="wit-list-view-error">Failed to load: {error.message}</div>
				)}
				{confirmedCaseId > 0 && !isLoading && error === null && (
					<Table
						columns={columns}
						rows={items}
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
										<path d="M16 24h16M24 16v16" />
									</svg>
								}
								title="No snapshots found"
								description="No snapshots have been recorded for this test case."
							/>
						}
					/>
				)}
			</div>
		</div>
	);
}
