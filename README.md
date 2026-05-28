# TestVault (Argos)

> **Argos** — Test management for Azure DevOps. Industrial-grade test management, native to ADO Cloud.
>
> Publisher: **ATConseil** | Author: Alexandre Thibaud — atconseil.info

[![CI](https://github.com/AlexThibaud1976/TestVault/actions/workflows/ci-pr.yml/badge.svg)](https://github.com/AlexThibaud1976/TestVault/actions/workflows/ci-pr.yml)

---

## What is TestVault / Argos?

**TestVault** (commercial name **Argos** on the Visual Studio Marketplace) is a test management
extension for Azure DevOps Services (Cloud) that delivers industrial-grade test management capabilities. It stores all
data as native Custom Work Items, guaranteeing full customer data sovereignty.

Key differentiators:

- Custom Work Items readable even without the extension installed
- AI-assisted test case generation (BYOK, Bring Your Own Key) -- two distinct surfaces, both reviewed in a side **Drawer** before persisting:
  - **Suggest Tests** on the Coverage Panel of a User Story / Bug / Requirement opens a multi-step Drawer (configure → generate → review with per-card edit + Accept All / Accept Selected / Dismiss) and creates new Test Cases linked back to the source requirement
  - **AI Suggest Steps** inside the Test Case form drafts a Steps list and opens a Drawer with **Replace** / **Complete** / **Cancel** actions for clear review before applying changes
- **BDD / Gherkin native editor** in the Test Case form, powered by Monaco (the engine that backs VS Code), with live Gherkin validation (scenario count + per-line errors)
- **Rich Coverage Panel** on User Story / Bug / Requirement Work Items : displays each linked Test Case with id + title, state, priority, steps count, assigned, and latest execution status. Accepts both Argos custom relations and the standard ADO "Tested By" link type.
- **In-place Test Case edit** : opening a Test Case from the Cases list or from the Coverage Panel loads the existing Work Item, populates every field (including BDD / Gherkin and steps), and the **Update Test Case** button persists the diff via `testCaseService.update`.
- Flakiness detection (BYOK)
- Rich reporting via co-installable TestPulse extension
- Pricing ~30% below Jira test extensions + generous Free tier

## Compatibility

**Argos targets Azure DevOps Services (Cloud) only.** Self-hosted ADO variants are out of scope
as of v0.3.0 — see CHANGELOG and constitution v0.4.0.

## Repository structure

```text
testvault/
├── apps/
│   ├── argos-extension/    # VSIX published on Marketplace (AlexThibaud/Argos)
│   ├── argos-functions/    # Azure Functions — Cloud-Plus features (BYOK LLM proxy, webhooks, jobs)
│   └── docs-site/          # Public documentation site
├── packages/
│   ├── testvault-types/    # Shared TypeScript types (WIT interfaces, Zod schemas)
│   ├── testvault-sdk/      # @atconseil/testvault-sdk — npm public, Apache 2.0
│   ├── testvault-cli/      # @atconseil/testvault-cli — npm public, Apache 2.0
│   ├── testvault-wit-schema/   # Custom WIT definitions for Process installation
│   ├── testvault-ui/           # Fluent UI 2 component wrappers
│   ├── testvault-importers/    # Parsers: CSV, Excel, JUnit, NUnit, xUnit, TestNG, Cucumber
│   ├── testvault-exporters/    # Generators: Excel, PDF
│   └── testpulse-ui-shared/    # Components shared with TestPulse standalone
├── tools/
│   ├── e2e/                # Playwright suites against real ADO instances
│   ├── load-testing/       # k6 stress tests
│   └── migration-scripts/  # WIT schema migration scripts
└── docs/                   # User guide, API reference, SDK reference, WIT schema contract
```

## Getting started

### Prerequisites

- [Node.js 22 LTS](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)

### Setup

```bash
# Install dependencies (all workspaces)
pnpm install

# Build all packages
pnpm turbo build

# Run all tests
pnpm turbo test

# Lint
pnpm turbo lint

# Type-check
pnpm turbo typecheck
```

### Working on a specific package

```bash
# Build only the types package
pnpm turbo build --filter=@atconseil/testvault-types

# Test only the SDK
pnpm turbo test --filter=@atconseil/testvault-sdk

# Dev server for the extension
pnpm --filter argos-extension dev
```

## Working on Windows?

PowerShell 5.1 (Windows default) displays UTF-8 files with non-ASCII
characters as "mojibake" by default. **These are display artifacts,
not corrupted files.** See `Specs/CLAUDE.md` (section "Windows /
PowerShell 5.1 encoding gotcha") for the explanation and how to
configure your session to display UTF-8 correctly.

## Documentation

- [User Guide](docs/user-guide.md)
- [API Reference](docs/api-reference.md) *(generated from OpenAPI)*
- [SDK Reference](docs/sdk-reference.md) *(generated from TypeScript types)*
- [WIT Schema Contract](docs/wit-schema.md) *(consumed by TestPulse)*
- [Operator Guide](docs/operator-guide.md)

## Licenses

- `packages/testvault-sdk` and `packages/testvault-cli`: [Apache 2.0](LICENSE)
- All other components: [Proprietary](LICENSE-PROPRIETARY)

## Contributing

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). This is a solo project — external contributions
are not accepted at this stage. The source is available for transparency and customer auditability.
