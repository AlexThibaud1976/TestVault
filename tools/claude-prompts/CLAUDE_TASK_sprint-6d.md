# Prompt Claude Code — Sprint 6d (`feat/rename-testvault-importers-to-argos-importers`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **renaming court** : 4eme du Groupe 1. Surface reduite par rapport au SDK.
> Methodologie identique aux sprints precedents (template valide).

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (`working tree clean`)
- [ ] `git branch --show-current` = `main`
- [ ] `git log --oneline | Select-Object -First 3` montre Sprint 6c mergé
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] Windows Defender exclu sur `E:\Code\TestVault`
- [ ] Aucun dossier orphelin `packages/testvault-*` deja renomme (verifier `Test-Path packages\testvault-types`, `Test-Path packages\testvault-sdk`, etc.)

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : 4eme sprint d'execution du renaming Groupe 1. Apres types, wit-schema et sdk, on attaque `testvault-importers`.

**Surface d'impact reelle** (verifie en grep terrain 2026-05-13) :
- **4 package.json consommateurs** :
  1. `packages/testvault-cli/package.json`
  2. `apps/argos-extension/package.json`
  3. `apps/argos-functions/package.json`
  4. `tools/e2e/package.json`
- **7 imports source** dont **1 exclu** (test regression naming convention - chaine litterale) = **6 a transformer**

**Distribution des 6 imports** :
- testvault-cli : 2 fichiers (upload-results.test.ts, upload-results.ts)
- argos-extension : 2 fichiers (ImportWizard.tsx, ImportWizard.test.tsx)
- argos-functions : 1 fichier (webhooks/queue-processor.ts)
- tools/e2e : 1 fichier (tests/07-phase4-import-export-cli.spec.ts)

**Cibles du renaming** :
- Dossier : `packages/testvault-importers/` -> `packages/argos-importers/`
- Nom npm : `@atconseil/testvault-importers` -> `@atconseil/argos-importers`
- Imports dans 6 fichiers source
- Dependencies dans 4 package.json
- `ALLOWED_LEGACY_NAMES` dans le test naming convention : retirer l'entree

**Perimetre Sprint 6d** :
1. Rename dossier via `git mv`
2. Update `packages/argos-importers/package.json` champ `name`
3. Update les 4 package.json consommateurs (dependencies)
4. Update 6 imports source
5. Retirer `"@atconseil/testvault-importers"` de `ALLOWED_LEGACY_NAMES` (action chirurgicale)
6. `pnpm install`
7. Validation complete
8. CHANGELOG + bump 0.4.12 -> 0.4.13
9. Update MIGRATION-PLAN.md (Sprint 6d DONE)
10. Commit + PR

**Hors scope** :
- Autres testvault-* (Sprints 6e, 6f, 6g, 6h, 7a, 7b)
- Modification fonctionnelle
- Realignement versions (-> Sprint 8)

---

## ⚠ Garde-fou special : test naming convention

Le fichier `tools/regression/CFG-2026-05-13-package-naming.test.ts` apparait dans le grep parce qu'il **contient la chaine litterale** `"@atconseil/testvault-importers"` dans `ALLOWED_LEGACY_NAMES`.

**Action correcte** sur ce fichier :
- ✅ **Retirer** la ligne complete `"@atconseil/testvault-importers", // Sprint 6d: rename to argos-importers`
- ❌ **NE PAS** remplacer `testvault-importers` par `argos-importers` dans ce fichier

Methodologie :
1. Traiter d'abord les 4 package.json + 6 fichiers source (replace OK)
2. **Excluant** explicitement `tools/regression/CFG-2026-05-13-package-naming.test.ts` du replace
3. Faire un `str_replace` chirurgical pour retirer la ligne ALLOWED_LEGACY_NAMES

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-importers-to-argos-importers

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing
```

---

## Etape 1 — Snapshot consommateurs (sanity check final)

```powershell
Write-Host "=== Consommateurs package.json (testvault-importers) ===" -ForegroundColor Cyan
$pkgConsumers = @()
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-importers" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-importers"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgConsumers += $_.FullName
    }
}
Write-Host "`nTotal package.json: $($pkgConsumers.Count) (attendu : 4)" -ForegroundColor Cyan

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
$sourceCount = 0
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-importers') {
        $sourceCount++
        if ($_.FullName -match "CFG-2026-05-13-package-naming") {
            Write-Host "  $($_.FullName) [EXCLU - test regression litteral]" -ForegroundColor Magenta
        } else {
            Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        }
    }
}
Write-Host "`nTotal imports source: $sourceCount (attendu : 7, dont 1 exclu = 6 a transformer)" -ForegroundColor Cyan
```

**Attendus** :
- 4 package.json
- 7 imports source dont 1 exclu (CFG-2026-05-13-package-naming.test.ts)

⚠ **STOP si les chiffres different**, signaler a l'utilisateur.

### 1.1 — Reporter

> "Snapshot : 4 consommateurs, 6 fichiers source a transformer (+1 exclu = test regression). Confirmation avant `git mv` ?"

---

## Etape 2 — Rename dossier via `git mv`

```powershell
git mv packages/testvault-importers packages/argos-importers
```

Verifier :
```powershell
Test-Path packages\argos-importers       # Attendu : True
Test-Path packages\testvault-importers   # Attendu : False
git status
# Attendu : renamed: packages/testvault-importers/* -> packages/argos-importers/*
```

---

## Etape 3 — Update package.json (5 fichiers : 1 self + 4 consumers)

### 3.1 — `packages/argos-importers/package.json` (self)

```diff
- "name": "@atconseil/testvault-importers",
+ "name": "@atconseil/argos-importers",
```

⚠ NE PAS toucher au champ `version` ni autres champs.

### 3.2 — Les 4 consumers

Update `dependencies` dans :
- `packages/testvault-cli/package.json`
- `apps/argos-extension/package.json`
- `apps/argos-functions/package.json`
- `tools/e2e/package.json`

```diff
- "@atconseil/testvault-importers": "workspace:*",
+ "@atconseil/argos-importers": "workspace:*",
```

⚠ **Preserver les prefixes** : si un fichier utilise `workspace:^` au lieu de `workspace:*`, garder le prefixe.

---

## Etape 4 — Update 6 imports source

Pour chaque fichier :
- `packages/testvault-cli/src/upload-results.test.ts`
- `packages/testvault-cli/src/upload-results.ts`
- `apps/argos-extension/src/hub/ImportWizard.test.tsx`
- `apps/argos-extension/src/hub/ImportWizard.tsx`
- `apps/argos-functions/src/webhooks/queue-processor.ts`
- `tools/e2e/tests/07-phase4-import-export-cli.spec.ts`

Remplacer :
```diff
- import { ... } from "@atconseil/testvault-importers"
+ import { ... } from "@atconseil/argos-importers"
```

⚠ Variantes :
- Double / single quotes
- `import type`
- `require`

⚠ **EXCLUS** : `tools/regression/CFG-2026-05-13-package-naming.test.ts` (traite Etape 5)

---

## Etape 5 — Update test regression naming convention

```diff
const ALLOWED_LEGACY_NAMES = new Set([
    // Legacy names accepted during the testvault-* -> argos-* migration wave.
    // Each future sprint will remove its entry as the package is renamed.
    // See Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4).
-   "@atconseil/testvault-importers",  // Sprint 6d: rename to argos-importers
    "@atconseil/testvault-exporters",  // Sprint 6e: rename to argos-exporters
    "@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
    "@atconseil/testvault-cli",        // Sprint 7a: rename to argos-cli
    "@atconseil/testpulse-ui-shared",  // Sprint 7b: rename to argos-detection-api
]);
```

Verifier le test reste vert :
```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# Attendu : 4/4 passing
```

---

## Etape 6 — pnpm install + validation

```powershell
pnpm install

# Verifier workspace
pnpm list -r --depth=0 | Select-String -Pattern "importers"
# Attendu : @atconseil/argos-importers

# Tests
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : PASSED

# Turbo
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
# Attendu : tous verts
```

### 6.1 — Self-check RESIDUAL

```powershell
Write-Host "=== Imports residuels testvault-importers (hors test naming) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" -and $_.FullName -notmatch "CFG-2026-05-13-package-naming" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-importers") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne

Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-importers") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne

# Verifier ALLOWED_LEGACY_NAMES restantes
Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern '"@atconseil/test'
# Attendu : 4 lignes (exporters, gherkin, cli, testpulse-ui-shared)
```

⚠ Si RESIDUAL trouve hors test naming, STOP.

### 6.2 — Verifier portfolio packages

```powershell
Get-ChildItem packages -Directory | Select-Object Name
# Attendu :
#   argos-importers     (NOUVEAU)
#   argos-sdk
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared
#   testvault-cli
#   testvault-exporters
#   testvault-gherkin
```

### 6.3 — Cleanup orphelins potentiels

⚠ Apres validation, verifier qu'il n'y a pas de dossier orphelin `packages/testvault-importers/` qui contiendrait des `dist/` ou `.turbo/` residuels :
```powershell
Test-Path packages\testvault-importers
# Attendu : False
# Si True : Remove-Item -Recurse -Force packages\testvault-importers
```

---

## Etape 7 — Update Specs/MIGRATION-PLAN.md

```diff
- | Sprint 6d | Renaming `testvault-importers` -> `argos-importers` | ~20 min | Faible (3 consommateurs) | Apres 6c |
+ | Sprint 6d | Renaming `testvault-importers` -> `argos-importers` | ~25 min | Faible (4 consommateurs, 6 fichiers source) | **DONE 2026-05-13** |
```

---

## Etape 8 — Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 6d: rename @atconseil/testvault-importers -> @atconseil/argos-importers"

pnpm changeset version
# Attendu : bump 0.4.12 -> 0.4.13
```

---

## Etape 9 — CHANGELOG entry

```markdown
## [0.4.13] - 2026-05-13

### Changed (Sprint 6d - feat/rename-testvault-importers-to-argos-importers)

- **`@atconseil/testvault-importers` renomme en `@atconseil/argos-importers`** (4eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-importers/` -> `packages/argos-importers/` (via `git mv`, historique preserve).
  - 4 consommateurs internes mis a jour :
    - `apps/argos-extension/package.json` + 2 fichiers source (ImportWizard.tsx, ImportWizard.test.tsx)
    - `apps/argos-functions/package.json` + 1 fichier (webhooks/queue-processor.ts)
    - `packages/testvault-cli/package.json` + 2 fichiers (upload-results.ts, upload-results.test.ts)
    - `tools/e2e/package.json` + 1 fichier (tests/07-phase4-import-export-cli.spec.ts)

### Changed (Sprint 6d)

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-importers"` de `ALLOWED_LEGACY_NAMES`. Liste contient maintenant 4 entrees restantes (exporters, gherkin, cli, testpulse-ui-shared).
- Test naming convention reste **4/4 passing**.

### Notes (Sprint 6d)

- Sprint court (~25 min). Methodologie identique aux precedents.
- Surface : 4 consommateurs, 6 fichiers source.
- Bump 0.4.12 -> 0.4.13.

### Backlog

- **Sprint 6e NEXT** : Renaming `testvault-exporters` -> `argos-exporters` (~2-3 consommateurs probables)
- Sprint 6f : Renaming `testvault-gherkin` -> `argos-gherkin`
- (autres items inchanges)
```

---

## Etape 10 — Archive prompt + commit

### 10.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6d.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6d.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6d.md
}
```

### 10.2 — Commit

```powershell
git add -A
git status

git commit `
  -m "feat(packages): rename @atconseil/testvault-importers -> @atconseil/argos-importers (Sprint 6d)" `
  -m "" `
  -m "4th sprint of the testvault-* -> argos-* renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- 4 package.json consumers: argos-extension, argos-functions, testvault-cli, tools/e2e" `
  -m "- 6 source files with import updates (distributed across the 4 consumers)" `
  -m "" `
  -m "Special handling: tools/regression/CFG-2026-05-13-package-naming.test.ts entry removed surgically." `
  -m "" `
  -m "TDD: ALLOWED_LEGACY_NAMES reduced from 5 to 4 entries. Test remains 4/4 passing." `
  -m "" `
  -m "No functional changes. Bump 0.4.12 -> 0.4.13 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)"

git push -u origin feat/rename-testvault-importers-to-argos-importers
```

PR.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-importers-to-argos-importers` creee depuis main a jour
- [ ] Snapshot validee : 4 consommateurs, 7 source files (1 exclu)
- [ ] Dossier renomme via `git mv`
- [ ] `package.json` du package : `"name": "@atconseil/argos-importers"`
- [ ] 4 consumers package.json updates
- [ ] 6 fichiers source updates
- [ ] Test regression : ligne `"@atconseil/testvault-importers"` retiree
- [ ] `ALLOWED_LEGACY_NAMES` contient 4 entrees restantes
- [ ] Aucun import RESIDUAL `@atconseil/testvault-importers`
- [ ] Aucun dossier orphelin `packages/testvault-importers/`
- [ ] `pnpm install` passe
- [ ] `pnpm turbo lint && typecheck && test && build` verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Test naming : 4/4 passing
- [ ] Suite regression : 51/51 passing
- [ ] MIGRATION-PLAN.md : Sprint 6d marque DONE
- [ ] CHANGELOG `[0.4.13]` cree
- [ ] Bump 0.4.12 -> 0.4.13
- [ ] Prompt archive
- [ ] Commit + PR

---

## Garde-fous Sprint 6d

⚠ **Risque #1 = test naming convention chaines litterales**
- Exclure CFG-2026-05-13-package-naming.test.ts du replace bulk
- str_replace chirurgical pour retirer l'entree

⚠ **Risque #2 = oublier tools/e2e**
- Grep doit inclure tools/

⚠ **Risque #3 = imports type-only oublies**
- Grep cherche la chaine `@atconseil/testvault-importers`, pas un motif `from "..."`

⚠ **Risque #4 = dossier orphelin testvault-importers post-rename**
- Verifier `Test-Path packages\testvault-importers` apres rename
- Si True : `Remove-Item -Recurse -Force` (residus dist/ + .turbo/)

⚠ **Risque #5 = scope creep vers 6e/6f**
- Sprint 6d = importers seulement

---

## Reporting utilisateur

Reporter a l'utilisateur **3 moments** :

1. **Apres Etape 1** (snapshot) :
   > "Snapshot : 4 consommateurs, 6 fichiers source (+1 exclu). Confirmation avant `git mv` ?"

2. **Apres Etape 5** (test regression) :
   > "Renaming des 4 package.json + 6 fichiers source termine. Test regression : entree ALLOWED_LEGACY_NAMES 'testvault-importers' retiree. Confirmation avant pnpm install ?"

3. **Apres Etape 6** (validation) :
   > "Validation : 0 RESIDUAL, lint/typecheck/test/build OK. Test naming 4/4. Pret a commit ?"

---

Quand commit + PR ouverte, dis-le-moi. Apres merge :
- Sync main, cleanup orphelin testvault-importers si necessaire
- **Sprint 6e** (testvault-exporters → argos-exporters) — surface estimee similaire ou plus reduite
