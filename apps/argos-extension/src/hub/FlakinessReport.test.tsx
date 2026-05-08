import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlakinessReport } from "./FlakinessReport.js";
import type { FlakinessEntry, IFlakinessReportService } from "./FlakinessReport.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeEntry(overrides?: Partial<FlakinessEntry>): FlakinessEntry {
	return {
		testCaseId: 1,
		testCaseTitle: "Login test",
		score: 40,
		runsAnalyzed: 20,
		knownFlaky: false,
		recommendation: "Check timing dependencies",
		...overrides,
	};
}

function makeService(entries: FlakinessEntry[] = []): IFlakinessReportService {
	return {
		getReport: vi.fn().mockResolvedValue(entries),
		markKnownFlaky: vi.fn().mockResolvedValue(undefined),
	};
}

describe("FlakinessReport", () => {
	it("shows loading state initially", () => {
		render(<FlakinessReport service={makeService()} />);
		expect(screen.getByTestId("flakiness-loading")).toBeDefined();
	});

	it("shows empty state when no flaky tests", async () => {
		render(<FlakinessReport service={makeService([])} />);
		await waitFor(() => expect(screen.getByTestId("flakiness-empty")).toBeDefined());
	});

	it("renders flaky test entries", async () => {
		const e = makeEntry();
		render(<FlakinessReport service={makeService([e])} />);
		await waitFor(() =>
			expect(screen.getByTestId(`flakiness-entry-${e.testCaseId}`)).toBeDefined()
		);
	});

	it("shows flakiness score", async () => {
		const e = makeEntry({ score: 65 });
		render(<FlakinessReport service={makeService([e])} />);
		await waitFor(() => screen.getByTestId(`flakiness-entry-${e.testCaseId}`));
		expect(screen.getByTestId(`flakiness-entry-${e.testCaseId}`).textContent).toContain("65");
	});

	it("calls service.markKnownFlaky when Mark Known Flaky is clicked", async () => {
		const e = makeEntry();
		const service = makeService([e]);
		const user = userEvent.setup();
		render(<FlakinessReport service={service} />);
		await waitFor(() => screen.getByTestId(`mark-flaky-${e.testCaseId}`));
		await user.click(screen.getByTestId(`mark-flaky-${e.testCaseId}`));
		await waitFor(() =>
			expect(vi.mocked(service.markKnownFlaky)).toHaveBeenCalledWith(e.testCaseId)
		);
	});

	it("entry disappears after being marked as known flaky", async () => {
		const e = makeEntry();
		const service = makeService([e]);
		const user = userEvent.setup();
		render(<FlakinessReport service={service} />);
		await waitFor(() => screen.getByTestId(`mark-flaky-${e.testCaseId}`));
		await user.click(screen.getByTestId(`mark-flaky-${e.testCaseId}`));
		await waitFor(() => expect(screen.queryByTestId(`flakiness-entry-${e.testCaseId}`)).toBeNull());
	});
});
