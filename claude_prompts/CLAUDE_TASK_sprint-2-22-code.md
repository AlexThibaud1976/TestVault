# CLAUDE_TASK -- Sprint 2.22 : WIT Display + Steps CRUD + Coverage Panel Xray-like

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `sprint/2.22-code`
**Version cible :** 0.5.31 -> 0.5.32
**Duree estimee :** 12-15h
**Pattern :** B -- Code Implementation (TDD strict)

**Sources de verite :**
- `Specs/constitution.md` v0.5.2 -- S10.1 TDD, S10.2 doc, S10.4 regressions, S10.5 deps, S10.7 non-regression
- `Specs/spec.md` -- US-5.1 (Suggest Tests), US-6.2 (LLM config), F1 (AI generation), F3 (coverage matrix)
- `Specs/plan.md` -- S3.3 (TestStep schema), S3.6 (custom controls), S5.2 (WIQL coverage)
- `Specs/tasks.md` -- T-0.5.1, T-0.5.2, T-0.5.3 (wiring composants riches)
- `claude_prompts/sprint-2-21-part-3-code-report.md` -- SuggestTestsDrawer + SuggestStepsDrawer livres en v0.5.31

**Decisions injectees (session 2026-05-28) :**
- D-1 : Steps CRUD complet dans TestCaseFormView (add/edit/delete/reorder)
- D-2 : Coverage Panel Xray-like option C (titre + statut + derniere execution + steps count + assigned + priority + Suggest Tests)
- D-3 : Suggest Tests depuis Coverage Panel : fonctionnel avec Area Path herite de la US source
- D-4 : Version bump 0.5.31 -> 0.5.32

---

## CONTEXTE EXECUTIF

v0.5.31 livree et installee sur BCEE-QA. Tests manuels revelent deux gaps :

**Gap 1 -- WIT TestCase ne s'affiche pas dans Argos.**
`TestVault.Steps` est bien alimente (la sauvegarde fonctionne) mais les composants riches
UI ne sont pas wires dans le hub (T-0.5.2 pendante depuis Phase 0.5).
Symptome : on peut creer un TestCase, mais l'ouvrir dans Argos montre un formulaire vide.

**Gap 2 -- Coverage Panel vide.**
Le panneau "Test Coverage" sur les WITs US ne liste aucun TC lie.
La query WIQL (plan.md S5.2) n'est pas implementee cote widget.
Symptome : le panel s'affiche mais ne contient aucune donnee.

Ces deux gaps bloquent tout le reste :
- Impossible de valider le bug Area Path (Coverage Panel bloque T1)
- Impossible de tester Suggest Tests en conditions reelles
- Impossible de demontrer le produit a un client

Ce sprint est le "produit devient utilisable" -- avant il fallait la confiance,
apres on peut faire une vraie demo.

---

## STRUCTURE EN 3 CHECKPOINTS

**CHECKPOINT A (6-7h)** -- WIT Display + Steps CRUD
Inventaire des composants non-wires + wiring dans le hub + Steps CRUD dans TestCaseFormView.

**CHECKPOINT B (3-4h)** -- Coverage Panel Xray-like
Widget coverage-panel : afficher les TCs lies avec donnees riches.

**CHECKPOINT C (2-3h)** -- Suggest Tests depuis Coverage Panel
Brancher le bouton Suggest Tests sur useAiGeneration + Area Path inheritance + SuggestTestsDrawer.

Chaque checkpoint = branche de validation possible si Claude Code doit s'arreter.

---

## REGLES NON-NEGOCIABLES

1. **TDD strict S10.1** : commit test RED avant commit implementation GREEN. Toujours.
2. **Non-regression S10.7** : `pnpm test --run` vert apres CHAQUE commit.
   Si un test existant casse : STOP, investiguer avant de continuer.
3. **Inventaire avant wiring** : lire les composants existants avant de les remplacer.
   NE PAS recrire ce qui existe -- wirer ce qui est la.
4. **No scope creep** : TestExecution, TestPlan, TestSet -- hors scope de ce sprint.
   On wire UNIQUEMENT le TestCase et le Coverage Panel.
5. **Pas de push, pas de PR automatique.**
6. **Termes LLM interdits** : scanner `tools/regression/LLM-*.test.ts` avant tout nouveau
   fichier qui reference des modeles ou providers.

---

## PRE-FLIGHT (v1.3 -- obligatoire avant le premier commit)

### PF-1 : Vulnerabilites
```bash
pnpm audit --audit-level=high
```
- 0 HIGH ou CRITICAL attendu (TECH-DEBT-T2213-A resolue en v0.5.31 via pnpm.overrides)
- Si HIGH detecte : STOP, documenter dans rapport.

### PF-2 : Tests baseline
```bash
git checkout main && git pull origin main
pnpm test --run
```
Attendu : 553 tests verts. Si rouge : STOP, identifier la cause avant de brancher.

### PF-3 : Inventaire des composants existants (CRITICAL)
Avant d'ecrire une seule ligne de code, executer cet inventaire :

```bash
# Composants riches existants dans le repo
find apps/argos-extension/src -name "*.tsx" | xargs grep -l "TestCase\|TestPlan\|TestSet" | sort

# Verifier ce qui est actuellement wires dans App.tsx / les hubs
grep -n "TestCase\|StepsEditor\|StepsList\|TestCaseForm" \
  apps/argos-extension/src/hub/App.tsx \
  apps/argos-extension/src/hub/**/*.tsx 2>/dev/null | head -40

# Verifier l'etat du Coverage Panel widget
find apps/argos-extension/src -path "*/coverage-panel*" -name "*.tsx" | sort
find apps/argos-extension/src -path "*/widgets*" -name "*.tsx" | sort

# Verifier si StepsEditor existe deja
find apps/argos-extension/src -name "*Step*" -o -name "*step*" | grep -v test | sort
```

**Documenter dans le rapport final : liste des composants trouves et leur etat (wired/unwired).**
C'est le delta entre ce qui existe et ce qu'on doit wire.

### PF-4 : Routes API impactees
Ce sprint touche :
- ADO REST WorkItems (`_apis/wit/workitems/{id}?fields=...`) -- fetch TC avec steps
- ADO REST WIQL (`_apis/wit/wiql`) -- query TCs lies via Tested By
- ADO REST WorkItemLinks -- fetch relations d'un WI US
- LLM providers (useAiGeneration existant) -- pour Suggest Tests, PAS de modification

Verifier que le client ADO existant (services/ado-client.ts ou equivalent) expose :
- `fetchWorkItem(id, fields[])` -- pour charger les steps d'un TC
- `queryWiql(query)` -- pour le Coverage Panel
- `getWorkItemRelations(id)` -- pour les liens Tested By

Si ces methodes manquent : les creer en TDD avant les composants qui les consomment.

---

## PREREQUIS DE DEMARRAGE

- `main` a jour, CI verte (commit post-cleanup Sprint 2.21 part 3)
- Version active : 0.5.31
- SuggestTestsDrawer et SuggestStepsDrawer livres et wires (v0.5.31)
- Branche : `git checkout -b sprint/2.22-code`
- PF-3 inventaire execute et documente

---

## CHECKPOINT A -- WIT Display + Steps CRUD

### COMMIT A1 -- test(regression): [RED] T-2.22-testcase-display

**Fichier cree :**
`tools/regression/T-2.22-testcase-display.test.ts`

**Tests a ecrire (TOUS ROUGES) :**

```typescript
describe("T-2.22 TestCase display in Argos hub", () => {

  it("TestCaseFormView renders System.Title from fetched WIT", () => {
    // Mocker fetchWorkItem retournant un TC avec titre
    // Verifier que le titre s'affiche dans le formulaire
  });

  it("TestCaseFormView renders TestVault.Steps as editable list", () => {
    // TC avec steps JSON : [{index:0,action:"Click",expected:"Button clicked"}]
    // Verifier que la liste de steps est rendue (pas le JSON brut)
  });

  it("StepsEditor allows adding a new step", () => {
    // Cliquer "Add Step"
    // Verifier qu'un nouveau step vide apparait dans la liste
  });

  it("StepsEditor allows editing step action", () => {
    // Modifier le champ action d'un step existant
    // Verifier que la valeur est mise a jour
  });

  it("StepsEditor allows editing step expected", () => {
    // Modifier le champ expected
    // Verifier mise a jour
  });

  it("StepsEditor allows deleting a step", () => {
    // Cliquer delete sur un step
    // Verifier que le step disparait de la liste
  });

  it("StepsEditor allows reordering steps via drag or up/down buttons", () => {
    // Deplacer un step (up/down ou drag)
    // Verifier le nouvel ordre
  });

  it("saving TestCase serializes steps to TestVault.Steps JSON", () => {
    // Modifier les steps, sauvegarder
    // Verifier que le payload PATCH envoye a ADO contient
    // TestVault.Steps = JSON.stringify(steps) correct
  });

  it("backward compat -- TC without steps renders empty steps list (not crash)", () => {
    // TC avec TestVault.Steps = null ou ""
    // Verifier que le composant s'affiche sans erreur
  });

  it("TestVault.Priority picklist renders correctly", () => {
    // Verifier que le champ Priority (1-4) s'affiche en dropdown
  });

  it("TestVault.AutomationStatus picklist renders correctly", () => {
    // Manual / Planned / Automated
  });
});
```

**Verification :** `pnpm test tools/regression/T-2.22-testcase-display.test.ts`
Attendu : ROUGE.

---

### COMMIT A2 -- feat(hub): wire TestCase display + Steps CRUD in TestCaseFormView

**Objectif :** a partir de l'inventaire PF-3, wirer les composants existants et
implementer le Steps CRUD.

**Schema TestStep (plan.md S4.2) -- a utiliser tel quel :**
```typescript
interface TestStep {
  index: number;      // 0-based
  action: string;     // format markdown
  expected: string;   // format markdown
}
```

**Composant StepsEditor (creer si absent, wirer si existant) :**

```typescript
// Structure attendue si creation necessaire
interface StepsEditorProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
  readOnly?: boolean;
}
```

UX minimale :
- Liste des steps numerotee (index + 1)
- Chaque step : champ action (textarea) + champ expected (textarea)
- Boutons : Add Step (en bas de liste), Delete (par step), Move Up / Move Down
- Pas de drag-and-drop obligatoire : Up/Down suffisent pour ce sprint

**Integration TestCaseFormView :**
- Deserialiser `TestVault.Steps` (JSON) au chargement du WIT
- Serialiser au save (JSON.stringify)
- Si parse error (JSON invalide dans le champ) : afficher les steps comme texte brut
  dans un textarea en fallback, avec warning "Could not parse steps -- editing as raw JSON"

**Verification :** `pnpm test --run`
Attendu : VERT. Couverture StepsEditor : >= 80%.

---

### COMMIT A3 -- test(regression): [RED] T-2.22-testcase-wiring

**Fichier cree :**
`tools/regression/T-2.22-testcase-wiring.test.ts`

```typescript
describe("T-2.22 TestCase wiring in Argos hub", () => {

  it("hub routes to TestCaseFormView when WIT type is TestVault.TestCase", () => {
    // Simuler SDK.getContributionId() retournant le hub cases
    // Naviguer vers un TC par ID
    // Verifier que TestCaseFormView est rendu
  });

  it("TestCase list view renders list of TCs from WIQL", () => {
    // Mocker queryWiql retournant 3 TCs
    // Verifier que les 3 TCs apparaissent dans la liste
  });

  it("clicking a TC in the list opens TestCaseFormView", () => {
    // Cliquer sur un TC dans la liste
    // Verifier navigation vers TestCaseFormView avec le bon ID
  });

  it("TestCaseFormView shows loading state while fetching WIT", () => {
    // fetchWorkItem pending
    // Verifier spinner ou skeleton visible
  });

  it("TestCaseFormView shows error state if fetch fails", () => {
    // fetchWorkItem rejects (404 ou 500)
    // Verifier message d'erreur user-friendly
  });
});
```

**Verification :** ROUGE attendu.

---

### COMMIT A4 -- feat(hub): wire TestCase list + routing in hub

**Ce commit wire le routing du hub pour les TestCases.**

Verifier l'architecture hubs (Sprint 4 -- 6 hubs independants via SDK.getContributionId()) :
```bash
grep -rn "getContributionId\|argos-hub-cases" apps/argos-extension/src/ | head -20
```

**Si hub-cases existe deja :** wirer TestCaseFormView et la liste TCs dedans.
**Si le routing est monolithique :** etendre le switch existant.

En aucun cas recrire l'architecture des hubs -- c'est du scope creep.

**Verification :** `pnpm test --run`
Attendu : VERT.

---

## CHECKPOINT B -- Coverage Panel Xray-like

### COMMIT B1 -- test(regression): [RED] T-2.22-coverage-panel-data

**Fichier cree :**
`tools/regression/T-2.22-coverage-panel-data.test.ts`

```typescript
describe("T-2.22 Coverage Panel -- Xray-like display", () => {

  // Data loading
  it("fetches TCs linked via Tested By when panel loads on a User Story", () => {
    // Mocker SDK.getConfiguration() retournant workItemId d'une US
    // Mocker getWorkItemRelations retournant 2 liens Tested By
    // Mocker fetchWorkItems retournant les TCs
    // Verifier que les 2 TCs sont affiches dans le panel
  });

  it("shows empty state with CTA when no TCs linked", () => {
    // Aucun lien Tested By
    // Verifier message "No test cases linked" + bouton "Suggest Tests"
  });

  it("shows loading skeleton while fetching", () => {
    // Fetch en cours
    // Verifier skeleton visible
  });

  it("shows error state if ADO fetch fails", () => {
    // fetch rejects
    // Verifier message d'erreur + bouton Retry
  });

  // Data display (option C -- Xray-like)
  it("displays TC title for each linked TC", () => {});

  it("displays TC state (Design/Ready/Active/Closed/Deprecated)", () => {});

  it("displays TC priority (1-Critical to 4-Trivial)", () => {});

  it("displays TC assigned to (display name)", () => {});

  it("displays TC steps count", () => {
    // TC avec 3 steps : afficher "3 steps"
  });

  it("displays last execution status if TestExecution exists", () => {
    // Mocker derniere TestExecution liee au TC
    // Verifier badge Pass/Fail/Blocked/Unexecuted
  });

  it("shows Unexecuted badge if no TestExecution linked", () => {
    // Pas de TestExecution = Unexecuted (pas d'erreur)
  });

  // Actions
  it("clicking TC title opens the TC WIT in ADO (navigation)", () => {
    // Cliquer titre TC
    // Verifier appel SDK.getService(IHostNavigationService).openNewWindow ou navigate
  });

  it("Create Test button opens new TestCase form with Area Path pre-filled from US", () => {
    // Cliquer "Create Test"
    // Verifier que le formulaire de creation s'ouvre avec
    // AreaPath = areaPath de la US source
  });
});
```

**Verification :** ROUGE attendu.

---

### COMMIT B2 -- feat(widget): Coverage Panel data layer -- WIQL + relations

**Ce commit implemente la couche data du Coverage Panel.**

**Requete WIQL pour les TCs lies (plan.md S5.2 adapte) :**

```typescript
// Depuis le widget coverage-panel, le WI courant est une US/Bug/Requirement
// On cherche les TCs lies via les link types Tested By / Validates / Covers

async function fetchLinkedTestCases(
  workItemId: number,
  witClient: WorkItemTrackingRestClient
): Promise<LinkedTestCase[]> {

  // Etape 1 : recuperer les relations du WI courant
  const wi = await witClient.getWorkItem(workItemId, undefined, undefined, WorkItemExpand.Relations);
  const testedByLinks = (wi.relations ?? []).filter(r =>
    r.rel === "Microsoft.VSTS.Common.TestedBy-Forward" ||
    r.rel === "TestVault.TestedBy-Forward" ||
    r.rel === "TestVault.Validates-Forward" ||
    r.rel === "TestVault.Covers-Forward"
  );

  if (testedByLinks.length === 0) return [];

  // Etape 2 : extraire les IDs des TCs
  const tcIds = testedByLinks.map(r => {
    const match = r.url?.match(/\/(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }).filter(Boolean) as number[];

  // Etape 3 : fetch les TCs avec les champs necessaires
  const tcs = await witClient.getWorkItems(
    tcIds,
    [
      "System.Id",
      "System.Title",
      "System.State",
      "System.AssignedTo",
      "System.AreaPath",
      "TestVault.Priority",
      "TestVault.Steps",
      "TestVault.AutomationStatus",
    ]
  );

  // Etape 4 : pour chaque TC, chercher la derniere TestExecution
  // (WIQL ou liens -- voir note ci-dessous)
  return tcs.map(tc => mapToLinkedTestCase(tc));
}
```

**Note sur la derniere execution :**
Chercher une TestExecution liee au TC est une operation supplementaire (N+1 si fait naivement).
Approche acceptable pour ce sprint : une WIQL groupee pour toutes les executions des TCs
du panel en une seule requete :

```sql
SELECT [System.Id], [TestVault.TestCaseId], [TestVault.GlobalStatus], [System.ChangedDate]
FROM workitems
WHERE [System.WorkItemType] = 'TestVault.TestExecution'
  AND [TestVault.TestCaseId] IN ({tcIds})
ORDER BY [System.ChangedDate] DESC
```

Puis grouper par TestCaseId et prendre le plus recent.
Si la requete echoue (champ TestVault.TestCaseId non indexe) : fallback = afficher
"Unexecuted" pour tous les TCs sans planter. Documenter dans rapport.

**Verification :** `pnpm test --run` VERT.

---

### COMMIT B3 -- feat(widget): Coverage Panel UI -- Xray-like rendering

**Ce commit implemente l'UI du Coverage Panel.**

**Structure d'un TC dans le panel (Xray-like) :**

```
[StatusBadge] TC-{id} Titre du Test Case                    [3 steps]
              Assigned: John Doe | Priority: Critical | State: Active
```

Statuts avec couleurs Fluent UI :
- Pass -> Badge vert (Fluent UI Badge severity="success")
- Fail -> Badge rouge (severity="error")
- Blocked -> Badge orange (severity="warning")
- Skipped -> Badge gris (severity="informative")
- Unexecuted -> Badge bleu (severity="important" ou neutre)

**Header du panel :**
```
Test Coverage  [{n} tests]                   [+ Create Test] [Suggest Tests]
```

- "Create Test" : ouvre formulaire TC vide avec AreaPath pre-rempli depuis la US
- "Suggest Tests" : declenche la generation AI (CHECKPOINT C)

**Etat vide :**
```
No test cases linked to this item yet.
[+ Create Test]  [Suggest Tests]
```

**Verification :** `pnpm test --run` VERT. Couverture widget coverage-panel : >= 80%.

---

## CHECKPOINT C -- Suggest Tests depuis Coverage Panel

### COMMIT C1 -- test(regression): [RED] T-2.22-suggest-tests-coverage-panel

**Fichier cree :**
`tools/regression/T-2.22-suggest-tests-coverage-panel.test.ts`

```typescript
describe("T-2.22 Suggest Tests from Coverage Panel", () => {

  it("Suggest Tests button triggers AI generation with US content", () => {
    // Mocker useAiGeneration
    // Cliquer "Suggest Tests" dans le Coverage Panel
    // Verifier que useAiGeneration est appele avec :
    //   - titre de la US source
    //   - description de la US source
    //   - criteria d'acceptance si presents
  });

  it("generated TCs inherit AreaPath from source User Story", () => {
    // US avec AreaPath = "DEMO\Team A"
    // Generation retourne 3 TCs candidats
    // Verifier que SuggestTestsDrawer recoit les TCs avec
    //   areaPath = "DEMO\Team A" pre-rempli
  });

  it("accepted TCs are created with correct AreaPath", () => {
    // Accepter les TCs depuis le Drawer
    // Verifier que les PATCH/POST vers ADO incluent
    //   System.AreaPath = areaPath de la US
  });

  it("accepted TCs appear in Coverage Panel after creation", () => {
    // Apres acceptation
    // Verifier que le panel se rafraichit et affiche les nouveaux TCs
  });

  it("Suggest Tests button is disabled if LLM not configured", () => {
    // useLlmConfig retourne null / not configured
    // Verifier que le bouton est disabled avec tooltip explicatif
  });

  it("shows error if AI generation fails", () => {
    // useAiGeneration throws
    // Verifier message d'erreur user-friendly dans le panel (pas crash)
  });

  // Bug Area Path -- validation explicite
  it("Area Path bug regression -- generation does NOT attempt to create WIT before user accepts", () => {
    // Cliquer Suggest Tests
    // Verifier qu'aucun appel createWorkItem n'est fait pendant la generation
    // Le createWorkItem doit arriver UNIQUEMENT apres Accept dans le Drawer
  });
});
```

**Verification :** ROUGE attendu.
**Note :** le dernier test est le test de regression du bug Area Path original.
S'il passe au GREEN, le bug est officiellement confirme comme corrige.

---

### COMMIT C2 -- feat(widget): wire Suggest Tests -- generation + Area Path inheritance

**Ce commit branche le bouton Suggest Tests sur la generation AI.**

**Architecture :**

```typescript
// Dans le Coverage Panel widget
// useAiGeneration est deja implemente (Sprint 2.21.x)
// SuggestTestsDrawer est deja implemente (Sprint 2.21 part 3)
// Ce commit les connecte depuis le widget

function CoveragePanelSuggestFlow({ workItemId, workItemAreaPath }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [generatedTCs, setGeneratedTCs] = useState<GeneratedTestCase[]>([]);
  const { generate, isGenerating } = useAiGeneration();
  const { config: llmConfig } = useLlmConfig();

  const handleSuggestTests = async () => {
    // 1. Fetch la US source (titre + description + acceptance criteria)
    const usContent = await fetchWorkItemContent(workItemId);

    // 2. Appeler la generation LLM
    const candidates = await generate({
      sourceTitle: usContent.title,
      sourceDescription: usContent.description,
      acceptanceCriteria: usContent.acceptanceCriteria,
    });

    // 3. Pre-injecter l'AreaPath de la US dans chaque TC candidat
    const candidatesWithAreaPath = candidates.map(tc => ({
      ...tc,
      areaPath: workItemAreaPath,  // herite de la US source
    }));

    setGeneratedTCs(candidatesWithAreaPath);
    setDrawerOpen(true);
  };

  const handleAccept = async (acceptedTCs: GeneratedTestCase[]) => {
    // Creer les TCs en ADO avec l'AreaPath pre-rempli
    // createWorkItem est appele ici -- JAMAIS avant
    await Promise.all(
      acceptedTCs.map(tc => createTestCase({
        ...tc,
        areaPath: tc.areaPath ?? workItemAreaPath,
      }))
    );

    // Rafraichir le panel apres creation
    await refetchLinkedTestCases();
    setDrawerOpen(false);
  };

  return (
    <>
      <Button
        onClick={handleSuggestTests}
        disabled={!llmConfig || isGenerating}
        title={!llmConfig ? "Configure AI provider in Settings first" : undefined}
      >
        Suggest Tests
      </Button>

      <SuggestTestsDrawer
        isOpen={isDrawerOpen}
        generatedTestCases={generatedTCs}
        onAccept={handleAccept}
        onDismiss={() => setDrawerOpen(false)}
      />
    </>
  );
}
```

**Verification :** `pnpm test --run` VERT.

---

### COMMIT C3 -- docs: Sprint 2.22 documentation

**Fichiers a mettre a jour :**

**`docs/user-guide.md` :**
- Section "Test Cases in Argos" : how to create, view, edit steps (add/edit/delete/reorder)
- Section "Coverage Panel" : what it shows, how to create tests from it, how to use Suggest Tests
- Note : Area Path automatically inherited from User Story when creating via Coverage Panel

**`docs/operator-guide.md` :**
- Note sur la requete WIQL des executions (N+1 potentiel si beaucoup de TCs lies)
- Note sur les link types ADO supportes pour le Coverage Panel
  (Microsoft.VSTS.Common.TestedBy-Forward, TestVault.TestedBy-Forward, etc.)

**`CHANGELOG.md` -- entree `[0.5.32]` :**

```markdown
## [0.5.32] - 2026-05-XX

### Added
- TestCase display in Argos hub : title, state, priority, assigned to, steps CRUD
- StepsEditor component : add/edit/delete/reorder steps inline in TestCaseFormView
- Coverage Panel (Xray-like) : displays linked TCs with title, state, priority,
  assigned to, steps count, last execution status (Pass/Fail/Blocked/Unexecuted/Skipped)
- Suggest Tests from Coverage Panel : AI generation with Area Path inherited from source US
  Fixes: "Area Path missing" regression (creation deferred to Accept action)
- Empty state in Coverage Panel with CTA "Create Test" and "Suggest Tests"

### Fixed
- Area Path bug: Suggest Tests no longer attempts to create WIT during generation.
  TestCase WITs are created only when user accepts suggestions in the Drawer.

### Technical
- Regression tests: T-2.22-testcase-display, T-2.22-testcase-wiring,
  T-2.22-coverage-panel-data, T-2.22-suggest-tests-coverage-panel
- T-0.5.1 (inventory) : DONE
- T-0.5.2 (wiring TestCase) : DONE (Plans/Sets/Preconditions in future sprint)
```

**`README.md` :** mettre a jour la section Features avec Coverage Panel et Steps CRUD.

---

### COMMIT C4 -- chore: bump 0.5.31 -> 0.5.32

Bumper le groupe Changesets fixed (15 package.json) -- meme pattern que Sprint 2.21 part 3.

Verifier via :
```bash
node -e "
  const ext = require('./apps/argos-extension/package.json');
  const vss = require('./apps/argos-extension/vss-extension.json');
  console.log('Coherent:', ext.version === vss.version && ext.version === '0.5.32');
"
```

Verification finale :
```bash
pnpm test --run
# Attendu : >= 553 tests verts (+ nouveaux tests de ce sprint)
```

---

## SCENARIO D'ECHEC

### Coverage Panel -- link types ADO non reconnus

**Symptome :** getWorkItemRelations retourne des liens mais avec des `rel` differents
de ceux attendus (ex: "Tested By" en minuscules, ou GUID au lieu de nom).

**Resolution :**
1. Logger `wi.relations.map(r => r.rel)` pour voir les vrais noms de relations.
2. Adapter le filtre avec les vrais noms.
3. En dernier recours : query WIQL directe avec `MODE (MustContain)` (plan.md S5.2).
4. Documenter les noms de relations reels dans le rapport -- utile pour TestPulse.

### TestExecution last status -- champ TestVault.TestCaseId non indexe

**Symptome :** la WIQL pour les executions echoue avec "Field not sortable/filterable".

**Resolution :** fallback graceful -- afficher "Unexecuted" pour tous les TCs.
Creer TECH-DEBT dans le rapport : "indexer TestVault.TestCaseId pour la recherche WIQL".
Ne pas bloquer le sprint pour ca.

### StepsEditor -- composant existant incompatible

**Symptome :** un composant StepsEditor existe mais son interface ne correspond pas
a ce sprint (props differentes, TypeScript incompatible).

**Resolution :**
1. Si l'ecart est mineur (renommage de props) : adapter l'appel, pas le composant.
2. Si l'ecart est majeur : creer StepsEditorV2 sans modifier l'original
   (non-regression S10.7). TECH-DEBT pour merger les deux dans un sprint futur.
3. Ne JAMAIS modifier un composant existant si ca casse des tests existants.

---

## CE QUE TU NE FAIS PAS

- NE PAS wirer TestPlan, TestSet, TestExecution, Precondition dans ce sprint.
  Ce sprint wire UNIQUEMENT les TestCases et le Coverage Panel.

- NE PAS reimplementer useAiGeneration, SuggestTestsDrawer, SuggestStepsDrawer.
  Ils sont livres en v0.5.31. Ce sprint les consomme, ne les modifie pas.

- NE PAS modifier llm-provider.ts, azure-openai-provider.ts, azure-ai-foundry-provider.ts.

- NE PAS implementer les executions de tests (passer un TC en Pass/Fail/Blocked).
  Afficher le statut de la derniere execution = lecture seule uniquement.

- NE PAS refactorer l'architecture des 6 hubs. Si le routing existe, l'utiliser tel quel.

- NE PAS ajouter de pagination dans la liste des TCs pour ce sprint
  (acceptable jusqu'a 100 TCs ; au-dela noter en TECH-DEBT).

- NE PAS pousser sur origin ni ouvrir une PR.

---

## RAPPORT FINAL ATTENDU

Produire `claude_prompts/sprint-2-22-code-report.md` :

```markdown
# Sprint 2.22 -- Code Report

## Statut global
[SUCCES / SUCCES PARTIEL / ECHEC] -- [date]

## PRE-FLIGHT
- pnpm audit : [CLEAN / CVEs : ...]
- pnpm test baseline : [X tests verts sur commit ...]
- Inventaire composants (PF-3) : [liste des composants trouves + etat wired/unwired]
- Routes API : [link types ADO reels observes]

## Commits livres
| # | Hash | Checkpoint | Message | Tests |
|---|------|-----------|---------|-------|
| A1 | ... | A | test [RED] T-2.22-testcase-display | RED OK |
| A2 | ... | A | feat: wire TestCase display + Steps CRUD | GREEN |
| A3 | ... | A | test [RED] T-2.22-testcase-wiring | RED OK |
| A4 | ... | A | feat: wire TestCase list + routing | GREEN |
| B1 | ... | B | test [RED] T-2.22-coverage-panel-data | RED OK |
| B2 | ... | B | feat: Coverage Panel data layer | GREEN |
| B3 | ... | B | feat: Coverage Panel UI Xray-like | GREEN |
| C1 | ... | C | test [RED] T-2.22-suggest-tests-coverage-panel | RED OK |
| C2 | ... | C | feat: wire Suggest Tests + Area Path inheritance | GREEN |
| C3 | ... | C | docs: Sprint 2.22 | GREEN |
| C4 | ... | C | chore: bump 0.5.31 -> 0.5.32 | GREEN |

## Couverture finale
- Suite complete : X tests (etait 553)
- StepsEditor : X%
- Coverage Panel widget : X%

## Bug Area Path -- verdict
[CONFIRME RESOLU via test T-2.22-suggest-tests-coverage-panel / AUTRE : ...]

## Link types ADO reels (a conserver pour TestPulse)
[liste des rel strings observes en production]

## TECH-DEBT identifies
[liste]

## Allowlist -- chemins a ajouter post-merge
[chemins des nouveaux fichiers claude_prompts/ a inscrire dans allowlist.cjs + allowlist.ts]
```

---

## CLEANUP POST-MERGE

```powershell
Move-Item "CLAUDE_TASK_sprint-2-22-code.md" "claude_prompts\CLAUDE_TASK_sprint-2-22-code.md"
```

Puis inscrire dans `tools/regression/allowlist.cjs` et `allowlist.ts` :
```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-22-code.md",
"claude_prompts/sprint-2-22-code-report.md",
```

Committer :
```
chore(allowlist): add Sprint 2.22 code claude_prompts paths
```

---

*Fin du CLAUDE_TASK -- Sprint 2.22*
*Genere le 2026-05-28*
*Structure : 3 checkpoints, 11 commits, 12-15h Claude Code*
