# Prompt Claude Code — TECH-DEBT-015A follow-up (`docs/monorepo-inventory-followup`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **documentaire** court (~30 min) : corriger l'incompletude de `Specs/MONOREPO.md` qui n'avait pas inventorie les packages dans `tools/*`.
> Aussi : ajouter 2 sprints au plan migration pour `tools/azure-pipelines-task` et `tools/e2e`.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (`working tree clean`)
- [ ] `git branch --show-current` = `main`
- [ ] `git log --oneline | Select-Object -First 3` montre Sprint 6b merged
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : Sprint 6b a revele que `Specs/MONOREPO.md` (genere par TECH-DEBT-015A) est **incomplet**. Le document inventorie les 9 packages de `packages/` et les 3 apps de `apps/`, mais a oublie les packages dans `tools/*` qui font partie du workspace pnpm.

**Decouvertes Sprint 6b** :
1. **`tools/azure-pipelines-task/`** = `@atconseil/testvault-azure-pipelines-task` v1.0.0
   - Azure DevOps Pipeline Task (dependance : `azure-pipelines-task-lib`)
   - Manifest `task.json` (different de `vss-extension.json`)
   - Cible le Marketplace Azure DevOps Pipeline Tasks (different des extensions hub)
   - Pas de consommateur interne
   - **Livrable produit important** non documente

2. **`tools/e2e/`** = `@atconseil/testvault-e2e` v0.3.3
   - Suite Playwright E2E contre des ADO reels (test:cloud)
   - 11 specs organises par phase (process, test-case, test-set, test-plan, precondition, traceability, import-export-cli, bdd-sync, ai-admin, accessibility, responsive)
   - **Consomme 5 packages** : testvault-{cli, exporters, gherkin, importers, sdk}
   - Reference dans `.github/workflows/ci-main.yml` job `e2e-cloud`
   - 0 consommateur interne (autonome)

3. **`tools/regression/`** = `@atconseil/regression-suite` v0.1.0
   - Suite de tests regression Vitest (47 + 4 = 51 tests)
   - Deja documente partiellement (REGISTRY.md)

**Constat methodologique** : `tools/*` est inclus dans le workspace pnpm via `pnpm-workspace.yaml`, mais TECH-DEBT-015A n'a explore que `packages/*` et `apps/*`. Heritage culturel : on assimile "packages" a "packages/" sans realiser que pnpm englobe aussi tools.

**Perimetre du sprint** :
1. Update `Specs/MONOREPO.md` : ajouter section "Packages dans `tools/`" (inventaire factuel)
2. Update `Specs/MIGRATION-PLAN.md` : ajouter Sprint 6g (azure-pipelines-task) + Sprint 6h (e2e) au plan
3. Update `Specs/MIGRATION-PLAN.md` : ajouter les dependances de `tools/e2e` au tableau Phase 1-6 (chaque sprint 6c-6f impacte aussi tools/e2e)
4. Update `Specs/PHASE-0-GAPS.md` : noter l'observation methodologique
5. CHANGELOG entry minimal
6. **Aucune modification de code, package.json, ou test regression**

**Hors scope** :
- Renaming reel (-> Sprints 6g, 6h dedies futurs)
- Modification fonctionnelle
- Bump version (sprint purement documentaire)

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b docs/monorepo-inventory-followup

pnpm install
```

---

## Etape 1 — Verifier l'etat actuel des 3 packages tools

### 1.1 — Lire les 3 package.json

```powershell
Write-Host "=== tools/azure-pipelines-task ===" -ForegroundColor Cyan
Get-Content tools\azure-pipelines-task\package.json

Write-Host "`n=== tools/e2e ===" -ForegroundColor Cyan
Get-Content tools\e2e\package.json

Write-Host "`n=== tools/regression ===" -ForegroundColor Cyan
Get-Content tools\regression\package.json
```

### 1.2 — Verifier les consommateurs croises

```powershell
# Qui consomme testvault-azure-pipelines-task ?
Write-Host "`n=== Consommateurs testvault-azure-pipelines-task ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "azure-pipelines-task" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-azure-pipelines-task"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}

# Qui consomme testvault-e2e ?
Write-Host "`n=== Consommateurs testvault-e2e ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "tools\\e2e" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-e2e"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}

# Qui consomme regression-suite ?
Write-Host "`n=== Consommateurs regression-suite ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "tools\\regression" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/regression-suite"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
```

**Attendus** :
- testvault-azure-pipelines-task : 0 consommateur
- testvault-e2e : 0 consommateur (consomme 5 packages mais pas consomme)
- regression-suite : 0 consommateur

### 1.3 — Verifier workflow ci-main.yml

```powershell
Get-Content .github\workflows\ci-main.yml | Select-String -Pattern "e2e|azure-pipelines-task" -Context 2,2
```

**Attendu** : reference a `tools/e2e` dans le job `e2e-cloud`.

### 1.4 — Reporter a l'utilisateur

> "Voici l'inventaire factuel des 3 packages tools/. Confirmation avant ecriture des sections MONOREPO.md et MIGRATION-PLAN.md ?"

---

## Etape 2 — Update Specs/MONOREPO.md

### 2.1 — Localiser la section a ajouter

Le document actuel a une section "Annexe — Donnees brutes" en fin. **Inserer une nouvelle section principale** AVANT cette annexe : "Packages dans tools/".

### 2.2 — Structure de la nouvelle section

```markdown
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
- `task.json` -- manifest Azure DevOps Pipeline Task (different de vss-extension.json)

**Dependance externe principale** : `azure-pipelines-task-lib@^4.1.0` (SDK officiel Microsoft pour les Pipeline Tasks)

**Dependances internes** : aucune

**Consommateurs internes** : aucun

**Statut publication** : a verifier. Les Azure Pipeline Tasks se publient via tfx-cli sur le Marketplace Azure DevOps **dans la categorie Pipeline Tasks** (distinct de la categorie Extensions hub utilisee par argosTesting).

**Observation factuelle** : c'est un livrable produit autonome qui permet aux utilisateurs Argos d'integrer une task dans leurs pipelines YAML Azure DevOps (analogue au `testvault-cli` mais natif Pipelines au lieu de CLI generale).

### tools/e2e

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/testvault-e2e` |
| Version | 0.3.3 (note : different de 0.3.2 des autres) |
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

**Note** : `testvault-exporters` est reference en `workspace:^` (caret) tandis que les autres sont en `workspace:*` (n'importe quelle version). Discrepance a noter mais sans impact fonctionnel.

**Consommateurs internes** : aucun (suite de tests autonome)

**Statut publication** : non publie (private: true)

**Reference CI** : utilise dans `.github/workflows/ci-main.yml` job `e2e-cloud` (conditionnel sur secrets `ADO_CLOUD_*`).

### tools/regression

| Champ | Valeur |
|---|---|
| Nom npm | `@atconseil/regression-suite` |
| Version | 0.1.0 |
| private | true |
| Description | (a verifier) |
| Role | Suite de tests regression Vitest |

**Contenu** : 13 fichiers .test.ts couvrant 51 assertions (au 2026-05-13).

**Detail** : voir `tools/regression/REGISTRY.md` pour la liste exhaustive des tests et leur description.

**Dependances internes** : aucune

**Consommateurs internes** : aucun

**Reference CI** : lance par `ci-main.yml` et `ci-pr.yml` via `pnpm --filter @atconseil/regression-suite test`.

**Observation factuelle** : ce package est deja **argos-agnostique** par son nom (`regression-suite` n'a pas de prefixe `testvault-` ou `argos-`). Il n'a pas a etre renomme dans le portfolio migration.
```

### 2.3 — Update section "Vue d'ensemble"

Dans la section initiale "Vue d'ensemble" du document, ajouter les 3 lignes manquantes au tableau :

```diff
  | `tools/regression` | Outils dev | Suite de tests regression (12 fichiers, 47 assertions) |
+ | `tools/azure-pipelines-task` | **Livrable produit** | Azure DevOps Pipeline Task (testvault-azure-pipelines-task v1.0.0) |
+ | `tools/e2e` | Tests | Suite Playwright E2E contre ADO Cloud (testvault-e2e v0.3.3, 11 specs) |
  | `tools/preflight` | Outils dev | Checklist + script auto-validation manifest |
```

Et update le "12 fichiers, 47 assertions" en "13 fichiers, 51 assertions" (post Sprint 6a).

### 2.4 — Update section "Observations factuelles"

Ajouter une observation :

```markdown
11. **TECH-DEBT-015A initial etait incomplet** : 3 packages dans `tools/*` n'avaient pas ete inventories
    initialement (azure-pipelines-task, e2e, regression-suite). Decouvert Sprint 6b lors du grep
    des consommateurs. Cause : assimilation incorrecte "packages monorepo" = "packages/" alors que
    le workspace pnpm englobe aussi `tools/*` via `pnpm-workspace.yaml`. Section ajoutee 2026-05-13.
```

### 2.5 — Update tableau "Carte des dependances internes"

Ajouter les dependances de tools/e2e qui pointe vers 5 packages :

```diff
  argos-functions      -> testvault-gherkin, testvault-importers, testvault-sdk
+ tools/e2e            -> testvault-cli, testvault-exporters (workspace:^), testvault-gherkin, testvault-importers, testvault-sdk
+ tools/azure-pipelines-task -> (aucune dependance interne)
+ tools/regression     -> (aucune dependance interne)
```

### 2.6 — Update section "Statut publication npm"

Ajouter une note sur `testvault-azure-pipelines-task` :

```markdown
- `@atconseil/testvault-azure-pipelines-task` : private:true. **NOTE** : les Azure Pipeline
  Tasks ne se publient PAS sur npm, elles se publient sur le Marketplace Azure DevOps dans
  la categorie Pipeline Tasks via tfx-cli (analogue au VSIX extension). Statut Marketplace
  a verifier dans un sprint dedie.
```

---

## Etape 3 — Update Specs/MIGRATION-PLAN.md

### 3.1 — Ajouter section 1.8

Apres la section 1.7 (apps/docs-site), ajouter :

```markdown
### 1.8 Packages dans tools/* (added 2026-05-13)

TECH-DEBT-015A initial avait omis les 3 packages dans `tools/*` qui font partie du workspace pnpm.
Decision pour chacun :

| Package | Decision | Sprint dedie |
|---|---|---|
| `@atconseil/testvault-azure-pipelines-task` | A renommer en `@atconseil/argos-azure-pipelines-task` (ou nom plus court) | **Sprint 6g** |
| `@atconseil/testvault-e2e` | A renommer en `@atconseil/argos-e2e` | **Sprint 6h** |
| `@atconseil/regression-suite` | Pas a renommer (already argos-agnostic) | N/A |

**Note importante sur testvault-e2e** : ce package depend de 5 autres packages testvault-* (cli, exporters,
gherkin, importers, sdk). Donc **chaque Sprint 6c a 7a doit aussi mettre a jour `tools/e2e/package.json`** :
- Sprint 6c (testvault-sdk -> argos-sdk) : update tools/e2e/package.json
- Sprint 6d (testvault-importers -> argos-importers) : update tools/e2e/package.json
- Sprint 6e (testvault-exporters -> argos-exporters) : update tools/e2e/package.json (note: workspace:^ preserve)
- Sprint 6f (testvault-gherkin -> argos-gherkin) : update tools/e2e/package.json
- Sprint 7a (testvault-cli -> argos-cli) : update tools/e2e/package.json
```

### 3.2 — Update tableau Section 3 (Plan d'execution)

Apres Sprint 6f, ajouter 2 sprints :

```diff
  | Sprint 6f | Renaming `testvault-gherkin` -> `argos-gherkin` | ~20 min | Faible (3 consommateurs) | Apres 6c |
+ | Sprint 6g | Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` | ~30 min | Faible (0 consommateur interne, mais livrable produit) | Apres Groupe 1 |
+ | Sprint 6h | Renaming `testvault-e2e` -> `argos-e2e` | ~20 min | Faible (0 consommateur, mais consomme 5 packages updated) | Apres 6c-6f, 7a |
  | Sprint 7a | Renaming `testvault-cli` -> `argos-cli` | ~30 min | Faible (0 consommateur interne) | Apres Groupe 1 |
```

Et update le chemin critique :

```diff
- **Chemin critique** : 5a/5b -> 6a -> 6b -> 6c -> (6d, 6e, 6f en parallele possible) -> 7a, 7b -> 8 -> 9.
+ **Chemin critique** : 5a/5b -> 6a -> 6b -> 6c -> (6d, 6e, 6f en parallele possible) -> 6g/6h/7a/7b en parallele -> 8 -> 9.
```

### 3.3 — Update Section 5 (Risques)

Ajouter une ligne :

```diff
+ | tools/* packages oublies dans grep consommateurs | TOUT grep doit couvrir packages/, apps/, ET tools/. Verifier explicitement dans chaque sprint 6c-6f que tools/e2e est mis a jour. |
```

### 3.4 — Update Sprint 6b status

Marquer Sprint 6b comme DONE (l'utilisateur l'a deja marque mais verifier) :

```diff
- | Sprint 6b | Renaming `testvault-wit-schema` -> `argos-wit-schema` | ~20 min | Faible (1 consommateur) | **DONE 2026-05-13** |
+ | Sprint 6b | Renaming `testvault-wit-schema` -> `argos-wit-schema` | ~20 min | Faible (1 consommateur) | **DONE 2026-05-13** (Note: incident corruption d'index Windows Defender, mitige par exclusion repo) |
```

---

## Etape 4 — Update Specs/PHASE-0-GAPS.md

### 4.1 — Ajouter observation

Apres la section principale, ajouter :

```markdown
## 6. Observation methodologique (added 2026-05-13)

**TECH-DEBT-015A initial avait deux angles morts** :

1. **`tools/*` non inventorie** : 3 packages dans `tools/` (azure-pipelines-task, e2e, regression-suite)
   font partie du workspace pnpm mais n'avaient pas ete documentes. Decouvert Sprint 6b.
   Correction dans MONOREPO.md section "Packages dans tools/" (added 2026-05-13).

2. **Carte de dependances incomplete** : tools/e2e depend de 5 packages testvault-*, ce qui impacte
   les sprints 6c-6f-7a. Correction dans MIGRATION-PLAN.md section 1.8 et tableau risques (added 2026-05-13).

**Cause racine probable** : assimilation culturelle "packages d'un monorepo" = `packages/` alors que
pnpm-workspace.yaml englobe aussi `apps/*` et `tools/*` via les globs. A noter pour les futurs audits
de monorepo.

**Lecon pour les futurs sprints** :
- Toute commande de grep de consommateurs doit explicitement inclure les 3 dossiers : `packages/`, `apps/`, `tools/`.
- Tout audit de workspace doit commencer par `Get-Content pnpm-workspace.yaml` pour identifier les globs reels.
```

---

## Etape 5 — CHANGELOG entry

Ajouter en haut de `CHANGELOG.md`, sous `[0.4.10]` :

```markdown
## [0.4.11] - 2026-05-13

### Added (TECH-DEBT-015A follow-up - docs/monorepo-inventory-followup)

- **Specs/MONOREPO.md** : nouvelle section "Packages dans tools/" inventoriant 3 packages
  non documentes initialement (azure-pipelines-task, e2e, regression-suite). Mise a jour
  des sections "Vue d'ensemble", "Observations factuelles" (+1 observation), "Carte des
  dependances internes" (+3 lignes), et "Statut publication npm" (+ note Azure Pipeline Tasks).
- **Specs/MIGRATION-PLAN.md** : nouvelle section 1.8 detaillant le sort des 3 packages tools/.
  Ajout des Sprints 6g (azure-pipelines-task) et 6h (e2e) au plan d'execution. Mise a jour
  de la section Risques (grep tools/ obligatoire) et du chemin critique.
- **Specs/PHASE-0-GAPS.md** : nouvelle section 6 documentant l'observation methodologique
  (deux angles morts de l'audit initial) et la lecon "tout grep doit inclure tools/".

### Notes (TECH-DEBT-015A follow-up)

- Sprint purement documentaire. Aucune modification de code, package.json, ou test regression.
- Decouverte declenchee par Sprint 6b lors du grep des consommateurs de testvault-wit-schema.
- Correction de la cause racine "assimilation packages/ = workspace pnpm" : les futurs audits
  doivent inclure les 3 dossiers (`packages/`, `apps/`, `tools/`) et lire `pnpm-workspace.yaml`
  pour identifier les globs reels.

### Lessons learned (TECH-DEBT-015A follow-up)

- **Un audit initial peut etre incomplet meme avec methodologie rigoureuse**. La discipline
  TECH-DEBT-011 v3 "verifier le terrain reel" doit aussi s'appliquer aux audits documentaires.
- **Les packages non-consommes en interne sont les plus faciles a oublier**. testvault-e2e,
  testvault-azure-pipelines-task, regression-suite n'ont aucun consumer interne, donc les
  scripts de grep "qui depend de qui" ne les detectent pas. **Mitigation** : pour tout
  inventaire, lister AUSSI les packages "feuilles" (zero consumer).

### Backlog enrichi

- **Sprint 6g NEW** : Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task`
- **Sprint 6h NEW** : Renaming `testvault-e2e` -> `argos-e2e`
- (autres items inchanges)
```

---

## Etape 6 — Validation

```powershell
# Fichiers updated
Get-Item Specs\MONOREPO.md, Specs\MIGRATION-PLAN.md, Specs\PHASE-0-GAPS.md, CHANGELOG.md | Select-Object Name, Length, LastWriteTime

# Aucune modification de code
git diff --stat
# Attendu : seulement Specs/*.md et CHANGELOG.md

# Tests passing
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : PASSED
```

⚠ Si test echoue sur les fichiers Specs/* updates (mots-cles sensibles), verifier allowlist mais les fichiers sont normalement deja allowlistes.

---

## Etape 7 — Archive prompt + commit

### 7.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-015a-followup.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-015a-followup.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-015a-followup.md
}
```

### 7.2 — Commit

```powershell
git add -A
git status
# Verifier que seulement Specs/*.md, CHANGELOG.md, tools/claude-prompts/* sont staged

git commit `
  -m "docs(monorepo): inventory tools/* packages (TECH-DEBT-015A follow-up)" `
  -m "" `
  -m "Sprint 6b revealed that Specs/MONOREPO.md was incomplete: 3 packages" `
  -m "in tools/* were not inventoried (azure-pipelines-task, e2e, regression-suite)." `
  -m "" `
  -m "Changes:" `
  -m "- Specs/MONOREPO.md: new section 'Packages dans tools/' + updates to" `
  -m "  Vue d'ensemble, Observations, Carte des dependances, Statut npm" `
  -m "- Specs/MIGRATION-PLAN.md: new section 1.8 + Sprints 6g/6h added" `
  -m "  + risk row 'tools/* in grep' + critical path updated" `
  -m "- Specs/PHASE-0-GAPS.md: new section 6 (methodological observation)" `
  -m "- CHANGELOG.md: [0.4.11] entry with lessons learned" `
  -m "" `
  -m "Key discoveries:" `
  -m "- tools/azure-pipelines-task = Azure DevOps Pipeline Task (product deliverable)" `
  -m "- tools/e2e = Playwright E2E suite (11 specs) consuming 5 testvault-* packages" `
  -m "- regression-suite = already argos-agnostic, no renaming needed" `
  -m "" `
  -m "No code changes, no package.json modifications, no test regression updates." `
  -m "" `
  -m "Refs: Specs/MONOREPO.md (TECH-DEBT-015A), Specs/MIGRATION-PLAN.md (015B)"

git push -u origin docs/monorepo-inventory-followup
```

PR.

---

## Criteres de done

- [ ] Branche `docs/monorepo-inventory-followup` creee depuis main a jour
- [ ] `Specs/MONOREPO.md` : section "Packages dans tools/" ajoutee (3 packages detailles)
- [ ] `Specs/MONOREPO.md` : Vue d'ensemble tableau + 3 lignes
- [ ] `Specs/MONOREPO.md` : Observations + 1 entree (observation 11)
- [ ] `Specs/MONOREPO.md` : Carte des dependances + 3 lignes (e2e, azure-pipelines-task, regression)
- [ ] `Specs/MONOREPO.md` : Statut publication npm + note Azure Pipeline Tasks
- [ ] `Specs/MIGRATION-PLAN.md` : nouvelle section 1.8 (tools/*)
- [ ] `Specs/MIGRATION-PLAN.md` : Sprints 6g + 6h ajoutes au tableau
- [ ] `Specs/MIGRATION-PLAN.md` : section Risques + 1 ligne
- [ ] `Specs/MIGRATION-PLAN.md` : chemin critique updated
- [ ] `Specs/MIGRATION-PLAN.md` : Sprint 6b note ajoutee (incident Defender)
- [ ] `Specs/PHASE-0-GAPS.md` : nouvelle section 6
- [ ] `CHANGELOG.md` : [0.4.11] entry
- [ ] **Aucune modification de code, package.json, test regression**
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51 passing
- [ ] `pnpm preflight` → PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] Prompt archive
- [ ] Commit + PR

**Pas de bump version Marketplace** (sprint documentaire).
Optionnel : changeset patch 0.4.10 -> 0.4.11 si convention impose.

---

## Garde-fous

⚠ **Risque #1 = scope creep vers les sprints 6g/6h**
- TENTATION : "tant qu'on est dans le code, on commence Sprint 6g..."
- NON. Sprint TECH-DEBT-015A follow-up = documentation uniquement.

⚠ **Risque #2 = modifier les packages tools/* par erreur**
- TENTATION : "ce package version 0.3.3 devrait etre 0.3.2..."
- NON. Aucune modification de fichier tools/*/package.json.

⚠ **Risque #3 = ecrire des decisions non-validees**
- Tous les choix (renaming azure-pipelines-task, e2e) sont DEJA validees implicitement par
  la coherence avec MIGRATION-PLAN.md existant (renaming testvault-* -> argos-*).
- Si une nouvelle question emerge (ex: faut-il publier azure-pipelines-task sur le Marketplace ?),
  reporter a l'utilisateur AVANT d'inscrire une decision.

⚠ **Risque #4 = mojibake dans les sections ajoutees**
- Source ASCII strict. Pas de quote francais, pas d'accent.
- Verifier avec scan-mojibake.cjs en fin.

⚠ **Risque #5 = oublier de marquer Sprint 6b avec note Defender**
- Important pour la trace : l'incident d'index est resolu par exclusion Defender, mais
  pour qu'un futur collaborateur (ou Claude) le sache, c'est dans MIGRATION-PLAN.md.

---

## Reporting utilisateur

Reporter a l'utilisateur **2 moments** :
1. **Apres Etape 1** (lecture des package.json + grep consommateurs) :
   > "Voici l'inventaire factuel. Confirmation avant ecriture ?"
2. **Apres Etape 5** (CHANGELOG):
   > "Documents updated. Voici les sections modifiees : [liste]. Pret a commit ?"

---

Quand la PR est ouverte, dis-le-moi. **Pause courte recommandee** puis Sprint 6c (testvault-sdk -> argos-sdk avec 4 consommateurs + tools/e2e = 5 fichiers package.json a modifier, plus de surface mais moins de risque grace a Defender exclu).
