/**
 * Test regression : CFG-2026-05-10-publisher-atconseil
 *
 * Contexte
 * --------
 * La constitution §X exige que le publisher Marketplace de l'extension Argos soit
 * "ATConseil" (le compte Marketplace officiel d'Alexandre Thibaud / atconseil.info).
 * Le manifest initial contenait "AlexThibaud" -- incoherent et corrige Sprint 2.
 *
 * Ce test garantit qu'aucune regression silencieuse ne reintroduit l'ancien publisher.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const EXPECTED_PUBLISHER = "ATConseil";

interface Manifest {
	publisher?: string;
	[k: string]: unknown;
}

describe("CFG-2026-05-10 publisher-atconseil guard", () => {
	it("vss-extension.json publisher must be ATConseil", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.publisher).toBe(EXPECTED_PUBLISHER);
	});

	it("must reject the legacy publisher name AlexThibaud anywhere in manifest", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		expect(raw).not.toMatch(/"publisher"\s*:\s*"AlexThibaud"/);
	});
});
