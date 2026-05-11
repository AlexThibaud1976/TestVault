/**
 * Regression test: T-0.9-argos-top-level-placement (UX-decision)
 *
 * History:
 *   2026-05-10 (T-0.8) - Argos hub placed under Boards via vss-extension.json
 *                        contribution targeting "ms.vss-work-web.work-hub-group".
 *                        Decision later judged suboptimal: Argos is a transverse
 *                        product, not a Boards feature.
 *   2026-05-10 (T-0.9 v1, Sprint 3) - Argos hub moved to top-level via target
 *                        "ms.vss-web.project-hub-group". FAUSSE PREMISSE: ce
 *                        target n'existe pas chez Microsoft. L'extension est
 *                        acceptee a l'upload (Microsoft ne valide pas les
 *                        target IDs) mais le hub n'apparait pas dans la nav
 *                        ADO au runtime (silent failure).
 *   2026-05-11 (T-0.9 v2, Sprint 3.4) - Architecture refondee : creation d'un
 *                        hub-group dedie (argos-hub-group) targetant le vrai
 *                        conteneur Microsoft "ms.vss-web.project-hub-groups-collection".
 *                        Le hub interne (argos-hub) cible le hub-group via
 *                        reference relative ".argos-hub-group".
 *   2026-05-11 (T-0.9 v3, Sprint 4) - Architecture multi-hubs. Argos-hub
 *                        singulier supprime au profit de 6 hubs internes.
 *                        Voir T-1.0-argos-multi-hubs-architecture.
 *
 * What this test guards (Sprint 4 version):
 *   - vss-extension.json must declare an "argos-hub-group" contribution
 *   - That contribution must be of type "ms.vss-web.hub-group"
 *   - Its targets[] must include "ms.vss-web.project-hub-groups-collection"
 *   - At least one hub must target ".argos-hub-group" (relative reference)
 *   - No contribution must target the invalid "ms.vss-web.project-hub-group"
 *     (Sprint 3 false premise guard)
 *
 * Rationale: prevents accidental return to under-Boards placement OR to the
 * invalid "project-hub-group" target. Architecture must remain top-level via
 * a dedicated hub-group following Microsoft's official pattern.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/spec.md, Specs/tasks.md T-0.9
 *   - Microsoft docs: https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub
 *   - REGISTRY entries: T-0.9 (active), CFG-2026-05-10-top-level-hub (active)
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

describe("T-0.9-argos-top-level-placement regression (Sprint 4 architecture)", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("must declare an argos-hub-group contribution", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
	});

	it("argos-hub-group must be of type ms.vss-web.hub-group", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
	});

	it("argos-hub-group must target ms.vss-web.project-hub-groups-collection", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("at least one hub must target .argos-hub-group (relative reference, Sprint 4 multi-hubs)", () => {
		const hubs = manifest.contributions.filter((c) => c.targets?.includes(".argos-hub-group"));
		expect(hubs.length).toBeGreaterThanOrEqual(1);
	});

	it("no contribution must target the invalid ms.vss-web.project-hub-group (Sprint 3 false premise guard)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-web.project-hub-group")
		);
		expect(offenders).toEqual([]);
	});

	it("no contribution must target ms.vss-work-web.work-hub-group (no Boards placement)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-work-web.work-hub-group")
		);
		expect(offenders).toEqual([]);
	});
});
