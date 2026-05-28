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
	"tools/claude-prompts/CLAUDE_TASK_sprint-6h.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2-5d.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2-5e.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2-5f-fix.md",
	"Specs/archives/COMMERCIAL.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2-6.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2-7.md",
	// Sprint 2.21 / 2.21.1 task files (contain gpt-4.1-mini as historical doc from Alex setup session)
	"Specs/CLAUDE_TASK_sprint-2-21-1-foundry.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-21-1-foundry.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-21-part-1.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-20.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-21-part-2-CHECKPOINT-C.md",
    "claude_prompts/sprint-2.21-part-2-code-report.md",
	// Sprint 2.21 part 3 (Drawer UX + Monaco Gherkin): see [0.5.31] in CHANGELOG.
	"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md",
	"claude_prompts/sprint-2-21-part-3-code-report.md",
	// Sprint 2.22 brief: lists Argos default models including gpt-4.1 as
	// the example of a model to check for deprecation. Also describes the
	// Coverage Panel layout via the "Xray-like" metaphor (10 mentions) --
	// kept here while the file lives in Specs/ during sprint execution.
	// The Specs/ entry below will be removed in the post-merge cleanup
	// once the file moves to claude_prompts/.
	"Specs/CLAUDE_TASK_sprint-2-22-code.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-22-code.md",
	// Sprint 2.21 part 2 brief: documents the placeholder decision around
	// gpt-4.1-mini (TECH-DEBT-072 to clarify BYOK strategy in a future sprint)
	"Specs/CLAUDE_TASK_sprint-2-21-part-2.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-21-part-2.md",
	// Specs/tasks.md mentions gpt-4.1 in TECH-DEBT-072 (added Sprint 2.21 part 2)
	// which exists precisely to track the cleanup work for that pattern.
	"Specs/tasks.md",
	"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md",
	"claude_prompts/sprint-2-21-part-3-cleanup-report.md",
]);

module.exports = { SHARED_DOC_ALLOWLIST };
