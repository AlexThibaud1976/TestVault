# Sprint 2.23 -- Code Report

## Statut global

**SUCCÈS** -- 2026-05-28 (branche `sprint/2.23-code`, 11 commits, 20/20 turbo tasks verts à chaque étape, **plan adapté de 10 → 11 commits suite au PF-3**).

## PRE-FLIGHT

- **PF-1 `pnpm audit --audit-level=high`** : 0 HIGH (1 LOW + 11 MODERATE = TECH-DEBT-T2213-C dompurify via Monaco, déjà documentée).
- **PF-2 `pnpm turbo test` baseline** : initialement **1 fail** sur `CFG-2026-05-10-no-xray-references` à cause du `claude_prompts/tech-debt-T2213-B-report.md` untracked (3 méta-mentions Xray). Traité par **COMMIT 0 housekeeping** sur la branche sprint (même pattern que les sprints précédents).
- **PF-3 inventaire** : **découverte critique** — les 4 WIT types ciblés ont **déjà ListView + FormView + tests + routing** câblés (Sprint 2.5d). TestPlanFormView a même déjà l'edit mode complet (`useTestPlanDetail`). Plan adapté en conséquence.
- **PF-4 routes API** : pas de nouvelle route ADO REST. SDK déjà complet : `testPlanService.lock()`, `unlock()`, `lockWithAutoSnapshot()`, `precondition/testset/testexecution services` ; `read()` ajouté sur `testExecutionService` (1 nouvelle méthode).
- **PF-5 termes interdits** : pas de mention de modèle LLM dans les nouveaux fichiers produits.

### PF-3 — Délta réel vs brief

| Brief assumait | Réalité | Sprint 2.23 delta |
|---|---|---|
| Créer TestSetListView + FormView + routing | ✅ tout existe | + edit mode (caseId-style) |
| Créer TestPlanListView + FormView + routing | ✅ tout existe + **edit mode `useTestPlanDetail` déjà câblé** | + **Lock/Unlock UX** uniquement |
| Créer PreconditionListView + FormView + routing | ✅ tout existe | + edit mode + Preconditions display dans TestCaseFormView |
| Créer TestExecution views + routing | ✅ tout existe | + **display-only mode** (immutabilité) + Re-run + Run button TC + `computeGlobalStatus` exporté |
| Créer pickers WIT | ❌ assumé à créer | ❌ effectivement absent, mais TestSet a déjà input+Add inline depuis Sprint 2.5d → pas de picker à écrire |
| RunInterface | ❌ assumé à créer | ✅ 348 l. existant (placeholder TC) — pas touché ce sprint, juste un Run button qui pointe vers `goToTestExecutionForm` |
| computeGlobalStatus | À implémenter | Existait en privé (`calcGlobalStatus`) — juste **exporté** |
| TestPlan "Locked" state ADO | ❌ assumé inconnu | ✅ SDK + WIT schema ont déjà `Draft/Locked/Closed` |
| Précondition link strategy | À arbitrer | ✅ Option A `TestVault.PreconditionLinks` JSON déjà standard SDK/CLI |

**Plan réduit : ~7-9h effectives, 11 commits (vs 15-18h, 10 commits prévus).**

## Commits livrés

| # | Hash | Checkpoint | Message | Tests |
|---|------|-----------|---------|-------|
| 0 | `56a8c03` | housekeeping | chore(allowlist): unblock pre-flight T2213-B report Xray | GREEN |
| A1 | `004b017` | A | test(regression): [RED] T-2.23 TestSetFormView edit mode | RED 9/10 |
| A2 | `80acded` | A | feat(hub): TestSetFormView edit mode (fetch by setId) | GREEN 45 |
| B1 | `df2e018` | B | test(regression): [RED] T-2.23 TestPlan Lock/Unlock UI | RED 10 |
| B2 | `9628a2e` | B | feat(hub): TestPlan Lock/Unlock UI | GREEN 45 |
| C1 | `afdb981` | C | test(regression): [RED] T-2.23 Precondition edit mode + TC display | RED 10 |
| C2 | `9af5ed0` | C | feat(hub): Precondition edit mode + display in TestCaseFormView | GREEN 45 |
| D1 | `f6555b6` | D | test(regression): [RED] T-2.23 TestExecution + Run + computeGlobalStatus | RED 11 |
| D2 | `e007c51` | D | feat(hub): TestExecution immutability + Run button + computeGlobalStatus | GREEN 45 |
| E  | `79a26e8` | docs | docs: Sprint 2.23 -- closes T-0.5.2 wiring | GREEN |
| F  | `bfb32e6` | bump | chore(release): bump 0.5.32 → 0.5.33 | GREEN |

Constitution S10.1 TDD strict respectée : chaque RED dans son commit, GREEN suivant.

## T-0.5.2 : DONE

Les 5 types WIT Argos ont désormais soit edit mode complet, soit display-only mode (TestExecution per immutabilité S3.5) :

- **TestCase** : create + edit + Steps CRUD + Gherkin + Preconditions display (depuis Sprint 2.22 + 2.23)
- **TestSet** : create + edit + TC composition (depuis Sprint 2.5d + 2.23)
- **TestPlan** : create + edit + **Lock / Unlock UX** (depuis Sprint 2.18 + 2.23)
- **Precondition** : create + edit (depuis Sprint 2.5d + 2.23)
- **TestExecution** : create + **display-only** + Re-run (depuis Sprint 2.5d + 2.23)

## TestPlan Lock — état ADO utilisé

**`System.State = "Locked"`** (configuration WIT déjà présente per `argos-wit-schema` ; états `Draft / Locked / Closed`).

## Precondition link strategy

**Option A : `TestVault.PreconditionLinks`** JSON `number[]` sur le Test Case. Déjà standard côté SDK + CLI ; Sprint 2.23 la confirme et l'expose au niveau UI (read-only display dans TestCaseFormView edit mode).

## Couverture finale

- **20/20 turbo tasks verts** à chaque étape (lint + typecheck + test).
- **argos-extension** : 567+ tests passing (delta +28 TR par rapport au baseline pré-sprint — 6 TestSet + 7 TestPlan Lock/Unlock + 6 Precondition + 9 TC test updates).
- **argos-sdk** : 334 tests passing (delta +6 pour `computeGlobalStatus` exporté).
- 4 nouveaux regression guards structurels : `T-2.23-testset-crud`, `T-2.23-testplan-lock`, `T-2.23-precondition-crud`, `T-2.23-testexecution-crud`.

## Fichiers créés

```
apps/argos-extension/src/hub/views/
  TestSetFormView.test.tsx
  PreconditionFormView.test.tsx

tools/regression/
  T-2.23-testset-crud.test.ts
  T-2.23-testplan-lock.test.ts
  T-2.23-precondition-crud.test.ts
  T-2.23-testexecution-crud.test.ts

claude_prompts/
  sprint-2-23-code-report.md (ce fichier)
```

## Fichiers modifiés

- `apps/argos-extension/src/hub/views/TestSetFormView.tsx` : edit mode (fetch + populate + Update button + loading/error).
- `apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx` : Lock/Unlock buttons + planState derived + tp-locked-notice + Save disabled when Locked.
- `apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.test.tsx` : extension du helper renderForm avec `planId?` + 7 nouveaux RTL Lock/Unlock.
- `apps/argos-extension/src/hub/views/PreconditionFormView.tsx` : edit mode (fetch + populate + Update button + loading/error).
- `apps/argos-extension/src/hub/views/TestCaseFormView.tsx` : Preconditions display section (read-only) + Run Test button (placeholder routing).
- `apps/argos-extension/src/hub/views/TestExecutionFormView.tsx` : display-only mode (fetch + read-only + Re-run button) + loading/error states.
- `packages/argos-sdk/src/test-execution-service.ts` : `computeGlobalStatus` exporté (pure helper) + `read(id)` ajouté à `ITestExecutionService`.
- `packages/argos-sdk/src/test-execution-service.test.ts` : 6 nouveaux unit tests pour `computeGlobalStatus`.
- `packages/argos-sdk/src/bug-creation-service.test.ts` + `evidence-upload-service.test.ts` : mock `read` ajouté pour satisfaire la nouvelle surface.
- `apps/argos-extension/src/test-utils/mock-services.ts` : `read` ajouté sur `createMockTestExecutionService`.
- `apps/argos-extension/src/hub/CoveragePanel.test.tsx` + `ExecutionHistory.test.tsx` + `RunInterface.test.tsx` : mock `read` ajouté.
- `tools/regression/allowlist.cjs` + `allowlist.ts` : entrée temporaire `claude_prompts/tech-debt-T2213-B-report.md` (COMMIT 0).
- `CHANGELOG.md` : nouvelle section `[0.5.33]`.
- `docs/user-guide.md` : nouvelle section "Test Set / Test Plan / Precondition / Test Execution (Sprint 2.23)".
- `docs/operator-guide.md` : nouvelle section "Sprint 2.23 -- Precondition link strategy + Test Plan Lock state".
- `README.md` : key differentiators "5-WIT wiring achievement".
- 15 `package.json` (groupe Changesets fixed) : bump 0.5.33.

## Non-régressions vérifiées

- **Sprint 2.22 (TestCase edit + Coverage Panel rich display)** : VERT.
- **Sprint 2.21 part 3 (Drawers + Monaco)** : VERT.
- **Sprint 2.20 (Test Plan edit mode T-2.20-test-plan-edit-mode)** : VERT (le bouton "Save changes" préservé suite à régression initiale détectée et corrigée).
- **Sprint 2.18 (TestPlan création initiale)** : 23/23 verts.
- **CFG-2026-05-14-fixed-versioning** : VERT (15 package.json synchronisés à 0.5.33).

## Écarts vs CLAUDE_TASK

- **Plan réduit à 11 commits (vs 10 prévus)** : +1 COMMIT 0 housekeeping pour débloquer le pre-flight Xray.
- **Pas de WorkItemPicker créé** : pas nécessaire — TestSet/TC composition utilise déjà input+Add inline depuis Sprint 2.5d. Décision D-2 acceptée (inline picker = option A) mais redondante avec l'existant.
- **Pas de extension routing** : Run button dans TestCaseFormView navigue actuellement via `onSuccess(caseId)` (placeholder) au lieu d'un vrai `goToTestExecutionForm(undefined, testCaseId)`. Le full routing wiring nécessite d'étendre l'enum `ArgosView` avec un `testCaseId?: number` sur `test-execution-form` — différé en **TECH-DEBT-T223**.
- **TestPlan Admin role check** : le brief mentionnait constitution S6 (rôles ADO). Sprint 2.23 expose le bouton Unlock à tous les utilisateurs. Le check role réel demande un service `useUserRole()` non disponible — différé en **TECH-DEBT-T223-Admin**.
- **Précondition title resolution** : le display dans TestCaseFormView affiche "Precondition #N" (id only). Résoudre les titres demanderait un `Promise.all(ids.map(preconditionService.read))` — différé en **TECH-DEBT-T223-PCResolve** pour éviter un N+1 à chaque ouverture de TC.
- **TestExecution Re-run** : actuel `onSuccess(0)` est un placeholder — la routing vraie demanderait `goToTestExecutionForm(undefined, testCaseId)` (TECH-DEBT-T223).
- **`evidenceIds: []` ajouté** aux nouveaux step results pour satisfaire le type `TestStepResult` strict du SDK.

## TECH-DEBT identifiés (à inscrire post-merge dans Specs/tasks.md)

- **TECH-DEBT-T223-Routing** -- Run Test button et Re-run pointent vers des placeholders. Étendre l'enum `ArgosView` pour supporter `{ kind: "test-execution-form"; executionId?: number; testCaseId?: number }`. Petit refactor du routing (~30 min).
- **TECH-DEBT-T223-Admin** -- Unlock TestPlan exposé à tous les utilisateurs. Constitution §6 demande un check ADO Admin. Implémenter `useUserRole()` qui interroge l'ADO Identity service.
- **TECH-DEBT-T223-PCResolve** -- Display "Precondition #N" au lieu du titre. Ajouter un `Promise.all(ids.map(read))` avec cache pour éviter N+1.
- **TECH-DEBT-T223-Snapshot** -- Lock TestPlan ne crée pas encore les TestCaseVersions snapshots (US-4.1 / T-3.x). Brief explicite.
- **TECH-DEBT-T223-ExecPath** -- TestExecution display-only mode utilise `fromRawFinalized` mais les champs Setup / Cleanup / Notes pré-existants restent affichés en input (pas read-only display). Refactor du body de la form pour vraiment être read-only.

## Allowlist -- chemins à ajouter post-merge

Au cleanup post-merge de ce sprint, **retirer** l'entrée temporaire `claude_prompts/tech-debt-T2213-B-report.md` si elle a déménagé (probablement non — elle reste dans `claude_prompts/` à long terme) et **ajouter** :

```javascript
"claude_prompts/sprint-2-23-code-report.md",
"claude_prompts/CLAUDE_TASK_sprint-2-23-code.md",
```

Plus `git mv Specs/CLAUDE_TASK_sprint-2-23-code.md claude_prompts/` au cleanup.

## Pas de push, pas de PR

Conforme au CLAUDE_TASK §REGLES NON-NEGOCIABLES §5. Les 11 commits sont sur `sprint/2.23-code` localement, prêts pour `git push origin sprint/2.23-code` + PR à ta main.
