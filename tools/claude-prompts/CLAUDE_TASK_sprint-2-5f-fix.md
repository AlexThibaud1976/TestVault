# Prompt Claude Code -- Sprint 2.5f-fix Manifest revert + Wizard adapter (`feat/sprint-2-5f-fix-wizard-detection-only`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **quick fix Marketplace + pivot architectural wizard** (~45 min).
> CRITIQUE : argos@0.5.4 publish Marketplace ECHEC. Pivot architectural detecte.

---

## Contexte critique

**Decouverte 2026-05-15 (apres-midi)** : Sprint 2.5e a publie 0.5.4 avec scope `vso.process_write`. La CI Marketplace publish a echoue avec :
```
Scope is not valid. Cannot mix uri based and modern scopes: 'vso.process_write'
```

Investigation web : le scope `vso.process_write` N'EXISTE PAS dans la liste officielle Microsoft des scopes d'extension ADO. Confirmation par documentation officielle :
- https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest
- Scopes valides : vso.work / vso.code / vso.test / vso.profile / vso.extension / vso.gallery / vso.notification / vso.packaging / vso.release
- AUCUN scope vso.process_*

**Conclusion architecturale CRITIQUE** :

> Microsoft ne permet PAS aux extensions ADO d'appeler la Process API.
> Process API necessite OAuth user-context complet (admin avec PAT), pas accessible aux extensions sandbox.

Implication : le SDK `process-install.ts` ne pourra JAMAIS etre invoque depuis l'extension. La strategie "extension installe Custom WIT auto" est IMPOSSIBLE par design Microsoft.

PIVOT architectural :
- Extension fait : DETECT + GUIDE + REDIRECT vers installer externe
- Installer externe = argos-cli (D66-A acte 2026-05-15)
- Sprint 2.6 (futur) etendra argos-cli avec command `install`

Ce sprint Sprint 2.5f-fix repare le manifest + adapte le wizard pour pivot architectural.

Refs :
- Sprint 2.5e merge (Argos 0.5.4, manifest broken)
- TECH-DEBT-041 NEW : architecture Process API non accessible
- D66-A : argos-cli devient installer officiel
- D67-A : bump 0.5.4 -> 0.5.5 propre
- D68-C : garder Sprint 2.5e merge, fix immediat + planning Sprint 2.6

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR Sprint 2.5e (#XX) merge -> argos@0.5.4 sur main
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 60 passing
- [ ] `pnpm preflight` -> PASSED (argos@0.5.4)
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] argos@0.5.3 toujours sur Marketplace (0.5.4 publish a echoue)

---

## Decisions actees (2026-05-15 apres-midi)

| # | Element | Choix |
|---|---|---|
| D66 | Strategie install Custom WIT | A -- argos-cli devient installer officiel |
| D67 | Version bump strategy | A -- Bump 0.5.4 -> 0.5.5 propre |
| D68 | Sprint 2.5e rollback ? | C -- Garder + fix immediat + planning Sprint 2.6 |

---

## Architecture cible apres Sprint 2.5f-fix

```
App.tsx racine
+- ServicesProvider
   +- InstallationGuard (existant, INCHANGE)
      +- Use wit-schema-reader.isArgosInstalled() (NOT process-install)
      +- Si pas installe -> GetStartedView mode "detection + guide manuel"
      +- Si installe -> hub normal
   +- LimitedModeBanner (existant, INCHANGE)

GetStartedView (ADAPTE) :
  Etape 1 : Welcome (INCHANGE)
  Etape 2 : Detection (ADAPTE, use schema-reader)
  Etape 3 : InstallGuide (NEW, remplace Choice/Install/Success)
    -> instructions argos-cli
    -> instructions manuel portal ADO
    -> bouton "I've installed, refresh detection"
```

---

## Composition exacte du sprint

### A. Modifier `apps/argos-extension/vss-extension.json` (CRITIQUE)

RETIRER `vso.process_write` (cause echec Marketplace) :
```json
"scopes": [
    "vso.work_full",
    "vso.profile",
    "vso.code",
    "vso.extension.data_write",
    "vso.identity"
]
```

NOTE : laisse les scopes existants tels quels. Juste retirer la ligne `vso.process_write`.

### B. Modifier `apps/argos-extension/src/hub/services.ts`

RETIRER processInstallService de buildServices() puisque non utilisable.

OPTION : on peut LAISSER l'import du SDK (sera utile pour argos-cli plus tard) mais ne pas l'instancier dans buildServices.

Plus simple : remove import + l'entry processInstallService de Services interface.

**Decision** : remove de services.ts. Le SDK process-install.ts reste dans packages/argos-sdk pour utilisation future (argos-cli Sprint 2.6).

### C. Adapter `apps/argos-extension/src/hub/views/GetStartedView.tsx`

Remplacer les steps "choice / install / success" par UN SEUL step "installGuide" :

```tsx
import { useState } from "react";
import { 
    Button, MessageBar, MessageBarBody, Text, Card, CardHeader 
} from "@fluentui/react-components";

type Step = "welcome" | "detection" | "installGuide";

export interface GetStartedViewProps {
    isInstalled: boolean;  // depuis wit-schema-reader.isArgosInstalled()
    orgUrl: string;
    projectName: string;
    onRefreshDetection: () => Promise<void>;
    onSkip: () => void;
}

export function GetStartedView({ 
    isInstalled, orgUrl, projectName, onRefreshDetection, onSkip 
}: GetStartedViewProps) {
    const [step, setStep] = useState<Step>("welcome");
    const [refreshing, setRefreshing] = useState(false);
    const [refreshResult, setRefreshResult] = useState<"none" | "still-missing" | "installed">("none");
    
    async function handleRefresh() {
        setRefreshing(true);
        setRefreshResult("none");
        try {
            await onRefreshDetection();
            // Parent re-renders this component with new isInstalled prop
            // If still here, means still not installed
            setRefreshResult("still-missing");
        } finally {
            setRefreshing(false);
        }
    }
    
    return (
        <div data-testid="get-started-view" style={{ padding: 32, maxWidth: 760, margin: "0 auto" }}>
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
                                Before you can create test plans, cases, and runs, Argos requires its custom work item 
                                types to be installed in your Azure DevOps process. This is a one-time admin operation.
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
                    <Card>
                        <CardHeader>
                            <Text size={400} weight="semibold">Installation status</Text>
                        </CardHeader>
                        <div style={{ padding: 16 }}>
                            {isInstalled ? (
                                <MessageBar intent="success">
                                    <MessageBarBody>
                                        Argos custom work item types are installed in this project. You're all set!
                                    </MessageBarBody>
                                </MessageBar>
                            ) : (
                                <>
                                    <MessageBar intent="warning">
                                        <MessageBarBody>
                                            Argos custom work item types are NOT installed in project "{projectName}".
                                        </MessageBarBody>
                                    </MessageBar>
                                    <Text block style={{ marginTop: 16 }}>
                                        To install them, your Azure DevOps administrator needs to run the Argos CLI 
                                        with a Personal Access Token (PAT). See next step for instructions.
                                    </Text>
                                </>
                            )}
                            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                                {!isInstalled && (
                                    <Button appearance="primary" onClick={() => setStep("installGuide")}>
                                        Show install instructions
                                    </Button>
                                )}
                                {isInstalled && (
                                    <Button appearance="primary" onClick={onSkip}>
                                        Go to dashboard
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            
            {step === "installGuide" && (
                <div data-testid="wizard-step-install-guide">
                    <Card>
                        <CardHeader>
                            <Text size={400} weight="semibold">Install Argos schema</Text>
                        </CardHeader>
                        <div style={{ padding: 16 }}>
                            <Text block weight="semibold" style={{ marginBottom: 8 }}>
                                Option 1 (recommended): Use Argos CLI
                            </Text>
                            <Text block style={{ marginBottom: 8 }}>
                                Run this command in a terminal with Node.js installed:
                            </Text>
                            <pre data-testid="cli-command" style={{ 
                                background: "#f3f2f1", padding: 12, borderRadius: 4, 
                                fontSize: 13, overflowX: "auto"
                            }}>
                                npx @atconseil/argos-cli install --org {orgUrl} --project "{projectName}"
                            </pre>
                            <Text block style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                                You'll be prompted for an Azure DevOps Personal Access Token with 
                                "Process (Read &amp; manage)" scope. <a href="https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate" target="_blank">PAT documentation</a>.
                            </Text>
                            
                            <Text block weight="semibold" style={{ marginTop: 20, marginBottom: 8 }}>
                                Option 2: Manual install via Azure DevOps portal
                            </Text>
                            <Text block style={{ marginBottom: 8 }}>
                                Follow the manual install guide in the Argos documentation:
                            </Text>
                            <Text block>
                                <a href="https://github.com/AlexThibaud1976/TestVault/blob/main/docs/install-manual.md" target="_blank">
                                    Manual installation guide
                                </a>
                            </Text>
                            
                            <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                                <Button 
                                    appearance="primary" 
                                    disabled={refreshing}
                                    onClick={handleRefresh}
                                >
                                    {refreshing ? "Checking..." : "I've installed, refresh detection"}
                                </Button>
                                <Button onClick={onSkip}>Skip for now</Button>
                            </div>
                            
                            {refreshResult === "still-missing" && (
                                <MessageBar intent="warning" style={{ marginTop: 12 }}>
                                    <MessageBarBody>
                                        Argos schema still not detected. Make sure the CLI install completed successfully.
                                    </MessageBarBody>
                                </MessageBar>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
```

### D. Adapter `apps/argos-extension/src/hub/App.tsx`

InstallationGuard doit utiliser `wit-schema-reader.isArgosInstalled()` au lieu de `processInstallService.detectInstallState()`.

```tsx
import { createArgosSchemaReader } from "@atconseil/argos-detection-api";

function ServicesAwareApp() {
    const services = useServices();
    const { connectivityService, project, baseUrl } = services;
    
    const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
    const [userSkipped, setUserSkipped] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    
    // Build schema reader from existing IAdoWorkItemClient
    const schemaReader = useMemo(() => createArgosSchemaReader(/* ado client */), []);
    
    const refreshDetection = useCallback(async () => {
        const installed = await schemaReader.isArgosInstalled(baseUrl, project.name);
        setIsInstalled(installed);
        return installed;
    }, [schemaReader, baseUrl, project.name]);
    
    useEffect(() => {
        refreshDetection().catch(err => console.error("Detection failed", err));
    }, [refreshDetection]);
    
    if (isInstalled === null) {
        return <Spinner label="Checking Argos installation..." />;
    }
    
    if (!isInstalled && !userSkipped && !showWizard) {
        return (
            <GetStartedView 
                isInstalled={isInstalled}
                orgUrl={baseUrl}
                projectName={project.name}
                onRefreshDetection={refreshDetection}
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
            {!isInstalled && userSkipped && (
                <LimitedModeBanner onInstallNow={() => setShowWizard(true)} />
            )}
            <InstallationContext.Provider value={{ canCreate: isInstalled }}>
                {/* hub-root */}
            </InstallationContext.Provider>
        </>
    );
}
```

NOTE : si l'integration avec IAdoWorkItemClient est complexe, simplifier en utilisant directement un fetch sur l'API list WIT types du PROJET (pas du process) :

```typescript
async function isArgosInstalled(orgUrl: string, projectName: string, getAuth: () => Promise<string>): Promise<boolean> {
    const url = `${orgUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitemtypes?api-version=7.1`;
    const res = await fetch(url, {
        headers: { Authorization: await getAuth(), Accept: "application/json" }
    });
    if (!res.ok) return false;
    const { value } = await res.json() as { value: Array<{ referenceName: string }> };
    return value.some(t => t.referenceName === "TestVault.TestCase");
}
```

Cette approche est plus simple et utilise vso.work scope (deja dans manifest).

### E. Adapter `apps/argos-extension/src/hub/wiring/WIRING-2026-05-15-get-started-wizard.test.tsx`

Adapter les tests :
- Remplacer "choice/install/success" steps par "installGuide" step
- Tester rendu Detection avec isInstalled prop
- Tester rendu InstallGuide avec orgUrl + projectName
- Tester refresh button
- Tester skip button

### F. Adapter `apps/argos-extension/src/hub/wiring/WIRING-2026-05-15-installation-guard.test.tsx`

Adapter tests pour utiliser isInstalled boolean au lieu de ProcessInstallState.

### G. Modifier `Specs/tasks.md`

DECOCHER T-1.3 entierement (architecture pivot, l'install n'est plus dans l'extension) :

```markdown
### T-1.3 -- Wizard d'installation du Custom Process [PIVOT 2026-05-15]

> ARCHITECTURE PIVOT : Microsoft ne permet pas aux extensions d'appeler Process API.
> Install Custom WIT delegue a argos-cli (D66-A). Voir Sprint 2.6.

- [ ] UI du wizard (DEFERRED to argos-cli Sprint 2.6)
- [ ] Installation API calls (DEFERRED to argos-cli Sprint 2.6)
- [x] Detection idempotente (use wit-schema-reader, Sprint 2.5e+2.5f)
- [ ] Tests E2E sur instance Cloud (TECH-DEBT-019 still active)

Le wizard "Get Started" reste mais en mode "Detection + Guide install via CLI" 
(Sprint 2.5e + Sprint 2.5f-fix).
```

### H. CHANGELOG.md section [0.5.5]

```markdown
## [0.5.5] - 2026-05-15

### Fixed

**Sprint 2.5f-fix -- Manifest revert + Wizard pivot architectural** :

- **CRITIQUE** : retire scope `vso.process_write` du manifest (cause echec Marketplace 0.5.4)
- **DECOUVERTE** : Microsoft ne permet pas aux extensions ADO d'appeler Process API
  - Confirmation par docs officielles + erreur Marketplace "Cannot mix uri based and modern scopes"
  - Process API necessite OAuth user-context complet (admin avec PAT)
  - Pas accessible via accessTokenFactory de l'extension sandbox

### Changed

- **GetStartedView** : adapte pour mode "Detection + Install Guide"
  - Steps : Welcome / Detection / InstallGuide (3 steps au lieu de 5)
  - Detection : utilise wit-schema-reader.isArgosInstalled() (scope vso.work, fonctionne)
  - InstallGuide : affiche commande `npx @atconseil/argos-cli install` + manuel portal
  - Plus de "auto-install depuis extension" (impossible par design Microsoft)
- **App.tsx InstallationGuard** : utilise schema reader au lieu de process-install service
- **services.ts** : retire processInstallService (non utilisable depuis extension)
- **process-install.ts** SDK : preserve pour utilisation future par argos-cli

### TECH-DEBT noted

- **TECH-DEBT-041 NEW** : Architecture Process API documentation
  - Documenter dans constitution.md que extensions ADO ne peuvent appeler Process API
  - Eviter futurs developpeurs de tomber dans le meme piege
- **TECH-DEBT-019** (E2E reel) reste critique
- **TECH-DEBT-042 NEW** : argos-cli installer command (Sprint 2.6)

### Lessons learned

- Le contrat reel avec Marketplace n'a JAMAIS ete teste avant 0.5.3
- vso.process_write etait suppose valide sans verification doc officielle
- Sprint 2.5e a coute ~2h30 sur architecture impossible
- LECON : verifier scopes valides AVANT de coder dependances
- LECON : tests unitaires + builds verts != produit fonctionnel + Marketplace valide

### Architecture pivot 2026-05-15

Sprint 2.5e architecture (avant) :
  Extension UI -> processInstallService -> Process API (REJECTED Microsoft)

Sprint 2.5f-fix architecture (apres) :
  Extension UI -> detection seulement (wit-schema-reader, scope vso.work OK)
  Install Custom WIT delegate a argos-cli (Sprint 2.6) ou portal admin manuel
```

### I. Modifier `Specs/MIGRATION-PLAN.md`

Ajouter section :
```markdown
> **Sprint 2.5f-fix 2026-05-15** : Pivot architectural
> 
> Decouverte : Process API non accessible aux extensions ADO.
> Solution : argos-cli devient installer officiel.
> Extension fait detection + guide.
> 
> argos@0.5.4 (Marketplace publish FAILED) remplace par 0.5.5.
> TECH-DEBT-041 NEW + TECH-DEBT-042 NEW.
```

### J. Constitution.md (NEW section)

Ajouter section explicite pour eviter futures erreurs :

```markdown
## Section X.X -- Architecture extension vs Process API

L'extension Argos NE PEUT PAS appeler la Process API d'Azure DevOps.
Verifications faites 2026-05-15 :
- Liste officielle scopes extension : aucun vso.process_*
- Test Marketplace 0.5.4 : echec "Cannot mix uri based and modern scopes"
- Doc Microsoft : Process API necessite OAuth user-context complet

CONSEQUENCE :
- Toute installation/modification de Custom WIT, fields, states, etc. doit etre delegue a un installer externe
- argos-cli est l'installer officiel (D66-A 2026-05-15)
- L'extension fait : detection (via wit-schema-reader) + guidance (UI)
- L'extension ne fait PAS : install, modify process, modify WIT schema

NE PAS RE-INTRODUIRE :
- Scope vso.process_write (n'existe pas)
- Appel direct a /work/processes API depuis l'extension
```

### K. Bump version 0.5.4 -> 0.5.5

```powershell
node tools\release\bump-fixed-version.cjs 0.5.5
```

---

## Garde-fous

### GF1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### GF2 : NE PAS modifier process-install.ts
Le SDK reste intact. Sera utilise par argos-cli Sprint 2.6.

### GF3 : NE PAS supprimer GetStartedView
Le composant existe, on l'adapte (pas de full delete).

### GF4 : NE PAS supprimer InstallationGuard
Le wrapper reste, on change juste la logique de detection.

### GF5 : NE PAS supprimer LimitedModeBanner + InstallationContext
Pattern reste valable.

### GF6 : Test CFG-2026-05-14-fixed-versioning DOIT passer

### GF7 : Test marketplace-public DOIT passer
Pas de re-introduction galleryFlags Private (lecon 0.5.3).

### GF8 : Composants riches INTOUCHABLES
Pas de modif TestPlanForm/TestCaseForm/etc.

### GF9 : Fluent UI 2 strict (D60-A)

### GF10 : Verification manuelle pre-publish
Apres bump et avant tag, lire le manifest pour CONFIRMER absence vso.process_write.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-5f-fix-wizard-detection-only

pnpm --filter @atconseil/regression-suite test
# 60 passing baseline
```

---

## Etape 1 -- Snapshot pre-edit

```powershell
# Lire le manifest actuel
Get-Content apps\argos-extension\vss-extension.json -Encoding UTF8 | Select-String "vso.process"
# Attendu : ligne "vso.process_write" presente

# Lire GetStartedView actuel
Get-Content apps\argos-extension\src\hub\views\GetStartedView.tsx -Encoding UTF8 -TotalCount 30

# Lire services.ts processInstallService
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8 | Select-String "processInstall"

# Lire App.tsx InstallationGuard
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8 | Select-String -Context 2,2 "InstallationGuard|processInstall|detectInstallState"

# Verifier argos-detection-api exports
Get-Content packages\argos-detection-api\src\index.ts -Encoding UTF8

# Verifier argos-cli package name
Get-Content packages\argos-cli\package.json -Encoding UTF8 | Select-String "name|version"
```

Rapporter a l'utilisateur :
- Confirmer vso.process_write present dans manifest actuel (a retirer)
- Architecture GetStartedView actuelle (5 steps)
- Use de processInstallService dans services.ts + App.tsx
- argos-detection-api exporte bien isArgosInstalled
- argos-cli nom de package npm (pour la commande dans wizard)
- Estimation revisee du sprint

---

## Etape 2 -- Retirer vso.process_write du manifest

Edit `apps/argos-extension/vss-extension.json` : retirer la ligne `vso.process_write`.

Verifier :
```powershell
Get-Content apps\argos-extension\vss-extension.json -Encoding UTF8 | Select-String "vso.process"
# Attendu : aucune ligne (vide)

Get-Content apps\argos-extension\vss-extension.json -Encoding UTF8 | Select-String "scopes" -Context 0,8
# Voir la liste de scopes sans vso.process_write
```

---

## Etape 3 -- Retirer processInstallService de services.ts

Edit `apps/argos-extension/src/hub/services.ts` :
- Retirer import `createProcessInstallService, IProcessInstallService` du SDK
- Retirer `processInstallService: IProcessInstallService` de Services interface
- Retirer `processInstallService = createProcessInstallService(...)` dans buildServices()
- Retirer `processInstallService` du return de buildServices()

Verifier :
```powershell
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8 | Select-String "processInstall"
# Attendu : aucune ligne
```

Tests services.test.ts (s'il existe) doivent passer.

---

## Etape 4 -- Adapter App.tsx InstallationGuard

Voir bloc D ci-dessus. Adapter pour utiliser detection schema-reader au lieu de processInstall.

OPTION SIMPLE recommandee : helper function `isArgosInstalled(orgUrl, projectName, getAuth)` definie inline dans App.tsx ou un fichier separe, utilisant vso.work scope.

```typescript
async function checkArgosInstalled(
    orgUrl: string, 
    projectName: string, 
    getAuthHeader: () => Promise<string>
): Promise<boolean> {
    const url = `${orgUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitemtypes?api-version=7.1`;
    try {
        const res = await fetch(url, {
            headers: { 
                Authorization: await getAuthHeader(), 
                Accept: "application/json" 
            }
        });
        if (!res.ok) return false;
        const data = await res.json() as { value: Array<{ referenceName: string }> };
        return data.value.some(t => t.referenceName === "TestVault.TestCase");
    } catch {
        return false;
    }
}
```

Use cette fonction dans le useEffect detection.

---

## Etape 5 -- Adapter GetStartedView

Voir bloc C ci-dessus. 3 steps : Welcome / Detection / InstallGuide.

Suppression :
- Step "choice" (BaseProcess radio)
- Step "install" (progress bar)
- Step "success"
- Import `IProcessInstallService, BaseProcessType, InstallProgressStep`

Addition :
- Props `orgUrl, projectName, onRefreshDetection`
- Step "installGuide" avec commande CLI + manuel

---

## Etape 6 -- Adapter tests wiring

Edit `WIRING-2026-05-15-get-started-wizard.test.tsx` :
- Remplacer tests "choice/install/success" par "installGuide"
- Add test "Detection shows success if isInstalled=true"
- Add test "Detection shows warning if isInstalled=false"
- Add test "InstallGuide shows CLI command with orgUrl + projectName"
- Add test "Refresh button calls onRefreshDetection"
- Add test "Skip button calls onSkip"

Edit `WIRING-2026-05-15-installation-guard.test.tsx` :
- Replace mock service detectInstallState by mock fetch isArgosInstalled
- Tests : redirect wizard if not installed, render hub if installed
- Tests : refresh detection after CLI install simulated

Lancer tests : DOIVENT etre VERT.

---

## Etape 7 -- Modifier Specs/tasks.md

Voir bloc G. T-1.3 entierement re-decoche avec pivot note.

---

## Etape 8 -- Modifier CHANGELOG.md, MIGRATION-PLAN.md, constitution.md

Voir blocs H, I, J ci-dessus.

---

## Etape 9 -- Bump 0.5.4 -> 0.5.5

```powershell
node tools\release\bump-fixed-version.cjs 0.5.5

# Verification
$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.5

# Test fixed-versioning
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10
```

---

## Etape 10 -- Validation pre-commit

```powershell
# Verification manuelle CRITIQUE : manifest n'a plus vso.process_write
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
$hasProcessScope = $vss.scopes -contains "vso.process_write"
Write-Host "Has vso.process_write : $hasProcessScope"
# Attendu : False

# Lister tous les scopes
Write-Host "Scopes : $($vss.scopes -join ', ')"
# Attendu : vso.work_full, vso.profile, vso.code, vso.extension.data_write, vso.identity

# Verification version
Write-Host "Version manifest : $($vss.version)"
# Attendu : 0.5.5

# Mojibake
node tools\regression\scan-mojibake.cjs

# Tests
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5
pnpm turbo test --force 2>&1 | Select-Object -Last 15

# Lint + typecheck + build
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5
pnpm turbo build --force 2>&1 | Select-Object -Last 10

# Preflight
pnpm preflight
# Attendu : PASSED argos@0.5.5
```

---

## Etape 11 -- Archive + commit + PR

### 11.1 -- Archive

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-5f-fix.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-5f-fix.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-5f-fix.md
}
```

### 11.2 -- Pre-commit ASCII

```powershell
$msg = "fix(hub): Sprint 2.5f-fix revert vso.process_write + wizard pivot to detection-only"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

### 11.3 -- Commit -F

Creer `$env:TEMP\commit-msg-sprint-2-5f-fix.txt` :

```
fix(hub): Sprint 2.5f-fix revert vso.process_write + wizard pivot to detection-only

CRITIQUE : argos@0.5.4 publish Marketplace ECHEC apres Sprint 2.5e. Investigation : scope vso.process_write n'existe pas dans la liste officielle Microsoft. Process API non accessible aux extensions ADO.

Changements:
- vss-extension.json : retire scope vso.process_write (cause echec Marketplace)
- services.ts : retire processInstallService (non utilisable depuis extension)
- App.tsx InstallationGuard : utilise wit-schema-reader isArgosInstalled (scope vso.work, fonctionne)
- views/GetStartedView.tsx : adapte 5 steps -> 3 steps (Welcome / Detection / InstallGuide)
- Wizard guide vers argos-cli (D66-A) au lieu d'auto-install
- Tests wiring adaptes (2 fichiers)

Architecture pivot:
- AVANT : Extension UI -> processInstallService -> Process API (BLOCKED)
- APRES : Extension UI -> detection seulement
        + Install delegate a argos-cli (Sprint 2.6) ou portal admin manuel

Preserve:
- packages/argos-sdk/process-install.ts (SDK reste pour argos-cli)
- InstallationGuard wrapper
- LimitedModeBanner
- InstallationContext + fieldset disabled pattern

Documentation:
- CHANGELOG [0.5.5] : pivot architectural + lessons learned
- Specs/tasks.md : T-1.3 re-decoche avec note pivot
- Specs/constitution.md : section "Architecture extension vs Process API"
- Specs/MIGRATION-PLAN.md : Sprint 2.5f-fix note

Decisions actees 2026-05-15 apres-midi:
- D66-A : argos-cli devient installer officiel
- D67-A : Bump 0.5.4 -> 0.5.5 propre
- D68-C : Garder Sprint 2.5e + fix + Sprint 2.6 future

TECH-DEBT:
- TECH-DEBT-041 NEW : Architecture Process API documentation (LIVRE ici)
- TECH-DEBT-042 NEW : argos-cli installer command (Sprint 2.6)
- TECH-DEBT-019 (E2E reel) reste critique

LESSON LEARNED:
- Verifier scopes Microsoft AVANT de coder dependances
- Tests unitaires + builds verts != Marketplace valide
- Sprint 2.5e architecture impossible par design Microsoft

Bump 0.5.4 -> 0.5.5 via script.

Refs:
- Sprint 2.5e (Argos 0.5.4 manifest broken)
- Microsoft docs : pas de scope vso.process_*
- Marketplace error 2026-05-15 : "Cannot mix uri based and modern scopes"
```

```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-5f-fix.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-5f-fix.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-5f-fix.txt"

git push -u origin feat/sprint-2-5f-fix-wizard-detection-only
```

### 11.4 -- PR

```powershell
$prBody = @'
## Summary

CRITICAL fix : argos@0.5.4 publish Marketplace ECHEC apres Sprint 2.5e. Investigation revele que `vso.process_write` n'est pas un scope d'extension ADO valide. Pivot architectural : install Custom WIT delegate a argos-cli au lieu d'auto-install depuis extension.

## Pourquoi c'est critique

Sprint 2.5e a ajoute scope `vso.process_write` pour permettre install Custom WIT depuis extension. Marketplace publish a echoue avec :
```
Scope is not valid. Cannot mix uri based and modern scopes: 'vso.process_write'
```

Investigation docs officielles Microsoft : aucun scope `vso.process_*` n'existe. La Process API n'est pas accessible aux extensions ADO (necessite OAuth user-context complet).

## Pivot architectural

Avant : Extension UI -> processInstallService -> Process API (IMPOSSIBLE par design Microsoft)
Apres : Extension UI -> detection seulement (wit-schema-reader, scope vso.work)
        + Install delegate a argos-cli (Sprint 2.6)

## Changements

- vss-extension.json : retire vso.process_write (republish 0.5.5 sera Marketplace-valid)
- services.ts : retire processInstallService (non utilisable)
- App.tsx : InstallationGuard utilise schema-reader (vso.work, OK)
- GetStartedView : 5 steps -> 3 steps (Welcome / Detection / InstallGuide)
- Wizard guide vers `npx @atconseil/argos-cli install` + manuel portal

## Preserve

- SDK process-install.ts (sera utilise par argos-cli)
- InstallationGuard wrapper
- LimitedModeBanner + InstallationContext

## Tests

- Tests wiring adaptes : 60 -> 60 (memes nombres, contenu different)
- Tests regression : 60/60 passing
- Lint + typecheck + build OK

## TECH-DEBT

- TECH-DEBT-041 NEW : Architecture Process API doc (LIVRE)
- TECH-DEBT-042 NEW : argos-cli installer command (Sprint 2.6)

## Apres merge

1. Publish 0.5.5 to Marketplace (tag v0.5.5)
2. Install sur instance ADO
3. Verifier wizard "Detection + Install Guide" mode
4. Tester refresh button apres install manuel argos-cli

## Lesson learned

Verifier scopes Microsoft AVANT de coder. Sprint 2.5e architecture impossible par design.
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-5f-fix.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(hub): Sprint 2.5f-fix revert vso.process_write + wizard pivot to detection-only" `
  --body-file "$env:TEMP\pr-body-sprint-2-5f-fix.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-5f-fix.txt"
```

---

## Etape 12 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-5f-fix-wizard-detection-only

pnpm --filter @atconseil/regression-suite test
pnpm preflight

git log --oneline | Select-Object -First 6
```

---

## Criteres de done

- [ ] Branche `feat/sprint-2-5f-fix-wizard-detection-only` creee
- [ ] vss-extension.json : scope vso.process_write RETIRE
- [ ] services.ts : processInstallService RETIRE
- [ ] App.tsx : InstallationGuard utilise schema-reader (vso.work)
- [ ] GetStartedView : 3 steps (Welcome/Detection/InstallGuide)
- [ ] Tests wiring adaptes (2 fichiers)
- [ ] 60 tests regression passing
- [ ] Test CFG-2026-05-14-fixed-versioning passe
- [ ] Test marketplace-public passe
- [ ] Turbo test --force passing
- [ ] Lint + typecheck + build OK
- [ ] Specs/tasks.md : T-1.3 re-decoche avec note pivot
- [ ] CHANGELOG.md section [0.5.5] complete
- [ ] Specs/MIGRATION-PLAN.md mis a jour
- [ ] Specs/constitution.md section "Process API architecture" ajoutee
- [ ] 12 packages alignes 0.5.5 + vss-extension.json
- [ ] 0 mojibake
- [ ] Commit message 100% ASCII
- [ ] Manifest CONFIRMED sans vso.process_write
- [ ] Prompt archive
- [ ] Commit + PR ouverte
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot pre-edit OK. Manifest a vso.process_write confirme. GetStartedView 5 steps confirme. argos-cli npm name : @atconseil/argos-cli. Estimation revisee : XX min."
2. **Apres Etape 4** : "App.tsx InstallationGuard utilise schema-reader. Tests redirect OK. Continue Etape 5 ?"
3. **Apres Etape 5** : "GetStartedView 3 steps. Tests adaptes. Continue Etape 6 ?"
4. **Apres Etape 9** : "Bump 0.5.5 OK. Test fixed-versioning VERT. Continue Etape 10 validation ?"
5. **Apres Etape 10** : "Validation complete. Manifest sans vso.process_write CONFIRME. argos@0.5.5. Pret a commit ?"
6. **Apres Etape 11.4** : "PR ouverte. Apres merge GitHub, lance Etape 12 (post-merge cleanup)."

---

## Apres ca

1. Publish Marketplace 0.5.5 :
   - Tag v0.5.5 + push
   - CI publish-marketplace.yml trigger
   - Verification : pas d'erreur "uri based and modern scopes"
   
2. Install sur instance ADO :
   - ADO demande reauthorization (scope vso.process_write retire = approval change)
   - Note : c'est OK car beta privee

3. Test wizard new mode :
   - Au lancement : detection -> "Argos non installe"
   - Bouton "Show install instructions"
   - Voir commande `npx @atconseil/argos-cli install --org X --project Y`
   - Tester "I've installed, refresh detection" -> doit re-check

4. Sprint 2.6 planning (cerveau frais) :
   - Etendre argos-cli avec command `install`
   - Utilise process-install.ts SDK existant (avec PAT user-context complet)
   - Plus tard : npm publish argos-cli pour que la commande fonctionne reellement

Bon sprint !
