import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifies that all packages in the Changesets fixed group share the same version.
 *
 * Context: Sprint 8 (2026-05-14) introduced Changesets fixed mode to keep
 * all argos product packages aligned on the same version. This test prevents
 * accidental drift between packages (e.g. if someone manually bumps one
 * without the others).
 *
 * Excluded from fixed group:
 * - @atconseil/regression-suite (internal dev tool, versioned independently)
 *
 * See Specs/MIGRATION-PLAN.md and .changeset/config.json.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");

const FIXED_GROUP_PATHS = [
	"package.json", // root (argos)
	"apps/argos-extension/package.json",
	"apps/argos-functions/package.json",
	"apps/docs-site/package.json",
	"packages/argos-cli/package.json",
	"packages/argos-detection-api/package.json",
	"packages/argos-exporters/package.json",
	"packages/argos-gherkin/package.json",
	"packages/argos-importers/package.json",
	"packages/argos-sdk/package.json",
	"packages/argos-types/package.json",
	"packages/argos-wit-schema/package.json",
	"tools/azure-pipelines-task/package.json",
	"tools/e2e/package.json",
];

function readPackageJson(relativePath: string): { name: string; version: string } {
	const full = join(REPO_ROOT, relativePath);
	const content = readFileSync(full, "utf-8");
	const pkg = JSON.parse(content) as { name: string; version: string };
	return { name: pkg.name, version: pkg.version };
}

describe("CFG-2026-05-14-fixed-versioning", () => {
	it("all packages in the fixed group share the same version", () => {
		const packages = FIXED_GROUP_PATHS.map((p) => ({
			path: p,
			...readPackageJson(p),
		}));

		const versions = new Set(packages.map((p) => p.version));

		if (versions.size > 1) {
			const grouped = packages.map((p) => `  ${p.path} (${p.name}) : ${p.version}`).join("\n");
			throw new Error(
				`Fixed group versioning drift detected. All packages should share the same version.\n${grouped}\n\nCheck .changeset/config.json fixed array and run 'pnpm changeset version'.`
			);
		}

		expect(versions.size).toBe(1);
	});

	it("the fixed version matches the root package.json", () => {
		const rootVersion = readPackageJson("package.json").version;
		const allPackages = FIXED_GROUP_PATHS.map((p) => readPackageJson(p));
		for (const pkg of allPackages) {
			expect(pkg.version).toBe(rootVersion);
		}
	});

	it("root package.json name is 'argos' (Sprint 8 rename)", () => {
		const root = readPackageJson("package.json");
		expect(root.name).toBe("argos");
	});

	it("regression-suite is correctly excluded from fixed group", () => {
		const reg = readPackageJson("tools/regression/package.json");
		expect(reg.name).toBe("@atconseil/regression-suite");
		// Version intentionally independent (0.1.0)
		expect(reg.version).not.toBe(readPackageJson("package.json").version);
	});
});
