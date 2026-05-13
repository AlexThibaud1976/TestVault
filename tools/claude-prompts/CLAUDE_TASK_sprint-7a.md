# Prompt Claude Code -- Sprint 7a (`feat/rename-testvault-cli-to-argos-cli`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming** : 8eme sprint de la serie renaming.
> Specificite : **CLI avec binaire shell + variables d'env publiques + 1 consommateur interne**.
> Surface confirmee terrain : 6 modifications + 1 git mv + 3 documents.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6h + TECH-DEBT-015A follow-up #2 merge visibles (Sprint 6h: rename testvault-e2e + docs/monorepo-inventory-followup-2)
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`

Si l'un echoue -> STOP.

---

## Contexte

**8eme sprint** de la serie renaming. Apres Sprint 6h (e2e), on attaque les 3 derniers packages :
- Aujourd'hui : Sprint 7a (testvault-cli)
- Puis : Sprint 7b (testpulse-ui-shared)
- Puis : Sprint 6g/7c (testvault-azure-pipelines-task)
- Puis : Sprint 7d (testvault-action GitHub Action)

**Specificite Sprint 7a** :

C'est le **package CLI** : `@atconseil/testvault-cli` declare un **binaire shell** (`testvault`) et lit des **variables d'env publiques** (`TESTVAULT_*`). 3 livrables externes le consomment (tools/e2e, tools/azure-pipelines-task, tools/testvault-action), mais **seul tools/e2e est dans le scope de ce sprint** :
- `tools/azure-pipelines-task/` -> Sprint 6g/7c (dedie)
- `tools/testvault-action/` -> Sprint 7d (dedie)

**Decisions actees (2026-05-13 soir + 2026-05-14 matin)** :
- Le binaire shell est renomme `testvault` -> `argos` (cle dans `bin` du package.json)
- Les variables d'env publiques sont renommees `TESTVAULT_*` -> `ARGOS_*` (coherence rebrand)
- Aucun utilisateur externe impacte (le CLI n'est pas encore publie sur npm, `private: true`)
- **PAS de "fix mojibake"** : verification byte de 2026-05-14 a confirme que les chaines `â€"` etaient un **faux positif d'affichage PowerShell 5.1**, pas un vrai mojibake. Les fichiers sont propres en UTF-8 valide. Voir TECH-DEBT-027.

**Surface verifiee terrain (2026-05-14)** :

| Modification | Fichier | Detail |
|---|---|---|
| 1 | `packages/testvault-cli/package.json` | Champ `name` + champ `bin` |
| 2 | `packages/testvault-cli/src/cli.ts` | 7 occurrences `TESTVAULT_*` (lignes 17, 18, 19, 44, 132, 133, 134) |
| 3 | `tools/e2e/package.json` | Dependency `@atconseil/testvault-cli` -> `@atconseil/argos-cli` |
| 4 | `tools/e2e/tests/07-phase4-import-export-cli.spec.ts` | Imports |
| 5 | `tools/e2e/tests/08-phase5-bdd-sync.spec.ts` | Imports |
| 6 | `tools/regression/CFG-2026-05-13-package-naming.test.ts` | Retirer entree ALLOWED_LEGACY_NAMES |
| 7 | `git mv packages/testvault-cli packages/argos-cli` | Dossier |
| 8 | Spec-kit + CHANGELOG | MIGRATION-PLAN Sprint 7a DONE + CHANGELOG [0.4.18] |

**Bump** : 0.4.17 -> 0.4.18.

**Hors scope** (gardez la discipline) :
- `tools/azure-pipelines-task/src/index.ts` (Sprint 6g/7c) -- contient `testvault tc upload-results` + `TESTVAULT_*`
- `tools/testvault-action/action.yml` (Sprint 7d) -- contient `npm install -g @atconseil/testvault-cli` + `testvault tc upload-results` + `TESTVAULT_*`
- `docs/integrations/azure-pipelines.md` (Sprint 6g/7c) -- doc utilisateur task ADO
- `docs/integrations/github-actions.md` (Sprint 7d) -- doc utilisateur GitHub Action
- `docs/user-guide.md`, `docs/sdk-reference.md`, `docs/operator-guide.md` (a verifier en passant, mais hors scope si refactor majeur)

---

## Garde-fous Sprint 7a

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire. Toujours.

### Garde-fou #2 : `--force` sur turbo (lecon Sprint 6f)
Apres `git mv`, le cache `.turbo/` est invalide mais turbo peut donner un faux vert via cache prealable. Utiliser `--force` dans la validation.

### Garde-fou #3 : NE PAS toucher aux 3 fichiers cross-package
Le grep va trouver `@atconseil/testvault-cli` ou `TESTVAULT_*` dans :
- `tools/azure-pipelines-task/src/index.ts` (variables d'env + cmd shell)
- `tools/testvault-action/action.yml` (variables d'env + cmd shell + npm install)
- `docs/integrations/azure-pipelines.md` (exemples utilisateur)
- `docs/integrations/github-actions.md` (exemples utilisateur)

**Ces fichiers RESTENT TELS QUELS apres Sprint 7a.** Leur alignement viendra dans Sprint 6g/7c et 7d.

**Verification cle apres modifications** :
```powershell
Select-String -Path tools\azure-pipelines-task\src\index.ts -Pattern "testvault"
# Doit ENCORE contenir 'testvault' (sera fixe Sprint 6g/7c)

Select-String -Path tools\testvault-action\action.yml -Pattern "testvault"
# Doit ENCORE contenir 'testvault' (sera fixe Sprint 7d)
```

Si ces fichiers ont ete modifies par erreur, REVERT.

### Garde-fou #4 : Binaire `testvault` -> `argos`
**Changement public** : tous les consommateurs externes qui ont `testvault tc upload-results` dans leur YAML/script deviennent obsoletes (tools/azure-pipelines-task et tools/testvault-action). C'est intentionnel et coordonne (Sprints 6g/7c et 7d viendront les aligner).

Verification : apres `pnpm install`, executer `argos --help` et `testvault --help` :
- `argos --help` doit fonctionner (nouveau binaire)
- `testvault --help` doit retourner "command not found" (ancien retire)

### Garde-fou #5 : Variables d'env dans cli.ts
Modification mecanique : 7 occurrences a remplacer. Verifier avec grep apres.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-cli-to-argos-cli

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== 1. Package existe ? ===" -ForegroundColor Cyan
Test-Path packages\testvault-cli
Test-Path packages\testvault-cli\package.json

Write-Host "`n=== 2. Champ name + bin actuel ===" -ForegroundColor Cyan
$pkg = Get-Content packages\testvault-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  name : $($pkg.name)"
Write-Host "  bin  : $($pkg.bin | ConvertTo-Json)"

Write-Host "`n=== 3. Consommateurs package.json (attendu : 1 = tools/e2e) ===" -ForegroundColor Cyan
$pkgCount = 0
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-cli" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match '"@atconseil/testvault-cli"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgCount++
    }
}
Write-Host "Total : $pkgCount" -ForegroundColor Cyan

Write-Host "`n=== 4. Imports source (attendu : 2 dans tools/e2e + 1 dans test naming) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-cli') {
        if ($_.FullName -match "CFG-2026-05-13-package-naming") {
            Write-Host "  $($_.FullName) [TEST REGRESSION - a updater]" -ForegroundColor Magenta
        } else {
            Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== 5. Variables d'env TESTVAULT_* dans cli.ts (attendu : 7 occurrences) ===" -ForegroundColor Cyan
Select-String -Path packages\testvault-cli\src\cli.ts -Pattern "TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}

Write-Host "`n=== 6. CROSS-PACKAGE (ATTENTION : NE PAS MODIFIER dans Sprint 7a) ===" -ForegroundColor Red
Write-Host "tools/azure-pipelines-task/src/index.ts (-> Sprint 6g/7c):" -ForegroundColor Red
Select-String -Path tools\azure-pipelines-task\src\index.ts -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}
Write-Host "`ntools/testvault-action/action.yml (-> Sprint 7d):" -ForegroundColor Red
Select-String -Path tools\testvault-action\action.yml -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}

Write-Host "`n=== 7. ALLOWED_LEGACY_NAMES contient testvault-cli ? ===" -ForegroundColor Cyan
Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern "testvault-cli" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow
}
```

**Attendus** :
- 1 consommateur package.json : tools/e2e
- 2 imports source (tools/e2e/tests/07 + tools/e2e/tests/08) + 1 dans test regression naming
- 7 occurrences TESTVAULT_* dans cli.ts
- Cross-package : OK avec testvault et TESTVAULT_* (NORMAL, sera fixe Sprints 6g/7c et 7d)
- 1 entree testvault-cli dans ALLOWED_LEGACY_NAMES

### 1.1 -- Reporter

> "Snapshot : 1 consommateur (tools/e2e), 2 imports source + 1 test, 7 vars env. Cross-package contient encore testvault/TESTVAULT_* (NORMAL, Sprint 6g/7c et 7d). Confirmation avant modifications ?"

---

## Etape 2 -- git mv du dossier

⚠ **OBLIGATOIRE `git mv`** (pas mv ou rename). Preserve l'historique.

```powershell
git mv packages/testvault-cli packages/argos-cli

# Verification
git status
# On voit :
#  renamed: packages/testvault-cli/... -> packages/argos-cli/...
```

⚠ Pas de cleanup explicite des `dist/` orphelins (TECH-DEBT-022 inscrit pour script auto futur).

---

## Etape 3 -- Update packages/argos-cli/package.json

### 3.1 -- Champs name et bin

```diff
- "name": "@atconseil/testvault-cli",
+ "name": "@atconseil/argos-cli",
  ...
  "bin": {
-   "testvault": "./dist/cli.js"
+   "argos": "./dist/cli.js"
  },
```

### 3.2 -- NE PAS toucher

- Le champ `version` (0.3.x reste, sera realigne Sprint 8)
- Les dependances (deja toutes renommees apres Sprint 6c-6f)

---

## Etape 4 -- Update packages/argos-cli/src/cli.ts

7 occurrences a remplacer (lignes 17, 18, 19, 44, 132, 133, 134) :

```diff
-       const pat = getRequired("pat", opts.pat, "TESTVAULT_PAT");
+       const pat = getRequired("pat", opts.pat, "ARGOS_PAT");
-       const orgUrl = getRequired("org-url", opts.orgUrl, "TESTVAULT_ORG_URL");
+       const orgUrl = getRequired("org-url", opts.orgUrl, "ARGOS_ORG_URL");
-       const project = getRequired("project", opts.project, "TESTVAULT_PROJECT");
+       const project = getRequired("project", opts.project, "ARGOS_PROJECT");
```

⚠ **Verification cle apres remplacement** :
```powershell
Select-String -Path packages\argos-cli\src\cli.ts -Pattern "TESTVAULT_" -Encoding UTF8
# Doit retourner : aucune ligne

Select-String -Path packages\argos-cli\src\cli.ts -Pattern "ARGOS_" -Encoding UTF8
# Doit retourner : 7 lignes
```

---

## Etape 5 -- Update tools/e2e/package.json

```diff
  "dependencies": {
-   "@atconseil/testvault-cli": "workspace:*",
+   "@atconseil/argos-cli": "workspace:*",
    "@atconseil/argos-exporters": "workspace:^",
    "@atconseil/argos-gherkin": "workspace:*",
    "@atconseil/argos-importers": "workspace:*",
    "@atconseil/argos-sdk": "workspace:*"
  }
```

---

## Etape 6 -- Update 2 imports source dans tools/e2e/tests/

### 6.1 -- tools/e2e/tests/07-phase4-import-export-cli.spec.ts

```diff
- import { ... } from "@atconseil/testvault-cli";
+ import { ... } from "@atconseil/argos-cli";
```

(Ou tout autre import depuis testvault-cli a remplacer.)

### 6.2 -- tools/e2e/tests/08-phase5-bdd-sync.spec.ts

Idem.

---

## Etape 7 -- Update test regression naming

`tools/regression/CFG-2026-05-13-package-naming.test.ts` :

Retirer la ligne contenant `"@atconseil/testvault-cli"` de la liste `ALLOWED_LEGACY_NAMES`.

```diff
  const ALLOWED_LEGACY_NAMES = new Set([
-   "@atconseil/testvault-cli",
    "@atconseil/testpulse-ui-shared",
  ]);
```

(Reste seulement testpulse-ui-shared, qui sera retire Sprint 7b.)

---

## Etape 8 -- pnpm install + validation

```powershell
pnpm install
# Workspace refresh

pnpm list -r --depth=0 | Select-String -Pattern "cli"
# Attendu : @atconseil/argos-cli (PAS testvault-cli)

# Tests regression
pnpm --filter @atconseil/regression-suite test
# 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# 0 file

# Pre-flight
pnpm preflight
# PASSED

# Turbo avec --force (lecon Sprint 6f, TECH-DEBT-024)
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts
```

### 8.1 -- Self-check RESIDUAL

```powershell
Write-Host "=== Residus @atconseil/testvault-cli ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|CFG-2026-05-13-package-naming" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-cli") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
```

⚠ **Attendu : 2 RESIDUALS connus** (cross-package, NORMAL) :
- `tools/testvault-action/action.yml` -> Sprint 7d
- (verifier les docs : pas dans le grep ci-dessus, fait suite)

```powershell
Write-Host "`n=== Residus dans docs/ ===" -ForegroundColor Cyan
Get-ChildItem docs -Recurse -Filter *.md | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-cli") {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
# Attendu : docs/integrations/github-actions.md et docs/user-guide.md potentiellement
# Ces docs seront updatees Sprint 7d (action) et plus tard
```

```powershell
Write-Host "`n=== Residus TESTVAULT_* dans le repo ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|CFG-2026-05-13-package-naming|pnpm-lock|\.turbo" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "TESTVAULT_PAT|TESTVAULT_ORG|TESTVAULT_PROJECT|TESTVAULT_API") {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
# Attendu : 
#   tools/azure-pipelines-task/src/index.ts (Sprint 6g/7c)
#   tools/testvault-action/action.yml (Sprint 7d)
#   docs/integrations/*.md (Sprints 6g/7c et 7d)
# Sprint 7a OK si seules ces references restent.
```

### 8.2 -- Test binaire shell

```powershell
# Le binaire 'argos' doit exister apres build
Test-Path packages\argos-cli\dist\cli.js
# Attendu : True

# Tester le binaire
node packages\argos-cli\dist\cli.js --help
# Attendu : aide du CLI s'affiche

# Note : pnpm install cree des liens symboliques pour les binaires
# Verifier
Get-ChildItem node_modules\.bin -Filter argos*
# Attendu : argos.cmd ou argos.ps1
```

### 8.3 -- Verifier portfolio packages/

```powershell
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (8 packages, plus de testvault-cli) :
#   argos-cli           (NOUVEAU)
#   argos-exporters
#   argos-gherkin
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared  (Sprint 7b)
```

---

## Etape 9 -- Update Specs/MIGRATION-PLAN.md

Update Section 3 (Plan d'execution) :

```diff
- | Sprint 7a | Renaming `testvault-cli` -> `argos-cli` | ~45 min | Moyen (1 consommateur, binaire + 7 vars env + impact 2 livrables externes) | Apres 6h |
+ | Sprint 7a | Renaming `testvault-cli` -> `argos-cli` (CLI + binaire + 7 vars env) | ~45 min | Moyen (1 consommateur interne, binaire shell, vars env publiques) | **DONE 2026-05-14** |
```

Ajouter note :
```markdown
> **Sprint 7a livre 2026-05-14** : renommage CLI + binaire shell `testvault` -> `argos` +
> variables d'env publiques `TESTVAULT_*` -> `ARGOS_*` (7 occurrences dans cli.ts).
> Les 3 consommateurs externes du binaire (tools/azure-pipelines-task, tools/testvault-action,
> docs/integrations/*) restent INALIGNES jusqu'aux Sprints 6g/7c (task ADO) et 7d (GitHub Action).
> Ce desalignement est temporaire et intentionnel : les sprints dedies les aligneront.
```

---

## Etape 10 -- Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 7a: rename testvault-cli to argos-cli (binary + env vars)"
# ASCII strict (pas d'em-dash, pas d'accents)

pnpm changeset version
# Attendu : bump 0.4.17 -> 0.4.18
```

---

## Etape 11 -- CHANGELOG entry

```markdown
## [0.4.18] - 2026-05-14

### Changed (Sprint 7a - feat/rename-testvault-cli-to-argos-cli)

- **`@atconseil/testvault-cli` renomme en `@atconseil/argos-cli`** (8eme sprint de la serie renaming).
- **Binaire shell renomme `testvault` -> `argos`** (changement public, mais 0 utilisateur externe car private:true).
- **Variables d'env publiques renommees `TESTVAULT_*` -> `ARGOS_*`** (7 occurrences dans cli.ts):
  - `TESTVAULT_PAT` -> `ARGOS_PAT`
  - `TESTVAULT_ORG_URL` -> `ARGOS_ORG_URL`
  - `TESTVAULT_PROJECT` -> `ARGOS_PROJECT`
- Modifications :
  - `packages/testvault-cli/` -> `packages/argos-cli/` (git mv)
  - `packages/argos-cli/package.json` : `name` + `bin`
  - `packages/argos-cli/src/cli.ts` : 7 occurrences vars env
  - `tools/e2e/package.json` : dependency
  - `tools/e2e/tests/07-phase4-import-export-cli.spec.ts` : import
  - `tools/e2e/tests/08-phase5-bdd-sync.spec.ts` : import
  - `tools/regression/CFG-2026-05-13-package-naming.test.ts` : retire entree ALLOWED_LEGACY_NAMES

### Notes (Sprint 7a)

- **Desalignement temporaire et intentionnel** : les 3 livrables externes qui consomment encore le binaire `testvault` et les vars `TESTVAULT_*` restent INALIGNES jusqu'a leurs sprints dedies :
  - `tools/azure-pipelines-task/src/index.ts` -> Sprint 6g/7c (en attente)
  - `tools/testvault-action/action.yml` -> Sprint 7d (en attente)
  - `docs/integrations/azure-pipelines.md` -> Sprint 6g/7c
  - `docs/integrations/github-actions.md` -> Sprint 7d
- Apres Sprint 7d, le rebrand argos sera **complet** et coherent.
- **PAS de fix mojibake** : verification byte du 2026-05-14 a confirme que les chaines `â€"` etaient un faux positif d'affichage PowerShell 5.1, pas un vrai mojibake. Voir TECH-DEBT-027.
- Bump 0.4.17 -> 0.4.18.

### TECH-DEBT actifs (recap)

- TECH-DEBT-021 : Migration `build:vsix` output-path
- TECH-DEBT-022 : Cleanup auto artefacts orphelins post-`git mv`
- TECH-DEBT-024 : Forcer `--force` sur turbo dans validation post-renaming (lecon Sprint 6f, applique ici)
- TECH-DEBT-026 : Resync `Specs/tasks.md` avec realite du code (avant Sprint 2.5b)
- TECH-DEBT-027 NEW : Documenter encoding PowerShell 5.1 + `.gitattributes` (apres renaming complet)
- ANNULES : TECH-DEBT-023, TECH-DEBT-025 (faux positifs mojibake)

### Backlog renaming

- Sprint 7b NEXT : `testpulse-ui-shared` -> `argos-detection-api` (changement de nom de produit + scope)
- Sprint 6g/7c : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` (avec regen GUID + alignement vars/cmd shell)
- Sprint 7d : `tools/testvault-action/` -> `tools/argos-action/` (avec alignement install CLI + vars env + cmd shell)
- Sprint 8 : Versioning alignement (Changesets fixed mode)
- TECH-DEBT-026 : Resync Specs/tasks.md (OBLIGATOIRE avant Sprint 2.5b)
```

---

## Etape 12 -- Archive + commit

### 12.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-7a.md", "$HOME\Downloads\CLAUDE_TASK_sprint-7a.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-7a.md
}
```

### 12.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-cli to argos-cli (Sprint 7a)`n`n8th sprint of the testvault to argos renaming wave."
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

### 12.3 -- Commit

```powershell
git add -A
git status
# Verifier les fichiers staged :
#   - renamed: packages/testvault-cli/... -> packages/argos-cli/...
#   - modified: packages/argos-cli/package.json (name + bin)
#   - modified: packages/argos-cli/src/cli.ts (7 vars env)
#   - modified: tools/e2e/package.json (dependency)
#   - modified: tools/e2e/tests/07-phase4-import-export-cli.spec.ts (import)
#   - modified: tools/e2e/tests/08-phase5-bdd-sync.spec.ts (import)
#   - modified: tools/regression/CFG-2026-05-13-package-naming.test.ts (retire entree)
#   - modified: Specs/MIGRATION-PLAN.md (Sprint 7a DONE)
#   - modified: CHANGELOG.md ([0.4.18])
#   - .changeset/*.md
#   - tools/claude-prompts/CLAUDE_TASK_sprint-7a.md
#   - modified: apps/argos-extension/package.json + vss-extension.json (bump 0.4.18)
#   - modified: pnpm-lock.yaml

git commit `
  -m "feat(packages): rename testvault-cli to argos-cli (Sprint 7a)" `
  -m "" `
  -m "8th sprint of the testvault to argos renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- packages/testvault-cli/ -> packages/argos-cli/ (git mv)" `
  -m "- packages/argos-cli/package.json: name field + bin field (testvault -> argos)" `
  -m "- packages/argos-cli/src/cli.ts: 7 env vars TESTVAULT_* -> ARGOS_*" `
  -m "  (TESTVAULT_PAT, TESTVAULT_ORG_URL, TESTVAULT_PROJECT)" `
  -m "- tools/e2e/package.json: dependency updated" `
  -m "- tools/e2e/tests/07 + 08: source imports updated" `
  -m "- tools/regression/CFG-2026-05-13-package-naming.test.ts: removed entry" `
  -m "" `
  -m "Intentional misalignment (out of scope for this sprint):" `
  -m "- tools/azure-pipelines-task/src/index.ts: still uses 'testvault' + TESTVAULT_*" `
  -m "  (will be aligned in Sprint 6g/7c)" `
  -m "- tools/testvault-action/action.yml: still uses 'testvault' + TESTVAULT_*" `
  -m "  (will be aligned in Sprint 7d)" `
  -m "- docs/integrations/*.md: user-facing examples still show testvault" `
  -m "  (will be updated in Sprints 6g/7c and 7d)" `
  -m "" `
  -m "Methodology:" `
  -m "- pnpm turbo lint/typecheck/test/build --force used (lesson Sprint 6f cache)" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "- No mojibake fix needed: byte-level verification 2026-05-14 confirmed all files" `
  -m "  are valid UTF-8. Previous 'mojibake' reports were PowerShell 5.1 display" `
  -m "  artifacts (CP-1252 console rendering of valid UTF-8). See TECH-DEBT-027." `
  -m "" `
  -m "Bump 0.4.17 to 0.4.18 (patch: rename + env var rename, no functional change)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B)"

git push -u origin feat/rename-testvault-cli-to-argos-cli
```

PR.

---

## Etape 13 -- POST-MERGE CLEANUP

⚠ **A faire APRES le merge GitHub.**

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3
# Attendu : Merge PR Sprint 7a en tete

git branch -d feat/rename-testvault-cli-to-argos-cli
# Si refus : git branch -D feat/rename-testvault-cli-to-argos-cli

git remote prune origin

# Verifier portfolio packages/
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (8 packages) :
#   argos-cli           (NOUVEAU)
#   argos-exporters
#   argos-gherkin
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared

# Verifier dossier ancien supprime
Test-Path packages\testvault-cli
# Attendu : False

# Verifier le binaire
$pkg = Get-Content packages\argos-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Bin : $($pkg.bin | ConvertTo-Json)"
# Attendu : { "argos": "./dist/cli.js" }

# Sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

⚠ STOP avant Sprint 7b si l'un de ces checks echoue.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-cli-to-argos-cli` creee depuis main a jour
- [ ] Snapshot validee : 1 consommateur, 2 imports source, 7 vars env, 1 test naming
- [ ] **`git mv` execute** : `packages/testvault-cli/` -> `packages/argos-cli/`
- [ ] `packages/argos-cli/package.json` : `name` + `bin` (binaire `argos`)
- [ ] `packages/argos-cli/src/cli.ts` : 0 occurrence `TESTVAULT_*`, 7 occurrences `ARGOS_*`
- [ ] `tools/e2e/package.json` : dependency `@atconseil/argos-cli`
- [ ] 2 imports source updates dans tools/e2e/tests/
- [ ] Test regression naming : 1 entree retiree (`testvault-cli`)
- [ ] **Cross-package NON modifies** (verifier explicitement) :
  - `tools/azure-pipelines-task/src/index.ts` contient encore `testvault` + `TESTVAULT_*`
  - `tools/testvault-action/action.yml` contient encore `testvault` + `TESTVAULT_*`
  - `docs/integrations/*.md` contient encore `testvault`
- [ ] `pnpm install` OK
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Suite regression : 51/51 passing
- [ ] `node packages/argos-cli/dist/cli.js --help` fonctionne
- [ ] MIGRATION-PLAN.md Sprint 7a DONE + note desalignement temporaire
- [ ] CHANGELOG [0.4.18] avec lessons learned + recap TECH-DEBT (ANNULES 023+025, NEW 027)
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.17 -> 0.4.18
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot OK : 1 consommateur, 2 imports, 7 vars env. Cross-package retient testvault/TESTVAULT_* (normal, Sprint 6g/7c et 7d). Confirmation avant modifications ?"

2. **Apres Etape 8.1 (self-check RESIDUAL)** : "Modifications terminees. 0 RESIDUAL hors cross-package attendu (azure-pipelines-task, testvault-action, docs/integrations/*). lint/typecheck/test/build --force OK. Pret a commit (apres ASCII pre-check) ?"

3. **Apres Etape 12.3** : "PR ouverte. **Apres merge GitHub, lance Etape 13** (post-merge cleanup)."

---

Quand post-merge cleanup OK, **Sprint 7b** :
- `testpulse-ui-shared` -> `argos-detection-api` (changement de nom de produit + scope)
- Last package in packages/ to rename
- ~30 min
