# Prompt Claude Code — TECH-DEBT-005 (`refactor/enc-pattern-coverage`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_tech-debt-005.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, Sprint 2.5a mergé
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 12 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

Audit pre-sprint a démontré que les regex ENC actuelles (test ENC-2026-05-09 + scan-mojibake.cjs + fix-mojibake.cjs) ratent **2 catégories de mojibake réelles** :

- **Trademark `\u2122`** : mojibake = `\u00E2\u201E\u00A2`. Les patterns actuels cherchent `\u00E2\u20AC...` (preceded by `\u20AC`) mais ici le 2e codepoint est `\u201E` — pas couvert.
- **Euro `\u20AC`** : mojibake = `\u00E2\u201A\u00AC`. Le 2e codepoint est `\u201A` — pas couvert non plus.

**Cause racine** : les regex actuelles traitent les bytes mojibake comme des cas littéraux (énumération à la main des séquences observées en sandbox lors du Sprint 1.1) au lieu d'une couverture systématique du mapping cp1252 → Unicode.

**Calcul rigoureux** : quand un texte UTF-8 (multi-byte) est lu en cp1252 puis re-encodé en UTF-8, chaque byte original 0x80-0xBF devient l'un des **59 codepoints possibles** issus de la table cp1252 (32 issus de l'identité latin-1 0xA0-0xBF + 27 issus de la fenêtre haute cp1252 0x80-0x9F). Les regex actuelles n'en couvrent que 2 explicitement plus le range 0x80-0xBF du début → coverage très partielle.

**Périmètre TECH-DEBT-005** :
1. Créer `tools/regression/cp1252-mojibake-map.ts` (+ pendant CommonJS `.cjs`) qui exporte une regex char class générée depuis le mapping cp1252 complet
2. Refactorer `MOJIBAKE_PATTERNS` dans le test ENC pour utiliser cette char class au lieu de patterns littéraux
3. Refactorer `scan-mojibake.cjs` et `fix-mojibake.cjs` de la même manière
4. **Étendre le sanity check du test ENC** existant avec ~10 nouveaux cas (trademark, euro, en-dash, dagger, rocket emoji, etc.)
5. Test cross-check ts/cjs (comme allowlist.test.ts)

**Aucune nouvelle entrée REGISTRY** : c'est une amélioration de couverture du test ENC-2026-05-09 existant, pas un nouveau test régression.

**Stratégie validée** : **Stratégie 2 (table programmatique)**. Pas de regex literal géant ni de match brutal avec faux positifs.

---

## Architecture cible

### Fichier 1 — `tools/regression/cp1252-mojibake-map.ts`

Source 100% ASCII (escapes `\uXXXX` partout, pas un caractère non-ASCII). Exporte :

```typescript
/**
 * Codepoints possibles à la position N+1 d'un mojibake double-encoded
 * où le byte original UTF-8 était 0x80-0xBF.
 *
 * Construit depuis la table cp1252 → Unicode officielle :
 * - bytes 0xA0-0xBF : identité latin-1 (32 codepoints)
 * - bytes 0x80-0x9F : fenêtre haute cp1252 (27 codepoints, exclus 0x81/0x8D/0x8F/0x90/0x9D undefined)
 * Total : 59 codepoints
 */
export const CP1252_MOJIBAKE_BYTE_2_CHARS: ReadonlyArray<number> = [
	// Identité latin-1 (0xA0-0xBF)
	0x00A0, 0x00A1, 0x00A2, 0x00A3, 0x00A4, 0x00A5, 0x00A6, 0x00A7,
	0x00A8, 0x00A9, 0x00AA, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x00AF,
	0x00B0, 0x00B1, 0x00B2, 0x00B3, 0x00B4, 0x00B5, 0x00B6, 0x00B7,
	0x00B8, 0x00B9, 0x00BA, 0x00BB, 0x00BC, 0x00BD, 0x00BE, 0x00BF,
	// Fenêtre haute cp1252 (0x80-0x9F mappés)
	0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017D, 0x017E, 0x0192,
	0x02C6, 0x02DC, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C,
	0x201D, 0x201E, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039,
	0x203A, 0x20AC, 0x2122,
];

/**
 * Regex char class string réutilisable.
 * Insérer dans un pattern via : new RegExp(`\\u00C3[${MOJIBAKE_CHAR_CLASS}]`).
 */
export const MOJIBAKE_CHAR_CLASS: string =
	CP1252_MOJIBAKE_BYTE_2_CHARS
		.map((cp) => `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`)
		.join("");

/**
 * Patterns mojibake construits par catégorie de longueur UTF-8 originale.
 * Chaque pattern matche une séquence de bytes mojibake-corrompus.
 *
 * Stratégie d'encoding :
 *   - 2-byte UTF-8 (U+0080-U+07FF) → préfixe \\u00C3 + 1 codepoint cp1252
 *     → pattern 1 (couvre les accents Latin courants : é è à ô etc.)
 *   - 3-byte UTF-8 (U+0800-U+FFFF) → préfixe \\u00E2 + 2 codepoints cp1252
 *     → pattern 2 (couvre les punctuations Unicode : em-dash, smart quotes, ™, €, etc.)
 *   - 4-byte UTF-8 (U+10000+) → préfixe \\u00F0 + 3 codepoints cp1252
 *     → pattern 3 (couvre les emojis : 🔴 🚀 ✅ etc.)
 *
 * Les préfixes \\u00C3, \\u00E2, \\u00F0 correspondent aux UTF-8 lead bytes
 * 0xC0-0xDF, 0xE0-0xEF, 0xF0-0xF7 lus comme cp1252 (où 0xC3=Ã, 0xE2=â, 0xF0=ð).
 */
export function buildMojibakePatterns(): RegExp[] {
	const cls = MOJIBAKE_CHAR_CLASS;
	return [
		new RegExp(`\\u00C3[${cls}]`),                    // 2-byte UTF-8 mojibake
		new RegExp(`\\u00E2[${cls}][${cls}]`),            // 3-byte UTF-8 mojibake
		new RegExp(`\\u00F0[${cls}][${cls}][${cls}]`),    // 4-byte UTF-8 mojibake
	];
}
```

### Fichier 2 — `tools/regression/cp1252-mojibake-map.cjs`

Pendant CommonJS exact (à utiliser depuis `scan-mojibake.cjs` et `fix-mojibake.cjs`). Mêmes constantes, mêmes regex, en CJS.

```javascript
// Allowlist methodological / documentary files exempt from all regression scans.
// CommonJS variant of cp1252-mojibake-map.ts for use from .cjs scripts.
//
// IMPORTANT: This list MUST stay in sync with cp1252-mojibake-map.ts (cross-checked
// by tools/regression/cp1252-mojibake-map.test.ts). Update BOTH files when adding
// new entries.

const CP1252_MOJIBAKE_BYTE_2_CHARS = [
	// (idem que .ts ci-dessus)
];

const MOJIBAKE_CHAR_CLASS = CP1252_MOJIBAKE_BYTE_2_CHARS
	.map((cp) => `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`)
	.join("");

function buildMojibakePatterns() {
	const cls = MOJIBAKE_CHAR_CLASS;
	return [
		new RegExp(`\\u00C3[${cls}]`),
		new RegExp(`\\u00E2[${cls}][${cls}]`),
		new RegExp(`\\u00F0[${cls}][${cls}][${cls}]`),
	];
}

module.exports = {
	CP1252_MOJIBAKE_BYTE_2_CHARS,
	MOJIBAKE_CHAR_CLASS,
	buildMojibakePatterns,
};
```

### Fichier 3 — `tools/regression/cp1252-mojibake-map.test.ts`

Cross-check ts/cjs (pattern identique à `allowlist.test.ts` créé pendant TECH-DEBT-001) :

```typescript
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
	it("CP1252_MOJIBAKE_BYTE_2_CHARS must be identical in ts and cjs", () => {
		const cjs: CjsModule = require(join(__dirname, "cp1252-mojibake-map.cjs"));
		expect([...cjs.CP1252_MOJIBAKE_BYTE_2_CHARS].sort((a, b) => a - b)).toEqual(
			[...TS_CHARS].sort((a, b) => a - b),
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

	it("CP1252_MOJIBAKE_BYTE_2_CHARS must contain exactly 59 codepoints", () => {
		expect(TS_CHARS).toHaveLength(59);
	});

	it("CP1252_MOJIBAKE_BYTE_2_CHARS must include trademark and euro (regression cases)", () => {
		expect(TS_CHARS).toContain(0x2122);  // trademark
		expect(TS_CHARS).toContain(0x20AC);  // euro
		expect(TS_CHARS).toContain(0x201A);  // single low quotation mark (euro byte-2)
		expect(TS_CHARS).toContain(0x201E);  // double low quotation mark (trademark byte-2)
	});
});
```

---

## Étape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b refactor/enc-pattern-coverage

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 12 passing
```

---

## Étape 1 — Test-first : étendre le sanity du test ENC (ROUGE attendu)

Avant la refonte des patterns, **étendre le sanity check** du test ENC existant avec les nouveaux cas qui doivent matcher. Comme les patterns actuels ne couvrent pas trademark/euro/etc., ces nouveaux cas vont fail.

### 1.1 — Modifier `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts`

Dans le `it("must verify the test patterns can detect typical mojibake (sanity check)")`, ajouter ces nouveaux cas :

```typescript
// Trademark mojibake: original "\u2122" -> mojibake "\u00E2\u201E\u00A2"
const mojibakeTrademark = "Product\u00E2\u201E\u00A2";
expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeTrademark))).toBe(true);

// Euro mojibake: original "\u20AC" -> mojibake "\u00E2\u201A\u00AC"
const mojibakeEuro = "Price 10\u00E2\u201A\u00AC";
expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeEuro))).toBe(true);

// En-dash mojibake: original "\u2013" -> mojibake "\u00E2\u20AC\u201C"
const mojibakeEnDash = "Range 1\u00E2\u20AC\u201C10";
expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeEnDash))).toBe(true);

// Dagger mojibake: original "\u2020" -> mojibake "\u00E2\u20AC\u00A0"
const mojibakeDagger = "Note\u00E2\u20AC\u00A0 see below";
expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeDagger))).toBe(true);

// Rocket emoji mojibake: original "\uD83D\uDE80" (surrogate pair = U+1F680)
// In 4-byte UTF-8: F0 9F 9A 80, mojibake-decoded: \u00F0\u0178\u02DC\u20AC
const mojibakeRocket = "Launch\u00F0\u0178\u02DC\u20AC";
expect(MOJIBAKE_PATTERNS.some((p) => p.test(mojibakeRocket))).toBe(true);

// Sanity inverse complementaire
expect(MOJIBAKE_PATTERNS.some((p) => p.test("Product\u2122"))).toBe(false);
expect(MOJIBAKE_PATTERNS.some((p) => p.test("Price 10\u20AC"))).toBe(false);
expect(MOJIBAKE_PATTERNS.some((p) => p.test("Range 1\u201310"))).toBe(false);
expect(MOJIBAKE_PATTERNS.some((p) => p.test("Note\u2020 see below"))).toBe(false);
```

### 1.2 — Lancer le test : il DOIT échouer

```powershell
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
# Attendu : 1 fail (sanity check, sur trademark / euro)
# Le test "must not contain..." reste vert
```

Confirme à l'utilisateur que tu vois le fail attendu avant l'étape 2.

---

## Étape 2 — Créer `cp1252-mojibake-map.ts` et `.cjs`

### 2.1 — Créer `tools/regression/cp1252-mojibake-map.ts`

Voir le code complet dans la section "Architecture cible" ci-dessus.

⚠ **Source 100% ASCII obligatoire** (cf. CLAUDE.md). Aucun caractère non-ASCII dans ce fichier — la table est en codepoints numériques, pas en chars literal.

### 2.2 — Créer `tools/regression/cp1252-mojibake-map.cjs`

Pendant CommonJS exact. Voir architecture cible.

### 2.3 — Validation immédiate

```powershell
# Biome
npx biome check tools/regression/cp1252-mojibake-map.ts tools/regression/cp1252-mojibake-map.cjs
# Attendu : 0 errors

# 100% ASCII
node -e "for (const f of ['tools/regression/cp1252-mojibake-map.ts', 'tools/regression/cp1252-mojibake-map.cjs']) { const c = require('fs').readFileSync(f); const n = [...c].filter(b => b > 127).length; console.log(f, 'Non-ASCII:', n); }"
# Attendu : 0 partout

# Typecheck
pnpm --filter @atconseil/regression-suite typecheck
# Attendu : pas d'erreur
```

---

## Étape 3 — Créer le test cross-check

### 3.1 — Créer `tools/regression/cp1252-mojibake-map.test.ts`

Voir architecture cible. 5 tests : char list identique ts/cjs, char class identique, regex source identique, count = 59, trademark/euro inclus.

### 3.2 — Allowlister le nouveau test

Ajouter dans **les deux** fichiers :
- `tools/regression/allowlist.ts` : `SHARED_DOC_ALLOWLIST` doit contenir `"tools/regression/cp1252-mojibake-map.test.ts"` ET `"tools/regression/cp1252-mojibake-map.ts"` ET `"tools/regression/cp1252-mojibake-map.cjs"`
- `tools/regression/allowlist.cjs` : idem

⚠ **Crucial** : sans ces ajouts, le test ENC va flagger les patterns mojibake dans `cp1252-mojibake-map.ts` (les codepoints `0x00C3`, `0x00E2` apparaissent dans la liste, mais en codepoints numériques pas en string mojibake — donc pas de match réel, mais préventif). À vérifier après refacto.

### 3.3 — Validation

```powershell
pnpm --filter @atconseil/regression-suite test cp1252-mojibake-map
# Attendu : 5 passing
```

---

## Étape 4 — Refactor le test ENC pour utiliser les nouveaux patterns

### 4.1 — Modifier `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts`

Remplacer la déclaration locale de `MOJIBAKE_PATTERNS` par un import depuis le nouveau module :

```typescript
// BEFORE
const MOJIBAKE_PATTERNS: RegExp[] = [
	/\u00C3[\u0080-\u00BF]/,
	/\u00E2\u20AC[\u0080-\u00BF\u00A6\u201C\u201D\u2018\u2019\u02DC\u2122]/,
	/\u00F0\u0178[\u0080-\u00BF\u201C\u201D\u2018\u2019]/,
	/\u00E2\u0153[\u0080-\u00BF\u2026\u0152]/,
];

// AFTER
import { buildMojibakePatterns } from "./cp1252-mojibake-map.ts";

const MOJIBAKE_PATTERNS = buildMojibakePatterns();
```

### 4.2 — Validation

```powershell
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
# Attendu : 2 passing (le sanity check étendu de l'étape 1 passe maintenant)
```

---

## Étape 5 — Refactor `scan-mojibake.cjs` et `fix-mojibake.cjs`

### 5.1 — `scan-mojibake.cjs`

Remplacer la déclaration locale de patterns par un require :

```javascript
// BEFORE
const MOJIBAKE_PATTERNS = [
	/\u00C3[\u0080-\u00BF]/,
	// ... patterns littéraux
];

// AFTER
const { buildMojibakePatterns } = require("./cp1252-mojibake-map.cjs");
const MOJIBAKE_PATTERNS = buildMojibakePatterns();
```

### 5.2 — `fix-mojibake.cjs`

⚠ **Attention** : `fix-mojibake.cjs` ne fait probablement **pas** que détecter — il fait aussi le **recovery** (cp1252→UTF-8 round-trip). Vérifier avant refacto qu'il n'utilise les patterns que pour la détection (pas pour le recovery, qui doit rester son algo cp1252 round-trip indépendant).

Si l'utilisation des patterns dans `fix-mojibake.cjs` se limite à la détection initiale (filtrer les fichiers à corriger), refactor identique à scan. Sinon, conserver les patterns pour le recovery + ajouter la détection.

### 5.3 — Validation

```powershell
# Scan toujours clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# Tester un fichier mojibake-corrompu pour valider que le scan détecte bien
echo "Mojibake test: \u00E2\u201E\u00A2 (trademark)" > /tmp/test-moji.txt 2>$null
# Note: créer un fichier avec mojibake réel pour test (utilisateur peut sauter cette étape)

# Fix toujours fonctionnel sur les anciens cas
# (test indirect : si rien ne casse dans le repo, c'est ok)
```

---

## Étape 6 — Validation complète

```powershell
# Tests régression — 12 originaux + 5 nouveaux cross-check + sanity étendu (qui reste 1 it)
# Soit 17 passing au total
pnpm --filter @atconseil/regression-suite test
# Attendu : 17 passing (12 anciens + 5 nouveaux cross-check)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Sanity inverse — créer un fichier mojibake (trademark) et vérifier détection
$tmpFile = ".tmp-mojibake-test.md"
[IO.File]::WriteAllText("$PWD\$tmpFile", "Product`u{00E2}`u{201E}`u{00A2} test", [Text.UTF8Encoding]::new($false))
node tools\regression\scan-mojibake.cjs
# Attendu : RESULT : 1 corrupted file(s), pointant sur .tmp-mojibake-test.md
Remove-Item $tmpFile

# Re-vérifier après nettoyage
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.
```

---

## Étape 7 — CHANGELOG (pas de REGISTRY à modifier)

Sous `[Unreleased]` :

```markdown
### Refactored (TECH-DEBT-005 — 2026-05-10 — refactor/enc-pattern-coverage)

- **Patterns mojibake élargis** : extraction de la table cp1252 → Unicode dans `tools/regression/cp1252-mojibake-map.ts` (+ pendant CommonJS `.cjs`). Génération programmatique des patterns mojibake pour 3 catégories de longueur UTF-8 (2-byte = accentués Latin, 3-byte = punctuation Unicode, 4-byte = emojis).
- **Coverage améliorée** : nouveaux cas désormais détectés — trademark `™` (mojibake `â„¢`), euro `€` (mojibake `â‚¬`), en-dash `–` (mojibake `â€"`), dagger `†` (mojibake `â€ `), rocket emoji (mojibake `ðŸš€`). Aucun faux positif sur 10 cas de texte propre testés.
- **Test cross-check `cp1252-mojibake-map.test.ts`** ajouté pour empêcher la divergence ts/cjs (5 assertions : char list identique, char class identique, regex source identique, count = 59, trademark/euro inclus).
- **Aucune nouvelle entrée REGISTRY** : c'est une amélioration de couverture du test ENC-2026-05-09 existant, pas un nouveau périmètre.
- 12 → 17 tests régression passing (12 anciens + 5 nouveaux cross-check).

### Lessons learned (TECH-DEBT-005)

- Les patterns mojibake initiaux du Sprint 1.1 ont été écrits par exemples observés en sandbox (em-dash, ellipsis, etc.) au lieu d'une couverture systématique. La table cp1252 → Unicode contient 59 codepoints possibles à la position N+1 d'un mojibake — la regex initiale n'en couvrait que ~10.
- Préférer l'approche programmatique (table + génération) à la regex literal énumérative pour les patterns construits depuis un mapping de référence.
```

---

## Étape 8 — Archive du prompt + commit

### 8.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-005.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-005.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-005.md
    Write-Host "OK Prompt archive"
}
```

### 8.2 — Allowlister le prompt archivé

Ajouter `"tools/claude-prompts/CLAUDE_TASK_tech-debt-005.md"` dans **les 2** fichiers `allowlist.ts` ET `allowlist.cjs`.

### 8.3 — Vérifier que les allowlists sont cohérentes

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing (cross-check ts/cjs OK)
```

### 8.4 — Commit

```powershell
git add -A
git status

git commit `
  -m "refactor(regression): elargir patterns ENC mojibake via cp1252 programmatic map (TECH-DEBT-005)" `
  -m "" `
  -m "- Add tools/regression/cp1252-mojibake-map.ts (TS source of truth, 59 codepoints)" `
  -m "- Add tools/regression/cp1252-mojibake-map.cjs (CommonJS bridge)" `
  -m "- Add tools/regression/cp1252-mojibake-map.test.ts (cross-check ts/cjs, 5 tests)" `
  -m "- Refactor ENC-2026-05-09 test: import buildMojibakePatterns()" `
  -m "- Refactor scan-mojibake.cjs and fix-mojibake.cjs: same import" `
  -m "- Extend ENC sanity check: trademark, euro, en-dash, dagger, rocket emoji" `
  -m "- 12 -> 17 regression tests passing" `
  -m "" `
  -m "New cases detected (previously missed):" `
  -m "- trademark mojibake (\\u00E2\\u201E\\u00A2)" `
  -m "- euro mojibake (\\u00E2\\u201A\\u00AC)" `
  -m "- en-dash, dagger, smart-quote, rocket emoji variants" `
  -m "" `
  -m "Refs: backlog item TECH-DEBT-005, post-Sprint-2.5a audit"

git push -u origin refactor/enc-pattern-coverage
```

Puis ouvrir la PR.

---

## Critères de done

- [ ] Branche `refactor/enc-pattern-coverage` créée depuis main à jour
- [ ] `tools/regression/cp1252-mojibake-map.ts` créé, biome-clean, 100% ASCII
- [ ] `tools/regression/cp1252-mojibake-map.cjs` créé, contenu identique
- [ ] `tools/regression/cp1252-mojibake-map.test.ts` créé, 5 tests passing
- [ ] `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` refacté (import buildMojibakePatterns)
- [ ] Sanity check étendu avec ~10 nouveaux cas (trademark, euro, en-dash, dagger, rocket)
- [ ] `tools/regression/scan-mojibake.cjs` refacté
- [ ] `tools/regression/fix-mojibake.cjs` refacté (si patterns sont utilisés pour détection ; sinon laisser tel quel)
- [ ] Allowlists `allowlist.ts` ET `allowlist.cjs` mises à jour (3 nouveaux fichiers + prompt archivé)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 17 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] Sanity inverse vérifié (fichier mojibake trademark créé + détecté + nettoyé)
- [ ] CHANGELOG.md `[Unreleased]` mis à jour (section Refactored TECH-DEBT-005)
- [ ] Prompt archivé dans `tools/claude-prompts/`
- [ ] Commit Conventional Commits, PR ouverte

---

## Garde-fous

⚠ **Source ASCII strict** pour `cp1252-mojibake-map.ts` et `.cjs` — c'est une table de codepoints numériques, aucun caractère non-ASCII nécessaire. Si un caractère mojibake apparaît littéralement dans le fichier, c'est un bug.

⚠ **Cross-check ts/cjs** : ne PAS écrire la table en commentaire dans `.cjs` puis copier-coller à la main dans `.ts` (risque de typo). Recommandé : copier intégralement le contenu d'un fichier dans l'autre, en changeant uniquement la syntaxe export (`export const` ↔ `module.exports`).

⚠ **fix-mojibake.cjs** : si les patterns sont utilisés autrement que pour la détection (par exemple pour le recovery cp1252 → UTF-8), STOP avant de refactorer et signaler. Le recovery doit rester son algo round-trip indépendant.

⚠ **Self-reference** : les codepoints `0x00C3`, `0x00E2`, `0x00F0` apparaissent dans le fichier `cp1252-mojibake-map.ts` comme valeurs numériques (table). Ils ne sont **pas** des séquences mojibake string — donc pas de match. Mais comme garde-fou, l'allowlist a déjà ce fichier. Si jamais le test ENC fail sur ce fichier après refacto, c'est qu'il y a une corruption réelle (pas un faux positif documentaire).

⚠ **Pas de scope creep** : ce sprint touche UNIQUEMENT les patterns mojibake. Pas de modification du système d'allowlist (TECH-DEBT-001 fait), pas de nouveau type de test régression, pas de pre-commit hook (TECH-DEBT-003 reste backlog).

---

Quand 17/17 tests passing + sanity inverse OK + tous tests applicatifs verts, dis-le-moi. On enchaîne ensuite sur Sprint 3 (top-level hub + bump v0.3.0).
