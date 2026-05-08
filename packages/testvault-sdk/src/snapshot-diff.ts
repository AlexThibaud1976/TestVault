import type { TestStep } from "@atconseil/testvault-types";
import type { TestVaultTestCaseVersion } from "./test-case-version-service.js";

// ─── Public types ─────────────────────────────────────────────────────────────

export type StepDiffEntry =
	| { type: "equal"; left: TestStep; right: TestStep }
	| { type: "removed"; left: TestStep; right: null }
	| { type: "added"; left: null; right: TestStep };

export type SnapshotFieldDiff = {
	changed: boolean;
	before: string;
	after: string;
};

export type SnapshotTagDiff = {
	changed: boolean;
	added: string[];
	removed: string[];
};

export type SnapshotDiff = {
	title: SnapshotFieldDiff;
	description: SnapshotFieldDiff;
	tags: SnapshotTagDiff;
	steps: StepDiffEntry[];
};

// ─── LCS step diff ────────────────────────────────────────────────────────────

function stepsEqual(a: TestStep, b: TestStep): boolean {
	return a.action === b.action && a.expected === b.expected;
}

export function lcsStepDiff(left: TestStep[], right: TestStep[]): StepDiffEntry[] {
	const m = left.length;
	const n = right.length;

	// Build LCS length table
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	const at = (arr: number[][], r: number, c: number): number => arr[r]?.[c] ?? 0;
	const atStep = (arr: TestStep[], idx: number): TestStep => arr[idx] as TestStep;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (stepsEqual(atStep(left, i - 1), atStep(right, j - 1))) {
				(dp[i] as number[])[j] = at(dp, i - 1, j - 1) + 1;
			} else {
				(dp[i] as number[])[j] = Math.max(at(dp, i - 1, j), at(dp, i, j - 1));
			}
		}
	}

	// Backtrack to build diff
	const result: StepDiffEntry[] = [];
	let i = m;
	let j = n;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && stepsEqual(atStep(left, i - 1), atStep(right, j - 1))) {
			result.push({ type: "equal", left: atStep(left, i - 1), right: atStep(right, j - 1) });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || at(dp, i, j - 1) >= at(dp, i - 1, j))) {
			result.push({ type: "added", left: null, right: atStep(right, j - 1) });
			j--;
		} else {
			result.push({ type: "removed", left: atStep(left, i - 1), right: null });
			i--;
		}
	}
	result.reverse();
	return result;
}

// ─── Full snapshot diff ───────────────────────────────────────────────────────

export function diffSnapshots(
	before: TestVaultTestCaseVersion,
	after: TestVaultTestCaseVersion
): SnapshotDiff {
	const beforeTags = (JSON.parse(before.snapshotTags) as string[]) ?? [];
	const afterTags = (JSON.parse(after.snapshotTags) as string[]) ?? [];
	const beforeSet = new Set(beforeTags);
	const afterSet = new Set(afterTags);
	const added = afterTags.filter((t) => !beforeSet.has(t));
	const removed = beforeTags.filter((t) => !afterSet.has(t));

	const beforeSteps = (JSON.parse(before.snapshotSteps) as TestStep[]) ?? [];
	const afterSteps = (JSON.parse(after.snapshotSteps) as TestStep[]) ?? [];

	return {
		title: {
			changed: before.snapshotTitle !== after.snapshotTitle,
			before: before.snapshotTitle,
			after: after.snapshotTitle,
		},
		description: {
			changed: before.snapshotDescription !== after.snapshotDescription,
			before: before.snapshotDescription,
			after: after.snapshotDescription,
		},
		tags: {
			changed: added.length > 0 || removed.length > 0,
			added,
			removed,
		},
		steps: lcsStepDiff(beforeSteps, afterSteps),
	};
}
