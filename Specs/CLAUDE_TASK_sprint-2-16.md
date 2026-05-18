# Prompt Claude Code -- Sprint 2.16 CRUD ops refName resolver for ALL WIT (`feat/sprint-2-16-crud-refname-resolver`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint final : translation refName cote CRUD operations pour les 7 WIT TestVault.
> Estimation : ~2-2.5h.

---

## Contexte critique

**Decouverte 2026-05-18 ~19h** : apres Sprint 2.15 livre argos@0.5.17 (extension detection),
le bandeau "Limited mode" a disparu (DETECTION OK), mais la creation echoue :

```
{
    "message": "VS402323: Work item type TestVault.TestPlan does not exist in project 
                0bc20088-1217-4fc3-9e15-e74aca179a89 or you do not have permission to access it.",
    "typeName": "...WorkItemTypeNotFoundException",
    "typeKey": "WorkItemTypeNotFoundException"
}
```

**Cause confirmee** :

L'extension UI fait `createWorkItem("TestVault.TestPlan", { fields })` mais :
- Schema refName : `TestVault.TestPlan` 
- ADO refName : `ArgosInheritedDemo.TestVaultTestPlan` (dynamique selon process name)

Pareil pour les **fields dans les bodies** :
- Schema : `{ "TestVault.Priority": "High" }`
- ADO : `{ "Custom.TestVaultPriority": "High" }`

**Exigence user 2026-05-18 ~19h** :

> "Un dernier sprint pour fixer cette erreur de creation. Assure toi de prendre 
>  en compte tous les WIT que nous avons crees, ne pas fixer uniquement pour les 
>  test plans."

**Liste exhaustive des 7 WIT a supporter** :

```
Schema refName                       ADO refName (dynamique)
==================================   =========================================
TestVault.TestCase                   ArgosInheritedDemo.TestVaultTestCase
TestVault.TestPlan                   ArgosInheritedDemo.TestVaultTestPlan
TestVault.TestSet                    ArgosInheritedDemo.TestVaultTestSet
TestVault.Precondition               ArgosInheritedDemo.TestVaultPrecondition
TestVault.TestExecution              ArgosInheritedDemo.TestVaultTestExecution
TestVault.TestCaseVersion            ArgosInheritedDemo.TestVaultTestCaseVersion
TestVault.AuditLog                   ArgosInheritedDemo.TestVaultAuditLog
```

**Architecture du fix : WitResolver service** :

Un service injectable qui :
1. Cache la map schema <-> ADO refNames au premier appel
2. Resout `schemaRefName -> adoRefName` pour CREATE
3. Resout `adoRefName -> schemaRefName` pour READ (decode)
4. Translate fields dans bodies CRUD (schema <-> ADO)
5. Translate states si update state (Sprint 2.14 pattern)

Refs :
- Sprint 2.10-2.15 (chaine SDK + extension)
- Sprint 2.15 helpers : isArgosWit, findSchemaWitByAdoRefName, schemaToAdoFieldRefName, etc.
- TECH-DEBT-054 LIVRE Sprint 2.15 (detection part) + Sprint 2.16 (CRUD part)
- TECH-DEBT-019 : E2E reel, retest pending

---

## Decisions actees lundi 2026-05-18 ~19h00

| # | Element | Choix |
|---|---|---|
| D122 | Architecture | A -- WitResolver service avec cache runtime |
| D123 | Cache strategy | A -- Cache au premier appel, valide pour la session |
| D124 | Scope | A -- TOUS les 7 WIT TestVault simultaneously |
| D125 | Body fields translation | A -- Automatique via resolver (TestVault.X <-> Custom.TestVaultX) |
| D126 | State translation | A -- Same pattern si update state |
| D127 | Backwards compat | OUI -- Schema refNames acceptes via translation transparente |

---

## Architecture cible

### Step 1 : Service WitResolver

```typescript
// packages/argos-wit-schema/src/wit-resolver.ts (NEW)

export interface IWitTypeProvider {
    getWorkItemTypes(projectId: string): Promise<Array<{ referenceName: string; name: string }>>;
}

export interface WitResolver {
    /**
     * Resolve a schema refName (TestVault.X) to its ADO refName (ProcessName.TestVaultX).
     * Uses cached map if available, else fetches WIT types from project.
     */
    resolveAdoWitRefName(schemaRefName: string): Promise<string>;
    
    /**
     * Resolve an ADO refName back to schema refName.
     * Pure (no async, uses naming helpers).
     */
    resolveSchemaWitRefName(adoRefName: string): string | null;
    
    /**
     * Translate field keys from schema to ADO refNames (for POST/PATCH bodies).
     * { "TestVault.Priority": "High", "System.Title": "..." }
     *   -> { "Custom.TestVaultPriority": "High", "System.Title": "..." }
     */
    translateFieldsToAdo(fields: Record<string, unknown>): Record<string, unknown>;
    
    /**
     * Translate field keys from ADO to schema refNames (for GET responses).
     * { "Custom.TestVaultPriority": "High", "System.Title": "..." }
     *   -> { "TestVault.Priority": "High", "System.Title": "..." }
     */
    translateFieldsFromAdo(fields: Record<string, unknown>): Record<string, unknown>;
    
    /**
     * Clear cache (e.g. if process changes during session, rare).
     */
    invalidateCache(): void;
}

export function createWitResolver(
    client: IWitTypeProvider,
    projectId: string
): WitResolver {
    let cache: Map<string, string> | null = null;
    
    async function ensureCache(): Promise<Map<string, string>> {
        if (cache) return cache;
        
        const adoWits = await client.getWorkItemTypes(projectId);
        const newCache = new Map<string, string>();
        
        for (const adoWit of adoWits) {
            const schemaWit = findSchemaWitByAdoRefName(adoWit.referenceName);
            if (schemaWit) {
                newCache.set(schemaWit.referenceName, adoWit.referenceName);
            }
        }
        
        cache = newCache;
        return cache;
    }
    
    return {
        async resolveAdoWitRefName(schemaRefName: string): Promise<string> {
            const map = await ensureCache();
            const adoRefName = map.get(schemaRefName);
            
            if (!adoRefName) {
                throw new Error(
                    `[WitResolver] No ADO refName found for schema "${schemaRefName}". ` +
                    `Available mappings: ${Array.from(map.entries()).map(([s, a]) => `${s}=>${a}`).join(", ")}`
                );
            }
            return adoRefName;
        },
        
        resolveSchemaWitRefName(adoRefName: string): string | null {
            const schemaWit = findSchemaWitByAdoRefName(adoRefName);
            return schemaWit?.referenceName ?? null;
        },
        
        translateFieldsToAdo(fields: Record<string, unknown>): Record<string, unknown> {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(fields)) {
                const adoKey = schemaToAdoFieldRefName(key);  // TestVault.X -> Custom.TestVaultX
                result[adoKey] = value;
            }
            return result;
        },
        
        translateFieldsFromAdo(fields: Record<string, unknown>): Record<string, unknown> {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(fields)) {
                if (isArgosField(key)) {
                    const found = findSchemaFieldByAdoRefName(key);
                    if (found) {
                        result[found.fieldRefName] = value;
                        continue;
                    }
                }
                result[key] = value;  // System.Title etc passthrough
            }
            return result;
        },
        
        invalidateCache(): void {
            cache = null;
        },
    };
}
```

### Step 2 : Apply to extension UI consumers

Identifier TOUS les endroits qui :
- Creent un work item (createWorkItem)
- Lisent un work item (getWorkItem)
- Updatent un work item (updateWorkItem)
- Listent des work items (getWorkItems / query)
- Set up le client ADO

Probablement dans :
- `apps/argos-extension/src/hub/services.ts` (modifie Sprint 2.15 +3/-1)
- Peut-etre `apps/argos-extension/src/hub/App.tsx`
- Peut-etre dans des hooks ou contexts React

---

## Composition exacte du sprint -- 6 LOTS

### Lot 0 -- Diagnostic complet (~20 min)

```powershell
# 1. Voir services.ts complet (modifie Sprint 2.15)
Get-Content apps\argos-extension\src\hub\services.ts -Encoding UTF8

# 2. Identifier TOUS les appels createWorkItem / getWorkItem / updateWorkItem
Select-String -Path apps\argos-extension\src\**\*.ts*,packages\argos-detection-api\src\**\*.ts -Pattern "createWorkItem|getWorkItem|updateWorkItem|workItem\s*\(" -Encoding UTF8 -Context 0,2 | Select-Object -First 30

# 3. Identifier TOUS les usages de "TestVault." comme refName
Select-String -Path apps\argos-extension\src\**\*.ts*,packages\argos-detection-api\src\**\*.ts -Pattern "TestVault\.\w+" -Encoding UTF8 | Select-Object -First 30

# 4. Voir App.tsx ou il y a setIsInstalled (ligne 290-360)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8 | Select-Object -Skip 285 -First 80

# 5. Trouver le client ADO setup (IAdoWorkItemClient)
Select-String -Path apps\argos-extension\src\**\*.ts*,packages\argos-detection-api\src\**\*.ts -Pattern "IAdoWorkItemClient|adoClient|workItemClient" -Encoding UTF8 -Context 0,2 | Select-Object -First 20

# 6. Trouver le projectId / projectName context
Select-String -Path apps\argos-extension\src\**\*.ts*,packages\argos-detection-api\src\**\*.ts -Pattern "projectId|projectName|getProject" -Encoding UTF8 -Context 0,1 | Select-Object -First 15

# 7. Voir IAdoWorkItemClient interface
Get-Content packages\argos-detection-api\src\wit-schema-reader.ts -Encoding UTF8 | Select-String "interface IAdoWorkItemClient|ArgosWorkItemType|ArgosWitField" -Context 0,5
```

**Documenter le resultat** pour adapter Lot B.

### Lot A -- Create WitResolver service (~45 min)

#### A1. Creer `packages/argos-wit-schema/src/wit-resolver.ts`

(Voir code complet section "Architecture cible" ci-dessus)

#### A2. Update `packages/argos-wit-schema/src/index.ts`

```typescript
// Existing exports preserved...

// NEW Sprint 2.16:
export type { WitResolver, IWitTypeProvider } from "./wit-resolver.js";
export { createWitResolver } from "./wit-resolver.js";
```

#### A3. Tests unitaires `packages/argos-wit-schema/src/wit-resolver.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { createWitResolver, type IWitTypeProvider } from "./wit-resolver.js";

describe("WitResolver -- WIT refName resolution", () => {
    const mockClient: IWitTypeProvider = {
        getWorkItemTypes: vi.fn().mockResolvedValue([
            { referenceName: "ArgosInheritedDemo.TestVaultTestCase", name: "TestVault Test Case" },
            { referenceName: "ArgosInheritedDemo.TestVaultTestPlan", name: "TestVault Test Plan" },
            { referenceName: "ArgosInheritedDemo.TestVaultTestSet", name: "TestVault Test Set" },
            { referenceName: "ArgosInheritedDemo.TestVaultPrecondition", name: "TestVault Precondition" },
            { referenceName: "ArgosInheritedDemo.TestVaultTestExecution", name: "TestVault Test Execution" },
            { referenceName: "ArgosInheritedDemo.TestVaultTestCaseVersion", name: "TestVault Test Case Version" },
            { referenceName: "ArgosInheritedDemo.TestVaultAuditLog", name: "TestVault Audit Log" },
            { referenceName: "Microsoft.VSTS.WorkItemTypes.Bug", name: "Bug" },
        ]),
    };
    
    it("resolves schema refName to ADO refName for all 7 WIT", async () => {
        const resolver = createWitResolver(mockClient, "project-1");
        
        expect(await resolver.resolveAdoWitRefName("TestVault.TestCase"))
            .toBe("ArgosInheritedDemo.TestVaultTestCase");
        expect(await resolver.resolveAdoWitRefName("TestVault.TestPlan"))
            .toBe("ArgosInheritedDemo.TestVaultTestPlan");
        expect(await resolver.resolveAdoWitRefName("TestVault.TestSet"))
            .toBe("ArgosInheritedDemo.TestVaultTestSet");
        expect(await resolver.resolveAdoWitRefName("TestVault.Precondition"))
            .toBe("ArgosInheritedDemo.TestVaultPrecondition");
        expect(await resolver.resolveAdoWitRefName("TestVault.TestExecution"))
            .toBe("ArgosInheritedDemo.TestVaultTestExecution");
        expect(await resolver.resolveAdoWitRefName("TestVault.TestCaseVersion"))
            .toBe("ArgosInheritedDemo.TestVaultTestCaseVersion");
        expect(await resolver.resolveAdoWitRefName("TestVault.AuditLog"))
            .toBe("ArgosInheritedDemo.TestVaultAuditLog");
    });
    
    it("throws clear error if schema refName not found", async () => {
        const resolver = createWitResolver(mockClient, "project-1");
        await expect(resolver.resolveAdoWitRefName("TestVault.Unknown"))
            .rejects.toThrow(/No ADO refName found for schema "TestVault.Unknown"/);
    });
    
    it("caches WIT types on first call", async () => {
        const localMock = vi.fn().mockResolvedValue([
            { referenceName: "MyProc.TestVaultTestCase", name: "TestVault Test Case" },
        ]);
        const resolver = createWitResolver({ getWorkItemTypes: localMock }, "p1");
        
        await resolver.resolveAdoWitRefName("TestVault.TestCase");
        await resolver.resolveAdoWitRefName("TestVault.TestCase");
        await resolver.resolveAdoWitRefName("TestVault.TestCase");
        
        expect(localMock).toHaveBeenCalledTimes(1);
    });
    
    it("invalidateCache forces re-fetch", async () => {
        const localMock = vi.fn().mockResolvedValue([
            { referenceName: "P.TestVaultTestCase", name: "TestVault Test Case" },
        ]);
        const resolver = createWitResolver({ getWorkItemTypes: localMock }, "p1");
        
        await resolver.resolveAdoWitRefName("TestVault.TestCase");
        resolver.invalidateCache();
        await resolver.resolveAdoWitRefName("TestVault.TestCase");
        
        expect(localMock).toHaveBeenCalledTimes(2);
    });
    
    it("supports custom process names", async () => {
        const customMock = vi.fn().mockResolvedValue([
            { referenceName: "MyCustomProcess.TestVaultTestCase", name: "TestVault Test Case" },
            { referenceName: "MyCustomProcess.TestVaultTestPlan", name: "TestVault Test Plan" },
        ]);
        const resolver = createWitResolver({ getWorkItemTypes: customMock }, "p1");
        
        expect(await resolver.resolveAdoWitRefName("TestVault.TestCase"))
            .toBe("MyCustomProcess.TestVaultTestCase");
    });
});

describe("WitResolver -- schema refName resolution (reverse)", () => {
    const mockClient: IWitTypeProvider = { getWorkItemTypes: vi.fn() };
    
    it("resolves ADO refName back to schema refName", () => {
        const resolver = createWitResolver(mockClient, "p1");
        
        expect(resolver.resolveSchemaWitRefName("ArgosInheritedDemo.TestVaultTestCase"))
            .toBe("TestVault.TestCase");
        expect(resolver.resolveSchemaWitRefName("MyProcess.TestVaultTestPlan"))
            .toBe("TestVault.TestPlan");
    });
    
    it("returns null for non-Argos ADO refName", () => {
        const resolver = createWitResolver(mockClient, "p1");
        expect(resolver.resolveSchemaWitRefName("Microsoft.VSTS.WorkItemTypes.Bug"))
            .toBeNull();
    });
});

describe("WitResolver -- field translation", () => {
    const mockClient: IWitTypeProvider = { getWorkItemTypes: vi.fn() };
    
    it("translateFieldsToAdo : schema field keys to Custom. prefixed", () => {
        const resolver = createWitResolver(mockClient, "p1");
        const result = resolver.translateFieldsToAdo({
            "TestVault.Priority": "High",
            "TestVault.Steps": "Step 1",
            "System.Title": "My title",
            "System.Description": "Desc",
        });
        expect(result).toEqual({
            "Custom.TestVaultPriority": "High",
            "Custom.TestVaultSteps": "Step 1",
            "System.Title": "My title",
            "System.Description": "Desc",
        });
    });
    
    it("translateFieldsFromAdo : Custom. prefixed back to schema", () => {
        const resolver = createWitResolver(mockClient, "p1");
        const result = resolver.translateFieldsFromAdo({
            "Custom.TestVaultPriority": "High",
            "Custom.TestVaultSteps": "Step 1",
            "System.Title": "My title",
        });
        expect(result).toEqual({
            "TestVault.Priority": "High",
            "TestVault.Steps": "Step 1",
            "System.Title": "My title",
        });
    });
    
    it("handles empty fields object", () => {
        const resolver = createWitResolver(mockClient, "p1");
        expect(resolver.translateFieldsToAdo({})).toEqual({});
        expect(resolver.translateFieldsFromAdo({})).toEqual({});
    });
    
    it("translates ALL 7 WIT field families", () => {
        const resolver = createWitResolver(mockClient, "p1");
        const allFields = {
            // From TestCase
            "TestVault.Priority": "High",
            "TestVault.Steps": "[]",
            "TestVault.AutomationStatus": "Manual",
            // From TestPlan
            "TestVault.Environments": "QA,DEV",
            "TestVault.TestSetIds": "[1,2,3]",
            // From TestExecution
            "TestVault.GlobalStatus": "Passed",
            "TestVault.Environment": "QA",
            // From AuditLog
            "TestVault.ActorUserId": "user-1",
            "TestVault.Operation": "Create",
        };
        const result = resolver.translateFieldsToAdo(allFields);
        expect(result["Custom.TestVaultPriority"]).toBe("High");
        expect(result["Custom.TestVaultEnvironments"]).toBe("QA,DEV");
        expect(result["Custom.TestVaultGlobalStatus"]).toBe("Passed");
        expect(result["Custom.TestVaultActorUserId"]).toBe("user-1");
    });
});
```

### Lot B -- Apply WitResolver to extension consumers (~30 min)

#### B1. Identifier le entry point principal

Le diagnostic Lot 0 a identifie services.ts comme principal consumer.

Architecture probable apres Lot 0 :

```
apps/argos-extension/src/hub/services.ts
   exports : createTestPlan, createTestCase, getTestPlan, etc.
   uses : ADO client direct + schema refNames
```

Cible apres Sprint 2.16 :

```
apps/argos-extension/src/hub/services.ts
   uses : witResolver (singleton ou injected)
   - resolveAdoWitRefName before each createWorkItem
   - translateFieldsToAdo before each POST/PATCH body
   - translateFieldsFromAdo on each GET response
```

#### B2. Create or update services.ts

```typescript
import { 
    createWitResolver, 
    type WitResolver,
    type IWitTypeProvider,
} from "@atconseil/argos-wit-schema";

// Module-level singleton (or pass via React context if cleaner)
let resolverPromise: Promise<WitResolver> | null = null;

function getResolver(client: IWitTypeProvider, projectId: string): Promise<WitResolver> {
    if (!resolverPromise) {
        resolverPromise = Promise.resolve(createWitResolver(client, projectId));
    }
    return resolverPromise;
}

// Generic helper for ALL 7 WIT
export async function createArgosWorkItem(
    adoClient: IAdoWorkItemClient,
    projectId: string,
    schemaWitRefName: string,
    fields: Record<string, unknown>
): Promise<{ id: number }> {
    const resolver = await getResolver(adoClient, projectId);
    const adoWitRefName = await resolver.resolveAdoWitRefName(schemaWitRefName);
    const adoFields = resolver.translateFieldsToAdo(fields);
    
    return adoClient.createWorkItem(projectId, adoWitRefName, adoFields);
}

export async function getArgosWorkItem(
    adoClient: IAdoWorkItemClient,
    projectId: string,
    workItemId: number
): Promise<{ id: number; fields: Record<string, unknown>; refName: string }> {
    const wi = await adoClient.getWorkItem(projectId, workItemId);
    const resolver = await getResolver(adoClient, projectId);
    
    return {
        ...wi,
        fields: resolver.translateFieldsFromAdo(wi.fields),
        // Optional: also resolve refName back to schema
        // schemaRefName: resolver.resolveSchemaWitRefName(wi.refName),
    };
}

export async function updateArgosWorkItem(
    adoClient: IAdoWorkItemClient,
    projectId: string,
    workItemId: number,
    fields: Record<string, unknown>
): Promise<void> {
    const resolver = await getResolver(adoClient, projectId);
    const adoFields = resolver.translateFieldsToAdo(fields);
    await adoClient.updateWorkItem(projectId, workItemId, adoFields);
}

// Convenience wrappers per WIT for type safety + DX (TOUS LES 7 WIT)
export const createTestCase = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.TestCase", fields);

export const createTestPlan = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.TestPlan", fields);

export const createTestSet = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.TestSet", fields);

export const createPrecondition = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.Precondition", fields);

export const createTestExecution = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.TestExecution", fields);

export const createTestCaseVersion = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.TestCaseVersion", fields);

export const createAuditLog = (client: IAdoWorkItemClient, projId: string, fields: Record<string, unknown>) =>
    createArgosWorkItem(client, projId, "TestVault.AuditLog", fields);
```

#### B3. Update existing call sites

Pour CHAQUE endroit identifie au Lot 0 qui faisait :

```typescript
// AVANT:
await adoClient.createWorkItem(projectId, "TestVault.TestPlan", fields);

// APRES:
await createTestPlan(adoClient, projectId, fields);
// OR generic:
await createArgosWorkItem(adoClient, projectId, "TestVault.TestPlan", fields);
```

**Si TestVault.X est utilise dans 5+ endroits hardcoded, refacto un par un.**

### Lot C -- Tests integration + CFG regression (~25 min)

#### C1. Integration tests

Creer `apps/argos-extension/src/hub/services.test.ts` (ou etendre si existe) :

```typescript
import { describe, it, expect, vi } from "vitest";
import { 
    createTestPlan, createTestCase, createTestSet, 
    createPrecondition, createTestExecution,
    createTestCaseVersion, createAuditLog,
} from "./services";

describe("CRUD ops use ADO refNames (Sprint 2.16)", () => {
    function buildMockClient() {
        return {
            getWorkItemTypes: vi.fn().mockResolvedValue([
                { referenceName: "ArgosInheritedDemo.TestVaultTestCase", name: "TestVault Test Case" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestPlan", name: "TestVault Test Plan" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestSet", name: "TestVault Test Set" },
                { referenceName: "ArgosInheritedDemo.TestVaultPrecondition", name: "TestVault Precondition" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestExecution", name: "TestVault Test Execution" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestCaseVersion", name: "TestVault Test Case Version" },
                { referenceName: "ArgosInheritedDemo.TestVaultAuditLog", name: "TestVault Audit Log" },
            ]),
            createWorkItem: vi.fn().mockResolvedValue({ id: 42 }),
            getWorkItem: vi.fn(),
            updateWorkItem: vi.fn(),
        };
    }
    
    it("createTestPlan uses ADO refName ArgosInheritedDemo.TestVaultTestPlan", async () => {
        const client = buildMockClient();
        await createTestPlan(client, "proj-1", { "TestVault.Priority": "High" });
        
        expect(client.createWorkItem).toHaveBeenCalledWith(
            "proj-1",
            "ArgosInheritedDemo.TestVaultTestPlan",
            { "Custom.TestVaultPriority": "High" }
        );
    });
    
    it("createTestCase uses ADO refName and translates fields", async () => {
        const client = buildMockClient();
        await createTestCase(client, "proj-1", { 
            "TestVault.Priority": "1",
            "TestVault.Steps": "[]",
            "System.Title": "My case",
        });
        
        expect(client.createWorkItem).toHaveBeenCalledWith(
            "proj-1",
            "ArgosInheritedDemo.TestVaultTestCase",
            { 
                "Custom.TestVaultPriority": "1",
                "Custom.TestVaultSteps": "[]",
                "System.Title": "My case",
            }
        );
    });
    
    it("all 7 WIT have working create function", async () => {
        const client = buildMockClient();
        
        await createTestCase(client, "p1", {});
        await createTestPlan(client, "p1", {});
        await createTestSet(client, "p1", {});
        await createPrecondition(client, "p1", {});
        await createTestExecution(client, "p1", {});
        await createTestCaseVersion(client, "p1", {});
        await createAuditLog(client, "p1", {});
        
        expect(client.createWorkItem).toHaveBeenCalledTimes(7);
        
        // Verify ADO refNames used
        const calls = client.createWorkItem.mock.calls.map(c => c[1]);
        expect(calls).toContain("ArgosInheritedDemo.TestVaultTestCase");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultTestPlan");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultTestSet");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultPrecondition");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultTestExecution");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultTestCaseVersion");
        expect(calls).toContain("ArgosInheritedDemo.TestVaultAuditLog");
    });
});
```

#### C2. CFG regression test

Creer `tools/regression/CFG-2026-05-18-crud-refname-resolver.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG CRUD refName resolver Sprint 2.16", () => {
    const root = resolve(__dirname, "../..");
    
    it("argos-wit-schema/wit-resolver.ts exists", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/wit-resolver.ts");
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        expect(content).toContain("createWitResolver");
        expect(content).toContain("resolveAdoWitRefName");
        expect(content).toContain("translateFieldsToAdo");
        expect(content).toContain("translateFieldsFromAdo");
    });
    
    it("argos-wit-schema exports WitResolver", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/index.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("createWitResolver");
        expect(content).toContain("WitResolver");
    });
    
    it("extension consumers no longer hardcode schema refNames in createWorkItem", () => {
        const servicesPath = resolve(root, "apps/argos-extension/src/hub/services.ts");
        const content = readFileSync(servicesPath, "utf8");
        // Should NOT have createWorkItem("TestVault.X" hardcoded pattern
        const badPattern = /createWorkItem\s*\(\s*["']TestVault\./;
        expect(badPattern.test(content)).toBe(false);
        // Should use resolver
        expect(content).toContain("createWitResolver");
    });
    
    it("convenience wrappers exist for ALL 7 WIT", () => {
        const servicesPath = resolve(root, "apps/argos-extension/src/hub/services.ts");
        const content = readFileSync(servicesPath, "utf8");
        expect(content).toContain("createTestCase");
        expect(content).toContain("createTestPlan");
        expect(content).toContain("createTestSet");
        expect(content).toContain("createPrecondition");
        expect(content).toContain("createTestExecution");
        expect(content).toContain("createTestCaseVersion");
        expect(content).toContain("createAuditLog");
    });
});
```

### Lot D -- Bump + CHANGELOG + commit + PR (~25 min)

#### D1. Bump 0.5.17 -> 0.5.18

```powershell
node tools\release\bump-fixed-version.cjs 0.5.18

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D2. CHANGELOG.md [0.5.18]

```markdown
## [0.5.18] - 2026-05-18

### Fixed

**Sprint 2.16 -- CRUD operations refName resolver for ALL 7 WIT**

CRITICAL fix discovered at E2E test 2026-05-18 ~19h after Sprint 2.15 (extension detection):
```
VS402323: Work item type TestVault.TestPlan does not exist in project ...
WorkItemTypeNotFoundException
```

Root cause: Extension UI sent CRUD operations with schema refNames 
("TestVault.TestPlan") but ADO uses dynamic process-prefixed refNames 
("ArgosInheritedDemo.TestVaultTestPlan"). Sprint 2.15 fixed READ (detection), 
but CREATE/UPDATE still used schema refNames.

User requirement (2026-05-18 ~19h):
> "Assure toi de prendre en compte tous les WIT que nous avons crees, 
>  ne pas fixer uniquement pour les test plans."

### Architecture changes

#### WitResolver service (argos-wit-schema)

NEW `packages/argos-wit-schema/src/wit-resolver.ts`:
- `createWitResolver(client, projectId)`: factory
- `resolveAdoWitRefName(schemaRefName)`: schema -> ADO with cache
- `resolveSchemaWitRefName(adoRefName)`: reverse (pure)
- `translateFieldsToAdo(fields)`: { "TestVault.X": v } -> { "Custom.TestVaultX": v }
- `translateFieldsFromAdo(fields)`: reverse for GET responses
- `invalidateCache()`: for rare edge cases

The resolver caches WIT type map on first call, valid for session.

#### Extension consumers use convenience wrappers

NEW in `apps/argos-extension/src/hub/services.ts`:
- `createArgosWorkItem(client, projectId, schemaRefName, fields)`: generic
- `createTestCase`, `createTestPlan`, `createTestSet`, `createPrecondition`,
  `createTestExecution`, `createTestCaseVersion`, `createAuditLog`: typed wrappers
- `getArgosWorkItem`, `updateArgosWorkItem`: with translation

All 7 schema WIT supported. All field translations automatic.

### Tests

- 10+ unit tests in wit-resolver.test.ts
- 5+ integration tests in services.test.ts covering all 7 WIT
- CFG-2026-05-18-crud-refname-resolver regression test
- All Sprint 2.7-2.15 tests still green

### TECH-DEBT

- TECH-DEBT-054 FULLY LIVRE: detection (Sprint 2.15) + CRUD ops (Sprint 2.16)
- TECH-DEBT-019: E2E reel, retest pending after this sprint

### Architecture preserved

- TESTVAULT_SCHEMA immutable (constitution section 12)
- Sprint 2.7-2.15 chain maintained
- argos-wit-schema source of truth for naming

### After this sprint -- expected E2E

```
Hub Argos > Test Plans > Create Test Plan
Title: "Premier Test Plan Argos 0.5.18"
Click Create
-> Toast success
-> Test Plan visible in list
-> Work item id assigned
```

Repeat for ALL 7 WIT: TestCase, TestPlan, TestSet, Precondition, TestExecution, 
TestCaseVersion, AuditLog -- all CRUD operations functional.

### Cumulative session 2026-05-18 (10 sprints livres)

Total bugs E2E fixed today:
1. VS402848 picklist conflict (Sprint 2.8)
2. VS403344 icon invalid (Sprint 2.9)
3. VS402805 WIT refName not found (Sprint 2.10)
4. TF51535 field "TestVault.X" (Sprint 2.11)
5. TF51535 field "Custom.TestVaultX" (Sprint 2.12)
6. VS402803 field name "Priority" (Sprint 2.13)
7. VS403083 state name "Active" (Sprint 2.14)
8. Extension detection refName mismatch (Sprint 2.15)
9. VS402323 CRUD ops refName mismatch (Sprint 2.16 -- THIS)

Architectural principles validated:
- "Tout custom prefixe TestVault X" (Sprint 2.13/2.14)
- argos-wit-schema = source of truth (Sprint 2.15/2.16)
- Runtime refName resolution via cache (Sprint 2.16)

### Lessons learned

- ADO inherited processes use dynamic refName prefixes
- READ operations (detection) needed suffix match (Sprint 2.15)
- CREATE/UPDATE operations need full resolution (Sprint 2.16)
- Resolver pattern : 1 GET at startup, cached for session, all CRUD use it
- Field translation must be automatic (UI keeps schema refNames, resolver translates)
```

#### D3. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-054 FULLY LIVRE (Sprint 2.15 detection + Sprint 2.16 CRUD)
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.16
- [ ] Document architectural principles in Specs/ARCHITECTURE.md (TECH-DEBT future)
```

#### D4. Pre-commit + commit + push

```powershell
$msg = "fix(extension): Sprint 2.16 CRUD ops refName resolver for ALL 7 WIT"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(extension): Sprint 2.16 CRUD ops refName resolver for ALL 7 WIT

After Sprint 2.15 fixed extension detection (READ), CREATE operations still
failed because they used schema refNames :

  VS402323: Work item type TestVault.TestPlan does not exist in project ...

User requirement (2026-05-18 ~19h) :
"Prendre en compte tous les WIT que nous avons crees,
 ne pas fixer uniquement pour les test plans."

Architecture :

NEW packages/argos-wit-schema/src/wit-resolver.ts :
- createWitResolver(client, projectId) factory
- resolveAdoWitRefName(schemaRefName) : schema -> ADO with cache
- resolveSchemaWitRefName(adoRefName) : reverse
- translateFieldsToAdo : "TestVault.X" -> "Custom.TestVaultX"
- translateFieldsFromAdo : reverse for GET responses

NEW apps/argos-extension/src/hub/services.ts wrappers for ALL 7 WIT :
- createTestCase, createTestPlan, createTestSet, createPrecondition,
  createTestExecution, createTestCaseVersion, createAuditLog
- Generic createArgosWorkItem / getArgosWorkItem / updateArgosWorkItem

All hardcoded "TestVault.X" refNames in createWorkItem replaced with resolver.

Tests :
- 10+ unit tests wit-resolver.test.ts (cache, all 7 WIT, fields, reverse)
- 5+ integration tests services.test.ts (all 7 WIT scenarios)
- CFG-2026-05-18-crud-refname-resolver
- All Sprint 2.7-2.15 tests still green

TECH-DEBT :
- TECH-DEBT-054 FULLY LIVRE (detection Sprint 2.15 + CRUD Sprint 2.16)
- TECH-DEBT-019 retest after this sprint

Bump 0.5.17 -> 0.5.18.

Refs :
- Sprint 2.7-2.15 chain
- E2E test failure 2026-05-18 ~19h : VS402323 WorkItemTypeNotFoundException
- User architectural insight : pattern applique a TOUS les WIT TestVault
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-16.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-16.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-16.txt"

git push -u origin feat/sprint-2-16-crud-refname-resolver
```

#### D5. PR

```powershell
$prBody = @'
## Summary

Sprint 2.16 -- final fix : CRUD ops use WitResolver for ALL 7 WIT TestVault.

After Sprint 2.15 fixed extension detection, CREATE operations still failed 
with VS402323 because they used schema refNames instead of ADO refNames.

## User requirement

> "Prendre en compte tous les WIT que nous avons crees, 
>  ne pas fixer uniquement pour les test plans."

Applied to: TestCase, TestPlan, TestSet, Precondition, TestExecution, 
TestCaseVersion, AuditLog (all 7).

## Architecture

NEW WitResolver service in argos-wit-schema (source of truth) :
- Cache map at startup (1 GET WIT types per session)
- Resolve schema -> ADO refName for CREATE/UPDATE
- Translate fields automatically (TestVault.X -> Custom.TestVaultX)
- Reverse translation for GET responses

Extension consumers use convenience wrappers per WIT.

## Tests

- 10+ unit tests wit-resolver
- 5+ integration tests services (all 7 WIT)
- CFG-2026-05-18 regression
- All Sprint 2.7-2.15 tests still green

## After merge -- expected E2E

Create Test Plan / Test Case / etc -> SUCCESS for ALL 7 WIT
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-16.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(extension): Sprint 2.16 CRUD ops refName resolver for ALL 7 WIT" `
  --body-file "$env:TEMP\pr-body-sprint-2-16.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-16.txt"
```

#### D6. Archive + cleanup post-merge

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-16.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-16.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-16.md
}
```

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-16-crud-refname-resolver 2>$null
```

### Lot E -- Tag + retest E2E FINAL (15 min)

#### E1. Tag v0.5.18

```powershell
git checkout main
git pull
git tag -a v0.5.18 -m "Release v0.5.18 -- Sprint 2.16 CRUD ops refName resolver"
git push origin v0.5.18
```

#### E2. CI workflows (~5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions
1. Publish Marketplace 0.5.18
2. Publish CLI npm 0.5.18
```

#### E3. Update extension a 0.5.18

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
"Argos Testing" : Update vers 0.5.18

PAS DE CLEANUP BCEE-QA. Le SDK install Sprint 2.14 reste valide.
```

#### E4. TEST E2E FINAL

```
1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. Ctrl+F5
3. Hub Argos > Test Plans
4. Click "Create Test Plan"
5. Name : "Premier Test Plan Argos 0.5.18"
6. Click Create

Expected :
[X] Toast success "Test Plan created"
[X] Test Plan visible in list
[X] Work item id assigned (visible in URL)

7. Click le Test Plan cree :
[X] Detail page opens
[X] Fields populated correctly (System.Title visible, TestVault.X fields)

8. Bonus : test creation Test Case
   Hub Argos > Cases > Create Test Case
   -> Should ALSO succeed (all 7 WIT supported)
```

#### E5. Resultats possibles

```
SCENARIO A : ALL CREATE OPS WORK (espere)
   -> MILESTONE PRODUIT FONCTIONNEL TOTAL ATTEINT
   -> 10 sprints hotfix livres aujourd'hui
   -> Saga complete documentee

SCENARIO B : Test Plan OK mais Test Case echoue (ou autre WIT)
   -> Sub-bug specifique au WIT
   -> Diagnostic + Sprint 2.17 demain

SCENARIO C : Toujours VS402323 ou similaire
   -> Probleme de cache resolver / projectId pas accessible
   -> Diagnostic console DevTools (F12)
   -> Sprint 2.17 demain
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : Couvrir TOUS les 7 WIT TestVault

Exigence user explicite : pas point-fix sur Test Plan, mais pattern global.
Tests doivent valider les 7 wrappers.

### GF23 : Resolver pattern coherent

Single source : argos-wit-schema (Sprint 2.15 source of truth).
Cache : 1 fetch per session, partage entre tous les CRUD operations.

### GF24 : Sprint 2.7-2.15 tests doivent rester verts

Aucun test precedent ne doit casser.

### GF25 : Backwards compat preservee

Si certains call sites passent encore TestVault.X, ne pas faire planter.
Resolver throw avec message clair si refName inconnu.

### GF26 : Pas de modification process-install.ts

Le SDK install Sprint 2.7-2.14 reste intact. Sprint 2.16 ne touche QUE :
- argos-wit-schema (NEW file wit-resolver.ts)
- apps/argos-extension (consumers update)

### GF27 : Translation transparente

Les call sites de services.ts utilisent toujours TestVault.X (schema refNames).
Le resolver fait la translation invisible. UI ne change pas.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-16-crud-refname-resolver

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 20
pnpm --filter @atconseil/argos-detection-api test 2>&1 | Select-Object -Last 20
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 15

# Extension app tests
pnpm --filter argos-extension test 2>&1 | Select-Object -Last 20

pnpm turbo build --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Diagnostic complet. X call sites identifies utilisant TestVault.X."
2. **Apres Lot A** : "WitResolver + 10+ tests pres. Continue Lot B?"
3. **Apres Lot B** : "All 7 WIT wrappers in place. X call sites refactores."
4. **Apres Lot C** : "Tests integration verts. Continue Lot D?"
5. **Apres Lot D5** : "PR ouverte. Apres merge, lance Lot E tag + retest."

---

## Criteres de done

- [ ] Branche feat/sprint-2-16-crud-refname-resolver creee
- [ ] argos-wit-schema/src/wit-resolver.ts NEW
- [ ] argos-wit-schema/src/index.ts exports createWitResolver
- [ ] services.ts uses createWitResolver + 7 WIT wrappers
- [ ] No hardcoded "createWorkItem("TestVault.X" patterns
- [ ] 10+ unit tests wit-resolver.test.ts
- [ ] 5+ integration tests services.test.ts
- [ ] CFG-2026-05-18-crud-refname-resolver NEW
- [ ] All Sprint 2.7-2.15 tests STILL green
- [ ] Bump 0.5.17 -> 0.5.18
- [ ] CHANGELOG complete
- [ ] tasks.md TECH-DEBT-054 FULLY LIVRE
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.18
- [ ] CI workflows verts
- [ ] Extension 0.5.18 deployed BCEE-QA
- [ ] Create Test Plan SUCCESS in DEMO project
- [ ] Bonus : Create Test Case SUCCESS

---

## Apres ca

### Si MILESTONE PRODUIT FONCTIONNEL TOTAL atteint

Bilan exceptionnel :
```
10 sprints hotfix livres en 1 journee
11 versions Marketplace (0.5.7 a 0.5.18)
9 architectures ADO documentees + traversees
1 architecture naming refactor (Sprint 2.15)
1 resolver service runtime (Sprint 2.16)
3 architectural principles emerged :
  - "Tout custom prefixe TestVault X" (data plane)
  - "argos-wit-schema = source of truth" (code plane)
  - "Resolver pattern + cache" (runtime plane)
```

Demain prioritaires :
- Documenter Specs/ARCHITECTURE.md (principes + naming + resolver)
- TECH-DEBT-017 Azure Functions deploy
- TECH-DEBT-018 Commercial layer
- Commencer la doc public pour Marketplace listing

### Si scenario B ou C (sub-bug detecte)

Sprint 2.17 demain matin pour finir.

---

## Note moral

Apres Sprint 2.16, la chaine COMPLETE est en place :

```
Schema definition       : TESTVAULT_SCHEMA (constitution section 12)
        |
Naming helpers          : argos-wit-schema/src/naming.ts (Sprint 2.15)
        |
Runtime resolver        : argos-wit-schema/src/wit-resolver.ts (Sprint 2.16)
        |
        +-- SDK install : process-install.ts (Sprint 2.7-2.14)
        |
        +-- Extension UI : services.ts wrappers (Sprint 2.16)
                |
                +-- All 7 WIT supported
                +-- All field translations automatic
                +-- All states translations available
```

ARCHITECTURE COMPLETE. SOURCE OF TRUTH RESPECTEE. SCHEMA IMMUABLE.

Bon sprint final !
