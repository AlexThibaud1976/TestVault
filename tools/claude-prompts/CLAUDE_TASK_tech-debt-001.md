# Prompt Claude Code — TECH-DEBT-001 (`refactor/regression-allowlist`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_tech-debt-001.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, Sprint 2 mergé
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 8 passing (2 LLM + 2 ENC + 2 CFG-server2022 + 2 CFG-publisher)
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

Sprint 1.1 et Sprint 2 ont introduit des **allowlists dupliquées** dans 4 fichiers du package `@atconseil/regression-suite` :

| Fichier | Variable | Type |
|---|---|---|
| `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts` | `ALLOWED_FILES` | TypeScript Set |
| `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` | `ALLOWED_FILES` | TypeScript Set |
| `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts` | `ALLOWED_FILES` | TypeScript Set |
| `tools/regression/scan-mojibake.cjs` | `ALLOWED` | JavaScript Set |

Chaque fichier contient une liste qui chevauche fortement les autres. À chaque archivage de prompt ou ajout de fichier méthodologique, il faut éditer 4 endroits, et oublier d'en mettre à jour un cause des fails de tests. C'est arrivé 3 fois pendant Sprint 1.1.

**Périmètre** : extraction de la liste partagée dans un fichier unique, avec import depuis les 4 consommateurs. **Aucune modification fonctionnelle** des tests régression — juste un refactoring source.

---

## Objectif

Sur une nouvelle branche `refactor/regression-allowlist`, livrer une PR qui :

1. Crée `tools/regression/allowlist.ts` exportant un Set `SHARED_DOC_ALLOWLIST` avec les fichiers méthodologiques partagés (REGISTRY, prompts archivés, README claude-prompts)
2. Modifie les 3 fichiers `*.test.ts` pour importer `SHARED_DOC_ALLOWLIST` et l'unioner avec leur allowlist spécifique (le fichier de test lui-même + ses fichiers spécifiques au domaine)
3. Modifie `scan-mojibake.cjs` pour faire le même union, en CommonJS (require au lieu d'import)
4. **Aucun test régression ne doit changer de comportement** — les 8 tests passants doivent rester 8 passants après refactor

---

## Étape 1 — Créer `tools/regression/allowlist.ts`

⚠ **Source 100% ASCII** (cf. CLAUDE.md "Encoding rules"). Aucun caractère non-ASCII dans ce fichier — c'est de la liste de chemins, donc trivial.

```typescript
/**
 * Shared allowlist for regression tests in tools/regression/.
 *
 * These files legitimately reference forbidden patterns (deprecated LLM models,
 * mojibake examples, Server 2022 mentions, AlexThibaud publisher, etc.) for
 * documentary or historical reasons. Adding a file here means: "this file is
 * exempt from ALL repo-wide pattern scans, regardless of the test."
 *
 * Each entry must be added explicitly (no wildcards) — that way a future file
 * with a real bug is not silently masked by an over-broad rule.
 *
 * Each test file has its OWN additional allowlist for its specific domain
 * (e.g. the test file itself, or files specific to its scan logic).
 */

/**
 * Methodological / documentary files exempt from all regression scans.
 *
 * Categories:
 * - REGISTRY of named regression tests (must list patterns by definition)
 * - Archived Claude Code prompts (document past sprint decisions including
 *   the very patterns the tests now forbid)
 * - README of the prompts archive (explains the allowlist convention itself)
 */
export const SHARED_DOC_ALLOWLIST: ReadonlySet<string> = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/allowlist.ts",
	"tools/claude-prompts/README.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md",
]);

/**
 * CommonJS-compatible export for use from .cjs files (e.g. scan-mojibake.cjs).
 * Returns a fresh Set on each call to avoid accidental mutation.
 */
export function getSharedDocAllowlist(): Set<string> {
	return new Set(SHARED_DOC_ALLOWLIST);
}
```

**Validation immédiate** :

```powershell
# Biome check
npx biome check tools/regression/allowlist.ts
# Attendu : Found 0 errors

# 100% ASCII
node -e "const c = require('fs').readFileSync('tools/regression/allowlist.ts'); console.log('Non-ASCII:', [...c].filter(b => b > 127).length);"
# Attendu : 0

# Typecheck local
pnpm --filter @atconseil/regression-suite typecheck
# Attendu : pas d'erreur
```

---

## Étape 2 — Refactor les 3 fichiers `*.test.ts`

Pour chaque fichier de test, **2 modifications** :

1. Importer `SHARED_DOC_ALLOWLIST` depuis `./allowlist.ts` (chemin relatif au fichier de test)
2. Remplacer le `const ALLOWED_FILES = new Set([...])` par une union :

```typescript
import { SHARED_DOC_ALLOWLIST } from "./allowlist.ts";

const TEST_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/<ce-test>.test.ts",
	// + autres fichiers specifiques à ce test si applicable
]);

const ALLOWED_FILES = new Set([
	...SHARED_DOC_ALLOWLIST,
	...TEST_SPECIFIC_ALLOWLIST,
]);
```

### 2.1 — `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts`

Allowlist spécifique :
```typescript
const TEST_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts",
]);
```

### 2.2 — `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts`

Allowlist spécifique :
```typescript
const TEST_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/ENC-2026-05-09-spec-mojibake.test.ts",
	"tools/regression/scan-mojibake.cjs",
	"tools/regression/fix-mojibake.cjs",
]);
```

(les 2 scripts `.cjs` contiennent les patterns mojibake en regex, il faut les exclure du scan ENC)

### 2.3 — `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`

Allowlist spécifique :
```typescript
const TEST_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts",
]);
```

### 2.4 — `tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts`

Ce test ne scanne pas le repo (il fait juste `JSON.parse` du manifest), donc **pas de refactor allowlist nécessaire**. Laisse-le tel quel.

---

## Étape 3 — Refactor `tools/regression/scan-mojibake.cjs`

Comme c'est un `.cjs` (CommonJS), il faut compiler `allowlist.ts` ou utiliser une autre stratégie. **Stratégie la plus simple : dupliquer la liste en CommonJS** dans un nouveau fichier `tools/regression/allowlist.cjs`, en gardant une note de cohérence.

⚠ Cette duplication est temporaire — quand on aura migré scan-mojibake.cjs en .mjs ou .ts (futur sprint), on pourra unifier. Pour l'instant, deux fichiers source de vérité, mais avec un test cross-check pour empêcher la divergence.

### 3.1 — Créer `tools/regression/allowlist.cjs`

```javascript
// Allowlist methodological / documentary files exempt from all regression scans.
// CommonJS variant of allowlist.ts for use from .cjs scripts.
//
// IMPORTANT: This list MUST stay in sync with allowlist.ts (cross-checked by
// test in allowlist.test.ts). Update BOTH files when adding new entries.

const SHARED_DOC_ALLOWLIST = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/allowlist.ts",
	"tools/regression/allowlist.cjs",
	"tools/claude-prompts/README.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md",
]);

module.exports = { SHARED_DOC_ALLOWLIST };
```

⚠ Note : `allowlist.cjs` doit s'auto-allowlister (ligne 4). Idem ajouter `allowlist.cjs` à la liste `allowlist.ts`.

### 3.2 — Modifier `scan-mojibake.cjs`

Remplacer le `const ALLOWED = new Set([...])` par :

```javascript
const { SHARED_DOC_ALLOWLIST } = require("./allowlist.cjs");

const SCAN_SPECIFIC_ALLOWLIST = new Set([
	"tools/regression/ENC-2026-05-09-spec-mojibake.test.ts",
	"tools/regression/scan-mojibake.cjs",
	"tools/regression/fix-mojibake.cjs",
]);

const ALLOWED = new Set([
	...SHARED_DOC_ALLOWLIST,
	...SCAN_SPECIFIC_ALLOWLIST,
]);
```

---

## Étape 4 — Test cross-check de cohérence ts/cjs

Pour empêcher la divergence entre `allowlist.ts` et `allowlist.cjs`, ajouter un test :

### 4.1 — Créer `tools/regression/allowlist.test.ts`

```typescript
/**
 * Cross-check test: SHARED_DOC_ALLOWLIST in allowlist.ts and allowlist.cjs
 * MUST contain the same entries.
 *
 * This dual-source-of-truth is a temporary trade-off (CommonJS scan tools
 * cannot easily import a TypeScript module without compilation). When all
 * regression tooling is migrated to .ts/.mjs, this test and allowlist.cjs
 * can be removed.
 */

import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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
```

### 4.2 — Allowlister ce nouveau fichier

Le nouveau test fait partie de `tools/regression/`, donc il doit être ajouté aux 3 allowlists :
- `SHARED_DOC_ALLOWLIST` dans `allowlist.ts` ET `allowlist.cjs` : ajouter `"tools/regression/allowlist.test.ts"`

⚠ Ce test ne scanne pas le repo (il fait juste un compare set), donc il n'a pas son propre `TEST_SPECIFIC_ALLOWLIST`.

---

## Étape 5 — Validation complète

```powershell
# 1. Tests régression — 9 tests attendus maintenant (8 anciens + 1 nouveau cross-check)
pnpm --filter @atconseil/regression-suite test
# Attendu : 9 passing

# 2. Mojibake scan
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# 3. Lint + typecheck + tests applicatifs
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# 4. Test de cohérence cross-source : modifier UN seul des 2 fichiers, le test doit fail
$tsContent = Get-Content tools\regression\allowlist.ts -Raw
$tsContent = $tsContent -replace '"CHANGELOG\.md",', '"CHANGELOG.md","FAKE-DIVERGENCE.md",'
[IO.File]::WriteAllText("$PWD\tools\regression\allowlist.ts", $tsContent, [Text.UTF8Encoding]::new($false))
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 fail (cross-check détecte la divergence)

# Rétablir
$tsContent = $tsContent -replace '"FAKE-DIVERGENCE\.md",', ''
[IO.File]::WriteAllText("$PWD\tools\regression\allowlist.ts", $tsContent, [Text.UTF8Encoding]::new($false))
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing (cross-check OK à nouveau)
```

---

## Étape 6 — REGISTRY + CHANGELOG

### 6.1 — REGISTRY

Ajouter une ligne dans `tools/regression/REGISTRY.md` :

```markdown
| TECH-2026-05-10-allowlist-sync | 2026-05-10 | Tooling | allowlist-sync | Empêche la divergence entre `tools/regression/allowlist.ts` et `tools/regression/allowlist.cjs` (dual-source-of-truth temporaire pour bridge ts/cjs). | Refactor TECH-DEBT-001 | AT |
```

### 6.2 — CHANGELOG

Sous `[Unreleased]` (avant `[0.2.0]`) :

```markdown
## [Unreleased]

### Refactored (TECH-DEBT-001 — 2026-05-10 — refactor/regression-allowlist)

- **Factorisation des allowlists communes** : extraction des fichiers méthodologiques partagés (CHANGELOG, REGISTRY, prompts archivés) dans `tools/regression/allowlist.ts` (+ pendant CommonJS `allowlist.cjs`). Les 3 tests régression `*.test.ts` et le scan `*.cjs` importent désormais cette source unique.
- **Test cross-check `tools/regression/allowlist.test.ts`** ajouté pour empêcher la divergence entre `allowlist.ts` et `allowlist.cjs`.
- Aucun changement fonctionnel : les 8 tests régression précédents restent 8 passing (+ 1 nouveau cross-check = 9 total).
```

---

## Étape 7 — Archive du prompt + commit

### 7.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-001.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-001.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-001.md
    Write-Host "OK Prompt archivé"
}
```

### 7.2 — Commit

```powershell
git add -A
git status
# Vérifier : 5 fichiers modifiés (3 *.test.ts + scan-mojibake.cjs + REGISTRY) + 4 nouveaux (allowlist.ts, allowlist.cjs, allowlist.test.ts, CLAUDE_TASK_tech-debt-001.md) + CHANGELOG modifié

git commit `
  -m "refactor(regression): factor shared allowlist (TECH-DEBT-001)" `
  -m "" `
  -m "- Add tools/regression/allowlist.ts (TS source of truth for shared methodological files)" `
  -m "- Add tools/regression/allowlist.cjs (CommonJS bridge for scan-mojibake.cjs)" `
  -m "- Add tools/regression/allowlist.test.ts (cross-check ts/cjs sync)" `
  -m "- Refactor LLM/ENC/CFG-server2022 tests to import shared allowlist" `
  -m "- Refactor scan-mojibake.cjs to import shared allowlist" `
  -m "- 9 regression tests passing (8 prev + 1 cross-check)" `
  -m "" `
  -m "Refs: backlog item TECH-DEBT-001"

git push -u origin refactor/regression-allowlist
```

Puis ouvrir la PR.

---

## Critères de done

- [ ] Branche `refactor/regression-allowlist` créée depuis `main` à jour
- [ ] `tools/regression/allowlist.ts` créé, biome-clean, 100% ASCII
- [ ] `tools/regression/allowlist.cjs` créé, contenu identique à allowlist.ts
- [ ] `tools/regression/allowlist.test.ts` créé, cross-check passing
- [ ] 3 fichiers `*.test.ts` (LLM, ENC, CFG-server2022) refactorés avec import allowlist
- [ ] `scan-mojibake.cjs` refactoré avec require allowlist.cjs
- [ ] `pnpm --filter @atconseil/regression-suite test` → 9 passing
- [ ] `pnpm turbo test`, `turbo lint`, `turbo typecheck` → tous verts
- [ ] Sanity inverse cross-check vérifié (divergence ts/cjs → fail)
- [ ] REGISTRY.md mis à jour (entrée TECH-2026-05-10)
- [ ] CHANGELOG.md `[Unreleased]` mis à jour (section Refactored)
- [ ] Commit Conventional Commits, PR ouverte

---

## Garde-fous

⚠ **Encoding** : tous fichiers `.ts` et `.cjs` source 100% ASCII (chemins de fichiers uniquement, trivial).

⚠ **Pas de scope creep** : ne refactor PAS d'autres parties du package régression. Garder l'ensemble du code de scan dans chaque fichier — seulement la liste de chemins est extraite. Les fonctions `walkFiles`, `scanFile` etc. restent dans chaque test (factorisation possible mais hors scope).

⚠ **CFG-publisher-atconseil reste tel quel** : il ne fait pas de scan repo-wide, juste une lecture du manifest. Pas de allowlist concernée.

⚠ **Self-reference attendue** : ce prompt mentionne "Server 2022" une fois dans le tableau des fichiers à éditer (étape 2.3). Le test CFG-server2022 va le détecter pendant l'étape 5 — c'est attendu et c'est pourquoi on ajoute `tools/claude-prompts/CLAUDE_TASK_tech-debt-001.md` au `SHARED_DOC_ALLOWLIST` dès l'étape 1. Si tu vois fail à l'étape 5 sur ce fichier précis, vérifie que tu l'as bien ajouté à la liste — sinon stop et signale.

---

Quand 9/9 tests passing + tous tests applicatifs verts, dis-le-moi. On enchaîne sur le mini-Sprint Marketplace privé.
