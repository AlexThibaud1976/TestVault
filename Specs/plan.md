# Plan technique — TestVault (Argos) v1.0

> Version 0.1.0 — 8 mai 2026
> Architecture, schémas, API, tests, CI/CD, sécurité opérationnelle
> Auteur : Alexandre Thibaud — atconseil.info
> Réfs : `constitution.md` v0.2.3, `spec.md` v0.1.0

---

## Table des matières

1. [Architecture monorepo](#1-architecture-monorepo)
2. [Architecture de l'extension ADO](#2-architecture-de-lextension-ado)
3. [Custom Process Inheritance — schéma WIT](#3-custom-process-inheritance--schéma-wit)
4. [Contrat WIT TestVault ↔ TestPulse](#4-contrat-wit-testvault--testpulse)
5. [WIQL — requêtes types](#5-wiql--requêtes-types)
6. [API REST Cloud-Plus + OpenAPI](#6-api-rest-cloud-plus--openapi)
7. [Architecture Azure Functions](#7-architecture-azure-functions)
8. [Stratégie de chiffrement BYOK](#8-stratégie-de-chiffrement-byok)
9. [Stratégie de tests](#9-stratégie-de-tests)
10. [Pipeline CI/CD & publication Marketplace](#10-pipeline-cicd--publication-marketplace)

---

## 1. Architecture monorepo

### 1.1 Structure des packages

```
testvault/                                  # racine du repo, monorepo
├── apps/
│   ├── argos-extension/                    # VSIX final publié sur Marketplace (publisher: AlexThibaud, name: Argos)
│   │   ├── src/
│   │   │   ├── hubs/                       # contributions UI (Hub, Plans, Cases, Settings, Reports)
│   │   │   ├── widgets/                    # widgets Boards (Test Coverage panel sur Work Items)
│   │   │   ├── services/                   # adapter ADO (REST + WIQL + Process)
│   │   │   ├── llm-client/                 # client Cloud-Plus (proxy LLM)
│   │   │   └── i18n/                       # ressources de traduction (en-only v1)
│   │   ├── vss-extension.json
│   │   └── package.json
│   ├── argos-functions/                    # Azure Functions (Cloud-Plus uniquement)
│   │   ├── src/
│   │   │   ├── llm-proxy/                  # endpoints d'orchestration LLM BYOK
│   │   │   ├── webhooks-ci/                # ingestion CI externes
│   │   │   ├── jobs/                       # timer triggers (refresh, agrégations)
│   │   │   └── shared/                     # crypto, validation, telemetry
│   │   ├── host.json
│   │   └── package.json
│   └── docs-site/                          # site documentation publique (Docusaurus ou équivalent)
├── packages/
│   ├── testvault-sdk/                      # @atconseil/testvault-sdk (npm public, Apache 2.0)
│   ├── testvault-cli/                      # @atconseil/testvault-cli (npm public, Apache 2.0)
│   ├── testvault-types/                    # types partagés (Custom WIT, payloads, contracts)
│   ├── testvault-wit-schema/               # définitions des Custom WIT pour l'installation Process
│   ├── testvault-ui/                       # composants UI réutilisables (Fluent UI 2 wrappers)
│   ├── testvault-importers/                # parsers : CSV, Excel, JUnit XML, NUnit, xUnit, TestNG, Cucumber
│   ├── testvault-exporters/                # générateurs : Excel, PDF
│   └── testpulse-ui-shared/                # composants partagés avec TestPulse standalone
├── tools/
│   ├── e2e/                                # suite Playwright contre instances ADO réelles
│   ├── load-testing/                       # k6 ou similaire pour stress-tests
│   └── migration-scripts/                  # scripts de migration de schéma WIT
├── docs/
│   ├── user-guide.md
│   ├── api-reference.md                    # généré depuis OpenAPI
│   ├── sdk-reference.md                    # généré depuis types TS
│   ├── wit-schema.md                       # contrat public TestPulse
│   └── operator-guide.md                   # déploiement Cloud-Plus, Azure Functions
├── .github/workflows/                      # GitHub Actions
├── turbo.json                              # config Turborepo
├── package.json                            # root, workspaces
├── tsconfig.base.json                      # config TS strict partagée
├── CLAUDE.md                               # règles Claude Code
├── CHANGELOG.md
├── README.md
├── LICENSE                                 # mixte : Apache 2.0 (sdk, cli) + propriétaire (extension, functions)
├── constitution.md
├── spec.md
├── plan.md
├── tasks.md
└── monetisation-analyse.md
```

### 1.2 Choix outillage monorepo

- **Turborepo** retenu plutôt que Nx. Justification : adoption plus simple, moins prescriptif, suffisant pour 12 packages, build cache distant gratuit pour open-source.
- **pnpm** comme package manager (workspaces natifs, déterminisme de hoisting, gain disque sur duplications).
- **TypeScript 5.5+** mode strict, config partagée dans `tsconfig.base.json`, chaque package étend.
- **Vitest** pour les tests unitaires (plus rapide que Jest, ESM-natif).
- **Playwright** pour les tests E2E.
- **Biome** comme linter + formatter unifié (officialisé par constitution §2 v0.2.4). Configuration unique `biome.json` à la racine.

### 1.3 Découplage de versionning

- `argos-extension`, `testpulse-ui-shared`, `testvault-wit-schema` : **versions liées** (release coordonnée). Bump majeur d'un = bump majeur de tous.
- `testvault-sdk`, `testvault-cli` : **versions indépendantes** (pour stabilité de l'API publique externe).
- `argos-functions` : versionné indépendamment (déployé en continu sur Cloud).
- Outil : **Changesets** pour piloter les bumps semver et générer les changelogs.

---

## 2. Architecture de l'extension ADO

### 2.1 Manifest `vss-extension.json`

```jsonc
{
  "manifestVersion": 1,
  "id": "argos",
  "publisher": "AlexThibaud",
  "name": "Argos",
  "version": "1.0.0",
  "description": "Industrial-grade test management for Azure DevOps, native to ADO Cloud.",
  "categories": ["Azure Boards"],
  "tags": ["test", "qa", "test management", "testing", "BDD", "cucumber"],
  "targets": [
    { "id": "Microsoft.VisualStudio.Services.Cloud" }
  ],
  "scopes": [
    "vso.work_full",
    "vso.profile",
    "vso.code",
    "vso.extension.data_write",
    "vso.identity"
  ],
  "files": [
    { "path": "dist", "addressable": true },
    { "path": "static", "addressable": true },
    { "path": "logo.png", "addressable": true }
  ],
  "contributions": [
    {
      "id": "argos-hub",
      "type": "ms.vss-web.hub",
      "targets": ["ms.vss-work-web.work-hub-group"],
      "properties": {
        "name": "Argos",
        "order": 80,
        "uri": "dist/hubs/main/index.html",
        "icon": "static/icon-hub.png"
      }
    },
    {
      "id": "argos-coverage-panel",
      "type": "ms.vss-work-web.work-item-form-page",
      "targets": ["ms.vss-work-web.work-item-form"],
      "properties": {
        "name": "Test Coverage",
        "uri": "dist/widgets/coverage-panel/index.html",
        "height": 400
      }
    },
    {
      "id": "argos-test-run-action",
      "type": "ms.vss-work-web.work-item-toolbar-menu",
      "targets": ["ms.vss-work-web.work-item-form"],
      "properties": {
        "title": "Run Test Case",
        "uri": "dist/widgets/run-launcher/index.html"
      }
    }
  ]
}
```

**Targets.** `Microsoft.VisualStudio.Services.Cloud` cible Azure DevOps Services (Cloud) uniquement, conformément à la décision Cloud-only de v0.2.0 (constitution v0.3.0 §1).

**Scopes.** Minimum nécessaire :
- `vso.work_full` : CRUD Work Items (Test Cases, Plans, etc.) + Attachments
- `vso.profile` : récupération de l'identité de l'utilisateur courant pour les permissions
- `vso.code` : lecture des feature files Gherkin dans Azure Repos (sync BDD)
- `vso.extension.data_write` : ExtensionDataService pour la config légère
- `vso.identity` : résolution des permissions (cf. §6 constitution, dérivation des rôles)

### 2.2 Détection runtime Cloud vs Server

```typescript
// packages/testvault-sdk/src/runtime-detection.ts
import * as SDK from "azure-devops-extension-sdk";

export type AdoEnvironment =
  | { type: "cloud"; orgUrl: string }
  | { type: "server"; collectionUrl: string; version: string };

export async function detectEnvironment(): Promise<AdoEnvironment> {
  await SDK.ready();
  const host = SDK.getHost();
  const url = host.serverUrl ?? "";

  // Cloud : *.dev.azure.com ou *.visualstudio.com
  if (/\.dev\.azure\.com$|\.visualstudio\.com$/i.test(new URL(url).hostname)) {
    return { type: "cloud", orgUrl: url };
  }

  // Server : tout le reste, avec extraction de la version via API
  const versionInfo = await fetchServerVersion(url);
  return { type: "server", collectionUrl: url, version: versionInfo };
}
```

Cette détection conditionne :
- L'affichage des features Cloud-Plus (cachées sur Server)
- L'utilisation d'index local (Cloud) vs `ContentMatchesIndex` (Server) dans la recherche
- La fréquence de validation de licence (24h Cloud, 7j Server)

### 2.3 Couche d'abstraction des appels ADO

Tous les accès aux ressources ADO passent par un service unifié qui adapte les appels selon Cloud/Server :

```typescript
// packages/testvault-sdk/src/ado-client.ts
import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";

export interface IAdoClient {
  fetchTestCase(id: number): Promise<TestVaultTestCase>;
  saveTestCase(tc: TestVaultTestCase): Promise<TestVaultTestCase>;
  searchByWiql(query: string, opts?: { top?: number }): Promise<WorkItemRef[]>;
  uploadAttachment(blob: Blob, filename: string): Promise<EvidenceRef>;
  // ...
}

export function createAdoClient(env: AdoEnvironment): IAdoClient {
  const witClient = getClient(WorkItemTrackingRestClient);

  return {
    async searchByWiql(query, opts) {
      // Limite WIQL native ADO : 20 000 résultats / requête
      // → pagination automatique au-delà (cf. constitution §4)
      const result = await witClient.queryByWiql({ query }, { top: opts?.top ?? 1000 });
      return result.workItems ?? [];
    },
    // ... autres méthodes
  };
}
```

---

## 3. Custom Process Inheritance — schéma WIT

### 3.1 Méthodologie d'installation

L'extension doit créer un **Process Inheritance** dérivé d'un process système (Agile, Scrum, ou CMMI) et y ajouter les Custom WIT TestVault. L'installation se fait via le **wizard intégré** (cf. spec US-6.1) qui appelle l'API REST `Process` :

- `POST /_apis/work/processes` pour créer un nouveau process inherité
- `POST /_apis/work/processes/{processId}/workItemTypes` pour ajouter chaque Custom WIT
- `POST /_apis/work/processes/{processId}/workItemTypes/{witRefName}/fields` pour ajouter les champs custom
- `POST /_apis/work/processes/{processId}/workItemTypes/{witRefName}/states` pour les états custom
- `PATCH /_apis/projects/{projectId}` pour assigner le process aux projets cibles

### 3.2 Liste exhaustive des Custom WIT

| Reference Name | Display Name | Étend | Hérite ? |
|---|---|---|---|
| `TestVault.TestCase` | Test Case (Argos) | (nouveau) | non |
| `TestVault.TestCaseVersion` | Test Case Version (Argos) | (nouveau) | non |
| `TestVault.TestPlan` | Test Plan (Argos) | (nouveau) | non |
| `TestVault.TestSet` | Test Set (Argos) | (nouveau) | non |
| `TestVault.Precondition` | Precondition (Argos) | (nouveau) | non |
| `TestVault.TestExecution` | Test Execution (Argos) | (nouveau) | non |
| `TestVault.AuditLog` | Audit Log (Argos) | (nouveau) | non |

Note : on ne **dérive pas** des types existants `Microsoft.VSTS.WorkItemTypes.TestCase` ou `Microsoft.VSTS.WorkItemTypes.TestPlan` pour éviter conflits avec Microsoft Test Plans natifs. Coexistence pacifique sur le même projet.

### 3.3 Détail des champs `TestVault.TestCase`

| Reference Name | Display | Type | Required | Defaults / Allowed |
|---|---|---|---|---|
| `System.Title` | Title | String (255) | ✅ | — |
| `System.Description` | Description | HTML (markdown rendu) | non | — |
| `System.AreaPath` | Area Path | TreePath | ✅ | racine projet |
| `System.IterationPath` | Iteration | TreePath | non | — |
| `System.AssignedTo` | Assigned To | Identity | non | — |
| `System.Tags` | Tags | String (tags multi) | non | — |
| `System.State` | State | String | ✅ | Design / Ready / Active / Closed / Deprecated |
| `TestVault.Priority` | Priority | Picklist Int | ✅ | 1 (Critical) / 2 / 3 / 4 (Trivial) ; défaut 3 |
| `TestVault.Steps` | Steps | LongText (JSON sérialisé `TestStep[]`) | non | — |
| `TestVault.AutomationStatus` | Automation Status | Picklist String | ✅ | Manual / Planned / Automated ; défaut Manual |
| `TestVault.AutomationKey` | Automation Key | String (500) | non | — |
| `TestVault.Gherkin` | Gherkin | LongText | non | — |
| `TestVault.EstimatedDuration` | Estimated Duration (min) | Integer | non | — |
| `TestVault.PreconditionLinks` | Preconditions | LongText (JSON `number[]`) | non | — |

**Pourquoi `TestVault.Steps` en JSON sérialisé plutôt qu'un type relationnel ADO ?** Les Work Items ADO ne supportent pas nativement des sous-collections typées éditables. Stocker le JSON dans un champ `LongText` permet : performance (1 round-trip pour CRUD), validation côté extension, simplicité du modèle. Trade-off : la lecture native dans la vue Work Item ADO affichera du JSON brut — atténué par un control custom (cf. §3.6).

### 3.4 États et transitions `TestVault.TestCase`

```
Design → Ready → Active → Closed
                ↓        ↑
              Deprecated ←┘
```

Règles de transition :
- `Design → Ready` : autorisé à tous les rôles ayant Edit sur le WI
- `Ready → Active` : auto-transition au premier `TestExecution` lié
- `Active → Closed` : explicite, demande commentaire de raison
- `Closed → Deprecated` : auto au déprécation BDD ou manuel par Admin
- `Deprecated → Closed` : interdit (deprecation est terminale)

### 3.5 Schéma `TestVault.TestExecution` — points sensibles

| Reference Name | Type | Particularité |
|---|---|---|
| `TestVault.TestPlanId` | Integer | référence faible (un Test Plan supprimé n'invalide pas l'historique) |
| `TestVault.TestCaseId` | Integer | référence forte (lien parent-child) |
| `TestVault.TestCaseVersionId` | Integer | NULL si Test Plan non locked, valorisé sinon |
| `TestVault.Environment` | String (100) | string libre validée côté extension |
| `TestVault.GlobalStatus` | Picklist | Pass / Fail / Blocked / Unexecuted / Skipped |
| `TestVault.StepResults` | LongText | JSON sérialisé `TestStepResult[]` |
| `TestVault.ExecutionSource` | Picklist | Manual / CI / Webhook |
| `TestVault.CiPipelineRunId` | String (200) | non vide si Source = CI ou Webhook |
| `TestVault.CiPipelineUrl` | String (500) | URL cliquable du run CI |
| `TestVault.CiPayloadHash` | String (64) | SHA-256 du payload reçu, anti-rejeu |
| `TestVault.DurationSeconds` | Integer | optionnel |

**Immutabilité.** Une `TestExecution` est immutable après save (constitution §3.3 et spec §3.5). Implémentation : règle de Process ADO interdisant tout `PATCH` après le premier save (`AllowExistingValue=false` sur tous les champs sauf `System.Tags` qui reste éditable pour permettre le tag manuel "Re-reviewed"). Tentative d'édition côté API → 403.

### 3.6 Custom Controls dans le formulaire WI ADO natif

Pour que les Test Cases restent **lisibles et utilisables sans l'extension Argos** (conformément à la constitution §9 souveraineté), on fournit deux contributions de control :

```jsonc
{
  "id": "argos-steps-editor",
  "type": "ms.vss-work-web.work-item-form-control",
  "targets": ["ms.vss-work-web.work-item-form"],
  "properties": {
    "name": "Steps editor (Argos)",
    "uri": "dist/widgets/steps-editor/index.html",
    "inputs": [{ "id": "FieldName", "name": "TestVault.Steps" }]
  }
},
{
  "id": "argos-step-results-viewer",
  "type": "ms.vss-work-web.work-item-form-control",
  "targets": ["ms.vss-work-web.work-item-form"],
  "properties": {
    "name": "Step results viewer (Argos)",
    "uri": "dist/widgets/step-results-viewer/index.html",
    "inputs": [{ "id": "FieldName", "name": "TestVault.StepResults" }]
  }
}
```

Si Argos est désinstallé : les contrôles disparaissent, les champs JSON restent visibles tels quels. Toujours lisibles, toujours requêtables en WIQL.

---

## 4. Contrat WIT TestVault ↔ TestPulse

### 4.1 Principe du contrat

Le schéma Custom WIT est le **point d'intégration unique** entre TestVault (qui écrit) et TestPulse (qui lit). Ce contrat est **versionné**, **documenté publiquement** dans `docs/wit-schema.md`, et son évolution suit semver strict.

### 4.2 Spécification du contrat (extrait de `docs/wit-schema.md`)

```yaml
# TestVault WIT Schema Contract
# Version: 1.0.0
# Stability: STABLE — breaking changes require major version bump
# Consumed by: TestPulse 2.0+

schema:
  version: "1.0.0"

  workItemTypes:
    - refName: TestVault.TestCase
      requiredFields:
        - System.Title
        - System.AreaPath
        - System.State
        - TestVault.Priority
        - TestVault.AutomationStatus
      optionalFields:
        - TestVault.Steps                # JSON serialized TestStep[]
        - TestVault.AutomationKey
        - TestVault.Gherkin
        - TestVault.EstimatedDuration
        - TestVault.PreconditionLinks
      stateValues: [Design, Ready, Active, Closed, Deprecated]
      links:
        - type: TestVault.TestedBy        # bidirectional with User Story / Bug / Requirement
        - type: TestVault.Validates
        - type: TestVault.Covers
        - type: TestVault.PreconditionOf
        - type: TestVault.SnapshotOf      # to TestVault.TestCaseVersion

    - refName: TestVault.TestExecution
      immutability: "after-first-save"
      # ...

  jsonContracts:
    TestStep:
      type: object
      properties:
        index: { type: integer }
        action: { type: string, format: markdown }
        expected: { type: string, format: markdown }
      required: [index, action, expected]

    TestStepResult:
      type: object
      properties:
        stepIndex: { type: integer }
        status: { enum: [Pass, Fail, Blocked, Skipped] }
        comment: { type: string, optional: true }
        evidenceIds: { type: array, items: string }
      required: [stepIndex, status]

  evolutionPolicy:
    minor:
      - addField: optional fields can be added
      - addLinkType: new link types can be added
      - addStateValue: new state values can be added (additive only)
    major:
      - removeField
      - removeLinkType
      - removeStateValue
      - changeFieldType
      - changeStateTransitionRules
```

### 4.3 Mécanisme de découverte côté TestPulse

```typescript
// dans TestPulse, package testpulse-ui-shared
import { getSchemaVersion } from "@atconseil/testvault-types";

const schema = await getSchemaVersion(projectId);
if (semver.gte(schema, "1.0.0") && semver.lt(schema, "2.0.0")) {
  // mode "TestVault enrichi"
} else {
  // mode "Test Plans natifs Microsoft"
}
```

La détection de la version installée se fait via :
1. Inspection des Custom WIT présents dans le process du projet (appel API Process)
2. Lecture d'un champ marqueur `TestVault.SchemaVersion` sur un Work Item de type "AuditLog" système créé à l'install

### 4.4 Migration de schéma (vX → vX+1)

Procédure obligatoire (cf. constitution §9) :

1. Détection automatique de la version actuelle au démarrage de l'extension
2. Si gap, l'Admin TestVault est notifié
3. Wizard de migration : preview du diff schéma, validation
4. Exécution batchée par chunks de 200 WI (compat limite WIQL)
5. Idempotence garantie : la migration peut être interrompue et reprise
6. Rollback documenté (snapshot de pre-migration via export complet)
7. Test E2E obligatoire dans la CI sur instance ADO réelle avant publication

---

## 5. WIQL — requêtes types

Les WIQL ci-dessous sont packagés dans le SDK comme constantes nommées et testés contre instances ADO réelles dans la CI.

### 5.1 Récupérer tous les Test Cases d'un Test Plan locked

```sql
SELECT [System.Id], [System.Title], [System.State], [TestVault.Priority]
FROM workitemLinks
WHERE [Source].[System.Id] = @planId
  AND [Source].[System.WorkItemType] = 'TestVault.TestPlan'
  AND [Target].[System.WorkItemType] = 'TestVault.TestCaseVersion'
  AND [System.Links.LinkType] = 'TestVault.SnapshotOf'
ORDER BY [Target].[System.Title]
MODE (Recursive)
```

### 5.2 Coverage : exigences couvertes vs non couvertes

```sql
SELECT [System.Id], [System.Title]
FROM workitemLinks
WHERE [Source].[System.WorkItemType] IN ('User Story', 'Bug', 'Requirement')
  AND [Source].[System.AreaPath] UNDER @areaPath
  AND [Target].[System.WorkItemType] = 'TestVault.TestCase'
  AND [System.Links.LinkType] IN ('TestVault.TestedBy', 'TestVault.Validates', 'TestVault.Covers')
MODE (MustContain)
```

### 5.3 Test Executions failed sur les dernières 24 heures

```sql
SELECT [System.Id], [System.Title], [TestVault.GlobalStatus], [TestVault.Environment]
FROM workitems
WHERE [System.WorkItemType] = 'TestVault.TestExecution'
  AND [TestVault.GlobalStatus] = 'Fail'
  AND [System.ChangedDate] >= @today - 1
ORDER BY [System.ChangedDate] DESC
```

### 5.4 Recherche full-text — Cloud

**Cloud** (pas de full-text natif WIQL) :
```sql
-- Étape 1 : récupérer un set candidat large
SELECT [System.Id], [System.Title], [TestVault.Steps]
FROM workitems
WHERE [System.WorkItemType] = 'TestVault.TestCase'
  AND [System.AreaPath] UNDER @areaPath
ORDER BY [System.ChangedDate] DESC
```
puis filtrage côté client via index local (MiniSearch ou Lunr) construit en lazy à l'ouverture du hub.

### 5.5 Pagination automatique au-delà de 20 000 résultats

```typescript
// packages/testvault-sdk/src/wiql-paginator.ts
export async function* paginatedWiqlSearch(
  client: IAdoClient,
  query: string,
  pageSize = 1000
): AsyncGenerator<WorkItemRef[]> {
  let offset = 0;
  while (true) {
    const page = await client.searchByWiql(query, { top: pageSize, skip: offset });
    if (page.length === 0) break;
    yield page;
    if (page.length < pageSize) break;
    offset += pageSize;
    if (offset >= 20_000) {
      // limite ADO atteinte — bascule en stratégie "by area path subdivision"
      // documentée dans docs/operator-guide.md
      break;
    }
  }
}
```

---

## 6. API REST Cloud-Plus + OpenAPI

### 6.1 Périmètre des endpoints

L'API Cloud-Plus est **uniquement disponible sur ADO Cloud** (le client Server n'y a pas accès). Endpoints documentés dans une spec OpenAPI 3.1 versionnée `/v1/...`.

| Catégorie | Endpoints | Auth |
|---|---|---|
| LLM Proxy | `POST /v1/llm/generate-test-cases`, `POST /v1/llm/analyze-flakiness` | Bearer (PAT signé) |
| Webhooks CI | `POST /v1/webhooks/{token}` | HMAC-SHA256 |
| Jobs | `GET /v1/jobs/{id}`, `POST /v1/jobs/refresh-aggregations` | Bearer |
| Health | `GET /v1/health`, `GET /v1/version` | public |

### 6.2 Spec OpenAPI 3.1 — extrait

```yaml
openapi: 3.1.0
info:
  title: Argos Cloud-Plus API
  version: 1.0.0
  description: Cloud-Plus features for the Argos extension. Cloud-only.
servers:
  - url: https://api.argos.atconseil.io/v1
    description: Production
  - url: https://api-staging.argos.atconseil.io/v1
    description: Staging

components:
  securitySchemes:
    PatBearer:
      type: http
      scheme: bearer
      bearerFormat: ADO PAT (signed by extension)
    WebhookHmac:
      type: apiKey
      in: header
      name: X-Argos-Signature

  schemas:
    GenerateTestCasesRequest:
      type: object
      required: [orgUrl, projectId, sourceWorkItemId, providerId, modelId]
      properties:
        orgUrl: { type: string, format: uri }
        projectId: { type: string, format: uuid }
        sourceWorkItemId: { type: integer }
        providerId: { type: string }
        modelId: { type: string }
        params:
          type: object
          properties:
            temperature: { type: number, minimum: 0, maximum: 1, default: 0.3 }
            maxTokens: { type: integer, default: 4000 }
            count: { type: integer, minimum: 1, maximum: 10, default: 5 }
        systemPromptOverride: { type: string }

    GenerateTestCasesResponse:
      type: object
      properties:
        candidates:
          type: array
          items:
            $ref: '#/components/schemas/TestCaseCandidate'
        usage:
          type: object
          properties:
            inputTokens: { type: integer }
            outputTokens: { type: integer }
            quotaRemaining: { type: integer }

paths:
  /llm/generate-test-cases:
    post:
      summary: Generate Test Case candidates from a Work Item using BYOK LLM
      security: [{ PatBearer: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/GenerateTestCasesRequest' }
      responses:
        '200':
          description: Candidates generated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GenerateTestCasesResponse' }
        '402':
          description: Quota exceeded
        '424':
          description: LLM provider error (with fallback if configured)
```

### 6.3 Génération automatique du contrat

> **⚠️ DEFERRED (cf. §7 et constitution §6.0)** — Ce pipeline OpenAPI dépend du backend Azure Functions, lui-même **DEFERRED / non implémenté** (Argos est 100 % client-side). Les points ci-dessous ne s'appliqueront que si ce backend est un jour livré ; aucun n'est actif aujourd'hui.

- La spec OpenAPI serait **générée depuis le code** des Azure Functions via `@anatine/zod-openapi` (constitution §3.4 : "OpenAPI générée à partir du code")
- La CI publierait la spec sur `https://api.argos.atconseil.io/v1/openapi.json` à chaque release
- Tests contractuels via Schemathesis ou Dredd dans la CI bloquante (constitution §10.3)

---

## 7. Backend (Azure Functions) - DEFERRED indefiniment

**STATUT : DEFERRED (decision strategique 2026-05-22)**

Cette section etait prevue pour la Phase 6. Suite a la decision
strategique vendredi 2026-05-22, Argos reste 100% client-side
(cf. constitution §6.0).

**Donc :**
- Pas de deploiement Azure Functions
- Pas d'endpoint serveur Argos
- Pas de crypto BYOK side-server (T-6.2)
- Pas de routing serveur LLM (T-6.3)

**Conservation pour reference future :** si la demande emerge pour
un mode "Argos hosted" en Phase 6+, le design ci-dessous reste valide.
Pour l'instant : NOT IN SCOPE.

### 7.1 Topologie de déploiement

```
[Extension Argos] (navigateur)
       │
       │ HTTPS (Bearer PAT signé HMAC short-lived)
       ▼
[Azure Front Door] ──► [Azure Functions Premium Plan]
                             │
                             ├─► /v1/llm/* ────► [LLM Provider client] ──► Anthropic API / OpenAI API / Azure OpenAI
                             │                          │
                             │                          └─► Quota check via Azure Table Storage
                             │
                             ├─► /v1/webhooks/* ──► [HMAC validator] ──► Queue (Azure Storage Queue) ──► [Worker Function] ──► ADO REST API du client
                             │
                             ├─► /v1/jobs/* ────► [Timer triggers] ──► ADO REST API du client
                             │
                             └─► Application Insights (telemetry)
                                       │
                                       └─► Pas de payload métier, jamais
```

### 7.2 Choix de plan d'hébergement

- **Premium Plan** plutôt que Consumption. Justification :
  - Cold starts éliminés (UX critique pour la latence LLM, cf. constitution §4)
  - VNet integration possible (pour clients enterprise demandant une isolation réseau)
  - Pricing prévisible avec slots warm

- **Région primaire** : `francecentral` (souveraineté UE par défaut). Réplication active-passive vers `westeurope` pour DR.

- **Runtime** : Azure Functions v4, Node.js 22 LTS (cf. constitution §2 et §10.5).

### 7.3 Endpoint `POST /v1/llm/generate-test-cases` — flux

```typescript
// apps/argos-functions/src/llm-proxy/generate-test-cases.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { z } from "zod";
import { decryptApiKey } from "../shared/crypto";
import { checkAndDecrementQuota } from "../shared/quota";
import { callLlm } from "../shared/llm-client";

const Schema = z.object({
  orgUrl: z.string().url(),
  projectId: z.string().uuid(),
  sourceWorkItemId: z.number().int().positive(),
  providerId: z.string(),
  modelId: z.string(),
  params: z.object({
    temperature: z.number().min(0).max(1).default(0.3),
    maxTokens: z.number().int().positive().default(4000),
    count: z.number().int().min(1).max(10).default(5),
  }).default({}),
  systemPromptOverride: z.string().optional(),
});

async function handler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const body = Schema.parse(await req.json());

  // 1. Validation du PAT signé (HMAC short-lived, max 5 min de TTL)
  const pat = await validateSignedPat(req.headers.get("authorization"));

  // 2. Récupération du Work Item source via PAT du client
  const sourceWi = await fetchWorkItem(body.orgUrl, body.projectId, body.sourceWorkItemId, pat);
  if (!sourceWi.title || sourceWi.description.length < 50) {
    return { status: 400, body: "Source Work Item too short" };
  }

  // 3. Vérification du quota pour cet utilisateur
  const quota = await checkAndDecrementQuota({
    orgUrl: body.orgUrl,
    userId: pat.userId,
    feature: "tc-generation",
  });
  if (!quota.allowed) {
    return { status: 402, body: { error: "QUOTA_EXCEEDED", remaining: 0 } };
  }

  // 4. Récupération de la clé LLM chiffrée + déchiffrement éphémère
  const providerConfig = await fetchProviderConfig(body.orgUrl, body.providerId);
  const apiKey = await decryptApiKey(providerConfig.apiKeyEncrypted, body.orgUrl);

  // 5. Appel LLM (streaming si possible)
  try {
    const llmResponse = await callLlm({
      provider: providerConfig.type,
      apiKey,
      modelId: body.modelId,
      messages: buildMessages(sourceWi, body.systemPromptOverride),
      params: body.params,
    });

    // 6. Validation de la réponse JSON parseable
    const candidates = parseAndValidateCandidates(llmResponse.content, body.params.count);

    return {
      status: 200,
      jsonBody: {
        candidates,
        usage: {
          inputTokens: llmResponse.usage.inputTokens,
          outputTokens: llmResponse.usage.outputTokens,
          quotaRemaining: quota.remaining,
        },
      },
    };
  } finally {
    // 7. Effacement immédiat de la clé du contexte mémoire
    apiKey.fill?.(0);
  }
}

app.http("generate-test-cases", {
  methods: ["POST"],
  route: "v1/llm/generate-test-cases",
  authLevel: "anonymous", // auth gérée manuellement en handler
  handler,
});
```

**Garanties de la fonction :**

- Aucune persistance des prompts ni des réponses LLM (cache TTL ≤ 1h via clé hash uniquement)
- Effacement explicite de la clé API en mémoire après usage
- Telemetry sans payload (constitution §5)
- Quota décrémenté **avant** appel LLM pour éviter les abus
- Retry idempotent en cas de réponse JSON malformée (max 1 retry)
- Fallback sur provider secondaire si configuré et primary down

### 7.4 Endpoint `POST /v1/webhooks/{token}` — ingestion CI externe

```typescript
async function webhookHandler(req: HttpRequest): Promise<HttpResponseInit> {
  const token = req.params.token;
  const signature = req.headers.get("x-argos-signature");
  const body = await req.text(); // raw body pour signature

  // 1. Lookup du webhook receiver (org, project, planId par défaut)
  const receiver = await fetchWebhookReceiver(token);
  if (!receiver) return { status: 404 };

  // 2. Validation HMAC SHA-256
  const expected = hmacSha256(body, receiver.secret);
  if (!safeCompare(expected, signature)) {
    await auditWebhookRejected(receiver.orgUrl, "INVALID_SIGNATURE");
    return { status: 401 };
  }

  // 3. Rate limit (par receiver token, défaut 100 req/min)
  const rateOk = await checkRateLimit(token);
  if (!rateOk) return { status: 429 };

  // 4. Parse + détection format (JUnit XML / Cucumber JSON / NUnit / xUnit)
  const parsed = parseAnyFormat(body);

  // 5. Push en queue pour traitement asynchrone
  await enqueueIngestion({ receiver, payload: parsed });

  return { status: 202, jsonBody: { queued: true } };
}
```

### 7.5 Worker function (queue trigger)

```typescript
async function ingestionWorker(message: IngestionMessage, ctx: InvocationContext) {
  const { receiver, payload } = message;

  // 1. Recharge de la clé PAT du tenant (chiffrée)
  const pat = await decryptPat(receiver.encryptedPat);

  // 2. Pour chaque test case du payload : lookup ou création conditionnelle
  for (const tc of payload.testCases) {
    const matched = await lookupTestCase(receiver.orgUrl, receiver.projectId, tc, pat);
    if (matched) {
      await createTestExecution(receiver.orgUrl, matched.id, tc, pat);
    } else if (receiver.autoCreate) {
      await createTestCaseSkeleton(receiver.orgUrl, receiver.projectId, tc, pat);
    } else {
      ctx.log.warn(`No match for test case ${tc.fullyQualifiedName}, skipped`);
    }
  }
}
```

### 7.6 Timer triggers (jobs)

| Job | Cadence | Description |
|---|---|---|
| `refresh-aggregations` | 0 0 2 * * * (2h UTC) | Recalcule les métriques globales par projet pour TestPulse |
| `flakiness-detector` | 0 0 6 * * 1 (lundi 6h UTC) | Pour chaque org abonnée, lance l'analyse de flakiness sur les TC actifs |
| `quota-reset` | 0 0 0 1 * * (1er du mois) | Reset des compteurs de quota AI mensuel |
| `audit-retention` | 0 0 3 * * * | Purge les `TestVault.AuditLog` au-delà de la rétention configurée |

---

## 8. Module crypto BYOK - SIMPLIFIE

**STATUT : SIMPLIFIE - encryption native ADO (decision 2026-05-22)**

Cette section etait prevue pour Phase 6 avec un module crypto custom
(AES-256-GCM + HKDF par org). Suite a la decision strategique, le
mecanisme est simplifie :

**Approche actuelle (Sprint 2.21+) :**
- Les cles API LLM sont stockees via **ADO Extension Data Service**
- Microsoft gere l'encryption at rest (chiffrement natif ADO)
- Argos ne voit JAMAIS la cle en clair (recuperee a la volee pour
  chaque call LLM)
- Pas de masterkey, pas de HKDF, pas de gestion crypto custom

**Beneficies :**
- Securite garantie par Microsoft (ISO 27001, SOC 2, etc.)
- Pas de surface d'attaque crypto custom
- Pas de gestion de cles (rotation, backup)
- Conforme RGPD via ADO data residency

**Note future :** si backend Argos en Phase 6+, le design crypto
custom redeviendrait pertinent pour transmettre les cles
client -> serveur. Pas dans le scope actuel.

### 8.1 Modèle de chiffrement

Conformément à la constitution §5 :

- Chiffrement **AES-256-GCM** pour toutes les clés API LLM stockées dans ExtensionDataService
- Clé de chiffrement **dérivée par organisation ADO** (pas de master key globale)
- Dérivation : `OrgKey = HKDF-SHA256(MasterKey, salt=orgId, info="argos-llm-byok-v1")`
- `MasterKey` stockée dans **Azure Key Vault** (HSM-backed, accès limité aux Function Apps via Managed Identity)

### 8.2 Format de stockage dans ExtensionDataService

```typescript
interface EncryptedApiKey {
  version: 1;                    // version du schéma de chiffrement
  algorithm: "AES-256-GCM";
  ciphertext: string;            // base64
  iv: string;                    // base64 (12 bytes)
  authTag: string;               // base64 (16 bytes)
  maskedSuffix: string;          // 4 derniers caractères pour affichage UI
  encryptedAt: string;           // ISO UTC
  encryptedBy: string;           // user ID Admin qui a configuré la clé
}
```

### 8.3 Cycle de vie d'une clé API

```
[Admin saisit clé] ──► [Validation provider via test call] ──► [Chiffrement OrgKey + AES-256-GCM] ──► [Stockage ExtensionDataService scope org]
                                                                                                                  │
                                                                                                                  ▼
                                                                                                  [TestVault.AuditLog : "llm.provider.add"]

[Appel /v1/llm/*] ──► [Lecture ciphertext] ──► [Déchiffrement éphémère via OrgKey] ──► [Appel LLM] ──► [Buffer.fill(0) immédiatement après]
```

### 8.4 Rotation des clés

- L'Admin peut rotater à tout moment (UI : "Rotate key" sur un provider)
- Old key et new key coexistent durant un grace period de 24h (pour éviter de casser les jobs en cours)
- Au bout de 24h, l'ancienne clé est purgée et un événement `llm.provider.rotate-complete` est journalisé

### 8.5 Cas spécifique Azure OpenAI Enterprise

Pour les clients sous contrat enterprise Azure OpenAI : possibilité de configurer une **Managed Identity côté client** au lieu d'une clé API. Argos utilise alors un token éphémère obtenu via Federated Identity. Cette option élimine la nécessité de stocker une clé.

---

## 9. Stratégie de tests

### 9.1 Pyramide de tests

```
                  ┌──────────────┐
                  │  E2E (~50)   │   Playwright vs ADO réel
                  └──────────────┘
              ┌──────────────────────┐
              │  Intégration (~300)  │   Vitest + nock vs API ADO mockée
              └──────────────────────┘
        ┌──────────────────────────────────┐
        │  Unitaires (~3000)               │   Vitest sur logique pure
        └──────────────────────────────────┘
```

Cibles de couverture : **90% core / 80% UI** (constitution §10.1), bloquant en CI.

### 9.2 Tests unitaires

**Outil :** Vitest avec mode `--coverage` via Istanbul/c8.

**Périmètre :**
- Logique métier pure (parsing, calcul de statuts, dérivation de rôles)
- Validation de schéma (Zod)
- Helpers WIQL (construction de requêtes)
- Algorithmes de diff snapshots (LCS sur steps)
- Cryptographie (chiffrement/déchiffrement, dérivation)

**Convention :** un fichier `*.test.ts` à côté de chaque source. Test names lisibles en anglais, pattern Given/When/Then dans les `describe`/`it`.

### 9.3 Tests d'intégration

**Outils :** Vitest + `msw` (Mock Service Worker) pour simuler l'API ADO REST.

**Périmètre :**
- Adapter `IAdoClient` complet (CRUD WI, attachments, WIQL, Process API)
- Pagination WIQL au-delà de 20 000 résultats (mock)
- Sérialisation/désérialisation des champs JSON (`Steps`, `StepResults`)
- Gestion des erreurs ADO (401, 403, 429, 500)
- Cycle d'install/uninstall du Custom Process

### 9.4 Tests E2E

**Outils :** Playwright. **Instance cible maintenue** par ATConseil :

- `argos-test.dev.azure.com` (ADO Cloud, organisation de test dédiée, données reset chaque nuit)

**Parcours critiques couverts :**

1. Install Custom Process via wizard (Cloud)
2. Création d'un Test Case complet, sauvegarde, relecture
3. Création d'un Test Plan, lock avec snapshot, exécution manuelle d'un TC, attachement d'evidence, save run
4. Import CSV de 1000 Test Cases, vérification de la pagination
5. Upload résultats JUnit XML via CLI, vérification des Test Executions créées
6. Génération AI de Test Cases (Cloud uniquement, mock LLM en E2E pour stabilité)
7. Configuration BYOK (ajout provider, rotation, suppression) avec audit trail
8. Désactivation globale AI : vérification que tous les boutons disparaissent
9. Désinstallation extension : vérification que les WI restent lisibles

**Cadence :** suite complète à chaque PR sur `main`, smoke E2E à chaque PR sur `develop`.

### 9.5 Tests contractuels API

**Outil :** Schemathesis (génère des tests à partir de la spec OpenAPI).

**Bloquants en CI :**
- Toutes les routes documentées répondent
- Les schémas de réponse correspondent aux schémas déclarés
- Les codes d'erreur sont conformes
- Aucune régression de contrat

### 9.6 Tests de non-régression

Conformément à la constitution §10.4 :

- Dossier dédié `tests/regression/` avec convention de nommage `bug-NNN.test.ts` où NNN est l'ID du bug
- Chaque bug confirmé en prod ajoute un test à cette suite **avant** le fix (TDD strict §10.1)
- Suite exécutée à chaque PR, bloquante

### 9.7 Tests de vérification des API externes (release candidate)

À chaque RC, suite spécifique exécutée (constitution §10.3) :

- **ADO REST API** : ping de chaque endpoint utilisé (50+ routes), validation des schémas attendus (snapshots JSON Schema)
- **Microsoft Entra ID** : flow OAuth complet sur instance test
- **LLM providers** : appel light de validation par provider (Anthropic `/messages` avec ping, OpenAI `/chat/completions`, Azure OpenAI `/openai/deployments/{id}/chat/completions`)
- **Vérification dépréciation modèles** : pour chaque modèle par défaut configuré, scrap de la doc fournisseur (Anthropic `https://docs.claude.com`, OpenAI `https://platform.openai.com/docs/models`) et alerte si le modèle est listé comme deprecated

Si un de ces tests rouge, la RC est bloquée et une issue est ouverte automatiquement.

### 9.8 Tests de charge

**Outil :** k6.

**Scénarios :**
- 100 users simultanés ouvrant un Test Plan de 1000 TC : doit tenir < 3s p95
- Import de 10 000 TC : doit terminer en < 10 minutes
- 1000 webhooks CI/min en burst : doit absorber sans 5xx

Cadence : à chaque release candidate, et hebdomadaire sur staging.

---

## 10. Pipeline CI/CD & publication Marketplace

### 10.1 Topologie GitHub Actions

```
.github/workflows/
├── ci-pr.yml                # à chaque PR : lint, typecheck, unit, integration
├── ci-main.yml              # à chaque push main : ci-pr + E2E full + load test smoke
├── release-rc.yml           # déclenché manuellement : RC checklist complète
├── release-publish.yml      # déclenché manuellement après RC verte : publication Marketplace + npm
├── nightly.yml              # cron quotidien : suite régression complète, vérif APIs externes
└── dependabot.yml           # config auto-merge security updates
```

### 10.2 Étapes du job de publication Marketplace

```yaml
# .github/workflows/release-publish.yml (extrait)
jobs:
  publish-marketplace:
    runs-on: ubuntu-latest
    needs: [release-checklist]      # bloque si checklist constitution §11 rouge
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install pnpm + dependencies
        run: |
          corepack enable
          pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm turbo build

      - name: Generate SBOM (CycloneDX)
        run: pnpm dlx @cyclonedx/cyclonedx-npm --output-file sbom.json
        # SBOM publié en artifact + attaché à la release GitHub (constitution §10.5)

      - name: Package VSIX
        run: |
          npm install -g tfx-cli
          tfx extension create --manifest-globs apps/argos-extension/vss-extension.json \
            --output-path ./dist/argos.vsix

      - name: Verify checklist constitution §11
        run: pnpm run release:verify-checklist
        # script qui vérifie chaque case bloquante de la constitution

      - name: Publish to Marketplace
        run: |
          tfx extension publish --vsix ./dist/argos.vsix \
            --token ${{ secrets.MARKETPLACE_PAT }}

      - name: Publish SDK + CLI on npm
        run: |
          pnpm --filter @atconseil/testvault-sdk publish --access public
          pnpm --filter @atconseil/testvault-cli publish --access public

      # ⚠️ DEFERRED (cf. §7 + constitution §6.0) — Argos est 100% client-side.
      #    Ce step n'est PAS actif ; il ne sera réintroduit que si/quand le
      #    backend Cloud-Plus DEFERRED est implémenté.
      - name: Deploy Azure Functions (Cloud-Plus) [DEFERRED — not active]
        if: false # backend Cloud-Plus DEFERRED (constitution §6.0)
        uses: azure/functions-action@v1
        with:
          app-name: argos-cloud-plus-prod
          package: apps/argos-functions
          publish-profile: ${{ secrets.AZURE_FUNCTIONS_PROFILE }}

      - name: Generate + publish OpenAPI
        run: pnpm run openapi:publish
        # publie sur https://api.argos.atconseil.io/v1/openapi.json
```

### 10.3 Stratégie de releases

- **SemVer strict** sur tous les packages
- **Cycle de release** : majeur ~tous les 12 mois, mineur ~tous les 2 mois, patch à la demande
- **Fenêtre de bêta** de 2 semaines avant tout majeur, sur opt-in via flag d'organisation
- **Rollback** : possibilité de republier la version N-1 sur Marketplace dans les 24h suivant un majeur problématique

### 10.4 Gestion des secrets

- Secrets dans **GitHub Encrypted Secrets** + **Azure Key Vault** (référencés via `azure/keyvault@v1` dans les workflows)
- Aucun secret en clair dans le repo, jamais. Pre-commit hook `gitleaks` bloquant.
- PATs Marketplace en rotation tous les 90 jours
- Clés de signature VSIX en HSM Azure Key Vault

### 10.5 Branching strategy

- `main` : code déployé en production (extension stable Marketplace + Functions prod)
- `develop` : intégration continue, déployée sur staging à chaque merge
- `feature/*` : branches de développement, mergent dans `develop`
- `hotfix/*` : urgences depuis `main`, mergent dans `main` et `develop`
- `release/x.y.z` : préparation de release, branche éphémère

### 10.6 CHANGELOG et release notes

- Format **Keep a Changelog** maintenu manuellement (constitution §10.2)
- Génération de release notes auto sur GitHub Releases via Changesets
- Publication sur Marketplace : description Markdown reprend les changements user-facing uniquement (pas les détails techniques)

---

> 📝 **Cross-references :** voir `constitution.md` v0.2.3 pour les contraintes immuables. `spec.md` v0.1.0 pour le détail fonctionnel. `tasks.md` (à venir) pour le découpage en phases d'implémentation.

> ⚠️ Toute modification de ce document requiert l'approbation explicite d'Alexandre Thibaud (ATConseil — atconseil.info).
