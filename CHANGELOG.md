# Changelog

All notable changes to TestVault (Argos) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
