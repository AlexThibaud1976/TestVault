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
 *                            No hub-group intermediary needed. 1 ADO sidebar icon.
 *
 * What this test guards (Sprint 2.18.3):
 *   - argos-hub exists, type ms.vss-web.hub
 *   - argos-hub targets ms.vss-web.project-hub-groups-collection directly
 *   - No contribution targets ms.vss-work-web.work-hub-group (Boards placement guard)
 *   - No contribution targets ms.vss-web.project-hub-group (invalid target guard)
 *   - No argos-hub-group (suppressed, would cause extra sidebar item)
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/tasks.md T-0.9, TECH-DEBT-067
 *   - Decision D140/D145 2026-05-20
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

describe("T-0.9-argos-top-level-placement regression (Sprint 2.18.3 single-hub)", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("argos-hub must exist as a hub contribution", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
	});

	it("argos-hub must target ms.vss-web.project-hub-groups-collection directly", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub?.targets).toContain("ms.vss-web.project-hub-groups-collection");
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

	it("must NOT declare argos-hub-group (suppressed Sprint 2.18.3 to avoid double sidebar entry)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeUndefined();
	});

	it("no contribution must target .argos-hub-group relative reference (hub-group gone)", () => {
		const offenders = manifest.contributions.filter((c) => c.targets?.includes(".argos-hub-group"));
		expect(offenders).toEqual([]);
	});
});
