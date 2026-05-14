/**
 * Regression test: CFG-2026-05-15-wit-ado-charset (Configuration)
 *
 * History:
 *   2026-05-15 (Sprint 2.7 hotfix) - Initial. Guards against WIT displayName
 *                                    containing ADO-forbidden characters.
 *
 * What this test guards:
 *   - argos-wit-schema index.test.ts must contain ADO charset compliance test suite
 *   - No WIT file may contain "(Argos)" displayName pattern (VS402800 cause)
 *
 * Rationale: first real E2E test on ADO BCEE-QA failed with VS402800 because
 * WIT displayName values contained parentheses, which ADO API blacklists.
 * Mock tests don't validate payload charset -- this CFG test prevents regression.
 *
 * ADO charset blacklist: . , ; ~ : / \ * | ? " & % $ ! + = ( ) [ ] { } < > -
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - TECH-DEBT-046 (Sprint 2.7)
 *   - ADO error VS402800
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const WITS_DIR = join(REPO_ROOT, "packages", "argos-wit-schema", "src", "wits");

const WIT_FILES = [
	"audit-log.ts",
	"precondition.ts",
	"test-case-version.ts",
	"test-case.ts",
	"test-execution.ts",
	"test-plan.ts",
	"test-set.ts",
];

describe("CFG-2026-05-15-wit-ado-charset regression", () => {
	it("argos-wit-schema index.test.ts contains ADO charset compliance tests", () => {
		const testPath = join(REPO_ROOT, "packages", "argos-wit-schema", "src", "index.test.ts");
		expect(existsSync(testPath)).toBe(true);
		const content = readFileSync(testPath, "utf8");
		expect(content).toContain("ADO charset compliance");
		expect(content).toContain("ADO_FORBIDDEN_CHARS");
	});

	it("no WIT displayName contains forbidden parentheses pattern (Argos)", () => {
		const violations: string[] = [];
		for (const file of WIT_FILES) {
			const filePath = join(WITS_DIR, file);
			const content = readFileSync(filePath, "utf8");
			const match = content.match(/displayName:\s*"[^"]*\(Argos\)[^"]*"/);
			if (match) {
				violations.push(`${file}: ${match[0]}`);
			}
		}
		expect(violations, `WIT files with (Argos) displayName: ${violations.join(", ")}`).toEqual([]);
	});
});
