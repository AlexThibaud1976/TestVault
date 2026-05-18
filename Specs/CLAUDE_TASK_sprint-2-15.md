# Prompt Claude Code -- Sprint 2.15 extension detection refName suffix matching (`feat/sprint-2-15-extension-detection`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint refactor : extension detection utilise schema refNames mais ADO connait les ADO refNames suffixes.
> Estimation : ~1.5-2h.

---

## Contexte critique

**Decouverte 2026-05-18 ~16h35** : apres Sprint 2.14 (states custom) livre argos@0.5.16, 
l'install SDK fonctionne PARFAITEMENT (7 WIT + 40 fields + states custom). Le projet 
DEMO est migre sur le process "Argos Inherited Demo".

**MAIS** l'extension Argos UI continue d'afficher :

```
LIMITED MODE -- Argos custom WIT not installed. Create/save features are disabled.
```

Le bandeau persiste meme apres :
- 7 WIT custom dans le portal ADO (visibles)
- Projet DEMO migre
- Extension Argos 0.5.16 installee
- Hard refresh

**Cause confirmee par diagnostic** :

```
apps\argos-extension\src\hub\App.tsx:300  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
apps\argos-extension\src\hub\App.tsx:311  ...then(setIsInstalled)
apps\argos-extension\src\hub\App.tsx:333  setIsInstalled(installed);

packages\argos-detection-api\src\wit-schema-reader.ts
  exports : ArgosWitField, ArgosWorkItemType, IArgosSchemaReader, IAdoWorkItemClient,
           createArgosSchemaReader, ARGOS_WIT_NAMES
```

Le `createArgosSchemaReader` (ou son utilisation dans App.tsx) probablement :
1. GET work item types via ADO API
2. Compare ADO refName a `ARGOS_WIT_NAMES` (probablement les schema refNames "TestVault.TestCase")
3. ADO retourne "ArgosInheritedDemo.TestVaultTestCase" 
4. Exact match fail -> "not installed"

**Fix architecturel** :

Pattern deja en place dans argos-sdk (Sprint 2.10) :
- `isArgosWit(adoRefName)` -> suffix match
- `findSchemaWitByAdoRefName(adoRefName)` -> resolve schema WIT

Sprint 2.15 = exposer ces helpers a argos-detection-api + extension UI.

Refs :
- Sprint 2.7-2.14 (chaine SDK)
- TECH-DEBT-054 -- extension argos-detection-api CRUD ops refName translation (LIVRE ce sprint)
- TECH-DEBT-019 -- E2E reel, retest pending

---

## Decisions actees lundi 2026-05-18 ~17h apres-RDV

| # | Element | Choix |
|---|---|---|
| D117 | Architecture helpers | A -- Move isArgosWit & co a argos-wit-schema (source of truth) |
| D118 | Detection strategy | A -- Suffix match avec ARGOS_WIT_REFNAME_SUFFIXES |
| D119 | Field translation cote read | A -- Same pattern for fields (Custom.TestVaultX) |
| D120 | State translation cote read | A -- Same pattern for states (TestVault X prefix) |
| D121 | Backwards compatibility | OUI -- accept schema refNames AND ADO refNames |

---

## Architecture cible

### Step 1 : Move naming helpers a argos-wit-schema

```
packages/argos-wit-schema/
  src/
    naming.ts (NEW)                  <- isArgosWit, findSchemaWitByAdoRefName, etc.
    index.ts (UPDATED)               <- export from naming.ts
    
packages/argos-sdk/
  src/
    wit-refname-matcher.ts (UPDATED) <- import from argos-wit-schema instead of duplicating
    
packages/argos-detection-api/
  src/
    wit-schema-reader.ts (UPDATED)   <- import from argos-wit-schema + use helpers
```

### Step 2 : Detection logic apres fix

```typescript
// Pseudo-code current (probable):
const adoWits = await client.getWorkItemTypes(processId);
const installed = ARGOS_WIT_NAMES.every(name => 
    adoWits.some(w => w.referenceName === name)  // EXACT MATCH FAILS
);

// Pseudo-code after Sprint 2.15:
import { isArgosWit, findSchemaWitByAdoRefName } from "@atconseil/argos-wit-schema";

const adoWits = await client.getWorkItemTypes(processId);
const argosAdoWits = adoWits.filter(w => isArgosWit(w.referenceName));  // SUFFIX MATCH
const installed = argosAdoWits.length === TESTVAULT_SCHEMA.wits.length;
```

---

## Composition exacte du sprint -- 5 LOTS

### Lot 0 -- Read existing code (10 min)

```powershell
# 1. Voir wit-schema-reader.ts complet
Get-Content packages\argos-detection-api\src\wit-schema-reader.ts -Encoding UTF8

# 2. Voir App.tsx detection flow (ligne 290-360)
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8 | Select-Object -Skip 285 -First 80

# 3. Voir argos-wit-schema/src/index.ts exports actuels
Get-Content packages\argos-wit-schema\src\index.ts -Encoding UTF8

# 4. Voir wit-refname-matcher.ts current state
Get-Content packages\argos-sdk\src\wit-refname-matcher.ts -Encoding UTF8

# 5. Voir argos-wit-schema/package.json
Get-Content packages\argos-wit-schema\package.json -Encoding UTF8

# 6. Voir argos-detection-api/package.json  (verifier deps)
Get-Content packages\argos-detection-api\package.json -Encoding UTF8
```

NOTE les resultats pour adapter Lots A & B.

### Lot A -- Move naming helpers a argos-wit-schema (30 min)

#### A1. Creer `packages/argos-wit-schema/src/naming.ts`

```typescript
/**
 * Naming utilities for translating between TESTVAULT_SCHEMA refNames
 * and Azure DevOps inherited process refNames.
 * 
 * Source of truth: this package owns the schema, so it owns the naming rules.
 * Other packages (argos-sdk, argos-detection-api) import from here.
 * 
 * Architecture context : ADO inherited processes use refName pattern
 *   {InheritedProcessName}.{WorkItemTypeNameSansEspaces}
 * 
 * Example : process "Argos Inherited Demo" + WIT "TestVault Test Case"
 *   -> ADO refName "ArgosInheritedDemo.TestVaultTestCase"
 * 
 * Custom fields are prefixed "Custom." by ADO :
 *   schema "TestVault.Priority" -> ADO "Custom.TestVaultPriority"
 * 
 * State and field NAMES (display) are prefixed "TestVault " for org uniqueness :
 *   schema "Priority" -> ADO "TestVault Priority"
 *   schema "Active"   -> ADO "TestVault Active"
 */

import { TESTVAULT_SCHEMA } from "./schema.js";  // adjust import path as needed

// -------------------------------------------------------------------------
// WIT refName translation
// -------------------------------------------------------------------------

/**
 * Compute the ADO refName suffix for a schema WIT.
 * Schema "TestVault.TestCase" -> ADO suffix "TestVaultTestCase"
 * (the {processName} prefix is dynamic per process)
 */
export function schemaWitRefNameToAdoSuffix(schemaRefName: string): string {
    if (!schemaRefName.startsWith("TestVault.")) {
        throw new Error(`Schema WIT refName must start with "TestVault." : "${schemaRefName}"`);
    }
    const witLocalName = schemaRefName.substring("TestVault.".length);
    return `TestVault${witLocalName}`;  // "TestVault" + "TestCase" = "TestVaultTestCase"
}

/**
 * Check if an ADO refName matches an Argos WIT (any of the 7 schema WITs).
 * Uses suffix matching since the {ProcessName} prefix is dynamic.
 *
 * @example
 *   isArgosWit("ArgosInheritedDemo.TestVaultTestCase") -> true
 *   isArgosWit("MyOtherProcess.TestVaultTestCase")     -> true
 *   isArgosWit("Microsoft.VSTS.WorkItemTypes.Bug")     -> false
 *   isArgosWit("TestVault.TestCase")                    -> true (schema-direct, for tests)
 */
export function isArgosWit(adoRefName: string): boolean {
    if (!adoRefName) return false;
    
    // Direct schema refName (for tests or legacy)
    if (adoRefName.startsWith("TestVault.")) {
        return TESTVAULT_SCHEMA.wits.some(w => w.referenceName === adoRefName);
    }
    
    // ADO refName : check suffix matches one of our WITs
    const schemaSuffixes = TESTVAULT_SCHEMA.wits.map(w => schemaWitRefNameToAdoSuffix(w.referenceName));
    return schemaSuffixes.some(suffix => adoRefName.endsWith("." + suffix) || adoRefName === suffix);
}

/**
 * Find the schema WIT corresponding to an ADO refName.
 * Returns null if no match.
 */
export function findSchemaWitByAdoRefName(adoRefName: string): typeof TESTVAULT_SCHEMA.wits[number] | null {
    if (!adoRefName) return null;
    
    // Direct schema refName
    if (adoRefName.startsWith("TestVault.")) {
        return TESTVAULT_SCHEMA.wits.find(w => w.referenceName === adoRefName) ?? null;
    }
    
    // ADO refName : suffix match
    for (const wit of TESTVAULT_SCHEMA.wits) {
        const expectedSuffix = schemaWitRefNameToAdoSuffix(wit.referenceName);
        if (adoRefName.endsWith("." + expectedSuffix) || adoRefName === expectedSuffix) {
            return wit;
        }
    }
    return null;
}

// -------------------------------------------------------------------------
// Field refName translation (Sprint 2.11)
// -------------------------------------------------------------------------

/**
 * Translate a schema field refName to its ADO counterpart.
 * Schema "TestVault.Priority" -> ADO "Custom.TestVaultPriority"
 */
export function schemaToAdoFieldRefName(schemaRefName: string): string {
    if (!schemaRefName.startsWith("TestVault.")) {
        // System fields (System.Title, Microsoft.VSTS.*) unchanged
        return schemaRefName;
    }
    const fieldLocalName = schemaRefName.substring("TestVault.".length);
    return `Custom.TestVault${fieldLocalName}`;
}

/**
 * Check if an ADO field refName is one of ours.
 */
export function isArgosField(adoFieldRefName: string): boolean {
    return adoFieldRefName.startsWith("Custom.TestVault");
}

/**
 * Find the schema field corresponding to an ADO field refName.
 */
export function findSchemaFieldByAdoRefName(
    adoFieldRefName: string
): { fieldRefName: string; witRefName: string } | null {
    if (!isArgosField(adoFieldRefName)) {
        // Maybe a direct schema refName
        for (const wit of TESTVAULT_SCHEMA.wits) {
            for (const field of wit.fields) {
                if (field.referenceName === adoFieldRefName) {
                    return { fieldRefName: field.referenceName, witRefName: wit.referenceName };
                }
            }
        }
        return null;
    }
    
    // ADO field refName : reverse the translation
    const localName = adoFieldRefName.substring("Custom.TestVault".length);
    const schemaRefName = `TestVault.${localName}`;
    
    for (const wit of TESTVAULT_SCHEMA.wits) {
        const field = wit.fields.find(f => f.referenceName === schemaRefName);
        if (field) {
            return { fieldRefName: field.referenceName, witRefName: wit.referenceName };
        }
    }
    return null;
}

// -------------------------------------------------------------------------
// Field display name translation (Sprint 2.13)
// -------------------------------------------------------------------------

/**
 * Translate a schema field display name to its ADO counterpart.
 * "Priority" -> "TestVault Priority"
 */
export function schemaToAdoFieldName(schemaDisplayName: string): string {
    if (!schemaDisplayName || schemaDisplayName.trim().length === 0) {
        throw new Error("Empty schema field display name");
    }
    if (schemaDisplayName.length > 100) {
        throw new Error(`Schema field display name too long (>100 chars): "${schemaDisplayName}"`);
    }
    if (schemaDisplayName.startsWith("TestVault ")) {
        return schemaDisplayName;
    }
    return `TestVault ${schemaDisplayName}`;
}

// -------------------------------------------------------------------------
// State name translation (Sprint 2.14)
// -------------------------------------------------------------------------

/**
 * Translate a schema state name to its ADO counterpart.
 * "Active" -> "TestVault Active"
 */
export function schemaToAdoStateName(schemaStateName: string): string {
    if (!schemaStateName || schemaStateName.trim().length === 0) {
        throw new Error("Empty schema state name");
    }
    if (schemaStateName.length > 100) {
        throw new Error(`Schema state name too long (>100 chars): "${schemaStateName}"`);
    }
    if (schemaStateName.startsWith("TestVault ")) {
        return schemaStateName;
    }
    return `TestVault ${schemaStateName}`;
}

// -------------------------------------------------------------------------
// Validation helpers
// -------------------------------------------------------------------------

const ADO_NAME_FORBIDDEN_CHARS = /[\.,;':~\\/*|?"&%$!+=()[\]{}<>]/;

export function validateAdoFieldName(adoName: string): string | null {
    if (adoName.length > 128) return `Name "${adoName}" exceeds 128 character limit`;
    if (ADO_NAME_FORBIDDEN_CHARS.test(adoName)) return `Name "${adoName}" contains forbidden characters`;
    return null;
}

export function validateAdoStateName(adoName: string): string | null {
    return validateAdoFieldName(adoName);  // same rules
}
```

#### A2. Mettre a jour `packages/argos-wit-schema/src/index.ts`

```typescript
// Existing exports preserved...

// NEW Sprint 2.15 :
export {
    isArgosWit,
    findSchemaWitByAdoRefName,
    schemaWitRefNameToAdoSuffix,
    schemaToAdoFieldRefName,
    isArgosField,
    findSchemaFieldByAdoRefName,
    schemaToAdoFieldName,
    schemaToAdoStateName,
    validateAdoFieldName,
    validateAdoStateName,
} from "./naming.js";
```

#### A3. Mettre a jour `packages/argos-sdk/src/wit-refname-matcher.ts`

Soit :
- Option SHORT : re-export depuis `@atconseil/argos-wit-schema`
- Option LONG : supprimer le fichier + update les imports dans process-install.ts

**Recommande : Option SHORT pour ne pas casser process-install.ts.**

```typescript
// packages/argos-sdk/src/wit-refname-matcher.ts
// 
// Sprint 2.15 : naming helpers moved to argos-wit-schema (source of truth).
// This file remains as a re-export for backwards compatibility within SDK.

export {
    isArgosWit,
    findSchemaWitByAdoRefName,
    schemaWitRefNameToAdoSuffix,
    schemaToAdoFieldRefName,
    isArgosField,
    findSchemaFieldByAdoRefName,
    schemaToAdoFieldName,
    schemaToAdoStateName,
    validateAdoFieldName,
    validateAdoStateName,
} from "@atconseil/argos-wit-schema";
```

#### A4. Verifier dependencies dans `packages/argos-detection-api/package.json`

Si pas deja present, ajouter :
```json
"dependencies": {
    "@atconseil/argos-wit-schema": "workspace:*"
}
```

### Lot B -- Update wit-schema-reader.ts detection (25 min)

#### B1. Mettre a jour `packages/argos-detection-api/src/wit-schema-reader.ts`

Le code actuel n'est pas connu (a lire en Lot 0), mais le pattern est :

```typescript
// AVANT (probable):
const installed = ARGOS_WIT_NAMES.every(name => 
    witTypes.some(w => w.referenceName === name)
);

// APRES (Sprint 2.15):
import { isArgosWit, TESTVAULT_SCHEMA } from "@atconseil/argos-wit-schema";

const argosWits = witTypes.filter(w => isArgosWit(w.referenceName));
const installed = argosWits.length >= TESTVAULT_SCHEMA.wits.length;
```

Si createArgosSchemaReader expose des methodes de lecture (fields, etc.), 
ajouter aussi la translation cote read :

```typescript
import { 
    schemaToAdoFieldRefName, 
    findSchemaFieldByAdoRefName,
    findSchemaWitByAdoRefName,
} from "@atconseil/argos-wit-schema";

// Pour creer ou lire un work item :
async function readField(witRefName: string, fieldSchemaRef: string) {
    const adoFieldRef = schemaToAdoFieldRefName(fieldSchemaRef);
    // ... GET avec adoFieldRef
}

// Pour decoder un work item ADO :
async function readWorkItem(witAdoRefName: string) {
    const schemaWit = findSchemaWitByAdoRefName(witAdoRefName);
    // ... convert fields back to schema refNames for consumers
}
```

#### B2. Mettre a jour App.tsx si necessaire

```powershell
# Voir la fonction qui call detection dans App.tsx
Get-Content apps\argos-extension\src\hub\App.tsx -Encoding UTF8 | Select-Object -Skip 295 -First 50
```

Le `.then(setIsInstalled)` ligne 311 suggere que App.tsx call directement une 
fonction du detection package. Cette fonction est dans wit-schema-reader.ts.

Si la fonction est `createArgosSchemaReader` ou `detectArgos` :
- Mettre a jour son implementation (Lot B1)
- L'App.tsx ne devrait pas necessiter de changement (consume le bool)

Si App.tsx fait la logique de detection lui-meme :
- Importer isArgosWit de @atconseil/argos-wit-schema
- L'utiliser pour filtrer wit types

### Lot C -- Tests (20 min)

#### C1. Tests pour les helpers dans argos-wit-schema

Creer `packages/argos-wit-schema/src/naming.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import {
    isArgosWit, findSchemaWitByAdoRefName,
    schemaToAdoFieldRefName, isArgosField, findSchemaFieldByAdoRefName,
    schemaToAdoFieldName, schemaToAdoStateName,
    validateAdoFieldName, validateAdoStateName,
} from "./naming.js";

describe("isArgosWit (Sprint 2.10 + Sprint 2.15)", () => {
    it("matches ADO refName with process prefix", () => {
        expect(isArgosWit("ArgosInheritedDemo.TestVaultTestCase")).toBe(true);
        expect(isArgosWit("MyOtherProcess.TestVaultTestPlan")).toBe(true);
        expect(isArgosWit("Some123.TestVaultAuditLog")).toBe(true);
    });
    
    it("matches direct schema refName", () => {
        expect(isArgosWit("TestVault.TestCase")).toBe(true);
        expect(isArgosWit("TestVault.TestPlan")).toBe(true);
    });
    
    it("rejects non-Argos refNames", () => {
        expect(isArgosWit("Microsoft.VSTS.WorkItemTypes.Bug")).toBe(false);
        expect(isArgosWit("MyProcess.OtherType")).toBe(false);
        expect(isArgosWit("")).toBe(false);
    });
});

describe("findSchemaWitByAdoRefName (Sprint 2.15)", () => {
    it("resolves ADO refName to schema WIT", () => {
        const wit = findSchemaWitByAdoRefName("ArgosInheritedDemo.TestVaultTestCase");
        expect(wit).not.toBeNull();
        expect(wit?.referenceName).toBe("TestVault.TestCase");
    });
    
    it("returns null for non-Argos refName", () => {
        expect(findSchemaWitByAdoRefName("Microsoft.VSTS.WorkItemTypes.Bug")).toBeNull();
    });
});

describe("schemaToAdoFieldRefName (Sprint 2.11)", () => {
    it("prefixes schema field refName with Custom.", () => {
        expect(schemaToAdoFieldRefName("TestVault.Priority")).toBe("Custom.TestVaultPriority");
    });
    
    it("preserves system field refNames", () => {
        expect(schemaToAdoFieldRefName("System.Title")).toBe("System.Title");
        expect(schemaToAdoFieldRefName("Microsoft.VSTS.Common.Priority"))
            .toBe("Microsoft.VSTS.Common.Priority");
    });
});

describe("schemaToAdoFieldName (Sprint 2.13)", () => {
    it("prefixes display name with TestVault", () => {
        expect(schemaToAdoFieldName("Priority")).toBe("TestVault Priority");
    });
    
    it("is idempotent", () => {
        expect(schemaToAdoFieldName("TestVault Priority")).toBe("TestVault Priority");
    });
});

describe("schemaToAdoStateName (Sprint 2.14)", () => {
    it("prefixes state name with TestVault", () => {
        expect(schemaToAdoStateName("Active")).toBe("TestVault Active");
    });
    
    it("is idempotent", () => {
        expect(schemaToAdoStateName("TestVault Active")).toBe("TestVault Active");
    });
});

describe("validateAdoFieldName & validateAdoStateName", () => {
    it("returns null for valid names", () => {
        expect(validateAdoFieldName("TestVault Priority")).toBeNull();
        expect(validateAdoStateName("TestVault Active")).toBeNull();
    });
    
    it("returns error for forbidden chars", () => {
        expect(validateAdoFieldName("Test.Field")).toContain("forbidden");
    });
    
    it("returns error for length > 128", () => {
        const longName = "X".repeat(129);
        expect(validateAdoStateName(longName)).toContain("128");
    });
});
```

#### C2. Tests pour wit-schema-reader.ts

Creer ou etendre `packages/argos-detection-api/src/wit-schema-reader.test.ts` :

```typescript
import { describe, it, expect, vi } from "vitest";
import { createArgosSchemaReader /* ou la fonction qui detecte */ } from "./wit-schema-reader.js";

describe("Detection Sprint 2.15", () => {
    it("detects Argos when ADO returns suffix-matched refNames", async () => {
        // Mock IAdoWorkItemClient
        const mockClient = {
            getWorkItemTypes: vi.fn().mockResolvedValue([
                { referenceName: "ArgosInheritedDemo.TestVaultTestCase" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestPlan" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestSet" },
                { referenceName: "ArgosInheritedDemo.TestVaultPrecondition" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestExecution" },
                { referenceName: "ArgosInheritedDemo.TestVaultTestCaseVersion" },
                { referenceName: "ArgosInheritedDemo.TestVaultAuditLog" },
                { referenceName: "Microsoft.VSTS.WorkItemTypes.Bug" },
            ]),
        };
        
        const reader = createArgosSchemaReader(mockClient);
        const installed = await reader.isInstalled();
        expect(installed).toBe(true);
    });
    
    it("returns false when WITs are missing", async () => {
        const mockClient = {
            getWorkItemTypes: vi.fn().mockResolvedValue([
                { referenceName: "ArgosInheritedDemo.TestVaultTestCase" },
                // Only 1 WIT instead of 7
            ]),
        };
        
        const reader = createArgosSchemaReader(mockClient);
        const installed = await reader.isInstalled();
        expect(installed).toBe(false);
    });
    
    it("ignores non-Argos WITs", async () => {
        const mockClient = {
            getWorkItemTypes: vi.fn().mockResolvedValue([
                { referenceName: "Microsoft.VSTS.WorkItemTypes.Bug" },
                { referenceName: "Microsoft.VSTS.WorkItemTypes.Task" },
                { referenceName: "Microsoft.VSTS.WorkItemTypes.UserStory" },
            ]),
        };
        
        const reader = createArgosSchemaReader(mockClient);
        const installed = await reader.isInstalled();
        expect(installed).toBe(false);
    });
});
```

#### C3. CFG regression test

Creer `tools/regression/tests/CFG-2026-05-18-extension-detection.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG extension detection Sprint 2.15", () => {
    const root = resolve(__dirname, "../../..");
    
    it("argos-wit-schema exports naming helpers", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/naming.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("isArgosWit");
        expect(content).toContain("findSchemaWitByAdoRefName");
        expect(content).toContain("schemaToAdoFieldRefName");
        expect(content).toContain("schemaToAdoStateName");
    });
    
    it("argos-wit-schema index.ts re-exports from naming", () => {
        const path = resolve(root, "packages/argos-wit-schema/src/index.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("./naming");
        expect(content).toContain("isArgosWit");
    });
    
    it("argos-detection-api imports from argos-wit-schema", () => {
        const path = resolve(root, "packages/argos-detection-api/src/wit-schema-reader.ts");
        const content = readFileSync(path, "utf8");
        expect(content).toContain("@atconseil/argos-wit-schema");
        expect(content).toContain("isArgosWit");
    });
    
    it("argos-detection-api package depends on argos-wit-schema", () => {
        const pkgPath = resolve(root, "packages/argos-detection-api/package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        expect(deps["@atconseil/argos-wit-schema"]).toBeDefined();
    });
});
```

### Lot D -- Bump + CHANGELOG + commit + PR (20 min)

#### D1. Bump 0.5.16 -> 0.5.17

```powershell
node tools\release\bump-fixed-version.cjs 0.5.17

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### D2. CHANGELOG.md [0.5.17]

```markdown
## [0.5.17] - 2026-05-18

### Fixed

**Sprint 2.15 -- extension detection uses suffix-matching refNames**

After Sprint 2.14 (states custom) install was successful in BCEE-QA, but the
extension UI persisted with "Limited mode -- Argos custom WIT not installed".

Root cause: argos-detection-api used exact-match comparison between schema
refNames ("TestVault.TestCase") and ADO refNames ("ArgosInheritedDemo.TestVaultTestCase").
Match failed -> "not installed" banner.

### Architecture changes

#### Naming helpers moved to argos-wit-schema (source of truth)

NEW `packages/argos-wit-schema/src/naming.ts` :
- `isArgosWit(adoRefName)` : suffix match (handles dynamic process prefix)
- `findSchemaWitByAdoRefName(adoRefName)` : resolve schema WIT
- `schemaToAdoFieldRefName(schemaRef)` : "TestVault.X" -> "Custom.TestVaultX"
- `isArgosField`, `findSchemaFieldByAdoRefName` : field equivalents
- `schemaToAdoFieldName(name)` : "Priority" -> "TestVault Priority"
- `schemaToAdoStateName(name)` : "Active" -> "TestVault Active"
- `validateAdoFieldName`, `validateAdoStateName` : ADO constraint checks

These were originally in argos-sdk/wit-refname-matcher.ts (Sprint 2.10-2.14).
Moved to argos-wit-schema since schema lives there (single source of truth).

#### argos-sdk now re-exports from argos-wit-schema

Backwards compatible : existing imports from argos-sdk still work.

#### argos-detection-api updated to use isArgosWit

Detection logic changed from :
```
ARGOS_WIT_NAMES.every(name => witTypes.some(w => w.referenceName === name))
```
to :
```
witTypes.filter(w => isArgosWit(w.referenceName)).length >= TESTVAULT_SCHEMA.wits.length
```

### Tests

- 15+ unit tests new helpers in argos-wit-schema/naming.test.ts
- 3+ integration tests for detection in argos-detection-api
- CFG-2026-05-18-extension-detection regression test
- All Sprint 2.7-2.14 tests still green

### TECH-DEBT

- TECH-DEBT-054 LIVRE : extension detection + CRUD refName translation
- TECH-DEBT-019 : E2E reel, retest pending after this sprint

### After this sprint

The extension UI should :
- Detect Argos installed (no more "Limited mode" banner)
- Enable Create Test Case / Test Plan buttons
- Successfully create work items via translated refNames

### Lessons learned

- argos-wit-schema is the natural home for naming helpers (lives with schema)
- argos-sdk re-export preserves backwards compatibility
- Detection logic must handle BOTH schema refNames (for tests/internal) 
  and ADO refNames (for runtime)
```

#### D3. Specs/tasks.md updates

```markdown
- [x] TECH-DEBT-054 (Sprint 2.15) -- extension detection + CRUD refName translation
- [ ] TECH-DEBT-019 -- E2E reel, retest pending after Sprint 2.15
```

#### D4. Pre-commit + commit + push

```powershell
$msg = "fix(extension): Sprint 2.15 detection uses suffix-matching refNames"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"

$commitMsg = @"
fix(extension): Sprint 2.15 detection uses suffix-matching refNames

After Sprint 2.14 SDK install was successful (7 WIT + 40 fields + custom states),
extension UI persisted with "Limited mode -- Argos custom WIT not installed".

Root cause: argos-detection-api used exact-match comparison.
- Schema : "TestVault.TestCase"
- ADO    : "ArgosInheritedDemo.TestVaultTestCase"
- Exact match fails -> "not installed" banner

Fix : detection uses isArgosWit() suffix matching (already in argos-sdk Sprint 2.10).

Architecture refactor :
- Naming helpers moved to argos-wit-schema (source of truth)
  - isArgosWit, findSchemaWitByAdoRefName, schemaWitRefNameToAdoSuffix
  - schemaToAdoFieldRefName, isArgosField, findSchemaFieldByAdoRefName  
  - schemaToAdoFieldName, schemaToAdoStateName
  - validateAdoFieldName, validateAdoStateName
- argos-sdk re-exports for backwards compat
- argos-detection-api imports from argos-wit-schema

Detection logic refactored :
- Before : ARGOS_WIT_NAMES.every(name => witTypes.some(w => w.referenceName === name))
- After  : witTypes.filter(w => isArgosWit(w.referenceName)).length >= schema count

Tests :
- 15+ unit tests in argos-wit-schema/naming.test.ts
- 3+ integration tests for detection
- CFG-2026-05-18-extension-detection regression
- All Sprint 2.7-2.14 tests still green

TECH-DEBT :
- TECH-DEBT-054 LIVRE
- TECH-DEBT-019 retest after this sprint

Bump 0.5.16 -> 0.5.17.

Refs :
- Sprint 2.7-2.14 chain
- User diagnostic 2026-05-18 ~16h35 :
  - apps\argos-extension\src\hub\App.tsx:300-354 isInstalled state
  - packages\argos-detection-api\src\wit-schema-reader.ts
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-15.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-15.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-15.txt"

git push -u origin feat/sprint-2-15-extension-detection
```

#### D5. PR

```powershell
$prBody = @'
## Summary

Sprint 2.15 -- extension detection uses suffix-matching refNames.

After Sprint 2.14 the SDK install was successful (7 WIT + 40 fields + custom states),
but extension UI persisted with "Limited mode" banner.

## Root cause

argos-detection-api used exact-match comparison :
- Schema : "TestVault.TestCase"
- ADO    : "ArgosInheritedDemo.TestVaultTestCase" (dynamic process prefix)

## Fix

Architecture refactor :
- Naming helpers moved to argos-wit-schema (source of truth)
- argos-detection-api imports + uses isArgosWit() suffix matching
- argos-sdk re-exports for backwards compat

## Tests

- 15+ unit tests new helpers
- 3+ integration tests detection
- CFG-2026-05-18 regression
- All Sprint 2.7-2.14 tests still green

## After merge

1. Tag v0.5.17 + push
2. Update extension in BCEE-QA to 0.5.17
3. Refresh extension on DEMO project
4. EXPECTED : "Limited mode" banner DISAPPEARS
5. Create Test Case / Test Plan buttons ENABLED
6. **MOMENT DE VERITE FINAL** : Create Test Case
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-15.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(extension): Sprint 2.15 detection uses suffix-matching refNames" `
  --body-file "$env:TEMP\pr-body-sprint-2-15.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-15.txt"
```

#### D6. Archive + cleanup post-merge

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-15.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-15.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-15.md
}
```

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-15-extension-detection 2>$null
git log --oneline | Select-Object -First 5
```

### Lot E -- Tag + retest E2E FINAL (15 min apres merge)

#### E1. Tag v0.5.17

```powershell
git checkout main
git pull
git tag -a v0.5.17 -m "Release v0.5.17 -- Sprint 2.15 extension detection refName fix"
git push origin v0.5.17
```

#### E2. Surveille CI (~5-8 min)

```
https://github.com/AlexThibaud1976/TestVault/actions
1. Publish Marketplace 0.5.17
2. Publish CLI npm 0.5.17 (optionnel pour ce sprint, juste extension)
```

#### E3. Update extension a 0.5.17

```
Browse https://dev.azure.com/BCEE-QA/_settings/extensions
"Argos Testing" : Update vers 0.5.17 -> Approuver scopes

PAS BESOIN de cleanup BCEE-QA cette fois !
Le SDK install Sprint 2.14 reste valide. Juste l'extension UI change.
```

#### E4. TEST E2E FINAL

```
1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. Ctrl+F5 hard refresh
3. Hub Argos > Test Plans (ou Cases)

Attendu :
[X] Bandeau "Limited mode" DISPARU
[X] Boutons "Create Test Plan", "Create Test Case" ACTIVES (pas grises)

4. Test creation Test Plan :
   - Click "Create Test Plan"
   - Fill Name : "Premier Test Plan Argos"
   - Click Submit
   
   Attendu :
   - Toast success "Test Plan created"
   - Le Test Plan apparait dans la liste
   - Click sur le plan -> details + boutons fonctionnels
```

#### E5. Resultats possibles

```
SCENARIO A : SUCCESS
   -> Bandeau disparu + creation fonctionnelle
   -> **MILESTONE PRODUIT FONCTIONNEL TOTAL ATTEINT**
   -> 9 sprints hotfix livres aujourd'hui
   -> Tu peux te coucher heureux

SCENARIO B : Bandeau disparu mais creation echoue
   -> Detection OK mais CRUD operations refName encore en bug
   -> Sub-bug TECH-DEBT-054 (deja anticipe)
   -> Diagnostic supplementaire + Sprint 2.16 demain

SCENARIO C : Bandeau persiste
   -> Detection fix incomplet
   -> Probable code dans App.tsx fait detection separee
   -> Diagnostic + correction extension front-end direct
   -> Sprint 2.16 demain
```

---

## Garde-fous

### GF1 -- GF20 : standards

ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA

Constitution section 12 immutable.

### GF22 : Backwards compatibility

- argos-sdk doit continuer a fournir les helpers (via re-export)
- Tests existants Sprint 2.7-2.14 doivent rester verts
- process-install.ts doit continuer a compiler sans changement

### GF23 : Source of truth

argos-wit-schema = home des naming helpers (schema + naming together).
argos-sdk + argos-detection-api = consumers.

### GF24 : Tests new + old verts

```powershell
pnpm --filter @atconseil/argos-wit-schema test     # NEW + old
pnpm --filter @atconseil/argos-sdk test            # old (Sprint 2.7-2.14)
pnpm --filter @atconseil/argos-detection-api test  # NEW + old
pnpm --filter @atconseil/regression-suite test     # CFG NEW + old
```

### GF25 : Pas d'extension UI rewrite

Si App.tsx fait detection complexe, ne pas refacto. Juste s'assurer que 
argos-detection-api retourne le bon resultat. L'App.tsx hooks le bool.

### GF26 : Path imports propres

Verifier `tsconfig.json` et `package.json` exports/imports pour que :
- `import { isArgosWit } from "@atconseil/argos-wit-schema"` fonctionne
- Pas de circular dependency

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-15-extension-detection

pnpm --filter @atconseil/regression-suite test
# baseline passing
```

---

## Validation pre-commit

```powershell
pnpm --filter @atconseil/argos-wit-schema test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/argos-sdk test 2>&1 | Select-Object -Last 20
pnpm --filter @atconseil/argos-detection-api test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 15

pnpm turbo build --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Code lu. wit-schema-reader.ts detection logic identifiee."
2. **Apres Lot A** : "Naming helpers moved to argos-wit-schema. Continue Lot B?"
3. **Apres Lot B** : "Detection refactored. Continue Lot C tests?"
4. **Apres Lot C** : "Tests passing. Continue Lot D bump+commit?"
5. **Apres Lot D5** : "PR ouverte. Apres merge, lance Lot E tag + retest."

---

## Criteres de done

- [ ] Branche feat/sprint-2-15-extension-detection creee
- [ ] argos-wit-schema/src/naming.ts NEW
- [ ] argos-wit-schema/src/index.ts re-exports
- [ ] argos-sdk/src/wit-refname-matcher.ts re-exports from argos-wit-schema
- [ ] argos-detection-api/src/wit-schema-reader.ts uses isArgosWit
- [ ] argos-detection-api/package.json deps argos-wit-schema
- [ ] App.tsx unchanged (if possible) OR uses helpers if needed
- [ ] 15+ unit tests naming.test.ts
- [ ] 3+ integration tests wit-schema-reader.test.ts
- [ ] CFG-2026-05-18-extension-detection NEW
- [ ] All Sprint 2.7-2.14 tests STILL green
- [ ] Bump 0.5.16 -> 0.5.17
- [ ] CHANGELOG complete
- [ ] tasks.md TECH-DEBT-054 livre
- [ ] PR ouverte
- [ ] Post-merge cleanup
- [ ] Tag v0.5.17
- [ ] CI workflows verts
- [ ] Extension 0.5.17 deployed on BCEE-QA
- [ ] Bandeau "Limited mode" DISPARAIT
- [ ] Boutons Create active

---

## Apres ca

### Si MILESTONE atteint (bandeau disparu + creation OK)

Bilan exceptionnel :
- 9 sprints hotfix livres aujourd'hui
- 10 versions Marketplace (0.5.7 a 0.5.17)
- E2E real test traverse 9 architectures cachees
- Pattern "tout custom prefixe TestVault X" valide

Demain :
- Commercial layer (TECH-DEBT-018)
- Azure Functions deploy (TECH-DEBT-017)
- Phase 7 ops

### Si bandeau persiste OU creation echoue

Diagnostic Sprint 2.16 :
- App.tsx ligne 311 .then(setIsInstalled) -> qui est appele ?
- Probable App.tsx fait detection separee de argos-detection-api
- Ou CRUD operations utilisent encore schema refNames (TECH-DEBT-054 sub-issue)

---

## Note moral

Apres Sprint 2.15 livre, le SDK + extension forme une chaine COHERENTE :

```
argos-wit-schema        : source of truth (schema + naming helpers)
        |
        +--- argos-sdk         : install process (uses helpers Sprint 2.10-2.14)
        +--- argos-detection-api : detection extension (uses helpers Sprint 2.15)
                |
                +--- apps/argos-extension : UI consume
```

Architecture COHERENTE, naming SOURCE-CONTROLLED, schema IMMUABLE.

Bon sprint refactor !
