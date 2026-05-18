# Prompt Claude Code -- Sprint 2.11 ADO custom field Custom. prefix translation (`feat/sprint-2-11-ado-custom-field-prefix`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor : ADO force "Custom." prefix pour custom fields. Translation requise.
> Estimation : ~2h.

---

## Contexte critique

**Decouverte 2026-05-18 ~12h** : apres Sprint 2.10 livre argos@0.5.12 (WIT refName resolution),
test E2E reel a echoue sur fields creation :

```
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
Installation failed: TF51535: Cannot find field TestVault.Priority.
WorkItemTrackingFieldDefinitionNotFoundException
```

**Investigation Microsoft docs** :

Documentation officielle Azure DevOps Inherited Process :
> "When you add a custom field to an inherited process, Azure DevOps assigns it a
> reference name prefixed with Custom and removes any spaces from the field name.
> For example, a field named 'DevOps Triage' is assigned the reference name
> Custom.DevOpsTriage."

Source : https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field

**Cause confirmee** :

POST /workItemTypes/{adoWitRefName}/fields avec referenceName="TestVault.Priority":
- ADO interpret le prefix non-"Custom." comme reference a un field EXISTANT
- ADO cherche un field nomme "TestVault.Priority" -> introuvable
- Retourne TF51535 au lieu de creer le field

Si on envoie referenceName="Custom.TestVaultPriority" + name + type + picklistId :
- ADO interpret comme "creer field custom"
- Cree le field au niveau organisation (fields sont org-level)
- Attache au WIT

**Architecture observee** :

```
Schema entity            ADO namespace                         Sprint
========================  ====================================  =========
WIT refName              {ProcessName}.{WitName}               Sprint 2.10
Field refName            Custom.{FieldName}                    Sprint 2.11 (THIS)
Picklist name            {our_naming}-{field}                  Sprint 2.8
State name               local au WIT par display name         no refName issue
```

Refs :
- Sprint 2.7 (charset), 2.8 (idempotency), 2.9 (icons), 2.10 (WIT refName)
- packages/argos-sdk/src/process-install.ts (Step 3 fields POST)
- packages/argos-sdk/src/wit-refname-matcher.ts (Sprint 2.10 pattern a etendre)
- Microsoft REST API : https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/fields/add
- Microsoft inherited process field doc : 
  https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field
- TECH-DEBT-052 NEW : custom field "Custom." prefix translation (LIVRE ce sprint)
- TECH-DEBT-053 NEW : field-level idempotency at org level (deferred)
- TECH-DEBT-054 NEW : CRUD operations field refName translation in extension (deferred)

---

## Decisions actees lundi 2026-05-18 13h apres dejeuner

| # | Element | Choix |
|---|---|---|
| D95 | Strategie field refName | A -- Translation runtime "Custom." prefix |
| D96 | Schema modification | NON -- schema reste immutable (constitution section 12) |
| D97 | Idempotency field-level | DEFERRED Sprint 2.12 (TECH-DEBT-053) |
| D98 | Extension argos-detection-api fields | DEFERRED Sprint 2.12 (TECH-DEBT-054) |
| D99 | Migration BCEE-QA | Cleanup manuel process residuel via portal |
| D100 | Field name mapping | Camel-preserve : "TestVault.TestCaseRef" -> "Custom.TestVaultTestCaseRef" |

---

## Architecture cible

### Translation function

```typescript
// Schema field refName : "TestVault.Priority"
//   parts : ["TestVault", "Priority"]
//
// ADO field refName : "Custom.TestVaultPriority"
//   prefix : "Custom."
//   suffix : "TestVault" + "Priority" (camelCase preserved)

export function schemaToAdoFieldRefName(schemaRefName: string): string {
    if (!schemaRefName.startsWith("TestVault.")) {
        // Not a TestVault custom field (system or microsoft), use as-is
        return schemaRefName;
    }
    
    const parts = schemaRefName.split(".");
    if (parts.length !== 2) {
        throw new Error(`Invalid schema refName: ${schemaRefName}`);
    }
    
    // "TestVault.Priority" -> "Custom.TestVaultPriority"
    return `Custom.TestVault${parts[1]}`;
}

// Reverse direction (for reading from ADO)
export function isArgosField(adoFieldRefName: string, schemaFieldRefName: string): boolean {
    // Schema "TestVault.X" maps to ADO "Custom.TestVaultX"
    const expectedAdoRefName = schemaToAdoFieldRefName(schemaFieldRefName);
    return adoFieldRefName === expectedAdoRefName;
}
```

### Step 3 fields POST -- BEFORE / AFTER

```typescript
// BEFORE (Sprint 2.10 -- broken on fields):
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const body: Record<string, unknown> = {
        referenceName: field.referenceName,    // "TestVault.Priority" -- BROKEN
        name: field.displayName,
        type: ADO_FIELD_TYPE[field.type] ?? field.type,
        required: field.required,
    };
    if (field.defaultValue !== undefined) body.defaultValue = field.defaultValue;
    const plId = picklistIds.get(field.referenceName);
    if (plId) body.picklistId = plId;
    
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
        { method: "POST", headers: ..., body: JSON.stringify(body) }
    );
    await throwForStatus(fieldRes);
}

// AFTER (Sprint 2.11):
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const adoFieldRefName = schemaToAdoFieldRefName(field.referenceName);
    
    const body: Record<string, unknown> = {
        referenceName: adoFieldRefName,    // "Custom.TestVaultPriority" -- FIXED
        name: field.displayName,
        type: ADO_FIELD_TYPE[field.type] ?? field.type,
        required: field.required,
    };
    if (field.defaultValue !== undefined) body.defaultValue = field.defaultValue;
    const plId = picklistIds.get(field.referenceName);
    if (plId) body.picklistId = plId;
    
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    
    // Read response (optional but useful for logging)
    const fieldData = await jsonOrThrow<{ referenceName: string; name: string }>(fieldRes);
    emit({
        phase: "creating-wits",
        message: `Added field ${field.displayName} (${fieldData.referenceName}) to ${wit.displayName}`,
        current: i + 1,
        total: wits.length,
    });
}
```

---

## Composition exacte du sprint -- 5 LOTS

### Lot A -- Field refName translation helper (~20 min)

#### A1. Etendre `packages/argos-sdk/src/wit-refname-matcher.ts`

Ajouter les fonctions field-related a cote des fonctions WIT existantes :

```typescript
// Existing (Sprint 2.10):
//   isArgosWit(adoRefName: string, schemaRefName: string): boolean
//   findSchemaWitByAdoRefName<T>(adoRefName: string, schemaWits: ReadonlyArray<T>): T | undefined

// NEW (Sprint 2.11):

/**
 * Translate a schema field referenceName to its ADO counterpart.
 * 
 * ADO inherited processes force "Custom." prefix for custom fields.
 * Schema uses "TestVault.{FieldName}" -- we translate to "Custom.TestVault{FieldName}".
 * 
 * System fields (System.*) and Microsoft fields (Microsoft.*) pass through unchanged.
 * 
 * Examples:
 *   "TestVault.Priority"   -> "Custom.TestVaultPriority"
 *   "TestVault.Steps"      -> "Custom.TestVaultSteps"
 *   "System.Title"         -> "System.Title"
 *   "Microsoft.VSTS.Common.Priority" -> "Microsoft.VSTS.Common.Priority"
 */
export function schemaToAdoFieldRefName(schemaFieldRefName: string): string {
    // Pass-through for non-TestVault fields (system/Microsoft fields)
    if (!schemaFieldRefName.startsWith("TestVault.")) {
        return schemaFieldRefName;
    }
    
    const parts = schemaFieldRefName.split(".");
    if (parts.length !== 2) {
        throw new Error(
            `Invalid schema field refName: "${schemaFieldRefName}". Expected format "TestVault.{FieldName}".`
        );
    }
    
    const fieldNamePart = parts[1];
    return `Custom.TestVault${fieldNamePart}`;
}

/**
 * Check if an ADO field referenceName matches a schema field entry.
 * 
 * Conservative match: ADO refName must be exactly the expected translation.
 */
export function isArgosField(
    adoFieldRefName: string,
    schemaFieldRefName: string
): boolean {
    try {
        const expected = schemaToAdoFieldRefName(schemaFieldRefName);
        return adoFieldRefName === expected;
    } catch {
        return false;
    }
}

/**
 * Given an ADO field refName, find the matching schema entry if any.
 * 
 * Searches a list of schema fields and returns the one that matches.
 */
export function findSchemaFieldByAdoRefName<T extends { referenceName: string }>(
    adoFieldRefName: string,
    schemaFields: ReadonlyArray<T>
): T | undefined {
    return schemaFields.find((f) => isArgosField(adoFieldRefName, f.referenceName));
}
```

#### A2. Tests unitaires

Etendre `packages/argos-sdk/src/wit-refname-matcher.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import {
    isArgosWit,
    findSchemaWitByAdoRefName,
    // NEW
    schemaToAdoFieldRefName,
    isArgosField,
    findSchemaFieldByAdoRefName,
} from "./wit-refname-matcher";

// ... existing WIT tests ...

describe("schemaToAdoFieldRefName (Sprint 2.11)", () => {
    it("translates TestVault.* to Custom.TestVault* (camel-preserved)", () => {
        expect(schemaToAdoFieldRefName("TestVault.Priority")).toBe("Custom.TestVaultPriority");
        expect(schemaToAdoFieldRefName("TestVault.Severity")).toBe("Custom.TestVaultSeverity");
        expect(schemaToAdoFieldRefName("TestVault.Environment")).toBe("Custom.TestVaultEnvironment");
        expect(schemaToAdoFieldRefName("TestVault.Steps")).toBe("Custom.TestVaultSteps");
        expect(schemaToAdoFieldRefName("TestVault.TestCaseRef")).toBe("Custom.TestVaultTestCaseRef");
        expect(schemaToAdoFieldRefName("TestVault.GherkinFeature")).toBe("Custom.TestVaultGherkinFeature");
    });
    
    it("passes through System.* fields unchanged", () => {
        expect(schemaToAdoFieldRefName("System.Title")).toBe("System.Title");
        expect(schemaToAdoFieldRefName("System.Description")).toBe("System.Description");
        expect(schemaToAdoFieldRefName("System.State")).toBe("System.State");
    });
    
    it("passes through Microsoft.* fields unchanged", () => {
        expect(schemaToAdoFieldRefName("Microsoft.VSTS.Common.Priority")).toBe("Microsoft.VSTS.Common.Priority");
    });
    
    it("throws on invalid TestVault.* format (more than 2 parts)", () => {
        expect(() => schemaToAdoFieldRefName("TestVault.A.B")).toThrow(/Invalid schema field refName/);
    });
    
    it("throws on TestVault. with no suffix", () => {
        expect(() => schemaToAdoFieldRefName("TestVault.")).toThrow();
    });
});

describe("isArgosField (Sprint 2.11)", () => {
    it("matches ADO refName generated from TestVault schema field", () => {
        expect(isArgosField("Custom.TestVaultPriority", "TestVault.Priority")).toBe(true);
        expect(isArgosField("Custom.TestVaultSteps", "TestVault.Steps")).toBe(true);
        expect(isArgosField("Custom.TestVaultGherkinFeature", "TestVault.GherkinFeature")).toBe(true);
    });
    
    it("does not match wrong prefix", () => {
        expect(isArgosField("TestVault.Priority", "TestVault.Priority")).toBe(false);
        expect(isArgosField("Custom.Priority", "TestVault.Priority")).toBe(false);
        expect(isArgosField("MyOrg.TestVaultPriority", "TestVault.Priority")).toBe(false);
    });
    
    it("does not match wrong suffix", () => {
        expect(isArgosField("Custom.TestVaultSeverity", "TestVault.Priority")).toBe(false);
        expect(isArgosField("Custom.TestVaultPriorityX", "TestVault.Priority")).toBe(false);
    });
    
    it("does not match System or Microsoft fields", () => {
        expect(isArgosField("System.Title", "TestVault.Priority")).toBe(false);
        expect(isArgosField("Microsoft.VSTS.Common.Priority", "TestVault.Priority")).toBe(false);
    });
    
    it("handles invalid schema refName gracefully", () => {
        expect(isArgosField("Custom.TestVaultPriority", "TestVault.A.B")).toBe(false);
        expect(isArgosField("Custom.TestVaultPriority", "")).toBe(false);
    });
});

describe("findSchemaFieldByAdoRefName (Sprint 2.11)", () => {
    const schemaFields = [
        { referenceName: "TestVault.Priority" },
        { referenceName: "TestVault.Severity" },
        { referenceName: "TestVault.Steps" },
    ];
    
    it("finds matching schema entry from ADO refName", () => {
        const result = findSchemaFieldByAdoRefName("Custom.TestVaultSeverity", schemaFields);
        expect(result?.referenceName).toBe("TestVault.Severity");
    });
    
    it("returns undefined if no match", () => {
        expect(findSchemaFieldByAdoRefName("Custom.OtherField", schemaFields)).toBeUndefined();
        expect(findSchemaFieldByAdoRefName("System.Title", schemaFields)).toBeUndefined();
    });
});
```

### Lot B -- SDK Step 3 fields POST use translated refName (~25 min)

#### B1. Modifier `packages/argos-sdk/src/process-install.ts` Step 3 fields loop

Localiser le code des fields creation (~ligne 304-326). Modification minimale :

```typescript
// Import at top
import { schemaToAdoFieldRefName } from "./wit-refname-matcher";

// ... inside the WIT creation loop, after adoRefName captured ...

// Add custom fields -- use ADO-generated refName in URL + Custom. prefix for field refName
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    // NEW: translate schema refName to ADO format
    const adoFieldRefName = schemaToAdoFieldRefName(field.referenceName);
    
    const body: Record<string, unknown> = {
        referenceName: adoFieldRefName,    // CHANGED
        name: field.displayName,
        type: ADO_FIELD_TYPE[field.type] ?? field.type,
        required: field.required,
    };
    if (field.defaultValue !== undefined) body.defaultValue = field.defaultValue;
    
    const plId = picklistIds.get(field.referenceName);  // picklistIds keyed by SCHEMA refName, unchanged
    if (plId) body.picklistId = plId;
    
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );
    await throwForStatus(fieldRes);
    
    emit({
        phase: "creating-wits",
        message: `  Added field "${field.displayName}" (${adoFieldRefName}) to ${wit.displayName}`,
        current: i + 1,
        total: wits.length,
    });
}
```

#### B2. Verifications

- Le `picklistIds` Map est keyed par schema refName ("TestVault.Priority"). Inchange.
- L'URL utilise adoRefName (du WIT, Sprint 2.10). Inchange.
- Le body uniquement change pour referenceName field.
- Log emit pour visibilite.

### Lot C -- States loop verification (~5 min)

#### C1. Verifier que les states POST n'utilisent pas le field refName

```powershell
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-Object -Skip 327 -First 20
```

Le code states POST (~ligne 329-343) doit utiliser :
- URL : `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states`
- Body : `{ name: state.name, color: state.color.replace("#", ""), stateCategory: state.stateCategory }`

States n'ont pas de referenceName, juste name. Pas de translation necessaire.

Verifier que :
- URL utilise adoRefName (du WIT, Sprint 2.10)
- Body inchange

Si tout est OK : pas de modification states.

### Lot D -- Tests + bump + commit + PR (~30 min)

#### D1. Validation complete

```powershell
# Tests SDK
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 50
# Attendu : tous tests Sprint 2.10 + nouveaux Sprint 2.11 = VERT

# Tests autres packages
pnpm --filter @atconseil/argos-detection-api test 2>&1 | Select-Object -Last 10
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 10
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10

# Build/lint/typecheck
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# Mojibake + preflight
node tools\regression\scan-mojibake.cjs
pnpm preflight
```

#### D2. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-field-refname-translation.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG field refName translation (Sprint 2.11)", () => {
    const root = resolve(__dirname, "../../..");
    
    it("wit-refname-matcher.ts contains field translation functions", () => {
        const path = resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoFieldRefName");
        expect(content).toContain("isArgosField");
        expect(content).toContain("Custom.TestVault");
    });
    
    it("process-install.ts uses schemaToAdoFieldRefName for field POST", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoFieldRefName");
        expect(content).toContain("adoFieldRefName");
    });
    
    it("process-install.ts does NOT send schema TestVault.* refName as field referenceName", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        // The body should reference adoFieldRefName, not the raw schema field.referenceName
        // Check that within the fields POST area, we use adoFieldRefName
        const fieldsBlockMatch = content.match(/Add custom fields[\s\S]*?for \(const state of wit\.states\)/);
        expect(fieldsBlockMatch, "Could not locate fields POST block").not.toBeNull();
        const fieldsBlock = fieldsBlockMatch![0];
        expect(fieldsBlock).toContain("adoFieldRefName");
        // Should NOT have referenceName: field.referenceName in the body construction
        expect(fieldsBlock).not.toMatch(/referenceName:\s*field\.referenceName/);
    });
});
```

#### D3. Bump 0.5.12 -> 0.5.13

```powershell
node tools\release\bump-fixed-version.cjs 0.5.13

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D4. CHANGELOG.md [0.5.13]

```markdown
## [0.5.13] - 2026-05-18

### Fixed

**Sprint 2.11 -- ADO custom field "Custom." prefix translation (REFACTOR)**

CRITICAL bug discovered at E2E real test 2026-05-18 after Sprint 2.10 (WIT refName fix):
```
TF51535: Cannot find field TestVault.Priority.
```

Root cause: ADO inherited processes force "Custom." prefix for custom field
referenceNames. Microsoft documentation:
> "When you add a custom field to an inherited process, Azure DevOps assigns it
>  a reference name prefixed with Custom and removes any spaces from the field
>  name."

Our schema uses "TestVault.X" for fields. ADO rejected with TF51535 because
it interpreted non-"Custom." prefix as a reference to an existing field
(which doesn't exist).

### Architecture changes

Extended `packages/argos-sdk/src/wit-refname-matcher.ts`:
- `schemaToAdoFieldRefName(schemaRefName)`: translates "TestVault.X" -> "Custom.TestVaultX"
- `isArgosField(adoRefName, schemaRefName)`: pattern match for fields
- `findSchemaFieldByAdoRefName(adoRefName, schemaFields)`: reverse lookup

Modified `packages/argos-sdk/src/process-install.ts`:
- Step 3 field POST: translate referenceName before sending to ADO
- Body unchanged otherwise (name, type, picklistId, required, defaultValue preserved)
- URL still uses adoRefName from WIT (Sprint 2.10)

### Translation pattern summary

```
Sprint    Entity         Schema                  ADO
-------   ------         ---------------         ----------------------------
2.10      WIT            TestVault.TestCase      {ProcessName}.TestVaultTestCase
2.11      Field          TestVault.Priority      Custom.TestVaultPriority
```

System fields (System.*) and Microsoft fields (Microsoft.*) pass through unchanged.

### Tests

- 15+ new unit tests for schemaToAdoFieldRefName + isArgosField + findSchemaFieldByAdoRefName
- CFG regression test CFG-2026-05-18-field-refname-translation
- All Sprint 2.7-2.10 tests still green

### TECH-DEBT

- TECH-DEBT-052 NEW LIVRE: Custom. prefix translation for fields
- TECH-DEBT-053 NEW: field-level idempotency at org level (deferred Sprint 2.12)
- TECH-DEBT-054 NEW: extension argos-detection-api fields refName translation
  (CRUD operations) (deferred Sprint 2.12)
- TECH-DEBT-019 (E2E reel): un cran de plus, retest after this sprint

### Lessons learned

- ADO inherited process has different namespace conventions per entity type:
  WITs : {ProcessName}.X (Sprint 2.10)
  Fields : Custom.X (Sprint 2.11)
  Picklists : (our naming, org-level)
  States : local to WIT, no refName
- Custom fields are organization-level (not process-level), shared across processes
- Microsoft REST API doc incomplete (doesn't explicitly state Custom. requirement)
- Field type "picklistString" is accepted by ADO with picklistId reference

### Architecture preserved

- TESTVAULT_SCHEMA referenceName values immutable (constitution section 12)
- Sprint 2.7 charset compliance maintained
- Sprint 2.8 idempotency maintained (picklists)
- Sprint 2.9 ADO icon compliance maintained
- Sprint 2.10 WIT refName resolution maintained
```

#### D5. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-052 (Sprint 2.11) -- Custom. prefix translation for fields
- [ ] TECH-DEBT-053 NEW -- field-level idempotency at org level (Sprint 2.12)
- [ ] TECH-DEBT-054 NEW -- extension argos-detection-api fields refName translation (Sprint 2.12)
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.11
```

#### D6. Pre-commit + commit

```powershell
$msg = "fix(sdk): Sprint 2.11 ADO custom field Custom. prefix translation"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.11 ADO custom field Custom. prefix translation

CRITICAL fix discovered at E2E real test 2026-05-18:
TF51535 because ADO inherited processes force "Custom." prefix for custom
field referenceNames. Our schema "TestVault.Priority" was rejected.

Architecture:
- Extended wit-refname-matcher.ts with:
  * schemaToAdoFieldRefName(schemaRefName)
    "TestVault.Priority" -> "Custom.TestVaultPriority"
  * isArgosField, findSchemaFieldByAdoRefName
- SDK Step 3 fields POST translates referenceName before sending to ADO
- Body unchanged otherwise (name, type, picklistId, required preserved)

Pattern summary :
  Sprint 2.10 : WIT  schema TestVault.TestCase -> ADO {ProcessName}.TestVaultTestCase
  Sprint 2.11 : Field schema TestVault.Priority -> ADO Custom.TestVaultPriority

System.* and Microsoft.* fields pass through unchanged.

Tests :
- 15+ new unit tests
- CFG-2026-05-18-field-refname-translation
- All Sprint 2.7-2.10 tests still green

TECH-DEBT :
- TECH-DEBT-052 LIVRE : Custom. prefix translation
- TECH-DEBT-053 NEW : field-level idempotency (Sprint 2.12)
- TECH-DEBT-054 NEW : extension fields refName translation (Sprint 2.12)
- TECH-DEBT-019 (E2E reel) : retest after this sprint

Bump 0.5.12 -> 0.5.13 via script.

Refs:
- Sprint 2.7-2.10
- Microsoft doc : https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field
- "When you add a custom field to an inherited process, Azure DevOps assigns
   it a reference name prefixed with Custom"
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-11.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-11.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-11.txt"

git push -u origin feat/sprint-2-11-ado-custom-field-prefix
```

#### D7. PR

```powershell
$prBody = @'
## Summary

Sprint 2.11 -- Translate field referenceNames from schema "TestVault.*" to ADO "Custom.TestVault*".

ADO inherited processes force "Custom." prefix for custom field referenceNames per Microsoft docs.

## Root cause

After Sprint 2.10 (WIT refName resolution), fields POST still failed with TF51535. 
ADO doesn't allow custom fields with non-"Custom." prefix in inherited processes.

## Fix

Pattern : same translation approach as Sprint 2.10 but for fields.

| Sprint | Entity | Schema | ADO |
|--------|--------|--------|-----|
| 2.10 | WIT | TestVault.TestCase | {ProcessName}.TestVaultTestCase |
| 2.11 | Field | TestVault.Priority | Custom.TestVaultPriority |

Extended `wit-refname-matcher.ts` with `schemaToAdoFieldRefName`, `isArgosField`, `findSchemaFieldByAdoRefName`.

SDK Step 3 fields POST now translates referenceName before sending. Body otherwise unchanged.

## Tests

- 15+ new unit tests
- CFG-2026-05-18-field-refname-translation regression test
- All Sprint 2.7-2.10 tests still green
- Schema immutable preserved (constitution section 12)

## After merge

1. Tag v0.5.13 + push -> triggers publish-marketplace + publish-cli
2. Cleanup BCEE-QA: delete process "Argos Inherited Demo" + WIT residuel via portal
3. Re-run E2E with 0.5.13
4. Expected: 7 WIT + their fields + states all created successfully
5. Verify portal: process has 7 custom WIT with all custom fields (Custom.TestVault*)
6. Migrate DEMO project
7. Refresh extension -> wizard detects "Argos installed"
8. Create Test Case via extension UI -> potentially bug 8 (extension CRUD uses schema refName)
   -> If bug 8: defer to Sprint 2.12 (TECH-DEBT-054)
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-11.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.11 ADO custom field Custom. prefix translation" `
  --body-file "$env:TEMP\pr-body-sprint-2-11.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-11.txt"
```

#### D8. Archive prompt + cleanup

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-11.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-11.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-11.md
}
```

```powershell
# Post-merge
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-11-ado-custom-field-prefix 2>$null
git log --oneline | Select-Object -First 5
```

### Lot E -- Tag + retest E2E (apres merge, ~15 min)

#### E1. Tag v0.5.13

```powershell
git checkout main
git pull
git tag -a v0.5.13 -m "Release v0.5.13 -- Sprint 2.11 ADO custom field Custom. prefix translation"
git push origin v0.5.13
```

#### E2. Surveille les 2 CI workflows (5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions

1. "Publish -- Marketplace" -> Argos 0.5.13
2. "Publish CLI -- npm" -> @atconseil/argos-cli@0.5.13
```

#### E3. Cleanup BCEE-QA

```
Browse https://dev.azure.com/BCEE-QA/_settings/process
Click "Argos Inherited Demo"
- Tab Projects : verifier qu'aucun projet ne l'utilise (sinon Migration back)
- Bouton "..." > Delete process (ou Disable + Delete)

Note: les picklists TestVault-* (5 visibles) peuvent rester. Idempotency les reuse.

Generer nouveau PAT BCEE-QA (1 day):
- Process: Read & manage
- Project and Team: Read, write, manage
```

#### E4. Update Argos extension 0.5.13

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
Click "Argos Testing"
If "Update available" 0.5.13 : Update + approuver scopes
```

#### E5. TEST E2E REEL FINAL

```powershell
# Verifier que 0.5.13 est sur npm
npm view @atconseil/argos-cli@0.5.13 version

# Lance install (ATTENTION : ne JAMAIS coller PAT dans le chat)
npx -y @atconseil/argos-cli@0.5.13 install `
    --org-url https://dev.azure.com/BCEE-QA `
    --project "DEMO" `
    --pat "[ton_PAT_FRAIS]" `
    --base-process Agile `
    --process-name "Argos Inherited Demo" `
    --skip-confirm
```

#### E6. Resultat attendu

```
Checking Argos installation state on https://dev.azure.com/BCEE-QA/DEMO...
[INFO] Argos not installed. Will create new process inheritance.
[creating-process] Creating process "Argos Inherited Demo"...
[creating-picklists] Checking existing picklists...
[creating-picklists] Found 5 existing picklists in organization.
[creating-picklists] Reusing existing picklist "TestVault-Priority"...
...
[creating-wits] Checking existing work item types...
[creating-wits] Found 0 existing TestVault WITs in process.
[creating-wits] Creating TestVault Test Case... (1/7)
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   Added field "Priority" (Custom.TestVaultPriority) to TestVault Test Case
[creating-wits]   Added field "Steps" (Custom.TestVaultSteps) to TestVault Test Case
[creating-wits]   Added field "GherkinFeature" (Custom.TestVaultGherkinFeature) to TestVault Test Case
[creating-wits]   ... etc
[creating-wits] Creating TestVault Test Plan... (2/7)
...
[creating-wits] Creating TestVault Audit Log... (7/7)
[done] Installation complete!

[OK] Installation complete!
  Process ID: <GUID>
  Process name: Argos Inherited Demo
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable. Le schema reste source de verite cote produit.
La traduction se fait UNIQUEMENT au runtime via les helpers.

### GF22 : NE PAS toucher autres parts du SDK

Step 1 (process), Step 2 (picklists), Step 3 WIT POST, states POST : INCHANGES.
Seul le code des fields POST dans la boucle interne change.

### GF23 : Sprint 2.7-2.10 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF24 : Function name semantics

`schemaToAdoFieldRefName` est explicite sur la direction.
Pas de fonction inverse (`adoToSchemaFieldRefName`) ce sprint (pas necessaire pour POST).
Si besoin lookup inverse : `findSchemaFieldByAdoRefName` suffit.

### GF25 : Tests doivent inclure les 30+ schema fields

Pour valider la pattern, tester plusieurs noms reels :
TestCase, TestPlan, TestSet, Precondition, TestExecution, TestCaseVersion, AuditLog
+ field names varies : Priority, Steps, GherkinFeature, AutomationStatus, etc.

### GF26 : Pas de modification dans argos-detection-api

L'extension est DEFERREE Sprint 2.12 (TECH-DEBT-054).
Apres Sprint 2.11, l'install marchera mais probablement la Create Test Case dans
l'extension echouera (bug 8). On gere ca Sprint 2.12.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-11-ado-custom-field-prefix

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Reporting utilisateur

1. **Apres Lot A** : "Helper functions added (schemaToAdoFieldRefName + isArgosField + findSchemaFieldByAdoRefName). 15+ tests passing. Continue Lot B SDK fix ?"
2. **Apres Lot B** : "SDK Step 3 fields POST uses translated refName. Continue Lot C verify states ?"
3. **Apres Lot C** : "States POST verified unchanged. Continue Lot D bump+commit ?"
4. **Apres Lot D6** : "PR ouverte. Apres merge GitHub, lance Lot E tag + retest E2E."

---

## Criteres de done

- [ ] Branche feat/sprint-2-11-ado-custom-field-prefix creee
- [ ] wit-refname-matcher.ts ETENDU avec 3 nouvelles fonctions
- [ ] 15+ tests unit pour les fonctions field-related passing
- [ ] SDK Step 3 fields POST utilise adoFieldRefName
- [ ] States POST verifie inchange
- [ ] All Sprint 2.7-2.10 tests STILL green
- [ ] Bump 0.5.12 -> 0.5.13 via script
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] CFG-2026-05-18-field-refname-translation NEW + passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] ASCII commit message
- [ ] CHANGELOG [0.5.13] complete
- [ ] tasks.md TECH-DEBT-052 livre + TECH-DEBT-053/054 new
- [ ] Prompt archive
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.13 + push
- [ ] CI workflows verts
- [ ] Cleanup BCEE-QA fait
- [ ] Test E2E install reussi avec 7 WIT + leurs fields + states

---

## Apres ca

### Si install E2E reussit (le scenario heureux)

1. Verifier portal ADO :
   - Process "Argos Inherited Demo"
   - 7 WIT custom (TestVault Test Case, etc.)
   - Pour chaque WIT : champ "Layout" doit montrer les fields Custom.TestVault*
   - Pour chaque WIT : champ "States" doit montrer les states custom

2. Migration projet DEMO :
   - Process > Argos Inherited Demo > Projects tab
   - Cocher DEMO + Save

3. Refresh extension Argos 0.5.13 :
   - Browse https://dev.azure.com/BCEE-QA/DEMO
   - Ctrl+F5
   - Hub Argos > Cases
   - Wizard "Get Started" peut apparaitre OU pas

4. **MOMENT DE VERITE 2** : Create Test Case
   - Hub Cases > Title : "Mon premier"
   - Click "Create Test Case"
   - Resultat possible :
     A. SUCCESS -> MILESTONE PRODUIT FONCTIONNEL
     B. Error (probablement 404 ou TF51535) sur referenceName "TestVault.Priority"
        -> Sprint 2.12 (TECH-DEBT-054) extension argos-detection-api translation
     C. Autre erreur encore inconnue
        -> Diagnostique et plan

### Si install E2E echoue (bug 8 architecturel)

1. Documenter avec log complet
2. Probable cause : autre champ obligatoire manquant dans body, ou autre
3. Reprendre le pattern de cette session :
   - Diagnostic precis
   - Recherche doc Microsoft
   - Decisions D101+ ancrees
   - Sprint hotfix suivant

---

## Note moral

Cette session est une demonstration tres pure de "test-driven discovery" sur un
produit complexe. Apres Sprint 2.11, les couches d'oignon E2E pour le install
seront probablement traversees (process + picklists + WITs + fields + states).

La prochaine couche probable : extension argos-detection-api qui fait des CRUD
en utilisant les schema refNames. Sprint 2.12 ou demain.

Bon sprint refactor !
