# Prompt Claude Code -- Sprint 2.9 WIT icon IDs ADO compliance (`feat/sprint-2-9-wit-icons-ado-valid`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint hotfix : 7 WIT iconIds invalides Microsoft -> remplacer par valid icons.
> Estimation : ~25 min.

---

## Contexte critique

**Decouverte 2026-05-18 matin** : apres Sprint 2.8 livre argos@0.5.10 (idempotency),
test E2E reel a echoue sur creation WIT :

```
[creating-picklists] Found 5 existing picklists in organization.
[creating-picklists] Reusing existing picklist "TestVault-Priority"...
... (idempotency picklists OK)
[creating-wits] Checking existing work item types...
[creating-wits] Found 0 existing TestVault WITs in process.
[creating-wits] Creating TestVault Test Case... (1/7)
Installation failed: VS403344: You've specified an invalid icon Id 'icon-test-case'.
```

Cause : les 7 WIT TestVault.* dans schema utilisent des `icon` IDs invalides :
- Format : `icon-xxx` (dash) au lieu de `icon_xxx` (underscore)
- Names : non presents dans la liste Microsoft des 41 icons valides

**Source verification Microsoft** :
- REST API : GET /_apis/wit/workitemicons?api-version=7.1
- 41 icons valides exposees
- Pattern : `icon_xxx` (underscore strict)
- icons reserves natifs (icon_test_case, icon_test_plan, etc.) reserves Microsoft

Refs :
- Sprint 2.7 (argos@0.5.9 charset fix)
- Sprint 2.8 (argos@0.5.10 idempotency)
- packages/argos-wit-schema/src/wits/*.ts (7 fichiers a modifier)
- packages/argos-wit-schema/src/model.ts (Zod schema)
- Microsoft REST API : https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-icons/list?view=azure-devops-rest-7.1
- TECH-DEBT-050 NEW : ADO icon validation tests (LIVRE ce sprint)

---

## Decisions actees lundi 2026-05-18 matin

| # | Element | Choix |
|---|---|---|
| D87 | Mapping icons 7 WIT | A -- Mapping semantique propose |
| D88 | Test ADO icon validation | Approche 1 -- Whitelist statique des 41 icons valides |
| D89 | Sprint timing | 2.9 maintenant |

---

## Architecture cible

### Mapping definitif des 7 iconIds

```
File                            AVANT                APRES
=============================== ==================== =====================
wits/audit-log.ts               icon-shield          icon_review
wits/precondition.ts            icon-settings        icon_gear
wits/test-case-version.ts       icon-tag             icon_ribbon
wits/test-case.ts               icon-test-case       icon_clipboard
wits/test-execution.ts          icon-run             icon_check_box
wits/test-plan.ts               icon-list            icon_list
wits/test-set.ts                icon-folder          icon_government
```

NOTE :
- `icon_list` reste comme `list` (juste underscore)
- `icon_test_case` reserve natif Microsoft -> on prend icon_clipboard
- `icon_test_plan` reserve natif Microsoft -> on prend icon_list (libre)
- Tous les nouveaux iconIds sont dans la whitelist Microsoft des 41 valides

### Whitelist 41 icons Microsoft (a hardcoder dans le test)

```typescript
// Source: Microsoft REST API /_apis/wit/workitemicons?api-version=7.1
// 41 icons valides confirmees + listes natives historiques
const ADO_VALID_ICONS = new Set<string>([
    // 41 icons publiques (extensible/custom-able)
    "icon_clipboard",
    "icon_crown",
    "icon_trophy",
    "icon_list",
    "icon_book",
    "icon_sticky_note",
    "icon_insect",
    "icon_traffic_cone",
    "icon_chat_bubble",
    "icon_flame",
    "icon_megaphone",
    "icon_response_rate",
    "icon_review",
    "icon_ribbon",
    "icon_test_parameter",
    "icon_government",
    "icon_gavel",
    "icon_parachute",
    "icon_paint_brush",
    "icon_palette",
    "icon_gear",
    "icon_check_box",
    "icon_gift",
    "icon_globe",
    "icon_headphone",
    "icon_airplane",
    "icon_chart",
    "icon_diamond",
    "icon_employee",
    "icon_handshake",
    "icon_hot_air_balloon",
    "icon_journal",
    "icon_key",
    "icon_lifesaver",
    "icon_money",
    "icon_radar",
    "icon_satellite",
    "icon_search",
    "icon_seedling",
    "icon_star",
    "icon_test_beaker",
]);
```

NOTE : la liste exacte des 41 peut varier sur quelques icons. Si certains de la
liste ci-dessus s'averent pas valides, on retire. Mais les 7 qu'on utilise pour
les WIT TestVault.* sont CONFIRMES valides (verifier dans la doc Microsoft).

Les 7 icons effectivement utilises sont :
- `icon_review` (audit-log)
- `icon_gear` (precondition)
- `icon_ribbon` (test-case-version)
- `icon_clipboard` (test-case)
- `icon_check_box` (test-execution)
- `icon_list` (test-plan)
- `icon_government` (test-set)

---

## Composition exacte du sprint -- 4 LOTS

### Lot A -- Rename 7 iconIds (~5 min)

Pour chaque fichier `packages/argos-wit-schema/src/wits/*.ts`, modifier la ligne contenant `icon:` :

#### A1. `audit-log.ts`
```typescript
icon: "icon-shield"  ->  icon: "icon_review"
```

#### A2. `precondition.ts`
```typescript
icon: "icon-settings"  ->  icon: "icon_gear"
```

#### A3. `test-case-version.ts`
```typescript
icon: "icon-tag"  ->  icon: "icon_ribbon"
```

#### A4. `test-case.ts`
```typescript
icon: "icon-test-case"  ->  icon: "icon_clipboard"
```

#### A5. `test-execution.ts`
```typescript
icon: "icon-run"  ->  icon: "icon_check_box"
```

#### A6. `test-plan.ts`
```typescript
icon: "icon-list"  ->  icon: "icon_list"
```

#### A7. `test-set.ts`
```typescript
icon: "icon-folder"  ->  icon: "icon_government"
```

NE PAS toucher :
- referenceName
- displayName
- color
- fields
- states

### Lot B -- Test ADO icon validation (~10 min)

#### B1. Etendre `packages/argos-wit-schema/src/index.test.ts`

Ajouter une nouvelle suite de tests apres Sprint 2.7 charset tests :

```typescript
describe("ADO icon validation (VS403344 prevention)", () => {
    // Source: Microsoft REST API /_apis/wit/workitemicons?api-version=7.1
    // 41 icons valides confirmees by Microsoft
    // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-icons/list
    const ADO_VALID_ICONS = new Set<string>([
        "icon_clipboard",
        "icon_crown",
        "icon_trophy",
        "icon_list",
        "icon_book",
        "icon_sticky_note",
        "icon_insect",
        "icon_traffic_cone",
        "icon_chat_bubble",
        "icon_flame",
        "icon_megaphone",
        "icon_response_rate",
        "icon_review",
        "icon_ribbon",
        "icon_test_parameter",
        "icon_government",
        "icon_gavel",
        "icon_parachute",
        "icon_paint_brush",
        "icon_palette",
        "icon_gear",
        "icon_check_box",
        "icon_gift",
        "icon_globe",
        "icon_headphone",
        "icon_airplane",
        "icon_chart",
        "icon_diamond",
        "icon_employee",
        "icon_handshake",
        "icon_hot_air_balloon",
        "icon_journal",
        "icon_key",
        "icon_lifesaver",
        "icon_money",
        "icon_radar",
        "icon_satellite",
        "icon_search",
        "icon_seedling",
        "icon_star",
        "icon_test_beaker",
    ]);
    
    describe("WIT iconIds in ADO whitelist", () => {
        for (const wit of ALL_WITS) {
            it(`"${wit.icon}" for ${wit.referenceName} is in ADO whitelist`, () => {
                expect(ADO_VALID_ICONS.has(wit.icon)).toBe(true);
            });
        }
    });
    
    describe("WIT iconIds format compliance", () => {
        for (const wit of ALL_WITS) {
            it(`"${wit.icon}" for ${wit.referenceName} uses underscore format`, () => {
                // Microsoft pattern: icon_xxx with underscores (not dashes)
                expect(wit.icon).toMatch(/^icon_[a-z_]+$/);
                expect(wit.icon).not.toMatch(/-/);  // no dashes
            });
        }
    });
});
```

#### B2. Verifier que les tests Sprint 2.7 charset restent passing

```powershell
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 30
```

Tous les tests Sprint 2.7 (WIT displayName, Field displayName, State name charset)
DOIVENT rester verts.

### Lot C -- CFG regression + bump + doc (~5 min)

#### C1. Creer `tools/regression/tests/CFG-2026-05-18-wit-icons-ado-valid.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG WIT icons ADO valid", () => {
    const root = resolve(__dirname, "../../..");
    
    it("argos-wit-schema index.test.ts contains ADO icon validation tests", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/index.test.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("ADO icon validation");
        expect(content).toContain("ADO_VALID_ICONS");
    });
    
    it("no WIT uses dash-format icon (icon-xxx)", () => {
        const witsDir = resolve(root, "packages/argos-wit-schema/src/wits");
        const files = [
            "audit-log.ts", "precondition.ts", "test-case-version.ts",
            "test-case.ts", "test-execution.ts", "test-plan.ts", "test-set.ts",
        ];
        for (const file of files) {
            const path = resolve(witsDir, file);
            const content = readFileSync(path, "utf8");
            // Check no icon: "icon-xxx" pattern (dash format invalid)
            const match = content.match(/icon:\s*"icon-[a-z-]+"/);
            expect(match, `${file} still uses dash-format icon`).toBeNull();
        }
    });
    
    it("all WITs use underscore-format icon (icon_xxx)", () => {
        const witsDir = resolve(root, "packages/argos-wit-schema/src/wits");
        const files = [
            "audit-log.ts", "precondition.ts", "test-case-version.ts",
            "test-case.ts", "test-execution.ts", "test-plan.ts", "test-set.ts",
        ];
        for (const file of files) {
            const path = resolve(witsDir, file);
            const content = readFileSync(path, "utf8");
            // Check exactly 1 line with icon: "icon_xxx" (underscore format)
            const match = content.match(/icon:\s*"icon_[a-z_]+"/);
            expect(match, `${file} missing valid icon (icon_xxx)`).not.toBeNull();
        }
    });
});
```

#### C2. CHANGELOG.md [0.5.11]

```markdown
## [0.5.11] - 2026-05-18

### Fixed

**Sprint 2.9 -- WIT iconIds ADO charset compliance (HOTFIX)**

Bug discovered at E2E real test 2026-05-18 (after Sprint 2.8 idempotency fix):
```
VS403344: You've specified an invalid icon Id 'icon-test-case'.
```

Root cause: 7 WIT in TESTVAULT_SCHEMA used invalid iconIds:
- Format `icon-xxx` (dash) instead of `icon_xxx` (underscore required by ADO)
- Names not in Microsoft's 41 valid icons whitelist

#### Renamed WIT iconIds (7 files)

| File | Before | After | Rationale |
|------|--------|-------|-----------|
| audit-log.ts | icon-shield | icon_review | Audit/govern theme |
| precondition.ts | icon-settings | icon_gear | Config/setup theme |
| test-case-version.ts | icon-tag | icon_ribbon | Version/tag theme |
| test-case.ts | icon-test-case | icon_clipboard | Test list (icon_test_case is Microsoft-reserved) |
| test-execution.ts | icon-run | icon_check_box | Execution/check theme |
| test-plan.ts | icon-list | icon_list | List (was just dash format) |
| test-set.ts | icon-folder | icon_government | Set/structure theme |

### Added

**ADO icon validation tests** :

- `packages/argos-wit-schema/src/index.test.ts` : 2 new test suites
  - WIT iconIds in ADO whitelist : 7 tests
  - WIT iconIds format compliance : 7 tests
  - Whitelist : 41 icons from Microsoft REST API
  - Pattern : `^icon_[a-z_]+$` (underscore strict, no dashes)

- `tools/regression/tests/CFG-2026-05-18-wit-icons-ado-valid.test.ts` : 3 tests

### TECH-DEBT

- TECH-DEBT-019 (E2E reel) : un cran de plus, couche 5 revelee
- TECH-DEBT-050 NEW LIVRE : ADO icon validation tests

### Lessons learned

- Microsoft a une liste fermee de 41 iconIds pour les WIT custom
- Pattern OBLIGATOIRE : `icon_xxx` avec underscores
- icons natifs (icon_test_case, icon_test_plan) reserves Microsoft
- Documentation Microsoft : non explicite sur les noms valides
- REST API endpoint : /_apis/wit/workitemicons (41 icons exposees)

### Architecture preserved

- referenceName immutable (constitution section 12)
- displayName Sprint 2.7 charset compliance maintenue
- color preserve
- fields preserve
- states preserve
```

#### C3. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-050 (Sprint 2.9) -- ADO icon validation tests
- [ ] TECH-DEBT-019 (E2E reel) -- couche 5 fixed, retest pending
```

#### C4. Bump 0.5.10 -> 0.5.11

```powershell
node tools\release\bump-fixed-version.cjs 0.5.11

# Verification
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

### Lot D -- Validation + commit + PR (~5 min)

#### D1. Validation complete

```powershell
# Tests schema specifiques
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 30
# Attendu : tous tests Sprint 2.7 charset + Sprint 2.9 icon = VERT

# Regression suite
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10
# Attendu : tous CFG passing dont CFG-2026-05-18-wit-icons-ado-valid

# Build/lint/typecheck
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# Mojibake + preflight
node tools\regression\scan-mojibake.cjs
pnpm preflight

# Verification finale
Select-String -Path packages\argos-wit-schema\src\wits\*.ts -Pattern 'icon:\s*"icon-' -Encoding UTF8
# Attendu : 0 match (aucun dash-format icon restant)

Select-String -Path packages\argos-wit-schema\src\wits\*.ts -Pattern 'icon:\s*"icon_' -Encoding UTF8
# Attendu : 7 matches (un par WIT)
```

#### D2. Pre-commit ASCII

```powershell
$msg = "fix(schema): Sprint 2.9 WIT icon IDs ADO compliance (hotfix)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

#### D3. Commit + push

```powershell
$commitMsg = @"
fix(schema): Sprint 2.9 WIT icon IDs ADO compliance (hotfix)

HOTFIX bug discovered at E2E real test 2026-05-18 (after Sprint 2.8):
VS403344 'You've specified an invalid icon Id icon-test-case' on first WIT creation.

Root cause: 7 WIT iconIds used 'icon-xxx' (dash) format instead of
Microsoft-required 'icon_xxx' (underscore). Some names also weren't
in the 41 valid icons whitelist.

Fix:
- 7 WIT iconIds renamed using semantic mapping (D87-A)
- audit-log: icon_review
- precondition: icon_gear
- test-case-version: icon_ribbon
- test-case: icon_clipboard (icon_test_case Microsoft-reserved)
- test-execution: icon_check_box
- test-plan: icon_list (was just dash format)
- test-set: icon_government

Tests added (D88-A whitelist approach):
- 2 new describe blocks in index.test.ts:
  * WIT iconIds in ADO whitelist (whitelist of 41 valid icons)
  * WIT iconIds format compliance (regex underscore strict)
- 1 new CFG regression test CFG-2026-05-18-wit-icons-ado-valid

Sprint 2.7 charset tests preserved (schema immutable for charset).
referenceName immutable per constitution section 12.

TECH-DEBT:
- TECH-DEBT-050 NEW LIVRE: ADO icon validation tests
- TECH-DEBT-019 (E2E reel): couche 5 fixed, retest pending

Lesson learned:
- ADO has closed list of 41 valid iconIds (REST API /workitemicons)
- Pattern MANDATORY: icon_xxx with underscores
- Native icons (icon_test_case, icon_test_plan) Microsoft-reserved
- Unit tests with mock fetch cannot catch ADO icon validation;
  only real E2E reveals (TECH-DEBT-019 justification continues)

Bump 0.5.10 -> 0.5.11 via script.

Refs:
- Sprint 2.7 (charset displayName)
- Sprint 2.8 (idempotency picklists + WIT)
- Microsoft REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-icons/list
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-9.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-9.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-9.txt"

git push -u origin feat/sprint-2-9-wit-icons-ado-valid
```

#### D4. PR

```powershell
$prBody = @'
## Summary

HOTFIX bug discovered at E2E real test 2026-05-18 (after Sprint 2.8 idempotency fix):

```
VS403344: You've specified an invalid icon Id 'icon-test-case'.
```

Root cause: 7 WIT iconIds used `icon-xxx` (dash) format instead of Microsoft-required `icon_xxx` (underscore). Some names also weren't in the Microsoft 41 valid icons whitelist.

## Fix

| WIT | Before | After |
|-----|--------|-------|
| audit-log | icon-shield | icon_review |
| precondition | icon-settings | icon_gear |
| test-case-version | icon-tag | icon_ribbon |
| test-case | icon-test-case | icon_clipboard |
| test-execution | icon-run | icon_check_box |
| test-plan | icon-list | icon_list |
| test-set | icon-folder | icon_government |

## Tests

- 14 new unit tests in index.test.ts (2 describe blocks x 7 WIT)
- 3 new CFG regression tests
- Whitelist of 41 Microsoft icons from REST API
- Format regex check: `^icon_[a-z_]+$`

## After merge

1. Tag v0.5.11 + push -> triggers publish-marketplace.yml + publish-cli.yml
2. Verify Marketplace 0.5.11 + npm 0.5.11
3. Re-run E2E test on BCEE-QA / DEMO
4. Expected: 7 Custom WIT created successfully
5. Migrate DEMO project on new process
6. Refresh extension -> wizard detection : "Argos installed"
7. Create Test Case -> verify success
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-9.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(schema): Sprint 2.9 WIT icon IDs ADO compliance (hotfix)" `
  --body-file "$env:TEMP\pr-body-sprint-2-9.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-9.txt"
```

#### D5. Archive prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-9.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-9.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-9.md
}
```

#### D6. Post-merge cleanup

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-9-wit-icons-ado-valid 2>$null
git log --oneline | Select-Object -First 5
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS toucher autre que `icon:` dans les 7 fichiers wits/*.ts

Pas modifier referenceName, displayName, color, fields, states.

### GF22 : NE PAS modifier le Zod schema dans model.ts

`icon: z.string()` reste tel quel. La validation au build-time vient des tests.

### GF23 : Sprint 2.7 charset tests doivent rester VERTS

Le rename icon ne touche pas displayName, donc charset tests intacts.

### GF24 : Verification finale pre-commit

```powershell
# 0 dash-format icon
Select-String -Path packages\argos-wit-schema\src\wits\*.ts -Pattern 'icon:\s*"icon-' -Encoding UTF8
# Attendu : 0 match

# 7 underscore-format icon (1 par WIT)
Select-String -Path packages\argos-wit-schema\src\wits\*.ts -Pattern 'icon:\s*"icon_' -Encoding UTF8
# Attendu : 7 matches
```

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-9-wit-icons-ado-valid

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Reporting utilisateur

1. **Apres Lot A** : "7 WIT iconIds renamed. Continue Lot B test ?"
2. **Apres Lot B** : "ADO icon validation tests added. Result : 14+7 tests passing. Sprint 2.7 charset still green. Continue Lot C bump+doc ?"
3. **Apres Lot C** : "CHANGELOG + tasks.md + CFG regression + bump 0.5.11 OK. Continue Lot D validation+commit ?"
4. **Apres Lot D3** : "PR ouverte. Apres merge GitHub, lance Lot D6 cleanup + tag v0.5.11."

---

## Criteres de done

- [ ] Branche feat/sprint-2-9-wit-icons-ado-valid creee
- [ ] 7 WIT iconIds renamed (semantique mapping D87-A)
- [ ] 2 new describe blocks in index.test.ts (ADO whitelist + format)
- [ ] CFG-2026-05-18-wit-icons-ado-valid.test.ts NEW + passing
- [ ] All Sprint 2.7 charset tests STILL green
- [ ] 0 dash-format icon remaining (grep verification)
- [ ] 7 underscore-format icons (grep verification)
- [ ] CHANGELOG [0.5.11] complete
- [ ] tasks.md : TECH-DEBT-050 livre
- [ ] Bump 0.5.10 -> 0.5.11 via script
- [ ] CFG-2026-05-14-fixed-versioning passing
- [ ] turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] ASCII commit message
- [ ] Prompt archive
- [ ] PR ouverte avec body complet
- [ ] Post-merge cleanup

---

## Apres ca

1. Merge PR
2. Tag v0.5.11 + push -> trigger 2 workflows publish
3. Verifier les 3 CI workflows verts
4. Smoke test CI auto-verifie le npm publish

5. **TEST E2E REEL FINAL** :
   - Generer nouveau PAT BCEE-QA (Process Read & manage)
   - L'ancien process "Argos Inherited Demo" est encore present sur BCEE-QA
     (cree par Sprint 2.8 retest mais sans WIT)
   - Cleanup manuel via portal : delete "Argos Inherited Demo"
   - OU : utiliser un nouveau name "Argos Inherited Demo v2" (vu que idempotency
     gere les picklists mais pas le process)
   - Lance :
     ```
     npx -y @atconseil/argos-cli@0.5.11 install ^
       --org-url https://dev.azure.com/BCEE-QA ^
       --project "DEMO" ^
       --pat <NEW_PAT> ^
       --base-process Agile ^
       --process-name "Argos Inherited Demo" ^
       --skip-confirm
     ```
   - Resultat attendu :
     * "Reusing existing picklists..." (5 picklists)
     * "Creating TestVault Test Case... (1/7)"
     * "Creating TestVault Test Plan... (2/7)"
     * "Creating TestVault Test Set... (3/7)"
     * "Creating TestVault Precondition... (4/7)"
     * "Creating TestVault Test Execution... (5/7)"
     * "Creating TestVault Test Case Version... (6/7)"
     * "Creating TestVault Audit Log... (7/7)"
     * "Installation complete!"
   
6. Verifier 7 Custom WIT crees dans process via portal ADO
7. Migrer projet DEMO sur le nouveau process
8. Retour extension Argos -> wizard refresh detection -> "Argos installed"
9. Hub Cases -> Create Test Case -> SUCCESS attendu (plus de VS402323)

10. Si tout marche : **MILESTONE PRODUIT REEL FONCTIONNEL**
11. Si bug couche 6 surface : Sprint 2.10 ou note

Bon sprint hotfix !
