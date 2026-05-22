# Tasks — TestVault (Argos) v1.0

> Version 0.1.1 — 10 mai 2026 (resync Sprint 2)
> Découpage actionnable des phases d'implémentation
> Auteur : Alexandre Thibaud — atconseil.info
> Réfs : `constitution.md` v0.3.0, `spec.md` v0.1.0, `plan.md` v0.1.0
> Contexte : développement solo en duo avec Claude Code

> **Resync 2026-05-10 (Sprint 2)** : Cette liste a été déchekée pour refléter l'état réel du
> projet, qui est en Phase 0 (bootstrap + tooling). Les composants UI riches existent en code
> mais ne sont pas intégrés dans `App.tsx` (Phase 0.5). Décision Cloud-only effective (v0.2.0).

---

## Mode d'emploi

Ce document liste les tâches d'implémentation par phase. Chaque tâche est **autonome** (peut être prise comme objectif d'une session Claude Code) et a des **critères de done explicites**.

**Convention :**

- `T-X.Y` : identifiant unique de tâche (X = numéro de phase, Y = numéro dans la phase)
- 🔴 = bloquante pour la phase suivante
- 🟡 = bloquante pour des tâches précises (notées en dépendance)
- 🟢 = non-bloquante (peut glisser entre phases)
- 📚 = référence à `constitution.md` / `spec.md` / `plan.md`

**Règles non-négociables (rappel constitution §10 et §11) :**

- TDD strict : test rouge → implémentation → test vert
- Documentation `README.md` + `docs/user-guide.md` mises à jour dans le même commit que le code
- Couverture ≥ 90% core / ≥ 80% UI
- `npm audit --audit-level=high` clean
- Spec-kit mis à jour avant tout changement de comportement utilisateur visible
- Test de non-régression nommé pour chaque bug confirmé

---

## Phase 0 — Scaffolding & infrastructure de base

> **Objectif :** disposer d'un monorepo opérationnel, d'une CI verte, d'une extension Argos minimale publiée en preview privée sur le Marketplace.
> **Done quand :** `pnpm install && pnpm turbo build && pnpm test` passe vert, et un VSIX est installé sur l'org de test ADO Cloud.

### T-0.1 — Initialiser le monorepo 🔴

📚 `plan.md` §1.1, §1.2

- [x] Créer le repo GitHub `atconseil/testvault` (privé en phase 0, public à la GA)
- [x] Initialiser pnpm workspaces + Turborepo + TypeScript strict (`tsconfig.base.json`)
- [x] Créer la structure de dossiers `apps/`, `packages/`, `tools/`, `docs/` conforme au plan
- [x] Configurer **Biome** (lint + format unifiés) à la racine via `biome.json`, branché en CI bloquante
- [x] Ajouter `gitleaks` en pre-commit hook
- [x] Créer `.gitignore`, `LICENSE` (Apache 2.0 pour packages publics, `LICENSE-PROPRIETARY` pour extension), `CODE_OF_CONDUCT.md`

**Done quand :**
- [x] `pnpm install` à la racine fonctionne sans warning
- [x] `pnpm turbo build` lance un build vide mais réussit
- [x] Le repo est cloneable et navigable

### T-0.2 — Mettre en place la CI GitHub Actions de base 🔴

📚 `plan.md` §10.1, §10.2

- [x] Workflow `ci-pr.yml` : checkout → setup Node 22 → pnpm install (frozen) → lint → typecheck → test → build
- [x] Workflow `ci-main.yml` : tout le ci-pr + build VSIX dry-run
- [x] Configurer Dependabot (security + patch updates auto-merge ; minor en PR review)
- [x] Configurer le badge CI dans le `README.md`

**Done quand :**
- [x] Une PR triviale (typo dans README) déclenche la CI verte
- [x] La CI bloque si lint ou typecheck échoue (vérifier avec un fail volontaire qu'on revert ensuite)

### T-0.3 — Créer le package `testvault-types` 🔴

📚 `plan.md` §1.1, `spec.md` §6

- [x] Créer `packages/testvault-types/` avec ses interfaces TypeScript : `TestVaultTestCase`, `TestVaultTestPlan`, `TestVaultTestSet`, `TestVaultPrecondition`, `TestVaultTestExecution`, `TestVaultTestCaseVersion`, `TestVaultAuditLog`
- [x] Définir les types JSON sérialisés : `TestStep`, `TestStepResult`, `EvidenceRef`
- [x] Définir les types de configuration : `OrgConfig`, `LLMProviderConfig`, `ProjectConfig`, `UserPreferences`, `EncryptedApiKey`
- [x] Définir les enums et union types : `TestStatus`, `LLMProviderType`, `AuditOperation`
- [x] Tests : valider via Zod chaque interface a un schema runtime correspondant

**Done quand :**
- [x] `pnpm --filter @atconseil/testvault-types build` produit `dist/`
- [x] Tous les types sont exportés depuis `index.ts`
- [x] Couverture des schémas Zod ≥ 95%

### T-0.4 — Créer l'extension Argos minimale (Hub vide)

📚 `plan.md` §2.1

- [x] Créer `apps/argos-extension/` avec `vss-extension.json` configuré : publisher=`ATConseil`, name=`Argos`, target Cloud (`Microsoft.VisualStudio.Services.Cloud`)
- [x] Implémenter un Hub minimal qui dit juste "Argos — Coming soon" avec layout Fluent UI 2
- [x] Configurer webpack/vite pour le bundle
- [x] Tester l'init du SDK : `SDK.init()` puis `SDK.notifyLoadSucceeded()`
- [x] Builder un VSIX via `tfx-cli`

**Done quand :**
- [x] Le VSIX est généré sans erreur
- [x] Le Hub s'affiche correctement dans une org de test ADO Cloud (installation manuelle preview privée)
- [x] Le Hub s'affiche correctement sur instance ADO Cloud (validation manuelle)

### T-0.5 — Détection runtime Cloud vs Server 🟡

📚 `plan.md` §2.2 — bloque T-3.x (features dépendantes)

- [x] Créer `packages/testvault-sdk/src/runtime-detection.ts` avec la fonction `detectEnvironment()`
- [x] Tests unitaires couvrant : URL `*.dev.azure.com`, `*.visualstudio.com`, URL custom Server, edge cases (URL malformée, network down)
- [x] Mock du SDK ADO via msw

**Done quand :**
- [x] `detectEnvironment()` retourne le bon type sur les 3 cas (cloud, server, error)
- [x] Couverture ≥ 95%

### T-0.6 — Pipeline de publication Marketplace (preview privée) 🟡

📚 `plan.md` §10.2

- [x] Workflow `release-publish.yml` configuré (steps : build → SBOM → package VSIX → publish)
- [x] PAT Marketplace stocké en GitHub Secret
- [x] Publication réussie d'une v0.0.1-preview en mode privé (visibilité limitée à votre org)

**Done quand :**
- [x] La v0.0.1-preview est listée sur le Marketplace en privé
- [x] L'install depuis le Marketplace dans votre org de test fonctionne

### T-0.7 — Créer `CLAUDE.md` racine 🟢

📚 contrat avec Claude Code (cf. demande utilisateur)

- [x] Rédiger `CLAUDE.md` à la racine, listant : règles non-négociables (extraites de la constitution), structure du monorepo, commandes clés, do/don't, liens vers les 4 fichiers spec-kit
- [x] Format concis (~150-300 lignes max)

**Done quand :**
- [x] `CLAUDE.md` est mergé sur `main`
- [x] Une nouvelle session Claude Code ouverte sur le repo le lit automatiquement

---

### T-0.8 — Manifest ADO-conforme : hub group, scopes, widget coverage-panel 🟡

📚 `plan.md` §2.1 — alignement du manifest `vss-extension.json` avec l'architecture cible

- [x] `scopes` → `["vso.work_full", "vso.profile", "vso.code", "vso.extension.data_write", "vso.identity"]`
- [x] `targets` → `[{ "id": "Microsoft.VisualStudio.Services.Cloud" }]` (Cloud-only, v0.2.0)
- [x] Hub contribution target → `ms.vss-work-web.work-hub-group` (Boards tab, pas Project hub group)
- [x] Coverage panel `uri` → `dist/widgets/coverage-panel/index.html`
- [x] `files` → `{ "path": "dist", "addressable": true }` (packager dist complète, y compris widgets/)
- [x] Créer point d'entrée `src/widgets/coverage-panel/index.tsx` + `index.html` (TDD)
- [x] Adapter `scripts/build.mjs` pour produire `dist/widgets/coverage-panel/` bundle
- [x] Bump version `0.1.1`
- [x] CHANGELOG.md + `docs/operator-guide.md` (section hub groups ADO)
- [x] CI publish green

**Done quand :**

- [x] L'onglet Argos apparaît dans Boards (ms.vss-work-web.work-hub-group)
- [x] Le panneau Test Coverage s'affiche sur le formulaire Work Item
- [x] unzip -l argos.vsix liste dist/hub/hub.html et dist/widgets/coverage-panel/index.html
- [x] CI publish-marketplace.yml verte

---

## Phase 0.5 — Dette d'intégration (Sprint 2.5 ?)

Conséquence de l'audit 2026-05-09 : les composants UI riches existent (40+ fichiers
React + .test.tsx) mais ne sont pas wirés dans (App.tsx). La Phase 0.5 corrige
ça avant de poursuivre les développements neufs de Phase 1.

- [x] T-0.5.1 — Inventaire des composants riches non-wirés (DONE TECH-DEBT-015A)
- [x] T-0.5.2 — (App.tsx) : remplacer les stubs par les composants riches existants (Plans, Cases, Sets, Preconditions, Reports, AI-Config, Audit log, Settings) -- DONE Sprint 2.5d : 24 composants riches integres (Phase 2-7 wiring complet)
- [x] T-0.5.3 — Tests de wiring (composant rendu réellement vs stub) (DONE Sprint 2.5a : 5 tests WIRING-2026-05-10 + Sprint 2.5b : 3 tests WIRING-2026-05-15, 5 nouvelles assertions)
- [ ] T-0.5.4 — Vérifier accessibility (aria-* sur la sidebar, focus management)
- [ ] T-0.5.5 — Mettre à jour (README.md) avec screenshots du hub réel

---

## Phase 1 — Custom WIT et CRUD référentiel

> **Objectif :** créer le Custom Process Inheritance, installer les Custom WIT, et permettre le CRUD complet de `TestCase`, `TestPlan`, `TestSet`, `Precondition` via l'UI Argos.
> **Done quand :** un User TestVault peut créer, lister, modifier, supprimer ces 4 types de WI dans l'UI Argos sur Cloud.

### T-1.1 — Schéma WIT formalisé en code 🔴

📚 `plan.md` §3.2, §3.3, §3.5

- [x] Créer `packages/testvault-wit-schema/` avec les définitions JSON de chaque Custom WIT
- [x] Inclure les champs (référence, type, contraintes), états et transitions, picklists
- [x] Générer un fichier `schema.json` exhaustif consommable par le wizard d'installation
- [x] Tests : validation que le schéma respecte le format attendu par l'API Process ADO

**Done quand :**

- [x] Tous les 7 Custom WIT sont définis
- [x] Le `schema.json` est exporté
- [x] Tests unitaires couvrent la validité du schéma

### T-1.2 — Adapter ADO (`IAdoClient`) — opérations CRUD WI 🔴

📚 `plan.md` §2.3

- [x] Créer `packages/testvault-sdk/src/ado-client.ts` avec interface `IAdoClient`
- [x] Implémenter `fetchWorkItem(id)`, `createWorkItem(type, fields)`, `updateWorkItem(id, fields)`, `deleteWorkItem(id)`
- [x] Gestion des erreurs ADO standardisée (401, 403, 404, 429, 500) avec mapping vers exceptions typées
- [x] Tests d'intégration via msw : tous les codes d'erreur, payload malformé, timeout

**Done quand :**

- [x] Toutes les opérations CRUD passent les tests msw
- [x] Couverture ≥ 90%

### T-1.3 — Wizard d'installation du Custom Process [PIVOT 2026-05-15]

> ARCHITECTURE PIVOT : Microsoft ne permet pas aux extensions ADO d'appeler Process API.
> Scope vso.process_write n'existe pas. Install Custom WIT deleguee a argos-cli (D66-A).
> Sprint 2.6 (2026-05-15) : argos-cli install command LIVRE.

📚 `spec.md` US-6.1, `plan.md` §3.1

- [x] UI du wizard : auto-install depuis extension -- DONE via argos-cli (Sprint 2.6)
- [x] Implementation appels API Process ADO -- DONE via argos-cli (Sprint 2.6)
- [x] Detection idempotente : schema-reader via wit/workitemtypes API (Sprint 2.5e + 2.5f-fix)
- [x] Wire dans App.tsx : InstallationGuard + GetStartedView + LimitedModeBanner (Sprint 2.5e)
- [x] Detection au boot via detectInstalled() -- scope vso.work, fonctionne (Sprint 2.5f-fix)
- [x] Banner Limited Mode si user skip install (Sprint 2.5e)
- [x] Tests wiring (3 fichiers WIRING-2026-05-15) (Sprint 2.5e + 2.5f-fix)
- [x] GetStartedView 3 steps : Welcome / Detection / InstallGuide vers argos-cli (Sprint 2.5f-fix)
- [ ] Tests E2E sur instance Cloud reelle (TECH-DEBT-019 -- jamais fait)

**Done quand :**

- [x] L'installation depuis zero fonctionne via argos-cli (Sprint 2.6)
- [x] La detection detecte le schema existant via wit/workitemtypes API
- [x] L'utilisateur sans schema installe voit guide vers argos-cli
- [ ] E2E reel valide sur instance ADO test (TECH-DEBT-019)

**TECH-DEBT (Sprint 2.6) :**

- [x] TECH-DEBT-042 LIVRE : argos-cli install command (Sprint 2.6)
- [x] TECH-DEBT-043 LIVRE partial : npm publish setup (publish reel via tag v0.5.6 apres merge)
- [ ] TECH-DEBT-044 NEW : Strategy publish workspace deps internes long terme (tsup bundle interim)
- [ ] TECH-DEBT-019 : E2E reel sur instance ADO Cloud (reste critique)

**TECH-DEBT (Sprint 2.7 HOTFIX) :**

- [x] TECH-DEBT-046 LIVRE : WIT displayName ADO charset compliance -- VS402800 hotfix
  - 7 WIT + 5 champs renommes (parentheses -> espaces)
  - Suite de tests ADO_FORBIDDEN_CHARS ajoutee dans argos-wit-schema index.test.ts
  - CFG regression test CFG-2026-05-15-wit-ado-charset.test.ts
  - Re-executer E2E BCEE-QA/DEMO apres merge v0.5.9 (TECH-DEBT-019)
- [x] TECH-DEBT-047 LIVRE : argos-cli install idempotency picklists + WIT (Sprint 2.8)
  - Step 2: GET /lists avant creation, Map<name,id>, skip si existe
  - Step 3: GET /workItemTypes avant creation, Set(refName), skip WIT entier si existe
  - 7 tests unitaires idempotency + CFG-2026-05-18 regression test
- [ ] TECH-DEBT-049 NEW : Schema sync fields if WIT exists (deferred from Sprint 2.8)
  - D86-A: WIT entier skippe si existe (pas de sync champ par champ ce sprint)
  - Prerequis: TECH-DEBT-047 livre
- [x] TECH-DEBT-050 LIVRE : ADO icon validation tests (Sprint 2.9)
  - 7 WIT iconIds renommes icon-xxx -> icon_xxx (mapping semantique D87-A)
  - 14 tests unitaires (whitelist 41 icons Microsoft + format regex)
  - CFG-2026-05-18-wit-icons-ado-valid.test.ts regression test
- [x] TECH-DEBT-051 LIVRE : ADO WIT refName resolution (Sprint 2.10 v0.5.12)
  - wit-refname-matcher.ts : isArgosWit + findSchemaWitByAdoRefName (10 tests)
  - process-install.ts : POST body sans referenceName, capture adoRefName response
  - detectInstallState + idempotency Step 3 uses isArgosWit pattern
  - argos-detection-api : listWorkItemTypes + isArgosInstalled corriges
  - CFG-2026-05-18-process-install-idempotency.test.ts regression test
- [x] TECH-DEBT-052 LIVRE : ADO custom field "Custom." prefix translation (Sprint 2.11 v0.5.13)
  - wit-refname-matcher.ts : schemaToAdoFieldRefName + isArgosField + findSchemaFieldByAdoRefName (24 tests)
  - process-install.ts : Step 3 fields POST uses adoFieldRefName (Custom.TestVaultX)
  - CFG-2026-05-18-field-refname-translation.test.ts regression test
- [x] TECH-DEBT-053 LIVRE : field-level idempotency at org level (Sprint 2.12 v0.5.14)
  - orgFieldExists: GET /_apis/wit/fields/{refName} -> 200/404 existence check (replaced by preflight Sprint 2.13)
  - createFieldAtOrg: POST /_apis/wit/fields with full body (name, type, isPicklist, usage...)
  - ADO_FIELD_TYPE_REST mapping + 409 conflict = idempotent success
  - CFG-2026-05-18-field-2-step-workflow.test.ts regression test
- [x] TECH-DEBT-055 LIVRE : robust field naming + pre-flight + smart idempotency (Sprint 2.13 v0.5.15)
  - schemaToAdoFieldName: "Priority" -> "TestVault Priority" (unique org-level names)
  - validateAdoFieldName: 128 char limit + forbidden chars check
  - preflightOrgFields: GET all org fields, classify create/reuse/conflict before any POST
  - getAllUniqueSchemaFields: deduplicates schema fields across WITs
  - [CREATE]/[REUSE]/[ATTACH]/[VALIDATE] structured logging
  - VS402803 explicit handling in createFieldAtOrg
  - CFG-2026-05-18-field-robustness.test.ts regression test (7 assertions)
- [x] TECH-DEBT-056 (Sprint 2.14 LIVRE) : state name custom translation + smart idempotency (v0.5.16)
  - schemaToAdoStateName: "Active" -> "TestVault Active" (idempotent on already-prefixed)
  - validateAdoStateName: 128 char limit + forbidden chars check
  - getExistingStates: GET /states per WIT after POST /workItemTypes to detect defaults
  - existingStateNames Set: skip if translated name already exists
  - [STATE-CREATE]/[STATE-SKIP] structured logging + [VALIDATE] pre-flight per WIT
  - VS403083 explicit handling for name conflict
  - CFG-2026-05-18-state-name-custom.test.ts regression test (4 assertions)
  - Bug cascade 2026-05-18 complete (Sprint 2.7-2.14, 7 ADO bugs fixed)
- [x] TECH-DEBT-054 LIVRE (Sprint 2.15) : extension detection uses suffix-matching refNames
  - Naming helpers moved to argos-wit-schema (source of truth)
  - argos-detection-api + argos-extension use isArgosWit() suffix match
  - Fixed ARGOS_WIT_NAMES: TestPlanEntry -> TestCaseVersion
  - 0.5.17
- [x] TECH-DEBT-057 LIVRE (Sprint 2.16, v0.5.18) : CRUD ops WitResolver for ALL 7 WIT
  - createArgosAdoClientAdapter: resolves TestVault.X -> ADO refName transparently
  - createWitResolver: resolves schema refNames to process-prefixed ADO refNames
  - schemaToAdoFieldRefName: translates field patches /fields/TestVault.X -> /fields/Custom.TestVaultX
  - All 7 WIT service wrappers (createTestCase..createAuditLog) use the adapter
- [x] TECH-DEBT-057 NEW LIVRE (Sprint 2.17, v0.5.19) : UI refresh + toast notifications post-create
  - Toast.tsx: ToastProvider + useArgosToast (success/error/info, 4s auto-dismiss)
  - use-argos-create.ts: generic hook for all 7 WIT with isCreating + toast + onSuccess
  - use-argos-list.ts: generic list hook with refetch()
  - TestPlanForm/TestCaseForm/TestSetForm/PreconditionForm: toast.success + toast.error + form reset
  - App.tsx wrapped with ToastProvider
  - CFG-2026-05-19-ui-refresh-after-create.test.ts (11 assertions)
- [x] TECH-DEBT-019 VALIDE : E2E reel ADO instance -- 10 bugs E2E fixes en 11 sprints (Sprint 2.17)
  - MILESTONE PRODUIT FONCTIONNEL TOTAL ATTEINT (2026-05-20)
- [x] TECH-DEBT-058 LIVRE (Sprint 2.18, v0.5.20) : Design system component library
  - Button, Badge, FilterChip, Input (inputSize prop), Select, Table, EmptyState, SectionCollapsible
  - 20 unit tests (Button x9, Badge x5, FilterChip x6)
  - design-system/index.ts re-exports all components
- [x] TECH-DEBT-059 LIVRE (Sprint 2.18, v0.5.20) : Test Plan list + form UI
  - TestPlansListView: search, FilterChip status, count, empty state, columns (id/name/state/cases/owner/iter/created)
  - TestPlanFormView: name (req), owner, tags (chip input), description, iteration select, coming-soon placeholders
  - Bug A fix: iterationPath omitted from draft when None selected (avoids TF401347)
  - use-argos-routing.ts: ArgosView discriminated union (7 kinds), goToTestPlansList/Form/Tab/navigate + sidebarKeyForView
  - App.tsx: initialView: ArgosView replaces section: string; RouteRenderer centralises view dispatch
  - 11+19 integration tests + CFG-2026-05-20-design-system-test-plan-ui.test.ts (38 assertions)
  - 454 tests green (61 test files)
- [ ] TECH-DEBT-060 NEW : Preview infrastructure (build-preview.mjs, preview.tsx mock SDK)
  - Standalone Chrome preview with mock services, no ADO SDK dependency
  - esbuild watch mode (build-preview.mjs --watch)
  - Sprint 2.19: replace with real Vite dev server on real ADO
- [ ] TECH-DEBT-061 NEW : Replace mock iteration/area paths with real ADO API calls
  - GET {org}/{project}/_apis/wit/classificationNodes/areas
  - GET {org}/{project}/_apis/wit/classificationNodes/iterations
  - Remove _mock-data.ts, populate Select from real ADO data

- [x] TECH-DEBT-067 LIVRE (Sprint 2.18.3, v0.5.23) : Single hub architecture
  - REMOVED argos-hub-group + 5 sub-hubs (cases/sets/preconditions/reports/settings)
  - RENAMED argos-hub-plans -> argos-hub, targets project-hub-groups-collection directly
  - App.tsx: CONTRIBUTION_ID_TO_SECTION supprime, Section type supprime, getInitialView()
  - T-1.0/T-0.9/CFG-top-level-hub tests mis a jour; CFG-single-hub.test.ts (9 assertions)
  - Breaking URLs accepted (MVP): /apps/hub/...argos-hub-X -> 404 jusqu'a TECH-DEBT-068
  - 449 argos-extension + 150 regression tests green
- [ ] TECH-DEBT-068 NEW : URL redirect anciens argos-hub-X vers argos-hub (Sprint 2.19)
- [x] TECH-DEBT-069 LIVRE (Sprint 2.19, v0.5.25) : UI Generalization -- 6 WIT list+form views
  - Generic components: WitListHeader, WitFilterBar, WitStatusBadge (hub/components/)
  - Shared CSS: wit-list-view.css, wit-form-view.css (hub/views/)
  - TestCasesListView + TestCaseFormView (5 sections, TestCaseDraft)
  - TestSetsListView + TestSetFormView (3 sections, TestSetDraft)
  - PreconditionsListView + PreconditionFormView (3 sections, PreconditionDraft)
  - TestExecutionsListView + TestExecutionFormView (3 sections, ExecutionDraft)
  - TestCaseVersionsListView (read-only, per-ID filter, listSnapshots)
  - AuditLogListView (read-only, Export CSV action)
  - use-argos-routing.ts: 15 routes (was 7)
  - App.tsx RouteRenderer: all 15 routes wired (was 7 + 3 ComingSoon stubs)
  - Sidebar.tsx: 10 items with Dashboard "Soon" badge
  - 8 regression tests in tools/regression/; 42+ component tests in views/
  - Version bump: 0.5.24 -> 0.5.25

- [ ] TECH-DEBT-070 NEW (Sprint 2.19.1, v0.5.26) : test-case-version-service latent WIQL bug
  - listSnapshots() uses [TestVault.ParentTestCaseId] in WIQL -- same root cause as TF51005
  - Not triggered by default UI state (user must enter a TC ID to search)
  - Fix: apply schemaToAdoFieldRefName() same as test-execution-service hotfix
  - Regression: T-2.19.1-services-wiql-audit.test.ts tracks the marker until fixed

- [ ] TECH-DEBT-071 NEW (Sprint 2.19.1, v0.5.26) : E2E tests against real ADO instance
  - Absence of real ADO E2E allowed TF51005 to reach production (BCEE-QA, Sprint 2.19)
  - Scope: tools/e2e/ Playwright suites against a real ADO project (service account PAT)
  - Must cover: all 6 WIT list views, all WIQL-based service calls
  - Gate: run before any Marketplace publish

**Sprint 2.20 livre (v0.5.27, 2026-05-22) :**

- [x] TECH-DEBT-061 CLOSED -- Real area paths + iterations from ADO (AdoClassificationService,
  AdoIterationsService, useAdoAreaPaths, useAdoIterations, AreaPathPicker, IterationPicker)
- [x] TestPlanFormView edit mode (planId prop, pre-fill, save vs create, click-to-edit in list)
- [ ] TECH-DEBT-068 URL redirect anciens hub-X -- still pending
- [ ] TECH-DEBT-070 test-case-version-service WIQL fix -- still pending (Sprint 2.21+)
- [ ] TECH-DEBT-071 E2E tests real ADO before publish -- still pending

**Sprint 2.21 Part 1 livre (v0.5.28, 2026-05-22) :**

- [x] USP "AI-First" -- AI-assisted test case generation from User Story (F04 DONE)
- [x] Multi-provider LLM architecture (ILlmProvider, AzureOpenAIProvider, LlmProviderFactory)
- [x] LlmConfigService -- encrypted storage via ADO Extension Data Service (no localStorage)
- [x] AiGenerationService -- direct browser-to-LLM calls (TECH-DEBT-017 deferred, documented)
- [x] AdoWorkItemsService -- WIQL query User Story/Bug/Requirement + batch field fetch
- [x] AiGenerateModal -- 2-step modal (select source -> review suggestions -> create+link)
- [x] WorkItemPicker + AiSuggestionCard + LlmConfigStatus components
- [x] SettingsView -- "AI Configuration" section (endpoint, deployment, key, Test/Save/Clear)
- [x] TestCaseFormView -- "AI Generate" button opens modal
- [x] App.tsx case "settings" now renders real SettingsView (was ComingSoonView)
- [x] 4 regression tests T-2.21-* (provider pattern, azure adapter, flow, encryption)

**Sprint 2.21.1 livre (v0.5.28.1, 2026-05-22) :**

- [x] Azure AI Foundry v1 endpoint support (AzureAIFoundryProvider)
- [x] normalizeFoundryEndpoint() -- handles trailing slash, missing /openai/v1, project-scoped paths
- [x] LlmProviderFactory.listAvailableProviders() -- metadata-driven UI (labels, hints per provider)
- [x] LlmProviderType extended with "azure-ai-foundry"
- [x] LlmConfigService backward-compat: configs without provider field default to "azure-openai"
- [x] SettingsView: provider dropdown 2 options, contextual labels/hints adapt on provider switch
- [x] LlmConfigStatus: shows provider display name (not raw id)
- [x] 4 regression tests T-2.21.1-* (foundry-provider, endpoint-format, factory, no-regression)
- [x] allowlist.ts + .cjs updated for gpt-4.1 deprecation guard

**Prochaines priorites :**

- Sprint 2.21 Part 2 : Gherkin editor native (USP)
- TECH-DEBT-017 Azure Functions deploy
- TECH-DEBT-018 Commercial layer
- TECH-DEBT-068 URL redirect anciens hub-X
- TECH-DEBT-070 test-case-version-service WIQL fix
- TECH-DEBT-071 E2E tests real ADO before publish
- Specs/ARCHITECTURE.md (documenter principes architecturaux emerges)
- Documentation public README + marketplace listing

### T-1.4 — CRUD Test Case (UI + service) 🟡

📚 `spec.md` US-1.1, `plan.md` §3.3

- [x] Service `TestCaseService` avec : `create`, `read`, `update`, `delete`, `list`
- [x] UI : formulaire de création/édition (Fluent UI 2)
- [x] Editeur de Steps avec drag & drop, markdown
- [x] Validation côté UI : Title obligatoire, Steps array, etc.
- [x] Tests unitaires (service) et tests E2E (UI complète)

**Done quand :**

- [x] Création d'un TC complet sauvegarde correctement dans ADO
- [x] Édition d'un TC existant fonctionne, History ADO préservé
- [x] Suppression demande confirmation
- [x] Couverture service ≥ 90%

### T-1.5 — CRUD Test Set 🟡

📚 `spec.md` US-1.2

- [x] Service `TestSetService` (composition statique + composition dynamique via WIQL sauvegardée)
- [x] UI : ajout par sélection multiple, drag-and-drop, query WIQL
- [x] Lien `contains` Test Set ↔ Test Case (n-n)
- [x] Tests

**Done quand :**

- [x] Composition statique fonctionne
- [x] Composition dynamique via WIQL fonctionne
- [x] La suppression d'un Set ne supprime pas les TC contenus

### T-1.6 — CRUD Test Plan 🟡

📚 `spec.md` US-1.3

- [x] Service `TestPlanService`
- [x] UI : formulaire avec Test Sets + TC supplémentaires + Environments
- [x] État `Draft` initial, transition vers `Locked` (cf. T-3.x pour le snapshot auto au lock)
- [x] Tests

**Done quand :**

- [x] Création de plan avec mix Test Sets + TC fonctionne
- [x] L'état `Locked` est implémenté (snapshot auto déférré à la phase 3)

### T-1.7 — CRUD Precondition 🟢

📚 `spec.md` US-1.5

- [x] Service + UI similaires aux précédents
- [x] Lien `precondition-of` bidirectionnel
- [x] Tests

**Done quand :**

- [x] Une Precondition peut être liée à N TC
- [x] La consultation d'un TC affiche ses Preconditions liées

### T-1.8 — Hub Argos avec navigation 🟡

📚 `spec.md` §7.1

- [x] Layout du Hub avec navigation latérale (Plans, Cases, Sets, Preconditions, Reports, Settings)
- [x] Vue par défaut : liste des Test Plans actifs + Failed récents
- [x] Recherche globale (basique en phase 1, enrichie en phase 4)

**Done quand :**

- [x] Le wireframe `spec.md` §7.1 est implémenté à l'identique fonctionnel (architecture multi-hubs Sprint 4)
- [x] Navigation entre les vues fluide (< 500ms)

### T-1.9 — Tests E2E phase 1 sur Cloud + Server 🔴

📚 `plan.md` §9.4

- [x] Mettre en place les 2 instances ADO de test : Cloud DONE (`argos-test.dev.azure.com`), Server OBSOLETE depuis v0.2.0
- [x] Suite E2E couvrant : install Custom Process, CRUD complet TC/Plan/Set/Precondition (11 specs files)
- [x] Intégration au workflow `ci-main.yml`

**Done quand :**

- [x] La suite E2E passe verte sur Cloud (Server OBSOLETE -- Cloud-only depuis v0.2.0)
- [x] Le temps total d'exécution < 15 min

> **Note 2026-05-14 (TECH-DEBT-026)** : La mention "Server" est OBSOLETE depuis Sprint 0.2.0
> (décision Cloud-only). T-1.9 est considéré DONE pour Cloud uniquement. Voir TECH-DEBT-031.

---

## Phase 2 — Exécution des tests & evidence

> **Objectif :** un User TestVault peut exécuter manuellement un Test Case, capturer le statut step-by-step, attacher de l'evidence, et créer un Bug ADO depuis un Fail.
> **Done quand :** une `TestExecution` complète est sauvegardée dans ADO et reste immutable, avec liens vers le Test Plan, le TestCase, et un Bug optionnel.

### T-2.1 — Service `TestExecutionService` 🔴

📚 `spec.md` US-2.1, `plan.md` §3.5

- [x] Méthodes : `startRun`, `saveStepResult`, `attachEvidence`, `finalizeRun`, `linkBug`
- [x] Garantie d'immutabilité après save final (refus de tout PATCH ultérieur)
- [x] Calcul automatique du `globalStatus` depuis les `stepResults`
- [x] Tests unitaires + intégration

**Done quand :**
- [x] Une `TestExecution` save passe l'API ADO, est lue immutable
- [x] Une tentative de modification post-save renvoie 403 documentée
- [x] Couverture ≥ 90%

### T-2.2 — UI d'exécution (run interface) 🔴

📚 `spec.md` US-2.1, §7.3

- [x] Implémentation du wireframe §7.3 : panneau Precondition, liste des Steps, panneau Evidence
- [x] Sélecteur d'Environment obligatoire en début de run
- [x] Validation : commentaire obligatoire si Step en Fail
- [x] Calcul global status en temps réel
- [x] Bouton "Save Run" (final) + "Cancel"
- [x] Wired in App.tsx (PlansView tab "Run") — Sprint 2.5b

**Done quand :**
- [ ] L'utilisateur peut exécuter un TC complet de bout en bout
- [x] Le statut global est calculé correctement
- [x] Tests E2E couvrant les 3 issues : full Pass, partial Fail, Blocked

### T-2.3 — Upload d'evidence (multi-formats) 🟡

📚 `spec.md` US-2.2

- [x] Service d'upload utilisant l'API Attachments ADO native
- [x] Validation des types (PNG, JPG, GIF, PDF, TXT, LOG, MP4, WEBM) et des limites (10/25/5/100 MB)
- [x] UI drag & drop + bouton fichier
- [x] Preview pour images, lecteur intégré vidéos, lien pour autres
- [x] Lien evidence ↔ step ou execution global
- [x] Wired in App.tsx (integrate dans RunInterface) — Sprint 2.5b

**Done quand :**
- [x] Upload des 4 formats principaux fonctionne
- [x] Les limites de taille sont appliquées avec messages clairs
- [x] L'evidence est visible en lecture après save

### T-2.4 — Configuration des Environments par projet 🟡

📚 `spec.md` US-2.3

- [x] UI Settings > Environments (Admin only) avec CRUD de la liste
- [x] Stockage dans ExtensionDataService scope projet
- [x] Validation côté run : environment doit appartenir à la liste configurée
- [x] Tests
- [x] Wired in App.tsx (SettingsView section) — Sprint 2.5b

**Done quand :**
- [x] Un Admin peut gérer la liste
- [x] Un User n'a pas accès à cette config
- [x] La liste est utilisée comme dropdown dans le run

### T-2.5 — Création de Bug depuis Fail 🟢

📚 `spec.md` US-2.1 (étape 11)

- [x] Bouton "Create Bug from Failure" sur l'écran de run avec status Fail
- [x] Pré-remplissage : Title, Description (avec lien vers run), Repro Steps (depuis steps Fail), Severity, Environment
- [x] Création via API ADO standard, lien `Found By` Test Execution → Bug
- [x] Wired in App.tsx (integrate dans RunInterface via Dialog) — Sprint 2.5b

**Done quand :**
- [x] Un Bug est créé avec les bonnes infos pré-remplies
- [x] Le lien Test Execution ↔ Bug est visible dans les 2 sens

### T-2.6 — Vue historique des exécutions par TC 🟡

📚 `spec.md` US-2.3

- [x] Sur la page d'un TC, onglet "Executions" avec liste paginée
- [x] Filtres : par environment, par statut, par période
- [x] Vue côte à côte des statuts par environment
- [x] Wired in App.tsx (CasesView tab "Executions") — Sprint 2.5b

**Done quand :**
- [x] L'historique d'un TC avec >100 exécutions reste fluide
- [x] Filtres fonctionnent

### T-2.7 — Tests E2E phase 2 🔴

- [ ] E2E : run complet sur Cloud, run complet sur Server
- [ ] E2E : upload evidence multi-formats
- [ ] E2E : création de Bug depuis Fail

**Done quand :**
- [ ] Suite E2E phase 2 passe verte sur les 2 environnements

---

## Phase 3 — Traçabilité, versioning, snapshots

> **Objectif :** la traçabilité bidirectionnelle Work Items ↔ TestCase fonctionne, les snapshots taggés sont opérationnels, la matrice de couverture est exportable.
> **Done quand :** Aïcha (Test Manager) peut ouvrir une matrice de couverture, créer un snapshot manuel d'un TC, lock un Test Plan avec snapshot auto.

### T-3.1 — Lien bidirectionnel Work Items ADO ↔ Test Case 🔴

📚 `spec.md` US-3.1

- [x] Définition des link types custom : `TestVault.TestedBy`, `TestVault.Validates`, `TestVault.Covers`
- [x] UI sur le formulaire TC : ajout/suppression de liens
- [x] Widget "Test Coverage" sur le formulaire User Story / Bug / Requirement (cf. manifest contribution `argos-coverage-panel`)
- [x] Détection des liens orphelins (WI source supprimé)
- [x] Wired in App.tsx: CasesView "Traceability" tab → WorkItemLinkPanel (Sprint 2.5c)

**Done quand :**
- [x] Un lien créé est visible dans les 2 sens
- [x] Le widget coverage panel s'affiche sur User Story et liste les TC liés avec leur dernier statut

### T-3.2 — Snapshots taggés (Custom WIT TestCaseVersion) 🔴

📚 `spec.md` US-3.3, `plan.md` §3.2

- [x] Service `TestCaseVersionService` avec `createSnapshot`, `listSnapshots`, `compareWithCurrent`
- [x] UI : bouton "Create Snapshot" sur le TC, formulaire (nom, commentaire)
- [x] Garantie d'immutabilité (champs frozen via règles de transition Process)
- [x] Validation : nom unique par TC parent
- [x] Tests : tentative de modification post-creation → 403
- [x] Wired in App.tsx: PlansView "Snapshots" tab → SnapshotPanel (Sprint 2.5c)

**Done quand :**
- [x] Un snapshot est créé, visible, immutable
- [x] La liste des snapshots d'un TC est affichée

### T-3.3 — Comparateur de versions (diff) 🟡

📚 `spec.md` US-3.3

- [x] Algo de diff sur Steps (LCS) côté client
- [x] UI : vue côte à côte avec mise en évidence des champs modifiés
- [x] Diff sur title, description, steps, tags
- [x] Wired in App.tsx: PlansView "Snapshots" tab → snapshot-diff-panel container always present; SnapshotDiffPanel shown when 2 snapshots selected (Sprint 2.5c)

**Done quand :**
- [x] Le diff entre 2 versions d'un même TC est visuellement clair
- [x] Tests unitaires sur l'algo LCS

### T-3.4 — Snapshot auto au lock du Test Plan 🟡

📚 `spec.md` US-3.4

- [x] Au passage Test Plan → `Locked`, snapshot auto-créé pour chaque TC du plan
- [x] Test Plan locked référence les `TestCaseVersionId` (pas le TC parent)
- [x] Opt-out configurable par Admin
- [x] Tests

**Done quand :**
- [x] Lock d'un Test Plan crée les snapshots automatiquement
- [x] L'exécution d'un TC dans un plan locked utilise le snapshot

### T-3.5 — Matrice de couverture exigences 🔴

📚 `spec.md` US-3.2, F3, §7.5

- [x] Vue dédiée avec tableau croisé Work Items × TC
- [x] Cellule = dernier statut d'exécution par environment
- [x] Filtres : Area, Iteration, Tags, Status, Environment
- [x] Couleurs conditionnelles
- [x] Virtual scrolling au-delà de 1000 cellules
- [x] Wired in App.tsx: ReportsView "Coverage" tab → CoverageMatrix (Sprint 2.5c)

**Done quand :**
- [x] La matrice se charge en < 3s pour 1000 cellules
- [x] Filtres mis à jour instantanément
- [x] Tests E2E

### T-3.6 — Export Excel / PDF de la matrice 🟡

📚 `spec.md` US-3.2, US-4.4

- [x] Export Excel via SheetJS avec mise en forme conditionnelle
- [x] Export PDF (via puppeteer côté Cloud-Plus pour grosse matrice, ou jsPDF côté client pour petite)
- [x] Tests sur fichiers générés (ouverture, contenu, tailles)

**Done quand :**
- [x] Excel et PDF sont produits sans erreur
- [x] Mise en forme conditionnelle visible

### T-3.7 — Tests E2E phase 3

**Done quand :**
- [x] Création snapshot, lock plan, vue matrice, export Excel verts sur Cloud (Server OBSOLETE -- Cloud-only depuis v0.2.0)

---

## Phase 4 — Import / Export / API publique

> **Objectif :** import/export fonctionnels, SDK et CLI publiés sur npm, API REST documentée, intégration GitHub Actions et Azure Pipelines first-class.
> **Done quand :** Mathieu peut faire `testvault-cli upload-results --file junit.xml` depuis sa CI et voir les résultats dans Argos sous 30s.

### T-4.1 — Importers (parsers) 🔴

📚 `spec.md` US-4.1, US-4.2

- [x] `packages/testvault-importers/` avec parsers : CSV, Excel (xlsx), JUnit XML, NUnit XML, xUnit XML, TestNG XML, Cucumber JSON
- [x] Schema de mapping configurable (colonnes/champs ↔ champs TestCase)
- [x] Validation des données entrantes avec rapport d'erreurs ligne par ligne
- [x] Tests unitaires sur fixtures réelles (au moins 3 fichiers par format)

**Done quand :**
- [x] Les 7 formats parsent correctement les fixtures
- [x] Le rapport d'erreurs est exploitable
- [x] Couverture ≥ 90%

### T-4.2 — UI d'import wizard 🟡

📚 `spec.md` US-4.1

- [x] Drag & drop de fichier
- [x] Auto-détection du format
- [x] Mapping interactif des colonnes
- [x] Preview avant import
- [x] Progress bar avec batches de 200
- [x] Rapport d'erreurs téléchargeable
- [x] Wired in App.tsx: PlansView "Import" button → ImportWizard dialog (Sprint 2.5c)

**Done quand :**
- [x] Import de 1000 TC depuis CSV en moins de 2 min
- [x] Tests E2E

### T-4.3 — Exporters (Excel + PDF) 🟡

📚 `spec.md` US-4.4

- [x] `packages/testvault-exporters/` avec générateurs Excel (SheetJS) et PDF
- [x] Templates par cas d'usage : référentiel TC, Test Plan release-readiness, Traceability matrix
- [x] Logo client custom configurable

**Done quand :**
- [x] Les 3 templates produisent des fichiers exploitables
- [x] Logo custom utilisé si configuré

### T-4.4 — SDK npm `@atconseil/testvault-sdk` 🔴

📚 `plan.md` §1.1, §1.3, `constitution.md` §3.4

- [x] API publique du SDK : opérations CRUD haut niveau, helpers WIQL, snapshots, paginator
- [x] Documentation TypeDoc auto-générée
- [x] Publication npm public (Apache 2.0)
- [x] Versionning indépendant via Changesets

**Done quand :**
- [x] `npm install @atconseil/testvault-sdk` fonctionne
- [x] Les exemples du README marchent
- [x] Couverture ≥ 90%

### T-4.5 — CLI `testvault-cli` 🟡

📚 `spec.md` US-4.2

- [x] Commandes : `auth login`, `tc list`, `tc create`, `tc upload-results`, `plan show`, `plan export`
- [x] Format JUnit/Cucumber : matching par `automationKey`, option `--auto-create`, option `--strict`
- [x] Auth via PAT ADO (pas de stockage côté CLI)
- [x] Publication npm public

**Done quand :**
- [x] `testvault-cli upload-results --file junit.xml` ingère les résultats
- [x] La doc CLI est à jour

### T-4.6 — Intégration GitHub Actions (action dédiée) 🟡

📚 `spec.md` US-4.2

- [ ] Action GitHub publiée `atconseil/argos-action@v1`
- [x] Inputs : `pat`, `org-url`, `project`, `plan-id`, `results-file`, `environment`
- [x] Exemples documentés dans `docs/integrations/github-actions.md`

**Done quand :**
- [ ] L'action est utilisable depuis n'importe quelle pipeline GH Actions
- [ ] Un workflow d'exemple complet fonctionne end-to-end

### T-4.7 — Intégration Azure Pipelines (task dédiée) 🟡

📚 `spec.md` US-4.2

- [ ] Task Azure Pipelines `Argos.UploadResults@1` publiée sur Marketplace (extension de tâches)
- [x] Mêmes inputs que la GH Action

**Done quand :**
- [ ] La task est listée sur le Marketplace ADO Tasks
- [ ] Un pipeline d'exemple fonctionne

### T-4.8 — Ingestion via webhook (Cloud-Plus) 🟢

📚 `spec.md` US-4.3, `plan.md` §7.4, §7.5

- [x] Endpoint `POST /v1/webhooks/{token}` dans Azure Functions
- [x] Validation HMAC SHA-256
- [x] Worker queue trigger pour traitement asynchrone
- [x] UI Admin : génération de tokens, listing, suppression
- [x] Tests d'intégration
- [x] Wired in App.tsx: SettingsView → WebhookAdmin (stub, TECH-DEBT-017 pending Azure Functions deploy) (Sprint 2.5c)

**Done quand :**
- [ ] Un push depuis Jenkins via webhook crée des Test Executions sous 30s
- [ ] La signature invalide est rejetée et auditée

### T-4.9 — Tests E2E phase 4

**Done quand :**
- [x] E2E : import CSV, export Excel, upload via CLI, run via GH Actions
- [x] Tous les formats parsent correctement sur les 2 environnements (Server OBSOLETE -- Cloud-only depuis v0.2.0)

---

## Phase 5 — BDD Gherkin & sync repo

> **Objectif :** un Test Case avec champ Gherkin peut être synchronisé bidirectionnellement avec un `.feature` file dans Azure Repos.
> **Done quand :** un commit modifiant un `.feature` file met à jour le TC correspondant dans Argos sous quelques minutes.

### T-5.1 — Champ Gherkin dans le Test Case + UI éditeur 🔴

📚 `plan.md` §3.3

- [x] Champ `TestVault.Gherkin` ajouté au schéma
- [x] Custom Control pour édition Gherkin avec coloration syntaxique (Monaco editor)
- [x] Validation syntaxe Gherkin
- [x] GherkinEditor wire dans CasesView (Sprint 2.5d)

**Done quand :**
- [x] Édition Gherkin avec coloration et validation
- [x] Tests

### T-5.2 — Parser Gherkin et conversion bidirectionnelle 🟡

📚 `spec.md` US-4.5

- [x] Parser `.feature` → array de scénarios → array de TestCases (un par scénario)
- [x] Generator TestCase Gherkin → contenu `.feature` valide
- [x] Tests sur fixtures (10+ fichiers)

**Done quand :**
- [x] Round-trip parse → generate → parse stable
- [x] Couverture ≥ 90%

### T-5.3 — Configuration des mappings repo ↔ Area Path 🟡

📚 `spec.md` US-4.5

- [x] UI Admin : ajout d'un mapping `repoUrl + branch + pathGlob → areaPath`
- [x] Stockage dans ExtensionDataService scope projet
- [x] Validation : repo accessible via OAuth scope `vso.code`
- [x] RepoMappingSettings wire dans SettingsView (Sprint 2.5d)

**Done quand :**
- [x] Les mappings sont configurables et persistés

### T-5.4 — Sync automatique sur commit (Cloud-Plus) 🟡

📚 `spec.md` US-4.5

- [x] Subscription au webhook ADO `git.push` pour les repos mappés
- [x] Job Cloud-Plus déclenché : parse les fichiers modifiés, met à jour les TC correspondants
- [x] Gestion suppression de scénario : passage du TC en `Deprecated`

**Done quand :**
- [ ] Un commit modifiant un `.feature` met à jour le TC sous 5 min
- [ ] Le TC est marqué `Deprecated` si scénario supprimé

### T-5.5 — Sync manuelle (Server compatible) 🟢

- [x] Bouton "Sync now" dans l'UI Admin
- [x] Mode CLI : `testvault-cli bdd sync --repo X --branch Y --path Z`
- [x] Disponible sur Server (sans webhook automatique)

**Done quand :**
- [x] Un Admin Server peut déclencher manuellement la sync
- [x] Le CLI fonctionne en air-gap si le PAT est fourni

### T-5.6 — Tests E2E phase 5

**Done quand :**
- [x] Round-trip Gherkin TC ↔ `.feature` fonctionnel sur Cloud (Server OBSOLETE -- Cloud-only depuis v0.2.0) (mode manuel)

---

## Phase 6 — Cloud-Plus AI & administration

> **Objectif :** features AI BYOK opérationnelles, configuration LLM Admin, audit trail complet, quotas.
> **Done quand :** Aïcha peut configurer son Anthropic key, Mathieu peut générer des TC depuis une User Story et voir un rapport flakiness.

### T-6.1 — Architecture Azure Functions (déploiement initial) 🔴

📚 `plan.md` §7

- [ ] Déploiement de `apps/argos-functions` sur Azure Functions Premium en région `francecentral`
- [ ] Config slots staging/production
- [ ] Setup Application Insights (sans payload métier)
- [ ] Setup Azure Key Vault pour MasterKey

**Done quand :**
- [ ] L'endpoint `GET /v1/health` répond 200
- [ ] Les logs sont visibles dans App Insights sans PII

### T-6.2 — Module crypto BYOK 🔴

📚 `plan.md` §8

- [x] Implémentation AES-256-GCM + dérivation HKDF par org
- [x] Stockage chiffré dans ExtensionDataService format `EncryptedApiKey`
- [x] Tests cryptographiques exhaustifs (round-trip, tampering detection, rotation)

**Done quand :**
- [x] Tests vector cryptographiques OK
- [x] Couverture 100% du module crypto (audit-critical)

### T-6.3 — Configuration LLM Provider (UI Admin) 🔴

📚 `spec.md` US-6.2, F5

- [x] UI Settings > AI > Providers (Admin only)
- [x] Ajout / rotation / suppression d'un provider (Anthropic, OpenAI, Azure OpenAI)
- [x] Bouton "Test connection" qui fait un call light au provider
- [x] Affichage masqué des clés (4 derniers caractères)

**Done quand :**
- [x] Les 3 providers sont configurables
- [x] Le test de connexion fonctionne pour chaque
- [x] Toute opération est journalisée dans `TestVault.AuditLog`

### T-6.4 — Audit trail complet 🔴

📚 `spec.md` US-6.4, `constitution.md` §6.3

- [x] Service `AuditLogService.write(operation, oldValue, newValue, metadata)`
- [x] Hooks dans toutes les opérations Admin sensibles (cf. constitution §6.2 liste 1-10)
- [x] UI Settings > Audit Log : liste filtrable + export CSV/JSON
- [x] Configuration de la rétention (paramétrable, plancher 90 jours, défaut 24 mois)
- [x] Job timer-trigger `audit-retention` qui purge selon la rétention
- [x] Tests : aucune valeur sensible (clé API en clair) ne doit jamais être loggée
- [x] AuditLogSettings wire dans SettingsView (Sprint 2.5d)

**Done quand :**
- [ ] Toutes les opérations Admin laissent une trace
- [ ] La rétention paramétrée est appliquée
- [ ] Un audit externe pourrait reconstituer l'historique

### T-6.5 — Endpoint `POST /v1/llm/generate-test-cases` 🟡

📚 `spec.md` US-5.1, F1, `plan.md` §7.3

- [x] Implémentation complète selon `plan.md` §7.3
- [x] PAT signé HMAC short-lived (5 min TTL)
- [x] Validation Zod du payload
- [x] Quota check + decrement avant LLM call
- [x] Decrypt → call → buffer.fill(0)
- [x] Retry idempotent en cas de réponse JSON malformée
- [x] Fallback provider si configuré

**Done quand :**
- [ ] Génération de 5 TC depuis une User Story factice fonctionne
- [ ] Quota dépassé renvoie 402 avec message clair
- [ ] Aucun prompt/réponse en logs

### T-6.6 — UI génération AI de Test Cases 🟡

📚 `spec.md` US-5.1

- [x] Bouton "Suggest Tests" dans le coverage panel
- [x] Modal de preview avec 3-7 candidats éditables
- [x] Acceptation individuelle ou en bloc
- [x] Décrément du quota visible
- [x] AiCandidatesModal + bouton "AI Suggest" wires dans CasesView (Sprint 2.5d)

**Done quand :**
- [ ] Génération + acceptation crée des TC liés à la User Story
- [ ] L'UX reste fluide (streaming dès le 1er token)

### T-6.7 — Quotas AI 🟡

📚 `spec.md` US-6.3

- [x] Service `QuotaService` avec storage Azure Table
- [x] Modes hard/soft, alerte 80%
- [x] UI Admin : Settings > AI > Quotas
- [x] Reset mensuel via timer trigger
- [x] QuotaSettings wire dans SettingsView (Sprint 2.5d)

**Done quand :**
- [ ] Quotas appliqués correctement, mode hard bloque, mode soft warne
- [ ] Reset mensuel automatique

### T-6.8 — Désactivation globale AI 🔴

📚 `spec.md` US-6.5

- [x] Toggle global org-wide
- [x] Propagation < 5s à tous les users actifs
- [x] Annulation propre des opérations en cours
- [x] Tests

**Done quand :**
- [x] Le toggle masque/désactive tous les boutons AI
- [x] Aucune fuite de données pendant l'annulation

### T-6.9 — Détection de flakiness 🟢

📚 `spec.md` US-5.2

- [x] Job timer-trigger hebdomadaire
- [x] Calcul du score sur les N dernières exécutions par TC
- [x] Recommandation AI via LLM BYOK
- [x] UI : rapport "Flakiness" avec mark "Known Flaky"
- [x] FlakinessReport wire dans ReportsView (Sprint 2.5d)

**Done quand :**
- [ ] Le rapport est généré et exploitable

### T-6.10 — Tests E2E phase 6

**Done quand :**
- [x] Configuration provider, génération TC, audit log visible, désactivation globale verts

---

## Phase 7 — Polish, licensing, GA

> **Objectif :** TestVault (Argos) est prêt pour la GA publique sur le Marketplace, avec licensing engine opérationnel, documentation complète, accessibilité validée.
> **Done quand :** la version 1.0.0 est publiée publiquement sur le Marketplace, le portail Stripe est opérationnel, la documentation est exhaustive.

### T-7.1 — Engine de licensing 🔴

📚 `constitution.md` §7

- [x] Génération de clés de licence (signées Ed25519)
- [x] Validation périodique : 24h Cloud (Server OBSOLETE -- Cloud-only depuis v0.2.0)
- [x] Mode dégradé en cas de licence expirée (lecture seule + warning)
- [x] Downgrade Pro → Free non destructif (les données restent, limites de tier appliquées)

**Done quand :**
- [ ] Clés générables, validables, révocables
- [ ] Tests de tous les états (active, expired, invalid, offline grace)

### T-7.2 — Portail Stripe + portail client 🟡

- [ ] Intégration Stripe (subscription mensuel Cloud + one-shot Server)
- [ ] Portail client Kisskool/ATConseil pour gestion abonnement, facturation, génération de clé
- [x] Webhooks Stripe pour activer/désactiver les licences

**Done quand :**
- [ ] Un client peut s'abonner, payer, recevoir sa clé, l'installer

### T-7.3 — Mode hors-ligne lecture seule 🟢

📚 `spec.md` §9

- [x] Détection perte connectivité ADO
- [x] Bascule en lecture seule avec banner UI
- [x] Queue des modifications + retry au retour de connectivité
- [x] OfflineBanner wire dans AppInner via connectivityService (Sprint 2.5d)

**Done quand :**
- [x] Coupure réseau simulée → bascule + queue → reprise

### T-7.4 — Accessibilité WCAG 2.1 AA 🔴

📚 `spec.md` §9

- [ ] Audit avec axe-core sur tous les écrans principaux
- [ ] Navigation clavier complète + raccourcis (`?` pour aide)
- [ ] Contraste, ARIA labels, alt text
- [ ] Tests automatisés axe + tests manuels lecteur d'écran

**Done quand :**
- [ ] Aucune violation WCAG AA sur les écrans critiques
- [ ] Navigation clavier intégrale validée

### T-7.5 — Mobile responsive (lecture seule) 🟢

📚 `spec.md` §9

- [ ] Hub et plans consultables sur mobile/tablette
- [ ] Édition désactivée < 768px

**Done quand :**
- [ ] Tests sur viewports 360px, 768px, 1024px

### T-7.6 — Documentation complète 🔴

📚 `constitution.md` §10.2

- [ ] `README.md` à jour
- [ ] `docs/user-guide.md` exhaustif (tous les flows spec)
- [ ] `docs/api-reference.md` généré depuis OpenAPI à jour
- [ ] `docs/sdk-reference.md` généré depuis types à jour
- [ ] `docs/wit-schema.md` complet (contrat TestPulse)
- [ ] `docs/operator-guide.md` (déploiement, troubleshooting)
- [ ] `CHANGELOG.md` à jour
- [ ] Site `docs-site` (Docusaurus) déployé

**Done quand :**
- [ ] Toutes les pages sont relues
- [ ] Le site est accessible publiquement

### T-7.7 — TestPulse co-installation testée 🔴

📚 `constitution.md` §3.5, `plan.md` §4

- [ ] TestPulse 2.x adapté pour lire le schéma Argos via le contrat documenté
- [ ] Test E2E : install Argos + TestPulse, dashboard TestPulse affiche les données Argos
- [ ] Test : TestPulse seul (sans Argos) continue de fonctionner sur Microsoft Test Plans natifs

**Done quand :**
- [ ] Les 2 modes (avec / sans Argos) fonctionnent

### T-7.8 — Audit de sécurité externe 🔴

📚 `constitution.md` §5

- [ ] Audit pentest externe (cible : extension UI + Azure Functions)
- [ ] Revue du module crypto BYOK
- [ ] Vérification SBOM CycloneDX
- [ ] Remédiation des findings hauts/critiques

**Done quand :**
- [ ] Rapport d'audit avec remédiation complète des findings haut/critique

### T-7.9 — Beta privée puis publique 🟡

- [ ] Beta privée : 5-10 organisations volontaires sur Cloud + 2 instances Server
- [ ] Collecte feedback, correctifs
- [ ] Beta publique : opt-in via flag d'organisation
- [ ] Métriques de conversion suivies
- [x] BetaOptIn UI wire dans SettingsView (Sprint 2.5d)

**Done quand :**
- [ ] 10+ orgs en beta avec feedback positif
- [ ] Aucun bug bloquant non résolu

### T-7.10 — Publication GA v1.0.0 🔴

📚 `constitution.md` §11

- [ ] Checklist constitution §11 entièrement verte
- [ ] Validation manuelle Alexandre Thibaud
- [ ] Publication Marketplace en visibilité publique
- [ ] Annonce blog ATConseil + LinkedIn + canaux ADO communautaires

**Done quand :**
- [ ] La version 1.0.0 est listée publiquement sur le Marketplace
- [ ] Au moins 1 install externe non sponsorisée

---

## Tableau de dépendances clé

```
T-0.1 → T-0.2 → T-0.3 → T-0.4 → T-0.5 → T-0.6 → T-0.7
                                         │
T-1.1 → T-1.2 → T-1.3 ─────────────────► (Phase 1)
                  │
                  └─► T-1.4 → T-1.5, T-1.6, T-1.7 → T-1.8 → T-1.9
                              │
T-2.1 → T-2.2 → T-2.3 → T-2.4 → T-2.5 → T-2.6 → T-2.7 (Phase 2)

T-3.1 → T-3.2 → T-3.3, T-3.4 → T-3.5 → T-3.6 → T-3.7 (Phase 3)

T-4.1 → T-4.2, T-4.3 → T-4.4 → T-4.5 → T-4.6, T-4.7 → T-4.8 → T-4.9 (Phase 4)

T-5.1 → T-5.2 → T-5.3 → T-5.4, T-5.5 → T-5.6 (Phase 5)

T-6.1 → T-6.2 → T-6.3, T-6.4 → T-6.5 → T-6.6, T-6.7, T-6.8 → T-6.9 → T-6.10 (Phase 6)

T-7.1 → T-7.2 → T-7.3, T-7.4, T-7.5 → T-7.6 → T-7.7 → T-7.8 → T-7.9 → T-7.10 (Phase 7)
```

---

## Métriques de progression

| Phase | Tâches totales | Critique 🔴 | Important 🟡 | Optionnel 🟢 |
|---|---:|---:|---:|---:|
| 0 — Scaffolding | 7 | 4 | 2 | 1 |
| 1 — CRUD référentiel | 9 | 4 | 5 | 1 |
| 2 — Exécution & evidence | 7 | 3 | 3 | 1 |
| 3 — Traçabilité & versioning | 7 | 3 | 3 | 0 |
| 4 — Import/Export/CI | 9 | 2 | 5 | 2 |
| 5 — BDD Gherkin | 6 | 1 | 4 | 1 |
| 6 — Cloud-Plus AI & admin | 10 | 5 | 4 | 1 |
| 7 — Polish & GA | 10 | 5 | 2 | 3 |
| **Total** | **65** | **27** | **28** | **10** |

---

> — **Cross-references :** voir `constitution.md` v0.3.0 pour les contraintes immuables. `spec.md` v0.1.0 pour le détail fonctionnel. `plan.md` v0.1.0 pour l’architecture technique.

> ⚠️ Toute modification de ce document requiert l’approbation explicite d’Alexandre Thibaud (ATConseil — atconseil.info).

