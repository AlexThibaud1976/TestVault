# CLAUDE_TASK : Sprint 2.21.1 - Add Azure AI Foundry v1 endpoint support

Repo : E:\Code\TestVault
Branche : feature/sprint-2-21-1-foundry-support
Cible : version 0.5.28.1 (Marketplace + npm)
Estimation : 3-4 heures pour Claude Code

---

## 0. CONTEXTE ET MOTIVATION

### 0.1 Etat avant ce sprint

Sprint 2.21 part 1 (vendredi 2026-05-22) a livre AI candidates avec :
- ILlmProvider interface (architecture multi-provider)
- AzureOpenAIProvider implementation (Azure OpenAI Service classique)
- LlmProviderFactory pattern
- Settings UI configuration

LIMITATION DECOUVERTE :
Le code actuel n'appelle QUE le format API Azure OpenAI Service classique :
- Endpoint : https://[name].openai.azure.com
- Path : /openai/deployments/[deployment]/chat/completions
- Query : ?api-version=2024-02-01

### 0.2 Probleme decouvert

Microsoft a deux services Azure pour OpenAI :

1. AZURE OPENAI SERVICE (classique, depuis 2023)
   - Endpoint : .openai.azure.com
   - Souvent satured quota EU
   - Format API : /openai/deployments/{name}/chat/completions
   - Auth : header "api-key"

2. AZURE AI FOUNDRY (nouveau, 2025-2026)
   - Endpoint : .services.ai.azure.com/openai/v1
   - Quota souvent disponible meme en EU
   - Format API : /openai/v1/chat/completions (OpenAI-compatible)
   - Auth : header "api-key" OU token bearer
   - Note : Foundry remplace progressivement le classique

ALEX A DECOUVERT LE VENDREDI 2026-05-22 :
- Plusieurs heures bataillant avec quota classique
- Resolution : Foundry permet de deployer immediatement
- Mais Argos ne supporte pas Foundry endpoint format
- Decision strategique : ajouter support Foundry maintenant

### 0.3 Code Python de reference (fournie par Alex)

```python
from openai import OpenAI

endpoint = "https://alexandrethibaud-7395-resource.services.ai.azure.com/openai/v1"
deployment_name = "gpt-4.1-mini"
api_key = "<api-key>"  # ou token bearer

client = OpenAI(
    base_url=endpoint,
    api_key=api_key
)

completion = client.chat.completions.create(
    model=deployment_name,
    messages=[
        {
            "role": "user",
            "content": "What is the capital of France?",
        }
    ],
)

print(completion.choices[0].message)
```

Differences cles vs Azure OpenAI classique :
- base_url = endpoint COMPLET avec /openai/v1
- Pas de api-version query string
- Pas de /openai/deployments/{name} dans le path
- Le deployment name est passe via le parametre "model"
- Format OpenAI v1 compatible (meme client que OpenAI direct)

### 0.4 Objectif Sprint 2.21.1

Ajouter le support de Azure AI Foundry comme provider distinct :
- Nouveau provider FoundryProvider
- User selectionne dans Settings : "Azure OpenAI" OU "Azure AI Foundry"
- Architecture multi-provider extensible (preparation autres providers)
- Backward compatibility : Azure OpenAI Service classique continue de marcher

### 0.5 Vision strategique

Cette evolution prepare Argos pour :
- Court terme : utilisation Foundry (quota souvent meilleur)
- Moyen terme : compatibilite avec evolution Microsoft
- Long terme : facilitee d'ajout autres providers
  (Anthropic Claude, OpenAI direct, Mistral, etc.)

### 0.6 Constraints CRITIQUES

```
- TESTVAULT_SCHEMA referenceName : IMMUTABLE
- argos-wit-schema : pas de modification
- WitResolver : utilisation obligatoire
- ASCII strict
- Pas de regression Sprint 2.20-2.21 part 1
- Backward compatibility AzureOpenAIProvider preserve
- Pattern adapter respecte (Open-Closed principle)
- Cle API JAMAIS en clair (verification regression)
```

---

## 1. PERIMETRE TECHNIQUE

### 1.1 Fichiers crees / modifies

```
apps/argos-extension/src/hub/llm/
  llm-provider.ts                    [MODIFIED] (extend types if needed)
  azure-openai-provider.ts            [UNCHANGED] (preserve backward compat)
  azure-ai-foundry-provider.ts        [NEW] (implementation Foundry v1)
  llm-provider-factory.ts             [MODIFIED] (add foundry case)
  prompt-templates.ts                 [UNCHANGED]
  test-case-schema.ts                 [UNCHANGED]

apps/argos-extension/src/hub/services/
  llm-config-service.ts               [MODIFIED] (support new provider type)
  ai-generation-service.ts            [MODIFIED] (factory call adaptation)

apps/argos-extension/src/hub/components/
  LlmConfigStatus.tsx                 [MODIFIED] (display provider type)
  AiGenerateModal.tsx                 [MODIFIED] (display provider in modal)

apps/argos-extension/src/hub/views/
  SettingsView.tsx                    [MODIFIED] (provider dropdown 2 options)

tools/regression/
  T-2.21.1-foundry-provider.test.ts          [NEW]
  T-2.21.1-multi-provider-factory.test.ts    [NEW]
  T-2.21.1-no-regression-azure-openai.test.ts [NEW]
  T-2.21.1-foundry-endpoint-format.test.ts   [NEW]
```

### 1.2 Architecture pattern preservee

```typescript
// Existant - NE PAS MODIFIER
export interface ILlmProvider {
    readonly name: string;
    readonly displayName: string;
    isConfigured(): boolean;
    validateConfig(): Promise<{ valid: boolean; error?: string }>;
    generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]>;
}

// LlmProviderConfig - EXTEND (backward compatible)
export interface LlmProviderConfig {
    provider: "azure-openai" | "azure-ai-foundry" | "anthropic" | "openai" | "mistral";
    //                       ^^^^^^^^^^^^^^^^^^ NEW
    apiKey: string;
    endpoint: string;
    deploymentName: string;  // Pour Azure OpenAI = deployment name
                             // Pour Foundry = model name (meme variable, sens different)
    // Optionnels selon provider :
    apiVersion?: string;     // Azure OpenAI seulement
}
```

### 1.3 FoundryProvider implementation

```typescript
// llm/azure-ai-foundry-provider.ts

import { ILlmProvider, GenerationContext, TestCaseSuggestion } from "./llm-provider";
import { TEST_CASE_GENERATION_SYSTEM_PROMPT, buildUserPrompt } from "./prompt-templates";

export class AzureAIFoundryProvider implements ILlmProvider {
    readonly name = "azure-ai-foundry";
    readonly displayName = "Azure AI Foundry";
    
    constructor(private config: LlmProviderConfig) {}
    
    isConfigured(): boolean {
        return !!this.config.apiKey && 
               !!this.config.endpoint && 
               !!this.config.deploymentName;
    }
    
    async validateConfig(): Promise<{ valid: boolean; error?: string }> {
        try {
            // Foundry endpoint format : .../openai/v1/chat/completions
            // base_url contient deja /openai/v1
            const url = this.normalizeEndpoint() + "/chat/completions";
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "api-key": this.config.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: this.config.deploymentName,
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 5,
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                return { 
                    valid: false, 
                    error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` 
                };
            }
            
            return { valid: true };
        } catch (err) {
            return { valid: false, error: (err as Error).message };
        }
    }
    
    async generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]> {
        const systemPrompt = TEST_CASE_GENERATION_SYSTEM_PROMPT;
        const userPrompt = buildUserPrompt(context);
        
        const url = this.normalizeEndpoint() + "/chat/completions";
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "api-key": this.config.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.config.deploymentName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 4000,
            }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Foundry API error: ${response.status} - ${errorText.substring(0, 300)}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        
        return parsed.test_cases as TestCaseSuggestion[];
    }
    
    /**
     * Normalize the endpoint URL for Foundry.
     * 
     * Accepts:
     * - https://[name].services.ai.azure.com/openai/v1
     * - https://[name].services.ai.azure.com/openai/v1/
     * - https://[name].services.ai.azure.com/api/projects/[project]/openai/v1
     * - https://[name].services.ai.azure.com/api/projects/[project]/openai/v1/
     * 
     * Returns: clean URL without trailing slash
     */
    private normalizeEndpoint(): string {
        let url = this.config.endpoint.trim();
        
        // Remove trailing slash
        if (url.endsWith("/")) {
            url = url.slice(0, -1);
        }
        
        // Ensure it ends with /openai/v1
        if (!url.endsWith("/openai/v1")) {
            // If user provided just the base, append /openai/v1
            if (!url.includes("/openai/v1")) {
                url = url + "/openai/v1";
            }
        }
        
        return url;
    }
}
```

### 1.4 LlmProviderFactory mise a jour

```typescript
// llm/llm-provider-factory.ts (MODIFIED)

import { ILlmProvider, LlmProviderConfig } from "./llm-provider";
import { AzureOpenAIProvider } from "./azure-openai-provider";
import { AzureAIFoundryProvider } from "./azure-ai-foundry-provider";

export class LlmProviderFactory {
    static create(config: LlmProviderConfig): ILlmProvider {
        switch (config.provider) {
            case "azure-openai":
                return new AzureOpenAIProvider(config);
            case "azure-ai-foundry":
                return new AzureAIFoundryProvider(config);
            // Future :
            // case "anthropic":
            //     return new AnthropicProvider(config);
            // case "openai":
            //     return new OpenAIProvider(config);
            // case "mistral":
            //     return new MistralProvider(config);
            default:
                throw new Error(`Unknown LLM provider: ${config.provider}`);
        }
    }
    
    /**
     * Returns all available providers with their metadata.
     * Used by Settings UI to populate dropdown.
     */
    static listAvailableProviders(): Array<{
        id: string;
        displayName: string;
        endpointFormatHint: string;
        deploymentNameLabel: string;
        deploymentNameHint: string;
    }> {
        return [
            {
                id: "azure-openai",
                displayName: "Azure OpenAI Service (classic)",
                endpointFormatHint: "https://[name].openai.azure.com",
                deploymentNameLabel: "Deployment Name",
                deploymentNameHint: "Name you gave to your deployment in Azure OpenAI Studio",
            },
            {
                id: "azure-ai-foundry",
                displayName: "Azure AI Foundry",
                endpointFormatHint: "https://[name].services.ai.azure.com/openai/v1",
                deploymentNameLabel: "Model Name",
                deploymentNameHint: "Model name as deployed in Foundry (e.g. gpt-4.1-mini)",
            },
        ];
    }
}
```

---

## 2. UI MODIFICATIONS - SETTINGS

### 2.1 Provider dropdown enrichi

```typescript
// SettingsView.tsx - section AI Configuration

const providers = LlmProviderFactory.listAvailableProviders();
const [selectedProvider, setSelectedProvider] = useState<string>("azure-openai");

const currentProviderMeta = providers.find(p => p.id === selectedProvider)!;

return (
    <SettingsSection title="AI Configuration">
        <p className="settings-section-description">
            Argos uses AI to generate test cases. Configure your LLM provider below.
            Your API key is encrypted and stored only in your ADO account.
            Argos never has access to your key.
        </p>
        
        <FormField label="Provider">
            <Select
                value={selectedProvider}
                onChange={setSelectedProvider}
                options={providers.map(p => ({
                    value: p.id,
                    label: p.displayName,
                }))}
            />
        </FormField>
        
        <FormField 
            label={`${currentProviderMeta.displayName} Endpoint`}
            hint={`Format: ${currentProviderMeta.endpointFormatHint}`}
        >
            <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={currentProviderMeta.endpointFormatHint}
            />
        </FormField>
        
        <FormField 
            label={currentProviderMeta.deploymentNameLabel}
            hint={currentProviderMeta.deploymentNameHint}
        >
            <Input
                value={deploymentName}
                onChange={(e) => setDeploymentName(e.target.value)}
            />
        </FormField>
        
        <FormField label="API Key">
            <PasswordInput
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
        </FormField>
        
        <div className="settings-actions">
            <Button variant="primary" onClick={handleSave}>
                Save Configuration
            </Button>
            <Button variant="ghost" onClick={handleTest}>
                Test
            </Button>
            {existingConfig && (
                <Button variant="ghost-danger" onClick={handleClear}>
                    Clear Configuration
                </Button>
            )}
        </div>
        
        {/* Provider-specific help text */}
        {selectedProvider === "azure-ai-foundry" && (
            <Alert variant="info">
                <strong>Note about Azure AI Foundry endpoint:</strong>
                <ul>
                    <li>Use "Point de terminaison Azure OpenAI" from your Foundry project</li>
                    <li>Or the full URI shown in the deployment details</li>
                    <li>Must end with /openai/v1 (or will be appended automatically)</li>
                </ul>
            </Alert>
        )}
    </SettingsSection>
);
```

### 2.2 Display provider info in AI Modal

```typescript
// AiGenerateModal.tsx - header

<ModalHeader>
    <h2>Generate Test Cases with AI</h2>
    <div className="provider-info">
        {llmConfig.provider === "azure-openai" && (
            <span>Azure OpenAI ({llmConfig.deploymentName})</span>
        )}
        {llmConfig.provider === "azure-ai-foundry" && (
            <span>Azure AI Foundry ({llmConfig.deploymentName})</span>
        )}
    </div>
</ModalHeader>
```

---

## 3. TESTS REGRESSION

### 3.1 Foundry provider tests

```typescript
// tools/regression/T-2.21.1-foundry-provider.test.ts

describe("T-2.21.1 FoundryProvider", () => {
    const validConfig = {
        provider: "azure-ai-foundry" as const,
        apiKey: "test-key-12345",
        endpoint: "https://test.services.ai.azure.com/openai/v1",
        deploymentName: "gpt-4.1-mini",
    };
    
    it("isConfigured returns false with empty fields", () => {
        const provider = new AzureAIFoundryProvider({ ...validConfig, apiKey: "" });
        expect(provider.isConfigured()).toBe(false);
    });
    
    it("isConfigured returns true with valid config", () => {
        const provider = new AzureAIFoundryProvider(validConfig);
        expect(provider.isConfigured()).toBe(true);
    });
    
    it("normalizes endpoint with trailing slash", () => {
        const provider = new AzureAIFoundryProvider({
            ...validConfig,
            endpoint: "https://test.services.ai.azure.com/openai/v1/",
        });
        // Internal access for test - or use validateConfig() to verify URL
        const expectedUrl = "https://test.services.ai.azure.com/openai/v1/chat/completions";
        // Mock fetch and verify URL called
    });
    
    it("appends /openai/v1 if missing", () => {
        const provider = new AzureAIFoundryProvider({
            ...validConfig,
            endpoint: "https://test.services.ai.azure.com",
        });
        // Should auto-append /openai/v1
        // Mock fetch and verify final URL
    });
    
    it("supports project-scoped endpoint", () => {
        const provider = new AzureAIFoundryProvider({
            ...validConfig,
            endpoint: "https://test.services.ai.azure.com/api/projects/myproject/openai/v1",
        });
        // Should work with project path
        // Mock fetch and verify URL preserves project path
    });
    
    it("includes api-key header in request", async () => {
        // Mock fetch
        const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
            new Response('{"choices":[{"message":{"content":"{}"}}]}', { status: 200 })
        );
        
        const provider = new AzureAIFoundryProvider(validConfig);
        await provider.validateConfig();
        
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "api-key": "test-key-12345",
                }),
            })
        );
    });
    
    it("uses model parameter (not deployment in URL)", async () => {
        // Verify request body has model = deploymentName
        // Verify URL does NOT contain /deployments/{name}
    });
});
```

### 3.2 Factory tests

```typescript
// tools/regression/T-2.21.1-multi-provider-factory.test.ts

describe("T-2.21.1 LlmProviderFactory multi-provider", () => {
    it("creates Azure OpenAI provider", () => {
        const config = { provider: "azure-openai" as const, ...otherFields };
        const provider = LlmProviderFactory.create(config);
        expect(provider.name).toBe("azure-openai");
    });
    
    it("creates Foundry provider", () => {
        const config = { provider: "azure-ai-foundry" as const, ...otherFields };
        const provider = LlmProviderFactory.create(config);
        expect(provider.name).toBe("azure-ai-foundry");
    });
    
    it("lists available providers", () => {
        const providers = LlmProviderFactory.listAvailableProviders();
        expect(providers).toHaveLength(2);
        expect(providers.map(p => p.id)).toContain("azure-openai");
        expect(providers.map(p => p.id)).toContain("azure-ai-foundry");
    });
    
    it("throws on unknown provider", () => {
        const config = { provider: "unknown" as any, ...otherFields };
        expect(() => LlmProviderFactory.create(config)).toThrow(/Unknown LLM provider/);
    });
});
```

### 3.3 No regression on Azure OpenAI

```typescript
// tools/regression/T-2.21.1-no-regression-azure-openai.test.ts

describe("T-2.21.1 No regression on Azure OpenAI", () => {
    it("AzureOpenAIProvider still works as before", async () => {
        // Existing Sprint 2.21 part 1 tests should still pass
        // Verify URL format unchanged
        // Verify api-version parameter still added
        // Verify deployment path still in URL
    });
    
    it("Existing user configs (azure-openai) still load", () => {
        // Mock LlmConfigService.getConfig() returning old config
        // Verify factory creates correct provider
    });
});
```

### 3.4 Foundry endpoint format tests

```typescript
// tools/regression/T-2.21.1-foundry-endpoint-format.test.ts

describe("T-2.21.1 Foundry endpoint format normalization", () => {
    const cases = [
        // [input, expected output]
        [
            "https://x.services.ai.azure.com/openai/v1",
            "https://x.services.ai.azure.com/openai/v1"
        ],
        [
            "https://x.services.ai.azure.com/openai/v1/",
            "https://x.services.ai.azure.com/openai/v1"
        ],
        [
            "https://x.services.ai.azure.com",
            "https://x.services.ai.azure.com/openai/v1"
        ],
        [
            "https://x.services.ai.azure.com/api/projects/y/openai/v1",
            "https://x.services.ai.azure.com/api/projects/y/openai/v1"
        ],
    ];
    
    it.each(cases)("normalizes %s to %s", (input, expected) => {
        const provider = new AzureAIFoundryProvider({
            provider: "azure-ai-foundry",
            apiKey: "test",
            endpoint: input,
            deploymentName: "test",
        });
        
        // Access normalizeEndpoint via test utility or behavior verification
        // Or test via validateConfig() and inspect fetch URL
    });
});
```

---

## 4. CHECKPOINTS

### CHECKPOINT A : Foundry provider implementation (1h30)

1. Creer azure-ai-foundry-provider.ts (interface implementation)
2. Methode normalizeEndpoint() avec gestion variants URL
3. Methode generateTestCases() avec format API correct
4. Methode validateConfig() avec ping endpoint
5. Tests T-2.21.1-foundry-provider (6+ tests)
6. Tests T-2.21.1-foundry-endpoint-format (4+ tests)

VALIDATION ALEX :
- Compile sans erreur
- Tests passent
- Verifier URL format en code review

### CHECKPOINT B : Factory et types (45 min)

1. Modifier llm-provider.ts pour etendre type "provider"
2. Modifier llm-provider-factory.ts pour ajouter case
3. Implementer listAvailableProviders() avec metadata
4. Tests T-2.21.1-multi-provider-factory
5. Tests T-2.21.1-no-regression-azure-openai

VALIDATION ALEX :
- Tests existants Sprint 2.21 part 1 toujours passent
- Nouveau provider creable via factory

### CHECKPOINT C : Settings UI provider selection (1h)

1. Modifier SettingsView.tsx :
   - Dropdown provider (2 options)
   - Labels adaptes selon provider
   - Hints contextuels
2. Alert info pour Foundry (aide user)
3. Migration auto config existante :
   - Si config existe sans "provider" field -> default "azure-openai"
   - Pas de perte de config user

VALIDATION ALEX :
- Settings UI montre 2 options dropdown
- Labels changent quand on switch provider
- Config existante preservee
- Test reel : configurer Foundry, save, test, verifier success

### CHECKPOINT D : AI Modal display + bump + tests + PR (45 min)

1. Modifier AiGenerateModal.tsx pour afficher provider type
2. Modifier LlmConfigStatus.tsx pour afficher type
3. Bump 0.5.28 -> 0.5.28.1 (hotfix-style)
4. CHANGELOG update
5. Tests complets passent
6. Build VSIX
7. Commit + push + PR

---

## 5. WORKFLOW GIT

```powershell
cd E:\Code\TestVault
git checkout main
git pull

git checkout -b feature/sprint-2-21-1-foundry-support

# Travail CHECKPOINTS A-D...

node tools\release\bump-fixed-version.cjs 0.5.28.1

git add -A
git commit -F "$env:TEMP\sprint-2-21-1-commit-msg.txt"
git push -u origin feature/sprint-2-21-1-foundry-support

gh pr create --title "feat(extension): Sprint 2.21.1 - Add Azure AI Foundry support" `
            --body-file "$env:TEMP\sprint-2-21-1-pr-body.txt"
```

---

## 6. COMMIT MESSAGE TEMPLATE

```
feat(extension): Sprint 2.21.1 - Add Azure AI Foundry v1 endpoint support

Sprint 2.21 part 1 (vendredi 2026-05-22) delivered AI candidates with 
AzureOpenAIProvider (Azure OpenAI Service classique only). During real 
E2E testing, Alex discovered:

1. Azure OpenAI Service classique has quota limitations in EU regions
2. Microsoft has migrated to Azure AI Foundry (new service)
3. Foundry exposes API in OpenAI v1 format (different from Azure OpenAI 
   Service classique format)

This sprint adds Azure AI Foundry as a second LLM provider option,
preserving backward compatibility with Azure OpenAI Service classique.

Architecture (multi-provider pattern) :
- ILlmProvider interface UNCHANGED
- AzureOpenAIProvider UNCHANGED (backward compatibility)
- New AzureAIFoundryProvider implementation
- LlmProviderFactory routes to correct provider based on config

Key differences Foundry vs Azure OpenAI Service classique :

| Aspect              | Azure OpenAI Service       | Azure AI Foundry              |
|---------------------|----------------------------|-------------------------------|
| Endpoint base       | .openai.azure.com          | .services.ai.azure.com/openai/v1 |
| URL path            | /openai/deployments/{name} | /chat/completions (direct)    |
| Deployment in URL   | YES (path parameter)       | NO (model parameter in body)  |
| API version param   | ?api-version=2024-02-01    | NONE (uses /v1 in path)       |
| Auth header         | api-key                    | api-key (also supports bearer)|

User experience :
- Settings UI : dropdown "Provider" with 2 options
- Labels and hints adapt based on selection
- Backward compatible : existing configs still work

Delivered files :

LLM layer (1 new) :
- azure-ai-foundry-provider.ts : implementation avec URL normalization

Factory (modified) :
- llm-provider-factory.ts : multi-provider routing
- llm-provider.ts : extended type "provider"

UI (modified) :
- SettingsView.tsx : provider dropdown + contextual labels
- AiGenerateModal.tsx : display provider type
- LlmConfigStatus.tsx : status badge with provider info

Tests added (4 new) :
- T-2.21.1-foundry-provider : interface compliance + URL handling
- T-2.21.1-multi-provider-factory : factory routing
- T-2.21.1-no-regression-azure-openai : Sprint 2.21 part 1 still works
- T-2.21.1-foundry-endpoint-format : URL normalization edge cases

Future evolutions enabled :
- Sprint future : Anthropic Claude provider (just add AnthropicProvider)
- Sprint future : OpenAI direct provider (similar pattern)
- Sprint future : Mistral provider (european LLM option)

Real-world tested :
- Alex tested with Foundry deployment "gpt-4.1-mini" in East US
- Endpoint : https://alexandrethibaud-7395-resource.services.ai.azure.com/openai/v1
- After Sprint 2.21.1 merge : E2E generation works

Bump 0.5.28 -> 0.5.28.1 (hotfix-style)

Refs :
- Sprint 2.21 part 1 (delivered AzureOpenAIProvider only)
- Real-world discovery 2026-05-22 (Alex setup session)
- USP "Multi-LLM provider" architecturally validated
```

---

## 7. PR BODY TEMPLATE

```markdown
## Summary

Sprint 2.21.1 -- Add Azure AI Foundry v1 endpoint support.

Sprint 2.21 part 1 delivered AI candidates with AzureOpenAIProvider 
(Azure OpenAI Service classique only). During real E2E testing on 
2026-05-22, Alex discovered that Microsoft has migrated to Azure AI 
Foundry, which exposes a different API endpoint format.

This sprint adds AzureAIFoundryProvider as a second option, preserving 
backward compatibility.

## Architecture

Multi-provider pattern preserved :
- ILlmProvider interface UNCHANGED
- AzureOpenAIProvider UNCHANGED (backward compatibility)
- New AzureAIFoundryProvider implementation
- Factory routes to correct provider based on config

## Real-world tested

- Foundry deployment "gpt-4.1-mini" (East US region)
- Endpoint format : .services.ai.azure.com/openai/v1
- E2E generation validated after merge

## Backward compatibility

- Existing user configs (azure-openai) continue to work unchanged
- Sprint 2.21 part 1 tests all pass
- No breaking changes

## Tests

- 4 new regression tests T-2.21.1-*
- All existing tests pass

## Bump

0.5.28 -> 0.5.28.1

## Refs

- Sprint 2.21 part 1 (basic AzureOpenAIProvider)
- 2026-05-22 real-world setup session (Foundry discovery)
- USP "Multi-LLM provider" architecturally complete
```

---

## 8. APRES MERGE

```powershell
git checkout main
git pull
git tag -a v0.5.28.1 -m "Release v0.5.28.1 - Sprint 2.21.1 Foundry support"
git push origin v0.5.28.1

# Surveille CI ~8 min

# Reinstall extension BCEE-QA

# Test E2E reel :
# 1. Open Settings -> AI Configuration
# 2. Provider dropdown : choose "Azure AI Foundry"
# 3. Enter :
#    - Endpoint : https://alexandrethibaud-7395-resource.services.ai.azure.com/openai/v1
#    - Model Name : gpt-4.1-mini
#    - API Key : [Alex's Foundry API key]
# 4. Save + Test
# 5. Expected : "Connection successful"
# 6. Open Test Case form -> AI Generate
# 7. Select User Story BCEE-QA
# 8. Generate suggestions
# 9. Verify 5 suggestions returned
# 10. Select 2-3, click Create
# 11. Verify Test Cases created + linked to source US
# 12. SUCCESS = Sprint 2.21 part 1 FULLY validated with Foundry !
```

---

## 9. NOTES IMPORTANTES

### 9.1 ASCII strict

Tous commentaires, messages git, JSON, descriptions = ASCII.

### 9.2 Pattern preserve

Cette evolution est une ADDITION, pas une REFACTOR. Pattern adapter
reste intact. Sprint 2.21 part 1 reste valide.

### 9.3 Endpoint format gotchas

User peut entrer endpoint Foundry sous plusieurs formes :
- Avec /openai/v1
- Sans /openai/v1
- Avec /api/projects/[project]/openai/v1
- Avec trailing slash
- Sans trailing slash

normalizeEndpoint() gere tous les cas.

### 9.4 Deployment Name semantique

Important pour l'UX :
- Azure OpenAI Service : "Deployment Name" (le user a choisi un nom 
  custom dans Azure OpenAI Studio)
- Azure AI Foundry : "Model Name" (le nom du modele tel que deploye 
  dans Foundry, generalement = nom du modele OpenAI)

Le label dans Settings UI s'adapte selon provider choisi.

### 9.5 Backward compatibility config migration

Si LlmConfigService trouve une config sans "provider" field :
- Default "azure-openai" (backward compat avec Sprint 2.21 part 1)
- User peut changer dans Settings ensuite

### 9.6 Maintenance docs strategiques (rappel Alex)

Apres ce sprint :
- ARGOS_ANALYSE_MARCHE_COMPLETE.md : ajouter mention Foundry support
- Guide Azure OpenAI Setup : updater avec Foundry section
- USP "Multi-LLM provider" = validee

### 9.7 Si bloque

- STOP avant de tout casser
- Commit incremental
- Document blocage dans PR
- Alex iterait avec Claude (web) pour deblocage

---

## 10. CHECKLIST FINALE

Avant PR :

- [ ] CHECKPOINT A done (FoundryProvider implementation)
- [ ] CHECKPOINT B done (Factory + types)
- [ ] CHECKPOINT C done (Settings UI)
- [ ] CHECKPOINT D done (Modal + bump + PR)
- [ ] 4 nouveaux tests T-2.21.1-* passent
- [ ] Tests existants passent (Sprint 2.21 part 1 backward compat)
- [ ] Bump 0.5.28 -> 0.5.28.1
- [ ] CHANGELOG.md update
- [ ] Specs/tasks.md update
- [ ] preview.html : Settings montrent dropdown 2 providers
- [ ] VSIX rebuild reussit
- [ ] ASCII strict
- [ ] Pas de regression sur Azure OpenAI classique
- [ ] Migration config legacy (sans "provider" field) marche

---

Fin du prompt CLAUDE_TASK Sprint 2.21.1.

Estimation : 3-4 heures pour Claude Code.
Pour Alex : tester E2E reel apres merge avec ressource Foundry existante.
Suite : Sprint 2.21 part 2 (Drawer revision + Gherkin native) lundi.
