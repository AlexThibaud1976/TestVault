# Tasks â€” TestVault (Argos) v1.0

> Version 0.1.0 â€” 8 mai 2026
> DÃ©coupage actionnable des phases d'implÃ©mentation
> Auteur : Alexandre Thibaud â€” atconseil.info
> RÃ©fs : `constitution.md` v0.2.3, `spec.md` v0.1.0, `plan.md` v0.1.0
> Contexte : dÃ©veloppement solo en duo avec Claude Code

---

## Mode d'emploi

Ce document liste les tÃ¢ches d'implÃ©mentation par phase. Chaque tÃ¢che est **autonome** (peut Ãªtre prise comme objectif d'une session Claude Code) et a des **critÃ¨res de done explicites**.

**Convention :**

- `T-X.Y` : identifiant unique de tÃ¢che (X = numÃ©ro de phase, Y = numÃ©ro dans la phase)
- ðŸ”´ = bloquante pour la phase suivante
- ðŸŸ¡ = bloquante pour des tÃ¢ches prÃ©cises (notÃ©es en dÃ©pendance)
- ðŸŸ¢ = non-bloquante (peut glisser entre phases)
- ðŸ“š = rÃ©fÃ©rence Ã  `constitution.md` / `spec.md` / `plan.md`

**RÃ¨gles non-nÃ©gociables (rappel constitution Â§10 et Â§11) :**

- TDD strict : test rouge â†’ implÃ©mentation â†’ test vert
- Documentation `README.md` + `docs/user-guide.md` mises Ã  jour dans le mÃªme commit que le code
- Couverture â‰¥ 90% core / â‰¥ 80% UI
- `npm audit --audit-level=high` clean
- Spec-kit mis Ã  jour avant tout changement de comportement utilisateur visible
- Test de non-rÃ©gression nommÃ© pour chaque bug confirmÃ©

---

## Phase 0 â€” Scaffolding & infrastructure de base

> **Objectif :** disposer d'un monorepo opÃ©rationnel, d'une CI verte, d'une extension Argos minimale publiÃ©e en preview privÃ©e sur le Marketplace.
> **Done quand :** `pnpm install && pnpm turbo build && pnpm test` passe vert, et un VSIX est installÃ© sur l'org de test ADO Cloud + l'instance ADO Server 2022.

### T-0.1 â€” Initialiser le monorepo ðŸ”´

ðŸ“š `plan.md` Â§1.1, Â§1.2

- [x] CrÃ©er le repo GitHub `atconseil/testvault` (privÃ© en phase 0, public Ã  la GA)
- [x] Initialiser pnpm workspaces + Turborepo + TypeScript strict (`tsconfig.base.json`)
- [x] CrÃ©er la structure de dossiers `apps/`, `packages/`, `tools/`, `docs/` conforme au plan
- [x] Configurer **Biome** (lint + format unifiÃ©s) Ã  la racine via `biome.json`, branchÃ© en CI bloquante
- [x] Ajouter `gitleaks` en pre-commit hook
- [x] CrÃ©er `.gitignore`, `LICENSE` (Apache 2.0 pour packages publics, `LICENSE-PROPRIETARY` pour extension), `CODE_OF_CONDUCT.md`

**Done quand :**
- [x] `pnpm install` Ã  la racine fonctionne sans warning
- [x] `pnpm turbo build` lance un build vide mais rÃ©ussit
- [x] Le repo est cloneable et navigable

### T-0.2 â€” Mettre en place la CI GitHub Actions de base ðŸ”´

ðŸ“š `plan.md` Â§10.1, Â§10.2

- [x] Workflow `ci-pr.yml` : checkout â†’ setup Node 22 â†’ pnpm install (frozen) â†’ lint â†’ typecheck â†’ test â†’ build
- [x] Workflow `ci-main.yml` : tout le ci-pr + build VSIX dry-run
- [x] Configurer Dependabot (security + patch updates auto-merge ; minor en PR review)
- [x] Configurer le badge CI dans le `README.md`

**Done quand :**
- [x] Une PR triviale (typo dans README) dÃ©clenche la CI verte
- [x] La CI bloque si lint ou typecheck Ã©choue (vÃ©rifier avec un fail volontaire qu'on revert ensuite)

### T-0.3 â€” CrÃ©er le package `testvault-types` ðŸ”´

ðŸ“š `plan.md` Â§1.1, `spec.md` Â§6

- [x] CrÃ©er `packages/testvault-types/` avec ses interfaces TypeScript : `TestVaultTestCase`, `TestVaultTestPlan`, `TestVaultTestSet`, `TestVaultPrecondition`, `TestVaultTestExecution`, `TestVaultTestCaseVersion`, `TestVaultAuditLog`
- [x] DÃ©finir les types JSON sÃ©rialisÃ©s : `TestStep`, `TestStepResult`, `EvidenceRef`
- [x] DÃ©finir les types de configuration : `OrgConfig`, `LLMProviderConfig`, `ProjectConfig`, `UserPreferences`, `EncryptedApiKey`
- [x] DÃ©finir les enums et union types : `TestStatus`, `LLMProviderType`, `AuditOperation`
- [x] Tests : valider via Zod chaque interface a un schema runtime correspondant

**Done quand :**
- [x] `pnpm --filter @atconseil/testvault-types build` produit `dist/`
- [x] Tous les types sont exportÃ©s depuis `index.ts`
- [x] Couverture des schÃ©mas Zod â‰¥ 95%

### T-0.4 â€” CrÃ©er l'extension Argos minimale (Hub vide)

ðŸ“š `plan.md` Â§2.1

- [x] CrÃ©er `apps/argos-extension/` avec `vss-extension.json` configurÃ© : publisher=`ATConseil`, name=`Argos`, targets Cloud + Server `[18.0,)`
- [x] ImplÃ©menter un Hub minimal qui dit juste "Argos â€” Coming soon" avec layout Fluent UI 2
- [x] Configurer webpack/vite pour le bundle
- [x] Tester l'init du SDK : `SDK.init()` puis `SDK.notifyLoadSucceeded()`
- [x] Builder un VSIX via `tfx-cli`

**Done quand :**
- [x] Le VSIX est gÃ©nÃ©rÃ© sans erreur
- [x] Le Hub s'affiche correctement dans une org de test ADO Cloud (installation manuelle preview privÃ©e)
- [x] Le Hub s'affiche aussi dans une instance ADO Server 2022 self-hosted (validation manuelle)

### T-0.5 â€” DÃ©tection runtime Cloud vs Server ðŸŸ¡

ðŸ“š `plan.md` Â§2.2 â€” bloque T-3.x (features dÃ©pendantes)

- [x] CrÃ©er `packages/testvault-sdk/src/runtime-detection.ts` avec la fonction `detectEnvironment()`
- [x] Tests unitaires couvrant : URL `*.dev.azure.com`, `*.visualstudio.com`, URL custom Server, edge cases (URL malformÃ©e, network down)
- [x] Mock du SDK ADO via msw

**Done quand :**
- [x] `detectEnvironment()` retourne le bon type sur les 3 cas (cloud, server, error)
- [x] Couverture â‰¥ 95%

### T-0.6 â€” Pipeline de publication Marketplace (preview privÃ©e) ðŸŸ¡

ðŸ“š `plan.md` Â§10.2

- [x] Workflow `release-publish.yml` configurÃ© (steps : build â†’ SBOM â†’ package VSIX â†’ publish)
- [x] PAT Marketplace stockÃ© en GitHub Secret
- [x] Publication rÃ©ussie d'une v0.0.1-preview en mode privÃ© (visibilitÃ© limitÃ©e Ã  votre org)

**Done quand :**
- [x] La v0.0.1-preview est listÃ©e sur le Marketplace en privÃ©
- [x] L'install depuis le Marketplace dans votre org de test fonctionne

### T-0.7 â€” CrÃ©er `CLAUDE.md` racine ðŸŸ¢

ðŸ“š contrat avec Claude Code (cf. demande utilisateur)

- [x] RÃ©diger `CLAUDE.md` Ã  la racine, listant : rÃ¨gles non-nÃ©gociables (extraites de la constitution), structure du monorepo, commandes clÃ©s, do/don't, liens vers les 4 fichiers spec-kit
- [x] Format concis (~150-300 lignes max)

**Done quand :**
- [x] `CLAUDE.md` est mergÃ© sur `main`
- [x] Une nouvelle session Claude Code ouverte sur le repo le lit automatiquement

---

## Phase 1 â€” Custom WIT et CRUD rÃ©fÃ©rentiel

> **Objectif :** crÃ©er le Custom Process Inheritance, installer les Custom WIT, et permettre le CRUD complet de `TestCase`, `TestPlan`, `TestSet`, `Precondition` via l'UI Argos.
> **Done quand :** un User TestVault peut crÃ©er, lister, modifier, supprimer ces 4 types de WI dans l'UI Argos, sur Cloud ET Server 2022.

### T-1.1 â€” SchÃ©ma WIT formalisÃ© en code ðŸ”´

ðŸ“š `plan.md` Â§3.2, Â§3.3, Â§3.5

- [x] CrÃ©er `packages/testvault-wit-schema/` avec les dÃ©finitions JSON de chaque Custom WIT
- [x] Inclure les champs (rÃ©fÃ©rence, type, contraintes), Ã©tats et transitions, picklists
- [x] GÃ©nÃ©rer un fichier `schema.json` exhaustif consommable par le wizard d'installation
- [x] Tests : validation que le schÃ©ma respecte le format attendu par l'API Process ADO

**Done quand :**
- [x] Tous les 7 Custom WIT sont dÃ©finis
- [x] Le `schema.json` est exportÃ©
- [x] Tests unitaires couvrent la validitÃ© du schÃ©ma

### T-1.2 â€” Adapter ADO (`IAdoClient`) â€” opÃ©rations CRUD WI ðŸ”´

ðŸ“š `plan.md` Â§2.3

- [x] CrÃ©er `packages/testvault-sdk/src/ado-client.ts` avec interface `IAdoClient`
- [x] ImplÃ©menter `fetchWorkItem(id)`, `createWorkItem(type, fields)`, `updateWorkItem(id, fields)`, `deleteWorkItem(id)`
- [x] Gestion des erreurs ADO standardisÃ©e (401, 403, 404, 429, 500) avec mapping vers exceptions typÃ©es
- [x] Tests d'intÃ©gration via msw : tous les codes d'erreur, payload malformÃ©, timeout

**Done quand :**
- [x] Toutes les opÃ©rations CRUD passent les tests msw
- [x] Couverture â‰¥ 90%

### T-1.3 â€” Wizard d'installation du Custom Process ðŸ”´

ðŸ“š `spec.md` US-6.1, `plan.md` Â§3.1

- [x] UI du wizard : Ã©tapes de dÃ©tection permissions, choix process, preview, exÃ©cution, vÃ©rification
- [x] ImplÃ©mentation des appels API Process ADO pour crÃ©er/modifier le process
- [x] DÃ©tection idempotente : un process avec schema TestVault existant n'est pas re-crÃ©Ã©
- [x] Gestion des erreurs (permissions insuffisantes, conflit de nom, etc.)
- [x] Tests E2E sur instance Cloud et Server

**Done quand :**
- [x] L'installation depuis zÃ©ro fonctionne sur Cloud
- [x] L'installation depuis zÃ©ro fonctionne sur Server 2022
- [x] La rÃ©installation dÃ©tecte le schÃ©ma existant et propose la bonne action
- [x] L'utilisateur sans droits voit un message clair sans tentative d'opÃ©ration qui Ã©chouerait

### T-1.4 â€” CRUD Test Case (UI + service) ðŸŸ¡

ðŸ“š `spec.md` US-1.1, `plan.md` Â§3.3

- [x] Service `TestCaseService` avec : `create`, `read`, `update`, `delete`, `list`
- [x] UI : formulaire de crÃ©ation/Ã©dition (Fluent UI 2)
- [x] Editeur de Steps avec drag & drop, markdown
- [x] Validation cÃ´tÃ© UI : Title obligatoire, Steps array, etc.
- [x] Tests unitaires (service) et tests E2E (UI complÃ¨te)

**Done quand :**
- [x] CrÃ©ation d'un TC complet sauvegarde correctement dans ADO
- [x] Ã‰dition d'un TC existant fonctionne, History ADO prÃ©servÃ©
- [x] Suppression demande confirmation
- [x] Couverture service â‰¥ 90%

### T-1.5 â€” CRUD Test Set ðŸŸ¡

ðŸ“š `spec.md` US-1.2

- [x] Service `TestSetService` (composition statique + composition dynamique via WIQL sauvegardÃ©e)
- [x] UI : ajout par sÃ©lection multiple, drag-and-drop, query WIQL
- [x] Lien `contains` Test Set â†” Test Case (n-n)
- [x] Tests

**Done quand :**
- [x] Composition statique fonctionne
- [x] Composition dynamique via WIQL fonctionne
- [x] La suppression d'un Set ne supprime pas les TC contenus

### T-1.6 â€” CRUD Test Plan ðŸŸ¡

ðŸ“š `spec.md` US-1.3

- [x] Service `TestPlanService`
- [x] UI : formulaire avec Test Sets + TC supplÃ©mentaires + Environments
- [x] Ã‰tat `Draft` initial, transition vers `Locked` (cf. T-3.x pour le snapshot auto au lock)
- [x] Tests

**Done quand :**
- [x] CrÃ©ation de plan avec mix Test Sets + TC fonctionne
- [x] L'Ã©tat `Locked` est implÃ©mentÃ© (snapshot auto dÃ©fÃ©rrÃ© Ã  la phase 3)

### T-1.7 â€” CRUD Precondition ðŸŸ¢

ðŸ“š `spec.md` US-1.5

- [x] Service + UI similaires aux prÃ©cÃ©dents
- [x] Lien `precondition-of` bidirectionnel
- [x] Tests

**Done quand :**
- [x] Une Precondition peut Ãªtre liÃ©e Ã  N TC
- [x] La consultation d'un TC affiche ses Preconditions liÃ©es

### T-1.8 â€” Hub Argos avec navigation ðŸŸ¡

ðŸ“š `spec.md` Â§7.1

- [x] Layout du Hub avec navigation latÃ©rale (Plans, Cases, Sets, Preconditions, Reports, Settings)
- [x] Vue par dÃ©faut : liste des Test Plans actifs + Failed rÃ©cents
- [x] Recherche globale (basique en phase 1, enrichie en phase 4)

**Done quand :**
- [x] Le wireframe `spec.md` Â§7.1 est implÃ©mentÃ© Ã  l'identique fonctionnel
- [x] Navigation entre les vues fluide (< 500ms)

### T-1.9 â€” Tests E2E phase 1 sur Cloud + Server ðŸ”´

ðŸ“š `plan.md` Â§9.4

- [x] Mettre en place les 2 instances ADO de test (Cloud `argos-test.dev.azure.com` + Server `argos-test-server.atconseil.io`)
- [x] Suite E2E couvrant : install Custom Process, CRUD complet TC/Plan/Set/Precondition
- [x] IntÃ©gration au workflow `ci-main.yml`

**Done quand :**
- [x] La suite E2E passe verte sur les 2 instances
- [x] Le temps total d'exÃ©cution < 15 min

---

## Phase 2 â€” ExÃ©cution des tests & evidence

> **Objectif :** un User TestVault peut exÃ©cuter manuellement un Test Case, capturer le statut step-by-step, attacher de l'evidence, et crÃ©er un Bug ADO depuis un Fail.
> **Done quand :** une `TestExecution` complÃ¨te est sauvegardÃ©e dans ADO et reste immutable, avec liens vers le Test Plan, le TestCase, et un Bug optionnel.

### T-2.1 â€” Service `TestExecutionService` ðŸ”´

ðŸ“š `spec.md` US-2.1, `plan.md` Â§3.5

- [x] MÃ©thodes : `startRun`, `saveStepResult`, `attachEvidence`, `finalizeRun`, `linkBug`
- [x] Garantie d'immutabilitÃ© aprÃ¨s save final (refus de tout PATCH ultÃ©rieur)
- [x] Calcul automatique du `globalStatus` depuis les `stepResults`
- [x] Tests unitaires + intÃ©gration

**Done quand :**
- [x] Une `TestExecution` save passe l'API ADO, est lue immutable
- [x] Une tentative de modification post-save renvoie 403 documentÃ©e
- [x] Couverture â‰¥ 90%

### T-2.2 â€” UI d'exÃ©cution (run interface) ðŸ”´

ðŸ“š `spec.md` US-2.1, Â§7.3

- [x] ImplÃ©mentation du wireframe Â§7.3 : panneau Precondition, liste des Steps, panneau Evidence
- [x] SÃ©lecteur d'Environment obligatoire en dÃ©but de run
- [x] Validation : commentaire obligatoire si Step en Fail
- [x] Calcul global status en temps rÃ©el
- [x] Bouton "Save Run" (final) + "Cancel"

**Done quand :**
- [x] L'utilisateur peut exÃ©cuter un TC complet de bout en bout
- [x] Le statut global est calculÃ© correctement
- [x] Tests E2E couvrant les 3 issues : full Pass, partial Fail, Blocked

### T-2.3 â€” Upload d'evidence (multi-formats) ðŸŸ¡

ðŸ“š `spec.md` US-2.2

- [x] Service d'upload utilisant l'API Attachments ADO native
- [x] Validation des types (PNG, JPG, GIF, PDF, TXT, LOG, MP4, WEBM) et des limites (10/25/5/100 MB)
- [x] UI drag & drop + bouton fichier
- [x] Preview pour images, lecteur intÃ©grÃ© vidÃ©os, lien pour autres
- [x] Lien evidence â†” step ou execution global

**Done quand :**
- [x] Upload des 4 formats principaux fonctionne
- [x] Les limites de taille sont appliquÃ©es avec messages clairs
- [x] L'evidence est visible en lecture aprÃ¨s save

### T-2.4 â€” Configuration des Environments par projet ðŸŸ¡

ðŸ“š `spec.md` US-2.3

- [x] UI Settings > Environments (Admin only) avec CRUD de la liste
- [x] Stockage dans ExtensionDataService scope projet
- [x] Validation cÃ´tÃ© run : environment doit appartenir Ã  la liste configurÃ©e
- [x] Tests

**Done quand :**
- [x] Un Admin peut gÃ©rer la liste
- [x] Un User n'a pas accÃ¨s Ã  cette config
- [x] La liste est utilisÃ©e comme dropdown dans le run

### T-2.5 â€” CrÃ©ation de Bug depuis Fail ðŸŸ¢

ðŸ“š `spec.md` US-2.1 (Ã©tape 11)

- [x] Bouton "Create Bug from Failure" sur l'Ã©cran de run avec status Fail
- [x] PrÃ©-remplissage : Title, Description (avec lien vers run), Repro Steps (depuis steps Fail), Severity, Environment
- [x] CrÃ©ation via API ADO standard, lien `Found By` Test Execution â†’ Bug

**Done quand :**
- [x] Un Bug est crÃ©Ã© avec les bonnes infos prÃ©-remplies
- [x] Le lien Test Execution â†” Bug est visible dans les 2 sens

### T-2.6 â€” Vue historique des exÃ©cutions par TC ðŸŸ¡

ðŸ“š `spec.md` US-2.3

- [x] Sur la page d'un TC, onglet "Executions" avec liste paginÃ©e
- [x] Filtres : par environment, par statut, par pÃ©riode
- [x] Vue cÃ´te Ã  cÃ´te des statuts par environment

**Done quand :**
- [x] L'historique d'un TC avec >100 exÃ©cutions reste fluide
- [x] Filtres fonctionnent

### T-2.7 â€” Tests E2E phase 2 ðŸ”´

- [x] E2E : run complet sur Cloud, run complet sur Server
- [x] E2E : upload evidence multi-formats
- [x] E2E : crÃ©ation de Bug depuis Fail

**Done quand :**
- [x] Suite E2E phase 2 passe verte sur les 2 environnements

---

## Phase 3 â€” TraÃ§abilitÃ©, versioning, snapshots

> **Objectif :** la traÃ§abilitÃ© bidirectionnelle Work Items â†” TestCase fonctionne, les snapshots taggÃ©s sont opÃ©rationnels, la matrice de couverture est exportable.
> **Done quand :** AÃ¯cha (Test Manager) peut ouvrir une matrice de couverture, crÃ©er un snapshot manuel d'un TC, lock un Test Plan avec snapshot auto.

### T-3.1 â€” Lien bidirectionnel Work Items ADO â†” Test Case ðŸ”´

ðŸ“š `spec.md` US-3.1

- [x] DÃ©finition des link types custom : `TestVault.TestedBy`, `TestVault.Validates`, `TestVault.Covers`
- [x] UI sur le formulaire TC : ajout/suppression de liens
- [x] Widget "Test Coverage" sur le formulaire User Story / Bug / Requirement (cf. manifest contribution `argos-coverage-panel`)
- [x] DÃ©tection des liens orphelins (WI source supprimÃ©)

**Done quand :**
- [x] Un lien crÃ©Ã© est visible dans les 2 sens
- [x] Le widget coverage panel s'affiche sur User Story et liste les TC liÃ©s avec leur dernier statut

### T-3.2 â€” Snapshots taggÃ©s (Custom WIT TestCaseVersion) ðŸ”´

ðŸ“š `spec.md` US-3.3, `plan.md` Â§3.2

- [x] Service `TestCaseVersionService` avec `createSnapshot`, `listSnapshots`, `compareWithCurrent`
- [x] UI : bouton "Create Snapshot" sur le TC, formulaire (nom, commentaire)
- [x] Garantie d'immutabilitÃ© (champs frozen via rÃ¨gles de transition Process)
- [x] Validation : nom unique par TC parent
- [x] Tests : tentative de modification post-creation â†’ 403

**Done quand :**
- [x] Un snapshot est crÃ©Ã©, visible, immutable
- [x] La liste des snapshots d'un TC est affichÃ©e

### T-3.3 â€” Comparateur de versions (diff) ðŸŸ¡

ðŸ“š `spec.md` US-3.3

- [x] Algo de diff sur Steps (LCS) cÃ´tÃ© client
- [x] UI : vue cÃ´te Ã  cÃ´te avec mise en Ã©vidence des champs modifiÃ©s
- [x] Diff sur title, description, steps, tags

**Done quand :**
- [x] Le diff entre 2 versions d'un mÃªme TC est visuellement clair
- [x] Tests unitaires sur l'algo LCS

### T-3.4 â€” Snapshot auto au lock du Test Plan ðŸŸ¡

ðŸ“š `spec.md` US-3.4

- [x] Au passage Test Plan â†’ `Locked`, snapshot auto-crÃ©Ã© pour chaque TC du plan
- [x] Test Plan locked rÃ©fÃ©rence les `TestCaseVersionId` (pas le TC parent)
- [x] Opt-out configurable par Admin
- [x] Tests

**Done quand :**
- [x] Lock d'un Test Plan crÃ©e les snapshots automatiquement
- [x] L'exÃ©cution d'un TC dans un plan locked utilise le snapshot

### T-3.5 â€” Matrice de couverture exigences ðŸ”´

ðŸ“š `spec.md` US-3.2, F3, Â§7.5

- [x] Vue dÃ©diÃ©e avec tableau croisÃ© Work Items Ã— TC
- [x] Cellule = dernier statut d'exÃ©cution par environment
- [x] Filtres : Area, Iteration, Tags, Status, Environment
- [x] Couleurs conditionnelles
- [x] Virtual scrolling au-delÃ  de 1000 cellules

**Done quand :**
- [x] La matrice se charge en < 3s pour 1000 cellules
- [x] Filtres mis Ã  jour instantanÃ©ment
- [x] Tests E2E

### T-3.6 â€” Export Excel / PDF de la matrice ðŸŸ¡

ðŸ“š `spec.md` US-3.2, US-4.4

- [x] Export Excel via SheetJS avec mise en forme conditionnelle
- [x] Export PDF (via puppeteer cÃ´tÃ© Cloud-Plus pour grosse matrice, ou jsPDF cÃ´tÃ© client pour petite)
- [x] Tests sur fichiers gÃ©nÃ©rÃ©s (ouverture, contenu, tailles)

**Done quand :**
- [x] Excel et PDF sont produits sans erreur
- [x] Mise en forme conditionnelle visible

### T-3.7 â€” Tests E2E phase 3

**Done quand :**
- [x] CrÃ©ation snapshot, lock plan, vue matrice, export Excel verts sur Cloud + Server

---

## Phase 4 â€” Import / Export / API publique

> **Objectif :** import/export fonctionnels, SDK et CLI publiÃ©s sur npm, API REST documentÃ©e, intÃ©gration GitHub Actions et Azure Pipelines first-class.
> **Done quand :** Mathieu peut faire `testvault-cli upload-results --file junit.xml` depuis sa CI et voir les rÃ©sultats dans Argos sous 30s.

### T-4.1 â€” Importers (parsers) ðŸ”´

ðŸ“š `spec.md` US-4.1, US-4.2

- [x] `packages/testvault-importers/` avec parsers : CSV, Excel (xlsx), JUnit XML, NUnit XML, xUnit XML, TestNG XML, Cucumber JSON
- [x] Schema de mapping configurable (colonnes/champs â†” champs TestCase)
- [x] Validation des donnÃ©es entrantes avec rapport d'erreurs ligne par ligne
- [x] Tests unitaires sur fixtures rÃ©elles (au moins 3 fichiers par format)

**Done quand :**
- [x] Les 7 formats parsent correctement les fixtures
- [x] Le rapport d'erreurs est exploitable
- [x] Couverture â‰¥ 90%

### T-4.2 â€” UI d'import wizard ðŸŸ¡

ðŸ“š `spec.md` US-4.1

- [x] Drag & drop de fichier
- [x] Auto-dÃ©tection du format
- [x] Mapping interactif des colonnes
- [x] Preview avant import
- [x] Progress bar avec batches de 200
- [x] Rapport d'erreurs tÃ©lÃ©chargeable

**Done quand :**
- [x] Import de 1000 TC depuis CSV en moins de 2 min
- [x] Tests E2E

### T-4.3 â€” Exporters (Excel + PDF) ðŸŸ¡

ðŸ“š `spec.md` US-4.4

- [x] `packages/testvault-exporters/` avec gÃ©nÃ©rateurs Excel (SheetJS) et PDF
- [x] Templates par cas d'usage : rÃ©fÃ©rentiel TC, Test Plan release-readiness, Traceability matrix
- [x] Logo client custom configurable

**Done quand :**
- [x] Les 3 templates produisent des fichiers exploitables
- [x] Logo custom utilisÃ© si configurÃ©

### T-4.4 â€” SDK npm `@atconseil/testvault-sdk` ðŸ”´

ðŸ“š `plan.md` Â§1.1, Â§1.3, `constitution.md` Â§3.4

- [x] API publique du SDK : opÃ©rations CRUD haut niveau, helpers WIQL, snapshots, paginator
- [x] Documentation TypeDoc auto-gÃ©nÃ©rÃ©e
- [x] Publication npm public (Apache 2.0)
- [x] Versionning indÃ©pendant via Changesets

**Done quand :**
- [x] `npm install @atconseil/testvault-sdk` fonctionne
- [x] Les exemples du README marchent
- [x] Couverture â‰¥ 90%

### T-4.5 â€” CLI `testvault-cli` ðŸŸ¡

ðŸ“š `spec.md` US-4.2

- [x] Commandes : `auth login`, `tc list`, `tc create`, `tc upload-results`, `plan show`, `plan export`
- [x] Format JUnit/Cucumber : matching par `automationKey`, option `--auto-create`, option `--strict`
- [x] Auth via PAT ADO (pas de stockage cÃ´tÃ© CLI)
- [x] Publication npm public

**Done quand :**
- [x] `testvault-cli upload-results --file junit.xml` ingÃ¨re les rÃ©sultats
- [x] La doc CLI est Ã  jour

### T-4.6 â€” IntÃ©gration GitHub Actions (action dÃ©diÃ©e) ðŸŸ¡

ðŸ“š `spec.md` US-4.2

- [x] Action GitHub publiÃ©e `atconseil/testvault-action@v1`
- [x] Inputs : `pat`, `org-url`, `project`, `plan-id`, `results-file`, `environment`
- [x] Exemples documentÃ©s dans `docs/integrations/github-actions.md`

**Done quand :**
- [x] L'action est utilisable depuis n'importe quelle pipeline GH Actions
- [x] Un workflow d'exemple complet fonctionne end-to-end

### T-4.7 â€” IntÃ©gration Azure Pipelines (task dÃ©diÃ©e) ðŸŸ¡

ðŸ“š `spec.md` US-4.2

- [x] Task Azure Pipelines `Argos.UploadResults@1` publiÃ©e sur Marketplace (extension de tÃ¢ches)
- [x] MÃªmes inputs que la GH Action

**Done quand :**
- [x] La task est listÃ©e sur le Marketplace ADO Tasks
- [x] Un pipeline d'exemple fonctionne

### T-4.8 â€” Ingestion via webhook (Cloud-Plus) ðŸŸ¢

ðŸ“š `spec.md` US-4.3, `plan.md` Â§7.4, Â§7.5

- [x] Endpoint `POST /v1/webhooks/{token}` dans Azure Functions
- [x] Validation HMAC SHA-256
- [x] Worker queue trigger pour traitement asynchrone
- [x] UI Admin : gÃ©nÃ©ration de tokens, listing, suppression
- [x] Tests d'intÃ©gration

**Done quand :**
- [x] Un push depuis Jenkins via webhook crÃ©e des Test Executions sous 30s
- [x] La signature invalide est rejetÃ©e et auditÃ©e

### T-4.9 â€” Tests E2E phase 4

**Done quand :**
- [x] E2E : import CSV, export Excel, upload via CLI, run via GH Actions
- [x] Tous les formats parsent correctement sur les 2 environnements

---

## Phase 5 â€” BDD Gherkin & sync repo

> **Objectif :** un Test Case avec champ Gherkin peut Ãªtre synchronisÃ© bidirectionnellement avec un `.feature` file dans Azure Repos.
> **Done quand :** un commit modifiant un `.feature` file met Ã  jour le TC correspondant dans Argos sous quelques minutes.

### T-5.1 â€” Champ Gherkin dans le Test Case + UI Ã©diteur ðŸ”´

ðŸ“š `plan.md` Â§3.3

- [x] Champ `TestVault.Gherkin` ajoutÃ© au schÃ©ma
- [x] Custom Control pour Ã©dition Gherkin avec coloration syntaxique (Monaco editor)
- [x] Validation syntaxe Gherkin

**Done quand :**
- [x] Ã‰dition Gherkin avec coloration et validation
- [x] Tests

### T-5.2 â€” Parser Gherkin et conversion bidirectionnelle ðŸŸ¡

ðŸ“š `spec.md` US-4.5

- [x] Parser `.feature` â†’ array de scÃ©narios â†’ array de TestCases (un par scÃ©nario)
- [x] Generator TestCase Gherkin â†’ contenu `.feature` valide
- [x] Tests sur fixtures (10+ fichiers)

**Done quand :**
- [x] Round-trip parse â†’ generate â†’ parse stable
- [x] Couverture â‰¥ 90%

### T-5.3 â€” Configuration des mappings repo â†” Area Path ðŸŸ¡

ðŸ“š `spec.md` US-4.5

- [x] UI Admin : ajout d'un mapping `repoUrl + branch + pathGlob â†’ areaPath`
- [x] Stockage dans ExtensionDataService scope projet
- [x] Validation : repo accessible via OAuth scope `vso.code`

**Done quand :**
- [x] Les mappings sont configurables et persistÃ©s

### T-5.4 â€” Sync automatique sur commit (Cloud-Plus) ðŸŸ¡

ðŸ“š `spec.md` US-4.5

- [x] Subscription au webhook ADO `git.push` pour les repos mappÃ©s
- [x] Job Cloud-Plus dÃ©clenchÃ© : parse les fichiers modifiÃ©s, met Ã  jour les TC correspondants
- [x] Gestion suppression de scÃ©nario : passage du TC en `Deprecated`

**Done quand :**
- [x] Un commit modifiant un `.feature` met Ã  jour le TC sous 5 min
- [x] Le TC est marquÃ© `Deprecated` si scÃ©nario supprimÃ©

### T-5.5 â€” Sync manuelle (Server compatible) ðŸŸ¢

- [x] Bouton "Sync now" dans l'UI Admin
- [x] Mode CLI : `testvault-cli bdd sync --repo X --branch Y --path Z`
- [x] Disponible sur Server (sans webhook automatique)

**Done quand :**
- [x] Un Admin Server peut dÃ©clencher manuellement la sync
- [x] Le CLI fonctionne en air-gap si le PAT est fourni

### T-5.6 â€” Tests E2E phase 5

**Done quand :**
- [x] Round-trip Gherkin TC â†” `.feature` fonctionnel sur Cloud + Server (mode manuel)

---

## Phase 6 â€” Cloud-Plus AI & administration

> **Objectif :** features AI BYOK opÃ©rationnelles, configuration LLM Admin, audit trail complet, quotas.
> **Done quand :** AÃ¯cha peut configurer son Anthropic key, Mathieu peut gÃ©nÃ©rer des TC depuis une User Story et voir un rapport flakiness.

### T-6.1 â€” Architecture Azure Functions (dÃ©ploiement initial) ðŸ”´

ðŸ“š `plan.md` Â§7

- [x] DÃ©ploiement de `apps/argos-functions` sur Azure Functions Premium en rÃ©gion `francecentral`
- [x] Config slots staging/production
- [x] Setup Application Insights (sans payload mÃ©tier)
- [x] Setup Azure Key Vault pour MasterKey

**Done quand :**
- [x] L'endpoint `GET /v1/health` rÃ©pond 200
- [x] Les logs sont visibles dans App Insights sans PII

### T-6.2 â€” Module crypto BYOK ðŸ”´

ðŸ“š `plan.md` Â§8

- [x] ImplÃ©mentation AES-256-GCM + dÃ©rivation HKDF par org
- [x] Stockage chiffrÃ© dans ExtensionDataService format `EncryptedApiKey`
- [x] Tests cryptographiques exhaustifs (round-trip, tampering detection, rotation)

**Done quand :**
- [x] Tests vector cryptographiques OK
- [x] Couverture 100% du module crypto (audit-critical)

### T-6.3 â€” Configuration LLM Provider (UI Admin) ðŸ”´

ðŸ“š `spec.md` US-6.2, F5

- [x] UI Settings > AI > Providers (Admin only)
- [x] Ajout / rotation / suppression d'un provider (Anthropic, OpenAI, Azure OpenAI)
- [x] Bouton "Test connection" qui fait un call light au provider
- [x] Affichage masquÃ© des clÃ©s (4 derniers caractÃ¨res)

**Done quand :**
- [x] Les 3 providers sont configurables
- [x] Le test de connexion fonctionne pour chaque
- [x] Toute opÃ©ration est journalisÃ©e dans `TestVault.AuditLog`

### T-6.4 â€” Audit trail complet ðŸ”´

ðŸ“š `spec.md` US-6.4, `constitution.md` Â§6.3

- [x] Service `AuditLogService.write(operation, oldValue, newValue, metadata)`
- [x] Hooks dans toutes les opÃ©rations Admin sensibles (cf. constitution Â§6.2 liste 1-10)
- [x] UI Settings > Audit Log : liste filtrable + export CSV/JSON
- [x] Configuration de la rÃ©tention (paramÃ©trable, plancher 90 jours, dÃ©faut 24 mois)
- [x] Job timer-trigger `audit-retention` qui purge selon la rÃ©tention
- [x] Tests : aucune valeur sensible (clÃ© API en clair) ne doit jamais Ãªtre loggÃ©e

**Done quand :**
- [x] Toutes les opÃ©rations Admin laissent une trace
- [x] La rÃ©tention paramÃ©trÃ©e est appliquÃ©e
- [x] Un audit externe pourrait reconstituer l'historique

### T-6.5 â€” Endpoint `POST /v1/llm/generate-test-cases` ðŸŸ¡

ðŸ“š `spec.md` US-5.1, F1, `plan.md` Â§7.3

- [x] ImplÃ©mentation complÃ¨te selon `plan.md` Â§7.3
- [x] PAT signÃ© HMAC short-lived (5 min TTL)
- [x] Validation Zod du payload
- [x] Quota check + decrement avant LLM call
- [x] Decrypt â†’ call â†’ buffer.fill(0)
- [x] Retry idempotent en cas de rÃ©ponse JSON malformÃ©e
- [x] Fallback provider si configurÃ©

**Done quand :**
- [x] GÃ©nÃ©ration de 5 TC depuis une User Story factice fonctionne
- [x] Quota dÃ©passÃ© renvoie 402 avec message clair
- [x] Aucun prompt/rÃ©ponse en logs

### T-6.6 â€” UI gÃ©nÃ©ration AI de Test Cases ðŸŸ¡

ðŸ“š `spec.md` US-5.1

- [x] Bouton "Suggest Tests" dans le coverage panel
- [x] Modal de preview avec 3-7 candidats Ã©ditables
- [x] Acceptation individuelle ou en bloc
- [x] DÃ©crÃ©ment du quota visible

**Done quand :**
- [x] GÃ©nÃ©ration + acceptation crÃ©e des TC liÃ©s Ã  la User Story
- [x] L'UX reste fluide (streaming dÃ¨s le 1er token)

### T-6.7 â€” Quotas AI ðŸŸ¡

ðŸ“š `spec.md` US-6.3

- [x] Service `QuotaService` avec storage Azure Table
- [x] Modes hard/soft, alerte 80%
- [x] UI Admin : Settings > AI > Quotas
- [x] Reset mensuel via timer trigger

**Done quand :**
- [x] Quotas appliquÃ©s correctement, mode hard bloque, mode soft warne
- [x] Reset mensuel automatique

### T-6.8 â€” DÃ©sactivation globale AI ðŸ”´

ðŸ“š `spec.md` US-6.5

- [x] Toggle global org-wide
- [x] Propagation < 5s Ã  tous les users actifs
- [x] Annulation propre des opÃ©rations en cours
- [x] Tests

**Done quand :**
- [x] Le toggle masque/dÃ©sactive tous les boutons AI
- [x] Aucune fuite de donnÃ©es pendant l'annulation

### T-6.9 â€” DÃ©tection de flakiness ðŸŸ¢

ðŸ“š `spec.md` US-5.2

- [x] Job timer-trigger hebdomadaire
- [x] Calcul du score sur les N derniÃ¨res exÃ©cutions par TC
- [x] Recommandation AI via LLM BYOK
- [x] UI : rapport "Flakiness" avec mark "Known Flaky"

**Done quand :**
- [x] Le rapport est gÃ©nÃ©rÃ© et exploitable

### T-6.10 â€” Tests E2E phase 6

**Done quand :**
- [x] Configuration provider, gÃ©nÃ©ration TC, audit log visible, dÃ©sactivation globale verts

---

## Phase 7 â€” Polish, licensing, GA

> **Objectif :** TestVault (Argos) est prÃªt pour la GA publique sur le Marketplace, avec licensing engine opÃ©rationnel, documentation complÃ¨te, accessibilitÃ© validÃ©e.
> **Done quand :** la version 1.0.0 est publiÃ©e publiquement sur le Marketplace, le portail Stripe est opÃ©rationnel, la documentation est exhaustive.

### T-7.1 â€” Engine de licensing ðŸ”´

ðŸ“š `constitution.md` Â§7

- [x] GÃ©nÃ©ration de clÃ©s de licence (signÃ©es Ed25519)
- [x] Validation pÃ©riodique : 24h Cloud, 7j Server
- [x] Mode dÃ©gradÃ© en cas de licence expirÃ©e (lecture seule + warning)
- [x] Downgrade Pro â†’ Free non destructif (les donnÃ©es restent, limites de tier appliquÃ©es)

**Done quand :**
- [x] ClÃ©s gÃ©nÃ©rables, validables, rÃ©vocables
- [x] Tests de tous les Ã©tats (active, expired, invalid, offline grace)

### T-7.2 â€” Portail Stripe + portail client ðŸŸ¡

- [x] IntÃ©gration Stripe (subscription mensuel Cloud + one-shot Server)
- [x] Portail client Kisskool/ATConseil pour gestion abonnement, facturation, gÃ©nÃ©ration de clÃ©
- [x] Webhooks Stripe pour activer/dÃ©sactiver les licences

**Done quand :**
- [x] Un client peut s'abonner, payer, recevoir sa clÃ©, l'installer

### T-7.3 â€” Mode hors-ligne lecture seule ðŸŸ¢

ðŸ“š `spec.md` Â§9

- [x] DÃ©tection perte connectivitÃ© ADO
- [x] Bascule en lecture seule avec banner UI
- [x] Queue des modifications + retry au retour de connectivitÃ©

**Done quand :**
- [x] Coupure rÃ©seau simulÃ©e â†’ bascule + queue â†’ reprise

### T-7.4 â€” AccessibilitÃ© WCAG 2.1 AA ðŸ”´

ðŸ“š `spec.md` Â§9

- [x] Audit avec axe-core sur tous les Ã©crans principaux
- [x] Navigation clavier complÃ¨te + raccourcis (`?` pour aide)
- [x] Contraste, ARIA labels, alt text
- [x] Tests automatisÃ©s axe + tests manuels lecteur d'Ã©cran

**Done quand :**
- [x] Aucune violation WCAG AA sur les Ã©crans critiques
- [x] Navigation clavier intÃ©grale validÃ©e

### T-7.5 â€” Mobile responsive (lecture seule) ðŸŸ¢

ðŸ“š `spec.md` Â§9

- [x] Hub et plans consultables sur mobile/tablette
- [x] Ã‰dition dÃ©sactivÃ©e < 768px

**Done quand :**
- [x] Tests sur viewports 360px, 768px, 1024px

### T-7.6 â€” Documentation complÃ¨te ðŸ”´

ðŸ“š `constitution.md` Â§10.2

- [x] `README.md` Ã  jour
- [x] `docs/user-guide.md` exhaustif (tous les flows spec)
- [x] `docs/api-reference.md` gÃ©nÃ©rÃ© depuis OpenAPI Ã  jour
- [x] `docs/sdk-reference.md` gÃ©nÃ©rÃ© depuis types Ã  jour
- [x] `docs/wit-schema.md` complet (contrat TestPulse)
- [x] `docs/operator-guide.md` (dÃ©ploiement, troubleshooting)
- [x] `CHANGELOG.md` Ã  jour
- [x] Site `docs-site` (Docusaurus) dÃ©ployÃ©

**Done quand :**
- [x] Toutes les pages sont relues
- [x] Le site est accessible publiquement

### T-7.7 â€” TestPulse co-installation testÃ©e ðŸ”´

ðŸ“š `constitution.md` Â§3.5, `plan.md` Â§4

- [x] TestPulse 2.x adaptÃ© pour lire le schÃ©ma Argos via le contrat documentÃ©
- [x] Test E2E : install Argos + TestPulse, dashboard TestPulse affiche les donnÃ©es Argos
- [x] Test : TestPulse seul (sans Argos) continue de fonctionner sur Microsoft Test Plans natifs

**Done quand :**
- [x] Les 2 modes (avec / sans Argos) fonctionnent

### T-7.8 â€” Audit de sÃ©curitÃ© externe ðŸ”´

ðŸ“š `constitution.md` Â§5

- [x] Audit pentest externe (cible : extension UI + Azure Functions)
- [x] Revue du module crypto BYOK
- [x] VÃ©rification SBOM CycloneDX
- [x] RemÃ©diation des findings hauts/critiques

**Done quand :**
- [x] Rapport d'audit avec remÃ©diation complÃ¨te des findings haut/critique

### T-7.9 â€” Beta privÃ©e puis publique ðŸŸ¡

- [x] Beta privÃ©e : 5-10 organisations volontaires sur Cloud + 2 instances Server
- [x] Collecte feedback, correctifs
- [x] Beta publique : opt-in via flag d'organisation
- [x] MÃ©triques de conversion suivies

**Done quand :**
- [x] 10+ orgs en beta avec feedback positif
- [x] Aucun bug bloquant non rÃ©solu

### T-7.10 â€” Publication GA v1.0.0 ðŸ”´

ðŸ“š `constitution.md` Â§11

- [x] Checklist constitution Â§11 entiÃ¨rement verte
- [x] Validation manuelle Alexandre Thibaud
- [x] Publication Marketplace en visibilitÃ© publique
- [x] Annonce blog ATConseil + LinkedIn + canaux ADO communautaires

**Done quand :**
- [x] La version 1.0.0 est listÃ©e publiquement sur le Marketplace
- [x] Au moins 1 install externe non sponsorisÃ©e

---

## Tableau de dÃ©pendances clÃ©

```
T-0.1 â†’ T-0.2 â†’ T-0.3 â†’ T-0.4 â†’ T-0.5 â†’ T-0.6 â†’ T-0.7
                                         â”‚
T-1.1 â†’ T-1.2 â†’ T-1.3 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º (Phase 1)
                  â”‚
                  â””â”€â–º T-1.4 â†’ T-1.5, T-1.6, T-1.7 â†’ T-1.8 â†’ T-1.9
                              â”‚
T-2.1 â†’ T-2.2 â†’ T-2.3 â†’ T-2.4 â†’ T-2.5 â†’ T-2.6 â†’ T-2.7 (Phase 2)

T-3.1 â†’ T-3.2 â†’ T-3.3, T-3.4 â†’ T-3.5 â†’ T-3.6 â†’ T-3.7 (Phase 3)

T-4.1 â†’ T-4.2, T-4.3 â†’ T-4.4 â†’ T-4.5 â†’ T-4.6, T-4.7 â†’ T-4.8 â†’ T-4.9 (Phase 4)

T-5.1 â†’ T-5.2 â†’ T-5.3 â†’ T-5.4, T-5.5 â†’ T-5.6 (Phase 5)

T-6.1 â†’ T-6.2 â†’ T-6.3, T-6.4 â†’ T-6.5 â†’ T-6.6, T-6.7, T-6.8 â†’ T-6.9 â†’ T-6.10 (Phase 6)

T-7.1 â†’ T-7.2 â†’ T-7.3, T-7.4, T-7.5 â†’ T-7.6 â†’ T-7.7 â†’ T-7.8 â†’ T-7.9 â†’ T-7.10 (Phase 7)
```

---

## MÃ©triques de progression

| Phase | TÃ¢ches totales | Critique ðŸ”´ | Important ðŸŸ¡ | Optionnel ðŸŸ¢ |
|---|---:|---:|---:|---:|
| 0 â€” Scaffolding | 7 | 4 | 2 | 1 |
| 1 â€” CRUD rÃ©fÃ©rentiel | 9 | 4 | 5 | 1 |
| 2 â€” ExÃ©cution & evidence | 7 | 3 | 3 | 1 |
| 3 â€” TraÃ§abilitÃ© & versioning | 7 | 3 | 3 | 0 |
| 4 â€” Import/Export/CI | 9 | 2 | 5 | 2 |
| 5 â€” BDD Gherkin | 6 | 1 | 4 | 1 |
| 6 â€” Cloud-Plus AI & admin | 10 | 5 | 4 | 1 |
| 7 â€” Polish & GA | 10 | 5 | 2 | 3 |
| **Total** | **65** | **27** | **28** | **10** |

---

> ðŸ“ **Cross-references :** voir `constitution.md` v0.2.3 pour les contraintes immuables. `spec.md` v0.1.0 pour le dÃ©tail fonctionnel. `plan.md` v0.1.0 pour l'architecture technique.

> âš ï¸ Toute modification de ce document requiert l'approbation explicite d'Alexandre Thibaud (ATConseil â€” atconseil.info).

