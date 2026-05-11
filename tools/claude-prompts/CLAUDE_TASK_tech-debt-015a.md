# Prompt Claude Code — TECH-DEBT-015A (`docs/monorepo-inventory`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **documentaire factuel** : produire `Specs/MONOREPO.md` qui décrit la réalité actuelle du monorepo, sans décision ni jugement.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, TECH-DEBT-011 v3 mergé
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi cet inventaire** : le repo TestVault contient 9 packages dans `packages/` et 3 apps dans `apps/`. Au fil des sessions de developpement, certains packages ont ete decouverts incidentellement plutot que documentes. L'objectif est de produire **une carte factuelle** du monorepo avant de prendre des decisions strategiques (TECH-DEBT-015B).

**Faits etablis a priori** (Sources : sessions 2026-05-10 et 2026-05-12, validation utilisateur) :
- TestVault = nom du repo Github. **Pas une marque produit.**
- Argos = produit publie sous publisher AlexThibaud (extensionId ArgosTesting, v0.4.7). Test management AI-native.
- TestPulse = produit independant, publie sous publisher ATConseil (rapports de test base sur Test Plans natif ADO).
- 4 packages npm `@atconseil/testvault-*` sont marques `private: false` mais **NON publies sur npm registry** (verifie 2026-05-12 via `npm view`, aucune sortie).
- `testpulse-ui-shared` existe dans `packages/` mais son contenu n'est pas documente.

**Decisions strategiques deja prises** (a documenter sans les remettre en question dans 015A) :
- Argos et TestPulse = 2 produits independants, couplage faible (Pattern A : detection runtime via ADO API, pas de package partage).
- Renaming futur `@atconseil/testvault-*` -> `@atconseil/argos-*` planifie (TECH-DEBT-015B).
- `testpulse-ui-shared` sortira du repo TestVault (destination a definir).

**Perimetre TECH-DEBT-015A** :
1. Produire `Specs/MONOREPO.md` : document factuel decrivant l'etat actuel
2. Aucune modification du code, aucune execution de renaming, aucun nouveau test regression
3. Le document servira de base a TECH-DEBT-015B (decisions strategiques + plan migration)

**Hors scope TECH-DEBT-015A** :
- Decisions strategiques (-> 015B)
- Plan de renaming (-> 015B + Sprint dedie)
- Extraction testpulse-ui-shared (-> 015B + Sprint dedie)
- Bump version (sprint purement documentaire)
- Tests regression (rien a verifier en CI : c'est de la doc)

---

## Architecture du document `Specs/MONOREPO.md`

Le document doit etre **factuel, exhaustif, en francais ou anglais (au choix mais coherent)**. Structure recommandee :

```markdown
# Monorepo TestVault — Inventaire

> Document factuel decrivant l'etat du monorepo au 2026-05-12.
> Genere dans le cadre de TECH-DEBT-015A.
> **Pas de decisions strategiques ici** — voir `Specs/MIGRATION-PLAN.md` (TECH-DEBT-015B).

## Vue d'ensemble

| Top-level | Type | Role |
|---|---|---|
| `apps/argos-extension` | Application | Extension ADO Argos (publiee Marketplace) |
| `apps/argos-functions` | Application | (a documenter : Azure Functions backend ?) |
| `apps/docs-site` | Application | (a documenter : site de doc ?) |
| `packages/*` | Bibliotheques internes | 9 packages npm, dont 4 marques public |
| `tools/*` | Outils dev | Regression suite, claude-prompts, preflight |
| `Specs/` | Specifications | spec-kit + constitution |

## Packages — Inventaire detaille

Pour chaque package dans `packages/`, ce document liste :
- Nom npm (`name` dans package.json)
- Version actuelle
- Statut publication (`private: true/false`)
- Description (depuis package.json `description` field)
- Exports principaux (depuis `exports` / `main` / `types`)
- Dependances directes (dependencies + devDependencies)
- **Consommateurs internes** : qui dans le repo importe ce package
- Estimation du contenu : combien de fichiers TypeScript, type de code (composants React ? fonctions utilitaires ? types ? etc.)

### packages/testpulse-ui-shared
(...)

### packages/testvault-cli
(...)

(etc. pour les 9 packages)

## Apps — Inventaire detaille

Idem pour `apps/argos-extension`, `apps/argos-functions`, `apps/docs-site`.

## Carte des dependances internes

Liste des relations `package A depends on package B` ou `app A depends on package B`.

Format suggere :
```
argos-extension → @atconseil/testvault-sdk
argos-extension → @atconseil/testvault-types
argos-extension → @atconseil/testvault-gherkin (si applicable)
testpulse-ui-shared → (rien interne ? ou ?)
testvault-cli → @atconseil/testvault-sdk (si applicable)
...
```

## Statut publication npm

Verifie 2026-05-12 via `npm view @atconseil/<package> version` :
- `@atconseil/testvault-sdk` : NON publie
- `@atconseil/testvault-cli` : NON publie
- `@atconseil/testvault-types` : NON publie
- `@atconseil/testvault-gherkin` : NON publie
- `@atconseil/testvault-exporters` : (verifier - private:true mais a confirmer)
- (etc. pour les autres)

## Observations

Section neutre listant les **faits curieux** sans jugement :
- Tous les packages ont la version `0.3.2` mais argos-extension est en `0.4.7` — desalignement de versioning ?
- `testpulse-ui-shared` dans un repo nomme "TestVault" : heritage historique ou intention ?
- `argos-functions` : que fait-il, et pourquoi `private:true` ?
- `docs-site` : utilise ? Statique ?
- (etc.)

## Workflows CI / build / publish

Lister brievement les workflows GitHub Actions et leur lien avec les packages :
- `ci-main.yml` : ?
- `ci-pr.yml` : ?
- `publish-marketplace.yml` : ?

## Frontiere TestVault / TestPulse / Argos

Documenter factuellement :
- TestPulse extension : **hors du repo TestVault** ? Dans un autre repo Github ?
- TestPulse publication Marketplace : oui (publisher ATConseil)
- Argos publication Marketplace : oui (publisher AlexThibaud, extensionId ArgosTesting)
- Code partage actuel entre TestPulse et Argos : `testpulse-ui-shared` ? Autre ?

## Annexe — Donnees brutes

Listing pnpm-workspace.yaml, dossiers, tailles approximatives, etc.
```

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b docs/monorepo-inventory

pnpm install
```

---

## Etape 1 — Collecte des donnees factuelles

### 1.1 — Top-level structure

```powershell
Get-ChildItem -Directory | Select-Object Name
Get-Content pnpm-workspace.yaml
Get-Content turbo.json
```

### 1.2 — Pour chaque package dans packages/

```powershell
Get-ChildItem packages -Directory | ForEach-Object {
    $pkg = Join-Path $_.FullName "package.json"
    if (Test-Path $pkg) {
        $json = Get-Content $pkg -Raw | ConvertFrom-Json
        [PSCustomObject]@{ 
            Folder = $_.Name
            PkgName = $json.name
            Version = $json.version 
            Private = $json.private
            Description = $json.description
            Main = $json.main
            Module = $json.module
            Types = $json.types
            Exports = if ($json.exports) { ($json.exports | ConvertTo-Json -Compress) } else { $null }
        }
    }
}
```

### 1.3 — Pour chaque app dans apps/

Idem.

### 1.4 — Dependances cross-package

Pour chaque `package.json`, extraire les dependances qui commencent par `@atconseil/` :

```powershell
# Script pour mapper qui depend de qui
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | ForEach-Object {
    $json = Get-Content $_.FullName -Raw | ConvertFrom-Json
    $deps = @()
    if ($json.dependencies) { 
        $json.dependencies.PSObject.Properties | Where-Object { $_.Name -like "@atconseil/*" } | ForEach-Object { $deps += $_.Name }
    }
    if ($json.devDependencies) { 
        $json.devDependencies.PSObject.Properties | Where-Object { $_.Name -like "@atconseil/*" } | ForEach-Object { $deps += "$($_.Name) (dev)" }
    }
    if ($deps.Count -gt 0) {
        [PSCustomObject]@{
            Package = $json.name
            DependsOn = ($deps -join ", ")
        }
    }
} | Format-Table -AutoSize
```

### 1.5 — Contenu de testpulse-ui-shared (PRIORITE)

```powershell
Get-ChildItem packages\testpulse-ui-shared -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules" } | Select-Object FullName

# README s'il existe
if (Test-Path packages\testpulse-ui-shared\README.md) {
    Get-Content packages\testpulse-ui-shared\README.md
}

# Tree des src/
if (Test-Path packages\testpulse-ui-shared\src) {
    Get-ChildItem packages\testpulse-ui-shared\src -Recurse | Select-Object FullName
}
```

⚠ **PRIORITE METHODOLOGIQUE** : pour `testpulse-ui-shared`, documenter en detail :
- Combien de fichiers TS/TSX ?
- Composants React ? Lesquels ? (lister les exports)
- Types TS ? Tokens design ? Fonctions utilitaires ?
- Si possible, **ouvrir 2-3 fichiers principaux** et resumer le contenu

### 1.6 — Workflows GitHub Actions

```powershell
Get-ChildItem .github\workflows -File | ForEach-Object {
    Write-Host "=== $($_.Name) ===" -ForegroundColor Cyan
    Get-Content $_.FullName | Select-Object -First 30
    Write-Host ""
}
```

### 1.7 — Statut publication npm (re-verifier pour tous les packages public)

```powershell
$publicPackages = @(
    "@atconseil/testvault-sdk",
    "@atconseil/testvault-cli",
    "@atconseil/testvault-types",
    "@atconseil/testvault-gherkin"
)

foreach ($pkg in $publicPackages) {
    Write-Host "Checking $pkg..." -ForegroundColor Cyan
    $result = npm view $pkg version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Published: version $result" -ForegroundColor Green
    } else {
        Write-Host "  Not published (404)" -ForegroundColor Yellow
    }
}
```

---

## Etape 2 — Rediger Specs/MONOREPO.md

Sur la base des donnees collectees Etape 1, produire le document.

### 2.1 — Structure du fichier

Voir "Architecture du document" ci-dessus. Adapter selon les decouvertes.

### 2.2 — Source ASCII strict

Le document `Specs/MONOREPO.md` doit etre en **ASCII strict** ou avec encoding UTF-8 propre (testable via `node tools/regression/scan-mojibake.cjs`).

### 2.3 — Tone

**Factuel uniquement.** Eviter :
- "Ce package devrait..."
- "Il faudrait renommer..."
- "C'est bizarre que..."

Preferer :
- "Ce package contient X fichiers TypeScript."
- "Ce package est consomme par Y et Z."
- "Ce package n'est consomme par aucun autre package du repo."

Les **observations factuelles** dans la section "Observations" peuvent noter des incoherences sans proposer de fix : "Tous les packages sont en 0.3.2 sauf argos-extension en 0.4.7" est factuel ; "il faudrait realigner" ne l'est pas (-> 015B).

### 2.4 — Reporting utilisateur

Pendant la redaction, si tu trouves quelque chose **d'inattendu** (un package vide, un fichier qui semble obsolete, une dependance circulaire, etc.), **reporter a l'utilisateur** avant de continuer. Pas pour modifier, juste pour qu'il en soit conscient.

---

## Etape 3 — Validation

### 3.1 — Fichier present

```powershell
Test-Path Specs\MONOREPO.md
# Attendu : True

# Verifier taille raisonnable (>5KB, signe que contenu existe vraiment)
(Get-Item Specs\MONOREPO.md).Length
```

### 3.2 — Aucune modification de code

```powershell
git status
# Attendu : juste Specs/MONOREPO.md modifie ou nouveau, RIEN d'autre

git diff --stat
# Verifier qu'aucun fichier .ts, .json, etc. n'a ete modifie accidentellement
```

### 3.3 — Tests regression toujours passing

```powershell
pnpm --filter @atconseil/regression-suite test
# Attendu : 27 passing (rien n'a change)

node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

pnpm preflight
# Attendu : Pre-flight check PASSED
```

### 3.4 — Allowlister `Specs/MONOREPO.md` si necessaire

Si un test regression echoue sur ce fichier (mots-cles sensibles dans le contenu factuel : "ATConseil", "AlexThibaud", "publisher", etc.), allowlister dans `allowlist.ts` ET `allowlist.cjs` :

```typescript
"Specs/MONOREPO.md",
```

---

## Etape 4 — Archive prompt + commit

### 4.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-015a.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-015a.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-015a.md
}
```

### 4.2 — Commit

```powershell
git add -A
git status

git commit `
  -m "docs(monorepo): inventaire factuel du monorepo (TECH-DEBT-015A)" `
  -m "" `
  -m "Produces Specs/MONOREPO.md describing the current state of the" `
  -m "TestVault monorepo as of 2026-05-12." `
  -m "" `
  -m "Coverage:" `
  -m "- 9 packages in packages/ inventoried (name, version, public/private, exports)" `
  -m "- 3 apps in apps/ inventoried" `
  -m "- testpulse-ui-shared content documented in detail" `
  -m "- Inter-package dependency map" `
  -m "- npm publication status verified for public packages" `
  -m "- CI workflows briefly described" `
  -m "" `
  -m "Strategic decisions intentionally NOT in this document — see" `
  -m "Specs/MIGRATION-PLAN.md (TECH-DEBT-015B)." `
  -m "" `
  -m "No code modifications, no version bump, no new regression tests."

git push -u origin docs/monorepo-inventory
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `docs/monorepo-inventory` creee depuis main a jour
- [ ] `Specs/MONOREPO.md` cree, **factuel uniquement**, >5KB
- [ ] 9 packages inventories avec nom/version/private/description/exports/dependances/consommateurs
- [ ] 3 apps inventories
- [ ] **`testpulse-ui-shared` documente en detail** (fichiers TS, composants React si applicables, exports principaux)
- [ ] Carte des dependances inter-packages (qui depend de qui)
- [ ] Statut publication npm verifie et documente (4+ packages public)
- [ ] Workflows CI brievement decrits
- [ ] Observations neutres listees (sans proposer de fix)
- [ ] **Aucune modification de code** (`git diff --stat` ne montre que `Specs/MONOREPO.md`)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm preflight` → PASSED
- [ ] Prompt archive dans `tools/claude-prompts/`
- [ ] Commit + PR

---

## Garde-fous TECH-DEBT-015A

⚠ **Le risque #1 = glisser vers des decisions**
- Le document doit etre **factuel**. Pas "il faudrait", "ce serait mieux si", "anti-pattern".
- Si une observation merite une decision, l'inscrire **brievement** dans la section "Observations" sans proposer de fix.

⚠ **Le risque #2 = oublier `testpulse-ui-shared`**
- Section CRITIQUE. Sans le contenu de ce package documente, 015B sera handicape.
- Si le package est petit, en lister tous les fichiers + ouvrir les 2-3 principaux.
- Si le package est gros, ouvrir au moins le README + l'index + 3 fichiers exports principaux.

⚠ **Le risque #3 = modifier du code par erreur**
- Sprint **purement documentaire**.
- `git diff --stat` apres redaction = seulement `Specs/MONOREPO.md`.
- Si tu vois autre chose, c'est un bug : reverter et recommencer.

⚠ **Le risque #4 = inventer / extrapoler**
- Si un fichier package.json n'a pas de `description`, ecrire "Pas de description" — pas inventer une description.
- Si un export n'est pas evident, ouvrir le fichier `index.ts` reellement.
- L'incertitude doit etre documentee comme telle : "Contenu non clarifie sans inspection plus approfondie".

⚠ **Le risque #5 = mojibake dans le document**
- `Specs/MONOREPO.md` doit etre UTF-8 propre.
- Verifier avec `scan-mojibake.cjs` apres redaction.
- Caracteres accentues OK si encoding correct, eviter quand meme.

---

## Reporting utilisateur

Pendant l'execution, **reporter a l'utilisateur 3 moments** :
1. **Apres Etape 1** : "Voici les donnees collectees, voici ce que je vais ecrire dans MONOREPO.md."
2. **Pendant la section testpulse-ui-shared** : "Voici ce que contient ce package. Confirmation que je le decris correctement avant de continuer."
3. **Apres Etape 2** : "Document redige, voici le draft. Validation avant commit."

---

Quand le document est produit, valide, et commit prepare, dis-le-moi. Pause 5 min puis on enchaine sur **TECH-DEBT-015B** (decisions strategiques + plan migration, base sur MONOREPO.md).
