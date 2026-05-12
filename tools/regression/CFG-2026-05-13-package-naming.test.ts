/**
 * Regression test: CFG-2026-05-13-package-naming (Configuration)
 *
 * History:
 *   2026-05-13 (Sprint 6a) - Initial. Asserts that no package in packages/
 *                            uses the legacy "testvault-*" prefix.
 *
 * What this test guards:
 *   - All packages in packages/ must use the "argos-*" or "argos-detection-api" prefix
 *   - Legacy "testvault-*" prefix is forbidden (migration planned in Sprints 6a-7b)
 *   - Allows the historical "testpulse-ui-shared" (will be renamed in Sprint 7b)
 *
 * Rationale: codify the naming convention from MIGRATION-PLAN.md to prevent
 * reintroduction of legacy "testvault-*" names in future packages.
 *
 * Lifecycle:
 *   - Sprint 6a (this test introduction): testvault-types renamed -> 1 fewer violation
 *   - Sprints 6b-6f: 5 other testvault-* renamed -> 0 violations
 *   - Sprint 7b: testpulse-ui-shared renamed to argos-detection-api -> no impact on this test
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/MIGRATION-PLAN.md (TECH-DEBT-015B, section 1.4 Nommage cible)
 *   - REGISTRY entry CFG-2026-05-13-package-naming
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

const FORBIDDEN_PREFIX = "@atconseil/testvault-";
const ALLOWED_LEGACY_NAMES = new Set([
	// testpulse-ui-shared will be renamed in Sprint 7b
	"@atconseil/testpulse-ui-shared",
]);

interface PackageJson {
	name?: string;
	version?: string;
}

describe("CFG-2026-05-13-package-naming regression", () => {
	const packageFolders = existsSync(PACKAGES_DIR)
		? readdirSync(PACKAGES_DIR, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)
		: [];

	it("packages/ directory must contain at least one package", () => {
		expect(packageFolders.length).toBeGreaterThan(0);
	});

	it("no package may use the legacy @atconseil/testvault-* prefix (migration in progress)", () => {
		const violations: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			if (pkg.name.startsWith(FORBIDDEN_PREFIX)) {
				violations.push(`${folder} -> ${pkg.name}`);
			}
		}

		expect(violations).toEqual([]);
	});

	it("packages must use approved prefixes (argos-* or allowed legacy)", () => {
		const unapproved: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			const isArgos = pkg.name.startsWith("@atconseil/argos-");
			const isAllowedLegacy = ALLOWED_LEGACY_NAMES.has(pkg.name);

			if (!isArgos && !isAllowedLegacy) {
				unapproved.push(`${folder} -> ${pkg.name}`);
			}
		}

		expect(unapproved).toEqual([]);
	});

	it("folder name must match the package name suffix (consistency)", () => {
		const mismatches: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			// Extract suffix after @atconseil/
			const suffix = pkg.name.replace(/^@atconseil\//, "");
			if (suffix !== folder) {
				mismatches.push(`folder "${folder}" but name "${pkg.name}"`);
			}
		}

		expect(mismatches).toEqual([]);
	});
});
