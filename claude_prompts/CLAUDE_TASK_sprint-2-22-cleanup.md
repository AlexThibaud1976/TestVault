# CLAUDE_TASK -- Sprint 2.22 : Cleanup post-merge + patch tasks.md

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `main` (operations directement sur main)
**Pattern :** A -- Spec Patch
**Duree estimee :** 30 min
**Source :** sprint-2-22-code-report.md + analyse session 2026-05-28

---

## CONTEXTE

Sprint 2.22 merge sur main (branche `sprint/2.22-code`, 11 commits).
Trois operations post-merge :

1. **Allowlist** : retirer l'entree temporaire `Specs/CLAUDE_TASK_sprint-2-22-code.md`
   et ajouter `claude_prompts/sprint-2-22-code-report.md`.
2. **tasks.md** : T-0.5.1 DONE + T-0.5.2 PARTIAL + Sprint 2.22 delivered + TECH-DEBT T222-A..D.
3. **constitution.md** : changelog v0.5.3.

---

## REGLES

- Un fichier = un commit. Tests verts apres chaque commit.
- Ne pas modifier spec.md ni plan.md.
- Ne pas corriger les TECH-DEBT -- les inscrire uniquement.
- Pas de push, pas de PR.

---

## PRE-FLIGHT

```bash
git branch --show-current   # main
git log --oneline -3        # dernier commit = merge Sprint 2.22
pnpm test --run             # attendu : >= 567 tests verts
```

---

## COMMIT 1 -- chore(allowlist): Sprint 2.22 cleanup

**Modifier `tools/regression/allowlist.cjs` :**

RETIRER :
```javascript
"Specs/CLAUDE_TASK_sprint-2-22-code.md",
```

AJOUTER (chercher le bloc des entrees `claude_prompts/sprint-2-22*`) :
```javascript
"claude_prompts/sprint-2-22-code-report.md",
```

Note : `claude_prompts/CLAUDE_TASK_sprint-2-22-code.md` est deja dans l'allowlist
depuis Sprint 2.21 part 2 cleanup -- ne pas dedupliquer.

**Meme operation dans `tools/regression/allowlist.ts`.**

**Deplacer le CLAUDE_TASK si encore dans Specs/ :**
```powershell
# Verifier si le fichier est encore dans Specs/
Test-Path "Specs\CLAUDE_TASK_sprint-2-22-code.md"
# Si True :
Move-Item "Specs\CLAUDE_TASK_sprint-2-22-code.md" `
          "claude_prompts\CLAUDE_TASK_sprint-2-22-code.md" -Force
```

**Verification :**
```bash
pnpm test --run
# CFG-* et LLM-* doivent rester verts
grep "Specs/CLAUDE_TASK_sprint-2-22" tools/regression/allowlist.cjs
# Attendu : 0 resultats (entree retiree)
grep "sprint-2-22-code-report" tools/regression/allowlist.cjs
# Attendu : 1 resultat
```

**Commit :**
```
chore(allowlist): Sprint 2.22 cleanup -- retire Specs/ temp entry, adds report path
```

---

## COMMIT 2 -- docs(tasks): T-0.5 PARTIAL + Sprint 2.22 delivered

**PATCH 1 -- Phase 0.5 : mettre a jour les statuts**

REMPLACER le bloc Phase 0.5 existant :
```markdown
- [ ] T-0.5.1 -- Inventaire des composants riches non-wires
- [ ] T-0.5.2 -- ...
- [ ] T-0.5.3 -- Tests de wiring
- [ ] T-0.5.4 -- Accessibility
- [ ] T-0.5.5 -- Screenshots
```

PAR :
```markdown
- [x] T-0.5.1 -- Inventaire des composants riches non-wires
      DONE Sprint 2.22 (PF-3) -- voir claude_prompts/sprint-2-22-code-report.md

- [~] T-0.5.2 -- Wiring composants riches (Plans, Cases, Sets, Preconditions, Reports, Settings)
      PARTIAL Sprint 2.22 -- TestCase wiring livre (display + Steps CRUD + edit mode).
      TestPlan, TestSet, Precondition, TestExecution : hors scope ce sprint.
      Voir TECH-DEBT-T222-C pour la suite.

- [ ] T-0.5.3 -- Tests de wiring (composant rendu reellement vs stub)
- [ ] T-0.5.4 -- Accessibility (aria-* sur la sidebar, focus management)
- [ ] T-0.5.5 -- Mettre a jour README avec screenshots du hub reel
```

**PATCH 2 -- Ajouter section Sprint 2.22 delivered**

Trouver la section "Sprint 2.21 part 3 -- DELIVERED v0.5.31" ajoutee en cleanup precedent.
AJOUTER APRES :

```markdown
### Sprint 2.22 -- WIT Display + Steps CRUD + Coverage Panel (DELIVERED v0.5.32)

[ref] claude_prompts/CLAUDE_TASK_sprint-2-22-code.md
[ref] claude_prompts/sprint-2-22-code-report.md

**Livre le 2026-05-28** -- v0.5.31 -> v0.5.32

**Perimetre livre :**
- [x] T-0.5.1 : inventaire composants riches (PF-3 complet)
- [~] T-0.5.2 : TestCase wiring -- display + Steps CRUD (add/edit/delete/reorder)
      TestCaseFormView : edit mode fetch-by-caseId + Update button + loading/error states
- [x] Coverage Panel enrichi (title/state/priority/steps count/assigned/last execution)
      Link types ADO reconnus : native TestedBy-Forward + TestVault.TestedBy-Forward
      Fallback graceful si pas de TestExecution liee (badge "Unexecuted")
- [x] Suggest Tests depuis Coverage Panel : generation AI + Area Path herite de la US source
- [x] Bug Area Path : CONFIRME RESOLU
      Test regression : T-2.22-suggest-tests-coverage-panel.test.ts vert
      Creation WIT differee au Accept du Drawer -- jamais pendant la generation
- [x] +27 tests (567 extension + 328 argos-sdk, etait 553 + 325)
- [x] Documentation : user-guide + operator-guide (link types + N+1 concern) + README

**TECH-DEBT identifies :**
- TECH-DEBT-T222-A : N+1 reads Coverage Panel (Promise.all OK, pagination a prevoir)
- TECH-DEBT-T222-B : useArgosUpdate hook absent (update inline dans TestCaseFormView)
- TECH-DEBT-T222-C : TestPlan/TestSet/Precondition wirings restants (T-0.5.2 suite)
- TECH-DEBT-T222-D : allowlist temp Specs/CLAUDE_TASK_sprint-2-22-code.md (traite COMMIT 1)

**Ecarts vs CLAUDE_TASK documentes :**
- C1 : 2 RTL passaient au commit RED (comportement Sprint 2.21 part 3 deja cable) -- acceptable
- TestCasesListView + routing deja cables en v0.5.31 -- A4 reduit
- Suggest Tests Area Path inheritance deja implemente -- C2 reduit au fix widget plumbing
- Terme "Xray-like" neutralise dans tout le code produit (rich display / enriched display)
```

**PATCH 3 -- Ajouter TECH-DEBT T222-A..D dans la section TECH-DEBT Backlog**

Trouver la section "TECH-DEBT Backlog" ajoutee en cleanup Sprint 2.21 part 3.
AJOUTER en fin de section (avant "Metriques de progression") :

```markdown
### TECH-DEBT-T222-A -- N+1 reads Coverage Panel

**Priorite :** MOYENNE
**Source :** Sprint 2.22, sprint-2-22-code-report.md
**Symptome :** hydratation per-row via Promise.all -- 100+ TCs lies = latence visible.
**Plan :** batch `getWorkItems` (un seul appel ADO pour tous les TC ids du panel).
Acceptable jusqu'a ~50 TCs ; au-dela = goulot.

### TECH-DEBT-T222-B -- useArgosUpdate hook absent

**Priorite :** MOYENNE
**Source :** Sprint 2.22
**Symptome :** TestCaseFormView.update appelle testCaseService.update inline.
Incoherence avec le pattern useArgosCreate (audit, toast, error handling centralises).
**Plan :** creer useArgosUpdate sur le meme modele que useArgosCreate. Sprint dedie ~1h.

### TECH-DEBT-T222-C -- TestPlan / TestSet / Precondition wirings restants

**Priorite :** HAUTE
**Source :** Sprint 2.22 -- T-0.5.2 PARTIAL
**Symptome :** seul TestCase est wire dans le hub. TestPlan, TestSet, Precondition,
TestExecution affichent toujours des stubs ou rien.
**Plan :** sprint dedie T-0.5.2 suite. Prerequis pour la demo complete du produit.

### TECH-DEBT-T222-D -- Entree allowlist temporaire retiree

**Priorite :** RESOLUE
**Source :** Sprint 2.22 -- allowlist Specs/CLAUDE_TASK_sprint-2-22-code.md
**Resolution :** COMMIT 1 de ce cleanup.
```

**Verification :**
```bash
pnpm test --run   # attendu : verts
grep -c "TECH-DEBT-T222" Specs/tasks.md
# Attendu : >= 4 occurrences
```

**Commit :**
```
docs(tasks): Sprint 2.22 delivered + T-0.5 PARTIAL + TECH-DEBT T222-A..D
```

---

## COMMIT 3 -- docs(constitution): changelog v0.5.3

Trouver le bloc Changelog en tete de constitution.md.
AJOUTER en premiere position :

```markdown
> **Changelog v0.5.3** : Sprint 2.22 -- WIT display + Steps CRUD + Coverage Panel enrichi.
> Bug Area Path certifie resolu (test regression T-2.22 vert).
> T-0.5.1 DONE, T-0.5.2 PARTIAL (TestCase wire, Plans/Sets/Preconditions pending TECH-DEBT-T222-C).
> Link types ADO documentes (TestedBy-Forward native + TestVault.TestedBy-Forward).
> Version packages 0.5.32. -- 2026-05-28.
```

Mettre a jour le numero de version : `v0.5.2 -> v0.5.3`

**Verification :**
```bash
pnpm test --run
```

**Commit :**
```
docs(constitution): v0.5.3 changelog Sprint 2.22 cleanup
```

---

## VERIFICATION FINALE

```bash
pnpm test --run
echo "---"
git log --oneline -5
echo "---"
grep "Specs/CLAUDE_TASK_sprint-2-22" tools/regression/allowlist.cjs
# Attendu : 0 resultats
grep "sprint-2-22-code-report" tools/regression/allowlist.cjs
# Attendu : 1 resultat
grep -c "TECH-DEBT-T222" Specs/tasks.md
# Attendu : >= 4
grep "v0.5.3" Specs/constitution.md
# Attendu : 1 resultat
```

---

## CE QUE TU NE FAIS PAS

- NE PAS corriger les TECH-DEBT -- les inscrire uniquement.
- NE PAS modifier spec.md ni plan.md.
- NE PAS toucher le code de l'extension.
- NE PAS pusher.

---

## RAPPORT FINAL

Produire `claude_prompts/sprint-2-22-cleanup-report.md` :

```markdown
# Sprint 2.22 -- Cleanup Report

## Statut : [SUCCES / ECHEC] -- [date]

## Commits
| # | Hash | Message |
|---|------|---------|
| 1 | ... | chore(allowlist): Sprint 2.22 cleanup |
| 2 | ... | docs(tasks): Sprint 2.22 delivered + T-0.5 PARTIAL + TECH-DEBT T222-A..D |
| 3 | ... | docs(constitution): v0.5.3 changelog Sprint 2.22 cleanup |

## Allowlist
- Entree Specs/ retiree : [oui/non]
- Entree claude_prompts/sprint-2-22-code-report.md ajoutee : [oui/non]
- Tests CFG-*/LLM-* : [VERT / problemes : ...]

## tasks.md
- T-0.5.1 [x] DONE : [oui/non]
- T-0.5.2 [~] PARTIAL : [oui/non]
- Section Sprint 2.22 delivered : [oui/non]
- TECH-DEBT T222-A..D inscrits : [oui/non]

## constitution.md
- Version v0.5.3 : [oui/non]

## Tests finaux : [X verts]
```

---

## CLEANUP DE CE FICHIER (post-merge)

```powershell
Move-Item "CLAUDE_TASK_sprint-2-22-cleanup.md" `
          "claude_prompts\CLAUDE_TASK_sprint-2-22-cleanup.md"
```

Ajouter dans allowlist :
```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-22-cleanup.md",
"claude_prompts/sprint-2-22-cleanup-report.md",
```

Committer :
```
chore(allowlist): add Sprint 2.22 cleanup claude_prompts paths
```

---

*Fin du CLAUDE_TASK -- Sprint 2.22 Cleanup*
*Genere le 2026-05-28*
