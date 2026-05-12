import type { TestVaultTestCaseVersion } from "@atconseil/argos-sdk";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SnapshotDiffPanel } from "./SnapshotDiffPanel.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";

function makeVersion(
	overrides: Partial<TestVaultTestCaseVersion> & {
		steps?: { index: number; action: string; expected: string }[];
		tags?: string[];
	} = {}
): TestVaultTestCaseVersion {
	const steps = overrides.steps ?? [];
	const tags = overrides.tags ?? [];
	return {
		id: 1,
		name: "v1.0",
		comment: "",
		parentTestCaseId: 42,
		snapshotTitle: "Login test",
		snapshotDescription: "Desc",
		snapshotSteps: JSON.stringify(steps),
		snapshotTags: JSON.stringify(tags),
		createdBy: "alice@example.com",
		createdAt: NOW,
		immutable: true,
		...overrides,
	};
}

describe("SnapshotDiffPanel", () => {
	it("renders the diff-panel container", () => {
		const v = makeVersion();
		render(<SnapshotDiffPanel before={v} after={v} />);
		expect(screen.getByTestId("diff-panel")).toBeDefined();
	});

	it("shows diff-title-changed when titles differ", () => {
		const before = makeVersion({ snapshotTitle: "Old" });
		const after = makeVersion({ snapshotTitle: "New" });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-title-changed")).toBeDefined();
	});

	it("does not show diff-title-changed when titles are the same", () => {
		const v = makeVersion({ snapshotTitle: "Same" });
		render(<SnapshotDiffPanel before={v} after={v} />);
		expect(screen.queryByTestId("diff-title-changed")).toBeNull();
	});

	it("shows diff-description-changed when descriptions differ", () => {
		const before = makeVersion({ snapshotDescription: "Old desc" });
		const after = makeVersion({ snapshotDescription: "New desc" });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-description-changed")).toBeDefined();
	});

	it("shows diff-tags-added for each new tag", () => {
		const before = makeVersion({ tags: ["auth"] });
		const after = makeVersion({ tags: ["auth", "smoke"] });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-tag-added-smoke")).toBeDefined();
	});

	it("shows diff-tags-removed for each removed tag", () => {
		const before = makeVersion({ tags: ["auth", "smoke"] });
		const after = makeVersion({ tags: ["auth"] });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-tag-removed-smoke")).toBeDefined();
	});

	it("renders a diff-step-equal row for an unchanged step", () => {
		const steps = [{ index: 1, action: "Open", expected: "Page loads" }];
		const v = makeVersion({ steps });
		render(<SnapshotDiffPanel before={v} after={v} />);
		expect(screen.getByTestId("diff-step-equal-0")).toBeDefined();
	});

	it("renders a diff-step-removed row for a deleted step", () => {
		const before = makeVersion({ steps: [{ index: 1, action: "Open", expected: "" }] });
		const after = makeVersion({ steps: [] });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-step-removed-0")).toBeDefined();
	});

	it("renders a diff-step-added row for a new step", () => {
		const before = makeVersion({ steps: [] });
		const after = makeVersion({ steps: [{ index: 1, action: "Submit", expected: "" }] });
		render(<SnapshotDiffPanel before={before} after={after} />);
		expect(screen.getByTestId("diff-step-added-0")).toBeDefined();
	});

	it("shows diff-no-changes when versions are identical", () => {
		const v = makeVersion();
		render(<SnapshotDiffPanel before={v} after={v} />);
		expect(screen.getByTestId("diff-no-changes")).toBeDefined();
	});
});
