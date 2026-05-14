# Changelog

All notable changes to TestVault (Argos) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Sprint 2.6 2026-05-15 -- argos-cli install command + npm publish setup (v0.5.6)

**Sprint MONOLITHIQUE : argos-cli install command + npm publish. TECH-DEBT-042 LIVRE.**

#### Added

- **NEW** `argos install` command in argos-cli (TECH-DEBT-042 LIVRE)
  - Custom Process Inheritance creation via ADO Process API
  - 3-state detection: not-installed / partial / installed (idempotent)
  - Interactive prompts (PAT, processName, baseProcess) + flag-based mode
  - Exit codes: 0=success, 1=missing args, 2=detection fail, 3=install fail
  - Cohabitation with Microsoft Test Plans (Custom WIT prefix TestVault.*)
  - `--org` alias for `--org-url` (coherence with wizard command display)

- **NEW** npm publish setup for @atconseil/argos-cli (TECH-DEBT-043 LIVRE partial)
  - Package metadata: description, keywords, repository, homepage, bugs, author
  - tsup bundler: noExternal for workspace deps -> standalone bundle (13 MB unpacked)
  - publishConfig: access=public, registry=npm
  - .npmignore + files whitelist (dist + README + LICENSE only)
  - README.md complete CLI usage doc
  - LICENSE file in package

- **NEW** `.github/workflows/publish-cli.yml`
  - Trigger: push tag v*.*.* or workflow_dispatch
  - Build + dry-run + publish via NPM_TOKEN secret
  - npm provenance via id-token: write
  - Dry-run safety on workflow_dispatch

#### Changed

- packages/argos-cli/src/cli.ts: ajout sub-command `install`
- packages/argos-cli/package.json: metadata complete pour npm public + tsup build script
- Specs/tasks.md: T-1.3 TECH-DEBT-042/043 marques livres

#### Tests

- 6 tests unitaires install-command (mock SDK service + process.exit)
- 3 tests CFG regression (presence fichiers + import cli.ts)
- Total: 57 -> 60 regression tests

#### TECH-DEBT

- TECH-DEBT-042 LIVRE: argos-cli install command (Sprint 2.6)
- TECH-DEBT-043 LIVRE partial: npm publish setup (publish reel via tag v0.5.6 apres merge)
- TECH-DEBT-044 NEW: Workspace deps publish strategy long terme (tsup bundle interim)
- TECH-DEBT-019 (E2E reel) reste critique

#### Architecture notes

- argos-cli est l'installer officiel des Custom WIT (D66-A confirmed)
- Extension Argos -> detection seulement (constitution section 12)
- tsup createRequire banner: fix CJS/ESM interop pour exceljs dans bundle ESM

#### Lessons learned

- Workspace deps (pnpm workspace:*) ne peuvent pas etre publiees sur npm sans bundler
- tsup avec noExternal est la solution pragmatique pour CLI standalone
- exceljs (CJS) dans bundle ESM -> createRequire banner obligatoire
- npm provenance + id-token: write: security best practice 2026
- Premier publish scoped package: --access public obligatoire

---

### Sprint 2.5f-fix 2026-05-15 -- Manifest revert + Wizard pivot architectural (v0.5.5)

**CRITIQUE : argos@0.5.4 publish Marketplace ECHEC. Retrait scope invalide + pivot architectural.**

#### Fixed

- **CRITIQUE** : retire scope `vso.process_write` du manifest (cause echec Marketplace 0.5.4)
  - Erreur Marketplace : "Scope is not valid. Cannot mix uri based and modern scopes: 'vso.process_write'"
  - Verification docs officielles Microsoft : aucun scope `vso.process_*` n'existe
  - Process API necessite OAuth user-context complet (admin avec PAT) -- pas accessible aux extensions sandbox

#### Changed

- **GetStartedView** : adapte pour mode "Detection + Install Guide"
  - Steps : Welcome / Detection / InstallGuide (3 steps au lieu de 2)
  - Detection : utilise `detectInstalled()` via wit/workitemtypes API (scope vso.work, fonctionne)
  - InstallGuide : affiche commande `npx @atconseil/argos-cli install` + option manuel portal
  - Plus de "auto-install depuis extension" (impossible par design Microsoft)
- **App.tsx InstallationGuard** : utilise `detectInstalled()` boolean au lieu de processInstallService
- **services.ts** : retire `processInstallService` (non utilisable depuis extension)
  - Ajoute `detectInstalled: () => Promise<boolean>` (via wit/workitemtypes API)
  - Ajoute `baseUrl: string` (pour CLI command display dans wizard)
- **SDK process-install.ts** : preserve pour utilisation future par argos-cli (Sprint 2.6)

#### TECH-DEBT noted

- **TECH-DEBT-041 NEW** : Architecture Process API documentation
  - Extensions ADO ne peuvent pas appeler Process API
  - Documente dans constitution.md section "Architecture extension vs Process API"
- **TECH-DEBT-019** (E2E reel) reste critique
- **TECH-DEBT-042 NEW** : argos-cli installer command (Sprint 2.6)

#### Architecture pivot 2026-05-15

```text
Sprint 2.5e (avant -- IMPOSSIBLE par design Microsoft) :
  Extension UI -> processInstallService -> Process API (REJECTED)

Sprint 2.5f-fix (apres) :
  Extension UI -> detectInstalled() (wit/workitemtypes, scope vso.work, OK)
  Install Custom WIT -> argos-cli (Sprint 2.6) ou portal admin manuel
```

#### Lessons learned

- `vso.process_write` suppose valide sans verification docs officielles -- LECON : verifier scopes AVANT de coder
- Sprint 2.5e (~2h30) sur architecture impossible par design Microsoft
- Tests unitaires + builds verts != Marketplace valide != produit fonctionnel

#### Decisions actees 2026-05-15

- D66-A : argos-cli devient installer officiel Custom WIT
- D67-A : Bump 0.5.4 -> 0.5.5 propre
- D68-C : Garder Sprint 2.5e merge + fix immediat + planning Sprint 2.6

---

### Sprint 2.5e 2026-05-15 -- First Run Wizard + Custom WIT Install (v0.5.4)

**CRITICAL fix : bug VS402323 (WorkItemTypeNotFoundException) decouvert apres install 0.5.3 sur instance ADO.**

Cause : SDK `process-install.ts` complet et teste, mais JAMAIS invoque depuis l'UI. Argos 0.5.3 ne pouvait rien sauvegarder.

**Architecture new : InstallationGuard dans AppInner**

- `vss-extension.json` : ajout scope `vso.process_write` (reauthorization requise upgrade 0.5.3 -> 0.5.4)
- `services.ts` : `processInstallService` (createProcessInstallService SDK) + `extensionDataClient` exposes
- `App.tsx` : `AppInner` exported, InstallationGuard logic integre
  - Detection au boot via `processInstallService.detectInstallState()`
  - Redirect vers `GetStartedView` si WIT absents (not-installed / partial)
  - `LimitedModeBanner` + `fieldset disabled` si user skip
  - Flag skip persiste via `extensionDataClient` (cle "argos:install:skipped")
- `views/GetStartedView.tsx` NEW : wizard Welcome + Detection + Install (via InstallWizard)
- `views/LimitedModeBanner.tsx` NEW : banner warning Fluent UI 2 avec bouton "Install now"
- `installation-context.tsx` NEW : context React `canCreate: boolean`
- Views (PlansView/CasesView/SetsView/PreconditionsView) : fieldset disabled wrappers

**3 nouveaux tests wiring (10 assertions) :**

- `WIRING-2026-05-15-installation-guard.test.tsx` (4 tests)
- `WIRING-2026-05-15-get-started-wizard.test.tsx` (4 tests)
- `WIRING-2026-05-15-limited-mode-banner.test.tsx` (2 tests)

**T-1.3 partiellement re-checke :**

- T-1.3 "Tests E2E sur instance Cloud" DECOCHE (jamais fait, audit Phase 0-7 avait marque faussement DONE)
- T-1.3 wiring UI COCHE (fait ce sprint)
- TECH-DEBT-019 reste critique (E2E reel ADO Cloud)

**LECON : tests unitaires verts != produit fonctionnel.** SDK + unit tests passes ne suffisent pas. E2E reel indispensable.

**Totaux apres Sprint 2.5e :** 359 tests / 54 fichiers de test / 20 packages. Preflight PASSED argos@0.5.4.

---

### Sprint 2.5d 2026-05-15 -- Wiring Phase 5+6+7 (v0.5.3) -- DERNIER SPRINT WIRING

**8 composants Phase 5+6+7 wires dans App.tsx :**

- `GherkinEditor` : nouvel onglet "Gherkin" dans `CasesView` (T-5.1)
- `RepoMappingSettings` : nouvelle section dans `SettingsView` (T-5.3)
- `AiCandidatesModal` : bouton "AI Suggest" dans `CasesView` ouvre un dialog `ai-candidates-dialog` (T-6.6)
- `AuditLogSettings` : nouvelle section dans `SettingsView` (T-6.4)
- `QuotaSettings` : nouvelle section dans `SettingsView` (stub TECH-DEBT-017 pending Azure Functions deploy) (T-6.7)
- `FlakinessReport` : onglet "Flakiness" dans `ReportsView` (stub TECH-DEBT-017 pending Azure Functions deploy) (T-6.9)
- `OfflineBanner` : banner dans `AppInner` via `connectivityService` (T-7.3)
- `BetaOptIn` : nouvelle section dans `SettingsView` (T-7.9)

**Services Phase 5+6+7 ajoutes dans `services.ts` / `mock-services.ts` :**

- `auditLogService`, `repoMappingService`, `betaFlagService`, `connectivityService`, `quotaSettingsService`, `flakinessReportService`

**4 nouveaux fichiers de tests wiring (10 nouvelles assertions) :**

- `WIRING-2026-05-15-cases-gherkin-ai.test.tsx` (4 tests)
- `WIRING-2026-05-15-settings-audit-repo-beta-quota.test.tsx` (4 tests)
- `WIRING-2026-05-15-reports-flakiness.test.tsx` (2 tests)
- `WIRING-2026-05-15-app-offline.test.tsx` (2 tests)

**`Specs/COMMERCIAL.md` NEW (TECH-DEBT-018) :**

- Brouillon pricing strategy Option C (hybrid flat + per active user)
- Architecture backend billing, portail ATConseil, roadmap 9 sub-sprints
- Dependances : TECH-DEBT-017/019/035

**Milestone : wiring complet -- 24 composants riches integres dans App.tsx**

- Phases 2-7 wiring fait en 3 sprints (2.5b/c/d)
- Prochaines etapes : deploy Azure Functions (TECH-DEBT-017), Marketplace publish (TECH-DEBT-035), E2E reel (TECH-DEBT-019), Beta privee

**Lesson learned (quotaSettingsStub) :** `QuotaSettings.useEffect` appelle `service.getConfig().then()` sans `.catch()`. Le stub doit RESOUDRE (pas rejeter) pour eviter les unhandled promise rejections dans les tests App.

**Totaux apres Sprint 2.5d :** 349 tests / 51 fichiers de test / 20 packages. Preflight PASSED argos@0.5.3.

---

### Sprint 2.5c 2026-05-15 -- Wiring Phase 3+4 (v0.5.2)

**6 composants Phase 3+4 wires dans App.tsx :**

- `WorkItemLinkPanel` : nouvel onglet "Traceability" dans `CasesView` (T-3.1)
- `SnapshotPanel` : nouvel onglet "Snapshots" dans `PlansView` + conteneur `snapshot-diff-panel` toujours present (T-3.2, T-3.3)
- `CoverageMatrix` : `ReportsView` remplace le placeholder par un TabList "Coverage" / "Flakiness" (T-3.5)
- `ImportWizard` : bouton "Import" dans `PlansView` ouvre un dialog `import-wizard-dialog` (T-4.2)
- `WebhookAdmin` : nouvelle section dans `SettingsView` (stub TECH-DEBT-017 pending Azure Functions deploy) (T-4.8)

**Services Phase 3+4 ajoutes dans `services.ts` / `mock-services.ts` :**

- `testCaseVersionService`, `workItemLinkService`, `webhookAdminService`

**3 nouveaux fichiers de tests wiring (7 nouvelles assertions) :**

- `WIRING-2026-05-15-cases-traceability.test.tsx` (2 tests)
- `WIRING-2026-05-15-reports-and-settings.test.tsx` (2 tests)
- `WIRING-2026-05-15-plans-snapshots-import.test.tsx` (3 tests)

**Script `tools/release/bump-fixed-version.cjs` cree (TECH-DEBT-037 resolu) :**

- Bumpait 12 packages -- desormais corriges avec docs-site + e2e (14 total)
- Protege contre les drifts de version type Sprint 2.5b CI fail

**TECH-DEBT-038 cree :** CoveragePanel widget (apps/argos-extension/src/widgets) non-fonctionnel -- a investiguer separement.

**Totaux apres Sprint 2.5c :** 337 tests / 47 fichiers de test / 20 packages. Preflight PASSED argos@0.5.2.

---

### Sprint 2.5b 2026-05-15 -- Wiring Phase 2 (v0.5.1)

**5 composants Phase 2 wires dans App.tsx :**

- `RunInterface` : nouvel onglet "Run" dans `PlansView` (TabList Fluent UI 2). `EvidencePanel` et `CreateBugForm` integres via `RunInterface`.
- `ExecutionHistory` : nouvel onglet "Executions" dans `CasesView`.
- `EnvironmentSettings` : nouvelle section dans `SettingsView` (Admin).

**Services Phase 2 ajoutes dans `services.ts` / `mock-services.ts` :**

- `testExecutionService`, `evidenceUploadService`, `environmentConfigService`, `bugCreationService`

**3 nouveaux fichiers de tests wiring (5 nouvelles assertions) :**

- `WIRING-2026-05-15-plans-run.test.tsx` (2 tests)
- `WIRING-2026-05-15-cases-executions.test.tsx` (2 tests)
- `WIRING-2026-05-15-settings-environments.test.tsx` (1 test)

**Totaux apres Sprint 2.5b :** 330 tests / 44 fichiers de test / 20 packages. Preflight PASSED argos@0.5.1.

---

### Documentation 2026-05-15 -- Audit resync exhaustif Phases 2-7 (TECH-DEBT-026 follow-up)

No version bump -- documentation only.

**New file** : `Specs/audit-resync-2026-05-15.md` -- audit detaille Phase 2-7 avec tableaux Markdown par phase, critere code DONE seulement (D6-C : wiring/deploy/publish laisses uncheck).

**Major findings** :

- **Argos est essentiellement un produit FINI en code** :
  - Phase 2 : 7/7 sections code DONE (test-execution-service, evidence-upload, environment-config, bug-creation, ExecutionHistory + RunInterface + EvidencePanel + EnvironmentSettings + CreateBugForm)
  - Phase 3 : 7/7 sections code DONE (snapshot-diff, coverage-matrix, work-item-link-service + 5 composants UI)
  - Phase 4 : 9/9 sections code DONE (7 importers, 3 exporters, CLI, argos-action, azure-pipelines-task)
  - Phase 5 : 6/6 sections code DONE (argos-gherkin generator/parser/validator + GherkinEditor + RepoMappingSettings)
  - Phase 6 : 10/10 sections code DONE (argos-functions complet 8 modules + 5 composants UI hub)
  - Phase 7 : 3/10 sections code partiel (license-engine + stripe-webhook + OfflineBanner)

- **Le bloqueur est uniquement le wiring + deploy** :
  - 24 composants UI riches non wirees dans App.tsx
  - apps/argos-functions non-deployee sur Azure
  - argos-action + azure-pipelines-task non-publies Marketplace
  - Phase 7 ops (accessibility audit, docs finales, audit securite externe, beta) pendantes

**Changes to `Specs/tasks.md`** :

- Phase 2 : ~36/44 sous-taches cochees (laisse uncheck wiring + E2E)
- Phase 3 : ~33/38 sous-taches cochees (E2E spec confirmee mais a executer)
- Phase 4 : ~42/51 sous-taches cochees (laisse uncheck publish Marketplace + webhook deploy)
- Phase 5 : ~21/25 sous-taches cochees (laisse uncheck sync auto webhook deploy)
- Phase 6 : ~45/61 sous-taches cochees (laisse uncheck Azure deploy + endpoints actifs)
- Phase 7 : ~10/54 sous-taches cochees (3 sections code partiel, le reste ops Phase 7)

**Changes to `Specs/MIGRATION-PLAN.md`** : note audit Phase 2-7 livre.

**TECH-DEBT noted** :

- TECH-DEBT-033 NEW : `tasks.md` massif desalignement Phases 2-7 (cause : sprints intensifs sans reflex de cocher)
- TECH-DEBT-034 NEW (confirme TECH-DEBT-015C) : apps/argos-functions COMPLET mais NON DEPLOYEE sur Azure
- TECH-DEBT-035 NEW : argos-action + azure-pipelines-task CODES mais NON PUBLIES Marketplace
- TECH-DEBT-036 NEW : Phase 7 ops non commencees (WCAG, mobile, docs, audit securite, beta, GA)

### Sanity validation 2026-05-15

- Tests regression : 57/57 passing
- Tests argos-sdk : 261/261 passing
- Tests argos-functions : 103/103 passing
- Turbo test global : 325 tests / 41 test files / 20 packages successful
- Mojibake : 0 file
- Preflight : PASSED (argos@0.5.0)

### Implications Sprint 2.5b/c/d valides

- Sprint 2.5b (~60 min) : wirer 5 composants Phase 2 (RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory)
- Sprint 2.5c (~60 min) : wirer 7 composants Phase 3+4 (SnapshotPanel, SnapshotDiffPanel, WorkItemLinkPanel, CoverageMatrix, CoveragePanel, ImportWizard, WebhookAdmin)
- Sprint 2.5d (~75 min) : wirer 8 composants Phase 5+6+7 (GherkinEditor, RepoMappingSettings, AiCandidatesModal, AuditLogSettings, BetaOptIn, QuotaSettings, FlakinessReport placeholder, OfflineBanner wrapper)

Total : 20 composants wirees, +20 tests regression, ~3h15 cumule.

### Lessons learned (audit 2026-05-15)

- **Audit factuel + sanity test = methode robuste** : avant de cocher tasks.md, on a confirme 325 tests passing globalement. Aucun risque de cocher du faux DONE.
- **Le code peut etre "fini" sans etre "livre"** : Argos a tout le code, mais aucun utilisateur peut l'utiliser tant que wiring + deploy + publish ne sont pas faits.
- **Decoupage Sprint 2.5b/c/d** : plutot que un megasprint 2.5b de 3h, 3 sous-sprints de 60-75 min permettent de garder un rythme soutenable et de commiter regulierement.
- **OBSOLETE Server confirme** : aucune mention "Server" dans Phase 4-6 ne doit etre cochee (Cloud-only depuis v0.2.0).

---

### Documentation 2026-05-14 -- TECH-DEBT-026 audit resync tasks.md Phase 0/0.5/1

No version bump -- documentation only.

**New file** : `Specs/audit-resync-2026-05-14.md` -- audit detaille avec tableau Markdown des taches Phase 0/0.5/1 (DONE/PARTIAL/NOT-DONE/OBSOLETE).

**Changes to `Specs/tasks.md`** :

- T-0.8 (Phase 0) : 6 lignes corrigees (caractere U+FFFD remplace par equivalents corrects -- em-dash, fleches, guillemets)
- Phase 0.5 :
  - T-0.5.1 coche (DONE TECH-DEBT-015A)
  - T-0.5.3 coche (DONE Sprint 2.5a, 5 tests WIRING)
  - T-0.5.2 reste non-coche mais annote PARTIAL (5/8 sections wirees)
  - Refs cassees restaurees : "(App.tsx)" L165 + L169, "(README.md)" L172
- Phase 1 (T-1.1 a T-1.9) : 59 sous-taches cochees
  - Phase 1 etait 0/59 cochee, audit factuel montre 100% DONE
  - T-1.9 partie "Server" marquee OBSOLETE (Cloud-only depuis v0.2.0)

**Changes to `Specs/MIGRATION-PLAN.md`** : note TECH-DEBT-026 livre.

**TECH-DEBT noted** :

- TECH-DEBT-030 NEW : `scan-mojibake.cjs` ne detecte pas U+FFFD
- TECH-DEBT-031 NEW : T-1.9 mentionne "Server" obsolete depuis v0.2.0
- TECH-DEBT-032 NEW : Phase 0.5 avait 3 refs cassees (App.tsx, README.md) -- corrigees

### Lessons learned (TECH-DEBT-026)

- **`tasks.md` etait massivement desaligne** : Phase 1 a 0% cochee alors que 100% DONE en realite. Cause probable : sprints intensifs sans reflexe de revenir cocher tasks.md.
- **CHANGELOGs sont la source de verite des sprints** mais tasks.md est devenu un outil de reference non-maintenu.
- **Recommandation organisationnelle** : a partir de Sprint 2.5b, integrer dans "DONE" : (1) Tests passing + commit, (2) CHANGELOG entry, (3) Update Specs/tasks.md.
- **U+FFFD est invisible aux outils heuristiques classiques** : il faut un test strict comme `ENC-2026-05-14-utf8-validity` (TextDecoder fatal) ou un scan dedie (TECH-DEBT-030).

### Implications pour Sprint 2.5b

Phase 1 etant 100% DONE, Sprint 2.5b doit se concentrer sur :

1. Phase 0.5 T-0.5.2 reste : wirer Audit log + AI-Config (Reports backlog WIRING-CLOUD-PLUS)
2. Settings non-LLM : Repo Mapping, Quotas, Webhooks, Beta opt-in
3. Audit rapide Phase 2 avant le sprint (peut-etre aussi PARTIAL/DONE)

---

### Infrastructure 2026-05-14 -- Dependabot batch (12 PR merged)

No version bump -- dev/CI dependencies only, no runtime product changes.

**GitHub Actions (4 PR)** :

- `actions/checkout` v4 -> v6 (#1)
- `actions/setup-node` v4 -> v6 (#2)
- `pnpm/action-setup` v4 -> v6 (#3)
- `actions/upload-artifact` v4 -> v7 (#36)
- Resolves Node.js 20 deprecation warnings (Node 24 default from June 2026).

**npm dev dependencies (8 PR)** :

- `typescript` 5.9.3 -> 6.0.3 (#9) -- MAJOR, full monorepo typecheck/build validated locally with `--force`
- `jsdom` 25.0.1 -> 29.1.1 (#23) -- MAJOR
- `@types/node` 22.19.18 -> 25.7.0 (#24) -- MAJOR typedef
- `lint-staged` 15.5.2 -> 17.0.4 (#26) -- MAJOR
- `esbuild` 0.25.12 -> 0.28.0 (#22)
- `secretlint` 9.3.4 -> 13.0.0 (#8) -- MAJOR (new file discovery + 3 credential rules)
- `@secretlint/secretlint-rule-preset-recommend` 9.3.4 -> 13.0.0 (#5) -- MAJOR pair with #8
- `turbo` 2.9.10 -> 2.9.12 + `msw` patch (#53 patch-updates group)

**Skipped / Deferred to dedicated sprint** :

- `@biomejs/biome` 1.9.4 -> 2.4.15 (#25) -- MAJOR with config breaking changes (`biome.json` schema)
- `zod` 3.25.76 -> 4.4.3 (#7) -- MAJOR with API breaking changes

### Validation post-batch

- Tests regression : 57/57 passing
- Preflight : PASSED (argos@0.5.0)
- Mojibake scan : 0 file
- `pnpm turbo lint --force` : 12/12 OK
- `pnpm turbo typecheck --force` : 20/20 OK
- `pnpm turbo test --force` : 20/20 OK
- `pnpm turbo build --force` : 12/12 OK
- `pnpm secretlint` : exit 0 (config coherent after #8 + #5 duo merge)

### Methodology lessons learned (Dependabot batch)

- Stale CI on old Dependabot PRs is usually stale base, not real failures. `@dependabot rebase` resolves cleanly in 2-3 min.
- Lockfile conflicts on consecutive merges are normal in monorepos. `@dependabot rebase` regenerates the lockfile each time.
- `--force` on turbo is critical for major bumps (TypeScript) -- cache can mask issues.
- Secretlint pair (#8 + #5) must be merged as a duo -- config incoherent in between.
- Some MAJOR bumps with green CI from old base merge cleanly (TypeScript 6), others have real breaking changes (biome 2.x config, zod 4.x API) and need dedicated sprints.

### TECH-DEBT-029 NEW

- `docs-site#build` task has `outputs` config in `turbo.json` but no actual build outputs. Warning during turbo build : `WARNING  no output files found for task docs-site#build`. Either fix `outputs` array or remove `docs-site#build` from turbo.json if it's intentionally a no-op.

---

## [0.5.1] - 2026-05-15

### Added (Sprint 2.5b - feat/sprint-2-5b-phase2-wiring)

- `RunInterface` wired in `PlansView` (tab "Run") with `EvidencePanel` + `CreateBugForm` integrated
- `ExecutionHistory` wired in `CasesView` (tab "Executions")
- `EnvironmentSettings` wired in `SettingsView` (section Admin)
- 4 Phase 2 services added to `Services` interface: `testExecutionService`, `evidenceUploadService`, `environmentConfigService`, `bugCreationService`
- 3 wiring tests: `WIRING-2026-05-15-plans-run`, `WIRING-2026-05-15-cases-executions`, `WIRING-2026-05-15-settings-environments`

---

## [0.5.0] - 2026-05-14

### Changed (Sprint 8 - chore/sprint-8-versioning-alignement)

- **JALON VERSIONING** : alignement complet sur 0.5.0 + Changesets fixed mode.
- **Racine renommee** : `testvault@0.3.2` -> `argos@0.5.0` (coherence finale rebrand).
- **14 packages alignes sur 0.5.0** (etaient 0.3.2 a 1.0.0 disparates) :
  - racine `argos` : 0.3.2 -> 0.5.0
  - `argosTesting` : 0.4.22 -> 0.5.0
  - `argos-functions` : 0.3.4 -> 0.5.0
  - `docs-site` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-cli` : 0.3.4 -> 0.5.0
  - `@atconseil/argos-detection-api` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-exporters` : 0.3.3 -> 0.5.0
  - `@atconseil/argos-gherkin` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-importers` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-sdk` : 0.3.4 -> 0.5.0
  - `@atconseil/argos-types` : 0.3.2 -> 0.5.0
  - `@atconseil/argos-wit-schema` : 0.3.3 -> 0.5.0
  - `@atconseil/argos-azure-pipelines-task` : 1.0.0 -> 0.5.0 (regression visible, task non publiee)
  - `@atconseil/argos-e2e` : 0.3.4 -> 0.5.0
- **Mode Changesets fixed** active dans `.changeset/config.json` :
  - 1 fixed group avec les 14 packages
  - `ignore: ["@atconseil/regression-suite"]` (outil dev independant)
- **Test regression versioning** : `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts` (4 tests) :
  - Tous les packages du fixed group partagent la meme version
  - Tous matchent la version racine
  - Racine s'appelle `argos`
  - regression-suite est correctement exclu
- **Inchanges intentionnellement** :
  - `@atconseil/regression-suite` reste 0.1.0 (outil dev)
  - `tools/azure-pipelines-task/task.json` champ `version` reste `{1,0,0}` (Marketplace ADO)
  - `apps/argos-extension/vss-extension.json` version aligne sur 0.5.0

### Notes (Sprint 8)

- **0.5.0 et pas 1.0.0** : 1.0.0 est reserve pour la vraie GA produit. 0.5.0 signale "transition complete post-rebrand, pret pour wiring fonctionnel".
- **Regression visible 1.0.0 -> 0.5.0** sur `argos-azure-pipelines-task` : intentionnel. La task n'est pas publiee sur Marketplace ADO.
- **`task.json` version Marketplace ADO** reste `{1,0,0}` : version visible aux utilisateurs des pipelines (`ArgosUploadResults@1`). Inchangee tant que la task n'est pas publiee.

### Lessons learned (Sprint 8)

- **Mode fixed** simplifie le raisonnement versioning pour un solo dev : un seul nombre a se rappeler.
- **Test regression versioning** : critique pour eviter le drift accidentel.
- **`task.json` Marketplace version** != **`package.json` npm version** : deux semantiques independantes.

---

## [0.4.22] - 2026-05-14

### Added (TECH-DEBT-027 - chore/tech-debt-027-encoding-hygiene)

- **`.gitattributes` enrichi** : `working-tree-encoding=UTF-8` ajoute sur 13 extensions sources
  (`.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`, `.md`, `.yaml`, `.yml`, `.toml`,
  `.html`, `.css`). Deux extensions nouvelles (`cjs`, `mjs`) aussi ajoutees.
- **Section "Windows / PowerShell 5.1 encoding gotcha"** ajoutee a `Specs/CLAUDE.md` :
  snapshot CP850 terrain, comment lire en UTF-8, config profil PowerShell, historique.
- **Note Windows** ajoutee a `README.md` (pointeur vers `Specs/CLAUDE.md`).
- **Nouveau test regression** `tools/regression/ENC-2026-05-14-utf8-validity.test.ts` (2 tests).
  Utilise `TextDecoder` mode `fatal: true` pour validation stricte UTF-8 byte-level.
  Complementaire au `scan-mojibake.cjs` heuristique existant.

### Fixed (TECH-DEBT-027)

- **Residu Sprint 6c** : `packages/argos-sdk/typedoc.json` contenait encore
  `@atconseil/testvault-sdk` (avait echappe au grep d'epoque). Corrige en `@atconseil/argos-sdk`.

### Notes (TECH-DEBT-027)

- Snapshot terrain 2026-05-14 a revele PowerShell 5.1 en CP850 (ibm850) -- encore plus ancien
  que CP-1252. Cout : 1 journee d'investigation sur faux mojibakes durant le rebrand argos.
- TECH-DEBT-023 et TECH-DEBT-025 confirmes ANNULES (faux positifs).
- Test regression total : 53 (etait 51, +2 tests UTF-8).
- Bump 0.4.21 -> 0.4.22.

### Lessons learned (TECH-DEBT-027)

- **PowerShell 5.1 sur Windows FR utilise CP850 par defaut** (pas CP-1252).
- **Toujours utiliser `-Encoding UTF8`** sur `Get-Content`, `Set-Content`, `Out-File`.
- **`TextDecoder` mode `fatal: true`** est la verite ultime pour validite UTF-8 byte-level.
- **`.gitattributes` `working-tree-encoding=UTF-8`** documente l'intention sans changer le comportement.

---

## [0.4.21] - 2026-05-14

### Changed (Sprint 7d - feat/rename-testvault-action-to-argos-action) - DERNIER SPRINT RENAMING

- **`tools/testvault-action/` renomme en `tools/argos-action/`** (11eme et dernier sprint de la serie renaming).
- **GitHub Action composite alignee** avec le rebrand argos :
  - `name` : "TestVault - Upload CI Results" -> "Argos - Upload CI Results" (dash ASCII strict)
  - `description` alignee
  - `inputs.plan-id.description` : "TestVault Test Plan ID" -> "Argos Test Plan ID"
  - `inputs.cli-version.description` : reference `@atconseil/argos-cli`
  - Step `Install TestVault CLI` -> `Install Argos CLI`
  - `npm install -g @atconseil/testvault-cli` -> `@atconseil/argos-cli`
  - Variables env : `TESTVAULT_PAT/ORG_URL/PROJECT` -> `ARGOS_PAT/ORG_URL/PROJECT`
  - Commande shell : `testvault tc upload-results` -> `argos tc upload-results`
- **Em-dash UTF-8 valide remplace par dash ASCII** (coherence decision Sprint 6g/7c) :
  - Verification byte : `name` contenait E2 80 94 (em-dash UTF-8 valide), pas mojibake
  - Decision : ASCII strict pour textes utilisateurs visibles (GitHub Marketplace Actions)
- **Documentation alignee** (2 fichiers utilisateur, 4 spec-kit) :
  - `docs/integrations/github-actions.md` : 9 occurrences testvault -> Argos (titre, exemples YAML, table inputs, mentions texte)
  - `docs/user-guide.md` L155 : `atconseil/testvault-action` -> `atconseil/argos-action`, `testvault` CLI -> `argos` CLI
  - `Specs/tasks.md` L571 (ROADMAP T-4.6) : "Action GitHub publiee atconseil/testvault-action@v1" -> "atconseil/argos-action@v1"
  - `Specs/MIGRATION-PLAN.md` : Sprint 7d DONE + jalon final "Renaming totalement termine"
  - `Specs/MONOREPO.md` : 4 occurrences alignees
  - `Specs/PHASE-0-GAPS.md` L251 : aligne

### Files changed (Sprint 7d)

- `tools/testvault-action/` -> `tools/argos-action/` (git mv)
- `tools/argos-action/action.yml` : 10 modifications (name, description, inputs, CLI install, env vars, cmd shell)
- `docs/integrations/github-actions.md` : 9 occurrences alignees
- `docs/user-guide.md` L155 : aligne
- `Specs/tasks.md` L571 : ROADMAP T-4.6 aligne
- `Specs/MIGRATION-PLAN.md` : Sprint 7d DONE + jalon final
- `Specs/MONOREPO.md` : 4 occurrences alignees
- `Specs/PHASE-0-GAPS.md` L251 : aligne
- `CHANGELOG.md` : [0.4.21]

### JALON HISTORIQUE -- RENAMING TESTVAULT -> ARGOS TOTALEMENT TERMINE

**11 sprints renaming livres** :

1. Sprint 5a/5b (cleanup testvault-ui placeholder + dist/vsix-debug)
2. Sprint 6a + follow-up (testvault-types -> argos-types)
3. Sprint 6b (testvault-wit-schema -> argos-wit-schema)
4. Sprint 6c (testvault-sdk -> argos-sdk, le plus large : 47 fichiers)
5. Sprint 6d (testvault-importers -> argos-importers)
6. Sprint 6e (testvault-exporters -> argos-exporters)
7. Sprint 6f + fixup (testvault-gherkin -> argos-gherkin)
8. Sprint 6h (testvault-e2e -> argos-e2e, Option A)
9. Sprint 7a (testvault-cli -> argos-cli, binaire + 7 vars env)
10. Sprint 7b (testpulse-ui-shared -> argos-detection-api, REBRAND semantique)
11. Sprint 6g/7c (testvault-azure-pipelines-task + regen GUID + alignement)
12. **Sprint 7d (CE SPRINT)** : testvault-action -> argos-action + alignement final

**Plus 2 sprints methodologiques** :

- TECH-DEBT-015A follow-up #1 (inventaire tools/ avec package.json)
- TECH-DEBT-015A follow-up #2 (inventaire tools/ complet, 5 dossiers sans package.json)

**Etat final** :

- **8/8 packages** dans `packages/` utilisent `argos-*` (ALLOWED_LEGACY_NAMES vide)
- **Tous les dossiers livrables produit** (`tools/azure-pipelines-task/`, `tools/argos-action/`) alignes argos
- **Tous les binaires shell** : `argos tc upload-results` (anciennement `testvault`)
- **Toutes les variables d'env publiques** : `ARGOS_*` (anciennement `TESTVAULT_*`)
- **`TestVault.*` strings preservees** pour les Custom WIT (lock constitution sections 3.4 et 9, retrocompatibilite clients)
- **Toute la documentation utilisateur** alignee Argos (azure-pipelines.md, github-actions.md, user-guide.md, wit-schema.md)
- **Spec-kit propre** (MIGRATION-PLAN.md DONE, MONOREPO.md a jour, PHASE-0-GAPS.md a jour, tasks.md L571 aligne)

### Notes (Sprint 7d)

- **GitHub Action non publiee sur GitHub Marketplace Actions** : 0 utilisateur externe impacte. Liberte totale pour renommer.
- **Quand cette action sera publiee** (decision produit future), le path sera `atconseil/argos-action@v1` (pas `atconseil/testvault-action@v1`), coherent avec le rebrand global.
- **Em-dash UTF-8 valide -> dash ASCII** : continuite avec Sprint 6g/7c. ASCII strict pour textes utilisateurs visibles dans les UI (GitHub Marketplace, Azure DevOps Pipeline Designer).
- **Cross-package** : aucun residual testvault-action ailleurs (tous les 6 fichiers spec/doc alignes).

### Lessons learned (Sprint 7d)

- **Spec-kit n'est pas que de la doc** : `Specs/tasks.md` L571 contenait une roadmap produit qui devait etre alignee. Le spec-kit fait partie du rebrand, pas un livrable a part.
- **3 livrables produit coherents post-renaming** : `@atconseil/argos-cli` (binaire `argos`), `argos-azure-pipelines-task` (Azure DevOps Task `ArgosUploadResults@1`), `argos-action` (GitHub Action composite `atconseil/argos-action@v1` future publication). Les 3 partagent le meme contrat : variables `ARGOS_*` + commande `argos tc upload-results`.
- **Em-dash UTF-8 valide remplace partout par dash ASCII** dans les textes utilisateurs visibles. Zero ambiguite future.

---

## [0.4.20] - 2026-05-14

### Changed (Sprint 6g/7c - feat/rename-testvault-azure-pipelines-task-to-argos)

- **`@atconseil/testvault-azure-pipelines-task` renomme en `@atconseil/argos-azure-pipelines-task`** (10eme sprint de la serie renaming, avant-dernier).
- **GUID regenere** : `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (placeholder) -> `c9e5088e-8f72-438d-8afe-704bedcf95a9` (vrai GUID v4)
- **Alignement post-Sprint 7a** :
  - Commande shell : `testvault tc upload-results` -> `argos tc upload-results`
  - Variables d'env : `TESTVAULT_PAT/ORG_URL/PROJECT` -> `ARGOS_PAT/ORG_URL/PROJECT`
- **task.json textes** mis a jour (ASCII strict, dash `-` au lieu d'em-dash) :
  - `friendlyName` : "TestVault - Upload CI Results" -> "Argos - Upload CI Results"
  - `description` : "to TestVault (Argos) in Azure DevOps" -> "to Argos test management in Azure DevOps"
  - `instanceNameFormat` : "Upload results to TestVault plan" -> "Upload results to Argos plan"
  - `inputs[planId].helpMarkDown` : "TestVault Test Plan work item ID" -> "Argos Test Plan work item ID"
- **Description du package.json** ajoutee (etait vide)
- **Documentation utilisateur** `docs/integrations/azure-pipelines.md` aligne (9 occurrences) :
  - Titre + intro (dash ASCII)
  - `displayName` dans les exemples YAML
  - Variable group exemple (TestVault -> Argos)
  - `$(TESTVAULT_PLAN_ID)` -> `$(ARGOS_PLAN_ID)` dans l'exemple Maven

### Files changed (Sprint 6g/7c)

- `tools/azure-pipelines-task/package.json` : `name` + `description`
- `tools/azure-pipelines-task/task.json` : `id` (nouveau GUID), `friendlyName`, `description`, `instanceNameFormat`, `inputs[planId].helpMarkDown`
- `tools/azure-pipelines-task/src/index.ts` : cmd shell + 3 vars env
- `docs/integrations/azure-pipelines.md` : 9 occurrences testvault alignees + `$(ARGOS_PLAN_ID)`
- `Specs/MIGRATION-PLAN.md` : Sprint 6g/7c DONE + note
- `Specs/MONOREPO.md` : nom package + description mis a jour

### Notes (Sprint 6g/7c)

- **Task non publiee** sur Marketplace ADO Pipeline Tasks : 0 utilisateur externe impacte.
- **GUID immutable une fois publie** : le nouveau GUID `c9e5088e-8f72-438d-8afe-704bedcf95a9` sera son identifiant officiel lors de la publication future.
- **Em-dash UTF-8 valide remplace par dash ASCII** (decision D6) : `TestVault — Upload CI Results` contenait un vrai em-dash (E2 80 94), pas un mojibake. Remplace par `-` ASCII pour coherence et zero ambiguite d'affichage dans l'UI ADO.
- **Cross-package** : `tools/testvault-action/action.yml` reste avec testvault + TESTVAULT_* (Sprint 7d, dernier sprint).
- Bump 0.4.19 -> 0.4.20.

### Backlog renaming -- post-Sprint 6g/7c

**Packages dans `packages/`** : RENAMING COMPLETE (8/8) - depuis Sprint 7b

**Dossiers tools/ alignement** :

- Sprint 6g/7c : `tools/azure-pipelines-task/` -- DONE
- **Sprint 7d NEXT** : `tools/testvault-action/` -> `tools/argos-action/` (rename dossier + alignement)

Apres Sprint 7d, **renaming GLOBAL TERMINE** (11 sprints au total).

---

## [0.4.19] - 2026-05-14

### Changed (Sprint 7b - feat/rebrand-testpulse-ui-shared-to-argos-detection-api)

- **`@atconseil/testpulse-ui-shared` renomme en `@atconseil/argos-detection-api`** (9eme sprint de la serie renaming, dernier package de `packages/`).
- **REBRAND semantique** (pas simple renaming) :
  - Le nom reflete la fonction reelle : detection d'Argos sur ADO + lecture du schema WIT
  - 9 identifiants TypeScript renommes :
    - Constante `TESTVAULT_WIT_NAMES` -> `ARGOS_WIT_NAMES`
    - Type `TestVaultWorkItemType` -> `ArgosWorkItemType`
    - Interface `TestVaultWitField` -> `ArgosWitField`
    - Interface `ITestVaultSchemaReader` -> `IArgosSchemaReader`
    - Factory `createTestVaultSchemaReader` -> `createArgosSchemaReader`
    - Tests `describe("createTestVaultSchemaReader", ...)` -> `describe("createArgosSchemaReader", ...)`
  - **Strings `"TestVault.*"` INCHANGEES** : les references WIT (`"TestVault.TestCase"`, etc.) restent verrouillees par constitution section 3.4 + section 9 (retrocompatibilite chez les clients ayant deja Argos installe)
- **Description du package ajoutee** (etait vide auparavant)
- **Documentation enrichie** :
  - Section "Consumer API for external integrators" ajoutee a `docs/wit-schema.md`
  - Exemple de code d'integration
  - Tableau de stabilite API (versioning rule)
  - Note explicative sur le prefixe `TestVault.*` immutable
  - `Specs/CLAUDE.md` ligne 94 mise a jour
- **`ALLOWED_LEGACY_NAMES` est maintenant VIDE** : tous les packages utilisent `argos-*`.
- **Preparation publication future** : le package reste `private: true` mais l'API est prete pour TestPulse v2.0+

### Files changed (Sprint 7b)

- `packages/testpulse-ui-shared/` -> `packages/argos-detection-api/` (git mv)
- `packages/argos-detection-api/package.json` : `name` + `description`
- `packages/argos-detection-api/src/wit-schema-reader.ts` : 9 identifiants renommes
- `packages/argos-detection-api/src/index.ts` : exports updates (+ IArgosSchemaReader, IAdoWorkItemClient exposes)
- `packages/argos-detection-api/src/wit-schema-reader.test.ts` : tests alignes
- `tools/regression/CFG-2026-05-13-package-naming.test.ts` : ALLOWED_LEGACY_NAMES vide + commentaires
- `docs/wit-schema.md` : section "Consumer API" ajoutee (~60 lignes)
- `Specs/CLAUDE.md` ligne 94 : description du package
- `Specs/MIGRATION-PLAN.md` : Sprint 7b DONE + note rebrand

### Notes (Sprint 7b)

- **TestPulse** (le produit) reste mentionne dans Specs et docs comme consommateur futur. C'est le **package** testpulse-ui-shared qui est renomme, pas le produit.
- **TestPulse v1.x** consomme uniquement Microsoft Test Plans natifs ADO. **TestPulse v2.0+** consommera aussi Argos via `@atconseil/argos-detection-api`.
- Apres Sprint 7b, renaming des **PACKAGES** complete. Restent Sprints 6g/7c (azure-pipelines-task) et 7d (testvault-action) qui renomment des **DOSSIERS** dans `tools/`.
- Bump 0.4.18 -> 0.4.19.

### Lessons learned (Sprint 7b)

- **Un rebrand n'est pas un renaming** : Sprint 7b a touche 9 identifiants TS, 2 docs et une section dediee API. Beaucoup plus large que Sprints 6a-7a.
- **La distinction produit/package est critique** : "TestPulse" reste dans la doc, "testpulse-ui-shared" devient `argos-detection-api`.
- **Les decisions constitutionnelles sont des locks** : meme dans un rebrand massif, les strings `"TestVault.*"` restent (constitution section 3.4 immutability).
- **Documenter l'intention future** dans le sprint : la section "Consumer API" cristallise pour TestPulse v2.0+ comment integrer Argos.

### Backlog renaming -- etat post-Sprint 7b

**Packages dans `packages/`** : RENAMING COMPLETE (8/8) :
argos-cli, argos-detection-api, argos-exporters, argos-gherkin, argos-importers, argos-sdk, argos-types, argos-wit-schema

**Restant (dossiers `tools/*`)** :

- Sprint 6g/7c NEXT : `tools/azure-pipelines-task/` -- regen GUID + alignement vars env + binaire argos
- Sprint 7d : `tools/testvault-action/` -> `tools/argos-action/` -- alignement install CLI + vars env + binaire argos

**TECH-DEBT actifs** : TECH-DEBT-021, 022, 024, 026, 027

---

## [0.4.18] - 2026-05-14

### Changed (Sprint 7a - feat/rename-testvault-cli-to-argos-cli)

- **`@atconseil/testvault-cli` renomme en `@atconseil/argos-cli`** (8eme sprint de la serie renaming).
- **Binaire shell renomme `testvault` -> `argos`** (changement public, mais 0 utilisateur externe car private:true).
- **Variables d'env publiques renommees `TESTVAULT_*` -> `ARGOS_*`** (7 occurrences dans cli.ts) :
  - `TESTVAULT_PAT` -> `ARGOS_PAT`
  - `TESTVAULT_ORG_URL` -> `ARGOS_ORG_URL`
  - `TESTVAULT_PROJECT` -> `ARGOS_PROJECT`
- Modifications :
  - `packages/testvault-cli/` -> `packages/argos-cli/` (git mv)
  - `packages/argos-cli/package.json` : champ `name` + champ `bin`
  - `packages/argos-cli/src/cli.ts` : 7 occurrences vars env
  - `tools/e2e/package.json` : dependency mise a jour
  - `tools/e2e/tests/07-phase4-import-export-cli.spec.ts` : import mis a jour
  - `tools/e2e/tests/08-phase5-bdd-sync.spec.ts` : import mis a jour
  - `tools/regression/CFG-2026-05-13-package-naming.test.ts` : entree testvault-cli retiree de ALLOWED_LEGACY_NAMES

### Notes (Sprint 7a)

- **Desalignement temporaire et intentionnel** : les 3 livrables externes qui consomment encore
  le binaire `testvault` et les vars `TESTVAULT_*` restent INALIGNES jusqu'a leurs sprints dedies :
  - `tools/azure-pipelines-task/src/index.ts` -> Sprint 6g/7c (en attente)
  - `tools/testvault-action/action.yml` -> Sprint 7d (en attente)
  - `docs/integrations/azure-pipelines.md` -> Sprint 6g/7c
  - `docs/integrations/github-actions.md` -> Sprint 7d
- Apres Sprint 7d, le rebrand argos sera **complet** et coherent.
- Bump 0.4.17 -> 0.4.18 (patch : rename + env var rename, aucun changement fonctionnel).

### TECH-DEBT actifs (recap Sprint 7a)

- TECH-DEBT-021 : Migration `build:vsix` output-path
- TECH-DEBT-022 : Cleanup auto artefacts orphelins post-`git mv`
- TECH-DEBT-024 : Forcer `--force` sur turbo dans validation post-renaming (applique ici)
- TECH-DEBT-026 : Resync `Specs/tasks.md` avec realite du code (avant Sprint 2.5b)
- TECH-DEBT-027 NEW : Documenter encoding PowerShell 5.1 + `.gitattributes` (apres renaming complet)

### Backlog renaming (post Sprint 7a)

- Sprint 7b NEXT : `testpulse-ui-shared` -> `argos-detection-api`
- Sprint 6g/7c : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- Sprint 7d : `tools/testvault-action/` -> `tools/argos-action/`
- Sprint 8 : Versioning alignement (Changesets fixed mode)

---

## [0.4.17] - 2026-05-14

### Added (TECH-DEBT-015A follow-up #2 - docs/monorepo-inventory-followup-2)

- **Specs/MONOREPO.md** : nouvelle sous-section "Dossiers utilitaires dans tools/" inventoriant 5
  dossiers oublies (testvault-action, preflight, claude-prompts, load-testing, migration-scripts).
  Mise a jour des sections "Vue d'ensemble" (+5 lignes), "Observations factuelles" (+observation 12),
  "Carte des dependances internes" (+5 lignes).
- **Specs/MIGRATION-PLAN.md** : nouvelle section 1.9 listant les 5 dossiers non-package. Ajout du
  **Sprint 7d** (rename testvault-action -> argos-action). Mise a jour du tableau d'execution et
  du chemin critique. 2 lignes ajoutees a la section Risques.
- **Specs/PHASE-0-GAPS.md** : nouvelle sous-section 6.1 documentant la regle methodologique
  d'inventaire monorepo (lister TOUS les dossiers, pas seulement ceux avec package.json).

### Notes (TECH-DEBT-015A follow-up #2)

- Sprint purement documentaire. Aucune modification de code, package.json, ou test regression.
- Decouverte declenchee par Sprint 7a investigation (rename testvault-cli) : variables d'env
  `TESTVAULT_*` dans `tools/testvault-action/action.yml` ont revele un dossier non documente.
- **2eme correction** du TECH-DEBT-015A. La premiere correction (2026-05-13) avait deja ajoute
  3 packages tools/ avec package.json. Cette correction ajoute 5 dossiers tools/ SANS package.json.
- **Note encoding** : l'em-dash dans `action.yml` est UTF-8 valide (E2 80 94 = U+2014), pas de
  mojibake reel. Le risque scan-mojibake reste ouvert pour .yml (TECH-DEBT-025).
- Lecon racine : un inventaire monorepo doit lister TOUS les dossiers du workspace glob.

### Lessons learned

- **TECH-DEBT-015A initial avait DEUX angles morts cumules** : (1) tools/* complet rate, (2) dossiers
  sans package.json rates.
- **Le follow-up #1 (2026-05-13) n'avait corrige que l'angle mort #1**. Cette correction (2026-05-14)
  finalise l'inventaire.
- **Pour les futurs audits** : explorer chaque chemin du workspace glob avec `Get-ChildItem -Directory`
  et categoriser chaque dossier (npm package / action composite / scripts / doc / placeholder).

### Backlog enrichi

- **Sprint 7a NEXT** : `testvault-cli` -> `argos-cli`. Surface clarifiee :
  1 consommateur package.json (tools/e2e), 2 imports source (tools/e2e tests),
  binaire `testvault` -> `argos`, 7 variables d'env `TESTVAULT_*` dans cli.ts -> `ARGOS_*`,
  test regression : retirer entree ALLOWED_LEGACY_NAMES.
- **Sprint 7b** : `testpulse-ui-shared` -> `argos-detection-api`
- **Sprint 6g/7c** : `testvault-azure-pipelines-task` (fix mojibake + GUID + alignement)
- **Sprint 7d NEW** : `tools/testvault-action/` -> `tools/argos-action/` (alignement CLI + variables env)
- TECH-DEBT-025 (deja inscrit) : scan-mojibake.cjs ne couvre pas les .yml et .json
- TECH-DEBT-026 (deja inscrit) : Resync Specs/tasks.md avec realite du code

---

## [0.4.15] - 2026-05-13

### Changed (Sprint 6h - feat/rename-testvault-e2e-to-argos-e2e)

- **`@atconseil/testvault-e2e` renomme en `@atconseil/argos-e2e`** (7eme sprint de la serie renaming).
  - **Option A appliquee** : le dossier `tools/e2e/` reste inchange. Seul le `name` du package npm est modifie.
  - Aucun consommateur interne (le package est une suite E2E, non consomme par d'autres packages).
  - Modifications :
    - `tools/e2e/package.json` : champ `name` seulement
    - `.github/workflows/ci-main.yml` ligne 101 : `--filter @atconseil/testvault-e2e` -> `--filter @atconseil/argos-e2e`
    - `.github/workflows/ci-main.yml` ligne 98 (bonus) : `testvault-sdk` -> `argos-sdk` (stale ref de Sprint 6c)

### Notes (Sprint 6h)

- Sprint le plus court de la serie renaming (~15 min). Surface minimale.
- **Option A vs Option B** : le dossier `tools/e2e/` porte le nom de sa fonction, pas du produit. Coherence avec `tools/regression/`, `tools/preflight/`.
- **Test regression naming non touche** : sa portee est `packages/`, pas `tools/`. Aucune entree `testvault-e2e` dans `ALLOWED_LEGACY_NAMES`.
- **Validation --force** : `pnpm turbo lint/typecheck/test/build --force` tous verts (lecon Sprint 6f : eviter faux verts cache turbo).
- Bump 0.4.14 -> 0.4.15 (patch : renaming sans changement fonctionnel).

### Backlog enrichi (0.4.15)

- **Sprint 6g NEXT** : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` (necessite reflexion versioning)
- **Sprint 7a** : `testvault-cli` -> `argos-cli`
- **Sprint 7b** : `testpulse-ui-shared` -> `argos-detection-api`
- **TECH-DEBT-024** : Regenerer sbom.json (stale depuis Sprint 6d)
- (autres items inchanges)

---

## [0.4.14] - 2026-05-13

### Changed (Sprint 6f - feat/rename-testvault-gherkin-to-argos-gherkin)

- **`@atconseil/testvault-gherkin` renomme en `@atconseil/argos-gherkin`** (6eme et dernier sprint Groupe 1 packages/).
  - Dossier : `packages/testvault-gherkin/` -> `packages/argos-gherkin/` (git mv, historique preserve).
  - 4 consommateurs internes mis a jour (tous workspace:*) :
    - `packages/testvault-cli/package.json` + 2 fichiers (bdd-sync.ts, bdd-sync.test.ts)
    - `apps/argos-extension/package.json` + 1 fichier (GherkinEditor.tsx)
    - `apps/argos-functions/package.json` + 1 fichier (bdd-sync/git-push-handler.ts)
    - `tools/e2e/package.json` + 1 fichier (08-phase5-bdd-sync.spec.ts)
  - Aucune modification fonctionnelle de l'extension Argos.

- **CFG-2026-05-13-package-naming** : retire `"@atconseil/testvault-gherkin"` de `ALLOWED_LEGACY_NAMES`.
  La liste contient maintenant 2 entrees restantes (cli, testpulse-ui-shared).

### Milestone (Sprint 6f)

- **Groupe 1 packages/ : 6/8 packages renommes** (types, wit-schema, sdk, importers, exporters, gherkin).
  Restants : testvault-cli (Sprint 7a), testpulse-ui-shared (Sprint 7b).

### Notes (Sprint 6f)

- Sprint court (~20 min). 5 fichiers source.
- Tous les consommateurs en workspace:* (pas de workspace:^ dans ce sprint).
- Bump 0.4.13 -> 0.4.14 (patch : renaming sans changement fonctionnel).
- Garde-fou ASCII commit : pre-check execute, message 100% ASCII.
- Note : pnpm install --force requis apres Move-Item (symlinks vitest).

### Backlog enrichi (0.4.14)

- **Sprint 6g NEXT** : `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- **Sprint 6h** : `testvault-e2e` -> `argos-e2e`
- **Sprint 7a** : `testvault-cli` -> `argos-cli`
- **Sprint 7b** : `testpulse-ui-shared` -> `argos-detection-api`
- **TECH-DEBT-022** : Cleanup automatique artefacts orphelins post-git-mv (dist/, .turbo/).
- **TECH-DEBT-023** : Etendre scan-mojibake pour scanner les commits recents.
- **TECH-DEBT-024 NEW** : Regenerer sbom.json (stale depuis Sprint 6d).
- (autres items inchanges)

---

## [0.4.13] - 2026-05-13

### Changed (Sprint 6e - feat/rename-testvault-exporters-to-argos-exporters)

- **`@atconseil/testvault-exporters` renomme en `@atconseil/argos-exporters`** (5eme sprint Groupe 1).
  - Dossier : `packages/testvault-exporters/` -> `packages/argos-exporters/` (git mv, historique preserve).
  - 3 consommateurs internes mis a jour :
    - `apps/argos-extension/package.json` (workspace:^) + 1 fichier (CoverageMatrix.tsx)
    - `packages/testvault-cli/package.json` (workspace:*) + 1 fichier (cli.ts -- import() dynamique)
    - `tools/e2e/package.json` (workspace:^) + 2 fichiers (tests 06 + 07)
  - Aucune modification fonctionnelle de l'extension Argos.

- **CFG-2026-05-13-package-naming** : retire `"@atconseil/testvault-exporters"` de `ALLOWED_LEGACY_NAMES`.
  La liste contient maintenant 3 entrees restantes (gherkin, cli, testpulse-ui-shared).

### Notes (Sprint 6e)

- Sprint court (~20 min). 4 fichiers source.
- Workspace prefixes preserves : testvault-cli (workspace:*), argos-extension et e2e (workspace:^).
- Bump 0.4.12 -> 0.4.13 (patch : renaming sans changement fonctionnel).
- Garde-fou ASCII commit : pre-check execute, message 100% ASCII.
- Note : pnpm install --force requis apres Move-Item (symlinks vitest).

### Backlog enrichi (0.4.13)

- **Sprint 6f NEXT** : `testvault-gherkin` -> `argos-gherkin`
- **TECH-DEBT-022 NEW** : Cleanup automatique artefacts orphelins post-git-mv (dist/, .turbo/).
- **TECH-DEBT-023 NEW** : Etendre scan-mojibake pour scanner les commits recents.
- (autres items inchanges)

---

## [0.4.12] - 2026-05-13

### Changed (Sprint 6d - feat/rename-testvault-importers-to-argos-importers)

- **`@atconseil/testvault-importers` renomme en `@atconseil/argos-importers`** (4eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-importers/` -> `packages/argos-importers/` (historique git preserve).
  - 4 consommateurs internes mis a jour :
    - `apps/argos-extension/package.json` + 2 fichiers source (ImportWizard.tsx, ImportWizard.test.tsx)
    - `apps/argos-functions/package.json` + 1 fichier (webhooks/queue-processor.ts)
    - `packages/testvault-cli/package.json` + 2 fichiers (upload-results.ts, upload-results.test.ts)
    - `tools/e2e/package.json` + 1 fichier (tests/07-phase4-import-export-cli.spec.ts)
  - Aucune modification fonctionnelle de l'extension Argos.

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-importers"` de `ALLOWED_LEGACY_NAMES`. La liste contient maintenant 4 entrees restantes (exporters, gherkin, cli, testpulse-ui-shared).

### Notes (Sprint 6d)

- Sprint court (~25 min). Methodologie identique aux precedents (template valide).
- Surface : 4 consommateurs, 6 fichiers source.
- Bump 0.4.11 -> 0.4.12 (patch : renaming sans changement fonctionnel).
- Note : pnpm install --force requis apres rename pour rebuildier les symlinks vitest.

### Backlog enrichi (0.4.12)

- **Sprint 6e NEXT** : Renaming `testvault-exporters` -> `argos-exporters`
- **Sprint 6f** : Renaming `testvault-gherkin` -> `argos-gherkin`
- (autres items inchanges)

---

## [0.4.11] - 2026-05-13

### Changed (Sprint 6c - feat/rename-testvault-sdk-to-argos-sdk)

- **`@atconseil/testvault-sdk` renomme en `@atconseil/argos-sdk`** (3eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-sdk/` -> `packages/argos-sdk/` (historique git preserve).
  - 5 consommateurs internes mis a jour (package.json + imports) : testvault-cli, testvault-exporters,
    argos-extension, argos-functions, tools/e2e.
  - 47 fichiers source mis a jour (imports `@atconseil/testvault-sdk` -> `@atconseil/argos-sdk`).
  - Exports `./browser` preserves (argos-extension et tools/e2e).
  - Aucune modification fonctionnelle de l'extension Argos.

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-sdk"`
  de `ALLOWED_LEGACY_NAMES`. La liste contient maintenant 5 entrees restantes (importers, exporters,
  gherkin, cli, testpulse-ui-shared).

### Notes (Sprint 6c)

- Sprint le plus large du Groupe 1 (~45 min). 5 consommateurs, 47 fichiers source.
- Methodologie identique aux Sprints 6a/6b (template valide).
- Bump 0.4.10 -> 0.4.11 (patch : renaming sans changement fonctionnel).
- Note : TECH-DEBT-015A (documentation uniquement, branch docs/monorepo-inventory-followup) n'avait
  pas justifie de bump independant ; sa documentation est integree dans la release 0.4.10 ci-dessous.

### Backlog enrichi (0.4.11)

- **Sprint 6d NEXT** : Renaming `testvault-importers` -> `argos-importers` (3 consommateurs : argos-extension, argos-functions, tools/e2e)
- **Sprint 6e** : Renaming `testvault-exporters` -> `argos-exporters`
- **Sprint 6f** : Renaming `testvault-gherkin` -> `argos-gherkin`
- **Sprint 6g** : Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- **Sprint 6h** : Renaming `testvault-e2e` -> `argos-e2e`
- (autres items inchanges)

---

## [0.4.10] - 2026-05-13

### Changed (Sprint 6b - feat/rename-testvault-wit-schema-to-argos-wit-schema)

- **`@atconseil/testvault-wit-schema` renomme en `@atconseil/argos-wit-schema`** (2eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-wit-schema/` -> `packages/argos-wit-schema/` (historique git preserve).
  - 1 consommateur interne mis a jour : `testvault-sdk` (package.json + 1 import dans `process-install.ts`).
  - Aucune modification fonctionnelle de l'extension Argos.

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-wit-schema"` de `ALLOWED_LEGACY_NAMES`. La liste contient maintenant 6 entrees restantes (sdk, importers, exporters, gherkin, cli, testpulse-ui-shared).

### Added (TECH-DEBT-015A follow-up - docs/monorepo-inventory-followup)

- **Specs/MONOREPO.md** : nouvelle section "Packages dans tools/" inventoriant 3 packages
  non documentes initialement (`azure-pipelines-task`, `e2e`, `regression-suite`). Mise a jour
  des sections "Vue d'ensemble" (+2 lignes), "Observations factuelles" (+observation 11),
  "Carte des dependances internes" (+3 entrees + liste consumers), "Statut publication npm"
  (+ note Azure Pipeline Tasks).
- **Specs/MIGRATION-PLAN.md** : nouvelle section 1.8 detaillant le sort des 3 packages tools/.
  Sprints 6g (`testvault-azure-pipelines-task`) et 6h (`testvault-e2e`) ajoutes au tableau
  d'execution. Ligne risques "tools/* dans grep" ajoutee. Chemin critique mis a jour.
  Note Sprint 6b (incident corruption index Windows).
- **Specs/PHASE-0-GAPS.md** : nouvelle section 6 documentant les deux angles morts de l'audit
  initial (tools/* non inventorie, carte dependances incomplete) et la lecon "tout grep doit
  inclure tools/".

### Notes (Sprint 6b + TECH-DEBT-015A follow-up)

- Sprint 6b court (~20 min). Surface d'impact minimale : 1 consommateur, 1 fichier source.
- TECH-DEBT-015A purement documentaire (decouverte declenchee par Sprint 6b). Pas de bump independant.
- Lecon principale : tout grep consommateurs doit couvrir `packages/`, `apps/`, ET `tools/`.
- Bump 0.4.9 -> 0.4.10 (patch : renaming sans changement fonctionnel).

### Lessons learned (TECH-DEBT-015A follow-up)

- **Un audit initial peut etre incomplet meme avec methodologie rigoureuse**. TECH-DEBT-011 v3
  "verifier le terrain reel" doit aussi s'appliquer aux audits documentaires.
- **Les packages sans consumer interne sont les plus faciles a oublier**. Mitigation : pour tout
  inventaire, lister AUSSI les packages "feuilles" (zero consumer) via
  `pnpm list -r --depth=0`.

### Backlog enrichi (0.4.10)

- **Sprint 6c NEXT** : Renaming `testvault-sdk` -> `argos-sdk` (5 consommateurs : argos-extension, argos-functions, testvault-cli, testvault-exporters, tools/e2e)
- **Sprint 6g NEW** : Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- **Sprint 6h NEW** : Renaming `testvault-e2e` -> `argos-e2e`
- Sprint 6d, 6e, 6f : importers, exporters, gherkin (parallelisable apres 6c)
- (autres items inchanges)

---

## [0.4.9] - 2026-05-13

### Changed (Sprint 6a - feat/rename-testvault-types-to-argos-types)

- **`@atconseil/testvault-types` renomme en `@atconseil/argos-types`** (premier sprint du renaming Groupe 1, MIGRATION-PLAN.md section 1.4).
  - Dossier : `packages/testvault-types/` -> `packages/argos-types/` (via `git mv`, historique preserve).
  - 7 consommateurs internes mis a jour (package.json + imports) : testvault-wit-schema, testvault-sdk, testvault-importers, testvault-exporters, testvault-cli, testpulse-ui-shared, argos-extension.
  - Note : testvault-gherkin et argos-functions ne referencaient pas testvault-types (confirme via grep).
  - Aucune modification fonctionnelle de l'extension Argos.

### Added (Sprint 6a)

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : test regression naming convention. 4 assertions :
  - Au moins 1 package dans packages/
  - Aucun package avec prefixe `@atconseil/testvault-*` (sera fully green apres Sprint 6f)
  - Tous les packages avec prefixe approuve (`@atconseil/argos-*` ou allowed legacy)
  - Consistance nom-dossier
- Le test compte actuellement 6 violations attendues (cli, exporters, gherkin, importers, sdk, wit-schema) qui disparaitront Sprints 6b a 6f.

### Notes (Sprint 6a)

- Sprint le plus risque du renaming Groupe 1 (9 consommateurs reels, testvault-gherkin et argos-functions sans dependance directe).
- Methodologie TDD-first appliquee : test naming convention cree avant renaming (7 violations), renaming fait (6 violations = decrease attendue).
- `git mv` utilise pour preserver l'historique git des fichiers.
- 34 fichiers source mis a jour (16 dans testvault-sdk/src, 18 dans argos-extension/src/hub).
- Bump 0.4.8 -> 0.4.9 (patch : renaming sans changement fonctionnel utilisateur).

### Backlog

- **Sprint 6b NEXT** : Renaming `testvault-wit-schema` -> `argos-wit-schema` (1 consommateur, faible risque)
- Sprint 6c : Renaming `testvault-sdk` -> `argos-sdk` (4 consommateurs)
- Sprints 6d, 6e, 6f : importers, exporters, gherkin (parallele possible apres 6c)

### Changed (Sprint 6a follow-up)

- **`CFG-2026-05-13-package-naming` test : ALLOWED_LEGACY_NAMES etendu** pour accepter les 6 packages testvault-* encore a renommer (Sprints 6b a 7a) + testpulse-ui-shared (Sprint 7b). Le test passe de 2/4 failing a **4/4 passing**.
- **Test 2 modifie** : la verification "no testvault-* prefix" exclut maintenant les noms dans ALLOWED_LEGACY_NAMES. Le test devient un tracker visuel : chaque sprint de renaming retirera une entree de la liste, et a Sprint 7b la liste sera vide.
- **Effet** : suite regression passe de 49/51 a **51/51 passing**. CI verte sur la PR Sprint 6a.

### Lessons learned (Sprint 6a + follow-up)

- **TDD-first sur naming convention** : creer le test avant la transformation rend la progression mesurable.
- **`git mv` sur Windows PowerShell** fonctionne correctement pour les renames lowercase. Pas de probleme de sensibilite casse.
- **testvault-gherkin et argos-functions** ne consomment pas testvault-types en direct -- confirme via grep (MONOREPO.md avait liste argos-functions comme consommateur potentiel, c'etait inexact).
- **Le TDD "rouge progressif" est un anti-pattern pour CI**. Un test qui valide une transformation multi-sprints doit etre vert a chaque etape via une liste explicite (ALLOWED_LEGACY_NAMES), pas via une diminution lente vers zero.
- **A retenir pour les futurs sprints de migration** : introduire le test avec la liste complete des etapes futures inscrite explicitement. Chaque sprint suivant retire une entree.

---

## [0.4.8] - 2026-05-12

### Added (TECH-DEBT-015C - docs/phase-0-gaps)

- **`Specs/PHASE-0-GAPS.md`** : Document analytique honnete des ecarts entre `Specs/spec.md` Phase 0
  et la realite du code. Constat principal : `apps/argos-functions` (8 modules, ~25 fichiers TS) contient
  du code anticipe en avance sur le plan -- tous les modules sont references dans le spec-kit mais en
  Phases 4, 6 et 7, alors que le projet est en Phase 0/1. Le backend n'est pas deploye en production au
  2026-05-12. Le module Stripe est un spike (confirmation utilisateur).

- **`Specs/MONOREPO.md`** (TECH-DEBT-015A) : Inventaire factuel du monorepo (9 packages, 3 apps,
  carte des dependances, statut npm).

- **`Specs/MIGRATION-PLAN.md`** (TECH-DEBT-015B) : Decisions architecturales validees + plan de
  migration (renaming testvault-\* -> argos-\*, versioning hybride, sprints 5a-9).

### Backlog enrichi (TECH-DEBT-015C)

- **TECH-DEBT-017 NEW** : Plan de deploiement argos-functions (decision a/b/c sur le sort du
  backend ; conditionne par TECH-DEBT-016 pricing et TECH-DEBT-018 Stripe)
- **TECH-DEBT-018 NEW** : Decision Stripe -- garder spike / supprimer / refondre proprement Phase 7
- **TECH-DEBT-019 NEW** : Statut apps/docs-site -- placeholder vide a clarifier (supprimer ou implementer)
- Rappel **TECH-DEBT-016** : Strategie pricing Argos (conditionne 017 et 018)

### Lessons learned (015A + 015B + 015C)

- **Code anticipe non documente = dette latente** : le backend argos-functions est un effort R&D
  solide mais en avance sur les phases spec-kit, ce qui rend le repo visuellement plus avance qu'il
  n'est fonctionnellement. La lecon : tout nouveau module ajoute (meme experimental) merite une
  mention dans spec.md, meme juste "exploration Phase X, non-deploye".
- **La triade 015A+015B+015C** livre une vision claire et honnete du monorepo : inventaire factuel
  (015A) + decisions architecturales (015B) + reconnaissance gaps (015C). Base solide pour les
  sprints d'execution.

### Removed (Sprint 5a + 5b - chore/cleanup-dead-code)

- **`packages/testvault-ui`** : suppression du package placeholder vide identifie dans TECH-DEBT-015A (`src/index.ts` contenait uniquement `export {}`, zero consommateur interne dans le repo). Decision validee dans `Specs/MIGRATION-PLAN.md` section 1.6.
- **`dist/`** a la racine : suppression de l'artefact de build/debug non reference dans `pnpm-workspace.yaml`. Le `.gitignore` est mis a jour pour exclure les futurs artefacts similaires (`vsix-debug-*/`).
- **`vsix-debug-3.2/`** a la racine : suppression de l'artefact de debug Sprint 3.2, plus utilise.

### Notes (Sprint 5a + 5b)

- Sprint d'echauffement matinal post-pause : 2 micro-sprints atomiques regroupes en une seule PR (`chore/cleanup-dead-code`).
- Aucune modification fonctionnelle de l'extension Argos.
- Bump 0.4.7 -> 0.4.8 (patch : nettoyage, pas de changement utilisateur).
- Tests regression : 47 passing (inchange, code mort supprime sans test associe).

### Lessons learned (Sprint 5a + 5b)

- **`testvault-ui` a vecu 6+ mois en placeholder** sans qu'aucun sprint ne le notifie. C'est typiquement le genre de code mort qu'un audit periodique (TECH-DEBT-015) doit detecter.
- **`dist/` a la racine etait un VSIX de build:vsix** : le script `build:vsix` dans `package.json` ecrit `../../dist/argos.vsix` (chemin relatif depuis `apps/argos-extension/`), ce qui cree un `dist/` a la racine du repo. Chaque `pnpm build:vsix` regenere cet artefact. Voir TECH-DEBT-021.

### Backlog enrichi (Sprint 5a + 5b)

- **TECH-DEBT-021 NEW** : Migrer le script `build:vsix` output-path de `../../dist/argos.vsix` vers `./dist/argos.vsix` (= `apps/argos-extension/dist/`). Sans cette migration, chaque build regenere un `dist/` racine. Sprint dedie futur, doit aussi mettre a jour `.github/workflows/publish-marketplace.yml`.
- **Sprint 6a NEXT** : Renaming `testvault-types` -> `argos-types` (premier sprint du renaming Groupe 1, le plus risque a cause de ses 10 consommateurs).

---

## [0.4.7] - 2026-05-12

### Added (TECH-DEBT-011 v3 - feat/preflight-manifest-check)

- **`tools/preflight/marketplace-check.md`** : Checklist humaine en 4 sections (etat Marketplace, cibles/types de contributions, icones/assets, versions). A consulter avant tout sprint touchant `vss-extension.json`. Encode les lecons des 5 fausses premises Sprint 2→4.5.
- **`tools/preflight/microsoft-docs-snippets.md`** : Exemples Microsoft copy-paste integraux anti-simplification. Hub-group+hub pattern valide Sprint 3.4, iconName confirmes OK/KO, publisher/visibility, categories valides, table anti-patterns.
- **`tools/preflight/manifest-check.cjs`** : Script auto-validation (7 regles, exit 0/1). `pnpm preflight` ou `node tools/preflight/manifest-check.cjs`. Regles : version coherence, publisher whitelist, no SVG in static/, categories non-vides, icons.default PNG, no `ms.vss-web.project-hub-group`, hub-group consistency.
- **`tools/regression/CFG-2026-05-12-preflight-rules.test.ts`** : Test CI identique au script (7 assertions). Merge bloque si une regle echoue.
- **Section "Avant tout sprint qui touche le manifest"** dans `CLAUDE.md` : pointe vers les 3 couches de garde-fous.
- **REGISTRY** : entree `CFG-2026-05-12-preflight-rules` ajoutee.

### Fixed

- **Version desynchronisation** detectee par le nouveau test CI : `package.json` etait a `1.0.0` (bump errone `major` PR #30) et `vss-extension.json` a `0.4.1`. Les deux sont maintenant alignes sur `0.4.7` (version cible post-prod `0.4.6`).

### Resolved (TECH-DEBT)

- **TECH-DEBT-011 v3** : Infrastructure preventive manifest complete. Trois couches complementaires en place : checklist humaine (judgment-required), script local (mecanicque pre-commit), test CI (enforcement merge). Le premier test actif a immediatement detecte une regression reelle (desync 1.0.0/0.4.1).

### Lessons learned (TECH-DEBT-011 v3)

- **Hybrid tooling > single layer** : checklist humaine pour les regles qui necessitent du contexte (etat Marketplace portail, validation doc Microsoft), script pour les regles mecaniques en local, test CI pour l'enforcement. Les trois se completent.
- **TDD s'applique aux outils preventifs** : le test CI a detecte un bug reel (version desync) immediatement, avant meme que le script soit integre au workflow.
- **Source 100% ASCII pour `tools/regression/`** : les fichiers de test doivent etre ecrits en ASCII pur pour etre immunises contre la corruption d'encoding qu'ils detectent.

---

## [0.4.2] - 2026-05-11

### Fixed (Sprint 4.2 - cosmetic)

- Reports hub iconName: `BarChart4` -> `AnalyticsReport` (BarChart4 didn't render in ADO sandbox post-Sprint 4.1, likely because variante numerotee). AnalyticsReport est dans l'enum officiel @uifabric/icons.IconNames, nom canonique non-numerote.
- Si AnalyticsReport ne rend pas non plus, fallback : `ReportLibrary`, puis `BIDashboard`.
- Bump 0.4.1 -> 0.4.2 (patch cosmetique).


## [0.4.1] - 2026-05-11

### Fixed (Sprint 4.1 - fix/icon-names-preconditions-reports)

- **Icones Preconditions et Reports** : 2 `iconName` Fluent UI ne s'affichaient pas dans la nav ADO post-Sprint 4 :
  - `Important` → `Warning` pour le hub Preconditions
  - `ReportDocument` → `BarChart4` pour le hub Reports
- Cause probable : ADO sandbox ne charge qu'un sous-ensemble de Fluent UI Icons. Les valeurs Sprint 4 venaient d'estimations raisonnables, pas d'une liste validee.
- Aucun test regression modifie : T-1.0 verifie name/type/targets des 6 hubs, pas leur iconName (cosmetique). Validation visuelle BCEE-QA post-deploy.
- Bump 0.4.0 → 0.4.1 (patch cosmetique, pas de feature ni de fix critique).

### Lessons learned (Sprint 4.1)

- **`iconName` Fluent UI sans liste exhaustive** : Microsoft documente la propriete mais pas les valeurs valides cote ADO. Premiere strategie post-deploy : essayer 2-3 alternatives jusqu'a trouver une qui rend. Pas besoin de tests automatises pour la cosmetique.
- **Patch cosmetique = sprint de 15-20 min** : pas besoin de la lourdeur d'un sprint avec test regression + REGISTRY entry. CHANGELOG + bump + upload suffisent.

### Backlog (post-Sprint 4.1)

- TECH-DEBT-011 v2 — Pre-flight check Marketplace + validation target IDs Microsoft (idem)
- (autres items inchanges)

---

## [0.4.0] - 2026-05-11

### Added (Sprint 4 - feat/multi-hubs-architecture)

- **Architecture multi-hubs native ADO (TECH-DEBT-013 resolu).** Le hub monolithique `argos-hub` est eclate en 6 hubs ADO independants :
  - `argos-hub-plans` — Test Plans (icone BulletedList, order 10)
  - `argos-hub-cases` — Test Cases (icone TestBeaker, order 20)
  - `argos-hub-sets` — Test Sets (icone FolderList, order 30)
  - `argos-hub-preconditions` — Preconditions (icone Important, order 40)
  - `argos-hub-reports` — Reports (icone ReportDocument, order 50)
  - `argos-hub-settings` — Settings (icone Settings, order 60)
- **Routing via `SDK.getContributionId()`** (pattern officiel Microsoft) : chaque hub partage `dist/hub/hub.html` et App.tsx choisit la vue a rendre selon le contributionId retourne par le SDK. Tableau `CONTRIBUTION_ID_TO_SECTION` avec full IDs (`AlexThibaud.ArgosTesting.argos-hub-*`) case-sensitive.
- **Test regression `T-1.0-argos-multi-hubs-architecture.test.ts`** : 9 assertions verifiant la presence des 6 hubs, leur type, leur target, leurs noms, l'absence du legacy `argos-hub`, le count exact de 6 hubs `ms.vss-web.hub`.
- **App.tsx refactored** : suppression sidebar nav (NAV_ITEMS, MainContent), ajout `HubContent` switch + 6 view components exportes (`PlansView`, `CasesView`, `SetsView`, `PreconditionsView`, `ReportsView`, `SettingsView`), loading state `hub-loading` preserve.
- **WIRING tests mis a jour** : les 5 tests importaient `MainContent` + cliquaient sur `nav-*`. Migres vers import direct du view component correspondant, sans interaction nav.
- **App.test.tsx** : 8 tests (6 routing + 1 fallback + 1 loading), SDK mock complet (`init`, `ready`, `getContributionId`, `getHost`, `getService`, `getAccessToken`, `getExtensionContext`, `notifyLoadSucceeded`, `notifyLoadFailed`), mock `getService` discriminant par serviceId pour supporter `IExtensionDataService`.

### Changed

- `vss-extension.json` : version 0.3.5 -> 0.4.0, contribution `argos-hub` (singulier) remplacee par 6 contributions.
- `apps/argos-extension/src/hub/index.tsx` : simplification (SDK.init retire, App gere l'initialisation).
- **T-0.9-argos-top-level-placement** : mise a jour assertions (pattern multi-hubs).
- **CFG-2026-05-10-top-level-hub** : ajout assertion "au moins 1 hub dans argos-hub-group".
- **Constitution v0.4.3 -> v0.5.0** avec Sprint 4 section.

### Backlog (post-Sprint 4)

- **Reports hub** : placeholder actuel ("requires backend service not yet implemented"). Implementation complete FlakinessReportService (WIRING-CLOUD-PLUS backlog).
- **Settings hub** : Audit Log, Repo Mapping, Quotas, Webhooks, Beta opt-in (Sprint 2.5b backlog).
- **E2E validation** sur instance ADO Cloud reelle : verifier que les 6 hubs apparaissent bien dans la nav Argos (T-e2e-1.0).
- (autres items backlog inchanges : TECH-DEBT-007, TECH-DEBT-010, TECH-DEBT-012, scopes ADO audit)

### Lessons learned (Sprint 4)

- **Mock complet obligatoire** : quand un composant React utilise `ServicesProvider` (qui cree de vrais services), tous les SDK calls effectues par ces services doivent etre mockes, pas seulement les calls directs dans la suite de test. La chaine `SettingsView -> LlmProviderSettings -> llmProviderService.list() -> SDK.getExtensionContext()` l'illustre.
- **WIRING tests = contrat architecture** : ces tests ont revele exactement ce qui changeait (MainContent -> views independantes, nav supprimee). Les mettre a jour avant de toucher App.tsx aurait ete le flow TDD ideal.
- **`iconName` vs `icon`** : confirme que `iconName` (FluentUI icon name) est la syntaxe correcte pour les hubs dans `vss-extension.json` (utilisee ici pour les 6 hubs).

---

## [0.3.5] - 2026-05-11

### Fixed (Sprint 3.4 - fix/hub-group-architecture)

- **3eme fausse premisse de la chaine identifiee et corrigee.** Sprint 3 utilisait `ms.vss-web.project-hub-group` comme target pour le hub top-level, un ID que j'avais invente sans verification doc Microsoft. ADO accepte les targets non-existants au manifest validation (silent), mais au runtime aucun hub-group ne correspond -> le hub n'apparait nulle part dans la nav.
- **Architecture corrigee via pattern officiel Microsoft** (docs: learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub) :
  - Ajout contribution `argos-hub-group` (type `ms.vss-web.hub-group`) targetant `ms.vss-web.project-hub-groups-collection`
  - Modification contribution `argos-hub` : target devient `.argos-hub-group` (reference relative obligatoire pour cross-contribution dans la meme extension)
  - Hub-group order = 450 (apres Test Plans natif)
  - Icone Argos placee sur le hub-group top-level (visible dans la nav laterale, peer de Boards/Repos)
  - Nom hub interne : "Test Management" (au lieu de "ArgosTesting", coherent avec positionnement marketing)
- **Propriete `iconUrl` -> `icon`** : alignement sur la propriete standard documentee Microsoft. `iconUrl` etait un nom non-officiel qui marchait parfois mais n'est pas garanti.
- **Tests regression mis a jour** :
  - `T-0.9-argos-top-level-placement` : 7 assertions (existence hub-group, type hub-group, target collection, existence hub, target relative, exclusion 2 faux targets historiques)
  - `CFG-2026-05-10-top-level-hub` : 2 nouvelles assertions (hub-group existe + target faux exclu)
  - En-tetes historiques enrichis pour tracer Sprint 3 v1 (invalidee) et Sprint 3.4 v2 (validee)
- **Constitution v0.4.2 -> v0.4.3** avec lessons learned.
- **TECH-DEBT-011 v2 enrichi** : pre-flight check inclut "validation target IDs via doc Microsoft officielle" (clef manquante Sprint 3).
- Bump version 0.3.4 -> 0.3.5 (patch).

### Backlog (post-Sprint 3.4)

- **TECH-DEBT-013 (NOUVEAU)** : eclater le hub Argos monolithique en plusieurs hubs internes (Test Cases, Test Plans, Coverage, Reports, Settings). Profite maintenant que le hub-group existe. Sprint dedie ~2-3h.
- **TECH-DEBT-012** : extension test ENC a `.yml` (mojibake dans publish-marketplace.yml + commit messages PowerShell).
- (autres items backlog inchanges : TECH-DEBT-007 Test Set/Suite, Sprint 2.5b wiring, WIRING-CLOUD-PLUS, scopes ADO audit, TECH-DEBT-010 ATConseil migration)

### Lessons learned (Sprint 3.4)

- **3eme fausse premisse en 24h** apres publisher (Sprint 3.1) et visibility (Sprint 3.2). Pattern stable : modifier des targets/configs dependant d'un referentiel externe (doc Microsoft, etat Marketplace) sans valider ce referentiel. TECH-DEBT-011 v2 doit etre prioritaire post-Sprint 3.4.
- **Validation doc avant prompt** : cette fois, validation Microsoft docs effectuee AVANT redaction du Sprint 3.4 prompt. Resultat : la syntaxe `<publisher>.<extensionId>.<contributionId>` que j'avais proposee la veille etait incorrecte pour les references intra-extension -- la doc requiert `.<contributionId>` (point + ID court). Sans la validation prealable, Sprint 3.4 aurait introduit une 4eme fausse premisse.
- **Architecture hub-group dedie** est plus puissante qu'un hub direct top-level (qui n'existe pas chez Microsoft de toute facon) : permet d'ajouter plusieurs hubs internes au sein du meme groupe Argos. Decoulage potentiel (TECH-DEBT-013) : Test Cases / Test Plans / Coverage / Reports / Settings comme hubs separes au lieu d'un App.tsx monolithique.

---

## [0.3.2] — 2026-05-10

### Fixed (Sprint 3.2 — fix/revert-marketplace-private-to-public)

- **Revert `"public": false` du manifest Argos**. Le Sprint "Marketplace prive" avait ajoute ce champ sur une fausse premisse :
  - Argos v0.1.1 etait deja publie en mode Public sur le Marketplace (2026-05-08)
  - Microsoft interdit le downgrade Public->Prive sur une extension existante sans perte de l'extensionId
  - La publication v0.3.1 avait echoue avec : `"An extension that was made public can't be changed to private."`
  - Le champ `"public": false` est retire du manifest ; l'absence du champ = Public par defaut (comportement Marketplace)
- **Test regression renomme** : `CFG-2026-05-10-marketplace-private.test.ts` -> `CFG-2026-05-10-marketplace-public.test.ts`. Logique inversee : verifie que `"public": false` n'est PAS present et que `galleryFlags: ["Private"]` n'existe pas. En-tete historique preserves la trace du Sprint Marketplace prive et de son revert.
- **Allowlists ts/cjs** mises a jour pour le nouveau nom.
- **REGISTRY** : entree retiree pour marketplace-private + nouvelle entree active pour marketplace-public.
- **Constitution v0.4.1 -> v0.4.2** (correction methodologique tracee).
- **CLAUDE.md** (root) : section "Marketplace publication strategy" mise a jour — mode public, publisher AlexThibaud, test guard-rail renomme.
- Bump version 0.3.1 -> 0.3.2 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.2)

- **TECH-DEBT-011** : si decision produit de restreindre l'acces a une audience specifique, evaluer les options Microsoft (organisation-scoped sharing sans changer la visibilite publique) plutot qu'un downgrade Public->Prive.

### Lessons learned (Sprint 3.2)

- **Microsoft Marketplace est irreversible sur la visibilite** : une extension publiee Public ne peut pas etre passee en Prive sans creer une nouvelle extension avec un nouvel extensionId. Verifier le status courant avant tout changement de visibilite.
- **Chaine de fausses premises** : Sprint 2 (publisher), Sprint "Marketplace prive" (visibilite), Sprint 3 (publisher + visibilite) ont tous cumule des fausses premises. Pattern : tester manuellement sur Marketplace sandbox avant de coder/locker un test de regression.
- **Test regression "false-premise"** (meme lecon que Sprint 3.1) : rename + invert + en-tete historique + REGISTRY retire. Ne pas supprimer.

---

## [0.3.1] — 2026-05-10

### Fixed (Sprint 3.1 — fix/revert-publisher-to-alexthibaud)

- **Revert publisher Marketplace : ATConseil -> AlexThibaud**. Sprint 2 avait change le publisher en pensant que c'etait une "correction", mais la premisse etait fausse :
  - AlexThibaud est le publisher historique d'Argos (v0.1.1 deja publiee 2 jours avant Sprint 3)
  - ATConseil est reserve a TestPulse, pas a Argos
  - Le PAT `MARKETPLACE_PAT` (secret CI) appartient au publisher AlexThibaud
  - La publication v0.3.0 a echoue avec mismatch error : `Publisher ID 'ATConseil' should match 'AlexThibaud'`
- **Test regression renomme** : `CFG-2026-05-10-publisher-atconseil.test.ts` -> `CFG-2026-05-10-publisher-alexthibaud.test.ts`. Logique inversee pour locker AlexThibaud. En-tete historique preserve la trace de la decision Sprint 2 et de son revert.
- **Allowlists ts/cjs** mises a jour pour le nouveau nom.
- **REGISTRY** : entree retiree pour publisher-atconseil + nouvelle entree active pour publisher-alexthibaud.
- **Constitution v0.4.0 -> v0.4.1** (correction methodologique tracee).
- **Spec-kit** (constitution, plan, spec) : toutes les occurrences du publisher Marketplace corrigees en `AlexThibaud`. Les references ATConseil non liees au publisher (marque, Azure Functions, portail) restent inchangees.
- Bump version 0.3.0 -> 0.3.1 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.1)

- **TECH-DEBT-010** : si decision portfolio future de migrer Argos vers le publisher ATConseil, projet separe necessitant creation publisher cote Marketplace + verification Microsoft + transfert/republication. Pas urgent.

### Lessons learned (Sprint 3.1)

- **Avant tout changement de publisher Marketplace**, verifier que le publisher cible existe cote Marketplace ET que le PAT CI a les droits. Sprint 2 a manque cette verification.
- **Test regression "false-premise"** : un test peut locker une mauvaise decision avec autant de rigueur qu'une bonne. Pattern de revert : rename + invert logic + en-tete historique enrichi. Ne pas supprimer le test, sinon perte de la lecon.
- **Banniere et publisher peuvent diverger** : "by ATConseil" sur la banniere + publisher Marketplace AlexThibaud = pattern legitime quand la marque commerciale et le publisher technique sont distincts.

---

## [0.3.0] — 2026-05-10

### Added (Sprint 3 — 2026-05-10 — feat/top-level-hub-v0.3.0)

- **Argos hub repositionné au niveau projet** : contribution `argos-hub` cible desormais `ms.vss-web.project-hub-group` (hub racine ADO, au meme niveau que Boards/Repos/Pipelines) au lieu du groupe Boards. L'onglet Argos est maintenant un hub de premier niveau visible dans toutes les sections du projet.
- **Categories Marketplace etendues** : `"categories": ["Azure Boards", "Azure Test Plans"]` (etait `["Azure Boards"]` uniquement).
- **Banniere Marketplace 1280x640** : `static/marketplace-banner.png` + `static/marketplace-banner.svg` ajoutes et references dans `vss-extension.json` via `content.screenshots`.
- **References Xray supprimees** des fichiers publics (`overview.md`, `vss-extension.json`, `CLAUDE.md`, `README.md`) et du spec-kit (`Specs/CLAUDE.md`, `Specs/constitution.md`, `Specs/plan.md`, `Specs/spec.md`). Terminologie remplacee : "industrial-grade test management" / "outils Jira-natifs".
- **3 tests de regression** ajoutes : `T-0.9-argos-top-level-placement.test.ts`, `CFG-2026-05-10-top-level-hub.test.ts`, `CFG-2026-05-10-no-xray-references.test.ts`.
- **Versions 0.3.0** : 13 packages workspace bumpes depuis 0.2.0 via Changesets (minor bump).

### Refactored (TECH-DEBT-005 — 2026-05-10 — refactor/enc-pattern-coverage)

- **Patterns mojibake elargis** : extraction de la table cp1252 -> Unicode dans `tools/regression/cp1252-mojibake-map.ts` (+ pendant CommonJS `.cjs`). Generation programmatique des patterns mojibake pour 3 categories de longueur UTF-8 (2-byte = accentues Latin, 3-byte = punctuation Unicode, 4-byte = emojis).
- **Coverage amelioree** : nouveaux cas desormais detectes -- trademark (mojibake `â„¢`), euro (mojibake `â‚¬`), en-dash, dagger, grinning-face emoji. Aucun faux positif sur les cas de texte propre testes.
- **Test cross-check `cp1252-mojibake-map.test.ts`** ajoute pour empecher la divergence ts/cjs (5 assertions : char list identique, char class identique, regex source identique, count = 59, trademark/euro inclus).
- **`scan-mojibake.cjs` et `fix-mojibake.cjs` refactes** : utilisent desormais `buildMojibakePatterns()` depuis la table programmatique au lieu des patterns litteraux incomplets.
- **Aucune nouvelle entree REGISTRY** : amelioration de couverture du test ENC-2026-05-09 existant, pas un nouveau perimetre.
- 12 -> 17 tests regression passing (12 anciens + 5 nouveaux cross-check).

### Added (Sprint 2.5a — 2026-05-10 — feat/wiring-foundations-core)

- **ADO Extension SDK bridge** : hook `useAdoContext` recupere token, project, organization depuis le SDK 4.x. Token factory rafraichi a chaque appel API (decision robuste — pas un token fige au mount).
- **`tokenFactory` dans `createAdoClient`** (SDK patch) : `AdoClientConfig` accepte desormais `tokenFactory?: () => Promise<string>` en complement du `pat` statique. Retro-compatible. Chaque appel API utilise un Bearer token frais. Test de non-regression documente dans `ado-client.test.ts` (28 tests au total).
- **Services factory** : `buildServices(adoCtx)` construit tous les services SDK + hub-local en un objet unique injecte via React Context (`ServicesProvider` + `useServices`).
- **`IExtensionDataClient` bridge** : `createExtensionDataClient()` adapte l'ADO Extension Data Service avec User scope (BYOK — chaque utilisateur a ses propres credentials LLM).
- **`IAiSettingsStore` adapter explicite** : `createAiSettingsStore(client)` convertit le contrat `getValue/setValue` vers `getAll/set/delete/getFlag/setFlag` sans cast unsafe.
- **Wiring 5 sections App.tsx** : Plans -> TestPlanForm, Cases -> TestCaseForm, Sets -> TestSetForm, Preconditions -> PreconditionForm, Settings (LLM) -> LlmProviderSettings.
- **Reports** : placeholder explicite avec reference backlog WIRING-CLOUD-PLUS (FlakinessReportService non implemente Sprint 2.5a).
- **Mock services factory** : `apps/argos-extension/src/test-utils/mock-services.ts` reutilisable pour tests d'integration futurs.
- **Smoke tests niveau 1** : 5 tests `WIRING-2026-05-10-*.test.tsx` qui verifient que chaque section rend le composant riche, pas le placeholder.
- **Vitest alias** `azure-devops-extension-api` -> stub local (package AMD incompatible jsdom ; stub expose uniquement les types necessaires aux tests).
- **REGISTRY.md** : ajout entree `WIRING-2026-05-10-foundations`.

### Hors scope Sprint 2.5a (backlog Sprint 2.5b)

- Reports (FlakinessReport orphelin), Run/Coverage/Execution, Wizards, Settings non-LLM (Audit/Repo/Quota/Webhook/Beta).

### Added (mini-Sprint Marketplace Private — 2026-05-10 — feat/marketplace-private)

- **`vss-extension.json` flag `"public": false`** : l'extension Argos est publiée sur le Marketplace en mode privé. Accessible uniquement à l'organisation Azure DevOps `bcee-qa` (à partager via portail publisher au moment de la première publication).
- **Test régression `CFG-2026-05-10-marketplace-private`** : 3 assertions zero-tolerance (`public === false`, `public !== true`, `galleryFlags` ne contient pas `"Public"`).
- **Justification** : Argos est un outil interne BCEE-QA pour l'instant. Bascule vers public possible ultérieurement (commercialisation) — nécessitera de retirer `"public": false` ET de mettre à jour le test régression (changement de stratégie produit explicite, pas un accident).

### Refactored (TECH-DEBT-001 — 2026-05-10 — refactor/regression-allowlist)

- **Factorisation des allowlists communes** : extraction des fichiers méthodologiques partagés (CHANGELOG, REGISTRY, prompts archivés) dans `tools/regression/allowlist.ts` (+ pendant CommonJS `allowlist.cjs`). Les 3 tests régression `*.test.ts` (LLM, ENC, CFG-server2022) et le script `scan-mojibake.cjs` importent désormais cette source unique.
- **Test cross-check `tools/regression/allowlist.test.ts`** ajouté pour empêcher la divergence entre `allowlist.ts` et `allowlist.cjs`.
- **`tsconfig.json` regression** : ajout de `allowImportingTsExtensions + noEmit` pour permettre les imports `.ts` locaux entre tests.
- Aucun changement fonctionnel : les 8 tests régression précédents restent 8 passing + 1 nouveau cross-check = **9 total**.

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

---

## [0.2.0] — 2026-05-10

### BREAKING

- **Cloud-only** : Argos est désormais Cloud-only. Retrait de `Microsoft.TeamFoundation.Server` du tableau `targets[]`. Constitution bumped to v0.3.0. Test de régression `CFG-2026-05-10-server2022-out-of-scope.test.ts` ajouté pour prévenir toute réintroduction.

### Fixed

- **Manifest publisher** : `AlexThibaud` → `ATConseil`. Test de régression `CFG-2026-05-10-publisher-atconseil.test.ts` ajouté.
- **README casing** : `readme.md` → `README.md` (git mv two-step pour filesystem Windows case-insensitive).
- **Versions alignées** : root `package.json`, `apps/argos-extension/package.json` et `vss-extension.json` tous à `0.2.0` (étaient à `0.0.0` / `0.0.1` / `0.1.0` selon le fichier).
- **CHANGELOG chronologie** : entrée fictive `[1.0.0] — 2026-05-08` retirée (décrivait les Phases 1-7 non encore implémentées ; `tasks.md` les montre toutes non cochées).
- **`tasks.md` resync** : version `0.1.0` → `0.1.1`, cases `[x]` Phase 1-7 décochées, ajout Phase 0.5 "Dette d'intégration".

### Added

- **Icônes** : `apps/argos-extension/static/argos-hub.svg` (icône onglet hub) et `apps/argos-extension/static/marketplace-icon.png` (icône Marketplace 128 × 128 px).
- **Phase 0.5 "Dette d'intégration"** dans `Specs/tasks.md` : 5 tâches (T-0.5.1 – T-0.5.5) documentant le wiring manquant App.tsx ↔ composants riches (40+ fichiers).
- **2 tests de régression** dans `tools/regression/` : `CFG-2026-05-10-server2022-out-of-scope.test.ts` et `CFG-2026-05-10-publisher-atconseil.test.ts`.
- **`overview.md` refondu** : ton produit, Cloud-only, liste de features à jour.

### TECH-DEBT noted (Sprint 3+)

- `TECH-DEBT-001` : factoriser les trois allowlists séparées en `tools/regression/allowlist.ts`.
- Phase 0.5 : wiring `App.tsx` ↔ composants riches (40+ fichiers) à réaliser avant la sortie des fonctionnalités Phase 1.

---

## [0.1.1] — 2026-05-09

### Fixed

- **Manifest ADO hub group** — contribution `argos-hub` pointait vers `ms.vss-web.project-hub-group` (Project hub) au lieu de `ms.vss-work-web.work-hub-group` (Boards tab). L'onglet Argos apparaît maintenant correctement dans la section Boards (T-0.8).
- **Coverage panel URI** — le panneau Work Item Form pointait vers `dist/hub/hub.html` au lieu de `dist/widgets/coverage-panel/index.html`, son propre point d'entrée React dédié.
- **Scopes Marketplace** — ajout des permissions manquantes : `vso.work_full`, `vso.profile`, `vso.code`, `vso.extension.data_write`, `vso.identity` (alignement plan §2.1).
- **Server 2022 target** — ajout de `Microsoft.TeamFoundation.Server [18.0,)` dans `targets` pour déclarer le support ADO Server 2022.

### Added

- Point d'entrée dédié `dist/widgets/coverage-panel/` — bundle React autonome pour le panneau Test Coverage sur les Work Item Forms.
