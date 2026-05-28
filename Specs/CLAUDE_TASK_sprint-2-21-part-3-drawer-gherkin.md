# CLAUDE_TASK -- Sprint 2.21 part 3 : Drawer + Gherkin Editor

**Cible :** Claude Code
**Date :** 2026-05-28
**Branche cible :** `sprint/2.21-part-3`
**Version cible :** 0.5.30 -> 0.5.31
**Duree estimee :** 8-10h
**Pattern :** B -- Code Implementation (TDD strict)

**Sources de verite :**
- `Specs/constitution.md` v0.5.1 -- S10.1 TDD, S10.2 doc, S10.4 regressions, S10.5 deps, S10.6 spec-kit, S10.7 non-regression
- `Specs/spec.md` -- US-5.1, F1 (generation AI TC), T-5.1 (Gherkin + Monaco)
- `Specs/tasks.md` -- Sprint 2.21 part 2 delivered, Sprint 2.22 delivered
- `claude_prompts/CLAUDE_TASK_sprint-2-21-part-2-CHECKPOINT-C.md` -- reference (livre)
- Decisions Q1-Q3 actees session 2026-05-28 (voir section "Decisions injectees")

---

## CONTEXTE EXECUTIF

Sprint 2.21 part 2 (CHECKPOINT C -- max_tokens + timeout) livre en v0.5.30, valide en BCEE-QA.
Ce sprint livre les deux features UX reportees depuis le split original :

**CHECKPOINT A -- Drawer pattern (deux contextes)** :
Quand l'AI genere des suggestions, l'utilisateur doit pouvoir les reviser et editer
avant acceptation dans un panneau dedie (Fluent UI Drawer), pas en inline rudimentaire.
Deux contextes :
1. Coverage Panel > "Suggest Tests" : 3-7 TCs entiers generes. Drawer = liste de TCs
   avec actions Accept All / Accept Selected / Dismiss + edition par TC avant acceptation.
2. TestCaseFormView > "AI Suggest Steps" : steps generes. Drawer = liste de steps avec
   Replace / Complete / Cancel. ATTENTION : la logique Replace/Complete/Cancel a ete
   livree dans Sprint 2.22. Ce sprint ne reimplemente PAS cette logique -- il l'enveloppe
   dans un Drawer UX uniquement.

**CHECKPOINT B -- Gherkin native editor (Monaco)** :
Le champ `TestVault.Gherkin` dans TestCaseFormView est actuellement un textarea brut.
Ce sprint implemente T-5.1 : remplace ce textarea par un Monaco editor avec coloration
syntaxique Gherkin et validation syntaxe a la sauvegarde.
Nouvelle dependance npm : `@monaco-editor/react` (a auditer post-install).

Risque si non livre : l'USP "BDD native" reste un differenciateur non visible sur
le Marketplace. Le tableau concurrentiel (ARGOS_STRATEGIE_COMMERCIALE.md) cite Gherkin
natif comme differenciateur #3.

---

## DECISIONS INJECTEES (actees session 2026-05-28, sans reposer)

- D-Q1 : Drawer s'applique aux DEUX contextes (Suggest Tests + Suggest Steps)
- D-Q2 : Monaco editor complet pour Gherkin (T-5.1 full -- coloration + validation)
- D-Q3 : Version bump 0.5.30 -> 0.5.31
- Architecture : no-backend, client-side only (constitution S6.0) -- inchange
- Stack : TypeScript 5.5+ strict, React 18, Fluent UI 2, Vitest + msw, Biome, pnpm
- Tests : msw + React Testing Library (PAS Playwright -- TECH-DEBT-052 non levee)
- Commits : format conventional commits (aligner avec `git log --oneline -20`)
- Pas de push, pas de PR automatique -- Alex fait a la main apres revue du rapport

---

## REGLES NON-NEGOCIABLES

1. **TDD strict S10.1** : commit test RED avant commit implementation GREEN.
   Un test rouge = un commit dedie. La GREEN suit dans le commit suivant.
   Les deux ne peuvent pas etre dans le meme commit.

2. **Couverture S10.1** : >= 90% core / >= 80% UI.
   Monaco doit etre mocke dans Vitest (jsdom ne supporte pas les browser APIs Monaco).
   Mock minimal accepte : `vi.mock('@monaco-editor/react', () => ({ default: (props) => <textarea /> }))`
   mais le mock doit exposer value/onChange pour tester le comportement reel.

3. **Non-regression S10.7** : `pnpm test --run` doit rester vert sur tous les tests
   existants apres chaque commit. Si un test existant casse = STOP, investiguer
   avant de continuer.

4. **No scope creep** : voir section "Ce que tu ne fais pas".

5. **Pas de push, pas de PR** : `git push` interdit. Alex decide apres revue.

6. **Conventional commits** : tout commit en format `type(scope): message`.
   Verifier `git log --oneline -20` pour le format en usage sur ce repo.

7. **Interdiction termes sensibles** : ne pas inscrire de noms de modeles LLM en dur
   dans les nouveaux fichiers de code ou de test. Utiliser des constantes existantes
   ou les variables de config. Scanner `tools/regression/LLM-*.test.ts` pour la liste
   des termes interdits avant tout grep/edit.

---

## PRE-FLIGHT (obligatoire avant le premier commit)

**Executer dans cet ordre. Arreter si l'un echoue.**

### PF-1 : Vulnerabilites dependances

```bash
pnpm audit --audit-level=high
```

Si vulnerabilite HIGH ou CRITICAL detectee :
- STOP
- Creer un TECH-DEBT dans le rapport final
- Ne pas continuer sans feu vert Alex

Si MODERATE uniquement : logger dans rapport final, continuer.

### PF-2 : Tests non-regression sur main

```bash
git checkout main
git pull origin main
pnpm test --run
```

CI doit etre verte. Si rouge : identifier la cause, la documenter dans le rapport,
ne pas creer la branche avant resolution.

### PF-3 : Nouvelle dependance Monaco -- audit specifique

```bash
pnpm add @monaco-editor/react --filter argos-extension
pnpm add monaco-editor --filter argos-extension
pnpm audit --audit-level=moderate
```

Si vulnerabilite introducte par Monaco : documenter dans rapport, attendre feu vert Alex.

Verifier aussi la taille du bundle apres ajout :
```bash
pnpm turbo build --filter argos-extension
# Verifier que le VSIX generatable n'explose pas (seuil alerte : +500 KB vs baseline)
```

### PF-4 : Verification routes API impactees

Ce sprint ne touche pas directement les providers LLM ni les clients ADO REST.
Verifications light :
- Confirmer que `SuggestTestsDrawer` et `SuggestStepsDrawer` n'introduisent pas
  de nouveaux appels reseau directs -- ils consomment uniquement les resultats
  deja produits par les services existants.
- Verifier que `GherkinEditor` ne fait aucun appel reseau (editeur purement local).

---

## PREREQUIS DE DEMARRAGE

- `main` a jour, CI verte (commit `3224855` ou plus recent)
- Version active : 0.5.30
- Tests Sprint 2.22 (Replace/Complete/Cancel) en place et verts
  (si absents : STOP -- ce sprint s'appuie sur cette logique)
- `@monaco-editor/react` installe (PF-3 execute)
- Branche creee : `git checkout -b sprint/2.21-part-3`

---

## WORKFLOW DETAILLE

### COMMIT 1 -- test(regression): [RED] T-2.21-part-3-drawer-suggest-tests

**Fichier cree :**
`tools/regression/T-2.21-part-3-drawer-suggest-tests.test.ts`

**Tests a ecrire (TOUS doivent etre ROUGES a ce stade) :**

```typescript
describe("T-2.21-part-3 SuggestTestsDrawer -- Coverage Panel", () => {

  // Rendu et ouverture
  it("opens Drawer when generation result is provided", () => {
    // Render CoveragePanel (ou SuggestTestsDrawer directement)
    // avec des TCs generes en prop/state
    // Verifier que le Drawer est visible (Fluent UI DrawerSurface ou equivalent)
  });

  it("displays list of generated TCs with title and step count", () => {
    // Chaque TC genere apparait dans la liste avec son titre
    // et le nombre de steps
  });

  it("Accept All creates all TCs and closes Drawer", () => {
    // Cliquer "Accept All"
    // Verifier appel service de creation pour chaque TC
    // Verifier fermeture Drawer
  });

  it("Accept Selected creates only checked TCs", () => {
    // Decocher 1 TC sur 3
    // Cliquer "Accept Selected"
    // Verifier que 2 TCs seulement sont crees
  });

  it("Dismiss closes Drawer without creating anything", () => {
    // Cliquer "Dismiss" ou equivalent
    // Verifier aucun appel service de creation
    // Verifier fermeture Drawer
  });

  it("user can edit TC title before accepting", () => {
    // Modifier le titre d'un TC dans le Drawer
    // Accepter
    // Verifier que le TC cree a le titre modifie
  });

  it("user can edit TC steps before accepting", () => {
    // Modifier un step dans le Drawer
    // Accepter
    // Verifier que le TC cree a le step modifie
  });

  it("shows error state if TC creation fails", () => {
    // Mocker l'echec de creation ADO (msw handler retourne 400)
    // Verifier qu'une erreur est affichee par TC en echec
    // Verifier que les autres TCs sont crees normalement
  });
});
```

**Verification :** `pnpm test tools/regression/T-2.21-part-3-drawer-suggest-tests.test.ts`
Attendu : ROUGE (composant SuggestTestsDrawer inexistant).

---

### COMMIT 2 -- feat(ui): SuggestTestsDrawer component + CoveragePanel integration

**Fichiers crees / modifies :**

```
apps/argos-extension/src/hub/components/SuggestTestsDrawer/
  SuggestTestsDrawer.tsx          [NEW]
  SuggestTestsDrawer.test.tsx     [NEW] -- tests unitaires composant
  index.ts                        [NEW]

apps/argos-extension/src/hub/components/CoveragePanel/
  CoveragePanel.tsx               [MODIFIED] -- integrer SuggestTestsDrawer
```

**Comportement attendu SuggestTestsDrawer :**

Props :
```typescript
interface SuggestTestsDrawerProps {
  isOpen: boolean;
  generatedTestCases: GeneratedTestCase[];  // resultat de la generation LLM
  onAccept: (testCases: GeneratedTestCase[]) => Promise<void>;
  onDismiss: () => void;
}
```

UX :
- Fluent UI 2 Drawer (OverlayDrawer ou InlineDrawer selon ce qui est disponible)
- Liste scrollable des TCs generes
- Chaque TC : checkbox + titre editable + apercu steps (expandable)
- Actions primaires : "Accept Selected" (bouton principal) + "Accept All" (bouton secondaire)
- Action tertiaire : "Dismiss" (annuler, ne cree rien)
- Etat de chargement pendant creation (spinner sur bouton Accept)
- Gestion erreur : badge rouge par TC en echec, les autres continuent

**Integration CoveragePanel :**
Remplacer l'affichage actuel des suggestions (inline ou modal) par :
```typescript
<SuggestTestsDrawer
  isOpen={isSuggestDrawerOpen}
  generatedTestCases={pendingGeneratedTCs}
  onAccept={handleAcceptGeneratedTCs}
  onDismiss={() => setIsSuggestDrawerOpen(false)}
/>
```

**Verification :** `pnpm test --run`
Attendu : VERT (tous les tests passes, y compris T-2.21-part-3-drawer-suggest-tests).
Couverture SuggestTestsDrawer.tsx : >= 80%.

---

### COMMIT 3 -- test(regression): [RED] T-2.21-part-3-drawer-suggest-steps

**Fichier cree :**
`tools/regression/T-2.21-part-3-drawer-suggest-steps.test.ts`

**Tests a ecrire (TOUS doivent etre ROUGES a ce stade) :**

```typescript
describe("T-2.21-part-3 SuggestStepsDrawer -- TestCaseFormView", () => {

  // Rendu et ouverture
  it("opens Drawer when AI generates steps", () => {
    // Trigger generation steps dans TestCaseFormView
    // Verifier que SuggestStepsDrawer est ouvert
  });

  it("displays generated steps list in Drawer", () => {
    // Les steps generes apparaissent dans la liste
  });

  // Les 3 actions de Sprint 2.22 -- maintenant dans le Drawer
  it("Replace action replaces all existing steps with generated ones", () => {
    // Cliquer "Replace" dans le Drawer
    // Verifier que les steps existants sont remplaces
    // Verifier fermeture Drawer
  });

  it("Complete action appends generated steps after existing ones", () => {
    // Cliquer "Complete" dans le Drawer
    // Verifier que les steps existants sont conserves
    // et les nouveaux appended
    // Verifier fermeture Drawer
  });

  it("Cancel action closes Drawer without modifying steps", () => {
    // Cliquer "Cancel" dans le Drawer
    // Verifier que les steps existants sont inchanges
    // Verifier fermeture Drawer
  });

  it("Drawer wraps Sprint-2.22 logic -- not re-implementing it", () => {
    // Ce test verifie que la logique Replace/Complete/Cancel
    // est delegue au service/hook existant de Sprint 2.22,
    // pas re-implemente dans le Drawer
    // (tester via spy sur le service existing)
  });
});
```

**Verification :** `pnpm test tools/regression/T-2.21-part-3-drawer-suggest-steps.test.ts`
Attendu : ROUGE (composant SuggestStepsDrawer inexistant).

---

### COMMIT 4 -- feat(ui): SuggestStepsDrawer component + TestCaseFormView integration

**Fichiers crees / modifies :**

```
apps/argos-extension/src/hub/components/SuggestStepsDrawer/
  SuggestStepsDrawer.tsx          [NEW]
  SuggestStepsDrawer.test.tsx     [NEW]
  index.ts                        [NEW]

apps/argos-extension/src/hub/components/TestCaseFormView/
  TestCaseFormView.tsx            [MODIFIED] -- integrer SuggestStepsDrawer
```

**Comportement attendu SuggestStepsDrawer :**

Props :
```typescript
interface SuggestStepsDrawerProps {
  isOpen: boolean;
  generatedSteps: TestStep[];     // resultat de la generation LLM
  hasExistingSteps: boolean;      // pour conditionner l'affichage de "Complete"
  onReplace: () => void;          // delegue a la logique Sprint 2.22 existante
  onComplete: () => void;         // delegue a la logique Sprint 2.22 existante
  onCancel: () => void;
}
```

**IMPORTANT -- Anti-scope-creep :**
La logique Replace/Complete/Cancel est DEJA implementee dans Sprint 2.22.
SuggestStepsDrawer est un WRAPPER UX uniquement.
NE PAS re-implementer la logique de fusion des steps dans ce composant.
Les callbacks `onReplace` et `onComplete` doivent appeler les fonctions
existantes du service/hook Sprint 2.22, pas reimplementer.

UX :
- Fluent UI 2 Drawer
- Apercu des steps generes (liste read-only dans le Drawer)
- Si `hasExistingSteps=true` : 3 boutons -- "Replace" (principal), "Complete" (secondaire), "Cancel"
- Si `hasExistingSteps=false` : 2 boutons -- "Insert" (alias Replace), "Cancel"

**Verification :** `pnpm test --run`
Attendu : VERT.
Couverture SuggestStepsDrawer.tsx : >= 80%.

---

### COMMIT 5 -- test(regression): [RED] T-2.21-part-3-gherkin-editor

**Fichier cree :**
`tools/regression/T-2.21-part-3-gherkin-editor.test.ts`

**Setup Monaco mock OBLIGATOIRE dans ce fichier :**

```typescript
// Mock Monaco AVANT les imports du composant
// Monaco utilise des browser APIs non disponibles dans jsdom
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange, onMount }) => (
    <textarea
      data-testid="monaco-mock"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
}));
```

**Tests a ecrire (TOUS doivent etre ROUGES) :**

```typescript
describe("T-2.21-part-3 GherkinEditor (Monaco)", () => {

  it("renders Monaco editor for TestVault.Gherkin field", () => {
    // GherkinEditor rendu dans TestCaseFormView
    // Verifier que le composant Monaco est present (ou son mock)
  });

  it("displays existing Gherkin content on load", () => {
    // TestCase avec contenu Gherkin existant
    // GherkinEditor affiche ce contenu
  });

  it("calls onChange when content is edited", () => {
    // Modifier le contenu
    // Verifier que onChange est appele avec la nouvelle valeur
  });

  it("saves Gherkin content to TestVault.Gherkin field on save", () => {
    // Editer du contenu Gherkin
    // Sauvegarder le TestCase
    // Verifier que le champ TestVault.Gherkin contient la valeur modifiee
  });

  it("backward compat -- plain text in existing TCs renders correctly", () => {
    // TC cree avant ce sprint avec contenu texte brut dans TestVault.Gherkin
    // GherkinEditor doit afficher ce contenu sans erreur ni perte
  });

  it("empty field renders Monaco editor without error", () => {
    // TC sans contenu Gherkin
    // GherkinEditor s'affiche sans crash (valeur vide)
  });

  it("shows Gherkin language hint in editor placeholder", () => {
    // Quand le champ est vide, un placeholder/hint indique
    // que ce champ accepte la syntaxe Gherkin (Given/When/Then)
  });
});
```

**Verification :** `pnpm test tools/regression/T-2.21-part-3-gherkin-editor.test.ts`
Attendu : ROUGE (composant GherkinEditor inexistant).

---

### COMMIT 6 -- feat(gherkin): Monaco-based GherkinEditor + T-5.1 implementation

**Fichiers crees / modifies :**

```
apps/argos-extension/src/hub/components/GherkinEditor/
  GherkinEditor.tsx               [NEW]
  GherkinEditor.test.tsx          [NEW] -- tests unitaires composant
  index.ts                        [NEW]

apps/argos-extension/src/hub/components/TestCaseFormView/
  TestCaseFormView.tsx            [MODIFIED] -- remplacer textarea par GherkinEditor
```

**Comportement attendu GherkinEditor :**

Props :
```typescript
interface GherkinEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;  // defaut "200px"
}
```

Implementation :
- Utiliser `@monaco-editor/react` (Editor component)
- Language : "gherkin" si disponible dans Monaco, sinon "plaintext" avec hint UI
- Theme : adapter au theme Fluent UI 2 actif (dark/light)
- Options Monaco minimales :
  - `minimap: { enabled: false }` (inutile sur petits champs)
  - `wordWrap: "on"`
  - `lineNumbers: "on"`
  - `scrollBeyondLastLine: false`
- Lazy loading : Monaco est lourd -- utiliser `import()` dynamique si necessaire
  pour ne pas bloquer le chargement initial de TestCaseFormView

**Integration TestCaseFormView :**
Remplacer l'actuel textarea/champ brut pour `TestVault.Gherkin` :
```typescript
// AVANT
<TextField multiline value={formData.gherkin} onChange={...} />

// APRES
<GherkinEditor
  value={formData.gherkin ?? ''}
  onChange={(val) => setFormData({ ...formData, gherkin: val })}
  readOnly={isReadOnly}
/>
```

**Post-install audit obligatoire :**
```bash
pnpm audit --audit-level=high
```
Si nouvelle vulnerabilite : STOP, documenter dans rapport.

**Verification bundle :**
```bash
pnpm turbo build --filter argos-extension
# Comparer taille VSIX vs pre-Monaco. Documenter le delta dans le rapport.
```

**Verification :** `pnpm test --run`
Attendu : VERT.
Couverture GherkinEditor.tsx : >= 80%.

---

### COMMIT 7 -- docs: Sprint 2.21 part 3 documentation

**Fichiers modifies :**

**`docs/user-guide.md` -- ajouter section "AI Suggestions Review" :**
- Comment fonctionne le Drawer dans Coverage Panel (Suggest Tests)
- Walkthrough : Accept All / Accept Selected / editer avant d'accepter / Dismiss
- Comment fonctionne le Drawer dans TestCaseFormView (Suggest Steps)
- Actions Replace / Complete / Cancel expliquees du point de vue utilisateur
- Captures d'ecran ou descriptions textuelles si captures impossibles

**`docs/user-guide.md` -- ajouter section "BDD / Gherkin Editor" :**
- Comment acceder au champ Gherkin dans un Test Case
- Syntaxe Gherkin de base (Feature / Scenario / Given / When / Then / And)
- Compatibilite avec les donnees existantes (texte brut preserve)
- Lien vers US-4.5 (sync future avec Azure Repos)

**`docs/operator-guide.md` -- ajouter note technique :**
- Monaco editor charge dynamiquement (~2.5 MB assets)
- Impact sur la premiere ouverture de TestCaseFormView (chargement asynchrone)
- Pas d'impact sur la performance globale de l'extension (lazy load)

**`CHANGELOG.md` -- ajouter entree `[0.5.31] - 2026-05-28` (ou date de livraison reelle) :**

```markdown
## [0.5.31] - 2026-05-2X

### Added
- Drawer UX for AI Suggestions review in Coverage Panel (Suggest Tests)
  Accept All / Accept Selected / per-TC edit before accepting / Dismiss
- Drawer UX for AI Suggest Steps review in TestCaseFormView
  Replace / Complete / Cancel actions now accessible in Drawer panel
- GherkinEditor component : Monaco-based editor for TestVault.Gherkin field
  with Gherkin syntax highlighting, word wrap, and lazy loading
- New dependencies: @monaco-editor/react, monaco-editor

### Changed
- CoveragePanel: generated TCs preview moved from inline to Drawer pattern
- TestCaseFormView: AI steps preview moved from inline modal to Drawer pattern
- TestCaseFormView: Gherkin field now uses Monaco editor (backward compatible)

### Technical
- Regression tests: T-2.21-part-3-drawer-suggest-tests,
  T-2.21-part-3-drawer-suggest-steps, T-2.21-part-3-gherkin-editor
- Sprint 2.22 Replace/Complete/Cancel logic unchanged -- SuggestStepsDrawer
  wraps existing service, does not re-implement business logic
```

**`README.md` -- mettre a jour section "Features" :**
- Ajouter "BDD / Gherkin Native Editor (Monaco)" dans la liste des features
- Mettre a jour "AI Test Generation" pour mentionner le Drawer de review

**Verification :** `pnpm test --run` (s'assurer que rien ne casse avec les modifs doc)

---

### COMMIT 8 -- chore: bump version 0.5.30 -> 0.5.31

**Fichiers modifies (trio lie -- bumper ensemble) :**
- `apps/argos-extension/package.json` : `"version": "0.5.31"`
- `apps/argos-extension/vss-extension.json` : `"version": "0.5.31"`
- `packages/testpulse-ui-shared/package.json` : `"version": "0.5.31"`

**Packages independants (NE PAS bumper) :**
- `packages/testvault-sdk/` -- versionning independant
- `packages/argos-cli/` -- versionning independant

**Verification finale :**
```bash
pnpm test --run
# Attendu : tous les tests verts, y compris les 3 nouveaux T-2.21-part-3-*
```

---

## SCENARIO D'ECHEC

### Monaco ne charge pas en jsdom

Symptome : tests GherkinEditor crashent sur "document is not defined" ou
"Worker is not defined" meme avec le mock.

Resolution :
1. Verifier que le mock `vi.mock('@monaco-editor/react', ...)` est au niveau
   du fichier AVANT les imports du composant teste (pas dans beforeEach).
2. Si Monaco importe monaco-editor directement (pas via le wrapper React),
   ajouter aussi : `vi.mock('monaco-editor', () => ({}))`
3. Documenter le mock utilise dans le rapport.

### Bundle VSIX trop lourd avec Monaco

Symptome : VSIX depasse +2 MB vs baseline apres ajout Monaco.

Resolution :
1. Verifier que `monaco-editor` est en tree-shaking (languages inutilises exclus).
2. Envisager `@monaco-editor/react` en version lite si disponible.
3. Si impact inacceptable (> +3 MB) : documenter dans rapport et alerter Alex
   avant de continuer. Ne pas merger sans validation.

### Tests Sprint 2.22 cassent apres integration Drawer

Symptome : tests Replace/Complete/Cancel de Sprint 2.22 echouent apres
integration SuggestStepsDrawer.

Resolution :
1. Verifier que SuggestStepsDrawer ne modifie pas les props/state de
   TestCaseFormView en dehors des callbacks onReplace/onComplete/onCancel.
2. SuggestStepsDrawer doit etre purement UX -- toute regression sur la
   logique metier signifie que le scope creep a eu lieu.
3. Reverter les changements TestCaseFormView, isoler le probleme, reprendre
   avec une approche plus chirurgicale.

### `pnpm audit` echoue sur Monaco

Si vulnerabilite HIGH dans @monaco-editor/react ou monaco-editor :
- STOP
- Documenter CVE(s) dans rapport
- Proposer a Alex : (a) waitAndSee si patch imminent, (b) TECH-DEBT avec
  workaround (fallback textarea conditionnel), (c) reporter ce sprint

---

## CE QUE TU NE FAIS PAS

- NE PAS re-implementer la logique Replace/Complete/Cancel de Sprint 2.22.
  SuggestStepsDrawer est un wrapper UX, pas une reimplementation metier.

- NE PAS implementer la sync Azure Repos Gherkin (US-4.5 / T-5.2 a T-5.6).
  GherkinEditor = editeur local uniquement, pas de sync dans ce sprint.

- NE PAS modifier llm-provider.ts, azure-openai-provider.ts,
  azure-ai-foundry-provider.ts ni aucun composant de la couche LLM.
  Ce sprint ne touche pas la generation, uniquement la presentation des resultats.

- NE PAS ajouter de nouvelle route ADO REST API.
  Les WI sont crees via le service existant (pas de nouvelle integration API).

- NE PAS implementer la coloration syntaxique Gherkin si Monaco ne la supporte
  pas nativement. "plaintext" avec un hint UI "Gherkin syntax supported" est
  acceptable plutot que d'importer un plugin de langage custom.

- NE PAS refactorer des composants adjacents "tant qu'on y est".
  Tout refactor observe = noter dans le rapport comme suggestion, pas faire.

- NE PAS pusher sur origin ni ouvrir une PR.

- NE PAS nommer en dur un modele LLM (nom de modele specifique) dans les
  nouveaux fichiers. Les composants Drawer ne connaissent pas le provider utilise.

---

## RAPPORT FINAL ATTENDU

Produire `claude_prompts/sprint-2-21-part-3-code-report.md` avec :

```markdown
# Sprint 2.21 part 3 -- Code Report

## Statut global
[SUCCES / SUCCES PARTIEL / ECHEC] -- [date]

## PRE-FLIGHT
- pnpm audit : [CLEAN / CVEs trouvees : ...]
- pnpm test baseline : [VERT sur commit X / PROBLEMES : ...]
- Monaco install : [OK / Impact bundle : +X KB]
- Routes API : [aucune nouvelle route / ...]

## Commits livres
| # | Hash | Message | Tests |
|---|------|---------|-------|
| 1 | ... | test(regression): [RED] T-2.21-part-3-drawer-suggest-tests | RED OK |
| 2 | ... | feat(ui): SuggestTestsDrawer + CoveragePanel | GREEN |
| 3 | ... | test(regression): [RED] T-2.21-part-3-drawer-suggest-steps | RED OK |
| 4 | ... | feat(ui): SuggestStepsDrawer + TestCaseFormView | GREEN |
| 5 | ... | test(regression): [RED] T-2.21-part-3-gherkin-editor | RED OK |
| 6 | ... | feat(gherkin): GherkinEditor Monaco + T-5.1 | GREEN |
| 7 | ... | docs: Sprint 2.21 part 3 documentation | GREEN |
| 8 | ... | chore: bump 0.5.30 -> 0.5.31 | GREEN |

## Couverture finale
- argos-extension core : X% stmts / X% branches / X% funcs / X% lines
- SuggestTestsDrawer.tsx : X%
- SuggestStepsDrawer.tsx : X%
- GherkinEditor.tsx : X%

## Fichiers crees
[liste]

## Fichiers modifies
[liste avec description du changement]

## Non-regressions verifiees
- Sprint 2.22 (Replace/Complete/Cancel) : [VERT / PROBLEMES : ...]
- Sprint 2.21 part 2 (max_tokens/timeout) : [VERT / PROBLEMES : ...]
- Sprint 2.21.1 (Foundry) : [VERT / PROBLEMES : ...]

## Delta bundle Monaco
- Taille VSIX avant : X MB
- Taille VSIX apres : X MB (+Y KB)

## Mock Monaco utilise
[Copier-coller le mock exact utilise dans les tests]

## TECH-DEBT ou suggestions identifies (ne pas implementer)
[Liste libre]

## Allowlist -- chemins a ajouter
[chemins des nouveaux fichiers dans claude_prompts/ a ajouter dans allowlist.cjs et allowlist.ts]
```

---

## CLEANUP POST-MERGE (a executer manuellement par Alex apres merge de la PR sur main)

### 1. Deplacer ce CLAUDE_TASK vers claude_prompts/

```powershell
# Depuis la racine du repo E:\Code\TestVault\
Move-Item -Path "CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md" `
          -Destination "claude_prompts\CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md"
```

### 2. Deplacer le rapport genere (si cree a la racine)

```powershell
# Si Claude Code a cree le rapport a la racine plutot que dans claude_prompts/
Move-Item -Path "sprint-2-21-part-3-code-report.md" `
          -Destination "claude_prompts\sprint-2-21-part-3-code-report.md"
```

### 3. Mettre a jour l'allowlist

Ouvrir `tools/regression/allowlist.cjs` et `tools/regression/allowlist.ts`.
Ajouter les deux nouveaux chemins :

```javascript
// Dans allowlist.cjs
"claude_prompts/CLAUDE_TASK_sprint-2-21-part-3-drawer-gherkin.md",
"claude_prompts/sprint-2-21-part-3-code-report.md",
```

### 4. Verification post-cleanup

```bash
pnpm test --run
# S'assurer que l'ajout allowlist ne casse pas les tests CFG-* et LLM-*
```

### 5. Commit de cleanup

```bash
git add tools/regression/allowlist.cjs tools/regression/allowlist.ts
git commit -m "chore(allowlist): add Sprint 2.21 part 3 claude_prompts paths"
```

---

*Fin du CLAUDE_TASK -- Sprint 2.21 part 3*
*Genere le 2026-05-28 -- session blindage skills v1.2/v1.3 + Sprint 2.21 part 3*
