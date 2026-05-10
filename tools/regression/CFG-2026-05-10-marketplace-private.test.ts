/**
 * Test regression : CFG-2026-05-10-marketplace-private
 *
 * Context
 * -------
 * User decision 2026-05-10: Argos is published as a PRIVATE Marketplace extension,
 * accessible only to the bcee-qa Azure DevOps organization (and any other org
 * explicitly shared with via the publisher portal).
 *
 * This test is a zero-tolerance guard against accidental public exposure: if
 * vss-extension.json's "public" field is missing, true, or anything other than
 * the literal boolean false, the test fails.
 *
 * Microsoft official syntax (2026 docs): top-level "public": false.
 * Legacy "galleryFlags": ["Private"] is also accepted by tfx-cli but the modern
 * docs use "public" -- we adopt the modern syntax.
 *
 * Why this matters: a single accidental edit of "public": true (or removal of the
 * field, since the default in some legacy contexts was public-by-default) could
 * publish the extension to the entire Marketplace audience. Catastrophic privacy
 * leak.
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
	galleryFlags?: string[];
	[k: string]: unknown;
}

describe("CFG-2026-05-10 marketplace-private guard", () => {
	it("vss-extension.json must explicitly set public: false", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.public).toBe(false);
	});

	it("vss-extension.json must NOT set public: true under any circumstance", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.public).not.toBe(true);
	});

	it("if galleryFlags is present, it must NOT contain Public", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		if (parsed.galleryFlags) {
			expect(parsed.galleryFlags).not.toContain("Public");
		}
	});
});
