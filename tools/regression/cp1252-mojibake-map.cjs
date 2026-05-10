// cp1252-mojibake-map.cjs
// CommonJS pendant of cp1252-mojibake-map.ts for use from .cjs scripts
// (scan-mojibake.cjs, fix-mojibake.cjs).
//
// IMPORTANT: This file MUST stay in sync with cp1252-mojibake-map.ts.
// Sync is verified by tools/regression/cp1252-mojibake-map.test.ts.
// Update BOTH files whenever you add or remove codepoints.
//
// IMPORTANT: This source file uses ONLY ASCII characters. Non-ASCII codepoints are
// referenced via numeric hex literals only.

// cp1252 high-window mapping: 27 defined codepoints for bytes 0x80-0x9F.
// Undefined bytes: 0x81, 0x8D, 0x8F, 0x90, 0x9D (omitted).
const CP1252_HIGH_WINDOW = [
	0x20ac, // byte 0x80 (euro sign)
	// 0x81 undefined
	0x201a, // byte 0x82 (single low-9 quotation mark)
	0x0192, // byte 0x83 (latin small letter f with hook)
	0x201e, // byte 0x84 (double low-9 quotation mark)
	0x2026, // byte 0x85 (horizontal ellipsis)
	0x2020, // byte 0x86 (dagger)
	0x2021, // byte 0x87 (double dagger)
	0x02c6, // byte 0x88 (modifier letter circumflex accent)
	0x2030, // byte 0x89 (per mille sign)
	0x0160, // byte 0x8A (latin capital letter s with caron)
	0x2039, // byte 0x8B (single left-pointing angle quotation mark)
	0x0152, // byte 0x8C (latin capital ligature OE)
	// 0x8D undefined
	0x017d, // byte 0x8E (latin capital letter z with caron)
	// 0x8F undefined
	// 0x90 undefined
	0x2018, // byte 0x91 (left single quotation mark)
	0x2019, // byte 0x92 (right single quotation mark)
	0x201c, // byte 0x93 (left double quotation mark)
	0x201d, // byte 0x94 (right double quotation mark)
	0x2022, // byte 0x95 (bullet)
	0x2013, // byte 0x96 (en dash)
	0x2014, // byte 0x97 (em dash)
	0x02dc, // byte 0x98 (small tilde)
	0x2122, // byte 0x99 (trade mark sign)
	0x0161, // byte 0x9A (latin small letter s with caron)
	0x203a, // byte 0x9B (single right-pointing angle quotation mark)
	0x0153, // byte 0x9C (latin small ligature oe)
	// 0x9D undefined
	0x017e, // byte 0x9E (latin small letter z with caron)
	0x0178, // byte 0x9F (latin capital letter y with diaeresis)
];

const CP1252_MOJIBAKE_BYTE_2_CHARS = [
	// Latin-1 identity (bytes 0xA0-0xBF -> U+00A0-U+00BF, 32 codepoints)
	0x00a0, 0x00a1, 0x00a2, 0x00a3, 0x00a4, 0x00a5, 0x00a6, 0x00a7,
	0x00a8, 0x00a9, 0x00aa, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x00af,
	0x00b0, 0x00b1, 0x00b2, 0x00b3, 0x00b4, 0x00b5, 0x00b6, 0x00b7,
	0x00b8, 0x00b9, 0x00ba, 0x00bb, 0x00bc, 0x00bd, 0x00be, 0x00bf,
	// cp1252 high-window (bytes 0x80-0x9F, 27 defined codepoints)
	...CP1252_HIGH_WINDOW,
];

const MOJIBAKE_CHAR_CLASS =
	"\\u00A0-\\u00BF" +
	CP1252_HIGH_WINDOW.map((cp) => `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`).join("");

function buildMojibakePatterns() {
	const cls = MOJIBAKE_CHAR_CLASS;
	return [
		new RegExp(`\\u00C3[${cls}]`), // 2-byte UTF-8 mojibake
		new RegExp(`\\u00E2[${cls}][${cls}]`), // 3-byte UTF-8 mojibake
		new RegExp(`\\u00F0[${cls}][${cls}][${cls}]`), // 4-byte UTF-8 mojibake
	];
}

module.exports = { CP1252_MOJIBAKE_BYTE_2_CHARS, MOJIBAKE_CHAR_CLASS, buildMojibakePatterns };
