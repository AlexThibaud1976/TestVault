# Monorepo TestVault -- Inventaire

> Document factuel decrivant l'etat du monorepo au 2026-05-12.
> Genere dans le cadre de TECH-DEBT-015A.
> **Pas de decisions strategiques ici** -- voir `Specs/MIGRATION-PLAN.md` (TECH-DEBT-015B).

---

## Vue d'ensemble

| Dossier | Type | Role |
|---|---|---|
| `apps/argos-extension` | Application | Extension ADO Argos (publiee Marketplace, publisher AlexThibaud) |
| `apps/argos-functions` | Application | Backend Azure Functions (LLM proxy, webhooks, license, Stripe) |
| `apps/docs-site` | Application | Placeholder -- aucun contenu src |
| `packages/testpulse-ui-shared` | Bibliotheque | Lecteur de schema WIT (pas de composants UI) |
| `packages/testvault-cli` | Bibliotheque | CLI : upload results + BDD sync |
| `packages/testvault-exporters` | Bibliotheque | Generateurs Excel/PDF (3 formats) |
| `packages/testvault-gherkin` | Bibliotheque | Parse/valide/genere des fichiers Gherkin .feature |
| `packages/testvault-importers` | Bibliotheque | Parseurs de resultats de test (7 formats) |
| `packages/testvault-sdk` | Bibliotheque | SDK principal (9 services CRUD ADO) |
| `packages/testvault-types` | Bibliotheque | Types TypeScript + schemas Zod pour les WIT |
| `packages/testvault-ui` | Bibliotheque | Placeholder vide (export {} uniquement) |
| `packages/testvault-wit-schema` | Bibliotheque | Definitions des 7 Custom Work Item Types ADO |
| `tools/azure-pipelines-task` | **Livrable produit** | Azure DevOps Pipeline Task (`testvault-azure-pipelines-task` v1.0.0) |
| `tools/e2e` | Tests | Suite Playwright E2E contre ADO Cloud (`testvault-e2e` v0.3.3, 11 specs) |
| `tools/regression` | Outils dev | Suite de tests regression (13 fichiers, 51 assertions) |
| `tools/testvault-action` | **Livrable produit** | GitHub Action composite pour Marketplace Actions (TestVault upload results) |
| `tools/preflight` | Outils dev | Scripts validation manifest VSS + checklist humaine + reference docs |
| `tools/claude-prompts` | Documentation | Archive des prompts Claude Code apres chaque sprint |
| `tools/load-testing` | Anticipe Phase 7 | Placeholder structurel (k6 scenarios) -- non implemente |
| `tools/migration-scripts` | Anticipe migrations WIT | Placeholder structurel -- non implemente |
| `Specs/` | Specifications | Spec-kit (constitution, spec, plan, tasks, MONOREPO) |
| `.github/workflows/` | CI/CD | 3 workflows GitHub Actions |

### Fichiers/dossiers hors patterns attendus a la racine

| Nom | Observation |
|---|---|
| `dist/` | Dossier present a la racine -- probablement sortie VSIX |
| `vsix-debug-3.2/` | Dossier present a la racine -- artefact de debug Sprint 3.2 |
| `docs/` | Dossier present -- contenu non inspecte dans ce sprint |

---

## Workspace et build

**pnpm-workspace.yaml** :
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

**turbo.json** (taches declarees) :
- `build` : dependance `^build` (ordre topologique), output `dist/**`
- `test` : dependance `^build`, cache desactive
- `typecheck` : dependance `^build`
- `lint` : aucune dependance

---

## Packages -- Inventaire detaille

### packages/testpulse-ui-shared

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testpulse-ui-shared` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |

**Fichiers source** (hors dist, node_modules) :
- `src/index.ts` -- barrel : re-exporte tout depuis `wit-schema-reader.js`
- `src/wit-schema-reader.ts` -- logique principale
- `src/wit-schema-reader.test.ts` -- tests unitaires

**Contenu de `wit-schema-reader.ts`** :
- Constante : `TESTVAULT_WIT_NAMES` (tableau des 7 noms de WIT TestVault)
- Type : `TestVaultWorkItemType` (union des 7 noms)
- Interface : `TestVaultWitField` (referenceName, name, type, readOnly)
- Interface : `ITestVaultSchemaReader` (listWorkItemTypes, getFields, isArgosInstalled)
- Interface : `IAdoWorkItemClient` (adaptateur ADO inject par le consommateur)
- Fonction : `createTestVaultSchemaReader(client)` -- fabrique implementant `ITestVaultSchemaReader`

**Exports depuis `index.ts`** :
- `createTestVaultSchemaReader`, `TESTVAULT_WIT_NAMES`, `TestVaultWitField` (type), `TestVaultWorkItemType` (type)

**Dependances internes** : `@atconseil/testvault-types` (workspace:*)

**Consommateurs internes** : aucun dans le repo (verifie via scan package.json)

**Observation factuelle** : Le nom du package contient "ui-shared" mais le code ne contient aucun composant React ni aucune logique UI. Le contenu est un utilitaire de lecture de schema WIT.

---

### packages/testvault-cli

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-cli` |
| Version | 0.3.2 |
| private | false |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` (pas de types declares dans exports) |

**Fichiers source** :
- `src/cli.ts` -- point d'entree CLI
- `src/upload-results.ts` + test -- commande upload de resultats de test
- `src/bdd-sync.ts` + test -- commande synchronisation BDD
- `src/index.ts` -- barrel

**Exports depuis `index.ts`** : `processUploadResults`, `processBddSync` + types associes

**Dependances internes** :
- `@atconseil/testvault-exporters`
- `@atconseil/testvault-gherkin`
- `@atconseil/testvault-importers`
- `@atconseil/testvault-sdk`
- `@atconseil/testvault-types`

**Consommateurs internes** : aucun dans le repo

**Statut publication npm** : NON publie (npm view retourne 404, verifie 2026-05-12)

---

### packages/testvault-exporters

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-exporters` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |

**Fichiers source** :
- `src/types.ts` -- types partages
- `src/matrix-export.ts` + test -- export matrice
- `src/catalog-export.ts` + test -- export catalogue
- `src/release-readiness-export.ts` + test -- export release readiness
- `src/index.ts` -- barrel

**Exports depuis `index.ts`** :
- `exportMatrixToExcel`, `exportMatrixToPdf`
- `exportCatalogToExcel`, `exportCatalogToPdf`
- `exportReleaseReadinessToExcel`, `exportReleaseReadinessToPdf`
- Types partages

**Dependances internes** : `@atconseil/testvault-sdk`, `@atconseil/testvault-types`

**Consommateurs internes** : `argosTesting` (argos-extension), `@atconseil/testvault-cli`

---

### packages/testvault-gherkin

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-gherkin` |
| Version | 0.3.2 |
| private | false |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` (pas de types declares dans exports) |

**Fichiers source** :
- `src/validator.ts` + test
- `src/parser.ts` + test
- `src/generator.ts` + test
- `src/index.ts` -- barrel

**Exports depuis `index.ts`** :
- `validateGherkin`, `parseFeature`, `featureToTestCases`, `generateFeature`, `testCasesToFeature` + types

**Dependances internes** : aucune (`@atconseil/*`)

**Consommateurs internes** : `argosTesting` (argos-extension), `@atconseil/testvault-cli`, `argos-functions`

**Statut publication npm** : NON publie (npm view retourne 404, verifie 2026-05-12)

---

### packages/testvault-importers

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-importers` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |

**Fichiers source** :
- `src/types.ts` -- types partages (`ImportError`, `ImportResult`, `ParsedTestCase`, `ParsedTestStep`)
- `src/csv-parser.ts` + test
- `src/excel-parser.ts` + test
- `src/junit-parser.ts` + test
- `src/nunit-parser.ts` + test
- `src/xunit-parser.ts` + test
- `src/testng-parser.ts` + test
- `src/cucumber-parser.ts` + test
- `src/xml-utils.ts` -- utilitaire XML partage entre parseurs
- `src/index.ts` -- barrel

**Exports depuis `index.ts`** :
- `parseCsv`, `parseExcel`, `parseJUnit`, `parseNUnit`, `parseXUnit`, `parseTestNG`, `parseCucumber`
- Types partages

**Dependances internes** : `@atconseil/testvault-types`

**Consommateurs internes** : `argosTesting` (argos-extension), `@atconseil/testvault-cli`, `argos-functions`

---

### packages/testvault-sdk

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-sdk` |
| Version | 0.3.2 |
| private | false |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |
| Export secondaire | `./browser` -> `./dist/browser.js` + `./dist/browser.d.ts` |

**Fichiers source** (production) :
- `src/ado-client.ts` -- client HTTP ADO
- `src/environment.ts` -- detection Cloud vs Server (`detectEnvironment`)
- `src/process-install.ts` -- installation du Process ADO
- `src/test-case-service.ts` -- CRUD TestCase WIT
- `src/test-set-service.ts` -- CRUD TestSet WIT
- `src/test-plan-service.ts` -- CRUD TestPlan WIT
- `src/precondition-service.ts` -- CRUD Precondition WIT
- `src/test-execution-service.ts` -- CRUD TestExecution WIT
- `src/test-case-version-service.ts` -- CRUD TestCaseVersion WIT
- `src/evidence-upload-service.ts` -- upload de pieces jointes
- `src/environment-config-service.ts` -- configuration des environnements
- `src/bug-creation-service.ts` -- creation de bugs ADO
- `src/work-item-link-service.ts` -- gestion des liens entre Work Items
- `src/coverage-matrix.ts` -- matrice de couverture
- `src/snapshot-diff.ts` -- diff entre snapshots
- `src/wiql.ts` -- constructeur de requetes WIQL
- `src/paginator.ts` -- pagination des resultats ADO
- `src/browser.ts` -- entrypoint browser (subset du SDK)
- `src/index.ts` -- barrel

Chaque fichier de service dispose d'un fichier de test correspondant (17 fichiers test au total).

**Dependances internes** : `@atconseil/testvault-types`, `@atconseil/testvault-wit-schema`

**Consommateurs internes** :
- `argosTesting` (argos-extension)
- `@atconseil/testvault-cli`
- `@atconseil/testvault-exporters`
- `argos-functions`

**Statut publication npm** : NON publie (npm view retourne 404, verifie 2026-05-12)

---

### packages/testvault-types

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-types` |
| Version | 0.3.2 |
| private | false |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |

**Fichiers source** (production) :
- `src/enums.ts`
- `src/test-plan.ts`
- `src/test-set.ts`
- `src/precondition.ts`
- `src/test-case-version.ts`
- `src/audit-log.ts`
- `src/config.ts`
- `src/runtime.ts`
- `src/test-case.ts`
- `src/test-execution.ts`
- `src/index.ts` -- re-exporte les 10 modules ci-dessus

**Dependances internes** : aucune (`@atconseil/*`)

**Consommateurs internes** : tous les autres packages (testvault-sdk, testvault-sdk, testvault-wit-schema, testvault-importers, testvault-exporters, testvault-ui, testvault-cli, testpulse-ui-shared, argosTesting, argos-functions)

**Statut publication npm** : NON publie (npm view retourne 404, verifie 2026-05-12)

**Observation factuelle** : Ce package est la seule dependance sans consumer interne -- il est consomme par tous les autres.

---

### packages/testvault-ui

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-ui` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |

**Fichiers source** :
- `src/index.ts` -- contient uniquement `export {}`

**Dependances internes** : `@atconseil/testvault-types`

**Consommateurs internes** : aucun dans le repo (verifie via scan package.json)

**Observation factuelle** : Le fichier source unique contient `export {}`. Aucun composant n'a ete implemente. Aucun package du repo ne consomme ce package.

---

### packages/testvault-wit-schema

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-wit-schema` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |
| Export principal | `./dist/index.js` + `./dist/index.d.ts` |
| Export secondaire | `./schema.json` -> `./dist/schema.json` |

**Fichiers source** :
- `src/model.ts` -- types du modele de schema
- `src/schema.ts` -- schema principal
- `src/wits/audit-log.ts`
- `src/wits/precondition.ts`
- `src/wits/test-plan.ts`
- `src/wits/test-case-version.ts`
- `src/wits/test-case.ts`
- `src/wits/test-execution.ts`
- `src/wits/test-set.ts`
- `src/index.ts` -- barrel + 1 fichier test

Les 7 WIT definis : `TestVault.TestCase`, `TestVault.TestSet`, `TestVault.TestPlan`, `TestVault.Precondition`, `TestVault.TestExecution`, `TestVault.TestCaseVersion`, `TestVault.AuditLog`

**Dependances internes** : `@atconseil/testvault-types`

**Consommateurs internes** : `@atconseil/testvault-sdk`

---

## Apps -- Inventaire detaille

### apps/argos-extension

| Champ | Valeur |
|---|---|
| Nom npm | `argosTesting` |
| Version | 0.4.7 |
| private | false |
| Description | (absente dans package.json) |
| Publisher Marketplace | AlexThibaud |
| ExtensionId | ArgosTesting |
| Manifest | `vss-extension.json` |

**Scripts** :
- `build` -- esbuild via `scripts/build.mjs`
- `dev` -- esbuild en mode watch
- `build:vsix` -- tfx-cli, output `../../dist/argos.vsix`
- `typecheck`, `test`, `lint`

**Contenu src/** :
- Environ 23 fichiers `.ts` et 49 fichiers `.tsx` (72 total, incluant ~20 fichiers test)
- `src/hub/` : composants React pour les 6 hubs (Plans, Cases, Sets, Preconditions, Reports, Settings)
- `src/hub/App.tsx` : composant racine, routing via `SDK.getContributionId()`
- `src/hub/App.test.tsx` : 8 tests (6 routing + 1 fallback + 1 loading)
- `src/hub/wiring/` : 5 tests d'integration WIRING (un par hub fonctionnel)
- `src/widgets/coverage-panel/` : composant widget affiche dans les Work Item forms
- `src/__mocks__/` : mocks Azure DevOps API pour les tests
- `src/test-utils/` : factories de services mock

**Composants React principaux** (liste non exhaustive) :
InstallWizard, TestPlanForm, TestSetForm, TestCaseForm, PreconditionForm,
EvidencePanel, EnvironmentSettings, ExecutionHistory, WorkItemLinkPanel,
CoveragePanel, SnapshotDiffPanel, WebhookAdmin, GherkinEditor,
AiCandidatesModal, AuditLogSettings, FlakinessReport, ImportWizard,
BetaOptIn, OfflineBanner, LlmProviderSettings, QuotaSettings

**Contributions ADO (vss-extension.json)** :
- `argos-hub-group` (ms.vss-web.hub-group) -- groupe de navigation principal
- `argos-hub-plans` (ms.vss-web.hub) -- Test Plans
- `argos-hub-cases` (ms.vss-web.hub) -- Test Cases
- `argos-hub-sets` (ms.vss-web.hub) -- Test Sets
- `argos-hub-preconditions` (ms.vss-web.hub) -- Preconditions
- `argos-hub-reports` (ms.vss-web.hub) -- Reports
- `argos-hub-settings` (ms.vss-web.hub) -- Settings
- `argos-coverage-panel` (ms.vss-work-web.work-item-form-page) -- panneau Work Item

**Dependances internes** :
- `@atconseil/testvault-exporters`
- `@atconseil/testvault-gherkin`
- `@atconseil/testvault-importers`
- `@atconseil/testvault-sdk`
- `@atconseil/testvault-types`

---

### apps/argos-functions

| Champ | Valeur |
|---|---|
| Nom npm | `argos-functions` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |

**Scripts** :
- `build` -- tsc
- `dev` -- Azure Functions local runtime (`func start`)
- `typecheck`, `test`, `lint`

**Modules Azure Functions** (8 modules identifies) :
- `src/webhooks/` -- webhook-handler, token-service, queue-processor, functions entry
- `src/bdd-sync/` -- git-push-handler, functions entry
- `src/health/` -- health-handler, functions entry
- `src/jobs/` -- flakiness-detector, timer-jobs (taches planifiees)
- `src/llm-proxy/` -- generate-test-cases, functions entry
- `src/shared/` -- audit-log, crypto, quota, llm-client, version (utilitaires partages)
- `src/license/` -- license-engine
- `src/stripe/` -- stripe-webhook-handler, functions entry

**Observation factuelle** : ce module contient un handler Stripe (`stripe-webhook-handler`) impliquant une infrastructure de facturation/paiement. Ce handler n'est pas documente dans le spec-kit Phase 0.

**Dependances internes** :
- `@atconseil/testvault-gherkin`
- `@atconseil/testvault-importers`
- `@atconseil/testvault-sdk`

---

### apps/docs-site

| Champ | Valeur |
|---|---|
| Nom npm | `docs-site` |
| Version | 0.3.2 |
| private | true |
| Description | (absente dans package.json) |

**Contenu** : aucun dossier `src/`. Uniquement `package.json` et `CHANGELOG.md`.

**Scripts** (tous des placeholders) :
- `build` -- `echo 'docs-site build placeholder'`
- `dev` -- `echo 'docs-site dev placeholder'`
- `typecheck`, `test`, `lint` -- `echo 'ok'`

**Observation factuelle** : Ce package ne contient aucun code. Tous les scripts sont des commandes echo sans effet. Le dossier `docs/` a la racine du repo est distinct et n'a pas ete inspecte dans ce sprint.

---

## Carte des dependances internes

```
testvault-types         (aucune dependance interne)
testvault-wit-schema -> testvault-types
testvault-sdk        -> testvault-types, testvault-wit-schema
testvault-importers  -> testvault-types
testvault-exporters  -> testvault-sdk, testvault-types
testvault-gherkin       (aucune dependance interne)
testvault-ui         -> testvault-types
testvault-cli        -> testvault-exporters, testvault-gherkin, testvault-importers, testvault-sdk, testvault-types
testpulse-ui-shared  -> testvault-types
argos-extension      -> testvault-exporters, testvault-gherkin, testvault-importers, testvault-sdk, testvault-types
argos-functions      -> testvault-gherkin, testvault-importers, testvault-sdk
tools/e2e            -> testvault-cli, testvault-exporters (workspace:^), testvault-gherkin, testvault-importers, testvault-sdk
tools/azure-pipelines-task -> (aucune dependance interne)
tools/regression     -> (aucune dependance interne)
tools/testvault-action -> appelle CLI testvault (binaire, pas dependency npm declaree)
tools/load-testing     -> (placeholder vide)
tools/migration-scripts -> (placeholder vide)
tools/preflight        -> (scripts internes, pas de dependency npm)
tools/claude-prompts   -> (documentation, pas de dependency npm)
```

**Packages sans consommateur interne** :
- `@atconseil/testpulse-ui-shared`
- `@atconseil/testvault-ui`
- `@atconseil/testvault-cli`
- `@atconseil/testvault-azure-pipelines-task` (livrable produit, pas de consumer interne)
- `@atconseil/testvault-e2e` (suite de tests, pas de consumer interne)
- `@atconseil/regression-suite` (suite de tests, pas de consumer interne)

**Package racine de toutes les dependances** : `@atconseil/testvault-types` (consomme par tous les autres packages).

---

## Statut publication npm

Verifie le 2026-05-12 via `npm view <package> version` :

| Package | private | npm publie |
|---|---|---|
| `@atconseil/testvault-sdk` | false | NON (404) |
| `@atconseil/testvault-cli` | false | NON (404) |
| `@atconseil/testvault-types` | false | NON (404) |
| `@atconseil/testvault-gherkin` | false | NON (404) |
| `@atconseil/testvault-exporters` | true | Non applicable |
| `@atconseil/testvault-importers` | true | Non applicable |
| `@atconseil/testvault-ui` | true | Non applicable |
| `@atconseil/testvault-wit-schema` | true | Non applicable |
| `@atconseil/testpulse-ui-shared` | true | Non applicable |
| `argosTesting` (argos-extension) | false | Non applicable (VSIX, pas npm) |

**Observation factuelle** : 4 packages sont marques `private: false` mais aucun n'est publie sur le registre npm public. La flag `private: false` sur `argosTesting` (argos-extension) est sans consequence car ce package est distribue via Marketplace VSIX et non via npm.

**Note sur `@atconseil/testvault-azure-pipelines-task`** : `private: true`. Les Azure Pipeline Tasks ne se publient PAS sur npm -- elles se publient sur le Marketplace Azure DevOps dans la categorie "Pipeline Tasks" via tfx-cli (distinct de la categorie Extensions hub utilisee par argosTesting). Statut Marketplace a verifier dans un sprint dedie (Sprint 6g).

---

## Workflows CI/CD

Trois workflows GitHub Actions dans `.github/workflows/` :

### ci-pr.yml -- Gate PR

- **Declencheur** : `pull_request` vers `main` ou `develop`
- **Jobs** : lint (Biome), typecheck, test (Vitest), build, security audit (`audit-ci`)
- **Runner** : ubuntu-latest, timeout 15 min
- **Concurrence** : cancel-in-progress = true

### ci-main.yml -- Gate main

- **Declencheur** : `push` sur `main`
- **Jobs** :
  - `ci` : lint, typecheck, test, build, + VSIX dry-run packaging (tfx-cli)
  - `check-e2e` : detecte si le secret `ADO_CLOUD_PAT` est present
  - `e2e-cloud` : tests E2E Playwright contre ADO Cloud (conditionnel -- secrets requis : `ADO_CLOUD_ORG_URL`, `ADO_CLOUD_PAT`, `ADO_CLOUD_PROJECT`)
- **Runner** : ubuntu-latest, timeout 20 min

### publish-marketplace.yml -- Publication VSIX

- **Declencheurs** : `workflow_dispatch` (manuel, option dry_run) ou tag `v*.*.*`
- **Jobs** : build all, package VSIX (tfx-cli), upload artifact (30j retention), publish Marketplace
- **Publication conditionnelle** : skip si `workflow_dispatch` avec `dry_run: true`
- **Secret requis** : `MARKETPLACE_PAT`

---

## Frontiere TestVault / TestPulse / Argos

### Argos

- **Repo** : AlexThibaud1976/TestVault (ce repo)
- **Publisher Marketplace** : AlexThibaud
- **ExtensionId** : ArgosTesting
- **Version actuelle** : 0.4.7
- **Code** : `apps/argos-extension` (VSIX) + `apps/argos-functions` (Azure Functions backend)
- **Packages internes utilises** : testvault-sdk, testvault-types, testvault-importers, testvault-exporters, testvault-gherkin

### TestPulse

- **Repo** : distinct de AlexThibaud1976/TestVault (pas confirme, mais mentionne comme produit independant dans constitution et spec-kit)
- **Publisher Marketplace** : ATConseil (mentionne dans constitution v0.3.0, Sprint 3.1)
- **Code dans ce repo** : uniquement `packages/testpulse-ui-shared` (WIT schema reader)
- **Partage de code actuel** : `testpulse-ui-shared` depend de `@atconseil/testvault-types`

### TestVault

- **Role** : nom technique du repo Github et du projet (pas une marque produit)
- **Prefixe WIT** : `TestVault.*` (7 WIT definis dans `testvault-wit-schema`)
- **Prefixe npm** : `@atconseil/testvault-*`

---

## Observations factuelles

Les observations suivantes sont des faits constates sans proposition de correction.

1. **Versioning desaligne** : tous les packages dans `packages/` sont a la version `0.3.2`. `apps/argos-extension` est a `0.4.7`. `apps/argos-functions` et `apps/docs-site` sont a `0.3.2`. Les 3 versions coexistent dans le repo.

2. **`testpulse-ui-shared` -- nom trompeur et sans consommateur interne** : le nom suggere des composants UI partages, mais le code contient exclusivement un lecteur de schema WIT (`wit-schema-reader.ts`). Aucun composant React, aucune logique UI. Aucun package ou app du repo ne l'importe, ni via `package.json` dependencies, ni via import relatif, ni via workspace alias (verifie par grep dans `apps/argos-extension/src` et `apps/argos-functions/src` -- 0 match). Ce package est orphelin dans le repo au 2026-05-12.

3. **`testvault-ui` vide et sans consommateur** : le seul fichier source contient `export {}`. Aucun consommateur interne. Le package figure dans les dependances de `testvault-types` (il consomme `testvault-types`).

4. **`testvault-cli` sans consommateur interne** : ce package n'est consomme par aucun autre package ou app du repo. Il est marque `private: false` mais non publie sur npm.

5. **Stripe dans `argos-functions`** : le module `src/stripe/` contient un `stripe-webhook-handler`. Ce module n'est pas mentionne dans les taches Phase 0 du spec-kit (`tasks.md`).

6. **`docs-site` sans contenu** : tous les scripts sont des commandes echo. Pas de dossier `src/`. Le dossier `docs/` a la racine du repo est distinct de `apps/docs-site`.

7. **Aucune description dans les package.json** : aucun des 9 packages de `packages/` ni des 3 apps ne possede de champ `description` dans son `package.json`.

8. **Export secondaire `./browser` dans `testvault-sdk`** : ce package exporte un entrypoint specifique `./browser` (`./dist/browser.js`). Aucun autre package n'en dispose.

9. **`argos-extension` marque `private: false`** : ce package est le seul app marque `private: false`. Il n'est pas publie sur npm (distribue via VSIX).

10. **Dossiers non-standards a la racine** : `dist/` et `vsix-debug-3.2/` sont presents a la racine mais ne sont pas references dans `pnpm-workspace.yaml`.

11. **TECH-DEBT-015A initial etait incomplet** : 3 packages dans `tools/*` n'avaient pas ete inventories initialement (`azure-pipelines-task`, `e2e`, `regression-suite`). Decouvert Sprint 6b lors du grep des consommateurs. Cause : assimilation incorrecte "packages monorepo" = `packages/` alors que le workspace pnpm englobe aussi `tools/*` via `pnpm-workspace.yaml`. Section "Packages dans tools/" ajoutee 2026-05-13.

12. **TECH-DEBT-015A a ete incomplet 2 fois consecutivement** : initial (audit Sprint 6c) avait oublie
    `tools/*` complet. Follow-up #1 (Sprint 015A-followup, 2026-05-13) avait inventorie les 3 packages
    avec package.json (azure-pipelines-task, e2e, regression-suite) mais oublie les 5 dossiers SANS
    package.json (testvault-action, preflight, claude-prompts, load-testing, migration-scripts). Suite
    decouverte Sprint 7a investigation, le 2026-05-14. **Lecon racine** : un inventaire monorepo doit
    lister TOUS les dossiers, pas juste les packages npm. Sections ajoutees 2026-05-14.

---

## Packages dans tools/ -- Inventaire detaille (added 2026-05-13)

> Note : ces 3 packages font partie du workspace pnpm via `pnpm-workspace.yaml`
> (glob `tools/*`) mais n'avaient pas ete inventories dans la version initiale
> de ce document. Decouverte Sprint 6b lors de l'investigation des dependances
> croisees.

### tools/azure-pipelines-task

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-azure-pipelines-task` |
| Version | 1.0.0 |
| private | true |
| Description | (absente dans package.json) |
| Role | **Azure DevOps Pipeline Task** (livrable produit) |

**Fichiers source** :

- `src/index.ts` -- entrypoint de la task
- `src/index.test.ts` -- tests unitaires

**Manifests** :

- `task.json` -- manifest Azure DevOps Pipeline Task (different de `vss-extension.json`)

**Dependance externe principale** : `azure-pipelines-task-lib@^4.1.0` (SDK officiel Microsoft pour les Pipeline Tasks)

**Dependances internes** : aucune

**Consommateurs internes** : aucun

**Statut publication** : a verifier. Les Azure Pipeline Tasks se publient via tfx-cli sur le Marketplace Azure DevOps dans la categorie "Pipeline Tasks" (distinct de la categorie Extensions hub utilisee par argosTesting).

**Observation factuelle** : livrable produit autonome permettant aux utilisateurs Argos d'integrer une task dans leurs pipelines YAML Azure DevOps (analogue au `testvault-cli` mais natif Pipelines au lieu de CLI generale). Non documente dans les tasks.md Phase 0.

### tools/e2e

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-e2e` |
| Version | 0.3.3 (note : different de 0.3.2 des autres au 2026-05-12) |
| private | true |
| Description | "Playwright E2E suite against real ADO instances" |
| Role | Suite de tests End-to-End contre Azure DevOps Cloud |

**Fichiers source** :

- `playwright.config.ts` -- configuration Playwright (projet `cloud`)
- `fixtures/index.ts` -- fixtures partages
- `tests/01-process-verify.spec.ts` -- verification process ADO
- `tests/02-test-case.spec.ts` -- E2E TestCase WIT
- `tests/03-test-set.spec.ts` -- E2E TestSet WIT
- `tests/04-test-plan.spec.ts` -- E2E TestPlan WIT
- `tests/05-precondition.spec.ts` -- E2E Precondition WIT
- `tests/06-phase3-traceability.spec.ts` -- Phase 3 (tracabilite)
- `tests/07-phase4-import-export-cli.spec.ts` -- Phase 4 (CLI)
- `tests/08-phase5-bdd-sync.spec.ts` -- Phase 5 (BDD sync)
- `tests/09-phase6-ai-admin.spec.ts` -- Phase 6 (IA admin)
- `tests/10-accessibility.spec.ts` -- accessibilite
- `tests/11-responsive.spec.ts` -- responsive

**Total** : 11 fichiers de tests E2E couvrant les phases 0 a 6 + a11y + responsive.

**Dependances externes principales** :

- `@playwright/test@^1.49.0`

**Dependances internes** (5 packages) :

- `@atconseil/testvault-cli` (workspace:*)
- `@atconseil/testvault-exporters` (workspace:^)
- `@atconseil/testvault-gherkin` (workspace:*)
- `@atconseil/testvault-importers` (workspace:*)
- `@atconseil/testvault-sdk` (workspace:*)

**Note** : `testvault-exporters` est reference en `workspace:^` (caret) tandis que les autres sont en `workspace:*` (sans contrainte de version). Discrepance a noter.

**Consommateurs internes** : aucun (suite de tests autonome)

**Reference CI** : utilise dans `.github/workflows/ci-main.yml` job `e2e-cloud` (conditionnel sur secrets `ADO_CLOUD_*`).

### tools/regression

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/regression-suite` |
| Version | 0.1.0 |
| private | true |
| Description | (absente dans package.json) |
| Role | Suite de tests regression Vitest |

**Contenu** : 13 fichiers `.test.ts` couvrant 51 assertions (au 2026-05-13).

**Detail** : voir `tools/regression/REGISTRY.md` pour la liste exhaustive des tests et leur description.

**Dependances internes** : aucune

**Consommateurs internes** : aucun

**Reference CI** : lance par `ci-main.yml` et `ci-pr.yml` via `pnpm --filter @atconseil/regression-suite test`.

**Observation factuelle** : ce package est **argos-agnostique** par son nom (`regression-suite` sans prefixe `testvault-` ni `argos-`). Il n'a pas a etre renomme dans le portfolio migration.

---

## Dossiers utilitaires dans tools/ (added 2026-05-14)

> Note : ces 5 dossiers sont presents dans `tools/` mais ne sont PAS des packages npm
> (pas de `package.json`). Le glob `tools/*` de `pnpm-workspace.yaml` les englobe mais
> pnpm les ignore. Ils ont ete oublies a la fois dans TECH-DEBT-015A initial et dans le
> TECH-DEBT-015A follow-up #1. Lecon : pour un inventaire monorepo complet, lister TOUS
> les dossiers, pas juste ceux avec package.json.

### tools/testvault-action/

| Champ | Valeur |
|---|---|
| Type | GitHub Action composite |
| Fichier principal | `action.yml` |
| package.json | aucun (action composite, pas npm) |
| Role | **Livrable produit** : action GitHub Marketplace pour uploader les resultats CI dans Argos depuis un workflow GitHub Actions |

**Inputs** : pat, org-url, project, plan-id, results-file, environment, auto-create, strict, area-path, cli-version

**Mecanisme** :

1. Installe globalement `@atconseil/testvault-cli@${cli-version}` via npm
2. Set les variables d'env `TESTVAULT_PAT`, `TESTVAULT_ORG_URL`, `TESTVAULT_PROJECT`
3. Appelle `testvault tc upload-results <args>` en shell

**Etat connu (2026-05-14)** :

- Encoding verifie : em-dash dans `name:` est UTF-8 valide (E2 80 94 = U+2014). Pas de mojibake detecte.
- Variables `TESTVAULT_*` a renommer en `ARGOS_*` (decision validee 2026-05-13)
- Reference `@atconseil/testvault-cli` a remplacer par `@atconseil/argos-cli` apres Sprint 7a
- Commande shell `testvault` a remplacer par `argos` apres Sprint 7a (rename binaire CLI)
- **Statut publication** : non publie sur GitHub Marketplace Actions (a confirmer)
- **Note** : scan-mojibake.cjs ne scanne pas les .yml (TECH-DEBT-025) -- risque residuel non couvert

**Sprint planifie** : **7d** (NEW, ajoute dans MIGRATION-PLAN.md section 1.9)

### tools/load-testing/

| Champ | Valeur |
|---|---|
| Type | Placeholder vide |
| Fichier principal | `.gitkeep` uniquement |
| Role | **Anticipe** pour Phase 7 -- tests de charge (k6) |

**Reference** : `Specs/plan.md` section 9.8 mentionne k6 scenarios (100 users simultanes, import 10k TC, 1000 webhooks/min burst).

**Etat** : aucun travail effectif. Le dossier sert de **placeholder structurel** cree en Phase 0 (T-0.1 scaffold monorepo).

**Sprint planifie** : aucun a court terme. A activer en Phase 7 (T-7.x).

### tools/migration-scripts/

| Champ | Valeur |
|---|---|
| Type | Placeholder vide |
| Fichier principal | `.gitkeep` uniquement |
| Role | **Anticipe** pour les migrations de schema WIT (constitution section 9 retrocompatibilite) |

**Reference** : `constitution.md` section 9 retrocompatibilite : "Une migration de schema majeure (vX -> vX+1) est documentee et accompagnee d'un script de migration teste end-to-end sur instance reelle."

**Etat** : aucun travail effectif. Placeholder structurel.

**Sprint planifie** : aucun a court terme. A activer quand une migration WIT majeure sera necessaire (post-GA).

### tools/preflight/

| Champ | Valeur |
|---|---|
| Type | Scripts utilitaires + documentation |
| Contenu | `manifest-check.cjs`, `marketplace-check.md`, `microsoft-docs-snippets.md` |
| Role | Validation manifest VSS pre-publication |

**Detail des fichiers** :

- `manifest-check.cjs` (5645 bytes) : script auto lance par `pnpm preflight`, valide les 7 regles du manifest VSS (publisher, public, scopes, version, etc.)
- `marketplace-check.md` (5695 bytes) : checklist humaine de pre-publication Marketplace
- `microsoft-docs-snippets.md` (4209 bytes) : extraits annotes de la doc Microsoft VSS-Manifest pour reference

**Etat** : operationnel. Le script est lance dans la CI et localement avant chaque release.

**Sprint planifie** : aucun. Pas a renommer (nom de dossier deja argos-agnostic, le contenu est de la documentation/scripts internes).

### tools/claude-prompts/

| Champ | Valeur |
|---|---|
| Type | Documentation prompts |
| Contenu | Archive des `CLAUDE_TASK_*.md` apres chaque sprint (30 fichiers au 2026-05-14) |
| Role | Tracabilite methodologique : conserver les prompts utilises pour chaque sprint Claude Code |

**Etat** : artefact methodologique. Chaque sprint archive son prompt dans ce dossier.

**Sprint planifie** : aucun. Pas a renommer.

---

## Annexe -- Donnees brutes

### Nombre de fichiers TypeScript par package (sources uniquement, hors tests)

| Package | Fichiers TS/TSX (prod) | Fichiers TS/TSX (test) |
|---|---|---|
| testpulse-ui-shared | 2 | 1 |
| testvault-cli | 4 | 2 |
| testvault-exporters | 5 | 3 |
| testvault-gherkin | 4 | 3 |
| testvault-importers | 9 | 7 |
| testvault-sdk | 18 | 17 |
| testvault-types | 11 | 1 |
| testvault-ui | 1 | 0 |
| testvault-wit-schema | 9 | 1 |
| argos-extension | ~52 | ~20 |
| argos-functions | ~25 | ~9 |
| docs-site | 0 | 0 |

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### Repertoire tools/

- `tools/regression/` -- 12 fichiers test (47 assertions au 2026-05-12), `REGISTRY.md`, `allowlist.ts`, `allowlist.cjs`
- `tools/preflight/` -- `manifest-check.cjs`, `marketplace-check.md`, `microsoft-docs-snippets.md`
- `tools/claude-prompts/` -- archive des prompts par sprint
- `tools/e2e/` -- suite Playwright (referenciee dans ci-main.yml, non inspecte dans ce sprint)
- `tools/load-testing/` -- k6 stress tests (non inspecte dans ce sprint)
- `tools/migration-scripts/` -- scripts migration WIT schema (non inspecte dans ce sprint)
