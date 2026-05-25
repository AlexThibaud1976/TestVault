# CLAUDE_TASK : Sprint 2.22 — Code implementation

> **Cible :** Claude Code
> **Date de génération :** lundi 2026-05-25, 8h45
> **Source de vérité :** `Specs/spec.md` (US-1.1, US-5.1, US-5.1.1, F1), `Specs/tasks.md` (Sprint 2.22), `Specs/constitution.md` §10.4
> **Durée estimée :** 6-8h dev
> **Branche cible :** `sprint/2.22-code`

---

## CONTEXTE EXÉCUTIF

Sprint 2.22 livre 3 changements couplés sur le composant `TestCaseFormView` et le `CoveragePanel` :

1. **Bugfix régression Sprint 2.19/2.20** : Area Path + Iteration Path absents du formulaire de création de Test Case (vs spec.md US-1.1 qui les liste comme obligatoires/optionnels). **Blocker BCEE-QA actuel** : la création de TC est partiellement cassée.
2. **Bugfix régression Sprint 2.21 part 1** : le bouton "AI Generate" actuellement dans `TestCaseFormView` crée des WIT à tort (erreur "Area Path manquant" en runtime). Refactor vers la sémantique "AI Suggest Steps" (ne crée aucun WIT, remplit juste la section Steps du formulaire).
3. **Nouvelle feature US-5.1.1 + repositioning** : ajout du bouton "Suggest Tests" sur le Coverage Panel d'une User Story / Bug / Requirement (conformément à T-6.6 / US-5.1, où le bouton aurait toujours dû être).

Ce sprint **NE TOUCHE PAS** : architecture LLM (déjà no-backend depuis Sprint 2.21), schéma WIT, plan.md, constitution.md, manifeste vss-extension.json.

---

## RÈGLES NON-NÉGOCIABLES

### TDD strict (constitution §10.4 — règle déjà en vigueur, pas un amendement)

**Tout bug confirmé en prod ajoute un test à la suite régression AVANT le fix.** Ordre obligatoire :

1. Écrire les tests d'intégration régression (rouges, qui échouent contre le code actuel) → **Commit 1**
2. Implémenter les fixes qui font passer ces tests au vert → **Commits 2-3-4**
3. Vérifier qu'au moins **un commit intermédiaire dans l'historique git montre les tests rouges** avant le passage au vert (pour démontrer la rigueur TDD).

**Si un test passe au vert AVANT que le fix correspondant ait été commité, c'est que le test ne teste pas ce qu'il prétend tester.** Abort, retravaille le test.

### Stack de tests imposée (Specs/plan.md §9)

- **Tests d'intégration** : Vitest + React Testing Library + msw (Mock Service Worker) pour mocker l'API ADO REST.
- **Tests unitaires** : Vitest seul.
- **PAS de Playwright** dans ce sprint (cf. TECH-DEBT-052, à créer dans tasks.md — Playwright sera monté avant Phase 7 T-7.9 Beta privée).

### Stack technique du projet (rappel)

- TypeScript 5.5+ strict mode
- React 18+
- Fluent UI 2 (composants UI)
- pnpm workspaces + Turborepo
- Biome pour lint+format (PAS ESLint, PAS Prettier)
- Commit messages : conventional commits

### Couverture cible (constitution §10.1)

- **90% core / 80% UI**, bloquant en CI.
- Tu vérifies via `pnpm test --coverage` que les nouveaux composants atteignent ces seuils.

### Pas de scope creep

- Tu **ne refactores pas** du code adjacent qui semble perfectible. Si tu vois un truc qui te démange, tu l'écris dans le rapport final "Anomalies relevées" — Alex décide après.
- Tu **ne bumps pas** la version pour ajouter une fonctionnalité non spécifiée.
- Tu **ne touches pas** à la doc Marketplace, au manifeste vss-extension, au licensing.

---

## PRÉREQUIS

Avant de lancer :

- [ ] Tu es sur `main`, à jour avec `origin/main`
- [ ] `git status` propre
- [ ] La PR #96 (Sprint 2.22 spec patch) est bien mergée (vérification : `git log --oneline -10` doit montrer un commit `docs(specs): Sprint 2.22 spec-kit patch...`)
- [ ] `Specs/spec.md` contient bien la section `#### US-5.1.1` (grep le confirme)
- [ ] `Specs/tasks.md` contient bien `### Sprint 2.22` et `### T-2.21-postmortem`

Si l'un de ces prérequis échoue → abort + rapport.

---

## WORKFLOW

### ÉTAPE 0 — Setup branche

```bash
git checkout main
git pull origin main
git checkout -b sprint/2.22-code
```

### ÉTAPE 1 — Reconnaissance code base (lecture seule, 15-20 min)

Tu lis et tu cartographies, **tu ne modifies rien**.

1. **Trouve le fichier `TestCaseFormView.tsx`** (probablement `apps/argos-extension/src/components/TestCaseFormView/TestCaseFormView.tsx` ou similaire). Note son chemin exact.
2. **Trouve le composant `CoveragePanel`** (probablement dans `apps/argos-extension/src/components/CoveragePanel/` ou un widget séparé sous `apps/argos-extension/src/widgets/coverage-panel/`). Note son chemin.
3. **Trouve le composant `AiGenerateModal`** actuel (celui qui appelle le LLM depuis `TestCaseFormView`). Note son chemin.
4. **Trouve le service LLM** (probablement `LlmService`, `AiGenerationService`, ou similaire) et la fonction `generateTestCases()` ou équivalente.
5. **Identifie la fonction qui crée des WIT TestVault.TestCase** (vraisemblablement dans un `TestCaseService` ou `WorkItemClient`). C'est elle qu'il faut **NE PAS appeler** depuis le nouveau bouton "AI Suggest Steps".
6. **Identifie le pattern actuel d'appel à l'API ADO Classification Nodes** s'il existe déjà (pour Area Path / Iteration Path autoré). Si ça n'existe nulle part, tu vas le créer.
7. **Identifie le pattern de tests d'intégration existants** : où sont-ils, comment sont mockés les appels ADO via msw, quelle factory `renderWithProviders` est utilisée. Reproduis ce pattern.
8. **Vérifie la numérotation des bugs existants** dans le dossier des tests régression (typiquement `apps/argos-extension/src/__tests__/regression/` ou `tools/regression/`). Trouve le plus grand `bug-NNN` actuel — tu utiliseras `bug-NNN+1` et `bug-NNN+2`. Remplace les placeholders `bug-051` et `bug-052` du `tasks.md` Sprint 2.22 par les vrais numéros (Alex fera l'ajustement final via PR comment si besoin, mais propose les bons numéros dans ton rapport).

**Livre ce que tu as trouvé dans le rapport final, section "Reconnaissance".**

---

### ÉTAPE 2 — Commit 1 : tests d'intégration régression (RED)

> **Objectif** : démontrer que les régressions existent. Les 3 tests doivent **échouer** contre le code actuel.

#### Test 1 — `bug-NNN-tcform-missing-areapath.integration.test.tsx`

Chemin (à adapter selon ce que tu as trouvé en étape 1) : `apps/argos-extension/src/__tests__/regression/bug-NNN-tcform-missing-areapath.integration.test.tsx`

Comportement attendu du test :

```typescript
describe('Bug NNN — TestCaseFormView missing Area Path / Iteration Path (regression Sprint 2.19/2.20)', () => {
  // Setup : mock ADO Classification Nodes API via msw
  // Render TestCaseFormView en mode "create from list"

  it('renders Area Path dropdown', () => {
    // assertion: getByLabelText(/Area Path/i) is in the document
  });

  it('renders Iteration Path dropdown', () => {
    // assertion: getByLabelText(/Iteration Path/i) is in the document
  });

  it('Area Path is required: save without Area Path shows error', async () => {
    // fill title only
    // click save
    // assertion: error message visible (something like /Area Path is required/i)
    // assertion: no WIT creation API call was made (via msw spy)
  });

  it('Iteration Path is optional: save without Iteration Path succeeds', async () => {
    // fill title + Area Path
    // leave Iteration Path empty
    // click save
    // assertion: WIT creation API was called once with correct payload
  });
});
```

**Ce test doit échouer contre le code actuel** parce que `TestCaseFormView` n'a pas ces champs.

#### Test 2 — `bug-MMM-aibutton-wrong-placement.integration.test.tsx`

Chemin : `apps/argos-extension/src/__tests__/regression/bug-MMM-aibutton-wrong-placement.integration.test.tsx`

```typescript
describe('Bug MMM — AI button wrong placement (regression Sprint 2.21 part 1)', () => {

  describe('CoveragePanel on a User Story', () => {
    it('renders Suggest Tests button', () => {
      // mock une User Story comme contexte WIT
      // render CoveragePanel
      // assertion: getByRole('button', { name: /Suggest Tests/i }) is in document
    });

    it('clicking Suggest Tests opens AiSuggestTestsModal', async () => {
      // click button
      // assertion: modal visible with title /Suggest Test Cases/i
    });
  });

  describe('TestCaseFormView in edit mode', () => {
    it('renders AI Suggest Steps button (NOT AI Generate)', () => {
      // render TestCaseFormView with an existing TC
      // assertion: button text matches /AI Suggest Steps/i (not /AI Generate/i)
    });

    it('clicking AI Suggest Steps does NOT create any new WIT', async () => {
      // mock LLM response with fake steps
      // setup msw spy on POST /_apis/wit/workitems/$TestCase (the WIT creation endpoint)
      // fill title
      // click AI Suggest Steps
      // wait for modal preview to appear
      // click "Accept all"
      // assertion: msw spy was NEVER called (no WIT creation)
      // assertion: form state contains new steps
    });
  });
});
```

**Ce test doit échouer contre le code actuel** parce que (a) le Coverage Panel n'a pas de bouton "Suggest Tests" et (b) le bouton "AI Generate" actuel dans TestCaseFormView tente de créer des WIT.

#### Commit 1

```bash
# Lance les tests pour confirmer qu'ils sont rouges
pnpm test bug-

# Tu DOIS voir des échecs. Si tout est vert, le test ne teste pas ce qu'il devrait.

git add apps/argos-extension/src/__tests__/regression/
git commit -m "test(regression): add bug-NNN, bug-MMM E2E integration tests (RED)

TDD strict per constitution §10.4: regression tests added BEFORE fix.

bug-NNN: TestCaseFormView missing Area Path / Iteration Path fields
        (Sprint 2.19/2.20 regression vs spec.md US-1.1)
bug-MMM: AI button wrong placement
        (Sprint 2.21 part 1 regression vs spec.md T-6.6 / US-5.1)

Both tests currently FAIL against main. They will be made GREEN by
subsequent commits implementing T-2.22.1, T-2.22.2, T-2.22.3.

Refs:
- spec.md US-1.1, US-5.1, US-5.1.1, F1
- tasks.md Sprint 2.22 + T-2.21-postmortem
- constitution.md §10.4 (regression tracking, TDD strict)"
```

---

### ÉTAPE 3 — Commit 2 : T-2.22.1 (Area Path + Iteration Path)

> **Objectif** : faire passer au vert le Test 1 (bug-NNN).

Implémentation détaillée :

1. **Créer le composant `AreaPathSelector`** (ou réutiliser si existant).
   - Props : `value`, `onChange`, `required`, `disabled`.
   - Comportement : **dropdown plat avec full path affiché**. Décision Alex Q1 = option C : pas d'arbre arborescent, pas d'autocomplete plat texte. Un `Dropdown` Fluent UI 2 standard avec, pour chaque option, le texte `TestVault\Sprint 26\QA` (path complet en clair).
   - Source des données : API ADO `_apis/wit/classificationNodes/Areas?$depth=10` (récupère l'arbre complet en une seule requête, dépth max 10 suffit pour 99% des projets).
   - Transformation côté client : aplatir l'arbre récursivement en une liste de paths string. Tri alphabétique par path complet.
   - Caching : appel fait une seule fois par session (mise en cache mémoire dans le service). Pas de refresh automatique.

2. **Créer le composant `IterationPathSelector`** : même pattern qu'`AreaPathSelector` mais sur `_apis/wit/classificationNodes/Iterations`. Optionnel (le composant accepte `value` undefined/null).

3. **Intégrer dans `TestCaseFormView`** :
   - Ajouter les 2 dropdowns dans le formulaire, après le champ Description (ou à l'emplacement logique selon le layout existant).
   - Area Path : **requis** (validation côté client avant save).
   - Iteration Path : **optionnel**.
   - Par défaut (Q1 Alex) : **vides** — l'utilisateur DOIT choisir une Area Path explicitement, pas de valeur "racine du projet" en défaut silencieux.
   - **Exception Q2** : si le formulaire est ouvert depuis le bouton "Suggest Tests" du Coverage Panel (donc avec un WIT source), Area Path et Iteration Path sont **pré-remplis** depuis le WI source mais **modifiables**. À implémenter dans Commit 4.

4. **Mise à jour du service de création de TC** : la fonction qui appelle `POST /_apis/wit/workitems/$TestCase` doit maintenant inclure `System.AreaPath` et (si fourni) `System.IterationPath` dans la payload JSON-Patch.

5. **Tests unitaires complémentaires** :
   - `AreaPathSelector.test.tsx` : 4-5 tests sur le rendu, le tri, la sélection, l'erreur de chargement, le state vide.
   - `IterationPathSelector.test.tsx` : idem (3-4 tests).
   - Couverture cible 80% sur ces 2 composants UI.

6. **Lancer les tests** :
   ```bash
   pnpm test bug-NNN-tcform-missing-areapath
   # → DOIT être vert maintenant
   pnpm test
   # → Aucune régression sur les autres tests (le test bug-MMM est encore rouge, c'est OK pour ce commit)
   ```

#### Commit 2

```bash
git add apps/argos-extension/src/components/AreaPathSelector/
git add apps/argos-extension/src/components/IterationPathSelector/
git add apps/argos-extension/src/components/TestCaseFormView/  # fichiers modifiés
git add apps/argos-extension/src/services/  # service TC modifié

git commit -m "fix(TestCaseFormView): T-2.22.1 add Area Path + Iteration Path fields (bug-NNN)

Restores compliance with spec.md US-1.1 which lists Area Path (required)
and Iteration Path (optional) as Test Case form fields.

These fields were absent from TestCaseFormView since Sprint 2.19/2.20
generalization refactor, blocking Test Case creation on BCEE-QA.

Implementation:
- New AreaPathSelector component: Fluent UI 2 Dropdown, flat list with
  full paths displayed (e.g. 'TestVault\\Sprint 26\\QA'). Data fetched
  once per session from ADO Classification Nodes API.
- New IterationPathSelector component: same pattern, optional.
- TestCaseFormView: integrates both selectors, Area Path required with
  client-side validation before save.
- TestCaseService.create(): includes System.AreaPath and
  System.IterationPath in JSON-Patch payload.

Test bug-NNN-tcform-missing-areapath now passes (was RED in commit 1).
Test bug-MMM-aibutton-wrong-placement still RED (fixed in next commits).

Coverage: AreaPathSelector 85%, IterationPathSelector 82%.

Refs:
- spec.md US-1.1
- tasks.md T-2.22.1
- bug-NNN regression test (commit 1)"
```

---

### ÉTAPE 4 — Commit 3 : T-2.22.2 (Refactor bouton AI dans TestCaseFormView, sémantique steps-only)

> **Objectif** : transformer l'actuel bouton "AI Generate" dans `TestCaseFormView` en bouton "AI Suggest Steps" avec une sémantique steps-only (aucune création de WIT).

Implémentation :

1. **Renommer le bouton** :
   - Texte : `AI Generate` → `✨ AI Suggest Steps`
   - L'icône sparkles `✨` est conservée si déjà présente, sinon ajoutée.

2. **Activation conditionnelle (Q7 Alex — lecture souple)** :
   - Bouton actif si (`title.trim().length > 0` **OU** `linkedRequirements.length > 0`).
   - Sinon désactivé avec tooltip : *"Saisis un titre ou lie une exigence pour activer la suggestion AI"*.

3. **Remplacer `AiGenerateModal` par `AiSuggestStepsModal`** :
   - **Ne pas supprimer `AiGenerateModal`** : il va migrer dans le Coverage Panel à l'étape 5 (commit 4). À ce stade tu peux soit le dupliquer puis renommer le nouveau, soit le déplacer dans un emplacement neutre `apps/argos-extension/src/components/ai/AiGenerateTestsModal.tsx` pour le réutiliser dans Coverage Panel ensuite. Ton choix selon ce qui est plus propre.
   - `AiSuggestStepsModal` : nouveau composant, **dédié steps-only**, qui :
     - Prend en props `currentFormState` (title, description, tags, priority, areaPath, linkedWIs).
     - À l'ouverture, déclenche un appel LLM avec un **nouveau system prompt** dédié à la génération de steps uniquement (pas de title/description/tags génération).
     - Affiche N steps proposés (N configurable 1-15, défaut 5) éditables inline (`{action, expected}`).
     - Boutons : "Accept" / "Cancel".

4. **Nouveau system prompt "steps generator"** :
   - À ajouter dans le fichier qui contient déjà les autres system prompts LLM (probablement `apps/argos-extension/src/services/llm/prompts.ts` ou similaire).
   - Le prompt doit demander explicitement au LLM de **NE PAS** générer de title, description, tags ou structure WIT. Uniquement la liste `[{action, expected}]`.
   - Format de sortie JSON strict, schéma `{ steps: [{ action: string, expected: string }] }`.
   - Tu peux te baser sur le system prompt existant `generateTestCases` et le simplifier.

5. **Contexte source envoyé au LLM (Q5 Alex — option C)** :
   - title + description + tags + priority + areaPath (en hint domaine) + pour chaque exigence liée : titre + description + criteria d'acceptance.
   - **Ne JAMAIS** envoyer d'autres données du projet (no exfiltration latérale, conformément à F1).

6. **Gestion des steps existants (Q6 Alex — modal Remplacer / Compléter / Annuler)** :
   - À la validation du `AiSuggestStepsModal` :
     - Si `formState.steps.length === 0` → appliquer directement les nouveaux steps.
     - Sinon → ouvrir une seconde modal `ReplaceOrAppendModal` avec 3 boutons :
       - **Remplacer** : `formState.steps = newSteps`
       - **Compléter** : `formState.steps = [...formState.steps, ...newSteps]` (avec re-indexation correcte des `index`)
       - **Annuler** : retour à la preview du `AiSuggestStepsModal`, rien n'est modifié.

7. **Aucune création de WIT** :
   - Le bouton ne touche **jamais** au service `TestCaseService.create()` ni à aucune route POST `/_apis/wit/workitems`.
   - Le résultat de la génération met à jour **uniquement** le state local du formulaire React.
   - L'utilisateur doit explicitement cliquer "Create Test Case" / "Save" pour persister (comme avant).

8. **Gestion des erreurs** :
   - Clé LLM invalide → message "Vérifie ta clé API LLM dans Settings".
   - LLM down / timeout → message "Le provider LLM n'a pas répondu. Réessaie plus tard."
   - `finish_reason === 'length'` → toast "Réponse tronquée par max_tokens. Augmente le réglage dans Settings ou demande moins de steps." (cohérent avec Sprint 2.21 part 2 max_tokens).
   - Dans tous les cas d'erreur, **les steps existants ne sont pas modifiés**.
   - Événement journalisé dans `TestVault.AuditLog` (clé tronquée 4 derniers caractères).

9. **Tests unitaires + intégration** :
   - `AiSuggestStepsModal.test.tsx` : 5-7 tests sur le rendu, l'appel LLM, le succès, l'échec, la troncature, l'édition inline.
   - `ReplaceOrAppendModal.test.tsx` : 3 tests sur les 3 actions.
   - `TestCaseFormView.ai-button.test.tsx` : 4 tests sur activation conditionnelle (title only, lien only, les deux, ni l'un ni l'autre).
   - Couverture cible 80% UI / 90% sur les services.

10. **Lancer le test régression bug-MMM partie TestCaseFormView** :
    ```bash
    pnpm test bug-MMM
    # → Le test "TestCaseFormView in edit mode" doit maintenant être vert.
    # → Le test "CoveragePanel on a User Story" est encore rouge (fixé en commit 4).
    ```

#### Commit 3

```bash
git add apps/argos-extension/src/components/ai/
git add apps/argos-extension/src/components/TestCaseFormView/
git add apps/argos-extension/src/services/llm/

git commit -m "feat(TestCaseFormView): T-2.22.2 AI Suggest Steps (steps-only, no WIT creation)

Refactors the AI button in TestCaseFormView from 'AI Generate' (which
incorrectly tried to create new WITs and failed with 'Area Path missing'
error on BCEE-QA) to 'AI Suggest Steps' which only fills the Steps
section of the current form.

Implements spec.md US-5.1.1 (new user story added in PR #96).

Implementation:
- New AiSuggestStepsModal: dedicated steps-only generation flow.
- New 'steps-generator' system prompt: focused on {action, expected}[]
  output, no title/description/tags generation.
- Conditional activation (Q7 Alex, lenient reading): button enabled if
  (title set OR at least 1 requirement link). Disabled with explanatory
  tooltip otherwise.
- Replace-or-Append modal when existing steps present (Q6 Alex).
- LLM context (Q5 Alex option C): title + description + tags + priority
  + area path + linked WIs full content.
- NO WIT creation: button updates local form state only.
- Error handling: invalid key, LLM down, truncation (finish_reason).
- AuditLog entry on each call (key truncated to last 4 chars).

Test bug-MMM (TestCaseFormView part) now passes.
Test bug-MMM (CoveragePanel part) still RED (fixed in commit 4).

Coverage: AiSuggestStepsModal 84%, ReplaceOrAppendModal 88%.

Refs:
- spec.md US-5.1.1, F1
- tasks.md T-2.22.2
- decisions Q4-Q7 validées 2026-05-22 evening"
```

---

### ÉTAPE 5 — Commit 4 : T-2.22.3 (Bouton "Suggest Tests" dans Coverage Panel)

> **Objectif** : faire passer au vert la partie CoveragePanel du test bug-MMM. Implémente US-5.1 et T-6.6 (qui avaient toujours dit "bouton dans Coverage Panel" mais n'avaient jamais été correctement appliqués).

Implémentation :

1. **Modifier `CoveragePanel`** :
   - Ajouter un bouton `✨ Suggest Tests` dans le header du panel, visible uniquement quand le WI hôte est de type `User Story`, `Bug`, ou `Requirement` (et **PAS** sur `Test Case`, `Task`, etc.).
   - Activation conditionnelle : bouton actif si l'AI est globalement activée (cf. US-6.5) **ET** une clé LLM BYOK est configurée.
   - Si désactivé : tooltip explicatif.

2. **Au clic** : ouvrir une modal `AiSuggestTestsModal` (probablement issue de la migration/dédoublonnage de l'ancien `AiGenerateModal` qui était dans `TestCaseFormView`).
   - Source implicite : Work Item ADO courant (récupéré via SDK ADO `getWorkItem(id)`).
   - **PAS de picker** : c'est implicite que la source est le WI sur lequel le panel s'affiche.

3. **Modal preview** :
   - Affiche N Test Cases candidats (titre, steps, expected results) — N configurable, défaut 3-7.
   - Chaque TC est éditable inline.
   - Sélection individuelle ou en bloc ("Accept all", "Reject all", "Accept selected").
   - **Area Path / Iteration Path pré-remplis** depuis le WI source (Q2 Alex), modifiables par dropdown dans la modal (réutilisation des composants `AreaPathSelector` / `IterationPathSelector` du Commit 2).

4. **À acceptation** :
   - Création de N `TestVault.TestCase` WITs (via `TestCaseService.create()` — réutilise le code existant).
   - Création des liens `Tested By` du nouveau TC vers le WI source.
   - Toast de succès "3 Test Cases created and linked to {WI.title}".

5. **Gestion erreurs** : identique au Commit 3 (clé invalide, LLM down, truncation).

6. **Tests unitaires + intégration** :
   - `CoveragePanel.suggest-tests-button.test.tsx` : 3-4 tests (rendu sur US/Bug/Requirement, NON-rendu sur Test Case, activation conditionnelle).
   - `AiSuggestTestsModal.test.tsx` : 5-7 tests (flow complet, héritage Area Path, accept/reject).
   - Couverture cible 80% UI / 90% services.

7. **Lancer la suite complète des tests régression** :
   ```bash
   pnpm test bug-
   # → Les 2 tests bug-NNN et bug-MMM doivent maintenant être 100% verts.
   pnpm test
   # → Aucune régression sur l'ensemble du suite (372+ tests précédents).
   ```

#### Commit 4

```bash
git add apps/argos-extension/src/components/CoveragePanel/
git add apps/argos-extension/src/components/ai/
git add apps/argos-extension/src/widgets/  # si CoveragePanel est un widget

git commit -m "feat(CoveragePanel): T-2.22.3 add Suggest Tests button (US-5.1 alignment)

Adds the 'Suggest Tests' button to the Coverage Panel on User Story,
Bug, and Requirement work items. This is where the button should have
been since Sprint 2.21 part 1 (per T-6.6 / US-5.1), but was incorrectly
placed in TestCaseFormView.

Implements spec.md US-5.1 (architecture aligned with no-backend in PR #96).

Implementation:
- CoveragePanel header: 'Suggest Tests' button visible only on US/Bug/
  Requirement, hidden on Test Case and other WIT types.
- Activation: requires AI globally enabled (US-6.5) + LLM BYOK configured.
- AiSuggestTestsModal: source WI implicit (no picker), preview of 3-7
  TC candidates, each editable inline, accept individually or in bulk.
- Area Path / Iteration Path pre-filled from source WI (Q2 Alex),
  modifiable via dropdown using AreaPathSelector/IterationPathSelector
  from commit 2.
- On accept: creates TestVault.TestCase WITs + 'Tested By' links to
  source WI.
- Error handling: invalid key, LLM down, truncation (consistent with
  T-2.22.2).

Test bug-MMM (CoveragePanel part) now passes. Full regression suite
green: 2 new regression tests + all 372+ pre-existing tests.

Coverage: AiSuggestTestsModal 86%, CoveragePanel updates 81%.

Refs:
- spec.md US-5.1, F1
- tasks.md T-2.22.3, T-6.6
- decision Q2 Alex 2026-05-22 evening"
```

---

### ÉTAPE 6 — Commit 5 : T-2.22.4 (Documentation update)

> **Objectif** : conformité avec la règle Alex "documentation à jour à chaque changement".

Fichiers à mettre à jour :

1. **`docs/user-guide.md`** :
   - Section "AI Features" : réécrire pour distinguer les 2 boutons :
     - "Generate Test Cases from a Requirement" → depuis le Coverage Panel sur User Story / Bug / Requirement.
     - "Suggest Steps for current Test Case" → depuis le formulaire d'un Test Case en cours d'édition.
   - **Note BREAKING CHANGE** explicite : *"Depuis Sprint 2.22, le bouton AI dans le formulaire de Test Case ne crée plus de nouveaux Test Cases. Pour générer des TC entiers à partir d'une exigence, utilise le Coverage Panel."*
   - Idéalement 2 captures d'écran (mais SI ALEX N'A PAS DE CAPTURES À DISPO, juste ajoute un placeholder `<!-- TODO Alex: ajouter screenshot du bouton sur Coverage Panel -->` et liste les screenshots à faire dans le rapport final).

2. **`docs/operator-guide.md`** :
   - Section troubleshooting : ajouter 2 entrées
     - "AI button greyed out in Test Case form" → expliquer le tooltip (titre ou lien exigence requis).
     - "Where did the AI button go?" → expliquer le split en 2 boutons.

3. **`README.md` racine** :
   - Mise à jour de la features list si elle mentionne "AI Generation" : préciser les 2 surfaces (TestCaseFormView pour steps-only, Coverage Panel pour TC complets).

4. **`CHANGELOG.md`** :
   - Ajouter une entrée Sprint 2.22 avec en **gras** : `**BREAKING CHANGE**: AI button in TestCaseFormView no longer creates Test Cases. Use Coverage Panel to generate TCs from a requirement.`

#### Commit 5

```bash
git add docs/ README.md CHANGELOG.md

git commit -m "docs: T-2.22.4 update user-guide, operator-guide, README, CHANGELOG

Documents Sprint 2.22 changes:
- New AI Suggest Steps button in TestCaseFormView (steps-only)
- Repositioned Suggest Tests button in Coverage Panel (TC creation)
- Area Path / Iteration Path now present in TC form

Includes explicit BREAKING CHANGE notice for users migrating from
Sprint 2.21 part 1.

Refs:
- tasks.md T-2.22.4
- Alex rule: 'documentation mise à jour à chaque changement'"
```

---

### ÉTAPE 7 — Commit 6 : T-2.22.5 (Audit deps + APIs)

> **Objectif** : conformité avec les règles Alex sur dépendances et APIs externes.

Actions :

1. **`pnpm audit --audit-level=high`** : doit être clean (0 vulnerability HIGH ou CRITICAL).
   - Si des vulnérabilités sont remontées : tente `pnpm update --recursive` sur les packages concernés.
   - Si ça ne suffit pas : **NE PAS** tenter de fix automatique aveugle. Liste les vulnérabilités dans le rapport final et laisse Alex décider.

2. **`pnpm outdated`** : revue rapide.
   - Mise à jour des deps **mineures et patch** sûres (uniquement les `^x.y.z` qui ont un nouveau `x.y.z+1` patch).
   - **NE PAS** faire de major bump dans ce sprint (ce n'est pas le scope).
   - Logger ce qui a été updaté dans le rapport.

3. **Smoke test APIs externes** :
   - Si tu as accès à un script `tools/smoke-test/` ou équivalent, lance-le.
   - Sinon, juste documenter ce check comme "à faire manuellement par Alex" dans le rapport :
     - ADO REST API `/_apis/wit/classificationNodes/Areas` : ping → 200 OK
     - Azure OpenAI `/openai/deployments/{id}/chat/completions` : smoke test léger (1 token)
     - Azure AI Foundry `/openai/v1/chat/completions` : idem

4. **LLM models deprecation check** :
   - Ouvre `ARGOS_LLM_PROVIDERS_REFERENCE.md` et `ARGOS_LLM_PROVIDERS_REFERENCE_PATCH_v1_1.md` (cf. project files).
   - Vérifie que les modèles par défaut Argos (`gpt-4o`, `gpt-4.1`, etc.) ne sont pas marqués deprecated.
   - Si l'un est deprecated → notice à ajouter au CHANGELOG (mais NE PAS update le défaut dans le code, c'est un sprint à part).

#### Commit 6

```bash
git add .  # ce qui a bougé dans pnpm-lock.yaml ou package.json

git commit -m "chore(deps): T-2.22.5 audit + minor/patch updates

- pnpm audit --audit-level=high: clean
- pnpm outdated: updated X minor and Y patch versions (see below)
- ADO REST + Azure OpenAI + Foundry smoke tests: [pending manual run by Alex]
- LLM models deprecation check: no deprecation detected in current defaults

Updated packages:
- (list whatever was bumped)

Refs:
- constitution.md §10.5
- tasks.md T-2.22.5"
```

> **Si rien ne bouge**, ce commit peut être vide (`git commit --allow-empty`) avec un message documentant que le check a été fait et que tout est clean.

---

### ÉTAPE 8 — Commit 7 (final) : version bump + CHANGELOG finalisation

1. **Bump de version** : `0.5.28.1` → `0.5.29` (minor bump parce qu'on ajoute une feature US-5.1.1).
   - `package.json` racine
   - `apps/argos-extension/package.json`
   - `apps/argos-extension/vss-extension.json`
   - Tout autre package qui suit le versioning lié (cf. plan.md §1.3).

2. **CHANGELOG.md** : finaliser l'entrée Sprint 2.22 avec la version `0.5.29` et la date.

#### Commit 7

```bash
git add package.json apps/argos-extension/package.json apps/argos-extension/vss-extension.json CHANGELOG.md

git commit -m "chore(release): bump 0.5.28.1 → 0.5.29 (Sprint 2.22)

Sprint 2.22 delivers:
- T-2.22.1: Area Path + Iteration Path fields in TestCaseFormView
- T-2.22.2: AI Suggest Steps button refactor (steps-only semantics)
- T-2.22.3: Suggest Tests button repositioned to Coverage Panel
- T-2.22.4: documentation update with BREAKING CHANGE notice
- T-2.22.5: dependency audit clean
- T-2.21-postmortem: 2 regression tests added (bug-NNN, bug-MMM)

Minor bump because US-5.1.1 is a new user-facing feature.

Refs:
- spec.md US-1.1, US-5.1, US-5.1.1
- tasks.md Sprint 2.22 + T-2.21-postmortem"
```

---

### ÉTAPE 9 — Rapport final

Écris dans un fichier `sprint-2.22-code-report.md` à la racine du repo (mais **NE PAS le commiter** — c'est juste pour qu'Alex le lise) :

1. **Statut global** : ✅ SUCCESS ou ❌ FAILED
2. **Reconnaissance code base (étape 1)** :
   - Chemin exact de `TestCaseFormView`
   - Chemin exact de `CoveragePanel`
   - Chemin du service LLM
   - Pattern actuel de tests d'intégration (où, comment)
   - Numérotation bugs utilisée (NNN et MMM = ?)
3. **Commits créés** : liste des 7 commits avec SHA court et résumé.
4. **Couverture** : `pnpm test --coverage` final, % core et UI.
5. **Tests régression** : confirmation que bug-NNN et bug-MMM sont verts.
6. **pnpm audit** : output.
7. **Anomalies relevées** :
   - Code que tu as trouvé douteux mais que tu n'as pas touché (scope creep prevention).
   - Références dans le code qui ne matchent plus avec spec.md (potentiellement orphelines).
   - Choix de design que tu as dû faire sans guidance claire (et lesquels).
8. **Test BCEE-QA manuel à faire par Alex (T-2.22.6)** : liste des 4 scenarios à valider manuellement après merge.
9. **Instructions PR** :
   ```
   git push -u origin sprint/2.22-code
   Ouvrir PR sur main avec template incluant les références spec/tasks.
   ```

---

## SCÉNARIO D'ÉCHEC

Si un commit ne fait pas passer le test attendu au vert (ex: après commit 2, bug-NNN reste rouge), **n'enchaîne pas** sur le commit suivant.

1. `git status` pour voir l'état.
2. Lance `pnpm test --reporter verbose bug-NNN` pour voir les détails de l'échec.
3. Analyse, corrige le code (ou le test si tu réalises qu'il testait mal).
4. Re-tente.

**Pas plus de 3 tentatives** sur un même commit avant d'écrire un rapport d'échec partiel et de t'arrêter. Alex tranchera.

---

## CE QUE TU NE FAIS PAS

- ❌ Tu ne touches pas à `Specs/` (déjà patché en PR #96).
- ❌ Tu ne touches pas au schéma WIT (`testvault-wit-schema/`).
- ❌ Tu ne touches pas au manifeste `vss-extension.json` SAUF pour le bump de version (commit 7).
- ❌ Tu ne touches pas au licensing, Stripe, OAuth.
- ❌ Tu ne pousses pas sur `origin` ni n'ouvres de PR — Alex le fait à la main après revue du rapport.
- ❌ Tu ne refactores pas de code adjacent qui te semble douteux — tu le signales dans le rapport.
- ❌ Tu ne crées pas TECH-DEBT-052 (Playwright deadline) dans `tasks.md` — c'est une discussion en chat avec Alex, pas un commit autonome.

---

## FIN

Si tu vas jusqu'à l'étape 9 sans abort, Sprint 2.22 code est implémenté. Alex prendra le relais pour push + PR + validation manuelle BCEE-QA (T-2.22.6) + merge + tag éventuel.
