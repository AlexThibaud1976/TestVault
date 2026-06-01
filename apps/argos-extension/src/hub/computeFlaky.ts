import type { GlobalStatus } from "@atconseil/argos-types";

type RunSummary = { globalStatus: GlobalStatus; environment: string };

const SIGNIFICANT = new Set<GlobalStatus>(["Pass", "Fail"]);

/**
 * Flaky detection helper (US-2.6).
 *
 * Returns the set of environments considered flaky: among the 5 most recent
 * runs per environment (runs is expected sorted newest-first), the filtered
 * subsequence of Pass/Fail results has at least one alternation Pass<->Fail.
 * Blocked / Skipped / Unexecuted / Aborted runs are ignored.
 */
export function computeFlaky(runs: RunSummary[]): Set<string> {
	const byEnv = new Map<string, RunSummary[]>();
	for (const run of runs) {
		const list = byEnv.get(run.environment) ?? [];
		list.push(run);
		byEnv.set(run.environment, list);
	}

	const flaky = new Set<string>();
	for (const [env, envRuns] of byEnv) {
		const significant = envRuns
			.slice(0, 5)
			.map((r) => r.globalStatus)
			.filter((s): s is "Pass" | "Fail" => SIGNIFICANT.has(s));

		if (significant.length < 2) continue;

		for (let i = 1; i < significant.length; i++) {
			if (significant[i] !== significant[i - 1]) {
				flaky.add(env);
				break;
			}
		}
	}
	return flaky;
}
