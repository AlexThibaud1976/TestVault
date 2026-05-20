/**
 * Regression test: CFG-2026-05-10-top-level-hub
 *
 * Locks invariants in vss-extension.json after Sprint 3 (v0.3.0), Sprint 3.4 (v0.3.5), Sprint 4 (v0.4.0):
 *   1. No contribution targets "ms.vss-work-web.work-hub-group" (zero tolerance, Sprint 3)
 *   2. version >= 0.3.0
 *   3. categories includes both "Azure Boards" and "Azure Test Plans"
 *   4. No contribution targets the invalid "ms.vss-web.project-hub-group" (Sprint 3 false premise guard)
 *   5. manifest must declare argos-hub-group (hub-group + hub child pattern, Sprint 2.18.4)
 *   6. argos-hub must target .argos-hub-group relative reference (Sprint 2.18.4)
 *
 * Complementary to T-0.9-argos-top-level-placement (which checks the positive
 * presence of the top-level target). This test enforces zero-tolerance on the
 * absence of the legacy target across ALL contributions.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Sprint 3 (v0.3.0), Sprint 3.4 (v0.3.5), Sprint 4 (v0.4.0), tools/regression/REGISTRY.md
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");

interface Contribution {
	id: string;
	type: string;
	targets: string[];
}

interface Manifest {
	version: string;
	categories: string[];
	contributions: Contribution[];
}

function parseSemver(v: string): [number, number, number] {
	const parts = v.split(".").map((n) => Number.parseInt(n, 10));
	if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
		throw new Error(`Invalid semver: ${v}`);
	}
	return [parts[0] as number, parts[1] as number, parts[2] as number];
}

function gte(a: string, b: string): boolean {
	const [a1, a2, a3] = parseSemver(a);
	const [b1, b2, b3] = parseSemver(b);
	if (a1 !== b1) return a1 > b1;
	if (a2 !== b2) return a2 > b2;
	return a3 >= b3;
}

describe("CFG-2026-05-10-top-level-hub regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("no contribution must target ms.vss-work-web.work-hub-group (no Boards placement)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-work-web.work-hub-group")
		);
		expect(offenders).toEqual([]);
	});

	it("version must be >= 0.3.0", () => {
		expect(gte(manifest.version, "0.3.0")).toBe(true);
	});

	it("categories must include Azure Boards and Azure Test Plans", () => {
		expect(manifest.categories).toContain("Azure Boards");
		expect(manifest.categories).toContain("Azure Test Plans");
	});

	it("no contribution must target the invalid ms.vss-web.project-hub-group (Sprint 3 false premise guard)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-web.project-hub-group")
		);
		expect(offenders).toEqual([]);
	});

	it("manifest must declare argos-hub-group (hub-group pattern restored Sprint 2.18.4)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("argos-hub must target .argos-hub-group relative reference (Sprint 2.18.4)", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
		expect(hub?.targets).toContain(".argos-hub-group");
	});
});
