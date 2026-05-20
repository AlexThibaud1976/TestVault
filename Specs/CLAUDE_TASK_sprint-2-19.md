# CLAUDE_TASK : Sprint 2.19 - UI generalisation aux 6 autres WIT

Repo : E:\Code\TestVault
Branche : feature/sprint-2-19-ui-generalization
Cible : version 0.5.25 (Marketplace + npm @atconseil/argos-cli)
Estimation : 3-4 heures pour Claude Code

---

## 0. CONTEXTE ET OBJECTIF

### 0.1 Etat avant ce sprint

Sprint 2.18 a livre une UI Test Plan complete avec design system, AppShell + Sidebar 220px,
TestPlansListView et TestPlanFormView. Sprint 2.18.3 a unifie le hub ADO (single entry),
Sprint 2.18.4 a restaure argos-hub-group pour la sidebar ADO visibility.

Architecture actuelle :
- 1 hub ADO entry "Argos"
- Notre Sidebar custom 220px avec 6 items : Test Plans (active), 5 placeholders ComingSoonView
- Design system mature : tokens.css + 9 composants (Button/Input/Badge/Card/Table/FilterChip/EmptyState/Select/SectionCollapsible)
- useArgosCreate / useArgosList / useArgosRouting hooks generiques pour 7 WIT
- Backend CRUD complet sur 7 WIT (Test Plan, Test Case, Test Set, Precondition, Test Execution, Test Case Version, Audit Log)

### 0.2 Objectif Sprint 2.19

Generaliser les vues UI (List + Form) aux 6 autres WIT avec le meme design system que Test Plan,
afin d'avoir un produit DEMO-ABLE complet et CONSISTANT sur les 7 WIT.

A la fin de ce sprint :
- 4 WIT auront List + Form complete : Test Case, Test Set, Precondition, Test Execution
- 2 WIT auront vue simple : Test Case Version (read-only snapshots), Audit Log (read-only list)
- Tous les ComingSoonView places en Sprint 2.18 sont remplaces par des vues fonctionnelles
- Pattern de reutilisation des composants design system documente
- Pas de regression Test Plan UI ou backend CRUD

### 0.3 Constraints CRITIQUES (NE PAS VIOLER)

- TESTVAULT_SCHEMA referenceName : IMMUTABLE (Custom.TestVaultPlan, Custom.TestVaultCase, etc.)
- argos-wit-schema = source of truth pour naming (ne PAS dupliquer dans services)
- WitResolver runtime cache : preserve
- Design system : utiliser EXCLUSIVEMENT les tokens.css + composants existants
- Pas de nouveau composant base sauf si justifie (et alors avec storybook entry)
- Pas de fetch direct ADO API dans les views (utiliser hooks)
- ASCII strict dans tous les commentaires et messages (em-dash interdit)

---

## 1. PERIMETRE TECHNIQUE

### 1.1 WIT couverts par ce sprint

| WIT | Liste | Form | Notes |
|---|---|---|---|
| Test Case | OUI | OUI | Champs principaux + Gherkin placeholder (Sprint 2.21) |
| Test Set | OUI | OUI | Linked Test Cases section |
| Precondition | OUI | OUI | Reusable preconditions library |
| Test Execution | OUI | OUI | Run interface basique (results recording) |
| Test Case Version | OUI | NON | Read-only snapshots list |
| Audit Log | OUI | NON | Read-only activity log |

### 1.2 Fichiers crees / modifies

```
apps/argos-extension/src/hub/views/
  TestCasesListView.tsx           [NEW]
  TestCaseFormView.tsx             [NEW]
  TestSetsListView.tsx             [NEW]
  TestSetFormView.tsx              [NEW]
  PreconditionsListView.tsx        [NEW]
  PreconditionFormView.tsx         [NEW]
  TestExecutionsListView.tsx       [NEW]
  TestExecutionFormView.tsx        [NEW]
  TestCaseVersionsListView.tsx     [NEW]
  AuditLogListView.tsx             [NEW]

apps/argos-extension/src/hub/components/
  WitStatusBadge.tsx                [NEW] (badge generic pour status WIT)
  WitFilterBar.tsx                  [NEW] (filter bar generic reusable)
  WitListHeader.tsx                 [NEW] (header generic List view)

apps/argos-extension/src/hub/hooks/
  use-argos-routing.ts              [MODIFIED] (routing pour 6 nouvelles vues)

apps/argos-extension/src/hub/App.tsx [MODIFIED] (route mapping)
apps/argos-extension/src/hub/components/Sidebar.tsx [MODIFIED] (icons updates)

tools/regression/
  T-2.19-test-case-list-view.test.ts     [NEW]
  T-2.19-test-set-list-view.test.ts      [NEW]
  T-2.19-precondition-list-view.test.ts  [NEW]
  T-2.19-test-execution-list-view.test.ts [NEW]
  T-2.19-test-case-version-list.test.ts  [NEW]
  T-2.19-audit-log-list.test.ts          [NEW]
```

### 1.3 Pattern de reutilisation (CRITIQUE)

Pour eviter de coder 6 fois la meme chose, creer 3 composants generiques :

#### WitListHeader.tsx

```tsx
import { Button } from "../components/Button";

interface WitListHeaderProps {
    title: string;
    count: number;
    onImport?: () => void;
    onCreate?: () => void;
    createLabel?: string;
}

export function WitListHeader({ title, count, onImport, onCreate, createLabel }: WitListHeaderProps) {
    return (
        <div className="argos-list-header">
            <div className="argos-list-header__title-group">
                <h1 className="argos-list-header__title">{title}</h1>
                <span className="argos-list-header__count">{count}</span>
            </div>
            <div className="argos-list-header__actions">
                {onImport && (
                    <Button variant="secondary" onClick={onImport}>
                        Import
                    </Button>
                )}
                {onCreate && (
                    <Button variant="primary" onClick={onCreate}>
                        {createLabel ?? "+ New"}
                    </Button>
                )}
            </div>
        </div>
    );
}
```

#### WitFilterBar.tsx

```tsx
import { Input } from "../components/Input";
import { FilterChip } from "../components/FilterChip";

interface FilterOption {
    key: string;
    label: string;
    count?: number;
}

interface WitFilterBarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters?: FilterOption[];
    activeFilters?: string[];
    onFilterToggle?: (key: string) => void;
}

export function WitFilterBar({ 
    searchValue, 
    onSearchChange, 
    searchPlaceholder = "Search...",
    filters,
    activeFilters,
    onFilterToggle,
}: WitFilterBarProps) {
    return (
        <div className="argos-filter-bar">
            <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="argos-filter-bar__search"
            />
            {filters && filters.length > 0 && (
                <div className="argos-filter-bar__chips">
                    {filters.map((filter) => (
                        <FilterChip
                            key={filter.key}
                            label={filter.label}
                            count={filter.count}
                            active={activeFilters?.includes(filter.key) ?? false}
                            onClick={() => onFilterToggle?.(filter.key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
```

#### WitStatusBadge.tsx

```tsx
import { Badge } from "../components/Badge";

interface WitStatusBadgeProps {
    status: string;
    witType?: "plan" | "case" | "set" | "precondition" | "execution" | "version" | "audit";
}

// Mapping status -> variant Badge color
function getVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
    const s = status.toLowerCase();
    if (s.includes("pass") || s.includes("active") || s.includes("approved")) return "success";
    if (s.includes("fail") || s.includes("blocked") || s.includes("rejected")) return "danger";
    if (s.includes("draft") || s.includes("pending") || s.includes("design")) return "warning";
    if (s.includes("inprogress") || s.includes("review")) return "info";
    return "default";
}

export function WitStatusBadge({ status, witType }: WitStatusBadgeProps) {
    return <Badge variant={getVariant(status)}>{status}</Badge>;
}
```

---

## 2. DETAIL PAR WIT

### 2.1 Test Case (priorite haute - WIT le plus utilise)

#### TestCasesListView.tsx

Layout identique a TestPlansListView mais adapte :
- Header : "Test Cases" + count + Import + "+ New Test Case"
- FilterBar : search + chips (Draft / Active / Deprecated)
- Table colonnes :
  - ID (#123)
  - Title (link)
  - Status (WitStatusBadge)
  - Priority (P1/P2/P3 badge)
  - Tags (chips)
  - Last Modified (date)
- Actions row : Edit / Duplicate / Archive
- EmptyState si aucun test case : "Create your first test case"

Hook : `useArgosList({ witType: 'test-case' })`

#### TestCaseFormView.tsx

Sections collapsibles :

Section 1 : General Information
- Title (Input, required)
- Description (TextArea)
- Priority (Select : P1, P2, P3, P4)
- Tags (multi-select)

Section 2 : Test Steps
- Pour MVP Sprint 2.19 : liste simple <ol> avec input par step
- Add Step / Remove Step / Reorder
- Pour Sprint 2.21 : Gherkin editor avance (Given/When/Then)

Section 3 : Expected Results
- Textarea : expected behavior global

Section 4 : Linked Items
- Linked User Stories / Bugs (work item picker basique)
- Pour Sprint 2.20 : real ADO work item picker
- Pour Sprint 2.19 : liste simple ids ajoutes

Section 5 : Metadata
- Area Path (mock pour Sprint 2.19)
- Iteration (mock pour Sprint 2.19)

Hook : `useArgosCreate({ witType: 'test-case' })` ou `useArgosUpdate` si edit mode

### 2.2 Test Set

#### TestSetsListView.tsx

- Header : "Test Sets" + count + Import + "+ New Test Set"
- FilterBar : search + chips (Active / Deprecated)
- Table colonnes :
  - ID
  - Name (link)
  - Test Cases count (X / Y)
  - Owner
  - Last Modified
- EmptyState

#### TestSetFormView.tsx

Sections :

Section 1 : General Information
- Name (required)
- Description
- Tags

Section 2 : Linked Test Cases
- Drag-drop list (Sprint 2.23 sera vraie reorder)
- Add Test Cases (modal picker basique - liste cocheable)
- Pour Sprint 2.19 : simple list avec checkbox add/remove

Section 3 : Execution Settings (placeholder)
- Default environment
- Default tester

### 2.3 Precondition

Reusable preconditions library. Une precondition = un setup reutilisable
(ex: "User logged in as admin", "Database initialized with sample data").

#### PreconditionsListView.tsx

- Header : "Preconditions" + count + "+ New Precondition"
- FilterBar : search + chips (Database / Authentication / Configuration / Other)
- Table :
  - ID
  - Name
  - Category (badge)
  - Used by (count of test cases referencing)
  - Last Modified

#### PreconditionFormView.tsx

Section 1 : General Information
- Name (required)
- Description
- Category (Select : Database / Authentication / Configuration / Other / Custom)

Section 2 : Setup Steps
- Setup procedure (textarea)
- Cleanup procedure (textarea)

Section 3 : Used By (read-only liste test cases qui l'utilisent)

### 2.4 Test Execution

UI plus complexe que les autres : c'est une RUN interface.

#### TestExecutionsListView.tsx

- Header : "Test Executions" + count + "+ New Run"
- FilterBar : search + chips par statut (Pending / InProgress / Completed / Failed)
- Table :
  - ID
  - Name (link)
  - Status (badge)
  - Pass rate (X/Y - 80%)
  - Environment
  - Executed by
  - Started date

#### TestExecutionFormView.tsx

Sections :

Section 1 : Execution Configuration
- Test Plan (Select)
- Test Set (Select, optional)
- Environment (Select : dev / qa / prod / custom)
- Tester (user picker basique)

Section 2 : Test Results
- Liste des test cases lies au plan/set selectionne
- Pour chaque test case :
  - Status select : Not Run / Pass / Fail / Blocked
  - Actual result (textarea)
  - Notes
  - Attachments placeholder

Section 3 : Summary
- Auto-calcule : X passed / Y failed / Z blocked / Total
- Progress bar

### 2.5 Test Case Version (read-only)

Liste des snapshots historiques d'un test case.
Pour Sprint 2.19, juste vue liste read-only.
Pour Sprint 2.24 : interactive diff viewer.

#### TestCaseVersionsListView.tsx

- Pas de Form view (read-only)
- Header : "Test Case Versions" + count
- FilterBar : search par test case ID
- Table :
  - Version (#1, #2, etc.)
  - Test Case ID
  - Title at this version
  - Changed by
  - Changed date
  - Action : "View snapshot" (modal read-only pour Sprint 2.19)

### 2.6 Audit Log (read-only)

Journal d'activite de l'instance Argos.

#### AuditLogListView.tsx

- Pas de Form
- Header : "Audit Log" + count + Export CSV (placeholder)
- FilterBar : search + chips par action (Created / Updated / Deleted / Executed / Configured)
- Table :
  - Timestamp
  - User
  - Action (badge)
  - Entity Type (TestPlan / TestCase / etc.)
  - Entity ID
  - Details (truncated)

---

## 3. ROUTING

### 3.1 useArgosRouting hook update

```typescript
// Routes supportes
export type ArgosRoute = 
    | { type: 'dashboard' }            // Sprint 2.27
    | { type: 'test-plans-list' }
    | { type: 'test-plan-form'; planId?: string }
    | { type: 'test-cases-list' }       // NEW
    | { type: 'test-case-form'; caseId?: string }  // NEW
    | { type: 'test-sets-list' }        // NEW
    | { type: 'test-set-form'; setId?: string }    // NEW
    | { type: 'preconditions-list' }    // NEW
    | { type: 'precondition-form'; preconditionId?: string }  // NEW
    | { type: 'test-executions-list' }  // NEW
    | { type: 'test-execution-form'; executionId?: string }  // NEW
    | { type: 'test-case-versions-list' }  // NEW
    | { type: 'audit-log-list' }        // NEW
    | { type: 'reports' }
    | { type: 'settings' };
```

### 3.2 App.tsx mapping

Remplacer les 5 ComingSoonView par les vraies vues, en gardant la meme structure switch :

```tsx
function renderView(route: ArgosRoute) {
    switch (route.type) {
        case 'test-plans-list': return <TestPlansListView />;
        case 'test-plan-form': return <TestPlanFormView planId={route.planId} />;
        case 'test-cases-list': return <TestCasesListView />;
        case 'test-case-form': return <TestCaseFormView caseId={route.caseId} />;
        case 'test-sets-list': return <TestSetsListView />;
        case 'test-set-form': return <TestSetFormView setId={route.setId} />;
        case 'preconditions-list': return <PreconditionsListView />;
        case 'precondition-form': return <PreconditionFormView preconditionId={route.preconditionId} />;
        case 'test-executions-list': return <TestExecutionsListView />;
        case 'test-execution-form': return <TestExecutionFormView executionId={route.executionId} />;
        case 'test-case-versions-list': return <TestCaseVersionsListView />;
        case 'audit-log-list': return <AuditLogListView />;
        case 'reports': return <ReportsView />; // existant
        case 'settings': return <SettingsView />; // existant
        case 'dashboard': return <ComingSoonView feature="Dashboard" sprint="2.27" />;
        default: return <TestPlansListView />;
    }
}
```

### 3.3 Sidebar.tsx update

Ajouter Dashboard tout en haut (avec icon lucide LayoutDashboard) :

```tsx
const SIDEBAR_ITEMS = [
    { icon: LayoutDashboard, label: "Dashboard", route: { type: 'dashboard' }, badge: "Soon" },
    { icon: ClipboardList, label: "Test Plans", route: { type: 'test-plans-list' } },
    { icon: TestTube, label: "Test Cases", route: { type: 'test-cases-list' } },
    { icon: Layers, label: "Test Sets", route: { type: 'test-sets-list' } },
    { icon: Settings2, label: "Preconditions", route: { type: 'preconditions-list' } },
    { icon: Play, label: "Test Executions", route: { type: 'test-executions-list' } },
    { icon: History, label: "Test Case Versions", route: { type: 'test-case-versions-list' } },
    { icon: ScrollText, label: "Audit Log", route: { type: 'audit-log-list' } },
    { icon: BarChart3, label: "Reports", route: { type: 'reports' } },
    { icon: Settings, label: "Settings", route: { type: 'settings' } },
];
```

NOTE : Dashboard avec badge "Soon" pour annoncer la roadmap (USP marketing).

---

## 4. TESTS REGRESSION

### 4.1 Tests par vue

Pour chaque vue (List View) :

```typescript
// tools/regression/T-2.19-test-case-list-view.test.ts
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestCasesListView } from "../../apps/argos-extension/src/hub/views/TestCasesListView";

describe("T-2.19 TestCasesListView", () => {
    it("renders header with title and count", () => {
        render(<TestCasesListView />);
        expect(screen.getByText("Test Cases")).toBeInTheDocument();
        expect(screen.getByText(/^\d+$/)).toBeInTheDocument();
    });

    it("renders filter bar with search input", () => {
        render(<TestCasesListView />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("renders empty state when no test cases", () => {
        // Mock useArgosList to return empty array
        render(<TestCasesListView />);
        // Either EmptyState or table - one of them must be present
        const hasEmptyState = screen.queryByText(/create your first test case/i);
        const hasTable = screen.queryByRole("table");
        expect(hasEmptyState || hasTable).toBeTruthy();
    });

    it("create button triggers navigation to form", () => {
        render(<TestCasesListView />);
        const createButton = screen.getByRole("button", { name: /new test case/i });
        expect(createButton).toBeInTheDocument();
    });
});
```

### 4.2 Test design system reutilisation

```typescript
// tools/regression/T-2.19-design-system-reuse.test.ts
import { describe, it, expect } from "vitest";

describe("T-2.19 Design system reuse", () => {
    it("All List views use WitListHeader component", async () => {
        const views = [
            "TestCasesListView",
            "TestSetsListView",
            "PreconditionsListView",
            "TestExecutionsListView",
            "TestCaseVersionsListView",
            "AuditLogListView",
        ];
        
        for (const view of views) {
            const module = await import(`../../apps/argos-extension/src/hub/views/${view}`);
            const source = module.default?.toString() ?? module[view]?.toString() ?? "";
            // Check WitListHeader is imported and used
            expect(source).toMatch(/WitListHeader/);
        }
    });
});
```

### 4.3 Test routing

```typescript
// tools/regression/T-2.19-routing.test.ts
import { describe, it, expect } from "vitest";
import { useArgosRouting } from "../../apps/argos-extension/src/hub/hooks/use-argos-routing";

describe("T-2.19 Routing", () => {
    it("supports all 12 Argos routes", () => {
        const validRouteTypes = [
            "dashboard",
            "test-plans-list",
            "test-plan-form",
            "test-cases-list",
            "test-case-form",
            "test-sets-list",
            "test-set-form",
            "preconditions-list",
            "precondition-form",
            "test-executions-list",
            "test-execution-form",
            "test-case-versions-list",
            "audit-log-list",
            "reports",
            "settings",
        ];
        // Test que tous ces types sont accepted by router
        // (test fonctionnel selon implementation)
    });
});
```

---

## 5. CHECKPOINTS (validation visuelle)

Le sprint sera divise en 4 LOTS pour faciliter le debug et la validation :

### CHECKPOINT A : Composants generiques + Test Case (1h)

1. Creer WitListHeader / WitFilterBar / WitStatusBadge
2. Creer TestCasesListView + TestCaseFormView
3. Routing pour Test Case
4. Tests T-2.19-test-case-*
5. Verification visuelle preview.html

Validation Alex : preview.html montre Test Cases list et form fonctionnels.

### CHECKPOINT B : Test Set + Precondition (1h)

1. Creer TestSetsListView + TestSetFormView
2. Creer PreconditionsListView + PreconditionFormView
3. Routing
4. Tests
5. Verification preview.html

Validation Alex : 3 WIT (Plan + Case + Set + Precondition) accessibles via Sidebar.

### CHECKPOINT C : Test Execution + Read-only views (1h)

1. Creer TestExecutionsListView + TestExecutionFormView
2. Creer TestCaseVersionsListView (read-only)
3. Creer AuditLogListView (read-only)
4. Routing
5. Tests

Validation Alex : tous les 7 WIT navigables, Test Execution form fonctionnelle.

### CHECKPOINT D : Bump + tests + PR (30 min)

1. Bump 0.5.24 -> 0.5.25 (root + tous package.json + vss-extension.json)
2. Update CHANGELOG.md avec section Sprint 2.19
3. Update Specs/tasks.md (cocher items Sprint 2.19)
4. Tests complets : pnpm --filter argosTesting test
5. Tests regression : pnpm --filter @atconseil/regression-suite test
6. Verifier no regression Test Plan UI
7. Build VSIX + verifier 7 vues dans bundle
8. Commit + push branche
9. PR avec template

---

## 6. WORKFLOW GIT

```powershell
cd E:\Code\TestVault
git checkout main
git pull

# Verifier qu'on est sur 0.5.24
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Version actuelle : $($root.version) (attendu 0.5.24)"

# Creer branche
git checkout -b feature/sprint-2-19-ui-generalization

# Travailler CHECKPOINT A
# ... developpement ...
# Commits incrementaux

# Bump version a la fin (CHECKPOINT D)
node tools\release\bump-fixed-version.cjs 0.5.25

# Final commit
git add -A
git commit -F "$env:TEMP\sprint-2-19-commit-msg.txt"
git push -u origin feature/sprint-2-19-ui-generalization

# PR
gh pr create --title "feat(extension): Sprint 2.19 - UI generalization to 6 other WIT" --body-file "$env:TEMP\sprint-2-19-pr-body.txt"
```

---

## 7. COMMIT MESSAGE TEMPLATE

```
feat(extension): Sprint 2.19 - UI generalization to 6 other WIT

Sprint 2.18 delivered a complete Test Plan UI with the new design system.
Sprint 2.19 generalizes this UI to the 6 other Work Item Types (WIT)
to achieve a demo-able and consistent product across all 7 WIT.

Delivered :

1. Generic reusable components (3 new) :
   - WitListHeader : list view header with title/count/actions
   - WitFilterBar : search + filter chips reusable
   - WitStatusBadge : status mapping color reusable

2. List views (6 new) :
   - TestCasesListView : full CRUD with priority/tags/status
   - TestSetsListView : test set library with case count
   - PreconditionsListView : reusable preconditions categorized
   - TestExecutionsListView : run interface entry
   - TestCaseVersionsListView : read-only snapshots history
   - AuditLogListView : read-only activity log

3. Form views (4 new) :
   - TestCaseFormView : 5 sections (general, steps, expected, links, metadata)
   - TestSetFormView : 3 sections (general, linked cases, exec settings)
   - PreconditionFormView : 3 sections (general, setup, used by)
   - TestExecutionFormView : 3 sections (config, results, summary)

4. Routing update :
   - useArgosRouting hook supports 12 routes (was 4)
   - App.tsx renders all 12 view types
   - Sidebar adds Dashboard placeholder (Sprint 2.27 announce)

5. Tests regression (8 new) :
   - T-2.19-test-case-list-view
   - T-2.19-test-set-list-view
   - T-2.19-precondition-list-view
   - T-2.19-test-execution-list-view
   - T-2.19-test-case-version-list
   - T-2.19-audit-log-list
   - T-2.19-design-system-reuse
   - T-2.19-routing

Architectural principles preserved :
- TESTVAULT_SCHEMA referenceName : IMMUTABLE
- argos-wit-schema = source of truth (no duplication)
- useArgosCreate / useArgosList hooks for all 7 WIT
- Design system only : tokens.css + 9 base components
- Pattern of reuse : 3 generic components used in all 6 List views

Out of scope (reported to next sprints) :
- Real ADO area/iteration integration : Sprint 2.20
- AI candidates integration in TestCaseFormView : Sprint 2.21
- Gherkin editor native in TestCaseFormView : Sprint 2.21
- Drag-drop reorder linked cases : Sprint 2.23
- Test snapshots interactive diff : Sprint 2.24
- Dashboard MVP : Sprint 2.27

Bump 0.5.24 -> 0.5.25

Refs :
- Sprint 2.18 (design system foundation)
- Sprint 2.18.4 (single hub + sidebar visibility)
- ARGOS_ANALYSE_MARCHE_COMPLETE.md (feature F01 priority 12.5)
- TECH-DEBT-060 closed (UI 6 autres WIT)
```

---

## 8. PR BODY TEMPLATE

```markdown
## Summary

Sprint 2.19 -- UI generalisation aux 6 autres WIT.

Sprint 2.18 a livre une UI Test Plan complete. Sprint 2.19 generalise 
ce design system aux 6 autres WIT (Test Case, Test Set, Precondition, 
Test Execution, Test Case Version, Audit Log) pour avoir un produit 
demo-able complet.

## What changed

### Generic components (3 new)
- WitListHeader : header reusable list views
- WitFilterBar : filter bar reusable
- WitStatusBadge : status badge with color mapping

### Views (10 new)
- 6 List views : test cases, test sets, preconditions, executions, versions, audit log
- 4 Form views : test case, test set, precondition, test execution
- 2 read-only views : test case versions, audit log

### Routing
- 12 routes supportes (was 4)
- Dashboard placeholder ajoute (Sprint 2.27)

### Tests
- 8 new regression tests
- All existing tests still pass

## Architectural decisions

1. Generic components extracted to avoid duplication (3 used in 6 List views)
2. Design system exclusivement (tokens.css + 9 base components)
3. useArgosList / useArgosCreate hooks pour tous les 7 WIT
4. Read-only views (Audit Log, Versions) : pas de form, juste liste enriquie
5. Test Execution : run interface MVP, scaling reporte a Sprint 2.22

## Out of scope (next sprints)

- Sprint 2.20 : Real ADO area/iteration + edit mode Test Plan
- Sprint 2.21 : AI candidates + Gherkin editor native
- Sprint 2.22 : Coverage Matrix + Test execution UI avance
- Sprint 2.23 : Reports basiques + drag-reorder
- Sprint 2.24 : Test snapshots interactive diff
- Sprint 2.25 : Settings UI + Drawer
- Sprint 2.26 : Form sections additionnelles
- Sprint 2.27 : Dashboard MVP (NIVEAU B - approche progressive)

## Tests strategy

- Unit tests : 8 new regression
- Visual validation : preview.html accessible
- E2E manual : Alex valide CHECKPOINT A/B/C/D dans BCEE-QA apres deploy

## Bump

0.5.24 -> 0.5.25

## Refs

- ARGOS_ANALYSE_MARCHE_COMPLETE.md : feature F01 (priority 12.5)
- Sprint 2.18 (design system foundation)
- TECH-DEBT-060 closed
```

---

## 9. APRES MERGE

### 9.1 Tag + push

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feature/sprint-2-19-ui-generalization 2>$null

git tag -a v0.5.25 -m "Release v0.5.25 - Sprint 2.19 UI generalization to 6 other WIT"
git push origin v0.5.25
```

### 9.2 CI Marketplace workflow

Surveillance : https://github.com/AlexThibaud1976/TestVault/actions

Attendu :
- Publish Marketplace : Argos 0.5.25
- Publish CLI npm : @atconseil/argos-cli@0.5.25
- Tous tests passent

### 9.3 Reinstall extension BCEE-QA

1. Browse https://dev.azure.com/BCEE-QA/_settings/extensions
2. "Argos Testing" -> Uninstall
3. Wait 30 sec
4. Browse Marketplace
5. Verifier version = 0.5.25
6. Install (BCEE-QA org)

### 9.4 Test E2E

1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. CTRL+SHIFT+R
3. Verifier :
   - [X] Icone Argos dans sidebar ADO (single hub preserve)
   - [X] Click Argos -> app ouvre
   - [X] Sidebar 220px avec 10 items (Dashboard "Soon" + 9 fonctionnels)
   - [X] Test Plans : regression OK (creation, list, form)
   - [X] Test Cases : list + form fonctionnels
   - [X] Test Sets : list + form fonctionnels
   - [X] Preconditions : list + form fonctionnels
   - [X] Test Executions : list + form fonctionnels
   - [X] Test Case Versions : list read-only
   - [X] Audit Log : list read-only
   - [X] Reports : existant inchange
   - [X] Settings : existant inchange

---

## 10. NOTES IMPORTANTES POUR CLAUDE CODE

### 10.1 ASCII strict

Tous les commentaires de code, messages git, descriptions JSON, sont en ASCII.
- Pas de em-dash (-), utiliser le tiret normal -
- Pas de smart quotes
- Pas d'accents complexes

### 10.2 Maintenance docs strategiques

Apres ce sprint, l'utilisateur Alex souhaite que les documents strategiques 
soient mis a jour systematiquement :

- ARGOS_STRATEGIE_COMMERCIALE.md (si impact business)
- ARGOS_ANALYSE_MARCHE_COMPLETE.md (si impact positionnement/USP/features)

Sprint 2.19 declenche update de Matrice Features (Partie C) :
- F01 livre, marque comme [DONE]
- Tech-debt 060 ferme
- Sprint 2.19 ajoute a CHANGELOG strategique

Cette update sera faite par Alex en separe (ou par Claude Code si demande).

### 10.3 Si bloque

Si Claude Code rencontre un blocage technique :
- STOP avant de tout casser
- Documenter le bloque dans la PR
- Alex peut iterer avec Claude (web) pour deblocage
- Pas de commits speculatifs qui cassent la build

### 10.4 Performance

Sprint 2.19 doit etre rapide :
- ~3-4h dev pour Claude Code
- Plus si tests E2E reveles des bugs
- Si > 6h : signal qu'il y a un probleme architectural a discuter

---

## 11. CHECKLIST FINALE

Avant de creer la PR, verifier :

- [ ] Tous les fichiers de la section 1.2 sont crees/modifies
- [ ] 3 composants generiques utilises dans les 6 List views
- [ ] Design system exclusivement (pas de CSS inline)
- [ ] 8 tests regression nouveaux passent
- [ ] Tests existants passent (no regression)
- [ ] Bump 0.5.24 -> 0.5.25 dans tous les package.json + vss-extension.json
- [ ] CHANGELOG.md update avec section Sprint 2.19
- [ ] Specs/tasks.md update (cocher items Sprint 2.19)
- [ ] preview.html ouvert et 7 vues accessibles
- [ ] VSIX rebuild reussit
- [ ] Commit message + PR body conformes aux templates
- [ ] PR creee avec template fourni
- [ ] Pas de fichiers backup (.backup, .orig, .tmp) en commit
- [ ] ASCII strict partout

---

Fin du prompt CLAUDE_TASK Sprint 2.19.

Estimation : 3-4 heures dev Claude Code.
Suite : Sprint 2.20 (real ADO area/iteration + edit mode Test Plan).
