# CLAUDE.md — Project memory for Claude Code

> This file is automatically read by Claude Code at the start of every session in this repo. It is **not** a substitute for the spec-kit files in `Specs/` — those remain the source of truth. This file is a fast-access summary.
>
> Last updated: 2026-05-12 — Sprint 4 + TECH-DEBT-011 v3 complete. Aligned with constitution v0.5.1, spec v0.1.0, plan v0.1.0, tasks v0.1.0.

---

## What this project is

**TestVault** (commercial name on Visual Studio Marketplace: **Argos**, publisher: **ATConseil**) is a test management extension for Azure DevOps Services (Cloud). It targets industrial-grade test management capabilities on ADO Cloud, at parity with leading Jira-native test management tools. It uses native Custom Work Items for storage to guarantee customer data sovereignty, and feeds the standalone TestPulse extension via a documented WIT schema contract.

- **Project name (technical)**: `TestVault`
- **Marketplace name**: `Argos`
- **Publisher**: `ATConseil`
- **npm scope**: `@atconseil/*`
- **GitHub remote**: `AlexThibaud1976/TestVault`
- **Author**: Alexandre Thibaud — atconseil.info

---

## Spec-kit hierarchy — read in this order

All spec-kit files live in `Specs/`:

1. `Specs/constitution.md` — non-negotiable principles. **Never violate.** Changes require explicit approval from Alexandre.
2. `Specs/spec.md` — functional spec (personas, epics, user stories, data models, wireframes).
3. `Specs/plan.md` — technical architecture (monorepo, WIT schema, API, Azure Functions, tests, CI/CD).
4. `Specs/tasks.md` — actionable phased breakdown with `T-X.Y` identifiers.

When in doubt, **read the constitution first**. When implementing, **find your `T-X.Y` task in `Specs/tasks.md`** and use its "Done when" criteria as the success condition.

---

## Hard rules — Claude Code MUST follow

These are extracted from `Specs/constitution.md` §10. Violations block merge.

### Test-first (TDD)
- Every new feature or bugfix starts with a failing test.
- Coverage targets: **≥ 90% core, ≥ 80% UI**, measured with v8/c8, blocking in CI.
- Every confirmed production bug adds a regression test before the fix.

### Announce before acting
- Before starting any task: announce the task ID and a bullet-point plan, then wait for explicit go-ahead.
- Never silently skip a blocker — stop and surface it.

### Commit conventions
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`, `chore:`
- First line ≤ 72 chars. Reference task: `feat(sdk): T-0.5 add detectEnvironment()`
- Always use `pnpm turbo build && pnpm turbo test` before committing.

### Documentation in lockstep with code
- Any PR touching a feature, API, or schema must update `README.md` and `docs/user-guide.md` in the same commit.
- `CHANGELOG.md` (Keep a Changelog format) updated for every release.

### Spec-kit before code
- Any change touching a Custom WIT, public API endpoint, SDK surface, data schema, monetisation model, permission model, or LLM strategy **must** first update the relevant spec-kit file.
- Spec-kit changes require explicit approval from Alexandre before code.

### Non-regression on every PR
- PR template requires: *"Which existing functionality could I have impacted, and how did I verify?"*
- A linked test or written justification is mandatory. See `.github/pull_request_template.md`.

### LLM features — BYOK only
- TestVault never provides a shared LLM key. Customer configures their own (Anthropic, OpenAI, or Azure OpenAI).
- LLM API keys stored AES-256-GCM encrypted, key derived per org via HKDF-SHA256, MasterKey in Azure Key Vault.
- LLM calls go through Azure Functions only — never from browser, never exposing the key.
- No persistence of prompts or responses beyond a TTL ≤ 1h dedup cache.
- Customer keys wiped from memory immediately after each call (`buffer.fill(0)`).

### Permissions
- Roles derived from native ADO permissions (Project Administrator / Contributor / Reader). No parallel model.
- Sensitive operations (LLM config, quotas, license, process install, webhooks, retention) are **Admin-only**.
- Every Admin operation logged in `TestVault.AuditLog` (immutable WIT). Sensitive values masked (last 4 chars only).

---

## Repository layout

```
testvault/
├── apps/
│   ├── argos-extension/           # The VSIX (publisher: ATConseil, name: Argos)
│   │   ├── vss-extension.json     # Marketplace manifest (created T-0.4)
│   │   ├── scripts/build.mjs      # esbuild bundle pipeline
│   │   └── src/hub/               # Coming Soon hub page (React + FluentUI 2)
│   ├── argos-functions/           # Azure Functions (Cloud-Plus: BYOK LLM proxy, webhooks)
│   └── docs-site/                 # Public documentation site
├── packages/
│   ├── testvault-types/           # Shared TS types + Zod schemas (100% cov — T-0.3)
│   ├── testvault-sdk/             # @atconseil/testvault-sdk (Apache 2.0) — detectEnvironment() T-0.5
│   ├── testvault-cli/             # @atconseil/testvault-cli (Apache 2.0)
│   ├── testvault-wit-schema/      # Custom WIT definitions for Process install
│   ├── testvault-ui/              # Fluent UI 2 component wrappers
│   ├── testvault-importers/       # Parsers: CSV, Excel, JUnit, NUnit, xUnit, TestNG, Cucumber
│   ├── testvault-exporters/       # Generators: Excel, PDF
│   └── testpulse-ui-shared/       # Shared with TestPulse standalone
├── tools/
│   ├── e2e/                       # Playwright suites against real ADO instances
│   ├── load-testing/              # k6 stress tests
│   └── migration-scripts/         # WIT schema migration scripts
├── docs/                          # User guide, API reference, SDK reference, WIT schema, operator guide
├── Specs/                         # Spec-kit (constitution, spec, plan, tasks, CLAUDE.md)
├── .github/workflows/
│   ├── ci-pr.yml                  # Gate: lint + typecheck + test + build on PRs
│   ├── ci-main.yml                # Gate on main push + VSIX dry-run
│   └── publish-marketplace.yml    # T-0.6: publish VSIX on tag or manual dispatch
├── turbo.json
├── biome.json
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

---

## Tech stack — locked

| Layer | Technology | Note |
|---|---|---|
| Language | TypeScript 5+ strict | `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess` |
| Runtime | Node.js 22 LTS | |
| Monorepo | pnpm 9 + Turborepo 2 | `pnpm-workspace.yaml` covers `apps/*` + `packages/*` |
| UI framework | React 18 | |
| UI library | Fluent UI 2 (`@fluentui/react-components`) | Native ADO look & feel |
| ADO SDK | `azure-devops-extension-sdk` v4.x + `azure-devops-extension-api` v4.x | No v5 exists |
| Extension bundler | esbuild | For `argos-extension` hub pages |
| Linter / formatter | Biome | `biome.json` at root, tab indent, 100-char width |
| Test runner | Vitest 3 | All packages use `vitest run --passWithNoTests` |
| Validation | Zod 3 | One Zod schema per TS interface in `testvault-types` |
| Build | tfx-cli | For VSIX packaging |
| Hosting | Azure Functions Premium plan, region `francecentral` | |
| Crypto | AES-256-GCM + HKDF-SHA256 | MasterKey in Azure Key Vault HSM-backed |

**Forbidden**: jQuery, CommonJS bundles in production, UI frameworks competing with Fluent UI 2.

---

## Common commands

```bash
pnpm install                                         # Install all workspace deps
pnpm turbo build                                     # Build all packages (Turborepo cached)
pnpm turbo test                                      # Run all tests
pnpm turbo lint                                      # Biome check
pnpm turbo typecheck                                 # Zero-error TS check
pnpm --filter argos-extension dev                    # Dev build watch
pnpm --filter @atconseil/testvault-types test        # Test a single package
```

---

## Workflow conventions

- Branches: `feature/T-X.Y-short-name`, `hotfix/...`, `release/x.y.z`
- Commits: Conventional Commits + task ID reference
- PRs: title `T-X.Y — Short description`, non-regression check required (see template)
- All CI gates must be green before merge: lint, typecheck, tests (≥90%/≥80%), build, `npm audit --audit-level=high`

---

## Phase 0 completion state (2026-05-08)

| Task | Status | Key output |
|---|---|---|
| T-0.1 | ✅ | Monorepo skeleton: pnpm workspaces, Turborepo, Biome, tsconfig.base.json, pre-commit hooks |
| T-0.2 | ✅ | CI/CD: ci-pr.yml (PR gate), ci-main.yml (push + VSIX dry-run), Dependabot |
| T-0.3 | ✅ | `testvault-types`: all Zod schemas for WIT types + config types (71 tests, 100% coverage) |
| T-0.4 | ✅ | `argos-extension`: vss-extension.json, Coming Soon hub (FluentUI 2 + SDK init), esbuild bundle |
| T-0.5 | ✅ | `testvault-sdk`: `detectEnvironment()` — ADO Cloud vs Server detection via `isHosted` |
| T-0.6 | ✅ | Marketplace publish workflow: `workflow_dispatch` + semver tag trigger, `MARKETPLACE_PAT` secret |
| T-0.7 | ✅ | This file |
| T-0.8 | ✅ | ADO-compliant manifest, hub group & coverage-panel widget |
| T-0.9 | ✅ | Argos hub repositionné `ms.vss-web.project-hub-group`, banner Marketplace, branding cleanup, v0.3.0 |

Next phase: **Phase 1** — core WIT CRUD. See `Specs/tasks.md` for T-1.x tasks.

---

## When something blocks you

1. Re-read the relevant `T-X.Y` task in `Specs/tasks.md`.
2. Check `Specs/spec.md` for user-facing intent.
3. Check `Specs/plan.md` for architectural intent.
4. Check `Specs/constitution.md` for non-negotiable rules.
5. If still unclear, **stop and ask Alexandre**. Do not improvise on architecture, security, data sovereignty, or LLM behavior.

---

## Do / Don't

| ✅ DO | ❌ DON'T |
|---|---|
| Read `Specs/constitution.md` first when uncertain | Introduce new deps without `npm audit` check |
| Announce task + plan, wait for go-ahead | Log LLM prompts or responses anywhere |
| Write failing test first, then implement | Store customer data outside their ADO instance |
| Use `workspace:*` for internal packages in pnpm | Use `workspace:*` for external npm packages |
| Use `AdoEnvironmentSchema` to validate host context | Expose ADO PATs to the browser |
| Mask API keys (last 4 chars only) in logs/errors | Bypass TDD ("I'll add tests later") |
| Update docs in the same commit as user-visible changes | Merge with red CI |

---
## Encoding rules — Avoid Sprint 1 incident regression

Ce repo est strictement UTF-8 (sans BOM préféré, avec BOM toléré sur les fichiers existants).

### Règle absolue

**Ne JAMAIS utiliser `Set-Content` PowerShell sans flag d'encoding explicite.**

Sur PowerShell 5.1 (Windows par défaut), `Set-Content` écrit en cp1252 (Windows-1252), ce qui corrompt les caractères français + emoji par double-encoding. Cette corruption a touché `Specs/spec.md` pendant Sprint 1 et plusieurs fichiers de `tools/regression/` pendant Sprint 1.1 (cf. CHANGELOG `[Unreleased]` Sprint 1.1).

### Outils sûrs pour écrire des fichiers

- **VS Code édition directe** : OK (l'indicateur d'encoding en bas à droite de la statusbar doit afficher `UTF-8`)
- **Claude Code (`str_replace`, `edit_file`, `write_file`)** : OK (UTF-8 strict, jamais via Set-Content)
- **Git Bash / WSL** : `cat`, `tee`, `echo` natifs UTF-8
- **PowerShell 7+ (`pwsh`)** : OK par défaut. Vérifie avec `$PSVersionTable.PSVersion` (Major >= 7)
- **PowerShell 5.1** : utiliser explicitement
  - `[IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))` (UTF-8 sans BOM, recommandé)
  - ou `Out-File -Encoding utf8` (ajoute un BOM mais ne corrompt pas)
  - **JAMAIS** `Set-Content` ou `Out-File` sans flag

### Convention pour les nouveaux fichiers de `tools/regression/`

**Les fichiers tests/scripts de `tools/regression/` doivent être écrits en source 100% ASCII** : tous les caractères non-ASCII via escapes Unicode (`\u00C3\u00A9` au lieu de `é`). Ça les immunise à la corruption d'encoding qu'ils sont censés détecter.

Référence d'exemple : `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts`.

### Détection automatique

- `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` — zero-tolerance, exécuté à chaque PR via `pnpm turbo test`. Détecte toute réintroduction de mojibake.
- `tools/regression/scan-mojibake.cjs` — audit on-demand : `node tools/regression/scan-mojibake.cjs`.
- `tools/regression/fix-mojibake.cjs` — recovery algorithmique : `node tools/regression/fix-mojibake.cjs <file>` (dry-run) ou `node tools/regression/fix-mojibake.cjs <file> <output>` (apply).

> Update this file (with a PR) when stack, conventions, or hard rules change. Keep spec-kit version numbers cited at the top in sync.

---

## Avant tout sprint qui touche le manifest

Avant de modifier `apps/argos-extension/vss-extension.json`, consulter les trois niveaux du pre-flight check (TECH-DEBT-011 v3, 2026-05-12) :

1. **Checklist humaine** : `tools/preflight/marketplace-check.md` — 4 sections couvrant état Marketplace, cibles/types, icônes/assets, versions. Traiter chaque case à cocher avant de proposer un changement.
2. **Script auto** : `pnpm preflight` (= `node tools/preflight/manifest-check.cjs`) — 7 règles mécaniques, exit 0 = PASS. À lancer avant tout commit touchant le manifest.
3. **Test CI** : `tools/regression/CFG-2026-05-12-preflight-rules.test.ts` — 7 assertions identiques, tournent à chaque PR. Échec = merge bloqué.

**Référence** : `tools/preflight/microsoft-docs-snippets.md` contient les exemples Microsoft copy-paste anti-simplification (hub-group+hub pattern, iconName confirmés OK/KO, publisher/visibility).

---

## Marketplace publication strategy

L'extension Argos est publiée sur le Marketplace Visual Studio en mode **public** (par défaut Microsoft).

> **Historique** : le Sprint "Marketplace privé" (2026-05-10) avait ajouté `"public": false` sur une fausse prémisse. Argos v0.1.1 étant déjà public, Microsoft interdit le downgrade Public→Privé sans perte de l'extensionId. Revert Sprint 3.2.

### Configuration

- `apps/argos-extension/vss-extension.json` ne contient **pas** de champ `"public"` (absence = public par défaut, comportement Marketplace)
- Publisher : `AlexThibaud` (seul publisher valide pour Argos — voir constitution §6)

### Workflow de publication (à exécuter manuellement par AT)

1. Build le VSIX : `pnpm --filter argos-extension build` (ou équivalent)
2. Package : `tfx extension create --manifest-globs vss-extension.json`
3. Publier : `tfx extension publish --vsix <fichier.vsix> --token <PAT>`
4. Aller sur <https://marketplace.visualstudio.com/manage/publishers/AlexThibaud>

### Garde-fou anti-régression

Le test `tools/regression/CFG-2026-05-10-marketplace-public.test.ts` empêche que `"public": false` soit réintroduit silencieusement. Ce test vérifie également l'absence de `galleryFlags: ["Private"]` (ancienne syntaxe). **Pour passer en privé** (décision produit explicite) : créer une nouvelle extension avec un nouvel extensionId — le downgrade n'est pas possible sur l'existant.
