/**
 * Regression test: CFG-2026-05-10-publisher-alexthibaud
 *
 * History:
 *   pre-Sprint-2 - Argos manifest publisher = "AlexThibaud" (correct)
 *   Sprint 2 (2026-05-10, PR feat/cloud-only-v0.2.0) - publisher changed
 *                AlexThibaud -> ATConseil, framed as a "correction".
 *                Test CFG-2026-05-10-publisher-atconseil added to lock ATConseil.
 *                BASED ON FALSE PREMISE: ATConseil publisher does not exist for
 *                Argos on the Marketplace. AlexThibaud is the historical and
 *                only valid publisher for Argos. ATConseil is reserved for the
 *                TestPulse product.
 *   Sprint 3 (2026-05-10) - Top-level hub + bump v0.3.0 + Marketplace banner.
 *                v0.3.0 tag pushed, CI publication FAILED with mismatch error
 *                "Publisher ID 'ATConseil' should match 'AlexThibaud'".
 *   Sprint 3.1 (2026-05-10, this PR) - Revert publisher to AlexThibaud.
 *                Test renamed + inverted to lock AlexThibaud as the publisher.
 *                Old name CFG-2026-05-10-publisher-atconseil retired (entry in
 *                REGISTRY "Tests retires" section).
 *
 * What this test guards:
 *   - vss-extension.json must have "publisher": "AlexThibaud"
 *   - Manifest must NOT contain "ATConseil" as publisher value
 *
 * Rationale: prevents accidental re-introduction of the Sprint 2 mistake.
 *
 * DO NOT delete without explicit spec-kit decision and updated REGISTRY entry.
 *
 * Reference: Specs/spec.md, REGISTRY.md (CFG-2026-05-10-publisher-alexthibaud + retired entry)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");

interface Manifest {
	publisher: string;
}

describe("CFG-2026-05-10-publisher-alexthibaud regression", () => {
	const raw = readFileSync(MANIFEST_PATH, "utf8");
	const manifest: Manifest = JSON.parse(raw);

	it("publisher must be AlexThibaud", () => {
		expect(manifest.publisher).toBe("AlexThibaud");
	});

	it("must reject ATConseil as publisher anywhere in manifest", () => {
		expect(raw).not.toMatch(/"publisher"\s*:\s*"ATConseil"/);
	});
});
