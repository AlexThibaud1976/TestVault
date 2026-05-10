// Allowlist methodological / documentary files exempt from all regression scans.
// CommonJS variant of allowlist.ts for use from .cjs scripts (scan-mojibake.cjs).
//
// IMPORTANT: This list MUST stay in sync with allowlist.ts (cross-checked by
// allowlist.test.ts). Update BOTH files when adding or removing entries.

const SHARED_DOC_ALLOWLIST = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/allowlist.ts",
	"tools/regression/allowlist.cjs",
	"tools/regression/allowlist.test.ts",
	"tools/regression/CFG-2026-05-10-marketplace-private.test.ts",
	"tools/claude-prompts/README.md",
	"tools/claude-prompts/CLAUDE_TASK_marketplace-private.md",
	"tools/claude-prompts/CLAUDE_TASK.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.5a.md",
]);

module.exports = { SHARED_DOC_ALLOWLIST };
