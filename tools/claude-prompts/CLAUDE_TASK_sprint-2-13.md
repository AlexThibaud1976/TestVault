# Prompt Claude Code -- Sprint 2.13 robust field naming + pre-flight + smart idempotency (`feat/sprint-2-13-field-name-robustness`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor robuste : translation display name + pre-flight + smart idempotency + error handling.
> Estimation : ~2-2.5h.

---

## Contexte critique

**Decouverte 2026-05-18 ~15h** : apres Sprint 2.12 livre argos@0.5.14 (2-step workflow),
test E2E reel a echoue avec UNE NOUVELLE ERREUR :

```
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   Creating org-level field Custom.TestVaultPriority... (1/7)
Installation failed: VS402803: Field name 'Priority' you specified is already in use, choose a different name.
ProcessFieldAlreadyExistsInformedException
```

**Investigation Microsoft docs exhaustive** :

> "Field names must be unique within the organization. A custom field in one
>  process can't share the same name as a field in another process."

> "Field names and definitions apply to the entire organization. You can't
>  add a field with a field name that already exists in the organization or
>  that another inherited process added to a WIT."

Source : 
- https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field
- https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/inheritance-process-model

**Cause confirmee** :

ADO impose DEUX contraintes uniques sur custom fields :
1. **referenceName** unique org-level (fixe Sprint 2.11/2.12 via Custom.TestVaultX)
2. **name (display)** unique org-level <-- NOUVELLE CONTRAINTE non documentee clairement

Notre schema utilise des display names generiques :
- "Priority"   -> collision avec Microsoft.VSTS.Common.Priority
- "Severity"   -> collision potentielle Microsoft.VSTS.Common.Severity
- "Steps"      -> collision potentielle Microsoft.VSTS.TCM.Steps
- "Description"-> collision avec System.Description (probable)
- ... etc

**Regles ADO complementaires decouvertes** :
- Field name max 128 chars
- Caracteres interdits : `. , ; ' : ~ \ / * | ? " & % $ ! + = ( ) [ ] { } < >`
- Once created, name + type IMMUTABLE
- Each field has ONE type across organization (string ou integer, pas les deux)
- 1024 fields max per process (system + inherited + custom)

Refs :
- Sprint 2.7-2.12 (chaine SDK)
- Microsoft create field : https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/fields/create
- Microsoft naming restrictions : https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions
- TECH-DEBT-055 NEW : robust field naming + pre-flight + smart idempotency (LIVRE ce sprint)
- TECH-DEBT-054 RENUMBERED : extension CRUD operations refName translation (Sprint 2.14)

---

## Decisions actees lundi 2026-05-18 15h

| # | Element | Choix |
|---|---|---|
| D106 | Strategie display name | A -- Prefix "TestVault " systematique |
| D107 | Pre-flight validation | A -- GET org fields + analyser collisions AVANT POST |
| D108 | Smart idempotency | A -- 3 niveaux (refName + name + WIT attach) |
| D109 | Error handling explicit | A -- Map ADO error codes vers messages clairs |
| D110 | Schema mutability | NON -- schema reste immuable (constitution section 12) |
| D111 | Microsoft fields reuse | NON ce sprint -- defer pour ne pas casser semantique TestVault |

---

## Architecture cible -- 7 mecanismes anti-erreurs

### Mecanisme 1 : Translation display name (NEW Sprint 2.13)

```typescript
// Pattern coherent avec Sprint 2.11 (refName translation)
//
// Schema:    displayName "Priority"
// ADO POST:  name "TestVault Priority"
//
// All schema field displayNames are prefixed at runtime with "TestVault "

export function schemaToAdoFieldName(schemaDisplayName: string): string {
    // If already prefixed, no double-prefix
    if (schemaDisplayName.startsWith("TestVault ")) {
        return schemaDisplayName;
    }
    return `TestVault ${schemaDisplayName}`;
}
```

### Mecanisme 2 : Pre-flight validation (NEW Sprint 2.13)

```typescript
// Before any POST in Step 3, validate against existing org-level fields
//
// GET /_apis/wit/fields?api-version=7.1
// Build:
//   - orgFieldsByRefName: Map<string, AdoField>
//   - orgFieldsByName:    Map<string, AdoField>
//
// For each schema field:
//   - Compute target refName "Custom.TestVaultX"
//   - Compute target name "TestVault X"
//   - If refName exists in org with our prefix : OK (will skip create, attach)
//   - If name exists in org with DIFFERENT refName : CONFLICT, error early
//   - If neither : will be created
//
// Result: VALIDATED ORG STATE before any POST happens.
// Fail-fast saves time and avoids partial install.

interface PreflightReport {
    canProceed: boolean;
    summary: {
        toCreate: Array<{ schemaRef: string; adoRef: string; adoName: string }>;
        toReuse:  Array<{ schemaRef: string; adoRef: string; adoName: string }>;
        conflicts: Array<{ schemaRef: string; adoName: string; conflictingRef: string }>;
    };
    errors: string[];
}
```

### Mecanisme 3 : Smart 3-level idempotency (extend Sprint 2.12)

```typescript
// Level 1 : Org-level by refName
//   GET /_apis/wit/fields/{Custom.TestVaultX}
//   If 200 : field exists. Check type compatibility.
//   If 404 : field needs creation.
//
// Level 2 : Org-level by name (NEW Sprint 2.13)
//   Searches orgFieldsByName Map from preflight
//   Detects name conflicts BEFORE POST that would 409.
//
// Level 3 : WIT-level attach idempotency
//   If field is at org and not yet attached to WIT : POST attach
//   If already attached : Status varies (could 409). Treat as success.
```

### Mecanisme 4 : Type compatibility check (NEW Sprint 2.13)

```typescript
// If reusing an existing org-level field:
//   - Check that its type matches our schema type
//   - "Each field has ONE type within organization"
//   - If incompatible : error clear with both types in message
//
// Example :
//   Schema "TestVault.Priority" wants picklistString
//   Org has Custom.TestVaultPriority with type "string" (compatible)
//   -> OK reuse
//
//   Schema "TestVault.Priority" wants picklistString  
//   Org has Custom.TestVaultPriority with type "integer" (incompatible)
//   -> ERROR clear : "Type mismatch: schema=string, ado=integer"
```

### Mecanisme 5 : Robust error handling per ADO error code

```typescript
const ADO_FIELD_ERROR_CODES: Record<string, string> = {
    "VS402803": "Field name conflict: another field already uses this name org-wide. Consider renaming schema field displayName.",
    "VS402805": "Field referenceName not found. This should not happen after Sprint 2.13 pre-flight.",
    "TF51535":  "Field definition not found in ADO. Expected after create -- check create succeeded.",
    "TF26027":  "Field reference not found. Check refName translation.",
    "VS402323": "Work item creation forbidden. WIT may not be installed.",
};

// In throwForStatus / error wrappers, parse the body for "typeKey" or "errorCode"
// and provide a CONTEXTUAL message with the schema field name.
```

### Mecanisme 6 : Structured logging

```typescript
// Every decision logged with consistent format:
//
// [VALIDATE] Pre-flight: 30 schema fields. 25 to create, 5 to reuse, 0 conflicts.
// [REUSE]    Custom.TestVaultPriority exists (type:string), compatible
// [CREATE]   Custom.TestVaultSeverity (display: "TestVault Severity", type:string, picklist:true)
// [ATTACH]   TestVault Priority -> TestVault Test Case
// [SKIP]     TestVault Priority already attached to TestVault Test Case (idempotent)
// [ERROR]    Cannot create "Priority" (VS402803) : name conflict with Microsoft.VSTS.Common.Priority
```

### Mecanisme 7 : Whitelist defensive (information only)

```typescript
// Common Microsoft system field names that schema MUST avoid (display names)
// This is NOT a runtime check (would be too restrictive),
// but a defensive note for future schema modifications.

const KNOWN_MICROSOFT_FIELD_NAMES = new Set<string>([
    "Title", "Description", "Priority", "Severity", "State", "Reason",
    "Assigned To", "Created Date", "Created By", "Changed Date", "Changed By",
    "Area Path", "Iteration Path", "Tags", "History", "Comments",
    "Original Estimate", "Remaining Work", "Completed Work",
    "Story Points", "Effort", "Business Value", "Time Criticality",
    "Activity", "Discipline", "Risk", "Acceptance Criteria",
    "Steps", "System Info", "Found In", "Integrated In",
    // ... extend as discovered
]);

// At pre-flight, log a warning if schema name (without TestVault prefix) is in this set.
// This helps anticipate future schema changes that would conflict.
```

---

## Composition exacte du sprint -- 6 LOTS

### Lot 0 -- Read existing code + plan (5 min)

```powershell
# Voir le code actuel des helpers Sprint 2.12
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-String "orgFieldExists|createFieldAtOrg|ADO_FIELD_TYPE_REST" -Context 0,5 | Select-Object -First 50

# Voir le schema field structure
Get-Content packages\argos-wit-schema\src\model.ts -Encoding UTF8 | Select-Object -First 80
```

### Lot A -- Helper functions + types (~25 min)

#### A1. Etendre `packages/argos-sdk/src/wit-refname-matcher.ts`

```typescript
// Existing (Sprint 2.10, 2.11):
//   isArgosWit, findSchemaWitByAdoRefName, schemaToAdoFieldRefName, isArgosField, findSchemaFieldByAdoRefName

// NEW (Sprint 2.13):

/**
 * Translate a schema field display name to its ADO counterpart.
 * 
 * ADO requires field names to be unique across the entire organization.
 * Microsoft system fields (e.g. Microsoft.VSTS.Common.Priority) often use
 * generic names like "Priority". Our schema also uses generic names.
 * 
 * Solution: prefix all schema display names with "TestVault " at runtime.
 * 
 * Examples:
 *   "Priority"          -> "TestVault Priority"
 *   "Severity"          -> "TestVault Severity"
 *   "GherkinFeature"    -> "TestVault GherkinFeature"
 *   "Steps"             -> "TestVault Steps"
 *   "TestVault Custom"  -> "TestVault Custom"  (idempotent, no double-prefix)
 */
export function schemaToAdoFieldName(schemaDisplayName: string): string {
    if (!schemaDisplayName || schemaDisplayName.trim().length === 0) {
        throw new Error("Empty schema field display name");
    }
    if (schemaDisplayName.length > 100) {
        throw new Error(`Schema field display name too long (>100 chars): "${schemaDisplayName}"`);
    }
    if (schemaDisplayName.startsWith("TestVault ")) {
        return schemaDisplayName;  // already prefixed
    }
    return `TestVault ${schemaDisplayName}`;
}

/**
 * Validate that a display name doesn't contain forbidden ADO characters.
 * Returns null if valid, error message if invalid.
 */
export function validateAdoFieldName(adoName: string): string | null {
    if (adoName.length > 128) {
        return `Name "${adoName}" exceeds 128 character limit`;
    }
    const FORBIDDEN = /[\.,;':~\\/*|?"&%$!+=()[\]{}<>]/;
    if (FORBIDDEN.test(adoName)) {
        return `Name "${adoName}" contains forbidden characters`;
    }
    return null;
}
```

#### A2. Tests pour les nouvelles fonctions

Etendre `packages/argos-sdk/src/wit-refname-matcher.test.ts` :

```typescript
describe("schemaToAdoFieldName (Sprint 2.13)", () => {
    it("prefixes simple names with 'TestVault '", () => {
        expect(schemaToAdoFieldName("Priority")).toBe("TestVault Priority");
        expect(schemaToAdoFieldName("Severity")).toBe("TestVault Severity");
        expect(schemaToAdoFieldName("Steps")).toBe("TestVault Steps");
    });
    
    it("is idempotent on already-prefixed names", () => {
        expect(schemaToAdoFieldName("TestVault Priority")).toBe("TestVault Priority");
    });
    
    it("throws on empty name", () => {
        expect(() => schemaToAdoFieldName("")).toThrow();
        expect(() => schemaToAdoFieldName("   ")).toThrow();
    });
    
    it("throws on excessively long name", () => {
        const longName = "X".repeat(101);
        expect(() => schemaToAdoFieldName(longName)).toThrow();
    });
});

describe("validateAdoFieldName (Sprint 2.13)", () => {
    it("returns null for valid names", () => {
        expect(validateAdoFieldName("TestVault Priority")).toBeNull();
        expect(validateAdoFieldName("Simple Name")).toBeNull();
    });
    
    it("returns error for forbidden characters", () => {
        expect(validateAdoFieldName("Test.Field")).toContain("forbidden");
        expect(validateAdoFieldName("Test/Field")).toContain("forbidden");
        expect(validateAdoFieldName("Test?Field")).toContain("forbidden");
    });
    
    it("returns error for excessive length", () => {
        const longName = "X".repeat(129);
        expect(validateAdoFieldName(longName)).toContain("128");
    });
});
```

### Lot B -- Pre-flight validation function (~30 min)

#### B1. Ajouter helper preflightOrgFields dans `process-install.ts`

```typescript
import { schemaToAdoFieldRefName, schemaToAdoFieldName, validateAdoFieldName } from "./wit-refname-matcher";

interface PreflightFieldAction {
    schemaRef: string;
    adoRef: string;
    adoName: string;
    action: "create" | "reuse" | "conflict";
    conflictDetails?: { existingRefName: string; existingType: string };
    typeCompatible?: boolean;
}

interface PreflightReport {
    canProceed: boolean;
    actions: PreflightFieldAction[];
    summary: { toCreate: number; toReuse: number; conflicts: number };
    errors: string[];
}

/**
 * Pre-flight validation : GET all org-level fields, analyze conflicts BEFORE any POST.
 * 
 * Returns a complete plan of actions per schema field, or detects fail-fast conflicts.
 */
async function preflightOrgFields(
    schemaFields: ReadonlyArray<typeof TESTVAULT_SCHEMA.wits[number]["fields"][number]>,
    typeMapping: Record<string, { type: string; isPicklist: boolean }>
): Promise<PreflightReport> {
    emit({ phase: "creating-wits", message: "[VALIDATE] Pre-flight: fetching org-level fields..." });
    
    const res = await doFetch(
        `${orgUrl}/_apis/wit/fields?api-version=${API_VERSION}`,
        { method: "GET" }
    );
    const orgFields = await jsonOrThrow<{
        value: Array<{ name: string; referenceName: string; type: string; isPicklist?: boolean }>
    }>(res);
    
    const byRefName = new Map<string, typeof orgFields.value[number]>(
        orgFields.value.map(f => [f.referenceName, f])
    );
    const byName = new Map<string, typeof orgFields.value[number]>(
        orgFields.value.map(f => [f.name, f])
    );
    
    const actions: PreflightFieldAction[] = [];
    const errors: string[] = [];
    
    for (const schemaField of schemaFields) {
        if (!schemaField.referenceName.startsWith("TestVault.")) {
            continue;  // system or microsoft field, skip
        }
        
        const adoRef = schemaToAdoFieldRefName(schemaField.referenceName);
        const adoName = schemaToAdoFieldName(schemaField.displayName);
        const expectedType = typeMapping[schemaField.type]?.type ?? schemaField.type;
        
        // Name validation
        const nameError = validateAdoFieldName(adoName);
        if (nameError) {
            errors.push(`Schema field ${schemaField.referenceName}: ${nameError}`);
            actions.push({ schemaRef: schemaField.referenceName, adoRef, adoName, action: "conflict" });
            continue;
        }
        
        // Check refName existence
        const existingByRef = byRefName.get(adoRef);
        const existingByName = byName.get(adoName);
        
        if (existingByRef) {
            // Same refName exists -> reuse, check type compatibility
            const typeMatch = existingByRef.type === expectedType;
            if (!typeMatch) {
                errors.push(
                    `Schema field ${schemaField.referenceName}: type mismatch ` +
                    `(schema=${expectedType}, ado=${existingByRef.type})`
                );
            }
            actions.push({
                schemaRef: schemaField.referenceName,
                adoRef,
                adoName,
                action: "reuse",
                typeCompatible: typeMatch,
            });
        } else if (existingByName) {
            // Name exists with DIFFERENT refName -> CONFLICT
            errors.push(
                `Schema field ${schemaField.referenceName}: name "${adoName}" already used by ` +
                `another field "${existingByName.referenceName}". Cannot create.`
            );
            actions.push({
                schemaRef: schemaField.referenceName,
                adoRef,
                adoName,
                action: "conflict",
                conflictDetails: { existingRefName: existingByName.referenceName, existingType: existingByName.type },
            });
        } else {
            // Neither exists -> will create
            actions.push({
                schemaRef: schemaField.referenceName,
                adoRef,
                adoName,
                action: "create",
            });
        }
    }
    
    const summary = {
        toCreate: actions.filter(a => a.action === "create").length,
        toReuse:  actions.filter(a => a.action === "reuse").length,
        conflicts: actions.filter(a => a.action === "conflict").length,
    };
    
    emit({
        phase: "creating-wits",
        message: `[VALIDATE] Pre-flight: ${actions.length} schema fields. ${summary.toCreate} to create, ${summary.toReuse} to reuse, ${summary.conflicts} conflicts.`,
    });
    
    if (errors.length > 0) {
        for (const err of errors) {
            emit({ phase: "creating-wits", message: `[ERROR] ${err}` });
        }
    }
    
    return { canProceed: errors.length === 0, actions, summary, errors };
}
```

#### B2. Helper getAllSchemaFields (avoid duplicates across WITs)

```typescript
/**
 * Get unique schema fields across all WITs.
 * Multiple WITs may share fields (e.g. all have TestVault.Priority).
 * Pre-flight should consider unique fields only.
 */
function getAllUniqueSchemaFields(): Array<typeof TESTVAULT_SCHEMA.wits[number]["fields"][number]> {
    const seen = new Set<string>();
    const result = [];
    for (const wit of TESTVAULT_SCHEMA.wits) {
        for (const field of wit.fields) {
            if (!field.referenceName.startsWith("TestVault.")) continue;
            if (!seen.has(field.referenceName)) {
                seen.add(field.referenceName);
                result.push(field);
            }
        }
    }
    return result;
}
```

### Lot C -- Integrate pre-flight + smart Step 3 (~30 min)

#### C1. Insert pre-flight before Step 3 fields loop

```typescript
// In the install method, AFTER Step 2 picklists, BEFORE Step 3 WIT loop:

emit({ phase: "creating-wits", message: "[VALIDATE] Pre-flight validation..." });
const uniqueSchemaFields = getAllUniqueSchemaFields();
const preflight = await preflightOrgFields(uniqueSchemaFields, ADO_FIELD_TYPE_REST);

if (!preflight.canProceed) {
    throw new ProcessInstallError(
        400,
        `Pre-flight validation failed:\n${preflight.errors.join("\n")}`
    );
}

// Build a quick lookup for the WIT loop
const preflightByRef = new Map(preflight.actions.map(a => [a.schemaRef, a]));
```

#### C2. Update Step 3 fields loop to use pre-flight decisions

```typescript
// In the WIT creation loop, for each field:

for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const planning = preflightByRef.get(field.referenceName);
    if (!planning) {
        throw new Error(`Pre-flight missing for ${field.referenceName} (internal error)`);
    }
    
    const adoFieldRefName = planning.adoRef;
    const adoFieldName = planning.adoName;
    
    // ETAPE A : Create or reuse field at organization level
    if (planning.action === "create") {
        emit({
            phase: "creating-wits",
            message: `  [CREATE] org-level field ${adoFieldRefName} (display: "${adoFieldName}")`,
            current: i + 1,
            total: wits.length,
        });
        await createFieldAtOrg(field, adoFieldRefName, adoFieldName);
    } else if (planning.action === "reuse") {
        emit({
            phase: "creating-wits",
            message: `  [REUSE] org-level field ${adoFieldRefName} (already exists, compatible)`,
            current: i + 1,
            total: wits.length,
        });
        // skip create, attach proceeds
    } else {
        // action === "conflict" but canProceed was true => shouldn't happen
        throw new Error(`Internal error: conflict for ${field.referenceName} but pre-flight passed`);
    }
    
    // ETAPE B : Attach field to WIT
    const attachBody: Record<string, unknown> = {
        referenceName: adoFieldRefName,
        required: field.required,
    };
    if (field.defaultValue !== undefined) attachBody.defaultValue = field.defaultValue;
    
    const plId = picklistIds.get(field.referenceName);
    if (plId) attachBody.picklistId = plId;
    
    const fieldRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/fields?api-version=${API_VERSION}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attachBody),
        }
    );
    
    // 409 Conflict on attach = field already attached to this WIT (idempotent OK)
    if (fieldRes.status !== 409) {
        await throwForStatus(fieldRes);
    }
    
    emit({
        phase: "creating-wits",
        message: `  [ATTACH] "${adoFieldName}" -> ${wit.displayName}`,
        current: i + 1,
        total: wits.length,
    });
}
```

#### C3. Update createFieldAtOrg signature pour utiliser le nom translated

```typescript
async function createFieldAtOrg(
    schemaField: typeof TESTVAULT_SCHEMA.wits[number]["fields"][number],
    adoFieldRefName: string,
    adoFieldName: string  // NEW PARAM
): Promise<void> {
    const fieldTypeInfo = ADO_FIELD_TYPE_REST[schemaField.type];
    if (!fieldTypeInfo) {
        throw new Error(`Unknown schema field type "${schemaField.type}" for ${schemaField.referenceName}`);
    }
    
    const body = {
        name: adoFieldName,                        // <-- use translated name
        referenceName: adoFieldRefName,
        description: schemaField.description ?? "",
        type: fieldTypeInfo.type,
        usage: "workItem",
        readOnly: false,
        canSortBy: true,
        isQueryable: true,
        isPicklist: fieldTypeInfo.isPicklist,
        isPicklistSuggested: false,
    };
    
    const res = await doFetch(
        `${orgUrl}/_apis/wit/fields?api-version=${API_VERSION}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );
    
    // 409 Conflict = field race condition (created in parallel) -> OK
    if (res.status === 409) return;
    
    // VS402803 in body = name conflict (despite preflight)
    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        if (errBody.includes("VS402803")) {
            throw new Error(
                `[CREATE FAILED] Field "${adoFieldName}" (${adoFieldRefName}): VS402803 name conflict. ` +
                `Despite pre-flight check, ADO rejected. The org state may have changed.`
            );
        }
        await throwForStatus(res);
    }
}
```

### Lot D -- Tests + CFG regression + bump + commit + PR (~30 min)

#### D1. Tests unitaires

Etendre `packages/argos-sdk/src/process-install.test.ts` :

```typescript
describe("Sprint 2.13 -- robust field creation", () => {
    it("pre-flight detects existing field with same refName (reuse)", async () => {
        // Mock GET /_apis/wit/fields returns Custom.TestVaultPriority
        // Verify : action = "reuse", typeCompatible = true
        // Verify : no POST create call
    });
    
    it("pre-flight detects name conflict with different refName", async () => {
        // Mock GET returns field with name "TestVault Priority" but refName "Other.Priority"
        // Verify : action = "conflict", error in report
        // Verify : install throws before any POST
    });
    
    it("pre-flight detects type incompatibility", async () => {
        // Mock GET returns Custom.TestVaultPriority with type "integer"
        // Schema expects "string"
        // Verify : error reported, install fails
    });
    
    it("creates field with translated display name", async () => {
        // Mock GET returns empty
        // Verify POST body has name: "TestVault Priority"
    });
    
    it("treats 409 on org create as idempotent success", async () => {
        // Mock POST /fields returns 409
        // Verify no error, proceeds to attach
    });
    
    it("treats 409 on attach as idempotent success", async () => {
        // Mock attach POST returns 409
        // Verify no error, proceeds to next field
    });
});
```

#### D2. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-field-robustness.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG field robustness Sprint 2.13", () => {
    const root = resolve(__dirname, "../../..");
    
    it("wit-refname-matcher.ts has schemaToAdoFieldName + validateAdoFieldName", () => {
        const path = resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoFieldName");
        expect(content).toContain("validateAdoFieldName");
        expect(content).toContain("TestVault ");  // prefix in translation
    });
    
    it("process-install.ts has preflightOrgFields", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("preflightOrgFields");
        expect(content).toContain("PreflightReport");
        expect(content).toContain("[VALIDATE]");
    });
    
    it("process-install.ts uses schemaToAdoFieldName for name", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoFieldName");
        expect(content).toContain("adoFieldName");
    });
    
    it("process-install.ts handles VS402803 explicitly", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("VS402803");
    });
});
```

#### D3. Bump 0.5.14 -> 0.5.15

```powershell
node tools\release\bump-fixed-version.cjs 0.5.15

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D4. CHANGELOG.md [0.5.15]

```markdown
## [0.5.15] - 2026-05-18

### Fixed

**Sprint 2.13 -- robust field creation with pre-flight + smart idempotency (REFACTOR)**

CRITICAL fix discovered at E2E real test 2026-05-18 after Sprint 2.12 (2-step workflow):
```
VS402803: Field name 'Priority' you specified is already in use, choose a different name.
```

Root cause: Microsoft.VSTS.Common.Priority already uses the name "Priority"
at the organization level. ADO enforces UNIQUE names across the entire organization,
not just per-process.

### Architecture changes -- 7 anti-error mechanisms

#### 1. Display name translation
New helper `schemaToAdoFieldName`:
- "Priority" -> "TestVault Priority"
- "Severity" -> "TestVault Severity"
- Idempotent : already-prefixed names unchanged

#### 2. Pre-flight validation
New helper `preflightOrgFields`:
- GET /_apis/wit/fields before any POST
- Build refName + name maps
- Classify each schema field: create / reuse / conflict
- Fail-fast on conflicts BEFORE partial install

#### 3. Smart 3-level idempotency
- Level 1: org-level by refName (Sprint 2.12)
- Level 2: org-level by name (NEW)
- Level 3: WIT-level attach (NEW : 409 = OK)

#### 4. Type compatibility check
- If reusing existing field, verify type matches schema
- Microsoft says: "Each field has ONE type within organization"

#### 5. Robust error handling
- VS402803 (name conflict): contextual message
- VS402805 (refName not found): clear error
- TF51535 (field def not found): defensive
- 409 (race): treat as idempotent success

#### 6. Structured logging
- [VALIDATE] / [CREATE] / [REUSE] / [ATTACH] / [SKIP] / [ERROR] tags
- Schema refName + ADO refName + name in every log

#### 7. Name validation (defensive)
- Length max 128 chars (ADO limit)
- Forbidden characters: `. , ; ' : ~ \ / * | ? " & % $ ! + = ( ) [ ] { } < >`

### Tests

- 4+ new unit tests for schemaToAdoFieldName + validateAdoFieldName
- 6+ new integration tests for preflightOrgFields
- CFG-2026-05-18-field-robustness regression test
- All Sprint 2.7-2.12 tests still green

### TECH-DEBT

- TECH-DEBT-055 NEW LIVRE: robust field naming + pre-flight + smart idempotency
- TECH-DEBT-054 RENUMBERED: extension CRUD operations refName translation (Sprint 2.14)
- TECH-DEBT-019: retest after this sprint

### Architecture preserved

- TESTVAULT_SCHEMA immutable (constitution section 12)
- Sprint 2.7 charset compliance maintained
- Sprint 2.8 picklists idempotency maintained
- Sprint 2.9 ADO icon compliance maintained
- Sprint 2.10 WIT refName resolution maintained
- Sprint 2.11 Custom. prefix translation maintained
- Sprint 2.12 field 2-step workflow maintained

### Lessons learned

- ADO field NAMES are unique org-level, not just per-process
- Microsoft generic names ("Priority", "Severity") are taken by VSTS fields
- Pre-flight validation prevents partial installs
- E2E discovery remains essential : 6 architecture bugs found today
- Type compatibility check protects from future mismatches
```

#### D5. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-055 (Sprint 2.13) -- robust field naming + pre-flight + smart idempotency
- [ ] TECH-DEBT-054 (renumbered) -- extension argos-detection-api CRUD ops field refName translation (Sprint 2.14)
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.13
```

#### D6. Pre-commit + commit + push

```powershell
$msg = "fix(sdk): Sprint 2.13 robust field naming + pre-flight + smart idempotency"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.13 robust field naming + pre-flight + smart idempotency

CRITICAL fix discovered at E2E real test 2026-05-18:
VS402803 because Microsoft.VSTS.Common.Priority already uses the name "Priority"
at organization level. ADO enforces UNIQUE field names org-wide.

Architecture (7 anti-error mechanisms) :

1. Display name translation : "Priority" -> "TestVault Priority"
2. Pre-flight validation : GET org fields, classify before any POST
3. Smart 3-level idempotency : refName + name + WIT attach
4. Type compatibility check on reuse
5. Robust error handling : VS402803, VS402805, TF51535, 409
6. Structured logging : [VALIDATE]/[CREATE]/[REUSE]/[ATTACH]/[ERROR]
7. Name validation : length + forbidden chars

New helpers in wit-refname-matcher.ts :
- schemaToAdoFieldName(displayName) : "Priority" -> "TestVault Priority"
- validateAdoFieldName(name) : returns error if invalid

New helper in process-install.ts :
- preflightOrgFields(schemaFields) : GET + classify + fail-fast

Step 3 fields loop refactored :
- Pre-flight runs BEFORE any POST
- Each field has a planning action : create / reuse / conflict
- Conflicts fail-fast with clear errors
- 409 treated as idempotent success

Tests :
- 4+ unit tests schemaToAdoFieldName
- 6+ unit tests preflightOrgFields scenarios
- CFG-2026-05-18-field-robustness
- All Sprint 2.7-2.12 tests still green

TECH-DEBT :
- TECH-DEBT-055 LIVRE
- TECH-DEBT-054 renumbered Sprint 2.14
- TECH-DEBT-019 retest

Bump 0.5.14 -> 0.5.15 via script.

Refs:
- Sprint 2.7-2.12 chain
- Microsoft doc: https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field
  "Field names must be unique within the organization"
- Microsoft inherited process doc:
  "You can't add a field with a field name that already exists in the organization"
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-13.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-13.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-13.txt"

git push -u origin feat/sprint-2-13-field-name-robustness
```

#### D7. PR

```powershell
$prBody = @'
## Summary

Sprint 2.13 -- 7 anti-error mechanisms for robust field creation.

## Root cause

After Sprint 2.12 (2-step workflow), POST /_apis/wit/fields was still failing because :
- Microsoft.VSTS.Common.Priority already uses the name "Priority" at org-level
- ADO enforces UNIQUE field names across the entire organization
- Our schema uses generic names that collide

## Fix : 7 anti-error mechanisms

| # | Mechanism | What |
|---|-----------|------|
| 1 | Display name translation | "Priority" -> "TestVault Priority" |
| 2 | Pre-flight validation | GET org fields + classify before POST |
| 3 | Smart 3-level idempotency | refName + name + WIT attach |
| 4 | Type compatibility check | On reuse, verify schema matches ADO |
| 5 | Robust error handling | VS402803/VS402805/TF51535/409 explicit |
| 6 | Structured logging | [VALIDATE]/[CREATE]/[REUSE]/[ATTACH] tags |
| 7 | Name validation defensive | 128 char limit + forbidden chars |

## Tests

- 4+ unit tests new helpers
- 6+ integration tests preflightOrgFields scenarios
- CFG-2026-05-18-field-robustness regression test
- All Sprint 2.7-2.12 tests still green

## After merge

1. Tag v0.5.15 + push
2. Cleanup BCEE-QA : delete process residuel + verify no Custom.TestVault* org-level
3. Re-run E2E with 0.5.15
4. Expected install : pre-flight log + 7 WIT created with fields + attached + states
5. Migrate DEMO + refresh extension + Create Test Case
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-13.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.13 robust field naming + pre-flight + smart idempotency" `
  --body-file "$env:TEMP\pr-body-sprint-2-13.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-13.txt"
```

#### D8. Archive + post-merge cleanup

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-13.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-13.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-13.md
}
```

```powershell
# Post-merge
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-13-field-name-robustness 2>$null
git log --oneline | Select-Object -First 5
```

### Lot E -- Tag + retest E2E (~20 min apres merge)

#### E1. Tag v0.5.15 + push

```powershell
git checkout main
git pull
git tag -a v0.5.15 -m "Release v0.5.15 -- Sprint 2.13 robust field naming + pre-flight"
git push origin v0.5.15
```

#### E2. Surveille CI workflows (5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions

1. "Publish -- Marketplace" -> Argos 0.5.15
2. "Publish CLI -- npm" -> @atconseil/argos-cli@0.5.15
```

#### E3. Cleanup BCEE-QA

```
1. Browse https://dev.azure.com/BCEE-QA/_settings/process
2. Delete process "Argos Inherited Demo" (residuel)
3. Verifier org-level fields :
   https://dev.azure.com/BCEE-QA/_settings/process/fields
   ou via API : GET /_apis/wit/fields?api-version=7.1
   
   Filtrer "Custom.TestVault*" :
   - Si aucun : OK fresh state
   - Si certains existent (de tentatives precedentes) :
     A. Garde-les, idempotency Sprint 2.13 va les reuser
     B. Ou delete pour test fresh propre

4. New PAT 1 day (Process Read & manage + Project Read/write/manage)
```

#### E4. Update extension 0.5.15

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
Argos Testing : Update vers 0.5.15
```

#### E5. TEST E2E REEL FINAL

```powershell
npm view @atconseil/argos-cli@0.5.15 version

# Lance install
npx -y @atconseil/argos-cli@0.5.15 install `
    --org-url https://dev.azure.com/BCEE-QA `
    --project "DEMO" `
    --pat "[ton_PAT]" `
    --base-process Agile `
    --process-name "Argos Inherited Demo" `
    --skip-confirm
```

#### E6. Resultat attendu (scenario heureux)

```
Checking Argos installation state on https://dev.azure.com/BCEE-QA/DEMO...
[INFO] Argos not installed. Will create new process inheritance.
[creating-process] Creating process "Argos Inherited Demo"...
[creating-picklists] Checking existing picklists...
[creating-picklists] Found 5 existing picklists in organization.
[creating-picklists] Reusing existing picklist "TestVault-Priority"...
... 5 picklists ...

[creating-wits] [VALIDATE] Pre-flight validation...
[creating-wits] [VALIDATE] Pre-flight: 30 schema fields. 30 to create, 0 to reuse, 0 conflicts.
[creating-wits] Checking existing work item types...
[creating-wits] Found 0 existing TestVault WITs in process.
[creating-wits] Creating TestVault Test Case... (1/7)
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   [CREATE] org-level field Custom.TestVaultPriority (display: "TestVault Priority")
[creating-wits]   [ATTACH] "TestVault Priority" -> TestVault Test Case
[creating-wits]   [CREATE] org-level field Custom.TestVaultSteps (display: "TestVault Steps")
[creating-wits]   [ATTACH] "TestVault Steps" -> TestVault Test Case
... etc pour les fields ...
[creating-wits] Creating TestVault Test Plan... (2/7)
[creating-wits]   [REUSE] org-level field Custom.TestVaultPriority (already exists, compatible)
[creating-wits]   [ATTACH] "TestVault Priority" -> TestVault Test Plan
... etc ...
[creating-wits] Creating TestVault Audit Log... (7/7)
[done] Installation complete!

[OK] Installation complete!
  Process ID: <GUID>
  Process name: Argos Inherited Demo
```

#### E7. Apres install reussi

```
1. Verification portal ADO :
   - Process "Argos Inherited Demo" > Work item types
   - 7 WIT custom avec fields attaches (display "TestVault X")
   - 30+ org-level fields Custom.TestVault*
   
2. Migration projet DEMO

3. Refresh extension + wizard detection

4. MOMENT DE VERITE : Create Test Case
   A. SUCCESS -> MILESTONE PRODUIT FONCTIONNEL
   B. Error -> bug 10 = Sprint 2.14 (extension CRUD field refName)
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : Pre-flight FAIL-FAST sur conflit

Si la validation pre-flight detecte un conflict, throw IMMEDIATEMENT avec un message
contextuel. Pas de partial install.

### GF23 : Idempotency robuste

3 niveaux :
- 409 sur org create : treat as success
- 409 sur WIT attach : treat as success
- Field reuse : type compatibility check ou erreur claire

### GF24 : Sprint 2.7-2.12 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF25 : Logging structure

Chaque action utilise les tags : [VALIDATE], [CREATE], [REUSE], [ATTACH], [SKIP], [ERROR]
Pour diagnostic + UX install command.

### GF26 : Pre-flight performance

GET /_apis/wit/fields retourne TOUS les fields de l'org (potentiellement 500+).
Acceptable car appel UNIQUE au demarrage de Step 3.

### GF27 : Extension argos-detection-api NOT modifie

TECH-DEBT-054 (extension CRUD) Sprint 2.14.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-13-field-name-robustness

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 50
pnpm --filter @atconseil/argos-detection-api test 2>&1 | Select-Object -Last 10
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 10
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10

pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Code lu. Confirme architecture Sprint 2.13."
2. **Apres Lot A** : "Helpers schemaToAdoFieldName + validateAdoFieldName added. Tests passing. Continue Lot B ?"
3. **Apres Lot B** : "Pre-flight validation function ready. Continue Lot C integration ?"
4. **Apres Lot C** : "Step 3 fields loop refactored. Continue Lot D tests + commit ?"
5. **Apres Lot D6** : "PR ouverte. Apres merge, lance Lot E tag + retest E2E."

---

## Criteres de done

- [ ] Branche feat/sprint-2-13-field-name-robustness creee
- [ ] schemaToAdoFieldName + validateAdoFieldName helpers
- [ ] preflightOrgFields function
- [ ] Step 3 fields loop integre pre-flight + planning
- [ ] createFieldAtOrg utilise translated name
- [ ] Structured logging tags partout
- [ ] 4+ tests unit helpers
- [ ] 6+ tests integration pre-flight scenarios
- [ ] CFG-2026-05-18-field-robustness NEW
- [ ] All Sprint 2.7-2.12 tests STILL green
- [ ] Bump 0.5.14 -> 0.5.15
- [ ] CHANGELOG complete
- [ ] tasks.md TECH-DEBT-055 livre
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.15
- [ ] CI workflows verts
- [ ] Test E2E install reussi

---

## Apres ca

### Si install E2E reussit

1. Verification portal (5 min) : 7 WIT + 30+ fields Custom.TestVault* visibles
2. Migration projet DEMO
3. Refresh extension
4. **MOMENT DE VERITE FINAL** : Create Test Case
   - SUCCESS : MILESTONE PRODUIT FONCTIONNEL APRES 7 SPRINTS HOTFIX
   - Error : Sprint 2.14 (extension CRUD) avec architecture connue

### Si install E2E echoue (bug 10)

Probable causes :
- Picklist + name "TestVault X" deja pris (rare)
- Type incompatibility from previous test
- Permission issue PAT

Diagnostiquer + sprint hotfix.

### Note moral

Sprint 2.13 = SDK install COMPLET et ROBUSTE.
Apres 7 hotfix sprints (2.7-2.13), l'install chain a traverse :
- Charset, idempotency, icons, WIT refName, Custom. prefix, 2-step workflow, name uniqueness

Chaque couche d'oignon E2E traversee. Le coeur ADO compris.

Reste l'extension CRUD (Sprint 2.14) qui beneficie deja de :
- isArgosWit (Sprint 2.10)
- isArgosField (Sprint 2.11)
- schemaToAdoFieldName (Sprint 2.13)

Architecture toute prete pour Sprint 2.14.

Bon sprint refactor !
