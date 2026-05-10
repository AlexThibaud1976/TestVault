/**
 * Shared allowlist for regression tests in tools/regression/.
 *
 * These files legitimately reference forbidden patterns (deprecated LLM models,
 * mojibake examples, Server 2022 mentions, AlexThibaud publisher, etc.) for
 * documentary or historical reasons. Adding a file here means: "this file is
 * exempt from ALL repo-wide pattern scans, regardless of the test."
 *
 * Each entry must be added explicitly (no wildcards) -- that way a future file
 * with a real bug is not silently masked by an over-broad rule.
 *
 * Each test file has its OWN additional allowlist for its specific domain
 * (e.g. the test file itself, or files specific to its scan logic).
 */

/**
 * Methodological / documentary files exempt from all regression scans.
 *
 * Categories:
 * - REGISTRY of named regression tests (must list patterns by definition)
 * - Archived Claude Code prompts (document past sprint decisions including
 *   the very patterns the tests now forbid)
 * - README of the prompts archive (explains the allowlist convention itself)
 * - allowlist files themselves (contain pattern strings for documentation)
 */
export const SHARED_DOC_ALLOWLIST: ReadonlySet<string> = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/allowlist.ts",
	"tools/regression/allowlist.cjs",
	"tools/regression/allowlist.test.ts",
	"tools/claude-prompts/README.md",
	"tools/claude-prompts/CLAUDE_TASK.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md",
]);

/**
 * CommonJS-compatible helper for use from .cjs files (e.g. scan-mojibake.cjs).
 * Returns a fresh Set on each call to avoid accidental mutation.
 */
export function getSharedDocAllowlist(): Set<string> {
	return new Set(SHARED_DOC_ALLOWLIST);
}
