# Prompt Claude Code -- Sprint 2.10 ADO auto-generated refName fix (`feat/sprint-2-10-ado-refname-resolution`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor : ADO genere automatiquement le refName d'un WIT, ignorer notre `referenceName` envoye.
> Estimation : ~2-3h.

---

## Contexte critique

**Decouverte 2026-05-18 ~11h** : apres Sprint 2.9 livre argos@0.5.11 (icons fix),
test E2E reel a echoue sur fields creation :

```
[creating-wits] Creating TestVault Test Case... (1/7)
Installation failed: VS402805: Cannot find work item type with reference name 
'TestVault.TestCase' in process named 'fa123a25-e26c-4897-863d-daeca8b0531b'.
ProcessWorkItemTypeDoesNotExistException
```

**Investigation portail ADO** :
- Process "Argos Inherited Demo" cree avec succes
- 1 WIT custom present : "TestVault Test Case"
- URL portal : `type-id=ArgosInheritedDemo.TestVaultTestCase`

**Cause confirmee** :
ADO ignore `referenceName` envoye dans le POST body et GENERE automatiquement :
`{ProcessName}.{WitNameSansEspaces}` = "ArgosInheritedDemo.TestVaultTestCase"

```
Notre POST body :
{
  "name": "TestVault Test Case",
  "referenceName": "TestVault.TestCase",    <-- IGNORE par ADO
  ...
}

ADO retourne :
{
  "referenceName": "ArgosInheritedDemo.TestVaultTestCase",  <-- genere
  "name": "TestVault Test Case",
  ...
}

Notre code NE LIT JAMAIS cette response (throwForStatus ne lit que sur erreur).
Continue avec "TestVault.TestCase" -> 404 sur POST fields/states.
```

Refs :
- Sprint 2.7 (charset fix), Sprint 2.8 (idempotency), Sprint 2.9 (icons fix)
- packages/argos-sdk/src/process-install.ts (Step 3 POST WIT)
- packages/argos-sdk/src/ado-client.ts (throwForStatus, ne lit pas body sur succes)
- packages/argos-detection-api/src/* (extension detection, casses)
- Microsoft REST API : POST /workItemTypes ne supporte pas referenceName custom
- TECH-DEBT-051 NEW : ADO refName resolution (LIVRE ce sprint)

---

## Architecture du bug -- ce qui est casse

Cette decouverte casse **plusieurs couches** :

```
1. SDK process-install.ts Step 3 :
   - POST WIT : OK (ADO accepte, ignore notre refName)
   - POST fields : URL avec wit.referenceName "TestVault.TestCase" -> 404
   - POST states : URL avec wit.referenceName "TestVault.TestCase" -> 404
   FIX : use ADO-returned refName dans les URLs subsequentes

2. SDK process-install.ts detectInstallState :
   - Compare wits ADO retourne (refName "ArgosInheritedDemo.TestVaultTestCase")
     vs schema (refName "TestVault.TestCase")
   - JAMAIS de match -> toujours "not-installed" meme apres install reussi
   FIX : detect par name (display) OU par suffix pattern (.TestVaultXxx)

3. SDK process-install.ts Step 3 idempotency (Sprint 2.8) :
   - existingWitRefs filtre sur "TestVault." prefix
   - ADO retourne "ArgosInheritedDemo.TestVaultTestCase" -> ne match pas
   - tentera de POSTer un WIT qui existe -> 409 conflict
   FIX : meme strategie que detect (name OR suffix)

4. Extension wit-schema-reader (apps/argos-extension utilise via argos-detection-api) :
   - isArgosInstalled cherche "TestVault.TestCase" -> 404 forever
   - Wizard "Argos not installed" boucle
   FIX : detect par name OR suffix

5. Tous les operations CRUD subsequentes (createWorkItem, etc.) :
   - Utilise refName du schema "TestVault.TestCase" -> 404
   FIX : pas dans ce sprint -- Sprint 2.11 pour ca
```

Ce sprint adresse **#1, #2, #3, #4**. Le #5 est pour Sprint future (TECH-DEBT-052 NEW).

---

## Decisions actees lundi 2026-05-18 12h

| # | Element | Choix |
|---|---|---|
| D90 | Strategie refName SDK | A -- Use response refName + Map propagation |
| D91 | Sprint timing | A -- Apres dejeuner |
| D92 | Strategie detection extension/SDK | Pattern match suffix (.TestVaultXxx) |
| D93 | Migration BCEE-QA pour retest | Cleanup manuel WIT residuel via portal |
| D94 | CRUD operations cross-refName | DEFERRED a Sprint 2.11 (TECH-DEBT-052) |

---

## Architecture cible

### Strategie : Map<schemaRefName, adoRefName>

```typescript
// Le SDK conserve un Map durant l'install pour traduire :
//   "TestVault.TestCase" (schema) -> "ArgosInheritedDemo.TestVaultTestCase" (ADO)

// Pattern de generation ADO observe :
//   ADO refName = {ProcessName_sans_espaces}.{WitName_sans_espaces}

// Notre schema utilise :
//   referenceName : "TestVault.TestCase"
//   displayName : "TestVault Test Case"
//
// Apres install ADO :
//   stocke refName : "ArgosInheritedDemo.TestVaultTestCase"
//   ou similaire selon le name du process

// Solution : utiliser la response du POST pour le vrai refName.
```

### Detection : utiliser pattern suffix

```typescript
// Schema refName : "TestVault.TestCase" 
//   -> dot-separated : "TestVault" + "TestCase"
//   -> suffix utile : "TestCase"
// 
// ADO refName : "ArgosInheritedDemo.TestVaultTestCase"
//   -> dot-separated : "ArgosInheritedDemo" + "TestVaultTestCase"
//   -> contient "TestVault" suivi du WIT name camelCase
//
// Strategie detection :
//   1. WIT custom (pas Microsoft.*)
//   2. La part post-dot contient "TestVault" + suffix matching schema
//
// Helper :
//   isArgosWit(adoRefName: string, schemaWit: { referenceName: string }): boolean
//     - schema "TestVault.TestCase" -> suffix "TestCase"
//     - ado refName must end with "TestVault" + suffix (case sensitive)
//     - ex : "ArgosInheritedDemo.TestVaultTestCase" matches "TestCase"
```

---

## Composition exacte du sprint -- 6 LOTS

### Lot A -- SDK Step 3 fix refName resolution (~30 min)

#### A1. Modifier `packages/argos-sdk/src/process-install.ts` Step 3

```typescript
// AVANT (current):
const witRes = await doFetch(
    `${base}/${processId}/workItemTypes?api-version=${API_VERSION}`,
    {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: wit.displayName,
            referenceName: wit.referenceName,
            description: wit.description,
            color: wit.color.replace("#", ""),
            icon: wit.icon,
        }),
    }
);
await throwForStatus(witRes);

// Add custom fields
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(wit.referenceName)}/fields?...`,
        // ... uses wit.referenceName -- BROKEN
    );
}

// APRES (Sprint 2.10):
const witRes = await doFetch(
    `${base}/${processId}/workItemTypes?api-version=${API_VERSION}`,
    {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: wit.displayName,
            // Note: ADO ignore referenceName, no need to send it
            description: wit.description,
            color: wit.color.replace("#", ""),
            icon: wit.icon,
        }),
    }
);

// USE the response to get the real ADO-generated refName
const witData = await jsonOrThrow<{ referenceName: string; name: string }>(witRes);
const adoRefName = witData.referenceName;

emit({
    phase: "creating-wits",
    message: `Created ${wit.displayName} (ADO refName: ${adoRefName})`,
    current: i + 1,
    total: wits.length,
});

// Add custom fields -- use ADO refName in URL
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    // ... build body as before ...
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
        // ... uses adoRefName -- FIXED
    );
    await throwForStatus(fieldRes);
}

// Add custom states -- use ADO refName in URL
for (const state of wit.states) {
    const stateRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
        // ... uses adoRefName -- FIXED
    );
    await throwForStatus(stateRes);
}
```

#### A2. NOTE : referenceName dans le body

Microsoft doc ne liste pas `referenceName` dans body. Le code actuel l'envoie quand meme.
Bonne pratique : retirer pour eviter confusion. ADO l'ignore de toute facon.

### Lot B -- SDK detection helper isArgosWit (~20 min)

#### B1. Creer `packages/argos-sdk/src/wit-refname-matcher.ts`

```typescript
/**
 * Match an ADO-generated work item type referenceName against a schema entry.
 * 
 * ADO generates refNames as: {ProcessName_sans_espaces}.{WitName_sans_espaces}
 * Our schema uses: "TestVault.{WitNameCamelCase}"
 * 
 * Pattern matching: the ADO refName must contain "TestVault" + the schema 
 * suffix at the end of the part after the dot.
 * 
 * Examples:
 *   schema "TestVault.TestCase" + ado "ArgosInheritedDemo.TestVaultTestCase" -> match
 *   schema "TestVault.TestCase" + ado "Microsoft.TestPlan.TestCase" -> no match
 *   schema "TestVault.TestPlan" + ado "Custom.TestVaultTestPlan" -> match
 */
export function isArgosWit(
    adoRefName: string,
    schemaWitRefName: string
): boolean {
    // Extract suffix from schema refName : "TestVault.TestCase" -> "TestCase"
    const schemaParts = schemaWitRefName.split(".");
    if (schemaParts.length !== 2 || schemaParts[0] !== "TestVault") {
        return false;
    }
    const witNamePart = schemaParts[1];  // e.g., "TestCase"
    
    // ADO refName must be: {anything}.TestVault{WitNamePart}
    const adoParts = adoRefName.split(".");
    if (adoParts.length !== 2) {
        return false;
    }
    const adoAfterDot = adoParts[1];
    
    // Match : exact "TestVault" prefix + WIT name in the part after dot
    return adoAfterDot === `TestVault${witNamePart}`;
}

/**
 * Given an ADO refName, return the matching schema entry if any.
 */
export function findSchemaWitByAdoRefName<T extends { referenceName: string }>(
    adoRefName: string,
    schemaWits: ReadonlyArray<T>
): T | undefined {
    return schemaWits.find((w) => isArgosWit(adoRefName, w.referenceName));
}
```

#### B2. Tests unitaires

`packages/argos-sdk/src/wit-refname-matcher.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { isArgosWit, findSchemaWitByAdoRefName } from "./wit-refname-matcher";

describe("isArgosWit", () => {
    it("matches ado refName generated from TestVault schema", () => {
        expect(isArgosWit("ArgosInheritedDemo.TestVaultTestCase", "TestVault.TestCase")).toBe(true);
        expect(isArgosWit("AnyProcess.TestVaultTestPlan", "TestVault.TestPlan")).toBe(true);
        expect(isArgosWit("X.TestVaultPrecondition", "TestVault.Precondition")).toBe(true);
        expect(isArgosWit("X.TestVaultTestCaseVersion", "TestVault.TestCaseVersion")).toBe(true);
        expect(isArgosWit("X.TestVaultAuditLog", "TestVault.AuditLog")).toBe(true);
    });
    
    it("does not match Microsoft native WITs", () => {
        expect(isArgosWit("Microsoft.VSTS.WorkItemTypes.TestCase", "TestVault.TestCase")).toBe(false);
        expect(isArgosWit("Microsoft.TestPlan", "TestVault.TestPlan")).toBe(false);
    });
    
    it("does not match custom WITs with similar names but no TestVault prefix in ado refName", () => {
        expect(isArgosWit("AnyProcess.MyTestCase", "TestVault.TestCase")).toBe(false);
        expect(isArgosWit("AnyProcess.TestCaseSomething", "TestVault.TestCase")).toBe(false);
    });
    
    it("requires schema refName to start with TestVault.", () => {
        expect(isArgosWit("X.TestVaultTestCase", "Other.TestCase")).toBe(false);
        expect(isArgosWit("X.TestVaultTestCase", "")).toBe(false);
    });
    
    it("requires exactly 2 dot-separated parts", () => {
        expect(isArgosWit("X.Y.Z.TestVaultTestCase", "TestVault.TestCase")).toBe(false);
        expect(isArgosWit("NoDotsHere", "TestVault.TestCase")).toBe(false);
    });
});

describe("findSchemaWitByAdoRefName", () => {
    const schemaWits = [
        { referenceName: "TestVault.TestCase" },
        { referenceName: "TestVault.TestPlan" },
        { referenceName: "TestVault.AuditLog" },
    ];
    
    it("finds matching schema entry from ado refName", () => {
        const result = findSchemaWitByAdoRefName("X.TestVaultTestPlan", schemaWits);
        expect(result?.referenceName).toBe("TestVault.TestPlan");
    });
    
    it("returns undefined if no match", () => {
        expect(findSchemaWitByAdoRefName("X.SomethingElse", schemaWits)).toBeUndefined();
    });
});
```

#### B3. Export depuis index.ts

```typescript
// packages/argos-sdk/src/index.ts
export * from "./wit-refname-matcher";
```

### Lot C -- SDK detectInstallState fix (~20 min)

#### C1. Modifier `packages/argos-sdk/src/process-install.ts` detectInstallState

```typescript
// AVANT (current ~ligne 144-160):
const witsRes = await doFetch(
    `${base}/${tv.typeId}/workItemTypes?api-version=${API_VERSION}`
);
const { value: wits } = await jsonOrThrow<{ value: Array<{ referenceName: string }> }>(witsRes);

const present = new Set(wits.map((w) => w.referenceName));
const expected = TESTVAULT_SCHEMA.wits.map((w) => w.referenceName);
const missingWitRefs = expected.filter((ref) => !present.has(ref));  // BROKEN

// APRES (Sprint 2.10):
import { isArgosWit } from "./wit-refname-matcher";

const witsRes = await doFetch(
    `${base}/${tv.typeId}/workItemTypes?api-version=${API_VERSION}`
);
const { value: wits } = await jsonOrThrow<{ value: Array<{ referenceName: string }> }>(witsRes);

// For each schema WIT, check if any ADO refName matches the pattern
const missingWitRefs = TESTVAULT_SCHEMA.wits
    .filter((schemaWit) => !wits.some((adoWit) => isArgosWit(adoWit.referenceName, schemaWit.referenceName)))
    .map((schemaWit) => schemaWit.referenceName);

if (missingWitRefs.length === 0) {
    return { status: "installed", ... };
}
```

### Lot D -- SDK Step 3 idempotency fix (Sprint 2.8 update) (~20 min)

#### D1. Modifier `packages/argos-sdk/src/process-install.ts` Step 3 idempotency

```typescript
// AVANT Sprint 2.8 (current):
const existingWitRefs = new Set<string>(
    existingWitsData.value
        .map((w) => w.referenceName)
        .filter((r) => r.startsWith("TestVault."))   // BROKEN - never matches ADO refNames
);

for (let i = 0; i < wits.length; i++) {
    const wit = wits[i];
    if (existingWitRefs.has(wit.referenceName)) {  // BROKEN
        emit({ phase: "creating-wits", message: `Skipping ${wit.displayName} (already exists)` });
        continue;
    }
    // ... POST WIT
}

// APRES (Sprint 2.10):
import { isArgosWit } from "./wit-refname-matcher";

// existingWitsData has all ado refNames in this process
const existingAdoWits = existingWitsData.value;  // Array<{ referenceName: string }>

for (let i = 0; i < wits.length; i++) {
    const wit = wits[i];
    
    // Check if this schema WIT is already installed (via pattern match)
    const existingAdoWit = existingAdoWits.find((adoWit) => 
        isArgosWit(adoWit.referenceName, wit.referenceName)
    );
    
    if (existingAdoWit) {
        emit({
            phase: "creating-wits",
            message: `Skipping ${wit.displayName} (already exists as ${existingAdoWit.referenceName})`,
            current: i + 1,
            total: wits.length,
        });
        continue;
    }
    
    // POST WIT (Lot A logic)
    // Use response refName for subsequent fields/states (Lot A logic)
}
```

### Lot E -- Extension argos-detection-api fix (~25 min)

#### E1. Verifier le code argos-detection-api

```powershell
Get-Content packages\argos-detection-api\src\index.ts -Encoding UTF8
# Voir comment isArgosInstalled est implementee
```

#### E2. Adapter pour use isArgosWit

Si l'extension fait quelque chose comme :
```typescript
async isArgosInstalled(orgUrl, projectName): Promise<boolean> {
    const wits = await fetchProjectWits(...);
    return wits.some(w => w.referenceName === "TestVault.TestCase");
}
```

Replacer par :
```typescript
import { isArgosWit } from "@atconseil/argos-sdk";

async isArgosInstalled(orgUrl, projectName): Promise<boolean> {
    const wits = await fetchProjectWits(...);
    // Argos installed = at least the TestCase WIT is present
    return wits.some(w => isArgosWit(w.referenceName, "TestVault.TestCase"));
}
```

#### E3. Tests adapter si necessaire

Si argos-detection-api a des tests, les adapter pour le nouveau pattern.

### Lot F -- Bump + tests + commit + PR (~20 min)

#### F1. Bump 0.5.11 -> 0.5.12

```powershell
node tools\release\bump-fixed-version.cjs 0.5.12

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### F2. CHANGELOG.md [0.5.12]

```markdown
## [0.5.12] - 2026-05-18

### Fixed

**Sprint 2.10 -- ADO auto-generated refName resolution (REFACTOR)**

CRITICAL bug discovered at E2E real test 2026-05-18 after Sprint 2.9 (icons fix):
```
VS402805: Cannot find work item type with reference name 'TestVault.TestCase'
```

Root cause: ADO ignores the `referenceName` in POST /workItemTypes body and
generates its own format: `{ProcessName_sans_espaces}.{WitName_sans_espaces}`.

Example:
- Schema referenceName: `TestVault.TestCase`
- Process name: `Argos Inherited Demo`
- ADO-generated refName: `ArgosInheritedDemo.TestVaultTestCase`

Our code stored "TestVault.TestCase" and POSTed fields/states to that URL -> 404.

### Architecture changes

NEW utility `packages/argos-sdk/src/wit-refname-matcher.ts`:
- `isArgosWit(adoRefName, schemaRefName)`: pattern-match ADO refNames to schema entries
- `findSchemaWitByAdoRefName(adoRefName, schemaWits)`: reverse lookup

Modified `packages/argos-sdk/src/process-install.ts`:
- Step 3 POST WIT: capture response.referenceName, use it for fields/states URLs
- Step 3 idempotency: detect existing WITs via pattern match (not exact prefix)
- detectInstallState: use isArgosWit for matching

Modified `packages/argos-detection-api/src/index.ts`:
- isArgosInstalled: use isArgosWit for pattern matching

### Tests

- 10+ new unit tests for isArgosWit / findSchemaWitByAdoRefName
- Pattern matching tested for : TestCase, TestPlan, TestSet, Precondition,
  TestExecution, TestCaseVersion, AuditLog
- All Sprint 2.7 charset + Sprint 2.8 idempotency + Sprint 2.9 icon tests still green

### TECH-DEBT

- TECH-DEBT-051 NEW LIVRE : ADO refName resolution
- TECH-DEBT-052 NEW : CRUD operations refName traduction (Sprint 2.11)
  - createWorkItem, updateWorkItem use schema refName -> 404
  - Need Map<schemaRefName, adoRefName> in extension/hub
  - Deferred to next sprint

### Lessons learned

- Microsoft REST API doc was incomplete (referenceName in body NOT supported)
- ADO has its own naming convention for inherited process custom WITs
- 6th E2E real test discovery -- TECH-DEBT-019 fully justified
- Pattern matching > exact string matching for ADO refNames
- Read POST response body, don't assume request matches storage

### Architecture preserved

- TESTVAULT_SCHEMA referenceName values immutable (constitution section 12)
- displayName Sprint 2.7 charset compliance maintained
- icon Sprint 2.9 ADO whitelist maintained
- idempotency Sprint 2.8 maintained (now with correct pattern matching)
```

#### F3. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-051 (Sprint 2.10) -- ADO refName resolution
- [ ] TECH-DEBT-052 NEW -- CRUD operations refName translation (Sprint 2.11)
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.10
```

#### F4. Pre-commit + commit + push

```powershell
$msg = "fix(sdk): Sprint 2.10 ADO auto-generated refName resolution (refactor)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.10 ADO auto-generated refName resolution (refactor)

CRITICAL refactor discovered at E2E real test 2026-05-18:
VS402805 because ADO generates refName as {ProcessName}.{WitName} ignoring
our `referenceName` in POST body.

Architecture:
- New utility wit-refname-matcher.ts with isArgosWit + findSchemaWitByAdoRefName
- SDK Step 3 reads POST response refName, uses it for fields/states URLs
- SDK Step 3 idempotency uses pattern match (not exact prefix)
- SDK detectInstallState uses isArgosWit
- Extension wit-schema-reader uses isArgosWit

Pattern :
  ADO generates : {ProcessName_sans_espaces}.{WitName_sans_espaces}
  Schema uses : TestVault.{WitNameCamelCase}
  Match : ado refName ends with TestVault + suffix from schema

Tests :
- 10+ unit tests wit-refname-matcher.test.ts
- All Sprint 2.7-2.9 tests still green
- Schema immutable per constitution section 12

TECH-DEBT :
- TECH-DEBT-051 LIVRE : ADO refName resolution
- TECH-DEBT-052 NEW : CRUD operations refName translation (Sprint 2.11)
- TECH-DEBT-019 (E2E reel) : retest after this sprint

Bump 0.5.11 -> 0.5.12 via script.

Refs:
- Sprint 2.7 (charset), 2.8 (idempotency), 2.9 (icons)
- Microsoft REST API : POST /workItemTypes body doesn't support referenceName
- Portal ADO confirmed : URL contains 'type-id=ArgosInheritedDemo.TestVaultTestCase'
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-10.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-10.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-10.txt"

git push -u origin feat/sprint-2-10-ado-refname-resolution
```

#### F5. PR + merge + archive

```powershell
$prBody = @'
## Summary

REFACTOR critical: ADO ignores `referenceName` in POST /workItemTypes body and 
auto-generates `{ProcessName}.{WitName}`. This broke fields/states POSTs and 
detection logic.

## Root cause

Our schema uses `TestVault.TestCase`. After install, ADO stores 
`ArgosInheritedDemo.TestVaultTestCase`. We POSTed fields to 
`/workItemTypes/TestVault.TestCase` -> 404 (VS402805).

## Fix

NEW utility `wit-refname-matcher.ts` :
- `isArgosWit(adoRefName, schemaRefName)`: pattern match
- `findSchemaWitByAdoRefName`: reverse lookup

SDK changes :
- Step 3 POST WIT: capture response.referenceName, use in fields/states URLs
- Step 3 idempotency: pattern match instead of prefix exact match
- detectInstallState: pattern match

Extension changes :
- argos-detection-api isArgosInstalled: pattern match

## Tests

- 10+ new unit tests for isArgosWit
- All Sprint 2.7-2.9 tests still green
- Schema immutable preserved

## After merge

1. Tag v0.5.12 + push -> triggers publish-marketplace + publish-cli
2. Cleanup BCEE-QA process "Argos Inherited Demo" + WIT residuel via portal
3. Re-run E2E with 0.5.12
4. Expected: install creates 7 WIT successfully with ADO-generated refNames
5. Verify portal: 7 WIT custom visible in process
6. Migrate DEMO project
7. Refresh extension -> wizard detects "Argos installed"
8. Create Test Case -> SUCCESS (no more VS402323)
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-10.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.10 ADO auto-generated refName resolution (refactor)" `
  --body-file "$env:TEMP\pr-body-sprint-2-10.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-10.txt"
```

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-10.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-10.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-10.md
}
```

#### F6. Post-merge cleanup

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-10-ado-refname-resolution 2>$null
git log --oneline | Select-Object -First 5
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA referenceName

Les `referenceName` du schema sont IMMUTABLES per constitution section 12.
Le schema reste source de verite cote produit.
La traduction se fait au runtime via `isArgosWit`.

### GF22 : NE PAS modifier displayName, icon, color, fields, states

Sprint 2.7 / 2.9 charset / icons restent intacts.

### GF23 : Tests Sprint 2.7, 2.8, 2.9 DOIVENT rester verts

charset tests, idempotency tests, icon tests - tous green.

### GF24 : isArgosWit doit etre conservatrice

Mieux vaut sous-detecter (false negative) que sur-detecter (false positive).
Si pas sur, return false.

### GF25 : Extension Argos test wizard apres install reussi

Pour Sprint 2.10 a etre considere "fini", le wizard refresh detection
doit afficher "Argos installed" (pas en boucle).

### GF26 : Documentation Microsoft confirmee

POST /workItemTypes body schema documente : pas de referenceName.
Verifiable :
https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/work-item-types/create

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-10-ado-refname-resolution

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
# Tests SDK
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 30
# Attendu : tous tests Sprint 2.8 idempotency + nouveaux wit-refname-matcher = VERT

# Tests argos-detection-api
pnpm --filter @atconseil/argos-detection-api test 2>&1 | Select-Object -Last 10

# Tests schema (Sprint 2.7 charset + 2.9 icons)
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 10

# Regression
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10

# Build/lint/typecheck
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# Mojibake + preflight
node tools\regression\scan-mojibake.cjs
pnpm preflight
# Attendu : PASSED argos@0.5.12
```

---

## Reporting utilisateur

1. **Apres Lot A** : "SDK Step 3 use response refName for fields/states URLs. Continue Lot B helper ?"
2. **Apres Lot B** : "wit-refname-matcher.ts NEW with 10+ unit tests. All passing. Continue Lot C detectInstallState ?"
3. **Apres Lot C** : "detectInstallState uses pattern match. Continue Lot D idempotency fix ?"
4. **Apres Lot D** : "Step 3 idempotency now uses pattern match. Continue Lot E extension fix ?"
5. **Apres Lot E** : "Extension argos-detection-api fixed. All tests passing. Continue Lot F bump+commit ?"
6. **Apres Lot F4** : "PR ouverte. Apres merge, lance Lot F6 cleanup + tag v0.5.12."

---

## Criteres de done

- [ ] Branche feat/sprint-2-10-ado-refname-resolution creee
- [ ] wit-refname-matcher.ts NEW dans argos-sdk
- [ ] 10+ tests unit wit-refname-matcher passing
- [ ] SDK Step 3 POST WIT lit response.referenceName
- [ ] SDK Step 3 fields/states URL utilisent adoRefName
- [ ] SDK Step 3 idempotency use pattern match
- [ ] SDK detectInstallState use pattern match
- [ ] Extension argos-detection-api adaptee
- [ ] All Sprint 2.7 charset tests STILL green
- [ ] All Sprint 2.8 idempotency tests STILL green
- [ ] All Sprint 2.9 icon tests STILL green
- [ ] Bump 0.5.11 -> 0.5.12 via script
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] ASCII commit message
- [ ] CHANGELOG [0.5.12] complete
- [ ] tasks.md TECH-DEBT-051 livre + TECH-DEBT-052 new
- [ ] Prompt archive
- [ ] PR ouverte
- [ ] Post-merge cleanup

---

## Apres ca

1. Merge PR
2. Tag v0.5.12 + push -> trigger 2 workflows publish
3. Verifier les 3 CI workflows verts

4. **Cleanup BCEE-QA obligatoire avant retest** (D93) :
   - Browse https://dev.azure.com/BCEE-QA/_settings/process
   - Click "Argos Inherited Demo"
   - Tab "Work item types"
   - DELETE le WIT custom "TestVault Test Case" residuel (cree par Sprint 2.9 retest)
   - OU : DELETE le process entier "Argos Inherited Demo"
   - Plus simple : delete process

5. **TEST E2E REEL FINAL** :
   - Generer NEW PAT BCEE-QA
   - Update Argos extension 0.5.12 sur BCEE-QA
   - Lance :
     ```
     npx -y @atconseil/argos-cli@0.5.12 install ^
       --org-url https://dev.azure.com/BCEE-QA ^
       --project "DEMO" ^
       --pat <NEW_PAT> ^
       --base-process Agile ^
       --process-name "Argos Inherited Demo" ^
       --skip-confirm
     ```
   
   - Resultat attendu :
     * "Reusing existing picklist..." (5 picklists)
     * "Creating TestVault Test Case... (1/7)"
       "Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase)"
     * ... etc pour les 7 WIT
     * "Installation complete!"

6. Verifier dans portal :
   - 7 WIT custom dans process
   - Chaque WIT a fields + states custom

7. Migrer projet DEMO sur le process

8. Refresh extension Argos -> wizard refresh detection :
   - "Argos installed in this project"
   - Click "Go to dashboard"

9. CREATE TEST CASE (bug original VS402323) :
   - Hub Cases > Title : "Test"
   - Click "Create Test Case"

   **ICI : potentiel bug 7** :
   Si l'extension utilise createWorkItem('TestVault.TestCase') au lieu du adoRefName,
   on aura encore 404. C'est le TECH-DEBT-052 NEW (deferred Sprint 2.11).
   
   Mais : il est possible que createWorkItem accepte le name display (pas le refName).
   A verifier.

10. Si tout marche : **MILESTONE PRODUIT REEL FONCTIONNEL**
    Si bug 7 (createWorkItem) : Sprint 2.11 documente, on cleanup

Bon sprint refactor !
