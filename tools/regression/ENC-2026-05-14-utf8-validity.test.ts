import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifies that all text files in the repository are valid UTF-8.
 *
 * Context: during the testvault -> argos rebrand (2026-05-13/14),
 * "mojibake" reports in PowerShell turned out to be display artifacts
 * (CP850 console rendering of valid UTF-8 files), not real corruption.
 * The existing scan-mojibake.cjs uses heuristic pattern matching, which
 * has false positives and false negatives. This test uses strict UTF-8
 * decoding (TextDecoder with fatal: true) to catch real invalid bytes
 * without flagging valid French accented characters (e, e, a, etc.).
 *
 * See Specs/CLAUDE.md "Windows / PowerShell 5.1 encoding gotcha" section.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");

const TEXT_EXTENSIONS = new Set([
	".md",
	".ts",
	".tsx",
	".js",
	".jsx",
	".cjs",
	".mjs",
	".json",
	".yml",
	".yaml",
	".toml",
	".html",
	".css",
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

function* walkFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		if (EXCLUDED_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			yield* walkFiles(full);
		} else if (st.isFile()) {
			const ext = entry.substring(entry.lastIndexOf("."));
			if (TEXT_EXTENSIONS.has(ext)) {
				yield full;
			}
		}
	}
}

function isValidUtf8(buf: Buffer): boolean {
	try {
		new TextDecoder("utf-8", { fatal: true }).decode(buf);
		return true;
	} catch {
		return false;
	}
}

describe("ENC-2026-05-14-utf8-validity", () => {
	it("all text files in the repo are valid UTF-8", () => {
		const invalidFiles: string[] = [];
		let scannedCount = 0;

		for (const file of walkFiles(REPO_ROOT)) {
			scannedCount++;
			const buf = readFileSync(file);
			if (!isValidUtf8(buf)) {
				invalidFiles.push(file.replace(REPO_ROOT, "").replace(/\\/g, "/"));
			}
		}

		if (invalidFiles.length > 0) {
			const msg = `${invalidFiles.length} file(s) with invalid UTF-8 bytes:\n${invalidFiles.join("\n")}\n\nNote: this test catches real UTF-8 corruption (invalid byte sequences), not "mojibake" that is only a PowerShell display artifact. See Specs/CLAUDE.md.`;
			throw new Error(msg);
		}

		expect(scannedCount).toBeGreaterThan(0);
	});

	it("explicitly verifies that French accented characters (valid UTF-8) pass", () => {
		// Specs/plan.md and Specs/spec.md contain ~439 valid C3 XX sequences (French accents).
		// This test ensures they are not flagged as invalid UTF-8.
		const planFile = join(REPO_ROOT, "Specs", "plan.md");
		const specFile = join(REPO_ROOT, "Specs", "spec.md");
		expect(isValidUtf8(readFileSync(planFile))).toBe(true);
		expect(isValidUtf8(readFileSync(specFile))).toBe(true);
	});
});
