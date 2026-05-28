# CLAUDE_TASK -- Sprint 2.21 part 3 : Cleanup post-merge + patch tasks.md

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `main` (operations directement sur main, pas de branche feature)
**Pattern :** A -- Spec Patch + Allowlist code fix
**Duree estimee :** 30-45 min
**Source :** rapport sprint-2-21-part-3-code-report.md + analyse session 2026-05-28

---

## CONTEXTE EXECUTIF

Sprint 2.21 part 3 merge sur main (branche `sprint/2.21-part-3`). Trois operations
post-merge obligatoires avant le prochain sprint :

1. **Cleanup fichiers** : CLAUDE_TASK + rapport a deplacer vers `claude_prompts/`
   et inscrire dans l'allowlist (sinon CI casse au prochain `pnpm test`).
2. **Patch tasks.md** : T-5.1 marquee PARTIAL (pas DONE), 6 TECH-DEBT a inscrire,
   reference `testpulse-ui-shared` a nettoyer.
3. **Patch constitution.md** : une ligne du changelog a ajouter pour tracer Sprint 2.21 part 3.

Sans ce cleanup, le prochain sprint partira avec :
- des tests CFG-*/LLM-* qui pourraient peter si les chemins claude_prompts/ manquent
- tasks.md qui ment sur l'etat de T-5.1
- 6 TECH-DEBT invisibles qui vont ressurgir comme "problemes inconnus"

---

## REGLES NON-NEGOCIABLES

- Patches atomiques sur les 4 fichiers spec-kit : un fichier = un commit.
- Verifier `pnpm test --run` apres CHAQUE commit. Si rouge : STOP.
- Conventional commits. Format : verifier `git log --oneline -10`.
- Pas de push, pas de PR automatique.
- NE PAS modifier spec.md ni plan.md dans ce sprint -- hors scope.
- NE PAS corriger les TECH-DEBT (A-F) -- seulement les inscrire.

---

## PRE-FLIGHT

```bash
# Verifier qu'on est bien sur main post-merge
git branch --show-current
# Attendu : main

git log --oneline -5
# Verifier que le commit de merge sprint/2.21-part-3 est visible

pnpm test --run
# Attendu : 553 tests verts (ou plus si d'autres commits sont passes)
```

Si les tests sont rouges avant de commencer : STOP, documenter la cause dans le rapport.

---

## WORKFLOW DETAILLE

### COMMIT 1 -- chore(allowlist): add Sprint 2.21 part 3 claude_prompts paths

**Operations fichiers AVANT le commit :**

```powershell
# Depuis la racine E:\Code\TestVault\

# Deplacer le CLAUDE_TASK (probablement a la racine Specs/ ou racine repo)
# Chercher d'abord :
Get-ChildItem -Recurse -Filter "CLAUDE_TASK_sprint-2-21-part-3*" | Select FullName

# Deplacer vers claude_prompts/
Move-Item -Path "CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md" `
          -Destination "claude_prompts\CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md" `
          -ErrorAction SilentlyContinue

# Le rapport est deja dans claude_prompts/ selon le rapport de Claude Code
# Verifier :
Test-Path "claude_prompts\sprint-2-21-part-3-code-report.md"
# Si False : le deplacer depuis son emplacement actuel
```

**Modifier `tools/regression/allowlist.cjs` :**

Trouver la section des entrees existantes (chercher le dernier path `claude_prompts/` deja present)
et ajouter apres :

```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md",
"claude_prompts/sprint-2-21-part-3-code-report.md",
```

**Modifier `tools/regression/allowlist.ts` :**

Meme ajout, syntaxe TypeScript du fichier existant (verifier si c'est un array, un Set, un export const...).

**Verification avant commit :**
```bash
pnpm test --run
# Attendu : VERT. Si CFG-* ou LLM-* rouge apres ajout allowlist : verifier la syntaxe exacte.
```

**Commit :**
```
chore(allowlist): add Sprint 2.21 part 3 claude_prompts paths

- claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md
- claude_prompts/sprint-2-21-part-3-code-report.md
```

---

### COMMIT 2 -- docs(tasks): T-5.1 PARTIAL + Sprint 2.21 part 3 delivered

**Modifier `Specs/tasks.md` -- PATCH 1 : T-5.1 PARTIAL**

REMPLACER :
```markdown
### T-5.1 -- Champ Gherkin dans le Test Case + UI editeur ROUGE

[ref] `plan.md` S3.3

- [ ] Champ `TestVault.Gherkin` ajoute au schema
- [ ] Custom Control pour edition Gherkin avec coloration syntaxique (Monaco editor)
- [ ] Validation syntaxe Gherkin

**Done quand :**
- [ ] Edition Gherkin avec coloration et validation
- [ ] Tests
```

PAR :
```markdown
### T-5.1 -- Champ Gherkin dans le Test Case + UI editeur ROUGE

[ref] `plan.md` S3.3

- [x] Champ `TestVault.Gherkin` ajoute au schema
- [~] Custom Control pour edition Gherkin avec Monaco editor
      PARTIAL -- Monaco livre (Sprint 2.21 part 3, v0.5.31),
      coloration syntaxique Gherkin non native (Monaco plaintext mode).
      Voir TECH-DEBT-T2213-D pour plan de remediation.
- [~] Validation syntaxe Gherkin
      PARTIAL -- validation structurelle basique uniquement (pas de grammar Gherkin complete).

**Done quand :**
- [~] Edition Gherkin avec Monaco : PARTIAL (voir ci-dessus)
- [x] Tests (553 tests verts, GherkinEditor.test.tsx + T-2.21-part-3-gherkin-editor.test.ts)

**Note :** T-5.1 est UNBLOCKED pour T-5.2 (parser bidirectionnel). La coloration
syntaxique est UX, pas fonctionnelle pour la sync repo. Reactiver [x] quand
TECH-DEBT-T2213-D est resolu.
```

**Modifier `Specs/tasks.md` -- PATCH 2 : Sprint 2.21 part 3 delivered**

Trouver la section "Sprint 2.21 part 2" existante (ajoutee dans le SPECS_PATCH 2026-05-22)
et AJOUTER APRES (nouvelle section) :

```markdown
### Sprint 2.21 part 3 -- Drawer UX + Monaco Gherkin editor (DELIVERED v0.5.31)

[ref] `claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md`
[ref] `claude_prompts/sprint-2-21-part-3-code-report.md`

**Livre le 2026-05-28** -- v0.5.30 -> v0.5.31

**Perimetre livre :**
- [x] SuggestTestsDrawer : Drawer multi-step pour review des TCs generes (Coverage Panel)
      Accept All / Accept Selected / edition par TC avant acceptation / Dismiss
- [x] SuggestStepsDrawer : Drawer pour review des steps generes (TestCaseFormView)
      Replace / Complete / Cancel -- wrapper UX sur logique Sprint 2.22
- [x] GherkinEditor : Monaco editor pour champ TestVault.Gherkin (T-5.1 PARTIAL)
- [x] +18 tests regression (553 total) -- T-2.21-part-3-drawer-suggest-tests,
      T-2.21-part-3-drawer-suggest-steps, T-2.21-part-3-gherkin-editor
- [x] Documentation : user-guide (sections Drawer + Gherkin), operator-guide (Monaco bundle)

**Ecarts vs CLAUDE_TASK documentes :**
- Chemins reels differents (CoveragePanel.tsx pas dans sous-dossier)
- Bump etendu a 15 package.json (Changesets fixed mode)
- testpulse-ui-shared inexistant dans le repo (voir TECH-DEBT-T2213-F)
- AiSuggestTestsModal conserve comme code mort (voir TECH-DEBT-T2213-B)

**TECH-DEBT identifies (a traiter dans sprints dedies) :**
- TECH-DEBT-T2213-A : HIGH tmp@0.2.5 via exceljs (preexistante sur main)
- TECH-DEBT-T2213-B : code mort AiSuggestTestsModal + ReplaceOrAppendModal
- TECH-DEBT-T2213-C : 8 MODERATE dompurify via Monaco
- TECH-DEBT-T2213-D : Monaco en plaintext (pas de coloration Gherkin native)
- TECH-DEBT-T2213-E : pas de lazy loading Monaco
- TECH-DEBT-T2213-F : reference testpulse-ui-shared obsolete dans tasks.md
```

**Verification avant commit :**
```bash
pnpm test --run
# Attendu : VERT. tasks.md est un fichier .md non execute -- verifier
# surtout que les tests CFG/LLM restent verts (pas d'effet de bord grep).
```

**Commit :**
```
docs(tasks): T-5.1 PARTIAL + Sprint 2.21 part 3 delivered

- T-5.1: [~] PARTIAL -- Monaco livre, coloration Gherkin non native (TECH-DEBT-T2213-D)
- Sprint 2.21 part 3: section delivered ajoutee avec 6 TECH-DEBT identifies
- Refs: sprint-2-21-part-3-code-report.md
```

---

### COMMIT 3 -- docs(tasks): TECH-DEBT section + testpulse-ui-shared cleanup

**Modifier `Specs/tasks.md` -- PATCH 3 : section TECH-DEBT backlog**

Trouver la section "Metriques de progression" (tableau en fin de fichier).
AJOUTER AVANT ce tableau :

```markdown
---

## TECH-DEBT Backlog

> Incidents et dettes techniques identifies en production ou post-sprint.
> Chaque entree = un sprint de remediation potentiel.
> Priorites : HAUTE (bloquer si non resolu avant GA), MOYENNE, BASSE.

### TECH-DEBT-047 -- Idempotency picklists (PENDING)

**Priorite :** HAUTE
**Source :** Bug E2E 2026-05-15, Sprint 2.8 prevu
**Symptome :** `VS402848: The picklist name TestVault-Priority is already in use`
lors d'une reinstallation sans nettoyage prealable.
**Plan :** GET-first + skip-if-exists dans `process-install.ts`.

### TECH-DEBT-052 -- Playwright E2E non active

**Priorite :** MOYENNE
**Source :** decision 2026-05-22 -- msw + RTL uniquement jusqu'a resolution
**Symptome :** couverture E2E reelle manquante sur parcours critiques
**Plan :** activer Playwright quand instance ADO Cloud de test stable disponible.

### TECH-DEBT-053 -- Reformulation test regression LLM deprecation

**Priorite :** BASSE
**Source :** session 2026-05-25
**Symptome :** libelle du test LLM-2026-05-09-gpt41-deprecation ambigu
(documentation utilisateur vs code provider)
**Plan :** reformulation libelle uniquement, pas de logique changee.

### TECH-DEBT-T2213-A -- HIGH tmp@0.2.5 via exceljs

**Priorite :** HAUTE
**Source :** pnpm audit Sprint 2.21 part 3, GHSA-ph9p-34f9-6g65
**Symptome :** vulnerabilite HIGH preexistante sur main via exceljs@4.4.0
(chemins : argos-exporters, argos-importers, argos-functions).
**Plan :** upgrade exceljs (verifier compat tests export/import Sprint 2.19).

### TECH-DEBT-T2213-B -- Code mort AiSuggestTestsModal + ReplaceOrAppendModal

**Priorite :** HAUTE
**Source :** Sprint 2.21 part 3 -- composants remplaces par Drawers mais conserves
pour ne pas casser T-2.21-ai-generation-flow.test.ts.
**Plan :** supprimer les deux composants + migrer le test de regression
en une seule PR (~30 min). A faire avant Sprint 2.22 suivant.

### TECH-DEBT-T2213-C -- 8 MODERATE dompurify via Monaco

**Priorite :** BASSE
**Source :** Sprint 2.21 part 3, monaco-editor@0.55.1 -> dompurify@3.2.7
**Symptome :** 8 MODERATE, patched en dompurify >= 3.4.0.
Risque faible pour notre usage (editeur code, pas rendu markdown attaquant).
**Plan :** surveiller upgrade Monaco ou pin override via pnpm.overrides.

### TECH-DEBT-T2213-D -- Monaco plaintext (pas de coloration Gherkin native)

**Priorite :** MOYENNE
**Source :** Sprint 2.21 part 3, T-5.1 PARTIAL
**Symptome :** Monaco tourne en mode plaintext, pas de coloration syntaxique
Gherkin (Given/When/Then non colores).
**Plan :** enregistrer un Monarch grammar custom pour Gherkin. Sprint UX dedie.
Prerequis T-5.1 complet pour marquer [x].

### TECH-DEBT-T2213-E -- Pas de lazy loading Monaco

**Priorite :** BASSE
**Source :** Sprint 2.21 part 3
**Symptome :** Monaco charge ses workers a la premiere render de la section
"BDD / Gherkin" (collapsible, donc OK pour la majorite des users).
**Plan :** React.lazy() + Suspense si first-open TestCaseFormView devient
un goulot identifie en production.

### TECH-DEBT-T2213-F -- Reference testpulse-ui-shared obsolete

**Priorite :** HAUTE
**Source :** Sprint 2.21 part 3 -- ecart identifie dans le rapport
**Symptome :** tasks.md et le CLAUDE_TASK sprint-2-21-part-3 referencaient
`packages/testpulse-ui-shared/package.json` pour le bump de version.
Ce package n'existe plus dans le repo (renomme ou supprime lors d'une
refactorisation anterieure).
**Plan :** auditer tous les fichiers spec-kit pour eliminer les references
a testpulse-ui-shared. Corriger constitution/spec/plan/tasks en une seule PR.
A traiter avant le prochain sprint touchant au versioning.
```

**Modifier `Specs/tasks.md` -- PATCH 4 : nettoyer reference testpulse-ui-shared**

Chercher dans tasks.md toutes les occurrences de "testpulse-ui-shared" :
```bash
grep -n "testpulse-ui-shared" Specs/tasks.md
```

Pour chaque occurrence trouvee : ajouter un commentaire inline :
```
(TECH-DEBT-T2213-F : ce package n'existe plus dans le repo -- a nettoyer)
```

Ne PAS supprimer les lignes -- les flagger uniquement pour la prochaine session de cleanup.

**Verification avant commit :**
```bash
pnpm test --run
# Attendu : VERT.
```

**Commit :**
```
docs(tasks): TECH-DEBT backlog section + testpulse-ui-shared flagged

- Section TECH-DEBT Backlog ajoutee (T2213-A a F + 047 + 052 + 053)
- References testpulse-ui-shared flaggees TECH-DEBT-T2213-F
```

---

### COMMIT 4 -- docs(constitution): changelog Sprint 2.21 part 3

**Modifier `Specs/constitution.md` -- ajouter une ligne de changelog**

Trouver le bloc "Changelog" en haut du fichier (section des > **Changelog vX.Y.Z**).
AJOUTER en premiere position (avant le changelog v0.5.1 existant) :

```markdown
> **Changelog v0.5.2** : Sprint 2.21 part 3 -- Drawer UX (SuggestTestsDrawer,
> SuggestStepsDrawer) + Monaco GherkinEditor (T-5.1 PARTIAL, TECH-DEBT-T2213-D).
> Cleanup post-merge : allowlist mise a jour, TECH-DEBT backlog initialise dans tasks.md
> (T2213-A a F). Version packages 0.5.31. -- 2026-05-28.
```

Mettre a jour le numero de version en tete du fichier constitution si applicable :
```
> Version 0.5.1 -> Version 0.5.2
```

**Verification avant commit :**
```bash
pnpm test --run
# Attendu : VERT.
```

**Commit :**
```
docs(constitution): v0.5.2 changelog Sprint 2.21 part 3 cleanup
```

---

## VERIFICATION FINALE

```bash
# Bilan complet
pnpm test --run
echo "---"
git log --oneline -6
echo "---"
# Verifier que les deux chemins sont bien dans l'allowlist
grep "sprint-2-21-part-3" tools/regression/allowlist.cjs
grep "sprint-2-21-part-3" tools/regression/allowlist.ts
echo "---"
# Verifier T-5.1 PARTIAL dans tasks.md
grep -A3 "T-5.1" Specs/tasks.md | head -10
echo "---"
# Verifier section TECH-DEBT dans tasks.md
grep "TECH-DEBT-T2213" Specs/tasks.md | wc -l
# Attendu : >= 6 lignes (une par entree A-F)
```

---

## CE QUE TU NE FAIS PAS

- NE PAS corriger les TECH-DEBT (A-F) -- les inscrire uniquement.
- NE PAS supprimer AiSuggestTestsModal.tsx ni ReplaceOrAppendModal.tsx
  (TECH-DEBT-T2213-B -- sprint dedie).
- NE PAS toucher spec.md ni plan.md.
- NE PAS ajouter de coloration Gherkin Monaco (TECH-DEBT-T2213-D -- sprint dedie).
- NE PAS faire pnpm overrides pour dompurify (TECH-DEBT-T2213-C -- a discuter avec Alex).
- NE PAS pousser sur origin ni ouvrir une PR.

---

## RAPPORT FINAL ATTENDU

Produire `claude_prompts/sprint-2-21-part-3-cleanup-report.md` :

```markdown
# Sprint 2.21 part 3 -- Cleanup Report

## Statut global
[SUCCES / ECHEC] -- [date]

## PRE-FLIGHT
- main post-merge : [commit hash visible]
- pnpm test baseline : [X tests verts]

## Commits livres
| # | Hash | Message |
|---|------|---------|
| 1 | ... | chore(allowlist): add Sprint 2.21 part 3 claude_prompts paths |
| 2 | ... | docs(tasks): T-5.1 PARTIAL + Sprint 2.21 part 3 delivered |
| 3 | ... | docs(tasks): TECH-DEBT backlog section + testpulse-ui-shared flagged |
| 4 | ... | docs(constitution): v0.5.2 changelog Sprint 2.21 part 3 cleanup |

## Allowlist
- Chemins ajoutes : [liste]
- Tests CFG/LLM post-ajout : [VERT / problemes : ...]

## tasks.md
- T-5.1 : [PARTIAL correctement marque ou probleme]
- Section TECH-DEBT : [X entrees inscrites]
- testpulse-ui-shared : [X occurrences flaggees]

## constitution.md
- Version : [0.5.1 -> 0.5.2 ou note si non applicable]
- Changelog ajoute : [oui/non]

## Tests finaux
- pnpm test --run : [X tests verts]
```

---

## CLEANUP DE CE FICHIER (post-merge de ce sprint de cleanup)

```powershell
Move-Item -Path "CLAUDE_TASK_sprint-2-21-part-3-cleanup.md" `
          -Destination "claude_prompts\CLAUDE_TASK_sprint-2-21-part-3-cleanup.md"
```

Puis ajouter dans allowlist :
```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-cleanup.md",
"claude_prompts/sprint-2-21-part-3-cleanup-report.md",
```

Et committer :
```
chore(allowlist): add Sprint 2.21 part 3 cleanup claude_prompts paths
```

---

*Fin du CLAUDE_TASK -- Sprint 2.21 part 3 Cleanup*
*Genere le 2026-05-28*
