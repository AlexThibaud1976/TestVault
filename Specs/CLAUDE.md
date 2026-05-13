# CLAUDE.md — Project memory for Claude Code

> This file is automatically read by Claude Code at the start of every session in this repo. It is **not** a substitute for `constitution.md`, `spec.md`, `plan.md`, or `tasks.md` — those remain the source of truth. This file is a fast-access summary.
>
> Last updated: 2026-05-08 — Aligned with constitution v0.2.4, spec v0.1.0, plan v0.1.0, tasks v0.1.0.

---

## What this project is

**TestVault** (commercial name on Visual Studio Marketplace: **Argos**, publisher: **ATConseil**) is a test management extension for Azure DevOps Services (Cloud). It targets industrial-grade test management capabilities on ADO Cloud, at parity with leading Jira-native test management tools. It uses native Custom Work Items for storage to guarantee customer data sovereignty, and feeds the standalone TestPulse extension via a documented WIT schema contract.

- **Project name (technical)**: `TestVault`
- **Marketplace name**: `Argos`
- **Publisher**: `ATConseil`
- **npm scope**: `@atconseil/*`
- **Author**: Alexandre Thibaud — atconseil.info

---

## Spec-kit hierarchy — read in this order

1. `constitution.md` — non-negotiable principles. **Never violate.** Changes require explicit approval from Alexandre Thibaud.
2. `spec.md` — functional spec (personas, epics, user stories, data models, wireframes).
3. `plan.md` — technical architecture (monorepo, WIT schema, API, Azure Functions, tests, CI/CD).
4. `tasks.md` — actionable phased breakdown with `T-X.Y` identifiers.
5. `monetisation-analyse.md` — pricing model rationale (annex).

When in doubt, **read the constitution first**. When implementing, **find your `T-X.Y` task in `tasks.md`** and use its "Done when" criteria as the success condition.

---

## Hard rules — Claude Code MUST follow

These are extracted from `constitution.md` §10. Violations block merge.

### Test-first (TDD)
- Every new feature or bugfix starts with a failing test.
- Coverage targets: **≥ 90% core, ≥ 80% UI**, measured with c8/Istanbul, blocking in CI.
- Every confirmed production bug adds a regression test in `tests/regression/bug-NNN.test.ts` **before** the fix.

### Documentation in lockstep with code
- Any PR touching a feature, an API, or a schema must update `README.md` and `docs/user-guide.md` in the same commit.
- CI fails if `src/api/**`, `src/extension/manifest.json`, or the WIT schema change without corresponding doc updates.
- `CHANGELOG.md` (Keep a Changelog format) updated for every release.

### Spec-kit before code
- Any change touching: a Custom WIT, a public API endpoint, the SDK, the data schema, the monetisation model, the permission model, the LLM strategy, or any user-visible behavior — **must** first update the relevant spec-kit files (constitution / spec / plan / tasks).
- Spec-kit changes require explicit approval from Alexandre Thibaud before code.

### Non-regression check on every PR
- PR template includes the question: *"Which existing functionality could I have impacted, and how did I verify?"*
- A linked test or written justification is mandatory.

### Dependencies & vulnerabilities
- `npm audit --audit-level=high` is clean and blocking in CI.
- No dependency unmaintained for > 24 months without a documented replacement plan.
- SBOM CycloneDX generated and published on every release.

### Telemetry forbidden categories
- **Never** include in telemetry: test titles, test contents, execution results, attachments, LLM prompts, LLM responses, anything PII.
- Allowed telemetry: extension version, platform (Cloud/Server), anonymous opcodes, technical metrics (operation duration, error type without payload).

### LLM features — BYOK only
- TestVault never provides a shared LLM key. The customer configures their own (Anthropic, OpenAI, or Azure OpenAI).
- LLM API keys are stored encrypted (AES-256-GCM, key derived per ADO organization via HKDF, MasterKey in Azure Key Vault).
- LLM calls go through Azure Functions only (never directly from the browser, never exposing the key).
- No persistence of prompts or responses on Kisskool/ATConseil side beyond a TTL ≤ 1h dedup cache.
- Customer LLM keys are wiped from memory immediately after each call (`buffer.fill(0)`).

### Permissions — Admin / User / Reader
- Roles are derived from native ADO permissions (Project Administrator / Contributor / Reader). No parallel permission model.
- Sensitive operations (LLM provider config, prompts, quotas, license, process install, webhooks, retention) are **Admin-only**.
- Every Admin operation is logged in `TestVault.AuditLog` (immutable Custom WIT). Sensitive values masked (last 4 chars only).

---

## Repository layout

```
testvault/
├── apps/
│   ├── argos-extension/           # The VSIX published on Marketplace (publisher: ATConseil, name: Argos)
│   ├── argos-functions/           # Azure Functions (Cloud-Plus only, BYOK LLM proxy, webhooks, jobs)
│   └── docs-site/                 # Public documentation site (Docusaurus)
├── packages/
│   ├── testvault-sdk/             # @atconseil/testvault-sdk (npm public, Apache 2.0)
│   ├── testvault-cli/             # @atconseil/testvault-cli (npm public, Apache 2.0)
│   ├── testvault-types/           # Shared TS types (Custom WIT, payloads, contracts)
│   ├── testvault-wit-schema/      # Custom WIT definitions for Process install
│   ├── testvault-ui/              # Shared UI components (Fluent UI 2 wrappers)
│   ├── testvault-importers/       # Parsers: CSV, Excel, JUnit, NUnit, xUnit, TestNG, Cucumber
│   ├── testvault-exporters/       # Generators: Excel, PDF
│   └── argos-detection-api/       # Public client API for external consumers (TestPulse v2.0+ etc.) -- reads Argos WIT schema from ADO
├── tools/
│   ├── e2e/                       # Playwright suites against real ADO instances
│   ├── load-testing/              # k6 stress tests
│   └── migration-scripts/         # WIT schema migration scripts
├── docs/                          # User guide, API reference, SDK reference, WIT schema, operator guide
├── .github/workflows/             # GitHub Actions
├── turbo.json                     # Turborepo config
├── package.json                   # Root workspaces
├── tsconfig.base.json             # Shared strict TS config
├── CLAUDE.md                      # This file
├── CHANGELOG.md
├── README.md
├── LICENSE                        # Mixed: Apache 2.0 (sdk, cli) + proprietary (extension, functions)
├── constitution.md                # v0.2.3
├── spec.md                        # v0.1.0
├── plan.md                        # v0.1.0
├── tasks.md                       # v0.1.0
└── monetisation-analyse.md        # v0.1.0
```

---

## Tech stack — locked

| Layer | Technology | Note |
|---|---|---|
| Language | TypeScript 5+ strict mode | `strict: true`, `noImplicitAny`, `strictNullChecks` |
| Runtime | Node.js 22 LTS | Node 20 EOL April 2026 |
| Monorepo | pnpm workspaces + Turborepo | Changesets for semver |
| UI framework | React 18+ | |
| UI library | Fluent UI 2 | Native ADO look & feel |
| ADO SDK | `azure-devops-extension-sdk` v4.x + `azure-devops-extension-api` v4.x | No v5 exists yet |
| Linter / formatter | Biome | Unified lint + format, single `biome.json` config, ESM-native, blocking in CI (constitution §2) |
| Test runner | Vitest | Faster than Jest, ESM-native |
| E2E | Playwright | Cloud instance (`argos-test.dev.azure.com`) |
| Validation | Zod | OpenAPI generation via `@anatine/zod-openapi` |
| Build | tfx-cli | For VSIX packaging |
| Hosting | Azure Functions Premium plan, region `francecentral` | |
| Crypto | AES-256-GCM + HKDF-SHA256 | MasterKey in Azure Key Vault HSM-backed |

### Forbidden
- jQuery, CommonJS bundles in production, UI frameworks competing with Fluent UI 2.

---

## Common commands

```bash
# Setup
pnpm install                         # Install dependencies (workspaces)

# Daily dev
pnpm turbo build                     # Build all packages (cached)
pnpm turbo build --filter=argos-extension  # Build a single package
pnpm turbo test                      # Run all tests
pnpm turbo test --filter=...         # Run tests for changed packages only
pnpm turbo lint                      # Lint
pnpm turbo typecheck                 # TS strict check

# Extension specific
pnpm --filter argos-extension dev    # Dev server with hot reload
pnpm --filter argos-extension build:vsix  # Build the VSIX

# Functions specific
pnpm --filter argos-functions dev    # Local Azure Functions runtime
pnpm --filter argos-functions deploy:staging  # Deploy to staging slot

# Release
pnpm changeset                       # Create a changeset for the next release
pnpm changeset version               # Bump versions per changesets
pnpm release                         # Publish to npm (SDK, CLI) — gated by CI

# Coverage
pnpm test --coverage                 # Run with coverage; fails if below thresholds
```

---

## Workflow conventions

### Branching
- `main` — production code (deployed Marketplace + Functions prod)
- `develop` — continuous integration, deployed to staging on merge
- `feature/T-X.Y-short-name` — branch per task, mapped to `tasks.md` ID
- `hotfix/...` — emergencies from `main`, merge back into `main` and `develop`
- `release/x.y.z` — ephemeral release branches

### Commit messages
- Conventional Commits format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- First line ≤ 72 chars
- Reference task ID when applicable: `feat(extension): T-1.4 Test Case CRUD UI`
- Body explains *why*, not *what*

### Pull requests
- Title format: `T-X.Y — Short description`
- PR body must answer: *"Which existing functionality could I have impacted, and how did I verify?"*
- Link to the task in `tasks.md`
- All "Done when" criteria checked
- All CI gates green: lint, typecheck, unit tests (coverage thresholds), integration tests, E2E if relevant, `npm audit`, doc sync check

---

## Do / Don't for Claude Code

### DO
- ✅ Read `constitution.md` first when uncertain about boundaries.
- ✅ Find the `T-X.Y` task in `tasks.md` and use its "Done when" as success criteria.
- ✅ Write the failing test first, then the implementation.
- ✅ Update `README.md` + `docs/user-guide.md` in the same commit as user-visible changes.
- ✅ Use `npm audit --audit-level=high` before completing a task.
- ✅ Mask sensitive values in any log or error message (last 4 chars rule for API keys).
- ✅ When adding a Custom WIT field or a public API surface, update `docs/wit-schema.md` and the OpenAPI spec.
- ✅ When introducing a new dependency, document the rationale (author, last release, alternatives) in the PR description.
- ✅ Ask Alexandre when a task seems to require crossing a constitution boundary.

### DON'T
- ❌ Don't introduce new dependencies without checking `npm audit` and last-release date (>24 months without maintenance = forbidden).
- ❌ Don't log LLM prompts or responses anywhere.
- ❌ Don't store customer business data (test cases, executions, evidence) anywhere outside the customer's ADO instance.
- ❌ Don't expose ADO PATs to the browser or persist them on Kisskool/ATConseil servers.
- ❌ Don't change Custom WIT schema, API endpoints, or user-visible behavior without spec-kit update first.
- ❌ Don't bypass TDD ("I'll add the test later" is not allowed).
- ❌ Don't merge with red CI, even for "trivial" changes.
- ❌ Don't introduce parallel permission models — always derive from native ADO permissions.
- ❌ Don't break the WIT schema contract with TestPulse without a major version bump and migration script.
- ❌ Don't add features to ADO Server that aren't on Cloud, or vice-versa, except those explicitly listed as Cloud-Plus in `constitution.md` §3.2.

---

## Naming reminders

- **TestVault** — internal/technical name (code, packages, repo, WIT prefix `TestVault.*`)
- **Argos** — commercial name on Marketplace (manifest, public docs)
- **ATConseil** — publisher and brand
- **TestPulse** — separate standalone extension fed by TestVault when co-installed; evolves on its own roadmap
- **Custom Work Item Types** keep the `TestVault.*` technical prefix (durability, schema contract with TestPulse, backward compat)

---

## Where to find things

| Looking for... | Go to... |
|---|---|
| Why a decision was made | `constitution.md` (immutable principles) or `monetisation-analyse.md` (pricing) |
| What a feature should do | `spec.md` (user stories, acceptance criteria, wireframes, data models) |
| How to implement | `plan.md` (architecture, WIT schema, API design, deployment) |
| What to do next | `tasks.md` (T-X.Y identifiers, dependencies, "Done when" criteria) |
| WIT schema contract | `docs/wit-schema.md` (public, consumed by TestPulse) |
| API contract | `docs/api-reference.md` (generated from OpenAPI) |
| SDK reference | `docs/sdk-reference.md` (generated from TS types) |
| Deployment & ops | `docs/operator-guide.md` |

---

## When something blocks you

1. Re-read the relevant `T-X.Y` task in `tasks.md`.
2. Check `spec.md` for user-facing intent.
3. Check `plan.md` for architectural intent.
4. Check `constitution.md` for non-negotiable rules.
5. If still unclear, **stop and ask Alexandre**. Do not improvise on architecture, security, data sovereignty, or LLM behavior.

---

> ⚠️ This file evolves with the project. Update it (with a PR) when stack, conventions, or hard rules change. Always keep it in sync with the spec-kit version numbers cited at the top.
