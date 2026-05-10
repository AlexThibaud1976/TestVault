// scan-mojibake.cjs
// Usage : node scan-mojibake.cjs [path]
// Exit code : 0 si aucun mojibake, 1 si trouvé.
//
// Détecte les patterns de double-encoding UTF-8 -> Latin-1/Windows-1252 -> UTF-8
// typiques d'une corruption Set-Content PowerShell sans -Encoding utf8.
//
// Tous les patterns mojibake sont écrits en codepoints Unicode (\u00XX) pour
// éviter qu'un encoding shell incorrect ne corrompe la regex elle-même.

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(process.argv[2] || ".");

const SCAN_EXT = new Set([
	".md", ".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs",
	".json", ".yaml", ".yml", ".txt",
]);

const EXCLUDED_DIRS = new Set([
	"node_modules", ".git", "dist", "build", "out", "coverage",
	".turbo", ".pnpm-store", ".next", ".nuxt", "_archive",
]);

// Patterns mojibake en codepoints :
// \u00C3 = Ã   (préfixe latin accentué corrompu)
// \u00E2 = â   (préfixe punctuation/symbole corrompu)
// \u20AC = €   (suit â pour — ' " etc.)
// \u00F0 = ð   (préfixe emoji 4 bytes corrompu)
// \u0178 = Ÿ   (suit ð pour les emojis)
// \u0153 = œ   (suit â pour ✅ ❌)
// \u02DC = ˜   (suit â)
// \u0160 = Š
// \u0152 = Œ
const MOJIBAKE_PATTERN =
	/\u00C3[\u0080-\u00BF]|\u00E2\u20AC[\u0080-\u00BF\u00A6\u201C\u201D\u2018\u2019\u02DC\u2122]|\u00F0\u0178[\u0080-\u00BF\u201C\u201D\u2018\u2019]|\u00E2\u0153[\u0080-\u00BF\u2026\u0152]|\u00E2\u02DC|\u00E2\u0160|\u00E2\u0152|\u00E2\u017E[\u0080-\u00BF]/g;

// Allowlist : fichiers où la mention historique de patterns mojibake est légitime
// (registres de régression, ce script, le test régression encoding).
const ALLOWED = new Set([
	"tools/regression/REGISTRY.md",
	"tools/regression/ENC-2026-05-09-spec-mojibake.test.ts",
	"tools/regression/scan-mojibake.cjs",
	"tools/regression/fix-mojibake.cjs",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",      // <-- ADD
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/README.md",
]);

function* walk(dir) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (e) {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue;
			yield* walk(full);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name);
			if (SCAN_EXT.has(ext)) yield full;
		}
	}
}

const fileResults = [];
let totalOccurrences = 0;

for (const file of walk(REPO_ROOT)) {
	const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
	if (ALLOWED.has(rel)) continue;
	let content;
	try {
		content = fs.readFileSync(file, "utf8");
	} catch (e) {
		continue;
	}
	const matches = content.match(MOJIBAKE_PATTERN);
	if (matches && matches.length > 0) {
		fileResults.push({ count: matches.length, file: rel });
		totalOccurrences += matches.length;
	}
}

fileResults.sort((a, b) => b.count - a.count);

console.log("");
console.log("===========================================");
console.log(" Mojibake scan results");
console.log("===========================================");
console.log(` Repo root : ${REPO_ROOT}`);
console.log(` Files scanned with extensions : ${[...SCAN_EXT].join(" ")}`);
console.log(` Excluded dirs : ${[...EXCLUDED_DIRS].join(" ")}`);
console.log("-------------------------------------------");

if (fileResults.length === 0) {
	console.log(" RESULT : 0 file with mojibake. CLEAN.");
	console.log("===========================================");
	process.exit(0);
}

console.log(` RESULT : ${fileResults.length} corrupted file(s),`);
console.log(`          ${totalOccurrences} total mojibake occurrence(s).`);
console.log("-------------------------------------------");
console.log(" COUNT  FILE");
console.log("-------------------------------------------");
for (const { count, file } of fileResults) {
	console.log(` ${String(count).padStart(5)}  ${file}`);
}
console.log("===========================================");
console.log("");
console.log(" To inspect a specific file's first matches :");
console.log(" node scan-mojibake.cjs --inspect <file>");
console.log("");

// Mode inspect : affiche les premières lignes corrompues d'un fichier
if (process.argv.includes("--inspect")) {
	const target = process.argv[process.argv.indexOf("--inspect") + 1];
	if (target) {
		console.log(`-- First 10 corrupted lines in ${target} --`);
		const content = fs.readFileSync(target, "utf8");
		const lines = content.split("\n");
		let shown = 0;
		for (let i = 0; i < lines.length && shown < 10; i++) {
			if (MOJIBAKE_PATTERN.test(lines[i])) {
				console.log(`  L${i + 1}: ${lines[i].slice(0, 120)}`);
				shown++;
			}
			MOJIBAKE_PATTERN.lastIndex = 0;
		}
	}
}

process.exit(1);
