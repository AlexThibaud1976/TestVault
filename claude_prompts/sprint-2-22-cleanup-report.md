# Sprint 2.22 -- Cleanup Report

## Statut global

**SUCCÈS** -- 2026-05-28 (3 commits sur `main`, 20/20 turbo tasks verts à chaque étape).

## PRE-FLIGHT

- **`main` post-merge** : `7bd9247 Sprint 2.22 — WIT display + Steps CRUD + Coverage Panel rich UX (v0.5.32) (#102)` visible. PR #102 squash-mergée par Alex.
- **`pnpm turbo test` baseline initial** : **1 fail** sur `CFG-2026-05-10-no-xray-references` -- 3 violations détectées :
  - `claude_prompts/sprint-2-22-code-report.md:12` (méta-discussion "Xray-like blocker")
  - `claude_prompts/sprint-2-22-code-report.md:121` (méta-discussion neutralisation)
  - `Specs/CLAUDE_TASK_sprint-2-22-cleanup.md:153` (méta-discussion neutralisation)
- Toutes les violations sont des **références documentaires au terme** (méta-discussion), pas le terme utilisé comme métaphore. Traitées par allowlist au COMMIT 1.
- **Fichiers attendus présents** :
  - `Specs/CLAUDE_TASK_sprint-2-22-cleanup.md` (ce CLAUDE_TASK, reste en Specs/ pour ce sprint)
  - `Specs/CLAUDE_TASK_sprint-2-22-code.md` (brief Sprint 2.22, à déplacer)
  - `claude_prompts/sprint-2-22-code-report.md` (rapport, déjà au bon endroit, à allowlister)
  - `claude_prompts/CLAUDE_TASK_sprint-2-22-code.md` (stale placeholder à overwrite)

## Commits livrés

| # | Hash | Message |
|---|------|---------|
| 1 | `4fbc7be` | chore(allowlist): Sprint 2.22 cleanup -- move CLAUDE_TASK, add report path |
| 2 | `6299d57` | docs(tasks): Sprint 2.22 delivered + T-0.5.2 enrichment note + TECH-DEBT T222-A..D |
| 3 | `192717f` | docs(constitution): v0.5.3 changelog Sprint 2.22 cleanup |

## Allowlist (COMMIT 1)

**Modifications appliquées dans `allowlist.cjs` ET `allowlist.ts`** :

- **Retiré** : `Specs/CLAUDE_TASK_sprint-2-22-code.md` (TECH-DEBT-T222-D résolue).
- **Ajouté** : `claude_prompts/sprint-2-22-code-report.md` (méta-discussion Xray-like documentaire).
- **Ajouté (temporaire)** : `Specs/CLAUDE_TASK_sprint-2-22-cleanup.md` (sera retiré au cleanup-of-cleanup quand le file déménagera en `claude_prompts/`).

**Move appliqué** :

- Stale placeholder `claude_prompts/CLAUDE_TASK_sprint-2-22-code.md` (~6 KB de contenu daté) **overwritten** par le vrai brief Sprint 2.22 depuis `Specs/`. Même pattern que Sprint 2.21 part 3 cleanup. Net effet : single source of truth dans `claude_prompts/`.

**Tests CFG-\*/LLM-\* post-ajout** : VERT (20/20 turbo tasks). 3 violations Xray résolues.

## tasks.md (COMMIT 2)

### PATCH 1 -- Phase 0.5 statuses (adapté)

Le CLAUDE_TASK supposait T-0.5.1/2/3 `[ ]`. La réalité : ces tâches étaient déjà `[x]` DONE depuis Sprint 2.5d/2.5a/2.5b. Je n'ai pas appliqué le downgrade `[x] → [~] PARTIAL` qui aurait été factuellement incorrect.

**Action** : ajouté une **note d'enrichissement Sprint 2.22** sous T-0.5.2 listant :

- TestCaseFormView edit mode (fetch-by-caseId + Update button)
- StepsEditor extrait avec Move Up/Down
- Coverage Panel rich display

Forward-link vers TECH-DEBT-T222-C pour les wirings TestPlan/TestSet/Precondition restants.

Mention "+24 RTL tests Sprint 2.22" ajoutée à T-0.5.3.

### PATCH 2 -- Section "Sprint 2.22 -- WIT Display + Steps CRUD + Coverage Panel rich UX (DELIVERED v0.5.32)"

Insérée juste après la section Sprint 2.21 part 3 DELIVERED et avant Sprint 2.22 (l'ancien brief existant des bugfixes T-2.22.x). Contient :

- 9 bullets de périmètre livré (StepsEditor, edit mode, rich display, listLinks widened, widget fix, Bug Area Path RÉSOLU, tests, docs).
- 4 écarts vs CLAUDE_TASK documentés (plan réduit, 15 pkg.json fixed, update path inline, Xray neutralisé).
- Cross-référence vers les 4 TECH-DEBT-T222-A..D.

### PATCH 3 -- TECH-DEBT Backlog (T222-A..D)

4 nouvelles entrées inscrites juste avant "Métriques de progression" :

- **TECH-DEBT-T222-A** (MOYENNE) -- N+1 reads Coverage Panel, plan : batch `getWorkItems`.
- **TECH-DEBT-T222-B** (MOYENNE) -- `useArgosUpdate` hook absent.
- **TECH-DEBT-T222-C** (HAUTE) -- TestPlan/TestSet/Precondition wirings restants.
- **TECH-DEBT-T222-D** (RÉSOLUE) -- allowlist temp entry, résolue au COMMIT 1 de ce cleanup.

`grep -c "TECH-DEBT-T222"` : 10 occurrences (largement ≥ 4 attendu).

## constitution.md (COMMIT 3)

- **Version** : 0.5.2 → **0.5.3** (header).
- **Changelog ajouté** : nouvelle entrée `Changelog v0.5.3` en première position, mentionnant :
  - StepsEditor, TestCaseFormView edit mode, Coverage Panel rich display
  - `listLinks` widened (native TestedBy-Forward)
  - Widget Coverage Panel ServicesContext.Provider fix
  - Bug Area Path CERTIFIÉ RÉSOLU via test régression
  - T-0.5.1 / T-0.5.2 enrichments
  - 567+ tests extension + 328 SDK (delta +27)
  - 4 nouveaux TECH-DEBT-T222-A..D
  - Version packages 0.5.32
- **Aucune règle non-négociable modifiée**.

## Tests finaux

```text
pnpm turbo test
Tasks: 20 successful, 20 total
Tests: passing (full suite green at every cleanup step)
```

Vert à chaque étape (vérifié après COMMITs 1, 2, 3).

## Écarts vs CLAUDE_TASK

- **PATCH 1 adapté** : T-0.5.1/2/3 sont restés `[x]` DONE (Sprint 2.5d/2.5a/2.5b history is accurate). J'ai ajouté une note d'enrichissement Sprint 2.22 sous T-0.5.2 plutôt qu'un downgrade `[x] → [~]`. Choix documenté dans le commit `6299d57`.
- **Doublon `claude_prompts/CLAUDE_TASK_sprint-2-22-code.md`** : stale placeholder écrasé par le vrai brief, même pattern que Sprint 2.21 part 3 cleanup. Documenté dans `4fbc7be`.
- **Allowlist temp pour cleanup task** : `Specs/CLAUDE_TASK_sprint-2-22-cleanup.md` ajouté à l'allowlist (le file contient 1 méta-mention "Xray-like"). Sera retiré au prochain cleanup-of-cleanup.

## Allowlist -- chemins à ajouter (post-merge de CE cleanup)

À traiter au prochain mini-sprint de cleanup, conformément au §CLEANUP DE CE FICHIER du CLAUDE_TASK :

```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-22-cleanup.md",
"claude_prompts/sprint-2-22-cleanup-report.md",
```

Plus `git mv Specs/CLAUDE_TASK_sprint-2-22-cleanup.md claude_prompts/` et **retirer** l'entrée temporaire `Specs/CLAUDE_TASK_sprint-2-22-cleanup.md` ajoutée au COMMIT 1.

## Pas de push, pas de PR

Conforme au CLAUDE_TASK §RÈGLES §"Pas de push, pas de PR". Les 3 commits sont sur `main` localement, prêts pour `git push origin main` à ta main quand tu valides.
