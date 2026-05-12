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
	"tools/regression/CFG-2026-05-10-publisher-alexthibaud.test.ts",
	"tools/regression/CFG-2026-05-10-marketplace-public.test.ts",
	"tools/claude-prompts/README.md",
	"tools/claude-prompts/CLAUDE_TASK_marketplace-private.md",
	"tools/claude-prompts/CLAUDE_TASK.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.5a.md",
	"tools/regression/cp1252-mojibake-map.ts",
	"tools/regression/cp1252-mojibake-map.cjs",
	"tools/regression/cp1252-mojibake-map.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-005.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.md",
	"tools/regression/T-0.9-argos-top-level-placement.test.ts",
	"tools/regression/CFG-2026-05-10-top-level-hub.test.ts",
	"tools/regression/CFG-2026-05-10-no-xray-references.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.2.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.4.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-4.md",
	"tools/regression/T-1.0-argos-multi-hubs-architecture.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-4.1.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-011-v3.md",
	"tools/preflight/marketplace-check.md",
	"tools/preflight/microsoft-docs-snippets.md",
	"tools/preflight/manifest-check.cjs",
	"tools/regression/CFG-2026-05-12-preflight-rules.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-5ab.md",
	"tools/regression/CFG-2026-05-13-package-naming.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6a.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6a-followup.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6b.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-015a-followup.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6c.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6d.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6e.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-6f.md",
]);

module.exports = { SHARED_DOC_ALLOWLIST };
