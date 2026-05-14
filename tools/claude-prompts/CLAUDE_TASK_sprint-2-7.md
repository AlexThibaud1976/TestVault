# Prompt Claude Code -- Sprint 2.7 hotfix WIT + Field displayName ADO charset (`feat/sprint-2-7-wit-charset-fix`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **HOTFIX** decouvert au premier test E2E reel ADO.
> Estimation : ~40-50 min.

---

## Contexte critique

**Decouverte 2026-05-15 fin journee** : premier test E2E reel a echoue.

Commande lancee depuis Windows :
```
npx -y @atconseil/argos-cli@0.5.8 install --org-url https://dev.azure.com/BCEE-QA --project "DEMO" --pat [PAT] --base-process Agile --process-name "Argos Inherited Demo" --skip-confirm
```

Resultat :
```
Checking Argos installation state on https://dev.azure.com/BCEE-QA/DEMO...
[INFO] Argos not installed. Will create new process inheritance.
  Base process: Agile
  New process name: Argos Inherited Demo
[creating-process] Creating process "Argos Inherited Demo"...
[creating-picklists] Creating picklists...
[creating-wits] Creating Test Case (Argos)... (1/7)
Installation failed: VS402800: The name 'Test Case (Argos)' is invalid. 
Names cannot contain the following characters: '.,;~:/\\*|?"&%$!+=()[]{}<>-'
```

**Diagnostic** :
- argos-cli command fonctionne (3 phases executees jusqu'au crash)
- ADO Process API repond correctement (auth OK, scopes OK)
- LE PAYLOAD du schema est invalide : les displayName contiennent `(Argos)` -> parentheses interdites par ADO
- ADO charset blacklist : `. , ; ~ : / \ * | ? " & % $ ! + = ( ) [ ] { } < > -`
- Length max 128 chars

**Bugs detectes** :
1. 7 WIT displayName contiennent `(Argos)` (les 7 fichiers wits/*.ts ligne 5)
2. 3 FIELD displayName dans audit-log.ts contiennent `(` :
   - "Timestamp (UTC)" ligne 31
   - "Old Value (anonymized)" ligne 66
   - "New Value (anonymized)" ligne 73
3. AUCUN test unitaire ne validait le charset ADO -> regression non detectee

Ce sprint corrige les 3 problemes + ajoute la securite par test.

Refs :
- Sprint 2.6 published 0.5.8 (Marketplace + npm OK)
- Tag v0.5.8 sur main
- Process "Argos Inherited Demo" sur BCEE-QA deja supprime manuellement (cleanup user)
- TECH-DEBT-019 (E2E reel) : decouvert ce bug aujourd'hui, JUSTIFICATION ULTIME
- TECH-DEBT-046 NEW : ADO charset validation test (LIVRE par ce sprint)

---

## Decisions actees (2026-05-15 soir)

| # | Element | Choix |
|---|---|---|
| D75 | Convention nommage WIT display | A -- "TestVault X" (au lieu de "X (Argos)") |
| D76 | Sprint hotfix timing | A -- Maintenant (Sprint 2.7) |
| D77 | Fields displayName invalides | A -- Renommer aussi |
| D78 | Process cleanup BCEE-QA | Done -- supprime manuellement |
| D79 | Test ADO charset scope | B -- WIT + fields + states |

---

## Architecture cible apres Sprint 2.7

### Renames WIT displayName (7 fichiers)

```
AVANT                          APRES
"Test Case (Argos)"        ->  "TestVault Test Case"
"Test Plan (Argos)"        ->  "TestVault Test Plan"
"Test Set (Argos)"         ->  "TestVault Test Set"
"Precondition (Argos)"     ->  "TestVault Precondition"
"Test Execution (Argos)"   ->  "TestVault Test Execution"
"Test Case Version (Argos)" -> "TestVault Test Case Version"
"Audit Log (Argos)"        ->  "TestVault Audit Log"
```

### Renames FIELD displayName (audit-log.ts)

```
AVANT                       APRES
"Timestamp (UTC)"      ->   "Timestamp UTC"
"Old Value (anonymized)" -> "Old Value anonymized"
"New Value (anonymized)" -> "New Value anonymized"
```

### Test ajoute (CRITIQUE)

```typescript
// packages/argos-wit-schema/src/index.test.ts
// NEW test suite : "ADO charset compliance"

const ADO_FORBIDDEN_CHARS = /[.,;~:\/\\*|?"&%$!+=()\[\]{}<>\-]/;
const ADO_MAX_NAME_LENGTH = 128;

function isValidAdoName(name: string): { valid: boolean; reason?: string } {
    if (!name) return { valid: false, reason: "empty" };
    if (name.length > ADO_MAX_NAME_LENGTH) return { valid: false, reason: `length ${name.length} > 128` };
    if (/^\d+$/.test(name)) return { valid: false, reason: "pure number" };
    if (ADO_FORBIDDEN_CHARS.test(name)) {
        const match = name.match(ADO_FORBIDDEN_CHARS);
        return { valid: false, reason: `contains forbidden char "${match?.[0]}"` };
    }
    return { valid: true };
}

// Test pour chaque WIT
for (const wit of ALL_WITS) {
    it(`WIT displayName "${wit.displayName}" is ADO-valid`, () => { ... });
    
    for (const field of wit.fields) {
        it(`Field displayName "${field.displayName}" in ${wit.referenceName} is ADO-valid`, () => { ... });
    }
    
    for (const state of wit.states) {
        it(`State name "${state.name}" in ${wit.referenceName} is ADO-valid`, () => { ... });
    }
}
```

NOTE : `referenceName` (TestVault.*) n'est PAS soumis aux memes regles. Garder intact.

---

## Composition exacte du sprint -- 5 LOTS

### Lot A -- Rename 7 WIT displayName

Estimation : ~5 min

Pour chaque fichier `packages/argos-wit-schema/src/wits/*.ts`, modifier UNIQUEMENT la ligne 5 (displayName) :

#### A1. `audit-log.ts`
```typescript
displayName: "Audit Log (Argos)" -> displayName: "TestVault Audit Log"
```

#### A2. `precondition.ts`
```typescript
displayName: "Precondition (Argos)" -> displayName: "TestVault Precondition"
```

#### A3. `test-case-version.ts`
```typescript
displayName: "Test Case Version (Argos)" -> displayName: "TestVault Test Case Version"
```

#### A4. `test-case.ts`
```typescript
displayName: "Test Case (Argos)" -> displayName: "TestVault Test Case"
```

#### A5. `test-execution.ts`
```typescript
displayName: "Test Execution (Argos)" -> displayName: "TestVault Test Execution"
```

#### A6. `test-plan.ts`
```typescript
displayName: "Test Plan (Argos)" -> displayName: "TestVault Test Plan"
```

#### A7. `test-set.ts`
```typescript
displayName: "Test Set (Argos)" -> displayName: "TestVault Test Set"
```

NE PAS toucher referenceName, fields, states.

### Lot B -- Rename 3 FIELD displayName dans audit-log.ts

Estimation : ~3 min

`packages/argos-wit-schema/src/wits/audit-log.ts` :

```typescript
// Ligne 31 (Timestamp)
displayName: "Timestamp (UTC)"  ->  displayName: "Timestamp UTC"

// Ligne 66 (Old Value)
displayName: "Old Value (anonymized)"  ->  displayName: "Old Value anonymized"

// Ligne 73 (New Value)
displayName: "New Value (anonymized)"  ->  displayName: "New Value anonymized"
```

NE PAS toucher referenceName de ces fields (TestVault.TimestampUtc, TestVault.OldValueAnonymized, TestVault.NewValueAnonymized restent intacts).

### Lot C -- Tests ADO charset compliance

Estimation : ~15 min

#### C1. Etendre `packages/argos-wit-schema/src/index.test.ts`

Ajouter une nouvelle suite de tests apres les tests existants :

```typescript
describe("ADO charset compliance (VS402800 prevention)", () => {
    // ADO blacklist from VS402800 error message
    // ADO error: "Names cannot contain the following characters: 
    // '.,;~:/\\*|?\"&%$!+=()[]{}<>-'"
    const ADO_FORBIDDEN_CHARS = /[.,;~:\/\\*|?"&%$!+=()\[\]{}<>\-]/;
    const ADO_MAX_NAME_LENGTH = 128;
    
    function getValidationError(name: string): string | null {
        if (!name) return "empty name";
        if (name.length > ADO_MAX_NAME_LENGTH) {
            return `length ${name.length} > ${ADO_MAX_NAME_LENGTH}`;
        }
        if (/^\d+$/.test(name)) return "pure number not allowed";
        const match = name.match(ADO_FORBIDDEN_CHARS);
        if (match) return `contains forbidden char "${match[0]}"`;
        return null;
    }
    
    describe("WIT displayName", () => {
        for (const wit of ALL_WITS) {
            it(`"${wit.displayName}" is ADO-valid (${wit.referenceName})`, () => {
                const error = getValidationError(wit.displayName);
                expect(error, `WIT ${wit.referenceName}: ${error}`).toBeNull();
            });
        }
    });
    
    describe("Field displayName", () => {
        for (const wit of ALL_WITS) {
            for (const field of wit.fields) {
                it(`"${field.displayName}" in ${wit.referenceName} is ADO-valid`, () => {
                    const error = getValidationError(field.displayName);
                    expect(error, `Field ${field.referenceName} in ${wit.referenceName}: ${error}`).toBeNull();
                });
            }
        }
    });
    
    describe("State name", () => {
        for (const wit of ALL_WITS) {
            for (const state of wit.states) {
                it(`"${state.name}" in ${wit.referenceName} is ADO-valid`, () => {
                    const error = getValidationError(state.name);
                    expect(error, `State ${state.name} in ${wit.referenceName}: ${error}`).toBeNull();
                });
            }
        }
    });
});
```

**Important** : ce test DOIT etre VERT apres les fixes Lot A+B. Si rouge, c'est qu'un nom manque le fix.

#### C2. Test CFG regression suite

Creer `tools/regression/tests/CFG-2026-05-15-wit-ado-charset.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

describe("CFG WIT schema ADO charset validation", () => {
    const root = resolve(__dirname, "../../..");
    
    it("argos-wit-schema index.test.ts contains ADO charset tests", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/index.test.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("ADO charset compliance");
        expect(content).toContain("ADO_FORBIDDEN_CHARS");
    });
    
    it("no WIT displayName contains forbidden parentheses", () => {
        const witsDir = resolve(root, "packages/argos-wit-schema/src/wits");
        const files = [
            "audit-log.ts", "precondition.ts", "test-case-version.ts",
            "test-case.ts", "test-execution.ts", "test-plan.ts", "test-set.ts",
        ];
        for (const file of files) {
            const path = resolve(witsDir, file);
            const content = readFileSync(path, "utf8");
            // Check no displayName contains "(Argos)" pattern
            const match = content.match(/displayName:\s*"[^"]*\(Argos\)[^"]*"/);
            expect(match, `${file} still contains (Argos)`).toBeNull();
        }
    });
});
```

### Lot D -- Documentation

Estimation : ~10 min

#### D1. CHANGELOG.md section [0.5.9]

```markdown
## [0.5.9] - 2026-05-15

### Fixed

**Sprint 2.7 -- WIT and Field displayName ADO charset compliance (HOTFIX)**

CRITICAL fix discovered at first real E2E test on Azure DevOps:
- `argos-cli@0.5.8 install` failed with VS402800 error
- ADO refuses names containing `(`, `)`, and other special chars
- 7 WIT displayName + 3 FIELD displayName were invalid
- argos-cli command worked correctly (auth, process create, picklists)
- Only the WIT/field name payload was rejected by ADO

#### Renamed WIT displayName (7 files)

| Before | After |
|--------|-------|
| Test Case (Argos) | TestVault Test Case |
| Test Plan (Argos) | TestVault Test Plan |
| Test Set (Argos) | TestVault Test Set |
| Precondition (Argos) | TestVault Precondition |
| Test Execution (Argos) | TestVault Test Execution |
| Test Case Version (Argos) | TestVault Test Case Version |
| Audit Log (Argos) | TestVault Audit Log |

#### Renamed FIELD displayName in audit-log.ts (3 fields)

| Before | After |
|--------|-------|
| Timestamp (UTC) | Timestamp UTC |
| Old Value (anonymized) | Old Value anonymized |
| New Value (anonymized) | New Value anonymized |

### Added

**Tests ADO charset compliance** :

- `packages/argos-wit-schema/src/index.test.ts` : 3 new test suites
  - WIT displayName : 7 tests
  - Field displayName : N tests (one per field across all WIT)
  - State name : N tests (one per state across all WIT)
  - All use `ADO_FORBIDDEN_CHARS` regex from VS402800 error message
  - All validate length <= 128 chars
  - All validate not pure number
  - All validate not empty
  
- `tools/regression/tests/CFG-2026-05-15-wit-ado-charset.test.ts` : 2 tests
  - Verify test suite exists in argos-wit-schema
  - Verify no `(Argos)` pattern remains in WIT files

### TECH-DEBT

- TECH-DEBT-019 (E2E reel) : exposed this bug, JUSTIFICATION ULTIME
- TECH-DEBT-046 NEW LIVRE : ADO charset validation tests

### Lessons learned

- Mock fetch tests do NOT validate payload semantics against real ADO rules
- E2E real test ALWAYS finds bugs that unit tests cannot
- ADO has specific charset rules NOT documented in obvious places
- Always test displayName payload against real ADO API at least once before publish
- Prefix "TestVault" is now consistent across referenceName AND displayName

### Architecture preserved

- referenceName (TestVault.*) unchanged (ANSI constitution section 12 immutable)
- Field referenceName (TestVault.TimestampUtc etc.) unchanged
- State names unchanged (they were already ADO-valid)
- argos-cli command unchanged (it worked correctly)
```

#### D2. Specs/tasks.md updates

Add :
```markdown
- [x] TECH-DEBT-046 NEW (Sprint 2.7) -- ADO charset validation tests for WIT/fields/states
- [x] TECH-DEBT-019 (Sprint 2.7) -- E2E reel first execution discovered VS402800 bug
```

NOTE : TECH-DEBT-019 reste "actif" car le test E2E COMPLET reussi reste a faire post-0.5.9.

### Lot E -- Bump + commit + PR

Estimation : ~5 min

#### E1. Bump 0.5.8 -> 0.5.9

```powershell
node tools\release\bump-fixed-version.cjs 0.5.9

# Verifications
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"
# Attendu : tous 0.5.9

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### E2. Validation

```powershell
# Test charset compliance specifique
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 20

# Test CFG regression
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5

# Tout
pnpm turbo test --force 2>&1 | Select-Object -Last 15
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# Mojibake
node tools\regression\scan-mojibake.cjs

# Preflight
pnpm preflight
```

#### E3. Commit + PR

```powershell
# Pre-commit ASCII
$msg = "fix(schema): Sprint 2.7 WIT and field displayName ADO charset compliance (hotfix)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

# Commit
$commitMsg = @"
fix(schema): Sprint 2.7 WIT and field displayName ADO charset compliance (hotfix)

CRITICAL discovered at first real E2E test:
argos-cli@0.5.8 install crashed with VS402800 because WIT and field
displayName contained parentheses, which ADO blacklist forbids.

Charset blacklist from ADO: . , ; ~ : / \ * | ? " & % $ ! + = ( ) [ ] { } < > -
Max length 128 chars.

Fix:
- 7 WIT displayName renamed (X (Argos) -> TestVault X)
- 3 FIELD displayName renamed in audit-log.ts (X (Y) -> X Y)
- referenceName values UNCHANGED (TestVault.* immutable per constitution)
- 3 new test suites added : WIT displayName, Field displayName, State name
- CFG regression test added : CFG-2026-05-15-wit-ado-charset

Decisions:
- D75-A : Convention "TestVault X" (consistent with referenceName prefix)
- D77-A : Rename fields too (3 fields in audit-log.ts had parentheses)
- D79-B : Test charset for WIT + fields + states (exhaustive)

TECH-DEBT:
- TECH-DEBT-046 NEW LIVRE : ADO charset validation tests
- TECH-DEBT-019 (E2E reel) : first execution found this bug, justification ultime

Lesson learned:
- Mock fetch tests do NOT validate payload against real ADO rules
- E2E real test ALWAYS finds bugs mock tests miss
- Charset validation must be unit-tested, not relied on ADO catch

Architecture preserved:
- referenceName TestVault.* unchanged
- Field referenceName unchanged
- State names unchanged (already valid)
- argos-cli unchanged (the command worked correctly)

Bump 0.5.8 -> 0.5.9 via script.

Refs:
- Sprint 2.6 published 0.5.8 but VS402800 at E2E test
- Process Argos Inherited Demo cleaned manually on BCEE-QA (D78)
- ADO error VS402800: full forbidden charset documented
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-7.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-7.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-7.txt"

git push -u origin feat/sprint-2-7-wit-charset-fix
```

#### E4. PR

```powershell
$prBody = @'
## Summary

HOTFIX critical bug discovered at first real E2E test on Azure DevOps.
argos-cli@0.5.8 install crashed with VS402800 because WIT/field displayName 
contained parentheses (blacklisted by ADO).

## Root cause

ADO rule: names cannot contain `. , ; ~ : / \ * | ? " & % $ ! + = ( ) [ ] { } < > -`

Bugs:
- 7 WIT displayName : "X (Argos)" -> contains `(` and `)`
- 3 FIELD displayName in audit-log.ts : "X (Y)" -> same issue

These names worked in unit tests (mock fetch, no validation) but ADO rejected them at first real install attempt.

## Fix

- Rename WIT displayName : "TestVault X" pattern (consistent with referenceName prefix)
- Rename fields in audit-log.ts (remove parentheses)
- referenceName UNCHANGED (TestVault.* immutable per constitution)
- Add 3 new test suites for ADO charset compliance
- Add CFG regression test

## Tests added

`packages/argos-wit-schema/src/index.test.ts` : 3 new describe blocks
- WIT displayName : 7 tests
- Field displayName : N tests (one per field)
- State name : N tests (one per state)

`tools/regression/tests/CFG-2026-05-15-wit-ado-charset.test.ts` : 2 tests

## After merge

1. Tag v0.5.9 + push -> triggers publish-marketplace.yml + publish-cli.yml
2. Verify Marketplace 0.5.9 + npm 0.5.9 (smoke test verifies install OK)
3. Re-run E2E test on BCEE-QA / DEMO
4. Process "Argos Inherited Demo" already cleaned manually
5. Generate fresh PAT, run install command
6. Verify 7 Custom WIT created successfully
7. Migrate DEMO project on new process
8. Refresh extension -> wizard detection : "Argos installed"
9. Create Test Case -> verify success (no more VS402323)

## Lesson learned (added to constitution lessons)

- Unit tests with mock fetch don't catch ADO charset rules
- E2E real test is the ONLY way to validate payload semantics
- Future PR for any schema change MUST include charset validation test
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-7.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(schema): Sprint 2.7 WIT and field displayName ADO charset compliance (hotfix)" `
  --body-file "$env:TEMP\pr-body-sprint-2-7.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-7.txt"
```

#### E5. Archive prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-7.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-7.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-7.md
}
```

#### E6. Post-merge cleanup

```powershell
# Apres merge GitHub
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-7-wit-charset-fix 2>$null

pnpm --filter @atconseil/regression-suite test
pnpm preflight

git log --oneline | Select-Object -First 5
```

---

## Garde-fous

### GF1 -- GF15 : standards

ASCII strict, fixed-versioning, marketplace-public, etc.

### GF16 : NE PAS toucher referenceName

Les `referenceName` (TestVault.*) sont IMMUTABLES per constitution section 12.
Toucher uniquement les `displayName`.

### GF17 : NE PAS toucher fields autres que les 3 identifies

Seulement audit-log.ts lignes 31, 66, 73 (Timestamp/OldValue/NewValue).
Tous les autres displayName de fields sont deja valides.

### GF18 : NE PAS toucher states (deja valides)

Les `state.name` (Active, Deprecated, etc.) sont deja sans caracteres invalides.
Le test C1 va le verifier automatiquement.

### GF19 : Test charset DOIT etre VERT apres les fixes

Si le test est rouge sur un nom, c'est qu'un fix manque.

### GF20 : NE PAS modifier argos-cli ou autres packages

Le bug est uniquement dans argos-wit-schema. Argos-cli fonctionnait correctement.

### GF21 : Verification pre-commit

```powershell
# Verifier qu'aucun displayName contient encore "(Argos)" dans les wits
Select-String -Path packages\argos-wit-schema\src\wits\*.ts -Pattern '\(Argos\)' -Encoding UTF8
# Attendu : aucun match
```

### GF22 : Tests charset PASSING (toutes 3 suites)

```powershell
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 30
```

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-7-wit-charset-fix

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Reporting utilisateur

1. **Apres Lot A+B** : "7 WIT displayName + 3 field displayName renamed. Continue Lot C tests ?"
2. **Apres Lot C** : "ADO charset test suite added. Result : X passing / Y failing. Resolution : all passing. Continue Lot D doc ?"
3. **Apres Lot D** : "CHANGELOG + tasks.md OK. Continue Lot E bump + commit ?"
4. **Apres Lot E2** : "Validation complete. argos@0.5.9. All tests passing. ASCII OK. 0 mojibake. Pret a commit ?"
5. **Apres Lot E3-E4** : "PR ouverte. Apres merge GitHub, lance Lot E6 cleanup + tag v0.5.9."

---

## Criteres de done

- [ ] Branche `feat/sprint-2-7-wit-charset-fix` creee
- [ ] 7 WIT displayName renamed dans packages/argos-wit-schema/src/wits/*.ts
- [ ] 3 FIELD displayName renamed dans audit-log.ts
- [ ] Test suite "ADO charset compliance" added (3 describe blocks)
- [ ] CFG-2026-05-15-wit-ado-charset.test.ts NEW
- [ ] All charset tests PASSING
- [ ] Regression suite passing (60+ -> 62+)
- [ ] CHANGELOG.md [0.5.9] section complete
- [ ] Specs/tasks.md TECH-DEBT-046 livre
- [ ] Bump 0.5.8 -> 0.5.9 (15 packages aligned)
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] grep "(Argos)" returns 0 matches in wits/*.ts
- [ ] Commit message ASCII strict
- [ ] Prompt archive
- [ ] PR ouverte
- [ ] Post-merge cleanup

---

## Apres ca

1. Merge PR
2. Tag v0.5.9 + push -> trigger 2 workflows publish
3. Verifier les 3 CI workflows green (CI main + publish-marketplace + publish-cli)
4. Smoke test CI verifie auto le npm publish

5. Test E2E REEL final :
   - Generer nouveau PAT BCEE-QA (Process Read & manage)
   - Update Argos extension 0.5.9 sur BCEE-QA  
   - Lance :
     ```
     npx -y @atconseil/argos-cli@0.5.9 install ^
       --org-url https://dev.azure.com/BCEE-QA ^
       --project "DEMO" ^
       --pat <NEW_PAT> ^
       --base-process Agile ^
       --process-name "Argos Inherited Demo" ^
       --skip-confirm
     ```
   - Verifier 7 Custom WIT crees dans process
   - Migrer projet DEMO sur ce process
   - Retour extension Argos -> wizard refresh -> "Argos installed"
   - Hub Cases -> Create Test Case -> SUCCESS attendu (plus de VS402323)
   
6. Si tout marche : **MILESTONE PRODUIT REEL FONCTIONNEL**
7. Note bookmark + repos lundi
8. Si bug encore : sprint hotfix 2.8 ou note pour lundi

Bon sprint hotfix !
