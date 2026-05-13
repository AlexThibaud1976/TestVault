# Prompt Claude Code -- TECH-DEBT-015A follow-up #2 (`docs/monorepo-inventory-followup-2`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **documentaire** court (~25 min) : completer DE NOUVEAU `Specs/MONOREPO.md` qui avait encore oublie 4 dossiers dans `tools/*`.
> Aussi : ajouter Sprint 7d (testvault-action GitHub Action) au plan migration.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6h merge visible
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake (mais scan a un bug, voir contexte)

Si l'un echoue -> STOP.

---

## Contexte

**Pourquoi ce sprint** : Sprint 7a (rename testvault-cli) a revele un fait inattendu lors de l'investigation terrain : `pnpm-workspace.yaml` englobe `tools/*` via glob, et **4 dossiers dans `tools/`** n'avaient PAS ete inventories dans le TECH-DEBT-015A initial (audit Sprint 6c) ni dans le TECH-DEBT-015A follow-up #1 (Sprint 015A-followup, 2026-05-13).

**Inventaire factuel COMPLET de `tools/` au 2026-05-14** :

| Dossier | Type | Inventorie 015A initial ? | Inventorie 015A-followup #1 ? | Inventorie ICI |
|---|---|---|---|---|
| `azure-pipelines-task` | Azure Pipeline Task (package.json + task.json) | NON | OUI (Sprint 6b discovery) | (deja documente) |
| `claude-prompts` | Doc prompts (pas de package.json) | NON | NON | **OUI** (nouveau) |
| `e2e` | Suite Playwright (package.json) | NON | OUI (Sprint 6b discovery) | (deja documente) |
| `load-testing` | Placeholder vide (.gitkeep seul) | NON | NON | **OUI** (nouveau) |
| `migration-scripts` | Placeholder vide (.gitkeep seul) | NON | NON | **OUI** (nouveau) |
| `preflight` | Scripts validation (manifest-check.cjs + 2 .md) | NON | NON | **OUI** (nouveau) |
| `regression` | Suite Vitest (package.json) | OUI partiel | OUI complet | (deja documente) |
| `testvault-action` | GitHub Action (action.yml, pas de package.json) | NON | NON | **OUI** (nouveau) |

**4 dossiers a documenter** : claude-prompts, load-testing, migration-scripts, preflight, testvault-action.

**Decouvertes Sprint 7a investigation** :

1. **`tools/testvault-action/`** = GitHub Action composite
   - Fichier unique : `action.yml`
   - Pas de package.json (action composite, pas npm)
   - Pas dans workspace pnpm (mais le glob `tools/*` l'englobe quand meme - pnpm l'ignore car pas de package.json)
   - **Contient du mojibake** : `name: "TestVault â€" Upload CI Results"` (em-dash U+2014 corrompu)
   - **Contient TESTVAULT_PAT, TESTVAULT_ORG_URL, TESTVAULT_PROJECT** (lignes 60-62) - a renommer ARGOS_* Sprint 7d
   - **Installe @atconseil/testvault-cli@latest** globalement (npm install -g) - a updater Sprint 7d
   - **Appelle `testvault tc upload-results`** - a updater Sprint 7d apres Sprint 7a (rename binaire)
   - **Statut publication** : non publie sur GitHub Marketplace Actions (a confirmer mais probable car le nom contient mojibake)

2. **`tools/load-testing/`** = placeholder vide
   - Contenu : `.gitkeep` uniquement
   - Reference dans `Specs/plan.md` section 9.8 (k6 load tests)
   - Anticipe pour **Phase 7** selon `Specs/tasks.md`
   - Aucun travail effectif

3. **`tools/migration-scripts/`** = placeholder vide
   - Contenu : `.gitkeep` uniquement
   - Anticipe pour les migrations schema WIT (constitution section 9 retrocompatibilite)
   - Aucun travail effectif

4. **`tools/preflight/`** = scripts utilitaires
   - `manifest-check.cjs` (5645 bytes) - script de validation manifest VSS, lance par `pnpm preflight`
   - `marketplace-check.md` (5695 bytes) - checklist humaine pre-publication
   - `microsoft-docs-snippets.md` (4209 bytes) - extraits de la doc Microsoft VSS-Manifest pour reference
   - Pas de package.json, pas un package npm
   - Outils dev internes, pas un livrable

5. **`tools/claude-prompts/`** = documentation prompts
   - Contient les `CLAUDE_TASK_*.md` archives apres chaque sprint
   - Pas de package.json, pas un package npm
   - Archive interne de prompts (artefact methodologique de tracabilite)

**Constat methodologique** : TECH-DEBT-015A initial et follow-up #1 ont tous deux rate des dossiers. Cause racine identifiee :
- Initial : grep limite a `packages/` et `apps/`
- Follow-up #1 : grep etendu a `tools/` mais focalise sur les packages avec `package.json`

**Lecon** : pour un inventaire monorepo complet, lister TOUS les dossiers, pas juste ceux avec package.json.

**Decisions a inscrire dans MIGRATION-PLAN.md** :

| Item | Decision |
|---|---|
| `tools/testvault-action/` | Renommer en `tools/argos-action/` + fix mojibake + aligner vars env + aligner CLI install + binaire. **Sprint 7d NEW** |
| `tools/load-testing/` | Garder le placeholder. Documenter dans MONOREPO. Pas de sprint dedie (sera fait en Phase 7) |
| `tools/migration-scripts/` | Idem. Documenter. Pas de sprint dedie |
| `tools/preflight/` | Pas a renommer (deja argos-agnostic via le nom du dossier). Documenter |
| `tools/claude-prompts/` | Pas a renommer. Documenter |

**Decisions a inscrire dans Sprint 7a (pour ne pas etre surpris)** :

Sprint 7a touchera :
1. `packages/testvault-cli/package.json` : champ `name` + champ `bin` ("testvault" -> "argos")
2. `packages/testvault-cli/src/cli.ts` : 7 occurrences `TESTVAULT_*` -> `ARGOS_*`
3. `tools/e2e/package.json` : dependency
4. `tools/e2e/tests/07-phase4-import-export-cli.spec.ts` : import
5. `tools/e2e/tests/08-phase5-bdd-sync.spec.ts` : import
6. `tools/regression/CFG-2026-05-13-package-naming.test.ts` : retirer entree

Sprint 7a **NE TOUCHE PAS** :
- `tools/azure-pipelines-task/src/index.ts` (Sprint 6g/7c, contient `testvault` shell cmd + TESTVAULT_*)
- `tools/testvault-action/action.yml` (Sprint 7d, contient `testvault` shell cmd + TESTVAULT_*)
- `docs/integrations/*.md` (Sprint 6g/7c et 7d, doc utilisateur)

**Perimetre du sprint** :
1. Update `Specs/MONOREPO.md` : ajouter section pour les 4 dossiers oublies
2. Update `Specs/MIGRATION-PLAN.md` :
   - Ajouter Sprint 7d (testvault-action GitHub Action)
   - Section 1.9 listant ce qui RESTE testvault-* apres Sprint 7a/7b/7c/7d
3. Update `Specs/PHASE-0-GAPS.md` : observation methodologique sur le deuxieme oubli
4. CHANGELOG entry minimal
5. **Aucune modification de code, package.json, ou test regression**

**Hors scope** :
- Renaming reel (-> Sprint 7a, 7b, 6g/7c, 7d dedies)
- Modification fonctionnelle
- Fix mojibake action.yml (-> Sprint 7d)

---

## Etape 0 -- Setup branche

```powershell
git checkout main
git pull
git checkout -b docs/monorepo-inventory-followup-2

pnpm install
```

---

## Etape 1 -- Verifier l'etat des 4 dossiers a documenter

```powershell
Write-Host "=== tools/claude-prompts/ ===" -ForegroundColor Cyan
Get-ChildItem tools\claude-prompts -File | Select-Object Name

Write-Host "`n=== tools/load-testing/ ===" -ForegroundColor Cyan
Get-ChildItem tools\load-testing -File -Force | Select-Object Name

Write-Host "`n=== tools/migration-scripts/ ===" -ForegroundColor Cyan
Get-ChildItem tools\migration-scripts -File -Force | Select-Object Name

Write-Host "`n=== tools/preflight/ ===" -ForegroundColor Cyan
Get-ChildItem tools\preflight -File | Select-Object Name

Write-Host "`n=== tools/testvault-action/action.yml content (head) ===" -ForegroundColor Cyan
Get-Content tools\testvault-action\action.yml -TotalCount 10
```

### 1.1 -- Reporter

> "Inventaire factuel des 4+1 dossiers. Confirmation avant ecriture des sections MONOREPO.md et MIGRATION-PLAN.md ?"

---

## Etape 2 -- Update Specs/MONOREPO.md

### 2.1 -- Etendre la section "Packages dans tools/"

La section existante (added 2026-05-13 par follow-up #1) couvre 3 packages : azure-pipelines-task, e2e, regression-suite. **Ajouter une sous-section pour les 5 autres dossiers** (qui ne sont pas des packages npm mais font partie de `tools/`).

Apres la section existante, ajouter :

```markdown
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
- Contient du **mojibake** : `name: "TestVault â€" Upload CI Results"` (em-dash corrompu)
- Variables `TESTVAULT_*` a renommer en `ARGOS_*` (decision validee 2026-05-13)
- Reference `@atconseil/testvault-cli` a remplacer par `@atconseil/argos-cli` apres Sprint 7a
- Commande shell `testvault` a remplacer par `argos` apres Sprint 7a (rename binaire CLI)
- **Statut publication** : non publie sur GitHub Marketplace Actions (a confirmer)

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
**Role** : **Anticipe** pour les migrations de schema WIT (constitution section 9 retrocompatibilite) |

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
| Contenu | Archive des `CLAUDE_TASK_*.md` apres chaque sprint |
| Role | Tracabilite methodologique : conserver les prompts utilises pour chaque sprint Claude Code |

**Etat** : artefact methodologique. Chaque sprint archive son prompt dans ce dossier.

**Sprint planifie** : aucun. Pas a renommer.
```

### 2.2 -- Update section "Vue d'ensemble"

Mettre a jour le tableau de la vue d'ensemble pour reflechir les 5 dossiers oublies :

```diff
  | `tools/azure-pipelines-task` | **Livrable produit** | Azure DevOps Pipeline Task |
  | `tools/e2e` | Tests | Suite Playwright E2E contre ADO Cloud (11 specs) |
  | `tools/regression` | Outils dev | Suite de tests regression (13 fichiers, 51 assertions) |
+ | `tools/testvault-action` | **Livrable produit** | GitHub Action composite pour Marketplace Actions (TestVault upload results) |
+ | `tools/preflight` | Outils dev | Scripts validation manifest VSS + checklist humaine + reference docs |
+ | `tools/claude-prompts` | Documentation | Archive des prompts Claude Code apres chaque sprint |
+ | `tools/load-testing` | Anticipe Phase 7 | Placeholder structurel (k6 scenarios) -- non implemente |
+ | `tools/migration-scripts` | Anticipe migrations WIT | Placeholder structurel -- non implemente |
```

### 2.3 -- Update "Observations factuelles"

Ajouter :

```markdown
12. **TECH-DEBT-015A a ete incomplet 2 fois consecutivement** : initial (audit Sprint 6c) avait oublie
    `tools/*` complet. Follow-up #1 (Sprint 015A-followup, 2026-05-13) avait inventorie les 3 packages
    avec package.json (azure-pipelines-task, e2e, regression-suite) mais oublie les 5 dossiers SANS
    package.json (testvault-action, preflight, claude-prompts, load-testing, migration-scripts). Suite
    decouverte Sprint 7a investigation, le 2026-05-14. **Lecon racine** : un inventaire monorepo doit
    lister TOUS les dossiers, pas juste les packages npm. Sections ajoutees 2026-05-14.
```

### 2.4 -- Update "Carte des dependances internes"

```diff
+ tools/testvault-action -> appelle CLI testvault (binaire, pas dependency npm declaree)
+ tools/load-testing     -> (placeholder vide)
+ tools/migration-scripts -> (placeholder vide)
+ tools/preflight        -> (scripts internes, pas de dependency npm)
+ tools/claude-prompts   -> (documentation, pas de dependency npm)
```

---

## Etape 3 -- Update Specs/MIGRATION-PLAN.md

### 3.1 -- Etendre la section 1.8 (added 2026-05-13)

La section existante decrit le sort de 3 packages tools (azure-pipelines-task, e2e, regression-suite).
**Ajouter une section 1.9 pour les 5 dossiers non-package** :

```markdown
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
- `action.yml` : fix mojibake `name: "TestVault â€" Upload CI Results"` -> `name: "Argos - Upload CI Results"`
- `action.yml` : variables d'env `TESTVAULT_*` -> `ARGOS_*` (lignes 60-62)
- `action.yml` : install `@atconseil/testvault-cli` -> `@atconseil/argos-cli` (ligne 56)
- `action.yml` : `testvault tc upload-results` -> `argos tc upload-results` (ligne 70)
- `docs/integrations/github-actions.md` : mise a jour exemples utilisateur
- **Prerequis** : Sprint 7a (rename CLI + binaire) doit etre fait AVANT Sprint 7d

**Sprint 7d planifie apres Sprint 7a, 7b et 6g/7c**.
```

### 3.2 -- Update tableau Section 3 (Plan d'execution)

Apres Sprint 6h, ajouter Sprint 7d :

```diff
  | Sprint 6g | Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` | ~30 min | Faible (0 consommateur, mais livrable produit avec mojibake/GUID) | Apres 7a |
  | Sprint 6h | Renaming `testvault-e2e` -> `argos-e2e` | ~15 min | Faible (Option A, dossier inchange) | **DONE 2026-05-13** |
+ | Sprint 7d | Renaming `tools/testvault-action/` -> `tools/argos-action/` (GitHub Action) | ~25 min | Faible (0 consommateur interne, GitHub Action composite avec mojibake) | Apres 7a |
  | Sprint 7a | Renaming `testvault-cli` -> `argos-cli` | ~45 min | Moyen (1 consommateur, binaire + 7 vars env + impact 2 livrables externes) | Apres 6h |
  | Sprint 7b | Renaming `testpulse-ui-shared` -> `argos-detection-api` | ~30 min | Moyen (changement de nom produit + scope) | Apres 7a |
```

Update chemin critique :

```diff
- **Chemin critique** : 5a/5b -> 6a -> 6b -> 6c -> (6d, 6e, 6f en parallele possible) -> 6g/6h/7a/7b en parallele -> 8 -> 9.
+ **Chemin critique** : 5a/5b -> 6a -> 6b -> 6c -> (6d, 6e, 6f) -> 6h -> 7a -> (7b, 6g/7c, 7d en parallele apres 7a) -> 8 -> 9.
```

### 3.3 -- Section Risques

Ajouter :

```diff
+ | tools/* dossiers sans package.json oublies dans inventaire | TOUT audit monorepo doit lister TOUS les dossiers (pas juste les packages npm). |
+ | Mojibake invisible dans .yml / .json | scan-mojibake.cjs (TECH-DEBT-025) doit etre etendu aux .yml et detecter les patterns du action.yml et task.json. |
```

---

## Etape 4 -- Update Specs/PHASE-0-GAPS.md

### 4.1 -- Ajouter observation section 6.1

Apres l'observation methodologique existante (section 6), ajouter :

```markdown
### 6.1 Methodologie d'inventaire monorepo (added 2026-05-14)

**Observation Sprint 7a** : meme apres le TECH-DEBT-015A follow-up #1 (2026-05-13) qui avait corrige
l'omission de `tools/*` packages, l'inventaire restait incomplet. 5 dossiers dans `tools/` n'avaient
pas de package.json et n'avaient pas ete documentes :

- `tools/testvault-action/` (action.yml, GitHub Action)
- `tools/preflight/` (scripts cjs + docs md)
- `tools/claude-prompts/` (archive md)
- `tools/load-testing/` (placeholder .gitkeep)
- `tools/migration-scripts/` (placeholder .gitkeep)

**Cause racine** : les outils de grep et d'inventaire ont focalise sur les `package.json`. Un
"package monorepo" a ete confondu avec "un package npm". Mais le glob `tools/*` de
`pnpm-workspace.yaml` englobe TOUS les dossiers.

**Regle methodologique** : pour un inventaire monorepo complet :
1. Lister `Get-ChildItem -Directory` sur chaque chemin du glob workspace
2. NE PAS filtrer sur la presence d'un `package.json`
3. Identifier le type de chaque dossier (npm package, action composite, scripts, doc, placeholder)
4. Documenter le role et le sort de chaque dossier

**Application future** : `Specs/MONOREPO.md` doit etre regenere periodiquement avec ce processus
exhaustif (recommande a chaque release majeure).
```

---

## Etape 5 -- CHANGELOG entry

```markdown
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
- Lecon racine : un inventaire monorepo doit lister TOUS les dossiers du workspace glob.

### Lessons learned

- **TECH-DEBT-015A initial avait DEUX angles morts cumules** : (1) tools/* complet rate, (2) dossiers
  sans package.json rates.
- **Le follow-up #1 (2026-05-13) n'avait corrige que l'angle mort #1**. Cette correction (2026-05-14)
  finalise l'inventaire.
- **Pour les futurs audits** : explorer chaque chemin du workspace glob avec `Get-ChildItem -Directory`
  et categoriser chaque dossier (npm package / action composite / scripts / doc / placeholder).

### Backlog enrichi

- **Sprint 7a NEXT** : `testvault-cli` -> `argos-cli`. Surface clarifie ce matin :
  - 1 consommateur package.json (tools/e2e)
  - 2 imports source (tools/e2e tests)
  - Binaire `testvault` -> `argos` (champ bin dans package.json)
  - 7 variables d'env `TESTVAULT_*` dans cli.ts -> `ARGOS_*`
  - Test regression : retirer entree ALLOWED_LEGACY_NAMES
  - **Hors scope Sprint 7a** : tools/azure-pipelines-task et tools/testvault-action (sprints dedies)
- **Sprint 7b** : `testpulse-ui-shared` -> `argos-detection-api`
- **Sprint 6g/7c** : `testvault-azure-pipelines-task` (avec fix mojibake + GUID + alignement)
- **Sprint 7d NEW** : `tools/testvault-action/` -> `tools/argos-action/` (avec fix mojibake + alignement CLI + variables env)
- TECH-DEBT-025 (deja inscrit) : scan-mojibake.cjs rate les caracteres `â€"` dans .yml et .json
- TECH-DEBT-026 (deja inscrit) : Resync Specs/tasks.md avec realite du code
```

---

## Etape 6 -- Validation

```powershell
Get-Item Specs\MONOREPO.md, Specs\MIGRATION-PLAN.md, Specs\PHASE-0-GAPS.md, CHANGELOG.md | Select-Object Name, Length, LastWriteTime

git diff --stat
# Attendu : seulement Specs/*.md et CHANGELOG.md

pnpm --filter @atconseil/regression-suite test
# 51 passing

node tools\regression\scan-mojibake.cjs
# 0 file (note : le scan rate volontairement le mojibake action.yml et task.json - TECH-DEBT-025)

pnpm preflight
# PASSED
```

---

## Etape 7 -- Archive + commit

### 7.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-015a-followup-2.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-015a-followup-2.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-015a-followup-2.md
}
```

### 7.2 -- Pre-commit ASCII check

```powershell
$msg = "docs(monorepo): complete tools/ inventory (TECH-DEBT-015A follow-up #2)`n`n5 utility folders without package.json were missing from previous inventories."
$nonAscii = @()
for ($i = 0; $i -lt $msg.Length; $i++) {
    $c = [int][char]$msg[$i]
    if ($c -gt 127) { $nonAscii += "Position $i : '$($msg[$i])' (U+$('{0:X4}' -f $c))" }
}
if ($nonAscii.Count -gt 0) {
    Write-Host "STOP : non-ASCII detecte :" -ForegroundColor Red
    $nonAscii | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "ASCII pur. OK pour commit." -ForegroundColor Green
}
```

### 7.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "docs(monorepo): complete tools/ inventory (TECH-DEBT-015A follow-up #2)" `
  -m "" `
  -m "Sprint 7a investigation revealed that 5 folders in tools/ were missing from previous inventories:" `
  -m "- tools/testvault-action/ (GitHub Action composite)" `
  -m "- tools/preflight/ (validation scripts)" `
  -m "- tools/claude-prompts/ (prompts archive)" `
  -m "- tools/load-testing/ (Phase 7 placeholder)" `
  -m "- tools/migration-scripts/ (WIT migration placeholder)" `
  -m "" `
  -m "Changes:" `
  -m "- Specs/MONOREPO.md: new section Dossiers utilitaires dans tools/ + observation 12" `
  -m "- Specs/MIGRATION-PLAN.md: new section 1.9 + Sprint 7d added (testvault-action rename)" `
  -m "- Specs/PHASE-0-GAPS.md: new section 6.1 (methodology rule for monorepo inventory)" `
  -m "- CHANGELOG.md: [0.4.17] entry with lessons learned" `
  -m "" `
  -m "Root cause: previous audits filtered on package.json presence. Lesson: monorepo inventory" `
  -m "must list ALL folders in workspace globs, not just npm packages." `
  -m "" `
  -m "No code changes. Refs: Specs/MONOREPO.md (TECH-DEBT-015A), MIGRATION-PLAN.md (015B)"

git push -u origin docs/monorepo-inventory-followup-2
```

PR.

---

## Etape 8 -- POST-MERGE CLEANUP

⚠ **A faire APRES merge GitHub.**

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3

git branch -d docs/monorepo-inventory-followup-2
# Si refus : git branch -D docs/monorepo-inventory-followup-2

git remote prune origin

pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

---

## Criteres de done

- [ ] Branche `docs/monorepo-inventory-followup-2` creee depuis main a jour
- [ ] `Specs/MONOREPO.md` : nouvelle section "Dossiers utilitaires dans tools/" (5 dossiers detailles)
- [ ] `Specs/MONOREPO.md` : Vue d'ensemble tableau (+ 5 lignes)
- [ ] `Specs/MONOREPO.md` : Observations + 1 entree (observation 12)
- [ ] `Specs/MONOREPO.md` : Carte des dependances (+5 lignes)
- [ ] `Specs/MIGRATION-PLAN.md` : nouvelle section 1.9 (5 dossiers non-package)
- [ ] `Specs/MIGRATION-PLAN.md` : Sprint 7d ajoute au tableau d'execution
- [ ] `Specs/MIGRATION-PLAN.md` : section Risques + 2 lignes
- [ ] `Specs/MIGRATION-PLAN.md` : chemin critique updated
- [ ] `Specs/PHASE-0-GAPS.md` : nouvelle section 6.1
- [ ] `CHANGELOG.md` : [0.4.17] entry avec lessons learned
- [ ] **Aucune modification de code, package.json, test regression**
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake (note : false negatif sur .yml a corriger TECH-DEBT-025)
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Garde-fous

⚠ **Risque #1 = scope creep vers les sprints 7a/7d**
- TENTATION : "fix tant qu'on est dans le code"
- NON. Sprint TECH-DEBT-015A follow-up #2 = documentation uniquement.

⚠ **Risque #2 = modifier les fichiers tools/* par erreur**
- NON. Aucune modification de tools/*/action.yml, package.json, etc.

⚠ **Risque #3 = oublier d'inscrire Sprint 7d dans MIGRATION-PLAN**
- C'est le seul nouveau sprint a ajouter. NE PAS oublier.

⚠ **Risque #4 = ASCII strict commit**
- Pre-commit check obligatoire avant `git commit`.

⚠ **Risque #5 = mojibake dans les nouvelles sections**
- Source ASCII strict. Verifier scan-mojibake.cjs en fin (meme s'il a un bug, il attrape les patterns courants).

---

## Reporting utilisateur

Reporter a l'utilisateur **2 moments** :
1. **Apres Etape 1** (verification inventaire) : "Inventaire factuel des 4+1 dossiers. Confirmation avant ecriture ?"
2. **Apres Etape 5** (CHANGELOG) : "Documents updated. Sections modifiees : [liste]. Pret a commit (apres ASCII pre-check) ?"

---

Quand le post-merge cleanup est fait, dis-le-moi. Apres : **Sprint 7a** (rename testvault-cli + binaire + variables d'env) avec une carte claire des sprints futurs.
