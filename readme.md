# TestVault (Argos)

> **Argos** — Test management for Azure DevOps. The Xray-class experience, native to ADO Cloud and Server 2022.
>
> Publisher: **ATConseil** | Author: Alexandre Thibaud — atconseil.info

[![CI](https://github.com/atconseil/testvault/actions/workflows/ci-pr.yml/badge.svg)](https://github.com/atconseil/testvault/actions/workflows/ci-pr.yml)

---

## What is TestVault / Argos?

**TestVault** (commercial name **Argos** on the Visual Studio Marketplace) is a test management
extension for Azure DevOps that delivers Xray-class capabilities on both ADO Cloud and ADO
Server 2022. It stores all data as native Custom Work Items, guaranteeing full customer data sovereignty.

Key differentiators:

- Single VSIX supporting ADO Cloud + Server 2022 with strict feature parity on core functionality
- Custom Work Items readable even without the extension installed
- AI-assisted test case generation and flakiness detection — BYOK (Bring Your Own Key)
- Rich reporting via co-installable TestPulse extension
- Pricing ~30% below Xray Cloud + generous Free tier

## Repository structure

```text
testvault/
├── apps/
│   ├── argos-extension/    # VSIX published on Marketplace (ATConseil/Argos)
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
