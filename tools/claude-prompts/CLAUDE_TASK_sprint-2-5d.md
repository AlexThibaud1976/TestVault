# Prompt Claude Code -- Sprint 2.5d Wiring Phase 5+6+7 + Commercial doc (`feat/sprint-2-5d-phase5-6-7-wiring`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **wiring Phase 5+6+7 + Specs/COMMERCIAL.md** (~85 min).
> 8 composants UI riches a integrer + brouillon commercial layer (TECH-DEBT-018 NEW).
> **DERNIER sprint de wiring** -- apres Sprint 2.5d, tous les 24 composants riches sont wirees.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR Sprint 2.5c (#58) merge
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm preflight` -> PASSED (argos@0.5.2)
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] argos@0.5.2 partout (12 packages alignes)
- [ ] `tools/release/bump-fixed-version.cjs` EXISTS (cree Sprint 2.5c)

Si l'un echoue -> STOP.

---

## Contexte

Sprint 2.5b + 2.5c ont wirees 11 composants Phase 2/3/4 dans App.tsx. Sprint 2.5d est le DERNIER sprint de wiring : 8 composants Phase 5+6+7 + utility OfflineBanner.

Investigation 2026-05-15 confirme :
- Tous les services hub-local existent (`repo-mapping-service.ts`, `audit-log-service.ts`, `beta-flag-service.ts`, `offline-service.ts`)
- Pattern de mock test eprouve (factory `makeService()` avec `vi.fn().mockResolvedValue()`)
- AiCandidatesModal + GherkinEditor sont controlled components
- QuotaSettings + FlakinessReport ont des services dependant de argos-functions (NON DEPLOYE -> Cloud-Plus stub)

**Composants a wirer ce sprint** :

Group A -- Wiring direct (6 composants)
- OfflineBanner (T-7.3) -- wrapper global App.tsx
- GherkinEditor (T-5.1) -- CasesView tab "Gherkin" + persistance TestCaseService
- AiCandidatesModal (T-6.6) -- CasesView bouton header "AI Suggest" -> Dialog
- AuditLogSettings (T-6.4) -- SettingsView section "Audit Log"
- RepoMappingSettings (T-5.3) -- SettingsView section "Repo Mappings"
- BetaOptIn (T-6.x) -- SettingsView section "Beta Features"

Group B -- Cloud-Plus stub wrapper (2 composants)
- QuotaSettings (T-6.7) -- SettingsView section "Quotas" + check Cloud-Plus
- FlakinessReport (T-6.9) -- ReportsView tab "Flakiness" + check Cloud-Plus

**Documents additionnels** :
- `Specs/COMMERCIAL.md` NEW -- brouillon strategie commerciale (TECH-DEBT-018)
- `Specs/MIGRATION-PLAN.md` -- note Sprint 2.5d livre
- `CHANGELOG.md` -- section [0.5.3]

---

## Decisions actees (2026-05-15, validees par utilisateur)

| # | Element | Choix |
|---|---|---|
| D27 | Commercial layer timing | C -- Apres TECH-DEBT-017 (Azure deploy) |
| D28 | Format Specs/COMMERCIAL.md | C -- Brouillon dans ce sprint |
| D29 | TECH-DEBT-018 ouverture | Oui, prochain commit (= ce sprint) |
| D30 | FlakinessReport backend down | C -- Wrapper Cloud-Plus check explicit |
| D31 | QuotaSettings backend down | A -- Wrapper Cloud-Plus check explicit |
| D32 | OfflineBanner wrapper | A -- App.tsx racine global |
| D33 | AiCandidatesModal access | A -- Bouton header CasesView -> Dialog |
| D34 | Specs/COMMERCIAL.md dans 2.5d | A -- Meme PR/commit |
| D35 | Bump version | A -- 0.5.2 -> 0.5.3 (patch) |
| D36 | Services hub-local manquants | A -- Tous existants, rien a creer |
| D37 | GherkinEditor wiring scope | B -- Wiring complet avec persistance TestCaseService |
| Pricing | Modele commercial | Hybride flat + per active user (Option C user) |
| User actif | Definition | A execute au moins 1 Test Run dans le mois (Option B user) |

---

## Architecture cible apres Sprint 2.5d

```
App.tsx
+- OfflineBanner (wrapper global) [NEW Sprint 2.5d, D32]
   +- Hub Section Resolver
      +- PlansView (TabList) [Sprint 2.5a/b/c, INCHANGE]
      +- CasesView (TabList + header) [EXTENSION Sprint 2.5d]
      |  +- Header bouton "AI Suggest" -> AiCandidatesModal Dialog [NEW]
      |  +- Tab "Case Details" (TestCaseForm) [Sprint 2.5a]
      |  +- Tab "Executions" (ExecutionHistory) [Sprint 2.5b]
      |  +- Tab "Traceability" (WorkItemLinkPanel) [Sprint 2.5c]
      |  +- Tab "Gherkin" (GherkinEditor + persistance TestCase) [NEW]
      +- SetsView (TestSetForm) [Sprint 2.5a, INCHANGE]
      +- PreconditionsView (PreconditionForm) [Sprint 2.5a, INCHANGE]
      +- ReportsView (TabList) [EXTENSION Sprint 2.5d]
      |  +- Tab "Coverage" (CoverageMatrix) [Sprint 2.5c]
      |  +- Tab "Flakiness" (FlakinessReport + Cloud-Plus stub) [NEW REPLACE PLACEHOLDER]
      +- SettingsView (sections empilees) [EXTENSION Sprint 2.5d]
         +- Section "LLM Provider" [Sprint 2.5a]
         +- Section "Environments" [Sprint 2.5b]
         +- Section "Webhooks" [Sprint 2.5c]
         +- Section "Audit Log" [NEW]
         +- Section "Repo Mappings" [NEW]
         +- Section "Quotas" (Cloud-Plus stub) [NEW]
         +- Section "Beta Features" [NEW]
```

**Total apres Sprint 2.5d** : 24 composants riches wirees, 4 vues principales avec navigation complete, 1 wrapper offline global.

---

## Composition exacte du sprint

### A. Modifier `apps/argos-extension/src/hub/App.tsx`

1. Imports des 8 composants Phase 5+6+7
2. App.tsx racine : envelopper avec OfflineBanner wrapper (D32-A)
3. CasesView : 
   - Header bouton "AI Suggest" -> Dialog AiCandidatesModal (D33-A)
   - Nouvelle tab "Gherkin" (D37-B, persistance via TestCaseService)
4. ReportsView : remplacer tab "Flakiness placeholder" par FlakinessReport reel (D30-C, Cloud-Plus stub)
5. SettingsView : ajouter 4 nouvelles sections (Audit Log, Repo Mappings, Quotas, Beta Features)
6. Wirer les services correspondants via `useServices()` ou state local

### B. Modifier `apps/argos-extension/src/hub/services.ts`

Ajouter les services hub-local manquants dans `Services` interface et `buildServices()` :
- `auditLogService: IAuditLogService`
- `repoMappingService: IRepoMappingService`
- `betaFlagService: IBetaFlagService`
- `quotaSettingsService: IQuotaSettingsService` (STUB Cloud-Plus)
- `flakinessReportService: IFlakinessReportService` (STUB Cloud-Plus)
- `connectivityService: IConnectivityService` (from `offline-service.ts`)

Pour les services hub-local existants : utiliser leurs `create*` functions deja definis.

Pour les services Cloud-Plus : creer stubs comme `webhookAdminServiceStub` (pattern Sprint 2.5c) :
```typescript
const quotaSettingsServiceStub: IQuotaSettingsService = {
    getConfig: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
    setConfig: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
};

const flakinessReportServiceStub: IFlakinessReportService = {
    getReport: () => Promise.resolve([]),
    markKnownFlaky: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
};
```

### C. Creer 4 fichiers tests wiring

- `WIRING-2026-05-15-app-offline.test.tsx` (OfflineBanner global)
- `WIRING-2026-05-15-cases-gherkin-ai.test.tsx` (GherkinEditor + AiCandidatesModal)
- `WIRING-2026-05-15-settings-audit-repo-beta-quota.test.tsx` (4 settings sections)
- `WIRING-2026-05-15-reports-flakiness.test.tsx` (FlakinessReport + Cloud-Plus behavior)

### D. Creer `Specs/COMMERCIAL.md` NEW

Brouillon strategie commerciale. Voir Etape 11.

### E. Modifier `Specs/tasks.md`

Cocher sous-taches wiring Phase 5+6+7.

### F. Modifier `Specs/MIGRATION-PLAN.md`

Note Sprint 2.5d livre + ouverture TECH-DEBT-018.

### G. Modifier `CHANGELOG.md`

Section [0.5.3] complete avec TECH-DEBT-018 NEW + Milestone.

### H. Bump version 0.5.2 -> 0.5.3 via script

```powershell
node tools\release\bump-fixed-version.cjs 0.5.3
```

---

## Garde-fous

### Garde-fou 1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou 2 : Pas de creation de service hub-local
Tous les services hub-local existent. NE PAS recreer. Juste importer et exposer dans services.ts.

### Garde-fou 3 : Pattern stub Cloud-Plus reutiliser webhookAdminServiceStub
Pour QuotaSettings + FlakinessReport, reutiliser EXACTEMENT le pattern `webhookAdminServiceStub` Sprint 2.5c. Message : "Azure Functions not deployed (TECH-DEBT-017)".

### Garde-fou 4 : OfflineBanner wrapper TOUT le hub
OfflineBanner doit envelopper App.tsx au plus haut niveau (avant resolveSection / avant les Views). Si offline -> banniere visible sur n'importe quel hub.

### Garde-fou 5 : GherkinEditor persistance
D37-B : persistance complete via TestCaseService. Verifier champ WIT `gherkinSpec` existe dans `packages/argos-wit-schema/`. Si MISSING :
- A : Ajouter le champ dans le WIT schema (mini-refactor)
- B : Skip persistance, fallback D37-A state local + note pour Sprint future
- **A preferable** : rapporter d'abord si bloquant.

### Garde-fou 6 : Bump 0.5.2 -> 0.5.3 via script OBLIGATOIRE
NE PAS bumper manuellement les 12 packages (risque oubli Sprint 2.5b).
```powershell
node tools\release\bump-fixed-version.cjs 0.5.3
```

### Garde-fou 7 : Tests
- 57 tests regression doivent rester passing (regression-suite inchange)
- 4 nouveaux tests wiring dans @atconseil/argos-testing
- Total cible : 67+ tests wiring extension (etait 63 apres 2.5c)

### Garde-fou 8 : Test CFG-2026-05-14-fixed-versioning DOIT passer
Apres bump 0.5.3 :
```powershell
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning
```
Si rouge -> investigation immediate.

### Garde-fou 9 : Pas de modification composants riches
NE PAS modifier signature des 8 composants. Wrapper dans App.tsx si necessaire.

### Garde-fou 10 : Pas de modif manifest vss-extension.json (au-dela de la version)
Les 6 hubs ADO restent stables.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-5d-phase5-6-7-wiring

pnpm --filter @atconseil/regression-suite test
# 57 passing -- baseline
```

---

## Etape 1 -- Lecture App.tsx + services + verifier WIT schema Gherkin field

```powershell
# App.tsx (271 lignes selon snapshot)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8

# services.ts complet
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8

# Signatures des 8 composants (premieres 50 lignes chacun)
$composants = @("GherkinEditor", "RepoMappingSettings", "AiCandidatesModal", "AuditLogSettings", "BetaOptIn", "QuotaSettings", "FlakinessReport", "OfflineBanner")
$composants | ForEach-Object {
    Write-Host "`n=== $_.tsx ===" -ForegroundColor Cyan
    Get-Content "apps\argos-extension\src\hub\$_.tsx" -Encoding UTF8 -TotalCount 50
}

# Services hub-local (signatures completes)
$svcLocal = @("repo-mapping-service", "audit-log-service", "beta-flag-service", "offline-service")
$svcLocal | ForEach-Object {
    Write-Host "`n=== $_.ts ===" -ForegroundColor Cyan
    Get-Content "apps\argos-extension\src\hub\$_.ts" -Encoding UTF8 -TotalCount 60
}

# Verifier WIT schema Gherkin field (D37-B)
Write-Host "`n=== WIT schema TestCase fields ===" -ForegroundColor Cyan
Get-ChildItem packages\argos-wit-schema\src\wits\ -Filter "test-case*.ts" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "`n--- $($_.Name) ---" -ForegroundColor Yellow
    Get-Content $_.FullName -Encoding UTF8
}
Select-String -Path packages\argos-wit-schema\src -Pattern "Gherkin|gherkin" -ErrorAction SilentlyContinue
Select-String -Path packages\argos-types\src -Pattern "gherkinSpec|gherkin_spec|GherkinSpec" -ErrorAction SilentlyContinue

# Pattern test wiring Sprint 2.5c (reference)
$lastWiring = Get-ChildItem apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-*.test.tsx -ErrorAction SilentlyContinue | Select-Object -Last 1
if ($lastWiring) {
    Write-Host "`n=== Pattern test wiring (Sprint 2.5c) : $($lastWiring.Name) ===" -ForegroundColor Cyan
    Get-Content $lastWiring.FullName -Encoding UTF8
}
```

Rapporter a l'utilisateur :
- Verification du champ WIT Gherkin : EXISTS ou MISSING
- Si MISSING : strategie A (ajouter au schema) ou B (skip persistance + fallback D37-A)
- Estimation revisee du sprint (85 min initial)
- Confirmation pour Etape 2

---

## Etape 2 -- Etendre `services.ts`

Ajouter dans `Services` interface :
```typescript
import type { IAuditLogService } from "./audit-log-service.js";
import type { IRepoMappingService } from "./repo-mapping-service.js";
import type { IBetaFlagService } from "./beta-flag-service.js";
import type { IConnectivityService } from "./offline-service.js";
import type { IQuotaSettingsService } from "./QuotaSettings.js";
import type { IFlakinessReportService } from "./FlakinessReport.js";

import { createAuditLogService } from "./audit-log-service.js";
import { createRepoMappingService } from "./repo-mapping-service.js";
import { createBetaFlagService } from "./beta-flag-service.js";
import { createConnectivityService } from "./offline-service.js";

export interface Services {
    // ... existants
    auditLogService: IAuditLogService;
    repoMappingService: IRepoMappingService;
    betaFlagService: IBetaFlagService;
    connectivityService: IConnectivityService;
    quotaSettingsService: IQuotaSettingsService;
    flakinessReportService: IFlakinessReportService;
}

export function buildServices(ctx: AdoContext): Services {
    // ... existant
    
    const quotaSettingsServiceStub: IQuotaSettingsService = {
        getConfig: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
        setConfig: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
    };
    
    const flakinessReportServiceStub: IFlakinessReportService = {
        getReport: () => Promise.resolve([]),
        markKnownFlaky: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
    };
    
    return {
        // ... existants
        auditLogService: createAuditLogService(dataClient),
        repoMappingService: createRepoMappingService(dataClient),
        betaFlagService: createBetaFlagService(dataClient),
        connectivityService: createConnectivityService(),
        quotaSettingsService: quotaSettingsServiceStub,
        flakinessReportService: flakinessReportServiceStub,
    };
}
```

ADAPTER selon signatures reelles des `create*` (lecture faite Etape 1).

---

## Etape 3 -- Test wiring OfflineBanner

`WIRING-2026-05-15-app-offline.test.tsx`. Verifier que OfflineBanner s'affiche quand offline (mock `connectivity.isOnline` = false). ROUGE attendu.

---

## Etape 4 -- Modifier App.tsx pour wrapper OfflineBanner

```tsx
import { OfflineBanner } from "./OfflineBanner.js";

// Dans App.tsx, autour du hub-root :
<ServicesProvider>
    <ServicesAwareApp />
</ServicesProvider>

function ServicesAwareApp() {
    const { connectivityService } = useServices();
    return (
        <>
            <OfflineBanner connectivity={connectivityService} />
            {/* existing hub-root */}
        </>
    );
}
```

OfflineBanner doit etre INSIDE ServicesProvider mais BEFORE le hub-root. Lancer : VERT.

---

## Etape 5-6 -- SettingsView avec 4 nouvelles sections

Test wiring `WIRING-2026-05-15-settings-audit-repo-beta-quota.test.tsx`. ROUGE.

Modifier SettingsView pour empiler 4 nouvelles sections apres les 3 existantes (LLM, Environments, Webhooks) :

```tsx
import { AuditLogSettings } from "./AuditLogSettings.js";
import { RepoMappingSettings } from "./RepoMappingSettings.js";
import { BetaOptIn } from "./BetaOptIn.js";
import { QuotaSettings } from "./QuotaSettings.js";

export function SettingsView() {
    const { 
        llmProviderService, environmentConfigService, webhookAdminService,
        auditLogService, repoMappingService, betaFlagService, quotaSettingsService,
        project 
    } = useServices();
    const isAdmin = true; // TODO Sprint future : detecter via ADO permissions
    
    return (
        <div data-testid="view-settings">
            <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
                Settings
            </Text>
            
            {/* sections existantes : LLM, Environments, Webhooks */}
            
            <div style={{ marginBottom: 32 }} data-testid="audit-log-section">
                <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
                    Audit Log
                </Text>
                <AuditLogSettings service={auditLogService} isAdmin={isAdmin} />
            </div>
            
            <div style={{ marginBottom: 32 }} data-testid="repo-mapping-section">
                <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
                    Repo Mappings
                </Text>
                <RepoMappingSettings service={repoMappingService} isAdmin={isAdmin} />
            </div>
            
            <div style={{ marginBottom: 32 }} data-testid="quota-section">
                <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
                    Quotas <span style={{ fontSize: 11, background: "#FFF4CE", color: "#8A6914", padding: "2px 6px", borderRadius: 3 }}>CLOUD-PLUS</span>
                </Text>
                <QuotaSettings service={quotaSettingsService} isAdmin={isAdmin} />
            </div>
            
            <div data-testid="beta-section">
                <Text as="h3" size={400} weight="semibold" block style={{ marginBottom: 8 }}>
                    Beta Features
                </Text>
                <BetaOptIn service={betaFlagService} />
            </div>
        </div>
    );
}
```

Lancer : VERT.

---

## Etape 7-8 -- ReportsView -> FlakinessReport (replace placeholder)

Test wiring `WIRING-2026-05-15-reports-flakiness.test.tsx`. ROUGE.

Modifier ReportsView pour remplacer le placeholder Flakiness par FlakinessReport reel :
```tsx
import { FlakinessReport } from "./FlakinessReport.js";

// Dans ReportsView tab "flakiness" :
{activeTab === "flakiness" && (
    <FlakinessReport service={flakinessReportService} />
)}
```

Le stub retourne `[]`. FlakinessReport doit gerer cet etat empty (probablement deja le cas dans le composant).

Lancer : VERT.

---

## Etape 9-10 -- CasesView : tab Gherkin + bouton AI Suggest

Test wiring `WIRING-2026-05-15-cases-gherkin-ai.test.tsx`. ROUGE.

Modifier CasesView :
```tsx
import { GherkinEditor } from "./GherkinEditor.js";
import { AiCandidatesModal, TcCandidate } from "./AiCandidatesModal.js";
import { Dialog, DialogTrigger, Button } from "@fluentui/react-components";

type CasesTab = "details" | "executions" | "traceability" | "gherkin";

export function CasesView() {
    const { testCaseService, testExecutionService, workItemLinkService, project } = useServices();
    const [activeTab, setActiveTab] = useState<CasesTab>("details");
    const [aiOpen, setAiOpen] = useState(false);
    const [aiCandidates] = useState<TcCandidate[]>([]); // TODO Sprint future : connecter au backend
    const [gherkinValue, setGherkinValue] = useState("");
    
    // Persistance GherkinEditor (D37-B) -- adapter selon champ WIT decouvert Etape 1
    async function handleGherkinChange(value: string) {
        setGherkinValue(value);
        // TODO : debounce ou save explicit selon strategie validee
    }
    
    return (
        <div data-testid="view-cases">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text as="h2" size={500} weight="semibold">Test Cases</Text>
                <Dialog open={aiOpen} onOpenChange={(_, data) => setAiOpen(data.open)}>
                    <DialogTrigger>
                        <Button>AI Suggest</Button>
                    </DialogTrigger>
                    {aiOpen && (
                        <div data-testid="ai-candidates-dialog">
                            <AiCandidatesModal
                                candidates={aiCandidates}
                                quotaRemaining={100}
                                onAccept={() => setAiOpen(false)}
                                onCancel={() => setAiOpen(false)}
                            />
                        </div>
                    )}
                </Dialog>
            </div>
            
            <TabList
                selectedValue={activeTab}
                onTabSelect={(_, data) => setActiveTab(data.value as CasesTab)}
            >
                <Tab value="details">Case Details</Tab>
                <Tab value="executions">Executions</Tab>
                <Tab value="traceability">Traceability</Tab>
                <Tab value="gherkin">Gherkin</Tab>
            </TabList>
            <div style={{ marginTop: 16 }}>
                {/* sections existantes */}
                {activeTab === "gherkin" && (
                    <GherkinEditor value={gherkinValue} onChange={handleGherkinChange} />
                )}
            </div>
        </div>
    );
}
```

Lancer : VERT.

---

## Etape 11 -- Creer `Specs/COMMERCIAL.md` NEW (~150 lignes)

```markdown
# Argos Commercial Layer -- Brouillon (TECH-DEBT-018)

> Auteur : Alexandre Thibaud -- atconseil.info
> Date : 2026-05-15 (brouillon -- finalisation Sprint 7.1)
> Status : DRAFT
> Refs : Specs/spec.md US-7.X, Specs/tasks.md Phase 7, TECH-DEBT-017 (Azure deploy)

---

## Pricing model (Option C -- hybride validee 2026-05-15)

| Tier | Flat price | Active users included | Extra user/month | Features |
|------|-----------|----------------------|------------------|----------|
| **Free** | $0 | 3 | N/A (hard cap) | Base CRUD + Run + Evidence + Reports Coverage (no AI, no Cloud-Plus) |
| **Pro** | $99/month | 10 | $9 | Full features (Snapshots, Traceability, Import/Export, CI integrations) -- no AI, no Cloud-Plus |
| **Team** | $199/month | 25 | $7 | Full Pro + AI BYOK + Cloud-Plus features (Flakiness, Quotas, Webhooks, BDD sync) |
| **Enterprise** | Custom | Unlimited | Custom | SSO + dedicated support + custom SLA + audit/compliance reports |

### Justification du modele

- **Predictibilite revenue** : flat pricing baseline
- **Alignement valeur** : extras factures sur usage reel
- **Tier free genereux** : 3 users actifs pour adoption virale en equipe pilote
- **Differenciation Team via AI** : justifie le delta Pro -> Team
- **Modele GitHub-like** : familier pour le marche developer

## Definition "user actif"

Un **user actif** est un utilisateur qui a **execute au moins 1 Test Run** dans la fenetre du mois calendaire (entre le 1er du mois 00:00 UTC et la fin du mois 23:59 UTC).

### Pourquoi "Test Run" et pas "open extension" ?

- **Aligne valeur** : un Test Run = production reelle de tests, pas juste ouvrir l'extension
- **Anti-fantome** : exclut les comptes inactifs qui ont juste l'extension installee
- **Mesurable** : action discrete trackable (audit log entry)
- **Difficilement gaming** : pas de way de "fake" un Test Run sans valeur reelle

### Cas particuliers a clarifier (Sprint 7.1)

- **CI automation runs** (via argos-action, argos-cli, azure-pipelines-task) : NE comptent PAS comme user actif (action machine != humain)
- **Multi-tenant user** : un user dans 2 tenants different = 2 active users separes (un par tenant)
- **Plafond mensuel** : cap par tier pour eviter pic facturation surprise ($1000/mois max pour Pro ?)

## Architecture technique requise

### Backend `apps/argos-functions` (modules nouveaux a creer)

```
apps/argos-functions/src/
+- users/                          
|  +- user-tracker.ts            -- log activity (Test Run, edit work item)
|  +- active-user-counter.ts     -- compute MAU par tenant (cron mensuel)
|  +- user-roster-handler.ts     -- admin add/remove user d'un tenant
+- billing/                        
|  +- stripe-checkout.ts         -- create Stripe Checkout session
|  +- stripe-customer-portal.ts  -- magic link vers portail Stripe
|  +- usage-reporter.ts          -- report MAU > palier flat a Stripe metered
|  +- invoice-handler.ts         -- recevoir Stripe invoice events
+- tenant/                         
|  +- tenant-config.ts           -- settings tenant (plan, limits, custom rules)
|  +- seat-allocator.ts          -- qui est admin, qui est user, droits
|  +- feature-gates.ts           -- check si feature dispo selon tier
+- notifications/                  
   +- welcome-email.ts           -- onboarding nouveau client
   +- trial-ending.ts            -- T-3 jours fin trial
   +- billing-alert.ts           -- payment failed, limit reached
   +- monthly-summary.ts         -- email recap usage du mois
```

### Extension UI (sections SettingsView nouvelles, Sprint 7.5)

```
apps/argos-extension/src/hub/
+- AccountSettings.tsx             -- plan actuel, usage current, factures recentes
+- UserRoster.tsx                  -- admin : liste users, retirer acces, redefinir roles
+- BillingPortalLink.tsx           -- bouton "Manage billing" -> Stripe portal
+- UsageHistory.tsx                -- graphe MAU sur 12 derniers mois
+- PlanComparison.tsx              -- upgrade flow (Free -> Pro -> Team)
```

### Portail ATConseil (app SEPARE, hors repo Argos)

```
admin.atconseil.io (Next.js / autre stack, non Argos repo)
+- Dashboard MRR / churn / DAU / MAU / signups
+- Liste tenants (search, filter, sort)
+- Logs Stripe / facturation
+- Support tickets viewer
+- Beta privee whitelist management
+- Customer health score
```

## Roadmap (9 sub-sprints, ~25-30h)

### Sprint 7.1 -- Pricing strategy finalisee (~2h)
- Validation interne du modele Option C (deja faite 2026-05-15)
- Edge cases (CI runs, multi-tenant, plafonds) decides
- `Specs/PRICING.md` officiel (cleanup du brouillon COMMERCIAL.md)
- `Specs/spec.md` US-7.X ajoutees

### Sprint 7.2 -- User tracking backend (~3h)
- `user-tracker.ts` (logger Test Run events)
- `active-user-counter.ts` (compute MAU par tenant)
- Storage : Azure Table Storage `tenant_active_users`
- Job cron mensuel reset compteur le 1er

### Sprint 7.3 -- Stripe setup + integration backend (~4h)
- Configurer products/prices Stripe Dashboard
- `stripe-checkout.ts` + `stripe-customer-portal.ts`
- Webhook events handling (deja partiel)
- `usage-reporter.ts` (metered billing delta)

### Sprint 7.4 -- License engine connection a Stripe events (~2h)
- Connecter `license-engine.ts` aux Stripe events
- Mode degrade licence expiree

### Sprint 7.5 -- Admin UI extension (~3h)
- AccountSettings + UserRoster + BillingPortalLink + UsageHistory + PlanComparison
- Wire dans Settings hub

### Sprint 7.6 -- Portail ATConseil (~6-8h, app separe)
- Dashboard admin Next.js
- Connexion Stripe + Azure (read-only views)

### Sprint 7.7 -- Email transactionnel + onboarding flow (~3h)
- Provider : SendGrid / Postmark / Azure Communication Email
- Templates : welcome, trial-ending, billing-alert, monthly-summary

### Sprint 7.8 -- Beta privee (~3h)
- Recrutement 5-10 tenants test
- Onboarding manuel + feedback collection

### Sprint 7.9 -- GA preparation (~2h)
- Pricing page publique
- Documentation utilisateur finale

## Dependances

| Dependance | Bloque | Status actuel |
|------------|--------|---------------|
| TECH-DEBT-017 (Azure deploy) | Sprint 7.2-7.7 | NOT-DONE |
| TECH-DEBT-035 (Marketplace publish) | Beta utilisateurs Sprint 7.8 | NOT-DONE |
| TECH-DEBT-019 NEW (E2E reel) | Beta privee Sprint 7.8 | NOT-DONE |
| Audit Phase 2-6 E2E | Beta privee | NOT-DONE |

## Concurrence (etat 2026-05)

| Outil | Pricing | Modele | Forces | Faiblesses |
|-------|---------|--------|--------|------------|
| Xray Cloud | $10/user/mois | Per seat | Mature, plugin Jira | Per seat strict, pas BYOK AI |
| Tricentis qTest | $30+/user/mois | Per seat enterprise | Enterprise features | Prix eleve |
| ADO Test Plans | Inclus access level "Basic + Test Plans" ($52/user/mois MSFT) | Bundled | Natif ADO | Cher Microsoft |
| TestRail | $37/user/mois | Per seat | UI moderne | Pas natif ADO |
| **Argos** | **$99-199 flat + $7-9/extra active** | **Hybride** | **Natif ADO, BYOK AI, prix flat predictable** | **Beta inconnue** |

Positionnement Argos : entre Xray et Tricentis en prix, native ADO comme MSFT Test Plans mais 10x moins cher, AI BYOK = differenciateur unique pour le marche IA-friendly.

## Open questions (a decider Sprint 7.1)

- [ ] Trial duration : 14 ou 30 jours ?
- [ ] Annual discount : -10% ou -20% si paiement annuel ?
- [ ] Refund policy : 30 jours moneyback ?
- [ ] Multi-currency : USD only ou EUR/USD/GBP ?
- [ ] Affiliate / partner program ?
- [ ] Self-serve vs sales-led conversion ?

---

Brouillon -- a faire valider et completer dans Sprint 7.1 apres TECH-DEBT-017 deploy reussi.
```

Sauvegarder dans `Specs/COMMERCIAL.md`.

---

## Etape 12 -- Modifier `Specs/tasks.md`

Cocher sous-taches wiring Phase 5+6+7 (T-5.1, T-5.3, T-6.4, T-6.6, T-6.7 UI, T-6.9 UI, T-7.3, BetaOptIn).

NE PAS cocher les sous-taches "deploy" / "publish" / "E2E reel".

---

## Etape 13 -- Modifier `Specs/MIGRATION-PLAN.md`

Ajouter :

```markdown
> **Sprint 2.5d livre 2026-05-15** (DERNIER SPRINT WIRING) :
> - Phase 5+6+7 wiring : 8 composants
> - Version 0.5.2 -> 0.5.3 (via script bump-fixed-version.cjs)
> - **Total wiring 2026-05-15** : 24 composants riches integres
> - **Cloud-Plus stubs en place** : FlakinessReport + QuotaSettings + WebhookAdmin attendent TECH-DEBT-017
>
> **TECH-DEBT-018 NEW** : Commercial layer (Sprint 7.1-7.9, ~25-30h)
> - `Specs/COMMERCIAL.md` brouillon cree
> - Dependances : TECH-DEBT-017/019/035
>
> **Prochaines etapes apres Sprint 2.5d** :
> 1. Audit Phase 2-6 E2E reel (TECH-DEBT-019 NEW)
> 2. Deploy argos-functions Azure (TECH-DEBT-017)
> 3. Marketplace publish (TECH-DEBT-035)
> 4. Beta privee + Commercial layer Sprint 7.X
> 5. GA v1.0.0
```

---

## Etape 14 -- Modifier `CHANGELOG.md` section [0.5.3]

Voir contenu detaille Etape G section "## Composition" plus haut. Resume :

- Section [0.5.3] dated 2026-05-15
- Liste 8 composants wirees
- Specs/COMMERCIAL.md NEW
- 4 tests wiring nouveaux
- TECH-DEBT-018 NEW (commercial layer)
- Milestone : wiring complet (24 composants)
- Lessons learned

---

## Etape 15 -- Bump 0.5.2 -> 0.5.3

```powershell
node tools\release\bump-fixed-version.cjs 0.5.3

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Version racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.3

# Test fixed-versioning OBLIGATOIRE
pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10
```

Si rouge -> debug immediat.

---

## Etape 16 -- Validation finale

```powershell
node tools\regression\scan-mojibake.cjs
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5
pnpm turbo test --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5
pnpm turbo build --force 2>&1 | Select-Object -Last 10
pnpm preflight

Test-Path Specs\COMMERCIAL.md
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-app-offline.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-cases-gherkin-ai.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-settings-audit-repo-beta-quota.test.tsx
Test-Path apps\argos-extension\src\hub\wiring\WIRING-2026-05-15-reports-flakiness.test.tsx
```

---

## Etape 17 -- Archive + commit + PR

### 17.1 -- Archive prompt
```powershell
$found = @(".\CLAUDE_TASK_sprint-2-5d.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-5d.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-5d.md
}
```

### 17.2 -- Pre-commit ASCII check
```powershell
$msg = "feat(hub): Sprint 2.5d wire Phase 5+6+7 + Specs/COMMERCIAL.md (TECH-DEBT-018)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

### 17.3 -- Commit avec -F

Creer `$env:TEMP\commit-msg-sprint-2-5d.txt` :
```
feat(hub): Sprint 2.5d wire Phase 5+6+7 + Specs/COMMERCIAL.md

Sprint 2.5d -- DERNIER sprint de wiring : 8 composants Phase 5+6+7 + Cloud-Plus stubs + brouillon commercial layer.

Composants wirees:
- OfflineBanner (T-7.3) wrapper global App.tsx
- GherkinEditor (T-5.1) CasesView tab Gherkin avec persistance TestCaseService
- AiCandidatesModal (T-6.6) CasesView bouton header -> Dialog
- AuditLogSettings (T-6.4) SettingsView section
- RepoMappingSettings (T-5.3) SettingsView section
- BetaOptIn SettingsView section
- QuotaSettings (T-6.7) SettingsView section + Cloud-Plus stub (TECH-DEBT-017)
- FlakinessReport (T-6.9) ReportsView tab + Cloud-Plus stub (TECH-DEBT-017)

Specs/COMMERCIAL.md NEW (brouillon TECH-DEBT-018):
- Modele pricing hybride Option C (Free 3u / Pro $99-10u / Team $199-25u + AI)
- Definition user actif : >= 1 Test Run dans le mois
- Architecture backend users/billing/tenant/notifications
- Roadmap 9 sub-sprints (7.1 a 7.9, ~25-30h)
- Dependances : TECH-DEBT-017/019/035
- Concurrence : Xray, Tricentis, ADO Test Plans, TestRail

Tests:
- 4 nouveaux tests wiring WIRING-2026-05-15-*
- Total apres Sprint 2.5d : ~67+ tests wiring extension

Architecture finale:
- App.tsx : OfflineBanner wrapper + 6 hubs avec sub-tabs/sections complets
- services.ts : 7 services hub-local + 2 Cloud-Plus stubs (pattern Sprint 2.5c)
- TOTAL : 24 composants riches wirees en 4 sprints

Bump 0.5.2 -> 0.5.3 via tools/release/bump-fixed-version.cjs (12 packages alignes).

TECH-DEBT-018 NEW: Commercial layer (Sprint 7.1-7.9, ~25-30h)

Milestone: TOUT le wiring est livre. Argos peut etre teste de bout en bout.
Prochaines etapes : audit E2E reel (TECH-DEBT-019), Azure deploy (017), Marketplace publish (035), Sprint 7.X commercial.

Decisions tracees:
- D30-C : FlakinessReport Cloud-Plus stub
- D31-A : QuotaSettings Cloud-Plus stub
- D32-A : OfflineBanner wrapper global
- D33-A : AiCandidatesModal bouton header CasesView
- D34-A : Specs/COMMERCIAL.md meme PR
- D35-A : Bump 0.5.3 patch
- D36-A : Services hub-local existants
- D37-B : GherkinEditor persistance complete

Refs: Specs/audit-resync-2026-05-15.md, Specs/COMMERCIAL.md, Sprint 2.5c
```

Puis :
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-5d.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-5d.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-5d.txt"

git push -u origin feat/sprint-2-5d-phase5-6-7-wiring
```

### 17.4 -- PR

```powershell
$prBody = @'
## Summary

**DERNIER sprint de wiring** : Sprint 2.5d wire 8 composants Phase 5+6+7 + brouillon commercial layer (TECH-DEBT-018).

**Bump 0.5.2 -> 0.5.3** via script bump-fixed-version.cjs.

## Composants wirees (8)

| Tache | Composant | Wiring |
|-------|-----------|--------|
| T-7.3 | OfflineBanner | App.tsx wrapper global |
| T-5.1 | GherkinEditor | CasesView tab "Gherkin" |
| T-6.6 | AiCandidatesModal | CasesView bouton header -> Dialog |
| T-6.4 | AuditLogSettings | SettingsView section |
| T-5.3 | RepoMappingSettings | SettingsView section |
| T-6.7 | QuotaSettings | SettingsView section + Cloud-Plus stub |
| T-6.9 | FlakinessReport | ReportsView tab + Cloud-Plus stub |
| -- | BetaOptIn | SettingsView section |

## Specs/COMMERCIAL.md NEW (TECH-DEBT-018)

Brouillon strategie commerciale :
- Modele pricing hybride Option C (Free 3u / Pro $99-10u / Team $199-25u + AI)
- Definition user actif : >= 1 Test Run dans le mois
- Architecture backend users/billing/tenant/notifications
- Roadmap 9 sub-sprints (~25-30h)
- Dependances : TECH-DEBT-017/019/035

## Tests

- 4 nouveaux tests wiring WIRING-2026-05-15-*
- Tests regression : 57 inchange
- Tests wiring extension : 63 -> 67+ passing

## Validation

- Tests regression : 57/57 passing
- Test CFG-2026-05-14-fixed-versioning : OK apres bump 0.5.3
- Turbo test --force : ~335+ tests
- Lint + typecheck + build --force : OK
- Mojibake : 0
- Preflight : PASSED (argos@0.5.3)

## TECH-DEBT

**TECH-DEBT-018 NEW** : Commercial layer (Sprint 7.1-7.9, ~25-30h post Azure deploy)

## Milestone : Phase 0-7 wiring COMPLET

24 composants riches wirees en 4 sprints. Argos peut maintenant etre teste de bout en bout.

## Prochaines etapes

1. Audit Phase 2-6 E2E reel sur ADO Cloud (TECH-DEBT-019 NEW)
2. Deploy argos-functions sur Azure (TECH-DEBT-017)
3. Marketplace publish (TECH-DEBT-035)
4. Commercial layer Sprint 7.1-7.9 (TECH-DEBT-018)
5. Beta privee + GA v1.0.0
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-5d.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(hub): Sprint 2.5d wire Phase 5+6+7 + Specs/COMMERCIAL.md (TECH-DEBT-018)" `
  --body-file "$env:TEMP\pr-body-sprint-2-5d.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-5d.txt"
```

---

## Etape 18 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-5d-phase5-6-7-wiring

pnpm --filter @atconseil/regression-suite test
# 57 passing

pnpm preflight
# PASSED argos@0.5.3

git log --oneline | Select-Object -First 6
```

---

## Criteres de done

- [ ] Branche `feat/sprint-2-5d-phase5-6-7-wiring` creee
- [ ] App.tsx : OfflineBanner wrapper + CasesView (Gherkin + AI) + SettingsView (4 sections) + ReportsView (Flakiness)
- [ ] services.ts : 7 nouveaux services + 2 Cloud-Plus stubs
- [ ] 4 nouveaux tests wiring WIRING-2026-05-15-*
- [ ] **Specs/COMMERCIAL.md NEW** (~150+ lignes)
- [ ] 57 tests regression passing (inchange)
- [ ] Test CFG-2026-05-14-fixed-versioning passe
- [ ] Turbo test --force ~335+ tests
- [ ] Lint + typecheck + build --force OK
- [ ] Specs/tasks.md Phase 5+6+7 wiring cochee
- [ ] CHANGELOG.md section [0.5.3] complete avec TECH-DEBT-018 NEW + Milestone
- [ ] Specs/MIGRATION-PLAN.md mis a jour
- [ ] **12 packages alignes a 0.5.3**
- [ ] 0 mojibake
- [ ] **Commit message 100% ASCII**
- [ ] Prompt archive
- [ ] Commit + PR ouverte
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "Verification champ WIT gherkinSpec : EXISTS / MISSING. Services hub-local confirmes. Confirmation Etape 2 ?"
2. **Apres Etape 2** : "services.ts etendu : 7 nouveaux + 2 stubs. Tests OK. Continue Etape 3 ?"
3. **Apres Etape 6** : "SettingsView etendue (4 sections). Tests verts. Continue Etape 7 ?"
4. **Apres Etape 10** : "CasesView complete. Tous composants wirees. Pret pour Specs/COMMERCIAL.md ?"
5. **Apres Etape 11** : "COMMERCIAL.md cree. Continue tasks.md + MIGRATION-PLAN ?"
6. **Apres Etape 15** : "Bump 0.5.3 OK. Test fixed-versioning VERT. Pret validation ?"
7. **Apres Etape 16** : "Validation complete. argos@0.5.3. Pret a commit ?"
8. **Apres Etape 17.4** : "PR ouverte. Apres merge, lance Etape 18."

---

## Apres ca

**MILESTONE MAJEUR : WIRING COMPLET LIVRE**

- 24 composants riches integres en 4 sprints (2.5a/b/c/d)
- Argos peut etre teste de bout en bout par un humain
- Cloud-Plus features simulees via stubs

**Prochaines etapes** (a choisir avec l'utilisateur) :

- **Option 1** : TECH-DEBT-019 NEW (E2E reel ADO Cloud)
- **Option 2** : TECH-DEBT-017 (Azure deploy)
- **Option 3** : TECH-DEBT-035 (Marketplace publish)
- **Option 4** : Sprint 2.5e (refactor App.tsx + investigation CoveragePanel TECH-DEBT-038)
- **Option 5** : Sprint 7.1 (pricing finalisation)

Bonne fin de marathon Sprint 2.5d !
