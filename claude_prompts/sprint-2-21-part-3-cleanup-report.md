# Sprint 2.21 part 3 -- Cleanup Report

## Statut global

**SUCCÈS** -- 2026-05-28 (4 commits sur `main`, tests 553/553 verts à chaque étape).

## PRE-FLIGHT

- **main post-merge** : commit `47281e7 chore(release): bump 0.5.30 -> 0.5.31 (Sprint 2.21 part 3) (#101)` visible (PR squash-mergée par Alex).
- **`pnpm turbo test` baseline** : **553 tests verts**, 20/20 turbo tasks successful.
- **Files attendus présents** :
  - `Specs/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md` (source à déplacer)
  - `Specs/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md` (ce CLAUDE_TASK, reste en Specs/ pour ce sprint)
  - `claude_prompts/sprint-2-21-part-3-code-report.md` (rapport de code, déjà au bon endroit)
  - `claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md` (stale placeholder à overwrite — voir notes)

## Commits livrés

| # | Hash | Message | Tests |
|---|------|---------|-------|
| 1 | `95514fb` | chore(allowlist): Sprint 2.21 part 3 claude_prompts paths | 553 verts |
| 2 | `ecb4c1e` | docs(tasks): T-5.1 PARTIAL + Sprint 2.21 part 3 delivered | 553 verts |
| 3 | `c6a31d6` | docs(tasks): TECH-DEBT Backlog section (T2213-A..F + 047/052/053) | 553 verts |
| 4 | `0ce8b41` | docs(constitution): v0.5.2 changelog Sprint 2.21 part 3 + cleanup | 553 verts |

## Allowlist (COMMIT 1)

**Chemins ajoutés** (dans `allowlist.cjs` ET `allowlist.ts`) :

- `claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md`
- `claude_prompts/sprint-2-21-part-3-code-report.md`

**Note sur le doublon découvert** : un fichier `claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md` existait déjà sur main (commit `45d294e chore: post-merge cleanup Sprint 2.21 part 2 + part 3 placeholder`) mais contenait en réalité le brief Sprint 2.21 part 2 (Drawer + Gherkin) sous un nom de fichier "part 3". J'ai écrasé ce placeholder avec le vrai CLAUDE_TASK qui se trouvait dans `Specs/`. Net effet : single source of truth dans `claude_prompts/`.

**Tests CFG-\*/LLM-\* post-ajout** : VERT (tous les guards `LLM-2026-05-09-gpt41-deprecation`, `allowlist.test.ts` cross-check, etc.).

## tasks.md (COMMITs 2 + 3)

### T-5.1 PARTIAL

- Items du bloc T-5.1 repassés de `[x]` à `[~]` PARTIAL avec justification inline :
  - "Custom Control pour édition Gherkin avec Monaco editor" → PARTIAL (Monaco livré v0.5.31 mais en mode `plaintext`, pas de Monarch grammar Gherkin enregistré → TECH-DEBT-T2213-D).
  - "Validation syntaxe Gherkin" → PARTIAL (validation structurelle basique via `@atconseil/argos-gherkin`, pas grammar W3C complète).
- "Done quand" : item `Édition Gherkin avec coloration et validation` repassé `[~]`. `Tests` reste `[x]` (553 tests verts + 25 RTL behaviour tests).
- Note ajoutée : T-5.1 reste UNBLOCKED pour T-5.2 (parser bidirectionnel). Repasser tous les items en `[x]` quand TECH-DEBT-T2213-D résolu.

### Nouvelle section "Sprint 2.21 part 3 -- DELIVERED v0.5.31"

Insérée après le brief Sprint 2.21 part 2 et avant Sprint 2.22, listant : périmètre livré (Drawers + Monaco), tests, documentation, écarts vs CLAUDE_TASK, 6 TECH-DEBT-T2213-A à F.

### Section TECH-DEBT Backlog

- **9 entrées inscrites** dans une nouvelle section avant "Métriques de progression" :
  - **TECH-DEBT-047** (LIVRÉ Sprint 2.8) — retracé pour visibilité.
  - **TECH-DEBT-052** (MOYENNE) — Playwright E2E non activé.
  - **TECH-DEBT-053** (BASSE) — reformulation libellé test LLM.
  - **TECH-DEBT-T2213-A** (RÉSOLU) — HIGH `tmp@0.2.5` via exceljs, fix `pnpm.overrides`.
  - **TECH-DEBT-T2213-B** (HAUTE) — code mort `AiSuggestTestsModal` + `ReplaceOrAppendModal`.
  - **TECH-DEBT-T2213-C** (BASSE) — 8 MODERATE dompurify via Monaco.
  - **TECH-DEBT-T2213-D** (MOYENNE) — Monaco en plaintext.
  - **TECH-DEBT-T2213-E** (BASSE) — pas de lazy loading Monaco.
  - **TECH-DEBT-T2213-F** (HAUTE) — référence `testpulse-ui-shared` obsolète.

### testpulse-ui-shared (PATCH 4)

- Recherche `grep -n "testpulse-ui-shared" Specs/tasks.md` → **0 occurrence pré-existante**. Toutes les mentions dans `tasks.md` sont mes propres ajouts (COMMIT 2 + 3) déjà liées explicitement à TECH-DEBT-T2213-F.
- Les vraies références historiques vivent dans `Specs/plan.md` lignes 58, 95, 428 et `Specs/archives/MIGRATION-PLAN.md` / `MONOREPO.md`. Hors scope (cleanup task §"NE PAS toucher spec.md ni plan.md"). Documenté dans le plan de TECH-DEBT-T2213-F.

## constitution.md (COMMIT 4)

- **Version** : 0.5.1 → **0.5.2** (header).
- **Changelog ajouté** : nouvelle entrée `Changelog v0.5.2` en première position du bloc des changelogs, mentionnant :
  - Sprint 2.21 part 3 -- Drawer UX + Monaco GherkinEditor (T-5.1 PARTIAL).
  - 553 tests verts, VSIX +148 KB.
  - Cleanup post-merge : allowlist + TECH-DEBT backlog initialisé.
  - HIGH `tmp@0.2.5` résolue via `pnpm.overrides` (supersede TECH-DEBT-T2213-A).
  - Version packages 0.5.31.
- **Aucune règle non-négociable modifiée** -- juste l'historique des décisions.

## Tests finaux

```text
pnpm turbo test
Tasks: 20 successful, 20 total
Tests: 553 passed (72 files)
```

Vert à chaque étape du cleanup (vérifié après COMMITs 1, 2, 3 et 4).

## Écarts vs CLAUDE_TASK

- **PATCH 4 (testpulse-ui-shared flag in tasks.md)** : no-op car aucune occurrence pré-existante dans `tasks.md`. Documenté dans le commit `c6a31d6` + cette section.
- **Doublon `claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md`** : présent sur main mais contenait du Sprint 2.21 part 2 sous un nom "part 3". Overwrite par le vrai task depuis `Specs/`. Choix documenté dans le commit `95514fb`.
- **`Specs/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md`** : reste dans `Specs/` à l'issue de ce sprint, conformément au §CLEANUP DE CE FICHIER du CLAUDE_TASK (déplacement + allowlist prévus en sprint cleanup suivant).

## Allowlist -- chemins à ajouter (post-merge de CE sprint)

À traiter dans le prochain mini-sprint de cleanup (§CLEANUP DE CE FICHIER du CLAUDE_TASK) :

```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md",
"claude_prompts/sprint-2-21-part-3-cleanup-report.md",
```

Plus un `git mv Specs/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md claude_prompts/`.

## Pas de push, pas de PR

Conforme au CLAUDE_TASK §REGLES NON-NEGOCIABLES §"Pas de push, pas de PR automatique". Les 4 commits sont sur `main` localement, prêts pour `git push origin main` à ta main quand tu valides.
