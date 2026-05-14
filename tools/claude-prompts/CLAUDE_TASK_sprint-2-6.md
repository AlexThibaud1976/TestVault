# Prompt Claude Code -- Sprint 2.6 argos-cli install command + npm publish (`feat/sprint-2-6-argos-cli-install`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **MONOLITHIQUE** argos-cli install command + npm publish setup (~6-7h).
> CRITIQUE : ce sprint debloquera l'installation reelle des Custom WIT Argos.

---

## Contexte critique

**Decouverte Sprint 2.5e + 2.5f-fix (2026-05-15)** :
- Microsoft ne permet PAS aux extensions ADO d'appeler Process API
- Architecture pivot : install Custom WIT delegate a argos-cli (D66-A)
- Wizard extension affiche : `npx @atconseil/argos-cli install --org X --project Y`
- Cette commande N'EXISTE PAS encore -> Sprint 2.6 la cree

**Etat current** :
- argos@0.5.5 publie Marketplace + installe instance ADO BCEE-QA/DEMO
- Wizard "Detection + Install Guide" operationnel
- Bouton "I've installed, refresh detection" -> "still not detected" en boucle (normal)
- TECH-DEBT-042 : argos-cli install command -> ce sprint
- TECH-DEBT-043 : argos-cli npm publish -> ce sprint

Refs :
- packages/argos-cli/ (CLI existant avec commander, sub-commands auth/tc)
- packages/argos-sdk/src/process-install.ts (SDK complet, factory createProcessInstallService)
- packages/argos-wit-schema/src/schema.ts (TESTVAULT_SCHEMA 7 WIT)
- Specs/spec.md US-6.1 (wizard d'installation)
- Specs/constitution.md section 12 (architecture extension vs Process API)
- npm scope @atconseil owned by alexthibaud1976 (confirmed)
- NPM_TOKEN dans GitHub Secrets (Automation type, confirmed)

---

## Prerequisites verifies AVANT ce sprint

- [x] `npm whoami` : alexthibaud1976
- [x] `npm org ls atconseil` : owner
- [x] NPM_TOKEN dans GitHub Secrets
- [x] argos@0.5.5 sur main + Marketplace
- [x] PR Sprint 2.5f-fix (#62) mergee
- [x] `pnpm --filter @atconseil/regression-suite test` -> 60 passing
- [x] `pnpm preflight` -> PASSED (argos@0.5.5)
- [x] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

---

## Decisions actees (2026-05-15 fin journee)

| # | Element | Choix |
|---|---|---|
| D69 | Sprint 2.6 perimetre | C -- COMPLET avec npm publish |
| D70 | UX argos-cli | C -- Hybride interactif + flags |
| D71 | Cohabitation MS Test Plans | A -- Detection automatique 3 cas |
| D72 | Schema update mode | A -- Inclus dans Sprint 2.6 |
| D73 | Tests | A+C -- Unit tests + doc E2E manuel |
| D74 | Sprint structure | A -- Monolithique avec commits intermediaires |

---

## Architecture cible apres Sprint 2.6

```
packages/argos-cli/
  src/
    cli.ts (existant, etendu avec sub-command install)
    install/
      install-command.ts (NEW, logic principale)
      prompts.ts (NEW, interactive prompts pour PAT, processName, etc.)
      console-progress.ts (NEW, onProgress callback formatter)
    install.test.ts (NEW, unit tests mock fetch)
  README.md (NEW, doc complete CLI public)
  docs/
    manual-e2e-test.md (NEW, procedure test reel ADO)
  package.json (etendu : metadata npm publish complete)
  .npmignore (NEW, exclure src/, tests/, etc.)

.github/workflows/
  publish-cli.yml (NEW, npm publish on tag v*.*.*)

CHANGELOG.md (section [0.5.6])
Specs/tasks.md (TECH-DEBT-042 LIVRE, TECH-DEBT-043 LIVRE partiellement)
```

---

## Composition exacte du sprint -- 9 LOTS

### Lot A -- argos-cli install command (core)

Estimation : ~90 min

#### A1. Etendre `packages/argos-cli/src/cli.ts`

Ajouter sub-command `install` apres les sub-commands existantes :

```typescript
// ... existing imports
import { runInstallCommand } from "./install/install-command.js";

// ... existing program/auth/tc commands

// --- install ----------------------------------------------------------------

program
    .command("install")
    .description("Install Argos Custom WIT into Azure DevOps process (Custom Process Inheritance)")
    .option("--org-url <url>", "ADO organisation URL (e.g. https://dev.azure.com/acme)")
    .option("--project <name>", "ADO project name")
    .option("--pat <token>", "ADO Personal Access Token with 'Process (Read & manage)' scope")
    .option("--base-process <type>", "Base process to inherit from (Agile|Scrum|CMMI)", "Agile")
    .option("--process-name <name>", "Custom process name to create", "Argos Inherited")
    .option("--no-prompt", "Non-interactive mode (require all options as flags or env vars)")
    .option("--skip-confirm", "Skip confirmation prompt")
    .action(async (opts) => {
        await runInstallCommand(opts);
    });

program.parseAsync(process.argv);
```

#### A2. Creer `packages/argos-cli/src/install/install-command.ts`

```typescript
import { createProcessInstallService, type ProcessInstallState } from "@atconseil/argos-sdk";
import { promptForMissing, promptForConfirm, promptForSchemaUpdate } from "./prompts.js";
import { renderProgressStep } from "./console-progress.js";

export interface InstallCommandOptions {
    orgUrl?: string;
    project?: string;
    pat?: string;
    baseProcess?: "Agile" | "Scrum" | "CMMI";
    processName?: string;
    prompt?: boolean;  // Note: commander adds 'noPrompt' which becomes 'prompt: false'
    skipConfirm?: boolean;
}

export async function runInstallCommand(opts: InstallCommandOptions): Promise<void> {
    const interactive = opts.prompt !== false;
    
    // ----- Resolve required options -----
    const orgUrl = opts.orgUrl ?? process.env.ARGOS_ORG_URL ?? (interactive ? await promptForMissing("orgUrl") : null);
    const project = opts.project ?? process.env.ARGOS_PROJECT ?? (interactive ? await promptForMissing("project") : null);
    const pat = opts.pat ?? process.env.ARGOS_PAT ?? (interactive ? await promptForMissing("pat") : null);
    
    if (!orgUrl || !project || !pat) {
        console.error("Missing required options. Use --org-url, --project, --pat (or env vars ARGOS_ORG_URL, ARGOS_PROJECT, ARGOS_PAT).");
        process.exit(1);
    }
    
    const baseProcess = opts.baseProcess ?? "Agile";
    const processName = opts.processName ?? "Argos Inherited";
    
    // ----- Build service -----
    const service = createProcessInstallService({
        orgUrl,
        getAuthHeader: async () => `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
    });
    
    // ----- Detect install state -----
    console.log(`Checking Argos installation state on ${orgUrl}/${project}...`);
    let state: ProcessInstallState;
    try {
        state = await service.detectInstallState();
    } catch (err) {
        console.error(`Detection failed: ${err instanceof Error ? err.message : String(err)}`);
        if (err instanceof Error && err.message.toLowerCase().includes("forbidden")) {
            console.error("Make sure your PAT has 'Process (Read & manage)' scope.");
        }
        process.exit(2);
    }
    
    // ----- Branch on state -----
    switch (state.status) {
        case "installed":
            console.log(`[OK] Argos already installed (process: ${state.processName}, schema: ${state.schemaVersion})`);
            console.log("Nothing to do.");
            return;
        
        case "partial":
            console.log(`[WARN] Argos partially installed in process "${state.processName}"`);
            console.log(`Missing WIT types: ${state.missingWitRefs.join(", ")}`);
            if (interactive && !opts.skipConfirm) {
                const confirmed = await promptForSchemaUpdate(state);
                if (!confirmed) {
                    console.log("Aborted by user.");
                    return;
                }
            }
            // TODO: support partial sync (add only missing WITs)
            // For now, fallback to full install
            console.log("[INFO] Partial sync not yet supported. Will run full install on top of existing process.");
            // Fall through to install
            await doInstall(service, processName, baseProcess);
            return;
        
        case "not-installed":
            console.log("[INFO] Argos not installed. Will create new process inheritance.");
            console.log(`  Base process: ${baseProcess}`);
            console.log(`  New process name: ${processName}`);
            if (interactive && !opts.skipConfirm) {
                const confirmed = await promptForConfirm(`Proceed with installation?`);
                if (!confirmed) {
                    console.log("Aborted by user.");
                    return;
                }
            }
            await doInstall(service, processName, baseProcess);
            return;
    }
}

async function doInstall(
    service: ReturnType<typeof createProcessInstallService>,
    processName: string,
    baseProcess: "Agile" | "Scrum" | "CMMI"
): Promise<void> {
    try {
        const result = await service.install({
            processName,
            baseProcess,
            onProgress: renderProgressStep,
        });
        console.log("");
        console.log(`[OK] Installation complete!`);
        console.log(`  Process ID: ${result.processId}`);
        console.log(`  Process name: ${result.processName}`);
        console.log("");
        console.log("Next steps:");
        console.log("  1. In ADO, assign your project to this new process:");
        console.log("     Organization Settings > Process > [your custom process] > Assign to project");
        console.log("  2. Refresh the Argos extension to see Custom WIT available");
    } catch (err) {
        console.error(`Installation failed: ${err instanceof Error ? err.message : String(err)}`);
        if (err instanceof Error && err.name === "ProcessPermissionError") {
            console.error("Your PAT lacks Project Collection Administrator permissions.");
        }
        process.exit(3);
    }
}
```

#### A3. Creer `packages/argos-cli/src/install/prompts.ts`

```typescript
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function ask(question: string): Promise<string> {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
        return await rl.question(question);
    } finally {
        rl.close();
    }
}

async function askHidden(question: string): Promise<string> {
    // Simple hidden input: stdin without echo via raw mode
    const rl = createInterface({ input: stdin, output: stdout });
    process.stdout.write(question);
    try {
        // For Node.js readline, hiding input is tricky cross-platform.
        // Simplification: warn user PAT will be visible.
        process.stdout.write("(PAT will be visible) ");
        return await rl.question("");
    } finally {
        rl.close();
    }
}

export async function promptForMissing(field: "orgUrl" | "project" | "pat"): Promise<string> {
    switch (field) {
        case "orgUrl":
            return ask("ADO Organisation URL (e.g. https://dev.azure.com/acme): ");
        case "project":
            return ask("ADO Project name: ");
        case "pat":
            return askHidden("Personal Access Token (Process Read & manage scope): ");
    }
}

export async function promptForConfirm(message: string): Promise<boolean> {
    const answer = await ask(`${message} [y/N]: `);
    return answer.trim().toLowerCase().startsWith("y");
}

export async function promptForSchemaUpdate(state: { missingWitRefs: string[] }): Promise<boolean> {
    console.log("Schema update will install the missing WIT types listed above.");
    return promptForConfirm("Proceed with schema update?");
}
```

#### A4. Creer `packages/argos-cli/src/install/console-progress.ts`

```typescript
import type { InstallProgressStep } from "@atconseil/argos-sdk";

export function renderProgressStep(step: InstallProgressStep): void {
    const prefix = `[${step.phase}]`;
    if (step.total !== undefined && step.current !== undefined) {
        console.log(`${prefix} ${step.message} (${step.current}/${step.total})`);
    } else {
        console.log(`${prefix} ${step.message}`);
    }
}
```

#### A5. Verifier exports SDK

`packages/argos-sdk/src/index.ts` doit exporter :
- `createProcessInstallService`
- `ProcessInstallState`
- `InstallProgressStep`
- `ProcessPermissionError`
- `ProcessInstallError`
- `BaseProcessType`

Si manquants, ajouter les exports.

---

### Lot B -- Tests unitaires argos-cli install

Estimation : ~60 min

#### B1. Creer `packages/argos-cli/src/install/install-command.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @atconseil/argos-sdk
vi.mock("@atconseil/argos-sdk", () => ({
    createProcessInstallService: vi.fn(),
    ProcessPermissionError: class extends Error {
        constructor(msg?: string) { super(msg); this.name = "ProcessPermissionError"; }
    },
}));

// Mock prompts (avoid stdin in tests)
vi.mock("./prompts.js", () => ({
    promptForMissing: vi.fn(),
    promptForConfirm: vi.fn().mockResolvedValue(true),
    promptForSchemaUpdate: vi.fn().mockResolvedValue(true),
}));

// Mock console-progress (no-op in tests)
vi.mock("./console-progress.js", () => ({
    renderProgressStep: vi.fn(),
}));

import { runInstallCommand } from "./install-command.js";
import { createProcessInstallService } from "@atconseil/argos-sdk";

const mockCreateService = createProcessInstallService as unknown as ReturnType<typeof vi.fn>;

describe("install-command", () => {
    let detectInstallState: ReturnType<typeof vi.fn>;
    let install: ReturnType<typeof vi.fn>;
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let logSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    
    beforeEach(() => {
        detectInstallState = vi.fn();
        install = vi.fn();
        mockCreateService.mockReturnValue({ detectInstallState, install });
        exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
        logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });
    
    it("exits with code 1 if required options missing in no-prompt mode", async () => {
        await runInstallCommand({ prompt: false });
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
    
    it("skips install if already installed with matching schema", async () => {
        detectInstallState.mockResolvedValue({
            status: "installed",
            processId: "p1",
            processName: "Custom",
            schemaVersion: "1.0.0",
        });
        await runInstallCommand({
            orgUrl: "https://dev.azure.com/x",
            project: "P",
            pat: "fake",
            prompt: false,
        });
        expect(install).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("already installed"));
    });
    
    it("triggers install if not-installed", async () => {
        detectInstallState.mockResolvedValue({ status: "not-installed" });
        install.mockResolvedValue({ processId: "p2", processName: "Argos Inherited" });
        await runInstallCommand({
            orgUrl: "https://dev.azure.com/x",
            project: "P",
            pat: "fake",
            prompt: false,
            skipConfirm: true,
        });
        expect(install).toHaveBeenCalledWith({
            processName: "Argos Inherited",
            baseProcess: "Agile",
            onProgress: expect.any(Function),
        });
    });
    
    it("handles partial state with fallback to full install", async () => {
        detectInstallState.mockResolvedValue({
            status: "partial",
            processId: "p3",
            processName: "Existing Custom",
            missingWitRefs: ["TestVault.TestPlan", "TestVault.TestSet"],
        });
        install.mockResolvedValue({ processId: "p3", processName: "Existing Custom" });
        await runInstallCommand({
            orgUrl: "https://dev.azure.com/x",
            project: "P",
            pat: "fake",
            prompt: false,
            skipConfirm: true,
        });
        expect(install).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("partially installed"));
    });
    
    it("exits with code 2 on detection error", async () => {
        detectInstallState.mockRejectedValue(new Error("Network error"));
        await runInstallCommand({
            orgUrl: "https://dev.azure.com/x",
            project: "P",
            pat: "fake",
            prompt: false,
        });
        expect(exitSpy).toHaveBeenCalledWith(2);
    });
    
    it("exits with code 3 on install error", async () => {
        detectInstallState.mockResolvedValue({ status: "not-installed" });
        install.mockRejectedValue(new Error("Permission denied"));
        await runInstallCommand({
            orgUrl: "https://dev.azure.com/x",
            project: "P",
            pat: "fake",
            prompt: false,
            skipConfirm: true,
        });
        expect(exitSpy).toHaveBeenCalledWith(3);
    });
});
```

#### B2. Tests CFG regression suite

Ajouter dans `tools/regression/tests/` un test simple :

`CFG-2026-05-15-argos-cli-install-exists.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG argos-cli install command exists", () => {
    const root = resolve(__dirname, "../../..");
    
    it("install-command.ts exists", () => {
        expect(existsSync(resolve(root, "packages/argos-cli/src/install/install-command.ts"))).toBe(true);
    });
    
    it("prompts.ts exists", () => {
        expect(existsSync(resolve(root, "packages/argos-cli/src/install/prompts.ts"))).toBe(true);
    });
    
    it("cli.ts imports install-command", () => {
        const cliContent = require("node:fs").readFileSync(resolve(root, "packages/argos-cli/src/cli.ts"), "utf8");
        expect(cliContent).toContain("install-command");
    });
});
```

---

### Lot C -- Adapter wizard si necessaire

Estimation : ~15 min

Le wizard actuel affiche deja :
```
npx @atconseil/argos-cli install --org X --project Y
```

Cette commande sera valide apres ce sprint (sous reserve npm publish OK).

#### C1. Verifier wizard GetStartedView

```powershell
Get-Content apps\argos-extension\src\hub\views\GetStartedView.tsx -Encoding UTF8 | Select-String "npx" -Context 1,1
```

#### C2. Si la commande wizard manque options

Verifier que le wizard affiche :
- `--org` (correspond a `--org-url` du CLI ? Voir coherence)
- `--project` (OK)

**IMPORTANT** : checker la coherence wizard <-> CLI :
- Wizard affiche : `--org https://dev.azure.com/X --project Y`
- CLI accept : `--org-url <url> --project <name>`

**Decision** : aligner sur `--org-url` partout (plus explicite).

Si decalage : adapter wizard pour utiliser `--org-url` (et ajouter un alias `--org` dans le CLI pour compat).

OPTION SIMPLE : ajouter alias `--org` dans cli.ts :
```typescript
.option("--org-url <url>", "ADO organisation URL")
.option("--org <url>", "Alias for --org-url")  // accept both
```

Et resolve : `const orgUrl = opts.orgUrl ?? opts.org ?? ...`

---

### Lot D -- npm publish setup

Estimation : ~60 min

#### D1. Etendre `packages/argos-cli/package.json` metadata

Le package.json actuel a le minimum. Ajouter pour npm public :

```json
{
    "name": "@atconseil/argos-cli",
    "version": "0.5.6",
    "private": false,
    "description": "Argos CLI for Azure DevOps -- install Custom Process Inheritance, upload test results, sync BDD/Gherkin",
    "keywords": [
        "azure-devops",
        "ado",
        "test-management",
        "testing",
        "qa",
        "cli",
        "argos",
        "custom-work-item-types",
        "process-customization",
        "bdd",
        "gherkin"
    ],
    "homepage": "https://github.com/AlexThibaud1976/TestVault/tree/main/packages/argos-cli#readme",
    "repository": {
        "type": "git",
        "url": "https://github.com/AlexThibaud1976/TestVault.git",
        "directory": "packages/argos-cli"
    },
    "bugs": {
        "url": "https://github.com/AlexThibaud1976/TestVault/issues"
    },
    "author": "Alexandre Thibaud <[ton-email]> (https://atconseil.info)",
    "license": "Apache-2.0",
    "type": "module",
    "main": "./dist/index.js",
    "exports": {
        ".": "./dist/index.js"
    },
    "bin": {
        "argos": "./dist/cli.js"
    },
    "files": ["dist", "README.md", "LICENSE"],
    "publishConfig": {
        "access": "public",
        "registry": "https://registry.npmjs.org/"
    },
    "engines": {
        "node": ">=20"
    },
    "scripts": {
        "build": "tsc --project tsconfig.json",
        "typecheck": "tsc --project tsconfig.json --noEmit",
        "test": "vitest run --passWithNoTests",
        "lint": "biome check src/",
        "prepublishOnly": "pnpm build"
    },
    "dependencies": {
        "@atconseil/argos-exporters": "workspace:*",
        "@atconseil/argos-gherkin": "workspace:*",
        "@atconseil/argos-importers": "workspace:*",
        "@atconseil/argos-sdk": "workspace:*",
        "@atconseil/argos-types": "workspace:*",
        "commander": "^13.0.0"
    },
    "devDependencies": {
        "typescript": "^6.0.3",
        "vitest": "^3.1.0"
    }
}
```

**ATTENTION** : `"author"` -- remplacer `[ton-email]` par ton email reel ou retirer la partie email.

**ATTENTION workspace:* dependencies** : Lorsque on publish, pnpm va remplacer `workspace:*` par la version exacte. Cela necessite que les autres packages (`@atconseil/argos-exporters`, etc.) soient AUSSI publies sur npm, OU bien il faut bundler argos-cli pour eliminer les dependances workspace internes.

**DECISION** : pour ce sprint, on a 2 options :

```
Option D1.A : Bundler argos-cli avec tsup ou esbuild
  - Genere un dist/cli.js bundle avec tout inline
  - Pas de dependances workspace exposees
  - Plus simple a publish
  - Estimation : ~30 min de setup tsup

Option D1.B : Publier TOUS les packages internes sur npm
  - @atconseil/argos-sdk, argos-types, argos-importers, etc.
  - Lourd, fait passer chaque package en public
  - Pas le but ce sprint
  - Reporter

Option D1.C : Publier seulement argos-cli + argos-sdk + argos-types + argos-wit-schema
  - Les 4 packages necessaires a l'install command
  - Plus realiste mais quand meme lourd
```

**MON VOTE Option D1.A** (bundler) : pragmatique pour ce sprint. On peut toujours migrer vers Option D1.B/C plus tard.

#### D2. Setup bundler (tsup)

Si Option D1.A choisie :

```powershell
pnpm --filter @atconseil/argos-cli add -D tsup
```

Modifier `packages/argos-cli/tsconfig.json` pour conserver build TypeScript dev, ET ajouter un `tsup.config.ts` pour le bundle publish :

`packages/argos-cli/tsup.config.ts` :
```typescript
import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        cli: "src/cli.ts",
        index: "src/index.ts",
    },
    format: ["esm"],
    target: "node20",
    clean: true,
    sourcemap: true,
    dts: true,
    splitting: false,
    bundle: true,
    // Bundle workspace deps inline
    noExternal: [
        "@atconseil/argos-sdk",
        "@atconseil/argos-types",
        "@atconseil/argos-wit-schema",
        "@atconseil/argos-importers",
        "@atconseil/argos-exporters",
        "@atconseil/argos-gherkin",
    ],
    // Keep commander as runtime dep
    external: ["commander"],
});
```

Modifier `package.json` build script :
```json
"build": "tsup",
"build:tsc": "tsc --project tsconfig.json",  // fallback if needed
```

Apres `pnpm --filter @atconseil/argos-cli build` :
- dist/cli.js doit etre executable et bundled
- Verifier que pas d'imports `@atconseil/*` dans le bundle final

#### D3. Creer `packages/argos-cli/.npmignore`

```
src/
*.test.ts
*.test.tsx
tsup.config.ts
tsconfig.json
node_modules/
.turbo/
```

Note : "files" dans package.json est le whitelist primaire. .npmignore est backup.

#### D4. Creer `packages/argos-cli/README.md`

Doc utilisateur publique. ~150-200 lignes :

```markdown
# @atconseil/argos-cli

Command-line interface for [Argos](https://github.com/AlexThibaud1976/TestVault) -- 
industrial-grade test management for Azure DevOps.

## Installation

\`\`\`bash
# One-shot (recommended)
npx @atconseil/argos-cli <command>

# Global install
npm install -g @atconseil/argos-cli
argos <command>
\`\`\`

## Commands

### \`argos install\`

Install Argos Custom WIT into an Azure DevOps process via Custom Process Inheritance.

\`\`\`bash
npx @atconseil/argos-cli install \\
  --org-url https://dev.azure.com/myorg \\
  --project "My Project" \\
  --pat <YOUR_PAT>
\`\`\`

#### Options

| Flag | Default | Description |
|------|---------|-------------|
| \`--org-url <url>\` | (required, or \`ARGOS_ORG_URL\` env var) | ADO organisation URL |
| \`--project <name>\` | (required, or \`ARGOS_PROJECT\` env var) | ADO project name |
| \`--pat <token>\` | (required, or \`ARGOS_PAT\` env var) | Personal Access Token with \`Process (Read & manage)\` scope |
| \`--base-process <type>\` | \`Agile\` | Base process: \`Agile\`, \`Scrum\`, \`CMMI\` |
| \`--process-name <name>\` | \`Argos Inherited\` | Name of the new custom process |
| \`--no-prompt\` | (interactive) | Non-interactive mode (CI) |
| \`--skip-confirm\` | (confirm prompt) | Skip confirmation prompt |

#### PAT scope required

Generate a PAT at \`https://dev.azure.com/<org>/_usersSettings/tokens\` with scope:
- **Project and Team (Process Read & manage)**
- OR full access (less secure)

#### Cohabitation with Microsoft Test Plans

Argos uses Custom WIT prefixed with \`TestVault.*\`. These coexist with native 
Microsoft Test Plan WIT (\`Microsoft.TestPlan.*\`). No conflict.

#### Behaviour by detection state

- **Not installed**: creates new Custom Process Inheritance, installs 7 WIT
- **Partial**: missing WIT types added to existing process (idempotent)
- **Already installed (matching schema)**: no-op
- **Already installed (different schema)**: schema update prompted

#### Exit codes

- \`0\`: success
- \`1\`: missing required options
- \`2\`: detection failed (network/auth)
- \`3\`: install failed (permissions/conflicts)

### \`argos auth login\` (existing)

Verify PAT credentials.

### \`argos tc ...\` (existing)

Manage Test Cases.

## Environment variables

| Variable | Equivalent flag |
|----------|----------------|
| \`ARGOS_ORG_URL\` | \`--org-url\` |
| \`ARGOS_PROJECT\` | \`--project\` |
| \`ARGOS_PAT\` | \`--pat\` |

## License

Apache-2.0

## Links

- [Argos extension on Marketplace](https://marketplace.visualstudio.com/items?itemName=AlexThibaud.ArgosTesting)
- [Argos documentation](https://github.com/AlexThibaud1976/TestVault)
- [Report issues](https://github.com/AlexThibaud1976/TestVault/issues)
```

#### D5. Verifier LICENSE file dans le package

Si pas present, copier LICENSE racine :
```powershell
Copy-Item LICENSE packages\argos-cli\LICENSE
```

---

### Lot E -- GitHub Actions workflow publish-cli.yml

Estimation : ~30 min

#### E1. Creer `.github/workflows/publish-cli.yml`

```yaml
name: Publish CLI -- npm

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry-run only (no actual publish)"
        type: boolean
        default: true

jobs:
  publish-cli:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # for npm provenance
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: "https://registry.npmjs.org/"
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build argos-cli
        run: pnpm --filter @atconseil/argos-cli build
      
      - name: Verify bundle has no workspace deps
        run: |
          cd packages/argos-cli/dist
          if grep -r "@atconseil/" *.js 2>/dev/null; then
            echo "ERROR: workspace deps found in bundle. Check tsup.config.ts noExternal."
            exit 1
          fi
          echo "Bundle clean -- no workspace deps."
      
      - name: npm publish dry-run
        run: |
          cd packages/argos-cli
          npm publish --dry-run --access public
      
      - name: npm publish (real)
        if: github.event_name == 'push' || github.event.inputs.dry_run == 'false'
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          cd packages/argos-cli
          npm publish --access public --provenance
```

NOTE :
- `provenance` necessite `id-token: write` permission + GitHub-hosted runner
- Tag-based publish reel (push)
- workflow_dispatch dry-run par defaut (safety)

#### E2. Verifier publication "Public" forcee

Important : `npm publish --access public` -- pour scoped packages, c'est obligatoire au premier publish (sinon npm rejette comme private).

---

### Lot F -- Documentation

Estimation : ~30 min

#### F1. CHANGELOG.md section [0.5.6]

```markdown
## [0.5.6] - 2026-05-15

### Added

**Sprint 2.6 -- argos-cli install command + npm publish setup** :

- **NEW** `argos install` command in argos-cli (TECH-DEBT-042 LIVRE)
  - Custom Process Inheritance creation via ADO Process API
  - 3-state detection: not-installed / partial / installed (idempotent)
  - Interactive prompts (PAT, processName, baseProcess) + flag-based mode
  - Exit codes: 0=success, 1=missing args, 2=detection fail, 3=install fail
  - Cohabitation with Microsoft Test Plans (Custom WIT prefix TestVault.*)
  
- **NEW** npm publish setup for @atconseil/argos-cli (TECH-DEBT-043 LIVRE partial)
  - Package metadata: keywords, repository, homepage, bugs, author, license
  - tsup bundler: noExternal for workspace deps -> standalone bundle
  - publishConfig: access=public, registry=npm
  - .npmignore + files whitelist
  - README.md complete (CLI usage doc)
  - LICENSE file in package

- **NEW** `.github/workflows/publish-cli.yml`
  - Trigger: push tag v*.*.* or workflow_dispatch
  - Build + dry-run + publish via NPM_TOKEN secret
  - npm provenance via id-token: write
  - Dry-run safety on workflow_dispatch

### Changed

- packages/argos-cli/package.json : metadata complete pour npm public
- packages/argos-cli/src/cli.ts : ajout sub-command install
- argos-sdk index.ts : exports createProcessInstallService + types associes

### Tests

- 6 tests unitaires install-command (mock fetch + SDK service)
- 3 tests CFG regression (presence fichiers + import cli.ts)
- Total : 60 -> 69 regression tests

### Documentation

- packages/argos-cli/README.md : doc CLI complete pour npm users
- packages/argos-cli/docs/manual-e2e-test.md : procedure test reel ADO

### TECH-DEBT

- TECH-DEBT-042 LIVRE : argos-cli install command (Sprint 2.6)
- TECH-DEBT-043 LIVRE partial : npm publish setup
  - Publish reel via tag manuel (toi) apres merge
- TECH-DEBT-044 NEW : Workspace deps publish strategy
  - tsup bundle inline (Sprint 2.6 actuel)
  - Long terme : publier @atconseil/argos-sdk + autres packages internes
- TECH-DEBT-019 (E2E reel) reste critique
  - manual-e2e-test.md doc la procedure manuelle

### Architecture notes

- argos-cli devient l'installer officiel des Custom WIT (D66-A)
- Extension Argos -> detection seulement (constitution section 12)
- npm publish workflow tag-based aligne sur publish-marketplace.yml pattern

### Lessons learned

- Workspace deps (pnpm workspace:*) ne peuvent pas etre publiees sur npm sans bundler
- tsup avec noExternal est la solution pragmatique pour CLI standalone
- npm provenance + id-token: write : security best practice 2026
- Premier publish scoped package : --access public obligatoire
```

#### F2. Specs/tasks.md updates

TECH-DEBT-042 et 043 a cocher :
```markdown
- [x] TECH-DEBT-042 (Sprint 2.6) -- argos-cli install command
- [x] TECH-DEBT-043 partial (Sprint 2.6) -- npm publish setup; publish reel manuel
- [ ] TECH-DEBT-044 NEW -- Strategy publish workspace deps internes
```

#### F3. Creer `packages/argos-cli/docs/manual-e2e-test.md`

```markdown
# Manual E2E Test -- argos install

This document describes how to test the \`argos install\` command on a real Azure DevOps instance.

## Prerequisites

- Real Azure DevOps Cloud organization (with admin access)
- Test project (separate from production)
- Personal Access Token (PAT) with "Process (Read & manage)" scope
- Node.js 20+ installed locally

## Test scenarios

### Scenario 1: Not installed -> Full install

\`\`\`bash
# Use a fresh project that has never had Argos installed
npx @atconseil/argos-cli install \\
  --org-url https://dev.azure.com/myorg \\
  --project "TestProject" \\
  --pat <YOUR_PAT> \\
  --base-process Agile \\
  --process-name "Argos Inherited Agile Test"
\`\`\`

Expected:
- Detection: "not-installed"
- Confirmation prompt -> y
- Progress: creating-process, creating-picklists, creating-wits (7 WIT)
- Final: "Installation complete!"
- In ADO portal: new process visible at Organization Settings > Process

### Scenario 2: Partial -> Sync schema

Pre-condition: install partial schema manually (e.g., remove a WIT from process via ADO portal).

\`\`\`bash
npx @atconseil/argos-cli install --pat <YOUR_PAT> --org-url ... --project ...
\`\`\`

Expected:
- Detection: "partial"
- Lists missing WIT refs
- Confirmation -> y
- Re-installs missing WITs

### Scenario 3: Already installed -> No-op

\`\`\`bash
npx @atconseil/argos-cli install --pat <YOUR_PAT> --org-url ... --project ...
\`\`\`

Expected:
- Detection: "installed" (schema version matches)
- Message: "Already installed (schema: 1.0.0). Nothing to do."
- Exit code 0

### Scenario 4: Permission error

Run with a PAT missing "Process (Read & manage)" scope.

Expected:
- Exit code 2 or 3
- Clear error message about PAT scope

## Post-install verification in extension

1. Refresh Argos extension on instance ADO
2. Wizard "Get Started" -> Detection -> "Argos installed in this project"
3. Click "Go to dashboard"
4. Create Test Case -> should succeed (no more VS402323)
\`\`\`
```

---

### Lot G -- Bump 0.5.5 -> 0.5.6

Estimation : ~5 min

```powershell
node tools\release\bump-fixed-version.cjs 0.5.6

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
# Attendu : argos@0.5.6

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 10
```

---

### Lot H -- Validation finale

Estimation : ~20 min

#### H1. Build all

```powershell
pnpm turbo build --force
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
```

#### H2. argos-cli specific tests

```powershell
pnpm --filter @atconseil/argos-cli test
pnpm --filter @atconseil/argos-cli build
ls packages\argos-cli\dist
# Attendu : cli.js, index.js, *.d.ts
```

#### H3. CLI invocation test

```powershell
# Tester invocation locale
node packages\argos-cli\dist\cli.js install --help
# Doit afficher l'aide install sans erreur
```

#### H4. npm pack dry-run

```powershell
cd packages\argos-cli
npm pack --dry-run
# Affiche le contenu du tarball
# Verifier : dist/, README.md, LICENSE, package.json
# Verifier : pas de src/, pas de *.test.ts
cd ..\..
```

#### H5. Verification CRITIQUE bundle propre

```powershell
$bundleContent = Get-Content packages\argos-cli\dist\cli.js -Raw -Encoding UTF8
$hasWorkspaceImports = $bundleContent -match '@atconseil/'
Write-Host "Bundle contains @atconseil/ imports : $hasWorkspaceImports"
# Attendu : False (sinon publish va casser au resolve npm)
```

#### H6. Regression suite

```powershell
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5
# Attendu : 63+ passing (60 baseline + 3 nouveaux CFG)

node tools\regression\scan-mojibake.cjs
# Attendu : 0
```

#### H7. Preflight

```powershell
pnpm preflight
# Attendu : PASSED argos@0.5.6
```

---

### Lot I -- Commit + PR + cleanup

Estimation : ~20 min

#### I1. Archive prompt

```powershell
$found = @(".\CLAUDE_TASK_sprint-2-6.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2-6.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2-6.md
}
```

#### I2. Pre-commit ASCII check

```powershell
$msg = "feat(cli): Sprint 2.6 argos install command + npm publish setup"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii"
```

#### I3. Commit -F

Creer `$env:TEMP\commit-msg-sprint-2-6.txt` :

```
feat(cli): Sprint 2.6 argos install command + npm publish setup

Sprint MONOLITHIQUE Sprint 2.6 : argos-cli command install + npm publish.

PROBLEME ARCHITECTURAL RESOLU :
Sprint 2.5e+2.5f-fix ont decouvert que Microsoft ne permet pas aux extensions
ADO d'appeler Process API. Solution : argos-cli devient l'installer officiel.
Ce sprint ship le CLI fonctionnel + npm publish.

Lot A -- argos-cli install command (core)
- src/install/install-command.ts : 3-state detection + idempotent install
- src/install/prompts.ts : interactive prompts (PAT, processName, baseProcess)
- src/install/console-progress.ts : onProgress callback formatter
- src/cli.ts : sub-command install added
- Exit codes : 0=success, 1=missing args, 2=detection fail, 3=install fail
- 3 cas detection (D71-A) : not-installed / partial / installed
- UX hybride (D70-C) : interactive + flags + env vars
- Schema update mode (D72-A) : partial state handled

Lot B -- Tests
- src/install/install-command.test.ts : 6 unit tests mock fetch + SDK
- CFG-2026-05-15-argos-cli-install-exists.test.ts : 3 tests presence
- Regression : 60 -> 63 passing

Lot C -- Wizard coherence
- cli.ts accept --org-url AND --org (alias for wizard compat)
- GetStartedView affiche commande coherente

Lot D -- npm publish setup
- packages/argos-cli/package.json : metadata complete (keywords, repository, etc.)
- tsup bundler config : noExternal pour workspace deps (TECH-DEBT-044)
- .npmignore + files whitelist (dist, README, LICENSE only)
- publishConfig : access=public, registry=npm
- README.md : doc complete CLI usage
- LICENSE file copied from repo root

Lot E -- GitHub Actions workflow
- .github/workflows/publish-cli.yml NEW
- Trigger : push tag v*.*.* OR workflow_dispatch
- npm publish dry-run + reel
- npm provenance via id-token: write
- NPM_TOKEN secret (already configured by user)

Lot F -- Documentation
- CHANGELOG.md [0.5.6] complete
- Specs/tasks.md : TECH-DEBT-042 LIVRE + TECH-DEBT-043 LIVRE partial
- packages/argos-cli/docs/manual-e2e-test.md : procedure test reel ADO

Lot G -- Bump 0.5.6
- 12 packages alignes via tools/release/bump-fixed-version.cjs
- CFG-2026-05-14-fixed-versioning : VERT

Decisions actees 2026-05-15 fin journee :
- D69-C : Sprint complet avec npm publish
- D70-C : Hybride interactif + flags
- D71-A : Detection automatique 3 cas
- D72-A : Schema update inclus
- D73-A+C : Unit tests + doc E2E manuel
- D74-A : Monolithique avec commits intermediaires

TECH-DEBT :
- TECH-DEBT-042 LIVRE : argos-cli install command
- TECH-DEBT-043 LIVRE partial : npm publish setup (publish reel manuel par user)
- TECH-DEBT-044 NEW : Workspace deps publish strategy long terme
- TECH-DEBT-019 (E2E reel) reste critique

Apres merge :
1. Tag v0.5.6 + push -> trigger publish-marketplace.yml + publish-cli.yml
2. Verifier npm publish OK : https://www.npmjs.com/package/@atconseil/argos-cli
3. Test commande reelle : npx @atconseil/argos-cli install ...
4. Verifier creation Custom WIT dans projet test ADO
5. Re-test extension wizard : Create Test Case fonctionne enfin

Refs :
- Sprint 2.5e+2.5f-fix (pivot architectural)
- packages/argos-sdk/src/process-install.ts (SDK existant)
- npm @atconseil/argos-cli scope owned alexthibaud1976
```

```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-6.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-6.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-6.txt"

git push -u origin feat/sprint-2-6-argos-cli-install
```

#### I4. PR

```powershell
$prBody = @'
## Summary

Sprint 2.6 MONOLITHIQUE : argos-cli install command + npm publish setup.

Apres pivot architectural Sprint 2.5e+2.5f-fix (Process API non accessible aux extensions), 
argos-cli devient l'installer officiel des Custom WIT TestVault.*.

## Commande implementee

\`\`\`bash
npx @atconseil/argos-cli install \
  --org-url https://dev.azure.com/myorg \
  --project "MyProject" \
  --pat <PAT_WITH_PROCESS_SCOPE>
\`\`\`

## Tests

- 6 tests unitaires install-command (vitest + mock SDK)
- 3 tests CFG regression (presence fichiers, import cli.ts)
- 60 -> 63 regression tests passing
- Build, lint, typecheck OK

## npm publish setup

- @atconseil/argos-cli@0.5.6 ready to publish
- tsup bundler (noExternal workspace deps)
- Workflow .github/workflows/publish-cli.yml (tag-triggered)
- npm provenance enabled (id-token: write)
- NPM_TOKEN secret configured

## Workflow apres merge

1. Merge PR sur main
2. Tag \`v0.5.6\` + push
3. Workflow publish-cli.yml trigger -> npm publish public
4. Verifier https://www.npmjs.com/package/@atconseil/argos-cli
5. Test commande reelle sur instance ADO test
6. Verifier extension wizard : refresh detection -> "Argos installed"

## TECH-DEBT

- TECH-DEBT-042 LIVRE : argos-cli install command
- TECH-DEBT-043 LIVRE partial : npm publish setup (publish reel manuel)
- TECH-DEBT-044 NEW : Strategy publish workspace deps internes long terme

## Documentation

- packages/argos-cli/README.md (npm public doc)
- packages/argos-cli/docs/manual-e2e-test.md (E2E procedure)
- CHANGELOG [0.5.6] complet avec lessons learned

## Risks

- Premier publish npm : --access public obligatoire (sinon rejected)
- tsup bundle workspace deps inline : verifier bundle propre (script H5)
- npm provenance : necessite GitHub-hosted runner (OK avec ubuntu-latest)
- Coherence wizard <-> CLI : flags --org / --org-url alias OK
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-6.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "feat(cli): Sprint 2.6 argos install command + npm publish setup" `
  --body-file "$env:TEMP\pr-body-sprint-2-6.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-6.txt"
```

#### I5. Post-merge cleanup

```powershell
git checkout main
git pull
git remote prune origin
git branch -d feat/sprint-2-6-argos-cli-install

pnpm --filter @atconseil/regression-suite test
pnpm preflight

git log --oneline | Select-Object -First 6
```

---

## Garde-fous

### GF1 -- GF15 : standards Sprint 2.5e/f

ASCII strict, fixed-versioning, marketplace-public, etc.

### GF16 : Bundle clean validation (CRITIQUE)

Apres build argos-cli, verifier que dist/cli.js ne contient PAS de `@atconseil/` imports.
Sinon publish npm va casser au resolve.

### GF17 : npm pack --dry-run obligatoire

Verifier contenu tarball avant commit final.

### GF18 : Premier publish public

Le workflow publish-cli.yml utilise `--access public`. C'est obligatoire pour scoped first publish.

### GF19 : Pas de modif workflow publish-marketplace.yml

Le sprint Marketplace existant reste intact. Le nouveau workflow publish-cli.yml est independent.

### GF20 : Coherence wizard <-> CLI flags

Wizard affiche `--org` / CLI accept `--org-url` ET `--org` (alias).

### GF21 : LICENSE file present dans packages/argos-cli

Sinon npm publish warn, et users voient pas la licence.

### GF22 : prepublishOnly script

Force build avant publish (eviter publier sans dist/).

### GF23 : Pre-commit intermediaire OBLIGATOIRE par Lot

Apres Lot A : commit
Apres Lot B : commit
Apres Lot D : commit
Apres Lot E : commit
Apres Lot F+G : commit
Apres Lot H : commit final

= 6 commits min sur la branche, audit trail complet.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/sprint-2-6-argos-cli-install

pnpm --filter @atconseil/regression-suite test
# 60 passing baseline
```

---

## Reporting utilisateur (10 checkpoints)

1. **Apres Lot A** : "argos-cli install command implemented. cli.ts updated. 3 files added in src/install/. Continue Lot B tests ?"
2. **Apres Lot B** : "6 unit tests + 3 CFG tests VERT. 60 -> 63 regression. Continue Lot C wizard check ?"
3. **Apres Lot C** : "Wizard coherent avec CLI flags --org-url + alias --org. Continue Lot D npm setup ?"
4. **Apres Lot D1-D2** : "package.json metadata complete. tsup bundler installed + config. Bundle test : XXX KB. Continue D3-D5 ?"
5. **Apres Lot D3-D5** : ".npmignore + README + LICENSE OK. Continue Lot E workflow ?"
6. **Apres Lot E** : "Workflow publish-cli.yml ready. npm provenance + dry-run safety. Continue Lot F doc ?"
7. **Apres Lot F+G** : "CHANGELOG + tasks.md + E2E doc + bump 0.5.6 OK. CFG-fixed-versioning VERT. Continue Lot H validation ?"
8. **Apres Lot H** : "Build/lint/typecheck/tests VERT. Bundle propre (no @atconseil/ imports). npm pack dry-run OK. Pret a commit ?"
9. **Apres Lot I3-I4** : "PR ouverte. Apres merge GitHub, lance Lot I5 cleanup + tag v0.5.6 manuel."
10. **Final** : "Sprint 2.6 termine. argos-cli@0.5.6 ready for npm publish. User must tag v0.5.6 to trigger workflow."

---

## Criteres de done

- [ ] Branche `feat/sprint-2-6-argos-cli-install` creee
- [ ] cli.ts : sub-command install added
- [ ] src/install/install-command.ts NEW (3-state detection + install)
- [ ] src/install/prompts.ts NEW (interactive)
- [ ] src/install/console-progress.ts NEW (onProgress formatter)
- [ ] 6 tests unitaires install-command passing
- [ ] 3 tests CFG regression passing
- [ ] 60 -> 63 regression tests
- [ ] package.json metadata complete (description, keywords, repository, etc.)
- [ ] tsup bundler config + build script
- [ ] .npmignore + files whitelist
- [ ] README.md packages/argos-cli/
- [ ] LICENSE file present
- [ ] .github/workflows/publish-cli.yml NEW
- [ ] CHANGELOG.md section [0.5.6] complete
- [ ] Specs/tasks.md updates
- [ ] packages/argos-cli/docs/manual-e2e-test.md NEW
- [ ] Bump 0.5.5 -> 0.5.6 sur 12 packages
- [ ] CFG-2026-05-14-fixed-versioning passe
- [ ] Bundle propre (no @atconseil/ imports dans dist)
- [ ] npm pack --dry-run OK
- [ ] node packages/argos-cli/dist/cli.js install --help OK
- [ ] Turbo build + lint + typecheck + test passing
- [ ] 0 mojibake
- [ ] Commit message 100% ASCII
- [ ] 6+ commits intermediaires (audit trail)
- [ ] Prompt archive
- [ ] PR ouverte avec body complet
- [ ] Post-merge cleanup execute

---

## Apres ca

**MILESTONE FONCTIONNEL** : argos-cli@0.5.6 publie sur npm + extension Argos@0.5.6 publie sur Marketplace.

Workflow tag v0.5.6 :
1. Tag v0.5.6 + push
2. publish-marketplace.yml trigger -> Argos extension 0.5.6 sur Marketplace
3. publish-cli.yml trigger -> @atconseil/argos-cli@0.5.6 sur npm
4. Verifier https://www.npmjs.com/package/@atconseil/argos-cli existe
5. Verifier https://marketplace.visualstudio.com/items?itemName=AlexThibaud.ArgosTesting met a jour

Test reel end-to-end :
1. Sur instance ADO BCEE-QA/DEMO (ou un autre projet test) :
   - Wizard "Get Started" -> Detection : "Not installed"
2. Lancer en local :
   \`\`\`bash
   npx @atconseil/argos-cli install \\
     --org-url https://dev.azure.com/BCEE-QA \\
     --project "DEMO" \\
     --pat <PAT>
   \`\`\`
3. Suivre prompts -> confirm install
4. Verifier dans ADO portal : nouveau process "Argos Inherited" cree
5. Migrer le projet "DEMO" sur ce nouveau process
6. Retour extension Argos -> wizard refresh detection
7. Detection : "Argos installed"
8. Cliquer "Go to dashboard"
9. Aller hub Cases -> creer un Test Case
10. Verifier : CREATION REUSSIE (plus de VS402323)

**SI TOUT MARCHE** : c'est le premier produit Argos REELLEMENT FONCTIONNEL end-to-end depuis le debut.

Sprint 2.7+ futurs :
- TECH-DEBT-044 : strategy publish workspace deps long terme
- Sprint Design (D59-B + D60-A) Fluent UI 2 polish iteratif
- TECH-DEBT-019 : audit E2E reel systematique
- Sprint 2.5f : Refactor App.tsx + CoveragePanel UX (l'ancien plan)

Bon sprint marathon !
