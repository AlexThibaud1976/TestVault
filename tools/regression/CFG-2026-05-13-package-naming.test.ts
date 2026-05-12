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
 *   - Sprint 6a (this test introduction): testvault-types renamed; 6 legacy names accepted
 *   - Sprint 6b (done): testvault-wit-schema renamed; removed from ALLOWED_LEGACY_NAMES
 *   - Sprint 6c: testvault-sdk renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6d: testvault-importers renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6e: testvault-exporters renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6f: testvault-gherkin renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 7a: testvault-cli renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 7b: testpulse-ui-shared -> argos-detection-api; remove from ALLOWED_LEGACY_NAMES
 *   - After Sprint 7b: ALLOWED_LEGACY_NAMES is empty; test enforces argos-* only
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
	// Legacy names accepted during the testvault-* -> argos-* migration wave.
	// Each future sprint will remove its entry as the package is renamed.
	// See Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4).
	"@atconseil/testvault-sdk", // Sprint 6c: rename to argos-sdk
	"@atconseil/testvault-importers", // Sprint 6d: rename to argos-importers
	"@atconseil/testvault-exporters", // Sprint 6e: rename to argos-exporters
	"@atconseil/testvault-gherkin", // Sprint 6f: rename to argos-gherkin
	"@atconseil/testvault-cli", // Sprint 7a: rename to argos-cli
	"@atconseil/testpulse-ui-shared", // Sprint 7b: rename to argos-detection-api
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

	it("no package may use the legacy @atconseil/testvault-* prefix (excluding allowed legacy in transition)", () => {
		const violations: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			// Skip names explicitly allowed during migration
			if (ALLOWED_LEGACY_NAMES.has(pkg.name)) continue;

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
