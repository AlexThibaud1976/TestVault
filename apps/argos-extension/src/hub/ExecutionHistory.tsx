import type {
	ExecutionPage,
	ITestExecutionService,
	ListExecutionsOptions,
} from "@atconseil/argos-sdk";
import type { GlobalStatus } from "@atconseil/argos-types";
import { Button, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { computeFlaky } from "./computeFlaky.js";

export interface ExecutionHistoryProps {
	testCaseId: number;
	executionService: ITestExecutionService;
	availableEnvironments: string[];
}

const STATUS_OPTIONS: GlobalStatus[] = ["Pass", "Fail", "Blocked", "Skipped", "Unexecuted"];
const DEFAULT_PAGE_SIZE = 20;

export function ExecutionHistory({
	testCaseId,
	executionService,
	availableEnvironments,
}: ExecutionHistoryProps) {
	const [filterEnv, setFilterEnv] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterFrom, setFilterFrom] = useState("");
	const [filterTo, setFilterTo] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [data, setData] = useState<ExecutionPage | null>(null);

	useEffect(() => {
		void executionService
			.listExecutions({ testCaseId, page: 1, pageSize: DEFAULT_PAGE_SIZE })
			.then(setData);
	}, [executionService, testCaseId]);

	function applyFilters(env: string, status: string, from: string, to: string, page: number) {
		const opts: ListExecutionsOptions = { testCaseId, page, pageSize: DEFAULT_PAGE_SIZE };
		if (env) opts.environment = env;
		if (status) opts.status = status as GlobalStatus;
		if (from) opts.from = from;
		if (to) opts.to = to;
		void executionService.listExecutions(opts).then(setData);
	}

	function handleApplyFilters() {
		setCurrentPage(1);
		applyFilters(filterEnv, filterStatus, filterFrom, filterTo, 1);
	}

	function handleNextPage() {
		const next = currentPage + 1;
		setCurrentPage(next);
		applyFilters(filterEnv, filterStatus, filterFrom, filterTo, next);
	}

	function handlePrevPage() {
		const prev = currentPage - 1;
		setCurrentPage(prev);
		applyFilters(filterEnv, filterStatus, filterFrom, filterTo, prev);
	}

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE);

	const latestByEnv: Record<string, GlobalStatus> = {};
	for (const exec of items) {
		if (!latestByEnv[exec.environment]) {
			latestByEnv[exec.environment] = exec.globalStatus;
		}
	}
	const flakyEnvs = computeFlaky(
		items.map((e) => ({ globalStatus: e.globalStatus, environment: e.environment }))
	);

	return (
		<div data-testid="execution-history" style={{ padding: "16px" }}>
			<div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
				<select
					data-testid="filter-environment"
					value={filterEnv}
					onChange={(e) => setFilterEnv(e.target.value)}
				>
					<option value="">All environments</option>
					{availableEnvironments.map((env) => (
						<option key={env} value={env}>
							{env}
						</option>
					))}
				</select>
				<select
					data-testid="filter-status"
					value={filterStatus}
					onChange={(e) => setFilterStatus(e.target.value)}
				>
					<option value="">All statuses</option>
					{STATUS_OPTIONS.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
				<input
					data-testid="filter-from"
					type="date"
					value={filterFrom}
					onChange={(e) => setFilterFrom(e.target.value)}
					placeholder="From"
				/>
				<input
					data-testid="filter-to"
					type="date"
					value={filterTo}
					onChange={(e) => setFilterTo(e.target.value)}
					placeholder="To"
				/>
				<Button data-testid="apply-filters" appearance="secondary" onClick={handleApplyFilters}>
					Apply Filters
				</Button>
			</div>

			<div
				data-testid="env-matrix"
				style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}
			>
				{availableEnvironments.map((env) => (
					<div
						key={env}
						data-testid={`env-matrix-${env}`}
						style={{
							padding: "8px 12px",
							border: "1px solid #e0e0e0",
							borderRadius: "4px",
							minWidth: "80px",
							textAlign: "center",
						}}
					>
						<Text weight="semibold" block style={{ fontSize: "12px" }}>
							{env}
						</Text>
						<span>{latestByEnv[env] ?? "—"}</span>
					</div>
				))}
			</div>

			{items.length === 0 ? (
				<div data-testid="executions-empty" style={{ color: "#666" }}>
					No executions found.
				</div>
			) : (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
								Date
							</th>
							<th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
								Environment
							</th>
							<th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
								Status
							</th>
							<th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
								Bugs
							</th>
							<th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e0e0e0" }}>
								Executed by
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((exec) => (
							<tr
								key={exec.id}
								data-testid={`execution-row-${exec.id}`}
								style={{ borderBottom: "1px solid #f0f0f0" }}
							>
								<td style={{ padding: "8px" }}>{new Date(exec.executedAt).toLocaleDateString()}</td>
								<td style={{ padding: "8px" }}>{exec.environment}</td>
								<td style={{ padding: "8px" }}>
									{exec.globalStatus}
									{flakyEnvs.has(exec.environment) && (
										<span
											data-testid={`flaky-badge-${exec.environment}`}
											style={{
												marginLeft: "6px",
												padding: "1px 5px",
												background: "#fff4ce",
												border: "1px solid #f4b942",
												borderRadius: "3px",
												fontSize: "11px",
												color: "#805900",
											}}
										>
											Flaky
										</span>
									)}
								</td>
								<td style={{ padding: "8px" }}>{exec.bugLinks.length}</td>
								<td style={{ padding: "8px" }}>{exec.executedBy}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{totalPages > 1 && (
				<div style={{ display: "flex", gap: "8px", marginTop: "16px", alignItems: "center" }}>
					<Button
						data-testid="pagination-prev"
						appearance="secondary"
						disabled={currentPage === 1}
						onClick={handlePrevPage}
					>
						Previous
					</Button>
					<span>
						Page {currentPage} of {totalPages}
					</span>
					<Button
						data-testid="pagination-next"
						appearance="secondary"
						disabled={currentPage >= totalPages}
						onClick={handleNextPage}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
