# Prompt Claude Code -- TECH-DEBT-027 (`chore/tech-debt-027-encoding-hygiene`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **hygiene encoding + cleanup post-renaming** (~25 min).
> Specificite : `.gitattributes` enrichi + doc PowerShell + test regression UTF-8 + fix residu Sprint 6c + note README.
> **5 livrables** dans un seul sprint.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 7d merge visible (renaming termine)
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

Si l'un echoue -> STOP.

---

## Contexte

**Apres le renaming testvault -> argos termine** (11 sprints livres 2026-05-13/14), ce sprint clot l'epoque "hygiene infrastructure" avant d'attaquer le wiring fonctionnel (Sprint 2.5b).

**5 problemes a regler en 1 sprint** :

### 1. Encoding console PowerShell 5.1 catastrophique
Snapshot terrain 2026-05-14 a revele :
```
[Console]::OutputEncoding : Europe de l'Ouest (DOS) (ibm850)
$OutputEncoding          : US-ASCII (us-ascii)
chcp                     : 850
PowerShell version       : 5.1.26100.8115 Desktop
```

CP850 (DOS Western European) est encore plus ancien que CP-1252 et affiche **mal** l'UTF-8 valide. Cout connu : 1 journee d'investigation perdue sur des **faux mojibakes** durant le rebrand (`a€"` etait un em-dash UTF-8 valide E2 80 94, pas un mojibake).

**Solution** : enrichir `.gitattributes` + documenter dans `Specs/CLAUDE.md` + ajouter note dans README.

### 2. `.gitattributes` deja bon mais peut etre enrichi
Existe deja avec couverture complete des extensions (ts/tsx/js/jsx/json/md/yaml/yml/toml/html/css + binaires).
**Amelioration D1 (Option beta)** : ajouter `working-tree-encoding=UTF-8` pour documenter explicitement l'intention.

### 3. Residu Sprint 6c
Claude Code rapport Sprint 7d : `packages/argos-sdk/typedoc.json:4` contient encore `@atconseil/testvault-sdk` (echappe au grep d'epoque Sprint 6c qui ne scannait pas typedoc.json).

**Fix** : 1 ligne, `@atconseil/testvault-sdk` -> `@atconseil/argos-sdk`.

### 4. Pas de test regression UTF-8
Le `scan-mojibake.cjs` existant detecte certains patterns mais a des limites (faux positifs/negatifs). Un **test UTF-8 validity strict** (parsing avec `TextDecoder` mode `fatal: true`) attraperait tout vrai mojibake sans flagger les caracteres francais valides.

**Ajout** : `tools/regression/ENC-2026-05-14-utf8-validity.test.ts`.

### 5. README racine ne mentionne pas le piege Windows
Un nouveau contributeur (ou Claude futur) sur Windows tombera dans le meme piege. Solution : courte note dans README racine pointant vers `Specs/CLAUDE.md`.

---

## Decisions actees (2026-05-14, validees par utilisateur)

| # | Element | Choix |
|---|---|---|
| D1 | `.gitattributes` | **Option beta** : ajouter `working-tree-encoding=UTF-8` aux extensions sources |
| D2 | Section `Specs/CLAUDE.md` | **Creer** section "Windows / PowerShell 5.1 encoding gotcha" avec CP850 + CP-1252 |
| D3 | Fix `argos-sdk/typedoc.json` | **Inclure** dans ce sprint (1 ligne) |
| D4 | Test regression UTF-8 | **Oui** (beta minimal, parsing strict `TextDecoder fatal`) |
| D5 | Note README racine | **Oui** (courte note pointant CLAUDE.md) |
| D6 | Bump version | 0.4.21 -> 0.4.22 |

---

## Garde-fous TECH-DEBT-027

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : test regression UTF-8 doit attraper du vrai mojibake
Le test ajoute doit **passer** sur le repo actuel (sinon il y aurait un vrai mojibake). Mais il doit aussi etre capable d'**attraper** un vrai mojibake si on en introduisait un.

Verification : creer temporairement un fichier `test-mojibake.md` avec des bytes UTF-8 invalides (par exemple `0xC3 0xC3`), verifier que le test echoue, puis supprimer le fichier de test temporaire.

### Garde-fou #3 : NE PAS toucher au scan-mojibake.cjs existant
TECH-DEBT-025 (etendre scan-mojibake) est **ANNULE**. Le scan existant reste tel quel. Le nouveau test UTF-8 est complementaire, pas remplacant.

### Garde-fou #4 : `.gitattributes` enrichissement minimal
Ajouter `working-tree-encoding=UTF-8` aux **extensions sources uniquement** (text files), pas aux binaires. Garder la structure existante intacte, juste enrichir les lignes existantes.

### Garde-fou #5 : Verifier que le test ne flagge pas les caracteres francais
Les fichiers `Specs/plan.md` et `Specs/spec.md` contiennent ~439 sequences C3 XX (caracteres francais accents valides). Le test ne doit PAS flagger ces fichiers. Verifier explicitement.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b chore/tech-debt-027-encoding-hygiene

pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== 1. .gitattributes actuel ===" -ForegroundColor Cyan
Get-Content .gitattributes

Write-Host "`n=== 2. argos-sdk/typedoc.json (residu Sprint 6c) ===" -ForegroundColor Cyan
Get-Content packages\argos-sdk\typedoc.json
# Doit montrer "@atconseil/testvault-sdk" quelque part

Write-Host "`n=== 3. Specs/CLAUDE.md - section encoding existe ?===" -ForegroundColor Cyan
Select-String -Path Specs\CLAUDE.md -Pattern "encoding|PowerShell" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Lignes contenant encoding/PowerShell : $($_.Count)"
}

Write-Host "`n=== 4. README racine - mentionne deja Windows ?===" -ForegroundColor Cyan
if (Test-Path README.md) {
    Select-String -Path README.md -Pattern "Windows|PowerShell|encoding" -Encoding UTF8
} else {
    Write-Host "  Pas de README.md racine !" -ForegroundColor Yellow
}

Write-Host "`n=== 5. Verifier que les tests regression scannent bien tous les *.test.ts ===" -ForegroundColor Cyan
Get-ChildItem tools\regression\*.test.ts | Select-Object Name

Write-Host "`n=== 6. Pattern fichiers a scanner (UTF-8 validity) ===" -ForegroundColor Cyan
$extensions = @(".md", ".ts", ".tsx", ".js", ".cjs", ".mjs", ".json", ".yml", ".yaml")
$excluded = @("node_modules", ".git", "dist", "build", ".turbo")
$count = 0
foreach ($f in Get-ChildItem -Recurse -File -Path packages,apps,tools,docs,Specs) {
    if ($excluded -notcontains $f.Directory.Name -and $extensions -contains $f.Extension) {
        $count++
    }
}
Write-Host "  Total fichiers a scanner : $count (estimation)"
```

### 1.1 -- Reporter

> "Snapshot OK. `.gitattributes` existe (a enrichir D1). typedoc.json residu confirme. Pas de section encoding dans CLAUDE.md (a creer D2). Pas de mention encoding dans README (a ajouter D5). ~X fichiers a scanner par test UTF-8 (D4). Confirmation avant modifications ?"

---

## Etape 2 -- Update .gitattributes (D1)

Enrichir les **extensions sources** avec `working-tree-encoding=UTF-8`. **Ne pas toucher** aux binaires.

Remplacement (en preservant la structure et les commentaires) :

```diff
  # Normalize line endings to LF on commit, checkout with native endings
  * text=auto eol=lf
  
  # Force LF for source files
- *.ts      text eol=lf
- *.tsx     text eol=lf
- *.js      text eol=lf
- *.jsx     text eol=lf
- *.json    text eol=lf
- *.md      text eol=lf
- *.yaml    text eol=lf
- *.yml     text eol=lf
- *.toml    text eol=lf
- *.html    text eol=lf
- *.css     text eol=lf
+ *.ts      text eol=lf working-tree-encoding=UTF-8
+ *.tsx     text eol=lf working-tree-encoding=UTF-8
+ *.js      text eol=lf working-tree-encoding=UTF-8
+ *.jsx     text eol=lf working-tree-encoding=UTF-8
+ *.cjs     text eol=lf working-tree-encoding=UTF-8
+ *.mjs     text eol=lf working-tree-encoding=UTF-8
+ *.json    text eol=lf working-tree-encoding=UTF-8
+ *.md      text eol=lf working-tree-encoding=UTF-8
+ *.yaml    text eol=lf working-tree-encoding=UTF-8
+ *.yml     text eol=lf working-tree-encoding=UTF-8
+ *.toml    text eol=lf working-tree-encoding=UTF-8
+ *.html    text eol=lf working-tree-encoding=UTF-8
+ *.css     text eol=lf working-tree-encoding=UTF-8
  
  # Binary files
  *.vsix    binary
  *.png     binary
  *.jpg     binary
  *.ico     binary
  *.woff    binary
  *.woff2   binary
```

⚠ **Note** : `working-tree-encoding=UTF-8` est principalement utile pour les conversions entre UTF-16 (Windows) et UTF-8, mais ici on l'utilise pour **documenter explicitement** que ces fichiers DOIVENT etre en UTF-8.

---

## Etape 3 -- Fix residu Sprint 6c : argos-sdk/typedoc.json (D3)

```powershell
Get-Content packages\argos-sdk\typedoc.json
```

Modifier la ligne (ligne 4 probablement) :

```diff
- "name": "@atconseil/testvault-sdk",
+ "name": "@atconseil/argos-sdk",
```

(Le champ exact peut varier : `name`, `entryPoints`, `out`, etc. Regarder le fichier complet et corriger toutes les occurrences `testvault-sdk` -> `argos-sdk`.)

**Verification** :
```powershell
Select-String -Path packages\argos-sdk\typedoc.json -Pattern "testvault"
# Attendu : 0 ligne
```

---

## Etape 4 -- Ajouter section "PowerShell 5.1 encoding gotcha" dans Specs/CLAUDE.md (D2)

⚠ **Decision** : ou ajouter la section dans CLAUDE.md ?

Le fichier a une table "Where to find things". Logique : ajouter la section APRES cette table, dans une section dediee "Common gotchas" ou "Platform-specific notes".

**Repo Specs/CLAUDE.md** : chercher un endroit pertinent. Si une section "Naming reminders" existe, ajouter apres. Si une section "When something blocks you" existe, ajouter avant.

Contenu a ajouter :

```markdown
---

## Windows / PowerShell 5.1 encoding gotcha

PowerShell 5.1 (Windows default, used by this project on Windows hosts)
reads files in the **active code page** by default, NOT UTF-8. On
French Windows installations, this is typically **CP850** (DOS Western
European) -- even older than CP-1252. This means a valid UTF-8 file
containing non-ASCII characters appears as "mojibake" in the console:

| Real character (UTF-8 bytes) | CP-1252 display | CP850 display |
|---|---|---|
| `-` em-dash U+2014 (E2 80 94) | `a` followed by Euro sign + `"` | varies, often glyphs |
| `e` acute U+00E9 (C3 A9) | `A` tilde + copyright | varies |
| `->` arrow U+2192 (E2 86 92) | varies | varies |

**These are display artifacts, NOT corrupted files.** Byte verification
confirms UTF-8 validity:

```powershell
$bytes = [System.IO.File]::ReadAllBytes("path/to/file.md")
"{0:X2} {1:X2} {2:X2}" -f $bytes[N], $bytes[N+1], $bytes[N+2]
# E2 80 94 = valid UTF-8 em-dash
# C3 A9    = valid UTF-8 e acute
```

### How to read files correctly

Always use explicit UTF-8 encoding:

```powershell
# Wrong (uses CP850 / CP-1252 by default):
Get-Content file.md

# Right (explicit UTF-8):
Get-Content file.md -Encoding UTF8
```

### How to configure your PowerShell session

Add to your PowerShell profile (`notepad $PROFILE`):

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

This makes the console display UTF-8 correctly. Restart your terminal
to apply.

### Source files convention

`.gitattributes` enforces UTF-8 + LF line endings for all text files in this
repository, via `working-tree-encoding=UTF-8` directives. See `.gitattributes`.

### Test regression

The test `tools/regression/ENC-2026-05-14-utf8-validity.test.ts`
scans all text files in the repo and fails if any has invalid UTF-8
bytes. This complements the existing `scan-mojibake.cjs` which uses
heuristic pattern matching.

### History

This gotcha cost us 1 day of investigation during the testvault -> argos
rebrand (2026-05-13/14). Apparent "mojibake" in `Specs/plan.md`,
`tools/argos-action/action.yml`, and `tools/azure-pipelines-task/task.json`
turned out to be PowerShell 5.1 console display artifacts, not real
corruption. The byte verification (E2 80 94 = valid UTF-8 em-dash)
proved all files were valid UTF-8. See TECH-DEBT-023 and TECH-DEBT-025
(both cancelled as false positives).

ASCII strict commit messages remain mandatory (pre-commit check) to avoid
any ambiguity in commit logs across different terminal configurations.

---
```

⚠ **Important** : le fichier `Specs/CLAUDE.md` est lui-meme en UTF-8 et peut contenir des accents francais. **NE PAS** mettre du contenu francais accentue dans cette nouvelle section -- elle doit etre en ASCII strict (au cas ou un lecteur PowerShell mal configure la lirait). C'est pour ca que le tableau utilise des descriptions verbales ("Euro sign", "tilde") plutot que les vrais caracteres mojibake.

---

## Etape 5 -- Note dans README racine (D5)

Localiser le README racine :
```powershell
Test-Path README.md
```

Si existe, ajouter une **courte section** apres la presentation initiale :

```markdown
## Working on Windows?

PowerShell 5.1 (Windows default) displays UTF-8 files with non-ASCII
characters as "mojibake" by default. **These are display artifacts,
not corrupted files.** See `Specs/CLAUDE.md` (PowerShell 5.1 encoding
gotcha section) for the explanation and how to configure your session
to display UTF-8 correctly.
```

Si pas de README.md, **creer** un README.md racine minimal avec cette section + un pointeur vers `Specs/` pour la documentation complete.

⚠ Si le README existe deja avec beaucoup de contenu, **inserer** cette section a un endroit logique (probablement apres "Getting started" ou "Setup", avant la section technique).

---

## Etape 6 -- Test regression UTF-8 (D4)

Creer `tools/regression/ENC-2026-05-14-utf8-validity.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * ENC-2026-05-14-utf8-validity.test.ts
 *
 * Verifies that all text files in the repository are valid UTF-8.
 *
 * Context: during the testvault -> argos rebrand (2026-05-13/14),
 * "mojibake" reports in PowerShell turned out to be display artifacts
 * (CP850 console rendering of valid UTF-8 files), not real corruption.
 * The existing scan-mojibake.cjs uses heuristic pattern matching, which
 * has false positives and false negatives. This test uses strict UTF-8
 * decoding (TextDecoder with fatal: true) to attra real invalid bytes
 * without flagging valid French accented characters (e, e, a, etc.).
 *
 * See Specs/CLAUDE.md "Windows / PowerShell 5.1 encoding gotcha" section.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");

const TEXT_EXTENSIONS = new Set([
        ".md",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".cjs",
        ".mjs",
        ".json",
        ".yml",
        ".yaml",
        ".toml",
        ".html",
        ".css",
]);

const EXCLUDED_DIRS = new Set([
        "node_modules",
        ".git",
        "dist",
        "build",
        "out",
        "coverage",
        ".turbo",
        ".pnpm-store",
        ".next",
        ".nuxt",
        "_archive",
]);

function* walkFiles(dir: string): Generator<string> {
        for (const entry of readdirSync(dir)) {
                if (EXCLUDED_DIRS.has(entry)) continue;
                const full = join(dir, entry);
                const st = statSync(full);
                if (st.isDirectory()) {
                        yield* walkFiles(full);
                } else if (st.isFile()) {
                        const ext = entry.substring(entry.lastIndexOf("."));
                        if (TEXT_EXTENSIONS.has(ext)) {
                                yield full;
                        }
                }
        }
}

function isValidUtf8(buf: Buffer): boolean {
        try {
                new TextDecoder("utf-8", { fatal: true }).decode(buf);
                return true;
        } catch {
                return false;
        }
}

describe("ENC-2026-05-14-utf8-validity", () => {
        it("all text files in the repo are valid UTF-8", () => {
                const invalidFiles: string[] = [];
                let scannedCount = 0;

                for (const file of walkFiles(REPO_ROOT)) {
                        scannedCount++;
                        const buf = readFileSync(file);
                        if (!isValidUtf8(buf)) {
                                invalidFiles.push(file.replace(REPO_ROOT, "").replace(/\\/g, "/"));
                        }
                }

                if (invalidFiles.length > 0) {
                        const msg = `${invalidFiles.length} file(s) with invalid UTF-8 bytes:\n${invalidFiles.join("\n")}\n\nNote: this test attrap real UTF-8 corruption (invalid byte sequences), not "mojibake" that's only a PowerShell display artifact. See Specs/CLAUDE.md.`;
                        throw new Error(msg);
                }

                expect(scannedCount).toBeGreaterThan(0);
        });

        it("explicitly verifies that French accented characters (valid UTF-8) pass", () => {
                // Specs/plan.md and Specs/spec.md contain ~439 valid C3 XX sequences (French chars)
                // This test ensures they're not flagged as invalid
                const planFile = join(REPO_ROOT, "Specs", "plan.md");
                const specFile = join(REPO_ROOT, "Specs", "spec.md");
                const planValid = isValidUtf8(readFileSync(planFile));
                const specValid = isValidUtf8(readFileSync(specFile));
                expect(planValid).toBe(true);
                expect(specValid).toBe(true);
        });
});
```

⚠ Note : le fichier est en **ASCII strict** (pas d'accents dans les commentaires). Utiliser le mot "attrap" au lieu de "attrape" pour eviter l'accent. C'est moche mais coherent avec la politique ASCII strict des fichiers source du repo.

**Verifier que le test passe** :
```powershell
pnpm --filter @atconseil/regression-suite test
# Attendu : 52 passing (51 + 1 nouveau)
```

⚠ Si le test **echoue**, c'est qu'il y a un vrai mojibake quelque part. STOP et investiguer. (Tres improbable vu que le scan existant retourne 0.)

---

## Etape 7 -- Validation

```powershell
# Tests regression (52 attendu maintenant)
pnpm --filter @atconseil/regression-suite test
# Attendu : 52 passing (51 + nouveau test ENC-2026-05-14)

# Mojibake legacy
node tools\regression\scan-mojibake.cjs
# 0 file (toujours)

# Pre-flight
pnpm preflight
# PASSED

# Turbo avec --force
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts (incluant le test regression)
```

### 7.1 -- Self-check

```powershell
Write-Host "=== 1. .gitattributes contient working-tree-encoding ===" -ForegroundColor Cyan
Select-String -Path .gitattributes -Pattern "working-tree-encoding" | Measure-Object | ForEach-Object {
    Write-Host "  Lignes : $($_.Count) (attendu : 13)"
}

Write-Host "`n=== 2. typedoc.json residu corrige ===" -ForegroundColor Cyan
Select-String -Path packages\argos-sdk\typedoc.json -Pattern "testvault" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Lignes testvault : $($_.Count) (attendu : 0)"
}
Select-String -Path packages\argos-sdk\typedoc.json -Pattern "argos-sdk" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Lignes argos-sdk : $($_.Count) (attendu : >= 1)"
}

Write-Host "`n=== 3. Section encoding dans CLAUDE.md ===" -ForegroundColor Cyan
Select-String -Path Specs\CLAUDE.md -Pattern "PowerShell 5.1 encoding gotcha" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Lignes : $($_.Count) (attendu : 1)"
}

Write-Host "`n=== 4. Note Windows dans README ===" -ForegroundColor Cyan
Select-String -Path README.md -Pattern "Windows|PowerShell" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Lignes : $($_.Count) (attendu : >= 1)"
}

Write-Host "`n=== 5. Nouveau test regression existe ===" -ForegroundColor Cyan
Test-Path tools\regression\ENC-2026-05-14-utf8-validity.test.ts

Write-Host "`n=== 6. Total tests regression ===" -ForegroundColor Cyan
$tests = Get-ChildItem tools\regression\*.test.ts | Measure-Object
Write-Host "  Fichiers test : $($tests.Count)"
```

⚠ Si l'un des self-checks echoue, STOP.

---

## Etape 8 -- Update Specs/MIGRATION-PLAN.md et CHANGELOG.md

### 8.1 -- Specs/MIGRATION-PLAN.md

Ajouter une note en fin de document (apres le JALON FINAL Sprint 7d) :

```markdown
> **TECH-DEBT-027 livre 2026-05-14** : hygiene encoding post-renaming.
> - `.gitattributes` enrichi avec `working-tree-encoding=UTF-8` sur 13 extensions
> - Section "Windows / PowerShell 5.1 encoding gotcha" ajoutee a `Specs/CLAUDE.md`
> - Note Windows ajoutee a `README.md`
> - Nouveau test regression : `tools/regression/ENC-2026-05-14-utf8-validity.test.ts`
> - Fix residu Sprint 6c : `packages/argos-sdk/typedoc.json` (`testvault-sdk` -> `argos-sdk`)
>
> **52 tests regression maintenant** (etait 51).
> Lecon : PowerShell 5.1 console encoding CP850 a coute 1 journee d'investigation
> sur faux mojibakes durant le rebrand. Le test UTF-8 strict (TextDecoder fatal mode)
> complete `scan-mojibake.cjs` heuristique et attrape les vrais mojibakes byte-level.
```

### 8.2 -- CHANGELOG.md

```markdown
## [0.4.22] - 2026-05-14

### Added (TECH-DEBT-027 - chore/tech-debt-027-encoding-hygiene)

- **`.gitattributes` enrichi** : `working-tree-encoding=UTF-8` ajoute sur 13 extensions sources
  (`.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`, `.md`, `.yaml`, `.yml`, `.toml`,
  `.html`, `.css`). Documente explicitement l'intention UTF-8 du repo.
- **Section "Windows / PowerShell 5.1 encoding gotcha"** ajoutee a `Specs/CLAUDE.md`. Documente :
  - Le piege console PowerShell 5.1 (CP850/CP-1252 par defaut)
  - Comment lire les fichiers correctement (`Get-Content -Encoding UTF8`)
  - Comment configurer le profil PowerShell pour UTF-8
  - L'historique de la fausse-piste mojibake (2026-05-13/14)
- **Note Windows** ajoutee a `README.md` (pointeur vers `Specs/CLAUDE.md`).
- **Nouveau test regression** : `tools/regression/ENC-2026-05-14-utf8-validity.test.ts` (2 tests).
  Utilise `TextDecoder` mode `fatal: true` pour validation stricte UTF-8 byte-level.
  Complementaire au `scan-mojibake.cjs` heuristique existant.

### Fixed

- **Residu Sprint 6c** : `packages/argos-sdk/typedoc.json` contenait encore
  `@atconseil/testvault-sdk` (avait echappe au grep d'epoque qui ne scannait
  pas typedoc.json). Corrige en `@atconseil/argos-sdk`.

### Notes (TECH-DEBT-027)

- Snapshot terrain 2026-05-14 a revele l'encoding catastrophique de PowerShell 5.1 :
  `[Console]::OutputEncoding = CP850 (ibm850)`, `$OutputEncoding = us-ascii`, `chcp = 850`.
  CP850 (DOS Western European) est encore plus ancien que CP-1252.
- Cout connu : 1 journee d'investigation perdue sur faux mojibakes durant le rebrand
  testvault -> argos. Les chaines `a€"` etaient un em-dash UTF-8 valide (bytes E2 80 94),
  pas un mojibake.
- TECH-DEBT-023 et TECH-DEBT-025 confirmes ANNULES (faux positifs).
- Test regression total : 52 (etait 51).
- Bump 0.4.21 -> 0.4.22.

### Lessons learned

- **PowerShell 5.1 sur Windows FR utilise CP850 par defaut, pas CP-1252**.
- **Toujours utiliser `-Encoding UTF8`** sur `Get-Content`, `Set-Content`, `Out-File`.
- **`TextDecoder` mode `fatal: true`** est la verite ultime pour validite UTF-8 byte-level.
  Plus fiable que les patterns heuristiques `Ã[...]` ou `a[...]`.
- **`.gitattributes` `working-tree-encoding=UTF-8`** documente l'intention sans changer
  le comportement (Windows continue de stocker UTF-8 en working tree, Linux/Mac aussi).

### TECH-DEBT actifs

- TECH-DEBT-021, 022, 024, 026 (voir CHANGELOGs precedents)
- ANNULES : 023, 025, **027 (livre dans ce CHANGELOG)**

### Backlog post-TECH-DEBT-027

1. Sprint 8 : Versioning alignement Changesets fixed mode (~30 min)
2. Batch Dependabot (5 PR, ~30 min)
3. TECH-DEBT-026 OBLIGATOIRE : Resync Specs/tasks.md (avant Sprint 2.5b)
4. Sprint 2.5b : Wiring CRUD Phase 1 (vrai produit)
```

---

## Etape 9 -- Archive + commit

### 9.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-027.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-027.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-027.md
}
```

### 9.2 -- Pre-commit ASCII check

```powershell
$msg = "chore(infra): encoding hygiene + Sprint 6c residual fix (TECH-DEBT-027)`n`nGitattributes enrichi, doc PowerShell, UTF-8 regression test, typedoc fix."
$nonAscii = @()
for ($i = 0; $i -lt $msg.Length; $i++) {
    $c = [int][char]$msg[$i]
    if ($c -gt 127) { $nonAscii += "Position $i : '$($msg[$i])' (U+$('{0:X4}' -f $c))" }
}
if ($nonAscii.Count -gt 0) {
    Write-Host "STOP : non-ASCII detecte :" -ForegroundColor Red
    $nonAscii | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "ASCII pur. OK pour commit." -ForegroundColor Green
}
```

### 9.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "chore(infra): encoding hygiene + Sprint 6c residual fix (TECH-DEBT-027)" `
  -m "" `
  -m "Five infrastructure improvements bundled in one sprint:" `
  -m "" `
  -m "1. .gitattributes: working-tree-encoding=UTF-8 added to 13 source extensions" `
  -m "2. Specs/CLAUDE.md: new section 'Windows / PowerShell 5.1 encoding gotcha'" `
  -m "3. README.md: note pointing to Specs/CLAUDE.md for Windows users" `
  -m "4. New regression test: ENC-2026-05-14-utf8-validity.test.ts" `
  -m "   Uses TextDecoder fatal mode for strict byte-level UTF-8 validation" `
  -m "   Complements heuristic scan-mojibake.cjs" `
  -m "5. Fix Sprint 6c residual: packages/argos-sdk/typedoc.json" `
  -m "   Replaced @atconseil/testvault-sdk -> @atconseil/argos-sdk" `
  -m "" `
  -m "Context: 2026-05-14 snapshot revealed PowerShell 5.1 console encoding" `
  -m "is CP850 (DOS Western European) on French Windows, even older than" `
  -m "CP-1252. This caused 1 day of investigation on false-positive 'mojibake'" `
  -m "during testvault -> argos rebrand. Bytes E2 80 94 displayed as mojibake" `
  -m "in console but were valid UTF-8 em-dash." `
  -m "" `
  -m "TECH-DEBT-023 and TECH-DEBT-025 confirmed CANCELLED (false positives)." `
  -m "" `
  -m "Regression test count: 52 (was 51)." `
  -m "" `
  -m "Bump 0.4.21 to 0.4.22." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B), Specs/CLAUDE.md"

git push -u origin chore/tech-debt-027-encoding-hygiene
```

PR.

---

## Etape 10 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3

git branch -d chore/tech-debt-027-encoding-hygiene
git remote prune origin

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 52 passing

pnpm preflight
# PASSED

node tools\regression\scan-mojibake.cjs
# 0 file

# Verifier .gitattributes
Get-Content .gitattributes

# Verifier typedoc.json
Select-String -Path packages\argos-sdk\typedoc.json -Pattern "testvault"
# 0 ligne

# Verifier le test existe
Test-Path tools\regression\ENC-2026-05-14-utf8-validity.test.ts
```

---

## Criteres de done

- [ ] Branche `chore/tech-debt-027-encoding-hygiene` creee
- [ ] `.gitattributes` : `working-tree-encoding=UTF-8` ajoute sur 13 extensions
- [ ] `packages/argos-sdk/typedoc.json` : 0 occurrence `testvault-sdk`
- [ ] `Specs/CLAUDE.md` : nouvelle section "Windows / PowerShell 5.1 encoding gotcha"
- [ ] `README.md` : courte note Windows pointant vers `Specs/CLAUDE.md`
- [ ] `tools/regression/ENC-2026-05-14-utf8-validity.test.ts` : cree, 2 tests
- [ ] Suite regression : **52 passing** (etait 51)
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake (scan legacy)
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `Specs/MIGRATION-PLAN.md` : note TECH-DEBT-027 livre
- [ ] CHANGELOG [0.4.22] avec lessons learned
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.21 -> 0.4.22
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot OK. `.gitattributes` existe a enrichir, typedoc residu confirme, pas de section encoding ni dans CLAUDE.md ni README. Confirmation avant 5 livrables ?"

2. **Apres Etape 7.1** : "5 livrables termines. `.gitattributes` enrichi, typedoc fixe, CLAUDE.md section ajoutee, README note ajoutee, test regression cree (52 passing). Pret a commit ?"

3. **Apres Etape 9.3** : "PR ouverte. Apres merge GitHub, lance Etape 10 (post-merge cleanup)."

---

Apres ca :
- Sprint 8 : Versioning alignement Changesets fixed mode (~30 min)
- Batch Dependabot (5 PR, ~30 min)
- Pause dejeuner
- TECH-DEBT-026 OBLIGATOIRE
- Sprint 2.5b demain
