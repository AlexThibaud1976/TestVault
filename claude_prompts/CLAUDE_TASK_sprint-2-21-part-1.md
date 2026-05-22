# CLAUDE_TASK : Sprint 2.21 partie 1 - AI candidates depuis Test Case form

Repo : E:\Code\TestVault
Branche : feature/sprint-2-21-ai-candidates
Cible : version 0.5.28 (Marketplace + npm)
Estimation : 4-6 heures pour Claude Code

---

## 0. CONTEXTE ET OBJECTIF

### 0.1 Etat avant ce sprint

Sprint 2.20 a livre :
- Real ADO integration (Area Paths + Iterations)
- Edit mode Test Plan
- AreaPathPicker + IterationPicker reutilisables
- TestPlanFormView complete et fonctionnelle

7 WIT ont une UI fonctionnelle (depuis Sprint 2.19).
Architecture mature, design system applique partout.

### 0.2 Objectif Sprint 2.21 partie 1

Implementer la PREMIERE feature USP majeur d'Argos :
generation de test cases assistee par AI.

Workflow utilisateur cible :
1. User ouvre TestCaseFormView (new test case)
2. Click bouton "AI Generate" pres des sections form
3. Modal s'ouvre
4. User selectionne une User Story / Bug / Requirement (work item picker ADO)
5. AI analyse la US et propose N test case candidates
6. User selectionne / edit / rejette suggestions
7. Click "Create N selected" : test cases crees et lies a la US

PORTEE STRICTE Sprint 2.21 partie 1 :
- 1 input source : User Story selectionnee (pas free text, pas existing test)
- LLM provider Azure OpenAI par defaut (architecture multi-provider)
- Cle API stockee dans Settings (user-provided)
- Pas de quota tracking
- Pas de telemetry
- Modal contextuel uniquement (pas de vue separee)

OUT OF SCOPE Sprint 2.21 partie 1 :
- Gherkin editor native -> Sprint 2.21 partie 2 (lundi)
- Generation batch depuis vue dediee -> Sprint 2.22 ou 3.5
- Multi-source input (free text, existing) -> Sprint future
- Backend Azure Functions -> TECH-DEBT-017
- Telemetry tracking -> Sprint future

### 0.3 Vision long terme (a documenter mais hors scope)

```
Sprint 2.22 ou 3.5 : "Generate from User Story" vue dediee
========================================================

WORKFLOW FUTUR :
1. User ouvre une US dans ADO
2. Voit notre Coverage Panel (existant)
3. Click "Generate Test Cases with AI"
4. AI analyse US + acceptance criteria + linked items
5. Genere coverage complete (happy path + edge + error)
6. User valide en bulk
7. Test Cases crees + linked automatiquement

USP narrative : "From User Story to Test Cases in 1 click"
Differentiator unique vs ALL concurrents.

A documenter mais NE PAS implementer Sprint 2.21.
```

### 0.4 Constraints CRITIQUES

```
- TESTVAULT_SCHEMA referenceName : IMMUTABLE
- argos-wit-schema : pas de modification
- WitResolver : utilisation obligatoire pour fields custom
- ASCII strict
- Pas de regression Sprint 2.18-2.20
- Cle API : NEVER logged, NEVER in clear localStorage
- LLM responses : NEVER cached server-side
```

---

## 1. PERIMETRE TECHNIQUE

### 1.1 Fichiers crees / modifies

```
apps/argos-extension/src/hub/llm/
  llm-provider.ts                 [NEW] (interface ILlmProvider)
  azure-openai-provider.ts         [NEW] (implementation Azure OpenAI)
  llm-provider-factory.ts          [NEW] (factory pattern multi-provider)
  prompt-templates.ts              [NEW] (system prompts + few-shot examples)
  test-case-schema.ts              [NEW] (JSON schema pour LLM output)

apps/argos-extension/src/hub/components/
  AiGenerateModal.tsx              [NEW] (modal AI generation)
  WorkItemPicker.tsx               [NEW] (picker US/Bug/Requirement)
  AiSuggestionCard.tsx             [NEW] (card pour 1 suggestion)
  LlmConfigStatus.tsx              [NEW] (badge indiquant si LLM configure)

apps/argos-extension/src/hub/services/
  ado-work-items-service.ts        [NEW] (service GET work items via WIQL)
  ai-generation-service.ts         [NEW] (service orchestrant LLM calls)
  llm-config-service.ts            [NEW] (gestion cle API stockage)

apps/argos-extension/src/hub/hooks/
  use-llm-config.ts                [NEW] (hook config LLM)
  use-ai-generation.ts             [NEW] (hook generation logic)
  use-ado-work-items.ts            [NEW] (hook list work items pour picker)

apps/argos-extension/src/hub/views/
  TestCaseFormView.tsx             [MODIFIED] (ajout button "AI Generate")
  SettingsView.tsx                  [MODIFIED] (ajout section LLM config)

tools/regression/
  T-2.21-llm-provider-pattern.test.ts  [NEW]
  T-2.21-azure-openai-adapter.test.ts  [NEW]
  T-2.21-ai-generation-flow.test.ts    [NEW]
  T-2.21-llm-config-encryption.test.ts [NEW]
```

### 1.2 Pattern multi-provider (adapter)

```typescript
// llm/llm-provider.ts

export interface LlmProviderConfig {
    provider: "azure-openai" | "anthropic" | "openai" | "mistral";
    apiKey: string;
    endpoint?: string;           // Azure OpenAI needs endpoint URL
    deploymentName?: string;      // Azure OpenAI specific
    model?: string;               // For non-Azure providers
}

export interface TestCaseSuggestion {
    title: string;
    description: string;
    priority: "P1" | "P2" | "P3" | "P4";
    steps: Array<{
        action: string;
        expected: string;
    }>;
    tags: string[];
    coverage_type: "happy_path" | "edge_case" | "error_case" | "acceptance_criterion";
}

export interface GenerationContext {
    sourceWorkItem: {
        id: number;
        type: string;             // "User Story", "Bug", "Requirement"
        title: string;
        description: string;
        acceptanceCriteria?: string;
    };
    targetCount?: number;          // default 5
    coverageTypes?: string[];      // default all
}

export interface ILlmProvider {
    readonly name: string;
    readonly displayName: string;
    
    isConfigured(): boolean;
    validateConfig(): Promise<{ valid: boolean; error?: string }>;
    
    generateTestCases(
        context: GenerationContext
    ): Promise<TestCaseSuggestion[]>;
}
```

### 1.3 Azure OpenAI implementation

```typescript
// llm/azure-openai-provider.ts

import { ILlmProvider, GenerationContext, TestCaseSuggestion } from "./llm-provider";

export class AzureOpenAIProvider implements ILlmProvider {
    readonly name = "azure-openai";
    readonly displayName = "Azure OpenAI";
    
    constructor(private config: LlmProviderConfig) {}
    
    isConfigured(): boolean {
        return !!this.config.apiKey && 
               !!this.config.endpoint && 
               !!this.config.deploymentName;
    }
    
    async validateConfig(): Promise<{ valid: boolean; error?: string }> {
        // Simple ping endpoint
        try {
            const response = await fetch(
                `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=2024-02-01`,
                {
                    method: "POST",
                    headers: {
                        "api-key": this.config.apiKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: "ping" }],
                        max_tokens: 5,
                    }),
                }
            );
            return { valid: response.ok };
        } catch (err) {
            return { valid: false, error: (err as Error).message };
        }
    }
    
    async generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]> {
        const systemPrompt = TEST_CASE_GENERATION_SYSTEM_PROMPT;
        const userPrompt = buildUserPrompt(context);
        
        const response = await fetch(
            `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=2024-02-01`,
            {
                method: "POST",
                headers: {
                    "api-key": this.config.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.7,
                    max_tokens: 4000,
                }),
            }
        );
        
        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        
        return parsed.test_cases as TestCaseSuggestion[];
    }
}
```

### 1.4 Prompt templates

```typescript
// llm/prompt-templates.ts

export const TEST_CASE_GENERATION_SYSTEM_PROMPT = `
You are an expert QA test engineer assistant. Your role is to analyze 
user stories and generate comprehensive test cases.

For each user story, you generate test cases that cover:
- Happy path scenarios (main success flow)
- Edge cases (boundary conditions, unusual inputs)
- Error cases (failure scenarios, exception handling)
- Each acceptance criterion explicitly

Output format: JSON object with this exact structure:
{
  "test_cases": [
    {
      "title": "Short descriptive title",
      "description": "What this test verifies",
      "priority": "P1" | "P2" | "P3" | "P4",
      "steps": [
        { "action": "Step description", "expected": "Expected outcome" }
      ],
      "tags": ["@tag1", "@tag2"],
      "coverage_type": "happy_path" | "edge_case" | "error_case" | "acceptance_criterion"
    }
  ]
}

Guidelines:
- Generate 5-7 test cases per user story (configurable via context)
- Each test case must be actionable and verifiable
- Steps must be clear and concise (max 7 steps per test case)
- Priorities: P1 = critical, P2 = high, P3 = medium, P4 = low
- Tags help categorize (e.g., @auth, @payment, @ui)
- Never invent functionality not in the user story
- Focus on what to test, not how to implement
`;

export function buildUserPrompt(context: GenerationContext): string {
    return `
Generate test cases for the following ${context.sourceWorkItem.type}:

ID: ${context.sourceWorkItem.id}
Title: ${context.sourceWorkItem.title}

Description:
${context.sourceWorkItem.description}

${context.sourceWorkItem.acceptanceCriteria ? `
Acceptance Criteria:
${context.sourceWorkItem.acceptanceCriteria}
` : ""}

Generate ${context.targetCount || 5} test cases covering the scenarios above.
Return ONLY the JSON object, no additional text.
`;
}
```

### 1.5 LLM config storage (encrypted via ADO)

```typescript
// services/llm-config-service.ts

import * as SDK from "azure-devops-extension-sdk";

const STORAGE_COLLECTION = "argos-llm-config";

export class LlmConfigService {
    async getConfig(): Promise<LlmProviderConfig | null> {
        try {
            const dataService = await SDK.getService<any>("ms.vss-features.extension-data-service");
            const config = await dataService.getValue<LlmProviderConfig>(
                STORAGE_COLLECTION,
                { scopeType: "User" }
            );
            return config || null;
        } catch (err) {
            return null;
        }
    }
    
    async setConfig(config: LlmProviderConfig): Promise<void> {
        const dataService = await SDK.getService<any>("ms.vss-features.extension-data-service");
        await dataService.setValue(
            STORAGE_COLLECTION,
            config,
            { scopeType: "User" }
        );
    }
    
    async clearConfig(): Promise<void> {
        const dataService = await SDK.getService<any>("ms.vss-features.extension-data-service");
        await dataService.setValue(
            STORAGE_COLLECTION,
            null,
            { scopeType: "User" }
        );
    }
}
```

NOTE : ADO Extension Data Service encrypts data automatically.
Scope "User" = per-user storage (each user has own config).
La cle API n'est JAMAIS stockee en clair.

---

## 2. UX FLOW DETAILLE

### 2.1 Settings UI - LLM Configuration

Section "AI Configuration" dans SettingsView :

```
+----------------------------------------------------------+
| AI Configuration                                         |
+----------------------------------------------------------+
|                                                          |
| Argos uses AI to generate test cases. Configure your    |
| LLM provider below.                                      |
|                                                          |
| Status: [Not configured] / [Configured: Azure OpenAI]   |
|                                                          |
| Provider:  [Azure OpenAI       v]                       |
|                                                          |
| Azure OpenAI Endpoint:                                   |
| [https://your-instance.openai.azure.com         ]       |
|                                                          |
| Deployment Name:                                         |
| [gpt-4-mini                                       ]       |
|                                                          |
| API Key:                                                 |
| [********************************] [Show] [Test]        |
|                                                          |
| [Save Configuration]  [Clear Configuration]              |
|                                                          |
| Note: Your API key is encrypted and stored only in your |
| ADO account. Argos never has access to your key.        |
|                                                          |
+----------------------------------------------------------+
```

### 2.2 TestCaseFormView - Button "AI Generate"

```
+----------------------------------------------------------+
| New Test Case                                            |
+----------------------------------------------------------+
|                                                          |
| > General Information                          [v]      |
|   Title:       [                                ]       |
|   Description: [                                ]       |
|                                                          |
| > Test Steps                                   [v]      |
|   [+ Add Step]  [[AI] AI Generate]                         |
|   ...                                                    |
|                                                          |
| > Expected Results                              [v]      |
| > Linked Items                                  [v]      |
| > Metadata                                      [v]      |
|                                                          |
| [Cancel]                              [Create Test Case]|
+----------------------------------------------------------+
```

Click "AI Generate" -> opens AiGenerateModal

### 2.3 AiGenerateModal

```
+----------------------------------------------------------+
| [AI] Generate Test Cases with AI                       [X]|
+----------------------------------------------------------+
|                                                          |
| LLM Provider: Azure OpenAI (gpt-4-mini)        [config] |
|                                                          |
| Select source User Story:                                |
|                                                          |
| [Search work items...               ]                    |
|                                                          |
| Type filter: [v] User Story  [v] Bug  [v] Requirement   |
|                                                          |
| Results:                                                 |
| (.) #123 - User can login with email                    |
| ( ) #124 - Password reset flow                          |
| ( ) #125 - 2FA enrollment                               |
|                                                          |
| Number of test cases: [5 v]                              |
|                                                          |
|                          [Cancel]  [Generate suggestions]|
+----------------------------------------------------------+
```

Apres click "Generate suggestions" :
- Loading state (5-10 sec)
- Affichage des N suggestions
- User peut select/deselect chaque suggestion
- "Edit" possible avant accept
- Bouton "Create N selected" en bas

```
+----------------------------------------------------------+
| [AI] AI Suggestions (5 generated for #123)              [X]|
+----------------------------------------------------------+
|                                                          |
| Source: User Story #123 - User can login with email     |
| Provider: Azure OpenAI (gpt-4-mini)                     |
|                                                          |
| [X] [P1] Login with valid credentials                   |
|     Happy path - verify successful login                 |
|     5 steps - @auth @login                              |
|     [Edit] [Preview]                                     |
|                                                          |
| [X] [P2] Login with wrong password                      |
|     Error case - verify error message                    |
|     4 steps - @auth @error                              |
|     [Edit] [Preview]                                     |
|                                                          |
| [X] [P2] Login with empty email                         |
|     Edge case - field validation                         |
|     3 steps - @auth @validation                         |
|     [Edit] [Preview]                                     |
|                                                          |
| [ ] [P3] Login with maximum length email                |
|     Edge case - boundary testing                         |
|     ...                                                  |
|                                                          |
| [ ] [P3] Login session timeout                          |
|     Edge case - timeout behavior                         |
|     ...                                                  |
|                                                          |
| [Regenerate]    [Cancel]    [Create 3 selected]         |
+----------------------------------------------------------+
```

### 2.4 Apres acceptance

- Test Cases crees dans Argos (TestVault.TestCase)
- LINKED a la User Story source (Tested By relation)
- Toast : "3 test cases created from US #123"
- Modal ferme
- TestCaseFormView se reset OU navigate vers TestCasesListView

---

## 3. SECURITE CRITIQUE

### 3.1 Cle API jamais en clair

```
RULES STRICTES :
- Cle API stockee via ADO Extension Data Service (encrypted)
- JAMAIS en localStorage / sessionStorage
- JAMAIS dans le DOM (input type="password")
- JAMAIS log console
- JAMAIS dans error messages
- Header HTTP "api-key" seulement, masque dans devtools si possible

VALIDATION :
- Test regression cherche localStorage.setItem.*apiKey
- Test cherche console.log avec apiKey
- Test cherche cle dans rendu HTML
```

### 3.2 LLM responses jamais cachees server-side

```
SCOPE PRIVACY :
- Tous LLM calls = client-side direct (browser -> Azure OpenAI)
- Pas de proxy Argos
- Pas de cache server-side (TECH-DEBT-017 pas livre)
- Responses dans React state uniquement (session memory)

USER COMMUNICATION :
- Settings : "Your queries are sent directly to Azure OpenAI"
- "Argos never sees your data"
- Privacy-by-design narrative
```

---

## 4. TESTS REGRESSION

### 4.1 LLM provider pattern

```typescript
// tools/regression/T-2.21-llm-provider-pattern.test.ts

describe("T-2.21 LLM Provider pattern", () => {
    it("ILlmProvider interface has required methods", () => {
        const provider = new AzureOpenAIProvider({ /* mock config */ });
        expect(typeof provider.isConfigured).toBe("function");
        expect(typeof provider.validateConfig).toBe("function");
        expect(typeof provider.generateTestCases).toBe("function");
    });
    
    it("Factory creates correct provider type", () => {
        const config = { provider: "azure-openai", apiKey: "test" };
        const provider = LlmProviderFactory.create(config);
        expect(provider.name).toBe("azure-openai");
    });
    
    it("Factory throws on unknown provider", () => {
        const config = { provider: "unknown" as any, apiKey: "test" };
        expect(() => LlmProviderFactory.create(config)).toThrow();
    });
});
```

### 4.2 Azure OpenAI adapter

```typescript
describe("T-2.21 Azure OpenAI adapter", () => {
    it("isConfigured returns false when missing fields", () => {
        const provider = new AzureOpenAIProvider({ apiKey: "" } as any);
        expect(provider.isConfigured()).toBe(false);
    });
    
    it("isConfigured returns true with valid config", () => {
        const provider = new AzureOpenAIProvider({
            provider: "azure-openai",
            apiKey: "test-key",
            endpoint: "https://test.openai.azure.com",
            deploymentName: "gpt-4",
        });
        expect(provider.isConfigured()).toBe(true);
    });
    
    it("generateTestCases parses LLM response correctly", async () => {
        // Mock fetch
        // Verify parsing of JSON response
    });
});
```

### 4.3 AI generation flow

```typescript
describe("T-2.21 AI generation flow", () => {
    it("AiGenerateModal opens from TestCaseFormView", () => {
        render(<TestCaseFormView />);
        const button = screen.getByRole("button", { name: /ai generate/i });
        fireEvent.click(button);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    it("WorkItemPicker loads work items from ADO", async () => {
        // Mock useAdoWorkItems
        render(<AiGenerateModal />);
        await waitFor(() => {
            expect(screen.getByText(/User Story/i)).toBeInTheDocument();
        });
    });
    
    it("Suggestions can be selected/deselected", () => {
        // Render with mock suggestions
        // Click checkbox -> verify state change
    });
    
    it("Create button creates Test Cases with link to source", async () => {
        // Mock testCaseService.createTestCase
        // Mock workItemLinkService.linkToSource
        // Select 2 suggestions + click Create
        // Verify 2 createTestCase calls + 2 linkToSource calls
    });
});
```

### 4.4 LLM config encryption regression

```typescript
describe("T-2.21 LLM config encryption", () => {
    it("API key never in localStorage", () => {
        const config = { provider: "azure-openai", apiKey: "secret-key-123" };
        llmConfigService.setConfig(config);
        
        // Verify localStorage doesn't contain the key
        const stored = JSON.stringify(localStorage);
        expect(stored).not.toContain("secret-key-123");
    });
    
    it("API key never logged to console", () => {
        const consoleLogSpy = vi.spyOn(console, "log");
        const consoleErrorSpy = vi.spyOn(console, "error");
        
        // Trigger LLM generation
        // Verify no log call contains the key
        const allCalls = [
            ...consoleLogSpy.mock.calls,
            ...consoleErrorSpy.mock.calls,
        ];
        for (const call of allCalls) {
            expect(call.join(" ")).not.toContain("secret-key-123");
        }
    });
});
```

---

## 5. CHECKPOINTS

### CHECKPOINT A : LLM provider architecture (1h30)

1. Creer interface ILlmProvider + types
2. Creer LlmProviderFactory
3. Implementer AzureOpenAIProvider
4. Creer LlmConfigService (storage encrypted)
5. Prompt templates
6. Tests T-2.21-llm-provider-pattern + T-2.21-azure-openai-adapter

Validation Alex : tests passent, architecture extensible verifiable.

### CHECKPOINT B : Settings UI LLM config (1h)

1. Modifier SettingsView avec section "AI Configuration"
2. Form pour provider + endpoint + deployment + API key
3. Bouton "Test" qui appelle validateConfig()
4. Save + Clear actions
5. Status badge "Not configured" / "Configured: X"

Validation Alex : Settings sauve la config, bouton Test fonctionne.

### CHECKPOINT C : Modal AI + Work Item Picker (1h30)

1. Creer WorkItemPicker component
2. Creer AdoWorkItemsService (WIQL query US/Bug/Requirement)
3. Creer AiGenerateModal component (etape 1 : select source)
4. Integrer bouton "AI Generate" dans TestCaseFormView
5. Tests T-2.21-ai-generation-flow (partie modal opening)

Validation Alex : modal s'ouvre, work items se chargent depuis ADO.

### CHECKPOINT D : Generation + suggestions UI (1h30)

1. Creer AiSuggestionCard component
2. Modal etape 2 : afficher suggestions
3. Selection/deselection
4. Edit suggestion (basic)
5. Create button creates test cases + links
6. Tests T-2.21-ai-generation-flow (partie creation)
7. Tests T-2.21-llm-config-encryption

Validation Alex : flow E2E complet fonctionne.

### CHECKPOINT E : Bump + tests + PR (30 min)

1. Bump 0.5.27 -> 0.5.28
2. CHANGELOG update
3. Tests complets
4. Build VSIX
5. Commit + push + PR

---

## 6. WORKFLOW GIT

```powershell
cd E:\Code\TestVault
git checkout main
git pull

git checkout -b feature/sprint-2-21-ai-candidates

# Travail CHECKPOINTS A-E

node tools\release\bump-fixed-version.cjs 0.5.28

git add -A
git commit -F "$env:TEMP\sprint-2-21-commit-msg.txt"
git push -u origin feature/sprint-2-21-ai-candidates

gh pr create --title "feat(extension): Sprint 2.21 part 1 - AI candidates from User Story" `
            --body-file "$env:TEMP\sprint-2-21-pr-body.txt"
```

---

## 7. COMMIT MESSAGE TEMPLATE

```
feat(extension): Sprint 2.21 part 1 - AI candidates from User Story

First USP feature : AI-assisted test case generation.
Workflow: from TestCaseFormView, user clicks "AI Generate", selects a
User Story from ADO, AI proposes N test case suggestions, user selects
and creates them in Argos with automatic link to source User Story.

Architecture choices :
- Multi-provider pattern (ILlmProvider interface)
- Azure OpenAI implementation as default (Sprint 2.21)
- Extensibility for Anthropic / OpenAI / Mistral in future sprints
- User-provided API key (no Argos backend needed yet)
- Encrypted storage via ADO Extension Data Service
- Direct browser-to-LLM calls (no proxy, no cache)
- Privacy-by-design : Argos never sees user prompts/responses

Delivered :

1. LLM infrastructure (5 new files in llm/) :
   - ILlmProvider interface + TestCaseSuggestion types
   - AzureOpenAIProvider implementation
   - LlmProviderFactory (multi-provider switch)
   - Prompt templates (system + user prompt builders)
   - JSON schema validation for LLM output

2. Services (3 new) :
   - LlmConfigService : encrypted config storage
   - AiGenerationService : orchestration LLM calls
   - AdoWorkItemsService : WIQL query US/Bug/Requirement

3. Components (4 new) :
   - AiGenerateModal : 2-step modal (select source + review suggestions)
   - WorkItemPicker : reusable picker US/Bug/Requirement
   - AiSuggestionCard : 1 suggestion card with select/edit/preview
   - LlmConfigStatus : badge indicating configuration state

4. Hooks (3 new) :
   - useLlmConfig : config CRUD + validation
   - useAiGeneration : LLM call orchestration with loading/error
   - useAdoWorkItems : list work items for picker

5. Views modified :
   - TestCaseFormView : added "AI Generate" button
   - SettingsView : added "AI Configuration" section

Security :
- API key encrypted via ADO data service (scope: User)
- Never in localStorage, sessionStorage, console.log, or DOM
- Direct LLM calls (no Argos proxy)
- Privacy-by-design : Argos doesn't see user data

Tests added (4 new) :
- T-2.21-llm-provider-pattern : interface compliance
- T-2.21-azure-openai-adapter : Azure-specific tests
- T-2.21-ai-generation-flow : E2E flow validation
- T-2.21-llm-config-encryption : security regression

Out of scope (next sprints) :
- Gherkin editor native : Sprint 2.21 part 2 (next session)
- Free text / Existing test as input source : Sprint future
- Generate from US directly (vue depuis Coverage Panel) : Sprint 2.22 or 3.5
- Backend Azure Functions + free tier : TECH-DEBT-017
- Telemetry tracking : Sprint future
- Other LLM providers (Anthropic, OpenAI direct, Mistral) : Sprint future

Bump 0.5.27 -> 0.5.28

Refs :
- ARGOS_ANALYSE_MARCHE_COMPLETE.md v1.1 : feature F04 [DONE]
- USP "AI-First" angle delivered
- TECH-DEBT-017 (Azure Functions) : reporte mais documente
```

---

## 8. PR BODY TEMPLATE

```markdown
## Summary

Sprint 2.21 part 1 -- AI candidates from User Story.

First major USP delivered : AI-assisted test case generation from 
selected User Stories.

## Architecture

Multi-provider pattern (ILlmProvider interface) :
- Azure OpenAI implementation (default)
- Extensible : Anthropic / OpenAI / Mistral can be added in future sprints
- User-provided API key (no Argos backend needed)
- Encrypted storage via ADO Extension Data Service
- Privacy-by-design : direct browser to LLM, no proxy

## UX Flow

1. User clicks "AI Generate" in TestCaseFormView
2. Modal opens : select source User Story (work item picker ADO)
3. Configure : number of test cases (default 5)
4. Click "Generate suggestions"
5. Loading state (5-10 sec)
6. Review N suggestions (selectable, editable)
7. Click "Create N selected"
8. Test Cases created in Argos + linked to source US

## Settings

New "AI Configuration" section in SettingsView :
- Provider dropdown (Azure OpenAI default)
- Endpoint + Deployment + API Key fields
- Test button (validates config)
- Save / Clear actions

## Security

- API key encrypted via ADO data service
- Never in localStorage, sessionStorage, DOM, or logs
- Direct LLM calls (no Argos proxy or cache)
- Privacy-by-design narrative

## Tests

- 4 new T-2.21 regression tests
- All existing tests pass

## Out of scope

- Gherkin editor native : Sprint 2.21 part 2 (next Monday)
- Other input sources (free text, existing test) : Sprint future
- Generate batch from US Coverage Panel : Sprint 2.22 or 3.5
- TECH-DEBT-017 Azure Functions backend : reporte
- Telemetry : Sprint future
- Multi-provider implementations (Anthropic, etc.) : Sprint future

## Bump

0.5.27 -> 0.5.28

## Refs

- ARGOS_ANALYSE_MARCHE_COMPLETE.md v1.1 : F04 priority 6.25 [DONE]
- USP "AI-First" angle now delivered
- TECH-DEBT-017 documente comme reporte
```

---

## 9. APRES MERGE

```powershell
git checkout main
git pull
git tag -a v0.5.28 -m "Release v0.5.28 - Sprint 2.21 part 1 AI candidates"
git push origin v0.5.28

# Surveille CI ~8 min
# https://github.com/AlexThibaud1976/TestVault/actions

# Reinstall extension BCEE-QA

# Test E2E :
# 1. Open Settings -> AI Configuration
# 2. Configure Azure OpenAI (Alex doit avoir une instance OU mock locally)
# 3. Test button : verifier validation OK
# 4. Open Test Case form
# 5. Click "AI Generate"
# 6. Modal opens
# 7. Select User Story #X
# 8. Generate suggestions
# 9. Verify N suggestions appear
# 10. Select 2-3, click Create
# 11. Verify Test Cases created in Argos
# 12. Verify links to source US (Tested By relation)
```

---

## 10. NOTES IMPORTANTES

### 10.1 Azure OpenAI account requirement

Pour tester en BCEE-QA, Alex aura besoin de :
- Azure subscription (deja existant)
- Azure OpenAI Service instance (a creer si pas deja)
- Deploy un modele (recommande : gpt-4o-mini, peu cher)
- Recuperer endpoint + API key + deployment name

Coverage de cout test :
- gpt-4o-mini : ~0.15 USD pour 1M tokens input
- 1 generation Sprint 2.21 = ~1-2K tokens
- Test E2E complete = ~0.001 USD (negligeable)

### 10.2 Fallback si Azure OpenAI indispo

Pour DEV/TESTS uniquement :
- Mock provider implementable plus tard si besoin
- Mais Sprint 2.21 part 1 = real Azure OpenAI

### 10.3 Performance

- Generation peut prendre 5-10 sec
- Bon loading state critique UX
- Animations / progress feedback essentiel
- Timeout client-side : 30 sec max

### 10.4 Erreurs LLM

Gestion erreurs robuste :
- API key invalide : "Verify your API key in Settings"
- Endpoint invalide : "Verify your Azure OpenAI endpoint"
- Rate limit : "Too many requests, retry in 60 sec"
- Quota exceeded : "Azure OpenAI quota exceeded"
- Parse error : "AI response could not be parsed, retry"
- Network : "Network error, check connection"

### 10.5 ASCII strict

Tous commentaires, messages git, JSON, prompts = ASCII.
Exception : prompts LLM peuvent contenir caracteres natural language
(mais en anglais simple, pas d'emojis dans system prompt).

### 10.6 Si bloque

- STOP avant de tout casser
- Commit incremental
- Document blocage dans PR
- Alex iterait avec Claude (web) pour deblocage

### 10.7 Maintenance docs strategiques (rappel Alex)

Apres Sprint 2.21 part 1 livre :
- ARGOS_ANALYSE_MARCHE_COMPLETE.md : marquer F04 [DONE]
- USP "AI-First" valide
- Ajouter Sprint 2.22+ : "Generate from US Coverage Panel" (vision Alex)

---

## 11. CHECKLIST FINALE

Avant PR :

- [ ] CHECKPOINT A done (LLM provider architecture)
- [ ] CHECKPOINT B done (Settings UI)
- [ ] CHECKPOINT C done (Modal + Work Item Picker)
- [ ] CHECKPOINT D done (Generation + suggestions)
- [ ] CHECKPOINT E done (bump + tests + PR)
- [ ] 4 nouveaux tests T-2.21 passent
- [ ] Tests existants passent (no regression)
- [ ] Bump 0.5.27 -> 0.5.28
- [ ] CHANGELOG.md update
- [ ] Specs/tasks.md update
- [ ] preview.html : Settings + Modal s'ouvrent
- [ ] VSIX rebuild reussit
- [ ] Pas de fichier backup
- [ ] ASCII strict
- [ ] Security : pas de cle API en clair nulle part
- [ ] Privacy-by-design respecte

---

Fin du prompt CLAUDE_TASK Sprint 2.21 part 1.

Estimation : 4-6 heures pour Claude Code.
Suite Sprint 2.21 part 2 (lundi) : Gherkin editor native.
Vision long terme (Sprint 2.22+) : "Generate from User Story" vue dediee (USP killer).
