// fix-mojibake.cjs (v2 — itération par codepoint, gère les emojis non-corrompus)
//
// Usage : node fix-mojibake.cjs <input-file> [output-file]
//   (sans output-file = dry-run, affiche stats sans toucher au fichier)
//
// Inverse le bug Set-Content PowerShell sans -Encoding utf8 :
// 1. Le fichier UTF-8 original a été lu par PS en cp1252 (Windows-1252) au lieu d'UTF-8
// 2. Chaque byte UTF-8 multi-octets est devenu plusieurs caractères cp1252
// 3. Re-écrit en UTF-8 = double-encoding mojibake
//
// Round-trip de récupération :
//   UTF-8 lu → string JS → encoder en cp1252 → bytes → décoder en UTF-8 → texte original
//
// Les caractères hors cp1252 (typiquement des emojis 4-bytes qui ont échappé à la corruption
// initiale) sont conservés tels quels via leurs bytes UTF-8 d'origine.

const fs = require("node:fs");
const path = require("node:path");
const { buildMojibakePatterns } = require("./cp1252-mojibake-map.cjs");

const CP1252_HIGH_REVERSE = {
	0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
	0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
	0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
	0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
	0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
	0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
	0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

function strToMixedBytes(str) {
	const bytes = [];
	const passthrough = [];
	let cpIdx = 0;
	for (const ch of str) {
		const cp = ch.codePointAt(0);
		if (cp < 0x80 || (cp >= 0xA0 && cp <= 0xFF)) {
			bytes.push(cp);
		} else if (CP1252_HIGH_REVERSE[cp] !== undefined) {
			bytes.push(CP1252_HIGH_REVERSE[cp]);
		} else {
			const utf8 = Buffer.from(ch, "utf8");
			for (const b of utf8) bytes.push(b);
			passthrough.push({ index: cpIdx, codepoint: cp, char: ch });
		}
		cpIdx++;
	}
	return { bytes: Buffer.from(bytes), passthrough };
}

function recoverMojibake(input) {
	let cleanInput = input;
	if (input.charCodeAt(0) === 0xFEFF) {
		cleanInput = input.slice(1);
	}
	const { bytes, passthrough } = strToMixedBytes(cleanInput);
	let recovered;
	let decodeError = null;
	try {
		recovered = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch (e) {
		decodeError = e.message;
		recovered = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
	}
	return { recovered, passthrough, decodeError };
}

function countMojibake(str) {
	let total = 0;
	for (const p of buildMojibakePatterns()) {
		const m = str.match(new RegExp(p.source, "g"));
		if (m) total += m.length;
	}
	return total;
}
const args = process.argv.slice(2);
if (args.length === 0) {
	console.error("Usage : node fix-mojibake.cjs <input-file> [output-file]");
	console.error("        (sans output-file = dry-run)");
	process.exit(2);
}

const inputFile = args[0];
const outputFile = args[1];
const dryRun = !outputFile;

if (!fs.existsSync(inputFile)) {
	console.error(`Fichier introuvable : ${inputFile}`);
	process.exit(2);
}

const inputContent = fs.readFileSync(inputFile, "utf8");
const before = countMojibake(inputContent);
console.log(`\n=== Mojibake recovery : ${path.relative(".", inputFile) || inputFile} ===`);
console.log(`Mojibake AVANT : ${before} occurrences`);

if (before === 0) {
	console.log("Aucune corruption détectée. Rien à faire.");
	process.exit(0);
}

const { recovered, passthrough, decodeError } = recoverMojibake(inputContent);
const after = countMojibake(recovered);
console.log(`Mojibake APRÈS : ${after} occurrences`);
console.log(`Réduction : ${before - after} (${(((before - after) / before) * 100).toFixed(1)}%)`);

if (passthrough.length > 0) {
	console.log(`\nℹ ${passthrough.length} caractère(s) déjà propre(s) conservé(s) tels quels :`);
	const samples = passthrough.slice(0, 5);
	for (const p of samples) {
		console.log(`  cp ${p.index} : U+${p.codepoint.toString(16).toUpperCase().padStart(4, "0")} '${p.char}'`);
	}
	if (passthrough.length > 5) console.log(`  ... et ${passthrough.length - 5} autres`);
}

if (decodeError) {
	console.log(`\n⚠ Erreur décodage UTF-8 : ${decodeError}`);
}

console.log("\n--- Aperçu (premières 800 chars du résultat) ---");
console.log(recovered.slice(0, 800));
console.log("---");

if (dryRun) {
	console.log("\nDry-run : aucun fichier écrit. Pour appliquer :");
	console.log(`  node fix-mojibake.cjs ${inputFile} ${inputFile}.fixed`);
	process.exit(after === 0 ? 0 : 1);
}

fs.writeFileSync(outputFile, recovered, { encoding: "utf8" });
console.log(`\n✓ Écrit (UTF-8 sans BOM) : ${outputFile}`);
process.exit(after === 0 ? 0 : 1);
