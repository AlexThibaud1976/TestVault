# Prompt Claude Code -- Sprint 2.5e First Run Wizard (`feat/sprint-2-5e-first-run-wizard`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **First Run Wizard + Process Installation** (~2-2h30).
> CRITIQUE : sans ce sprint, Argos ne peut RIEN sauvegarder (bug decouvert apres install 0.5.3).

---

## Contexte critique

**Decouverte 2026-05-15** : Argos 0.5.3 publie sur Marketplace, installe sur instance ADO, mais **rien ne se sauvegarde**. Erreur ADO :
```
VS402323: Work item type TestVault.TestPlan does not exist
WorkItemTypeNotFoundException
```

Cause : les Custom WIT TestVault.* ne sont pas installes sur le projet ADO. Le SDK pour installer existe (`packages/argos-sdk/src/process-install.ts`) mais **n'est jamais appele depuis l'extension**.

T-1.3 dans tasks.md est faussement marque DONE (audit Phase 0-7 ce matin a coche en se basant sur SDK + tests unitaires, sans verifier wiring UI reel). Ce sprint corrige cette dette.

Refs :
- `Specs/spec.md` US-6.1 "Installer le Custom Process Inheritance via wizard"
- `Specs/tasks.md` T-1.3 (a re-decocher partiellement)
- `packages/argos-sdk/src/process-install.ts` : SDK complet pret a l'emploi
- `packages/argos-detection-api/src/wit-schema-reader.ts` : detection alternative
- `packages/argos-wit-schema/src/schema.ts` : TESTVAULT_SCHEMA avec 7 WIT

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm preflight` -> PASSED (argos@0.5.3)
- [ ] argos@0.5.3 publie sur Marketplace + installe sur instance ADO test

---

## Decisions actees (2026-05-15)

| # | Element | Choix |
|---|---|---|
| D58 | Sprint 2.5e nature | D -- Diagnostic save (FAIT, ce sprint corrige) |
| D59 | Sprint Design | B -- Iteratif, reporte apres ce sprint |
| D60 | Design system | A -- Fluent UI 2 strict |
| D61 | Scope manifest | A -- Ajouter vso.process_write |
| D62 | Strategie process | B -- Detect + choix user (modifier OU creer) |
| D63 | Si refus install | B+C -- Exploration limitee + banner "Limited mode" |
| D64 | Idempotency update | B -- Detect + wizard sync schema |
| D65 | Sprint structure | A -- Monolithique avec commits intermediaires |

---

## Architecture cible

```
App.tsx racine
+- OfflineBanner (deja la, Sprint 2.5d)
+- ServicesProvider
   +- InstallationGuard (NEW)
      +- Si state.status === "not-installed" -> redirect GetStartedView
      +- Si state.status === "partial" -> redirect GetStartedView (mode "Update")
      +- Si state.status === "installed" + schemaVersion OK -> render normalement
      +- Si state.status === "installed" + schemaVersion DIFFERENT -> banner sync schema (D64)
      +- Si user a clique "Skip" -> render normalement + LimitedModeBanner
   +- Hub Section Resolver (existant)
      +- ... vues existantes
```

Nouvelles vues :
- `GetStartedView.tsx` : 5 etapes wizard
- `LimitedModeBanner.tsx` : banner permanent si install skippe

Nouveau service :
- `processInstallService` dans `services.ts`

---

## Composition exacte du sprint

### A. Modifier `apps/argos-extension/vss-extension.json`

Ajouter scope `vso.process_write` (D61-A) :
```json
"scopes": [
    "vso.work_full",
    "vso.profile",
    "vso.code",
    "vso.extension.data_write",
    "vso.identity",
    "vso.process_write"
]
```

**Attention** : ajouter ce scope force reauthorization a l'upgrade. C'est OK car on est en beta privee (D61-A note).

### B. Etendre `apps/argos-extension/src/hub/services.ts`

Ajouter `processInstallService` :
```typescript
import { 
    createProcessInstallService, 
    type IProcessInstallService 
} from "@atconseil/argos-sdk";

export interface Services {
    // ... existants
    processInstallService: IProcessInstallService;
}

export function buildServices(ctx: AdoContext): Services {
    // ... existant
    
    const processInstallService = createProcessInstallService({
        orgUrl: ctx.baseUrl,
        getAuthHeader: async () => `Bearer ${await ctx.accessTokenFactory()}`,
    });
    
    return {
        // ... existants
        processInstallService,
    };
}
```

### C. Creer `apps/argos-extension/src/hub/views/GetStartedView.tsx`

Composant wizard 5 etapes :
1. **Welcome** : explication Argos + cohabitation Microsoft Test Plans
2. **Detection** : appel detectInstallState() + display result
3. **Choice** : si "not-installed" -> choisir base process (Agile/Scrum/CMMI) + nom custom
                si "partial" -> proposer "Update existing" 
                si "installed" mais version differente -> proposer "Sync schema"
4. **Install** : execute install() avec onProgress callback -> progress bar
5. **Success** : success message + redirect dashboard OU Skip -> LimitedMode

Props :
```typescript
export interface GetStartedViewProps {
    initialState: ProcessInstallState;
    service: IProcessInstallService;
    onComplete: () => void;
    onSkip: () => void;
}
```

UI : utiliser Fluent UI 2 (Stepper / FieldGroup / Button / ProgressBar / MessageBar).

### D. Creer `apps/argos-extension/src/hub/views/LimitedModeBanner.tsx`

Banner permanent affiche quand user a skip install :
```typescript
export interface LimitedModeBannerProps {
    onInstallNow: () => void;
}
```

UI : MessageBar Fluent UI intent="warning" avec bouton "Install now".

### E. Modifier `apps/argos-extension/src/hub/App.tsx`

Wrapper `InstallationGuard` :
```tsx
function ServicesAwareApp() {
    const { processInstallService, connectivityService } = useServices();
    const [installState, setInstallState] = useState<ProcessInstallState | null>(null);
    const [userSkipped, setUserSkipped] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    
    useEffect(() => {
        // Detection au boot
        processInstallService.detectInstallState()
            .then(setInstallState)
            .catch(err => console.error("Install detection failed", err));
        
        // Charger flag userSkipped depuis extensionData
        // (a implementer avec dataClient)
    }, [processInstallService]);
    
    if (installState === null) {
        return <Spinner label="Detecting Argos installation..." />;
    }
    
    const needsInstall = 
        installState.status === "not-installed" || 
        installState.status === "partial";
    
    if (needsInstall && !userSkipped && !showWizard) {
        // Show wizard automatiquement
        return (
            <GetStartedView 
                initialState={installState}
                service={processInstallService}
                onComplete={() => {
                    processInstallService.detectInstallState().then(setInstallState);
                }}
                onSkip={() => {
                    setUserSkipped(true);
                    // Save flag in extensionData
                }}
            />
        );
    }
    
    return (
        <>
            <OfflineBanner connectivity={connectivityService} />
            {needsInstall && userSkipped && (
                <LimitedModeBanner onInstallNow={() => setShowWizard(true)} />
            )}
            {/* hub-root normal */}
        </>
    );
}
```

### F. Disable buttons in limited mode

Quand `needsInstall && userSkipped`, tous les boutons "Create"/"Save" dans les forms doivent etre disabled avec tooltip "Install Argos WIT first to enable this action".

Approche : ajouter un context React `InstallationContext` qui expose `canCreate: boolean` et tous les boutons concernes utilisent ce flag.

Composants impactes (au moins) :
- TestPlanForm : bouton "Create Test Plan"
- TestCaseForm : bouton "Create Test Case"
- TestSetForm : bouton "Create Test Set"
- PreconditionForm : bouton "Create Precondition"
- RunInterface : bouton "Save Run"
- SnapshotPanel : bouton "Create Snapshot"
- ImportWizard : bouton "Import"
- CreateBugForm : bouton "Create Bug"

!! NE PAS modifier les composants riches eux-memes. Plutot wrapper dans App.tsx pour passer un prop `disabled` via context.

### G. Tests wiring

Creer dans `apps/argos-extension/src/hub/wiring/` :
- `WIRING-2026-05-15-installation-guard.test.tsx`
  - Cas "not-installed" -> redirect GetStartedView
  - Cas "installed" -> render hub normal
  - Cas "partial" -> redirect GetStartedView mode update
  - Cas user skip -> render hub + LimitedModeBanner
- `WIRING-2026-05-15-get-started-wizard.test.tsx`
  - Render 5 etapes
  - Click "Next" navigue
  - Click "Install" appelle service.install()
  - Click "Skip" appelle onSkip
- `WIRING-2026-05-15-limited-mode-banner.test.tsx`
  - Banner s'affiche quand skip
  - Click "Install now" reopens wizard

### H. Modifier `Specs/tasks.md`

DECOCHER T-1.3 sous-taches (partiellement faussement marquees DONE) :
- [ ] UI du wizard : etapes de detection permissions... (faussement coche)
- [ ] Detection idempotente (le code existe, le wiring non)
- [ ] Tests E2E sur instance Cloud (jamais fait)

COCHER apres ce sprint :
- [x] UI du wizard wireee dans extension
- [x] Detection au boot
- [x] Banner Limited Mode
- [x] Tests wiring

### I. CHANGELOG.md section [0.5.4]

Section complete documentant :
- **CRITIQUE** : decouverte du bug "WIT not installed" en condition reelle
- T-1.3 partially un-checked + re-checked apres wiring
- TECH-DEBT-019 partially adressee (audit E2E reel)
- Lecon : tests unitaires != produit fonctionnel
- New scope `vso.process_write` (impact : reauthorize requis)

### J. Specs/MIGRATION-PLAN.md

Ajouter section "First Run Wizard activation".

### K. Bump version 0.5.3 -> 0.5.4

```powershell
node tools\release\bump-fixed-version.cjs 0.5.4
```

---

## Garde-fous

### Garde-fou 1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou 2 : Pas de modif process-install.ts
Le SDK existe, est teste, ne pas le toucher. On l'utilise tel quel.

### Garde-fou 3 : InstallationGuard EN HAUT du tree
L'InstallationGuard wrappe TOUT le hub. Si user pas installe, il ne doit pas voir les hubs en arriere plan.

### Garde-fou 4 : extensionData pour "user-skipped"
Le flag doit etre persistant entre sessions. Use `createExtensionDataClient()` (deja en place).

### Garde-fou 5 : Reauthorization avertissement
Documenter dans CHANGELOG + overview.md que upgrade 0.5.3 -> 0.5.4 demandera reauthorization (nouveau scope `vso.process_write`).

### Garde-fou 6 : Test CFG-2026-05-14-fixed-versioning DOIT passer
Apres bump 0.5.4 :
```powershell
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning
```

### Garde-fou 7 : Test marketplace-public DOIT passer
Pas de modif galleryFlags Private (lecon Sprint Marketplace 0.5.3).

### Garde-fou 8 : Composants riches INTOUCHABLES
NE PAS modifier les 24 composants existants. Wrapper via context React pour passer `disabled` prop.

### Garde-fou 9 : Fluent UI 2 strict (D60-A)
Utiliser composants Fluent UI 2 (`@fluentui/react-components`) :
- Stepper / FieldGroup / Input / Select / RadioGroup
- Button / Spinner / ProgressBar / MessageBar
- Card / CardHeader / CardBody pour structurer les etapes
Pas de HTML brut + style inline.

### Garde-fou 10 : Tests UI Wizard couvrent les 3 etats
- "not-installed" : full install flow
- "partial" : update missing WIT
- "installed" diff schemaVersion : sync schema
+ user skip path

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-5e-first-run-wizard

pnpm --filter @atconseil/regression-suite test
# 57 passing baseline
```

---

## Etape 1 -- Lecture finale + planification

```powershell
# Verifier signatures exactes argos-sdk export
Get-Content packages\argos-sdk\src\index.ts -Encoding UTF8 | Select-String "process-install"

# Voir si createProcessInstallService est bien exporte
Select-String -Path packages\argos-sdk\src\index.ts -Pattern "ProcessInstall|createProcessInstall" -Encoding UTF8

# Verifier signature accessTokenFactory dans ado-context.ts
Get-Content apps\argos-extension\src\hub\ado-context.ts -Encoding UTF8

# Verifier extensionData store pour persistance skip flag
Get-Content apps\argos-extension\src\hub\extension-data-store.ts -Encoding UTF8 -TotalCount 60
```

Rapporter a l'utilisateur :
- argos-sdk exporte bien createProcessInstallService et ProcessInstallState ?
- ado-context.accessTokenFactory signature : `() => Promise<string>` ?
- extensionData store permet bien get/set arbitraire keys ?
- Estimation revisee du sprint (2h30 initial)
- Confirmation pour Etape 2

---

## Etape 2 -- Modifier manifest scope

Ajouter `vso.process_write` dans `apps/argos-extension/vss-extension.json` :
```json
"scopes": [
    "vso.work_full",
    "vso.profile",
    "vso.code",
    "vso.extension.data_write",
    "vso.identity",
    "vso.process_write"
]
```

Verifier preflight :
```powershell
pnpm preflight
```

Si preflight echoue : investigation.

---

## Etape 3 -- Etendre services.ts

Ajouter processInstallService comme decrit en B ci-dessus.

Verifier que `createProcessInstallService` est bien exporte depuis `@atconseil/argos-sdk`. Si non, ajouter export dans `packages/argos-sdk/src/index.ts`.

Tests services.test.ts (s'il existe) doivent rester passants.

---

## Etape 4 -- Test wiring InstallationGuard

`WIRING-2026-05-15-installation-guard.test.tsx` :

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

function makeService(state: ProcessInstallState): IProcessInstallService {
    return {
        detectInstallState: vi.fn().mockResolvedValue(state),
        install: vi.fn(),
    };
}

describe("WIRING 2026-05-15 -- InstallationGuard", () => {
    it("redirects to GetStartedView when status=not-installed", async () => {
        const service = makeService({ status: "not-installed" });
        render(<App />); // avec service mock
        await waitFor(() => {
            expect(screen.getByTestId("get-started-view")).toBeInTheDocument();
        });
    });
    
    it("redirects to GetStartedView when status=partial", async () => {
        const service = makeService({ 
            status: "partial", 
            processId: "p1", 
            processName: "Custom",
            missingWitRefs: ["TestVault.TestExecution"]
        });
        render(<App />);
        await waitFor(() => {
            expect(screen.getByTestId("get-started-view")).toBeInTheDocument();
        });
    });
    
    it("renders hub when status=installed and schema OK", async () => {
        const service = makeService({ 
            status: "installed",
            processId: "p1",
            processName: "Custom",
            schemaVersion: "1.0.0"  // matches current
        });
        render(<App />);
        await waitFor(() => {
            expect(screen.queryByTestId("get-started-view")).toBeNull();
        });
    });
});
```

Lancer : ROUGE.

---

## Etape 5 -- Implementer InstallationGuard dans App.tsx

Voir bloc "E. Modifier App.tsx" ci-dessus. Lancer : VERT.

Commit intermediaire.

---

## Etape 6 -- Test wiring GetStartedView (5 etapes)

`WIRING-2026-05-15-get-started-wizard.test.tsx` :

```tsx
describe("WIRING 2026-05-15 -- GetStartedView", () => {
    it("renders Welcome step initially", () => {
        const service = makeService({ status: "not-installed" });
        render(<GetStartedView initialState={{status:"not-installed"}} service={service} onComplete={vi.fn()} onSkip={vi.fn()} />);
        expect(screen.getByTestId("wizard-step-welcome")).toBeInTheDocument();
    });
    
    it("navigates to Detection step on Next", () => {
        // ... click Next
        expect(screen.getByTestId("wizard-step-detection")).toBeInTheDocument();
    });
    
    it("calls onSkip when Skip clicked", () => {
        const onSkip = vi.fn();
        render(<GetStartedView ... onSkip={onSkip} />);
        fireEvent.click(screen.getByRole("button", { name: /skip/i }));
        expect(onSkip).toHaveBeenCalled();
    });
    
    it("calls service.install with chosen options", async () => {
        // Click through wizard, choose Agile, name "MyCustom"
        // Click "Install"
        expect(service.install).toHaveBeenCalledWith({
            processName: "MyCustom",
            baseProcess: "Agile",
            onProgress: expect.any(Function),
        });
    });
});
```

Lancer : ROUGE.

---

## Etape 7 -- Creer GetStartedView.tsx

Composant wizard 5 etapes Fluent UI. Code de reference :

```tsx
import { useState } from "react";
import { 
    Button, MessageBar, MessageBarBody, ProgressBar, 
    Spinner, Text, Field, Input, RadioGroup, Radio,
    Card, CardHeader 
} from "@fluentui/react-components";
import type { 
    IProcessInstallService, 
    ProcessInstallState,
    BaseProcessType,
    InstallProgressStep 
} from "@atconseil/argos-sdk";

type Step = "welcome" | "detection" | "choice" | "install" | "success";

export interface GetStartedViewProps {
    initialState: ProcessInstallState;
    service: IProcessInstallService;
    onComplete: () => void;
    onSkip: () => void;
}

export function GetStartedView({ initialState, service, onComplete, onSkip }: GetStartedViewProps) {
    const [step, setStep] = useState<Step>("welcome");
    const [baseProcess, setBaseProcess] = useState<BaseProcessType>("Agile");
    const [processName, setProcessName] = useState("Argos Inherited");
    const [progress, setProgress] = useState<InstallProgressStep | null>(null);
    const [installError, setInstallError] = useState<string | null>(null);
    
    async function handleInstall() {
        setStep("install");
        setInstallError(null);
        try {
            await service.install({
                processName,
                baseProcess,
                onProgress: setProgress,
            });
            setStep("success");
        } catch (err) {
            setInstallError(err instanceof Error ? err.message : "Install failed");
        }
    }
    
    return (
        <div data-testid="get-started-view" style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
            <Text as="h1" size={700} weight="bold" block>Welcome to Argos</Text>
            
            {step === "welcome" && (
                <div data-testid="wizard-step-welcome">
                    <Card>
                        <CardHeader>
                            <Text size={400} weight="semibold">Industrial-grade test management for Azure DevOps</Text>
                        </CardHeader>
                        <div style={{ padding: 16 }}>
                            <Text block>
                                Argos uses custom work item types (TestVault.*) to provide a complete test management 
                                experience within Azure DevOps. These types coexist peacefully with Microsoft Test Plans.
                            </Text>
                            <Text block style={{ marginTop: 12 }}>
                                Before you can create test plans, cases, and runs, Argos needs to install 
                                7 custom work item types into your process. This requires Project Collection Admin permissions.
                            </Text>
                            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                                <Button appearance="primary" onClick={() => setStep("detection")}>
                                    Get Started
                                </Button>
                                <Button onClick={onSkip}>Skip for now</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            
            {step === "detection" && (
                <div data-testid="wizard-step-detection">
                    {/* Show detected state from initialState */}
                </div>
            )}
            
            {step === "choice" && (
                <div data-testid="wizard-step-choice">
                    <Field label="Base process to inherit from">
                        <RadioGroup value={baseProcess} onChange={(_, data) => setBaseProcess(data.value as BaseProcessType)}>
                            <Radio value="Agile" label="Agile (recommended)" />
                            <Radio value="Scrum" label="Scrum" />
                            <Radio value="CMMI" label="CMMI" />
                        </RadioGroup>
                    </Field>
                    <Field label="New process name">
                        <Input value={processName} onChange={(_, data) => setProcessName(data.value)} />
                    </Field>
                    <Button appearance="primary" onClick={handleInstall}>Install</Button>
                </div>
            )}
            
            {step === "install" && (
                <div data-testid="wizard-step-install">
                    <Text size={400} weight="semibold" block>Installing Argos schema...</Text>
                    {progress && (
                        <>
                            <Text block style={{ marginTop: 12 }}>{progress.message}</Text>
                            {progress.total && (
                                <ProgressBar 
                                    value={progress.current ?? 0} 
                                    max={progress.total} 
                                />
                            )}
                        </>
                    )}
                    {installError && (
                        <MessageBar intent="error">
                            <MessageBarBody>{installError}</MessageBarBody>
                        </MessageBar>
                    )}
                </div>
            )}
            
            {step === "success" && (
                <div data-testid="wizard-step-success">
                    <MessageBar intent="success">
                        <MessageBarBody>
                            Argos schema installed successfully. You can now create test plans, cases, and runs.
                        </MessageBarBody>
                    </MessageBar>
                    <Button appearance="primary" onClick={onComplete} style={{ marginTop: 16 }}>
                        Go to dashboard
                    </Button>
                </div>
            )}
        </div>
    );
}
```

Lancer test : VERT. Commit intermediaire.

---

## Etape 8 -- LimitedModeBanner + integration

Creer `LimitedModeBanner.tsx` :
```tsx
import { Button, MessageBar, MessageBarBody, MessageBarActions } from "@fluentui/react-components";

export interface LimitedModeBannerProps {
    onInstallNow: () => void;
}

export function LimitedModeBanner({ onInstallNow }: LimitedModeBannerProps) {
    return (
        <MessageBar data-testid="limited-mode-banner" intent="warning">
            <MessageBarBody>
                <strong>Limited mode</strong> -- Argos custom WIT not installed. Create/save features are disabled.
            </MessageBarBody>
            <MessageBarActions>
                <Button onClick={onInstallNow}>Install now</Button>
            </MessageBarActions>
        </MessageBar>
    );
}
```

Test wiring `WIRING-2026-05-15-limited-mode-banner.test.tsx`. ROUGE -> implementer integration App.tsx -> VERT.

---

## Etape 9 -- InstallationContext + disable buttons

Creer un context React :
```tsx
// installation-context.tsx
import { createContext, useContext } from "react";

export interface InstallationContextValue {
    canCreate: boolean;
    reason?: string; // "WIT not installed"
}

export const InstallationContext = createContext<InstallationContextValue>({ canCreate: true });

export function useInstallationContext() {
    return useContext(InstallationContext);
}
```

Wrapper dans App.tsx :
```tsx
<InstallationContext.Provider value={{ canCreate: !needsInstall || !userSkipped }}>
    {/* hub-root */}
</InstallationContext.Provider>
```

!! ATTENTION : pour disabled buttons, on ne touche pas les composants riches. On utilise le pattern decorator/wrapper :

Plutot que modifier `TestPlanForm.tsx`, on peut envelopper son rendu dans App.tsx avec un overlay disabled. OU on injecte le state via les services props.

**Approche recommandee (la plus simple)** :
Dans App.tsx, dans la Views (PlansView, CasesView, etc.) qui utilisent `useServices()` + composants, on ajoute :
```tsx
const { canCreate } = useInstallationContext();
// ...
<TestPlanForm 
    service={testPlanService} 
    project={project} 
    {...(canCreate ? {} : { disabled: true })}  // si le composant supporte disabled
/>
```

Si les composants riches ne supportent pas un prop `disabled`, on a 2 options :
- **Option 1** : Wrapper dans un `<fieldset disabled={!canCreate}>` qui disable tous les inputs/buttons CSS
- **Option 2** : Reporter cette task (Sprint 2.5f) et juste afficher le banner pour ce sprint

**Vote dans le prompt** : Option 1 (fieldset disabled = CSS native, works partout).

```tsx
<fieldset disabled={!canCreate} style={{ border: "none", padding: 0, margin: 0 }}>
    <TestPlanForm service={testPlanService} project={project} />
</fieldset>
```

---

## Etape 10 -- Modifier Specs/tasks.md

DECOCHER T-1.3 sous-taches partiellement faussement marquees DONE.

COCHER apres ce sprint :
- [x] UI du wizard : wired dans App.tsx via InstallationGuard
- [x] Detection au boot via detectInstallState()
- [x] Banner Limited Mode si skip
- [x] Tests wiring (3 fichiers)

Ne PAS cocher :
- [ ] Tests E2E sur instance Cloud reelle (TECH-DEBT-019 reste a faire)

---

## Etape 11 -- Modifier Specs/MIGRATION-PLAN.md

Ajouter section :
```markdown
## First Run Wizard activation (Sprint 2.5e, 2026-05-15)

L'extension Argos 0.5.4 active enfin le wizard d'installation des Custom WIT.
Avant 0.5.4 : SDK process-install.ts present mais jamais invoque -> bug VS402323.
Depuis 0.5.4 : detection au boot + wizard automatique si WIT absents.

Upgrade 0.5.3 -> 0.5.4 :
- ADO demande reauthorization (nouveau scope vso.process_write)
- Au premier lancement post-upgrade, wizard "Get Started" s'affiche si Custom WIT absents
- User peut Skip mais reste en "Limited Mode"
```

---

## Etape 12 -- Modifier CHANGELOG.md section [0.5.4]

Voir contenu detaille en bloc I ci-dessus. Resume :
- Sprint 2.5e : First Run Wizard activation
- CRITICAL bug fix : VS402323 WIT not installed
- T-1.3 partially un-checked + re-checked
- TECH-DEBT-019 partially adressee
- New scope vso.process_write
- Reauthorization required
- TECH-DEBT-038/040 toujours actifs (deferred)
- LECON : tests unitaires != produit fonctionnel

---

## Etape 13 -- Bump 0.5.3 -> 0.5.4

```powershell
node tools\release\bump-fixed-version.cjs 0.5.4

# Verification
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.4

# Test fixed-versioning
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10
```

---

## Etape 14 -- Validation finale

```powershell
node tools\regression\scan-mojibake.cjs
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5
pnpm turbo test --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm preflight

# Verifier les fichiers nouveaux
Test-Path apps\argos-extension\src\hub\views\GetStartedView.tsx
Test-Path apps\argos-extension\src\hub\views\LimitedModeBanner.tsx
Test-Path apps\argos-extension\src\hub\installation-context.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-installation-guard.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-get-started-wizard.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-limited-mode-banner.test.tsx
```

---

## Etape 15 -- Archive + commit + PR

### 15.1 -- Archive
```powershell
$found = @(".\CLAUDE_TASK_sprint-2-5e.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-5e.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-5e.md
}
```

### 15.2 -- Pre-commit ASCII
```powershell
$msg = "feat(hub): Sprint 2.5e activate First Run Wizard + Custom WIT install"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

### 15.3 -- Commit -F

Creer `$env:TEMP\commit-msg-sprint-2-5e.txt` :
```
feat(hub): Sprint 2.5e activate First Run Wizard + Custom WIT install

CRITICAL fix: bug VS402323 (WorkItemTypeNotFoundException) decouvert apres install 0.5.3 sur instance ADO. Cause : SDK process-install present mais jamais invoque.

Changements:
- vss-extension.json : ajout scope vso.process_write (reauthorization requise)
- services.ts : expose processInstallService (createProcessInstallService SDK)
- App.tsx : InstallationGuard wrapper, detect au boot, redirect wizard si necessaire
- NEW views/GetStartedView.tsx : wizard 5 etapes (Welcome / Detection / Choice / Install / Success)
- NEW views/LimitedModeBanner.tsx : banner si user skip install
- NEW installation-context.tsx : context React canCreate pour disable buttons
- fieldset disabled wrappers dans Views (PlansView/CasesView/etc.) pour disable create/save

Tests:
- 3 nouveaux tests wiring WIRING-2026-05-15-installation-guard / get-started-wizard / limited-mode-banner

Decisions actees:
- D61-A : Ajout scope vso.process_write
- D62-B : Detection + choix user (modifier process existant OU creer nouveau)
- D63-B+C : Exploration limitee + banner si skip
- D64-B : Detect + wizard si schema diff (idempotency update)
- D65-A : Sprint monolithique avec commits intermediaires

Refs:
- Specs/spec.md US-6.1
- Specs/tasks.md T-1.3 (un-checked partial + re-checked)
- packages/argos-sdk/src/process-install.ts (SDK existant)
- TECH-DEBT-019 partially adressed (audit E2E reel)

Bump 0.5.3 -> 0.5.4 via tools/release/bump-fixed-version.cjs.

LECON :
- Tests unitaires verts != produit fonctionnel
- T-1.3 etait coche faussement (SDK + tests unitaires sans wiring UI)
- Audit Phase 0-7 du matin a propage la fausse marche
- TECH-DEBT-019 NEW reste critique (E2E reel)

Apres merge:
- Publish 0.5.4 Marketplace
- Test install + wizard sur instance ADO reelle
- Verifier que Create Test Case marche maintenant
```

```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-5e.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-5e.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-5e.txt"

git push -u origin feat/sprint-2-5e-first-run-wizard
```

### 15.4 -- PR

```powershell
$prBody = @'
## Summary

CRITICAL fix : bug VS402323 (WIT not installed) discovered after 0.5.3 install on ADO instance.

Sprint 2.5e activates the existing process-install SDK by wiring it to the extension UI :
- InstallationGuard at App.tsx root detects WIT install state at boot
- GetStartedView wizard (5 steps) auto-shown if not-installed or partial
- LimitedModeBanner if user skips
- Disable Create/Save buttons in limited mode via React Context + fieldset disabled

## Why this is critical

Before 0.5.4 : SDK `process-install.ts` complete in code, tests passing, BUT never invoked by extension UI. Result : Argos 0.5.3 deployed on Marketplace cannot create any work items, returns VS402323 error.

After 0.5.4 : Wizard auto-displays on first launch, guides user through Custom WIT installation.

## Architecture

```
App.tsx
+- ServicesProvider
   +- InstallationGuard (NEW)
      +- if status=not-installed/partial -> redirect GetStartedView
      +- if status=installed + schemaVersion OK -> render hub
      +- if user skipped -> render hub + LimitedModeBanner + disable Create buttons
```

## Tests

- 3 new wiring tests :
  - WIRING-2026-05-15-installation-guard.test.tsx
  - WIRING-2026-05-15-get-started-wizard.test.tsx
  - WIRING-2026-05-15-limited-mode-banner.test.tsx
- All 57 regression tests still passing
- Turbo test --force OK (~352+ tests)

## Manifest change

Added scope `vso.process_write` to enable process API calls. This will require reauthorization when users upgrade 0.4.7/0.5.3 -> 0.5.4. Documented in CHANGELOG + overview.md.

## TECH-DEBT

- TECH-DEBT-019 NEW (E2E real ADO Cloud) : partially addressed by this sprint, but full E2E audit still pending
- TECH-DEBT-038 (CoveragePanel UX empty state) : deferred
- TECH-DEBT-040 (tokenFactory in widget) : deferred
- T-1.3 un-checked partial : audit Phase 0-7 falsely marked DONE based on SDK + unit tests without UI wiring

## Lesson learned

Unit tests passing != working product. This sprint corrects a major architectural omission discovered by REAL marketplace install testing. TECH-DEBT-019 NEW should be highest priority going forward.

## After merge

1. Publish 0.5.4 to Marketplace (tag v0.5.4)
2. Install on test ADO instance
3. Verify wizard appears
4. Run wizard to install Custom WIT
5. Verify Create Test Case actually works
6. Document E2E checklist for future sprints
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-5e.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(hub): Sprint 2.5e activate First Run Wizard + Custom WIT install" `
  --body-file "$env:TEMP\pr-body-sprint-2-5e.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-5e.txt"
```

---

## Etape 16 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-5e-first-run-wizard

pnpm --filter @atconseil/regression-suite test
pnpm preflight

git log --oneline | Select-Object -First 6
```

---

## Criteres de done

- [ ] Branche `feat/sprint-2-5e-first-run-wizard` creee
- [ ] vss-extension.json : scope `vso.process_write` ajoute
- [ ] services.ts : processInstallService expose
- [ ] App.tsx : InstallationGuard wrapper integre
- [ ] views/GetStartedView.tsx : 5-step wizard Fluent UI
- [ ] views/LimitedModeBanner.tsx : banner Fluent UI
- [ ] installation-context.tsx : React Context canCreate
- [ ] Views (Plans/Cases/Sets/Preconditions/Reports/Settings) : fieldset disabled wrappers
- [ ] 3 nouveaux tests wiring WIRING-2026-05-15-*
- [ ] 57 tests regression passing (inchange)
- [ ] Test CFG-2026-05-14-fixed-versioning passe (sanity post-bump)
- [ ] Turbo test --force passing
- [ ] Lint + typecheck + build --force OK
- [ ] Specs/tasks.md : T-1.3 corrige
- [ ] CHANGELOG.md section [0.5.4] complete
- [ ] Specs/MIGRATION-PLAN.md mis a jour
- [ ] 12 packages alignes a 0.5.4
- [ ] 0 mojibake
- [ ] Commit message 100% ASCII
- [ ] Prompt archive
- [ ] Commit + PR ouverte
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "createProcessInstallService bien exporte ? extensionData store OK ? Estimation revisee : XX min."
2. **Apres Etape 3** : "services.ts etend. processInstallService present. Tests OK. Continue Etape 4 ?"
3. **Apres Etape 5** : "InstallationGuard integre dans App.tsx. Test redirect VERT. Continue Etape 6 ?"
4. **Apres Etape 7** : "GetStartedView 5-step wizard implemente. Tests VERT. Continue Etape 8 ?"
5. **Apres Etape 9** : "InstallationContext + disable buttons OK. Continue Etape 10 tasks.md ?"
6. **Apres Etape 13** : "Bump 0.5.4 OK via script. Test fixed-versioning VERT. Continue Etape 14 ?"
7. **Apres Etape 14** : "Validation complete. argos@0.5.4. Pret a commit ?"
8. **Apres Etape 15.4** : "PR ouverte. Apres merge GitHub, lance Etape 16 (post-merge cleanup)."

---

## Apres ca

**MILESTONE FONCTIONNEL** : Argos peut enfin etre teste de bout en bout par un humain.

Sprint Marketplace publish 0.5.4 :
- Tag v0.5.4 + push
- Workflow auto-trigger
- Install 0.5.4 sur instance ADO
- !! Reauthorization sera demandee (nouveau scope)
- Wizard "Get Started" doit s'afficher
- Cliquer "Get Started" -> choisir Agile -> Install -> success
- Verifier : Create Test Case fonctionne maintenant

Apres validation manuelle :
- Sprint 2.5f : Refactor App.tsx + CoveragePanel UX (ancien 2.5e)
- Sprint 2.5g+ : UI Polish iteratif (D59-B, Fluent UI 2 strict)

Bon sprint !
