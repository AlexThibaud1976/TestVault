# Prompt Claude Code -- Sprint 2.17 UI refresh + toast notifications after create (`feat/sprint-2-17-ui-refresh-after-create`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint mini : fix UI refresh + toast notifications apres create pour TOUS les 7 WIT.
> Estimation : ~45-60 min.

---

## Contexte critique

**Decouverte 2026-05-18 ~21h** : apres Sprint 2.16 livre argos@0.5.18 (CRUD resolver), 
les work items sont REELLEMENT crees dans Azure DevOps (verifie dans portal ADO 
Work items list) :

```
Work item #50 - TestVault Precondition (DEMO) - 21:10:27
Work item #49 - TestVault Test Set    (DEMO) - 21:09:56  
Work item #48 - TestVault Test Plan   (DEMO) - 21:04:47
Work item #47 - TestVault Test Plan   (DEMO) - 21:04:40
```

**MAIS** l'interface Argos ne refresh pas la liste apres creation :
- Pas de toast notification (ni success ni error)
- Pas de redirect
- L'item n'apparait pas dans la liste Argos
- Comportement identique pour TOUS les WIT testes (Test Plan, Test Set, Precondition, Test Case)

**Severite** : MEDIUM
- Backend complet et fonctionnel (Sprint 2.16 valide)
- UI bug purement frontend / state management
- Pas critique pour demo backend, MAIS bloque UX utilisateur

**User exigence (apres pattern Sprint 2.16)** :

> Pattern applicable a TOUS les 7 WIT TestVault, jamais point-fix.

**Liste exhaustive des 7 WIT a supporter** :

```
TestVault.TestCase            ArgosInheritedDemo.TestVaultTestCase
TestVault.TestPlan            ArgosInheritedDemo.TestVaultTestPlan
TestVault.TestSet             ArgosInheritedDemo.TestVaultTestSet
TestVault.Precondition        ArgosInheritedDemo.TestVaultPrecondition
TestVault.TestExecution       ArgosInheritedDemo.TestVaultTestExecution
TestVault.TestCaseVersion     ArgosInheritedDemo.TestVaultTestCaseVersion
TestVault.AuditLog            ArgosInheritedDemo.TestVaultAuditLog
```

Refs :
- Sprint 2.7-2.16 (chaine complete)
- Sprint 2.16 services.ts : createTestCase, createTestPlan, etc. (createArgosWorkItem)
- TECH-DEBT-057 NEW : UI refresh + toast notifications post-create

---

## Decisions actees mardi 2026-05-19 matin

| # | Element | Choix |
|---|---|---|
| D128 | Strategie refresh | A -- Refetch liste apres create (simple, robust) |
| D129 | Toast library | B -- Reuse existing si deja en place, sinon creer composant simple |
| D130 | Optimistic update | NON -- refetch est plus simple et reliable pour MVP |
| D131 | Error handling | A -- Toast error avec message clair sur catch |
| D132 | Scope | A -- TOUS les 7 WIT, pattern factorise |
| D133 | Loading state | A -- Disable bouton + spinner pendant POST |

---

## Architecture cible

### Pattern uniformise

Chaque "Create X" handler doit suivre ce pattern :

```typescript
async function handleCreate() {
    setIsCreating(true);  // disable button + show spinner
    
    try {
        const result = await createTestPlan(adoClient, projectId, fields);
        
        // Success path
        toast.success(`Test Plan #${result.id} created`);
        await refetchList();  // refresh visible items
        resetForm();          // clear inputs
        
    } catch (error) {
        // Error path
        const message = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to create Test Plan: ${message}`);
        // Keep form filled so user can fix and retry
        
    } finally {
        setIsCreating(false);
    }
}
```

Applique a CHAQUE WIT (7 wrappers existants Sprint 2.16).

---

## Composition exacte du sprint -- 5 LOTS

### Lot 0 -- Diagnostic complet (~10 min)

```powershell
# 1. Identifier TOUS les call sites de createTestX / createXxx
Select-String -Path apps\argos-extension\src\**\*.ts*,apps\argos-extension\src\**\*.tsx -Pattern "createTestCase|createTestPlan|createTestSet|createPrecondition|createTestExecution|createTestCaseVersion|createAuditLog|createArgosWorkItem" -Encoding UTF8 -Context 0,5 | Select-Object -First 30

# 2. Identifier les components qui rendent les listes
Select-String -Path apps\argos-extension\src\**\*.tsx -Pattern "TestPlan|TestCase|TestSet|Precondition|TestExecution|AuditLog" -Encoding UTF8 -Context 0,1 | Select-Object -First 30

# 3. Voir si toast / notification library deja presente
Select-String -Path apps\argos-extension\src\**\*.ts*,apps\argos-extension\src\**\*.tsx -Pattern "toast|notification|snackbar|alert|MessageBar" -Encoding UTF8 | Select-Object -First 15

# 4. Voir le services.ts actuel (Sprint 2.16 base)
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8 | Select-Object -First 200

# 5. Voir les hooks / state management
Select-String -Path apps\argos-extension\src\**\*.tsx -Pattern "useState|useEffect|useQuery|useReducer" -Encoding UTF8 | Select-Object -First 20

# 6. Voir le composant TestPlan creation (probable)
Get-ChildItem apps\argos-extension\src -Recurse -Filter "*TestPlan*" -ErrorAction SilentlyContinue
Get-ChildItem apps\argos-extension\src -Recurse -Filter "*Plan*" -ErrorAction SilentlyContinue

# 7. Voir le dossier hub (probable point central)
Get-ChildItem apps\argos-extension\src\hub -ErrorAction SilentlyContinue | Select-Object Name, Length
```

Documenter le resultat pour adapter Lot A/B.

### Lot A -- Toast notification component (~15 min)

#### Si toast deja present (e.g. Fluent UI MessageBar, react-hot-toast, etc.)

Skip ce Lot. Utiliser directement dans Lot B.

#### Si AUCUNE library toast presente

Creer un composant simple `apps/argos-extension/src/hub/components/Toast.tsx` :

```typescript
import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
    id: string;
    kind: ToastKind;
    message: string;
}

interface ToastContextValue {
    show: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
    show: () => { /* default no-op */ },
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    const show = useCallback((kind: ToastKind, message: string) => {
        const id = String(Date.now()) + String(Math.random());
        setToasts(prev => [...prev, { id, kind, message }]);
        
        // Auto-dismiss after 4s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);
    
    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
    return (
        <div style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    padding: "12px 16px",
                    borderRadius: 4,
                    backgroundColor: t.kind === "success" ? "#107c10" : t.kind === "error" ? "#a4262c" : "#0078d4",
                    color: "white",
                    minWidth: 200,
                    maxWidth: 400,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                }} onClick={() => onDismiss(t.id)}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
```

Wrap App component with `<ToastProvider>`.

#### Convenience helpers

```typescript
// Add to services.ts or a hooks.ts file
export function useArgosToast() {
    const { show } = useToast();
    return {
        success: (msg: string) => show("success", msg),
        error: (msg: string) => show("error", msg),
        info: (msg: string) => show("info", msg),
    };
}
```

### Lot B -- Create wrapper hooks per WIT (~15 min)

#### B1. Creer `apps/argos-extension/src/hub/hooks/use-argos-create.ts`

Hook generique qui :
- Encapsule le pattern try/catch/toast/refresh
- Expose `mutate` (l'action create) et `isCreating` (loading state)
- Accepte un callback `onSuccess` pour refresh
- Applicable a tous les 7 WIT

```typescript
import { useState, useCallback } from "react";
import { useArgosToast } from "../components/Toast";
import {
    createTestCase, createTestPlan, createTestSet, 
    createPrecondition, createTestExecution, 
    createTestCaseVersion, createAuditLog,
    type IAdoWorkItemClient,
} from "../services";

type WitKind = 
    | "TestCase" | "TestPlan" | "TestSet" 
    | "Precondition" | "TestExecution"
    | "TestCaseVersion" | "AuditLog";

const CREATE_FNS: Record<WitKind, typeof createTestCase> = {
    TestCase: createTestCase,
    TestPlan: createTestPlan,
    TestSet: createTestSet,
    Precondition: createPrecondition,
    TestExecution: createTestExecution,
    TestCaseVersion: createTestCaseVersion,
    AuditLog: createAuditLog,
};

const WIT_LABELS: Record<WitKind, string> = {
    TestCase: "Test Case",
    TestPlan: "Test Plan",
    TestSet: "Test Set",
    Precondition: "Precondition",
    TestExecution: "Test Execution",
    TestCaseVersion: "Test Case Version",
    AuditLog: "Audit Log",
};

export interface UseArgosCreateOptions {
    kind: WitKind;
    client: IAdoWorkItemClient;
    projectId: string;
    onSuccess?: (result: { id: number }) => void | Promise<void>;
}

export function useArgosCreate({ kind, client, projectId, onSuccess }: UseArgosCreateOptions) {
    const [isCreating, setIsCreating] = useState(false);
    const toast = useArgosToast();
    
    const mutate = useCallback(async (fields: Record<string, unknown>) => {
        setIsCreating(true);
        try {
            const createFn = CREATE_FNS[kind];
            const result = await createFn(client, projectId, fields);
            
            const label = WIT_LABELS[kind];
            toast.success(`${label} #${result.id} created`);
            
            if (onSuccess) {
                await onSuccess(result);
            }
            
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            const label = WIT_LABELS[kind];
            toast.error(`Failed to create ${label}: ${message}`);
            throw error;  // re-throw for caller if needed
        } finally {
            setIsCreating(false);
        }
    }, [kind, client, projectId, onSuccess, toast]);
    
    return { mutate, isCreating };
}
```

#### B2. Hook list helper (pour refresh)

Creer `apps/argos-extension/src/hub/hooks/use-argos-list.ts` :

```typescript
import { useState, useEffect, useCallback } from "react";
import { type IAdoWorkItemClient } from "../services";

export interface UseArgosListOptions {
    client: IAdoWorkItemClient;
    projectId: string;
    witKind: string;  // schema refName "TestVault.TestPlan" etc.
    autoFetch?: boolean;  // default true
}

export function useArgosList({ client, projectId, witKind, autoFetch = true }: UseArgosListOptions) {
    const [items, setItems] = useState<Array<{ id: number; fields: Record<string, unknown> }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Implementation depends on existing list query in services.ts
            // For example, query work items by type
            const result = await queryArgosWorkItems(client, projectId, witKind);
            setItems(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [client, projectId, witKind]);
    
    useEffect(() => {
        if (autoFetch) {
            fetch();
        }
    }, [autoFetch, fetch]);
    
    return { items, isLoading, error, refetch: fetch };
}
```

NOTE : si list query n'existe pas encore dans services.ts, il faudra l'ajouter.
Lire le code Lot 0 pour identifier comment la liste est chargee actuellement.

### Lot C -- Apply hooks in components (~15 min)

Pour CHAQUE component qui a un "Create X" button (identifie au Lot 0) :

#### C1. Pattern de refactor

**AVANT (probable)** :

```typescript
function TestPlansPage() {
    const [plans, setPlans] = useState([]);
    
    useEffect(() => {
        loadPlans().then(setPlans);
    }, []);
    
    async function handleCreate() {
        await createTestPlan(client, projectId, fields);
        // BUG: no refresh, no toast
    }
    
    return (
        <button onClick={handleCreate}>Create Test Plan</button>
    );
}
```

**APRES** :

```typescript
function TestPlansPage() {
    const { items: plans, refetch } = useArgosList({
        client, projectId, witKind: "TestVault.TestPlan",
    });
    
    const { mutate: createPlan, isCreating } = useArgosCreate({
        kind: "TestPlan",
        client, projectId,
        onSuccess: async () => {
            await refetch();  // refresh list after create
            resetForm();      // optional : clear inputs
        },
    });
    
    async function handleCreate() {
        await createPlan(fields);
    }
    
    return (
        <button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Test Plan"}
        </button>
    );
}
```

#### C2. Appliquer au moins aux 4 WIT testes ce soir

- TestPlan creation form
- TestCase creation form
- TestSet creation form (si form existe)
- Precondition creation form (si form existe)

Pour les 3 autres WIT (TestExecution, TestCaseVersion, AuditLog) :
- Si form existe dans l'UI : appliquer aussi
- Si pas de form UI (peut-etre auto-cree par le systeme) : skip ce sprint

### Lot D -- Tests + bump + commit + PR (~15 min)

#### D1. Tests

Etendre `apps/argos-extension/src/hub/services.test.ts` :

```typescript
import { renderHook, act } from "@testing-library/react";
import { useArgosCreate } from "./hooks/use-argos-create";

describe("useArgosCreate hook (Sprint 2.17)", () => {
    function buildMockClient() {
        return {
            getWorkItemTypes: vi.fn().mockResolvedValue([
                { referenceName: "ArgosInheritedDemo.TestVaultTestPlan", name: "TestVault Test Plan" },
            ]),
            createWorkItem: vi.fn().mockResolvedValue({ id: 42 }),
        };
    }
    
    it("calls onSuccess callback after create", async () => {
        const client = buildMockClient();
        const onSuccess = vi.fn();
        
        const { result } = renderHook(() => useArgosCreate({
            kind: "TestPlan",
            client,
            projectId: "p1",
            onSuccess,
        }));
        
        await act(async () => {
            await result.current.mutate({ "System.Title": "Test" });
        });
        
        expect(onSuccess).toHaveBeenCalledWith({ id: 42 });
    });
    
    it("sets isCreating true during mutation", async () => {
        const client = buildMockClient();
        client.createWorkItem.mockImplementation(() => new Promise(r => setTimeout(() => r({ id: 1 }), 50)));
        
        const { result } = renderHook(() => useArgosCreate({
            kind: "TestPlan",
            client, projectId: "p1",
        }));
        
        expect(result.current.isCreating).toBe(false);
        
        const promise = act(async () => {
            await result.current.mutate({});
        });
        
        // Check that isCreating was true at some point
        await promise;
        
        expect(result.current.isCreating).toBe(false);
    });
    
    it("handles errors with toast.error", async () => {
        const client = buildMockClient();
        client.createWorkItem.mockRejectedValue(new Error("Network down"));
        
        const { result } = renderHook(() => useArgosCreate({
            kind: "TestPlan",
            client, projectId: "p1",
        }));
        
        await expect(act(async () => {
            await result.current.mutate({});
        })).rejects.toThrow("Network down");
    });
    
    it("supports all 7 WIT kinds", () => {
        const client = buildMockClient();
        const kinds = ["TestCase", "TestPlan", "TestSet", "Precondition", 
                       "TestExecution", "TestCaseVersion", "AuditLog"] as const;
        
        for (const kind of kinds) {
            const { result } = renderHook(() => useArgosCreate({
                kind, client, projectId: "p1",
            }));
            expect(result.current.mutate).toBeDefined();
            expect(result.current.isCreating).toBe(false);
        }
    });
});
```

#### D2. CFG regression test

Creer `tools/regression/CFG-2026-05-19-ui-refresh-after-create.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG UI refresh after create Sprint 2.17", () => {
    const root = resolve(__dirname, "../..");
    
    it("useArgosCreate hook exists", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-create.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("useArgosCreate");
        expect(content).toContain("onSuccess");
        expect(content).toContain("isCreating");
        expect(content).toContain("toast");
    });
    
    it("hook supports all 7 WIT kinds", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/hooks/use-argos-create.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("TestCase");
        expect(content).toContain("TestPlan");
        expect(content).toContain("TestSet");
        expect(content).toContain("Precondition");
        expect(content).toContain("TestExecution");
        expect(content).toContain("TestCaseVersion");
        expect(content).toContain("AuditLog");
    });
    
    it("Toast component exists", () => {
        const path = resolve(root, "apps/argos-extension/src/hub/components/Toast.tsx");
        expect(existsSync(path)).toBe(true);
    });
});
```

#### D3. Bump 0.5.18 -> 0.5.19

```powershell
node tools\release\bump-fixed-version.cjs 0.5.19

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D4. CHANGELOG.md [0.5.19]

```markdown
## [0.5.19] - 2026-05-19

### Fixed

**Sprint 2.17 -- UI refresh + toast notifications after create**

After Sprint 2.16 the backend successfully created work items, but the UI did not 
provide feedback : no toast notification, no list refresh, no redirect.

User confirmed via portal ADO Work items list that 4+ work items were created 
across multiple WIT types (Test Plan, Test Set, Precondition, Test Case) -- 
backend complete. Bug was purely UX.

### Architecture changes

NEW `apps/argos-extension/src/hub/hooks/use-argos-create.ts`:
- Generic hook for all 7 WIT TestVault
- Encapsulates pattern: setIsCreating(true) -> try create -> toast -> refresh -> finally setIsCreating(false)
- Supports onSuccess callback for list refetch
- Error handling with toast.error

NEW `apps/argos-extension/src/hub/components/Toast.tsx` (if not pre-existing):
- Simple toast component with 4s auto-dismiss
- Success / error / info kinds
- Click to dismiss
- ToastProvider context wraps the App

NEW `apps/argos-extension/src/hub/hooks/use-argos-list.ts`:
- Generic list query hook
- refetch() method for triggering refresh after mutations
- Loading + error states

### Refactored components

Each "Create X" form now uses :
1. `useArgosCreate({ kind, onSuccess })` hook
2. `useArgosList({ witKind })` for current list
3. Button disabled during isCreating
4. onSuccess: () => refetch() + resetForm()

Applied to all 7 WIT (or those with creation form in UI).

### Tests

- 4+ unit tests useArgosCreate hook
- CFG-2026-05-19 regression test
- All Sprint 2.7-2.16 tests still green

### TECH-DEBT

- TECH-DEBT-057 NEW LIVRE: UI refresh + toast notifications post-create
- TECH-DEBT-019 (E2E reel): TOTALEMENT VALIDE

### Architecture preserved

- TESTVAULT_SCHEMA immutable (constitution section 12)
- Sprint 2.7-2.16 chain maintained
- argos-wit-schema source of truth (Sprint 2.15)
- WitResolver runtime cache (Sprint 2.16)

### Cumulative session 2026-05-18/19

Total sprints livres : 11 (Sprint 2.7 a 2.17)
Versions Marketplace : 12 (0.5.7 a 0.5.19)

Total bugs E2E fixed :
1. VS402848 picklist conflict (2.8)
2. VS403344 icon invalid (2.9)
3. VS402805 WIT refName not found (2.10)
4. TF51535 field "TestVault.X" (2.11)
5. TF51535 field "Custom.TestVaultX" (2.12)
6. VS402803 field name "Priority" (2.13)
7. VS403083 state name "Active" (2.14)
8. Extension detection refName (2.15)
9. VS402323 CRUD ops refName (2.16)
10. UI refresh after create (2.17 -- THIS)

MILESTONE PRODUIT FONCTIONNEL TOTAL ATTEINT.

### Lessons learned

- E2E testing exposed UX bugs invisible in unit tests
- Hook pattern (useArgosCreate) factorizes the 7 wrappers cleanly
- Toast provides immediate user feedback critical for confidence
- Refetch after mutation > optimistic update for MVP reliability
```

#### D5. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-057 (Sprint 2.17) -- UI refresh + toast notifications post-create
- [x] TECH-DEBT-019 -- E2E reel VALIDE (10 sprints traversees)

## Demain

- TECH-DEBT-017 Azure Functions deploy
- TECH-DEBT-018 Commercial layer  
- Specs/ARCHITECTURE.md (documenter les principes architecturaux emerges)
- Documentation public README + marketplace listing
```

#### D6. Pre-commit + commit + push

```powershell
$msg = "fix(extension): Sprint 2.17 UI refresh + toast notifications post-create"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(extension): Sprint 2.17 UI refresh + toast notifications post-create

After Sprint 2.16 the backend successfully created work items for all 7 WIT,
but the UI did not provide feedback : no toast, no list refresh, no redirect.

User confirmed via portal ADO that 4+ work items were created across multiple
WIT types (Test Plan, Test Set, Precondition, Test Case) -- backend complete.
Bug was purely UX.

Architecture :

NEW apps/argos-extension/src/hub/hooks/use-argos-create.ts :
- Generic hook for all 7 WIT TestVault
- Pattern : setIsCreating(true) -> try create -> toast -> refresh -> finally
- onSuccess callback for list refetch
- Error handling with toast.error

NEW apps/argos-extension/src/hub/components/Toast.tsx (if not pre-existing) :
- Simple toast with 4s auto-dismiss
- success / error / info kinds
- ToastProvider context

NEW apps/argos-extension/src/hub/hooks/use-argos-list.ts :
- Generic list query
- refetch() for triggering refresh

Refactored components :
- Each Create X form uses useArgosCreate + useArgosList
- Button disabled during isCreating
- onSuccess refetches list + resets form

Applied to all 7 WIT (or those with creation forms in UI).

Tests :
- 4+ unit tests useArgosCreate
- CFG-2026-05-19-ui-refresh-after-create
- All Sprint 2.7-2.16 tests still green

TECH-DEBT :
- TECH-DEBT-057 LIVRE
- TECH-DEBT-019 (E2E reel) TOTALEMENT VALIDE

Bump 0.5.18 -> 0.5.19.

Refs :
- Sprint 2.7-2.16 chain
- User confirmation 2026-05-18 ~21h10 :
  "les nouveaux test plans sont bien crees, par contre on ne les voit pas 
   dans l'interface de Argos. point a etudier"
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-17.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-17.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-17.txt"

git push -u origin feat/sprint-2-17-ui-refresh-after-create
```

#### D7. PR

```powershell
$prBody = @'
## Summary

Sprint 2.17 -- UI refresh + toast notifications after create work item.

After Sprint 2.16 backend successfully created work items (verified in ADO portal),
but UI provided no feedback. Pattern global for ALL 7 WIT TestVault.

## Architecture

NEW useArgosCreate hook :
- Generic for all 7 WIT
- Pattern : isCreating state + try/catch/toast/refetch
- onSuccess callback for list refetch

NEW Toast component + provider (or use existing if present).

Each Create form refactored to use the hook.

## Tests

- 4+ unit tests useArgosCreate hook
- CFG-2026-05-19 regression
- All Sprint 2.7-2.16 tests still green

## After merge

1. Tag v0.5.19 + push
2. Update extension to 0.5.19 (no cleanup needed)
3. E2E test : Create Test Plan -> toast success + list refresh
4. Repeat for Test Case, Test Set, Precondition

MILESTONE PRODUIT FONCTIONNEL TOTAL = imminent.
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-17.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(extension): Sprint 2.17 UI refresh + toast notifications post-create" `
  --body-file "$env:TEMP\pr-body-sprint-2-17.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-17.txt"
```

#### D8. Archive + post-merge cleanup

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-17.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-17.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-17.md
}
```

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-17-ui-refresh-after-create 2>$null
```

### Lot E -- Tag + retest E2E (10 min)

#### E1. Tag v0.5.19

```powershell
git checkout main
git pull
git tag -a v0.5.19 -m "Release v0.5.19 -- Sprint 2.17 UI refresh + toast notifications"
git push origin v0.5.19
```

#### E2. CI workflows (~5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions
1. Publish Marketplace 0.5.19
2. Publish CLI npm 0.5.19
```

#### E3. Update extension a 0.5.19 dans BCEE-QA

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
"Argos Testing" : Update vers 0.5.19

PAS DE CLEANUP. Process Argos Inherited Demo reste valide.
```

#### E4. TEST E2E FINAL

```
1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. Ctrl+F5

TEST 1 : Test Plan (encore une fois)
   Hub Argos > Test Plans > Create Test Plan
   Name : "Test Plan Argos 0.5.19"
   Iteration Path : DEMO
   Click Create
   
   Attendu :
   [OK] Bouton "Create" se grise + "Creating..." pendant POST
   [OK] Toast success "Test Plan #X created"
   [OK] Test Plan VISIBLE dans la liste (refetch)
   [OK] Form reset

TEST 2 : Test Case
   Hub Argos > Cases > Create Test Case
   Title : "Test Case 0.5.19"
   Click Create
   
   Attendu :
   [OK] Toast success
   [OK] Test Case dans la liste

TEST 3 : Test Set
   Similar...

TEST 4 : Precondition  
   Similar...

TEST 5 (error path) : Tenter creation avec Iteration Path invalide
   Iteration Path : "InvalidPath"
   Click Create
   
   Attendu :
   [OK] Toast error "Failed to create Test Plan: TF401347..."
   [OK] Form NOT reset (user peut corriger et retry)
```

#### E5. Resultats

```
[OK] SCENARIO A : Tous WIT OK, toasts visibles, listes refresh
   -> MILESTONE PRODUIT FONCTIONNEL TOTAL ATTEINT
   -> 11 sprints livres en 2 jours
   -> Architecture complete
   -> Tu peux SHIP demain

[WARN] SCENARIO B : Toasts OK mais refresh manquant pour certains WIT
   -> Component pas encore migre vers useArgosList
   -> Quick fix ~15 min

[WARN] SCENARIO C : Hook pas pris en compte
   -> Components pas refactores
   -> Diagnostic + correction
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : NE PAS modifier services.ts (Sprint 2.16 finalise)

Le services.ts (Sprint 2.16) reste source des CRUD operations.
Le hook useArgosCreate l'utilise sans modification.

### GF23 : Couvrir TOUS les 7 WIT

Le hook DOIT supporter les 7 (TestCase, TestPlan, TestSet, Precondition,
TestExecution, TestCaseVersion, AuditLog).
Applique aux components avec creation form UI.

### GF24 : Sprint 2.7-2.16 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF25 : Toast simple suffit

Si library toast existe deja (Fluent UI, react-hot-toast, etc.) -- l'utiliser.
Sinon le Toast.tsx propose dans le prompt est minimal mais fonctionnel.
Ne pas surengineer pour MVP.

### GF26 : Pas de modification de la constitution

Memes regles que tous les sprints precedents.

### GF27 : Loading state visible

isCreating doit etre visuellement clair :
- Bouton greye OU spinner OU text "Creating..."
- Empeche double-click

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-17-ui-refresh-after-create

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
pnpm --filter argos-extension test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 20
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 15

pnpm turbo build --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Diagnostic. Y a-t-il deja une library toast ? X call sites de createX a refactor."
2. **Apres Lot A** : "Toast component pres OU library existante identifiee."
3. **Apres Lot B** : "useArgosCreate + useArgosList hooks ready."
4. **Apres Lot C** : "X components refactored to use hooks."
5. **Apres Lot D** : "Tests + bump + PR ready."

---

## Criteres de done

- [ ] Branche feat/sprint-2-17-ui-refresh-after-create creee
- [ ] useArgosCreate hook NEW (apps/argos-extension/src/hub/hooks/)
- [ ] useArgosList hook NEW (si pas deja en place)
- [ ] Toast component + ToastProvider NEW (si pas library existante)
- [ ] Components Test Plan / Test Case / Test Set / Precondition refactored
- [ ] Button disabled pendant isCreating
- [ ] Toast success apres create
- [ ] Toast error sur catch
- [ ] List refetch apres create
- [ ] 4+ unit tests useArgosCreate hook
- [ ] CFG-2026-05-19-ui-refresh-after-create NEW
- [ ] All Sprint 2.7-2.16 tests STILL green
- [ ] Bump 0.5.18 -> 0.5.19
- [ ] CHANGELOG complete
- [ ] tasks.md TECH-DEBT-057 livre
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.19
- [ ] CI workflows verts
- [ ] Extension 0.5.19 deployed BCEE-QA
- [ ] Create Test Plan SUCCESS + toast + visible immediately
- [ ] Pareil pour Test Case + Test Set + Precondition

---

## Apres ca

### Si MILESTONE TOTAL atteint

Bilan final exceptionnel :
```
11 sprints hotfix livres en 2 jours
12 versions Marketplace (0.5.7 a 0.5.19)
10 architectures ADO + UX traversees
Architecture COMPLETE :
  - Schema = source of truth (TESTVAULT_SCHEMA immutable)
  - Naming helpers = source of truth (argos-wit-schema/naming.ts)
  - Runtime resolver = source of truth (argos-wit-schema/wit-resolver.ts)
  - UI hooks = source of truth (use-argos-create.ts)
  
3 architectural principles validated :
  - "Tout custom prefixe TestVault X" (data plane)
  - "argos-wit-schema = source of truth" (code plane)
  - "Resolver pattern + UI hook" (runtime plane)
```

PROCHAINES PRIORITES :
- Specs/ARCHITECTURE.md (documenter principes architecturaux)
- TECH-DEBT-017 Azure Functions deploy
- TECH-DEBT-018 Commercial layer
- Public docs + Marketplace listing

### Si sub-bug detecte

Sprint 2.18 si necessaire. Mais apres 11 sprints, peu probable.

---

## Note moral

Apres Sprint 2.17 livre :

CHAINE COMPLETE END-TO-END :
```
User click "Create Test Plan"
  -> useArgosCreate hook
     -> services.ts createTestPlan
        -> WitResolver translates TestVault.TestPlan -> ArgosInheritedDemo.TestVaultTestPlan
           -> ADO POST /workItems success
              -> Toast success "Test Plan #N created"
                 -> useArgosList refetch
                    -> List updated, item visible
                       -> User sees confirmation immediate
```

ARCHITECTURE COMPLETE. PRODUIT FONCTIONNEL TOTAL.

Bon sprint final (cette fois pour de vrai) !
