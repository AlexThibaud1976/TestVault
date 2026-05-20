/**
 * Regression test: T-1.0-argos-hub-architecture (UX-decision)
 *
 * History:
 *   2026-05-10 (Sprint 3)   - Single argos-hub (monolithic), internal switch-case menu.
 *   2026-05-11 (Sprint 3.4) - Hub-group (argos-hub-group) + argos-hub child.
 *   2026-05-11 (Sprint 4)   - Multi-hubs native ADO: 6 sub-hubs (plans/cases/sets/
 *                             preconditions/reports/settings) under argos-hub-group.
 *                             App.tsx derived section from SDK.getContributionId().
 *   2026-05-20 (Sprint 2.18.3) - Revert to single hub (D140/D145).
 *                             Double menu UX bug: 6 ADO sidebar icons + our 220px
 *                             Sidebar Argos were both visible. Decision: consolidate
 *                             to argos-hub UNIQUE targeting project-hub-groups-collection.
 *                             Navigation handled internally by useArgosRouting (Sprint 2.18).
 *
 * What this test guards (Sprint 2.18.3 single-hub architecture):
 *   - argos-hub exists as single hub entry (type ms.vss-web.hub)
 *   - argos-hub targets ms.vss-web.project-hub-groups-collection (top-level)
 *   - No argos-hub-group (suppressed Sprint 2.18.3)
 *   - No legacy sub-hubs (argos-hub-plans, argos-hub-cases, etc.)
 *   - Exactly 1 ms.vss-web.hub contribution (not 6)
 *   - argos-coverage-panel still present
 *
 * DO NOT delete without explicit spec-kit decision (D140/D145 reverted this).
 *
 * Reference:
 *   - Specs/tasks.md TECH-DEBT-067
 *   - Decision D140 (single hub) + D145 (hub-group suppressed), 2026-05-20
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
	properties?: { name?: string };
}

interface Manifest {
	contributions: Contribution[];
}

describe("T-1.0-argos-hub-architecture regression (Sprint 2.18.3 single-hub)", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("must declare argos-hub as a single hub entry (type ms.vss-web.hub)", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
	});

	it("argos-hub must target ms.vss-web.project-hub-groups-collection (top-level placement)", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("must have exactly 1 ms.vss-web.hub contribution (single hub, not 6)", () => {
		const hubs = manifest.contributions.filter((c) => c.type === "ms.vss-web.hub");
		expect(hubs).toHaveLength(1);
	});

	it("must NOT declare argos-hub-group (suppressed Sprint 2.18.3, D145)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeUndefined();
	});

	it("must NOT declare legacy sub-hubs (all removed Sprint 2.18.3)", () => {
		const legacyIds = [
			"argos-hub-plans",
			"argos-hub-cases",
			"argos-hub-sets",
			"argos-hub-preconditions",
			"argos-hub-reports",
			"argos-hub-settings",
		];
		for (const id of legacyIds) {
			const found = manifest.contributions.find((c) => c.id === id);
			expect(found, `${id} should not exist`).toBeUndefined();
		}
	});

	it("argos-coverage-panel must still exist (work-item-form-page, unchanged)", () => {
		const panel = manifest.contributions.find((c) => c.id === "argos-coverage-panel");
		expect(panel).toBeDefined();
		expect(panel?.type).toBe("ms.vss-work-web.work-item-form-page");
	});
});
