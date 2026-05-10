/**
 * Regression test: CFG-2026-05-10-no-xray-references
 *
 * Sprint 3 (v0.3.0) removed all "Xray" references from documentation files.
 * Argos is positioned as a native Azure DevOps test management product, not a
 * clone or comparison-target. Future PRs must not reintroduce comparative
 * mentions ("Xray-class", "like Xray", etc.).
 *
 * Scope: all .md/.ts/.tsx/.json/.yaml/.yml files in the repo.
 * Allowlist (explicit, no wildcards): historical archives + this test itself.
 * Pattern: /\bxray\b/i (case-insensitive word boundary).
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Sprint 3 (v0.3.0), tools/regression/REGISTRY.md, CHANGELOG.md
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHARED_DOC_ALLOWLIST } from "./allowlist.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const SCAN_EXTENSIONS = new Set([".md", ".ts", ".tsx", ".json", ".yaml", ".yml"]);
const EXCLUDED_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	"coverage",
	".turbo",
	".pnpm-store",
	"_archive",
]);

// Explicit allowlist for files that legitimately reference "Xray" for historical/archival reasons.
// NO wildcards -- each file must be reviewed and added explicitly.
const XRAY_TEST_SPECIFIC_ALLOWLIST: ReadonlySet<string> = new Set([
	"tools/regression/CFG-2026-05-10-no-xray-references.test.ts",
	"CHANGELOG.md",
	"tools/claude-prompts/CLAUDE_TASK.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.md",
]);

const XRAY_PATTERN = /\bxray\b/i;

interface XrayMatch {
	file: string;
	line: number;
	excerpt: string;
}

function* walkFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry)) continue;
			yield* walkFiles(fullPath);
		} else if (stat.isFile()) {
			const ext = entry.slice(entry.lastIndexOf("."));
			if (SCAN_EXTENSIONS.has(ext)) yield fullPath;
		}
	}
}

function isAllowlisted(relPath: string): boolean {
	return SHARED_DOC_ALLOWLIST.has(relPath) || XRAY_TEST_SPECIFIC_ALLOWLIST.has(relPath);
}

function scanFile(absolutePath: string, relPath: string): XrayMatch[] {
	if (isAllowlisted(relPath)) return [];
	const content = readFileSync(absolutePath, "utf8");
	const lines = content.split("\n");
	const matches: XrayMatch[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (XRAY_PATTERN.test(line)) {
			matches.push({ file: relPath, line: i + 1, excerpt: line.trim().slice(0, 120) });
		}
	}
	return matches;
}

describe("CFG-2026-05-10-no-xray-references regression", () => {
	it("must not contain any Xray reference outside historical archives", () => {
		const allMatches: XrayMatch[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			allMatches.push(...scanFile(file, relPath));
		}

		if (allMatches.length > 0) {
			const sample = allMatches
				.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} -> ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${allMatches.length} Xray reference(s) outside allowlist (showing first 20):\n${sample}\n\nArgos is an ADO-native test management product, not a clone.\nReformulate per guidelines (CHANGELOG.md Sprint 3) or add the file to allowlist if it is a historical archive.\nSee tools/regression/REGISTRY.md entry CFG-2026-05-10-no-xray-references for context.`
			);
		}
		expect(allMatches).toHaveLength(0);
	});

	it("sanity check: pattern must detect typical references", () => {
		expect(XRAY_PATTERN.test("Xray-class parity")).toBe(true);
		expect(XRAY_PATTERN.test("like xray")).toBe(true);
		expect(XRAY_PATTERN.test("XRAY in caps")).toBe(true);
		expect(XRAY_PATTERN.test("X-ray with hyphen")).toBe(false);
		expect(XRAY_PATTERN.test("xrayed suffix")).toBe(false);
		expect(XRAY_PATTERN.test("plain text")).toBe(false);
	});
});
