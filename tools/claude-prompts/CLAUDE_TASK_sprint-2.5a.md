# Prompt Claude Code — Sprint 2.5a (`feat/wiring-foundations-core`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-2.5a.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, mini-Sprint Marketplace privé mergé
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 12 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] `pnpm --filter argos-extension test` → 314 passing (composants riches déjà testés)

Si l'un échoue → STOP.

---

## Contexte

Audit pre-sprint a confirmé que le repo Argos a **27 composants riches** dans `apps/argos-extension/src/hub/` avec **314 tests unitaires passants**. Mais `App.tsx` actuel n'affiche qu'une `PlansView` simple + 5 `PlaceholderView` stubs. Aucun de ces 27 composants riches n'est wiré.

**Cause** : il manque le bridge entre l'ADO Extension SDK 4.0.2 (qui fournit token, project, organization au runtime) et les services SDK / hub-local (qui s'attendent à recevoir un `IAdoClient`, `IExtensionDataClient`, ou un store abstrait).

**Périmètre Sprint 2.5a** : construire ce bridge + wirer 5 sections (Plans, Cases, Sets, Preconditions, Settings-LLM uniquement). Sprint 2.5b (futur) wirera Run/Coverage/Reports + Settings non-LLM. Composants orphelins (FlakinessReport, AiCandidatesModal, WebhookAdmin, etc.) restent en placeholder explicite avec note backlog.

**Décisions architecture validées** :
1. **Token robuste** : factory de token rafraîchi à chaque appel API, pas un token figé au mount
2. **`User` scope** pour `IExtensionDataService` (BYOK = chaque utilisateur a ses propres credentials LLM)
3. **Composants orphelins** : placeholder explicite "Service non encore implémenté" + lien backlog (option B)
4. **Mock services** dans `apps/argos-extension/src/test-utils/mock-services.ts` (réutilisable)
5. **Périmètre confirmé** : Plans, Cases, Sets, Preconditions, Settings (LLM uniquement). Hors scope explicite : Reports, Run/Execution/Coverage, Wizards, Settings non-LLM.

---

## Architecture cible

### Layer 1 — `useAdoContext` hook (`apps/argos-extension/src/hub/ado-context.ts`)

```typescript
interface AdoContext {
  accessTokenFactory: () => Promise<string>;  // rafraîchit le token à chaque appel
  project: string;
  organization: string;
  baseUrl: string;
  isLoading: boolean;
  error: Error | null;
}

function useAdoContext(): AdoContext;
```

### Layer 2 — `services.ts` factory bundle (`apps/argos-extension/src/hub/services.ts`)

```typescript
interface Services {
  // SDK services
  testPlanService: ITestPlanService;
  testCaseService: ITestCaseService;
  testSetService: ITestSetService;
  preconditionService: IPreconditionService;
  // ... autres SDK services au besoin
  
  // Hub-local services
  llmProviderService: ILlmProviderService;
  
  // Context exposé
  project: string;
  organization: string;
}

function buildServices(adoCtx: AdoContext): Services;
```

### Layer 3 — `ServicesProvider` React Context (`apps/argos-extension/src/hub/services-context.tsx`)

```typescript
const ServicesContext = createContext<Services | null>(null);

function ServicesProvider({ children }: { children: ReactNode }) {
  const adoCtx = useAdoContext();
  if (adoCtx.isLoading) return <Loading />;
  if (adoCtx.error) return <ErrorBoundary error={adoCtx.error} />;
  const services = useMemo(() => buildServices(adoCtx), [adoCtx]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be inside ServicesProvider");
  return ctx;
}
```

### Pattern de wiring App.tsx

```tsx
function PlansView() {
  const { testPlanService, project } = useServices();
  return <TestPlanForm service={testPlanService} project={project} />;
}

export function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <ServicesProvider>
        {/* sidebar + main area */}
      </ServicesProvider>
    </FluentProvider>
  );
}
```

---

## Étape 0 — Setup branche + sanity

```powershell
git checkout main
git pull
git checkout -b feat/wiring-foundations-core

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 12 passing
```

---

## Étape 1 — Test-first : mock services + ado-context (ROUGE attendu)

### 1.1 — Créer `apps/argos-extension/src/test-utils/mock-services.ts`

⚠ **Source ASCII si possible** (les types et noms sont ASCII, pas besoin d'accents). Pas de mojibake risqué.

```typescript
import { vi } from "vitest";
import type {
  ITestPlanService,
  ITestCaseService,
  ITestSetService,
  IPreconditionService,
} from "@atconseil/testvault-sdk";
import type { ILlmProviderService } from "../hub/llm-provider-service.js";
import type { Services } from "../hub/services.js";

export function createMockServices(overrides?: Partial<Services>): Services {
  return {
    testPlanService: createMockTestPlanService(),
    testCaseService: createMockTestCaseService(),
    testSetService: createMockTestSetService(),
    preconditionService: createMockPreconditionService(),
    llmProviderService: createMockLlmProviderService(),
    project: "MockProject",
    organization: "MockOrg",
    ...overrides,
  };
}

export function createMockTestPlanService(): ITestPlanService {
  return {
    create: vi.fn().mockResolvedValue({}),
    read: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    lock: vi.fn().mockResolvedValue({}),
    unlock: vi.fn().mockResolvedValue({}),
    lockWithAutoSnapshot: vi.fn().mockResolvedValue({}),
  } as unknown as ITestPlanService;
}

// ... factories similaires pour TestCaseService, TestSetService, PreconditionService, LlmProviderService
// Utiliser les patterns existants dans les .test.tsx pour s'aligner sur les contrats réels
```

⚠ Pour calibrer chaque mock, **regarde le `.test.tsx` correspondant du composant** (TestPlanForm.test.tsx, TestCaseForm.test.tsx, etc.) — ils utilisent déjà des factories `makeService()` qu'il suffit de transposer.

### 1.2 — Créer `apps/argos-extension/src/hub/ado-context.test.tsx`

⚠ Source ASCII strict.

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as SDK from "azure-devops-extension-sdk";
import { useAdoContext } from "./ado-context.js";

vi.mock("azure-devops-extension-sdk");

describe("useAdoContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns isLoading: true initially", () => {
    vi.mocked(SDK.init).mockResolvedValue(undefined);
    vi.mocked(SDK.ready).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdoContext());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns context when ADO SDK is ready", async () => {
    vi.mocked(SDK.init).mockResolvedValue(undefined);
    vi.mocked(SDK.ready).mockResolvedValue(undefined);
    vi.mocked(SDK.getHost).mockReturnValue({
      name: "myorg",
      id: "abc",
      type: 1 as never,
    });
    vi.mocked(SDK.getAccessToken).mockResolvedValue("token-xyz");
    // Mock IProjectPageService
    const mockProjectService = {
      getProject: vi.fn().mockResolvedValue({ name: "MyProject", id: "p1" }),
    };
    vi.mocked(SDK.getService).mockResolvedValue(mockProjectService as never);

    const { result } = renderHook(() => useAdoContext());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.project).toBe("MyProject");
    expect(result.current.organization).toBe("myorg");
    expect(result.current.error).toBeNull();
    
    // Token factory rafraîchit à chaque appel
    const token1 = await result.current.accessTokenFactory();
    expect(token1).toBe("token-xyz");
    expect(SDK.getAccessToken).toHaveBeenCalledTimes(2); // 1 init + 1 factory call
  });

  it("returns error when ADO SDK fails", async () => {
    vi.mocked(SDK.init).mockRejectedValue(new Error("SDK init failed"));
    const { result } = renderHook(() => useAdoContext());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain("SDK init failed");
  });
});
```

### 1.3 — Créer `apps/argos-extension/src/hub/services.test.ts`

```typescript
import { describe, expect, it, vi } from "vitest";
import { buildServices } from "./services.js";
import type { AdoContext } from "./ado-context.js";

describe("buildServices", () => {
  it("returns all services initialized with the ado context", async () => {
    const accessTokenFactory = vi.fn().mockResolvedValue("token-abc");
    const ctx: AdoContext = {
      accessTokenFactory,
      project: "MyProject",
      organization: "myorg",
      baseUrl: "https://dev.azure.com/myorg",
      isLoading: false,
      error: null,
    };
    const services = buildServices(ctx);

    expect(services.testPlanService).toBeDefined();
    expect(services.testCaseService).toBeDefined();
    expect(services.testSetService).toBeDefined();
    expect(services.preconditionService).toBeDefined();
    expect(services.llmProviderService).toBeDefined();
    expect(services.project).toBe("MyProject");
    expect(services.organization).toBe("myorg");
  });

  it("token factory is called for each adoClient API call (robust refresh)", async () => {
    // Le token factory doit etre appele pour chaque request, pas une fois au mount
    // Verification indirect : on construit le service, on inspecte que le wiring delegue au factory
    const accessTokenFactory = vi.fn().mockResolvedValue("token-fresh");
    const ctx: AdoContext = {
      accessTokenFactory,
      project: "MyProject",
      organization: "myorg",
      baseUrl: "https://dev.azure.com/myorg",
      isLoading: false,
      error: null,
    };
    const services = buildServices(ctx);
    // Trigger any service operation that hits the ADO client
    // (depending on actual implementation, may need adjustment)
    expect(services).toBeDefined();
  });
});
```

### 1.4 — Lancer les tests : ils DOIVENT échouer

```powershell
pnpm --filter argos-extension test ado-context services
# Attendu : tests fail (les fichiers ado-context.ts et services.ts n'existent pas encore)
```

Confirme à l'utilisateur que tu vois les fails attendus avant l'étape 2.

---

## Étape 2 — Implémenter `ado-context.ts`

### 2.1 — Créer `apps/argos-extension/src/hub/ado-context.ts`

```typescript
import { useEffect, useState } from "react";
import * as SDK from "azure-devops-extension-sdk";
import type { IProjectPageService } from "azure-devops-extension-api";
import { CommonServiceIds } from "azure-devops-extension-api";

export interface AdoContext {
  accessTokenFactory: () => Promise<string>;
  project: string;
  organization: string;
  baseUrl: string;
  isLoading: boolean;
  error: Error | null;
}

const INITIAL_STATE: AdoContext = {
  accessTokenFactory: async () => {
    throw new Error("ADO context not ready");
  },
  project: "",
  organization: "",
  baseUrl: "",
  isLoading: true,
  error: null,
};

export function useAdoContext(): AdoContext {
  const [state, setState] = useState<AdoContext>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    
    async function setup() {
      try {
        await SDK.init();
        await SDK.ready();
        
        const host = SDK.getHost();
        const projectService = await SDK.getService<IProjectPageService>(
          CommonServiceIds.ProjectPageService,
        );
        const project = await projectService.getProject();
        
        if (cancelled) return;
        
        if (!project) {
          throw new Error("No project context available");
        }
        
        const organization = host.name;
        const baseUrl = `https://dev.azure.com/${organization}`;
        
        // Token factory : toujours rafraîchi, jamais figé (decision robuste)
        const accessTokenFactory = async () => {
          return SDK.getAccessToken();
        };
        
        // Pre-fetch token once to validate access
        await accessTokenFactory();
        
        setState({
          accessTokenFactory,
          project: project.name,
          organization,
          baseUrl,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    }
    
    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
```

### 2.2 — Vérifier les tests

```powershell
pnpm --filter argos-extension test ado-context
# Attendu : 3 passing
```

---

## Étape 3 — Implémenter `services.ts`

### 3.1 — Créer le bridge `IExtensionDataClient` adapter

`apps/argos-extension/src/hub/extension-data-store.ts` :

```typescript
import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, type IExtensionDataService } from "azure-devops-extension-api";
import type { IExtensionDataClient } from "@atconseil/testvault-sdk";

const SCOPE_USER = "User";  // BYOK = User scope (decision validated)

let cachedDataService: IExtensionDataService | null = null;

async function getDataService(): Promise<IExtensionDataService> {
  if (!cachedDataService) {
    cachedDataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService,
    );
  }
  return cachedDataService;
}

export function createExtensionDataClient(): IExtensionDataClient {
  return {
    async getValue<T>(key: string): Promise<T | undefined> {
      const svc = await getDataService();
      const dataManager = await svc.getExtensionDataManager(
        SDK.getExtensionContext().id,
        await SDK.getAccessToken(),
      );
      return dataManager.getValue<T>(key, { scopeType: SCOPE_USER });
    },
    async setValue<T>(key: string, value: T): Promise<T> {
      const svc = await getDataService();
      const dataManager = await svc.getExtensionDataManager(
        SDK.getExtensionContext().id,
        await SDK.getAccessToken(),
      );
      return dataManager.setValue<T>(key, value, { scopeType: SCOPE_USER });
    },
  };
}
```

### 3.2 — Créer l'adapter `IAiSettingsStore`

⚠ `IAiSettingsStore` (défini dans `llm-provider-service.ts`) est **probablement** identique à `IExtensionDataClient` (getValue/setValue). À confirmer en lisant le fichier complet :

```powershell
Get-Content apps\argos-extension\src\hub\llm-provider-service.ts | Select-Object -Skip 30 -First 30
```

Si l'interface est compatible, l'adapter est trivial :

```typescript
// dans services.ts ou un fichier dédié
function adaptToAiSettingsStore(client: IExtensionDataClient): IAiSettingsStore {
  // Si signatures compatibles, retour direct
  return client as unknown as IAiSettingsStore;
  // Sinon, wrapper de delegation explicite
}
```

Si non-compatible, écrire un wrapper explicite avec mapping des méthodes.

### 3.3 — Créer `apps/argos-extension/src/hub/services.ts`

```typescript
import {
  createAdoClient,
  createTestPlanService,
  createTestCaseService,
  createTestSetService,
  createPreconditionService,
  type IAdoClient,
  type ITestPlanService,
  type ITestCaseService,
  type ITestSetService,
  type IPreconditionService,
} from "@atconseil/testvault-sdk";
import type { ILlmProviderService } from "./llm-provider-service.js";
import { createLlmProviderService } from "./llm-provider-service.js";
import { createExtensionDataClient } from "./extension-data-store.js";
import type { AdoContext } from "./ado-context.js";

export interface Services {
  testPlanService: ITestPlanService;
  testCaseService: ITestCaseService;
  testSetService: ITestSetService;
  preconditionService: IPreconditionService;
  llmProviderService: ILlmProviderService;
  project: string;
  organization: string;
}

export function buildServices(ctx: AdoContext): Services {
  // ADO client robust: token rafraichi a chaque appel via factory
  const adoClient: IAdoClient = createAdoClient({
    baseUrl: ctx.baseUrl,
    project: ctx.project,
    pat: "",  // unused: real auth comes from accessTokenFactory below
    // NOTE: createAdoClient currently expects a static pat. If the SDK exposes
    // a token factory pattern, use it here. Otherwise, we work around by
    // building the auth header dynamically — see comment in ado-client.ts.
  });
  
  // TODO: si createAdoClient ne supporte pas un token factory, soit:
  //   - patcher le SDK pour accepter `tokenFactory: () => Promise<string>`
  //   - soit accepter le compromis "token figé au mount" pour Sprint 2.5a
  //     et noter TECH-DEBT-006 pour le passage en token-refresh dans un sprint
  //     suivant. La decision robuste validee implique un patch SDK.
  
  // Hub-local
  const dataClient = createExtensionDataClient();
  // IAiSettingsStore est-il compatible IExtensionDataClient ? Verifier signatures.
  const aiSettingsStore = dataClient as never;  // TODO: adapter si non-compatible
  const llmProviderService = createLlmProviderService(aiSettingsStore);
  
  return {
    testPlanService: createTestPlanService(adoClient, ctx.project),
    testCaseService: createTestCaseService(adoClient, ctx.project),
    testSetService: createTestSetService(adoClient, ctx.project),
    preconditionService: createPreconditionService(adoClient, ctx.project),
    llmProviderService,
    project: ctx.project,
    organization: ctx.organization,
  };
}
```

⚠ **Si tu rencontres une incompatibilité de signature** (token figé vs factory dans createAdoClient ; IAiSettingsStore vs IExtensionDataClient ; etc.), **STOP et signale**. Ne pas appliquer de hack silencieux. Soit on patche le SDK, soit on documente TECH-DEBT-006 et on accepte le compromis pour 2.5a.

### 3.4 — Vérifier les tests

```powershell
pnpm --filter argos-extension test services
# Attendu : 2 passing
```

---

## Étape 4 — Créer `services-context.tsx`

```typescript
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Text } from "@fluentui/react-components";
import { useAdoContext } from "./ado-context.js";
import { buildServices, type Services } from "./services.js";

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const adoCtx = useAdoContext();
  
  const services = useMemo(() => {
    if (adoCtx.isLoading || adoCtx.error) return null;
    return buildServices(adoCtx);
  }, [adoCtx]);
  
  if (adoCtx.isLoading) {
    return <div data-testid="services-loading"><Text>Loading Argos...</Text></div>;
  }
  
  if (adoCtx.error) {
    return (
      <div data-testid="services-error" style={{ padding: 16, color: "#a00" }}>
        <Text weight="semibold">Argos failed to load</Text>
        <Text block>{adoCtx.error.message}</Text>
      </div>
    );
  }
  
  if (!services) return null;  // type guard
  
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be called inside ServicesProvider");
  }
  return ctx;
}
```

---

## Étape 5 — Refactor `App.tsx` avec wiring des 5 sections

### 5.1 — Wiring Plans, Cases, Sets, Preconditions, Settings (LLM)

Remplacer le contenu de `apps/argos-extension/src/hub/App.tsx` :

```typescript
import { FluentProvider, Text, webLightTheme } from "@fluentui/react-components";
import { useState } from "react";
import { ServicesProvider, useServices } from "./services-context.js";
import { TestPlanForm } from "./TestPlanForm.js";
import { TestCaseForm } from "./TestCaseForm.js";
import { TestSetForm } from "./TestSetForm.js";
import { PreconditionForm } from "./PreconditionForm.js";
import { LlmProviderSettings } from "./LlmProviderSettings.js";

type View = "plans" | "cases" | "sets" | "preconditions" | "reports" | "settings";

const NAV_ITEMS: Array<{ id: View; label: string; testId: string }> = [
  { id: "plans", label: "Plans", testId: "nav-plans" },
  { id: "cases", label: "Cases", testId: "nav-cases" },
  { id: "sets", label: "Sets", testId: "nav-sets" },
  { id: "preconditions", label: "Precond.", testId: "nav-preconditions" },
  { id: "reports", label: "Reports", testId: "nav-reports" },
];

function NavItem({ /* ... unchanged ... */ }) { /* ... */ }

function PlansView() {
  const { testPlanService, project } = useServices();
  return (
    <div data-testid="view-plans">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Test Plans
      </Text>
      <TestPlanForm service={testPlanService} project={project} />
    </div>
  );
}

function CasesView() {
  const { testCaseService, project } = useServices();
  return (
    <div data-testid="view-cases">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Test Cases
      </Text>
      <TestCaseForm service={testCaseService} project={project} />
    </div>
  );
}

function SetsView() {
  const { testSetService, project } = useServices();
  return (
    <div data-testid="view-sets">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Test Sets
      </Text>
      <TestSetForm service={testSetService} project={project} />
    </div>
  );
}

function PreconditionsView() {
  const { preconditionService, project } = useServices();
  return (
    <div data-testid="view-preconditions">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Preconditions
      </Text>
      <PreconditionForm service={preconditionService} project={project} />
    </div>
  );
}

// Reports : composant orphelin (FlakinessReport requires non-implemented service)
// Decision Sprint 2.5a: explicit placeholder with backlog reference (option B)
function ReportsView() {
  return (
    <div data-testid="view-reports" style={{ padding: 16 }}>
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Reports
      </Text>
      <Text style={{ color: "#666" }} block>
        Flakiness reports require a backend service not yet implemented.
      </Text>
      <Text style={{ color: "#666", fontSize: "12px" }} block style={{ marginTop: 8 }}>
        Tracked as backlog item WIRING-CLOUD-PLUS (FlakinessReportService implementation).
      </Text>
    </div>
  );
}

function SettingsView() {
  const { llmProviderService } = useServices();
  // For 2.5a, isAdmin is hardcoded true. 2.5b will introduce real role detection.
  return (
    <div data-testid="view-settings">
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "12px" }}>
        Settings
      </Text>
      <LlmProviderSettings service={llmProviderService} isAdmin={true} />
      <div style={{ marginTop: 24, padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
        <Text size={200} style={{ color: "#666" }}>
          Audit Log, Repo Mapping, Quotas, Webhooks, and Beta opt-in will be available in a future release.
          Tracked as backlog item Sprint 2.5b.
        </Text>
      </div>
    </div>
  );
}

function MainContent() {
  const [currentView, setCurrentView] = useState<View>("plans");
  
  function renderMain() {
    switch (currentView) {
      case "plans": return <PlansView />;
      case "cases": return <CasesView />;
      case "sets": return <SetsView />;
      case "preconditions": return <PreconditionsView />;
      case "reports": return <ReportsView />;
      case "settings": return <SettingsView />;
    }
  }
  
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "180px", borderRight: "1px solid #e0e0e0", paddingTop: "16px", flexShrink: 0 }}>
        <div style={{ padding: "0 12px 8px", fontSize: "12px", color: "#666", fontWeight: 600, textTransform: "uppercase" }}>
          Argos
        </div>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            testId={item.testId}
            active={currentView === item.id}
            onClick={() => setCurrentView(item.id)}
          />
        ))}
        <div style={{ padding: "16px 12px 8px", fontSize: "12px", color: "#666", fontWeight: 600, textTransform: "uppercase" }}>
          Settings
        </div>
        <NavItem
          label="AI / Config"
          testId="nav-settings"
          active={currentView === "settings"}
          onClick={() => setCurrentView("settings")}
        />
      </div>
      <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        {renderMain()}
      </div>
    </div>
  );
}

export function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <ServicesProvider>
        <MainContent />
      </ServicesProvider>
    </FluentProvider>
  );
}
```

### 5.2 — Bonus mojibake fix App.tsx

L'audit a noté une ligne avec `\u00E2\u20AC\u201D` (em-dash corrompu) dans l'ancien `SettingsView`. La nouvelle version ci-dessus n'en a plus (réécrit en ASCII propre + tag i18n-friendly futur). Pas d'action additionnelle.

### 5.3 — Adapter App.test.tsx

Le test existant `App.test.tsx` rend probablement le App sans context. Il faut:
1. Soit mocker `ServicesProvider` 
2. Soit utiliser `createMockServices()` + un wrapper de test

⚠ **Si App.test.tsx existant casse**, c'est attendu — le test doit être mis à jour pour le nouveau pattern. Réécrire en utilisant le mock-services pour wrapper App.

---

## Étape 6 — Smoke tests niveau 1

Créer 5 tests smoke dans `apps/argos-extension/src/hub/wiring/` :

`WIRING-2026-05-10-plans.test.tsx` :

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { ServicesContext } from "../services-context.js";
import { createMockServices } from "../../test-utils/mock-services.js";
import { App } from "../App.js";

function renderWithMockServices() {
  const services = createMockServices();
  // Wrap App without using its internal ServicesProvider (which would call ADO SDK)
  // Instead, we provide the context directly with our mock
  return render(
    <FluentProvider theme={webLightTheme}>
      <ServicesContext.Provider value={services}>
        {/* App uses MainContent but we need to extract it for testability */}
        {/* Alternative : just check that PlansView renders TestPlanForm */}
      </ServicesContext.Provider>
    </FluentProvider>
  );
}

describe("WIRING-2026-05-10-plans", () => {
  it("PlansView renders the TestPlanForm component (not a placeholder)", async () => {
    renderWithMockServices();
    // tp-name-input is the testId from TestPlanForm.test.tsx
    await screen.findByTestId("tp-name-input");
    expect(screen.queryByTestId("plans-empty-state")).toBeNull();
  });
});
```

⚠ **Pour faciliter le test**, refactorer `App.tsx` pour exporter `MainContent` séparément de `App`. Ou utiliser un test ID spécifique au container.

Faire la même chose pour Cases, Sets, Preconditions, Settings (LLM).

---

## Étape 7 — Validation complète

```powershell
# Tests régression toujours verts
pnpm --filter @atconseil/regression-suite test
# Attendu : 12 passing

# Tests apps argos-extension
pnpm --filter argos-extension test
# Attendu : 314 originaux + nouveaux (5 smoke + 3 ado-context + 2 services + tests mock services)
# Soit ~325 passing minimum

# Mojibake clean
node tools\regression\scan-mojibake.cjs

# Lint + typecheck
pnpm turbo lint
pnpm turbo typecheck

# Tests applicatifs complets
pnpm turbo test
```

---

## Étape 8 — Allowlist + REGISTRY + CHANGELOG

### 8.1 — Allowlist (les deux fichiers)

Ajouter à `tools/regression/allowlist.ts` ET `tools/regression/allowlist.cjs` :

```
"tools/claude-prompts/CLAUDE_TASK_sprint-2.5a.md",
```

### 8.2 — REGISTRY

Ajouter dans `tools/regression/REGISTRY.md` :

```markdown
| WIRING-2026-05-10-foundations | 2026-05-10 | Wiring | foundations-core | Empeche que App.tsx revienne aux placeholders pour Plans/Cases/Sets/Preconditions/Settings-LLM. Smoke tests verifient que les composants riches (TestPlanForm, TestCaseForm, etc.) sont effectivement rendus. | apps/argos-extension/src/hub/wiring/ | AT |
```

### 8.3 — CHANGELOG

Sous `[Unreleased]` :

```markdown
### Added (Sprint 2.5a — 2026-05-10 — feat/wiring-foundations-core)

- **ADO Extension SDK bridge** : `useAdoContext` hook recupere token, project, organization. Token factory rafraichi a chaque appel API (decision robuste).
- **Services factory** : `buildServices(adoCtx)` construit tous les services SDK + hub-local en un objet unique injecte via React Context (`ServicesProvider` + `useServices`).
- **IExtensionDataClient bridge** : adaptateur entre `azure-devops-extension-api` ExtensionDataService (User scope, BYOK) et le pattern `IAiSettingsStore` du hub.
- **Wiring 5 sections** : App.tsx remplace les placeholders Plans/Cases/Sets/Preconditions/Settings (LLM) par les composants riches reels (TestPlanForm, TestCaseForm, TestSetForm, PreconditionForm, LlmProviderSettings).
- **Mock services** : `apps/argos-extension/src/test-utils/mock-services.ts` reutilisable pour les tests d'integration futurs.
- **Smoke tests niveau 1** : 5 tests `WIRING-2026-05-10-*.test.tsx` qui verifient que chaque section rend le composant riche, pas le placeholder.

### Hors scope Sprint 2.5a (backlog)

- Sprint 2.5b : Reports (FlakinessReport orphelin), Run/Coverage/Execution (composants transverses), Wizards (Install/Import), Settings non-LLM (Audit/Repo/Quota/Webhook/Beta)
- TECH-DEBT-006 : si `createAdoClient` ne supporte pas un token factory dynamique, patcher le SDK
```

---

## Étape 9 — Archive du prompt + commit

```powershell
$found = @(".\CLAUDE_TASK_sprint-2.5a.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2.5a.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2.5a.md
}

git add -A
git status

git commit `
  -m "feat(extension): wire core sections in App.tsx (Sprint 2.5a)" `
  -m "" `
  -m "Foundations:" `
  -m "- ADO Extension SDK bridge: useAdoContext hook + token factory (robust refresh)" `
  -m "- Services factory: buildServices() + ServicesProvider/useServices Context" `
  -m "- IExtensionDataClient bridge with User scope (BYOK)" `
  -m "" `
  -m "Wired sections (5):" `
  -m "- Plans -> TestPlanForm" `
  -m "- Cases -> TestCaseForm" `
  -m "- Sets -> TestSetForm" `
  -m "- Preconditions -> PreconditionForm" `
  -m "- Settings (LLM) -> LlmProviderSettings" `
  -m "" `
  -m "Tests:" `
  -m "- 5 smoke tests WIRING-2026-05-10-*" `
  -m "- 3 useAdoContext tests" `
  -m "- 2 buildServices tests" `
  -m "- Mock services factory in test-utils/" `
  -m "" `
  -m "Out of scope (Sprint 2.5b backlog):" `
  -m "- Reports (FlakinessReport orphelin)" `
  -m "- Run/Coverage/Execution" `
  -m "- Wizards" `
  -m "- Settings non-LLM" `
  -m "" `
  -m "Refs: backlog Phase 0.5 (integration debt)"

git push -u origin feat/wiring-foundations-core
```

Puis ouvrir la PR.

---

## Critères de done

- [ ] Branche `feat/wiring-foundations-core` créée depuis main à jour
- [ ] `useAdoContext` hook créé et testé (3 tests)
- [ ] `buildServices` factory créée et testée (2 tests)
- [ ] `ServicesProvider` + `useServices` créés
- [ ] `createExtensionDataClient` adapter SDK 4.x
- [ ] App.tsx refactoré : 5 sections wirées (Plans, Cases, Sets, Preconditions, Settings-LLM)
- [ ] Reports + Settings non-LLM en placeholder explicite avec backlog
- [ ] Mock services factory dans `apps/argos-extension/src/test-utils/`
- [ ] 5 smoke tests `WIRING-2026-05-10-*.test.tsx` passing
- [ ] App.test.tsx mis à jour si nécessaire (utilise mock-services)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 12 passing
- [ ] `pnpm --filter argos-extension test` → tous verts (~325+ tests)
- [ ] `pnpm turbo lint && turbo typecheck && turbo test` → tous verts
- [ ] Allowlists `allowlist.ts` ET `allowlist.cjs` mises à jour (prompt archivé)
- [ ] REGISTRY.md mis à jour
- [ ] CHANGELOG.md `[Unreleased]` mis à jour
- [ ] Commit Conventional Commits avec breakdown détaillé

---

## Garde-fous Sprint 2.5a

⚠ **Encoding** : tous nouveaux fichiers source en UTF-8 strict. Pour les fichiers `tools/regression/*` éventuels (smoke tests régression), source ASCII strict.

⚠ **Compromis token factory** : si tu découvres en cours de route que `createAdoClient` du SDK n'accepte qu'un `pat` figé (pas un factory), STOP. Décision à prendre :
- Soit patcher `@atconseil/testvault-sdk` pour accepter `tokenFactory: () => Promise<string>`
- Soit accepter un compromis figé pour 2.5a + noter TECH-DEBT-006

Ne pas appliquer un hack silencieux.

⚠ **Compatibilité IAiSettingsStore vs IExtensionDataClient** : si les signatures divergent, écrire un wrapper de delegation explicite, pas un cast `as never`.

⚠ **Composants orphelins** : NE PAS auto-implémenter les services manquants pendant ce sprint (FlakinessReport, etc.). Laisser en placeholder explicite. Sprint 2.5b ou ultérieur s'en chargera après décision dédiée.

⚠ **Scope creep** : ne pas wirer Run/Coverage/Wizards même s'ils paraissent prets. Hors scope formel.

⚠ **App.test.tsx** : si tu réécris pour utiliser `createMockServices`, vérifier que les tests existants passent toujours. Si certains demandent une refonte plus profonde, signaler avant de pousser.

---

## Si quelque chose dévie du plan

- Si `createAdoClient` ne supporte pas un token factory → STOP, decide patch SDK or 2.5a freeze
- Si `IAiSettingsStore` ≠ `IExtensionDataClient` (signatures incompatibles) → STOP, ecrire wrapper explicite
- Si les 314 tests existants cassent suite au refactor App.tsx → STOP, evaluer chaque fail
- Si plus de 3 composants riches ont des dependences non-mockables triviales → STOP, ajuster scope

---

Quand tous tests verts (régression 12/12 + apps ~325+/~325+), dis-le-moi. Sprint 2.5b (Run/Coverage/Reports + Settings non-LLM) pourra alors démarrer.
