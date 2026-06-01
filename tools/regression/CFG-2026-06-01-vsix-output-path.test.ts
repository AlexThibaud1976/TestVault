import { describe, expect, it } from "vitest";

/**
 * Verifies the VSIX output-path naming contract for `pnpm package`.
 *
 * Context: 2026-06-01 -- VSIX packaging was not standardized. The legacy
 * `build:vsix` script emitted `../../dist/argos.vsix` (monorepo-root dist,
 * non-versioned name), while versioned `.vsix` files were produced by hand via
 * tfx. The `pnpm package` command standardizes this to a dedicated
 * `apps/argos-extension/release/` folder with a versioned name.
 *
 * Two invariants this test locks:
 *  1. Name is versioned: `release/ArgosTesting-{version}.vsix`.
 *  2. The path NEVER points under `dist/`. The manifest `files` glob packages
 *     `dist/`, so a `.vsix` written there would be recursively bundled into the
 *     next release. This guards that recursion trap.
 *
 * See CLAUDE_TASK_release-packaging.md and apps/argos-extension/scripts/package.mjs.
 */

import { getVsixOutputPath } from "../../apps/argos-extension/scripts/package.mjs";

describe("CFG-2026-06-01-vsix-output-path", () => {
	it("produces a versioned vsix path under release/", () => {
		expect(getVsixOutputPath("0.5.34")).toBe("release/ArgosTesting-0.5.34.vsix");
	});

	it("never targets dist/ (manifest files-glob recursion trap)", () => {
		expect(getVsixOutputPath("0.5.34")).not.toContain("dist");
	});

	it("is version-parametric", () => {
		expect(getVsixOutputPath("1.2.3")).toBe("release/ArgosTesting-1.2.3.vsix");
	});
});
