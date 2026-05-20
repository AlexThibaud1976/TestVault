# Prompt Claude Code -- Sprint 2.18 design system + Test Plan UI complete (`feat/sprint-2-18-design-system-test-plan-ui`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint UI majeur : design system + Test Plan LIST view + Test Plan FORM view.
> Strategie : POC list view -> CHECKPOINT validation user -> form -> navigation.
> Estimation : ~4h.

---

## Contexte critique

**Decouverte 2026-05-18 ~21h** : apres Sprint 2.17 livre argos@0.5.19 (UI hooks),
2 bugs UX persistent :

### Bug A -- Test Case creation echoue sur System.AreaPath

```
TF401347: Invalid tree name given for work item -1, field 'System.AreaPath'
```

Le form Test Case envoie probablement un AreaPath vide ou hardcoded invalide.
ADO valide tree paths, requiert path existant ou omission.

### Bug B -- Apres creation, retour sur ecran de creation

```
Test Plans, Test Cases, Test Sets, Preconditions creent les work items REELLEMENT
(verifie via portal ADO : Work items #47-50).
MAIS l'extension reste sur le formulaire de creation au lieu de montrer la liste.
=> Pas de "list view" implementee dans l'UI !
=> Il n'y a actuellement QUE le formulaire (pas de vue liste).
```

**Decision strategique user 2026-05-20 10h10** :

> Implementation complete de l'UI manquante en utilisant le design system + 
> mockups deja crees. Strategie : POC sur Test Plan d'abord, validation, 
> puis generalisation aux autres WIT dans sprints suivants.

**Fichiers de reference (deja crees) - DOIVENT etre lus par Claude Code en premier** :

```
[ASSUMER fichiers presents dans tools/claude-prompts/sprint-2-18/]
- 0-design-system-tokens.html : Design system tokens (CSS vars + Fluent UI base)
- 1-mockup-test-plans-list.html : Mockup list view (table + filters + sidebar)
- 2-mockup-test-plan-form.html : Mockup form view (sections collapsibles)

SI ABSENT : demander a l'utilisateur de les fournir / copier dans le repo.
```

**Cadrage Sprint 2.18 (decisions user 2026-05-20)** :

| # | Element | Choix |
|---|---|---|
| D134 | Layout | A -- Sidebar Argos 220px fixed (fidelite mockup) |
| D135 | POC priorite | A -- Test Plans LIST view en premier |
| D136 | Area/Iteration | B -- Hardcoded mock data (focus design, integration plus tard) |
| D137 | Form sections | MVP -- Sections 1+2 (General info + Test scope), reporter 3-5 Sprint 2.19 |
| D138 | Routing | useState local (pas react-router pour MVP) |
| D139 | Design fidelite | C -- POC d'abord, validation, ajustements possibles |

Refs :
- Sprint 2.7-2.17 (chaine complete)
- Sprint 2.17 hooks : useArgosCreate, useArgosList
- Sprint 2.16 services : createTestPlan, createTestCase, etc.
- TECH-DEBT-058 NEW : design system + Test Plan UI complete
- TECH-DEBT-059 NEW : Fix Bug A (Test Case AreaPath validation)
- TECH-DEBT-060 NEW : Generaliser UI aux 6 autres WIT (Sprint 2.19+)

---

## Architecture cible

### Nouvelle structure de fichiers

```
apps/argos-extension/src/
  hub/
    App.tsx                       (existant, sera refactore au Lot D)
    services.ts                   (Sprint 2.16, INCHANGE)
    hooks/                        (Sprint 2.17, etendu)
      use-argos-create.ts        (existant)
      use-argos-list.ts          (existant)
      use-argos-routing.ts       (NEW Sprint 2.18)
    
    design-system/                (NEW Sprint 2.18)
      tokens.css                  (CSS vars : colors, spacing, typography)
      index.ts                    (re-exports)
      components/
        Button.tsx                (primary, secondary, subtle variants)
        Input.tsx                 (text, search variants)
        Select.tsx                (with options array)
        Badge.tsx                 (status badges : success, warning, error, info)
        Card.tsx                  (container with shadow)
        Table.tsx                 (rows, headers, sortable)
        FilterChip.tsx            (active state, removable)
        SectionCollapsible.tsx    (form sections with chevron + status)
        Drawer.tsx                (slide-in panel from right)
        EmptyState.tsx            (when list is empty)
    
    views/                        (NEW Sprint 2.18)
      AppShell.tsx                (sidebar layout wrapper)
      Sidebar.tsx                 (Argos hub navigation)
      test-plans/
        TestPlansListView.tsx     (POC FIRST - Lot B)
        TestPlanFormView.tsx      (Lot C)
        TestPlanDrawer.tsx        (detail panel, optionnel POC)
      
      [Sprint 2.19+] test-cases/, test-sets/, etc.
```

### Routing local (useState, pas react-router)

```typescript
type ArgosView = 
    | { kind: "test-plans-list" }
    | { kind: "test-plans-form"; planId?: number }  // edit if planId
    | { kind: "test-cases-list" }  // Sprint 2.19+
    | { kind: "test-sets-list" }   // Sprint 2.19+
    | { kind: "preconditions-list" }  // Sprint 2.19+
    | { kind: "reports" }          // Sprint 2.20+
    | { kind: "settings" };        // Sprint 2.20+

// Hook useArgosRouting :
const [view, setView] = useState<ArgosView>({ kind: "test-plans-list" });
const navigate = (next: ArgosView) => setView(next);

// Usage :
navigate({ kind: "test-plans-form" });          // create new
navigate({ kind: "test-plans-form", planId: 47 }); // edit existing
navigate({ kind: "test-plans-list" });          // back to list
```

### Mock data structure (Sprint 2.18, branchera Sprint 2.19)

```typescript
// apps/argos-extension/src/hub/views/_mock-data.ts
export const MOCK_AREA_PATHS = [
    { value: "DEMO", label: "DEMO (root)" },
    { value: "DEMO\\Frontend", label: "DEMO \\ Frontend" },
    { value: "DEMO\\Backend", label: "DEMO \\ Backend" },
    { value: "DEMO\\Mobile", label: "DEMO \\ Mobile" },
];

export const MOCK_ITERATIONS = [
    { value: "DEMO", label: "DEMO (root)" },
    { value: "DEMO\\Sprint 25", label: "Sprint 25 (current)" },
    { value: "DEMO\\Sprint 26", label: "Sprint 26 (next)" },
];
```

---

## Composition exacte du sprint -- 7 LOTS

### Lot 0 -- Diagnostic + setup (15 min)

#### 0.1 Lire les mockups (CRITICAL)

```powershell
# Verifier presence des mockups dans le repo
$mockupDir = "tools\claude-prompts\sprint-2-18"
if (-not (Test-Path $mockupDir)) {
    Write-Host "MOCKUPS MANQUANTS : il faut creer $mockupDir et y placer :"
    Write-Host "  - 0-design-system-tokens.html"
    Write-Host "  - 1-mockup-test-plans-list.html"
    Write-Host "  - 2-mockup-test-plan-form.html"
    Write-Host ""
    Write-Host "DEMANDER A USER de les fournir avant continuer."
    exit 1
}
Get-ChildItem $mockupDir

# Lire le design system tokens (priority lecture)
Get-Content "$mockupDir\0-design-system-tokens.html" -Encoding UTF8 | Select-Object -First 100
```

#### 0.2 Voir structure UI existante

```powershell
# Voir structure actuelle du hub
Get-ChildItem apps\argos-extension\src\hub -Recurse | Select-Object FullName

# Voir le contenu actuel d'App.tsx (routing existant ?)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8 | Select-Object -First 100

# Identifier les forms actuels (Test Plan, Test Case, etc.)
Get-ChildItem apps\argos-extension\src -Recurse -Filter "*.tsx" | Where-Object { $_.Name -match "Form|Create|TestPlan|TestCase|TestSet|Precondition" }

# Voir les hooks Sprint 2.17 existants
Get-ChildItem apps\argos-extension\src\hub\hooks -ErrorAction SilentlyContinue
```

#### 0.3 Setup branche + dirs

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-18-design-system-test-plan-ui

# Verifier baseline
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10

# Creer la structure de dossiers
New-Item -ItemType Directory -Force -Path apps\argos-extension\src\hub\design-system
New-Item -ItemType Directory -Force -Path apps\argos-extension\src\hub\design-system\components
New-Item -ItemType Directory -Force -Path apps\argos-extension\src\hub\views
New-Item -ItemType Directory -Force -Path apps\argos-extension\src\hub\views\test-plans
```

### Lot A -- Design system foundation (45 min)

#### A.1 Creer `apps/argos-extension/src/hub/design-system/tokens.css`

**SOURCE OF TRUTH** : `tools/claude-prompts/sprint-2-18/0-design-system-tokens.html`
extraire le bloc `<style>:root { ... }</style>` et l'adapter en CSS module standalone.

Structure obligatoire :

```css
/* apps/argos-extension/src/hub/design-system/tokens.css */
:root {
    /* Brand Argos */
    --argos-blue-primary: #0C447C;
    --argos-blue-hover: #0a3a6b;
    --argos-blue-light: #1A6CB8;
    --argos-blue-bg: #EEF4FA;
    --argos-blue-border: #B8D1E8;
    
    /* Neutrals (11 levels, Fluent UI aligned) */
    --neutral-0: #FFFFFF;
    --neutral-1: #FAFAFA;
    --neutral-2: #F3F2F1;
    --neutral-3: #EDEBE9;
    --neutral-4: #E1DFDD;
    --neutral-5: #D2D0CE;
    --neutral-6: #C8C6C4;
    --neutral-7: #A19F9D;
    --neutral-8: #605E5C;
    --neutral-9: #323130;
    --neutral-10: #201F1E;
    
    /* Status colors */
    --success-fg: #107C10;
    --success-bg: #DFF6DD;
    --warning-fg: #8A6D00;
    --warning-bg: #FFF4CE;
    --error-fg: #A4262C;
    --error-bg: #FDE7E9;
    --info-fg: var(--argos-blue-primary);
    --info-bg: var(--argos-blue-bg);
    
    /* Spacing scale */
    --s-1: 4px;
    --s-2: 8px;
    --s-3: 12px;
    --s-4: 16px;
    --s-5: 20px;
    --s-6: 24px;
    --s-7: 32px;
    --s-8: 48px;
    --s-9: 64px;
    
    /* Border radius */
    --r-1: 2px;
    --r-2: 4px;
    --r-3: 8px;
    --r-pill: 999px;
    
    /* Shadows */
    --shadow-2: 0 1.6px 3.6px rgba(0,0,0,0.13), 0 0.3px 0.9px rgba(0,0,0,0.11);
    --shadow-4: 0 3.2px 7.2px rgba(0,0,0,0.13), 0 0.6px 1.8px rgba(0,0,0,0.11);
    --shadow-8: 0 6.4px 14.4px rgba(0,0,0,0.13), 0 1.2px 3.6px rgba(0,0,0,0.11);
    --shadow-16: 0 12.8px 28.8px rgba(0,0,0,0.13), 0 2.4px 7.2px rgba(0,0,0,0.11);
    
    /* Typography */
    --font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: "Cascadia Code", "Consolas", "Monaco", monospace;
    --t-display: 32px;
    --t-h1: 24px;
    --t-h2: 20px;
    --t-h3: 16px;
    --t-body: 14px;
    --t-small: 12px;
    --t-micro: 11px;
    
    --lh-tight: 1.2;
    --lh-normal: 1.4;
    --lh-relaxed: 1.6;
}
```

Importer dans `main.tsx` ou `App.tsx` :
```typescript
import "./design-system/tokens.css";
```

#### A.2 Creer composants base (priorite pour POC list view)

CHACUN dans son fichier .tsx :

**Button.tsx** :

```typescript
import { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";  // styles bases sur tokens

export type ButtonVariant = "primary" | "secondary" | "subtle" | "danger";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
    children: ReactNode;
}

export function Button({ 
    variant = "primary", 
    size = "medium",
    icon,
    children,
    ...rest
}: ButtonProps) {
    return (
        <button 
            className={`ds-btn ds-btn-${variant} ds-btn-${size}`}
            {...rest}
        >
            {icon && <span className="ds-btn-icon">{icon}</span>}
            <span className="ds-btn-label">{children}</span>
        </button>
    );
}
```

**Button.css** :

```css
.ds-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    border: 1px solid transparent;
    border-radius: var(--r-2);
    font-family: var(--font-family);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ds-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.ds-btn-medium { padding: var(--s-2) var(--s-4); font-size: var(--t-body); }
.ds-btn-small  { padding: var(--s-1) var(--s-3); font-size: var(--t-small); }
.ds-btn-large  { padding: var(--s-3) var(--s-5); font-size: var(--t-h3); }

.ds-btn-primary {
    background: var(--argos-blue-primary);
    color: var(--neutral-0);
    border-color: var(--argos-blue-primary);
}
.ds-btn-primary:hover:not(:disabled) {
    background: var(--argos-blue-hover);
    border-color: var(--argos-blue-hover);
}

.ds-btn-secondary {
    background: var(--neutral-0);
    color: var(--neutral-9);
    border-color: var(--neutral-5);
}
.ds-btn-secondary:hover:not(:disabled) {
    background: var(--neutral-2);
}

.ds-btn-subtle {
    background: transparent;
    color: var(--neutral-9);
    border-color: transparent;
}
.ds-btn-subtle:hover:not(:disabled) {
    background: var(--neutral-2);
}

.ds-btn-danger {
    background: var(--error-fg);
    color: var(--neutral-0);
    border-color: var(--error-fg);
}
```

**Input.tsx + Input.css** : similaire (text, search avec icone, sizes)

**Badge.tsx + Badge.css** : variants `success | warning | error | info | neutral`

```typescript
type BadgeKind = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
    kind?: BadgeKind;
    children: ReactNode;
}

export function Badge({ kind = "neutral", children }: BadgeProps) {
    return <span className={`ds-badge ds-badge-${kind}`}>{children}</span>;
}
```

**Card.tsx** : container avec shadow + radius

**Table.tsx** : table avec headers, rows, hover state

```typescript
interface Column<T> {
    key: keyof T | string;
    header: ReactNode;
    render?: (row: T) => ReactNode;
    width?: string;
}

interface TableProps<T> {
    columns: Column<T>[];
    rows: T[];
    onRowClick?: (row: T) => void;
    emptyState?: ReactNode;
}

export function Table<T extends { id: string | number }>({ columns, rows, onRowClick, emptyState }: TableProps<T>) {
    if (rows.length === 0 && emptyState) {
        return <div className="ds-table-empty">{emptyState}</div>;
    }
    
    return (
        <table className="ds-table">
            <thead>
                <tr>
                    {columns.map((col, i) => (
                        <th key={i} style={{ width: col.width }}>{col.header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map(row => (
                    <tr 
                        key={row.id} 
                        onClick={() => onRowClick?.(row)}
                        className={onRowClick ? "ds-table-row-clickable" : ""}
                    >
                        {columns.map((col, i) => (
                            <td key={i}>
                                {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

**FilterChip.tsx + EmptyState.tsx** : simples

#### A.3 Composants form (pour Lot C, peuvent etre stubbed pour POC)

- **SectionCollapsible.tsx** : header + body avec chevron + state
- **Select.tsx** : avec options + value + onChange

#### A.4 Index re-exports

```typescript
// apps/argos-extension/src/hub/design-system/index.ts
export { Button, type ButtonVariant, type ButtonSize } from "./components/Button";
export { Input } from "./components/Input";
export { Badge, type BadgeKind } from "./components/Badge";
export { Card } from "./components/Card";
export { Table, type Column } from "./components/Table";
export { FilterChip } from "./components/FilterChip";
export { EmptyState } from "./components/EmptyState";
export { Select } from "./components/Select";
export { SectionCollapsible } from "./components/SectionCollapsible";
```

### Lot B -- POC Test Plans LIST view (60 min)

**CHECKPOINT** apres ce Lot : tu valides visuellement, on ajuste si besoin.

#### B.1 Creer `apps/argos-extension/src/hub/views/Sidebar.tsx`

Reproduire le sidebar du mockup (`1-mockup-test-plans-list.html`) :

```typescript
import "./Sidebar.css";

const NAV_ITEMS = [
    { key: "test-plans", label: "Test Plans", icon: <IconList /> },
    { key: "test-cases", label: "Test Cases", icon: <IconCheckBox /> },
    { key: "test-sets", label: "Test Sets", icon: <IconBox /> },
    { key: "preconditions", label: "Preconditions", icon: <IconGear /> },
    { key: "reports", label: "Reports", icon: <IconChart /> },
    { key: "settings", label: "Settings", icon: <IconSettings /> },
];

interface SidebarProps {
    activeKey: string;
    onNavigate: (key: string) => void;
}

export function Sidebar({ activeKey, onNavigate }: SidebarProps) {
    return (
        <aside className="argos-sidebar">
            <div className="argos-sidebar-header">
                <ArgosShieldEyeIcon />  {/* SVG inline du logo */}
                <div className="argos-sidebar-title">Argos</div>
            </div>
            <nav className="argos-sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <a 
                        key={item.key}
                        className={`argos-sidebar-nav-item ${item.key === activeKey ? "active" : ""}`}
                        onClick={() => onNavigate(item.key)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
        </aside>
    );
}
```

**Sidebar.css** : 220px width fixe, Argos blue accent active state, etc.
(Adapter du mockup `.hub-sidebar`, `.hub-nav-item`, etc.)

#### B.2 Creer `apps/argos-extension/src/hub/views/AppShell.tsx`

Layout principal :

```typescript
interface AppShellProps {
    sidebar: ReactNode;
    children: ReactNode;
    drawer?: ReactNode;
}

export function AppShell({ sidebar, children, drawer }: AppShellProps) {
    return (
        <div className="argos-shell">
            {sidebar}
            <main className="argos-shell-main">
                {children}
            </main>
            {drawer && <div className="argos-shell-drawer">{drawer}</div>}
        </div>
    );
}
```

**AppShell.css** : flexbox layout, sidebar fixed left, main flex-1.

#### B.3 Creer `apps/argos-extension/src/hub/views/test-plans/TestPlansListView.tsx`

```typescript
import { useState, useMemo } from "react";
import { Button, Input, Badge, Card, Table, FilterChip, EmptyState, type Column } from "../../design-system";
import { useArgosList } from "../../hooks/use-argos-list";

interface TestPlanRow {
    id: number;
    name: string;
    status: "draft" | "active" | "completed" | "archived";
    casesCount: number;
    passedCount: number;
    failedCount: number;
    owner: string;
    updatedAt: string;
}

interface TestPlansListViewProps {
    client: IAdoWorkItemClient;
    projectId: string;
    onCreateNew: () => void;        // -> navigate to form
    onSelectPlan: (planId: number) => void;  // -> show detail/drawer
}

export function TestPlansListView({ client, projectId, onCreateNew, onSelectPlan }: TestPlansListViewProps) {
    const { items, isLoading, error, refetch } = useArgosList({
        client, projectId, witKind: "TestVault.TestPlan",
    });
    
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "completed">("all");
    
    const rows = useMemo(() => mapItemsToRows(items), [items]);
    
    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            return true;
        });
    }, [rows, searchQuery, statusFilter]);
    
    const columns: Column<TestPlanRow>[] = [
        { key: "id", header: "ID", width: "80px", render: r => `#${r.id}` },
        { key: "name", header: "Name", render: r => <strong>{r.name}</strong> },
        { 
            key: "status", 
            header: "Status",
            width: "120px",
            render: r => (
                <Badge kind={statusToBadgeKind(r.status)}>{r.status}</Badge>
            )
        },
        { key: "casesCount", header: "Cases", width: "80px" },
        { 
            key: "progress",
            header: "Progress",
            width: "140px",
            render: r => <ProgressBar passed={r.passedCount} total={r.casesCount} />
        },
        { key: "owner", header: "Owner", width: "120px" },
        { key: "updatedAt", header: "Updated", width: "120px", render: r => formatRelative(r.updatedAt) },
    ];
    
    return (
        <div className="test-plans-list-view">
            <header className="content-header">
                <div className="content-title">
                    <h1>Test Plans</h1>
                    <span className="count">{rows.length} plans</span>
                </div>
                <div className="content-actions">
                    <Button variant="secondary" icon={<IconImport />}>Import</Button>
                    <Button variant="primary" icon={<IconPlus />} onClick={onCreateNew}>
                        New Test Plan
                    </Button>
                </div>
            </header>
            
            <div className="filter-bar">
                <Input 
                    type="search"
                    placeholder="Search test plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FilterChip 
                    active={statusFilter === "active"}
                    onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
                >
                    Status: Active
                </FilterChip>
                <FilterChip>Owner: All</FilterChip>
                <FilterChip>Tags</FilterChip>
            </div>
            
            <div className="content-body">
                {isLoading && <div>Loading...</div>}
                {error && <div className="error">Failed to load: {error.message}</div>}
                {!isLoading && !error && (
                    <Table 
                        columns={columns}
                        rows={filteredRows}
                        onRowClick={(row) => onSelectPlan(row.id)}
                        emptyState={
                            <EmptyState 
                                icon={<IconEmptyBox />}
                                title="No test plans yet"
                                description="Create your first test plan to start organizing test execution."
                                action={
                                    <Button variant="primary" onClick={onCreateNew}>
                                        Create Test Plan
                                    </Button>
                                }
                            />
                        }
                    />
                )}
            </div>
        </div>
    );
}

function mapItemsToRows(items: any[]): TestPlanRow[] {
    return items.map(item => ({
        id: item.id,
        name: item.fields["System.Title"] ?? "(unnamed)",
        status: parseStatus(item.fields["System.State"]),
        casesCount: parseJsonArray(item.fields["TestVault.TestCaseIds"]).length,
        passedCount: 0,  // POC : derived from executions later
        failedCount: 0,  // POC : derived from executions later
        owner: item.fields["System.AssignedTo"]?.displayName ?? "Unassigned",
        updatedAt: item.fields["System.ChangedDate"] ?? "",
    }));
}

function statusToBadgeKind(status: string): "success" | "warning" | "info" | "neutral" {
    switch (status.toLowerCase()) {
        case "completed": return "success";
        case "active": return "info";
        case "draft": return "neutral";
        case "archived": return "warning";
        default: return "neutral";
    }
}

function parseStatus(state: any): "draft" | "active" | "completed" | "archived" {
    const s = String(state).toLowerCase();
    if (s.includes("active") || s.includes("locked")) return "active";
    if (s.includes("closed") || s.includes("completed")) return "completed";
    if (s.includes("removed") || s.includes("archived")) return "archived";
    return "draft";
}

function parseJsonArray(s: any): any[] {
    try { return JSON.parse(s ?? "[]"); } catch { return []; }
}

function formatRelative(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
}
```

**TestPlansListView.css** : adapter du mockup `.main-content`, `.content-header`, `.filter-bar`, `.content-body`, etc.

#### B.4 ProgressBar inline component

Petit composant utilitaire (peut etre dans le meme fichier ou design-system) :

```typescript
function ProgressBar({ passed, total }: { passed: number; total: number }) {
    const pct = total === 0 ? 0 : (passed / total) * 100;
    return (
        <div className="ds-progress-bar">
            <div className="ds-progress-bar-fill" style={{ width: `${pct}%` }} />
            <span className="ds-progress-bar-label">{passed}/{total}</span>
        </div>
    );
}
```

#### B.5 *** CHECKPOINT VALIDATION USER ***

**APRES Lot B**, reporter a l'utilisateur :

> "POC Test Plans List view ready. Screenshot please pour validation visuelle.
> Si rendu OK : continue Lot C. Sinon : ajustements avant continuer."

L'utilisateur va lancer `pnpm dev` (ou similar) et regarder le rendu dans BCEE-QA.
APRES VALIDATION SEULEMENT : continuer Lot C.

### Lot C -- Test Plan FORM view (60 min)

#### C.1 Creer mock data file

```typescript
// apps/argos-extension/src/hub/views/_mock-data.ts
export const MOCK_AREA_PATHS = [
    { value: "DEMO", label: "DEMO (root)" },
    { value: "DEMO\\Frontend", label: "DEMO \\ Frontend" },
    { value: "DEMO\\Backend", label: "DEMO \\ Backend" },
    { value: "DEMO\\Mobile", label: "DEMO \\ Mobile" },
];

export const MOCK_ITERATIONS = [
    { value: "DEMO", label: "DEMO (root)" },
    { value: "DEMO\\Sprint 25", label: "Sprint 25 (current)" },
    { value: "DEMO\\Sprint 26", label: "Sprint 26 (next)" },
];
```

#### C.2 Creer SectionCollapsible component

(Si pas deja fait dans Lot A) :

```typescript
import { useState, ReactNode } from "react";

interface SectionCollapsibleProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    statusBadge?: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}

export function SectionCollapsible({ 
    title, subtitle, icon, statusBadge, 
    defaultOpen = true, children 
}: SectionCollapsibleProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="ds-section">
            <button 
                className="ds-section-header" 
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                {icon && <div className="ds-section-icon">{icon}</div>}
                <div className="ds-section-title-block">
                    <div className="ds-section-title">{title}</div>
                    {subtitle && <div className="ds-section-subtitle">{subtitle}</div>}
                </div>
                {statusBadge && <div className="ds-section-status">{statusBadge}</div>}
                <svg className={`ds-section-chevron ${isOpen ? "open" : ""}`} viewBox="0 0 16 16">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                </svg>
            </button>
            {isOpen && (
                <div className="ds-section-body">
                    {children}
                </div>
            )}
        </div>
    );
}
```

#### C.3 Creer `TestPlanFormView.tsx`

POUR MVP : sections 1+2 uniquement (General info + Test scope).
Reporter sections 3-5 (Schedule, Notifications, Permissions) a Sprint 2.19.

```typescript
import { useState } from "react";
import { Button, Input, Select, SectionCollapsible, Badge } from "../../design-system";
import { useArgosCreate } from "../../hooks/use-argos-create";
import { MOCK_AREA_PATHS, MOCK_ITERATIONS } from "../_mock-data";

interface TestPlanFormViewProps {
    client: IAdoWorkItemClient;
    projectId: string;
    planId?: number;        // if defined : edit mode (Sprint 2.19+)
    onCancel: () => void;
    onSuccess: (planId: number) => void;
}

export function TestPlanFormView({ client, projectId, planId, onCancel, onSuccess }: TestPlanFormViewProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [areaPath, setAreaPath] = useState("DEMO");  // default
    const [iteration, setIteration] = useState("DEMO");
    
    const { mutate, isCreating } = useArgosCreate({
        kind: "TestPlan",
        client, projectId,
        onSuccess: (result) => {
            onSuccess(result.id);  // navigate back to list
        },
    });
    
    const isValid = name.trim().length > 0;
    
    async function handleSubmit() {
        if (!isValid) return;
        
        const fields: Record<string, unknown> = {
            "System.Title": name.trim(),
            "System.Description": description.trim(),
            // AreaPath / IterationPath only if specified (FIX BUG A)
        };
        if (areaPath) fields["System.AreaPath"] = areaPath;
        if (iteration) fields["System.IterationPath"] = iteration;
        if (tags.length > 0) fields["System.Tags"] = tags.join("; ");
        
        await mutate(fields);
    }
    
    return (
        <div className="test-plan-form-view">
            <header className="form-header">
                <h1>{planId ? "Edit Test Plan" : "New Test Plan"}</h1>
                <div className="form-actions">
                    <Button variant="subtle" onClick={onCancel} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={!isValid || isCreating}
                    >
                        {isCreating ? "Creating..." : (planId ? "Save" : "Create Test Plan")}
                    </Button>
                </div>
            </header>
            
            <div className="form-body">
                <SectionCollapsible
                    title="General information"
                    subtitle="Name, description and tags for your test plan"
                    icon={<IconInfo />}
                    statusBadge={name.trim() ? <Badge kind="success">Complete</Badge> : <Badge kind="neutral">Required</Badge>}
                    defaultOpen={true}
                >
                    <div className="form-field">
                        <label className="field-label">
                            Plan name <span className="required">*</span>
                        </label>
                        <Input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sprint 25 - Regression suite"
                            size="large"
                        />
                    </div>
                    <div className="form-field">
                        <label className="field-label">
                            Description <span className="optional">Optional</span>
                        </label>
                        <textarea 
                            className="ds-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the scope and goals of this test plan..."
                            rows={3}
                        />
                    </div>
                    <div className="form-field">
                        <label className="field-label">
                            Tags <span className="optional">Optional</span>
                        </label>
                        {/* Tags input : POC version simple */}
                        <Input 
                            type="text"
                            placeholder="Add tag and press Enter..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const value = (e.target as HTMLInputElement).value.trim();
                                    if (value && !tags.includes(value)) {
                                        setTags([...tags, value]);
                                        (e.target as HTMLInputElement).value = "";
                                    }
                                }
                            }}
                        />
                        <div className="tag-list">
                            {tags.map(t => (
                                <span key={t} className="tag" onClick={() => setTags(tags.filter(x => x !== t))}>
                                    {t} x
                                </span>
                            ))}
                        </div>
                    </div>
                </SectionCollapsible>
                
                <SectionCollapsible
                    title="Test scope"
                    subtitle="Area, iteration and cases included in this plan"
                    icon={<IconScope />}
                    statusBadge={<Badge kind="neutral">{tags.length === 0 ? "Configure scope" : "Configured"}</Badge>}
                    defaultOpen={true}
                >
                    <div className="form-field">
                        <label className="field-label">Area path</label>
                        <Select
                            value={areaPath}
                            onChange={(e) => setAreaPath(e.target.value)}
                            options={MOCK_AREA_PATHS}
                        />
                    </div>
                    <div className="form-field">
                        <label className="field-label">Iteration</label>
                        <Select
                            value={iteration}
                            onChange={(e) => setIteration(e.target.value)}
                            options={MOCK_ITERATIONS}
                        />
                    </div>
                    {/* Linked test cases : SIMPLE POC version, drag-reorder Sprint 2.19+ */}
                    <div className="form-field">
                        <label className="field-label">
                            Linked test cases <span className="optional">Sprint 2.19+</span>
                        </label>
                        <div className="ds-placeholder">
                            Drag-to-reorder linked cases UI coming in Sprint 2.19.
                        </div>
                    </div>
                </SectionCollapsible>
                
                {/* Sprint 2.19+ : Schedule, Notifications, Permissions sections */}
                <div className="ds-placeholder ds-placeholder-full">
                    Schedule, Notifications, and Permissions sections coming in Sprint 2.19.
                </div>
            </div>
        </div>
    );
}
```

**TestPlanFormView.css** : adapter du mockup form, layout sections, etc.

### Lot D -- Navigation + integration (30 min)

#### D.1 Creer `use-argos-routing.ts`

```typescript
import { useState } from "react";

export type ArgosView = 
    | { kind: "test-plans-list" }
    | { kind: "test-plans-form"; planId?: number }
    // Sprint 2.19+ : test-cases-list, test-cases-form, etc.
    | { kind: "test-cases-list" }
    | { kind: "test-sets-list" }
    | { kind: "preconditions-list" }
    | { kind: "reports" }
    | { kind: "settings" };

export function useArgosRouting(initial: ArgosView = { kind: "test-plans-list" }) {
    const [view, setView] = useState<ArgosView>(initial);
    
    return {
        view,
        navigate: setView,
        // Convenience navigators
        goToTestPlansList: () => setView({ kind: "test-plans-list" }),
        goToTestPlanForm: (planId?: number) => setView({ kind: "test-plans-form", planId }),
        goToTab: (tabKey: string) => {
            const mapping: Record<string, ArgosView> = {
                "test-plans": { kind: "test-plans-list" },
                "test-cases": { kind: "test-cases-list" },
                "test-sets": { kind: "test-sets-list" },
                "preconditions": { kind: "preconditions-list" },
                "reports": { kind: "reports" },
                "settings": { kind: "settings" },
            };
            if (mapping[tabKey]) setView(mapping[tabKey]);
        },
    };
}
```

#### D.2 Refactor App.tsx pour utiliser AppShell + routing

```typescript
import { AppShell } from "./views/AppShell";
import { Sidebar } from "./views/Sidebar";
import { TestPlansListView } from "./views/test-plans/TestPlansListView";
import { TestPlanFormView } from "./views/test-plans/TestPlanFormView";
import { useArgosRouting } from "./hooks/use-argos-routing";

export function App() {
    // Existing detection, install wizard logic, etc. UNCHANGED
    // ... existing code from Sprint 2.15/2.17 ...
    
    const routing = useArgosRouting({ kind: "test-plans-list" });
    
    // After installation detection passes, render the shell :
    if (!isInstalled) {
        return <InstallWizard ... />;
    }
    
    return (
        <AppShell
            sidebar={
                <Sidebar 
                    activeKey={getActiveSidebarKey(routing.view)}
                    onNavigate={routing.goToTab}
                />
            }
        >
            <RouteRenderer view={routing.view} routing={routing} client={client} projectId={projectId} />
        </AppShell>
    );
}

function getActiveSidebarKey(view: ArgosView): string {
    switch (view.kind) {
        case "test-plans-list":
        case "test-plans-form":
            return "test-plans";
        case "test-cases-list": return "test-cases";
        case "test-sets-list": return "test-sets";
        case "preconditions-list": return "preconditions";
        case "reports": return "reports";
        case "settings": return "settings";
    }
}

function RouteRenderer({ view, routing, client, projectId }: any) {
    switch (view.kind) {
        case "test-plans-list":
            return (
                <TestPlansListView 
                    client={client} 
                    projectId={projectId}
                    onCreateNew={() => routing.goToTestPlanForm()}
                    onSelectPlan={(id) => {/* drawer or detail view */}}
                />
            );
        case "test-plans-form":
            return (
                <TestPlanFormView 
                    client={client}
                    projectId={projectId}
                    planId={view.planId}
                    onCancel={routing.goToTestPlansList}
                    onSuccess={() => routing.goToTestPlansList()}  // FIX BUG B
                />
            );
        case "test-cases-list":
            return <ComingSoonView title="Test Cases" sprint="2.19" />;
        case "test-sets-list":
            return <ComingSoonView title="Test Sets" sprint="2.19" />;
        case "preconditions-list":
            return <ComingSoonView title="Preconditions" sprint="2.19" />;
        case "reports":
            return <ComingSoonView title="Reports" sprint="2.20" />;
        case "settings":
            return <ComingSoonView title="Settings" sprint="2.20" />;
    }
}

function ComingSoonView({ title, sprint }: { title: string; sprint: string }) {
    return (
        <div style={{ padding: "var(--s-8)", textAlign: "center" }}>
            <h2>{title}</h2>
            <p style={{ color: "var(--neutral-8)", marginTop: "var(--s-3)" }}>
                Coming in Sprint {sprint}. The Test Plan UI is the POC of the new design system.
            </p>
        </div>
    );
}
```

#### D.3 Fix Bug A : Test Case form (si form Test Case existe)

```powershell
# Trouver le form Test Case actuel
Get-ChildItem apps\argos-extension\src -Recurse -Filter "*TestCase*" -ErrorAction SilentlyContinue
```

Si form Test Case existe, patcher : ne PAS envoyer System.AreaPath / System.IterationPath
si valeurs vides (omettre du body au lieu d'envoyer empty string).

**Pattern correct** :

```typescript
const fields: Record<string, unknown> = {
    "System.Title": title.trim(),
};
if (areaPath?.trim()) fields["System.AreaPath"] = areaPath.trim();
if (iterationPath?.trim()) fields["System.IterationPath"] = iterationPath.trim();
// ... etc
```

NOTE : si Test Case form n'existe pas encore (UI minimaliste), creer juste un stub 
ComingSoonView et reporter le Test Case form a Sprint 2.19. Le pattern est applique 
sur Test Plan, prouve, reutilisable.

### Lot E -- Tests + CFG + bump + PR (30 min)

#### E.1 Tests composants design system

Pour chaque composant, un test unit basique :

```typescript
// design-system/components/Button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
    it("renders with primary variant by default", () => {
        render(<Button>Click me</Button>);
        const btn = screen.getByRole("button", { name: "Click me" });
        expect(btn).toHaveClass("ds-btn-primary");
    });
    
    it("supports secondary variant", () => {
        render(<Button variant="secondary">Cancel</Button>);
        expect(screen.getByRole("button")).toHaveClass("ds-btn-secondary");
    });
    
    it("triggers onClick when not disabled", () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click</Button>);
        screen.getByRole("button").click();
        expect(onClick).toHaveBeenCalledOnce();
    });
    
    it("does not trigger onClick when disabled", () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick} disabled>Click</Button>);
        screen.getByRole("button").click();
        expect(onClick).not.toHaveBeenCalled();
    });
});
```

Idem pour Badge, Card, FilterChip, etc. (tests basiques, focus regression).

#### E.2 Tests TestPlansListView integration

```typescript
// views/test-plans/TestPlansListView.test.tsx
describe("TestPlansListView", () => {
    it("shows loading state", () => { /* ... */ });
    it("shows error state on error", () => { /* ... */ });
    it("shows empty state when no plans", () => { /* ... */ });
    it("renders list of plans in table", () => { /* ... */ });
    it("filters by search query", () => { /* ... */ });
    it("calls onCreateNew when clicking 'New Test Plan'", () => { /* ... */ });
});
```

#### E.3 CFG regression test

```typescript
// tools/regression/CFG-2026-05-20-design-system-test-plan-ui.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG design system + Test Plan UI Sprint 2.18", () => {
    const root = resolve(__dirname, "../..");
    
    it("design system tokens.css exists", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/design-system/tokens.css");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("--argos-blue-primary");
        expect(content).toContain("#0C447C");
        expect(content).toContain("--neutral-0");
        expect(content).toContain("--success-fg");
    });
    
    it("core design system components exist", () => {
        const components = ["Button", "Input", "Badge", "Card", "Table", "FilterChip", "EmptyState", "Select", "SectionCollapsible"];
        for (const comp of components) {
            const path = resolve(root, `apps/argos-extension/src/hub/design-system/components/${comp}.tsx`);
            expect(existsSync(path), `${comp}.tsx should exist`).toBe(true);
        }
    });
    
    it("AppShell + Sidebar exist", () => {
        const appShell = resolve(root, "apps/argos-extension/src/hub/views/AppShell.tsx");
        const sidebar = resolve(root, "apps/argos-extension/src/hub/views/Sidebar.tsx");
        expect(existsSync(appShell)).toBe(true);
        expect(existsSync(sidebar)).toBe(true);
    });
    
    it("Test Plan list + form views exist", () => {
        const list = resolve(root, "apps/argos-extension/src/hub/views/test-plans/TestPlansListView.tsx");
        const form = resolve(root, "apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx");
        expect(existsSync(list)).toBe(true);
        expect(existsSync(form)).toBe(true);
    });
    
    it("useArgosRouting hook exists", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-routing.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("ArgosView");
        expect(content).toContain("test-plans-list");
        expect(content).toContain("test-plans-form");
    });
    
    it("form omits empty AreaPath/IterationPath (Fix Bug A)", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx");
        const content = readFileSync(path, "utf8");
        // Should have conditional inclusion pattern
        expect(content).toMatch(/if\s*\(\s*areaPath/);
        expect(content).toMatch(/if\s*\(\s*iteration/);
    });
});
```

#### E.4 Bump 0.5.19 -> 0.5.20

```powershell
node tools\release\bump-fixed-version.cjs 0.5.20

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### E.5 CHANGELOG.md [0.5.20]

```markdown
## [0.5.20] - 2026-05-20

### Added

**Sprint 2.18 -- Design system + Test Plan UI complete (MAJOR UI MILESTONE)**

After Sprint 2.17 the backend created work items successfully but the UI 
only exposed creation forms with no list view. Sprint 2.18 introduces a 
complete design system + Test Plan UI as POC for future generalization.

### Design system

NEW `apps/argos-extension/src/hub/design-system/`:
- `tokens.css` : Argos brand + Fluent UI aligned (11 neutrals, status colors, spacing, typography, shadows)
- 9 reusable components : Button, Input, Badge, Card, Table, FilterChip, EmptyState, Select, SectionCollapsible
- All Fluent UI compatible, ADO native look-and-feel

### Test Plan views

NEW `apps/argos-extension/src/hub/views/`:
- `AppShell.tsx` : sidebar + main layout wrapper
- `Sidebar.tsx` : Argos hub navigation (6 items)
- `test-plans/TestPlansListView.tsx` : table + filters + search
- `test-plans/TestPlanFormView.tsx` : sections collapsibles (General info + Test scope)

### Routing

NEW `apps/argos-extension/src/hub/hooks/use-argos-routing.ts`:
- Local state routing (no react-router for MVP)
- Type-safe view discriminated union
- Navigation helpers (goToTestPlansList, goToTestPlanForm)

### Fixes

- **Bug A** (TF401347 AreaPath) : form omits empty AreaPath/IterationPath instead of sending empty strings
- **Bug B** (no list view) : navigation now flows form -> list after successful create

### Coming Soon

The 6 other WIT (Test Case, Test Set, Precondition, Test Execution, 
Test Case Version, Audit Log) display "Coming in Sprint 2.19" placeholders.

### Mock data

Area Path / Iteration Path use hardcoded MOCK_AREA_PATHS / MOCK_ITERATIONS 
for POC. Real ADO integration deferred to Sprint 2.19.

### Tests

- Unit tests for each design system component
- Integration tests for TestPlansListView, TestPlanFormView
- CFG-2026-05-20-design-system-test-plan-ui regression test
- All Sprint 2.7-2.17 tests still green

### TECH-DEBT

- TECH-DEBT-058 LIVRE : design system + Test Plan UI complete
- TECH-DEBT-059 LIVRE : Bug A AreaPath validation fix
- TECH-DEBT-060 NEW : generaliser UI aux 6 autres WIT (Sprint 2.19+)
- TECH-DEBT-061 NEW : ADO real GET classificationNodes + iterations (replace mock data)

### Architecture preserved

- TESTVAULT_SCHEMA immutable (constitution section 12)
- Sprint 2.7-2.17 chain maintained (services.ts, hooks, resolver)
- Backend logic UNCHANGED
- Strict source-of-truth : design system in dedicated folder

### Strategy

POC-driven approach :
1. Design system foundation (reusable across all 7 WIT)
2. Test Plan as proof of concept (validates patterns)
3. Generalize to 6 other WIT (Sprint 2.19+) once Test Plan validated

### Cumulative session 2026-05-18/20

Total sprints livres : 12 (Sprint 2.7 a 2.18)
Versions Marketplace : 13 (0.5.7 a 0.5.20)
```

#### E.6 Commit + PR

```powershell
$msg = "feat(extension): Sprint 2.18 design system + Test Plan UI complete"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
feat(extension): Sprint 2.18 design system + Test Plan UI complete

After Sprint 2.17 the backend created work items but UI lacked list views.
This sprint introduces a complete design system + Test Plan UI as POC for
future generalization to the other 6 WIT.

Design system (apps/argos-extension/src/hub/design-system/) :
- tokens.css : Argos brand + Fluent UI aligned tokens
- 9 reusable components : Button, Input, Badge, Card, Table, FilterChip,
  EmptyState, Select, SectionCollapsible
- Production-ready, theme-able via CSS vars

Test Plan UI (apps/argos-extension/src/hub/views/) :
- AppShell.tsx : sidebar + main layout
- Sidebar.tsx : Argos hub navigation (6 items)
- test-plans/TestPlansListView.tsx : table + filters + search
- test-plans/TestPlanFormView.tsx : sections collapsibles (MVP : General + Scope)

Routing :
- hooks/use-argos-routing.ts : local state routing, type-safe views
- App.tsx : refactored to use AppShell + RouteRenderer

Fixes :
- Bug A : form omits empty AreaPath/IterationPath (no more TF401347)
- Bug B : navigation flows form -> list after successful create

Mock data (Sprint 2.19+ will replace with real ADO API) :
- MOCK_AREA_PATHS, MOCK_ITERATIONS hardcoded for POC

Coming Soon placeholders for 6 other WIT (Test Case, Test Set, Precondition,
Test Execution, Test Case Version, Audit Log) -- Sprint 2.19+.

Tests :
- Unit tests for design system components
- Integration tests for views
- CFG-2026-05-20 regression
- All Sprint 2.7-2.17 tests still green

TECH-DEBT :
- TECH-DEBT-058 LIVRE : design system + Test Plan UI
- TECH-DEBT-059 LIVRE : Bug A AreaPath fix
- TECH-DEBT-060 NEW : generaliser UI aux 6 autres WIT
- TECH-DEBT-061 NEW : real ADO integration for area/iteration

Bump 0.5.19 -> 0.5.20.

Refs:
- Sprint 2.17 chain
- User decisions 2026-05-20 :
  - Full scope 4-5h
  - POC discussion before design fidelity
  - New structure design-system/ + views/
- Mockups source : tools/claude-prompts/sprint-2-18/*.html
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-18.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-18.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-18.txt"

git push -u origin feat/sprint-2-18-design-system-test-plan-ui
```

```powershell
$prBody = @'
## Summary

Sprint 2.18 -- MAJOR UI MILESTONE : design system + Test Plan UI complete.

After Sprint 2.17 the backend was complete but UI lacked list views. This sprint 
introduces a complete design system as POC + Test Plan list/form views.

## Strategy

POC-driven : Test Plan as proof of concept. Design system reusable across all 7 WIT.
Generalization to 6 other WIT planned for Sprint 2.19+.

## What changed

### Design system (NEW folder)
- 9 reusable components (Button, Input, Badge, Card, Table, etc.)
- CSS tokens for Argos brand + Fluent UI alignment

### Test Plan views (NEW folder)
- TestPlansListView : table + filters + search + empty state
- TestPlanFormView : sections collapsibles (General info + Test scope)
- AppShell + Sidebar : layout

### Routing
- useArgosRouting hook : local state, type-safe views
- App.tsx refactored

### Fixes
- Bug A : AreaPath/IterationPath omitted if empty (no more TF401347)
- Bug B : Form -> List navigation flow

## What is NOT in this sprint

- Test Case / Test Set / Precondition / Test Execution / Test Case Version / Audit Log views (Sprint 2.19+)
- Real ADO area/iteration integration (Sprint 2.19+)
- Form sections : Schedule, Notifications, Permissions (Sprint 2.19+)
- Linked test cases drag-reorder (Sprint 2.19+)

## Tests

- Unit tests design system components
- Integration tests TestPlansListView, TestPlanFormView
- CFG-2026-05-20 regression
- All Sprint 2.7-2.17 tests still green

## After merge

1. Tag v0.5.20 + push
2. Update extension to 0.5.20
3. E2E test : Create Test Plan -> list refresh -> validate visuals
4. CHECKPOINT user validation -> decide Sprint 2.19 scope
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-18.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(extension): Sprint 2.18 design system + Test Plan UI complete" `
  --body-file "$env:TEMP\pr-body-sprint-2-18.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-18.txt"
```

#### E.7 Archive + post-merge

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-18.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-18.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-18.md
}
```

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-18-design-system-test-plan-ui 2>$null
```

### Lot F -- Tag + retest E2E (15 min apres merge)

#### F.1 Tag v0.5.20

```powershell
git checkout main
git pull
git tag -a v0.5.20 -m "Release v0.5.20 -- Sprint 2.18 design system + Test Plan UI complete"
git push origin v0.5.20
```

#### F.2 CI workflows (~5-8 min)

#### F.3 Update extension a 0.5.20

#### F.4 TEST E2E FINAL

```
1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. Ctrl+F5
3. Hub Argos doit afficher :
   - Sidebar Argos a gauche (220px, fond blanc, items navigation)
   - Test Plans active par defaut
   - Main content avec header "Test Plans" + count + buttons Import/New Test Plan
   - Filter bar avec search + chips
   - Table (vide ou avec les 2 plans crees hier)

4. Click "New Test Plan" :
   - Form view s'ouvre avec sections collapsibles
   - General information ouverte
   - Test scope ouverte avec Area path SELECT (mock data) + Iteration SELECT
   - Linked test cases : placeholder Sprint 2.19+

5. Fill Name : "Test Plan 0.5.20 - MILESTONE UI"
   Click "Create Test Plan"
   - Loading state visible
   - Toast success
   - Back to list view (Bug B fixed !)
   - Test Plan visible dans la table immediatement

6. Click sur autres items sidebar :
   - Test Cases / Test Sets / Preconditions / Reports / Settings
   - Voir "Coming in Sprint 2.19" placeholder
```

#### F.5 CHECKPOINT VALIDATION

User valide visuellement :
- Design coherent avec les mockups ?
- UX intuitive ?
- Pret pour Sprint 2.19 (generalisation aux autres WIT) ?

---

## Garde-fous

### GF1 -- GF20 : standards (ASCII strict, fixed-versioning, etc.)

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : NE PAS modifier services.ts ni les hooks Sprint 2.16/2.17

Le backend reste INTACT. Sprint 2.18 ne touche que :
- apps/argos-extension/src/hub/design-system/ (NEW folder)
- apps/argos-extension/src/hub/views/ (NEW folder)
- apps/argos-extension/src/hub/hooks/use-argos-routing.ts (NEW file)
- apps/argos-extension/src/hub/App.tsx (refactor for AppShell + routing)

### GF23 : POC discipline -- CHECKPOINT B obligatoire

Apres Lot B, ARRETER. Demander validation user avant continuer Lot C.

### GF24 : 6 autres WIT = "Coming Soon" placeholders, PAS implementation

Tentation : implementer Test Case form aussi. RESISTER.
La validation Test Plan d'abord, generalisation Sprint 2.19+.

### GF25 : Mock data hardcoded - DOCUMENTER explicitement

Le fichier `_mock-data.ts` doit avoir un commentaire en haut :

```typescript
// Sprint 2.18 POC : hardcoded mock data.
// Sprint 2.19+ will replace with real ADO API calls:
//   GET /classificationNodes for area paths
//   GET /iterations for iterations
// See TECH-DEBT-061.
```

### GF26 : Tests Sprint 2.7-2.17 doivent rester verts

### GF27 : Design fidelite mockups

Tokens.css doit etre IDENTIQUE au mockup (colors, spacing, shadows, typography).
Components reproduisent l'esprit visuel des mockups (pas pixel-perfect mais coherent).

---

## Validation pre-commit

```powershell
pnpm --filter argos-extension test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 15
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 15

pnpm turbo build --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Diagnostic done. Mockups read. Branch ready. Continue Lot A?"
2. **Apres Lot A** : "Design system foundation ready. 9 components + tokens. Continue Lot B (POC LIST view)?"
3. **Apres Lot B** : "*** CHECKPOINT *** POC TestPlansListView ready. Please validate visually before continuing. Screenshot ?"
4. **Apres user validation** : Continue Lot C-F
5. **Apres Lot E5** : "PR ouverte. Apres merge, lance Lot F."

---

## Criteres de done

- [ ] Branche feat/sprint-2-18-design-system-test-plan-ui creee
- [ ] design-system/tokens.css NEW (Argos brand + Fluent UI tokens)
- [ ] 9 components design-system (Button, Input, Badge, Card, Table, FilterChip, EmptyState, Select, SectionCollapsible)
- [ ] views/AppShell.tsx + Sidebar.tsx NEW
- [ ] views/test-plans/TestPlansListView.tsx NEW (POC)
- [ ] views/test-plans/TestPlanFormView.tsx NEW (sections General + Scope)
- [ ] hooks/use-argos-routing.ts NEW
- [ ] App.tsx refactore pour AppShell + RouteRenderer
- [ ] CHECKPOINT user validation apres Lot B (visuel)
- [ ] Bug A fix : form omits empty AreaPath/IterationPath
- [ ] Bug B fix : navigation form -> list onSuccess
- [ ] 6 autres WIT : ComingSoonView placeholders
- [ ] Mock data file documente (Sprint 2.19+ replacement noted)
- [ ] Unit tests design system components
- [ ] Integration tests views
- [ ] CFG-2026-05-20-design-system-test-plan-ui NEW
- [ ] All Sprint 2.7-2.17 tests STILL green
- [ ] Bump 0.5.19 -> 0.5.20
- [ ] CHANGELOG complete
- [ ] tasks.md : TECH-DEBT-058, 059 livre + 060, 061 NEW
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.20
- [ ] CI workflows verts
- [ ] Extension 0.5.20 deployed BCEE-QA
- [ ] E2E test : Test Plan create -> list refresh -> visuals OK

---

## Apres ca

### Si CHECKPOINT B valide + E2E final OK

Bilan exceptionnel :
```
12 sprints livres en ~3 jours
13 versions Marketplace
Architecture COMPLETE :
  - Backend : install + detection + CRUD + UI hooks
  - Frontend : design system + Test Plan UI + routing
  - Pattern reusable pour les 6 autres WIT
```

Sprint 2.19 priorites :
- Generaliser UI aux 6 autres WIT (Test Case, Test Set, Precondition, etc.)
- Reuse design system + pattern Test Plan
- Real ADO integration : Area Path + Iteration (replace mock)
- Linked Test Cases drag-reorder
- Form sections additionnelles (Schedule, Notifications, Permissions)

### Si CHECKPOINT B montre desaccord

Ajustements design system avant continuer :
- Couleurs ?
- Spacing ?
- Typography ?
- Patterns components ?
- Layout sidebar ?

Iterations possibles dans le sprint, ou stop apres Lot B et resume demain.

---

## Note moral

Apres Sprint 2.18 livre, l'extension Argos aura :

```
ARCHITECTURE FRONTEND COMPLETE :

design-system/  (source of truth design)
  +-- tokens.css : tokens centralises
  +-- components/ : 9 reusable

views/  (sources of truth UI)
  +-- AppShell + Sidebar : layout
  +-- test-plans/ : POC complete (list + form)
  +-- [Sprint 2.19+] test-cases/, test-sets/, etc.

hooks/  (Sprint 2.16/2.17/2.18)
  +-- use-argos-create : create with toast (Sprint 2.17)
  +-- use-argos-list : list with refetch (Sprint 2.17)
  +-- use-argos-routing : local state navigation (Sprint 2.18)

services.ts (Sprint 2.16 INTACT)
  +-- 7 WIT wrappers avec WitResolver
```

Backend (Sprint 2.7-2.17) + Frontend (Sprint 2.18) = produit MILESTONE COMPLET.

Sprint 2.19 = generalisation, pas refactor. Architecture est prete.

Bon sprint majeur !
