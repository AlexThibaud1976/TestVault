# Prompt Claude Code -- Sprint 6h (`feat/rename-testvault-e2e-to-argos-e2e`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming court** : 7eme sprint de la serie renaming.
> Specificite : **package dans `tools/`, dossier inchange (Option A), nom npm seulement**.
> 0 consommateur interne. Surface minimale.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6f merge visible : `git log --oneline | Select-Object -First 5`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`

Si l'un echoue -> STOP.

---

## Contexte

**7eme sprint** de la serie renaming. Apres le jalon Groupe 1 packages/ termine (Sprint 6f), on attaque les 2 packages dans `tools/` : `tools/e2e/` aujourd'hui (Sprint 6h), puis `tools/azure-pipelines-task/` demain (Sprint 6g, qui demande reflexion versioning).

**Specificite Sprint 6h vs Sprints 6a-6f** :
- Package dans `tools/`, pas `packages/`
- **Dossier `tools/e2e/` reste inchange** (Option A validee : le dossier porte le nom de sa fonction, pas du produit)
- Seul le **`name` du package npm** change : `@atconseil/testvault-e2e` -> `@atconseil/argos-e2e`
- **0 consommateur interne** (le package n'est consomme par personne, c'est lui qui consomme 5 packages)
- **Reference dans CI workflow** a updater : `ci-main.yml` ligne 101

**Surface verifiee terrain** :
- **0 package.json consommateur** (aucun fichier ne reference `@atconseil/testvault-e2e` dans ses deps)
- **0 import source** (aucun `.ts` ne fait `from "@atconseil/testvault-e2e"`)
- **1 fichier workflow CI** : `.github/workflows/ci-main.yml` ligne 101 hardcode `pnpm --filter @atconseil/testvault-e2e test:cloud`
- **0 modification dans le test regression naming convention** (car il ne couvre que `packages/`, pas `tools/`)

**Modifications a faire** :
1. **`tools/e2e/package.json`** : champ `name` `@atconseil/testvault-e2e` -> `@atconseil/argos-e2e`
2. **`.github/workflows/ci-main.yml`** : ligne 101, `--filter @atconseil/testvault-e2e` -> `--filter @atconseil/argos-e2e`
3. `pnpm install` (refresh workspace)
4. Validation (lint/typecheck/test/build/preflight/mojibake)
5. CHANGELOG + bump
6. Update MIGRATION-PLAN.md (Sprint 6h DONE)
7. Commit + PR (ASCII strict)
8. Post-merge cleanup

**Hors scope** :
- Renommer le dossier `tools/e2e/` (Option A : on garde, le dossier porte le nom de la fonction)
- Toucher au test naming convention (sa portee est `packages/`, pas `tools/`)
- Autres packages (testvault-cli Sprint 7a, testpulse-ui-shared Sprint 7b)
- `testvault-azure-pipelines-task` (Sprint 6g demain)

---

## Garde-fous Sprint 6h

### Garde-fou #1 : ASCII strict commit message
Comme Sprints 6e/6f. Pre-commit check obligatoire.

### Garde-fou #2 : workflow CI a NE PAS oublier
La reference `--filter @atconseil/testvault-e2e` dans `ci-main.yml` ligne 101 est **hardcodee**. Si on l'oublie, le job `e2e-cloud` echouera quand un PAT sera dispo (en local ou sur main avec secrets). Le job est skip en CI de PR normale (pas de PAT), donc le bug passerait inapercu.

### Garde-fou #3 : pas de touche au test naming convention
Le fichier `tools/regression/CFG-2026-05-13-package-naming.test.ts` **ne contient pas** d'entree `"@atconseil/testvault-e2e"` (verifier). Sa portee est uniquement les packages dans `packages/`. Sprint 6h ne touche pas a ce fichier.

### Garde-fou #4 : `--force` sur typecheck (lecon Sprint 6f)
Sprint 6f a eu un faux vert local via cache turbo. Pour Sprint 6h, **lancer `pnpm turbo typecheck --force`** au lieu de `pnpm turbo typecheck` pour invalider le cache et garantir un vrai typecheck.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-e2e-to-argos-e2e

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== Le package testvault-e2e existe ? ===" -ForegroundColor Cyan
Test-Path tools\e2e\package.json

Write-Host "`n=== Champ name actuel ===" -ForegroundColor Cyan
Select-String -Path tools\e2e\package.json -Pattern '"name"'

Write-Host "`n=== Consommateurs (attendu 0) ===" -ForegroundColor Cyan
$pkgCount = 0
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "tools\\e2e" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-e2e"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Red
        $pkgCount++
    }
}
Write-Host "Total consommateurs : $pkgCount" -ForegroundColor Cyan

Write-Host "`n=== Imports source (attendu 0) ===" -ForegroundColor Cyan
$srcCount = 0
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-e2e') {
        Write-Host "  $($_.FullName)" -ForegroundColor Red
        $srcCount++
    }
}
Write-Host "Total imports : $srcCount" -ForegroundColor Cyan

Write-Host "`n=== Workflow CI references (devrait afficher ci-main.yml L101) ===" -ForegroundColor Cyan
Get-ChildItem .github\workflows -Filter *.yml | ForEach-Object {
    Select-String -Path $_.FullName -Pattern "testvault-e2e"
}

Write-Host "`n=== Test regression naming ne contient pas testvault-e2e (attendu : 0 ligne) ===" -ForegroundColor Cyan
Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern "testvault-e2e"
```

**Attendus** :
- 0 consommateur package.json
- 0 import source
- 1 reference workflow ci-main.yml ligne 101
- 0 reference dans test regression naming

⚠ STOP si chiffres differents.

### 1.1 -- Reporter

> "Snapshot : 0 consommateur interne, 0 import source, 1 reference workflow CI (ci-main.yml L101). Confirmation avant modification ?"

---

## Etape 2 -- Update `tools/e2e/package.json`

⚠ **NE PAS faire `git mv`** sur le dossier. Le dossier reste `tools/e2e/`.

Seule modification : le champ `name` dans `package.json` :

```diff
- "name": "@atconseil/testvault-e2e",
+ "name": "@atconseil/argos-e2e",
```

⚠ NE PAS toucher au champ `version` (0.3.4 reste 0.3.4 jusqu'au realignement Sprint 8).
⚠ NE PAS toucher aux dependances (deja toutes renommees sauf testvault-cli pour Sprint 7a).

---

## Etape 3 -- Update `.github/workflows/ci-main.yml`

Localiser la ligne 101 (job `e2e-cloud`, etape "Run E2E - Cloud") :

```diff
- run: pnpm --filter @atconseil/testvault-e2e test:cloud
+ run: pnpm --filter @atconseil/argos-e2e test:cloud
```

⚠ **Verifier qu'il n'y a pas d'autres references** dans le meme fichier :
```powershell
Select-String -Path .github\workflows\ci-main.yml -Pattern "testvault-e2e"
# Attendu : 0 ligne apres modification
```

---

## Etape 4 -- pnpm install + validation

```powershell
pnpm install
# Workspace refresh, nouveau name visible

pnpm list -r --depth=0 | Select-String -Pattern "e2e"
# Attendu : @atconseil/argos-e2e (PAS testvault-e2e)

# Tests regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# 0 file

# Pre-flight
pnpm preflight
# PASSED

# Turbo avec --force (lecon Sprint 6f)
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts
```

### 4.1 -- Self-check RESIDUAL

```powershell
Write-Host "=== Residus testvault-e2e ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml -Path packages,apps,tools,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-e2e") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL
```

⚠ Si RESIDUAL trouve, STOP.

### 4.2 -- Verifier portfolio tools/

```powershell
Get-ChildItem tools -Directory | Select-Object Name
# Attendu (4 dossiers) :
#   azure-pipelines-task
#   claude-prompts
#   e2e             (toujours la, mais son package est renomme)
#   preflight
#   regression
```

⚠ Le dossier `tools/e2e/` est **toujours present** (on a fait Option A).

---

## Etape 5 -- Update Specs/MIGRATION-PLAN.md

```diff
- | Sprint 6h | Renaming `testvault-e2e` -> `argos-e2e` | ~20 min | Faible (0 consommateur, mais consomme 5 packages updated) | Apres 6c-6f, 7a |
+ | Sprint 6h | Renaming `testvault-e2e` -> `argos-e2e` | ~15 min | Faible (0 consommateur, package name only, Option A dossier inchange) | **DONE 2026-05-13** |
```

Ajouter note importante :
```markdown
> **Sprint 6h Option A appliquee** : le dossier `tools/e2e/` reste inchange. Seul le `name` du package npm est modifie. Cette approche est preferee car le dossier porte le nom de sa fonction (`e2e tests`), pas du produit. Coherence avec `tools/regression/`, `tools/preflight/`, `tools/azure-pipelines-task/` qui ont aussi des noms fonctionnels.
```

---

## Etape 6 -- Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 6h: rename testvault-e2e to argos-e2e (package name + CI workflow)"
# ATTENTION : ASCII strict, pas d'em-dash

pnpm changeset version
# Attendu : bump 0.4.15 -> 0.4.16
```

---

## Etape 7 -- CHANGELOG entry

```markdown
## [0.4.16] - 2026-05-13

### Changed (Sprint 6h - feat/rename-testvault-e2e-to-argos-e2e)

- **`@atconseil/testvault-e2e` renomme en `@atconseil/argos-e2e`** (7eme sprint de la serie renaming).
  - **Option A appliquee** : le dossier `tools/e2e/` reste inchange. Seul le `name` du package npm est modifie.
  - Aucun consommateur interne (le package n'est consomme par personne, c'est lui qui consomme 5 packages).
  - Modifications :
    - `tools/e2e/package.json` : champ `name` (1 ligne)
    - `.github/workflows/ci-main.yml` ligne 101 : `--filter @atconseil/testvault-e2e` -> `--filter @atconseil/argos-e2e`

### Notes (Sprint 6h)

- Sprint le plus court de la serie renaming (~15 min). Surface minimale.
- **Option A vs Option B** : le dossier `tools/e2e/` porte le nom de sa fonction (e2e tests), pas du produit. Coherence avec `tools/regression/`, `tools/preflight/`. Renommer le dossier aurait casse les references `path:` du workflow CI ligne 112 sans benefice methodologique.
- **Test regression naming non touche** : sa portee est `packages/`, pas `tools/`. Aucune entree `testvault-e2e` dans `ALLOWED_LEGACY_NAMES`.
- **Garde-fou Sprint 6f applique** : `pnpm turbo typecheck --force` (et autres turbo --force) pour invalider le cache. Lecon : eviter les faux verts via cache turbo apres renaming.
- Bump 0.4.15 -> 0.4.16.

### Backlog enrichi

- **Sprint 6g NEXT (demain matin)** : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`. **Necessite reflexion versioning** (1.0.0 vs 2.0.0, statut publication Marketplace Azure DevOps).
- Sprint 7a : `testvault-cli` -> `argos-cli` (consommateurs : argos-extension, tools/e2e, peut-etre argos-functions)
- Sprint 7b : `testpulse-ui-shared` -> `argos-detection-api` (changement de nom de produit + scope, traitement special)
- **TECH-DEBT-024 NEW** : Inclure `--force` sur turbo dans la validation post-renaming. Lecon Sprint 6f.

### Lessons learned (Sprint 6h)

- **Les packages dans `tools/` doivent etre traites differemment des packages dans `packages/`** :
  - Pas de `git mv` du dossier (dossier garde son nom fonctionnel)
  - Pas de modification du test regression naming (sa portee est `packages/`)
  - Mais reference workflow CI a updater
- **Pattern decisionnel** : si le nom du dossier ne contient pas `testvault-`, ne pas renommer le dossier. Modifier seulement les references au nom npm.
```

---

## Etape 8 -- Archive + commit

### 8.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6h.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6h.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6h.md
}
```

### 8.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-e2e to argos-e2e (Sprint 6h)`n`n7th sprint of the testvault to argos renaming wave."
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

### 8.3 -- Commit

```powershell
git add -A
git status
# Verifier les fichiers staged :
#   - modified: tools/e2e/package.json (champ name)
#   - modified: .github/workflows/ci-main.yml (ligne 101)
#   - modified: Specs/MIGRATION-PLAN.md (Sprint 6h DONE + note Option A)
#   - modified: CHANGELOG.md ([0.4.16])
#   - .changeset/*.md
#   - tools/claude-prompts/CLAUDE_TASK_sprint-6h.md
#   - modified: apps/argos-extension/package.json + vss-extension.json (bump version)

git commit `
  -m "feat(packages): rename testvault-e2e to argos-e2e (Sprint 6h)" `
  -m "" `
  -m "7th sprint of the testvault to argos renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Option A applied: tools/e2e/ folder unchanged. Only npm name changes:" `
  -m "- tools/e2e/package.json: name field updated to @atconseil/argos-e2e" `
  -m "- .github/workflows/ci-main.yml line 101: --filter @atconseil/argos-e2e" `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- 0 internal consumers (package is consumed by nobody, consumes 5 others)" `
  -m "- 0 source imports to update" `
  -m "- 1 CI workflow reference updated" `
  -m "" `
  -m "Test regression naming convention not touched (scope is packages/, not tools/)." `
  -m "" `
  -m "Methodology improvements:" `
  -m "- pnpm turbo typecheck --force used (lesson from Sprint 6f cache false-green)" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "" `
  -m "No functional changes. Bump 0.4.15 to 0.4.16 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.8)"

git push -u origin feat/rename-testvault-e2e-to-argos-e2e
```

PR.

---

## Etape 9 -- POST-MERGE CLEANUP

⚠ **A faire APRES le merge GitHub.**

```powershell
# 1. Switch sur main + pull
git checkout main
git pull

# 2. Verifier le merge en tete
git log --oneline | Select-Object -First 3

# 3. Supprimer branche feature locale
git branch -d feat/rename-testvault-e2e-to-argos-e2e
# Si refus : git branch -D feat/rename-testvault-e2e-to-argos-e2e

# 4. Prune origin
git remote prune origin

# 5. Verifier portfolio tools/
Get-ChildItem tools -Directory | Select-Object Name
# Attendu :
#   azure-pipelines-task
#   claude-prompts
#   e2e
#   preflight
#   regression

# 6. Verifier le nom du package
Select-String -Path tools\e2e\package.json -Pattern '"name"'
# Attendu : "name": "@atconseil/argos-e2e",

# 7. Verifier que ci-main.yml ne reference plus testvault-e2e
Select-String -Path .github\workflows\ci-main.yml -Pattern "testvault-e2e"
# Attendu : 0 ligne

# 8. Verifs sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

⚠ STOP avant Sprint 6g/7a/7b si l'un de ces checks echoue.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-e2e-to-argos-e2e` creee depuis main a jour
- [ ] Snapshot validee : 0 consommateur, 0 import, 1 reference workflow CI
- [ ] **Dossier `tools/e2e/` inchange** (Option A)
- [ ] `tools/e2e/package.json` : `name` = `@atconseil/argos-e2e`
- [ ] `.github/workflows/ci-main.yml` ligne 101 updatee
- [ ] Aucun RESIDUAL `@atconseil/testvault-e2e` dans le code/workflows
- [ ] Test regression naming **non touche** (sa portee est `packages/`)
- [ ] `pnpm install` OK
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Suite regression : 51/51 passing
- [ ] MIGRATION-PLAN.md Sprint 6h DONE + note Option A
- [ ] CHANGELOG [0.4.16] avec lessons learned + TECH-DEBT-024
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.15 -> 0.4.16
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot : 0 consommateur, 0 import, 1 ref workflow CI. Confirmation avant modifications ?"

2. **Apres Etape 4.1** : "Modifications termines. 0 RESIDUAL. lint/typecheck/test/build --force OK. Pret a commit (apres ASCII pre-check) ?"

3. **Apres Etape 8.3** : "PR ouverte. **Apres merge GitHub, lance Etape 9** (post-merge cleanup)."

---

Quand post-merge cleanup OK, **fin de journee Sprint 6h** :
- **6 sprints livres aujourd'hui** : 5a/5b, 6a (+ follow-up), 6b, 015A-followup, 6c, 6d, 6e, 6f, 6h
- **Renaming progresse** : 7/8 packages renommes
- **Restants demain** : Sprint 6g (azure-pipelines-task), Sprint 7a (cli), Sprint 7b (testpulse-ui-shared)
- **Pause meritee** ☕
