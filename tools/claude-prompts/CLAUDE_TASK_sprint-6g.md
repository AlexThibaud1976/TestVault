# Prompt Claude Code -- Sprint 6g/7c (`feat/rename-testvault-azure-pipelines-task-to-argos`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **renaming + cleanup** : 10eme sprint de la serie renaming.
> Specificite : **Azure Pipelines Task** (livrable produit) avec **GUID a regenerer**, **commande shell** a aligner, **variables d'env publiques** a aligner, **doc utilisateur** a updater.
> Surface confirmee terrain : 1 git mv non + 7 modifications + 1 nouveau GUID + 1 doc enrichie.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] Sprint 7b merge visible : `git log --oneline | Select-Object -First 3`
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 51 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake
- [ ] Defender exclu sur `E:\Code\TestVault`

Si l'un echoue -> STOP.

---

## Contexte

**10eme sprint** de la serie renaming. **Avant-dernier sprint** : reste Sprint 7d apres celui-ci (testvault-action GitHub Action).

**Specificite Sprint 6g/7c** :
- C'est un **livrable produit** (Azure DevOps Pipeline Task pour Marketplace ADO Pipeline Tasks)
- **Dossier inchange** : `tools/azure-pipelines-task/` reste (Option A, coherence Sprint 6h)
- **Package npm renomme** : `@atconseil/testvault-azure-pipelines-task` -> `@atconseil/argos-azure-pipelines-task`
- **GUID placeholder a regenerer** : `a1b2c3d4-e5f6-7890-abcd-ef1234567890` -> vrai GUID via `[guid]::NewGuid()`
- **Alignement post-Sprint 7a** : `testvault tc upload-results` -> `argos tc upload-results`, `TESTVAULT_*` -> `ARGOS_*`
- **task.json textes** : friendlyName, description, instanceNameFormat updates avec ASCII strict (dash `-` au lieu d'em-dash)
- **PAS publie sur Marketplace ADO** : 0 utilisateur externe, liberte totale

**Decisions actees (2026-05-14, validees par utilisateur)** :

| # | Element | Avant | Apres |
|---|---|---|---|
| D1 | Dossier | `tools/azure-pipelines-task/` | **inchange** |
| D2 | package.json `name` | `@atconseil/testvault-azure-pipelines-task` | `@atconseil/argos-azure-pipelines-task` |
| D3 | package.json `description` | (vide) | `"Argos Azure Pipelines task - upload CI test results to Argos test management in Azure DevOps"` |
| D4 | task.json `id` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | **vrai GUID** genere via `[guid]::NewGuid()` |
| D5 | task.json `name` | `ArgosUploadResults` | **inchange** (deja bon) |
| D6 | task.json `friendlyName` | `TestVault — Upload CI Results` (em-dash UTF-8 valide) | `Argos - Upload CI Results` (dash ASCII) |
| D7 | task.json `description` | `Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to TestVault (Argos) in Azure DevOps` | `Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to Argos test management in Azure DevOps` |
| D8 | task.json `instanceNameFormat` | `Upload results to TestVault plan $(planId)` | `Upload results to Argos plan $(planId)` |
| D9 | task.json `version` | `1.0.0` | **inchange** (pas publie, pas de raison de bumper) |
| D10 | task.json `helpMarkDown` | URL GitHub TestVault | **inchange** (le repo s'appelle encore TestVault, hors scope) |
| D11 | src/index.ts L52 | `testvault tc upload-results` | `argos tc upload-results` |
| D12 | src/index.ts L58-60 | `TESTVAULT_PAT/ORG_URL/PROJECT` | `ARGOS_PAT/ORG_URL/PROJECT` |
| D13 | src/index.test.ts | mocks/assertions alignees | id |
| D14 | docs/integrations/azure-pipelines.md | 9 occurrences testvault + `$(TESTVAULT_PLAN_ID)` | toutes alignees Argos + `$(ARGOS_PLAN_ID)` |
| D15 | Bump argos-extension | 0.4.19 | 0.4.20 |

**Verification cruciale (2026-05-14)** : la chaine `TestVault — Upload CI Results` contient un **em-dash UTF-8 valide** (bytes E2 80 94), pas un mojibake. **Mais on le remplace par un dash ASCII** par decision D6 (coherence ASCII strict, evite tout debat futur sur l'encoding console PowerShell).

**Hors scope** :
- `tools/testvault-action/action.yml` (Sprint 7d, dedie)
- `docs/integrations/github-actions.md` (Sprint 7d)
- Renaming du repo GitHub `TestVault` (decision produit, hors scope renaming actuel)
- Publication Marketplace ADO Pipeline Tasks (decision produit future)

---

## Garde-fous Sprint 6g/7c

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : `--force` sur turbo
Lecon Sprint 6f. Apres modifications, invalider le cache.

### Garde-fou #3 : VRAI GUID, pas un placeholder
**Critique** : le GUID dans `task.json` doit etre un vrai GUID v4 unique, pas un placeholder. Verifier le pattern `xxxxxxxx-xxxx-4xxx-[8-b]xxx-xxxxxxxxxxxx` (v4) ou similaire (v1).

Generation PowerShell :
```powershell
$newGuid = [guid]::NewGuid().ToString()
Write-Host "Nouveau GUID : $newGuid" -ForegroundColor Green
```

**Note** : une fois publie sur Marketplace ADO Pipeline Tasks, le GUID **devient immutable** (changer le GUID = nouvelle task = perd l'historique d'utilisation). Comme la task **n'est pas publiee**, on peut le regenerer librement maintenant.

### Garde-fou #4 : ASCII strict dans task.json
Le `friendlyName` et `description` du `task.json` sont **affiches dans l'UI Azure DevOps** (Designer pipeline). ASCII strict (pas d'em-dash, pas d'accents) = zero ambiguite d'affichage sur tous les environnements ADO.

Verification post-modification :
```powershell
$content = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8
$nonAscii = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    if ([int][char]$content[$i] -gt 127) {
        $nonAscii += "Position $i : '$($content[$i])' (U+$('{0:X4}' -f [int][char]$content[$i]))"
    }
}
if ($nonAscii.Count -gt 0) {
    Write-Host "STOP : non-ASCII dans task.json :" -ForegroundColor Red
    $nonAscii | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "task.json ASCII pur. OK." -ForegroundColor Green
}
```

### Garde-fou #5 : NE PAS toucher Sprint 7d
Le grep va trouver `testvault` / `TESTVAULT_*` dans :
- `tools/testvault-action/action.yml`

**Ce fichier RESTE TEL QUEL apres Sprint 6g/7c.** Sera fixe Sprint 7d.

Verification post-modification :
```powershell
Select-String -Path tools\testvault-action\action.yml -Pattern "testvault|TESTVAULT_" -Encoding UTF8
# Doit ENCORE retourner des resultats (sera fixe Sprint 7d)
```

### Garde-fou #6 : Verifier le binaire post-Sprint 7a
Le code source appellera `argos tc upload-results`. Verifier que `argos` est **bien le binaire** declare dans `packages/argos-cli/package.json` :

```powershell
$pkg = Get-Content packages\argos-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Bin : $($pkg.bin | ConvertTo-Json)"
# Attendu : { "argos": "./dist/cli.js" }
```

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-azure-pipelines-task-to-argos

pnpm install
pnpm --filter @atconseil/regression-suite test
# 51 passing
```

---

## Etape 1 -- Snapshot sanity check + generation GUID

```powershell
Write-Host "=== 1. Dossier et fichiers ===" -ForegroundColor Cyan
Get-ChildItem tools\azure-pipelines-task -File | Select-Object Name
Get-ChildItem tools\azure-pipelines-task\src -File | Select-Object Name

Write-Host "`n=== 2. package.json (state actuel) ===" -ForegroundColor Cyan
$pkg = Get-Content tools\azure-pipelines-task\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  name        : $($pkg.name)"
Write-Host "  description : '$($pkg.description)'"
Write-Host "  version     : $($pkg.version)"
Write-Host "  private     : $($pkg.private)"

Write-Host "`n=== 3. task.json (champs critiques) ===" -ForegroundColor Cyan
$task = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  id                  : $($task.id)"
Write-Host "  name                : $($task.name)"
Write-Host "  friendlyName        : $($task.friendlyName)"
Write-Host "  description         : $($task.description)"
Write-Host "  instanceNameFormat  : $($task.instanceNameFormat)"
Write-Host "  version             : $($task.version | ConvertTo-Json -Compress)"

Write-Host "`n=== 4. Generation du nouveau GUID (CRITIQUE) ===" -ForegroundColor Cyan
$newGuid = [guid]::NewGuid().ToString()
Write-Host "  Nouveau GUID : $newGuid" -ForegroundColor Green
Write-Host "  ATTENTION : noter ce GUID, il sera utilise dans task.json"

Write-Host "`n=== 5. References testvault dans src/ ===" -ForegroundColor Cyan
Select-String -Path tools\azure-pipelines-task\src\*.ts -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  $($_.Filename) L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow
}

Write-Host "`n=== 6. Consommateurs (attendu : 0) ===" -ForegroundColor Cyan
$pkgCount = 0
Get-ChildItem -Recurse -Filter package.json -Path packages,apps,tools | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "azure-pipelines-task" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match '"@atconseil/testvault-azure-pipelines-task"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
        $pkgCount++
    }
}
Write-Host "Total : $pkgCount" -ForegroundColor Cyan

Write-Host "`n=== 7. Verifier le binaire argos disponible (Sprint 7a) ===" -ForegroundColor Cyan
$cliPkg = Get-Content packages\argos-cli\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "  argos-cli bin : $($cliPkg.bin | ConvertTo-Json -Compress)"
# Attendu : { "argos": "./dist/cli.js" }

Write-Host "`n=== 8. CROSS-PACKAGE (NE PAS MODIFIER : Sprint 7d) ===" -ForegroundColor Red
Write-Host "tools/testvault-action/action.yml :" -ForegroundColor Red
Select-String -Path tools\testvault-action\action.yml -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}

Write-Host "`n=== 9. docs/integrations/azure-pipelines.md (a updater) ===" -ForegroundColor Cyan
Select-String -Path docs\integrations\azure-pipelines.md -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
    Write-Host "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(120, $_.Line.Trim().Length)))" -ForegroundColor Gray
}
```

**Attendus** :
- 0 consommateur
- 4 references testvault dans src/index.ts (lignes 52, 58, 59, 60)
- argos-cli bin = `{ "argos": "./dist/cli.js" }`
- tools/testvault-action/action.yml retourne des matches (NORMAL, Sprint 7d)
- docs/integrations/azure-pipelines.md ~9 occurrences

### 1.1 -- Reporter

> "Snapshot OK. Nouveau GUID genere : [NOUVEAU_GUID]. argos-cli bin confirme. Confirmation avant modifications ?"

⚠ **CRUCIAL** : noter le `[NOUVEAU_GUID]` genere a l'Etape 1 pour l'utiliser a l'Etape 3.

---

## Etape 2 -- Update tools/azure-pipelines-task/package.json

### 2.1 -- Champ `name` + `description`

```diff
- "name": "@atconseil/testvault-azure-pipelines-task",
+ "name": "@atconseil/argos-azure-pipelines-task",
- "description": "",
+ "description": "Argos Azure Pipelines task - upload CI test results to Argos test management in Azure DevOps",
```

### 2.2 -- NE PAS toucher

- Champ `version` (1.0.0 reste, pas publie)
- Champ `private` : reste `true`
- Champ `scripts` : inchange
- Dependances : inchangees

---

## Etape 3 -- Update tools/azure-pipelines-task/task.json

⚠ **5 champs a modifier**. ASCII strict obligatoire dans tout le fichier.

### 3.1 -- id (vrai GUID)

```diff
- "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
+ "id": "[NOUVEAU_GUID]",
```

Remplacer `[NOUVEAU_GUID]` par le GUID genere a l'Etape 1.

### 3.2 -- friendlyName (dash ASCII)

```diff
- "friendlyName": "TestVault — Upload CI Results",
+ "friendlyName": "Argos - Upload CI Results",
```

⚠ **CRITIQUE** : dash ASCII `-` (U+002D), PAS em-dash `—` (U+2014). Pas d'ambiguite encoding console.

### 3.3 -- description

```diff
- "description": "Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to TestVault (Argos) in Azure DevOps",
+ "description": "Upload JUnit/Cucumber/NUnit/xUnit/TestNG test results to Argos test management in Azure DevOps",
```

### 3.4 -- instanceNameFormat

```diff
- "instanceNameFormat": "Upload results to TestVault plan $(planId)",
+ "instanceNameFormat": "Upload results to Argos plan $(planId)",
```

### 3.5 -- NE PAS toucher

- `name` : "ArgosUploadResults" deja bon
- `helpMarkDown` : URL TestVault GitHub reste (le repo n'est pas renomme dans ce sprint)
- `category` : "Test" inchange
- `author` : "ATConseil" inchange
- `version` : `{Major: 1, Minor: 0, Patch: 0}` inchange
- `inputs` : structure inchangee (les labels et helpMarkDown mentionnent "TestVault" parfois -> A VERIFIER apres modification, peut etre a updater dans une 2eme passe)

### 3.6 -- Verifier les inputs (helpMarkDown des champs)

```powershell
$task = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8 | ConvertFrom-Json
$task.inputs | ForEach-Object {
    if ($_.helpMarkDown -match "testvault|TestVault") {
        Write-Host "  Input '$($_.name)' helpMarkDown contient TestVault :" -ForegroundColor Yellow
        Write-Host "    $($_.helpMarkDown)" -ForegroundColor Gray
    }
    if ($_.label -match "testvault|TestVault") {
        Write-Host "  Input '$($_.name)' label contient TestVault : $($_.label)" -ForegroundColor Yellow
    }
}
```

Si des inputs mentionnent "TestVault Test Plan work item ID" ou similaire dans leur helpMarkDown -> les updater en "Argos Test Plan work item ID".

**Plus precisement** : `planId` est probablement decrit comme "TestVault Test Plan work item ID" -> a renommer en "Argos Test Plan work item ID".

---

## Etape 4 -- Update tools/azure-pipelines-task/src/index.ts

### 4.1 -- Ligne 52 : commande shell

```diff
- const cmd = `testvault tc upload-results ${args.map((a) => `"${a}"`).join(" ")}`;
+ const cmd = `argos tc upload-results ${args.map((a) => `"${a}"`).join(" ")}`;
```

### 4.2 -- Lignes 58-60 : variables d'env

```diff
        env: {
                ...process.env,
-               TESTVAULT_PAT: inputs.pat,
+               ARGOS_PAT: inputs.pat,
-               TESTVAULT_ORG_URL: inputs.orgUrl,
+               ARGOS_ORG_URL: inputs.orgUrl,
-               TESTVAULT_PROJECT: inputs.project,
+               ARGOS_PROJECT: inputs.project,
        },
```

---

## Etape 5 -- Update tools/azure-pipelines-task/src/index.test.ts

Les tests doivent etre alignes avec les nouvelles env vars + commande shell.

Si les tests assertent specifiquement `TESTVAULT_PAT`, etc. (peu probable mais a verifier), les aligner.
Si les tests mockent `execSync` et verifient la commande shell, aligner `testvault` -> `argos`.

```powershell
# Verifier ce que le test asserte
Select-String -Path tools\azure-pipelines-task\src\index.test.ts -Pattern "testvault|TESTVAULT_" -Encoding UTF8
```

Si match -> aligner. Sinon -> rien a faire (les tests ne testent peut-etre que `buildCliArgs` et `getTaskInputs`, pas l'execution).

---

## Etape 6 -- Update docs/integrations/azure-pipelines.md

### 6.1 -- Titre + intro

```diff
- # TestVault — Azure Pipelines Task Integration
+ # Argos - Azure Pipelines Task Integration

- The `ArgosUploadResults` task uploads CI test results to TestVault (Argos) in Azure DevOps by matching test results to Test Cases via `automationKey`.
+ The `ArgosUploadResults` task uploads CI test results to Argos in Azure DevOps by matching test results to Test Cases via `automationKey`.
```

⚠ Dash ASCII dans le titre.

### 6.2 -- Exemples YAML

Ligne 24 (et probablement L84 dans le 2eme exemple) :
```diff
-     displayName: Upload results to TestVault
+     displayName: Upload results to Argos
```

### 6.3 -- Mentions TestVault dans le texte

```diff
- | `planId` | ✅ | — | TestVault Test Plan work item ID |
+ | `planId` | ✅ | — | Argos Test Plan work item ID |

- Each test result is matched to a TestVault Test Case by `automationKey`:
+ Each test result is matched to an Argos Test Case by `automationKey`:

- Set `automationKey` on a Test Case in TestVault to enable matching.
+ Set `automationKey` on a Test Case in Argos to enable matching.
```

### 6.4 -- Variable group exemple

```diff
- 2. Create a variable group (e.g. `TestVault`) and add `ADO_PAT` as a secret.
+ 2. Create a variable group (e.g. `Argos`) and add `ADO_PAT` as a secret.
```

### 6.5 -- Variable de pipeline

```diff
-       planId: $(TESTVAULT_PLAN_ID)
+       planId: $(ARGOS_PLAN_ID)
```

### 6.6 -- Verification ASCII strict

```powershell
$content = Get-Content docs\integrations\azure-pipelines.md -Raw -Encoding UTF8
# Verifier qu'il n'y a plus d'em-dash dans le titre/intro
Select-String -Path docs\integrations\azure-pipelines.md -Pattern "TestVault|testvault|TESTVAULT_" -Encoding UTF8
# Attendu : 0 ligne (apres update)
```

⚠ **Note importante** : la doc peut contenir des em-dashes UTF-8 valides ailleurs (pas dans des passages updates). On ne change que ce qui est lie au rebrand. Le mojibake fantome est en route -- pas de paranoia, ASCII strict s'applique uniquement aux passages qu'on modifie.

---

## Etape 7 -- pnpm install + validation

```powershell
pnpm install
# Workspace refresh

pnpm list -r --depth=0 | Select-String -Pattern "azure-pipelines-task"
# Attendu : @atconseil/argos-azure-pipelines-task (PAS testvault)

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

### 7.1 -- Self-check RESIDUAL

```powershell
Write-Host "=== Residus @atconseil/testvault-azure-pipelines-task ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs,*.json,*.yml,*.yaml,*.md -Path packages,apps,tools,docs,Specs,.github | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|claude-prompts|CFG-2026-05-13-package-naming" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-azure-pipelines-task") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 RESIDUAL

Write-Host "`n=== Residus testvault dans azure-pipelines-task ===" -ForegroundColor Cyan
Get-ChildItem tools\azure-pipelines-task -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -match "testvault|TESTVAULT_") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
        Select-String -Path $_.FullName -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | ForEach-Object {
            Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
        }
    }
}
# Attendu : 0 RESIDUAL (le sprint nettoie tout dans ce dossier)

Write-Host "`n=== Residus testvault dans docs/integrations/azure-pipelines.md ===" -ForegroundColor Cyan
Select-String -Path docs\integrations\azure-pipelines.md -Pattern "TestVault|testvault|TESTVAULT_" -Encoding UTF8
# Attendu : 0 ligne

Write-Host "`n=== Verification ASCII strict task.json ===" -ForegroundColor Cyan
$content = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8
$nonAscii = 0
for ($i = 0; $i -lt $content.Length; $i++) {
    if ([int][char]$content[$i] -gt 127) {
        $nonAscii++
    }
}
Write-Host "  task.json : $nonAscii caracteres non-ASCII"
# Attendu : 0

Write-Host "`n=== Verification GUID v4 ou v1 ===" -ForegroundColor Cyan
$task = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8 | ConvertFrom-Json
$guidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
if ($task.id -match $guidPattern) {
    Write-Host "  GUID valide : $($task.id)" -ForegroundColor Green
} else {
    Write-Host "  STOP : GUID non valide : $($task.id)" -ForegroundColor Red
}

Write-Host "`n=== Verification cross-package NON touche (Sprint 7d) ===" -ForegroundColor Cyan
Write-Host "tools/testvault-action/action.yml :" -ForegroundColor Yellow
Select-String -Path tools\testvault-action\action.yml -Pattern "testvault|TESTVAULT_" -Encoding UTF8 | Measure-Object | ForEach-Object {
    Write-Host "  $($_.Count) references (NORMAL, Sprint 7d)" -ForegroundColor Yellow
}
```

⚠ Si RESIDUAL trouve dans azure-pipelines-task ou docs/integrations/azure-pipelines.md, STOP.
⚠ Si GUID non valide, STOP.
⚠ Si non-ASCII dans task.json, STOP.

---

## Etape 8 -- Update Specs/MIGRATION-PLAN.md

Section 3 (Plan d'execution) :

```diff
- | Sprint 6g | Renaming `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` | ~30 min | Faible (0 consommateur, mais livrable produit avec mojibake/GUID) | Apres 7a |
+ | Sprint 6g/7c | Rename + cleanup `testvault-azure-pipelines-task` -> `argos-azure-pipelines-task` (rename + regen GUID + alignement vars/cmd + doc) | ~30 min | Faible (0 consommateur, livrable produit non publie, GUID regenere) | **DONE 2026-05-14** |
```

Ajouter note :
```markdown
> **Sprint 6g/7c livre 2026-05-14** : avant-dernier sprint renaming. Trois actions combinees :
> 1. **Rename package npm** : `@atconseil/testvault-azure-pipelines-task` -> `@atconseil/argos-azure-pipelines-task` (description ajoutee)
> 2. **Regenerer GUID** : `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (placeholder) -> vrai GUID v4 unique
> 3. **Alignement post-Sprint 7a** : commande shell `testvault tc upload-results` -> `argos tc upload-results`, variables env `TESTVAULT_*` -> `ARGOS_*`, task.json textes (friendlyName, description, instanceNameFormat) avec **dash ASCII** (pas d'em-dash, evite tout debat encoding)
> 4. **Doc utilisateur** : `docs/integrations/azure-pipelines.md` aligne (9 occurrences testvault remplacees par Argos + `$(ARGOS_PLAN_ID)` au lieu de `$(TESTVAULT_PLAN_ID)`)
>
> **Note importante** : la task **n'est pas publiee** sur Marketplace ADO Pipeline Tasks. Liberte totale pour regenerer le GUID et changer le `friendlyName`. Quand la task sera publiee (decision produit future), le GUID deviendra immutable et le `friendlyName` sera vu par les utilisateurs ADO.
>
> **Em-dash UTF-8 valide remplace par dash ASCII** : verification byte du 2026-05-14 a confirme que `TestVault — Upload CI Results` etait un vrai em-dash UTF-8 (E2 80 94), pas un mojibake. Mais on le remplace par `-` ASCII par coherence avec la politique ASCII strict (commits, fichiers utilisateurs visibles). Voir TECH-DEBT-027 pour le contexte plus large.
```

---

## Etape 9 -- Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting
# Type : patch
# Description : "Sprint 6g/7c: rename testvault-azure-pipelines-task to argos + regen GUID + align with Sprint 7a"
# ASCII strict

pnpm changeset version
# Attendu : bump 0.4.19 -> 0.4.20
```

---

## Etape 10 -- CHANGELOG entry

```markdown
## [0.4.20] - 2026-05-14

### Changed (Sprint 6g/7c - feat/rename-testvault-azure-pipelines-task-to-argos)

- **`@atconseil/testvault-azure-pipelines-task` renomme en `@atconseil/argos-azure-pipelines-task`** (10eme sprint de la serie renaming, avant-dernier).
- **GUID regenere** : `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (placeholder) -> nouveau GUID v4 unique
- **Alignement post-Sprint 7a** :
  - Commande shell : `testvault tc upload-results` -> `argos tc upload-results`
  - Variables d'env : `TESTVAULT_PAT/ORG_URL/PROJECT` -> `ARGOS_PAT/ORG_URL/PROJECT`
- **task.json textes** mis a jour (ASCII strict, dash `-` au lieu d'em-dash) :
  - `friendlyName` : "TestVault - Upload CI Results" -> "Argos - Upload CI Results"
  - `description` : "to TestVault (Argos) in Azure DevOps" -> "to Argos test management in Azure DevOps"
  - `instanceNameFormat` : "Upload results to TestVault plan" -> "Upload results to Argos plan"
  - `inputs[planId].helpMarkDown` : "TestVault Test Plan work item ID" -> "Argos Test Plan work item ID" (si present)
- **Description du package.json** ajoutee (etait vide)
- **Documentation utilisateur** : `docs/integrations/azure-pipelines.md` aligne (9 occurrences) :
  - Titre + intro
  - Exemples YAML `displayName`
  - Variable group exemple (TestVault -> Argos)
  - Variable de pipeline `$(TESTVAULT_PLAN_ID)` -> `$(ARGOS_PLAN_ID)`

### Modifications

- `tools/azure-pipelines-task/package.json` : `name` + `description`
- `tools/azure-pipelines-task/task.json` : `id` (nouveau GUID), `friendlyName`, `description`, `instanceNameFormat`, inputs.helpMarkDown (si applicable)
- `tools/azure-pipelines-task/src/index.ts` : commande shell + 3 vars env
- `tools/azure-pipelines-task/src/index.test.ts` : tests alignes (si applicable)
- `docs/integrations/azure-pipelines.md` : 9 occurrences testvault remplacees + `$(ARGOS_PLAN_ID)`
- `Specs/MIGRATION-PLAN.md` : Sprint 6g/7c DONE + note rebrand
- `CHANGELOG.md` : [0.4.20]

### Notes (Sprint 6g/7c)

- **Task non publiee sur Marketplace ADO Pipeline Tasks** : 0 utilisateur externe impacte. Liberte totale.
- **GUID immutable une fois publie** : si/quand cette task sera publiee, le nouveau GUID deviendra son identifiant officiel. Changer le GUID apres publication = nouvelle task = perte d'historique.
- **Em-dash UTF-8 valide remplace par dash ASCII** (decision D6) : zero ambiguite future sur l'encoding (voir TECH-DEBT-027).
- **Cross-package** : `tools/testvault-action/action.yml` reste avec testvault + TESTVAULT_* (Sprint 7d).
- **Repo GitHub `TestVault`** : non renomme dans ce sprint (decision produit hors scope).
- Bump 0.4.19 -> 0.4.20.

### Backlog renaming -- post-Sprint 6g/7c

**Packages dans `packages/`** : RENAMING COMPLETE (8/8) - depuis Sprint 7b

**Dossiers tools/ alignement** :
- Sprint 6g/7c : tools/azure-pipelines-task -- DONE
- **Sprint 7d NEXT** : `tools/testvault-action/` -> `tools/argos-action/` (alignement post-7a + dash ASCII)

Apres Sprint 7d, **renaming GLOBAL TERMINE**.

### TECH-DEBT actifs

- TECH-DEBT-021, 022, 024, 026, 027 (voir CHANGELOGs precedents)
- TECH-DEBT-023, 025 : ANNULES (faux positifs mojibake)
```

---

## Etape 11 -- Archive + commit

### 11.1 -- Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6g.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6g.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6g.md
}
```

### 11.2 -- Pre-commit ASCII check

```powershell
$msg = "feat(packages): rename testvault-azure-pipelines-task to argos (Sprint 6g/7c)`n`n10th sprint of the testvault to argos renaming wave."
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

### 11.3 -- Commit

```powershell
git add -A
git status

git commit `
  -m "feat(packages): rename testvault-azure-pipelines-task to argos (Sprint 6g/7c)" `
  -m "" `
  -m "10th sprint of the testvault to argos renaming wave (avant-dernier)." `
  -m "" `
  -m "Three combined actions:" `
  -m "1. Package rename: testvault-azure-pipelines-task -> argos-azure-pipelines-task" `
  -m "2. GUID regeneration: placeholder -> real v4 GUID" `
  -m "3. Post-Sprint 7a alignment: cmd shell (testvault -> argos), env vars (TESTVAULT_* -> ARGOS_*)" `
  -m "" `
  -m "Changes (verified terrain):" `
  -m "- package.json: name + description (was empty)" `
  -m "- task.json: id (new GUID), friendlyName, description, instanceNameFormat" `
  -m "  All texts ASCII strict (dash - instead of em-dash, no ambiguity)" `
  -m "- src/index.ts: cmd argos tc upload-results, ARGOS_PAT/ORG_URL/PROJECT" `
  -m "- src/index.test.ts: aligned if needed" `
  -m "- docs/integrations/azure-pipelines.md: 9 occurrences aligned" `
  -m "  Variable example: TESTVAULT_PLAN_ID -> ARGOS_PLAN_ID" `
  -m "- Specs/MIGRATION-PLAN.md: Sprint 6g/7c DONE" `
  -m "" `
  -m "Task not published on Marketplace ADO Pipeline Tasks (private: true)," `
  -m "0 external users impacted. Liberty to regenerate GUID and rename." `
  -m "" `
  -m "Cross-package intentionally untouched (Sprint 7d scope):" `
  -m "- tools/testvault-action/action.yml: still uses testvault + TESTVAULT_*" `
  -m "" `
  -m "Em-dash byte verification (2026-05-14): TestVault em-dash was valid UTF-8" `
  -m "(E2 80 94), not mojibake. Replaced by ASCII dash by D6 decision for" `
  -m "consistency with ASCII strict policy. See TECH-DEBT-027." `
  -m "" `
  -m "Methodology:" `
  -m "- pnpm turbo lint/typecheck/test/build --force used" `
  -m "- ASCII strict commit message pre-check applied" `
  -m "- task.json verified ASCII strict (UI ADO display safe)" `
  -m "- GUID validated against v4 regex pattern" `
  -m "" `
  -m "Bump 0.4.19 to 0.4.20." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.8)"

git push -u origin feat/rename-testvault-azure-pipelines-task-to-argos
```

PR.

---

## Etape 12 -- POST-MERGE CLEANUP

⚠ **A faire APRES merge GitHub.**

```powershell
git checkout main
git pull
git log --oneline | Select-Object -First 3

git branch -d feat/rename-testvault-azure-pipelines-task-to-argos
# Si refus : git branch -D feat/rename-testvault-azure-pipelines-task-to-argos

git remote prune origin

# Verifier package
$pkg = Get-Content tools\azure-pipelines-task\package.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Name : $($pkg.name)"
Write-Host "Description : $($pkg.description)"

# Verifier task.json
$task = Get-Content tools\azure-pipelines-task\task.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "id           : $($task.id)"
Write-Host "friendlyName : $($task.friendlyName)"
Write-Host "description  : $($task.description)"

# Verifier src/
Select-String -Path tools\azure-pipelines-task\src\index.ts -Pattern "argos|ARGOS_" -Encoding UTF8
# Attendu : 4 matches (argos tc upload-results + 3 ARGOS_*)

# Sante
pnpm --filter @atconseil/regression-suite test
pnpm preflight
node tools\regression\scan-mojibake.cjs
```

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-azure-pipelines-task-to-argos` creee
- [ ] Snapshot validee : 0 consommateur, 4 ref testvault dans src/, GUID place a regenerer, argos-cli bin confirme
- [ ] **Nouveau GUID v4 unique genere et applique** dans task.json
- [ ] `package.json` : `name` + `description` (ajoutee)
- [ ] `task.json` : `id` (nouveau GUID), `friendlyName` (dash ASCII), `description`, `instanceNameFormat`, inputs.helpMarkDown si applicable
- [ ] `task.json` : **0 caractere non-ASCII** (verification post-modification)
- [ ] `src/index.ts` : `argos tc upload-results` + `ARGOS_PAT/ORG_URL/PROJECT`
- [ ] `src/index.test.ts` : aligne si applicable
- [ ] `docs/integrations/azure-pipelines.md` : 9 occurrences testvault -> Argos + `$(ARGOS_PLAN_ID)`
- [ ] **Cross-package `tools/testvault-action/action.yml` NON modifie** (Sprint 7d)
- [ ] `pnpm install` OK
- [ ] `pnpm turbo lint && typecheck && test && build --force` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake
- [ ] Suite regression : 51/51 passing
- [ ] 0 RESIDUAL @atconseil/testvault-azure-pipelines-task
- [ ] 0 RESIDUAL testvault dans tools/azure-pipelines-task/
- [ ] 0 RESIDUAL TestVault/testvault/TESTVAULT_ dans docs/integrations/azure-pipelines.md
- [ ] GUID v4 valide (verification pattern regex)
- [ ] MIGRATION-PLAN.md Sprint 6g/7c DONE
- [ ] CHANGELOG [0.4.20] avec lessons learned
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Bump 0.4.19 -> 0.4.20
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] **Post-merge cleanup execute apres merge**

---

## Reporting utilisateur

1. **Apres Etape 1** : "Snapshot OK. **Nouveau GUID genere : [NOUVEAU_GUID]**. 4 references testvault dans src/. argos-cli bin confirme. tools/testvault-action contient encore testvault (normal, Sprint 7d). Confirmation avant modifications ?"

2. **Apres Etape 7.1 (self-check RESIDUAL)** : "Modifications terminees. 0 RESIDUAL. task.json ASCII pur. GUID valide. docs/integrations/azure-pipelines.md aligne. lint/typecheck/test/build --force OK. Pret a commit ?"

3. **Apres Etape 11.3** : "PR ouverte. **Apres merge GitHub, lance Etape 12** (post-merge cleanup). **DERNIER SPRINT RENAMING : Sprint 7d** apres ca."

---

Quand post-merge cleanup OK :

**Sprint 7d** sera le **DERNIER SPRINT RENAMING** :
- `tools/testvault-action/` -> `tools/argos-action/` (rename dossier)
- `action.yml` : align CLI install (argos-cli au lieu de testvault-cli)
- `action.yml` : align cmd shell (`argos tc upload-results`)
- `action.yml` : align env vars (`ARGOS_*`)
- `action.yml` : align name avec dash ASCII (D6 decision)
- `docs/integrations/github-actions.md` : align toutes les references
- ~25 min

Apres Sprint 7d : **REBRAND TESTVAULT -> ARGOS TOTALEMENT TERMINE**. 11 sprints au total.
