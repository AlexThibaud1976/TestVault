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

### Fixed (Sprint 1 — 2026-05-09 — fix/llm-models-deprecation)

- **Modèles LLM dépréciés dans la doc** : remplacement de toutes les références à `gpt-4.1` par `gpt-5.2` dans `Specs/constitution.md` (§3.2.1 et §11) et `Specs/spec.md` (description feature TC generation et wireframe Settings). `gpt-4.1` a été retiré de Microsoft Foundry le 2026-04-11 ; la case checklist §11 cochée "actifs au 2026-05-08 ✓" était factuellement fausse à la date où elle a été cochée.
- **Date de validation checklist §11** corrigée : 2026-05-08 → 2026-05-09 avec note explicative.
- **Modèles LLM dépréciés dans les tests applicatifs** : remplacement de `gpt-4.1` par `gpt-5.2` dans `apps/argos-extension/src/hub/llm-provider-service.test.ts` et `LlmProviderSettings.test.tsx` (2 occurrences découvertes hors périmètre initial ; incluses dans Sprint 1 suite à décision 2026-05-09).

### Added (Sprint 1)

- **Suite de tests de non-régression** dans `tools/regression/` :
  - Premier test : `LLM-2026-05-09-gpt41-deprecation.test.ts` (scan du repo, échoue si `gpt-4.1` est réintroduit)
  - `tools/regression/REGISTRY.md` — registry des tests régression nommés (cf. constitution §10 "test de non-régression nommé pour chaque bug confirmé")
  - Convention de nommage : `<TYPE>-<DATE-OU-TASK>-<short-slug>`

### Fixed (Sprint 1.1 — 2026-05-09 — fix/sprint1-encoding-mojibake)

- **Encoding `Specs/spec.md` (régression Sprint 1, 1010 occurrences)** : restauré depuis le commit pré-Sprint-1 `1acdb46` + ré-application des modifs `gpt-4.1` → `gpt-5.2` du Sprint 1.
- **Encoding `Specs/tasks.md` (corruption pré-existante au repo, 647 occurrences)** : recovery algorithmique via round-trip cp1252 → UTF-8 (le fichier était déjà corrompu avant Sprint 1, donc pas de version git propre à restaurer).
- **Allowlists désynchronisées** : 3 fichiers (`LLM-test`, `ENC-test`, `scan-mojibake.cjs`) maintenaient chacun leur propre allowlist, oublis fréquents lors d'ajouts. À refactoriser en Sprint 2 (TECH-DEBT-001).

### Added (Sprint 1.1)

- **Test régression `ENC-2026-05-09-spec-mojibake`** dans `tools/regression/` — zero-tolerance, source 100% ASCII (escapes Unicode dans les regex), immunisé à la corruption d'encoding qu'il détecte.
- **Outil `tools/regression/scan-mojibake.cjs`** — audit standalone du repo, retourne fichier:occurrences trié.
- **Outil `tools/regression/fix-mojibake.cjs`** — recovery algorithmique cp1252 → UTF-8 réutilisable pour fichiers corrompus sans source git propre.
- **Archive `tools/claude-prompts/`** — prompts Claude Code archivés par sprint (`CLAUDE_TASK_sprint-1.md`, `CLAUDE_TASK_sprint-1.1.md`) + `README.md` documentant la convention.
- **Garde-fou méthodologique dans `CLAUDE.md`** — section "Encoding rules" déconseillant `Set-Content` PS sans flag, recommandant Git Bash / WSL / outils Claude Code.

### Lessons learned (Sprint 1.1)

- Cause racine identifiée : `Set-Content` PowerShell sans flag `-Encoding utf8` (PS 5.1 Windows défaut = cp1252).
- L'incident s'est reproduit pendant Sprint 1.1 lui-même (test ENC corrompu pendant ses propres éditions). Solution adoptée : test source 100% ASCII via escapes Unicode `\uXXXX`.
- Allowlists séparées entre 3 fichiers sont fragiles → factoriser au Sprint 2.

- (post-Sprint-1 work tracked here)
