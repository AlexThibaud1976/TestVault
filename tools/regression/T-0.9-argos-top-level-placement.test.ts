/**
 * Regression test: T-0.9-argos-top-level-placement (UX-decision)
 *
 * History:
 *   2026-05-10 (T-0.8) - Argos hub placed under Boards via vss-extension.json
 *                        contribution targeting "ms.vss-work-web.work-hub-group".
 *                        Commit: "feat(extension): T-0.8 ADO-compliant manifest, hub group..."
 *                        Decision later judged suboptimal: Argos is a transverse product,
 *                        not a Boards feature.
 *   2026-05-10 (T-0.9) - Argos hub moved to top-level (peer of Boards/Repos/Pipelines)
 *                        via target "ms.vss-web.project-hub-group". Sprint 3, v0.3.0.
 *
 * What this test guards:
 *   - vss-extension.json must declare an "argos-hub" contribution
 *   - That contribution targets[] must include "ms.vss-web.project-hub-group"
 *   - That contribution targets[] must NOT include "ms.vss-work-web.work-hub-group"
 *
 * Rationale: a future "cleanup" or merge conflict must not silently revert
 * Argos to under-Boards placement. This is a UX-decision test.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Specs/spec.md (nav-placement), Specs/tasks.md T-0.9
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

describe("T-0.9-argos-top-level-placement regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("must declare an argos-hub contribution", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
	});

	it("argos-hub targets must include ms.vss-web.project-hub-group (top-level placement)", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
		expect(argosHub?.targets).toContain("ms.vss-web.project-hub-group");
	});

	it("argos-hub targets must NOT include ms.vss-work-web.work-hub-group (no Boards placement)", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
		expect(argosHub?.targets).not.toContain("ms.vss-work-web.work-hub-group");
	});
});
