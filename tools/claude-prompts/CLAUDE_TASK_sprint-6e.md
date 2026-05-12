# Prompt Claude Code -- Sprint 6e (`feat/rename-testvault-exporters-to-argos-exporters`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming court** : 5eme du Groupe 1. Surface tres reduite.
> **3 nouveaux garde-fous** depuis Sprint 6d : ASCII strict commit, post-merge cleanup, workspace:^ vs workspace:*

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6d merge visible : `git log --oneline | Select-Object -First 3`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`
- [ ] Aucun dossier orphelin `packages/testvault-*` deja renomme

Si l'un echoue -> STOP.

---

## Contexte

**5eme sprint** du renaming Groupe 1. Apres types, wit-schema, sdk, importers, on attaque `testvault-exporters`.

**Surface verifiee terrain** :
- **3 package.json** :
  1. `packages/testvault-cli/package.json` (workspace:*)
  2. `apps/argos-extension/package.json` (workspace:^) <-- caret
  3. `tools/e2e/package.json` (workspace:^) <-- caret
- **5 imports source** dont **1 exclu** = **4 a transformer** :
  - testvault-cli : 1 (cli.ts)
  - argos-extension : 1 (CoverageMatrix.tsx)
  - tools/e2e : 2 (tests 06 + 07)

**Particularite** : 2/3 consommateurs en `workspace:^`. Preserver le prefixe lors du replace.

**Hors scope** : autres testvault-*, modification fonctionnelle, realignement versions.

---

## NOUVEAU Garde-fou #1 : ASCII strict commit message

Sprints 6c/6d ont introduit le mojibake `OuOe` dans les commits (em-dash U+2014). Regle Sprint 6e : commit message **100% ASCII**.

- ✅ `-` (tiret ASCII 0x2D), `->`, alphanumerique anglais
- ❌ em-dash U+2014, en-dash U+2013, quotes typographiques

**Pre-commit check (avant l'execution `git commit`)** :
```powershell
$msg = "<le message complet>"
$nonAscii = @()
for ($i = 0; $i -lt $msg.Length; $i++) {
    $c = [int][char]$msg[$i]
    if ($c -gt 127) { $nonAscii += "Position $i : '$($msg[$i])' (U+$('{0:X4}' -f $c))" }
}
if ($nonAscii.Count -gt 0) {
    Write-Host "STOP : non-ASCII detecte" -ForegroundColor Red
    $nonAscii | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "ASCII pur OK" -ForegroundColor Green
}
```

STOP si check echoue. Corriger avant commit.

---

## NOUVEAU Garde-fou #2 : Preserver workspace:^ vs workspace:*

3 consommateurs, prefixes differents :
- testvault-cli : `workspace:*`
- argos-extension : `workspace:^`
- tools/e2e : `workspace:^`

**Action** : strategie `str_replace` sur la chaine complete `"@atconseil/testvault-exporters"` -> `"@atconseil/argos-exporters"`. Le `workspace:*` ou `workspace:^` n'est pas touche.

⚠ Pas de regex globale qui normaliserait les prefixes.

---

## Garde-fou #3 : test naming convention (rappel)

`tools/regression/CFG-2026-05-13-package-naming.test.ts` contient `"@atconseil/testvault-exporters"` dans `ALLOWED_LEGACY_NAMES`.

- ✅ **Retirer** la ligne complete
- ❌ NE PAS replacer `testvault-exporters` par `argos-exporters` dans ce fichier

Methodologie : exclure ce fichier du replace bulk, str_replace chirurgical pour retirer l'entree.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-exporters-to-argos-exporters

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== Consommateurs ===" -ForegroundColor Cyan
$pkgConsumers = @()
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-exporters" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-exporters"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgConsumers += $_.FullName
    }
}

Write-Host "`n=== Workspace prefixes ===" -ForegroundColor Cyan
$pkgConsumers | ForEach-Object {
    $content = Get-Content $_ -Raw
    if ($content -match '"@atconseil/testvault-exporters":\s*"(workspace:[^"]*)"') {
        Write-Host "  $_ : $($matches[1])" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
$sourceCount = 0
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-exporters') {
        $sourceCount++
        if ($_.FullName -match "CFG-2026-05-13-package-naming") {
            Write-Host "  $($_.FullName) [EXCLU]" -ForegroundColor Magenta
        } else {
            Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        }
    }
}
Write-Host "`nTotal source: $sourceCount (attendu 5, 1 exclu, 4 a transformer)" -ForegroundColor Cyan
```

Attendu : 3 consommateurs (1 workspace:*, 2 workspace:^), 5 source files, 4 a transformer.

⚠ STOP si differents.

### 1.1 -- Reporter

> "Snapshot : 3 consommateurs (1 workspace:*, 2 workspace:^), 4 fichiers source. Confirmation avant `git mv` ?"

---

## Etape 2 -- git mv

```powershell
git mv packages/testvault-exporters packages/argos-exporters

Test-Path packages\argos-exporters       # True
Test-Path packages\testvault-exporters   # False
git status
```

---

## Etape 3 -- Update package.json (4 fichiers)

### 3.1 -- Self

`packages/argos-exporters/package.json` :
```diff
- "name": "@atconseil/testvault-exporters",
+ "name": "@atconseil/argos-exporters",
```

### 3.2 -- Consumers (preserver prefixes)

**`packages/testvault-cli/package.json`** :
```diff
- "@atconseil/testvault-exporters": "workspace:*",
+ "@atconseil/argos-exporters": "workspace:*",
```

**`apps/argos-extension/package.json`** :
```diff
- "@atconseil/testvault-exporters": "workspace:^",
+ "@atconseil/argos-exporters": "workspace:^",
```

**`tools/e2e/package.json`** :
```diff
- "@atconseil/testvault-exporters": "workspace:^",
+ "@atconseil/argos-exporters": "workspace:^",
```

⚠ Verifier chaque prefixe preserve.

---

## Etape 4 -- Update 4 imports source

Fichiers :
- `packages/testvault-cli/src/cli.ts`
- `apps/argos-extension/src/hub/CoverageMatrix.tsx`
- `tools/e2e/tests/06-phase3-traceability.spec.ts`
- `tools/e2e/tests/07-phase4-import-export-cli.spec.ts`

```diff
- import { ... } from "@atconseil/testvault-exporters"
+ import { ... } from "@atconseil/argos-exporters"
```

Variantes : double/single quotes, `import type`, `require`.

⚠ EXCLUS : `tools/regression/CFG-2026-05-13-package-naming.test.ts`

---

## Etape 5 -- Update test regression

```diff
const ALLOWED_LEGACY_NAMES = new Set([
-   "@atconseil/testvault-exporters",  // Sprint 6e: rename to argos-exporters
    "@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
    "@atconseil/testvault-cli",        // Sprint 7a: rename to argos-cli
    "@atconseil/testpulse-ui-shared",  // Sprint 7b: rename to argos-detection-api
]);
```

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# 4/4 passing
```

---

## Etape 6 -- Validation

```powershell
pnpm install

pnpm list -r --depth=0 | Select-String -Pattern "exporters"
# @atconseil/argos-exporters

pnpm --filter @atconseil/regression-suite test       # 51 passing
node tools\regression\scan-mojibake.cjs              # 0 file
pnpm preflight                                       # PASSED

pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
# Tous verts
```

### 6.1 -- Self-check RESIDUAL

```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" -and $_.FullName -notmatch "CFG-2026-05-13-package-naming" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-exporters") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}

Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-exporters") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}

Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern '"@atconseil/test'
# Attendu : 3 lignes (gherkin, cli, testpulse-ui-shared)
```

### 6.2 -- Verifier workspace prefixes preserves

```powershell
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/argos-exporters":\s*"(workspace:[^"]*)"') {
        Write-Host "  $($_.FullName) : $($matches[1])" -ForegroundColor Yellow
    }
}
# Attendu :
#   packages\testvault-cli\package.json : workspace:*
#   apps\argos-extension\package.json : workspace:^
#   tools\e2e\package.json : workspace:^
```

⚠ STOP si un prefixe a change.

### 6.3 -- Cleanup orphelin

```powershell
Test-Path packages\testvault-exporters
# Si True : Remove-Item -Recurse -Force packages\testvault-exporters
```

---

## Etape 7 -- Update MIGRATION-PLAN.md

```diff
- | Sprint 6e | Renaming `testvault-exporters` -> `argos-exporters` | ~20 min | Faible (3 consommateurs) | Apres 6c |
+ | Sprint 6e | Renaming `testvault-exporters` -> `argos-exporters` | ~20 min | Faible (3 consommateurs, 4 fichiers source) | **DONE 2026-05-13** |
```

---

## Etape 8 -- Bump version

```powershell
pnpm changeset
# argosTesting, patch, description ASCII pur (pas de em-dash)

pnpm changeset version
# bump 0.4.13 -> 0.4.14
```

---

## Etape 9 -- CHANGELOG

```markdown
## [0.4.14] - 2026-05-13

### Changed (Sprint 6e - feat/rename-testvault-exporters-to-argos-exporters)

- **`@atconseil/testvault-exporters` renomme en `@atconseil/argos-exporters`** (5eme sprint Groupe 1).
  - Dossier : `packages/testvault-exporters/` -> `packages/argos-exporters/` (git mv).
  - 3 consommateurs internes mis a jour :
    - `apps/argos-extension/package.json` (workspace:^) + 1 fichier (CoverageMatrix.tsx)
    - `packages/testvault-cli/package.json` (workspace:*) + 1 fichier (cli.ts)
    - `tools/e2e/package.json` (workspace:^) + 2 fichiers (tests 06 + 07)

### Changed (Sprint 6e)

- **CFG-2026-05-13-package-naming** : retire `"@atconseil/testvault-exporters"` de `ALLOWED_LEGACY_NAMES`. 3 entrees restantes (gherkin, cli, testpulse-ui-shared).
- Test naming reste **4/4 passing**.

### Notes (Sprint 6e)

- Sprint court (~20 min). 4 fichiers source.
- **3 nouveaux garde-fous depuis Sprint 6d** :
  - ASCII strict dans commit message (evite le mojibake des commits 6c/6d)
  - Preservation prefixes workspace (1 workspace:*, 2 workspace:^)
  - Post-merge cleanup steps obligatoires
- Bump 0.4.13 -> 0.4.14.

### Backlog enrichi

- **Sprint 6f NEXT** : `testvault-gherkin` -> `argos-gherkin` (consommateurs probables : cli, e2e)
- Sprint 6g : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- Sprint 6h : `testvault-e2e` -> `argos-e2e`
- Sprint 7a : `testvault-cli` -> `argos-cli`
- Sprint 7b : `testpulse-ui-shared` -> `argos-detection-api`
- **TECH-DEBT-022 NEW** : Cleanup automatique artefacts orphelins post-`git mv` (`dist/`, `.turbo/`). Pattern observe : 3 dossiers `packages/testvault-*` orphelins survivent au `git mv` apres chaque sprint renaming. Solution : `git clean -fdx packages/<old-name>` ou script dedie.
- **TECH-DEBT-023 NEW** : Etendre scan-mojibake.cjs pour scanner les messages de commit recents (ex: 100 derniers). Empeche les em-dashes Unicode dans l'historique git. Solution : nouveau test regression CMT-mojibake ou git hook pre-commit.

### Lessons learned (Sprint 6e)

- **Le grep doit explorer 3 dossiers (`packages/`, `apps/`, `tools/`)** et noter les prefixes workspace pour les preserver.
- **Le commit message Windows PowerShell** est sensible aux caracteres Unicode hors ASCII. Toujours pre-checker.
- **Post-merge cleanup obligatoire** : sync main, delete branch, prune origin, cleanup orphelin. Sans ce cleanup, les sprints suivants partent sur une branche feature au lieu de main (incident vu Sprint 6b et 6c).
```

---

## Etape 10 -- Archive + commit

### 10.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6e.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6e.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6e.md
}
```

### 10.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-exporters to argos-exporters (Sprint 6e)`n`n5th sprint of the testvault to argos renaming wave."
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

### 10.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "feat(packages): rename testvault-exporters to argos-exporters (Sprint 6e)" `
  -m "" `
  -m "5th sprint of the testvault to argos renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- 3 package.json consumers: argos-extension (workspace:^), testvault-cli (workspace:*), tools/e2e (workspace:^)" `
  -m "- 4 source files with import updates" `
  -m "" `
  -m "Workspace prefixes preserved (workspace:* and workspace:^ both used)." `
  -m "Special handling: tools/regression/CFG-2026-05-13-package-naming.test.ts entry removed surgically." `
  -m "" `
  -m "TDD: ALLOWED_LEGACY_NAMES reduced from 4 to 3 entries. Test remains 4/4 passing." `
  -m "" `
  -m "No functional changes. Bump 0.4.13 to 0.4.14 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)"

git push -u origin feat/rename-testvault-exporters-to-argos-exporters
```

⚠ Notez : "to 0.4.14" en ASCII pur (pas de em-dash entre 0.4.13 et 0.4.14).

PR.

---

## Etape 11 -- POST-MERGE CLEANUP (NOUVEAU)

⚠ **A faire APRES le merge GitHub de la PR.**

```powershell
# 1. Switch sur main + pull
git checkout main
git pull

# 2. Verifier le merge en tete
git log --oneline | Select-Object -First 3

# 3. Supprimer la branche feature locale
git branch -d feat/rename-testvault-exporters-to-argos-exporters
# Si refus : git branch -D feat/rename-testvault-exporters-to-argos-exporters

# 4. Nettoyer references remotes
git remote prune origin

# 5. Verifier portfolio
Get-ChildItem packages -Directory | Select-Object Name
# Attendu :
#   argos-exporters     (NOUVEAU)
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared
#   testvault-cli
#   testvault-gherkin

# 6. Cleanup orphelin si necessaire
Test-Path packages\testvault-exporters
# Si True : Remove-Item -Recurse -Force packages\testvault-exporters

# 7. Verifs sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

⚠ STOP avant Sprint 6f si l'un de ces checks echoue.

---

## Criteres de done

- [ ] Branche feature creee depuis main a jour
- [ ] Snapshot validee : 3 consommateurs (1 workspace:*, 2 workspace:^), 4 fichiers source
- [ ] Dossier renomme via `git mv`
- [ ] `package.json` self : name = `@atconseil/argos-exporters`
- [ ] 3 consumers package.json updates **avec prefixe workspace preserve**
- [ ] 4 imports source updates
- [ ] Test regression : ligne testvault-exporters retiree
- [ ] `ALLOWED_LEGACY_NAMES` : 3 entrees restantes
- [ ] Aucun RESIDUAL (hors test naming)
- [ ] Workspace prefixes preserves (verification 6.2)
- [ ] Aucun dossier orphelin
- [ ] Validation complete OK (lint/typecheck/test/build/preflight/mojibake)
- [ ] Test naming 4/4, suite regression 51/51
- [ ] MIGRATION-PLAN.md Sprint 6e DONE
- [ ] CHANGELOG [0.4.14]
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.13 -> 0.4.14
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Garde-fous (recap)

1. ⚠ [NOUVEAU] **ASCII strict commit message** (evite mojibake `OuOe`)
2. ⚠ [NOUVEAU] **Preserver workspace:^ vs workspace:*** (2 consommateurs en caret)
3. ⚠ Test naming chaines litterales (exclu du replace, str_replace chirurgical)
4. ⚠ Grep inclut tools/
5. ⚠ Dossier orphelin testvault-exporters post-rename
6. ⚠ Scope creep vers 6f
7. ⚠ [NOUVEAU] **Post-merge cleanup obligatoire**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot : 3 consommateurs (1 workspace:*, 2 workspace:^), 4 fichiers source. Confirmation avant `git mv` ?"

2. **Apres Etape 6.2** : "Renaming termine. Workspace prefixes preserves. 0 RESIDUAL. lint/typecheck/test/build OK. Pret a commit (apres ASCII pre-check) ?"

3. **Apres Etape 10.3** : "PR ouverte. **Apres merge GitHub, lance Etape 11** (post-merge cleanup)."

---

Quand Etape 11 executee, dis-le-moi. Puis Sprint 6f (testvault-gherkin) -- court (~15-20 min, 2-3 consommateurs probables).
