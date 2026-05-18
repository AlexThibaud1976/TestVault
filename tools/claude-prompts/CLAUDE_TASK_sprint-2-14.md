# Prompt Claude Code -- Sprint 2.14 state name translation + smart idempotency (`feat/sprint-2-14-state-name-custom`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor : transposition du pattern Sprint 2.13 aux STATES (translation + idempotency).
> Estimation : ~1.5-2h.

---

## Contexte critique

**Decouverte 2026-05-18 ~16h30** : apres Sprint 2.13 livre argos@0.5.15 (robust fields),
test E2E reel a echoue avec une NOUVELLE COUCHE :

```
[creating-wits] [VALIDATE] Pre-flight: 40 schema fields. 40 to create, 0 to reuse, 0 conflicts.
[creating-wits] Creating TestVault Test Case... (1/7)
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   [CREATE] org-level field Custom.TestVaultPriority (display: "TestVault Priority")
[creating-wits]   [ATTACH] "TestVault Priority" -> TestVault Test Case
... (tous les fields crees avec succes) ...
Installation failed: VS403083: You specified a state Active that is already in use. 
Choose a different name.
WorkItemStateNameAlreadyInUseException
```

**Decouverte architecturale + decision user lundi 2026-05-18 ~17h** :

> **"Tout ce qu'on cree pour les WIT doit etre prefixe TestVault X."**

C'est le principe emergent confirme par 8 sprints d'investigation E2E.

**Cause confirmee** :

POST /workItemTypes cree un WIT custom MAIS ADO ajoute automatiquement des
**default states** : New, Active, Resolved, Closed, Removed (inherited from base).

Notre POST /states avec name "Active" -> collision avec le default "Active".

**Investigation Microsoft docs confirme** :

> POST /processes/{processId}/workItemTypes/{witRefName}/states
> Body: { "name": "Ready to test", "color": "b2b2b2", "stateCategory": "Proposed" }

Une fois cree, le state a customizationType "custom".

> GET /workItemTypes/{adoRefName}/states retourne TOUS les states du WIT
> (inherited + custom), avec id, name, color, stateCategory, order.

**Pattern : transposition exacte du Sprint 2.13 (qui a marche pour 40 fields)** :

```
Sprint 2.13 (fields)           Sprint 2.14 (states)
====================            =====================
schemaToAdoFieldName            schemaToAdoStateName
"Priority" -> "TestVault P"     "Active" -> "TestVault Active"
                                
preflightOrgFields              getExistingStates (per WIT)
GET /_apis/wit/fields           GET /workItemTypes/{wit}/states
                                
Smart idempotency               Smart idempotency
3-level (refName, name, WIT)    1-level (state name per WIT)
                                
[CREATE]/[REUSE]/[ATTACH]       [STATE-CREATE]/[STATE-SKIP]
```

Refs :
- Sprint 2.7-2.13 (chaine SDK)
- Microsoft states create : https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/states/create?view=azure-devops-rest-7.1
- Microsoft states list : https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/states/list?view=azure-devops-rest-7.1
- TECH-DEBT-056 NEW : state name custom translation + idempotency (LIVRE ce sprint)
- TECH-DEBT-054 RENUMBERED : extension argos-detection-api CRUD refName translation (Sprint 2.15)

---

## Decisions actees lundi 2026-05-18 ~17h

| # | Element | Choix |
|---|---|---|
| D112 | Strategie state name | A -- Prefix "TestVault " systematique (user proposal) |
| D113 | Default states ADO | LAISSER en place (defensive, evite breaking workflow) |
| D114 | Idempotency states | A -- GET existing states per WIT, skip if name exists |
| D115 | State category | Schema deja a stateCategory, pass through tel quel |
| D116 | Hide inherited states | DEFERRED (pour MVP : default + custom coexistent) |

---

## Architecture cible

### Mecanisme 1 : Translation state name

```typescript
// Pattern coherent avec Sprint 2.11 (refName), 2.13 (field display name).
//
// Schema:    state.name "Active"
// ADO POST:  name "TestVault Active"

export function schemaToAdoStateName(schemaStateName: string): string {
    if (!schemaStateName || schemaStateName.trim().length === 0) {
        throw new Error("Empty schema state name");
    }
    if (schemaStateName.length > 100) {
        throw new Error(`Schema state name too long (>100 chars): "${schemaStateName}"`);
    }
    if (schemaStateName.startsWith("TestVault ")) {
        return schemaStateName;  // already prefixed
    }
    return `TestVault ${schemaStateName}`;
}
```

### Mecanisme 2 : Validation defensive

```typescript
export function validateAdoStateName(adoName: string): string | null {
    // ADO state names follow similar rules as field names
    if (adoName.length > 128) {
        return `State name "${adoName}" exceeds 128 character limit`;
    }
    const FORBIDDEN = /[\.,;':~\\/*|?"&%$!+=()[\]{}<>]/;
    if (FORBIDDEN.test(adoName)) {
        return `State name "${adoName}" contains forbidden characters`;
    }
    return null;
}
```

### Mecanisme 3 : Get existing states helper

```typescript
interface AdoState {
    id: string;
    name: string;
    color: string;
    stateCategory: string;
    order?: number;
    customizationType?: "system" | "inherited" | "custom";
}

/**
 * GET all states for a WIT (inherited + custom).
 * Called AFTER POST /workItemTypes to detect default states.
 */
async function getExistingStates(adoWitRefName: string): Promise<AdoState[]> {
    const url = `${base}/${processId}/workItemTypes/${encodeURIComponent(adoWitRefName)}/states?api-version=${API_VERSION}`;
    const res = await doFetch(url, { method: "GET" });
    const data = await jsonOrThrow<{ value: AdoState[] }>(res);
    return data.value;
}
```

### Mecanisme 4 : Smart idempotency per WIT states

```typescript
// In Step 3, AFTER POST /workItemTypes for current WIT, BEFORE the states loop :

emit({ phase: "creating-wits", message: `  [VALIDATE] Pre-flight states for ${wit.displayName}...` });
const existingStates = await getExistingStates(adoRefName);
const existingNames = new Set(existingStates.map(s => s.name));

emit({
    phase: "creating-wits",
    message: `  [VALIDATE] WIT has ${existingStates.length} default states: ${existingStates.map(s => s.name).join(", ")}`,
});

for (const state of wit.states) {
    const adoStateName = schemaToAdoStateName(state.name);
    
    // Validation
    const nameError = validateAdoStateName(adoStateName);
    if (nameError) {
        throw new Error(`Schema state ${state.name} for ${wit.referenceName}: ${nameError}`);
    }
    
    // Idempotency check
    if (existingNames.has(adoStateName)) {
        emit({
            phase: "creating-wits",
            message: `  [STATE-SKIP] "${adoStateName}" already exists in ${wit.displayName} (idempotent)`,
        });
        continue;
    }
    
    // Create state
    emit({
        phase: "creating-wits",
        message: `  [STATE-CREATE] "${adoStateName}" (category: ${state.stateCategory})`,
    });
    
    const stateBody = {
        name: adoStateName,
        color: state.color,                  // schema state.color (e.g. "007acc")
        stateCategory: state.stateCategory,  // "Proposed" | "InProgress" | "Resolved" | "Completed"
    };
    
    const stateRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stateBody),
        }
    );
    
    // 409 Conflict = race condition or already created (idempotent)
    if (stateRes.status === 409) continue;
    
    // VS403083 in body = name conflict despite our check
    if (!stateRes.ok) {
        const errBody = await stateRes.text().catch(() => "");
        if (errBody.includes("VS403083")) {
            throw new Error(
                `[STATE FAILED] State "${adoStateName}" in ${wit.displayName}: VS403083 name conflict. ` +
                `WIT may have been modified concurrently.`
            );
        }
        await throwForStatus(stateRes);
    }
}
```

### Mecanisme 5 : Structured logging

```
[VALIDATE] Pre-flight states for TestVault Test Case...
[VALIDATE] WIT has 5 default states: New, Active, Resolved, Closed, Removed
[STATE-CREATE] "TestVault Draft" (category: Proposed)
[STATE-CREATE] "TestVault Active" (category: InProgress)
[STATE-SKIP] "TestVault Approved" already exists in TestVault Test Case (idempotent)
[STATE-ERROR] (in case of failure with context)
```

---

## Composition exacte du sprint -- 5 LOTS

### Lot 0 -- Read existing states code (~5 min)

```powershell
# Trouver le code actuel des states dans process-install.ts
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-String "states|stateCategory" -Context 1,3 | Select-Object -First 30

# Voir le schema state structure
Get-Content packages\argos-wit-schema\src\model.ts -Encoding UTF8 | Select-String "state|State" -Context 1,3 | Select-Object -First 20

# Voir un WIT exemple pour voir ses states
Get-Content packages\argos-wit-schema\src\wits\test-case.ts -Encoding UTF8 | Select-Object -First 80
```

NOTE le resultat pour adapter Lot C.

### Lot A -- Helpers schemaToAdoStateName + validateAdoStateName (~20 min)

#### A1. Etendre `packages/argos-sdk/src/wit-refname-matcher.ts`

```typescript
// Existing (Sprint 2.10, 2.11, 2.13):
//   isArgosWit, findSchemaWitByAdoRefName, schemaToAdoFieldRefName, 
//   isArgosField, findSchemaFieldByAdoRefName, schemaToAdoFieldName, validateAdoFieldName

// NEW (Sprint 2.14):

/**
 * Translate a schema state name to its ADO counterpart.
 *
 * ADO automatically creates default states (New, Active, Resolved, Closed, Removed)
 * when a new WIT is created via POST /workItemTypes. Schema state names like "Active"
 * would collide with these defaults.
 *
 * Solution: prefix all schema state names with "TestVault " at runtime.
 *
 * Examples:
 *   "Draft"          -> "TestVault Draft"
 *   "Active"         -> "TestVault Active"
 *   "Approved"       -> "TestVault Approved"
 *   "TestVault Done" -> "TestVault Done"  (idempotent, no double-prefix)
 */
export function schemaToAdoStateName(schemaStateName: string): string {
    if (!schemaStateName || schemaStateName.trim().length === 0) {
        throw new Error("Empty schema state name");
    }
    if (schemaStateName.length > 100) {
        throw new Error(`Schema state name too long (>100 chars): "${schemaStateName}"`);
    }
    if (schemaStateName.startsWith("TestVault ")) {
        return schemaStateName;  // already prefixed
    }
    return `TestVault ${schemaStateName}`;
}

/**
 * Validate that a state name doesn't violate ADO constraints.
 * Returns null if valid, error message if invalid.
 */
export function validateAdoStateName(adoName: string): string | null {
    if (adoName.length > 128) {
        return `State name "${adoName}" exceeds 128 character limit`;
    }
    const FORBIDDEN = /[\.,;':~\\/*|?"&%$!+=()[\]{}<>]/;
    if (FORBIDDEN.test(adoName)) {
        return `State name "${adoName}" contains forbidden characters`;
    }
    return null;
}
```

#### A2. Tests etendus dans `wit-refname-matcher.test.ts`

```typescript
describe("schemaToAdoStateName (Sprint 2.14)", () => {
    it("prefixes simple names with 'TestVault '", () => {
        expect(schemaToAdoStateName("Active")).toBe("TestVault Active");
        expect(schemaToAdoStateName("Draft")).toBe("TestVault Draft");
        expect(schemaToAdoStateName("Approved")).toBe("TestVault Approved");
        expect(schemaToAdoStateName("Deprecated")).toBe("TestVault Deprecated");
    });
    
    it("is idempotent on already-prefixed names", () => {
        expect(schemaToAdoStateName("TestVault Active")).toBe("TestVault Active");
        expect(schemaToAdoStateName("TestVault Done")).toBe("TestVault Done");
    });
    
    it("throws on empty name", () => {
        expect(() => schemaToAdoStateName("")).toThrow();
        expect(() => schemaToAdoStateName("   ")).toThrow();
    });
    
    it("throws on excessively long name", () => {
        const longName = "X".repeat(101);
        expect(() => schemaToAdoStateName(longName)).toThrow();
    });
});

describe("validateAdoStateName (Sprint 2.14)", () => {
    it("returns null for valid names", () => {
        expect(validateAdoStateName("TestVault Active")).toBeNull();
        expect(validateAdoStateName("TestVault Approved")).toBeNull();
        expect(validateAdoStateName("Simple Name")).toBeNull();
    });
    
    it("returns error for forbidden characters", () => {
        expect(validateAdoStateName("Test.State")).toContain("forbidden");
        expect(validateAdoStateName("Test/State")).toContain("forbidden");
        expect(validateAdoStateName("Test?State")).toContain("forbidden");
    });
    
    it("returns error for excessive length", () => {
        const longName = "X".repeat(129);
        expect(validateAdoStateName(longName)).toContain("128");
    });
});
```

### Lot B -- getExistingStates helper (~15 min)

#### B1. Ajouter dans `process-install.ts`

```typescript
// After existing helpers (orgFieldExists, createFieldAtOrg, preflightOrgFields)

interface AdoState {
    id: string;
    name: string;
    color: string;
    stateCategory: string;
    order?: number;
    customizationType?: string;
}

/**
 * GET all current states for a WIT (inherited defaults + custom additions).
 * Called AFTER POST /workItemTypes to detect default states like "Active".
 */
async function getExistingStates(adoWitRefName: string): Promise<AdoState[]> {
    const url = `${base}/${processId}/workItemTypes/${encodeURIComponent(adoWitRefName)}/states?api-version=${API_VERSION}`;
    const res = await doFetch(url, { method: "GET" });
    const data = await jsonOrThrow<{ value: AdoState[] }>(res);
    return data.value;
}
```

### Lot C -- Integrate states loop with translation + idempotency (~30 min)

#### C1. Locate the states loop in process-install.ts

```powershell
# Find the existing states creation loop
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-String "for.*state|wit\.states" -Context 0,5 | Select-Object -First 20
```

#### C2. Replace the states loop

**AVANT** (current code, probable structure) :

```typescript
// In the WIT loop, after POST /workItemTypes :
for (const state of wit.states) {
    const stateBody = {
        name: state.name,                    // raw schema name "Active"
        color: state.color,
        stateCategory: state.stateCategory,
    };
    
    const stateRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
        { method: "POST", headers: ..., body: JSON.stringify(stateBody) }
    );
    await throwForStatus(stateRes);
}
```

**APRES** (Sprint 2.14) :

```typescript
import { schemaToAdoStateName, validateAdoStateName } from "./wit-refname-matcher";

// In the WIT loop, after POST /workItemTypes + AFTER fields loop, BEFORE next WIT:

emit({
    phase: "creating-wits",
    message: `  [VALIDATE] Pre-flight states for ${wit.displayName}...`,
    current: i + 1,
    total: wits.length,
});

const existingStates = await getExistingStates(adoRefName);
const existingStateNames = new Set(existingStates.map(s => s.name));

emit({
    phase: "creating-wits",
    message: `  [VALIDATE] WIT has ${existingStates.length} default states: ${existingStates.map(s => s.name).join(", ")}`,
    current: i + 1,
    total: wits.length,
});

for (const state of wit.states) {
    const adoStateName = schemaToAdoStateName(state.name);
    
    const nameError = validateAdoStateName(adoStateName);
    if (nameError) {
        throw new Error(`Schema state "${state.name}" for ${wit.referenceName}: ${nameError}`);
    }
    
    // Smart idempotency : skip if state name already exists in this WIT
    if (existingStateNames.has(adoStateName)) {
        emit({
            phase: "creating-wits",
            message: `  [STATE-SKIP] "${adoStateName}" already exists in ${wit.displayName} (idempotent)`,
            current: i + 1,
            total: wits.length,
        });
        continue;
    }
    
    emit({
        phase: "creating-wits",
        message: `  [STATE-CREATE] "${adoStateName}" (category: ${state.stateCategory})`,
        current: i + 1,
        total: wits.length,
    });
    
    const stateBody = {
        name: adoStateName,
        color: state.color,
        stateCategory: state.stateCategory,
    };
    
    const stateRes = await doFetch(
        `${base}/${processId}/workItemTypes/${encodeURIComponent(adoRefName)}/states?api-version=${API_VERSION}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stateBody),
        }
    );
    
    // 409 = race condition / already created (idempotent OK)
    if (stateRes.status === 409) {
        emit({
            phase: "creating-wits",
            message: `  [STATE-SKIP] "${adoStateName}" 409 conflict (idempotent OK)`,
            current: i + 1,
            total: wits.length,
        });
        continue;
    }
    
    // VS403083 in body = name conflict despite our check (race condition)
    if (!stateRes.ok) {
        const errBody = await stateRes.text().catch(() => "");
        if (errBody.includes("VS403083")) {
            throw new Error(
                `[STATE FAILED] State "${adoStateName}" in ${wit.displayName}: VS403083 name conflict. ` +
                `WIT may have been modified concurrently.`
            );
        }
        await throwForStatus(stateRes);
    }
}
```

#### C3. Verifier l'integration

- Le loop states est appele APRES POST /workItemTypes (necessaire pour avoir adoRefName)
- Le loop states est appele APRES la boucle fields (Sprint 2.12 + 2.13) ou AVANT, peu importe
- Tu peux laisser l'ordre actuel du Sprint 2.12 (fields puis states ou inverse)

### Lot D -- Tests + CFG regression + bump + commit + PR (~35 min)

#### D1. Tests unitaires

Etendre `packages/argos-sdk/src/process-install.test.ts` :

```typescript
describe("Sprint 2.14 -- robust state creation", () => {
    it("creates state with translated name 'TestVault Active'", async () => {
        // Mock GET /states returns [{name: "New"}, {name: "Active"}, {name: "Resolved"}]
        // Schema state "Active" should be translated to "TestVault Active"
        // Verify POST body has name "TestVault Active"
        // Verify no collision with existing "Active"
    });
    
    it("skips state creation if 'TestVault X' name already exists", async () => {
        // Mock GET /states returns [{name: "TestVault Active"}, {name: "New"}]
        // Schema state "Active"
        // Verify NO POST call (idempotent skip)
    });
    
    it("logs default states detected on WIT", async () => {
        // Mock GET /states returns 5 default states
        // Verify emit called with "[VALIDATE] WIT has 5 default states..."
    });
    
    it("treats 409 on state create as idempotent success", async () => {
        // Mock POST /states returns 409
        // Verify no error, proceeds to next state
    });
    
    it("rejects state name with forbidden characters", async () => {
        // Schema state "Test.State" (with dot)
        // Verify throws with "forbidden characters"
    });
});
```

#### D2. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-state-name-custom.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG state name custom Sprint 2.14", () => {
    const root = resolve(__dirname, "../../..");
    
    it("wit-refname-matcher.ts has schemaToAdoStateName + validateAdoStateName", () => {
        const path = resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoStateName");
        expect(content).toContain("validateAdoStateName");
        expect(content).toContain("TestVault ");  // prefix in translation
    });
    
    it("process-install.ts uses schemaToAdoStateName for state name", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("schemaToAdoStateName");
        expect(content).toContain("getExistingStates");
    });
    
    it("process-install.ts has state idempotency logic", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("existingStateNames");
        expect(content).toContain("[STATE-SKIP]");
        expect(content).toContain("[STATE-CREATE]");
    });
    
    it("process-install.ts handles VS403083 explicitly", () => {
        const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("VS403083");
    });
});
```

#### D3. Bump 0.5.15 -> 0.5.16

```powershell
node tools\release\bump-fixed-version.cjs 0.5.16

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D4. CHANGELOG.md [0.5.16]

```markdown
## [0.5.16] - 2026-05-18

### Fixed

**Sprint 2.14 -- state name translation + smart idempotency**

CRITICAL fix discovered at E2E real test 2026-05-18 after Sprint 2.13 (robust fields):
```
VS403083: You specified a state Active that is already in use. Choose a different name.
WorkItemStateNameAlreadyInUseException
```

Root cause: POST /workItemTypes creates a WIT with DEFAULT STATES automatically
(New, Active, Resolved, Closed, Removed inherited from base process). Our schema
state "Active" collides with the default "Active".

### Architectural principle confirmed

After 8 hotfix sprints (2.7-2.14) of E2E discovery, the architectural principle
is clear:

> Anything we create at the WIT level must be prefixed "TestVault X"
> to avoid ADO uniqueness conflicts.

Sprint 2.14 transposes the Sprint 2.13 pattern (which worked for 40 fields)
to STATES.

### Implementation

New helpers in `wit-refname-matcher.ts`:
- `schemaToAdoStateName("Active")` -> `"TestVault Active"`
- `validateAdoStateName(name)` -> length + forbidden char check
- Idempotent on already-prefixed names

New helper in `process-install.ts`:
- `getExistingStates(adoWitRefName)`: GET /states for a WIT
- Used to detect default states (New, Active, Resolved, etc.)

Step 3 states loop refactored:
- After POST /workItemTypes, GET existing states
- Build Set of existing names
- For each schema state:
  - Translate to "TestVault X"
  - If name exists in WIT: SKIP (idempotent)
  - Else: POST create
- Handle 409, VS403083 gracefully

### Logging

```
[VALIDATE] Pre-flight states for TestVault Test Case...
[VALIDATE] WIT has 5 default states: New, Active, Resolved, Closed, Removed
[STATE-CREATE] "TestVault Draft" (category: Proposed)
[STATE-CREATE] "TestVault Active" (category: InProgress)
[STATE-SKIP] "TestVault Approved" already exists (idempotent)
```

### Tests

- 5+ unit tests new helpers schemaToAdoStateName + validateAdoStateName
- 5+ integration tests for state idempotency scenarios
- CFG-2026-05-18-state-name-custom regression test
- All Sprint 2.7-2.13 tests still green

### TECH-DEBT

- TECH-DEBT-056 NEW LIVRE: state name custom + idempotency
- TECH-DEBT-054 RENUMBERED Sprint 2.15: extension argos-detection-api CRUD ops refName translation
- TECH-DEBT-019: E2E reel, retest after this sprint

### Architecture preserved

- TESTVAULT_SCHEMA immutable (constitution section 12)
- Sprint 2.7-2.13 chain maintained

### Lessons learned

- ADO POST /workItemTypes creates a WIT with default states automatically
- Default states are NOT documented clearly in REST API reference
- Default states have customizationType "inherited"
- Custom states have customizationType "custom"
- Names must be unique WITHIN A WIT (not org-level like fields)
- Same pattern as fields: prefix everything "TestVault X" for safety

### Cumulative session 2026-05-18 (8 sprints livres)

Bug cascade from E2E real testing:
1. VS402848 picklist conflict (Sprint 2.8)
2. VS403344 icon invalid (Sprint 2.9)
3. VS402805 WIT refName not found (Sprint 2.10)
4. TF51535 field "TestVault.X" (Sprint 2.11)
5. TF51535 field "Custom.TestVaultX" (Sprint 2.12)
6. VS402803 field name "Priority" (Sprint 2.13)
7. VS403083 state name "Active" (Sprint 2.14) <-- THIS
8. (anticipated) extension CRUD refName (Sprint 2.15)

Architectural principle that emerged today:
"Tout ce qu'on cree pour les WIT doit etre prefixe TestVault X"
```

#### D5. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-056 (Sprint 2.14) -- state name custom translation + smart idempotency
- [ ] TECH-DEBT-054 (Sprint 2.15) -- extension argos-detection-api CRUD ops refName translation
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.14
```

#### D6. Pre-commit + commit + push

```powershell
$msg = "fix(sdk): Sprint 2.14 state name translation + smart idempotency"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.14 state name translation + smart idempotency

CRITICAL fix discovered at E2E real test 2026-05-18:
VS403083 because POST /workItemTypes creates default states (New, Active, etc.)
automatically. Our schema state "Active" collides.

Architectural principle confirmed after 8 hotfix sprints today:
"Tout ce qu'on cree pour les WIT doit etre prefixe TestVault X"

Sprint 2.14 transposes Sprint 2.13 pattern (40 fields OK) to STATES.

Implementation :

New helpers in wit-refname-matcher.ts :
- schemaToAdoStateName(name) : "Active" -> "TestVault Active"
- validateAdoStateName(name) : length + forbidden char check
- Idempotent on already-prefixed names

New helper in process-install.ts :
- getExistingStates(adoWitRefName) : GET /states for a WIT
- Used to detect default states inherited from base process

Step 3 states loop refactored :
- After POST /workItemTypes, GET existing states for WIT
- Build Set of existing names
- For each schema state :
  - Translate to "TestVault X"
  - If exists in WIT : SKIP (idempotent)
  - Else : POST create
- Handle 409, VS403083 gracefully

Structured logging :
[VALIDATE] Pre-flight states for {WIT}
[STATE-CREATE] "TestVault X" (category: Y)
[STATE-SKIP] already exists (idempotent)

Tests :
- 5+ unit tests new helpers
- 5+ integration tests for state idempotency
- CFG-2026-05-18-state-name-custom
- All Sprint 2.7-2.13 tests still green

TECH-DEBT :
- TECH-DEBT-056 LIVRE
- TECH-DEBT-054 renumbered Sprint 2.15
- TECH-DEBT-019 retest

Bump 0.5.15 -> 0.5.16.

Refs:
- Sprint 2.7-2.13 chain
- Microsoft states create API: https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/states/create
- User architectural insight 2026-05-18 ~17h :
  "il faut que tout ce que tu crees pour les WIT soit du custom"
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-14.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-14.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-14.txt"

git push -u origin feat/sprint-2-14-state-name-custom
```

#### D7. PR

```powershell
$prBody = @'
## Summary

Sprint 2.14 -- state name translation + smart idempotency.

After Sprint 2.13 fixed fields, states still collided with default ones (New, Active, etc.)
auto-created by ADO on POST /workItemTypes.

## Architectural principle (user insight 2026-05-18 ~17h)

> "il faut que tout ce que tu crees pour les WIT soit du custom"

Sprint 2.14 transposes Sprint 2.13 pattern (40 fields OK) to STATES.

## Fix

- `schemaToAdoStateName("Active")` -> `"TestVault Active"`
- Pre-flight `getExistingStates` to detect default WIT states  
- Skip if state name already exists (idempotent)
- VS403083 + 409 handled gracefully

## Tests

- 5+ unit tests new helpers
- 5+ integration tests state idempotency  
- CFG-2026-05-18 regression
- All Sprint 2.7-2.13 tests still green

## After merge

1. Tag v0.5.16 + push
2. Cleanup BCEE-QA : process residuel + (optionnel) custom states existants
3. Re-run E2E
4. Expected : 7 WIT + 40+ fields + custom states "TestVault X" all created
5. Test Case creation (Sprint 2.15 anticipated for extension CRUD)
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-14.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.14 state name translation + smart idempotency" `
  --body-file "$env:TEMP\pr-body-sprint-2-14.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-14.txt"
```

#### D8. Archive + post-merge cleanup

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-14.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-14.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-14.md
}
```

```powershell
# Post-merge
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-14-state-name-custom 2>$null
git log --oneline | Select-Object -First 5
```

### Lot E -- Tag + retest E2E (~20 min apres merge)

#### E1. Tag v0.5.16 + push

```powershell
git checkout main
git pull
git tag -a v0.5.16 -m "Release v0.5.16 -- Sprint 2.14 state name custom + idempotency"
git push origin v0.5.16
```

#### E2. Surveille CI (~5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions
1. Publish Marketplace 0.5.16
2. Publish CLI npm 0.5.16
```

#### E3. Cleanup BCEE-QA

```
1. Process "Argos Inherited Demo" : delete via portal
2. Custom.TestVault* org-level fields : LAISSER (idempotency Sprint 2.13 les reuse)
3. Picklists TestVault-* : LAISSER (idempotency Sprint 2.8)
4. New PAT 1 day (Process R/M + Project R/W/M)
```

#### E4. Update extension a 0.5.16

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
Argos Testing : Update 0.5.16
```

#### E5. TEST E2E REEL

```powershell
npm view @atconseil/argos-cli@0.5.16 version

npx -y @atconseil/argos-cli@0.5.16 install `
    --org-url https://dev.azure.com/BCEE-QA `
    --project "DEMO" `
    --pat "[ton_PAT]" `
    --base-process Agile `
    --process-name "Argos Inherited Demo" `
    --skip-confirm
```

#### E6. Resultat attendu (scenario heureux)

```
[creating-process] Creating process "Argos Inherited Demo"...
[creating-picklists] Found 5 existing picklists in organization.
[creating-picklists] Reusing existing picklist "TestVault-Priority"...
...

[creating-wits] [VALIDATE] Pre-flight: 40 schema fields. 0 to create, 40 to reuse, 0 conflicts.

[creating-wits] Creating TestVault Test Case... (1/7)
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   [REUSE] org-level field Custom.TestVaultPriority (already exists)
[creating-wits]   [ATTACH] "TestVault Priority" -> TestVault Test Case
... (tous fields reused via Sprint 2.13 idempotency) ...

[creating-wits]   [VALIDATE] Pre-flight states for TestVault Test Case...
[creating-wits]   [VALIDATE] WIT has 5 default states: New, Active, Resolved, Closed, Removed
[creating-wits]   [STATE-CREATE] "TestVault Draft" (category: Proposed)
[creating-wits]   [STATE-CREATE] "TestVault Active" (category: InProgress)
[creating-wits]   [STATE-CREATE] "TestVault Approved" (category: Resolved)
... (tous custom states crees) ...

[creating-wits] Creating TestVault Test Plan... (2/7)
... (idempotency partout) ...

[creating-wits] Creating TestVault Audit Log... (7/7)
[done] Installation complete!

[OK] Installation complete!
  Process ID: <GUID>
  Process name: Argos Inherited Demo
```

#### E7. Apres install reussi -- VERIFICATIONS

```
1. Portal ADO :
   https://dev.azure.com/BCEE-QA/_settings/process
   - Process "Argos Inherited Demo" > Work item types
   - 7 WIT TestVault X
   - Click un WIT > onglet States
   - VOIR : default + "TestVault X" states coexistent (OK)
   - VOIR : custom states ont customizationType "custom"

2. Migration projet DEMO :
   Process > Argos Inherited Demo > Projects > Cocher DEMO + Save

3. Refresh extension :
   https://dev.azure.com/BCEE-QA/DEMO
   Ctrl+F5
   Hub Cases > Get Started wizard
   -> Step Detection > "I've installed, refresh"
   -> Attendu : "Argos installed"

4. **MOMENT DE VERITE FINAL** : Create Test Case
   Hub Cases > Case Details
   Title : "Mon premier"
   Click "Create Test Case"
   
   A. SUCCESS toast + Test Case visible
      -> **MILESTONE PRODUIT FONCTIONNEL APRES 8 SPRINTS HOTFIX**
   
   B. Error 404 / TF51535 sur refName ou field
      -> bug 9 (TECH-DEBT-054) extension CRUD
      -> Sprint 2.15 demain matin frais
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : GET existing states APRES POST workItemTypes

L'ordre est critique : on doit creer le WIT d'abord, puis GET ses states defaults.
Si GET avant POST WIT : 404 (WIT n'existe pas encore).

### GF23 : Le pre-flight states est PAR WIT, pas global

Contrairement au pre-flight fields (org-level), les states sont WIT-level.
Donc GET states pour CHAQUE WIT cree dans la boucle.

### GF24 : Sprint 2.7-2.13 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF25 : Logging tags coherents

[STATE-CREATE] / [STATE-SKIP] / [STATE-ERROR] (parallel des field tags Sprint 2.13)

### GF26 : Default states stay (not hidden)

Pour MVP, on laisse les default states ADO en place ET on ajoute nos custom.
Workflow ADO peut avoir defaults + customs.
Hide inherited states = Sprint future si UX requise.

### GF27 : Extension argos-detection-api NOT modifie

TECH-DEBT-054 (extension CRUD) = Sprint 2.15.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-14-state-name-custom

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

1. **Apres Lot 0** : "Code lu. States structure du schema confirmee."
2. **Apres Lot A** : "schemaToAdoStateName + validateAdoStateName added. Tests passing. Continue Lot B ?"
3. **Apres Lot B** : "getExistingStates helper ready. Continue Lot C integration ?"
4. **Apres Lot C** : "Step 3 states loop refactored. Continue Lot D tests + commit ?"
5. **Apres Lot D6** : "PR ouverte. Apres merge, lance Lot E tag + retest E2E."

---

## Criteres de done

- [ ] Branche feat/sprint-2-14-state-name-custom creee
- [ ] schemaToAdoStateName + validateAdoStateName helpers
- [ ] getExistingStates helper
- [ ] Step 3 states loop : translation + idempotency + structured logging
- [ ] Handle VS403083 + 409 gracefully
- [ ] 5+ tests unit helpers
- [ ] 5+ tests integration state scenarios
- [ ] CFG-2026-05-18-state-name-custom NEW
- [ ] All Sprint 2.7-2.13 tests STILL green
- [ ] Bump 0.5.15 -> 0.5.16
- [ ] CHANGELOG complete
- [ ] tasks.md TECH-DEBT-056 livre
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.16
- [ ] CI workflows verts
- [ ] Test E2E install reussi (7 WIT + 40 fields + custom states)

---

## Apres ca

### Si install E2E reussit

1. Verifications portal (3 min) : 7 WIT, fields, custom states "TestVault X" visibles
2. Migration projet DEMO
3. Refresh extension
4. **MOMENT DE VERITE FINAL** : Create Test Case
   - SUCCESS : MILESTONE PRODUIT FONCTIONNEL apres 8 sprints hotfix
   - Error : Sprint 2.15 (extension CRUD) demain matin frais

### Si install E2E echoue (bug 10 -- pas attendu)

Diagnostic + sprint hotfix demain. Le pattern "tout custom prefixe" devrait avoir
neutralise tous les conflits naming. Si un autre bug emerge ce serait probablement
sur l'extension UI (Sprint 2.15 anticipated).

### Bilan session du jour si milestone atteint

```
Sprints livres : 8 (Sprint 2.7 a 2.14)
Versions publiees : 9 (0.5.7 a 0.5.16)
Bugs E2E decouverts + fixes : 7 architectures cachees
Lignes code modifiees : ~2000-3000
Tests ajoutes : ~50+
TECH-DEBT livres : 047, 049, 050, 051, 052, 053, 055, 056
Pattern architectural emerge : "Tout custom prefixe TestVault X"
```

Apres Sprint 2.14, le SDK install est ROBUSTE et IDEMPOTENT.
Reste juste extension CRUD pour le scenario complet user.

Bon sprint refactor final !
