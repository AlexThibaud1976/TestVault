import type { ITestCaseVersionService, TestVaultTestCaseVersion } from "@atconseil/argos-sdk";
import { SnapshotNameConflictError } from "@atconseil/argos-sdk";
import type { TestVaultTestCase } from "@atconseil/argos-types";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SnapshotPanel } from "./SnapshotPanel.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";

function makeTC(overrides?: Partial<TestVaultTestCase>): TestVaultTestCase {
	return {
		id: 42,
		title: "Login test",
		description: "",
		state: "Active",
		areaPath: "MyProject\\QA",
		iterationPath: "",
		tags: [],
		steps: [],
		priority: 2,
		automationStatus: "Manual",
		preconditionLinks: [],
		createdBy: "alice@example.com",
		createdAt: NOW,
		modifiedBy: "alice@example.com",
		modifiedAt: NOW,
		...overrides,
	};
}

function makeVersion(id: number, name: string): TestVaultTestCaseVersion {
	return {
		id,
		name,
		comment: "",
		parentTestCaseId: 42,
		snapshotTitle: "Login test",
		snapshotDescription: "",
		snapshotSteps: "[]",
		snapshotTags: "[]",
		createdBy: "alice@example.com",
		createdAt: NOW,
		immutable: true,
	};
}

function makeService(overrides?: Partial<ITestCaseVersionService>): ITestCaseVersionService {
	return {
		listSnapshots: vi.fn().mockResolvedValue([makeVersion(1, "v1.0"), makeVersion(2, "v2.0")]),
		createSnapshot: vi.fn().mockResolvedValue(makeVersion(3, "v3.0")),
		...overrides,
	};
}

describe("SnapshotPanel", () => {
	it("calls listSnapshots on mount with the testCase id", async () => {
		const service = makeService();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await waitFor(() => expect(vi.mocked(service.listSnapshots)).toHaveBeenCalledWith(42));
	});

	it("renders a snapshot-item for each snapshot", async () => {
		const service = makeService();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await waitFor(() => expect(screen.getByTestId("snapshot-item-1")).toBeDefined());
		expect(screen.getByTestId("snapshot-item-2")).toBeDefined();
	});

	it("each snapshot item shows the snapshot name", async () => {
		const service = makeService();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await waitFor(() => expect(screen.getByTestId("snapshot-item-1")).toBeDefined());
		expect(screen.getByTestId("snapshot-item-1").textContent).toContain("v1.0");
	});

	it("shows snapshots-empty when no snapshots exist", async () => {
		const service = makeService({ listSnapshots: vi.fn().mockResolvedValue([]) });
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await waitFor(() => expect(screen.getByTestId("snapshots-empty")).toBeDefined());
	});

	it("clicking create-snapshot-button shows the snapshot form", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		expect(screen.getByTestId("snapshot-form")).toBeDefined();
	});

	it("submitting the form calls createSnapshot with the entered name", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		await user.type(screen.getByTestId("snapshot-name-input"), "v3.0");
		await user.click(screen.getByTestId("snapshot-submit"));
		await waitFor(() =>
			expect(vi.mocked(service.createSnapshot)).toHaveBeenCalledWith(
				expect.objectContaining({ id: 42 }),
				expect.objectContaining({ name: "v3.0" })
			)
		);
	});

	it("shows snapshot-name-error when submitting with empty name", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		await user.click(screen.getByTestId("snapshot-submit"));
		expect(screen.getByTestId("snapshot-name-error")).toBeDefined();
		expect(vi.mocked(service.createSnapshot)).not.toHaveBeenCalled();
	});

	it("shows snapshot-name-error on SnapshotNameConflictError", async () => {
		const service = makeService({
			createSnapshot: vi.fn().mockRejectedValue(new SnapshotNameConflictError("v1.0", 42)),
		});
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		await user.type(screen.getByTestId("snapshot-name-input"), "v1.0");
		await user.click(screen.getByTestId("snapshot-submit"));
		await waitFor(() => expect(screen.getByTestId("snapshot-name-error")).toBeDefined());
	});

	it("hides the form and reloads list after successful creation", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		await user.type(screen.getByTestId("snapshot-name-input"), "v3.0");
		await user.click(screen.getByTestId("snapshot-submit"));
		await waitFor(() => expect(vi.mocked(service.listSnapshots)).toHaveBeenCalledTimes(2));
		expect(screen.queryByTestId("snapshot-form")).toBeNull();
	});

	it("clicking snapshot-cancel hides the form", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<SnapshotPanel testCase={makeTC()} service={service} />);
		await user.click(screen.getByTestId("create-snapshot-button"));
		await user.click(screen.getByTestId("snapshot-cancel"));
		expect(screen.queryByTestId("snapshot-form")).toBeNull();
	});
});
