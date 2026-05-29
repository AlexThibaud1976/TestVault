# CLAUDE_TASK -- TECH-DEBT-T2213-B : Supprimer code mort AiSuggestTestsModal + ReplaceOrAppendModal

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `tech-debt/T2213-B`
**Pattern :** B -- Code Implementation (TDD strict)
**Duree estimee :** 30-45 min
**Source :** sprint-2-21-part-3-code-report.md TECH-DEBT-T2213-B

---

## CONTEXTE

Sprint 2.21 part 3 a livre `SuggestTestsDrawer` et `SuggestStepsDrawer` qui remplacent
respectivement `AiSuggestTestsModal` et `ReplaceOrAppendModal` dans l'UI.
Les deux anciens composants ont ete conserves pour ne pas casser
`T-2.21-ai-generation-flow.test.ts` qui les referencait encore.

Ce sprint :
1. Met a jour `T-2.21-ai-generation-flow.test.ts` pour tester le vrai comportement actuel
   (Drawers, pas les anciens Modals).
2. Supprime `AiSuggestTestsModal.tsx` et `ReplaceOrAppendModal.tsx`.
3. Verifie qu'aucune autre reference n'existe.

Risque si non traite : le code mort grossit, les futurs LLMs (ou Claude Code) peuvent
se baser sur ces composants obsoletes pour de nouveaux developpements.

---

## REGLES NON-NEGOCIABLES

- TDD strict : d'abord migrer le test (le faire passer sur les nouveaux composants),
  PUIS supprimer le code mort.
- `pnpm test --run` vert apres chaque commit.
- Pas de push, pas de PR automatique.
- NE PAS modifier la logique metier -- uniquement supprimer le code mort et migrer les tests.

---

## PRE-FLIGHT

```bash
git checkout main && git pull origin main
pnpm test --run
# Attendu : >= 567 tests verts

# Verifier l'etendue exacte du code mort
grep -rn "AiSuggestTestsModal\|ReplaceOrAppendModal" \
  apps/argos-extension/src/ tools/regression/ \
  --include="*.ts" --include="*.tsx"
# Documenter TOUS les fichiers qui referencent ces composants
# avant de toucher quoi que ce soit

# Verifier que les fichiers cibles existent bien
find apps/argos-extension/src -name "AiSuggestTestsModal*" -o -name "ReplaceOrAppendModal*"
```

**Si le grep revele des imports actifs en dehors des tests** (ex: CoveragePanel.tsx
ou TestCaseFormView.tsx importent encore ces composants) : STOP.
C'est une regression de Sprint 2.21 part 3 -- documenter dans le rapport et
alerter Alexandre avant de continuer.

**Branche :**
```bash
git checkout -b tech-debt/T2213-B
```

---

## COMMIT 1 -- test(regression): migrate T-2.21-ai-generation-flow to Drawer contracts

**Objectif :** migrer `T-2.21-ai-generation-flow.test.ts` pour qu'il teste
les Drawers actuels au lieu des Modals obsoletes. Le test doit rester
**comportementalement equivalent** -- meme scenarios, nouveaux composants.

**Lire d'abord le fichier existant :**
```bash
cat tools/regression/T-2.21-ai-generation-flow.test.ts
```

**Identifier les assertions qui referencent :**
- `ai-suggest-tests-modal` (testid de AiSuggestTestsModal)
- `replace-or-append-modal` (testid de ReplaceOrAppendModal)
- Imports directs de ces composants

**Remplacer par les equivalents Drawer :**
- `ai-suggest-tests-modal` -> `suggest-tests-drawer` (testid de SuggestTestsDrawer)
- `replace-or-append-modal` -> `suggest-steps-drawer` (testid de SuggestStepsDrawer)
- Imports : supprimer les imports des anciens composants, rien a ajouter
  (les Drawers sont testes via leurs propres tests unitaires)

**Verification apres migration :**
```bash
pnpm test tools/regression/T-2.21-ai-generation-flow.test.ts
# Attendu : VERT (le test passe sur les composants actuels)

pnpm test --run
# Attendu : meme nombre de tests verts qu'avant (pas de perte)
```

Si le test est toujours ROUGE apres migration : investiguer si le testid
`suggest-tests-drawer` est bien present dans CoveragePanel.tsx.
```bash
grep -n "suggest-tests-drawer\|data-testid" \
  apps/argos-extension/src/hub/components/SuggestTestsDrawer/SuggestTestsDrawer.tsx
```

**Commit :**
```
test(regression): migrate T-2.21-ai-generation-flow to Drawer contracts

Replace modal testids with Drawer testids.
AiSuggestTestsModal -> SuggestTestsDrawer
ReplaceOrAppendModal -> SuggestStepsDrawer
Behavior preserved, dead component references removed.
```

---

## COMMIT 2 -- chore(cleanup): delete dead modal components T2213-B

**Verifier une derniere fois avant suppression :**
```bash
grep -rn "AiSuggestTestsModal\|ReplaceOrAppendModal" \
  apps/argos-extension/src/ tools/regression/ \
  --include="*.ts" --include="*.tsx"
# Attendu : 0 resultats (ou uniquement dans les fichiers qu'on va supprimer)
```

**Si 0 resultats hors fichiers cibles : supprimer.**

```bash
# Supprimer les composants morts
rm apps/argos-extension/src/hub/components/AiSuggestTestsModal.tsx
rm apps/argos-extension/src/hub/components/AiSuggestTestsModal.test.tsx  # si existant
rm apps/argos-extension/src/hub/components/ReplaceOrAppendModal.tsx
rm apps/argos-extension/src/hub/components/ReplaceOrAppendModal.test.tsx  # si existant

# Si ces composants ont des index.ts dans des sous-dossiers :
find apps/argos-extension/src -path "*AiSuggestTestsModal*" -o -path "*ReplaceOrAppendModal*"
# Supprimer tout ce qui remonte
```

**Si le grep revele des references residuelles apres COMMIT 1 :**
Corriger chaque fichier avant de supprimer. Ne jamais supprimer un fichier
importe quelque part -- ca casse le build.

**Verification :**
```bash
pnpm build --filter argos-extension
# Attendu : build vert (pas d'import manquant)

pnpm test --run
# Attendu : meme nombre de tests verts ou PLUS
# (les tests des anciens composants disparaissent, les comportements sont couverts par Drawers)

grep -rn "AiSuggestTestsModal\|ReplaceOrAppendModal" apps/ tools/
# Attendu : 0 resultats
```

**Commit :**
```
chore(cleanup): delete AiSuggestTestsModal + ReplaceOrAppendModal (TECH-DEBT-T2213-B)

Dead components replaced by SuggestTestsDrawer + SuggestStepsDrawer in Sprint 2.21 part 3.
T-2.21-ai-generation-flow migrated to Drawer contracts in previous commit.
```

---

## COMMIT 3 -- docs(tasks): TECH-DEBT-T2213-B resolved

**Modifier `Specs/tasks.md` -- mettre a jour l'entree TECH-DEBT-T2213-B :**

REMPLACER :
```markdown
### TECH-DEBT-T2213-B -- Code mort AiSuggestTestsModal + ReplaceOrAppendModal

**Priorite :** HAUTE
**Source :** Sprint 2.21 part 3 ...
**Plan :** supprimer les deux composants + migrer le test de regression
en une seule PR (~30 min). A faire avant Sprint 2.22 suivant.
```

PAR :
```markdown
### TECH-DEBT-T2213-B -- Code mort AiSuggestTestsModal + ReplaceOrAppendModal

**Priorite :** RESOLUE
**Source :** Sprint 2.21 part 3
**Resolution :** sprint tech-debt/T2213-B (2026-05-28) -- composants supprimes,
T-2.21-ai-generation-flow.test.ts migre vers contrats Drawers.
Voir claude_prompts/CLAUDE_TASK_tech-debt-T2213-B.md
```

**Verification :**
```bash
pnpm test --run
```

**Commit :**
```
docs(tasks): TECH-DEBT-T2213-B resolved -- modal dead code removed
```

---

## SCENARIO D'ECHEC

### Imports actifs trouves en dehors des tests

**Symptome :** grep COMMIT 1 revele que CoveragePanel.tsx ou un autre composant
importe encore AiSuggestTestsModal.

**Cause probable :** regression de Sprint 2.21 part 3 -- le refactor vers SuggestTestsDrawer
etait incomplet.

**Resolution :**
1. STOP -- ne pas supprimer.
2. Documenter exactement quels fichiers importent encore les anciens composants.
3. Inclure dans le rapport, alerter Alexandre.
4. La correction (migrer les imports residuels vers Drawers) devient un COMMIT 0
   avant le reste du workflow.

### T-2.21-ai-generation-flow toujours ROUGE apres migration

**Symptome :** les testids `suggest-tests-drawer` ou `suggest-steps-drawer`
ne sont pas trouves dans le rendu.

**Causes possibles :**
1. Les Drawers sont conditionnel (isOpen=false au demarrage du test) -- verifier
   que le test declenche bien la generation avant d'asserter le Drawer.
2. Le testid dans SuggestTestsDrawer.tsx est different de `suggest-tests-drawer` --
   verifier avec grep.
3. ServicesContext manquant dans le test -- verifier le setup du test.

**Ne jamais supprimer les anciens composants tant que ce test est rouge.**

---

## CE QUE TU NE FAIS PAS

- NE PAS modifier la logique metier de SuggestTestsDrawer ou SuggestStepsDrawer.
- NE PAS refactorer CoveragePanel.tsx ou TestCaseFormView.tsx au-dela des
  suppressions d'imports des anciens composants.
- NE PAS supprimer d'autres composants "qui semblent morts" -- scope strict.
- NE PAS pousser ni ouvrir une PR.

---

## RAPPORT FINAL

Produire `claude_prompts/tech-debt-T2213-B-report.md` :

```markdown
# TECH-DEBT-T2213-B -- Code mort -- Report

## Statut : [SUCCES / ECHEC] -- [date]

## Grep pre-suppression
[Resultat exact du grep sur AiSuggestTestsModal + ReplaceOrAppendModal]
[Fichiers qui les referencaient avant COMMIT 1]

## Commits
| # | Hash | Message |
|---|------|---------|
| 1 | ... | test: migrate T-2.21-ai-generation-flow to Drawer contracts |
| 2 | ... | chore: delete AiSuggestTestsModal + ReplaceOrAppendModal |
| 3 | ... | docs: TECH-DEBT-T2213-B resolved |

## Fichiers supprimes
[liste exacte]

## Fichiers modifies
[liste + description]

## Tests
- Avant : X tests verts
- Apres : Y tests verts (delta : [+/-Z -- justification])
- T-2.21-ai-generation-flow : [VERT]
- T-2.22-suggest-tests-coverage-panel : [VERT]

## Grep post-suppression
grep -rn "AiSuggestTestsModal|ReplaceOrAppendModal" : [0 resultats]

## Build post-suppression : [VERT / erreurs : ...]
```

---

## CLEANUP DE CE FICHIER (post-merge)

```powershell
Move-Item "CLAUDE_TASK_tech-debt-T2213-B.md" `
          "claude_prompts\CLAUDE_TASK_tech-debt-T2213-B.md"
```

Ajouter dans allowlist :
```javascript
"claude_prompts/CLAUDE_TASK_tech-debt-T2213-B.md",
"claude_prompts/tech-debt-T2213-B-report.md",
```

Committer :
```
chore(allowlist): add tech-debt-T2213-B claude_prompts paths
```

---

*Fin du CLAUDE_TASK -- TECH-DEBT-T2213-B*
*Genere le 2026-05-28*
