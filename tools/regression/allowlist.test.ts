/**
 * Cross-check test: SHARED_DOC_ALLOWLIST in allowlist.ts and allowlist.cjs
 * MUST contain the same entries.
 *
 * This dual-source-of-truth is a temporary trade-off (CommonJS scan tools
 * cannot easily import a TypeScript module without compilation). When all
 * regression tooling is migrated to .ts/.mjs, this test and allowlist.cjs
 * can be removed.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SHARED_DOC_ALLOWLIST as TS_ALLOWLIST } from "./allowlist.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

interface CjsModule {
	SHARED_DOC_ALLOWLIST: Set<string>;
}

describe("allowlist ts/cjs cross-check", () => {
	it("allowlist.ts and allowlist.cjs must contain identical entries", () => {
		const cjs: CjsModule = require(join(__dirname, "allowlist.cjs"));
		const tsArr = [...TS_ALLOWLIST].sort();
		const cjsArr = [...cjs.SHARED_DOC_ALLOWLIST].sort();
		expect(cjsArr).toEqual(tsArr);
	});
});
