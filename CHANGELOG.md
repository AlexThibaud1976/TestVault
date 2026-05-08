# Changelog

All notable changes to TestVault (Argos) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-08

### Added

- **Phase 0** — Monorepo scaffold: pnpm workspaces, Turborepo 2, Biome, strict TypeScript, pre-commit hooks, CI/CD pipelines, Marketplace publish workflow (T-0.1 – T-0.7)
- **Phase 1** — WIT CRUD: all 7 Custom Work Item Types (TestCase, TestSet, TestPlan, Precondition, TestExecution, TestPlanEntry, AuditLog), Zod schemas, 100 % coverage (T-1.1 – T-1.9)
- **Phase 2** — Test execution: run lifecycle (InProgress → Completed → immutable), step results, evidence attachments, global status derivation, bug linking, execution listing (T-2.1 – T-2.7)
- **Phase 3** — Traceability: TC-to-requirement links, coverage matrix export (Excel/PDF), TestPulse WIT schema contract (T-3.1 – T-3.7)
- **Phase 4** — Import/export: CSV, Excel, JUnit, NUnit, xUnit, TestNG, Cucumber parsers; CLI `upload-results` command (T-4.1 – T-4.9)
- **Phase 5** — BDD sync: Gherkin parser/generator, `processBddSync` ADO Git push integration, `RepoMappingSettings` UI, voice notes (T-5.1 – T-5.6)
- **Phase 6** — AI admin (Cloud-Plus): BYOK LLM provider management, AES-256-GCM crypto (HKDF-SHA256), quota system (hard/soft), `POST /v1/llm/generate-test-cases`, `AiCandidatesModal`, flakiness detector, audit log (T-6.1 – T-6.10)
- **Phase 7** — GA polish: Ed25519 licensing engine (active/expired/offline-grace/invalid states), Stripe subscription webhooks, offline read-only mode with write queue, WCAG 2.1 AA accessibility, responsive layout, TestPulse schema reader package, beta opt-in, complete documentation (T-7.1 – T-7.10)

### Security

- BYOK LLM keys encrypted AES-256-GCM with HKDF-SHA256 per-org key derivation, master key in Azure Key Vault HSM
- LLM API keys wiped from memory immediately after each call (`buffer.fill(0)`)
- Licenses signed with Ed25519; validation every 24 h (Cloud) / 7 d (Server)
- All Admin operations logged immutably in `TestVault.AuditLog`; sensitive values masked (last 4 chars)
- `npm audit --audit-level=high` blocking in CI; CycloneDX SBOM on every release

### Fixed

- N/A (initial release)

---

## [0.1.1] — 2026-05-09

### Fixed

- **Manifest ADO hub group** — contribution `argos-hub` pointait vers `ms.vss-web.project-hub-group` (Project hub) au lieu de `ms.vss-work-web.work-hub-group` (Boards tab). L'onglet Argos apparaît maintenant correctement dans la section Boards (T-0.8).
- **Coverage panel URI** — le panneau Work Item Form pointait vers `dist/hub/hub.html` au lieu de `dist/widgets/coverage-panel/index.html`, son propre point d'entrée React dédié.
- **Scopes Marketplace** — ajout des permissions manquantes : `vso.work_full`, `vso.profile`, `vso.code`, `vso.extension.data_write`, `vso.identity` (alignement plan §2.1).
- **Server 2022 target** — ajout de `Microsoft.TeamFoundation.Server [18.0,)` dans `targets` pour déclarer le support ADO Server 2022.

### Added

- Point d'entrée dédié `dist/widgets/coverage-panel/` — bundle React autonome pour le panneau Test Coverage sur les Work Item Forms.

## [Unreleased]

- (post-0.1.1 work tracked here)
