# Prompt Claude Code -- Sprint 2.8 idempotency picklists + WIT (`feat/sprint-2-8-process-install-idempotency`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint hotfix idempotency Step 2 (picklists) + Step 3 (WIT) du process-install.ts SDK.
> Estimation : ~45 min.

---

## Contexte critique

**Decouverte 2026-05-15 jeudi soir au premier test E2E reel** :

Apres le fix charset (Sprint 2.7 livre argos@0.5.9), le test E2E suivant a echoue :

```
[creating-picklists] Creating picklists...
Installation failed: VS402848: The picklist name TestVault-Priority is already in use.
WorkItemPickListItemNameAlreadyInUseException
```

Cause : `process-install.ts` SDK cree les picklists sans verifier si elles existent
deja. Le code actuel fait juste `POST /lists` blindly -> 409 conflict si le name existe.

Probablement la meme logique pour les WITs (Step 3) -- POST sans verification.

**Confirme cleanup BCEE-QA 2026-05-18 lundi matin** :
- Process "Argos Inherited Demo" : SUPPRIME (manuel jeudi)
- Picklists residuelles : etat inconnu (diagnostic via PowerShell foire jeudi soir,
  voir SESSION-2026-05-15-RESUME.md)

L'idempotency complete dans le SDK garantit que le retest E2E lundi matin reussit
QUEL QUE SOIT l'etat residuel d'ADO.

Refs :
- Sprint 2.7 (argos@0.5.9 charset fix)
- packages/argos-sdk/src/process-install.ts (~306 lignes)
- Specs/SESSION-2026-05-15-RESUME.md
- TECH-DEBT-047 NEW : argos-cli install idempotency picklists (LIVRE ce sprint)
- TECH-DEBT-049 NEW : schema sync fields if WIT exists (deferred)

---

## Decisions actees lundi 2026-05-18

| # | Element | Choix |
|---|---|---|
| D82 | Picklists idempotency | A -- GET first + Map + skip if exists |
| D83 | WIT idempotency | B -- Inclus dans Sprint 2.8 |
| D84 | State detection logic | A -- Garder current |
| D85 | Cleanup strategy | C -- Pas de cleanup mode, idempotency defensive |
| D86 | Field sync if WIT exists | A -- SKIP fields entirely (no schema sync this sprint) |

---

## Architecture cible

### Step 2 modifie : Create picklists idempotent

```typescript
// BEFORE Sprint 2.8 (current):
emit({ phase: "creating-picklists", message: "Creating picklists..." });
const picklistIds = new Map<string, string>();

for (const wit of TESTVAULT_SCHEMA.wits) {
    for (const field of wit.fields) {
        if (field.referenceName.startsWith("TestVault.") &&
            (field.type === "picklistString" || field.type === "picklistInteger") &&
            !picklistIds.has(field.referenceName) &&
            field.allowedValues) {
            // POST /lists blindly (CRASH if name exists)
            const res = await doFetch(`${orgUrl}/_apis/work/processes/lists?api-version=${API_VERSION}`, {
                method: "POST",
                body: JSON.stringify({
                    name: field.referenceName.replace(".", "-"),
                    type: ...,
                    items: ...,
                }),
            });
            const pl = await jsonOrThrow<{ id: string }>(res);
            picklistIds.set(field.referenceName, pl.id);
        }
    }
}

// AFTER Sprint 2.8:
emit({ phase: "creating-picklists", message: "Creating picklists..." });
const picklistIds = new Map<string, string>();

// NEW: Fetch existing picklists first to build skip-map
emit({ phase: "creating-picklists", message: "Checking existing picklists..." });
const existingListsRes = await doFetch(
    `${orgUrl}/_apis/work/processes/lists?api-version=${API_VERSION}`,
    { method: "GET" }
);
const existingLists = await jsonOrThrow<{ value: Array<{ id: string; name: string }> }>(existingListsRes);
const existingPicklistsByName = new Map<string, string>(
    existingLists.value.map(p => [p.name, p.id])
);
emit({ 
    phase: "creating-picklists", 
    message: `Found ${existingLists.value.length} existing picklists in organization.` 
});

for (const wit of TESTVAULT_SCHEMA.wits) {
    for (const field of wit.fields) {
        if (field.referenceName.startsWith("TestVault.") &&
            (field.type === "picklistString" || field.type === "picklistInteger") &&
            !picklistIds.has(field.referenceName) &&
            field.allowedValues) {
            
            const picklistName = field.referenceName.replace(".", "-");
            
            // Check if picklist already exists
            const existingId = existingPicklistsByName.get(picklistName);
            if (existingId) {
                // Reuse existing picklist
                emit({ 
                    phase: "creating-picklists", 
                    message: `Reusing existing picklist "${picklistName}"...` 
                });
                picklistIds.set(field.referenceName, existingId);
                continue;
            }
            
            // Create new picklist
            emit({ 
                phase: "creating-picklists", 
                message: `Creating picklist "${picklistName}"...` 
            });
            const res = await doFetch(
                `${orgUrl}/_apis/work/processes/lists?api-version=${API_VERSION}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        name: picklistName,
                        type: field.type === "picklistInteger" ? "Integer" : "String",
                        items: field.allowedValues.map(String),
                    }),
                }
            );
            const pl = await jsonOrThrow<{ id: string }>(res);
            picklistIds.set(field.referenceName, pl.id);
            // Also update the Map so next iterations see this picklist
            existingPicklistsByName.set(picklistName, pl.id);
        }
    }
}
```

### Step 3 modifie : Create WITs idempotent (skip if exists)

```typescript
// BEFORE Sprint 2.8 (current):
const wits = TESTVAULT_SCHEMA.wits;
for (let i = 0; i < wits.length; i++) {
    const wit = wits[i];
    if (!wit) continue;
    
    emit({ phase: "creating-wits", message: `Creating ${wit.displayName}...`, current: i + 1, total: wits.length });
    
    // POST WIT blindly (CRASH if refName exists)
    const witRes = await doFetch(...);
    await throwForStatus(witRes);
    
    // Add custom fields...
    // Add states...
}

// AFTER Sprint 2.8:
// NEW: Fetch existing WITs in the new process first
emit({ phase: "creating-wits", message: "Checking existing work item types..." });
const existingWitsRes = await doFetch(
    `${base}/${processId}/workItemTypes?api-version=${API_VERSION}`,
    { method: "GET" }
);
const existingWits = await jsonOrThrow<{ value: Array<{ referenceName: string }> }>(existingWitsRes);
const existingWitRefs = new Set<string>(
    existingWits.value
        .map(w => w.referenceName)
        .filter(r => r.startsWith("TestVault."))
);
emit({ 
    phase: "creating-wits", 
    message: `Found ${existingWitRefs.size} existing TestVault WITs in process.` 
});

const wits = TESTVAULT_SCHEMA.wits;
for (let i = 0; i < wits.length; i++) {
    const wit = wits[i];
    if (!wit) continue;
    
    // Check if WIT already exists (D86-A: skip entire WIT, including fields)
    if (existingWitRefs.has(wit.referenceName)) {
        emit({ 
            phase: "creating-wits", 
            message: `Skipping ${wit.displayName} (already exists)`, 
            current: i + 1, 
            total: wits.length 
        });
        continue;
    }
    
    emit({ phase: "creating-wits", message: `Creating ${wit.displayName}...`, current: i + 1, total: wits.length });
    
    // POST WIT (this is now safe -- name doesn't exist)
    const witRes = await doFetch(...);
    await throwForStatus(witRes);
    
    // Add custom fields (existing logic preserved)
    for (const field of wit.fields.filter((f) => f.referenceName.startsWith("TestVault."))) {
        // existing field POST logic
    }
    
    // Add states (existing logic preserved)
    // ...
}
```

---

## Garde-fous

### GF1 -- GF18 : standards

ASCII strict, fixed-versioning, marketplace-public, etc.

### GF19 : NE PAS modifier Step 1 (create process)

Step 1 reste tel quel. La detection `detectInstallState` gere deja le cas
"process exists" en amont (status "partial" ou "installed").

### GF20 : NE PAS modifier Step 1.5 / fields creation OR states creation

Sprint 2.8 = SEULEMENT Step 2 (picklists) et Step 3 (WIT skip).
NE PAS toucher la creation des fields ou states (logic preserved as-is).
Si WIT exists, on skip COMPLETEMENT (D86-A).

### GF21 : Tests obligatoires

```typescript
describe("Sprint 2.8 idempotency", () => {
    describe("picklists", () => {
        it("reuses existing picklist by name");
        it("creates new picklist if name not exists");
        it("mixes reuse + create in same install");
    });
    describe("wits", () => {
        it("skips WIT if referenceName already exists in process");
        it("creates WIT if referenceName not in process");
        it("mixes skip + create in same install");
    });
});
```

### GF22 : Logging clair

Chaque action emit un message visible :
- "Reusing existing picklist X..."
- "Creating picklist X..."
- "Skipping WIT X (already exists)"
- "Creating WIT X..."

Pour que les logs CLI soient diagnostiques par l'utilisateur.

### GF23 : Pas de regression

Cas tout-neuf (premier install) doit toujours marcher comme avant.

### GF24 : Pre-existing TESTVAULT_SCHEMA est immutable

NE PAS modifier le schema. Tests Sprint 2.7 charset validation doivent rester verts.

---

## Composition exacte du sprint -- 4 LOTS

### Lot A -- Picklists idempotency (~15 min)

#### A1. Modifier `packages/argos-sdk/src/process-install.ts` Step 2

Voir bloc "Step 2 modifie" ci-dessus.

Cles :
- GET /lists au demarrage de Step 2
- Build `existingPicklistsByName: Map<string, string>` (name -> id)
- Dans la boucle, check Map BEFORE POST
- Si exists : `picklistIds.set(field.referenceName, existingId)` + continue
- Sinon : POST + update both maps (picklistIds + existingPicklistsByName)

#### A2. Verification ASCII + lint

```powershell
node tools\regression\scan-mojibake.cjs
pnpm --filter @atconseil/argos-sdk lint
```

### Lot B -- WIT idempotency (~15 min)

#### B1. Modifier `packages/argos-sdk/src/process-install.ts` Step 3

Voir bloc "Step 3 modifie" ci-dessus.

Cles :
- GET /workItemTypes au demarrage de Step 3
- Build `existingWitRefs: Set<string>` filtre sur "TestVault."
- Dans la boucle, check Set BEFORE POST
- Si exists : emit "Skipping ..." + continue (D86-A : on skip TOUT le WIT)
- Sinon : POST WIT + create fields + create states (logic preserved)

### Lot C -- Tests unitaires (~10 min)

#### C1. Etendre `packages/argos-sdk/src/process-install.test.ts`

```typescript
describe("Sprint 2.8 idempotency", () => {
    describe("picklists idempotency", () => {
        it("reuses existing picklist by name (no POST)", async () => {
            const fetchMock = vi.fn()
                .mockResolvedValueOnce({  // POST process (Step 1)
                    ok: true, status: 201,
                    json: async () => ({ typeId: "proc-1" })
                })
                .mockResolvedValueOnce({  // GET /lists (Step 2 init)
                    ok: true, status: 200,
                    json: async () => ({ 
                        value: [
                            { id: "list-existing-1", name: "TestVault-Priority" },
                        ] 
                    })
                })
                .mockResolvedValueOnce({  // GET /workItemTypes (Step 3 init)
                    ok: true, status: 200,
                    json: async () => ({ value: [] })
                })
                // ... WIT creations follow
                ;
            
            const service = createProcessInstallService({...});
            await service.install({...});
            
            // Verify GET /lists was called
            // Verify POST /lists was NOT called for "TestVault-Priority"
            // (other picklists may have POSTs)
        });
        
        it("creates new picklist if name not exists", async () => {
            const fetchMock = vi.fn()
                .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ typeId: "proc-1" }) })  // process
                .mockResolvedValueOnce({  // GET /lists: empty
                    ok: true, status: 200,
                    json: async () => ({ value: [] })
                })
                .mockResolvedValueOnce({  // POST first picklist
                    ok: true, status: 201,
                    json: async () => ({ id: "list-new-1", name: "TestVault-Priority" })
                });
                // ... etc
            
            // Verify POST /lists called for each picklist in schema
        });
    });
    
    describe("WIT idempotency", () => {
        it("skips WIT if referenceName already in process", async () => {
            const fetchMock = vi.fn()
                .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ typeId: "proc-1" }) })  // process
                .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ value: [] }) })  // GET /lists
                // ... picklists POSTs ...
                .mockResolvedValueOnce({  // GET /workItemTypes returns existing
                    ok: true, status: 200,
                    json: async () => ({ 
                        value: [
                            { referenceName: "TestVault.TestCase" }
                        ] 
                    })
                });
                // Following: only 6 WIT POSTs (not 7)
            
            // Verify POST workItemTypes NOT called for "TestVault.TestCase"
        });
        
        it("creates WIT if referenceName not in process", async () => {
            // GET /workItemTypes returns empty
            // Verify POST workItemTypes called 7 times
        });
    });
});
```

NOTE : si le mock fetch est complexe a setup, simplifier le test scope sur juste
verifier que les MAPS sont bien construites. Les tests doivent etre solides mais
pas viser exhaustivite.

#### C2. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-process-install-idempotency.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG process-install.ts idempotency", () => {
    const root = resolve(__dirname, "../../..");
    const filePath = resolve(root, "packages/argos-sdk/src/process-install.ts");
    
    it("file exists", () => {
        expect(existsSync(filePath)).toBe(true);
    });
    
    const content = readFileSync(filePath, "utf8");
    
    it("Step 2 fetches existing picklists before creating", () => {
        // Check that GET /lists is called before the picklist creation loop
        expect(content).toMatch(/existingPicklistsByName|existingLists/);
        expect(content).toContain("Reusing existing picklist");
    });
    
    it("Step 3 fetches existing WITs before creating", () => {
        // Check that GET /workItemTypes is called before WIT creation loop
        expect(content).toMatch(/existingWitRefs|existingWits/);
        expect(content).toContain("already exists");
    });
});
```

### Lot D -- Bump + commit + PR (~5 min)

#### D1. Bump 0.5.9 -> 0.5.10

```powershell
node tools\release\bump-fixed-version.cjs 0.5.10

# Verification
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D2. CHANGELOG [0.5.10]

```markdown
## [0.5.10] - 2026-05-18

### Fixed

**Sprint 2.8 -- process-install.ts idempotency (HOTFIX)**

Bug discovered at E2E real test on 2026-05-15:
```
VS402848: The picklist name TestVault-Priority is already in use.
```

Root cause: SDK process-install.ts created picklists and WITs without checking
if they already exist. ADO returned 409 conflict on the first picklist (then
crashed).

Fix:
- **Step 2 (picklists)**: GET /_apis/work/processes/lists first, build Map<name, id>,
  skip POST if name already exists, reuse existing id.
- **Step 3 (WITs)**: GET /workItemTypes first, build Set<referenceName>, skip
  entire WIT creation if referenceName already exists in process (D86-A: no
  field-level sync this sprint, deferred to TECH-DEBT-049).
- Logging: each action emits clear "Reusing..." / "Creating..." / "Skipping..."
  messages for CLI visibility.

### Tests

- 4+ new unit tests for idempotency scenarios
- CFG-2026-05-18-process-install-idempotency.test.ts regression test
- All Sprint 2.7 charset tests remain green (schema immutable)

### Architecture preserved

- Step 1 (create process) unchanged
- TESTVAULT_SCHEMA immutable (constitution section 12)
- detectInstallState logic unchanged (D84-A)
- Field-level idempotency intentionally NOT done (TECH-DEBT-049)
- Cleanup mode intentionally NOT added (D85-C, defensive idempotency suffices)

### TECH-DEBT

- TECH-DEBT-047 LIVRE : argos-cli install idempotency
- TECH-DEBT-049 NEW : schema sync fields if WIT exists (deferred)
- TECH-DEBT-019 (E2E reel) : un cran de plus, retest after this sprint

### Lessons learned

- Backend idempotency is non-negotiable for production-grade install commands
- GET before POST is a baseline pattern for ADO API integration
- Unit tests with mock fetch cannot catch ADO semantic conflicts; only real
  E2E reveals (TECH-DEBT-019 justification continues)
```

#### D3. Specs/tasks.md

```markdown
- [x] TECH-DEBT-047 (Sprint 2.8) -- argos-cli install idempotency picklists + WIT
- [ ] TECH-DEBT-049 NEW -- Schema sync fields if WIT exists (deferred)
```

#### D4. Commit + PR

```powershell
$msg = "fix(sdk): Sprint 2.8 process-install idempotency picklists + WIT"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(sdk): Sprint 2.8 process-install idempotency picklists + WIT

HOTFIX bug discovered at E2E real test 2026-05-15:
VS402848 'TestVault-Priority is already in use' on second install attempt.

Root cause: process-install.ts SDK created picklists and WITs without
checking if they already exist. ADO returned 409 on first picklist.

Fix:
- Step 2 picklists: GET /lists first, Map<name, id>, skip if exists
- Step 3 WITs: GET /workItemTypes first, Set<refName>, skip entire WIT if exists
- Logging clear: 'Reusing...', 'Creating...', 'Skipping...'

Decisions:
- D82-A: GET first + Map for picklists
- D83-B: WIT idempotency included
- D84-A: detectInstallState logic unchanged
- D85-C: No cleanup mode, defensive idempotency
- D86-A: SKIP entire WIT if exists (no field sync, deferred to TECH-DEBT-049)

Tests added:
- 4 unit tests for idempotency scenarios
- CFG-2026-05-18-process-install-idempotency regression test
- Sprint 2.7 charset tests still passing (schema immutable)

Architecture preserved:
- Step 1 (create process) unchanged
- TESTVAULT_SCHEMA immutable (constitution section 12)
- detectInstallState logic unchanged

TECH-DEBT:
- TECH-DEBT-047 LIVRE: argos-cli install idempotency
- TECH-DEBT-049 NEW: schema sync fields (deferred)
- TECH-DEBT-019 (E2E reel): retest after this sprint

Bump 0.5.9 -> 0.5.10 via script.

Refs:
- Sprint 2.7 (argos@0.5.9 charset fix)
- Bug VS402848 documented in SESSION-2026-05-15-RESUME.md
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-8.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-8.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-8.txt"

git push -u origin feat/sprint-2-8-process-install-idempotency
```

#### D5. PR

```powershell
$prBody = @'
## Summary

HOTFIX for bug discovered at E2E real test 2026-05-15 (Sprint 2.7).

After fixing charset issues (Sprint 2.7), the install command crashed on second
attempt with VS402848 (picklist name already in use). Root cause: SDK created
picklists and WITs without checking if they already exist.

## Fix

- Step 2 (picklists): GET /lists, build Map, skip if exists
- Step 3 (WITs): GET /workItemTypes, build Set, skip entire WIT if exists
  (D86-A: no field-level sync this sprint, deferred to TECH-DEBT-049)
- Clear logging for each action

## Tests

- 4 unit tests for idempotency scenarios
- CFG-2026-05-18 regression test
- All previous tests still green

## After merge

1. Tag v0.5.10 + push -> triggers publish-marketplace.yml + publish-cli.yml
2. Verify Marketplace 0.5.10 + npm 0.5.10 (smoke test in CI)
3. Re-run E2E test on BCEE-QA / DEMO with idempotent SDK
4. Expected: install succeeds even with residual picklists from previous failed runs
5. Verify 7 Custom WIT created
6. Migrate DEMO project on new process
7. Extension wizard refresh -> "Argos installed"
8. Create Test Case -> verify success
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-8.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(sdk): Sprint 2.8 process-install idempotency picklists + WIT" `
  --body-file "$env:TEMP\pr-body-sprint-2-8.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-8.txt"
```

#### D6. Archive prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-8.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-8.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-8.md
}
```

#### D7. Post-merge cleanup

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-8-process-install-idempotency 2>$null
git log --oneline | Select-Object -First 5
```

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-8-process-install-idempotency

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
# Tests SDK
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 30
# Attendu : tous passing dont nouveaux tests Sprint 2.8

# Tests regression suite
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10
# Attendu : 63+ passing (60+ baseline + 3+ CFG charset Sprint 2.7 + 1 CFG idempotency Sprint 2.8)

# Tests Sprint 2.7 charset toujours verts
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 10
# Attendu : tous charset tests passing (schema immutable)

# Build + lint + typecheck
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# Mojibake
node tools\regression\scan-mojibake.cjs

# Preflight
pnpm preflight
# Attendu : PASSED argos@0.5.10
```

---

## Reporting utilisateur

1. **Apres Lot A** : "Step 2 picklists idempotent. GET /lists added. Map built. Skip-if-exists logic. Continue Lot B WIT ?"
2. **Apres Lot B** : "Step 3 WITs idempotent. GET /workItemTypes added. Skip if exists. Continue Lot C tests ?"
3. **Apres Lot C** : "Tests added. X tests passing. CFG-2026-05-18 regression passing. Continue Lot D bump + PR ?"
4. **Apres Lot D4** : "PR ouverte. Apres merge, lance Lot D7 cleanup + tag v0.5.10."

---

## Criteres de done

- [ ] Branche feat/sprint-2-8-process-install-idempotency creee
- [ ] Step 2 picklists : GET /lists + Map + skip if exists
- [ ] Step 2 logs clairs : "Reusing..." / "Creating..."
- [ ] Step 3 WITs : GET /workItemTypes + Set + skip entire if exists
- [ ] Step 3 logs clairs : "Skipping..." / "Creating..."
- [ ] 4+ unit tests passing
- [ ] CFG-2026-05-18-process-install-idempotency.test.ts created and passing
- [ ] Sprint 2.7 charset tests STILL green
- [ ] Bump 0.5.9 -> 0.5.10 (15 packages + vss-extension)
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] ASCII commit message
- [ ] CHANGELOG [0.5.10] complete
- [ ] tasks.md updates (TECH-DEBT-047 livre, TECH-DEBT-049 new)
- [ ] Prompt archive
- [ ] PR ouverte avec body complet
- [ ] Post-merge cleanup execute

---

## Apres ca

1. Merge PR
2. Tag v0.5.10 + push -> trigger 2 workflows publish
3. Verifier les 3 CI workflows verts (CI main + publish-marketplace + publish-cli)
4. Smoke test CI auto-verifie le npm publish

5. **TEST E2E REEL FINAL** (le moment de verite) :
   - Generer nouveau PAT BCEE-QA (Process Read & manage)
   - Update Argos extension 0.5.10 sur BCEE-QA
   - Lancer :
     ```
     npx -y @atconseil/argos-cli@0.5.10 install ^
       --org-url https://dev.azure.com/BCEE-QA ^
       --project "DEMO" ^
       --pat <NEW_PAT> ^
       --base-process Agile ^
       --process-name "Argos Inherited Demo" ^
       --skip-confirm
     ```
   - Resultat attendu (IMPORTANT) :
     * Si picklists residuelles existent : "Reusing existing picklist..."
     * Si WITs residuels (de l'ancien process supprime) : N/A vu que process deleted
     * Sinon : "Creating..." normalement
     * Au final : "Installation complete!" sans VS402848
   
6. Verifier 7 Custom WIT crees dans process via portal
7. Migrer projet DEMO sur le nouveau process
8. Retour extension Argos -> wizard refresh -> "Argos installed"
9. Hub Cases -> Create Test Case -> SUCCESS attendu (plus de VS402323)

10. Si tout marche : **MILESTONE PRODUIT REEL FONCTIONNEL**
11. Si bug couche 4 surface : Sprint 2.9 ou note

Bon sprint hotfix !
