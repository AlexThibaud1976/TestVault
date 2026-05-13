# Prompt Claude Code -- Sprint 7d (`feat/rename-testvault-action-to-argos-action`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming + alignement final** : **11eme et DERNIER sprint** de la serie renaming.
> Specificite : **GitHub Action composite** (livrable produit) avec **renaming dossier + 14 modifs action.yml + 2 docs + 4 spec-kit + tasks.md ROADMAP**.
> Surface confirmee terrain : 1 git mv + 14 modifs action.yml + 6 fichiers a aligner.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 6g/7c merge visible : `git log --oneline | Select-Object -First 3`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`

Si l'un echoue -> STOP.

---

## Contexte

**11eme sprint** de la serie renaming. **DERNIER SPRINT**. Apres celui-ci, **rebrand testvault -> argos TOTALEMENT TERMINE**.

**Specificite Sprint 7d** :
- C'est un **livrable produit** (GitHub Action composite pour GitHub Marketplace Actions)
- **Dossier renomme** : `tools/testvault-action/` -> `tools/argos-action/` (Option B validee, contrairement aux autres sprints `tools/` car ici le dossier contient explicitement `testvault-`)
- Pas de `package.json` (action composite, pas npm)
- **action.yml** : 14 modifications (name, description, inputs, CLI install, env vars, cmd shell)
- **Alignement post-Sprint 7a** : `testvault-cli` -> `argos-cli`, `testvault tc upload-results` -> `argos tc upload-results`, `TESTVAULT_*` -> `ARGOS_*`
- **PAS publie sur GitHub Marketplace Actions** : 0 utilisateur externe, liberte totale

**Decisions actees (2026-05-14, validees par utilisateur)** :

| # | Element | Avant | Apres |
|---|---|---|---|
| D1 | Dossier | `tools/testvault-action/` | `tools/argos-action/` (Option B) |
| D2 | action.yml `name` | `"TestVault — Upload CI Results"` (em-dash UTF-8 valide) | `"Argos - Upload CI Results"` (dash ASCII) |
| D3 | action.yml `description` | `"...TestVault (Argos) in Azure DevOps"` | `"...Argos test management in Azure DevOps"` |
| D4 | action.yml `inputs.plan-id.description` | `"TestVault Test Plan ID..."` | `"Argos Test Plan ID..."` |
| D5 | action.yml `inputs.cli-version.description` | `"Version of @atconseil/testvault-cli..."` | `"Version of @atconseil/argos-cli..."` |
| D6 | action.yml step `Install TestVault CLI` | `"Install TestVault CLI"` | `"Install Argos CLI"` |
| D7 | action.yml step npm install | `npm install -g @atconseil/testvault-cli@...` | `npm install -g @atconseil/argos-cli@...` |
| D8 | action.yml env vars | `TESTVAULT_PAT/ORG_URL/PROJECT` | `ARGOS_PAT/ORG_URL/PROJECT` |
| D9 | action.yml cmd shell | `testvault tc upload-results $ARGS` | `argos tc upload-results $ARGS` |
| D10 | docs/integrations/github-actions.md | 9 occurrences testvault | toutes alignees Argos |
| D11 | docs/user-guide.md L155 | `the atconseil/testvault-action GitHub Action` | `the atconseil/argos-action GitHub Action` |
| D12 | Specs/tasks.md L571 (ROADMAP) | `Action GitHub publiee atconseil/testvault-action@v1` | `Action GitHub publiee atconseil/argos-action@v1` |
| D13 | Specs/MIGRATION-PLAN.md | 6 occurrences (Sprint 7d marque DONE) | DONE 2026-05-14 |
| D14 | Specs/MONOREPO.md | 4 occurrences (tools/testvault-action -> tools/argos-action) | renamed references |
| D15 | Specs/PHASE-0-GAPS.md L251 | tools/testvault-action | tools/argos-action |
| D16 | Bump argos-extension | 0.4.20 | 0.4.21 |

**Verification cruciale** : `Specs/tasks.md` L571 est dans la **definition de Done de la tache T-4.6** (Action GitHub Phase 4). C'est la **roadmap produit officielle**. Renommer ici implique qu'une fois publiee, l'action s'appellera `atconseil/argos-action@v1` (pas `atconseil/testvault-action@v1`).

**Hors scope** :
- Renaming du repo GitHub `TestVault` (decision produit hors scope)
- Publication GitHub Marketplace Actions (decision produit future)
- Refactor TestPulse (consommateur futur, hors scope)

---

## Garde-fous Sprint 7d

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : `--force` sur turbo
Lecon Sprint 6f. Apres `git mv`, invalider le cache.

### Garde-fou #3 : ASCII strict dans action.yml
Le `name` du GitHub Action est **affiche sur GitHub Marketplace Actions** (et dans les workflows YAML). ASCII strict = zero ambiguite d'affichage. Dash `-` au lieu d'em-dash `—`.

Verification post-modification :
```powershell
$content = Get-Content tools\argos-action\action.yml -Raw -Encoding UTF8
$nonAscii = 0
for ($i = 0; $i -lt $content.Length; $i++) {
    if ([int][char]$content[$i] -gt 127) { $nonAscii++ }
}
Write-Host "  action.yml : $nonAscii caracteres non-ASCII"
# Attendu : 0
```

### Garde-fou #4 : git mv obligatoire
**Le dossier doit etre renomme avec `git mv`** pour preserver l'historique git du fichier `action.yml`.

```powershell
git mv tools/testvault-action tools/argos-action
git status
# On voit : renamed: tools/testvault-action/action.yml -> tools/argos-action/action.yml
```

### Garde-fou #5 : Verifier le binaire argos disponible
Le code appellera `argos tc upload-results` apres l'install de `@atconseil/argos-cli`. Verifier que :

```powershell
$pkg = Get-Content packages\argos-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  argos-cli name : $($pkg.name)"
Write-Host "  argos-cli bin  : $($pkg.bin | ConvertTo-Json -Compress)"
# Attendu :
#   name : @atconseil/argos-cli
#   bin  : { "argos": "./dist/cli.js" }
```

### Garde-fou #6 : Spec-kit complet (4 fichiers + tasks.md)

⚠ **Specs/tasks.md** est la ROADMAP produit. Modifier L571 avec **attention** : changer uniquement la ligne `atconseil/testvault-action@v1` -> `atconseil/argos-action@v1`. NE PAS modifier d'autres lignes.

### Garde-fou #7 : Apres Sprint 7d, le rebrand est TOTALEMENT termine
Self-check post-merge : aucune reference `testvault-action` ne doit subsister dans le repo (sauf historique git, prompts archives, et notes "Sprint 7d (done)").

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-action-to-argos-action

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check

```powershell
Write-Host "=== 1. Dossier source ===" -ForegroundColor Cyan
Test-Path tools\testvault-action
Test-Path tools\testvault-action\action.yml
$size = (Get-Item tools\testvault-action\action.yml).Length
Write-Host "  action.yml : $size bytes"

Write-Host "`n=== 2. Em-dash byte verification (devrait etre valide UTF-8) ===" -ForegroundColor Cyan
$content = Get-Content tools\testvault-action\action.yml -Raw -Encoding UTF8
$position = $content.IndexOf('—')
if ($position -ge 0) {
    $bytes = [System.IO.File]::ReadAllBytes("tools\testvault-action\action.yml")
    $textBefore = $content.Substring(0, $position)
    $bytesBefore = [System.Text.Encoding]::UTF8.GetByteCount($textBefore)
    $b1 = '{0:X2}' -f $bytes[$bytesBefore]
    $b2 = '{0:X2}' -f $bytes[$bytesBefore + 1]
    $b3 = '{0:X2}' -f $bytes[$bytesBefore + 2]
    Write-Host "  Bytes em-dash : $b1 $b2 $b3"
    # Attendu : E2 80 94
}

Write-Host "`n=== 3. References testvault dans action.yml (14 attendues) ===" -ForegroundColor Cyan
Select-String -Path tools\testvault-action\action.yml -Pattern "testvault|TESTVAULT_|TestVault" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow
}

Write-Host "`n=== 4. argos-cli verifie (Sprint 7a) ===" -ForegroundColor Cyan
$cliPkg = Get-Content packages\argos-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  name : $($cliPkg.name)"
Write-Host "  bin  : $($cliPkg.bin | ConvertTo-Json -Compress)"

Write-Host "`n=== 5. Consommateurs testvault-action (attendu : 0 package.json) ===" -ForegroundColor Cyan
$pkgCount = 0
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($c -match "testvault-action") {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgCount++
    }
}
Write-Host "Total : $pkgCount" -ForegroundColor Cyan

Write-Host "`n=== 6. References testvault-action dans le repo (attendu : 6 fichiers spec/doc) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs,Specs,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|claude-prompts|\\testvault-action\\" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match "testvault-action") {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== 7. docs/integrations/github-actions.md (9 refs attendues) ===" -ForegroundColor Cyan
Select-String -Path docs\integrations\github-actions.md -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length)))" -ForegroundColor Gray
}

Write-Host "`n=== 8. docs/user-guide.md L155 (1 ref attendue) ===" -ForegroundColor Cyan
Select-String -Path docs\user-guide.md -Pattern "testvault-action" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length)))" -ForegroundColor Gray
}

Write-Host "`n=== 9. Specs/tasks.md L571 (ROADMAP) ===" -ForegroundColor Cyan
Select-String -Path Specs\tasks.md -Pattern "testvault-action" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(150, $_.Line.Trim().Length)))" -ForegroundColor Gray
}
```

**Attendus** :
- action.yml : 2301 bytes
- em-dash valide (E2 80 94)
- ~14 lignes testvault/TestVault/TESTVAULT_ dans action.yml
- argos-cli name + bin confirmes
- 0 consommateur package.json
- 6 fichiers spec/doc mentionnent testvault-action
- 9 refs dans docs/integrations/github-actions.md
- 1 ref dans docs/user-guide.md
- 1 ref dans Specs/tasks.md L571

### 1.1 -- Reporter

> "Snapshot OK. argos-cli confirme (name + bin). 9 refs github-actions.md, 1 ref user-guide.md, 1 ref tasks.md L571 (ROADMAP T-4.6). Confirmation avant rename + 14 modifs action.yml + alignement docs/spec-kit ?"

---

## Etape 2 -- git mv du dossier

```powershell
git mv tools/testvault-action tools/argos-action

git status
# On voit : renamed: tools/testvault-action/action.yml -> tools/argos-action/action.yml
```

⚠ Le dossier `tools/argos-action/` existe maintenant. Pour les commandes suivantes, **utiliser le NOUVEAU chemin** : `tools/argos-action/`.

---

## Etape 3 -- Update tools/argos-action/action.yml (14 modifications)

⚠ ASCII strict obligatoire. Toutes les modifications doivent utiliser des dashes ASCII `-`, pas d'em-dash.

### 3.1 -- Ligne 1 : name

```diff
- name: "TestVault — Upload CI Results"
+ name: "Argos - Upload CI Results"
```

### 3.2 -- Ligne 2 : description

```diff
- description: "Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to TestVault (Argos) in Azure DevOps"
+ description: "Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to Argos test management in Azure DevOps"
```

### 3.3 -- inputs.plan-id.description

```diff
  plan-id:
-   description: "TestVault Test Plan ID to associate results with"
+   description: "Argos Test Plan ID to associate results with"
    required: true
```

### 3.4 -- inputs.cli-version.description

```diff
  cli-version:
-   description: "Version of @atconseil/testvault-cli to install"
+   description: "Version of @atconseil/argos-cli to install"
    required: false
    default: "latest"
```

### 3.5 -- Step "Install TestVault CLI"

```diff
-   - name: Install TestVault CLI
+   - name: Install Argos CLI
      shell: bash
-     run: npm install -g @atconseil/testvault-cli@${{ inputs.cli-version }}
+     run: npm install -g @atconseil/argos-cli@${{ inputs.cli-version }}
```

### 3.6 -- Step "Upload test results" : env vars

```diff
    - name: Upload test results
      shell: bash
      env:
-       TESTVAULT_PAT: ${{ inputs.pat }}
+       ARGOS_PAT: ${{ inputs.pat }}
-       TESTVAULT_ORG_URL: ${{ inputs.org-url }}
+       ARGOS_ORG_URL: ${{ inputs.org-url }}
-       TESTVAULT_PROJECT: ${{ inputs.project }}
+       ARGOS_PROJECT: ${{ inputs.project }}
```

### 3.7 -- Step "Upload test results" : cmd shell

```diff
      run: |
        ARGS="--file ${{ inputs.results-file }} --plan-id ${{ inputs.plan-id }} --env ${{ inputs.environment }}"
        if [ "${{ inputs.auto-create }}" = "true" ]; then ARGS="$ARGS --auto-create"; fi
        if [ "${{ inputs.strict }}" = "true" ]; then ARGS="$ARGS --strict"; fi
        if [ -n "${{ inputs.area-path }}" ]; then ARGS="$ARGS --area-path ${{ inputs.area-path }}"; fi
-       testvault tc upload-results $ARGS
+       argos tc upload-results $ARGS
```

### 3.8 -- Verification ASCII strict post-modif

```powershell
$content = Get-Content tools\argos-action\action.yml -Raw -Encoding UTF8
$nonAscii = 0
for ($i = 0; $i -lt $content.Length; $i++) {
    if ([int][char]$content[$i] -gt 127) { $nonAscii++ }
}
Write-Host "  action.yml : $nonAscii non-ASCII"
# Attendu : 0

Select-String -Path tools\argos-action\action.yml -Pattern "testvault|TESTVAULT_|TestVault" -Encoding UTF8
# Attendu : 0 ligne
```

---

## Etape 4 -- Update docs/integrations/github-actions.md (9 occurrences)

### 4.1 -- Titre + intro

```diff
- # TestVault — GitHub Actions Integration
+ # Argos - GitHub Actions Integration

- The `atconseil/testvault-action` composite action uploads CI test results to TestVault (Argos) in Azure DevOps by matching test results to Test Cases via `automationKey`.
+ The `atconseil/argos-action` composite action uploads CI test results to Argos in Azure DevOps by matching test results to Test Cases via `automationKey`.
```

### 4.2 -- Exemples YAML (steps)

L22-L23 :
```diff
-     - name: Upload results to TestVault
+     - name: Upload results to Argos
-       uses: atconseil/testvault-action@v1
+       uses: atconseil/argos-action@v1
```

L73 (2eme exemple) :
```diff
-       - uses: atconseil/testvault-action@v1
+       - uses: atconseil/argos-action@v1
```

### 4.3 -- Table des inputs

L40 :
```diff
- | `plan-id` | ✅ | — | TestVault Test Plan work item ID |
+ | `plan-id` | ✅ | — | Argos Test Plan work item ID |
```

L46 :
```diff
- | `cli-version` | — | `latest` | Version of `@atconseil/testvault-cli` to install |
+ | `cli-version` | — | `latest` | Version of `@atconseil/argos-cli` to install |
```

### 4.4 -- Mentions TestVault dans le texte

L60 :
```diff
- Each test result is matched to a TestVault Test Case by `automationKey`:
+ Each test result is matched to an Argos Test Case by `automationKey`:
```

L68 :
```diff
- Set `automationKey` on a Test Case in TestVault to enable matching. Results without a matching Test Case are counted as `unmatched` (or fail the action with `strict: true`).
+ Set `automationKey` on a Test Case in Argos to enable matching. Results without a matching Test Case are counted as `unmatched` (or fail the action with `strict: true`).
```

### 4.5 -- Verification post-modif

```powershell
Select-String -Path docs\integrations\github-actions.md -Pattern "testvault|TestVault|TESTVAULT_" -Encoding UTF8
# Attendu : 0 ligne
```

---

## Etape 5 -- Update docs/user-guide.md L155

```diff
- Upload results from any CI system using the `testvault` CLI, the `atconseil/testvault-action` GitHub Action, or the `ArgosUploadResults` Azure Pipelines task. All three accept the same test result formats listed above and share the same matching logic. See `docs/integrations/` for quick-start examples.
+ Upload results from any CI system using the `argos` CLI, the `atconseil/argos-action` GitHub Action, or the `ArgosUploadResults` Azure Pipelines task. All three accept the same test result formats listed above and share the same matching logic. See `docs/integrations/` for quick-start examples.
```

Note : la ligne mentionne aussi `testvault` CLI (apres Sprint 7a, devrait etre `argos`). A verifier et aligner.

```powershell
Select-String -Path docs\user-guide.md -Pattern "testvault" -Encoding UTF8
# Apres modification : 0 ligne (sauf eventuellement dans des chemins ou exemples non lies)
```

⚠ Si d'autres lignes contiennent `testvault` dans `docs/user-guide.md`, **regarder le contexte** :
- Si reference au binaire CLI ou au package : aligner Argos
- Si reference au repo GitHub ou au nom interne du projet : laisser (hors scope)

---

## Etape 6 -- Update Specs/tasks.md L571 (ROADMAP)

⚠ **CRUCIAL** : modifier uniquement la ligne L571.

```diff
- - [ ] Action GitHub publiée `atconseil/testvault-action@v1`
+ - [ ] Action GitHub publiee `atconseil/argos-action@v1`
```

Note : la ligne contient `publiée` (avec accent). On peut soit :
- Garder l'accent (UTF-8 valide, c'est juste un fichier markdown) 
- Aligner avec ASCII strict (`publiee`) pour coherence

**Decision** : garder l'accent. C'est de la doc francaise, pas du code. ASCII strict s'applique aux noms de fichiers/binaires/strings de code/commit messages.

Donc :
```diff
- - [ ] Action GitHub publiée `atconseil/testvault-action@v1`
+ - [ ] Action GitHub publiée `atconseil/argos-action@v1`
```

---

## Etape 7 -- Update Specs/MIGRATION-PLAN.md (6 occurrences)

### 7.1 -- Section 1.9 (notes sur Sprint 7d)

Repasser le statut de Sprint 7d en DONE :

L175 :
```diff
- | `tools/testvault-action/` | Renommer en `tools/argos-action/`, aligner avec rebrand argos | **Sprint 7d (NEW)** |
+ | `tools/testvault-action/` | Renomme en `tools/argos-action/`, aligne avec rebrand argos | **Sprint 7d DONE 2026-05-14** |
```

L181-L189 (description detaillee) :
```diff
- **Sprint 7d -- testvault-action -> argos-action** :
+ **Sprint 7d -- testvault-action -> argos-action (DONE 2026-05-14)** :
  
- - Dossier : `tools/testvault-action/` -> `tools/argos-action/`
+ - Dossier : `tools/testvault-action/` -> `tools/argos-action/` (git mv done)
  - `action.yml` : fix mojibake `name: "TestVault â€" Upload CI Results"` -> `name: "Argos - Upload CI Results"`
```

⚠ Note : ce passage mentionne "fix mojibake" qui etait une fausse-piste (em-dash UTF-8 valide). Garder pour l'historique mais ajouter une note :

```diff
- - `action.yml` : fix mojibake `name: "TestVault â€" Upload CI Results"` -> `name: "Argos - Upload CI Results"`
+ - `action.yml` : `name: "TestVault — Upload CI Results"` (em-dash UTF-8 valide) -> `name: "Argos - Upload CI Results"` (dash ASCII, decision D2)
```

(Suite des points -> mettre tous DONE avec note "applique")

### 7.2 -- Section 3 (tableau d'execution)

L303 :
```diff
- | Sprint 7d | Renaming `tools/testvault-action/` -> `tools/argos-action/` (GitHub Action) | ~25 min | Faible (0 consommateur interne, GitHub Action composite avec mojibake) | Apres 7a |
+ | Sprint 7d | Rename + alignement `tools/testvault-action/` -> `tools/argos-action/` (GitHub Action) | ~30 min | Faible (0 consommateur, GitHub Action composite non publiee) | **DONE 2026-05-14** |
```

### 7.3 -- Mention historique des consommateurs externes

L316, L327 : ces lignes sont dans des notes historiques. **Mettre a jour avec attention** pour refleter que Sprint 7d est now DONE :

L316 :
```diff
- > Les 3 consommateurs externes du binaire (tools/azure-pipelines-task, tools/testvault-action,
+ > Les 3 consommateurs externes du binaire (tools/azure-pipelines-task, tools/argos-action,
```

L327 :
```diff
- > (testvault-action) qui sont des renamings de DOSSIERS dans `tools/`, pas des packages.
+ > (argos-action) qui sont des renamings de DOSSIERS dans `tools/`, pas des packages.
```

### 7.4 -- Ajouter une note finale "renaming complet"

A la fin du document, ajouter :
```markdown
> **JALON 2026-05-14** : Sprint 7d livre. **Renaming testvault -> argos TOTALEMENT TERMINE**.
> 11 sprints au total : 5a/5b cleanup, 6a + follow-up, 6b, 6c, 6d, 6e, 6f, 6h, 7a, 7b, 6g/7c, 7d.
> Plus 2 sprints methodologiques : TECH-DEBT-015A follow-up #1 et #2.
> Tous les packages et dossiers utilisent maintenant le prefixe `argos-*` (sauf nominal `TestVault.*`
> pour les Custom WIT, locke par constitution sections 3.4 et 9 -- retrocompatibilite).
```

---

## Etape 8 -- Update Specs/MONOREPO.md (4 occurrences)

L28 (tableau Vue d'ensemble) :
```diff
- | `tools/testvault-action` | **Livrable produit** | GitHub Action composite pour Marketplace Actions (TestVault upload results) |
+ | `tools/argos-action` | **Livrable produit** | GitHub Action composite pour GitHub Marketplace Actions (Argos upload results) |
```

L479 (carte des dependances) :
```diff
- tools/testvault-action -> appelle CLI testvault (binaire, pas dependency npm declaree)
+ tools/argos-action -> appelle CLI argos (binaire, pas dependency npm declaree)
```

L605 (observation methodologique) -- garder pour l'historique mais updater le nom :
```diff
- package.json (testvault-action, preflight, claude-prompts, load-testing, migration-scripts). Suite
+ package.json (argos-action -- ex testvault-action, preflight, claude-prompts, load-testing, migration-scripts). Suite
```

L725 (section detaillee testvault-action) :
```diff
- ### tools/testvault-action/
+ ### tools/argos-action/
```

Et dans cette section, updater les references internes (chemins, contenu action.yml).

---

## Etape 9 -- Update Specs/PHASE-0-GAPS.md L251

```diff
- - `tools/testvault-action/` (action.yml, GitHub Action composite)
+ - `tools/argos-action/` (action.yml, GitHub Action composite) -- ex tools/testvault-action/, renomme Sprint 7d
```

---

## Etape 10 -- pnpm install + validation

```powershell
pnpm install
# Workspace refresh

# Tests regression
pnpm --filter @atconseil/regression-suite test
# 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# 0 file

# Pre-flight
pnpm preflight
# PASSED

# Turbo avec --force
pnpm turbo lint --force
pnpm turbo typecheck --force
pnpm turbo test --force
pnpm turbo build --force
# Tous verts
```

### 10.1 -- Self-check RESIDUAL

```powershell
Write-Host "=== Residus testvault-action partout ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs,Specs,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|claude-prompts" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match "testvault-action") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
        Select-String -Path $_.FullName -Pattern "testvault-action" -Encoding UTF8 | ForEach-Object {
            Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length)))" -ForegroundColor Gray
        }
    }
}
# Attendu : 0 RESIDUAL (sauf eventuellement notes "ex testvault-action" intentionnelles)

Write-Host "`n=== Residus testvault dans tools/argos-action/ ===" -ForegroundColor Cyan
Get-ChildItem tools\argos-action -Recurse -File | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match "testvault|TESTVAULT_|TestVault") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 RESIDUAL

Write-Host "`n=== Verification action.yml ASCII strict ===" -ForegroundColor Cyan
$content = Get-Content tools\argos-action\action.yml -Raw -Encoding UTF8
$nonAscii = 0
for ($i = 0; $i -lt $content.Length; $i++) {
    if ([int][char]$content[$i] -gt 127) { $nonAscii++ }
}
Write-Host "  action.yml : $nonAscii non-ASCII"
# Attendu : 0

Write-Host "`n=== Verification finale : aucun testvault- prefix nulle part ===" -ForegroundColor Cyan
$found = $false
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs,Specs,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|claude-prompts|CFG-2026-05-13-package-naming|CHANGELOG\.md|MIGRATION-PLAN\.md|MONOREPO\.md|PHASE-0-GAPS\.md|tasks\.md|wit-schema\.md" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match "@atconseil/testvault-|testvault-action") {
        Write-Host "RESIDUAL prefix testvault-: $($_.FullName)" -ForegroundColor Red
        $found = $true
    }
}
if (-not $found) {
    Write-Host "JALON: aucun testvault- prefix subsiste dans le code/workflows." -ForegroundColor Green
}
```

⚠ Si RESIDUAL trouve dans action.yml ou tools/argos-action/, STOP.
⚠ Les fichiers EXCLUS du dernier check (CHANGELOG, MIGRATION-PLAN, MONOREPO, PHASE-0-GAPS, tasks, wit-schema) peuvent **legitimement contenir** "testvault" dans des notes historiques (Sprint 5a, Sprint 6a, etc.). C'est normal.

### 10.2 -- Verifier portfolio tools/

```powershell
Get-ChildItem tools -Directory | Select-Object Name
# Attendu :
#   argos-action       (NOUVEAU)
#   azure-pipelines-task
#   claude-prompts
#   e2e
#   load-testing
#   migration-scripts
#   preflight
#   regression

Test-Path tools\testvault-action
# Attendu : False
```

---

## Etape 11 -- Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 7d (final): rename testvault-action to argos-action + rebrand complete"
# ASCII strict

pnpm changeset version
# Attendu : bump 0.4.20 -> 0.4.21
```

---

## Etape 12 -- CHANGELOG entry (LE DERNIER renaming)

```markdown
## [0.4.21] - 2026-05-14

### Changed (Sprint 7d - feat/rename-testvault-action-to-argos-action) - **DERNIER SPRINT RENAMING**

- **`tools/testvault-action/` renomme en `tools/argos-action/`** (11eme et dernier sprint de la serie renaming).
- **GitHub Action composite alignee** avec le rebrand argos :
  - `name` : "TestVault - Upload CI Results" -> "Argos - Upload CI Results" (dash ASCII strict)
  - `description` alignee
  - `inputs.plan-id.description` : "TestVault Test Plan ID" -> "Argos Test Plan ID"
  - `inputs.cli-version.description` : reference `@atconseil/argos-cli`
  - Step `Install TestVault CLI` -> `Install Argos CLI`
  - `npm install -g @atconseil/testvault-cli` -> `@atconseil/argos-cli`
  - Variables env : `TESTVAULT_PAT/ORG_URL/PROJECT` -> `ARGOS_*`
  - Commande shell : `testvault tc upload-results` -> `argos tc upload-results`
- **Em-dash UTF-8 valide remplace par dash ASCII** (coherence decision D6 Sprint 6g/7c) :
  - Verification byte : `name` contenait E2 80 94 (em-dash UTF-8 valide), pas mojibake
  - Decision : ASCII strict pour textes utilisateurs visibles (GitHub Marketplace Actions)
- **Documentation alignee** (2 fichiers utilisateur, 4 spec-kit) :
  - `docs/integrations/github-actions.md` : 9 occurrences testvault -> Argos (titre, exemples YAML, table inputs, mentions texte)
  - `docs/user-guide.md` L155 : `atconseil/testvault-action` -> `atconseil/argos-action`, `testvault` CLI -> `argos` CLI
  - `Specs/tasks.md` L571 (ROADMAP T-4.6) : "Action GitHub publiee atconseil/testvault-action@v1" -> "atconseil/argos-action@v1"
  - `Specs/MIGRATION-PLAN.md` : Sprint 7d DONE + jalon final "Renaming totalement termine"
  - `Specs/MONOREPO.md` : 4 occurrences alignees
  - `Specs/PHASE-0-GAPS.md` L251 : aligne

### Modifications

- `tools/testvault-action/` -> `tools/argos-action/` (git mv)
- `tools/argos-action/action.yml` : 14 modifications (name, description, inputs, CLI install, env vars, cmd shell)
- `docs/integrations/github-actions.md` : 9 occurrences alignees
- `docs/user-guide.md` L155 : aligne
- `Specs/tasks.md` L571 : ROADMAP T-4.6 aligne
- `Specs/MIGRATION-PLAN.md` : Sprint 7d DONE + jalon final
- `Specs/MONOREPO.md` : 4 occurrences alignees
- `Specs/PHASE-0-GAPS.md` L251 : aligne
- `CHANGELOG.md` : [0.4.21]

### Notes (Sprint 7d)

- **GitHub Action non publiee sur GitHub Marketplace Actions** : 0 utilisateur externe impacte. Liberte totale pour renommer.
- **Quand cette action sera publiee** (decision produit future), le path sera `atconseil/argos-action@v1` (pas `atconseil/testvault-action@v1`), coherent avec le rebrand global.
- **Em-dash UTF-8 valide -> dash ASCII** : continuite avec Sprint 6g/7c. ASCII strict pour textes utilisateurs visibles dans les UI (GitHub Marketplace, Azure DevOps Pipeline Designer).
- **Cross-package** : aucun residual testvault-action ailleurs (tous les 6 fichiers spec/doc alignes).

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

### TECH-DEBT actifs post-renaming

- TECH-DEBT-021 : Migration `build:vsix` output-path
- TECH-DEBT-022 : Cleanup auto artefacts orphelins post-`git mv`
- TECH-DEBT-024 : Forcer `--force` sur turbo dans validation post-renaming (lecon Sprint 6f)
- TECH-DEBT-026 : Resync `Specs/tasks.md` avec realite du code (OBLIGATOIRE avant Sprint 2.5b)
- TECH-DEBT-027 : Documenter encoding PowerShell 5.1 + `.gitattributes` (~15 min, recommande prochainement)
- ANNULES : TECH-DEBT-023, TECH-DEBT-025 (faux positifs mojibake)

### Backlog post-renaming

1. **TECH-DEBT-027** : Documenter PowerShell + `.gitattributes` (~15 min)
2. **Sprint 8** : Versioning alignement Changesets fixed mode (~30 min)
3. **Batch Dependabot** : 5 PR ouvertes (~30 min)
4. **TECH-DEBT-026 OBLIGATOIRE** : Resync `Specs/tasks.md` avec realite du code (avant Sprint 2.5b)
5. **Sprint 2.5b** : Wiring CRUD Phase 1 (Run, Coverage, Settings non-LLM)
6. **WIRING-CLOUD-PLUS** : IFlakinessReportService
7. **Sprint 2.5c+** : Wiring Phase 2 et 3

Bump 0.4.20 -> 0.4.21.

### Lessons learned (Sprint 7d)

- **Spec-kit n'est pas que de la doc** : `Specs/tasks.md` L571 contenait une roadmap produit qui devait etre alignee. Le spec-kit fait partie du rebrand, pas un livrable a part.
- **Distinction "scope renaming" vs "scope produit"** : le repo GitHub `TestVault` reste `TestVault` (decision produit hors scope renaming). Mais tous les composants internes/livrables sont argos.
- **3 livrables produit coherents post-renaming** :
  - `@atconseil/argos-cli` (binaire `argos`)
  - `argos-azure-pipelines-task` (Azure DevOps Pipeline Task `ArgosUploadResults@1`)
  - `argos-action` (GitHub Action composite `atconseil/argos-action@v1` future publication)
- Les 3 partagent le meme contrat : variables `ARGOS_*` + commande `argos tc upload-results`.
- **Em-dash UTF-8 valide remplace partout par dash ASCII** dans les textes utilisateurs visibles (UI ADO, UI GitHub Marketplace, docs Markdown). Zero ambiguite future.
```

---

## Etape 13 -- Archive + commit

### 13.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-7d.md", "$HOME\Downloads\CLAUDE_TASK_sprint-7d.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-7d.md
}
```

### 13.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-action to argos-action (Sprint 7d - FINAL)`n`n11th and last sprint of the testvault to argos renaming wave."
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

### 13.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "feat(packages): rename testvault-action to argos-action (Sprint 7d FINAL)" `
  -m "" `
  -m "11th and LAST sprint of the testvault to argos renaming wave." `
  -m "" `
  -m "Changes:" `
  -m "- tools/testvault-action/ -> tools/argos-action/ (git mv)" `
  -m "- action.yml: 14 modifications (name, description, inputs, CLI install, env vars, cmd shell)" `
  -m "  - name: 'Argos - Upload CI Results' (dash ASCII)" `
  -m "  - npm install -g @atconseil/argos-cli (was testvault-cli)" `
  -m "  - env vars ARGOS_PAT/ORG_URL/PROJECT (was TESTVAULT_*)" `
  -m "  - cmd: argos tc upload-results (was testvault)" `
  -m "- docs/integrations/github-actions.md: 9 occurrences aligned" `
  -m "- docs/user-guide.md L155: atconseil/argos-action + argos CLI" `
  -m "- Specs/tasks.md L571 (ROADMAP T-4.6): atconseil/argos-action@v1" `
  -m "- Specs/MIGRATION-PLAN.md: Sprint 7d DONE + JALON FINAL note" `
  -m "- Specs/MONOREPO.md: 4 occurrences aligned" `
  -m "- Specs/PHASE-0-GAPS.md L251: aligned" `
  -m "" `
  -m "Em-dash byte verification (2026-05-14): TestVault em-dash was valid UTF-8" `
  -m "(E2 80 94), not mojibake. Replaced by ASCII dash by D2 decision (consistency" `
  -m "with Sprint 6g/7c ASCII strict policy for user-visible texts)." `
  -m "" `
  -m "GitHub Action not yet published on GitHub Marketplace Actions (0 external" `
  -m "users impacted). Future publication path: atconseil/argos-action@v1." `
  -m "" `
  -m "JALON HISTORIQUE: testvault -> argos rebrand TOTALLY COMPLETE." `
  -m "11 renaming sprints + 2 methodology sprints over 2 days (2026-05-13/14)." `
  -m "" `
  -m "Final state:" `
  -m "- 8/8 packages in packages/ use argos-* prefix" `
  -m "- All product deliverables aligned (CLI, Azure Pipelines Task, GitHub Action)" `
  -m "- Public env vars: ARGOS_* (was TESTVAULT_*)" `
  -m "- Shell binary: argos (was testvault)" `
  -m "- TestVault.* WIT prefix strings PRESERVED (constitution sections 3.4, 9 backward compat)" `
  -m "" `
  -m "Methodology:" `
  -m "- pnpm turbo lint/typecheck/test/build --force used" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "- action.yml verified ASCII strict (GitHub Marketplace UI safe)" `
  -m "- All 6 spec/doc files aligned" `
  -m "" `
  -m "Bump 0.4.20 to 0.4.21." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md, Specs/tasks.md T-4.6, Specs/constitution.md sections 3.4 9 10"

git push -u origin feat/rename-testvault-action-to-argos-action
```

PR.

---

## Etape 14 -- POST-MERGE CLEANUP

⚠ **A faire APRES merge GitHub.**

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 5
# Attendu : Sprint 7d en tete

git branch -d feat/rename-testvault-action-to-argos-action
# Si refus : git branch -D feat/rename-testvault-action-to-argos-action

git remote prune origin

# Verifier portfolio tools/
Get-ChildItem tools -Directory | Select-Object Name
# Attendu :
#   argos-action          (NOUVEAU)
#   azure-pipelines-task
#   claude-prompts
#   e2e
#   load-testing
#   migration-scripts
#   preflight
#   regression

Test-Path tools\testvault-action
# Attendu : False

# Verifier action.yml
$content = Get-Content tools\argos-action\action.yml -Raw -Encoding UTF8
Write-Host "Lignes contenant Argos :"
Select-String -Path tools\argos-action\action.yml -Pattern "Argos|argos" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Green
}

# JALON : aucun testvault- dans le code/workflows
Write-Host "`nVerification finale (devrait afficher : aucun residual) :" -ForegroundColor Green
$found = $false
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml -Path packages,apps,tools,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|claude-prompts" } | ForEach-Object {
    $c = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($c -match "@atconseil/testvault-|testvault-action|TESTVAULT_") {
        Write-Host "  RESIDUAL: $($_.FullName)" -ForegroundColor Red
        $found = $true
    }
}
if (-not $found) {
    Write-Host "  JALON: aucun testvault- subsiste dans le code." -ForegroundColor Green
}

# Sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-action-to-argos-action` creee
- [ ] Snapshot validee : 14 refs testvault dans action.yml, 6 fichiers spec/doc avec testvault-action
- [ ] **`git mv` execute** : `tools/testvault-action/` -> `tools/argos-action/`
- [ ] `tools/argos-action/action.yml` : 14 modifications appliquees
- [ ] `tools/argos-action/action.yml` : **0 caractere non-ASCII** (verification post-modification)
- [ ] `docs/integrations/github-actions.md` : 9 occurrences testvault -> Argos
- [ ] `docs/user-guide.md` L155 : aligne
- [ ] `Specs/tasks.md` L571 (ROADMAP T-4.6) : `atconseil/argos-action@v1`
- [ ] `Specs/MIGRATION-PLAN.md` : Sprint 7d DONE + jalon final
- [ ] `Specs/MONOREPO.md` : 4 occurrences alignees
- [ ] `Specs/PHASE-0-GAPS.md` L251 : aligne
- [ ] `pnpm install` OK
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Suite regression : 51/51 passing
- [ ] **JALON** : aucun `testvault-action` ou `@atconseil/testvault-` ou `TESTVAULT_` dans le code/workflows
- [ ] CHANGELOG [0.4.21] avec JALON HISTORIQUE et 11 sprints recap
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.20 -> 0.4.21
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot OK. argos-cli confirme. 14 refs dans action.yml, 9 dans github-actions.md, 1 user-guide L155, 1 tasks.md L571 (ROADMAP), 6 spec-kit total. Confirmation avant rename + 14 modifs + alignement docs/spec-kit ?"

2. **Apres Etape 10.1 (self-check RESIDUAL)** : "Rebrand termine. 0 RESIDUAL testvault-action. action.yml ASCII pur. docs/spec-kit alignes. lint/typecheck/test/build --force OK. Pret a commit ?"

3. **Apres Etape 13.3** : "PR ouverte. **JALON HISTORIQUE** : 11 sprints renaming livres en 2 jours. Apres merge GitHub, lance Etape 14 (post-merge cleanup)."

---

## Apres post-merge cleanup -- JALON HISTORIQUE

**Renaming testvault -> argos TOTALEMENT TERMINE.**

Backlog post-renaming :
- TECH-DEBT-027 : `.gitattributes` + doc PowerShell encoding (~15 min)
- Sprint 8 : Versioning alignement Changesets fixed mode (~30 min)
- Batch Dependabot (5 PR, ~30 min)
- TECH-DEBT-026 OBLIGATOIRE : Resync Specs/tasks.md (avant Sprint 2.5b)
- Sprint 2.5b : Wiring CRUD Phase 1 (vrai produit)

Tu auras merite **une vraie pause apres celui-ci**. 11 sprints en 2 jours, c'est exceptionnel.
