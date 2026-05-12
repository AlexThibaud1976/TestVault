# Prompt Claude Code -- Sprint 6f (`feat/rename-testvault-gherkin-to-argos-gherkin`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming court** : 6eme et **DERNIER** du Groupe 1 `packages/`.
> Apres ce sprint : 5/8 testvault-* renommes, ne restent que testvault-cli (Sprint 7a) + testpulse-ui-shared (Sprint 7b) + les 2 packages tools/* (Sprints 6g/6h).

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6e merge visible : `git log --oneline | Select-Object -First 3`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`
- [ ] Aucun dossier orphelin `packages/testvault-*` deja renomme

Si l'un echoue -> STOP.

---

## Contexte

**6eme et DERNIER sprint** du renaming Groupe 1 dans `packages/`. Apres types, wit-schema, sdk, importers, exporters, on attaque `testvault-gherkin`.

**Surface verifiee terrain** :
- **4 package.json consommateurs (tous workspace:*)** :
  1. `packages/testvault-cli/package.json`
  2. `apps/argos-extension/package.json`
  3. `apps/argos-functions/package.json`
  4. `tools/e2e/package.json`
- **6 imports source** dont **1 exclu** = **5 a transformer** :
  - testvault-cli : 2 fichiers (bdd-sync.ts, bdd-sync.test.ts)
  - argos-extension : 1 fichier (GherkinEditor.tsx)
  - argos-functions : 1 fichier (bdd-sync/git-push-handler.ts)
  - tools/e2e : 1 fichier (tests/08-phase5-bdd-sync.spec.ts)

**Simplification par rapport a 6e** : tous les consommateurs utilisent `workspace:*` (uniforme). Pas de garde-fou special workspace:^.

**Hors scope** : autres testvault-*, modification fonctionnelle, realignement versions.

---

## Garde-fou #1 : ASCII strict commit message

Regle Sprint 6e applique avec succes (commit 98ad819 propre vs 6c/6d avec `OuOe`). On maintient.

- ✅ `-` ASCII, `->`, alphanumerique anglais
- ❌ em-dash U+2014, en-dash U+2013, quotes typographiques

**Pre-commit check obligatoire avant `git commit`** :
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

---

## Garde-fou #2 : test naming convention (rappel)

`tools/regression/CFG-2026-05-13-package-naming.test.ts` contient `"@atconseil/testvault-gherkin"` dans `ALLOWED_LEGACY_NAMES`.

- ✅ **Retirer** la ligne complete
- ❌ NE PAS replacer `testvault-gherkin` par `argos-gherkin` dans ce fichier

Methodologie : exclure ce fichier du replace bulk, str_replace chirurgical pour retirer l'entree.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-gherkin-to-argos-gherkin

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== Consommateurs ===" -ForegroundColor Cyan
$pkgConsumers = @()
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-gherkin" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-gherkin"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgConsumers += $_.FullName
    }
}

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
$sourceCount = 0
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-gherkin') {
        $sourceCount++
        if ($_.FullName -match "CFG-2026-05-13-package-naming") {
            Write-Host "  $($_.FullName) [EXCLU]" -ForegroundColor Magenta
        } else {
            Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        }
    }
}
Write-Host "`nTotal : $($pkgConsumers.Count) package.json, $sourceCount source (attendu 4, 6 dont 1 exclu = 5 a transformer)" -ForegroundColor Cyan
```

⚠ STOP si chiffres differents.

### 1.1 -- Reporter

> "Snapshot : 4 consommateurs (tous workspace:*), 5 fichiers source. Confirmation avant `git mv` ?"

---

## Etape 2 -- git mv

```powershell
git mv packages/testvault-gherkin packages/argos-gherkin

Test-Path packages\argos-gherkin       # True
Test-Path packages\testvault-gherkin   # False
git status
```

---

## Etape 3 -- Update package.json (5 fichiers : 1 self + 4 consumers)

### 3.1 -- Self

`packages/argos-gherkin/package.json` :
```diff
- "name": "@atconseil/testvault-gherkin",
+ "name": "@atconseil/argos-gherkin",
```

### 3.2 -- Consumers

Pour chacun :
- `packages/testvault-cli/package.json`
- `apps/argos-extension/package.json`
- `apps/argos-functions/package.json`
- `tools/e2e/package.json`

```diff
- "@atconseil/testvault-gherkin": "workspace:*",
+ "@atconseil/argos-gherkin": "workspace:*",
```

Tous en `workspace:*` (uniforme).

---

## Etape 4 -- Update 5 imports source

Fichiers :
- `packages/testvault-cli/src/bdd-sync.test.ts`
- `packages/testvault-cli/src/bdd-sync.ts`
- `apps/argos-extension/src/hub/GherkinEditor.tsx`
- `apps/argos-functions/src/bdd-sync/git-push-handler.ts`
- `tools/e2e/tests/08-phase5-bdd-sync.spec.ts`

```diff
- import { ... } from "@atconseil/testvault-gherkin"
+ import { ... } from "@atconseil/argos-gherkin"
```

Variantes : double/single quotes, `import type`, `require`.

⚠ **EXCLUS** : `tools/regression/CFG-2026-05-13-package-naming.test.ts`

---

## Etape 5 -- Update test regression

```diff
const ALLOWED_LEGACY_NAMES = new Set([
-   "@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
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

pnpm list -r --depth=0 | Select-String -Pattern "gherkin"
# @atconseil/argos-gherkin

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
    if ($content -match "@atconseil/testvault-gherkin") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}

Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-gherkin") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}

Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern '"@atconseil/test'
# Attendu : 2 lignes (cli, testpulse-ui-shared)
```

### 6.2 -- Cleanup orphelin

```powershell
Test-Path packages\testvault-gherkin
# Si True : Remove-Item -Recurse -Force packages\testvault-gherkin
```

### 6.3 -- Verifier portfolio (jalon Groupe 1 packages/ TERMINE)

```powershell
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (8 packages) :
#   argos-exporters
#   argos-gherkin       (NOUVEAU)
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared
#   testvault-cli
# (PLUS QUE 2 TESTVAULT-*  RESTANTS DANS packages/)
```

---

## Etape 7 -- Update MIGRATION-PLAN.md

```diff
- | Sprint 6f | Renaming `testvault-gherkin` -> `argos-gherkin` | ~20 min | Faible (3 consommateurs) | Apres 6c |
+ | Sprint 6f | Renaming `testvault-gherkin` -> `argos-gherkin` | ~20 min | Faible (4 consommateurs, 5 fichiers source) | **DONE 2026-05-13** |
```

⚠ Ajouter une note importante apres ce tableau :
```markdown
> **Jalon Groupe 1 packages/ TERMINE** (2026-05-13) : 6/8 packages renommes dans `packages/`. Restants : testvault-cli (Sprint 7a) et testpulse-ui-shared (Sprint 7b).
```

---

## Etape 8 -- Bump version

```powershell
pnpm changeset
# argosTesting, patch, description ASCII pur
# Description : "Sprint 6f: rename testvault-gherkin to argos-gherkin (last sprint of Group 1 packages/)"

pnpm changeset version
# bump 0.4.14 -> 0.4.15
```

---

## Etape 9 -- CHANGELOG

```markdown
## [0.4.15] - 2026-05-13

### Changed (Sprint 6f - feat/rename-testvault-gherkin-to-argos-gherkin)

- **`@atconseil/testvault-gherkin` renomme en `@atconseil/argos-gherkin`** (6eme et DERNIER sprint du Groupe 1 packages/).
  - Dossier : `packages/testvault-gherkin/` -> `packages/argos-gherkin/` (git mv).
  - 4 consommateurs internes mis a jour (tous workspace:*) :
    - `apps/argos-extension/package.json` + 1 fichier (GherkinEditor.tsx)
    - `apps/argos-functions/package.json` + 1 fichier (bdd-sync/git-push-handler.ts)
    - `packages/testvault-cli/package.json` + 2 fichiers (bdd-sync.ts, bdd-sync.test.ts)
    - `tools/e2e/package.json` + 1 fichier (tests/08-phase5-bdd-sync.spec.ts)

### Changed (Sprint 6f)

- **CFG-2026-05-13-package-naming** : retire `"@atconseil/testvault-gherkin"` de `ALLOWED_LEGACY_NAMES`. 2 entrees restantes (cli, testpulse-ui-shared).
- Test naming reste **4/4 passing**.

### Milestone (Sprint 6f - Groupe 1 packages/ TERMINE)

- **6/8 packages renommes dans `packages/`** :
  - argos-types (Sprint 6a)
  - argos-wit-schema (Sprint 6b)
  - argos-sdk (Sprint 6c)
  - argos-importers (Sprint 6d)
  - argos-exporters (Sprint 6e)
  - argos-gherkin (Sprint 6f) **<- ce sprint**
- **Restants dans `packages/`** : testvault-cli (Sprint 7a), testpulse-ui-shared (Sprint 7b).
- **Restants dans `tools/`** : testvault-azure-pipelines-task (Sprint 6g), testvault-e2e (Sprint 6h).

### Notes (Sprint 6f)

- Sprint court (~20 min). 5 fichiers source.
- Tous les consommateurs en `workspace:*` (simplification vs Sprint 6e).
- ASCII strict commit + post-merge cleanup steps appliques (garde-fous depuis Sprint 6e).
- Bump 0.4.14 -> 0.4.15.

### Backlog enrichi

- **Sprint 6h NEXT (aujourd'hui)** : `testvault-e2e` -> `argos-e2e` (0 consommateur interne, ~15-20 min)
- **Demain matin** :
  - Reflexion 6g : decider versioning testvault-azure-pipelines-task (1.0.0, publication Marketplace)
  - Sprint 6g : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
  - Sprint 7a : `testvault-cli` -> `argos-cli`
  - Sprint 7b : `testpulse-ui-shared` -> `argos-detection-api`
- TECH-DEBT-022 : Cleanup automatique artefacts orphelins
- TECH-DEBT-023 : Etendre scan-mojibake aux messages commit

### Lessons learned (Sprint 6f)

- **Methodologie renaming Groupe 1 stabilisee** apres 6 sprints. Template : snapshot terrain -> git mv -> update package.json self + consumers -> update imports source -> retirer ALLOWED_LEGACY_NAMES -> pnpm install -> validation -> CHANGELOG -> bump -> commit ASCII pre-check -> PR -> post-merge cleanup.
- **Defender exclu** + **grep tools/** + **ASCII strict commit** : 3 garde-fous decouverts en cours de route qui ont evite les incidents.
```

---

## Etape 10 -- Archive + commit

### 10.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6f.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6f.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6f.md
}
```

### 10.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-gherkin to argos-gherkin (Sprint 6f)`n`n6th and last sprint of Group 1 packages/ renaming wave."
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
  -m "feat(packages): rename testvault-gherkin to argos-gherkin (Sprint 6f)" `
  -m "" `
  -m "6th and last sprint of Group 1 packages/ renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- 4 package.json consumers (all workspace:*): argos-extension, argos-functions, testvault-cli, tools/e2e" `
  -m "- 5 source files with import updates" `
  -m "" `
  -m "Milestone: 6/8 packages renamed in packages/. Remaining: testvault-cli (Sprint 7a), testpulse-ui-shared (Sprint 7b)." `
  -m "" `
  -m "Special handling: tools/regression/CFG-2026-05-13-package-naming.test.ts entry removed surgically." `
  -m "" `
  -m "TDD: ALLOWED_LEGACY_NAMES reduced from 3 to 2 entries. Test remains 4/4 passing." `
  -m "" `
  -m "No functional changes. Bump 0.4.14 to 0.4.15 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)"

git push -u origin feat/rename-testvault-gherkin-to-argos-gherkin
```

PR.

---

## Etape 11 -- POST-MERGE CLEANUP

⚠ **A faire APRES le merge GitHub.**

```powershell
# 1. Switch sur main + pull
git checkout main
git pull

# 2. Verifier le merge en tete
git log --oneline | Select-Object -First 3

# 3. Supprimer la branche feature locale
git branch -d feat/rename-testvault-gherkin-to-argos-gherkin
# Si refus : git branch -D feat/rename-testvault-gherkin-to-argos-gherkin

# 4. Prune references remotes
git remote prune origin

# 5. Verifier portfolio (jalon Groupe 1 packages/ TERMINE)
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (8 packages) :
#   argos-exporters
#   argos-gherkin       (NOUVEAU)
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared
#   testvault-cli

# 6. Cleanup orphelin
Test-Path packages\testvault-gherkin
# Si True : Remove-Item -Recurse -Force packages\testvault-gherkin

# 7. Verifs sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

⚠ STOP avant Sprint 6h si l'un de ces checks echoue.

---

## Criteres de done

- [ ] Branche feature creee depuis main a jour
- [ ] Snapshot validee : 4 consommateurs (tous workspace:*), 5 fichiers source
- [ ] Dossier renomme via `git mv`
- [ ] `package.json` self : `name` = `@atconseil/argos-gherkin`
- [ ] 4 consumers package.json updates
- [ ] 5 imports source updates
- [ ] Test regression : ligne testvault-gherkin retiree
- [ ] `ALLOWED_LEGACY_NAMES` : 2 entrees restantes (cli, testpulse-ui-shared)
- [ ] Aucun RESIDUAL (hors test naming)
- [ ] Aucun dossier orphelin
- [ ] Validation complete OK
- [ ] Test naming 4/4, suite regression 51/51
- [ ] MIGRATION-PLAN.md Sprint 6f DONE + jalon Groupe 1 packages/ note
- [ ] CHANGELOG [0.4.15] avec section Milestone
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.14 -> 0.4.15
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot : 4 consommateurs (tous workspace:*), 5 fichiers source. Confirmation avant `git mv` ?"

2. **Apres Etape 6.3** : "Renaming termine. 6/8 packages renommes dans packages/ (jalon Groupe 1 TERMINE). 0 RESIDUAL. lint/typecheck/test/build OK. Pret a commit (apres ASCII pre-check) ?"

3. **Apres Etape 10.3** : "PR ouverte. **Apres merge GitHub, lance Etape 11** (post-merge cleanup). Puis Sprint 6h."

---

Quand le post-merge cleanup est fait, dis-le-moi. **Pause 5-10 min recommandee** puis snapshot Sprint 6h (testvault-e2e -> argos-e2e, 0 consommateur interne, ~15 min).
