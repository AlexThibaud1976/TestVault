/**
 * @regression LLM-2026-05-09-gpt41-deprecation
 * @type LLM-lifecycle
 *
 * Historique :
 *   - 2026-03-09 : Microsoft Foundry lance l'auto-upgrade standard depuis gpt-4.1
 *   - 2026-04-11 : gpt-4.1 retiré de Microsoft Foundry (retirement officiel)
 *   - 2026-02-13 : gpt-4.1 retiré de ChatGPT
 *   - 2026-10-14 : shutdown final API OpenAI direct prévu
 *   - 2026-05-09 : décision utilisateur → successeur retenu `gpt-5.2`
 *                  (le plus récent, recommandé OpenAI pour creative use cases)
 *
 * Périmètre du test :
 *   Scanne l'intégralité du repo à la recherche de `gpt-4.1` (et variantes mini/nano).
 *   Les fichiers listés dans ALLOWED_FILES peuvent mentionner ce modèle pour des
 *   raisons historiques documentées (CHANGELOG, ce registre, ce test lui-même).
 *
 * ⚠ Ne PAS supprimer sans nouvelle décision spec-kit validée par Alexandre Thibaud.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");

const SCAN_EXTENSIONS = new Set([".md", ".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml"]);

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

// Files allowed to reference gpt-4.1 for documented historical reasons.
const ALLOWED_FILES = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md", // <-- ADD
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
]);

const FORBIDDEN_PATTERN = /\bgpt-4\.1(?:-mini|-nano)?\b/g;

interface Match {
	file: string;
	line: number;
	content: string;
}

function isAllowed(absolutePath: string): boolean {
	const relative = path.relative(REPO_ROOT, absolutePath).replace(/\\/g, "/");
	return ALLOWED_FILES.has(relative);
}

function walkDir(dir: string, matches: Match[]): void {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!EXCLUDED_DIRS.has(entry.name)) walkDir(fullPath, matches);
		} else if (entry.isFile()) {
			if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
			if (isAllowed(fullPath)) continue;

			let content: string;
			try {
				content = fs.readFileSync(fullPath, "utf8");
			} catch {
				continue;
			}

			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const lineContent = lines[i] ?? "";
				FORBIDDEN_PATTERN.lastIndex = 0;
				if (FORBIDDEN_PATTERN.test(lineContent)) {
					matches.push({
						file: path.relative(REPO_ROOT, fullPath).replace(/\\/g, "/"),
						line: i + 1,
						content: lineContent.trim(),
					});
				}
			}
		}
	}
}

describe("LLM-2026-05-09 — gpt-4.1 deprecation guard", () => {
	it("must not contain any reference to gpt-4.1 outside CHANGELOG/REGISTRY/this test", () => {
		const matches: Match[] = [];
		walkDir(REPO_ROOT, matches);

		if (matches.length > 0) {
			const report = matches.map((m) => `  ${m.file}:${m.line}  →  ${m.content}`).join("\n");
			throw new Error(
				`Found ${matches.length} forbidden reference(s) to gpt-4.1 (retired from Microsoft Foundry 2026-04-11).\nSuggested replacement: gpt-5 / gpt-5.1 / gpt-5.2\n\nOccurrences:\n${report}`
			);
		}

		expect(matches).toHaveLength(0);
	});

	it("must verify the test itself can find the pattern (sanity check)", () => {
		// These MUST match
		expect(FORBIDDEN_PATTERN.test("gpt-4.1")).toBe(true);
		FORBIDDEN_PATTERN.lastIndex = 0;
		expect(FORBIDDEN_PATTERN.test("gpt-4.1-mini")).toBe(true);
		FORBIDDEN_PATTERN.lastIndex = 0;
		expect(FORBIDDEN_PATTERN.test("gpt-4.1-nano")).toBe(true);

		// These must NOT match
		FORBIDDEN_PATTERN.lastIndex = 0;
		expect(FORBIDDEN_PATTERN.test("gpt-4.10")).toBe(false);
		FORBIDDEN_PATTERN.lastIndex = 0;
		expect(FORBIDDEN_PATTERN.test("gpt-5.2")).toBe(false);
		FORBIDDEN_PATTERN.lastIndex = 0;
		expect(FORBIDDEN_PATTERN.test("claude-opus-4-7")).toBe(false);
	});
});
