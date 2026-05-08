import type { TestStep } from "@atconseil/testvault-types";
import { describe, expect, it } from "vitest";
import { diffSnapshots, lcsStepDiff } from "./snapshot-diff.js";
import type { TestVaultTestCaseVersion } from "./test-case-version-service.js";

const NOW = "2026-05-08T12:00:00.000Z";

function makeVersion(
	overrides: Partial<TestVaultTestCaseVersion> & { steps?: TestStep[]; tags?: string[] }
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

function step(index: number, action: string, expected = ""): TestStep {
	return { index, action, expected };
}

// ─── lcsStepDiff ─────────────────────────────────────────────────────────────

describe("lcsStepDiff", () => {
	it("returns equal entries for identical step lists", () => {
		const steps = [step(0, "Open"), step(1, "Click")];
		const result = lcsStepDiff(steps, steps);
		expect(result).toHaveLength(2);
		expect(result.every((e) => e.type === "equal")).toBe(true);
	});

	it("marks a step only in left as removed", () => {
		const left = [step(0, "Open"), step(1, "Click")];
		const right = [step(0, "Open")];
		const result = lcsStepDiff(left, right);
		const removed = result.filter((e) => e.type === "removed");
		expect(removed).toHaveLength(1);
		expect(removed[0]?.left?.action).toBe("Click");
	});

	it("marks a step only in right as added", () => {
		const left = [step(0, "Open")];
		const right = [step(0, "Open"), step(1, "Submit")];
		const result = lcsStepDiff(left, right);
		const added = result.filter((e) => e.type === "added");
		expect(added).toHaveLength(1);
		expect(added[0]?.right?.action).toBe("Submit");
	});

	it("emits a removed+added pair when a step action changes", () => {
		const left = [step(0, "Open login"), step(1, "Click OK")];
		const right = [step(0, "Open login"), step(1, "Click Submit")];
		const result = lcsStepDiff(left, right);
		const removed = result.filter((e) => e.type === "removed");
		const added = result.filter((e) => e.type === "added");
		expect(removed).toHaveLength(1);
		expect(added).toHaveLength(1);
		expect(removed[0]?.left?.action).toBe("Click OK");
		expect(added[0]?.right?.action).toBe("Click Submit");
	});

	it("returns empty array for two empty step lists", () => {
		expect(lcsStepDiff([], [])).toHaveLength(0);
	});

	it("handles insertion in the middle correctly", () => {
		const left = [step(0, "A"), step(1, "C")];
		const right = [step(0, "A"), step(1, "B"), step(2, "C")];
		const result = lcsStepDiff(left, right);
		const added = result.filter((e) => e.type === "added");
		expect(added).toHaveLength(1);
		expect(added[0]?.right?.action).toBe("B");
	});

	it("handles a completely replaced step list", () => {
		const left = [step(0, "X"), step(1, "Y")];
		const right = [step(0, "A"), step(1, "B")];
		const result = lcsStepDiff(left, right);
		expect(result.filter((e) => e.type === "removed")).toHaveLength(2);
		expect(result.filter((e) => e.type === "added")).toHaveLength(2);
	});
});

// ─── diffSnapshots ────────────────────────────────────────────────────────────

describe("diffSnapshots", () => {
	it("reports no changes when both versions are identical", () => {
		const v = makeVersion({ snapshotTitle: "Login", snapshotDescription: "Desc" });
		const diff = diffSnapshots(v, v);
		expect(diff.title.changed).toBe(false);
		expect(diff.description.changed).toBe(false);
		expect(diff.tags.changed).toBe(false);
		expect(diff.steps.every((e) => e.type === "equal")).toBe(true);
	});

	it("detects a title change", () => {
		const before = makeVersion({ snapshotTitle: "Old title" });
		const after = makeVersion({ snapshotTitle: "New title" });
		const diff = diffSnapshots(before, after);
		expect(diff.title.changed).toBe(true);
		expect(diff.title.before).toBe("Old title");
		expect(diff.title.after).toBe("New title");
	});

	it("detects a description change", () => {
		const before = makeVersion({ snapshotDescription: "Old" });
		const after = makeVersion({ snapshotDescription: "New" });
		const diff = diffSnapshots(before, after);
		expect(diff.description.changed).toBe(true);
	});

	it("detects added tags", () => {
		const before = makeVersion({ tags: ["auth"] });
		const after = makeVersion({ tags: ["auth", "smoke"] });
		const diff = diffSnapshots(before, after);
		expect(diff.tags.changed).toBe(true);
		expect(diff.tags.added).toContain("smoke");
		expect(diff.tags.removed).toHaveLength(0);
	});

	it("detects removed tags", () => {
		const before = makeVersion({ tags: ["auth", "smoke"] });
		const after = makeVersion({ tags: ["auth"] });
		const diff = diffSnapshots(before, after);
		expect(diff.tags.changed).toBe(true);
		expect(diff.tags.removed).toContain("smoke");
		expect(diff.tags.added).toHaveLength(0);
	});

	it("detects step additions via step diff", () => {
		const before = makeVersion({ steps: [step(0, "Open")] });
		const after = makeVersion({ steps: [step(0, "Open"), step(1, "Submit")] });
		const diff = diffSnapshots(before, after);
		expect(diff.steps.filter((e) => e.type === "added")).toHaveLength(1);
	});
});
