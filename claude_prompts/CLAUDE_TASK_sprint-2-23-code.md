# CLAUDE_TASK -- Sprint 2.23 : TestPlan + TestSet + Precondition + TestExecution CRUD

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `sprint/2.23-code`
**Version cible :** 0.5.32 -> 0.5.33
**Duree estimee :** 15-18h
**Pattern :** B -- Code Implementation (TDD strict)

**Sources de verite :**
- `Specs/constitution.md` v0.5.3 -- S10.1 TDD, S10.2 doc, S10.4 regressions, S10.5 deps, S10.7 non-regression
- `Specs/spec.md` -- US-1.2 (TestSet), US-1.3 (TestPlan), US-1.5 (Precondition), US-2.1 (TestExecution)
- `Specs/plan.md` -- S3.2 (WIT list), S3.5 (TestExecution immutabilite)
- `Specs/tasks.md` -- T-0.5.2 PARTIAL (TestCase done, Plans/Sets/Preconditions/Executions pending)
- `claude_prompts/sprint-2-22-code-report.md` -- patterns etablis (useArgosCreate, StepsEditor, ServicesContext)

**Decisions injectees (session 2026-05-28) :**
- D-1 : CRUD complet (create/read/update/delete) pour les 4 types
- D-2 : Tout en un sprint
- D-3 : Marketplace reste privee -- pas de blocage sur GA readiness
- D-4 : Version bump 0.5.32 -> 0.5.33

---

## CONTEXTE EXECUTIF

v0.5.32 livre le wiring TestCase + Coverage Panel. Le produit est partiellement demontrable.
Pour une demo complete et convaincante, il manque les 4 autres types de WIT Argos :

- **TestPlan** : vision macro d'une release (US-1.3). Surface centrale pour Aicha (Test Manager).
- **TestSet** : regroupement thematique de TCs (US-1.2). Prerequis pour un TestPlan utile.
- **Precondition** : setup partageable entre TCs (US-1.5). Differentie Argos des outils basiques.
- **TestExecution** : resultat d'une execution manuelle (US-2.1). IMMUTABLE apres save.

Sans ce sprint, Argos ne peut pas etre presente comme un outil de test management complet.
Avec ce sprint, les 5 types de WIT sont wires et le referentiel est fonctionnel.

**Structure en 4 checkpoints independants :**
- **CHECKPOINT A** : TestSet (4-5h) -- le plus simple, prerequis pour TestPlan
- **CHECKPOINT B** : TestPlan (4-5h) -- depends TestSet pour la composition
- **CHECKPOINT C** : Precondition (2-3h) -- independant, plus simple
- **CHECKPOINT D** : TestExecution (4-5h) -- immutabilite, le plus complexe

---

## REGLES NON-NEGOCIABLES

1. **TDD strict S10.1** : commit RED avant commit GREEN. Toujours. Pas d'exception.
2. **Non-regression S10.7** : `pnpm test --run` vert apres CHAQUE commit.
3. **Inventaire avant wiring** : lire les composants existants (meme PF-3 que Sprint 2.22).
   Ne PAS recrire ce qui existe -- wirer ce qui est la.
4. **TestExecution immutable** : aucun PATCH apres le premier save.
   S'assurer que l'UI ne propose PAS de bouton "Update" sur une TestExecution existante.
5. **Pas de push, pas de PR automatique.**
6. **Termes interdits** : scanner `tools/regression/LLM-*.test.ts` +
   `tools/regression/CFG-*-no-*-references.test.ts` avant le premier commit.

---

## PRE-FLIGHT (v1.3 -- obligatoire avant le premier commit)

### PF-1 : Vulnerabilites
```bash
pnpm audit --audit-level=high
```
Attendu : 0 HIGH (post-Sprint 2.22 + pnpm.overrides). Si HIGH : STOP.

### PF-2 : Tests baseline
```bash
git checkout main && git pull origin main
pnpm test --run
```
Attendu : >= 567 tests verts. Si rouge : STOP.

### PF-3 : Inventaire composants existants (CRITICAL -- meme pattern Sprint 2.22)
```bash
# Composants riches existants pour les 4 types cibles
find apps/argos-extension/src -name "*.tsx" | \
  xargs grep -l "TestPlan\|TestSet\|Precondition\|TestExecution" | \
  grep -v test | sort

# Verifier les services existants
find apps/argos-extension/src -name "*service*" -o -name "*Service*" | \
  grep -v test | sort

# Verifier le routing hub actuel
grep -n "TestPlan\|TestSet\|Precondition\|TestExecution\|goTo" \
  apps/argos-extension/src/hub/App.tsx 2>/dev/null | head -30

# Verifier si des formulaires ou listes existent deja
find apps/argos-extension/src -name "*Plan*" -o -name "*Set*" -o \
  -name "*Precondition*" -o -name "*Execution*" | \
  grep -v test | grep -v node_modules | sort
```

**Documenter dans le rapport : liste exacte des composants trouves + etat wired/unwired.**
C'est le delta reel. Ne JAMAIS supposer qu'un composant n'existe pas sans l'avoir cherche.

### PF-4 : Routes API
Ce sprint touche :
- ADO REST `_apis/wit/workitems` -- CRUD pour les 4 nouveaux types
- ADO REST `_apis/wit/workitemrelations` -- liens TestPlan -> TestSet -> TC
- Les services existants doivent supporter les nouveaux `WorkItemType` strings

Verifier que `testCaseService` (ou equivalent) est generalisable, ou si chaque
type aura son propre service :
```bash
grep -n "workItemType\|WorkItemType\|TestVault\." \
  apps/argos-extension/src/hub/services/*.ts \
  packages/argos-sdk/src/*.ts 2>/dev/null | head -30
```

### PF-5 : Termes interdits
```bash
grep -h "forbidden\|prohibited\|FORBIDDEN" \
  tools/regression/LLM-*.test.ts \
  tools/regression/CFG-*-no-*-references.test.ts 2>/dev/null | \
  grep -oP '"[^"]+"' | sort -u
```
Aucun de ces termes ne doit apparaitre dans les nouveaux fichiers produits.

---

## PREREQUIS DE DEMARRAGE

- `main` a jour post-Sprint 2.22 + TECH-DEBT-T2213-B merge
- Version active : 0.5.32, 567+ tests verts
- TestCase wiring fonctionne en BCEE-QA (valide v0.5.32)
- Branche : `git checkout -b sprint/2.23-code`
- PF-3 inventaire execute et documente

---

## CHECKPOINT A -- TestSet CRUD

### COMMIT A1 -- test(regression): [RED] T-2.23-testset-crud

**Fichier cree :**
`tools/regression/T-2.23-testset-crud.test.ts`

```typescript
describe("T-2.23 TestSet CRUD", () => {

  // List
  it("TestSetListView renders list of TestSets from WIQL", () => {});
  it("TestSetListView shows empty state when no TestSets exist", () => {});
  it("clicking a TestSet in the list opens TestSetFormView", () => {});

  // Create
  it("TestSetFormView renders creation form with Title required", () => {});
  it("saving without Title shows validation error", () => {});
  it("saving with valid Title creates TestSet WIT in ADO", () => {
    // Verifier que createWorkItem est appele avec
    // type: "TestVault.TestSet" + Title
  });

  // Read / Edit
  it("TestSetFormView fetch-by-id populates all fields", () => {});
  it("TestSetFormView shows linked TestCases list", () => {
    // Un TestSet avec 3 TCs lies doit les afficher
  });

  // TC composition
  it("Add TestCase button opens TC picker dialog", () => {});
  it("selecting a TC from picker adds it to the TestSet", () => {
    // Verifier que le lien ADO est cree (relation "contains" ou equivalent)
  });
  it("removing a TC from TestSet removes the link (not the TC)", () => {
    // US-1.2 : supprimer un Set ne supprime pas les TCs
  });

  // Delete
  it("Delete button shows confirmation before deleting TestSet", () => {});
  it("confirmed delete removes TestSet WIT but NOT linked TestCases", () => {});

  // Non-regression
  it("TestCase CRUD is unaffected after TestSet wiring", () => {});
});
```

Attendu : ROUGE.

---

### COMMIT A2 -- feat(hub): TestSet CRUD + hub wiring

**Composants a wirer / creer :**

Si `TestSetListView` et `TestSetFormView` existent deja (PF-3) : les wirer dans le hub.
Si absents : les creer avec cette structure minimale :

```typescript
// TestSetFormView -- champs requis
interface TestSetDraft {
  title: string;           // System.Title -- required
  description: string;    // System.Description
  tags: string;           // System.Tags
  areaPath: string;       // System.AreaPath -- required
}

// TCs lies : tableau des WI IDs avec lien "TestVault.Contains" ou equivalent
// Lire les relations existantes via getWorkItemRelations
// Ajouter via addWorkItemRelation
// Retirer via removeWorkItemRelation (NE PAS supprimer le TC)
```

**Routing hub :** ajouter `TestVault.TestSet` dans le switch de routing existant.

**Verification :** `pnpm test --run` VERT. Couverture TestSetFormView >= 80%.

---

## CHECKPOINT B -- TestPlan CRUD

### COMMIT B1 -- test(regression): [RED] T-2.23-testplan-crud

**Fichier cree :**
`tools/regression/T-2.23-testplan-crud.test.ts`

```typescript
describe("T-2.23 TestPlan CRUD", () => {

  // List
  it("TestPlanListView renders list of TestPlans", () => {});
  it("TestPlanListView shows state badge (Draft/Locked)", () => {});
  it("clicking a TestPlan opens TestPlanFormView", () => {});

  // Create
  it("TestPlanFormView renders with Title + IterationPath + Owner fields", () => {});
  it("saving without Title shows validation error", () => {});
  it("saving creates TestPlan WIT with state=Draft", () => {
    // Verifier type: "TestVault.TestPlan" + state: "Draft"
  });

  // TestSets composition
  it("TestPlanFormView shows linked TestSets list", () => {});
  it("Add TestSet button opens TestSet picker", () => {});
  it("selecting a TestSet links it to the TestPlan", () => {});
  it("removing a TestSet from TestPlan removes link (not TestSet)", () => {});

  // Lock / Unlock
  it("Lock button is visible on Draft TestPlan", () => {});
  it("clicking Lock transitions TestPlan state to Locked", () => {
    // Verifier PATCH state: "Locked" sur le WIT
  });
  it("Locked TestPlan shows Unlock button (Admin only)", () => {});
  it("editing composition of Locked TestPlan is refused with error message", () => {
    // US-1.3 : "Test Plan locked. Unlock to modify (Admin only)"
  });

  // Delete
  it("Delete requires confirmation and removes TestPlan WIT only", () => {});

  // Non-regression
  it("TestSet CRUD is unaffected", () => {});
});
```

Attendu : ROUGE.

---

### COMMIT B2 -- feat(hub): TestPlan CRUD + Lock/Unlock + hub wiring

**Champs TestPlan (spec US-1.3) :**
```typescript
interface TestPlanDraft {
  title: string;           // required
  description: string;
  iterationPath: string;   // sprint cible
  owner: string;           // Identity -- assignedTo
  areaPath: string;        // required
  // state: "Draft" | "Locked" -- gere via transition WIT, pas dans le draft form
}
```

**Logic Lock/Unlock :**
- Lock : PATCH `System.State` = "Locked" (ou l'etat configure pour le TestPlan)
- Locked = readonly : desactiver tous les boutons "Add/Remove TestSet/TC"
- Le bouton Unlock doit verifier le role ADO (constitution S6 -- roles ADO herities)
  Si l'utilisateur n'est pas Admin : Unlock desactive avec tooltip

**Note sur le snapshot (US-4.1) :** la creation automatique de snapshots au Lock
est hors scope de ce sprint (T-3.x). Le Lock dans ce sprint change l'etat
du TestPlan mais ne cree pas encore les TestCaseVersions.
Encoder un TODO comment et une TECH-DEBT dans le rapport.

**Verification :** `pnpm test --run` VERT.

---

## CHECKPOINT C -- Precondition CRUD

### COMMIT C1 -- test(regression): [RED] T-2.23-precondition-crud

**Fichier cree :**
`tools/regression/T-2.23-precondition-crud.test.ts`

```typescript
describe("T-2.23 Precondition CRUD", () => {

  it("PreconditionListView renders list of Preconditions", () => {});
  it("clicking a Precondition opens PreconditionFormView", () => {});

  // Create
  it("PreconditionFormView has Title + Description + Tags fields", () => {});
  it("saving creates Precondition WIT (TestVault.Precondition)", () => {});

  // Link to TestCases
  it("PreconditionFormView shows linked TestCases (precondition-of)", () => {});
  it("linking a TC creates precondition-of relation", () => {
    // TestCase.TestVault.PreconditionLinks contient l'ID de la Precondition
    // OU via lien ADO typed
  });

  // In TestCaseFormView
  it("TestCaseFormView shows linked Preconditions as read-only preamble", () => {
    // US-1.5 : la Precondition apparait en pre-amble dans la vue d'execution
    // Pour ce sprint : afficher les Preconditions liees dans le formulaire TC
  });

  // Delete
  it("deleting Precondition removes WIT but shows warning if linked to TCs", () => {});

  it("TestCase CRUD is unaffected", () => {});
});
```

Attendu : ROUGE.

---

### COMMIT C2 -- feat(hub): Precondition CRUD + link to TestCases

**Champs Precondition (spec US-1.5) :**
```typescript
interface PreconditionDraft {
  title: string;           // required
  description: string;    // markdown
  tags: string;
  areaPath: string;        // required
}
```

**Lien avec TestCase :**
- Option A : via `TestVault.PreconditionLinks` (JSON `number[]` dans le TC -- plan.md S3.3)
- Option B : via lien ADO typed `TestVault.PreconditionOf`

Choisir selon ce qui est deja implemente dans le repo (PF-3 + PF-4).
Documenter le choix dans le rapport -- il impacte TestPulse.

**Dans TestCaseFormView :** ajouter une section "Preconditions" read-only
qui affiche les titres des Preconditions liees (fetch par ID).
Ce n'est PAS l'interface d'execution (US-2.1 -- hors scope).
C'est juste l'affichage de reference dans le formulaire.

**Verification :** `pnpm test --run` VERT.

---

## CHECKPOINT D -- TestExecution CRUD (avec immutabilite)

### COMMIT D1 -- test(regression): [RED] T-2.23-testexecution-crud

**Fichier cree :**
`tools/regression/T-2.23-testexecution-crud.test.ts`

```typescript
describe("T-2.23 TestExecution CRUD -- immutable after save", () => {

  // Create (= executer un TC)
  it("Run button on TestCase opens execution form", () => {
    // Depuis TestCaseFormView, bouton "Run Test"
    // Ouvre TestExecutionFormView ou Drawer
  });

  it("execution form shows TC steps with Pass/Fail/Blocked/Skipped per step", () => {
    // Chaque step du TC doit avoir un selecteur de statut
  });

  it("execution form requires Environment selection before save", () => {
    // Environment = string libre pour ce sprint (pas de picklist configuree)
    // Minimum : champ texte obligatoire
  });

  it("saving execution creates TestExecution WIT with correct fields", () => {
    // Verifier :
    // - type: "TestVault.TestExecution"
    // - TestVault.TestCaseId = id du TC execute
    // - TestVault.GlobalStatus = statut calcule (Pass si tous Pass, Fail si >= 1 Fail)
    // - TestVault.StepResults = JSON des resultats par step
    // - TestVault.Environment = valeur saisie
    // - TestVault.ExecutionSource = "Manual"
  });

  // Immutabilite (S3.5 constitution)
  it("saved TestExecution has NO Update/Edit button in UI", () => {
    // Ouvrir une TestExecution existante
    // Verifier ABSENCE de bouton Update/Save/Edit
  });

  it("saved TestExecution fields are all read-only", () => {
    // Tous les champs doivent etre en mode display, pas input
  });

  it("Re-run button creates a NEW TestExecution (does not modify the existing one)", () => {
    // Cliquer Re-run sur une TestExecution
    // Verifier qu'un NOUVEAU WIT TestExecution est cree
    // L'ancien reste intact
  });

  // GlobalStatus calcule
  it("GlobalStatus = Pass when all steps Pass", () => {});
  it("GlobalStatus = Fail when at least one step Fail", () => {});
  it("GlobalStatus = Blocked when no Fail but at least one Blocked", () => {
    // US-2.1 : si >= 1 Blocked sans Fail -> global = Blocked
  });
  it("GlobalStatus = Skipped when all steps Skipped", () => {});

  // Display dans Coverage Panel (non-regression)
  it("Coverage Panel last execution badge updates after new TestExecution", () => {
    // Creer une TestExecution -> Coverage Panel doit afficher le nouveau statut
  });

  it("TestCase CRUD + TestSet CRUD + TestPlan CRUD unaffected", () => {});
});
```

Attendu : ROUGE.

---

### COMMIT D2 -- feat(hub): TestExecution -- run form + immutable display + hub wiring

**Schema TestExecution (plan.md S3.5) :**
```typescript
interface TestExecutionCreate {
  testCaseId: number;      // TestVault.TestCaseId -- required
  testPlanId?: number;     // TestVault.TestPlanId -- optionnel pour ce sprint
  environment: string;     // TestVault.Environment -- required, string libre
  globalStatus: "Pass" | "Fail" | "Blocked" | "Skipped" | "Unexecuted";
  stepResults: TestStepResult[];  // TestVault.StepResults (JSON)
  executionSource: "Manual";     // toujours Manual pour ce sprint
  durationSeconds?: number;
}

interface TestStepResult {
  stepIndex: number;
  status: "Pass" | "Fail" | "Blocked" | "Skipped";
  comment?: string;
}
```

**Calcul GlobalStatus (US-2.1) :**
```typescript
function computeGlobalStatus(results: TestStepResult[]): GlobalStatus {
  if (results.some(r => r.status === "Fail")) return "Fail";
  if (results.some(r => r.status === "Blocked")) return "Blocked";
  if (results.every(r => r.status === "Skipped")) return "Skipped";
  if (results.every(r => r.status === "Pass")) return "Pass";
  return "Unexecuted";
}
```

**IMMUTABILITE -- contrainte absolue (plan.md S3.5) :**

```typescript
// TestExecutionFormView en mode display (existant)
// NE PAS afficher ces elements :
// - bouton "Update" / "Save" / "Edit"
// - inputs editables (remplacer par affichage texte)
// - bouton "Delete" (les TestExecutions ne sont jamais supprimees)

// Afficher a la place :
// - statuts en read-only avec badges colores
// - bouton "Re-run" qui cree une NOUVELLE TestExecution
```

**UX Run :**
- Depuis TestCaseFormView : bouton "Run Test" -> ouvre TestExecutionFormView
  en mode creation (formulaire avec les steps du TC a evaluer)
- Depuis TestPlanListView (optionnel pour ce sprint) : bouton Run sur un TC liste

**Routing hub :** ajouter `TestVault.TestExecution` dans le switch,
en mode display-only (pas de formulaire d'edition -- immutable).

**Verification :** `pnpm test --run` VERT.
Couverture computeGlobalStatus : >= 90% (pure function, facile a tester).

---

## COMMIT E -- docs: Sprint 2.23 documentation

**`docs/user-guide.md` -- ajouter / mettre a jour :**

Section "Test Sets" :
- Creer un Test Set (Title + Description + Tags)
- Ajouter / Retirer des Test Cases d'un Set
- Supprimer un Set (les TCs ne sont pas supprimes)

Section "Test Plans" :
- Creer un Test Plan (Title + Iteration + Owner + Test Sets)
- Lock / Unlock (Admin only)
- Composition locked = readonly

Section "Preconditions" :
- Creer une Precondition
- Lier a des Test Cases
- Affichage dans le formulaire TC

Section "Running Tests" :
- Lancer un Run depuis un Test Case
- Evaluer les steps (Pass/Fail/Blocked/Skipped)
- Immutabilite expliquee clairement (pas d'edition, Re-run pour retry)
- GlobalStatus calcule automatiquement

**`docs/operator-guide.md` :**
- Note sur le lien Precondition -> TestCase (strategy choisie A ou B)
- Note sur le Lock TestPlan sans snapshot (TODO T-3.x pour les TestCaseVersions)

**`CHANGELOG.md` -- entree `[0.5.33]` :**
```markdown
## [0.5.33] - 2026-05-XX

### Added
- TestSet CRUD : create/read/update/delete with TC composition
  (add/remove TCs by selection; removing TC from Set does not delete the TC)
- TestPlan CRUD : create/read/update/delete + Lock/Unlock state transitions
  Locked TestPlan composition is read-only (Admin-only unlock)
  Note: automatic snapshot on Lock (US-4.1) deferred to Phase 3
- Precondition CRUD : create/read/update/delete + link to TestCases
  Linked Preconditions displayed as read-only preamble in TestCaseFormView
- TestExecution : manual run with step-by-step Pass/Fail/Blocked/Skipped capture
  GlobalStatus auto-computed from step results
  IMMUTABLE after save (no Update button; Re-run creates new TestExecution)
  Environment field (free text) required before save

### Changed
- TestCaseFormView: added "Run Test" button -> opens execution form
- Coverage Panel: last execution badge updated after new TestExecution

### Technical
- T-0.5.2 : DONE (all 5 WIT types wired: TestCase, TestSet, TestPlan,
  Precondition, TestExecution)
- Regression tests: T-2.23-testset-crud, T-2.23-testplan-crud,
  T-2.23-precondition-crud, T-2.23-testexecution-crud
```

**`README.md` :** mettre a jour Features avec les 4 nouveaux types wires.

---

## COMMIT F -- chore: bump 0.5.32 -> 0.5.33

Bumper le groupe Changesets fixed complet.
Reference : `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts`
NE PAS lister seulement 3 fichiers -- scanner le groupe complet.

```bash
pnpm test tools/regression/CFG-2026-05-14-fixed-versioning.test.ts
# Attendu : VERT avant de committer le bump
```

Verification coherence :
```bash
node -e "
  const ext = require('./apps/argos-extension/package.json');
  const vss = require('./apps/argos-extension/vss-extension.json');
  console.log('Coherent:', ext.version === vss.version && ext.version === '0.5.33');
"
```

Verification finale :
```bash
pnpm test --run
# Attendu : >= 567 tests + tous les nouveaux T-2.23-*
```

---

## SCENARIOS D'ECHEC

### TestExecution -- PATCH refuse par ADO apres save

**Symptome :** tenter un PATCH sur une TestExecution retourne 403.

**Cause :** conforme a la spec (constitution S3.5 -- immutabilite).
L'UI ne doit PAS tenter ce PATCH. Si ca arrive, c'est un bug de l'UI.

**Resolution :** verifier que TestExecutionFormView (mode display) n'a aucun
bouton qui appelle updateWorkItem. Corriger l'UI, pas contourner la restriction ADO.

### TestPlan Lock -- etat "Locked" non configure dans le Process

**Symptome :** PATCH state="Locked" retourne 400 (etat inconnu).

**Cause :** l'etat "Locked" doit etre dans la liste des etats du WIT TestPlan.
Si le Process ADO ne l'a pas, l'API refuse.

**Resolution :**
1. Verifier les etats disponibles via `GET /_apis/work/processes/{id}/workItemTypes/{refName}/states`
2. Si "Locked" absent : utiliser un etat existant equivalent ("Active", "In Progress")
   ET creer une TECH-DEBT pour ajouter l'etat "Locked" proprement.
3. Documenter dans le rapport l'etat reel utilise.

### Precondition -- strategy de lien ambigue

**Symptome :** impossible de determiner si les liens doivent passer par
`TestVault.PreconditionLinks` (JSON dans le TC) ou par un lien ADO typed.

**Resolution :**
1. Chercher dans le code existant comment les liens sont implementes pour les TestSets.
2. Utiliser le meme pattern pour la coherence.
3. Documenter le choix dans le rapport -- TestPulse en depend.

### Import de type pur detecte (v1.4)

Si un composant existant importe un `type` ou `interface` depuis un fichier
a creer ou modifier : **inline le type dans le consommateur** + documenter.
Ne pas bloquer le sprint pour un deplacement de type pur.

---

## CE QUE TU NE FAIS PAS

- NE PAS implementer le snapshot automatique au Lock (US-4.1 / T-3.x).
  Le Lock change l'etat, pas plus. TECH-DEBT dans le rapport.

- NE PAS implementer l'execution depuis un TestPlan (US-2.1 complet).
  Ce sprint wire le Run depuis TestCaseFormView uniquement.

- NE PAS implementer l'evidence (attachements, screenshots) -- US-2.2, hors scope.

- NE PAS implementer l'environment configurator (US-2.3).
  Environment = champ texte libre dans ce sprint.

- NE PAS implemnter le clonage de TestPlan cross-project (US-1.4).

- NE PAS modifier la couche LLM (useAiGeneration, providers).

- NE PAS refactorer les composants existants "tant qu'on y est".

- NE PAS pousser ni ouvrir une PR.

---

## RAPPORT FINAL ATTENDU

Produire `claude_prompts/sprint-2-23-code-report.md` :

```markdown
# Sprint 2.23 -- Code Report

## Statut global
[SUCCES / SUCCES PARTIEL : checkpoint X manquant / ECHEC] -- [date]

## PRE-FLIGHT
- pnpm audit : [CLEAN / CVEs : ...]
- pnpm test baseline : [X tests verts]
- Inventaire PF-3 : [composants trouves + etat]
- Routes API : [strategies liens observees]
- Strategy lien Precondition : [JSON PreconditionLinks / lien ADO typed -- justification]

## Commits livres
| # | Hash | Checkpoint | Message | Tests |
|---|------|-----------|---------|-------|
| A1 | ... | A | test [RED] T-2.23-testset-crud | RED OK |
| A2 | ... | A | feat: TestSet CRUD + hub wiring | GREEN |
| B1 | ... | B | test [RED] T-2.23-testplan-crud | RED OK |
| B2 | ... | B | feat: TestPlan CRUD + Lock/Unlock | GREEN |
| C1 | ... | C | test [RED] T-2.23-precondition-crud | RED OK |
| C2 | ... | C | feat: Precondition CRUD + link to TCs | GREEN |
| D1 | ... | D | test [RED] T-2.23-testexecution-crud | RED OK |
| D2 | ... | D | feat: TestExecution + immutabilite | GREEN |
| E  | ... | - | docs: Sprint 2.23 | GREEN |
| F  | ... | - | chore: bump 0.5.32 -> 0.5.33 | GREEN |

## Couverture finale
- Suite complete : X tests (etait 567+)
- computeGlobalStatus : X% (cible >= 90%)
- TestSetFormView : X%
- TestPlanFormView : X%
- PreconditionFormView : X%
- TestExecutionFormView : X%

## T-0.5.2 : [DONE -- tous les 5 types wires / PARTIAL : manque X]

## TestPlan Lock -- etat ADO utilise : [Locked / equivalent : ...]

## Precondition link strategy : [JSON / ADO typed]

## TECH-DEBT identifies
- [Snapshot au Lock -- T-3.x]
- [Environment configurator -- US-2.3]
- [autres...]

## Allowlist -- chemins a ajouter post-merge
[liste]
```

---

## CLEANUP POST-MERGE

```powershell
Move-Item "CLAUDE_TASK_sprint-2-23-code.md" `
          "claude_prompts\CLAUDE_TASK_sprint-2-23-code.md"
```

Inscrire dans `tools/regression/allowlist.cjs` et `allowlist.ts` :
```javascript
"claude_prompts/CLAUDE_TASK_sprint-2-23-code.md",
"claude_prompts/sprint-2-23-code-report.md",
```

Committer :
```
chore(allowlist): add Sprint 2.23 code claude_prompts paths
```

Note : les operations cleanup des sprints precedents
(Sprint 2.22 cleanup-of-cleanup + TECH-DEBT-T2213-B cleanup-of-cleanup)
sont a grouper dans ce meme commit de cleanup (v1.4 -- pas de micro-sprint autonome).

---

*Fin du CLAUDE_TASK -- Sprint 2.23*
*Genere le 2026-05-28*
*Structure : 4 checkpoints, 10 commits, 15-18h Claude Code*
*T-0.5.2 complet si tous les checkpoints livres*
