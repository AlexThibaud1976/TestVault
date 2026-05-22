# CLAUDE_TASK : Sprint 2.20 - Real ADO area/iteration + Edit mode Test Plan

Repo : E:\Code\TestVault
Branche : feature/sprint-2-20-real-ado-edit-mode
Cible : version 0.5.27 (Marketplace + npm)
Estimation : 2-3 heures pour Claude Code

---

## 0. CONTEXTE

### 0.1 Etat avant ce sprint

Sprint 2.18 a livre TestPlanFormView avec sections complete :
- Section 1 : General Information
- Section 2 : Test scope (avec MOCK_AREA_PATHS et MOCK_ITERATIONS hardcoded)

Sprint 2.19 a generalise UI aux 6 autres WIT.
Sprint 2.19.1 a fixe le bug WIQL TestExecutions.

PROBLEMES ACTUELS :
1. TestPlanFormView affiche des Area Paths fictifs (mock data)
2. Pas de mode EDIT : le form ne fait que CREATE
3. Click sur Test Plan existant -> pas d'ouverture form pre-rempli
4. Pas de moyen de modifier un Test Plan existant

### 0.2 Objectif Sprint 2.20

1. Remplacer mocks par integration ADO REELLE :
   - GET /classificationNodes pour Area Paths
   - GET /work/teamsettings/iterations pour Iterations
   - Cache + refresh policy
   - Loading states pendant fetch

2. Ajouter Edit mode Test Plan :
   - Form supporte planId optionnel
   - Pre-fill avec donnees existantes du Test Plan
   - Bouton "Save changes" au lieu de "Create"
   - Click sur Test Plan dans list = ouvre form en edit mode

3. Pattern reutilisable pour 6 autres WIT (Sprint 2.21+)

### 0.3 Constraints CRITIQUES

```
- TESTVAULT_SCHEMA referenceName : IMMUTABLE
- argos-wit-schema : pas de modification
- WitResolver : utilisation OBLIGATOIRE pour fields custom
- ASCII strict partout
- Pas de regression sur Test Plan creation (qui marche)
- Pas de regression sur 6 autres WIT (qui marchent)
- Reutiliser composants design system existants
```

---

## 1. PERIMETRE TECHNIQUE

### 1.1 Fichiers crees / modifies

```
apps/argos-extension/src/hub/hooks/
  use-ado-classification-nodes.ts    [NEW] (hook pour Area Paths)
  use-ado-iterations.ts               [NEW] (hook pour Iterations)
  use-test-plan-detail.ts             [NEW] (hook pour load existing Test Plan)

apps/argos-extension/src/hub/services/
  ado-classification-service.ts       [NEW] (service ADO API classification)
  ado-iterations-service.ts           [NEW] (service ADO API iterations)

apps/argos-extension/src/hub/views/
  TestPlanFormView.tsx                [MODIFIED] (edit mode + real data)
  TestPlansListView.tsx               [MODIFIED] (click row = open edit)

apps/argos-extension/src/hub/components/
  AreaPathPicker.tsx                  [NEW] (reusable Area Path tree picker)
  IterationPicker.tsx                 [NEW] (reusable Iteration picker)

apps/argos-extension/src/hub/hooks/
  use-argos-routing.ts                [MODIFIED] (route test-plan-form supporte planId)

tools/regression/
  T-2.20-area-path-integration.test.ts  [NEW]
  T-2.20-iterations-integration.test.ts [NEW]
  T-2.20-test-plan-edit-mode.test.ts    [NEW]
  T-2.20-real-data-no-mocks.test.ts     [NEW] (regression : verifier no mock data)
```

### 1.2 Mocks a supprimer

Localiser et supprimer :

```powershell
# Trouver les mocks
Get-ChildItem apps\argos-extension -Recurse -Include *.ts,*.tsx | 
    Select-String "MOCK_AREA_PATHS|MOCK_ITERATIONS" -List

# Confirmer presence (pour Sprint 2.18)
# Apres Sprint 2.20 : doit etre vide
```

---

## 2. INTEGRATION ADO API

### 2.1 Area Paths (classification nodes)

```typescript
// services/ado-classification-service.ts

import { CoreRestClient } from "azure-devops-extension-api/Core";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
import * as SDK from "azure-devops-extension-sdk";

export interface AreaPathNode {
    id: number;
    name: string;
    path: string;          // ex : "Project\\Area1\\SubArea"
    hasChildren: boolean;
    children?: AreaPathNode[];
}

export class AdoClassificationService {
    async getAreaPaths(projectId: string): Promise<AreaPathNode[]> {
        const client = SDK.getService<WorkItemTrackingRestClient>(
            "WorkItemTracking-rest-client"
        );
        
        const rootNode = await client.getClassificationNode(
            projectId,
            "Areas",
            null,
            5  // depth 5 should be enough for most projects
        );
        
        return this.flattenTree(rootNode);
    }
    
    private flattenTree(node: any, parentPath = ""): AreaPathNode[] {
        const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
        const result: AreaPathNode[] = [{
            id: node.id,
            name: node.name,
            path: currentPath,
            hasChildren: (node.children?.length ?? 0) > 0,
        }];
        
        if (node.children) {
            for (const child of node.children) {
                result.push(...this.flattenTree(child, currentPath));
            }
        }
        
        return result;
    }
}
```

### 2.2 Iterations

```typescript
// services/ado-iterations-service.ts

import { WorkRestClient } from "azure-devops-extension-api/Work";
import * as SDK from "azure-devops-extension-sdk";

export interface IterationNode {
    id: string;
    name: string;
    path: string;
    startDate?: Date;
    finishDate?: Date;
}

export class AdoIterationsService {
    async getIterations(projectId: string, teamId: string): Promise<IterationNode[]> {
        const client = SDK.getService<WorkRestClient>("Work-rest-client");
        
        const iterations = await client.getTeamIterations({
            projectId,
            teamId,
            project: projectId,
            team: teamId,
        });
        
        return iterations.map((it: any) => ({
            id: it.id,
            name: it.name,
            path: it.path,
            startDate: it.attributes?.startDate,
            finishDate: it.attributes?.finishDate,
        }));
    }
}
```

### 2.3 Hooks

```typescript
// hooks/use-ado-classification-nodes.ts
import { useEffect, useState } from "react";
import { useServices } from "../services-context";

export function useAdoAreaPaths(projectId: string) {
    const { adoClassificationService } = useServices();
    const [areas, setAreas] = useState<AreaPathNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        if (!projectId) return;
        
        setIsLoading(true);
        adoClassificationService.getAreaPaths(projectId)
            .then((data) => {
                setAreas(data);
                setError(null);
            })
            .catch((err) => {
                setError(err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [projectId, adoClassificationService]);
    
    return { areas, isLoading, error };
}

// hooks/use-ado-iterations.ts (similar pattern)
```

---

## 3. EDIT MODE TEST PLAN

### 3.1 Routing update

```typescript
// hooks/use-argos-routing.ts

export type ArgosRoute = 
    | { type: 'test-plan-form'; planId?: string }   // planId = edit mode si present
    | // ... autres routes
```

### 3.2 TestPlanFormView edit mode

```typescript
// views/TestPlanFormView.tsx

interface TestPlanFormViewProps {
    planId?: string;  // si present = edit mode
    onSaved?: (plan: TestVaultTestPlan) => void;
    onCancel?: () => void;
}

export function TestPlanFormView({ planId, onSaved, onCancel }: TestPlanFormViewProps) {
    const isEditMode = !!planId;
    
    // Load existing data si edit mode
    const { plan: existingPlan, isLoading: isLoadingPlan } = useTestPlanDetail(planId);
    
    // Form state pre-filled si edit, default si create
    const [formData, setFormData] = useState<TestPlanFormData>(() => 
        existingPlan ? mapPlanToFormData(existingPlan) : DEFAULT_FORM_DATA
    );
    
    // Sync form state when existingPlan loads (async)
    useEffect(() => {
        if (existingPlan) {
            setFormData(mapPlanToFormData(existingPlan));
        }
    }, [existingPlan]);
    
    const { areas, isLoading: isLoadingAreas } = useAdoAreaPaths(projectId);
    const { iterations, isLoading: isLoadingIterations } = useAdoIterations(projectId, teamId);
    
    const handleSubmit = async () => {
        if (isEditMode) {
            await testPlanService.updateTestPlan(planId!, formData);
        } else {
            await testPlanService.createTestPlan(formData);
        }
        toast.success(isEditMode ? "Test Plan updated" : "Test Plan created");
        onSaved?.(formData);
    };
    
    if (isEditMode && isLoadingPlan) {
        return <LoadingSpinner />;
    }
    
    return (
        <div className="test-plan-form">
            <h1>{isEditMode ? "Edit Test Plan" : "New Test Plan"}</h1>
            {/* sections form */}
            {/* AreaPathPicker uses real areas */}
            {/* IterationPicker uses real iterations */}
            <button onClick={handleSubmit}>
                {isEditMode ? "Save changes" : "Create Test Plan"}
            </button>
        </div>
    );
}
```

### 3.3 TestPlansListView - click row opens edit

```typescript
// views/TestPlansListView.tsx

export function TestPlansListView({ onCreateNew, onEditPlan }: Props) {
    // ...existing code...
    
    const handleRowClick = (plan: TestVaultTestPlan) => {
        onEditPlan(plan.id);  // navigate to test-plan-form route with planId
    };
    
    const columns: Column<TestVaultTestPlan>[] = [
        {
            key: "id",
            header: "ID",
            render: (r) => (
                <a 
                    onClick={() => handleRowClick(r)} 
                    style={{ cursor: "pointer", color: "var(--argos-blue-primary)" }}
                >
                    #{r.id}
                </a>
            ),
        },
        // ... autres columns avec onClick row
    ];
}
```

---

## 4. COMPOSANTS REUTILISABLES

### 4.1 AreaPathPicker

```typescript
// components/AreaPathPicker.tsx

interface AreaPathPickerProps {
    value: string | null;
    onChange: (path: string) => void;
    projectId: string;
    label?: string;
    required?: boolean;
}

export function AreaPathPicker({ value, onChange, projectId, label, required }: AreaPathPickerProps) {
    const { areas, isLoading, error } = useAdoAreaPaths(projectId);
    
    if (isLoading) return <LoadingPlaceholder />;
    if (error) return <ErrorMessage error={error} />;
    
    return (
        <Select
            label={label}
            value={value}
            onChange={onChange}
            required={required}
            options={areas.map(a => ({
                value: a.path,
                label: a.path,
                // indent visually par level de hierarchie
            }))}
        />
    );
}
```

### 4.2 IterationPicker

Pattern similaire - reutilisable pour Test Plan, Test Set, Test Execution forms.

---

## 5. TESTS REGRESSION

### 5.1 Test integration Area Path

```typescript
// tools/regression/T-2.20-area-path-integration.test.ts

describe("T-2.20 Area Path real integration", () => {
    it("Service uses real ADO API (no mocks)", async () => {
        const sourceCode = readFileSync(
            "apps/argos-extension/src/hub/services/ado-classification-service.ts",
            "utf-8"
        );
        expect(sourceCode).not.toContain("MOCK_AREA_PATHS");
        expect(sourceCode).toMatch(/getClassificationNode/);
    });
    
    it("Hook returns areas data", async () => {
        // Mock SDK pour test
        // Verifier que useAdoAreaPaths charge bien les donnees
    });
    
    it("AreaPathPicker handles loading state", () => {
        // Render avec isLoading = true
        // Verifier que LoadingPlaceholder est affiche
    });
    
    it("AreaPathPicker handles error state", () => {
        // Render avec error
        // Verifier que ErrorMessage est affiche
    });
});
```

### 5.2 Test edit mode

```typescript
// tools/regression/T-2.20-test-plan-edit-mode.test.ts

describe("T-2.20 Test Plan edit mode", () => {
    it("TestPlanFormView with planId loads existing data", async () => {
        const mockPlan = { id: 123, name: "Existing Plan", description: "..." };
        // Mock useTestPlanDetail to return mockPlan
        
        render(<TestPlanFormView planId="123" />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue("Existing Plan")).toBeInTheDocument();
        });
    });
    
    it("TestPlanFormView without planId is in create mode", () => {
        render(<TestPlanFormView />);
        expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    });
    
    it("Click row in TestPlansListView opens form in edit mode", async () => {
        // Mock useArgosList to return test plans
        // Mock useArgosRouting to capture navigation
        // Click row -> verify navigate called with planId
    });
    
    it("Save in edit mode calls updateTestPlan, not createTestPlan", async () => {
        // Mock testPlanService
        // Render TestPlanFormView with planId
        // Fill changes + submit
        // Verify updateTestPlan called, NOT createTestPlan
    });
});
```

### 5.3 Test no mock data regression

```typescript
// tools/regression/T-2.20-real-data-no-mocks.test.ts

describe("T-2.20 No mock data regression", () => {
    it("TestPlanFormView source has no MOCK constants", () => {
        const source = readFileSync(
            "apps/argos-extension/src/hub/views/TestPlanFormView.tsx",
            "utf-8"
        );
        expect(source).not.toContain("MOCK_AREA_PATHS");
        expect(source).not.toContain("MOCK_ITERATIONS");
    });
    
    it("No file in views/ uses MOCK constants", async () => {
        const files = await glob("apps/argos-extension/src/hub/views/*.tsx");
        for (const file of files) {
            const content = readFileSync(file, "utf-8");
            expect(content).not.toMatch(/MOCK_(AREA|ITERATION|TEST)/);
        }
    });
});
```

---

## 6. CHECKPOINTS

### CHECKPOINT A : Services + Hooks (45 min)

1. Creer ado-classification-service.ts
2. Creer ado-iterations-service.ts
3. Creer hooks use-ado-area-paths, use-ado-iterations
4. Tests T-2.20-area-path-integration
5. Verification : appel API ADO reel

Validation Alex : preview.html ou tests E2E montrent vraies donnees.

### CHECKPOINT B : Pickers + Form refactor (45 min)

1. Creer AreaPathPicker component
2. Creer IterationPicker component
3. Modifier TestPlanFormView pour utiliser real pickers
4. Supprimer MOCK_AREA_PATHS et MOCK_ITERATIONS
5. Tests T-2.20-real-data-no-mocks

Validation Alex : creation Test Plan avec vraies Area Paths.

### CHECKPOINT C : Edit mode (45 min)

1. Creer useTestPlanDetail hook
2. TestPlanFormView accepte planId optionnel
3. Pre-fill + Save vs Create
4. TestPlansListView click row -> edit mode
5. Routing update planId support
6. Tests T-2.20-test-plan-edit-mode

Validation Alex : modifier Test Plan existant marche.

### CHECKPOINT D : Bump + tests + PR (30 min)

1. Bump 0.5.26 -> 0.5.27
2. CHANGELOG update
3. Tests complets pass
4. Build VSIX
5. Commit + push + PR

---

## 7. WORKFLOW GIT

```powershell
cd E:\Code\TestVault
git checkout main
git pull

git checkout -b feature/sprint-2-20-real-ado-edit-mode

# Travail CHECKPOINT A-B-C-D...

node tools\release\bump-fixed-version.cjs 0.5.27

git add -A
git commit -F "$env:TEMP\sprint-2-20-commit-msg.txt"
git push -u origin feature/sprint-2-20-real-ado-edit-mode

gh pr create --title "feat(extension): Sprint 2.20 - Real ADO integration + Edit mode Test Plan" `
            --body-file "$env:TEMP\sprint-2-20-pr-body.txt"
```

---

## 8. COMMIT MESSAGE TEMPLATE

```
feat(extension): Sprint 2.20 - Real ADO integration + Edit mode Test Plan

Sprint 2.18 delivered TestPlanFormView with MOCK_AREA_PATHS and 
MOCK_ITERATIONS hardcoded (placeholder data for POC). Sprint 2.20 
replaces these mocks with real ADO API integration AND adds edit 
mode for existing Test Plans.

Delivered :

1. ADO API integration services (2 new) :
   - AdoClassificationService : GET /classificationNodes (Area Paths)
   - AdoIterationsService : GET /work/teamsettings/iterations

2. Hooks (3 new) :
   - useAdoAreaPaths : load area paths with loading/error states
   - useAdoIterations : load iterations with loading/error states  
   - useTestPlanDetail : load existing plan for edit mode

3. Components reutilisables (2 new) :
   - AreaPathPicker : reusable Area Path selector
   - IterationPicker : reusable Iteration selector

4. TestPlanFormView edit mode :
   - Accepts optional planId prop
   - Pre-fills form with existing data
   - Button : "Save changes" (edit) vs "Create" (new)
   - Calls updateTestPlan vs createTestPlan

5. TestPlansListView edit trigger :
   - Click row in table opens form in edit mode
   - Routing supports planId in test-plan-form route

6. Mocks SUPPRIMES :
   - MOCK_AREA_PATHS removed (was in TestPlanFormView)
   - MOCK_ITERATIONS removed
   - Regression test prevents reintroduction

Tests added :
- T-2.20-area-path-integration : verify real API usage
- T-2.20-iterations-integration : verify real API usage
- T-2.20-test-plan-edit-mode : verify edit flow
- T-2.20-real-data-no-mocks : prevents MOCK reintroduction

Architectural principles preserved :
- WitResolver pattern used for any custom field reference
- argos-wit-schema source of truth
- Design system components reused
- Tests follow Sprint 2.18 pattern

Reusable for next sprints :
- AreaPathPicker / IterationPicker can be used in Sprint 2.21+
  for Test Case, Test Set, Test Execution forms

Bump 0.5.26 -> 0.5.27

Refs :
- Sprint 2.18 (introduced MOCK_AREA_PATHS / MOCK_ITERATIONS placeholders)
- Sprint 2.19 (UI generalisation, exposed edit mode need)
- TECH-DEBT-061 closed (real ADO area/iteration integration)
```

---

## 9. PR BODY TEMPLATE

```markdown
## Summary

Sprint 2.20 -- Real ADO integration + Edit mode Test Plan.

Replaces MOCK_AREA_PATHS and MOCK_ITERATIONS hardcoded data (Sprint 2.18) 
with real ADO API integration. Adds edit mode for existing Test Plans.

## What changed

### Services (2 new)
- AdoClassificationService : real Area Paths from ADO
- AdoIterationsService : real Iterations from ADO

### Hooks (3 new)
- useAdoAreaPaths
- useAdoIterations
- useTestPlanDetail (for edit mode pre-fill)

### Components (2 new)
- AreaPathPicker : reusable tree picker
- IterationPicker : reusable iteration selector

### Views modified
- TestPlanFormView : supports edit mode (planId prop)
- TestPlansListView : click row triggers edit

### Routing
- test-plan-form route accepts optional planId

### Mocks removed
- MOCK_AREA_PATHS deleted
- MOCK_ITERATIONS deleted
- Regression test prevents reintroduction

## Tests

- T-2.20 (4 new regression tests)
- All existing tests still pass
- VSIX smoke test : real data loads correctly

## Reusable for next sprints

AreaPathPicker and IterationPicker are designed for reuse in :
- Sprint 2.21 : Test Case form (priority field uses Area Path)
- Sprint 2.22+ : Test Set, Test Execution forms

## Out of scope (next sprints)

- Sprint 2.21 : AI candidates + Gherkin native (USP)
- Sprint 2.22 : Coverage Matrix + Test Execution UI

## Bump

0.5.26 -> 0.5.27

## Refs

- ARGOS_ANALYSE_MARCHE_COMPLETE.md v1.1 : feature F02 + F03 [DONE]
- Sprint 2.18 (introduced mocks)
- TECH-DEBT-061 closed
```

---

## 10. APRES MERGE

```powershell
git checkout main
git pull
git tag -a v0.5.27 -m "Release v0.5.27 - Sprint 2.20 Real ADO integration + Edit mode"
git push origin v0.5.27

# Surveille CI
# https://github.com/AlexThibaud1976/TestVault/actions

# Reinstall extension BCEE-QA
# https://dev.azure.com/BCEE-QA/_settings/extensions

# Test E2E :
# 1. Click "New Test Plan" : Area Path dropdown montre VRAIES areas
# 2. Cree Test Plan
# 3. Click sur Test Plan dans list : ouvre form en edit mode pre-rempli
# 4. Modifier + Save changes
# 5. Verifier dans ADO portal : changes appliques
```

---

## 11. NOTES IMPORTANTES

### 11.1 ASCII strict

Tous commentaires de code, messages git, descriptions = ASCII.

### 11.2 WitResolver pattern OBLIGATOIRE

Si on touche a des fields custom (TestVault.X), passer par WitResolver.
Lecon apprise Sprint 2.19.1.

### 11.3 Performance

Real ADO API peut etre lent (200-500ms par call).
Implementer cache simple :
- Area Paths : cache 1h
- Iterations : cache 1h
- Test Plan detail : pas de cache (toujours frais en edit mode)

### 11.4 Erreurs API

Si API ADO retourne 401/403 : extension permissions insuffisantes.
Si 404 : ressource n'existe pas.
Affichage user-friendly avec retry.

### 11.5 Si bloque

- STOP avant de tout casser
- Commit incremental
- Documentation dans PR
- Alex iterait avec Claude (web) pour deblocage

### 11.6 Maintenance docs strategiques (rappel Alex)

Apres Sprint 2.20 livre :
- ARGOS_ANALYSE_MARCHE_COMPLETE.md : marquer F02 + F03 [DONE]
- TECH-DEBT-061 marque ferme

---

## 12. CHECKLIST FINALE

Avant PR :

- [ ] CHECKPOINT A done (services + hooks)
- [ ] CHECKPOINT B done (pickers + form refactor)
- [ ] CHECKPOINT C done (edit mode)
- [ ] CHECKPOINT D done (bump + tests + PR)
- [ ] MOCK_AREA_PATHS supprime du code
- [ ] MOCK_ITERATIONS supprime du code
- [ ] 4 nouveaux tests T-2.20 passent
- [ ] Tests existants passent (no regression)
- [ ] Bump 0.5.26 -> 0.5.27
- [ ] CHANGELOG.md update
- [ ] Specs/tasks.md update
- [ ] preview.html : creation + edit Test Plan fonctionne
- [ ] VSIX rebuild reussit
- [ ] Commit/PR templates respectes
- [ ] ASCII strict partout

---

Fin du prompt CLAUDE_TASK Sprint 2.20.

Estimation : 2-3 heures pour Claude Code.
Suite : Sprint 2.21 (AI candidates + Gherkin native - USP).
