# Prompt Claude Code -- Sprint 2.5b Wiring Phase 2 (`feat/sprint-2-5b-phase2-wiring`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **wiring Phase 2** (~60 min).
> 5 composants UI riches a integrer dans App.tsx : RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR audit Phase 2-7 (#56) merge
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm turbo test --force` -> 325 tests passing
- [ ] `pnpm preflight` -> PASSED (argos@0.5.0)
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

Si l'un echoue -> STOP.

---

## Contexte

Sprint 2.5a (CHANGELOG 0.2.0) a wireee 5 composants : LlmProviderSettings, PreconditionForm, TestCaseForm, TestPlanForm, TestSetForm.

Audit 2026-05-15 a confirme que **Phase 2 est 100% DONE en code** (services SDK + composants UI riches + tests existent et passent), mais 0/5 composants Phase 2 wirees dans App.tsx.

**Composants a wirer ce sprint** :
- `RunInterface.tsx` (T-2.2) -- interface d'execution de test
- `EvidencePanel.tsx` (T-2.3) -- upload d'evidence (integre dans RunInterface)
- `EnvironmentSettings.tsx` (T-2.4) -- config Environments admin
- `CreateBugForm.tsx` (T-2.5) -- creation Bug depuis Fail (modal depuis RunInterface)
- `ExecutionHistory.tsx` (T-2.6) -- historique d'executions d'un TestCase

**Services SDK** : `test-execution-service`, `evidence-upload-service`, `environment-config-service`, `bug-creation-service` -- tous DONE 261 tests passing.

**Architecture decouverte** :
- App.tsx detecte le contributionId ADO et resolve une Section (plans, cases, sets, preconditions, reports, settings)
- Chaque hub ADO charge App.tsx avec son contributionId
- Pas de tab navigation top-level, mais possibilite d'ajouter des sub-tabs Fluent UI dans chaque View

---

## Decisions actees (2026-05-15, validees par utilisateur)

| # | Element | Choix |
|---|---|---|
| D10 | Approche wiring | C -- Etendre Views existantes avec sub-tabs Fluent UI |
| D11 | Tests wiring | A -- Continuite Sprint 2.5a, nomenclature WIRING-2026-05-15-*.test.tsx |
| D12 | Bump version | B -- 0.5.0 -> 0.5.1 (patch, feature visible) |
| D13 | Pattern tabs | A -- `<TabList>` + `<Tab>` Fluent UI |
| D14 | Modal pattern | A -- `<Dialog>` Fluent UI pour CreateBugForm |
| D15 | RunInterface acces | C -- Onglet "Run" dans le TabList de PlansView |

---

## Architecture cible apres Sprint 2.5b

```
PlansView (multi-tabs)
  ├── Tab "Plan Details" (TestPlanForm) [WIRED Sprint 2.5a]
  └── Tab "Run" -> RunInterface [NEW Sprint 2.5b]
      ├── EvidencePanel integre [NEW Sprint 2.5b]
      └── CreateBugForm en Dialog (status=Fail) [NEW Sprint 2.5b]

CasesView (multi-tabs)
  ├── Tab "Case Details" (TestCaseForm) [WIRED Sprint 2.5a]
  └── Tab "Executions" -> ExecutionHistory [NEW Sprint 2.5b]

SettingsView (multi-sections)
  ├── Section "LLM Provider" (LlmProviderSettings) [WIRED Sprint 2.5a]
  └── Section "Environments" -> EnvironmentSettings [NEW Sprint 2.5b]
```

3 fichiers de tests wiring nouveaux (T-2.2/T-2.3/T-2.5 groupes dans run, T-2.6 standalone, T-2.4 standalone).

---

## Composition exacte du sprint

### A. Modifier `apps/argos-extension/src/hub/App.tsx`

1. Ajouter imports des 5 composants Phase 2
2. Ajouter sub-tabs dans PlansView (Plan Details / Run)
3. Ajouter sub-tabs dans CasesView (Case Details / Executions)
4. Ajouter section Environments dans SettingsView
5. Wirer les services correspondants via `useServices()`

### B. Modifier `apps/argos-extension/src/hub/services-context.tsx` (et `services.ts`)

Verifier que les 4 services Phase 2 sont exposes dans `Services` :
- `testExecutionService`
- `evidenceUploadService`
- `environmentConfigService`
- `bugCreationService`

Si absents, les ajouter dans `buildServices()` (fichier `services.ts`).

### C. Creer 3 fichiers tests wiring

- `WIRING-2026-05-15-plans-run.test.tsx` (RunInterface + EvidencePanel + CreateBugForm wirees dans PlansView)
- `WIRING-2026-05-15-cases-executions.test.tsx` (ExecutionHistory wireee dans CasesView)
- `WIRING-2026-05-15-settings-environments.test.tsx` (EnvironmentSettings wireee dans SettingsView)

Chaque test verifie :
- Le composant cible est rendu (data-testid)
- Pas de placeholder/stub
- Bouton/tab de navigation entre sub-tabs fonctionne

### D. Modifier `Specs/tasks.md`

Cocher les sous-taches "wiring" des T-2.2, T-2.3, T-2.4, T-2.5, T-2.6 Phase 2.

### E. Modifier `CHANGELOG.md`

Bump version 0.5.0 -> 0.5.1 (patch).
Entry Sprint 2.5b dans `[Unreleased]` puis section `[0.5.1]`.

### F. Bump version racine + extension

`package.json` racine : `0.5.0` -> `0.5.1`
`apps/argos-extension/package.json` : verifier fixed mode aligne
Aucun autre package -- bump fixed mode propage via Changesets (fait au release time).

---

## Garde-fous

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : Snapshot pre-edit App.tsx
Avant toute modification, prendre une copie de `App.tsx` en memoire et la rendre disponible dans le contexte (lecture complete). Le wiring va etendre, pas reecrire.

### Garde-fou #3 : Strict TDD
Chaque composant wireee = test ecrit AVANT le wiring (commit test rouge -> implementation -> test vert).
**MAIS** : les composants existent deja avec tests passants. Le test "wiring" verifie l'integration App.tsx, pas le composant lui-meme.
Pattern de test :
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CasesView } from "./App.js";
// ... mock services-context ...

describe("WIRING 2026-05-15 -- CasesView -> ExecutionHistory", () => {
  it("renders ExecutionHistory in 'Executions' tab", async () => {
    render(<CasesView />);
    const executionsTab = screen.getByRole("tab", { name: /executions/i });
    fireEvent.click(executionsTab);
    expect(screen.getByTestId("execution-history-list")).toBeInTheDocument();
  });
});
```

### Garde-fou #4 : Pas de modification des composants riches
RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory ont chacun **leurs propres tests** (passing). NE PAS modifier leur signature props ou leurs imports. Si une API ne colle pas au wiring, c'est le wiring qui s'adapte (wrapper component si necessaire).

### Garde-fou #5 : Services-context coherent
Si `services.ts` n'expose pas encore les services Phase 2, les ajouter SANS casser les services Phase 1. Verifier que les tests Sprint 2.5a (5 fichiers WIRING-2026-05-10-*) restent passing.

### Garde-fou #6 : 57 -> 60+ tests regression
Apres ce sprint :
- 57 tests existants doivent rester passing
- 3 nouveaux tests wiring (minimum 1 test par fichier, idealement 3-5 assertions)
- Total cible : 60-62 tests regression
- Si un test existant casse -> investigation OBLIGATOIRE avant commit

### Garde-fou #7 : Bump version 0.5.0 -> 0.5.1
Fixed mode versioning (Sprint 8). Bump racine `package.json` uniquement -- Changesets propagera aux 14 packages au release time. **NE PAS** bumper manuellement les 14 packages individuels.

### Garde-fou #8 : Pas de modif manifest vss-extension.json
Les 6 hubs ADO sont stables. Pas de nouveau hub ajoute. Pas de redeploy Marketplace contribution. Le wiring est interne a App.tsx.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-5b-phase2-wiring

pnpm --filter @atconseil/regression-suite test
# 57 passing -- baseline
```

---

## Etape 1 -- Lire App.tsx complet + services.ts

```powershell
# Lire App.tsx (159 lignes selon snapshot)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8

# Lire services.ts (factory)
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8 -ErrorAction SilentlyContinue

# Lire services-context.tsx (Provider)
Get-Content apps\argos-extension\src\hub\services-context.tsx -Encoding UTF8

# Lire la signature de chaque composant a wirer
Get-Content apps\argos-extension\src\hub\RunInterface.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\EvidencePanel.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\EnvironmentSettings.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\CreateBugForm.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\ExecutionHistory.tsx -Encoding UTF8 -TotalCount 30

# Lire un test wiring existant pour le pattern
Get-Content apps\argos-extension\src\hub\wiring\WIRING-2026-05-10-cases.test.tsx -Encoding UTF8
```

Apres lecture, **rapporter a l'utilisateur** :
- Props attendus par chaque composant (notamment service prop, project prop, callbacks)
- Si `services.ts` expose deja les 4 services Phase 2 ou si ajout necessaire
- Estimation revisee du sprint (60 min initial)

---

## Etape 2 -- Ajouter services Phase 2 dans services.ts (si necessaire)

Si `services.ts` n'expose pas deja :
- `testExecutionService`
- `evidenceUploadService`
- `environmentConfigService`
- `bugCreationService`

Les ajouter dans `buildServices()` (fonction factory). Pattern :

```typescript
import { createTestExecutionService } from "@atconseil/argos-sdk/test-execution-service";
import { createEvidenceUploadService } from "@atconseil/argos-sdk/evidence-upload-service";
import { createEnvironmentConfigService } from "@atconseil/argos-sdk/environment-config-service";
import { createBugCreationService } from "@atconseil/argos-sdk/bug-creation-service";

export interface Services {
  // ... existants
  testExecutionService: TestExecutionService;
  evidenceUploadService: EvidenceUploadService;
  environmentConfigService: EnvironmentConfigService;
  bugCreationService: BugCreationService;
}

export function buildServices(adoCtx: AdoContext): Services {
  // ... existants
  return {
    // ... existants
    testExecutionService: createTestExecutionService({ adoClient, ... }),
    evidenceUploadService: createEvidenceUploadService({ adoClient, ... }),
    environmentConfigService: createEnvironmentConfigService({ adoClient, ... }),
    bugCreationService: createBugCreationService({ adoClient, ... }),
  };
}
```

**Verifier** : tests existants `services.test.ts` (s'il existe) -> tous passants.

---

## Etape 3 -- Ecrire le test wiring CasesView (le plus simple)

Commencer par `WIRING-2026-05-15-cases-executions.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CasesView } from "../App.js";
import { ServicesProvider } from "../services-context.js";
// ... mock setup
```

Test scenarios :
- CasesView render le tab "Case Details" par defaut
- Click sur tab "Executions" -> rend ExecutionHistory avec data-testid `execution-history-list`
- Click sur tab "Case Details" -> retourne au TestCaseForm

Lancer le test : ROUGE attendu (CasesView ne rend pas encore ExecutionHistory).

---

## Etape 4 -- Modifier CasesView dans App.tsx

Etendre `CasesView` :

```tsx
import { TabList, Tab } from "@fluentui/react-components";
import { useState } from "react";
import { ExecutionHistory } from "./ExecutionHistory.js";

type CasesTab = "details" | "executions";

export function CasesView() {
  const { testCaseService, testExecutionService, project } = useServices();
  const [activeTab, setActiveTab] = useState<CasesTab>("details");
  
  return (
    <div data-testid="view-cases">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Test Cases
      </Text>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as CasesTab)}
      >
        <Tab value="details">Case Details</Tab>
        <Tab value="executions">Executions</Tab>
      </TabList>
      <div style={{ marginTop: 16 }}>
        {activeTab === "details" && (
          <TestCaseForm service={testCaseService} project={project} />
        )}
        {activeTab === "executions" && (
          <ExecutionHistory service={testExecutionService} project={project} />
        )}
      </div>
    </div>
  );
}
```

Lancer le test : VERT attendu.

Commit intermediaire (optionnel mais conseille) :
```
git add -A
git commit -m "feat(hub): wire ExecutionHistory in CasesView (T-2.6)"
```

---

## Etape 5 -- Ecrire test wiring SettingsView -> EnvironmentSettings

`WIRING-2026-05-15-settings-environments.test.tsx` :

Test scenarios :
- SettingsView rend le bloc LLM Provider (deja existant)
- SettingsView rend egalement EnvironmentSettings avec data-testid `environment-settings-list`
- Les deux sections sont visibles simultanement (pas de tab, juste deux sections)

Si EnvironmentSettings doit etre dans un tab/accordion : adapter selon API du composant lue Etape 1.

Lancer : ROUGE attendu.

---

## Etape 6 -- Modifier SettingsView dans App.tsx

Ajouter EnvironmentSettings dans SettingsView. Si layout : 2 sections empilees verticalement avec separateur Fluent UI.

```tsx
import { EnvironmentSettings } from "./EnvironmentSettings.js";

export function SettingsView() {
  const { llmProviderService, environmentConfigService, project } = useServices();
  return (
    <div data-testid="view-settings">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Settings
      </Text>
      
      <div style={{ marginBottom: 32 }}>
        <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
          LLM Provider
        </Text>
        <LlmProviderSettings service={llmProviderService} project={project} />
      </div>
      
      <div data-testid="settings-environments-section">
        <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
          Environments
        </Text>
        <EnvironmentSettings service={environmentConfigService} project={project} />
      </div>
    </div>
  );
}
```

Lancer : VERT attendu.

---

## Etape 7 -- Ecrire test wiring PlansView -> RunInterface + EvidencePanel + CreateBugForm (le plus complexe)

`WIRING-2026-05-15-plans-run.test.tsx` :

Test scenarios :
- PlansView rend tab "Plan Details" par defaut (TestPlanForm)
- Click sur tab "Run" -> rend RunInterface avec data-testid `run-interface`
- RunInterface contient EvidencePanel integre (data-testid `evidence-panel`)
- RunInterface peut declencher l'ouverture du Dialog CreateBugForm (data-testid `create-bug-dialog`)

⚠ Note importante : selon l'API de RunInterface lue Etape 1, EvidencePanel et CreateBugForm peuvent :
- Etre **deja integres** dans RunInterface (le test verifie juste le rendu de RunInterface)
- Etre **separes** et necessiter une integration dans le wiring

Si integres : le test wiring se concentre sur "RunInterface rendue dans PlansView".
Si separes : ajouter EvidencePanel + CreateBugForm autour de RunInterface.

Lancer : ROUGE attendu.

---

## Etape 8 -- Modifier PlansView dans App.tsx

```tsx
import { RunInterface } from "./RunInterface.js";
// Si separes :
// import { EvidencePanel } from "./EvidencePanel.js";
// import { CreateBugForm } from "./CreateBugForm.js";

type PlansTab = "details" | "run";

export function PlansView() {
  const { testPlanService, testExecutionService, evidenceUploadService, bugCreationService, project } = useServices();
  const [activeTab, setActiveTab] = useState<PlansTab>("details");
  
  return (
    <div data-testid="view-plans">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Test Plans
      </Text>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as PlansTab)}
      >
        <Tab value="details">Plan Details</Tab>
        <Tab value="run">Run</Tab>
      </TabList>
      <div style={{ marginTop: 16 }}>
        {activeTab === "details" && (
          <TestPlanForm service={testPlanService} project={project} />
        )}
        {activeTab === "run" && (
          <RunInterface
            testExecutionService={testExecutionService}
            evidenceUploadService={evidenceUploadService}
            bugCreationService={bugCreationService}
            project={project}
          />
        )}
      </div>
    </div>
  );
}
```

⚠ Adapter les props selon l'API reelle de RunInterface lue Etape 1.

Lancer : VERT attendu.

---

## Etape 9 -- Modifier `Specs/tasks.md`

Cocher les sous-taches "wiring" Phase 2 :

- T-2.2 RunInterface : cocher "Implementation du wireframe", "Selecteur Environment" (si dans RunInterface), "Validation commentaire", "Calcul global status", "Bouton Save Run"
- T-2.3 EvidencePanel : cocher "UI drag & drop + bouton fichier", "Preview pour images", "Lien evidence <-> step"
- T-2.4 EnvironmentSettings : cocher "UI Settings > Environments", "Validation cote run : environment doit appartenir"
- T-2.5 CreateBugForm : cocher "Bouton Create Bug from Failure", "Pre-remplissage : Title, Description"
- T-2.6 ExecutionHistory : cocher "Onglet Executions avec liste paginee", "Vue cote a cote des statuts"

NE PAS cocher les sous-taches "Done quand" qui necessitent E2E reel sur ADO Cloud (T-2.7).

---

## Etape 10 -- Bump version + CHANGELOG

### 10.1 -- Bump version racine

```powershell
# Editer package.json racine : version "0.5.0" -> "0.5.1"
$pkgJson = Get-Content package.json -Raw -Encoding UTF8
$pkgJson = $pkgJson -replace '"version": "0\.5\.0"', '"version": "0.5.1"'
[System.IO.File]::WriteAllText("$pwd\package.json", $pkgJson, [System.Text.UTF8Encoding]::new($false))

# Verifier
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.1
```

### 10.2 -- Verifier extension version (fixed mode)

`apps/argos-extension/package.json` reste `0.5.0` jusqu'au prochain Changeset release. **NE PAS** bumper manuellement.

⚠ Si la CI fail au build VSIX pour version mismatch -> documenter et discuter, mais NE PAS bumper manuellement pour fixer la CI.

### 10.3 -- CHANGELOG

Dans `CHANGELOG.md`, sous `[Unreleased]` :

```markdown
## [0.5.1] - 2026-05-15

### Added

**Sprint 2.5b -- Phase 2 wiring** (5 composants UI riches integres dans App.tsx) :

- **RunInterface (T-2.2)** wireee dans PlansView via tab "Run" (TabList Fluent UI). Permet d'executer un Test Plan etape par etape avec status global temps reel.
- **EvidencePanel (T-2.3)** integre dans RunInterface pour upload d'evidence (drag & drop, preview images, multi-formats PNG/JPG/PDF/TXT/LOG/MP4/WEBM).
- **EnvironmentSettings (T-2.4)** wireee dans SettingsView en section dediee, permet aux admins de configurer la liste des Environments par projet.
- **CreateBugForm (T-2.5)** integree dans RunInterface en Dialog modal Fluent UI, declenche depuis un step Fail avec pre-remplissage Title/Description/Repro Steps.
- **ExecutionHistory (T-2.6)** wireee dans CasesView via tab "Executions", affiche l'historique pagine des executions d'un TestCase avec filtres.

### Tests

- 3 nouveaux tests wiring (~7 assertions au total) :
  - `WIRING-2026-05-15-plans-run.test.tsx`
  - `WIRING-2026-05-15-cases-executions.test.tsx`
  - `WIRING-2026-05-15-settings-environments.test.tsx`
- Tests regression : 57 -> 60 passing (3 nouveaux)
- Turbo test global : 325 -> 328 tests passing

### Changed

- App.tsx : architecture sub-tabs Fluent UI (`<TabList>` + `<Tab>`) pour PlansView et CasesView
- services.ts : 4 nouveaux services exposes dans `Services` (testExecutionService, evidenceUploadService, environmentConfigService, bugCreationService)
- Specs/tasks.md : cochage Phase 2 wiring (T-2.2 a T-2.6 sous-taches wiring cochees)

### Notes

- T-2.7 (E2E phase 2) reste uncheck -- depend de l'execution reelle sur ADO Cloud (a faire dans une session ulterieure)
- argos-functions toujours non deployee -- aucun impact sur ce sprint (Phase 2 est full client-side)
- Pas de modification du manifest vss-extension.json (les 6 hubs ADO restent stables)

### Lessons learned (Sprint 2.5b)

- **D10-C valide** : etendre les Views existantes avec sub-tabs est plus simple et moins risque qu'ajouter de nouveaux hubs ADO
- **Fluent UI TabList** : pattern propre pour sub-navigation interne, integration triviale
- **Composants riches existants = wiring trivial** : les composants RunInterface et al. acceptent deja les services en props (architecture solide cote Sprint 1)
- **Sprint 2.5b plus rapide que prevu** : 60 min initial, livre en X min reel
- **Sprint 2.5c (Phase 3+4) et Sprint 2.5d (Phase 5+6+7)** restent au programme, total decoupage valide
```

---

## Etape 11 -- Validation

```powershell
# 1. Mojibake scan
node tools\regression\scan-mojibake.cjs

# 2. Tests regression (cible 60 passing)
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5

# 3. Tests extension (cible : tests existants + 3 nouveaux WIRING-2026-05-15)
pnpm --filter @atconseil/argos-testing test 2>&1 | Select-Object -Last 5
# Si filter foire, lancer turbo test sur le package
pnpm turbo test --filter="apps/argos-extension*" --force 2>&1 | Select-Object -Last 10

# 4. Turbo test global (cible : 328+ tests)
pnpm turbo test --force 2>&1 | Select-Object -Last 15

# 5. Lint + typecheck (sanity post-edit)
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# 6. Build (sanity)
pnpm turbo build --force 2>&1 | Select-Object -Last 10

# 7. Preflight
pnpm preflight

# 8. Verifier les nouveaux fichiers
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-plans-run.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-cases-executions.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-settings-environments.test.tsx

# 9. Verifier version
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Version racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.1
```

---

## Etape 12 -- Archive + commit

### 12.1 -- Archiver le prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-5b.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-5b.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-5b.md
}
```

### 12.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(hub): Sprint 2.5b wire Phase 2 components (5 UI components)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii (attendu : 0)"
```

### 12.3 -- Commit (-F obligatoire)

Creer `$env:TEMP\commit-msg-sprint-2-5b.txt` :

```
feat(hub): Sprint 2.5b wire Phase 2 components (5 UI components)

Sprint 2.5b -- Phase 2 wiring : 5 composants UI riches integres dans App.tsx.

Composants wirees:
- RunInterface (T-2.2) dans PlansView via tab "Run" (TabList Fluent UI)
- EvidencePanel (T-2.3) integre dans RunInterface (upload evidence multi-formats)
- EnvironmentSettings (T-2.4) dans SettingsView (admin Environments)
- CreateBugForm (T-2.5) Dialog modal depuis RunInterface (Bug from Fail)
- ExecutionHistory (T-2.6) dans CasesView via tab "Executions"

Architecture:
- App.tsx : sub-tabs Fluent UI <TabList>+<Tab> pour PlansView et CasesView
- services.ts : 4 nouveaux services exposes (testExecution, evidenceUpload, environmentConfig, bugCreation)
- Pas de modification manifest vss-extension.json (6 hubs ADO stables)

Tests:
- 3 nouveaux tests wiring WIRING-2026-05-15-*
- Tests regression: 57 -> 60 passing
- Turbo test global: 325 -> 328 passing

Files changed:
- apps/argos-extension/src/hub/App.tsx (extensions PlansView, CasesView, SettingsView)
- apps/argos-extension/src/hub/services.ts (4 nouveaux services exposes)
- apps/argos-extension/src/hub/wiring/WIRING-2026-05-15-*.test.tsx (3 NEW)
- Specs/tasks.md (Phase 2 wiring coche T-2.2 a T-2.6)
- CHANGELOG.md ([0.5.1] section)
- package.json (version 0.5.0 -> 0.5.1)

Decisions tracees:
- D10-C: extension Views avec sub-tabs (vs new hubs)
- D11-A: nomenclature WIRING-2026-05-15-*
- D12-B: bump patch 0.5.0 -> 0.5.1
- D13-A: TabList Fluent UI
- D14-A: Dialog modal pour CreateBugForm
- D15-C: RunInterface dans onglet PlansView

Refs: Specs/audit-resync-2026-05-15.md, Sprint 2.5a wiring
```

Puis :
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-5b.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-5b.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-5b.txt"

git push -u origin feat/sprint-2-5b-phase2-wiring
```

### 12.4 -- PR

```powershell
$prBody = @'
## Summary

Sprint 2.5b -- Phase 2 wiring : 5 composants UI riches integres dans App.tsx.

**Bump 0.5.0 -> 0.5.1** (patch, feature visible utilisateur).

## Composants wirees

| Tache | Composant | Wiring |
|-------|-----------|--------|
| T-2.2 | RunInterface | PlansView tab "Run" |
| T-2.3 | EvidencePanel | Integre dans RunInterface |
| T-2.4 | EnvironmentSettings | SettingsView section dediee |
| T-2.5 | CreateBugForm | Dialog modal depuis RunInterface |
| T-2.6 | ExecutionHistory | CasesView tab "Executions" |

## Architecture

- App.tsx : sub-tabs Fluent UI `<TabList>` + `<Tab>` pour PlansView et CasesView
- services.ts : 4 nouveaux services exposes (testExecutionService, evidenceUploadService, environmentConfigService, bugCreationService)
- Pas de modification manifest vss-extension.json (6 hubs ADO restent stables)

## Tests

- 3 nouveaux tests wiring :
  - WIRING-2026-05-15-plans-run.test.tsx
  - WIRING-2026-05-15-cases-executions.test.tsx
  - WIRING-2026-05-15-settings-environments.test.tsx
- Tests regression : 57 -> 60 passing
- Turbo test global : 325 -> 328 passing

## Validation

- Tests regression : 60/60 passing
- Turbo test --force : 328 tests / 41+ files
- Lint + typecheck --force : OK
- Build --force : OK
- Mojibake : 0
- Preflight : PASSED (argos@0.5.1)

## Files changed

- `apps/argos-extension/src/hub/App.tsx` -- extensions PlansView, CasesView, SettingsView
- `apps/argos-extension/src/hub/services.ts` -- 4 nouveaux services exposes
- `apps/argos-extension/src/hub/wiring/WIRING-2026-05-15-*.test.tsx` -- 3 NEW
- `Specs/tasks.md` -- Phase 2 wiring cochee
- `CHANGELOG.md` -- section [0.5.1]
- `package.json` -- version 0.5.0 -> 0.5.1

## Apres merge

Sprint 2.5c (Phase 3+4 wiring, 7 composants, ~60 min) prochain.
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-5b.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(hub): Sprint 2.5b wire Phase 2 components (5 UI)" `
  --body-file "$env:TEMP\pr-body-sprint-2-5b.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-5b.txt"
```

---

## Etape 13 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-5b-phase2-wiring

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 60 passing

pnpm preflight
# PASSED argos@0.5.1

# Verifier la branche
git status
git log --oneline | Select-Object -First 5
```

---

## Criteres de done

- [ ] Branche `feat/sprint-2-5b-phase2-wiring` creee
- [ ] App.tsx etendu : PlansView (tab Run), CasesView (tab Executions), SettingsView (section Environments)
- [ ] services.ts expose les 4 nouveaux services Phase 2
- [ ] 3 nouveaux tests wiring WIRING-2026-05-15-* dans apps/argos-extension/src/hub/wiring/
- [ ] 60 tests regression passing (etait 57)
- [ ] Turbo test --force passing (~328 tests)
- [ ] Lint + typecheck + build --force OK
- [ ] Specs/tasks.md Phase 2 wiring cochee (T-2.2 a T-2.6 sous-taches wiring)
- [ ] CHANGELOG.md section [0.5.1] complete
- [ ] package.json racine version 0.5.1
- [ ] 0 mojibake
- [ ] 0 modification manifest vss-extension.json
- [ ] **Commit message 100% ASCII**
- [ ] Prompt archive
- [ ] Commit + PR ouverte
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "App.tsx + services + composants lus. Props observees : [lister pour chaque composant]. Estimation revisee : XX min. Confirmation pour Etape 2 (services.ts) ?"

2. **Apres Etape 4 (premiere wiring)** : "CasesView wireee avec ExecutionHistory dans tab Executions. Test WIRING-2026-05-15-cases-executions VERT. Passe a EnvironmentSettings ?"

3. **Apres Etape 8 (RunInterface complete)** : "PlansView wireee avec RunInterface + EvidencePanel + CreateBugForm. Tests verts. 60 tests passing. Pret pour Etape 10 (bump version + CHANGELOG) ?"

4. **Apres Etape 11 (validation)** : "Sanity complete : 60 tests + lint + typecheck + build verts. 0 mojibake. argos@0.5.1. Pret a commit ?"

5. **Apres Etape 12.4** : "PR ouverte. Apres merge GitHub, lance Etape 13 (post-merge cleanup)."

---

## Apres ca

- Pause optionnelle (~10 min, vrai meritee)
- **Sprint 2.5c** : Wiring Phase 3+4 (7 composants : SnapshotPanel, SnapshotDiffPanel, WorkItemLinkPanel, CoverageMatrix, CoveragePanel, ImportWizard, WebhookAdmin) -- prompt separe a recevoir
- Apres Sprint 2.5d : audit Phase 2-6 E2E + Stripe + Azure deploy strategy

Bon sprint !
