# Prompt Claude Code -- Sprint 7b (`feat/rebrand-testpulse-ui-shared-to-argos-detection-api`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **REBRAND** (pas simple renaming) : 9eme sprint de la serie renaming.
> Specificite : **changement de nom de produit + rebrand semantique + preparation API publique future**.
> Surface elargie : rename dossier + rename name npm + rename 9 identifiants TS + 2 docs + section dediee "Consumer API".

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 7a merge visible : `git log --oneline | Select-Object -First 3`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`

Si l'un echoue -> STOP.

---

## Contexte

**9eme sprint** de la serie renaming. **Dernier package dans `packages/` a renommer**.

Contrairement aux 8 sprints precedents qui etaient des **renamings purs** (testvault-* -> argos-*), Sprint 7b est un **REBRAND** :
- Le nom de produit cible change : **TestPulse** != **Argos**
- Le nom reflete la fonction reelle (pas une UI partagee, mais un client de detection/lecture)
- Le contenu source change (9 identifiants TS renommes)
- Preparation pour publication future (TestPulse 2.0+ comme consommateur officiel)

**Decisions actees (2026-05-14, en collaboration utilisateur)** :

1. **Le nom `testpulse-ui-shared` est doublement trompeur** :
   - "ui" : aucune UI dedans (juste types + schema reader)
   - "shared" : 0 consommateur interne actuellement

2. **Le contenu reel** : un **lecteur de schema WIT** pour **detecter Argos** sur une instance ADO. La methode `isArgosInstalled` confirme que "detection" est semantiquement juste.

3. **Le futur consommateur** : **TestPulse v2.0+** (extension ADO separee, mentionnee dans `Specs/CLAUDE.md`, `Specs/constitution.md`, `docs/wit-schema.md`).

4. **Etat actuel de TestPulse** : **n'existe pas encore** comme app (`apps/testpulse/` absent). TestPulse v1.x consomme uniquement Microsoft Test Plans natifs. TestPulse v2.0 consommera Argos en plus.

5. **Regle de scope** : tout ce qui est **public/visible** par les consommateurs externes -> Argos. Tout ce qui est immutable (constitution section 3.4 + section 9) -> reste `TestVault.*`.

6. **Bump version** : 0.4.18 -> 0.4.19.

7. **Periode de doc** : Sprint 7b inclut une preparation explicite pour TestPulse 2.0 (Option Y validee) :
   - Description ajoutee au package.json
   - Section "Consumer API for external integrators" dans `docs/wit-schema.md`
   - Exemple de code d'integration
   - Mention du contrat de versioning

---

## Surface verifiee terrain (2026-05-14)

### Code source

**`packages/testpulse-ui-shared/src/wit-schema-reader.ts`** (74 lignes) :
- 1 constante exportee : `TESTVAULT_WIT_NAMES`
- 1 type exporte : `TestVaultWorkItemType`
- 2 interfaces exportees : `TestVaultWitField`, `ITestVaultSchemaReader`
- 1 interface non-publique : `IAdoWorkItemClient` (mais exportee, reste inchangee)
- 1 factory exportee : `createTestVaultSchemaReader`
- Strings `"TestVault.*"` : **NE PAS TOUCHER** (immutable constitution)

**`packages/testpulse-ui-shared/src/index.ts`** :
- Re-exporte tous les identifiants ci-dessus

**`packages/testpulse-ui-shared/src/wit-schema-reader.test.ts`** (~80 lignes) :
- 6 tests Vitest
- Imports : `TESTVAULT_WIT_NAMES, createTestVaultSchemaReader, IAdoWorkItemClient`
- 1 `describe("createTestVaultSchemaReader", ...)` a renommer
- Mock strings `"TestVault.TestCase.Title"` etc. : **NE PAS TOUCHER**

### Consommateurs

- **0 consommateur interne** (package.json) -- confirme snapshot
- **0 import source** (sauf le test regression naming qui mentionne par nom)
- **1 entree** dans `ALLOWED_LEGACY_NAMES` (`tools/regression/CFG-2026-05-13-package-naming.test.ts`)

### Documentation

- `docs/wit-schema.md` : "Consumed by: TestPulse 2.0+" -> a enrichir avec section "Consumer API"
- `Specs/CLAUDE.md` ligne 94 : `testpulse-ui-shared/ # Shared components with TestPulse` -> mettre a jour
- 23 autres fichiers mentionnent "testpulse" mais la **plupart sont des prompts archives** (`tools/claude-prompts/`) et des **specs/docs qui parlent du PRODUIT TestPulse** (a garder). Distinction critique :
  - **"TestPulse"** (nom du produit) -> **garder** dans Specs/, docs/, CLAUDE.md
  - **"testpulse-ui-shared"** (nom du package) -> **changer** en `argos-detection-api`

---

## Garde-fous Sprint 7b

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : `--force` sur turbo
Lecon Sprint 6f. Apres `git mv`, invalider le cache.

### Garde-fou #3 : LOCK strings `"TestVault.*"`
**Ne JAMAIS renommer** les strings qui matchent le pattern :
- `"TestVault."` suivi d'une majuscule (= reference WIT immutable)
- Exemples : `"TestVault.TestCase"`, `"TestVault.TestCase.Title"`, `"TestVault.AuditLog"`

**Verification post-rename** :
```powershell
Select-String -Path packages\argos-detection-api\src\*.ts -Pattern '"TestVault\.' -Encoding UTF8
# Doit retourner toutes les strings "TestVault.*" inchangees
# Si une est devenue "Argos.*" -> STOP, REVERT
```

### Garde-fou #4 : Distinction produit vs package
- **"TestPulse"** (le produit consommateur futur) reste dans les specs/docs
- **"testpulse-ui-shared"** (le nom du package npm) devient `argos-detection-api`

### Garde-fou #5 : Apres Sprint 7b, ALLOWED_LEGACY_NAMES est VIDE
Le test regression naming a une assertion explicite ("After Sprint 7b: ALLOWED_LEGACY_NAMES is empty"). Le set doit etre vide ou contenir uniquement le commentaire de victoire.

### Garde-fou #6 : Preparer la publication future SANS la faire
- Le package reste `private: true`
- La publication sur npm est **hors scope** Sprint 7b (decision future quand TestPulse 2.0 sera pret)
- La description est ajoutee mais le keywords/repository/license restent inchanges (pas de pollution)

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rebrand-testpulse-ui-shared-to-argos-detection-api

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== 1. Package existe ? ===" -ForegroundColor Cyan
Test-Path packages\testpulse-ui-shared

Write-Host "`n=== 2. Etat actuel package.json ===" -ForegroundColor Cyan
$pkg = Get-Content packages\testpulse-ui-shared\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  name : $($pkg.name)"
Write-Host "  description : $($pkg.description)"
Write-Host "  version : $($pkg.version)"
Write-Host "  private : $($pkg.private)"

Write-Host "`n=== 3. Consommateurs (attendu : 0) ===" -ForegroundColor Cyan
$pkgCount = 0
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testpulse-ui-shared" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match '"@atconseil/testpulse-ui-shared"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgCount++
    }
}
Write-Host "Total : $pkgCount" -ForegroundColor Cyan

Write-Host "`n=== 4. Identifiants TS dans le code (a renommer) ===" -ForegroundColor Cyan
Write-Host "Constante TESTVAULT_WIT_NAMES :" -ForegroundColor Gray
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern "TESTVAULT_WIT_NAMES" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber)" -ForegroundColor Yellow
}
Write-Host "Type TestVaultWorkItemType :" -ForegroundColor Gray
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern "TestVaultWorkItemType" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber)" -ForegroundColor Yellow
}
Write-Host "Interface TestVaultWitField :" -ForegroundColor Gray
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern "TestVaultWitField" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber)" -ForegroundColor Yellow
}
Write-Host "Interface ITestVaultSchemaReader :" -ForegroundColor Gray
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern "ITestVaultSchemaReader" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber)" -ForegroundColor Yellow
}
Write-Host "Factory createTestVaultSchemaReader :" -ForegroundColor Gray
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern "createTestVaultSchemaReader" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber)" -ForegroundColor Yellow
}

Write-Host "`n=== 5. Strings TestVault.* (a NE PAS toucher) ===" -ForegroundColor Cyan
Select-String -Path packages\testpulse-ui-shared\src\*.ts -Pattern '"TestVault\.' -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}

Write-Host "`n=== 6. ALLOWED_LEGACY_NAMES contient testpulse ?===" -ForegroundColor Cyan
Select-String -Path tools\regression\CFG-2026-05-13-package-naming.test.ts -Pattern "testpulse" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow
}
```

**Attendus** :
- 0 consommateur
- 5 identifiants TS a renommer (avec multiples occurrences chacun)
- Plusieurs strings `"TestVault.*"` qui DOIVENT rester inchangees
- 1 entree `testpulse-ui-shared` dans ALLOWED_LEGACY_NAMES

### 1.1 -- Reporter

> "Snapshot Sprint 7b : 0 consommateur, 5 identifiants TS a renommer, X strings TestVault.* a preserver. Confirmation avant rebrand ?"

---

## Etape 2 -- git mv du dossier

```powershell
git mv packages/testpulse-ui-shared packages/argos-detection-api

git status
# On voit : renamed: packages/testpulse-ui-shared/... -> packages/argos-detection-api/...
```

---

## Etape 3 -- Update packages/argos-detection-api/package.json

### 3.1 -- Champ `name` ET `description`

```diff
- "name": "@atconseil/testpulse-ui-shared",
+ "name": "@atconseil/argos-detection-api",
- "description": "",
+ "description": "Argos detection API - public client for consumers reading Argos Custom WIT schema from Azure DevOps. Designed for external integrators (TestPulse v2.0+).",
```

### 3.2 -- NE PAS toucher

- Champ `version` (0.3.x reste, realignement Sprint 8)
- Champ `private` : reste `true` (publication = decision future)
- Champ `main`, `exports` : structure inchangee
- Dependances : aucune a changer (le package n'en a probablement pas, ou seulement des dev deps)

---

## Etape 4 -- Update packages/argos-detection-api/src/wit-schema-reader.ts

### 4.1 -- 5 renames d'identifiants

```diff
- export const TESTVAULT_WIT_NAMES = [
+ export const ARGOS_WIT_NAMES = [
        "TestVault.TestCase",       // INCHANGE (lock constitution)
        "TestVault.TestSet",        // INCHANGE
        ...
] as const;

- export type TestVaultWorkItemType = (typeof TESTVAULT_WIT_NAMES)[number];
+ export type ArgosWorkItemType = (typeof ARGOS_WIT_NAMES)[number];

- export interface TestVaultWitField {
+ export interface ArgosWitField {
        ...
}

- export interface ITestVaultSchemaReader {
+ export interface IArgosSchemaReader {
-       listWorkItemTypes(orgUrl: string, project: string): Promise<TestVaultWorkItemType[]>;
+       listWorkItemTypes(orgUrl: string, project: string): Promise<ArgosWorkItemType[]>;
        getFields(
                orgUrl: string,
                project: string,
-               witName: TestVaultWorkItemType
+               witName: ArgosWorkItemType
-       ): Promise<TestVaultWitField[]>;
+       ): Promise<ArgosWitField[]>;
        isArgosInstalled(orgUrl: string, project: string): Promise<boolean>;
}

// IAdoWorkItemClient : INCHANGE (interface ADO generique, pas argos-specifique)

- export function createTestVaultSchemaReader(client: IAdoWorkItemClient): ITestVaultSchemaReader {
+ export function createArgosSchemaReader(client: IAdoWorkItemClient): IArgosSchemaReader {
        return {
                async listWorkItemTypes(orgUrl, project) {
                        const all = await client.listWorkItemTypeNames(orgUrl, project);
-                       return all.filter((n): n is TestVaultWorkItemType =>
+                       return all.filter((n): n is ArgosWorkItemType =>
-                               (TESTVAULT_WIT_NAMES as readonly string[]).includes(n)
+                               (ARGOS_WIT_NAMES as readonly string[]).includes(n)
                        );
                },
                ...
                async getFields(orgUrl, project, witName) {
                        const raw = await client.getWorkItemTypeFields(orgUrl, project, witName);
                        return raw.map((f) => ({
                                referenceName: f.referenceName,
                                name: f.name,
-                               type: f.type as TestVaultWitField["type"],
+                               type: f.type as ArgosWitField["type"],
                                readOnly: f.readOnly,
                        }));
                },
                async isArgosInstalled(orgUrl, project) {
                        const types = await this.listWorkItemTypes(orgUrl, project);
                        return types.includes("TestVault.TestCase");  // INCHANGE (lock)
                },
        };
}
```

### 4.2 -- Verification critique

Apres modification :
```powershell
# Doit retourner : 0 ligne avec TestVault identifier (sauf strings)
Select-String -Path packages\argos-detection-api\src\wit-schema-reader.ts -Pattern "TestVault" -Encoding UTF8 | Where-Object { $_.Line -notmatch '"TestVault\.' }
# Attendu : aucune ligne (toutes les references TestVault restantes doivent etre dans des strings)

# Doit retourner : strings "TestVault.*" inchangees
Select-String -Path packages\argos-detection-api\src\wit-schema-reader.ts -Pattern '"TestVault\.' -Encoding UTF8
# Attendu : 7 strings dans le tableau ARGOS_WIT_NAMES + 1 dans isArgosInstalled = 8 total
```

---

## Etape 5 -- Update packages/argos-detection-api/src/index.ts

```diff
- export type { TestVaultWitField, TestVaultWorkItemType } from "./wit-schema-reader.js";
+ export type { ArgosWitField, ArgosWorkItemType } from "./wit-schema-reader.js";
- export { createTestVaultSchemaReader, TESTVAULT_WIT_NAMES } from "./wit-schema-reader.js";
+ export { createArgosSchemaReader, ARGOS_WIT_NAMES } from "./wit-schema-reader.js";
```

Ajouter aussi (coherence rebrand) :
```diff
+ export type { IArgosSchemaReader, IAdoWorkItemClient } from "./wit-schema-reader.js";
```

(Note : si `IAdoWorkItemClient` et `ITestVaultSchemaReader` n'etaient pas re-exportes auparavant, c'est une **legere amelioration** de l'API publique. A garder car coherent avec la posture "API publique pour TestPulse 2.0+".)

---

## Etape 6 -- Update packages/argos-detection-api/src/wit-schema-reader.test.ts

```diff
- import { TESTVAULT_WIT_NAMES, createTestVaultSchemaReader } from "./wit-schema-reader.js";
+ import { ARGOS_WIT_NAMES, createArgosSchemaReader } from "./wit-schema-reader.js";
  import type { IAdoWorkItemClient } from "./wit-schema-reader.js";
  
  function makeClient(overrides?: Partial<IAdoWorkItemClient>): IAdoWorkItemClient {
        return {
-               listWorkItemTypeNames: vi.fn().mockResolvedValue([...TESTVAULT_WIT_NAMES, "System.Bug"]),
+               listWorkItemTypeNames: vi.fn().mockResolvedValue([...ARGOS_WIT_NAMES, "System.Bug"]),
                getWorkItemTypeFields: vi.fn().mockResolvedValue([
                        { referenceName: "TestVault.TestCase.Title", ... },  // INCHANGE (mock string)
                        { referenceName: "TestVault.TestCase.Status", ... }, // INCHANGE
                ]),
        };
  }
  
- describe("createTestVaultSchemaReader", () => {
+ describe("createArgosSchemaReader", () => {
        it("listWorkItemTypes returns only TestVault.* types", async () => {  // string TestVault.* OK
-               const reader = createTestVaultSchemaReader(makeClient());
+               const reader = createArgosSchemaReader(makeClient());
                ...
        });
        
        it("listWorkItemTypes includes all 7 TestVault WIT names when present", async () => {
-               const reader = createTestVaultSchemaReader(makeClient());
+               const reader = createArgosSchemaReader(makeClient());
-               expect(types).toHaveLength(TESTVAULT_WIT_NAMES.length);
+               expect(types).toHaveLength(ARGOS_WIT_NAMES.length);
        });
        
        // ... 4 autres tests similaires : remplacer createTestVaultSchemaReader -> createArgosSchemaReader
        
-       it("getFields maps raw fields to TestVaultWitField shape", async () => {
+       it("getFields maps raw fields to ArgosWitField shape", async () => {
                ...
        });
  });
```

⚠ Les **strings** dans les tests (mocks et matchers) qui contiennent `"TestVault.*"` (avec point) restent **inchangees**.

---

## Etape 7 -- Update test regression naming

`tools/regression/CFG-2026-05-13-package-naming.test.ts` :

### 7.1 -- Retirer l'entree

```diff
  const ALLOWED_LEGACY_NAMES = new Set([
-   "@atconseil/testpulse-ui-shared",
  ]);
```

Le set est maintenant **vide**. Le test enforce que **seuls les noms argos-* sont valides**.

### 7.2 -- Update commentaire historique (coherence avec Sprints precedents)

```diff
  *   - Sprint 7a (done): testvault-cli renamed; removed from ALLOWED_LEGACY_NAMES
- *   - Sprint 7b: testpulse-ui-shared -> argos-detection-api; remove from ALLOWED_LEGACY_NAMES
+ *   - Sprint 7b (done): testpulse-ui-shared -> argos-detection-api; removed from ALLOWED_LEGACY_NAMES
- *   - After Sprint 7b: ALLOWED_LEGACY_NAMES is empty; test enforces argos-* only
+ *   - After Sprint 7b (DONE 2026-05-14): ALLOWED_LEGACY_NAMES is empty; test enforces argos-* only
```

### 7.3 -- Verifier que le test continue de passer

```powershell
pnpm --filter @atconseil/regression-suite test
# 51 passing (toujours)
```

⚠ Si le test casse parce que `ALLOWED_LEGACY_NAMES` est vide (Set vide), c'est OK : le test doit accepter un set vide comme etat final.

---

## Etape 8 -- Update docs/wit-schema.md (Option Y : preparation TestPulse 2.0+)

### 8.1 -- En-tete

Garder l'en-tete actuel (`> Consumed by: TestPulse 2.0+`) mais enrichir.

### 8.2 -- Ajouter section "Consumer API for external integrators"

A la fin du fichier (apres la section existante), ajouter :

```markdown
---

## Consumer API for external integrators

External tools that need to detect Argos installation, list its Custom Work Item Types, or read field metadata on an Azure DevOps instance can use the public client package **`@atconseil/argos-detection-api`** (renamed from `testpulse-ui-shared` in Sprint 7b, 2026-05-14).

This package is designed for stable, versioned consumption by **TestPulse v2.0+** and any future external integrators.

### Installation

```bash
npm install @atconseil/argos-detection-api
```

> Note: as of the Sprint 7b rebrand (2026-05-14), the package remains `private: true` in the monorepo and is not yet published on npm. Publication will be planned alongside TestPulse v2.0 readiness.

### Quick start

```ts
import {
  createArgosSchemaReader,
  ARGOS_WIT_NAMES,
  type IAdoWorkItemClient,
  type IArgosSchemaReader,
} from "@atconseil/argos-detection-api";

// Provide an ADO Work Item client implementation
const adoClient: IAdoWorkItemClient = { /* ... your impl ... */ };

const reader: IArgosSchemaReader = createArgosSchemaReader(adoClient);

// Detect if Argos is installed on a given ADO project
const installed = await reader.isArgosInstalled(orgUrl, project);

// List Argos Custom WIT types available on this project
const types = await reader.listWorkItemTypes(orgUrl, project);
// types is a subset of ARGOS_WIT_NAMES that are actually installed

// Read field metadata for a specific WIT
const fields = await reader.getFields(orgUrl, project, "TestVault.TestCase");
```

### API contract stability

| Symbol | Stability | Notes |
| --- | --- | --- |
| `ARGOS_WIT_NAMES` | STABLE | Adding a new WIT name is a minor version bump |
| `ArgosWorkItemType` | STABLE | Union type derived from `ARGOS_WIT_NAMES` |
| `ArgosWitField` | STABLE | Shape locked; new optional fields possible |
| `IArgosSchemaReader` | STABLE | Methods locked; new optional methods possible |
| `createArgosSchemaReader` | STABLE | Factory signature locked |
| `IAdoWorkItemClient` | STABLE | Consumer-provided ADO client contract |

> **Versioning rule** (constitution section 10): any breaking change to this API requires a major version bump of `@atconseil/argos-detection-api` AND a coordinated TestPulse migration plan with end-to-end tested migration scripts.

### Why "TestVault.*" prefix in WIT strings

Custom Work Item Type reference names use the technical prefix `TestVault.*` (e.g. `"TestVault.TestCase"`) even though the commercial product is **Argos**. This is intentional and locked by constitution section 3.4 + section 9 for backward compatibility: existing Argos installations have these WIT types persisted in customer Azure DevOps databases. Renaming them would break installed customers. The TypeScript identifiers were rebranded to `Argos*` in Sprint 7b, but the WIT reference strings remain `TestVault.*` indefinitely.
```

---

## Etape 9 -- Update Specs/CLAUDE.md

### 9.1 -- Ligne 94 (description du package)

```diff
- testpulse-ui-shared/   # Shared components with TestPulse standalone
+ argos-detection-api/   # Public client API for external consumers (TestPulse v2.0+ etc.) -- reads Argos WIT schema from ADO
```

### 9.2 -- Garder les autres mentions "TestPulse"

Les mentions du **produit** TestPulse (ligne 219 "schema contract with TestPulse", ligne 229 "TestPulse -- separate standalone extension", ligne 242 "WIT schema contract... consumed by TestPulse") **restent inchangees** : elles parlent du produit, pas du package.

---

## Etape 10 -- Update Specs/MIGRATION-PLAN.md

Section 3 (Plan d'execution) :

```diff
- | Sprint 7b | Renaming `testpulse-ui-shared` -> `argos-detection-api` | ~30 min | Moyen (changement de nom produit + scope) | Apres 7a |
+ | Sprint 7b | **Rebrand** `testpulse-ui-shared` -> `argos-detection-api` (rename + 9 TS identifiers + 2 docs + Consumer API section) | ~60 min | Moyen (rebrand semantique + preparation API TestPulse v2.0+) | **DONE 2026-05-14** |
```

Ajouter note importante :
```markdown
> **Sprint 7b livre 2026-05-14** : dernier package de `packages/` a renommer. Ce sprint est un
> **REBRAND** (pas simple renaming) :
> - Nouveau nom de produit cible : `argos-detection-api` (pas `argos-testpulse-ui-shared`)
> - 9 identifiants TypeScript renommes (sauf strings "TestVault.*" lockees par constitution)
> - Description du package ajoutee
> - Section "Consumer API for external integrators" ajoutee a `docs/wit-schema.md`
> - Preparation explicite pour TestPulse v2.0+ comme futur consommateur
>
> **Apres Sprint 7b**, `ALLOWED_LEGACY_NAMES` est vide -> tous les packages utilisent `argos-*`.
> Renaming **DES PACKAGES** complete. Restent Sprints 6g/7c (azure-pipelines-task)
> et 7d (testvault-action) qui sont des renamings de **DOSSIERS dans `tools/`**, pas des packages.
```

---

## Etape 11 -- Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 7b: rebrand testpulse-ui-shared to argos-detection-api"
# ASCII strict

pnpm changeset version
# Attendu : bump 0.4.18 -> 0.4.19
```

---

## Etape 12 -- CHANGELOG entry

```markdown
## [0.4.19] - 2026-05-14

### Changed (Sprint 7b - feat/rebrand-testpulse-ui-shared-to-argos-detection-api)

- **`@atconseil/testpulse-ui-shared` renomme en `@atconseil/argos-detection-api`** (9eme sprint de la serie renaming, dernier package de `packages/`).
- **REBRAND semantique** (pas simple renaming) :
  - Le nom reflete la fonction reelle : detection d'Argos sur ADO + lecture du schema WIT
  - 9 identifiants TypeScript renommes :
    - Constante `TESTVAULT_WIT_NAMES` -> `ARGOS_WIT_NAMES`
    - Type `TestVaultWorkItemType` -> `ArgosWorkItemType`
    - Interface `TestVaultWitField` -> `ArgosWitField`
    - Interface `ITestVaultSchemaReader` -> `IArgosSchemaReader`
    - Factory `createTestVaultSchemaReader` -> `createArgosSchemaReader`
    - Tests `describe("createTestVaultSchemaReader", ...)` -> `describe("createArgosSchemaReader", ...)`
  - **Strings `"TestVault.*"` INCHANGEES** : les references WIT (`"TestVault.TestCase"`, etc.) restent verrouillees par constitution section 3.4 + section 9 (retrocompatibilite chez les clients ayant deja Argos installe)
- **Description du package ajoutee** (etait vide auparavant)
- **Documentation enrichie** :
  - Section "Consumer API for external integrators" ajoutee a `docs/wit-schema.md`
  - Exemple de code d'integration
  - Tableau de stabilite API (versioning rule)
  - Note explicative sur le prefixe `TestVault.*` immutable
  - `Specs/CLAUDE.md` ligne 94 mise a jour
- **`ALLOWED_LEGACY_NAMES` est maintenant VIDE** : tous les packages utilisent `argos-*`.
- **Preparation publication future** : le package reste `private: true` mais l'API est prete pour TestPulse v2.0+

### Modifications

- `packages/testpulse-ui-shared/` -> `packages/argos-detection-api/` (git mv)
- `packages/argos-detection-api/package.json` : `name` + `description`
- `packages/argos-detection-api/src/wit-schema-reader.ts` : 9 identifiants renommes
- `packages/argos-detection-api/src/index.ts` : exports updates (+ IArgosSchemaReader, IAdoWorkItemClient exposes)
- `packages/argos-detection-api/src/wit-schema-reader.test.ts` : tests aligned
- `tools/regression/CFG-2026-05-13-package-naming.test.ts` : ALLOWED_LEGACY_NAMES vide + commentaires
- `docs/wit-schema.md` : section "Consumer API" ajoutee (~60 lignes)
- `Specs/CLAUDE.md` ligne 94 : description du package
- `Specs/MIGRATION-PLAN.md` : Sprint 7b DONE + note rebrand

### Notes (Sprint 7b)

- **TestPulse** (le produit) reste mentionne dans Specs et docs comme consommateur futur. C'est le **package** testpulse-ui-shared qui est renomme, pas le produit.
- **TestPulse v1.x** consomme uniquement Microsoft Test Plans natifs ADO. **TestPulse v2.0+** consommera aussi Argos via `@atconseil/argos-detection-api`.
- Apres Sprint 7b, renaming des **PACKAGES** complete. Restent Sprints 6g/7c (azure-pipelines-task) et 7d (testvault-action) qui renomment des **DOSSIERS** dans `tools/`.
- Bump 0.4.18 -> 0.4.19.

### Lessons learned

- **Un rebrand n'est pas un renaming** : Sprint 7b a touche 9 identifiants TS, 2 docs et une section dediee API. Beaucoup plus large que Sprints 6a-7a.
- **La distinction produit/package est critique** : "TestPulse" reste dans la doc, "testpulse-ui-shared" devient `argos-detection-api`.
- **Les decisions constitutionnelles sont des locks** : meme dans un rebrand massif, les strings `"TestVault.*"` restent (constitution section 3.4 immutability).
- **Documenter l'intention future** dans le sprint : la section "Consumer API" cristallise pour TestPulse v2.0+ comment integrer Argos. Evite le "rediscover later".

### Backlog renaming -- etat post-Sprint 7b

**Packages dans `packages/`** : RENAMING COMPLETE (8/8) (done)
- argos-cli, argos-detection-api, argos-exporters, argos-gherkin, argos-importers, argos-sdk, argos-types, argos-wit-schema

**Restant (dossiers `tools/*`)** :
- Sprint 6g/7c NEXT : `tools/azure-pipelines-task/` -- regen GUID + alignement vars env + binaire argos
- Sprint 7d : `tools/testvault-action/` -> `tools/argos-action/` -- alignement install CLI + vars env + binaire argos

**TECH-DEBT actifs** :
- TECH-DEBT-021, 022, 024, 026, 027 (voir CHANGELOGs precedents)
- TECH-DEBT-023, 025 : ANNULES (faux positifs mojibake)
```

---

## Etape 13 -- Validation

```powershell
pnpm install
# Workspace refresh

pnpm list -r --depth=0 | Select-String -Pattern "argos|testpulse"
# Attendu : @atconseil/argos-detection-api (PAS testpulse)

# Tests regression
pnpm --filter @atconseil/regression-suite test
# 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# 0 file

# Pre-flight
pnpm preflight
# PASSED

# Turbo avec --force
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts (incluant les tests du package renomme)
```

### 13.1 -- Self-check RESIDUAL

```powershell
Write-Host "=== Residus @atconseil/testpulse-ui-shared ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs,Specs,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|CFG-2026-05-13-package-naming|claude-prompts" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testpulse-ui-shared") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 RESIDUAL

Write-Host "`n=== Residus identifiants TS TestVault* (hors strings, dans src/ du package renomme) ===" -ForegroundColor Cyan
Get-ChildItem packages\argos-detection-api\src -Recurse -Include *.ts | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    # Cherche "TestVault" qui n'est PAS suivi de . (= pas une string ref WIT)
    if ($content -match "TestVault[A-Z]" -or $content -match "TESTVAULT_") {
        Write-Host "RESIDUAL identifier: $($_.FullName)" -ForegroundColor Red
        Select-String -Path $_.FullName -Pattern "TestVault[A-Z]|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
            Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
        }
    }
}
# Attendu : 0 RESIDUAL identifier

Write-Host "`n=== Confirmation strings TestVault.* PRESERVEES ===" -ForegroundColor Green
Select-String -Path packages\argos-detection-api\src\*.ts -Pattern '"TestVault\.' -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  Total strings TestVault.* dans le code : $($_.Count) (doit etre > 0)" -ForegroundColor Green
}
```

⚠ Si RESIDUAL trouve, STOP.
⚠ Si 0 string `"TestVault.*"` preserveee, STOP (lock constitution casse).

### 13.2 -- Verifier portfolio packages/

```powershell
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (8 packages, tous argos-*) :
#   argos-cli
#   argos-detection-api    (NOUVEAU)
#   argos-exporters
#   argos-gherkin
#   argos-importers
#   argos-sdk
#   argos-types
#   argos-wit-schema

# Verifier dossier ancien supprime
Test-Path packages\testpulse-ui-shared
# Attendu : False
```

⚠ **Si tous les packages commencent par `argos-`, c'est un jalon majeur a saluer.**

---

## Etape 14 -- Archive + commit

### 14.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-7b.md", "$HOME\Downloads\CLAUDE_TASK_sprint-7b.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-7b.md
}
```

### 14.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rebrand testpulse-ui-shared to argos-detection-api (Sprint 7b)`n`n9th sprint of the testvault to argos renaming wave, last package in packages/."
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

### 14.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "feat(packages): rebrand testpulse-ui-shared to argos-detection-api (Sprint 7b)" `
  -m "" `
  -m "9th sprint of the testvault to argos renaming wave, last package in packages/." `
  -m "" `
  -m "REBRAND (not simple renaming) : the package name reflected neither its content" `
  -m "(no UI, no shared) nor the rebranded product. Renamed to argos-detection-api" `
  -m "to match its real function : detect Argos installation + read its WIT schema." `
  -m "" `
  -m "Changes:" `
  -m "- packages/testpulse-ui-shared/ -> packages/argos-detection-api/ (git mv)" `
  -m "- package.json: name + description (was empty)" `
  -m "- src/wit-schema-reader.ts: 9 TypeScript identifiers renamed:" `
  -m "  TESTVAULT_WIT_NAMES -> ARGOS_WIT_NAMES" `
  -m "  TestVaultWorkItemType -> ArgosWorkItemType" `
  -m "  TestVaultWitField -> ArgosWitField" `
  -m "  ITestVaultSchemaReader -> IArgosSchemaReader" `
  -m "  createTestVaultSchemaReader -> createArgosSchemaReader" `
  -m "- src/wit-schema-reader.test.ts: aligned (5 createTestVaultSchemaReader refs)" `
  -m "- src/index.ts: exports updated (+IArgosSchemaReader, IAdoWorkItemClient exposed)" `
  -m "- tools/regression/CFG-2026-05-13-package-naming.test.ts: ALLOWED_LEGACY_NAMES now empty" `
  -m "- docs/wit-schema.md: new Consumer API for external integrators section (+code example, +stability table, +TestVault.* prefix explanation)" `
  -m "- Specs/CLAUDE.md line 94: package description updated" `
  -m "- Specs/MIGRATION-PLAN.md: Sprint 7b DONE + rebrand note" `
  -m "" `
  -m "Locked by constitution (sections 3.4 and 9, backward compatibility):" `
  -m "- WIT reference strings remain TestVault.* (e.g. TestVault.TestCase)" `
  -m "- Customers with installed Argos have these WIT types persisted in their ADO" `
  -m "- Renaming the strings would break installations" `
  -m "" `
  -m "Distinction product vs package:" `
  -m "- TestPulse (the product) remains mentioned in specs and docs as future consumer" `
  -m "- testpulse-ui-shared (the package) is renamed to argos-detection-api" `
  -m "" `
  -m "Methodology:" `
  -m "- pnpm turbo lint/typecheck/test/build --force used (lesson Sprint 6f)" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "- All 8 packages in packages/ now use argos-* prefix (milestone)" `
  -m "" `
  -m "Bump 0.4.18 to 0.4.19." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B), Specs/constitution.md sections 3.4 9 10"

git push -u origin feat/rebrand-testpulse-ui-shared-to-argos-detection-api
```

PR.

---

## Etape 15 -- POST-MERGE CLEANUP

⚠ **A faire APRES merge GitHub.**

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3

git branch -d feat/rebrand-testpulse-ui-shared-to-argos-detection-api
# Si refus : git branch -D feat/rebrand-testpulse-ui-shared-to-argos-detection-api

git remote prune origin

# JALON : portfolio packages/ tout-argos
Get-ChildItem packages -Directory | Select-Object Name
# Attendu : 8 packages, tous prefixes argos-

Test-Path packages\testpulse-ui-shared
# False

# Sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

---

## Criteres de done

- [ ] Branche `feat/rebrand-testpulse-ui-shared-to-argos-detection-api` creee depuis main a jour
- [ ] Snapshot validee : 0 consommateur, 5 identifiants TS, strings TestVault.* preservees
- [ ] **`git mv` execute** : `packages/testpulse-ui-shared/` -> `packages/argos-detection-api/`
- [ ] `packages/argos-detection-api/package.json` : `name` + `description` ajoutee
- [ ] `packages/argos-detection-api/src/wit-schema-reader.ts` : 9 identifiants renommes
- [ ] **Strings `"TestVault.*"` preservees** (verification grep explicite)
- [ ] `packages/argos-detection-api/src/index.ts` : exports mis a jour (+ IArgosSchemaReader)
- [ ] `packages/argos-detection-api/src/wit-schema-reader.test.ts` : 6 tests + describe alignes
- [ ] `tools/regression/CFG-2026-05-13-package-naming.test.ts` : `ALLOWED_LEGACY_NAMES` est VIDE
- [ ] `docs/wit-schema.md` : nouvelle section "Consumer API for external integrators"
- [ ] `Specs/CLAUDE.md` ligne 94 : description du package updated
- [ ] `Specs/MIGRATION-PLAN.md` : Sprint 7b DONE + note rebrand
- [ ] `pnpm install` OK
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Suite regression : 51/51 passing
- [ ] 0 RESIDUAL @atconseil/testpulse-ui-shared
- [ ] 0 RESIDUAL identifier TestVault* dans src/ du package
- [ ] CHANGELOG [0.4.19] avec lessons learned + jalon packages/ all-argos
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.18 -> 0.4.19
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot : 0 consommateur, X strings TestVault.* a preserver, 9 identifiants TS a renommer. Confirmation rebrand ?"

2. **Apres Etape 13.1 (self-check RESIDUAL)** : "Rebrand termine. 0 RESIDUAL. Strings TestVault.* preservees (count : X). lint/typecheck/test/build --force OK. Section 'Consumer API' ajoutee a docs/wit-schema.md. Pret a commit ?"

3. **Apres Etape 14.3** : "PR ouverte. **JALON ATTEINT : tous les packages dans `packages/` utilisent maintenant le prefixe `argos-*`** (8/8). **Apres merge GitHub, lance Etape 15** (post-merge cleanup)."

---

Quand post-merge cleanup OK :

**JALON HISTORIQUE** : renaming des **PACKAGES** complete (8/8 dans `packages/` ont le prefixe argos-, ALLOWED_LEGACY_NAMES est vide).

Restants pour finaliser le rebrand global :
- **Sprint 6g/7c** : `tools/azure-pipelines-task/` (regen GUID + alignement)
- **Sprint 7d** : `tools/testvault-action/` -> `tools/argos-action/` (alignement)

Puis :
- TECH-DEBT-027 : Documenter encoding PowerShell + .gitattributes
- Sprint 8 : Versioning alignement Changesets fixed mode
- Dependabot batch (5 PR)
- TECH-DEBT-026 : Resync Specs/tasks.md
- Sprint 2.5b : Wiring CRUD Phase 1
