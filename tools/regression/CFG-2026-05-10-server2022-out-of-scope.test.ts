/**
 * Test regression : CFG-2026-05-10-server2022-out-of-scope
 *
 * Contexte
 * --------
 * Decision utilisateur 2026-05-10 (Sprint 2) : Server 2022 sort du scope du produit.
 * Justification : aucun environnement on-prem disponible pour respecter constitution §10
 * (test E2E obligatoire avant declaration de support). Le projet devient Cloud-only.
 *
 * Ce test garde contre toute reintroduction silencieuse de Server 2022 dans la
 * spec-kit, la doc, ou le manifest de l'extension.
 *
 * Perimetre : tous les fichiers sources et de spec hors archive. La mention dans
 * CHANGELOG.md (recit historique de la decision) et dans les prompts archives
 * `tools/claude-prompts/` est legitime -> allowlistee.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHARED_DOC_ALLOWLIST } from "./allowlist.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const SCAN_EXTENSIONS = new Set([
	".md",
	".ts",
	".tsx",
	".js",
	".jsx",
	".cjs",
	".mjs",
	".json",
	".yaml",
	".yml",
	".txt",
]);

const EXCLUDED_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	"out",
	"coverage",
	".turbo",
	".pnpm-store",
	".next",
	".nuxt",
	"_archive",
]);

const TEST_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts",
]);

const ALLOWED_FILES = new Set([...SHARED_DOC_ALLOWLIST, ...TEST_SPECIFIC_ALLOWLIST]);

const FORBIDDEN_PATTERNS: RegExp[] = [
	/Microsoft\.TeamFoundation\.Server/,
	/\bServer\s*20(?:1[5-9]|2[0-5])\b/,
	/\bAzure\s*DevOps\s*Server\b/,
	/\bon[-\s]prem(?:ise|ises)?\b/i,
];

interface Match {
	file: string;
	line: number;
	pattern: string;
	excerpt: string;
}

function* walkFiles(dir: string): Generator<string> {
	let entries: import("node:fs").Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue;
			yield* walkFiles(full);
		} else if (entry.isFile()) {
			const ext = entry.name.includes(".") ? entry.name.slice(entry.name.lastIndexOf(".")) : "";
			if (SCAN_EXTENSIONS.has(ext)) yield full;
		}
	}
}

function scanFile(absolutePath: string, relPath: string): Match[] {
	if (ALLOWED_FILES.has(relPath)) return [];
	let content: string;
	try {
		content = readFileSync(absolutePath, "utf8");
	} catch {
		return [];
	}
	const matches: Match[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		for (const pattern of FORBIDDEN_PATTERNS) {
			if (pattern.test(line)) {
				matches.push({
					file: relPath,
					line: i + 1,
					pattern: pattern.source,
					excerpt: line.trim().slice(0, 120),
				});
				break;
			}
		}
	}
	return matches;
}

describe("CFG-2026-05-10 server-2022-out-of-scope guard", () => {
	it("must not contain any Server 2022 / on-prem reference outside allowlist", () => {
		const all: Match[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			all.push(...scanFile(file, relPath));
		}
		if (all.length > 0) {
			const sample = all
				.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} [${m.pattern}] => ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${all.length} forbidden Server-2022 / on-prem reference(s):\n${sample}\n\nDecision 2026-05-10 (Sprint 2): TestVault is Cloud-only.\nSee tools/regression/REGISTRY.md entry CFG-2026-05-10-server2022.`
			);
		}
		expect(all).toHaveLength(0);
	});

	it("must verify the test patterns can detect typical Server-2022 mentions", () => {
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Microsoft.TeamFoundation.Server"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Azure DevOps Server 2022"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("on-premise deployment"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("on prem"))).toBe(true);

		// Sanity inverse
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Azure DevOps Cloud"))).toBe(false);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("dev.azure.com"))).toBe(false);
	});
});
