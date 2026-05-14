# Prompt Claude Code -- Sprint 2.5c Wiring Phase 3+4 (`feat/sprint-2-5c-phase3-4-wiring`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **wiring Phase 3+4** (~70 min, +10 min pour script bonus).
> 6 composants UI riches a integrer dans App.tsx (SnapshotPanel, SnapshotDiffPanel, WorkItemLinkPanel, CoverageMatrix, ImportWizard, WebhookAdmin).
> **Bonus** : script `tools/release/bump-fixed-version.cjs` pour bumper les 12 packages fixed mode en une commande.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR Sprint 2.5b (#57) + fix versioning (4316c30) merge
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm turbo test --force` -> 328+ tests passing
- [ ] `pnpm preflight` -> PASSED (argos@0.5.1)
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] argos@0.5.1 partout (12 packages alignes verifies)

Si l'un echoue -> STOP.

---

## Contexte

Sprint 2.5b (CHANGELOG 0.5.1) a wirees 5 composants Phase 2 : RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory.

Sprint 2.5b a aussi revele **TECH-DEBT-037** : le bump version fixed mode necessite bumper les **12 packages** simultanement (pas seulement le racine). La CI a casse, fix par bump des 12 restants. Sprint 2.5c documente la lecon + cree un script de bump.

Audit 2026-05-15 confirme que **Phase 3 + Phase 4 sont 100% DONE en code**, mais 0/6 composants wirees dans App.tsx pour ce sprint.

**Composants a wirer ce sprint** :

Phase 3 (4 composants) :
- `SnapshotPanel.tsx` (T-3.2) -- snapshots Test Plan tagges
- `SnapshotDiffPanel.tsx` (T-3.3) -- comparateur de versions diff (sub-feature de SnapshotPanel)
- `WorkItemLinkPanel.tsx` (T-3.1) -- lien bidirectionnel WI ADO <-> TestCase
- `CoverageMatrix.tsx` (T-3.5) -- matrice de couverture exigences

Phase 4 (2 composants) :
- `ImportWizard.tsx` (T-4.2) -- wizard d'import multi-formats
- `WebhookAdmin.tsx` (T-4.8) -- admin webhooks Cloud-Plus

**Skip de ce sprint** :
- `CoveragePanel.tsx` -- widget WI form en code mais **NON FONCTIONNEL** (n'affiche rien actuellement). TECH-DEBT-038 NEW. A investiguer dans un sprint dedie.

---

## Decisions actees (2026-05-15)

| # | Element | Choix |
|---|---|---|
| D16 | Doc TECH-DEBT-037 | B -- Inclus dans Sprint 2.5c (CHANGELOG + MIGRATION-PLAN) |
| D17 | Script bump-fixed-version | A -- Cree en bonus dans Sprint 2.5c |
| D18 | Timing prompt 2.5c | A -- Maintenant (continuite) |
| D19 | CoveragePanel | B -- Skip ce sprint, TECH-DEBT-038 NEW |
| D20 | ImportWizard acces | A -- Bouton "Import" dans PlansView header -> Dialog |
| D21 | WorkItemLinkPanel | A -- Tab "Traceability" dans CasesView |
| D22 | CoverageMatrix dans Reports | B -- Tab "Coverage" (prepare tab Flakiness Sprint 2.5d) |

---

## Architecture cible apres Sprint 2.5c

```
PlansView (multi-tabs)
  ├── Tab "Plan Details" (TestPlanForm) [WIRED Sprint 2.5a]
  ├── Tab "Run" (RunInterface) [WIRED Sprint 2.5b]
  ├── Tab "Snapshots" (SnapshotPanel + SnapshotDiffPanel) [NEW Sprint 2.5c]
  └── Header bouton "Import" -> Dialog ImportWizard [NEW Sprint 2.5c]

CasesView (multi-tabs)
  ├── Tab "Case Details" (TestCaseForm) [WIRED Sprint 2.5a]
  ├── Tab "Executions" (ExecutionHistory) [WIRED Sprint 2.5b]
  └── Tab "Traceability" (WorkItemLinkPanel) [NEW Sprint 2.5c]

ReportsView (multi-tabs)
  └── Tab "Coverage" (CoverageMatrix) [NEW Sprint 2.5c]
       (Tab "Flakiness" sera ajoutee Sprint 2.5d en mode placeholder backend)

SettingsView (multi-sections)
  ├── Section "LLM Provider" (LlmProviderSettings) [WIRED Sprint 2.5a]
  ├── Section "Environments" (EnvironmentSettings) [WIRED Sprint 2.5b]
  └── Section "Webhooks" (WebhookAdmin) [NEW Sprint 2.5c]
```

---

## Composition exacte du sprint

### A. Modifier `apps/argos-extension/src/hub/App.tsx`

1. Imports des 5 composants Phase 3+4 (SnapshotPanel, SnapshotDiffPanel, WorkItemLinkPanel, CoverageMatrix, ImportWizard, WebhookAdmin) -- 6 imports
2. PlansView : ajouter tab "Snapshots" + bouton header "Import" -> Dialog
3. CasesView : ajouter tab "Traceability"
4. ReportsView : remplacer placeholder par TabList avec tab "Coverage" (et placeholder explicit pour Flakiness Sprint 2.5d)
5. SettingsView : ajouter section "Webhooks"

### B. Verifier `services.ts`

Verifier que les services Phase 3+4 sont exposes :
- `snapshotService` (T-3.2 + T-3.3 + T-3.4)
- `workItemLinkService` (T-3.1)
- `coverageMatrixService` (T-3.5)
- `importerService` (T-4.1+T-4.2)
- `webhookService` (T-4.8)
- `testCaseVersionService` (deja DONE Phase 1, Sprint 6c)

Si manquants, les ajouter dans `buildServices()`.

### C. Creer 3 fichiers tests wiring

- `WIRING-2026-05-15-plans-snapshots-import.test.tsx` (SnapshotPanel + SnapshotDiffPanel + ImportWizard wirees dans PlansView)
- `WIRING-2026-05-15-cases-traceability.test.tsx` (WorkItemLinkPanel wireee dans CasesView)
- `WIRING-2026-05-15-reports-and-settings.test.tsx` (CoverageMatrix dans ReportsView + WebhookAdmin dans SettingsView)

Chaque test verifie le rendu + navigation entre tabs.

### D. Creer `tools/release/bump-fixed-version.cjs` (bonus TECH-DEBT-037)

Script Node.js qui bumpe les 12 packages fixed mode en une seule commande :
```
node tools/release/bump-fixed-version.cjs 0.5.2
```

### E. Modifier `Specs/tasks.md`

- Phase 3 : cocher T-3.1 (wiring WorkItemLinkPanel), T-3.2 (SnapshotPanel), T-3.3 (SnapshotDiffPanel), T-3.5 (CoverageMatrix)
- Phase 4 : cocher T-4.2 (ImportWizard wiring), T-4.8 (WebhookAdmin code wiring)

### F. Modifier `Specs/MIGRATION-PLAN.md`

Ajouter note Sprint 2.5c livre + section TECH-DEBT-037 (lecon bump fixed mode 12 packages).

### G. Modifier `CHANGELOG.md`

- Section [0.5.2] avec Sprint 2.5c entry
- Documenter TECH-DEBT-037 (bump fixed mode = 12 packages)
- Documenter TECH-DEBT-038 NEW (CoveragePanel widget non fonctionnel)

### H. Bump version 0.5.1 -> 0.5.2 (12 packages)

⚠ **NE PAS** bumper manuellement chacun. Utiliser le script cree en step D :
```powershell
node tools\release\bump-fixed-version.cjs 0.5.2
```

---

## Garde-fous

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : Bump 0.5.1 -> 0.5.2 sur 12 packages (TECH-DEBT-037)
Liste exhaustive des 12 packages a bumper (vss-extension.json en bonus) :
1. `package.json` (racine, name=argos)
2. `apps/argos-extension/package.json` (name=argosTesting)
3. `apps/argos-functions/package.json`
4. `packages/argos-types/package.json` (@atconseil/argos-types)
5. `packages/argos-wit-schema/package.json`
6. `packages/argos-sdk/package.json`
7. `packages/argos-importers/package.json`
8. `packages/argos-exporters/package.json`
9. `packages/argos-cli/package.json`
10. `packages/argos-detection-api/package.json`
11. `packages/argos-gherkin/package.json`
12. `tools/azure-pipelines-task/package.json` (@atconseil/argos-azure-pipelines-task)
+ `apps/argos-extension/vss-extension.json` (string "version")

**NE PAS bumper** :
- `tools/argos-action/` (pas de package.json, juste action.yml)
- `tools/regression/package.json` (regression-suite@0.1.0, HORS GROUPE fixed mode)

### Garde-fou #3 : Snapshot pre-edit obligatoire
Avant toute modification, lire App.tsx + services.ts + signatures des 6 composants a wirer. Rapporter les props attendus a l'utilisateur.

### Garde-fou #4 : Strict TDD
Test rouge avant wiring, test vert apres wiring. Commit intermediaire optionnel par composant.

### Garde-fou #5 : Pas de modification composants riches
Les 6 composants ont leurs propres tests passants. Wrapper si necessaire, pas de modif signature.

### Garde-fou #6 : 60 -> 63+ tests regression
Apres ce sprint :
- 60 tests existants doivent rester passing
- 3 nouveaux tests wiring
- Total cible : 63-65 tests regression

### Garde-fou #7 : Pas de modif manifest vss-extension.json (au-dela de la version)
Les 6 hubs ADO restent stables. Le wiring est interne a App.tsx.

### Garde-fou #8 : Test CFG-2026-05-14-fixed-versioning DOIT passer
Apres bump 0.5.1 -> 0.5.2 sur les 12 packages, lancer SPECIFIQUEMENT ce test :
```powershell
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning
```
Si rouge -> investigation immediate (un package oublie ?).

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-5c-phase3-4-wiring

pnpm --filter @atconseil/regression-suite test
# 57 passing -- baseline
```

---

## Etape 1 -- Lecture App.tsx + services + composants

```powershell
# Lire App.tsx (devrait etre ~200+ lignes apres Sprint 2.5b)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8

# Lire services.ts
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8

# Signatures des 6 composants a wirer
Get-Content apps\argos-extension\src\hub\SnapshotPanel.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\SnapshotDiffPanel.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\WorkItemLinkPanel.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\CoverageMatrix.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\ImportWizard.tsx -Encoding UTF8 -TotalCount 30
Get-Content apps\argos-extension\src\hub\WebhookAdmin.tsx -Encoding UTF8 -TotalCount 30

# Verifier que les services Phase 3+4 sont deja exposes ou pas
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8 | Select-String -Pattern "(snapshot|coverage|workItem|importer|webhook)"

# Pattern test wiring Sprint 2.5b (reference)
Get-Content apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-cases-executions.test.tsx -Encoding UTF8 -ErrorAction SilentlyContinue
```

Apres lecture, **rapporter a l'utilisateur** :
- Props attendus par chaque composant
- Services manquants dans services.ts (s'il y en a)
- Estimation revisee du sprint (70 min initial)
- Confirmation pour Etape 2

---

## Etape 2 -- Ajouter services Phase 3+4 dans services.ts (si necessaire)

Pattern :
```typescript
import { createSnapshotService } from "@atconseil/argos-sdk/snapshot-service";
import { createWorkItemLinkService } from "@atconseil/argos-sdk/work-item-link-service";
import { createCoverageMatrixService } from "@atconseil/argos-sdk/coverage-matrix";
import { createImporterService } from "@atconseil/argos-importers";
// webhookService = a verifier dans argos-sdk ou argos-functions

export interface Services {
  // ... existants
  snapshotService: SnapshotService;
  workItemLinkService: WorkItemLinkService;
  coverageMatrixService: CoverageMatrixService;
  importerService: ImporterService;
  webhookService: WebhookService;
  testCaseVersionService: TestCaseVersionService; // probablement deja la
}
```

Verifier : tests existants `services.test.ts` (s'il existe) -> passants.

---

## Etape 3 -- Creer le script bump-fixed-version.cjs (BONUS)

`tools/release/bump-fixed-version.cjs` :

```javascript
#!/usr/bin/env node
/**
 * Bump version of all fixed-mode packages in the argos monorepo.
 * Usage: node tools/release/bump-fixed-version.cjs <new-version>
 * Example: node tools/release/bump-fixed-version.cjs 0.5.2
 *
 * Bumps these 12 packages + vss-extension.json :
 * - package.json (root)
 * - apps/argos-extension/package.json
 * - apps/argos-functions/package.json
 * - packages/argos-types/package.json
 * - packages/argos-wit-schema/package.json
 * - packages/argos-sdk/package.json
 * - packages/argos-importers/package.json
 * - packages/argos-exporters/package.json
 * - packages/argos-cli/package.json
 * - packages/argos-detection-api/package.json
 * - packages/argos-gherkin/package.json
 * - tools/azure-pipelines-task/package.json
 * + apps/argos-extension/vss-extension.json (string version field)
 *
 * Does NOT bump:
 * - tools/argos-action/ (no package.json, just action.yml)
 * - tools/regression/package.json (regression-suite, HORS GROUPE)
 *
 * Refs: TECH-DEBT-037 (Sprint 2.5b CI fail leson)
 */

const fs = require("node:fs");
const path = require("node:path");

const FIXED_PACKAGES = [
  "package.json",
  "apps/argos-extension/package.json",
  "apps/argos-functions/package.json",
  "packages/argos-types/package.json",
  "packages/argos-wit-schema/package.json",
  "packages/argos-sdk/package.json",
  "packages/argos-importers/package.json",
  "packages/argos-exporters/package.json",
  "packages/argos-cli/package.json",
  "packages/argos-detection-api/package.json",
  "packages/argos-gherkin/package.json",
  "tools/azure-pipelines-task/package.json",
];

const VSS_EXTENSION = "apps/argos-extension/vss-extension.json";

function parseArgs() {
  const newVersion = process.argv[2];
  if (!newVersion || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(newVersion)) {
    console.error("Usage: node bump-fixed-version.cjs <semver>");
    console.error("Example: node bump-fixed-version.cjs 0.5.2");
    process.exit(1);
  }
  return newVersion;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, "\t") + "\n", "utf8");
}

function bumpPackageJson(filePath, newVersion) {
  const pkg = readJson(filePath);
  const oldVersion = pkg.version;
  pkg.version = newVersion;
  writeJson(filePath, pkg);
  console.log(`  [v] ${pkg.name}: ${oldVersion} -> ${newVersion} (${filePath})`);
}

function bumpVssExtension(filePath, newVersion) {
  const manifest = readJson(filePath);
  const oldVersion = manifest.version;
  manifest.version = newVersion;
  writeJson(filePath, manifest);
  console.log(`  [v] vss-extension.json: ${oldVersion} -> ${newVersion}`);
}

function main() {
  const newVersion = parseArgs();
  console.log(`\nBumping ${FIXED_PACKAGES.length} packages + vss-extension.json to ${newVersion}\n`);
  
  let count = 0;
  for (const pkgPath of FIXED_PACKAGES) {
    const fullPath = path.resolve(process.cwd(), pkgPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  [!] SKIP: ${pkgPath} (not found)`);
      continue;
    }
    bumpPackageJson(fullPath, newVersion);
    count++;
  }
  
  // vss-extension.json
  const vssPath = path.resolve(process.cwd(), VSS_EXTENSION);
  if (fs.existsSync(vssPath)) {
    bumpVssExtension(vssPath, newVersion);
    count++;
  }
  
  console.log(`\nDONE. ${count} files updated to ${newVersion}.\n`);
  console.log("Reminder: run 'pnpm preflight' and 'pnpm --filter @atconseil/regression-suite test' to validate.\n");
}

main();
```

Tests acceptables (optionnel mais conseille) : juste tester le parsing et l'erreur args, pas le file I/O.

Apres creation, rapporter a l'utilisateur :
"Script `tools/release/bump-fixed-version.cjs` cree. A tester en dry-run plus tard. Pour l'instant on continue avec Sprint 2.5c."

---

## Etape 4 -- Test wiring CasesView -> WorkItemLinkPanel (le plus simple)

`WIRING-2026-05-15-cases-traceability.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CasesView } from "../App.js";

describe("WIRING 2026-05-15 -- CasesView -> WorkItemLinkPanel", () => {
  it("renders WorkItemLinkPanel in 'Traceability' tab", async () => {
    render(<CasesView />);
    const tab = screen.getByRole("tab", { name: /traceability/i });
    fireEvent.click(tab);
    expect(screen.getByTestId("work-item-link-panel")).toBeInTheDocument();
  });
});
```

Lancer : ROUGE.

---

## Etape 5 -- Modifier CasesView dans App.tsx

```tsx
type CasesTab = "details" | "executions" | "traceability";

export function CasesView() {
  const { testCaseService, testExecutionService, workItemLinkService, project } = useServices();
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
        <Tab value="traceability">Traceability</Tab>
      </TabList>
      <div style={{ marginTop: 16 }}>
        {activeTab === "details" && (
          <TestCaseForm service={testCaseService} project={project} />
        )}
        {activeTab === "executions" && (
          <ExecutionHistory service={testExecutionService} project={project} />
        )}
        {activeTab === "traceability" && (
          <WorkItemLinkPanel service={workItemLinkService} project={project} />
        )}
      </div>
    </div>
  );
}
```

Lancer : VERT. Commit intermediaire.

---

## Etape 6 -- Test wiring ReportsView -> CoverageMatrix + SettingsView -> WebhookAdmin (combine)

`WIRING-2026-05-15-reports-and-settings.test.tsx` :

```tsx
describe("WIRING 2026-05-15 -- ReportsView", () => {
  it("renders CoverageMatrix in 'Coverage' tab", async () => {
    render(<ReportsView />);
    const tab = screen.getByRole("tab", { name: /coverage/i });
    fireEvent.click(tab);
    expect(screen.getByTestId("coverage-matrix")).toBeInTheDocument();
  });
  
  it("shows placeholder for Flakiness tab", () => {
    render(<ReportsView />);
    const tab = screen.getByRole("tab", { name: /flakiness/i });
    fireEvent.click(tab);
    expect(screen.getByText(/backend.*not yet/i)).toBeInTheDocument();
  });
});

describe("WIRING 2026-05-15 -- SettingsView -> WebhookAdmin", () => {
  it("renders WebhookAdmin in webhooks section", () => {
    render(<SettingsView />);
    expect(screen.getByTestId("webhook-admin")).toBeInTheDocument();
  });
});
```

Lancer : ROUGE.

---

## Etape 7 -- Modifier ReportsView + SettingsView dans App.tsx

```tsx
// ReportsView avec tabs
type ReportsTab = "coverage" | "flakiness";

export function ReportsView() {
  const { coverageMatrixService, project } = useServices();
  const [activeTab, setActiveTab] = useState<ReportsTab>("coverage");
  
  return (
    <div data-testid="view-reports" style={{ padding: 16 }}>
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Reports
      </Text>
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ReportsTab)}
      >
        <Tab value="coverage">Coverage</Tab>
        <Tab value="flakiness">Flakiness</Tab>
      </TabList>
      <div style={{ marginTop: 16 }}>
        {activeTab === "coverage" && (
          <CoverageMatrix service={coverageMatrixService} project={project} />
        )}
        {activeTab === "flakiness" && (
          <div data-testid="flakiness-placeholder">
            <Text style={{ color: "#666" }} block>
              Flakiness reports require backend not yet deployed.
            </Text>
            <Text style={{ color: "#666", fontSize: "12px" }} block>
              Tracked as TECH-DEBT-017 (argos-functions deploy). Wired in Sprint 2.5d.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

// SettingsView ajout Webhooks
export function SettingsView() {
  const { llmProviderService, environmentConfigService, webhookService, project } = useServices();
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
      
      <div style={{ marginBottom: 32 }}>
        <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
          Environments
        </Text>
        <EnvironmentSettings service={environmentConfigService} project={project} />
      </div>
      
      <div data-testid="settings-webhooks-section">
        <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
          Webhooks
        </Text>
        <WebhookAdmin service={webhookService} project={project} />
      </div>
    </div>
  );
}
```

Lancer : VERT. Commit intermediaire.

---

## Etape 8 -- Test wiring PlansView -> SnapshotPanel + ImportWizard (le plus complexe)

`WIRING-2026-05-15-plans-snapshots-import.test.tsx` :

```tsx
describe("WIRING 2026-05-15 -- PlansView", () => {
  it("renders SnapshotPanel in 'Snapshots' tab", () => {
    render(<PlansView />);
    const tab = screen.getByRole("tab", { name: /snapshots/i });
    fireEvent.click(tab);
    expect(screen.getByTestId("snapshot-panel")).toBeInTheDocument();
  });
  
  it("SnapshotPanel exposes diff via SnapshotDiffPanel", () => {
    // Snapshot diff peut etre dans SnapshotPanel ou separate
    // Test verifie le rendu du diff panel quand l'utilisateur ouvre la comparaison
    render(<PlansView />);
    fireEvent.click(screen.getByRole("tab", { name: /snapshots/i }));
    // Le DiffPanel peut etre integre dans SnapshotPanel ; tester sa presence
    expect(screen.queryByTestId("snapshot-diff-panel")).toBeInTheDocument();
  });
  
  it("opens ImportWizard dialog from header button", () => {
    render(<PlansView />);
    const importBtn = screen.getByRole("button", { name: /import/i });
    fireEvent.click(importBtn);
    expect(screen.getByTestId("import-wizard-dialog")).toBeInTheDocument();
  });
});
```

Lancer : ROUGE.

---

## Etape 9 -- Modifier PlansView dans App.tsx

```tsx
import { Dialog, DialogTrigger, Button } from "@fluentui/react-components";

type PlansTab = "details" | "run" | "snapshots";

export function PlansView() {
  const { testPlanService, testExecutionService, evidenceUploadService, bugCreationService, 
          snapshotService, importerService, project } = useServices();
  const [activeTab, setActiveTab] = useState<PlansTab>("details");
  const [importOpen, setImportOpen] = useState(false);
  
  return (
    <div data-testid="view-plans">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text as="h2" size={500} weight="semibold">
          Test Plans
        </Text>
        <Dialog open={importOpen} onOpenChange={(_, data) => setImportOpen(data.open)}>
          <DialogTrigger>
            <Button>Import</Button>
          </DialogTrigger>
          <div data-testid="import-wizard-dialog">
            {importOpen && (
              <ImportWizard service={importerService} project={project} onClose={() => setImportOpen(false)} />
            )}
          </div>
        </Dialog>
      </div>
      
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as PlansTab)}
      >
        <Tab value="details">Plan Details</Tab>
        <Tab value="run">Run</Tab>
        <Tab value="snapshots">Snapshots</Tab>
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
        {activeTab === "snapshots" && (
          <SnapshotPanel 
            service={snapshotService}
            project={project}
          />
          // Si SnapshotDiffPanel est separate, le placer ici aussi conditionnellement
        )}
      </div>
    </div>
  );
}
```

⚠ **Adapter selon les APIs reelles** lues Etape 1. Notamment :
- SnapshotDiffPanel peut etre integre dans SnapshotPanel ou separate
- ImportWizard peut necessiter d'autres props (callback onComplete, etc.)
- Dialog Fluent UI pattern peut varier

Lancer : VERT. Commit intermediaire.

---

## Etape 10 -- Modifier `Specs/tasks.md`

Phase 3 :
- T-3.1 (WorkItemLinkPanel) : cocher sous-taches "lien bidirectionnel WI-TC", "preserved on update"
- T-3.2 (SnapshotPanel) : cocher "Creation snapshot tagged", "Listing snapshots"
- T-3.3 (SnapshotDiffPanel) : cocher "Comparateur visuel", "Highlight differences"
- T-3.5 (CoverageMatrix) : cocher "Matrice exigences <-> TC", "Filters"

Phase 4 :
- T-4.2 (ImportWizard) : cocher sous-taches "UI wizard etapes", "Selection fichier", "Preview", "Map fields"
- T-4.8 (WebhookAdmin) : cocher sous-taches code UI "Liste webhooks", "Creation token"

NE PAS cocher :
- T-3.7 E2E phase 3 (a verifier ailleurs)
- T-4.9 E2E phase 4 (a verifier ailleurs)
- T-4.8 sous-taches "deploy" (depend argos-functions deploy, TECH-DEBT-017)

---

## Etape 11 -- Bump version 0.5.1 -> 0.5.2 via script

```powershell
# Utiliser le script cree Etape 3
node tools\release\bump-fixed-version.cjs 0.5.2

# Verification immediate
Write-Host "=== Versioning post-bump ===" -ForegroundColor Cyan
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  Racine : $($root.name)@$($root.version)"

# Sanity test fixed-versioning
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10
```

Si CFG-2026-05-14-fixed-versioning rouge -> debug immediat (probable package oublie).

---

## Etape 12 -- CHANGELOG + MIGRATION-PLAN

### 12.1 -- CHANGELOG.md section [0.5.2]

Dans la section `[Unreleased]`, ajouter :

```markdown
## [0.5.2] - 2026-05-15

### Added

**Sprint 2.5c -- Phase 3+4 wiring** (6 composants UI riches integres dans App.tsx) :

- **WorkItemLinkPanel (T-3.1)** wireee dans CasesView via tab "Traceability" -- permet de lier un TestCase a un WI ADO (Bug, User Story, etc.) avec lien bidirectionnel.
- **SnapshotPanel (T-3.2)** wireee dans PlansView via tab "Snapshots" -- gestion des snapshots tagges d'un Test Plan.
- **SnapshotDiffPanel (T-3.3)** integre dans SnapshotPanel -- comparateur de versions avec mise en evidence des differences.
- **CoverageMatrix (T-3.5)** wireee dans ReportsView via tab "Coverage" (premier tab Reports, prepare le tab Flakiness Sprint 2.5d).
- **ImportWizard (T-4.2)** wireee dans PlansView via bouton header "Import" -> Dialog Fluent UI.
- **WebhookAdmin (T-4.8 partie UI)** wireee dans SettingsView en section dediee -- admin des webhooks (note : deploy backend reste TECH-DEBT-017).

### Tools

- **NEW** `tools/release/bump-fixed-version.cjs` -- script de bump version pour les 12 packages fixed mode + vss-extension.json. Usage : `node tools/release/bump-fixed-version.cjs 0.5.2`. Resout TECH-DEBT-037.

### Tests

- 3 nouveaux tests wiring :
  - `WIRING-2026-05-15-cases-traceability.test.tsx`
  - `WIRING-2026-05-15-plans-snapshots-import.test.tsx`
  - `WIRING-2026-05-15-reports-and-settings.test.tsx`
- Tests regression : 60 -> 63 passing

### Changed

- App.tsx : extension de PlansView (tab "Snapshots" + bouton Import), CasesView (tab "Traceability"), ReportsView (tabs "Coverage" + "Flakiness placeholder"), SettingsView (section "Webhooks")
- services.ts : nouveaux services exposes (snapshotService, workItemLinkService, coverageMatrixService, importerService, webhookService)
- Specs/tasks.md : cochage Phase 3 + Phase 4 wiring (T-3.1, T-3.2, T-3.3, T-3.5, T-4.2, T-4.8 UI)

### TECH-DEBT noted

#### TECH-DEBT-037 -- Bump version fixed mode = 12 packages manuellement (LIVRE ICI)

**Contexte** : Sprint 8 a etabli le fixed mode (12 packages alignes exactement). Sprint 2.5b a casse la CI en bumpant seulement 3 fichiers (package.json racine + apps/argos-extension/package.json + vss-extension.json). Le test `CFG-2026-05-14-fixed-versioning` a detecte l'incoherence en CI.

**Lecon** : pour tout bump manuel hors release Changesets, bumper SIMULTANEMENT les 12 packages :
- package.json (racine)
- apps/argos-extension/package.json
- apps/argos-functions/package.json
- packages/argos-types/package.json
- packages/argos-wit-schema/package.json
- packages/argos-sdk/package.json
- packages/argos-importers/package.json
- packages/argos-exporters/package.json
- packages/argos-cli/package.json
- packages/argos-detection-api/package.json
- packages/argos-gherkin/package.json
- tools/azure-pipelines-task/package.json
+ apps/argos-extension/vss-extension.json (string version)

NE PAS bumper :
- tools/argos-action/ (no package.json, just action.yml)
- tools/regression/package.json (HORS GROUPE fixed mode)

**Resolution** : script `tools/release/bump-fixed-version.cjs` cree dans ce sprint. Usage : `node tools/release/bump-fixed-version.cjs 0.5.2`.

#### TECH-DEBT-038 NEW -- CoveragePanel widget code existe mais affiche rien

**Contexte** : CoveragePanel.tsx (widget WI form) est code et a un point d'entree separe via vss-extension.json (Sprint 0.1.1). Mais l'investigation Sprint 2.5c revele qu'il n'affiche rien actuellement.

**Hypotheses** :
- Props manquants ou mal passes au point d'entree
- Service backend pas relie (coverage data)
- Implementation incomplete malgre tests passants (les tests testent peut-etre le rendu d'un etat vide ?)

**Action** : investigation dediee dans un sprint futur (Sprint 2.5e ou audit Phase 3 ciblage CoveragePanel). En attendant, le widget reste "place" dans le manifest mais non fonctionnel pour l'utilisateur final.

### Lessons learned (Sprint 2.5c)

- **Script bump-fixed-version essentiel** : evite l'erreur Sprint 2.5b et le travail manuel
- **TabList + multi-tab** se generalise tres bien : PlansView, CasesView, ReportsView ont chacun leurs sub-tabs avec un pattern identique
- **Dialog pattern Fluent UI** : bouton header + Dialog conditionnellement rendu = UX propre pour actions ponctuelles (Import)
- **Composants riches Sprint 1 = wiring trivial** : encore une fois, l'architecture solide de Sprint 1 paie (services en props, pas de magic)
- **CoveragePanel a vide** : decouverte importante, pas tous les composants riches sont 100% fonctionnels. L'audit doit etre suivi d'**execution manuelle** des composants pour confirmer leur usability.
```

### 12.2 -- MIGRATION-PLAN.md ajout

Apres la note audit Phase 2-7 :

```markdown
> **Sprint 2.5b + 2.5c livres 2026-05-15** :
> - Sprint 2.5b : Phase 2 wiring (5 composants) -- 0.5.0 -> 0.5.1
> - Sprint 2.5c : Phase 3+4 wiring (6 composants) -- 0.5.1 -> 0.5.2
> - Total apres 2.5c : 11 composants Phase 2-4 wirees, 13 a wirer Sprint 2.5d (Phase 5+6+7)
> 
> **TECH-DEBT-037 LIVRE** : script `tools/release/bump-fixed-version.cjs` cree pour les bumps fixed mode (12 packages alignes). Resout l'echec CI Sprint 2.5b.
> 
> **TECH-DEBT-038 NEW** : CoveragePanel widget en code mais non fonctionnel (affiche rien). Investigation dediee future.
```

---

## Etape 13 -- Validation

```powershell
# 1. Mojibake
node tools\regression\scan-mojibake.cjs

# 2. Tests regression (cible 63)
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5

# 3. Test specifique fixed-versioning
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10

# 4. Turbo test global (cible 328+ → ~331)
pnpm turbo test --force 2>&1 | Select-Object -Last 15

# 5. Lint + typecheck
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

# 6. Build
pnpm turbo build --force 2>&1 | Select-Object -Last 10

# 7. Preflight
pnpm preflight

# 8. Verifier fichiers
Test-Path tools\release\bump-fixed-version.cjs
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-cases-traceability.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-plans-snapshots-import.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-reports-and-settings.test.tsx

# 9. Versioning
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Version racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.2
```

---

## Etape 14 -- Archive + commit

### 14.1 -- Archiver le prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-5c.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-5c.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-5c.md
}
```

### 14.2 -- Pre-commit ASCII

```powershell
$msg = "feat(hub): Sprint 2.5c wire Phase 3+4 components (6 UI) + bump-fixed-version script"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

### 14.3 -- Commit (-F)

Creer `$env:TEMP\commit-msg-sprint-2-5c.txt` :

```
feat(hub): Sprint 2.5c wire Phase 3+4 components (6 UI) + bump-fixed-version script

Sprint 2.5c -- Phase 3+4 wiring : 6 composants UI riches integres dans App.tsx.
Bonus : script bump-fixed-version.cjs (resout TECH-DEBT-037).

Composants wirees:
- WorkItemLinkPanel (T-3.1) dans CasesView tab "Traceability"
- SnapshotPanel (T-3.2) dans PlansView tab "Snapshots"
- SnapshotDiffPanel (T-3.3) integre dans SnapshotPanel
- CoverageMatrix (T-3.5) dans ReportsView tab "Coverage"
- ImportWizard (T-4.2) PlansView bouton Import -> Dialog
- WebhookAdmin (T-4.8 UI) dans SettingsView section Webhooks

Architecture:
- App.tsx : sub-tabs Fluent UI pour PlansView, CasesView, ReportsView + sections empilees SettingsView
- services.ts : nouveaux services exposes (snapshotService, workItemLinkService, coverageMatrixService, importerService, webhookService)
- ReportsView : remplacement placeholder par TabList (Coverage + Flakiness placeholder pour Sprint 2.5d)

Tests:
- 3 nouveaux tests wiring WIRING-2026-05-15-*
- Tests regression: 60 -> 63 passing

Bonus script:
- tools/release/bump-fixed-version.cjs (Node.js)
- Bumpe les 12 packages fixed mode + vss-extension.json en une commande
- Usage: node tools/release/bump-fixed-version.cjs 0.5.2
- Documente quels packages sont bumped et lesquels sont skipped

Version bump 0.5.1 -> 0.5.2 via le nouveau script (12 packages).

Files changed:
- apps/argos-extension/src/hub/App.tsx (extensions des 4 Views)
- apps/argos-extension/src/hub/services.ts (services Phase 3+4)
- apps/argos-extension/src/hub/wiring/WIRING-2026-05-15-*.test.tsx (3 NEW)
- tools/release/bump-fixed-version.cjs (NEW)
- Specs/tasks.md (Phase 3+4 wiring cochee)
- Specs/MIGRATION-PLAN.md (Sprint 2.5b/c documentes)
- CHANGELOG.md ([0.5.2] section)
- 12 package.json + vss-extension.json (bump 0.5.1 -> 0.5.2)

TECH-DEBT:
- TECH-DEBT-037 LIVRE : bump-fixed-version script cree
- TECH-DEBT-038 NEW : CoveragePanel widget en code mais affiche rien (investigation future)

Decisions tracees:
- D19-B : Skip CoveragePanel (TECH-DEBT-038)
- D20-A : ImportWizard via bouton header PlansView
- D21-A : WorkItemLinkPanel tab Traceability CasesView
- D22-B : CoverageMatrix tab Coverage ReportsView (prepare Flakiness Sprint 2.5d)

Refs: Specs/audit-resync-2026-05-15.md, Sprint 2.5b
```

Puis :
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-5c.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-5c.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-5c.txt"

git push -u origin feat/sprint-2-5c-phase3-4-wiring
```

### 14.4 -- PR

```powershell
$prBody = @'
## Summary

Sprint 2.5c -- Phase 3+4 wiring : 6 composants UI riches integres dans App.tsx + bonus script `bump-fixed-version.cjs` (resout TECH-DEBT-037).

**Bump 0.5.1 -> 0.5.2** via le nouveau script (12 packages fixed mode).

## Composants wirees

| Tache | Composant | Wiring |
|-------|-----------|--------|
| T-3.1 | WorkItemLinkPanel | CasesView tab "Traceability" |
| T-3.2 | SnapshotPanel | PlansView tab "Snapshots" |
| T-3.3 | SnapshotDiffPanel | Integre dans SnapshotPanel |
| T-3.5 | CoverageMatrix | ReportsView tab "Coverage" |
| T-4.2 | ImportWizard | PlansView header bouton "Import" -> Dialog |
| T-4.8 (UI) | WebhookAdmin | SettingsView section "Webhooks" |

## Bonus : tools/release/bump-fixed-version.cjs

Script Node.js qui bumpe les 12 packages fixed mode + vss-extension.json en une commande. Resout TECH-DEBT-037 (cause CI fail Sprint 2.5b).

Usage : `node tools/release/bump-fixed-version.cjs 0.5.2`

## Tests

- 3 nouveaux tests wiring :
  - WIRING-2026-05-15-cases-traceability.test.tsx
  - WIRING-2026-05-15-plans-snapshots-import.test.tsx
  - WIRING-2026-05-15-reports-and-settings.test.tsx
- Tests regression : 60 -> 63 passing
- Test CFG-2026-05-14-fixed-versioning : OK apres bump 0.5.2

## Validation

- Tests regression : 63/63 passing
- Turbo test --force : ~331 tests
- Lint + typecheck + build --force : OK
- Mojibake : 0
- Preflight : PASSED (argos@0.5.2)

## TECH-DEBT

- **TECH-DEBT-037 LIVRE** : script bump-fixed-version.cjs
- **TECH-DEBT-038 NEW** : CoveragePanel widget en code mais affiche rien (investigation dediee future)

## Apres merge

Sprint 2.5d : Phase 5+6+7 wiring (8 composants : GherkinEditor, RepoMappingSettings, AiCandidatesModal, AuditLogSettings, BetaOptIn, QuotaSettings, FlakinessReport placeholder, OfflineBanner)
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-5c.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(hub): Sprint 2.5c wire Phase 3+4 components (6 UI) + bump script" `
  --body-file "$env:TEMP\pr-body-sprint-2-5c.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-5c.txt"
```

---

## Etape 15 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-5c-phase3-4-wiring

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 63 passing

pnpm preflight
# PASSED argos@0.5.2

# Verifier dernier commit
git log --oneline | Select-Object -First 5
```

---

## Criteres de done

- [ ] Branche `feat/sprint-2-5c-phase3-4-wiring` creee
- [ ] App.tsx etendu : PlansView (tab Snapshots + bouton Import), CasesView (tab Traceability), ReportsView (tabs Coverage + Flakiness placeholder), SettingsView (section Webhooks)
- [ ] services.ts expose les 5 nouveaux services Phase 3+4
- [ ] 3 nouveaux tests wiring WIRING-2026-05-15-*
- [ ] **`tools/release/bump-fixed-version.cjs` cree et fonctionnel** (TECH-DEBT-037 livre)
- [ ] 63 tests regression passing (etait 60)
- [ ] Test CFG-2026-05-14-fixed-versioning passe (sanity post-bump)
- [ ] Turbo test --force passing (~331 tests)
- [ ] Lint + typecheck + build --force OK
- [ ] Specs/tasks.md Phase 3+4 wiring cochee
- [ ] CHANGELOG.md section [0.5.2] complete avec TECH-DEBT-037 livre + TECH-DEBT-038 NEW
- [ ] MIGRATION-PLAN.md mis a jour
- [ ] **Tous les 12 packages alignes a 0.5.2** + vss-extension.json
- [ ] 0 mojibake
- [ ] 0 modification manifest vss-extension.json (au-dela de la version)
- [ ] **Commit message 100% ASCII**
- [ ] Prompt archive
- [ ] Commit + PR ouverte
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "App.tsx + services + composants lus. Props observees : [lister pour chaque composant]. Notamment : SnapshotDiffPanel est [integre/separate], ImportWizard prend [props]. Estimation revisee : XX min. Confirmation Etape 2 ?"

2. **Apres Etape 3** : "Script bump-fixed-version.cjs cree. Sera teste lors du bump Etape 11. Continue Sprint 2.5c."

3. **Apres Etape 5** : "CasesView wireee avec WorkItemLinkPanel tab Traceability. Test WIRING-2026-05-15-cases-traceability VERT. Continue ReportsView + SettingsView ?"

4. **Apres Etape 9** : "PlansView complete (Snapshots + Import). 3 tests wiring verts. Total 63 tests regression. Pret pour bump 0.5.2 via le script ?"

5. **Apres Etape 11** : "Bump 0.5.2 effectue via script (12 packages + vss-extension.json). Test CFG-2026-05-14-fixed-versioning : VERT. Pret pour Etape 12 CHANGELOG ?"

6. **Apres Etape 13** : "Validation complete : 63 tests + lint + typecheck + build verts. 0 mojibake. argos@0.5.2. Pret a commit ?"

7. **Apres Etape 14.4** : "PR ouverte. Apres merge GitHub, lance Etape 15 (post-merge cleanup)."

---

## Apres ca

- Pause optionnelle (~10 min)
- **Sprint 2.5d** : Wiring Phase 5+6+7 (8 composants : GherkinEditor, RepoMappingSettings, AiCandidatesModal, AuditLogSettings, BetaOptIn, QuotaSettings, FlakinessReport, OfflineBanner)
- Apres Sprint 2.5d : TOUS les composants Phase 2-7 wirees, on peut passer aux ops Phase 7 ou TECH-DEBT-017/018

Bon sprint !
