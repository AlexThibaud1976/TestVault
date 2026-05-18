# Prompt Claude Code -- Sprint 2.12 ADO field 2-step workflow (`feat/sprint-2-12-field-org-level-create`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor : fields ADO necessitent un workflow en 2 etapes (org-level create + WIT attach).
> Estimation : ~1.5-2h.

---

## Contexte critique

**Decouverte 2026-05-18 ~14h** : apres Sprint 2.11 livre argos@0.5.13 (Custom. prefix),
test E2E reel a echoue avec un MESSAGE EVOLUE :

```
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
Installation failed: TF51535: Cannot find field Custom.TestVaultPriority.
WorkItemTrackingFieldDefinitionNotFoundException
```

L'erreur dit "Cannot find field **Custom.TestVaultPriority**" (au lieu de **TestVault.Priority**).
Donc :
- Le prefix "Custom." n'est plus le probleme
- Le field **doit etre cree au niveau ORG AVANT** d'etre attache au WIT

**Investigation Microsoft docs** :

L'endpoint `POST /processes/{processId}/workItemTypes/{wit}/fields` est un **ATTACH-ONLY**
endpoint. Il faut un autre endpoint pour CREER le field au niveau organisation :

```
CREATE FIELD (ORG-LEVEL) :
POST /_apis/wit/fields?api-version=7.1
Body :
{
  "name": "Priority",
  "referenceName": "Custom.TestVaultPriority",
  "type": "string",
  "usage": "workItem",
  "readOnly": false,
  "canSortBy": true,
  "isQueryable": true,
  "isPicklist": false,
  "isPicklistSuggested": false
}
```

Source : https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/fields/create?view=azure-devops-rest-7.1

**Architecture ADO confirmee** :

```
ORG (organization)
 |_ Fields (Custom.TestVaultPriority, ...)     <-- ETAPE A : CREATE ICI D'ABORD
 |_ Picklists (TestVault-Priority, ...)
 |_ Processes
     |_ "Argos Inherited Demo"
         |_ Work Item Types
             |_ "TestVault Test Case"
                 |_ Attached Fields            <-- ETAPE B : ATTACH AU WIT
                 |_ States
                 |_ Layout
```

Le code actuel saute l'etape A.

**Picklist association** : 
Pour les picklist fields :
- Etape A : creer field avec `isPicklist: true`
- Etape B : attacher au WIT avec `picklistId` dans le body

Refs :
- Sprint 2.7-2.11 (charset/idempotency/icons/refName/Custom. prefix)
- Microsoft create field doc : https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/fields/create
- Microsoft attach field doc : https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/fields/add
- TECH-DEBT-053 NEW : field-level idempotency at org level (LIVRE ce sprint)
- TECH-DEBT-054 RENAME : extension CRUD operations field refName translation (Sprint 2.13)

---

## Decisions actees lundi 2026-05-18 14h22

| # | Element | Choix |
|---|---|---|
| D101 | Continuer maintenant | A -- Sprint 2.12 immediat |
| D102 | Strategie create org | A -- POST /_apis/wit/fields avant ATTACH |
| D103 | Idempotency org-level | A -- GET /fields/{refName} first, skip if exists |
| D104 | Field type mapping | "picklistString" -> "string" + isPicklist=true |
| D105 | Sprint 2.13 (extension CRUD) | DEFERRED apres milestone install OK |

---

## Architecture cible

### Workflow 2-step pour chaque field schema

```typescript
// Pour chaque field TestVault.* du WIT en cours de creation :

// ETAPE A : CREATE field at organization level
//   - GET /_apis/wit/fields/{adoFieldRefName} -> si 200 OK : skip create
//   - POST /_apis/wit/fields with full body
//   - Idempotent : 409 conflict = field already exists, treat as success
//
// ETAPE B : ATTACH field to WIT (current code)
//   - POST /_apis/work/processes/{processId}/workItemTypes/{adoWitRefName}/fields
//   - Body : { referenceName: adoFieldRefName, picklistId?, defaultValue?, ... }
```

### Translation type mapping

```typescript
// Schema type -> ADO REST API type
const ADO_FIELD_TYPE_REST: Record<string, { type: string; isPicklist: boolean }> = {
    "string":           { type: "string",   isPicklist: false },
    "integer":          { type: "integer",  isPicklist: false },
    "double":           { type: "double",   isPicklist: false },
    "boolean":          { type: "boolean",  isPicklist: false },
    "dateTime":         { type: "dateTime", isPicklist: false },
    "html":             { type: "html",     isPicklist: false },
    "plainText":        { type: "plainText", isPicklist: false },
    "treePath":         { type: "treePath", isPicklist: false },
    "identity":         { type: "string",   isPicklist: false },  // identity is string-typed at field level
    "picklistString":   { type: "string",   isPicklist: true },
    "picklistInteger":  { type: "integer",  isPicklist: true },
    "picklistDouble":   { type: "double",   isPicklist: true },
};
```

### Body POST create field (ORG-LEVEL)

```typescript
const orgFieldBody = {
    name: field.displayName,                              // "Priority"
    referenceName: adoFieldRefName,                       // "Custom.TestVaultPriority"
    description: field.description ?? "",
    type: ADO_FIELD_TYPE_REST[field.type].type,          // "string"
    usage: "workItem",
    readOnly: false,
    canSortBy: true,
    isQueryable: true,
    isPicklist: ADO_FIELD_TYPE_REST[field.type].isPicklist,
    isPicklistSuggested: false,
};
```

### Body POST attach field (WIT-LEVEL, current code amende)

```typescript
const attachBody: Record<string, unknown> = {
    referenceName: adoFieldRefName,
    required: field.required,
};
if (field.defaultValue !== undefined) attachBody.defaultValue = field.defaultValue;
const plId = picklistIds.get(field.referenceName);
if (plId) attachBody.picklistId = plId;
```

---

## Composition exacte du sprint -- 5 LOTS

### Lot 0 -- Read existing code (~5 min)

Pour informer l'implementation :

```powershell
# Voir le body actuel + l'environnement autour de la POST attach
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-Object -Skip 300 -First 35

# Voir si ADO_FIELD_TYPE existe deja quelque part
Select-String -Path packages\argos-sdk\src\*.ts -Pattern "ADO_FIELD_TYPE" -Encoding UTF8

# Voir doFetch + jsonOrThrow signatures
Get-Content packages\argos-sdk\src\process-install.ts -Encoding UTF8 | Select-String -Pattern "doFetch|jsonOrThrow|throwForStatus" -Context 0,2 | Select-Object -First 25
```

NOTE le resultat pour adapter le code Lot B.

### Lot A -- Helper createFieldAtOrg + idempotency (~30 min)

#### A1. Etendre `packages/argos-sdk/src/process-install.ts`

Ajouter au debut du `install` method, juste apres la creation du process et AVANT Step 3 :

```typescript
// Avant Step 3 ou au demarrage de Step 3 :

// -- Step 2.5 : Build ADO_FIELD_TYPE_REST mapping (constant) ----------
const ADO_FIELD_TYPE_REST: Record<string, { type: string; isPicklist: boolean }> = {
    "string":           { type: "string",   isPicklist: false },
    "integer":          { type: "integer",  isPicklist: false },
    "double":           { type: "double",   isPicklist: false },
    "boolean":          { type: "boolean",  isPicklist: false },
    "dateTime":         { type: "dateTime", isPicklist: false },
    "html":             { type: "html",     isPicklist: false },
    "plainText":        { type: "plainText", isPicklist: false },
    "treePath":         { type: "treePath", isPicklist: false },
    "identity":         { type: "string",   isPicklist: false },
    "picklistString":   { type: "string",   isPicklist: true },
    "picklistInteger":  { type: "integer",  isPicklist: true },
    "picklistDouble":   { type: "double",   isPicklist: true },
};

// Helper : GET org-level field, return whether it exists
async function orgFieldExists(adoFieldRefName: string): Promise<boolean> {
    const url = `${orgUrl}/_apis/wit/fields/${encodeURIComponent(adoFieldRefName)}?api-version=${API_VERSION}`;
    const res = await doFetch(url, { method: "GET" });
    if (res.ok) return true;
    if (res.status === 404) return false;
    // Other errors (403, 500) : propagate
    await throwForStatus(res);
    return false;  // unreachable
}

// Helper : POST org-level field create
async function createFieldAtOrg(
    schemaField: typeof TESTVAULT_SCHEMA.wits[number]["fields"][number],
    adoFieldRefName: string
): Promise<void> {
    const fieldTypeInfo = ADO_FIELD_TYPE_REST[schemaField.type];
    if (!fieldTypeInfo) {
        throw new Error(`Unknown schema field type "${schemaField.type}" for ${schemaField.referenceName}`);
    }
    
    const body = {
        name: schemaField.displayName,
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
    
    // 409 Conflict = field already exists (idempotency safety)
    if (res.status === 409) return;
    
    await throwForStatus(res);
}
```

#### A2. Verification

`orgUrl` doit etre defini en haut du install (probablement deja).
`API_VERSION` doit etre defini (deja le cas).
Le helper utilise les fonctions existantes `doFetch`, `throwForStatus`.

Pas de modification de wit-refname-matcher.ts (Sprint 2.11 patterns conserves).

### Lot B -- Integrer Step 3 fields creation (~25 min)

#### B1. Modifier la boucle fields dans `process-install.ts` Step 3

```typescript
// AVANT (Sprint 2.11 -- attach only) :
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const adoFieldRefName = schemaToAdoFieldRefName(field.referenceName);
    
    const body: Record<string, unknown> = {
        referenceName: adoFieldRefName,
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

// APRES (Sprint 2.12 -- 2-step workflow) :
for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
    const adoFieldRefName = schemaToAdoFieldRefName(field.referenceName);
    
    // ETAPE A : Create field at organization level (idempotent)
    const exists = await orgFieldExists(adoFieldRefName);
    if (exists) {
        emit({
            phase: "creating-wits",
            message: `  Reusing existing org-level field ${adoFieldRefName}`,
            current: i + 1,
            total: wits.length,
        });
    } else {
        emit({
            phase: "creating-wits",
            message: `  Creating org-level field ${adoFieldRefName}...`,
            current: i + 1,
            total: wits.length,
        });
        await createFieldAtOrg(field, adoFieldRefName);
    }
    
    // ETAPE B : Attach field to WIT (existing logic, minor adjustments)
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
    await throwForStatus(fieldRes);
    
    emit({
        phase: "creating-wits",
        message: `  Attached ${field.displayName} (${adoFieldRefName}) to ${wit.displayName}`,
        current: i + 1,
        total: wits.length,
    });
}
```

#### B2. Notes importantes

- `name`, `type`, `description` ne sont PLUS dans l'attach body (deja envoye dans org create)
- `required` reste dans l'attach body (c'est un attribut WIT-specific)
- `defaultValue` reste dans l'attach body (c'est un attribut WIT-specific)
- `picklistId` reste dans l'attach body (l'association picklist-field-WIT)

### Lot C -- Tests unitaires (~20 min)

#### C1. Etendre `packages/argos-sdk/src/process-install.test.ts`

```typescript
describe("Sprint 2.12 -- field 2-step workflow", () => {
    it("creates org-level field if not exists, then attaches to WIT", async () => {
        const fetchMock = vi.fn()
            // POST process
            .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ typeId: "proc-1" }) })
            // GET /lists (Step 2)
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ value: [] }) })
            // POST /lists (each picklist creation)
            // ... (5 picklists)
            // GET /workItemTypes (Step 3 init)
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ value: [] }) })
            // POST /workItemTypes (create WIT 1)
            .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ referenceName: "Proc.TestVaultTestCase" }) })
            // GET /_apis/wit/fields/Custom.TestVaultPriority -> 404 (not exists)
            .mockResolvedValueOnce({ ok: false, status: 404 })
            // POST /_apis/wit/fields (create at org level)
            .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ referenceName: "Custom.TestVaultPriority" }) })
            // POST /workItemTypes/{wit}/fields (attach)
            .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ referenceName: "Custom.TestVaultPriority" }) })
            // ... etc
            ;
        
        // Validate POST /_apis/wit/fields was called with correct body
    });
    
    it("skips org-level field creation if already exists", async () => {
        // Mock GET /_apis/wit/fields/Custom.TestVaultPriority -> 200
        // Verify NO subsequent POST /_apis/wit/fields call
        // Verify attach POST still happens
    });
    
    it("handles 409 conflict from org create as success", async () => {
        // Mock GET -> 404 (not exists per pre-check)
        // Mock POST -> 409 (race condition: created in parallel)
        // Verify no error thrown, attach proceeds
    });
});
```

Si les mocks deviennent trop complexes : reduire le scope a juste verifier que :
- `orgFieldExists` est appelee avant `createFieldAtOrg`
- `createFieldAtOrg` envoie le bon body
- Le second `POST /workItemTypes/{wit}/fields` utilise le bon refName

### Lot D -- CFG regression + bump + commit + PR (~20 min)

#### D1. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-field-2-step-workflow.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG field 2-step workflow (Sprint 2.12)", () => {
    const root = resolve(__dirname, "../../..");
    const path = resolve(root, "packages/argos-sdk/src/process-install.ts");
    const content = readFileSync(path, "utf8");
    
    it("process-install.ts has org-level field create helper", () => {
        expect(content).toContain("createFieldAtOrg");
        expect(content).toContain("orgFieldExists");
    });
    
    it("calls org-level fields endpoint", () => {
        expect(content).toContain("/_apis/wit/fields");
    });
    
    it("uses ADO_FIELD_TYPE_REST mapping", () => {
        expect(content).toContain("ADO_FIELD_TYPE_REST");
        expect(content).toContain("picklistString");
        expect(content).toContain("isPicklist");
    });
    
    it("attach body no longer includes name/type/description", () => {
        // After Sprint 2.12, attach body should be minimal (referenceName + required + defaultValue + picklistId)
        const attachBlockMatch = content.match(/ETAPE B[\s\S]*?const attachBody[\s\S]*?\{([\s\S]*?)\}/);
        expect(attachBlockMatch, "Could not locate attach body").not.toBeNull();
    });
});
```

#### D2. Bump 0.5.13 -> 0.5.14

```powershell
node tools\release\bump-fixed-version.cjs 0.5.14

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D3. CHANGELOG.md [0.5.14]

```markdown
## [0.5.14] - 2026-05-18

### Fixed

**Sprint 2.12 -- ADO field 2-step workflow (REFACTOR)**

CRITICAL fix discovered at E2E real test 2026-05-18 after Sprint 2.11 (Custom. prefix):
```
TF51535: Cannot find field Custom.TestVaultPriority.
```

Root cause: ADO inherited processes require a 2-step workflow for custom fields:
1. CREATE field at organization level (POST /_apis/wit/fields)
2. ATTACH field to WIT (POST /processes/{p}/workItemTypes/{wit}/fields)

Our code only did step 2, which is ATTACH-ONLY (lookup-only). ADO couldn't find
the field at org level -> TF51535.

### Architecture changes

NEW helpers in `packages/argos-sdk/src/process-install.ts`:
- `orgFieldExists(adoFieldRefName)`: GET org-level field, return existence
- `createFieldAtOrg(schemaField, adoFieldRefName)`: POST /_apis/wit/fields with full body
- `ADO_FIELD_TYPE_REST` mapping: schema types -> ADO REST API types + isPicklist

Modified Step 3 fields loop:
- For each field: GET org-level first (idempotent), POST create if missing, then attach
- Attach body simplified: only referenceName + required + defaultValue + picklistId
  (name, type, description now sent during org-create instead)

### Type mapping

```
Schema type        ADO REST type    isPicklist
=================  ===============  ===========
string             string           false
integer            integer          false
boolean            boolean          false
dateTime           dateTime         false
html               html             false
identity           string           false
picklistString     string           true
picklistInteger    integer          true
```

### Tests

- 3+ unit tests for 2-step workflow scenarios
- CFG regression test CFG-2026-05-18-field-2-step-workflow
- All Sprint 2.7-2.11 tests still green

### TECH-DEBT

- TECH-DEBT-053 LIVRE: field-level idempotency at org level
- TECH-DEBT-054 RENAME: extension CRUD operations field refName translation
  (next sprint after milestone install OK)
- TECH-DEBT-019 (E2E reel): un cran de plus, retest after this sprint

### Architecture preserved

- TESTVAULT_SCHEMA referenceName immutable (constitution section 12)
- Sprint 2.7 charset compliance maintained
- Sprint 2.8 picklists idempotency maintained
- Sprint 2.9 ADO icon compliance maintained
- Sprint 2.10 WIT refName resolution maintained
- Sprint 2.11 Custom. prefix translation maintained

### Lessons learned

- ADO field creation is a 2-step process : org-create + WIT-attach
- The attach endpoint is LOOKUP-ONLY despite accepting name/type in body
- Microsoft docs do not clearly state this 2-step requirement
- Solo developer + greenfield SDK = E2E discovery is the only path to truth
- 5 architecture-level bugs discovered today via E2E real tests
```

#### D4. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-053 (Sprint 2.12) -- field-level idempotency at org level
- [ ] TECH-DEBT-054 -- extension argos-detection-api/CRUD operations field refName translation
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.12
```

#### D5. Pre-commit + commit + push

```powershell
$msg = "fix(sdk): Sprint 2.12 ADO field 2-step workflow (org create + WIT attach)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.12 ADO field 2-step workflow (org create + WIT attach)

CRITICAL fix discovered at E2E real test 2026-05-18:
TF51535 because ADO inherited processes require a 2-step field workflow.

Step 2.11 sent referenceName with correct "Custom." prefix but POST to
WIT-attach endpoint failed because field didn't exist at organization level.

Root cause analysis :
- POST /processes/{p}/workItemTypes/{wit}/fields is ATTACH-ONLY (lookup-only)
- Need POST /_apis/wit/fields FIRST to create at organization level
- Microsoft docs do not clearly state this 2-step requirement

Architecture (NEW helpers in process-install.ts) :
- orgFieldExists(adoFieldRefName): GET, returns boolean
- createFieldAtOrg(schemaField, adoFieldRefName): POST /_apis/wit/fields
- ADO_FIELD_TYPE_REST mapping: schema types -> ADO REST types + isPicklist

Step 3 fields loop now :
1. orgFieldExists check (idempotent)
2. createFieldAtOrg if missing
3. POST attach to WIT (simplified body)

Type mapping :
  picklistString -> {type:string, isPicklist:true}
  picklistInteger -> {type:integer, isPicklist:true}
  other types : 1-1 mapping

Tests :
- 3+ unit tests for 2-step workflow
- CFG-2026-05-18-field-2-step-workflow
- All Sprint 2.7-2.11 tests still green

TECH-DEBT :
- TECH-DEBT-053 LIVRE : field-level org idempotency
- TECH-DEBT-054 : extension CRUD ops refName translation (next sprint)
- TECH-DEBT-019 (E2E reel) : retest after this sprint

Bump 0.5.13 -> 0.5.14 via script.

Refs :
- Sprint 2.7-2.11
- Microsoft create field doc :
  https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/fields/create
- Microsoft attach field doc :
  https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/fields/add
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-12.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-12.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-12.txt"

git push -u origin feat/sprint-2-12-field-org-level-create
```

#### D6. PR

```powershell
$prBody = @'
## Summary

Sprint 2.12 -- ADO field creation requires 2-step workflow: org-create + WIT-attach.

After Sprint 2.11 fixed the "Custom." prefix issue, fields creation still failed because
ADO's attach endpoint is LOOKUP-ONLY. The field must exist at organization level first.

## Root cause

ADO has 2 distinct endpoints :
- `POST /_apis/wit/fields` : CREATE field at organization level
- `POST /processes/{p}/workItemTypes/{wit}/fields` : ATTACH existing field to WIT

Our code only used the second (attach) endpoint. ADO did a lookup, didn't find the field,
returned TF51535.

## Fix

NEW helpers `orgFieldExists` + `createFieldAtOrg` + `ADO_FIELD_TYPE_REST` mapping.

Step 3 fields loop now does 2-step workflow with idempotency :
1. GET org-level field -> if exists, skip create
2. POST create at org level (with name, type, description, isPicklist, usage, etc.)
3. POST attach to WIT (with referenceName, required, defaultValue, picklistId)

## Tests

- 3+ unit tests for 2-step workflow scenarios  
- CFG-2026-05-18 regression test
- All Sprint 2.7-2.11 tests still green

## After merge

1. Tag v0.5.14 + push -> triggers publish-marketplace + publish-cli
2. Cleanup BCEE-QA: delete process residuel via portal
3. Re-run E2E with 0.5.14
4. Expected: 7 WIT + all fields + states all created successfully
5. Verify portal: WIT custom show fields (Custom.TestVault*) attached
6. Migrate DEMO project
7. Refresh extension -> wizard should detect "Argos installed"
8. Create Test Case -> potential bug 9 (TECH-DEBT-054 extension CRUD)
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-12.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.12 ADO field 2-step workflow (org create + WIT attach)" `
  --body-file "$env:TEMP\pr-body-sprint-2-12.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-12.txt"
```

#### D7. Archive + cleanup post-merge

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-12.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-12.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-12.md
}
```

```powershell
# Post-merge
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-12-field-org-level-create 2>$null
git log --oneline | Select-Object -First 5
```

### Lot E -- Tag + retest E2E (~20 min apres merge)

#### E1. Tag v0.5.14

```powershell
git checkout main
git pull
git tag -a v0.5.14 -m "Release v0.5.14 -- Sprint 2.12 ADO field 2-step workflow"
git push origin v0.5.14
```

#### E2. Surveille CI workflows (~5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions

1. "Publish -- Marketplace" -> Argos 0.5.14
2. "Publish CLI -- npm" -> @atconseil/argos-cli@0.5.14
```

#### E3. Cleanup BCEE-QA (~2 min)

```
Browse https://dev.azure.com/BCEE-QA/_settings/process

Action :
- Click "Argos Inherited Demo"
- Verifier qu'aucun projet ne l'utilise (tab Projects)
- Si projet attache : Migration back puis Delete
- "..." > Delete

NOTE : Le WIT custom "TestVault Test Case" (residuel Sprint 2.11) sera supprime 
       avec le process.

Picklists TestVault-* (5 visibles) : LAISSER (idempotency les reutilise).
Org-level fields (Custom.TestVault* eventuellement crees lors tentatives precedentes) :
  -> Probablement aucune car POST a echoue
  -> Si presence : idempotency Sprint 2.12 les reuse (orgFieldExists check)

Genere new PAT (1 day) :
- Process : Read & manage
- Project and Team : Read, write, manage
```

#### E4. Update Argos extension a 0.5.14 (~1 min)

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
Argos Testing : Update si "Update available" 0.5.14
```

#### E5. TEST E2E REEL FINAL (~3-5 min)

```powershell
# Verifier que 0.5.14 est sur npm
npm view @atconseil/argos-cli@0.5.14 version

# Lance install (NE JAMAIS COLLER PAT DANS CHAT)
npx -y @atconseil/argos-cli@0.5.14 install `
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
... (5 picklists reused)

[creating-wits] Checking existing work item types...
[creating-wits] Found 0 existing TestVault WITs in process.
[creating-wits] Creating TestVault Test Case... (1/7)
[creating-wits] Created TestVault Test Case (ADO refName: ArgosInheritedDemo.TestVaultTestCase) (1/7)
[creating-wits]   Creating org-level field Custom.TestVaultPriority...
[creating-wits]   Attached Priority (Custom.TestVaultPriority) to TestVault Test Case
[creating-wits]   Creating org-level field Custom.TestVaultSteps...
[creating-wits]   Attached Steps (Custom.TestVaultSteps) to TestVault Test Case
... (etc pour les fields)
[creating-wits] Creating TestVault Test Plan... (2/7)
...
[creating-wits] Creating TestVault Audit Log... (7/7)
[done] Installation complete!

[OK] Installation complete!
  Process ID: <GUID>
  Process name: Argos Inherited Demo
```

#### E7. Apres install reussi (~5 min)

```
1. Verifier portal ADO :
   https://dev.azure.com/BCEE-QA/_settings/process
   -> Click "Argos Inherited Demo"
   -> Tab "Work item types"
   -> Click un WIT custom (ex: "TestVault Test Case")
   -> Voir la liste de fields Custom.TestVault* attaches
   -> Tab "States" : verifier custom states presents
   -> Tab "Layout" : verifier fields visibles dans le form

2. Verifier ORG-level fields :
   https://dev.azure.com/BCEE-QA/_settings/process/fields
   OU via REST API GET /_apis/wit/fields?api-version=7.1
   -> Filter sur "Custom.TestVault*"
   -> Voir 30+ fields crees

3. Migrer projet DEMO :
   Process > Argos Inherited Demo > Projects tab
   -> Cocher "DEMO" + Save

4. Refresh extension Argos :
   https://dev.azure.com/BCEE-QA/DEMO
   Ctrl+F5 hard refresh
   Hub Argos > Cases
   -> Wizard "Get Started" peut apparaitre
   -> Step Detection -> click "I've installed, refresh detection"
   -> Attendu : "Argos installed in this project"
   -> Click "Go to dashboard"

5. MOMENT DE VERITE 2 : Create Test Case
   Hub Cases > Case Details
   Title : "Mon premier"
   Click "Create Test Case"
   
   Resultat possible :
   A. SUCCESS toast + Test Case visible -> **MILESTONE PRODUIT FONCTIONNEL**
   B. Error sur refName (TestVault.TestCase vs ADO ArgosInheritedDemo.TestVaultTestCase)
      OU sur field (TestVault.Priority vs Custom.TestVaultPriority)
      -> bug 9 = TECH-DEBT-054 (extension CRUD refName translation)
      -> Sprint 2.13 prochain
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : NE PAS toucher autres parts du SDK

Step 1 (process), Step 2 (picklists), Step 3 WIT POST, states POST, Step 4 (projects):
INCHANGES.

Seul le code des fields creation/attach dans la boucle interne change (Step 3).

### GF23 : Sprint 2.7-2.11 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF24 : orgFieldExists doit etre GET-only

Pas d'effet de bord. Juste un GET avec verification 200 vs 404.

### GF25 : createFieldAtOrg doit gerer 409 conflict gracieusement

Race condition possible si install parallele. 409 = field existe deja (creation concurrente),
treat as success.

### GF26 : ADO_FIELD_TYPE_REST mapping doit etre exhaustif

Tester en local que tous les types schema sont couverts.
Si type inconnu : throw avec message clair indiquant le field problematique.

### GF27 : Logging clair par etape

```
"Creating org-level field {refName}..."   -> step A (creation)
"Reusing existing org-level field {refName}"  -> step A (idempotent)
"Attached {displayName} ({refName}) to {witDisplayName}"  -> step B
```

Pour diagnostique facile en cas de bug futur.

### GF28 : Pas de modification argos-detection-api

TECH-DEBT-054 (extension CRUD) DEFERRED a Sprint 2.13.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-12-field-org-level-create

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
# Tests SDK
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 50
# Attendu : tous Sprint 2.11 + nouveaux 2.12 = VERT

# Tests autres
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

---

## Reporting utilisateur

1. **Apres Lot 0** : "Code lu. ADO_FIELD_TYPE existe ? doFetch signature confirmee."
2. **Apres Lot A** : "Helpers orgFieldExists + createFieldAtOrg + mapping added. Continue Lot B ?"
3. **Apres Lot B** : "Step 3 fields loop modified to 2-step workflow. Continue Lot C tests ?"
4. **Apres Lot C** : "Tests added, all passing. Continue Lot D bump+commit ?"
5. **Apres Lot D5** : "PR ouverte. Apres merge GitHub, lance Lot E tag + retest E2E."

---

## Criteres de done

- [ ] Branche feat/sprint-2-12-field-org-level-create creee
- [ ] orgFieldExists helper ajoute
- [ ] createFieldAtOrg helper ajoute
- [ ] ADO_FIELD_TYPE_REST mapping ajoute
- [ ] Step 3 fields loop : 2-step workflow
- [ ] Idempotency : 404 -> create, 409 -> skip, 200 -> skip
- [ ] Logging : "Creating..." / "Reusing..." / "Attached..." messages
- [ ] 3+ unit tests passing
- [ ] CFG-2026-05-18-field-2-step-workflow NEW + passing
- [ ] All Sprint 2.7-2.11 tests STILL green
- [ ] Bump 0.5.13 -> 0.5.14 via script
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] ASCII commit message
- [ ] CHANGELOG [0.5.14] complete
- [ ] tasks.md TECH-DEBT-053 livre
- [ ] Prompt archive
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.14 + push
- [ ] CI workflows verts
- [ ] Cleanup BCEE-QA fait
- [ ] Test E2E install reussi avec 7 WIT + tous fields + tous states

---

## Apres ca

### Si install E2E reussit (scenario tres probable)

1. Verification complete portal ADO (5 min)
2. Migration projet DEMO sur process (1 min)
3. Refresh extension + wizard detection (1 min)
4. **MOMENT DE VERITE 2** : Create Test Case
   - SUCCESS : MILESTONE PRODUIT FONCTIONNEL
   - Error : TECH-DEBT-054 -> Sprint 2.13 demain

### Si install E2E echoue (bug 9)

Probable causes :
- Manque un champ obligatoire dans org-create body
- Type mapping incorrect
- Permission issue PAT
- Race condition

Diagnostiquer + sprint hotfix.

### Note moral

Sprint 2.12 finalise la chaine SDK :
- Process create OK (Sprint 2.5e-f)
- Picklists OK (Sprint 2.8)
- Process inheritance OK (initial)
- WIT charset OK (Sprint 2.7)
- WIT icons OK (Sprint 2.9)
- WIT refName resolution OK (Sprint 2.10)
- Fields Custom. prefix OK (Sprint 2.11)
- Fields 2-step workflow OK (Sprint 2.12)  <-- THIS
- States : already OK

Apres Sprint 2.12, l'install COMPLETE devrait reussir.
Reste juste l'extension cote UI (Sprint 2.13 si bug 9).

Bon sprint refactor !
