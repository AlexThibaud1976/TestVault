# Prompt Claude Code — Sprint 6c (`feat/rename-testvault-sdk-to-argos-sdk`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **renaming** : 3eme du Groupe 1. **Le plus large** du Groupe 1 a cause du SDK consomme partout.
> Methodologie identique aux Sprints 6a/6b mais avec garde-fou special sur le test naming convention.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (`working tree clean`)
- [ ] `git branch --show-current` = `main`
- [ ] `git log --oneline | Select-Object -First 3` montre TECH-DEBT-015A follow-up + Sprint 6b mergés
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] Windows Defender exclu sur `E:\Code\TestVault` (verifie utilisateur 2026-05-13)

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : 3eme sprint d'execution du renaming Groupe 1. Apres types (Sprint 6a) et wit-schema (Sprint 6b), on attaque `testvault-sdk` - le **package racine fonctionnel** consomme largement dans l'extension Argos.

**Surface d'impact reelle** (verifie en grep terrain 2026-05-13) :
- **5 package.json consommateurs** :
  1. `packages/testvault-cli/package.json`
  2. `packages/testvault-exporters/package.json`
  3. `apps/argos-extension/package.json`
  4. `apps/argos-functions/package.json`
  5. **`tools/e2e/package.json`** (decouvert TECH-DEBT-015A follow-up, premier sprint qui touche tools/)
- **48 fichiers source** avec import `@atconseil/testvault-sdk`, mais **1 est exclu** (test regression naming convention - chaine litterale)
- **47 fichiers a transformer effectivement**
- **Aucun import sub-path `/browser`** (le SDK exporte `./browser` mais 0 consommateur)

**Distribution des 47 imports** :
- testvault-cli : 5 fichiers
- testvault-exporters : 2 fichiers
- argos-extension : 31 fichiers (le gros morceau)
- argos-functions : 1 fichier
- tools/e2e : 6 fichiers

**Cibles du renaming** :
- Dossier : `packages/testvault-sdk/` -> `packages/argos-sdk/`
- Nom npm : `@atconseil/testvault-sdk` -> `@atconseil/argos-sdk`
- Imports dans 47 fichiers source : `from "@atconseil/testvault-sdk"` -> `from "@atconseil/argos-sdk"`
- Dependencies dans 5 package.json
- `ALLOWED_LEGACY_NAMES` dans le test naming convention : retirer l'entree

**Perimetre Sprint 6c** :
1. Snapshot des consommateurs (verification que les chiffres correspondent)
2. Rename dossier via `git mv`
3. Update `packages/argos-sdk/package.json` champ `name`
4. Update les 5 package.json consommateurs (dependencies)
5. Update 47 imports source
6. Retirer `"@atconseil/testvault-sdk"` de `ALLOWED_LEGACY_NAMES`
7. `pnpm install` (workspace refresh)
8. Validation complete
9. CHANGELOG + bump 0.4.11 -> 0.4.12
10. Update MIGRATION-PLAN.md (Sprint 6c DONE)
11. Commit + PR

**Hors scope** :
- Autres testvault-* (Sprints 6d-6f, 7a, 7b)
- Modification fonctionnelle
- Realignement versions (-> Sprint 8)

---

## ⚠ Garde-fou special : test naming convention

Le fichier `tools/regression/CFG-2026-05-13-package-naming.test.ts` apparaitra dans le grep des imports parce qu'il **contient la chaine litterale** `"@atconseil/testvault-sdk"` dans `ALLOWED_LEGACY_NAMES`.

**Action correcte** sur ce fichier :
- ✅ **Retirer** la ligne complete `"@atconseil/testvault-sdk", // Sprint 6c: rename to argos-sdk`
- ❌ **NE PAS** remplacer `testvault-sdk` par `argos-sdk` dans ce fichier

Si tu fais un replace global brut, tu transformes la chaine du test en `"@atconseil/argos-sdk"` ce qui :
1. Garde l'entree dans `ALLOWED_LEGACY_NAMES` (mauvais)
2. Casse la coherence (l'entree doit etre **retiree** au moment du rename)
3. Pourrait masquer une regression future

**Methodologie** :
1. Traiter d'abord les 5 package.json + 47 fichiers source (replace bulk OK)
2. **Excluant** explicitement `tools/regression/CFG-2026-05-13-package-naming.test.ts` du replace
3. Faire un `str_replace` chirurgical sur ce fichier pour retirer la ligne ALLOWED_LEGACY_NAMES

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-sdk-to-argos-sdk

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing
```

---

## Etape 1 — Snapshot consommateurs (sanity check final)

```powershell
Write-Host "=== Consommateurs package.json (testvault-sdk) ===" -ForegroundColor Cyan
$pkgConsumers = @()
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-sdk" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-sdk"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgConsumers += $_.FullName
    }
}
Write-Host "`nTotal package.json: $($pkgConsumers.Count) (attendu : 5)" -ForegroundColor Cyan

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
$sourceCount = 0
$sourceFiles = @()
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-sdk') {
        $sourceCount++
        $sourceFiles += $_.FullName
        if ($_.FullName -match "CFG-2026-05-13-package-naming") {
            Write-Host "  $($_.FullName) [EXCLU - test regression litteral]" -ForegroundColor Magenta
        } else {
            Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        }
    }
}
Write-Host "`nTotal imports source: $sourceCount (attendu : 48, dont 1 exclu = 47 a transformer)" -ForegroundColor Cyan

Write-Host "`n=== Sub-path /browser ?===" -ForegroundColor Cyan
$browserCount = 0
$sourceFiles | ForEach-Object {
    $content = Get-Content $_ -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-sdk/browser') {
        Write-Host "  $_" -ForegroundColor Red
        $browserCount++
    }
}
Write-Host "Sub-path /browser : $browserCount usage(s) (attendu : 0)" -ForegroundColor Cyan
```

**Attendus** :
- 5 package.json
- 48 imports source dont 1 exclu (CFG-2026-05-13-package-naming.test.ts)
- 0 sub-path /browser

⚠ **STOP si les chiffres different** :
- Si plus de package.json : grep a trouve un nouveau consommateur, l'inclure dans le sprint
- Si moins : un fichier a deja ete renomme, signaler
- Si sub-path /browser > 0 : etendre le replace pour le sub-path

### 1.1 — Reporter a l'utilisateur

> "Snapshot confirme : 5 consommateurs package.json, 47 fichiers source a transformer (+1 exclu = test regression), 0 sub-path /browser. Confirmation avant `git mv` ?"

---

## Etape 2 — Rename dossier via `git mv`

```powershell
git mv packages/testvault-sdk packages/argos-sdk
```

Verifier :
```powershell
Test-Path packages\argos-sdk      # Attendu : True
Test-Path packages\testvault-sdk  # Attendu : False
git status
# Attendu : renamed: packages/testvault-sdk/* -> packages/argos-sdk/*
```

---

## Etape 3 — Update package.json (6 fichiers : 1 self + 5 consumers)

### 3.1 — `packages/argos-sdk/package.json` (self)

```diff
- "name": "@atconseil/testvault-sdk",
+ "name": "@atconseil/argos-sdk",
```

⚠ **Garde-fou** : verifier que `exports` (incluant `./browser`) reste identique. Seul le `name` change.

### 3.2 — Les 5 consumers

**`apps/argos-extension/package.json`** :
```diff
- "@atconseil/testvault-sdk": "workspace:*",
+ "@atconseil/argos-sdk": "workspace:*",
```

**`apps/argos-functions/package.json`** : idem

**`packages/testvault-cli/package.json`** : idem (en preservant l'ordre alphabetique des deps si applicable)

**`packages/testvault-exporters/package.json`** : idem

**`tools/e2e/package.json`** : idem (attention au `workspace:^` pour exporters - ne touche que sdk ici)

⚠ **STOP si un de ces fichiers a un format `workspace:^` ou autre prefixe** pour testvault-sdk : preserver le prefixe.

---

## Etape 4 — Update 47 imports source

### 4.1 — Approche bulk avec exclusion

Identifier les 47 fichiers (les 48 du grep moins le test regression), puis pour chacun :

```typescript
// Remplace toutes les occurrences :
import { ... } from "@atconseil/testvault-sdk"
// par :
import { ... } from "@atconseil/argos-sdk"
```

⚠ **Variantes a couvrir** :
- `from "@atconseil/testvault-sdk"` (standard)
- `from '@atconseil/testvault-sdk'` (single quotes)
- `import type { ... } from "@atconseil/testvault-sdk"` (type-only)
- `require("@atconseil/testvault-sdk")` (rare)
- `from "@atconseil/testvault-sdk/browser"` (sub-path - normalement 0 mais filet)

### 4.2 — Liste des 47 fichiers a transformer (selon snapshot)

**Dans packages/testvault-cli** (5 fichiers, ce package sera renomme Sprint 7a mais ses imports doivent etre updates maintenant) :
- src/bdd-sync.test.ts
- src/bdd-sync.ts
- src/cli.ts
- src/upload-results.test.ts
- src/upload-results.ts

**Dans packages/testvault-exporters** (2 fichiers) :
- src/matrix-export.test.ts
- src/matrix-export.ts

**Dans apps/argos-extension/src** (31 fichiers) :
- hub/ai-settings-store-adapter.ts
- hub/CoverageMatrix.test.tsx
- hub/CoverageMatrix.tsx
- hub/CoveragePanel.test.tsx
- hub/CoveragePanel.tsx
- hub/CreateBugForm.test.tsx
- hub/CreateBugForm.tsx
- hub/EnvironmentSettings.test.tsx
- hub/EnvironmentSettings.tsx
- hub/ExecutionHistory.test.tsx
- hub/ExecutionHistory.tsx
- hub/extension-data-store.ts
- hub/InstallWizard.test.tsx
- hub/InstallWizard.tsx
- hub/PreconditionForm.test.tsx
- hub/PreconditionForm.tsx
- hub/RunInterface.test.tsx
- hub/RunInterface.tsx
- hub/services.ts
- hub/SnapshotDiffPanel.test.tsx
- hub/SnapshotDiffPanel.tsx
- hub/SnapshotPanel.test.tsx
- hub/SnapshotPanel.tsx
- hub/TestCaseForm.test.tsx
- hub/TestCaseForm.tsx
- hub/TestPlanForm.test.tsx
- hub/TestPlanForm.tsx
- hub/TestSetForm.test.tsx
- hub/TestSetForm.tsx
- hub/WorkItemLinkPanel.test.tsx
- hub/WorkItemLinkPanel.tsx
- test-utils/mock-services.ts
- widgets/coverage-panel/index.tsx

**Dans apps/argos-functions/src** (1 fichier) :
- webhooks/queue-processor.ts

**Dans tools/e2e** (6 fichiers) :
- fixtures/index.ts
- tests/02-test-case.spec.ts
- tests/03-test-set.spec.ts
- tests/04-test-plan.spec.ts
- tests/05-precondition.spec.ts
- tests/06-phase3-traceability.spec.ts

**Exclu de transformation** :
- ⚠️ `tools/regression/CFG-2026-05-13-package-naming.test.ts` (chaine litterale, traite Etape 5)

### 4.3 — Strategie recommandee

Pour chaque fichier, utiliser `str_replace` pour cibler precisement la chaine `@atconseil/testvault-sdk`. Eviter les regex globales sur tout le repo.

---

## Etape 5 — Update test regression naming convention

### 5.1 — Editer `tools/regression/CFG-2026-05-13-package-naming.test.ts`

Retirer l'entree `"@atconseil/testvault-sdk"` :

```diff
const ALLOWED_LEGACY_NAMES = new Set([
    // Legacy names accepted during the testvault-* -> argos-* migration wave.
    // Each future sprint will remove its entry as the package is renamed.
    // See Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4).
-   "@atconseil/testvault-sdk",        // Sprint 6c: rename to argos-sdk
    "@atconseil/testvault-importers",  // Sprint 6d: rename to argos-importers
    "@atconseil/testvault-exporters",  // Sprint 6e: rename to argos-exporters
    "@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
    "@atconseil/testvault-cli",        // Sprint 7a: rename to argos-cli
    "@atconseil/testpulse-ui-shared",  // Sprint 7b: rename to argos-detection-api
]);
```

⚠ **NE PAS modifier d'autre ligne** dans ce fichier. Pas de transformation de chaine.

### 5.2 — Verifier que le test reste vert

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# Attendu : 4/4 passing (5 entrees restantes dans ALLOWED_LEGACY_NAMES)
```

---

## Etape 6 — pnpm install + validation

```powershell
pnpm install
```

Attendu : pas d'erreur. Workspace updated avec `@atconseil/argos-sdk`.

```powershell
# Verifier workspace
pnpm list -r --depth=0 | Select-String -Pattern "sdk"
# Attendu : @atconseil/argos-sdk (PAS testvault-sdk)

# Suite complete regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED

# Turbo (le plus critique - le SDK est consomme partout, tout doit typer)
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
# Attendu : tous verts
```

⚠ **Si typecheck echoue** : probable cache `.turbo/` obsolete. Essayer :
```powershell
pnpm turbo typecheck --force
```

### 6.1 — Self-check RESIDUAL

```powershell
# Aucun import testvault-sdk reste actif (hors test regression litteral)
Write-Host "=== Recherche imports residuels testvault-sdk ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" -and $_.FullName -notmatch "CFG-2026-05-13-package-naming" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-sdk") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Aucun package.json reste avec testvault-sdk
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-sdk") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Verifier que test regression a toujours ses 5 entrees ALLOWED_LEGACY (sans sdk)
Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern '"@atconseil/test'
# Attendu : 5 lignes (importers, exporters, gherkin, cli, testpulse-ui-shared)
```

⚠ **Si RESIDUAL trouve hors test naming**, STOP. Probable cause : import oublie ou variante non-couverte.

### 6.2 — Verifier que les autres packages sont preserves

```powershell
Get-ChildItem packages -Directory | Select-Object Name
# Attendu :
#   argos-sdk            (NOUVEAU)
#   argos-types
#   argos-wit-schema
#   testpulse-ui-shared
#   testvault-cli
#   testvault-exporters
#   testvault-gherkin
#   testvault-importers
```

---

## Etape 7 — Update Specs/MIGRATION-PLAN.md

Mettre a jour le tableau Section 3 :

```diff
- | Sprint 6c | Renaming `testvault-sdk` -> `argos-sdk` | ~30 min | Moyen (4 consommateurs) | Apres 6b |
+ | Sprint 6c | Renaming `testvault-sdk` -> `argos-sdk` | ~45 min | Moyen (5 consommateurs, 47 fichiers source) | **DONE 2026-05-13** |
```

---

## Etape 8 — Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 6c: rename @atconseil/testvault-sdk -> @atconseil/argos-sdk (5 consumers, 47 source files)"

pnpm changeset version
# Attendu : bump argos-extension 0.4.11 -> 0.4.12
```

---

## Etape 9 — CHANGELOG entry

```markdown
## [0.4.12] - 2026-05-13

### Changed (Sprint 6c - feat/rename-testvault-sdk-to-argos-sdk)

- **`@atconseil/testvault-sdk` renomme en `@atconseil/argos-sdk`** (3eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-sdk/` -> `packages/argos-sdk/` (via `git mv`, historique preserve).
  - 5 consommateurs internes mis a jour :
    - `apps/argos-extension/package.json` + 31 fichiers source (CoverageMatrix, CoveragePanel, services, hub forms, etc.)
    - `apps/argos-functions/package.json` + 1 fichier (webhooks/queue-processor.ts)
    - `packages/testvault-cli/package.json` + 5 fichiers (bdd-sync, cli, upload-results)
    - `packages/testvault-exporters/package.json` + 2 fichiers (matrix-export)
    - `tools/e2e/package.json` + 6 fichiers (fixtures, tests 02-06) [premier sprint qui touche tools/*]
  - Total : **48 fichiers** (5 package.json + 47 imports source modifies, +1 test regression chaine litterale ajustee).

### Changed (Sprint 6c)

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-sdk"` de `ALLOWED_LEGACY_NAMES`. Liste contient maintenant 5 entrees restantes (importers, exporters, gherkin, cli, testpulse-ui-shared).
- Test naming convention reste **4/4 passing**.

### Notes (Sprint 6c)

- Sprint le plus large du Groupe 1 (5 consommateurs, 47 imports source).
- Premier sprint qui touche `tools/*` (tools/e2e). Grace au TECH-DEBT-015A follow-up, le grep a inclus `tools/`.
- Windows Defender exclu sur le repo : pas d'incident corruption d'index comme Sprint 6b.
- `git mv` pour preserver l'historique git.
- Bump 0.4.11 -> 0.4.12 (patch : renaming sans changement fonctionnel).

### Backlog

- **Sprint 6d NEXT** : Renaming `testvault-importers` -> `argos-importers` (3 consommateurs : argos-extension, argos-functions, tools/e2e + le cli si nourricier)
- Sprint 6e : Renaming `testvault-exporters` -> `argos-exporters` (2 consommateurs)
- Sprint 6f : Renaming `testvault-gherkin` -> `argos-gherkin` (3 consommateurs)
- Sprint 6g : Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` (0 consommateur)
- Sprint 6h : Renaming `testvault-e2e` -> `argos-e2e` (0 consommateur)
- Sprint 7a : Renaming `testvault-cli` -> `argos-cli`
- Sprint 7b : Renaming `testpulse-ui-shared` -> `argos-detection-api`

### Lessons learned (Sprint 6c)

- **Le grep doit toujours inclure `packages/`, `apps/`, ET `tools/`**. Cette discipline (codifie post-Sprint 6b) a evite d'oublier `tools/e2e/package.json` + 6 fichiers tests E2E.
- **Le test regression naming convention demande un traitement special** : il contient les chaines `testvault-*` litterales, donc un replace global brut le casse. La regle : exclure ce fichier du replace bulk, puis traitement chirurgical pour retirer une entree.
- **Defender exclu = pas d'incident corruption d'index**. Comparaison avec Sprint 6b : zero `Move-Item` de secours, `git mv` fonctionne directement.
```

---

## Etape 10 — Archive prompt + commit

### 10.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6c.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6c.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6c.md
}
```

### 10.2 — Commit

```powershell
git add -A
git status
# Verifier les fichiers staged :
#   - renamed: packages/testvault-sdk/* -> packages/argos-sdk/*
#   - modified: packages/argos-sdk/package.json (name)
#   - modified: 5 consumers package.json
#   - modified: 47 source files (imports)
#   - modified: tools/regression/CFG-2026-05-13-package-naming.test.ts (ALLOWED_LEGACY)
#   - modified: Specs/MIGRATION-PLAN.md (DONE marker)
#   - modified: CHANGELOG.md ([0.4.12])
#   - .changeset/*.md
#   - tools/claude-prompts/CLAUDE_TASK_sprint-6c.md

git commit `
  -m "feat(packages): rename @atconseil/testvault-sdk -> @atconseil/argos-sdk (Sprint 6c)" `
  -m "" `
  -m "3rd sprint of the testvault-* -> argos-* renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Surface (verified via grep terrain):" `
  -m "- 5 package.json consumers: argos-extension, argos-functions, testvault-cli," `
  -m "  testvault-exporters, tools/e2e (first sprint touching tools/*)" `
  -m "- 47 source files with import updates (distributed across the 5 consumers)" `
  -m "- 0 sub-path /browser usage (the SDK exports ./browser but no consumer uses it)" `
  -m "" `
  -m "Special handling: tools/regression/CFG-2026-05-13-package-naming.test.ts contains" `
  -m "the literal string '@atconseil/testvault-sdk' in ALLOWED_LEGACY_NAMES (not an import)." `
  -m "Action: surgical remove of the entry, no string transformation." `
  -m "" `
  -m "TDD: ALLOWED_LEGACY_NAMES in CFG-2026-05-13-package-naming reduced from 6 to 5" `
  -m "entries. Test remains 4/4 passing." `
  -m "" `
  -m "Methodology improvements applied this sprint:" `
  -m "- Defender exclusion on repo prevents index corruption (vs Sprint 6b incident)" `
  -m "- Grep explicit on packages/, apps/, AND tools/ (vs Sprint 6b miss)" `
  -m "" `
  -m "No functional changes to Argos extension." `
  -m "Bump 0.4.11 -> 0.4.12 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)"

git push -u origin feat/rename-testvault-sdk-to-argos-sdk
```

PR.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-sdk-to-argos-sdk` creee depuis main a jour
- [ ] Snapshot validee : 5 consommateurs package.json, 48 source files (1 exclu = test regression litteral)
- [ ] Dossier renomme via `git mv` : `packages/argos-sdk/`
- [ ] `package.json` du package : `"name": "@atconseil/argos-sdk"`
- [ ] 5 consumers package.json updates
- [ ] 47 fichiers source updates (47 imports `@atconseil/testvault-sdk` transformes)
- [ ] `tools/regression/CFG-2026-05-13-package-naming.test.ts` : ligne `"@atconseil/testvault-sdk"` **retiree** (pas transformee)
- [ ] `ALLOWED_LEGACY_NAMES` contient maintenant 5 entrees (importers, exporters, gherkin, cli, testpulse-ui-shared)
- [ ] Aucun import RESIDUAL `@atconseil/testvault-sdk` dans le code (hors test naming si encore present par erreur)
- [ ] `pnpm install` passe sans erreur
- [ ] `pnpm turbo lint && typecheck && test && build` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` 0 mojibake
- [ ] Test naming convention : 4/4 passing
- [ ] Suite regression : 51/51 passing
- [ ] MIGRATION-PLAN.md : Sprint 6c marque DONE
- [ ] CHANGELOG `[0.4.12]` cree
- [ ] Bump 0.4.11 -> 0.4.12 via Changesets
- [ ] Prompt archive
- [ ] Commit + PR

---

## Garde-fous Sprint 6c

⚠ **Risque #1 = casser le test naming convention en transformant les chaines litterales**
- Si on fait un replace global brut "testvault-sdk" -> "argos-sdk", le test ALLOWED_LEGACY_NAMES sera corrompu
- Action explicite : exclure `tools/regression/CFG-2026-05-13-package-naming.test.ts` du replace bulk, puis traiter par str_replace chirurgical

⚠ **Risque #2 = oublier tools/e2e** (8 fichiers : 1 package.json + 6 specs + 1 fixtures)
- Le grep doit explicitement inclure `tools/`
- Self-check RESIDUAL aussi sur `tools/`

⚠ **Risque #3 = imports type-only oublies**
- `import type { ... } from "@atconseil/testvault-sdk"` peut etre rate par un regex naïf
- Grep doit chercher la chaine seule, pas le motif `from "..."`

⚠ **Risque #4 = sub-path /browser**
- Snapshot a montre 0 usage mais filet : si une variante apparait, la traiter aussi
- Le SDK garde son export `./browser` (rien a changer dans son package.json)

⚠ **Risque #5 = cache typecheck obsolete apres rename massif**
- Si typecheck echoue : `pnpm turbo typecheck --force` ou suppression `.turbo/` cache

⚠ **Risque #6 = scope creep vers Sprint 6d**
- Sprint 6c = sdk uniquement. Pas de pre-renaming d'importers.

⚠ **Risque #7 = manifest/workflow CI**
- `Select-String -Path .github\workflows\*.yml -Pattern "testvault-sdk"` doit retourner 0 ligne
- (Probablement OK, mais verifier)

---

## Reporting utilisateur

Reporter a l'utilisateur **3 moments critiques** :

1. **Apres Etape 1** (snapshot) :
   > "Snapshot : 5 consommateurs, 48 imports source (47 a transformer + 1 exclu = test regression), 0 sub-path /browser. Confirmation avant `git mv` ?"

2. **Apres Etape 5** (test regression updated) :
   > "Renaming des 5 package.json + 47 fichiers source termine. Test regression : entree ALLOWED_LEGACY_NAMES 'testvault-sdk' retiree (pas transformee). Confirmation avant pnpm install + validation ?"

3. **Apres Etape 6** (validation complete) :
   > "Validation : 0 RESIDUAL, lint/typecheck/test/build OK, test naming 4/4. Pret a commit ?"

---

Quand commit + PR ouverte, dis-le-moi. **Pause recommandee 5-10 min** apres ce sprint (le plus large du Groupe 1) puis Sprint 6d (importers, 3 consommateurs : argos-extension, argos-functions, tools/e2e, + interne via cli).
