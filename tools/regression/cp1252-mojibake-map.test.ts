// cp1252-mojibake-map.test.ts
// Cross-check: ts and cjs exports must be identical.
// Pattern: same as allowlist.test.ts (TECH-DEBT-001).
// IMPORTANT: 100% ASCII source -- no literal non-ASCII characters.

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	CP1252_MOJIBAKE_BYTE_2_CHARS as TS_CHARS,
	MOJIBAKE_CHAR_CLASS as TS_CLASS,
	buildMojibakePatterns as buildTs,
} from "./cp1252-mojibake-map.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

interface CjsModule {
	CP1252_MOJIBAKE_BYTE_2_CHARS: number[];
	MOJIBAKE_CHAR_CLASS: string;
	buildMojibakePatterns: () => RegExp[];
}

describe("cp1252-mojibake-map ts/cjs cross-check", () => {
	it("CP1252_MOJIBAKE_BYTE_2_CHARS must contain exactly 59 codepoints", () => {
		expect(TS_CHARS).toHaveLength(59);
	});

	it("CP1252_MOJIBAKE_BYTE_2_CHARS must include trademark and euro (regression cases)", () => {
		expect(TS_CHARS).toContain(0x2122); // trade mark sign (byte 0x99)
		expect(TS_CHARS).toContain(0x20ac); // euro sign (byte 0x80)
		expect(TS_CHARS).toContain(0x201a); // single low-9 quotation mark (byte 0x82, byte-2 of euro mojibake)
		expect(TS_CHARS).toContain(0x201e); // double low-9 quotation mark (byte 0x84, byte-2 of trademark mojibake)
	});

	it("CP1252_MOJIBAKE_BYTE_2_CHARS must be identical in ts and cjs", () => {
		const cjs: CjsModule = require(join(__dirname, "cp1252-mojibake-map.cjs"));
		expect([...cjs.CP1252_MOJIBAKE_BYTE_2_CHARS].sort((a, b) => a - b)).toEqual(
			[...TS_CHARS].sort((a, b) => a - b)
		);
	});

	it("MOJIBAKE_CHAR_CLASS must be identical in ts and cjs", () => {
		const cjs: CjsModule = require(join(__dirname, "cp1252-mojibake-map.cjs"));
		expect(cjs.MOJIBAKE_CHAR_CLASS).toBe(TS_CLASS);
	});

	it("buildMojibakePatterns must produce identical regex sources in ts and cjs", () => {
		const cjs: CjsModule = require(join(__dirname, "cp1252-mojibake-map.cjs"));
		const tsPatterns = buildTs().map((p) => p.source);
		const cjsPatterns = cjs.buildMojibakePatterns().map((p: RegExp) => p.source);
		expect(cjsPatterns).toEqual(tsPatterns);
	});
});
