/**
 * Regression test: CFG-2026-05-12-preflight-rules (Configuration)
 *
 * History:
 *   2026-05-12 (TECH-DEBT-011 v3) - Initial. Encodes manifest pre-flight rules
 *                                  derived from Sprint 2 -> 4.5 false premises.
 *
 * What this test guards:
 *   - Manifest version matches package.json version (coherence)
 *   - Publisher is in whitelist [AlexThibaud, ATConseil]
 *   - No SVG files in apps/argos-extension/static/ (Marketplace policy)
 *   - Categories non-empty
 *   - icons.default exists and is a PNG
 *   - No invalid targets (Sprint 3 false premise)
 *   - Hub-group consistency (every relative reference resolves)
 *
 * Rationale: encode the rules that DO NOT require human judgment, leaving
 * tools/preflight/marketplace-check.md for those that do (Marketplace state,
 * Microsoft docs validation, etc.).
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - tools/preflight/marketplace-check.md
 *   - tools/preflight/manifest-check.cjs (script equivalent, exit-coded)
 *   - REGISTRY entry CFG-2026-05-12-preflight-rules
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const PACKAGE_JSON_PATH = join(REPO_ROOT, "apps", "argos-extension", "package.json");
const STATIC_DIR = join(REPO_ROOT, "apps", "argos-extension", "static");

const PUBLISHER_WHITELIST = ["AlexThibaud", "ATConseil"];
const INVALID_TARGETS = ["ms.vss-web.project-hub-group"];

interface Contribution {
	id: string;
	type: string;
	targets?: string[];
}

interface Manifest {
	version: string;
	publisher: string;
	categories?: string[];
	icons?: { default?: string };
	contributions?: Contribution[];
	public?: boolean;
}

interface PackageJson {
	version: string;
}

describe("CFG-2026-05-12-preflight-rules regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
	const pkg: PackageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));

	it("manifest version must match package.json version", () => {
		expect(manifest.version).toBe(pkg.version);
	});

	it("publisher must be in whitelist", () => {
		expect(PUBLISHER_WHITELIST).toContain(manifest.publisher);
	});

	it("apps/argos-extension/static/ must contain no .svg files (Marketplace policy)", () => {
		if (!existsSync(STATIC_DIR)) return;
		const files = readdirSync(STATIC_DIR);
		const svgs = files.filter((f) => f.toLowerCase().endsWith(".svg"));
		expect(svgs).toEqual([]);
	});

	it("manifest categories must be non-empty", () => {
		expect(manifest.categories).toBeDefined();
		expect((manifest.categories ?? []).length).toBeGreaterThan(0);
	});

	it("icons.default must exist and be a PNG", () => {
		const defaultIcon = manifest.icons?.default;
		expect(defaultIcon).toBeDefined();
		expect(defaultIcon?.toLowerCase()).toMatch(/\.png$/);
	});

	it("no contribution must use the invalid target ms.vss-web.project-hub-group (Sprint 3 false premise)", () => {
		const offenders: string[] = [];
		for (const contrib of manifest.contributions ?? []) {
			for (const target of contrib.targets ?? []) {
				if (INVALID_TARGETS.includes(target)) {
					offenders.push(`${contrib.id} -> ${target}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("every relative hub-group reference (.<id>) must resolve to a declared hub-group", () => {
		const contribs = manifest.contributions ?? [];
		const declaredHubGroups = new Set(
			contribs.filter((c) => c.type === "ms.vss-web.hub-group").map((c) => c.id)
		);
		const unresolved: string[] = [];
		for (const contrib of contribs) {
			if (contrib.type !== "ms.vss-web.hub") continue;
			for (const target of contrib.targets ?? []) {
				if (target.startsWith(".")) {
					const ref = target.slice(1);
					if (!declaredHubGroups.has(ref)) {
						unresolved.push(`${contrib.id} -> ${target} (not declared)`);
					}
				}
			}
		}
		expect(unresolved).toEqual([]);
	});
});
