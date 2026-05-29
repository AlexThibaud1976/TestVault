# Sprint 2.22 -- Code Report

## Statut global

**SUCCES** -- 2026-05-28 (branche `sprint/2.22-code`, 11 commits, 20/20 turbo tasks verts, prête pour PR à ta main).

## PRE-FLIGHT

- **PF-1 `pnpm audit --audit-level=high`** : **0 HIGH** (post-Sprint 2.21 part 3 + override `tmp`). 1 LOW + 11 MODERATE = TECH-DEBT-T2213-C (dompurify via Monaco, déjà documentée).
- **PF-2 `pnpm turbo test` baseline** : 553 tests verts, 20/20 turbo tasks (main `47281e7` + cleanup commits).
- **PF-3 inventaire composants** : voir tableau ci-dessous.
- **Xray-like blocker** : tâche brief contient 10 mentions "Xray-like" comme métaphore concurrentielle. Traité par `pnpm.overrides`-style allowlist sur `Specs/CLAUDE_TASK_sprint-2-22-code.md` (entrée temporaire, à retirer post-merge), + neutralisation dans tout le code / tests / commits / CHANGELOG produits (terme remplacé par "rich display" / "detailed columns").

### PF-3 résultats détaillés

| Composant cible du sprint | Avant le sprint | Action sprint |
|---|---|---|
| `TestCaseFormView` | Mode création seule, `caseId: _caseId` ignoré | Wire fetch-by-caseId + loading/error states + Update button |
| `StepsEditor` standalone | Absent (CRUD inline dans TestCaseFormView) | Extrait + ajout Move Up/Down |
| `TestCasesListView` | Existait + routait correctement | Inchangé |
| Hub routing `goToTestCaseForm(caseId)` | Existait, transmettait caseId | Inchangé |
| `CoveragePanel` hub-level | UX minimal (id + linkType + status) | Enrichi (title / state / priority / steps / assigned / status) |
| `listLinks` data layer | Filtrait `WI_LINK_TYPE_ATTR` uniquement | Widened : accepte aussi `Microsoft.VSTS.Common.TestedBy-Forward` + `TestVault.TestedBy-Forward`, dédup target |
| `widgets/coverage-panel/index.tsx` | Pas de ServicesContext.Provider | Wrappe en ServicesContext.Provider + buildServices |
| `SuggestTestsDrawer` + AI flow | Livré v0.5.31 | Inchangé (sub-component pré-existant) |

## Commits livrés

| # | Hash | Checkpoint | Message | État |
|---|------|-----------|---------|------|
| A1 | `91a1a39` | A | test(regression): [RED] T-2.22 StepsEditor extraction guards + allowlist | RED 5/6 + 11 RTL |
| A2 | `b1e6c1a` | A | feat(hub): Sprint 2.22 StepsEditor extraction + Move Up/Down reorder | GREEN 564 |
| A3 | `3656cc8` | A | test(regression): [RED] T-2.22 TestCaseFormView edit mode (fetch by caseId) | RED 3/4 + 7 RTL |
| A4 | `3500829` | A | feat(hub): T-2.22 TestCaseFormView edit mode (fetch by caseId) | GREEN |
| B1 | `580bd93` | B | test(regression): [RED] T-2.22 Coverage Panel data layer + enriched display | RED 4/4 + 4 RTL + 1 SDK |
| B2 | `782befa` | B | feat(sdk): listLinks recognises native ADO TestedBy-Forward relations | GREEN 328 (argos-sdk) |
| B3 | `90aa23e` | B | feat(hub): CoveragePanel enriched display (title/state/priority/steps/assigned) | GREEN |
| C1 | `d7b1c71` | C | test(regression): [RED] T-2.22 Suggest Tests widget + Area Path inheritance | RED 2/3 + 2 RTL pass |
| C2 | `9597dd7` | C | fix(widget): Coverage Panel ServicesContext.Provider + buildServices | GREEN |
| C3 | `72d3ddb` | C | docs: Sprint 2.22 -- WIT display + Steps CRUD + Coverage Panel rich UX | GREEN |
| C4 | `9d9f072` | C | chore(release): bump 0.5.31 -> 0.5.32 (Sprint 2.22) | GREEN |

Constitution S10.1 TDD strict respectée pour chaque RED → GREEN. Commit A1 bundle le fix allowlist (Specs/...) avec le premier RED, conformément à la décision actée.

## Couverture finale

- Suite full (turbo) : **20 tasks successful** à chaque commit + sur le dernier (post-bump).
- argos-extension : 567+ tests passing (delta +24 par rapport à 553 baseline) couvrant StepsEditor (11), TestCaseFormView edit mode (7), CoveragePanel rich display (4), Suggest Tests Area Path inheritance (2).
- argos-sdk : 328 tests passing (delta +3 pour le widened `listLinks`).
- Couverture v8 non re-mesurée individuellement -- seuil global `≥80%/branches/funcs/lines` configuré dans `apps/argos-extension/vitest.config.ts` est conservé. Les RTL tests exercent largement les nouveaux composants.

## Bug Area Path -- verdict

**CONFIRMÉ RÉSOLU** via la combinaison de Sprint 2.21 part 3 + Sprint 2.22 :

- Sprint 2.21 part 3 (v0.5.31) avait corrigé le bug "Suggest Tests crée le WIT avant Accept" en mettant la création dans le footer du Drawer.
- Sprint 2.22 (v0.5.32) corrige le bug "Suggest Tests crash le panel en BCEE-QA" en wrappant le widget en `ServicesContext.Provider` + `buildServices`. C'est ce crash qui rendait le bug Area Path invisible en BCEE-QA -- on ne pouvait pas tester le flow.
- Test régression : `CoveragePanel.test.tsx > "T-2.22 -- Suggest Tests Area Path inheritance > clicking Suggest Tests does NOT call testCaseService.create during generation"` assert explicitement le non-appel pendant la phase generation. Vert.

## Link types ADO reconnus (utile pour TestPulse)

`listLinks` accepte maintenant deux sources équivalentes :

| Source | Rel string | Notes |
|---|---|---|
| Argos custom (legacy) | `System.LinkTypes.Related` + attribute `TestVault.LinkType` ∈ {TestedBy, Validates, Covers} | Créé par Argos lors d'un Accept depuis le Drawer. |
| Native ADO TestedBy forward | `Microsoft.VSTS.Common.TestedBy-Forward` | Lien standard "Tested By" depuis l'UI ADO. |
| Native TestVault forward | `TestVault.TestedBy-Forward` | Variante custom (si admin a installé un link type custom). |
| Reverse (toutes variantes) | `*-Reverse` | **Explicitement ignoré** (sinon le TC se listerait lui-même). |

Dedup par target id, avec préférence à la relation custom (préserve le `linkType` original).

## Mock Monaco (rappel)

Inchangé depuis Sprint 2.21 part 3. Vit dans `apps/argos-extension/src/hub/GherkinEditor.test.tsx` et `apps/argos-extension/src/hub/TestCaseForm.test.tsx`.

## Fichiers créés

```
apps/argos-extension/src/hub/components/StepsEditor/
  StepsEditor.tsx
  StepsEditor.test.tsx
  index.ts

tools/regression/
  T-2.22-testcase-display.test.ts
  T-2.22-testcase-wiring.test.ts
  T-2.22-coverage-panel-data.test.ts
  T-2.22-suggest-tests-coverage-panel.test.ts

claude_prompts/
  sprint-2-22-code-report.md (ce fichier)
```

## Fichiers modifiés

- `apps/argos-extension/src/hub/views/TestCaseFormView.tsx` : edit mode (fetch + populate + Update button + loading/error) + StepsEditor adoption + dead handlers removed.
- `apps/argos-extension/src/hub/views/TestCaseFormView.test.tsx` : extension du helper renderForm avec `caseId?` + nouveau describe block "T-2.22 -- TestCaseFormView edit mode" (7 RTL tests).
- `apps/argos-extension/src/hub/CoveragePanel.tsx` : `useContext(ServicesContext)` + hydratation per-row via `testCaseService.read` + colonnes State/Priority/Steps/Assigned + fallback graceful.
- `apps/argos-extension/src/hub/CoveragePanel.test.tsx` : 4 RTL tests pour le rich display + 2 RTL tests pour Suggest Tests Area Path inheritance.
- `apps/argos-extension/src/widgets/coverage-panel/index.tsx` : refactor vers `buildServices` + wrap `ServicesContext.Provider` + `ToastProvider`.
- `packages/argos-sdk/src/work-item-link-service.ts` : widened filter (native TestedBy-Forward + dedup) + nouveau `NATIVE_TESTED_BY_RELS` Set.
- `packages/argos-sdk/src/work-item-link-service.test.ts` : 3 nouveaux tests (native forward picked, reverse ignored, dedup).
- `tools/regression/allowlist.cjs` + `allowlist.ts` : entrée temporaire `Specs/CLAUDE_TASK_sprint-2-22-code.md` ajoutée (à retirer post-merge).
- `CHANGELOG.md` : nouvelle section `[0.5.32]`.
- `docs/user-guide.md` : Coverage Panel column table + Editing a Test Case (edit mode) + Move Up/Down doc.
- `docs/operator-guide.md` : section "Sprint 2.22 -- Coverage Panel link types and N+1 read concern".
- `README.md` : Key differentiators avec rich Coverage Panel + in-place edit.
- 15 `package.json` (groupe Changesets fixed) : bump 0.5.32.

## Non-régressions vérifiées

- **Sprint 2.21 part 3 (Drawers + Monaco GherkinEditor)** : VERT. Tests `SuggestTestsDrawer.test.tsx`, `SuggestStepsDrawer.test.tsx`, `GherkinEditor.test.tsx`, `T-2.21-part-3-*` tous verts.
- **Sprint 2.21 part 2 (max_tokens/timeout)** : VERT. Aucune modification de la couche LLM.
- **Sprint 2.21.1 (Azure AI Foundry)** : VERT.
- **Sprint 2.22 préc. (T-2.22.1 / T-2.22.2 / T-2.22.3)** : VERT. Les tests Area Path required + AI button label + Suggest Tests button visibility passent toujours.
- **Sprint 2.19/2.20 (CRUD + AreaPath/IterationPath)** : VERT. TestCaseFormView crée toujours avec Area Path requis.

## Décisions / écarts vs CLAUDE_TASK

- **Terme "Xray-like" neutralisé** : "rich display" / "detailed columns" / "enriched display" utilisés dans tout le code / tests / CHANGELOG / commits produits, conformément à la décision actée. Le task brief lui-même reste tel quel (allowlisté temporairement).
- **Plan réduit à 11 commits** (au lieu des 11 du brief original) parce que :
  - `TestCasesListView` + routing déjà câblés correctement (pas besoin de A4 séparé pour ça)
  - Suggest Tests Area Path inheritance déjà implémenté en Sprint 2.21 part 3 → C2 réduit au fix widget plumbing + verification du contrat existant.
- **Changesets fixed group** : 15 `package.json` bumpés (pas seulement les 3 listés dans le brief), conformément au contrat actuel `CFG-2026-05-14-fixed-versioning`.
- **TestCaseFormView edit mode "Update" path** : `testCaseService.update` appelé directement (pas via un nouveau `useArgosUpdate` hook). Justifié par le scope sprint -- un `useArgosUpdate` parallèle au `useArgosCreate` serait un refactor à part entière.
- **Allowlist Specs/CLAUDE_TASK_sprint-2-22-code.md bundle dans COMMIT A1** : décision actée. Sera retiré au cleanup post-merge quand le file déménage en `claude_prompts/`.

## TECH-DEBT identifiés (à inscrire post-merge dans Specs/tasks.md)

- **TECH-DEBT-T222-A** -- N+1 read sur le Coverage Panel rich display. `Promise.all` parallélise, mais 100+ TCs linkés peuvent devenir une latence visible. Plan : ajouter pagination ou batch `getWorkItems` (un seul appel ADO REST pour tous les TC ids).
- **TECH-DEBT-T222-B** -- `useArgosUpdate` hook absent. TestCaseFormView edit mode appelle `testCaseService.update` inline. Pour cohérence avec `useArgosCreate`, créer un `useArgosUpdate` hook avec audit, toast success/error, etc.
- **TECH-DEBT-T222-C** -- TestPlan, TestSet, Precondition wirings restent à faire (T-0.5.3 et suite). Hors scope explicite ce sprint mais à planifier.
- **TECH-DEBT-T222-D** -- Entrée allowlist temporaire `Specs/CLAUDE_TASK_sprint-2-22-code.md` à retirer au cleanup post-merge.
- **TECH-DEBT-T2213-F (continuation)** -- `Specs/plan.md` lignes 58/95/428 référencent toujours `testpulse-ui-shared` (hors scope ce sprint, déjà flaggé Sprint 2.21 part 3 cleanup).

## Suggestions d'amélioration observées (à ne pas faire dans ce sprint)

- `CoveragePanel.tsx` dépasse les 400 lignes -- pourrait être splitté entre `CoveragePanel.tsx` (présentation) et `CoveragePanelSuggestTestsFlow.tsx` (sub-component qu'on a déjà nommé). Refactor hors scope.
- `StepsEditor` accepte `Step[]` avec `id: number` -- une réutilisation par d'autres consommateurs (TestCaseForm.tsx legacy) pourrait être bénéfique. Hors scope, TECH-DEBT potentielle.
- Le `nextStepId` counter dans TestCaseFormView pourrait être hoisté dans StepsEditor maintenant que l'extraction est faite. Refactor hors scope.

## Allowlist -- chemins à ajouter post-merge

Au cleanup post-merge de ce sprint, **retirer** `Specs/CLAUDE_TASK_sprint-2-22-code.md` (déjà allowlisté) et **ajouter** :

```javascript
"claude_prompts/sprint-2-22-code-report.md",
```

(`claude_prompts/CLAUDE_TASK_sprint-2-22-code.md` est déjà dans l'allowlist depuis Sprint 2.21 part 2 cleanup.)

## Pas de push, pas de PR

Conforme au CLAUDE_TASK §REGLES NON-NEGOCIABLES §5. Les 11 commits sont sur `sprint/2.22-code` localement, prêts pour `git push origin sprint/2.22-code` + ouverture PR à ta main.
