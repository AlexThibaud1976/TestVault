// cp1252-mojibake-map.ts
//
// Programmatic mapping from cp1252 continuation bytes to their Unicode codepoints,
// used to build regex patterns that detect double-encoded (mojibake) UTF-8 text.
//
// IMPORTANT: This source file uses ONLY ASCII characters. Non-ASCII codepoints are
// referenced via numeric hex literals only. This makes the file immune to the
// cp1252/UTF-8 double-encoding corruption it helps detect.
//
// Background: when a UTF-8 file is read by PowerShell Set-Content without
// -Encoding utf8 (or any other cp1252-defaulting tool), each raw byte is mapped
// through the cp1252 table. The result is then written back as UTF-8, producing
// the "double-encoded" mojibake. Detecting this corruption requires knowing the
// exact Unicode codepoints that cp1252 maps each byte to.
//
// Continuation bytes in valid UTF-8 are always in the range 0x80-0xBF (64 values).
// cp1252 maps these as follows:
//   0x80-0x9F -> cp1252 high-window (27 defined codepoints; 5 bytes are undefined)
//   0xA0-0xBF -> Latin-1 identity (32 codepoints, U+00A0 through U+00BF)
// Total: 59 possible codepoints at any continuation-byte position.
//
// Undefined cp1252 bytes: 0x81, 0x8D, 0x8F, 0x90, 0x9D (omitted from the table).

// cp1252 high-window mapping: raw byte -> Unicode codepoint (27 defined entries).
const CP1252_HIGH_WINDOW: ReadonlyArray<number> = [
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
	0x0160, // byte 0x8A (latin capital letter S with caron)
	0x2039, // byte 0x8B (single left-pointing angle quotation mark)
	0x0152, // byte 0x8C (latin capital ligature OE)
	// 0x8D undefined
	0x017d, // byte 0x8E (latin capital letter Z with caron)
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
	0x0178, // byte 0x9F (latin capital letter Y with diaeresis)
];

/**
 * The 59 Unicode codepoints that can appear at any continuation-byte position
 * in a double-encoded (mojibake) UTF-8 multi-byte sequence.
 *
 * Covers all valid UTF-8 continuation bytes (0x80-0xBF) mapped through cp1252:
 *   - 27 from the cp1252 high-window (0x80-0x9F, excluding 5 undefined bytes)
 *   - 32 from Latin-1 identity (0xA0-0xBF = U+00A0 through U+00BF)
 */
export const CP1252_MOJIBAKE_BYTE_2_CHARS: ReadonlyArray<number> = [
	// Latin-1 identity (bytes 0xA0-0xBF -> U+00A0-U+00BF, 32 codepoints)
	0x00a0,
	0x00a1,
	0x00a2,
	0x00a3,
	0x00a4,
	0x00a5,
	0x00a6,
	0x00a7,
	0x00a8,
	0x00a9,
	0x00aa,
	0x00ab,
	0x00ac,
	0x00ad,
	0x00ae,
	0x00af,
	0x00b0,
	0x00b1,
	0x00b2,
	0x00b3,
	0x00b4,
	0x00b5,
	0x00b6,
	0x00b7,
	0x00b8,
	0x00b9,
	0x00ba,
	0x00bb,
	0x00bc,
	0x00bd,
	0x00be,
	0x00bf,
	// cp1252 high-window (bytes 0x80-0x9F, 27 defined codepoints)
	...CP1252_HIGH_WINDOW,
];

/**
 * Regex character-class string for detecting cp1252-mojibake continuation bytes.
 * Insert inside [...] in a RegExp: new RegExp(`\\u00C3[${MOJIBAKE_CHAR_CLASS}]`).
 *
 * Uses the range \\u00A0-\\u00BF for the Latin-1 block; cp1252 high-window
 * codepoints are listed individually. The string itself contains only ASCII characters.
 */
export const MOJIBAKE_CHAR_CLASS: string = `\\u00A0-\\u00BF${CP1252_HIGH_WINDOW.map((cp) => `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`).join("")}`;

/**
 * Returns 3 RegExp patterns matching mojibake sequences of 2-, 3-, and 4-byte UTF-8.
 *
 * - Pattern 0: 2-byte mojibake (U+00C3 + 1 continuation codepoint)
 *              Covers U+0080-U+07FF originals (accentuated Latin: e-acute, e-grave, etc.)
 * - Pattern 1: 3-byte mojibake (U+00E2 + 2 continuation codepoints)
 *              Covers U+0800-U+FFFF originals (em-dash, smart quotes, trademark, euro, etc.)
 * - Pattern 2: 4-byte mojibake (U+00F0 + 3 continuation codepoints)
 *              Covers U+10000+ originals (emoji: checkmark, rocket, grinning face, etc.)
 *
 * Usage: use .some(p => p.test(line)) to check a single line of text.
 */
export function buildMojibakePatterns(): RegExp[] {
	const cls = MOJIBAKE_CHAR_CLASS;
	return [
		new RegExp(`\\u00C3[${cls}]`), // 2-byte UTF-8 mojibake
		new RegExp(`\\u00E2[${cls}][${cls}]`), // 3-byte UTF-8 mojibake
		new RegExp(`\\u00F0[${cls}][${cls}][${cls}]`), // 4-byte UTF-8 mojibake
	];
}
