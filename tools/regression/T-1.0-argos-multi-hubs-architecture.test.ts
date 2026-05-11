/**
 * Regression test: T-1.0-argos-multi-hubs-architecture (UX-decision)
 *
 * History:
 *   2026-05-10 (Sprint 3) - Argos hub single monolithic contribution (argos-hub)
 *                rendering an internal switch-case menu in App.tsx.
 *   2026-05-11 (Sprint 3.4) - Hub-group dedicated created (argos-hub-group),
 *                argos-hub still single, navigation internal still custom.
 *   2026-05-11 (T-1.0, Sprint 4) - Architecture multi-hubs native ADO. Single
 *                argos-hub replaced by 6 hubs internes:
 *                  argos-hub-plans, argos-hub-cases, argos-hub-sets,
 *                  argos-hub-preconditions, argos-hub-reports, argos-hub-settings
 *                All target .argos-hub-group via relative reference.
 *                App.tsx derives section from SDK.getContributionId() instead
 *                of internal state. Internal navigation menu removed.
 *                Visual parity with native Test Plans achieved.
 *
 * What this test guards:
 *   - 6 hubs internes exist : plans, cases, sets, preconditions, reports, settings
 *   - All target ".argos-hub-group" (relative reference)
 *   - All have type "ms.vss-web.hub"
 *   - No more singular "argos-hub" contribution (replaced by the 6 above)
 *   - argos-hub-group still exists (Sprint 3.4 preserved)
 *   - Display names follow long format: "Test Plans", "Test Cases", etc.
 *
 * Rationale: prevents accidental return to monolithic single-hub OR partial
 * split (e.g. only 3 hubs instead of 6). Architecture native parity with
 * Test Plans must remain stable.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/spec.md, Specs/tasks.md T-1.0
 *   - REGISTRY entry T-1.0-argos-multi-hubs-architecture
 *   - Microsoft docs: hub-group + hub pattern, getContributionId() SDK function
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

const EXPECTED_HUBS: Array<{ id: string; name: string }> = [
	{ id: "argos-hub-plans", name: "Test Plans" },
	{ id: "argos-hub-cases", name: "Test Cases" },
	{ id: "argos-hub-sets", name: "Test Sets" },
	{ id: "argos-hub-preconditions", name: "Preconditions" },
	{ id: "argos-hub-reports", name: "Reports" },
	{ id: "argos-hub-settings", name: "Settings" },
];

describe("T-1.0-argos-multi-hubs-architecture regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it.each(EXPECTED_HUBS)("must declare hub '$id' with display name '$name'", ({ id, name }) => {
		const hub = manifest.contributions.find((c) => c.id === id);
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
		expect(hub?.targets).toContain(".argos-hub-group");
		expect(hub?.properties?.name).toBe(name);
	});

	it("must NOT declare the legacy singular argos-hub (Sprint 3.4 monolithic)", () => {
		const legacy = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(legacy).toBeUndefined();
	});

	it("argos-hub-group must still exist (Sprint 3.4 preserved)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("must have exactly 6 ms.vss-web.hub contributions (one per section)", () => {
		const hubs = manifest.contributions.filter((c) => c.type === "ms.vss-web.hub");
		expect(hubs).toHaveLength(6);
	});
});
