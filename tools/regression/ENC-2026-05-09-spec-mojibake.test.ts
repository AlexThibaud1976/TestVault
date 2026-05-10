/**
 * ENC-2026-05-09-spec-mojibake regression test
 * --------------------------------------------
 *
 * Detects mojibake from double-encoding (UTF-8 read as Windows-1252 then re-saved as UTF-8).
 * Caused by tools like PowerShell `Set-Content` without `-Encoding utf8` flag.
 *
 * Historical context: Sprint 1 corrupted Specs/spec.md (1010 occurrences). Sprint 1.1
 * also revealed Specs/tasks.md was already corrupted before Sprint 1 (647 occurrences).
 * Both were restored. This test prevents future regressions.
 *
 * Files in ALLOWED_FILES may legitimately contain mojibake (REGISTRY references, this
 * test's own pattern definitions, archived sprint prompts that document the bug).
 *
 * IMPORTANT: This source file uses ONLY ASCII characters. All non-ASCII chars are
 * referenced via \uXXXX escapes in regex patterns and string literals. This guarantees
 * the file itself cannot be corrupted by re-encoding (cp1252 readers cannot
 * misinterpret pure ASCII).
 *
 * Do not replace the \uXXXX escapes with literal characters. Doing so makes the file
 * vulnerable to the very bug this test is designed to detect.
 *
 * Do NOT delete this test without a new spec-kit decision validated by Alexandre Thibaud.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHARED_DOC_ALLOWLIST } from "./allowlist.ts";
import { buildMojibakePatterns } from "./cp1252-mojibake-map.ts";

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
	"tools/regression/ENC-2026-05-09-spec-mojibake.test.ts",
	"tools/regression/scan-mojibake.cjs",
	"tools/regression/fix-mojibake.cjs",
]);

const ALLOWED_FILES = new Set([...SHARED_DOC_ALLOWLIST, ...TEST_SPECIFIC_ALLOWLIST]);

// Mojibake patterns built from the complete cp1252 -> Unicode mapping table.
// Covers all 59 codepoints that can appear at any continuation-byte position
// in a double-encoded UTF-8 sequence. See cp1252-mojibake-map.ts for details.
const MOJIBAKE_PATTERNS: RegExp[] = buildMojibakePatterns();

interface MojibakeMatch {
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

function scanFile(absolutePath: string, relPath: string): MojibakeMatch[] {
	if (ALLOWED_FILES.has(relPath)) return [];
	let content: string;
	try {
		content = readFileSync(absolutePath, "utf8");
	} catch {
		return [];
	}
	const matches: MojibakeMatch[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		for (const pattern of MOJIBAKE_PATTERNS) {
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

describe("ENC-2026-05-09-spec-mojibake regression", () => {
	it("must not contain any mojibake double-encoding pattern in repo files", () => {
		const allMatches: MojibakeMatch[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			allMatches.push(...scanFile(file, relPath));
		}
		if (allMatches.length > 0) {
			const sample = allMatches
				.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} [${m.pattern}] => ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${allMatches.length} mojibake double-encoding occurrence(s) (showing first 20):\n${sample}\n\nThis indicates a UTF-8 file was read as Windows-1252 and re-saved as UTF-8.\nRestore from clean git history or run tools/regression/fix-mojibake.cjs.\nSee tools/regression/REGISTRY.md entry ENC-2026-05-09 for context.`
			);
		}
		expect(allMatches).toHaveLength(0);
	});

	it("must verify the test patterns can detect typical mojibake (sanity check)", () => {
		// All test inputs are built from \uXXXX escapes to keep this source file pure ASCII.
		//
		// Mojibake for "Specification" with e-acute (originally "Spe-acute-cification"):
		//   "Sp" + \u00C3\u00A9 + "cification"
		const mojibakeAccentuated = "Sp\u00C3\u00A9cification";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeAccentuated))).toBe(true);

		// Mojibake for red-circle emoji (originally U+1F534):
		//   \u00F0\u0178\u201D\u00B4
		const mojibakeRedCircle = "\u00F0\u0178\u201D\u00B4";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeRedCircle))).toBe(true);

		// Mojibake for em-dash (originally U+2014):
		//   \u00E2\u20AC\u201D + " Auteur"
		const mojibakeEmDash = "\u00E2\u20AC\u201D Auteur";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeEmDash))).toBe(true);

		// Mojibake for checkmark emoji (originally U+2705):
		//   \u00E2\u0153\u2026 + " valide"
		const mojibakeCheckmark = "\u00E2\u0153\u2026 valide";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeCheckmark))).toBe(true);

		// Mojibake for trademark sign (originally U+2122, UTF-8 bytes E2 84 A2):
		//   0xE2 -> \u00E2, 0x84 -> \u201E (cp1252), 0xA2 -> \u00A2 (Latin-1)
		const mojibakeTrademark = "Product\u00E2\u201E\u00A2";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeTrademark))).toBe(true);

		// Mojibake for euro sign (originally U+20AC, UTF-8 bytes E2 82 AC):
		//   0xE2 -> \u00E2, 0x82 -> \u201A (cp1252), 0xAC -> \u00AC (Latin-1)
		const mojibakeEuro = "Price 10\u00E2\u201A\u00AC";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeEuro))).toBe(true);

		// Mojibake for en-dash (originally U+2013, UTF-8 bytes E2 80 93):
		//   0xE2 -> \u00E2, 0x80 -> \u20AC (cp1252), 0x93 -> \u201C (cp1252)
		const mojibakeEnDash = "Range 1\u00E2\u20AC\u201C10";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeEnDash))).toBe(true);

		// Mojibake for dagger (originally U+2020, UTF-8 bytes E2 80 A0):
		//   0xE2 -> \u00E2, 0x80 -> \u20AC (cp1252), 0xA0 -> \u00A0 (Latin-1 NBSP)
		const mojibakeDagger = "Note\u00E2\u20AC\u00A0 see below";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeDagger))).toBe(true);

		// Mojibake for grinning face emoji (originally U+1F600, UTF-8 bytes F0 9F 98 80):
		//   0xF0 -> \u00F0, 0x9F -> \u0178 (cp1252), 0x98 -> \u02DC (cp1252), 0x80 -> \u20AC (cp1252)
		const mojibakeGrin = "Launch\u00F0\u0178\u02DC\u20AC";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeGrin))).toBe(true);

		// Sanity inverse: clean text (with \uXXXX escapes) must NOT match any mojibake pattern.
		// "Specification detaillee" with proper accents: \u00E9 = e-acute, no mojibake.
		const cleanFrenchAccents = "Sp\u00E9cification d\u00E9taill\u00E9e";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(cleanFrenchAccents))).toBe(false);

		// Clean checkmark emoji (U+2705) directly via escape, no mojibake.
		const cleanCheckmark = "\u2705 Test pass\u00E9";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(cleanCheckmark))).toBe(false);

		// Clean em-dash (U+2014), no mojibake.
		const cleanEmDash = "Description \u2014 auteur";
		expect(MOJIBAKE_PATTERNS.some((p) => p.test(cleanEmDash))).toBe(false);

		// Inverse for new cases: clean trademark, euro, rocket must NOT match.
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("Product\u2122"))).toBe(false);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("Price 10\u20AC"))).toBe(false);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("\uD83D\uDE00 grinning face"))).toBe(false);
	});
});
