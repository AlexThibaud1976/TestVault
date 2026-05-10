/**
 * Regression test: CFG-2026-05-10-marketplace-public
 *
 * History:
 *   pre-Sprint Marketplace prive - Argos v0.1.1 published as PUBLIC on the
 *                Marketplace under AlexThibaud publisher (2026-05-08).
 *   Sprint Marketplace prive (PR feat/marketplace-private) - manifest changed
 *                to "public": false to restrict audience during development.
 *                Test CFG-2026-05-10-marketplace-private added to lock private.
 *                BASED ON FALSE PREMISE: an extension already published as
 *                Public cannot be downgraded to Private (Microsoft Marketplace
 *                rule). The Sprint Marketplace prive change passed locally
 *                because tests check the manifest, not the Marketplace state.
 *   Sprint 3 (2026-05-10) - Top-level hub + bump v0.3.0. Tag v0.3.0 pushed,
 *                CI publication FAILED (publisher mismatch ATConseil/AlexThibaud).
 *   Sprint 3.1 (2026-05-10) - Publisher revert ATConseil -> AlexThibaud.
 *                Tag v0.3.1 pushed, CI publication FAILED again with:
 *                "An extension that was made public can't be changed to private."
 *   Sprint 3.2 (2026-05-10, this PR) - Revert "public": false. Argos stays
 *                Public (coherence with v0.1.1, low risk per product owner).
 *                Test renamed + inverted to lock Public visibility.
 *                Old name CFG-2026-05-10-marketplace-private retired.
 *
 * What this test guards:
 *   - vss-extension.json must NOT contain "public": false
 *   - The manifest defaults to public visibility (Marketplace default)
 *   - Sanity: positive check that no private flag is set
 *
 * Rationale: prevents accidental re-introduction of the Sprint Marketplace
 * prive mistake. An extension already published as Public cannot be set to
 * Private without losing the existing extensionId and creating a new one.
 *
 * DO NOT delete without explicit spec-kit decision and updated REGISTRY entry.
 *
 * Reference: Specs/spec.md, REGISTRY.md (CFG-2026-05-10-marketplace-public + retired entry)
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
	public?: boolean;
}

describe("CFG-2026-05-10-marketplace-public regression", () => {
	const raw = readFileSync(MANIFEST_PATH, "utf8");
	const manifest: Manifest = JSON.parse(raw);

	it("manifest must NOT contain a 'public': false key", () => {
		expect(raw).not.toMatch(/"public"\s*:\s*false/);
	});

	it("manifest 'public' field, if present, must be true", () => {
		if (manifest.public !== undefined) {
			expect(manifest.public).toBe(true);
		} else {
			// Absent -> defaults to public (Marketplace default behavior). OK.
			expect(manifest.public).toBeUndefined();
		}
	});

	it("manifest must NOT contain galleryFlags 'Private' (legacy syntax)", () => {
		expect(raw).not.toMatch(/"galleryFlags"\s*:\s*\[[^\]]*"Private"[^\]]*\]/);
	});
});
