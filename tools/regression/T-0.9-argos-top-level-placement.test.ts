/**
 * Regression test: T-0.9-argos-top-level-placement (UX-decision)
 *
 * History:
 *   2026-05-10 (T-0.8)     - Argos under Boards (ms.vss-work-web.work-hub-group). Suboptimal.
 *   2026-05-10 (T-0.9 v1)  - Moved to "ms.vss-web.project-hub-group". FAUSSE PREMISSE: this
 *                            target does not exist at Microsoft. Extension accepted at upload
 *                            but hub invisible at runtime (silent failure).
 *   2026-05-11 (T-0.9 v2)  - Sprint 3.4: hub-group (argos-hub-group) targeting
 *                            "ms.vss-web.project-hub-groups-collection". argos-hub child
 *                            targeted ".argos-hub-group" via relative reference.
 *   2026-05-11 (T-0.9 v3)  - Sprint 4 multi-hubs: 6 sub-hubs all targeting ".argos-hub-group".
 *   2026-05-20 (Sprint 2.18.3) - Single hub (D140/D145). argos-hub targets
 *                            "ms.vss-web.project-hub-groups-collection" DIRECTLY.
 *                            No hub-group intermediary. 1 ADO sidebar icon.
 *   2026-05-20 (Sprint 2.18.4) - Restore hub-group pattern. argos-hub-group targets
 *                            project-hub-groups-collection. argos-hub targets .argos-hub-group.
 *                            Fixes double sidebar icon bug from Sprint 2.18.3 regression.
 *
 * What this test guards (Sprint 2.18.4 hub-group + single hub architecture):
 *   - argos-hub-group exists (ms.vss-web.hub-group, targets project-hub-groups-collection)
 *   - argos-hub exists (ms.vss-web.hub, targets .argos-hub-group)
 *   - No contribution targets ms.vss-work-web.work-hub-group (Boards placement guard)
 *   - No contribution targets ms.vss-web.project-hub-group (invalid target guard)
 *   - No legacy 6 sub-hubs
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/tasks.md T-0.9, TECH-DEBT-067/068
 *   - Decision D140 reverted by Sprint 2.18.4
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
	contributions: Contribution[];
}

describe("T-0.9-argos-top-level-placement regression (Sprint 2.18.4 hub-group + single hub)", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("argos-hub-group must exist (type ms.vss-web.hub-group)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
	});

	it("argos-hub-group must target ms.vss-web.project-hub-groups-collection (top-level)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("argos-hub must exist as a hub contribution", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
	});

	it("argos-hub must target .argos-hub-group (relative reference, not direct collection)", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub?.targets).toContain(".argos-hub-group");
		expect(hub?.targets).not.toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("no contribution must target ms.vss-work-web.work-hub-group (Boards placement guard)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-work-web.work-hub-group")
		);
		expect(offenders).toEqual([]);
	});

	it("no contribution must target the invalid ms.vss-web.project-hub-group (Sprint 3 false premise guard)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-web.project-hub-group")
		);
		expect(offenders).toEqual([]);
	});

	it("must NOT declare legacy sub-hubs (removed Sprint 2.18.3)", () => {
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
});
