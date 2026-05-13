# Monorepo TestVault -- Plan de Migration

> Document strategique : decisions architecturales validees + plan de migration.
> Genere dans le cadre de TECH-DEBT-015B (2026-05-12).
> Base sur l'inventaire factuel : `Specs/MONOREPO.md` (TECH-DEBT-015A).
> **Aucune execution dans ce document** -- les sprints d'execution sont planifies separement.

---

## Resume executif

Le monorepo TestVault contient actuellement 9 packages prefixes `testvault-*` et un package
`testpulse-ui-shared` dont les noms ne refletent plus la realite produit. Suite a l'inventaire
TECH-DEBT-015A (2026-05-12), 5 observations majeures ont conduit a des decisions architecturales
validees :

1. `testpulse-ui-shared` est en realite l'API publique TestPulse<->Argos (WIT schema reader).
2. `testvault-cli` est destine aux utilisateurs finaux Argos (pipelines CI).
3. `testvault-ui` est un placeholder vide (`export {}`, zero consommateur) -- a supprimer.
4. `argos-functions` est un backend Azure Functions present dans le repo mais non deploye.
5. Le versioning est desaligne : tous les packages internes sont a `0.3.2`, `argos-extension` a `0.4.7`.

**Decision centrale** : renommer le portfolio en `argos-*` pour coheherence avec le produit Argos,
supprimer le code mort (`testvault-ui`), formaliser l'API publique TestPulse<->Argos sous le nom
`argos-detection-api`, et adopter une strategie de versioning hybride par groupe.

**Perimeter de ce document** : decisions + plan. Aucune execution ici.

---

## 1. Decisions architecturales validees

### 1.1 Couplage Argos <-> TestPulse : Pattern A (faible)

**Decision** : Argos et TestPulse sont 2 produits independants. Leur couplage est faible et unidirectionnel.

- Argos et TestPulse sont publies sur le Marketplace ADO sous des publishers distincts
  (`AlexThibaud` pour Argos, `ATConseil` pour TestPulse).
- Aucun couplage en runtime : les deux extensions fonctionnent independamment.
- TestPulse externe (autre repo Github) utilise une API publique pour :
  - Detecter si Argos est installe dans une organisation ADO (`isArgosInstalled`)
  - Lire la liste des Work Item Types TestVault disponibles (`listWorkItemTypes`)
  - Lire les champs d'un WIT donne (`getFields`)
- Cette API publique = le package actuellement nomme `@atconseil/testpulse-ui-shared`,
  a renommer en `@atconseil/argos-detection-api`.

**Justification du pattern A** : pas de package partage charge dans les deux extensions en runtime.
Le decouplage garantit qu'une mise a jour Argos ne casse pas TestPulse (et vice-versa).

### 1.2 Strategie de versioning : C-hybride (par groupe)

**Decision** : versioning en 3 groupes distincts, implementes via Changesets.

**Groupe 1 -- Couche interne (versions unifiees avec argos-extension)**

Ces packages sont des dependances internes d'`argos-extension`. Ils sont bumpes en meme temps
que l'extension. Configuration Changesets : mode `fixed`.

| Package actuel | Package cible |
|---|---|
| `@atconseil/testvault-sdk` | `@atconseil/argos-sdk` |
| `@atconseil/testvault-types` | `@atconseil/argos-types` |
| `@atconseil/testvault-importers` | `@atconseil/argos-importers` |
| `@atconseil/testvault-exporters` | `@atconseil/argos-exporters` |
| `@atconseil/testvault-gherkin` | `@atconseil/argos-gherkin` |
| `@atconseil/testvault-wit-schema` | `@atconseil/argos-wit-schema` |

**Groupe 2 -- Couche publique (versions independantes, publication npm)**

Ces packages ont des cycles de vie independants et sont destines a des consommateurs exterieurs.
Configuration Changesets : mode `independent`.

| Package actuel | Package cible | Statut publication cible |
|---|---|---|
| `@atconseil/testvault-cli` | `@atconseil/argos-cli` | A publier npm (sprint dedie futur) |
| `@atconseil/testpulse-ui-shared` | `@atconseil/argos-detection-api` | A publier npm (sprint dedie futur) |

**Groupe 3 -- Backend (versions independantes, deploiement Azure separe)**

| Package actuel | Package cible | Statut |
|---|---|---|
| `argos-functions` | `argos-functions` (inchange) | Pas publie npm -- deploiement Azure Functions |

**Implementation** : la configuration `.changeset/config.json` sera mise a jour lors du
Sprint 8 (post-renaming) pour formaliser les groupes `fixed` et `independent`.

### 1.3 Localisation `argos-detection-api`

**Decision** : le package reste dans le repo TestVault. Pas d'extraction vers un repo dedie.

Justification : pour un projet solo, le monorepo est plus simple a gouverner. La publication npm
decouple suffisamment les consommateurs externes (TestPulse, futurs tiers).

### 1.4 Nommage cible des packages

| Nom actuel | Nom cible | Groupe | private | Statut publication cible |
|---|---|---|---|---|
| `@atconseil/testvault-types` | `@atconseil/argos-types` | 1 (interne) | false | Pas publie npm (futur possible) |
| `@atconseil/testvault-wit-schema` | `@atconseil/argos-wit-schema` | 1 (interne) | true | N/A |
| `@atconseil/testvault-sdk` | `@atconseil/argos-sdk` | 1 (interne) | false | Pas publie npm (futur possible) |
| `@atconseil/testvault-importers` | `@atconseil/argos-importers` | 1 (interne) | true | N/A |
| `@atconseil/testvault-exporters` | `@atconseil/argos-exporters` | 1 (interne) | true | N/A |
| `@atconseil/testvault-gherkin` | `@atconseil/argos-gherkin` | 1 (interne) | false | Pas publie npm (futur possible) |
| `@atconseil/testvault-cli` | `@atconseil/argos-cli` | 2 (publique) | false | A publier npm (Sprint 9 futur) |
| `@atconseil/testpulse-ui-shared` | `@atconseil/argos-detection-api` | 2 (publique) | true->false | A publier npm (Sprint 9 futur) |
| `@atconseil/testvault-ui` | (supprime) | N/A | N/A | N/A |
| `argos-functions` | `argos-functions` (inchange) | 3 (backend) | true | N/A |
| `argosTesting` (argos-extension) | `argosTesting` (inchange) | N/A | false | Marketplace VSIX |

**Note critique** : `argosTesting` (champ `name` dans `apps/argos-extension/package.json`) reste
inchange. Ce nom est lie a l'extensionId Marketplace (`ArgosTesting`) qui ne peut plus etre renomme
apres publication initiale -- Microsoft interdit le renommage d'un extensionId publie.

**Note sur les prefixes dossiers** : les dossiers `packages/testvault-*` seront renommes en
`packages/argos-*` lors des sprints d'execution. Le dossier `packages/testpulse-ui-shared`
devient `packages/argos-detection-api`.

### 1.5 Repo Github : maintenu sous `AlexThibaud1976/TestVault`

**Decision** : le repo Github garde son nom actuel. Pas de renommage du repo.

Justification : renommer le repo casserait les URL externes, les CI workflows, les references
de documentation, les webhooks. Le nom "TestVault" devient le nom technique du monorepo Argos
(frontend + packages internes + CLI + API publique + backend). Le cout/benefice est defavorable.

### 1.6 Suppression de code mort

**Decision** : 3 elements a supprimer/nettoyer dans les sprints d'execution.

- **`@atconseil/testvault-ui`** (dossier `packages/testvault-ui`) : a supprimer.
  Contenu : un seul fichier `src/index.ts` avec `export {}`. Zero consommateur interne.
  Le dossier `dist/` (build artifact) et `package.json` sont aussi supprimes.

- **`dist/` a la racine** : a supprimer. Artefact de build/debug non reference dans
  `pnpm-workspace.yaml`. Probablement un VSIX de debug.

- **`vsix-debug-3.2/` a la racine** : a supprimer. Artefact de debug Sprint 3.2.
  Non reference dans `pnpm-workspace.yaml`.

### 1.7 `apps/docs-site` : decision differee

**Decision** : conserver `apps/docs-site` tel quel pour l'instant. Decision differee.

Etat actuel : placeholder vide (scripts = commandes `echo`, pas de `src/`). Un site de doc
sera cree si et quand la priorite produit le justifie. Inscrire au backlog comme TECH-DEBT-019.

### 1.8 Packages dans tools/* (added 2026-05-13)

TECH-DEBT-015A initial avait omis les 3 packages dans `tools/*` qui font partie du workspace pnpm.
Decision pour chacun :

| Package | Decision | Sprint dedie |
| --- | --- | --- |
| `@atconseil/testvault-azure-pipelines-task` | A renommer en `@atconseil/argos-azure-pipelines-task` | **Sprint 6g** |
| `@atconseil/testvault-e2e` | A renommer en `@atconseil/argos-e2e` | **Sprint 6h** |
| `@atconseil/regression-suite` | Pas a renommer (already argos-agnostic) | N/A |

**Note importante sur testvault-e2e** : ce package depend de 5 packages testvault-*
(cli, exporters, gherkin, importers, sdk). Donc **chaque Sprint 6c a 7a doit aussi mettre
a jour `tools/e2e/package.json`** :

- Sprint 6c (`testvault-sdk` -> `argos-sdk`) : update `tools/e2e/package.json`
- Sprint 6d (`testvault-importers` -> `argos-importers`) : update `tools/e2e/package.json`
- Sprint 6e (`testvault-exporters` -> `argos-exporters`) : update `tools/e2e/package.json` (noter : `workspace:^` a conserver)
- Sprint 6f (`testvault-gherkin` -> `argos-gherkin`) : update `tools/e2e/package.json`
- Sprint 7a (`testvault-cli` -> `argos-cli`) : update `tools/e2e/package.json`

### 1.9 Dossiers utilitaires dans tools/* (added 2026-05-14)

Inventaire complet revele lors de l'investigation Sprint 7a. 5 dossiers presents dans `tools/`
mais sans package.json :

| Dossier | Decision | Sprint dedie |
|---|---|---|
| `tools/testvault-action/` | Renommer en `tools/argos-action/`, aligner avec rebrand argos | **Sprint 7d (NEW)** |
| `tools/preflight/` | Garder tel quel (deja argos-agnostic) | N/A |
| `tools/claude-prompts/` | Garder tel quel | N/A |
| `tools/load-testing/` | Garder placeholder, activer Phase 7 | N/A |
| `tools/migration-scripts/` | Garder placeholder, activer si migration WIT majeure | N/A |

**Sprint 7d -- testvault-action -> argos-action** :

- Dossier : `tools/testvault-action/` -> `tools/argos-action/`
- `action.yml` : `name:` mettre a jour vers `"Argos - Upload CI Results"` (em-dash -> tiret simple, plus neutre)
- `action.yml` : variables d'env `TESTVAULT_*` -> `ARGOS_*` (lignes 60-62)
- `action.yml` : install `@atconseil/testvault-cli` -> `@atconseil/argos-cli` (ligne 55)
- `action.yml` : `testvault tc upload-results` -> `argos tc upload-results` (ligne 68)
- `docs/integrations/github-actions.md` : mise a jour exemples utilisateur
- **Prerequis** : Sprint 7a (rename CLI + binaire) doit etre fait AVANT Sprint 7d

**Sprint 7d planifie apres Sprint 7a, 7b et 6g/7c**.

---

## 2. Mapping de migration detaille

### 2.1 Renommage Groupe 1 (couche interne)

Sequence d'execution recommandee -- descendante (de la racine des dependances vers les
consommateurs) pour que chaque phase ne casse rien.

```
Phase 1 : testvault-types -> argos-types
  Consommateurs impactes : testvault-wit-schema, testvault-sdk, testvault-importers,
                           testvault-exporters, testvault-gherkin, testvault-ui,
                           testvault-cli, testpulse-ui-shared, argos-extension,
                           argos-functions
  Impact code : 10 package.json a updater + tous les imports @atconseil/testvault-types

Phase 2 : testvault-wit-schema -> argos-wit-schema
  Consommateurs impactes : testvault-sdk (unique)
  Impact code : 1 package.json + imports dans testvault-sdk

Phase 3 : testvault-sdk -> argos-sdk
  Consommateurs impactes : testvault-exporters, testvault-cli, argos-extension, argos-functions
  Impact code : 4 package.json + leurs imports

Phase 4 : testvault-importers -> argos-importers
  Consommateurs impactes : argos-extension, testvault-cli, argos-functions
  Impact code : 3 package.json + leurs imports

Phase 5 : testvault-exporters -> argos-exporters
  Consommateurs impactes : argos-extension, testvault-cli
  Impact code : 2 package.json + leurs imports

Phase 6 : testvault-gherkin -> argos-gherkin
  Consommateurs impactes : argos-extension, testvault-cli, argos-functions
  Impact code : 3 package.json + leurs imports
```

Chaque phase correspond a un sprint d'execution court (~20-30 min) :
1. Renommer le dossier `packages/testvault-X` -> `packages/argos-X`
2. Mettre a jour le champ `name` dans `packages/argos-X/package.json`
3. Mettre a jour les `dependencies` dans tous les consommateurs listes
4. Mettre a jour tous les imports (`@atconseil/testvault-X` -> `@atconseil/argos-X`)
5. `pnpm install` (reflexion workspace)
6. `pnpm turbo lint typecheck test build`
7. Commit + PR

### 2.2 Renommage Groupe 2 (couche publique)

**`testvault-cli` -> `argos-cli`** (Sprint 7a) :
- Renommage dossier + package.json `name`
- Pas de consommateur interne -> impact minimal
- Au-dela du renommage : revue README, decision semver initiale, ajout au workflow CI npm publish

**`testpulse-ui-shared` -> `argos-detection-api`** (Sprint 7b) :
- Renommage dossier + package.json `name`
- Passer `private: true` -> `private: false`
- Documenter l'API publique dans un README dedie (interface `ITestVaultSchemaReader`, usage par TestPulse)
- Pas de consommateur interne -> impact minimal
- Decision semver initiale pour la publication npm

### 2.3 Code mort (Sprints 5a et 5b)

**Sprint 5a -- Suppression `testvault-ui`** :
- `git rm -r packages/testvault-ui`
- Verifier qu'aucun package ne le reference (`grep -r testvault-ui packages/ apps/`)
- Supprimer l'entree de pnpm-workspace.yaml si necessaire (actuellement inclus via `packages/*`)
- Tests regression + lint + build
- Commit + PR

**Sprint 5b -- Cleanup dist/ et vsix-debug-3.2/** :
- `git rm -r dist/ vsix-debug-3.2/`
- Ajouter `dist/` et `vsix-debug-3.2/` a `.gitignore` si pas deja presents
- Tests regression + preflight
- Commit + PR

### 2.4 Versioning realignement (Sprint 8)

Sprint dedie post-renaming :
- Choisir la version initiale du Groupe 1 unifie :
  - Option A : tout passer en `0.4.7` pour aligner avec `argos-extension` actuelle
  - Option B : reset Groupe 1 a `1.0.0` pour marquer la stabilite de l'API interne
  - **Decision a prendre lors du sprint 8** (pas decide dans 015B)
- Choisir les versions initiales Groupe 2 :
  - `argos-cli` : probable `0.1.0` pour la premiere publication npm
  - `argos-detection-api` : probable `0.1.0` ou `1.0.0` (API deja utilisee par TestPulse ?)
  - **Decision a prendre lors du sprint 8**
- Configurer `.changeset/config.json` :
  - `fixed` pour les packages Groupe 1
  - `independent` pour les packages Groupe 2 et Groupe 3

---

## 3. Plan d'execution (sprints futurs)

Le plan suivant fragmente la migration en sprints courts et testables. **Aucun de ces sprints
n'est execute dans 015B** -- ce sont des reservations pour des sessions futures.

| Sprint | Action | Effort estime | Risque | Sequence |
|---|---|---|---|---|
| Sprint 5a | Suppression `packages/testvault-ui` | ~10 min | Tres faible | Premier |
| Sprint 5b | Cleanup `dist/` et `vsix-debug-3.2/` a la racine | ~10 min | Tres faible | Premier |
| Sprint 6a | Renaming `testvault-types` -> `argos-types` | ~45 min | Eleve (9 consommateurs) | **DONE 2026-05-13** |
| Sprint 6b | Renaming `testvault-wit-schema` -> `argos-wit-schema` | ~20 min | Faible (1 consommateur) | **DONE 2026-05-13** (incident corruption index Windows, mitige par exclusion Defender) |
| Sprint 6c | Renaming `testvault-sdk` -> `argos-sdk` | ~45 min | Moyen (5 consommateurs, 47 fichiers source) | **DONE 2026-05-13** |
| Sprint 6d | Renaming `testvault-importers` -> `argos-importers` | ~25 min | Faible (4 consommateurs, 6 fichiers source) | **DONE 2026-05-13** |
| Sprint 6e | Renaming `testvault-exporters` -> `argos-exporters` | ~20 min | Faible (3 consommateurs, 4 fichiers source) | **DONE 2026-05-13** |
| Sprint 6f | Renaming `testvault-gherkin` -> `argos-gherkin` | ~20 min | Faible (4 consommateurs, 5 fichiers source) | **DONE 2026-05-13** -- Jalon : Groupe 1 packages/ 6/8 complet |
| Sprint 6g | Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` | ~30 min | Faible (0 consommateur interne, livrable produit) | Apres 7a |
| Sprint 6h | Renaming `testvault-e2e` -> `argos-e2e` | ~15 min | Faible (0 consommateur, package name only, Option A dossier inchange) | **DONE 2026-05-13** -- Bonus: testvault-sdk ref dans ci-main.yml L98 aussi fixee |
| Sprint 7d | Renaming `tools/testvault-action/` -> `tools/argos-action/` (GitHub Action) | ~25 min | Faible (0 consommateur interne, action composite) | Apres 7a |
| Sprint 7a | Renaming `testvault-cli` -> `argos-cli` | ~30 min | Faible (0 consommateur interne) | Apres Groupe 1 |
| Sprint 7b | Renaming `testpulse-ui-shared` -> `argos-detection-api` | ~30 min | Faible (0 consommateur interne) | Apres Groupe 1 |
| Sprint 8 | Realignement versioning + config Changesets | ~30 min | Moyen (version decisions) | Apres Groupe 1+2 |
| Sprint 9 | Publication npm `argos-cli` et `argos-detection-api` | ~1h | Moyen (config CI, semver, README) | Quand pret commercialement |

**Total renaming + cleanup** : environ 5h sur sprints courts et testables.
La migration peut s'etaler sur plusieurs jours ou semaines selon les priorites produit.

**Chemin critique** : 5a/5b -> 6a -> 6b -> 6c -> (6d, 6e, 6f) -> 6h -> 7a -> (7b, 6g/7c, 7d en parallele apres 7a) -> 8 -> 9.

**Note sur Sprint 6a** : c'est le sprint le plus risque car `testvault-types` est consomme par
tous les autres packages. Le recommander en premier (apres les suppressions triviales) permet
de valider la methode sur le cas le plus complexe avant de continuer.

---

## 4. Garde-fous pour les sprints d'execution

Chaque sprint de renaming doit respecter les regles suivantes sans exception.

1. **Sprint atomique** : un sprint = un package renomme, pas plusieurs en chaine.
   Si un sprint deborde, stopper et ouvrir un second sprint.

2. **TDD** : mettre a jour le test regression qui valide le nom du package AVANT le renaming
   pour qu'il echoue (rouge), puis passer le renaming pour le verdir (vert). Ceci garantit
   que les anciens noms ne sont pas reintroduits.

3. **Grep exhaustif avant commit** : verifier qu'aucun import residuel avec l'ancien nom
   ne subsiste dans le code source.
   ```
   grep -r "@atconseil/testvault-X" packages/ apps/ --include="*.ts" --include="*.tsx" --include="*.json"
   ```

4. **Cross-check pre-flight** : `pnpm preflight` doit passer apres chaque sprint.

5. **Tests CI verts** : `pnpm turbo lint typecheck test build` apres chaque sprint.

6. **CHANGELOG** : entree par sprint avec mapping explicite ancien nom -> nouveau nom.

7. **REGISTRY update** : verifier si des entrees du REGISTRY mentionnent l'ancien nom et les mettre a jour.

8. **Allowlists** : si un chemin mentionne l'ancien nom dans `allowlist.ts` et `allowlist.cjs`,
   le mettre a jour (ou le supprimer si le fichier est supprime).

9. **Spec-kit** : `Specs/constitution.md`, `Specs/spec.md`, `Specs/plan.md`, `Specs/tasks.md`,
   `CLAUDE.md` -- verifier et mettre a jour les references aux anciens noms.

10. **No scope creep** : discipline habituelle. Un sprint de renaming ne refactore pas le code.

---

## 5. Risques identifies

| Risque | Mitigation |
|---|---|
| Imports `@atconseil/testvault-X` oublies dans le code | Grep exhaustif avant chaque commit ; CI typecheck detecte les imports manquants |
| Workspace pnpm casse apres renommage du dossier | `pnpm install` obligatoire apres chaque `git mv` ; verifier avec `pnpm list` |
| Allowlists obsoletes apres renaming | Update systematique `allowlist.ts` et `allowlist.cjs` dans chaque sprint |
| Test regression qui verifie l'ancien nom | Mettre a jour TDD avant le renaming (rouge -> vert) |
| `Specs/` reference l'ancien nom | Grep sur `Specs/*.md` apres chaque sprint ; `CLAUDE.md` et constitution en priorite |
| `tools/preflight/` mentionne `testvault-` | `marketplace-check.md` et `microsoft-docs-snippets.md` a verifier apres Groupe 1 |
| `.changeset/config.json` reference les anciens noms | A updater lors du sprint 8 (post-renaming) |
| Build CI casse par chemin hardcode | Verifier `.github/workflows/*.yml` et `turbo.json` -- ces fichiers ne referencent pas les noms de packages directement |
| tools/* packages oublies dans grep consommateurs | Tout grep doit couvrir `packages/`, `apps/`, ET `tools/`. Verifier explicitement dans chaque sprint 6c-6f que `tools/e2e/package.json` est mis a jour. |
| `argos-functions` depend de `testvault-sdk` (Groupe 1) | Sprint 6c mettra a jour `argos-functions/package.json` en meme temps que les autres consommateurs |
| Version `0.3.2` dans les tests regression | Verifier si des tests assertent des versions specifiques ; mettre a jour lors du Sprint 8 |
| `tools/*` dossiers sans package.json oublies dans inventaire | Tout audit monorepo doit lister TOUS les dossiers (pas juste les packages npm). |
| Mojibake invisible dans .yml / .json | scan-mojibake.cjs (TECH-DEBT-025) doit etre etendu aux .yml et .json pour couvrir action.yml et task.json. |

---

## 6. Decisions reportees

Les elements suivants sont hors scope TECH-DEBT-015B. Ils seront instruits dans TECH-DEBT-015C
(qui suit immediatement) ou dans des TECH-DEBT dedies.

### TECH-DEBT-016 (deja inscrit au backlog)

Strategie pricing Argos. Non instruite dans 015B.

### TECH-DEBT-017 NEW -- Plan de deploiement `argos-functions`

`apps/argos-functions` existe dans le repo (8 modules Azure Functions, ~34 fichiers TypeScript)
mais n'est pas deploye. Le workflow CI ne deploie pas les Functions. Il n'y a pas d'environnement
Azure configure. Ce gap entre le code present et la realite deploiee doit etre instruite dans
un TECH-DEBT dedie. A inscrire en 015C.

### TECH-DEBT-018 NEW -- Decision Stripe

Le module `apps/argos-functions/src/stripe/` contient un `stripe-webhook-handler`. D'apres
les decisions Q3 : "Stripe = prototype, pas pris au serieux". La decision sur le devenir de ce
module (garder, supprimer, refondre dans une vraie infrastructure de billing) est reportee.
A inscrire en 015C.

### TECH-DEBT-019 NEW -- Statut `apps/docs-site`

`apps/docs-site` est un placeholder vide (zero src, scripts = `echo`). La decision de creer
un vrai site de documentation est differee jusqu'a ce que la priorite produit le justifie.
A inscrire en 015C.

### TECH-DEBT-020 NEW -- Versions initiales publication npm

Lors de la publication npm de `argos-cli` et `argos-detection-api` (Sprint 9), la decision
de semver initiale (`0.1.0` vs `1.0.0`) et la configuration du workflow CI de publication npm
doivent etre instruits. A decider lors du Sprint 8 ou d'un TECH-DEBT dedie.

---

## 7. Annexe -- Versions actuelles et cibles

### Etat 2026-05-12 (inventaire MONOREPO.md)

| Package | Version actuelle | Groupe versioning |
|---|---|---|
| `@atconseil/testvault-types` | 0.3.2 | 1 (futur fixe avec argos-extension) |
| `@atconseil/testvault-wit-schema` | 0.3.2 | 1 |
| `@atconseil/testvault-sdk` | 0.3.2 | 1 |
| `@atconseil/testvault-importers` | 0.3.2 | 1 |
| `@atconseil/testvault-exporters` | 0.3.2 | 1 |
| `@atconseil/testvault-gherkin` | 0.3.2 | 1 |
| `@atconseil/testvault-cli` | 0.3.2 | 2 (independant) |
| `@atconseil/testpulse-ui-shared` | 0.3.2 | 2 (independant) |
| `@atconseil/testvault-ui` | 0.3.2 | (a supprimer) |
| `argos-functions` | 0.3.2 | 3 (independant) |
| `argosTesting` (argos-extension) | 0.4.7 | reference Groupe 1 |

### Options de realignement (decision Sprint 8)

**Option A -- Aligner Groupe 1 sur argos-extension**
- Tous les packages Groupe 1 passes de `0.3.2` a `0.4.7` (version actuelle d'argos-extension)
- Avantage : cohesion visuelle immediate dans le monorepo
- Inconvenient : saut de version important pour des packages qui n'ont pas eu de changements majeurs

**Option B -- Reset Groupe 1 a `1.0.0`**
- Tous les packages Groupe 1 passes de `0.3.2` a `1.0.0`
- Avantage : marque la stabilite de l'API interne ; version majeure lisible
- Inconvenient : necessite de choisir entre argos-extension qui reste en `0.4.7`

Decision a prendre lors du Sprint 8 en fonction de la maturite percue de l'API interne.

---

## References

- `Specs/MONOREPO.md` -- inventaire factuel ayant servi de base a ce document (TECH-DEBT-015A)
- `Specs/constitution.md` -- principes non-negociables ; a mettre a jour apres les renaming
- `tools/regression/REGISTRY.md` -- entrees a mettre a jour lors des sprints d'execution
- `tools/regression/allowlist.ts` et `allowlist.cjs` -- a mettre a jour lors des sprints
- `tools/preflight/manifest-check.cjs` -- verifie publisher whitelist ; non affecte par renaming packages
- `.changeset/config.json` -- a configurer lors du Sprint 8
