# Prompt Claude Code -- Sprint 8 (`chore/sprint-8-versioning-alignement`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **versioning + rename racine** (~40 min).
> Specificite : alignement de **14 packages** sur version **0.5.0** + mode **Changesets fixed** + rename racine `testvault` -> `argos` + test regression versioning.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] TECH-DEBT-027 merge visible
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 53 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

Si l'un echoue -> STOP.

---

## Contexte

Apres le renaming testvault -> argos complet (11 sprints) + TECH-DEBT-027 (encoding hygiene), Sprint 8 **aligne le versioning** de tous les packages livrables.

**Probleme** : versions desalignees post-rebrand (snapshot 2026-05-14) :
- `argos-extension` : 0.4.22 (bumpe pendant le rebrand)
- Packages internes : 0.3.2 a 0.3.4 (disparates)
- `argos-azure-pipelines-task` : 1.0.0 (placeholder ancien)
- Root `testvault` : 0.3.2 (nom du repo encore "testvault" + version basse)
- Changesets en mode `independent` (chaque package versionne separement)

**Solution** :
1. **Mode Changesets fixed** : tous les packages livrables versionnes ensemble
2. **Cible 0.5.0** : signal "nouvelle ere post-rebrand" (entre 0.4.x transition et 1.0.0 future GA)
3. **Renommer racine** `testvault` -> `argos` (coherence finale avec le rebrand)
4. **Test regression** : un test verifiera que tous les packages du fixed group ont la meme version

**Decisions actees (2026-05-14)** :

| # | Element | Choix |
|---|---|---|
| D1 | Mode Changesets | **fixed** (Option A : un seul groupe) |
| D2 | Version cible alignee | **0.5.0** |
| D3 | Renommer racine `testvault` -> `argos` | **OUI** (inclus dans ce sprint) |
| D4 | `argos-azure-pipelines-task` 1.0.0 -> 0.5.0 | **OUI** (regression visible, mais task non publiee donc OK) |
| D5 | Test regression versioning | **OUI** (nouveau test fixed-version-consistency) |
| D6 | Exclus du fixed | `@atconseil/regression-suite` (outil dev, version 0.1.0 reste) |
| D7 | `docs-site` dans le fixed | **OUI** (suit le versioning produit) |
| D8 | `task.json` version field Marketplace ADO | **INCHANGE** (reste `{1,0,0}`, sa propre semantique) |

---

## Composition exacte du fixed group (14 packages)

| # | Package | Path | Version actuelle | Version cible |
|---|---|---|---|---|
| 1 | racine renommee `argos` | `package.json` | `testvault@0.3.2` | `argos@0.5.0` |
| 2 | `argosTesting` | `apps/argos-extension/package.json` | 0.4.22 | 0.5.0 |
| 3 | `@atconseil/argos-cli` | `packages/argos-cli/package.json` | 0.3.4 | 0.5.0 |
| 4 | `@atconseil/argos-detection-api` | `packages/argos-detection-api/package.json` | 0.3.2 | 0.5.0 |
| 5 | `@atconseil/argos-exporters` | `packages/argos-exporters/package.json` | 0.3.3 | 0.5.0 |
| 6 | `@atconseil/argos-gherkin` | `packages/argos-gherkin/package.json` | 0.3.2 | 0.5.0 |
| 7 | `@atconseil/argos-importers` | `packages/argos-importers/package.json` | 0.3.2 | 0.5.0 |
| 8 | `@atconseil/argos-sdk` | `packages/argos-sdk/package.json` | 0.3.4 | 0.5.0 |
| 9 | `@atconseil/argos-types` | `packages/argos-types/package.json` | 0.3.2 | 0.5.0 |
| 10 | `@atconseil/argos-wit-schema` | `packages/argos-wit-schema/package.json` | 0.3.3 | 0.5.0 |
| 11 | `argos-functions` | `apps/argos-functions/package.json` | 0.3.4 | 0.5.0 |
| 12 | `@atconseil/argos-azure-pipelines-task` | `tools/azure-pipelines-task/package.json` | 1.0.0 | 0.5.0 |
| 13 | `@atconseil/argos-e2e` | `tools/e2e/package.json` | 0.3.4 | 0.5.0 |
| 14 | `docs-site` | `apps/docs-site/package.json` | 0.3.2 | 0.5.0 |

**Exclus** :
- `@atconseil/regression-suite` (`tools/regression/package.json` : 0.1.0 reste, outil dev)

**Aussi inchanges** :
- `tools/azure-pipelines-task/task.json` champ `version: {Major:1, Minor:0, Patch:0}` (semantique Marketplace ADO independante)
- `apps/argos-extension/vss-extension.json` champ `version` (suit `package.json` automatiquement)

---

## Garde-fous Sprint 8

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : Rename racine ne casse pas le monorepo
Le `package.json` racine contient probablement `"name": "testvault"` et est reference dans :
- `pnpm-workspace.yaml` (peu probable, c'est par glob)
- Les scripts qui appellent `pnpm --filter testvault ...` (a verifier)
- `turbo.json` (peu probable)

**Verification** :
```powershell
Select-String -Path package.json -Pattern '"name"'
# Avant : "name": "testvault"
# Apres : "name": "argos"

# Cherche les usages de "testvault" comme nom de package racine (filter)
Get-ChildItem -Recurse -Include *.json,*.yml,*.yaml,*.cjs,*.mjs,*.ts -Path . | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|\.turbo" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match '"testvault"' -or $c -match 'filter testvault[^-]' -or $c -match 'pnpm --filter testvault\b') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
```

### Garde-fou #3 : NE PAS toucher au test regression naming convention
Le test `tools/regression/CFG-2026-05-13-package-naming.test.ts` enforce que les packages dans `packages/` ont le prefixe `argos-*`. Le racine `argos` (sans prefixe `@atconseil/argos-`) doit etre **explicitement accepte** par ce test. Verifier que le test ne casse pas.

### Garde-fou #4 : Bump 1.0.0 -> 0.5.0 (regression visible)
Le `tools/azure-pipelines-task/package.json` passe de 1.0.0 a 0.5.0. C'est une **regression de version visible**. Decision validee (task non publiee, version 1.0.0 etait un placeholder). Documenter clairement dans le CHANGELOG.

### Garde-fou #5 : updateInternalDependencies
Le `.changeset/config.json` actuel a `"updateInternalDependencies": "patch"`. Quand on aligne en 0.5.0, les dependances internes (workspace:*) restent en workspace:*, donc pas d'impact. Mais verifier qu'aucun consommateur n'a une dependance hard-coded sur une version (e.g. `"^0.3.4"` au lieu de `workspace:*`).

```powershell
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    # Cherche les versions hard-coded "^0.3.x" ou similaires sur @atconseil/argos-*
    if ($c -match '"@atconseil/argos-[a-z-]+": "\^?0\.') {
        Write-Host "  $($_.FullName) : dependances hard-coded" -ForegroundColor Yellow
        Select-String -Path $_.FullName -Pattern '@atconseil/argos-[a-z-]+": "\^?0\.' | ForEach-Object {
            Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
        }
    }
}
# Attendu : 0 ligne (toutes les deps internes sont workspace:* ou workspace:^)
```

### Garde-fou #6 : changeset version bump alignement
Apres modification du config.json `fixed` group, lancer un `pnpm changeset` pour creer un changeset "major" temporaire qui force le bump 0.5.0. **OU** modifier les `version` directement dans les package.json (plus simple pour un alignement manuel).

**Choix retenu** : modifier directement les `version` (plus simple, pas besoin de Changesets pour cet alignement initial).

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b chore/sprint-8-versioning-alignement

pnpm install
pnpm --filter @atconseil/regression-suite test
# 53 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== 1. Versions actuelles (table complete) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $pkg = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $shortPath = $_.FullName.Replace("E:\Code\TestVault\", "").Replace("\package.json", "")
    Write-Host "  $shortPath : name=$($pkg.name) version=$($pkg.version)"
}
Write-Host "Racine :" -ForegroundColor Cyan
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  name=$($root.name) version=$($root.version)"

Write-Host "`n=== 2. Config Changesets ===" -ForegroundColor Cyan
Get-Content .changeset\config.json

Write-Host "`n=== 3. Dependances hard-coded sur argos-* ?===" -ForegroundColor Cyan
$hardCodedFound = $false
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($c -match '"@atconseil/argos-[a-z-]+": "\^?[0-9]') {
        Write-Host "  $($_.FullName)" -ForegroundColor Red
        $hardCodedFound = $true
    }
}
if (-not $hardCodedFound) {
    Write-Host "  OK : aucune dependance hard-coded" -ForegroundColor Green
}

Write-Host "`n=== 4. Usages 'testvault' comme nom racine (scripts/filter) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.json,*.yml,*.yaml,*.cjs,*.mjs,*.ts -Path . -Depth 3 | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|\.turbo|claude-prompts|CHANGELOG|MIGRATION-PLAN|MONOREPO|PHASE-0-GAPS|tasks\.md|CLAUDE\.md|constitution\.md|plan\.md|spec\.md" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match 'filter testvault\b' -or $c -match 'pnpm --filter testvault[^-]' -or ($_.Name -eq "package.json" -and $c -match '"name":\s*"testvault"')) {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        Select-String -Path $_.FullName -Pattern 'testvault' -Encoding UTF8 | Select-Object -First 3 | ForEach-Object {
            Write-Host "    L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
        }
    }
}
```

### 1.1 -- Reporter

> "Snapshot OK. 14 packages a bumper vers 0.5.0, racine a renommer testvault -> argos. X dependances hard-coded detectees. Confirmation avant modifications ?"

⚠ Si dependances hard-coded trouvees -> les noter, et les remplacer par `workspace:*` durant l'execution.

---

## Etape 2 -- Renommer racine `testvault` -> `argos` (D3)

### 2.1 -- Modifier `package.json` racine

```diff
- "name": "testvault",
+ "name": "argos",
- "version": "0.3.2",
+ "version": "0.5.0",
```

### 2.2 -- Verifier les references

```powershell
# Apres modification
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  Racine : name=$($root.name) version=$($root.version)"

# Verifier qu'aucun script ne reference "testvault" comme filter racine
pnpm preflight
# Le script preflight tournait avant "testvault preflight" -> doit maintenant tourner "argos preflight"
# Si erreur, c'est un script qui filter par nom
```

⚠ **Si `pnpm preflight` echoue** apres le rename de la racine, investiguer. Probablement un `package.json` script qui a `"preflight": "node tools/preflight/..."` au niveau racine. Le script tourne sous le nom du package donc apres rename, le tag change de "testvault@0.3.2 preflight" en "argos@0.5.0 preflight". Pas de probleme fonctionnel.

---

## Etape 3 -- Bump des 13 autres packages a 0.5.0

Modifier le champ `version` dans chacun :

### 3.1 -- packages/

```diff
# packages/argos-cli/package.json
- "version": "0.3.4",
+ "version": "0.5.0",
```

Idem pour :
- `packages/argos-detection-api/package.json` : 0.3.2 -> 0.5.0
- `packages/argos-exporters/package.json` : 0.3.3 -> 0.5.0
- `packages/argos-gherkin/package.json` : 0.3.2 -> 0.5.0
- `packages/argos-importers/package.json` : 0.3.2 -> 0.5.0
- `packages/argos-sdk/package.json` : 0.3.4 -> 0.5.0
- `packages/argos-types/package.json` : 0.3.2 -> 0.5.0
- `packages/argos-wit-schema/package.json` : 0.3.3 -> 0.5.0

### 3.2 -- apps/

- `apps/argos-extension/package.json` : 0.4.22 -> 0.5.0
- `apps/argos-functions/package.json` : 0.3.4 -> 0.5.0
- `apps/docs-site/package.json` : 0.3.2 -> 0.5.0

### 3.3 -- tools/ (sauf regression-suite)

- `tools/azure-pipelines-task/package.json` : 1.0.0 -> 0.5.0 **(regression visible, intentionnel)**
- `tools/e2e/package.json` : 0.3.4 -> 0.5.0

### 3.4 -- INCHANGES (verifier)

- `tools/regression/package.json` : reste 0.1.0
- `tools/azure-pipelines-task/task.json` champ `version` : reste `{Major:1, Minor:0, Patch:0}` (Marketplace ADO)
- `apps/argos-extension/vss-extension.json` : peut suivre 0.5.0 automatiquement (sinon a aligner manuellement)

### 3.5 -- Verification

```powershell
Write-Host "=== Versions apres bump ===" -ForegroundColor Cyan
$expected = "0.5.0"
$mismatch = @()
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "regression\\package.json" } | ForEach-Object {
    $pkg = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkg.version -ne $expected) {
        $mismatch += "  $($_.FullName) : $($pkg.version)"
    }
}
$rootPkg = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
if ($rootPkg.version -ne $expected) {
    $mismatch += "  package.json (racine) : $($rootPkg.version)"
}

if ($mismatch.Count -gt 0) {
    Write-Host "STOP : packages non alignes :" -ForegroundColor Red
    $mismatch | ForEach-Object { Write-Host $_ -ForegroundColor Red }
} else {
    Write-Host "  14 packages a 0.5.0. Aligne." -ForegroundColor Green
}
```

⚠ Si mismatch, STOP.

---

## Etape 4 -- Update vss-extension.json (si necessaire)

`apps/argos-extension/vss-extension.json` contient probablement un champ `version` qu'il faut aligner manuellement (Changesets ne le gere pas).

```powershell
Get-Content apps\argos-extension\vss-extension.json | Select-String -Pattern '"version"'
```

Si version != 0.5.0 :
```diff
- "version": "0.4.22",
+ "version": "0.5.0",
```

---

## Etape 5 -- Update Changesets config (mode fixed)

`.changeset/config.json` :

```diff
  {
        "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
        "changelog": "@changesets/cli/changelog",
        "commit": false,
-       "fixed": [],
+       "fixed": [
+               [
+                       "argos",
+                       "argosTesting",
+                       "argos-functions",
+                       "docs-site",
+                       "@atconseil/argos-cli",
+                       "@atconseil/argos-detection-api",
+                       "@atconseil/argos-exporters",
+                       "@atconseil/argos-gherkin",
+                       "@atconseil/argos-importers",
+                       "@atconseil/argos-sdk",
+                       "@atconseil/argos-types",
+                       "@atconseil/argos-wit-schema",
+                       "@atconseil/argos-azure-pipelines-task",
+                       "@atconseil/argos-e2e"
+               ]
+       ],
        "linked": [],
        "access": "public",
        "baseBranch": "main",
        "updateInternalDependencies": "patch",
-       "ignore": []
+       "ignore": ["@atconseil/regression-suite"]
  }
```

⚠ **Le fixed group contient 14 packages** (les memes que dans le tableau de l'Etape 0).

⚠ Ajout de `ignore` : explicite que `regression-suite` est volontairement hors du versioning produit.

---

## Etape 6 -- Test regression versioning (D5)

Creer `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * CFG-2026-05-14-fixed-versioning.test.ts
 *
 * Verifies that all packages in the Changesets fixed group share the same version.
 *
 * Context: Sprint 8 (2026-05-14) introduced Changesets fixed mode to keep
 * all argos product packages aligned on the same version. This test prevents
 * accidental drift between packages (e.g. if someone manually bumps one
 * without the others).
 *
 * Excluded from fixed group:
 * - @atconseil/regression-suite (internal dev tool, versioned independently)
 *
 * See Specs/MIGRATION-PLAN.md and .changeset/config.json.
 */

const REPO_ROOT = resolve(__dirname, "..", "..");

const FIXED_GROUP_PATHS = [
        "package.json",  // root (argos)
        "apps/argos-extension/package.json",
        "apps/argos-functions/package.json",
        "apps/docs-site/package.json",
        "packages/argos-cli/package.json",
        "packages/argos-detection-api/package.json",
        "packages/argos-exporters/package.json",
        "packages/argos-gherkin/package.json",
        "packages/argos-importers/package.json",
        "packages/argos-sdk/package.json",
        "packages/argos-types/package.json",
        "packages/argos-wit-schema/package.json",
        "tools/azure-pipelines-task/package.json",
        "tools/e2e/package.json",
];

function readPackageJson(relativePath: string): { name: string; version: string } {
        const full = join(REPO_ROOT, relativePath);
        const content = readFileSync(full, "utf-8");
        const pkg = JSON.parse(content);
        return { name: pkg.name, version: pkg.version };
}

describe("CFG-2026-05-14-fixed-versioning", () => {
        it("all packages in the fixed group share the same version", () => {
                const packages = FIXED_GROUP_PATHS.map((p) => ({
                        path: p,
                        ...readPackageJson(p),
                }));

                const versions = new Set(packages.map((p) => p.version));

                if (versions.size > 1) {
                        const grouped = packages.map((p) => `  ${p.path} (${p.name}) : ${p.version}`).join("\n");
                        throw new Error(
                                `Fixed group versioning drift detected. All packages should share the same version.\n${grouped}\n\nCheck .changeset/config.json fixed array and run 'pnpm changeset version'.`
                        );
                }

                expect(versions.size).toBe(1);
        });

        it("the fixed version matches the root package.json", () => {
                const rootVersion = readPackageJson("package.json").version;
                const allPackages = FIXED_GROUP_PATHS.map((p) => readPackageJson(p));
                for (const pkg of allPackages) {
                        expect(pkg.version).toBe(rootVersion);
                }
        });

        it("root package.json name is 'argos' (Sprint 8 rename)", () => {
                const root = readPackageJson("package.json");
                expect(root.name).toBe("argos");
        });

        it("regression-suite is correctly excluded from fixed group", () => {
                const reg = readPackageJson("tools/regression/package.json");
                expect(reg.name).toBe("@atconseil/regression-suite");
                // Sa version est intentionnellement independante (0.1.0)
                expect(reg.version).not.toBe(readPackageJson("package.json").version);
        });
});
```

---

## Etape 7 -- Update tests regression naming convention

⚠ Si le test `tools/regression/CFG-2026-05-13-package-naming.test.ts` enforce que tous les packages dans `packages/` ont le prefixe `argos-*`, il doit aussi **accepter explicitement** le package racine `argos` (sans prefixe `@atconseil/`).

Verifier :
```powershell
Get-Content tools\regression\CFG-2026-05-13-package-naming.test.ts | Select-Object -First 60
```

Si necessaire, ajuster le test pour accepter `argos` (racine) ou `argosTesting` (extension) comme exceptions valides.

---

## Etape 8 -- Validation

```powershell
pnpm install
# Workspace refresh

# Tests regression (54 attendu maintenant)
pnpm --filter @atconseil/regression-suite test
# Attendu : 54 passing (53 + 4 nouveaux fixed-versioning - mais ces 4 sont dans 1 fichier)
# En realite : 53 -> 53 + 1 fichier (4 tests) = 57. Ajuster selon ce que Vitest compte.

# Mojibake
node tools\regression\scan-mojibake.cjs
# 0 file

# Pre-flight (script s'appelle maintenant "argos preflight" au lieu de "testvault preflight")
pnpm preflight
# PASSED

# Turbo avec --force
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts
```

### 8.1 -- Self-check final

```powershell
Write-Host "=== JALON : tous les packages a 0.5.0 ?===" -ForegroundColor Cyan
$allAligned = $true
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "regression\\package.json" } | ForEach-Object {
    $pkg = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $shortPath = $_.FullName.Replace("E:\Code\TestVault\", "").Replace("\package.json", "")
    if ($pkg.version -eq "0.5.0") {
        Write-Host "  OK $shortPath : 0.5.0" -ForegroundColor Green
    } else {
        Write-Host "  KO $shortPath : $($pkg.version)" -ForegroundColor Red
        $allAligned = $false
    }
}
$rootPkg = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
if ($rootPkg.name -eq "argos" -and $rootPkg.version -eq "0.5.0") {
    Write-Host "  OK racine : name=$($rootPkg.name) version=$($rootPkg.version)" -ForegroundColor Green
} else {
    Write-Host "  KO racine : name=$($rootPkg.name) version=$($rootPkg.version)" -ForegroundColor Red
    $allAligned = $false
}
$regPkg = Get-Content tools\regression\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  EXCLU regression-suite : version=$($regPkg.version) (intentionnel)" -ForegroundColor Yellow

if ($allAligned) {
    Write-Host "`n  ALIGNEMENT 0.5.0 : SUCCES" -ForegroundColor Green
}

Write-Host "`n=== Changesets config en mode fixed ?===" -ForegroundColor Cyan
$config = Get-Content .changeset\config.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  fixed groups : $($config.fixed.Count)"
Write-Host "  ignore : $($config.ignore -join ', ')"

Write-Host "`n=== task.json version field (Marketplace ADO, inchangee) ===" -ForegroundColor Cyan
$task = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  task.json version : $($task.version | ConvertTo-Json -Compress)"
# Attendu : {"Major":1,"Minor":0,"Patch":0}
```

---

## Etape 9 -- Update Specs/MIGRATION-PLAN.md et CHANGELOG.md

### 9.1 -- Specs/MIGRATION-PLAN.md

Ajouter note en fin :
```markdown
> **Sprint 8 livre 2026-05-14** : versioning alignement Changesets fixed mode.
> - Mode `fixed` active : 14 packages dans un seul groupe
> - Version cible alignee : **0.5.0** (signal "nouvelle ere post-rebrand")
> - Racine renommee : `testvault@0.3.2` -> `argos@0.5.0`
> - Exclus : `@atconseil/regression-suite` (outil dev independant, 0.1.0)
> - `tools/azure-pipelines-task/task.json` version Marketplace ADO inchangee (1.0.0)
> - Nouveau test regression : `CFG-2026-05-14-fixed-versioning.test.ts` (4 tests)
> 
> **Test regression total : 57** (etait 53).
```

### 9.2 -- CHANGELOG.md

```markdown
## [0.5.0] - 2026-05-14

### Changed (Sprint 8 - chore/sprint-8-versioning-alignement)

- **JALON VERSIONING** : alignement complet sur 0.5.0 + Changesets fixed mode.
- **Racine renommee** : `testvault@0.3.2` -> `argos@0.5.0` (coherence finale rebrand).
- **14 packages aligned sur 0.5.0** (etait 0.3.2 a 1.0.0 disparates) :
  - racine : `argos`
  - `argosTesting` : 0.4.22 -> 0.5.0
  - `argos-functions` : 0.3.4 -> 0.5.0
  - `docs-site` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-cli` : 0.3.4 -> 0.5.0
  - `@atconseil/argos-detection-api` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-exporters` : 0.3.3 -> 0.5.0
  - `@atconseil/argos-gherkin` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-importers` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-sdk` : 0.3.4 -> 0.5.0
  - `@atconseil/argos-types` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-wit-schema` : 0.3.3 -> 0.5.0
  - `@atconseil/argos-azure-pipelines-task` : 1.0.0 -> 0.5.0 (regression visible, task non publiee)
  - `@atconseil/argos-e2e` : 0.3.4 -> 0.5.0
- **Mode Changesets fixed** active dans `.changeset/config.json` :
  - 1 fixed group avec les 14 packages
  - `ignore: ["@atconseil/regression-suite"]` (outil dev independant)
- **Test regression versioning** : `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts` (4 tests)
  - Tous les packages du fixed group ont la meme version
  - Tous matchent la version racine
  - Racine s'appelle `argos`
  - regression-suite est correctement exclu
- **Inchanges intentionnellement** :
  - `@atconseil/regression-suite` reste 0.1.0 (outil dev)
  - `tools/azure-pipelines-task/task.json` `version` field reste `{1,0,0}` (Marketplace ADO independent)
  - `apps/argos-extension/vss-extension.json` `version` aligne sur 0.5.0

### Modifications

- `package.json` (racine) : `name` + `version`
- 13 autres `package.json` : `version`
- `.changeset/config.json` : `fixed` + `ignore`
- `apps/argos-extension/vss-extension.json` : `version`
- `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts` : nouveau (4 tests)
- `tools/regression/CFG-2026-05-13-package-naming.test.ts` : ajuste si necessaire (accepter racine `argos`)
- `Specs/MIGRATION-PLAN.md` : note Sprint 8 livre
- `CHANGELOG.md` : [0.5.0]

### Notes (Sprint 8)

- **0.5.0 et pas 1.0.0** : 1.0.0 est reserve pour la vraie GA produit (Sprint 7.x du tasks.md original). 0.5.0 signale "transition complete post-rebrand, pret pour wiring fonctionnel".
- **Regression visible 1.0.0 -> 0.5.0** sur `argos-azure-pipelines-task` : intentionnel. La task n'etait pas publiee sur Marketplace ADO Pipeline Tasks (`private: true`). La version 1.0.0 etait un placeholder. Quand on publiera vraiment, on repartira de la version fixed du moment.
- **`task.json` version Marketplace ADO** reste `{1,0,0}` : c'est la **version visible aux utilisateurs** des pipelines YAML (`ArgosUploadResults@1`). Cette version a sa propre semantique : majeur = breaking pour les pipelines existants. Inchangee tant que la task n'est pas publiee.
- **Renommage racine** : signal final du rebrand termine. Le tag `> testvault@0.3.2 preflight` devient `> argos@0.5.0 preflight`.

### Lessons learned

- **Mode fixed** simplifie le raisonnement versioning pour un solo dev : un seul nombre a se rappeler, coherence visuelle massive.
- **Test regression versioning** : critique pour eviter le drift accidentel. Sans ce test, un `pnpm changeset` mal configure pourrait re-divergeer les versions.
- **`task.json` Marketplace version** != **`package.json` npm version** : deux semantiques differentes, ne pas confondre.

### TECH-DEBT actifs

- TECH-DEBT-021, 022, 024, 026 (voir CHANGELOGs precedents)
- ANNULES : 023, 025
- LIVRES : 027 (encoding hygiene), Sprint 8 (versioning)

### Backlog post-Sprint 8

1. **Batch Dependabot** : 5 PR ouvertes (~30 min)
2. **Pause dejeuner**
3. **TECH-DEBT-026 OBLIGATOIRE** : Resync `Specs/tasks.md` avec realite du code
4. **Sprint 2.5b** : Wiring CRUD Phase 1 (vrai produit)
```

---

## Etape 10 -- Archive + commit

### 10.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-8.md", "$HOME\Downloads\CLAUDE_TASK_sprint-8.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-8.md
}
```

### 10.2 -- Pre-commit ASCII check

```powershell
$msg = "chore(versioning): align all packages to 0.5.0 + fixed mode + rename root (Sprint 8)`n`n14 packages now share version 0.5.0 in Changesets fixed mode."
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
  -m "chore(versioning): align all packages to 0.5.0 + fixed mode (Sprint 8)" `
  -m "" `
  -m "Major versioning alignement post-rebrand. 14 packages now share v0.5.0:" `
  -m "- root: testvault@0.3.2 -> argos@0.5.0 (renamed + bumped)" `
  -m "- argosTesting: 0.4.22 -> 0.5.0" `
  -m "- 8 argos-* packages in packages/: aligned to 0.5.0" `
  -m "- argos-functions + docs-site: aligned to 0.5.0" `
  -m "- argos-azure-pipelines-task: 1.0.0 -> 0.5.0 (visible regression, task not published)" `
  -m "- argos-e2e: aligned to 0.5.0" `
  -m "" `
  -m "Changesets config: fixed mode enabled with 14-package group." `
  -m "regression-suite excluded (internal dev tool, stays at 0.1.0)." `
  -m "" `
  -m "Intentionally unchanged:" `
  -m "- tools/regression/package.json (excluded from fixed group)" `
  -m "- tools/azure-pipelines-task/task.json version field (Marketplace ADO, stays 1.0.0)" `
  -m "" `
  -m "New regression test: CFG-2026-05-14-fixed-versioning.test.ts (4 tests):" `
  -m "- All fixed group packages share same version" `
  -m "- Match root package.json version" `
  -m "- Root named 'argos'" `
  -m "- regression-suite correctly excluded" `
  -m "" `
  -m "Why 0.5.0 and not 1.0.0:" `
  -m "1.0.0 is reserved for true product GA (Phase 7 in tasks.md)." `
  -m "0.5.0 signals 'rebrand complete, ready for wiring sprint'." `
  -m "" `
  -m "Methodology:" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "- pnpm turbo lint/typecheck/test/build --force used" `
  -m "" `
  -m "Regression test total: 57 (was 53)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md, .changeset/config.json"

git push -u origin chore/sprint-8-versioning-alignement
```

PR.

---

## Etape 11 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3

git branch -d chore/sprint-8-versioning-alignement
git remote prune origin

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 57 passing

pnpm preflight
# PASSED (s'appelle maintenant 'argos preflight' au lieu de 'testvault preflight')

node tools\regression\scan-mojibake.cjs

# JALON : verifier l'alignement
$rootPkg = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "JALON 0.5.0 : racine = $($rootPkg.name)@$($rootPkg.version)"

# Verifier le tag dans une commande pnpm
pnpm preflight 2>&1 | Select-String "argos@0\.5\.0|testvault@"
```

---

## Criteres de done

- [ ] Branche `chore/sprint-8-versioning-alignement` creee
- [ ] Snapshot validee : 14 packages identifies, dependances workspace:* confirmees
- [ ] **Racine renomme** `testvault` -> `argos` + version 0.5.0
- [ ] **13 autres packages** alignes a 0.5.0
- [ ] **`regression-suite` exclus** (0.1.0 inchange)
- [ ] **`task.json` version Marketplace** inchange (1.0.0)
- [ ] **`vss-extension.json` version** aligne 0.5.0
- [ ] **`.changeset/config.json`** : mode fixed avec 14 packages + ignore regression-suite
- [ ] **Nouveau test regression** : `CFG-2026-05-14-fixed-versioning.test.ts` (4 tests)
- [ ] Suite regression : **57 passing** (etait 53)
- [ ] `pnpm preflight` PASSED (tag `argos@0.5.0` au lieu de `testvault@0.3.2`)
- [ ] 0 mojibake
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `Specs/MIGRATION-PLAN.md` : note Sprint 8 livre
- [ ] CHANGELOG [0.5.0] avec lessons learned
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot OK. 14 packages identifies pour fixed group. X dependances hard-coded. Racine `testvault@0.3.2` confirmee. Confirmation avant 14 bumps + rename racine + config Changesets + test regression ?"

2. **Apres Etape 8.1 (self-check)** : "JALON 0.5.0 : 14 packages alignes. Racine renommee argos@0.5.0. Changesets en mode fixed. 57 tests passing. Pret a commit ?"

3. **Apres Etape 10.3** : "PR ouverte. Apres merge GitHub, lance Etape 11 (post-merge cleanup). Apres ca : batch Dependabot."

---

Apres post-merge cleanup OK :
- **Batch Dependabot** : 5 PR ouvertes (~30 min)
- **Pause dejeuner**
- **TECH-DEBT-026 OBLIGATOIRE** : Resync Specs/tasks.md
- **Sprint 2.5b demain**
