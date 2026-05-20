# Prompt Claude Code -- Sprint 2.18.3 single hub manifest refactor (`fix/sprint-2-18-3-single-hub`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint hotfix : passer de 6 hubs ADO a 1 SEUL hub. Navigation interne uniquement.
> Estimation : ~1h.

---

## Contexte critique

**Decouverte 2026-05-20 ~14h** : apres Sprint 2.18.2 livre argos@0.5.22 (hub.html CSS link),
le UI Sprint 2.18 marche parfaitement (sidebar Argos 220px, design system applique).

**MAIS** double menu visible dans BCEE-QA :
- Sidebar native ADO (gauche) : 6 icones generees par les 6 sub-hubs declares
  (Test Plans, Test Cases, Test Sets, Preconditions, Reports, Settings)
- Notre Sidebar Argos 220px : meme 6 items
- => DOUBLON VISUEL et UX confus

**Decision user 2026-05-20** :

> Garder UN SEUL icone Argos dans la sidebar ADO gauche.
> Au click, ouvrir l'app sur Test Plans list par defaut.
> Navigation entre sections via notre Sidebar Argos 220px (Sprint 2.18 deja en place).
> Breaking change URLs accepte.

**Architecture cible** :

```
AVANT :
  Sidebar ADO native :
    Boards | Repos | Pipelines | Test Plans (natif) | Artifacts
    [+ Argos]         <- argos-hub-group expand vers 6 sub-hubs
      |-- Test Plans     (argos-hub-plans)
      |-- Test Cases     (argos-hub-cases)
      |-- Test Sets      (argos-hub-sets)
      |-- Preconditions  (argos-hub-preconditions)
      |-- Reports        (argos-hub-reports)
      |-- Settings       (argos-hub-settings)

APRES :
  Sidebar ADO native :
    Boards | Repos | Pipelines | Test Plans (natif) | Artifacts
    [+ Argos]         <- argos-hub UNIQUE
                         click -> ouvre App
                         Sidebar Argos 220px (notre code) gere
                         la navigation entre Test Plans/Cases/Sets/...
```

**URLs breaking change** :

```
AVANT :
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-plans
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-cases
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-sets
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-preconditions
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-reports
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub-settings

APRES :
  /apps/hub/AlexThibaud.ArgosTesting.argos-hub  (UNIQUE)
```

Risque acceptable : MVP, peu de bookmarks externes.

Refs :
- Sprint 2.18 + 2.18.1 + 2.18.2 (chaine complete)
- TECH-DEBT-067 NEW : single hub architecture
- TECH-DEBT-068 NEW : URL redirect ancien argos-hub-X vers argos-hub (Sprint 2.19+)

---

## Decisions actees 2026-05-20

| # | Element | Choix |
|---|---|---|
| D140 | Architecture | A -- Single hub (1 entree ADO) |
| D141 | Hub principal | "argos-hub" (rename argos-hub-plans) |
| D142 | Default view | "test-plans-list" (TestPlansListView par defaut) |
| D143 | CONTRIBUTION_ID_TO_SECTION | Simplifie : single mapping ou supprime |
| D144 | Breaking URLs | Accepte (MVP, peu d'impact) |
| D145 | hub-group | Supprime |

---

## Composition exacte du sprint -- 5 LOTS

### Lot 0 -- Diagnostic + setup (10 min)

```powershell
cd E:\Code\TestVault

# 1. Voir le manifest actuel (contributions section)
$manifest = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest.contributions | Select-Object id, type | Format-Table -AutoSize

# Attendu : 8 contributions (1 hub-group + 6 sub-hubs + 1 work-item-form-page)

# 2. Voir le CONTRIBUTION_ID_TO_SECTION dans App.tsx
Select-String -Path apps\argos-extension\src\hub\App.tsx -Pattern "CONTRIBUTION_ID_TO_SECTION" -Context 0,10 -Encoding UTF8

# 3. Voir resolveSection + sectionToInitialView (qui depend du contribution-id)
Select-String -Path apps\argos-extension\src\hub\App.tsx -Pattern "resolveSection|sectionToInitialView" -Context 1,12 -Encoding UTF8

# 4. Voir les tests qui referencent les contribution ids
Select-String -Path apps\argos-extension\src\**\*.test.* -Pattern "argos-hub" -Encoding UTF8 -ErrorAction SilentlyContinue

# 5. Voir s'il existe une regression CFG pour les hubs
Get-ChildItem tools\regression -Filter "CFG-*hub*" -ErrorAction SilentlyContinue

# Setup branche
git checkout main
git pull
git checkout -b fix/sprint-2-18-3-single-hub

# Baseline tests
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 10
```

### Lot A -- Refactor vss-extension.json (20 min)

#### A.1 Sauvegarder l'ancien manifest

```powershell
Copy-Item apps\argos-extension\vss-extension.json apps\argos-extension\vss-extension.json.backup-pre-2-18-3
```

#### A.2 Editer vss-extension.json

**REGLES** :
- SUPPRIMER `argos-hub-group` (toute la contribution)
- SUPPRIMER `argos-hub-cases`, `argos-hub-sets`, `argos-hub-preconditions`, `argos-hub-reports`, `argos-hub-settings`
- RENAME `argos-hub-plans` en `argos-hub`
- Le `targets` de `argos-hub` doit pointer vers un parent ADO natif (PAS argos-hub-group)
- Garder `argos-coverage-panel` (work-item-form-page) inchange

**Recherche du bon target** : pour qu'argos-hub apparaisse dans la sidebar ADO gauche
comme une entree principale, le `targets` doit etre un hub-group ADO existant.

Options possibles :
- `ms.vss-work-web.work-hub-group` : "Boards" group (sous-niveau)
- `ms.vss-test-web.test-hub-group` : "Test Plans" natif group (logique pour Argos)
- `ms.vss-build-web.build-release-hub-group` : "Pipelines" group

**Recommande** : `ms.vss-test-web.test-hub-group` ou creer un projet-level hub.

Si on veut un menu de PROJET (pas dans un sub-hub-group) :
- targets = `["ms.vss-web.project-hub-groups-collection"]` : entree principale au niveau projet

**Manifest cible (template)** :

```json
{
  "manifestVersion": 1,
  "id": "ArgosTesting",
  "version": "0.5.22",  // sera bumpe Lot C
  "name": "Argos Testing",
  "publisher": "AlexThibaud",
  ...
  "contributions": [
    {
      "id": "argos-hub",
      "type": "ms.vss-web.hub",
      "description": "Argos Testing - Test management for Azure DevOps",
      "targets": [
        "ms.vss-web.project-hub-groups-collection"
      ],
      "properties": {
        "name": "Argos",
        "order": 100,
        "uri": "dist/hub/hub.html",
        "icon": {
          "light": "static/argos-hub.png",
          "dark": "static/argos-hub.png"
        }
      }
    },
    {
      "id": "argos-coverage-panel",
      "type": "ms.vss-work-web.work-item-form-page",
      "description": "Argos test coverage panel for work items",
      "targets": ["ms.vss-work-web.work-item-form"],
      "properties": {
        "name": "Argos Coverage",
        "uri": "dist/widgets/coverage-panel/index.html"
      }
    }
  ],
  ...
}
```

**REGLE** : preserver les CHAMPS existants du manifest (icon, scopes, files, etc.) :
juste modifier la section `contributions`.

#### A.3 Test rapide manifest valide JSON

```powershell
# Verifier que le manifest est valid JSON
$manifest = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest.contributions | Select-Object id, type | Format-Table -AutoSize

# Attendu : 2 contributions seulement (argos-hub + argos-coverage-panel)
```

### Lot B -- Simplification App.tsx (15 min)

#### B.1 Voir le code actuel

```powershell
Select-String -Path apps\argos-extension\src\hub\App.tsx -Pattern "CONTRIBUTION_ID_TO_SECTION|DEFAULT_SECTION|resolveSection|sectionToInitialView" -Context 1,8 -Encoding UTF8
```

#### B.2 Simplifier

**AVANT** (probable) :

```typescript
const CONTRIBUTION_ID_TO_SECTION: Record<string, Section> = {
    "AlexThibaud.ArgosTesting.argos-hub-plans": "plans",
    "AlexThibaud.ArgosTesting.argos-hub-cases": "cases",
    "AlexThibaud.ArgosTesting.argos-hub-sets": "sets",
    "AlexThibaud.ArgosTesting.argos-hub-preconditions": "preconditions",
    "AlexThibaud.ArgosTesting.argos-hub-reports": "reports",
    "AlexThibaud.ArgosTesting.argos-hub-settings": "settings",
};

const DEFAULT_SECTION: Section = "plans";

function resolveSection(contributionId: string | undefined): Section {
    if (!contributionId) return DEFAULT_SECTION;
    return CONTRIBUTION_ID_TO_SECTION[contributionId] ?? DEFAULT_SECTION;
}

function sectionToInitialView(section: Section): ArgosView {
    switch (section) {
        case "plans": return { kind: "test-plans-list" };
        case "cases": return { kind: "test-cases-list" };
        ...
    }
}
```

**APRES** (simplifie) :

Option 1 (radical, propre) :

```typescript
// Single hub : always start on Test Plans list
function getInitialView(): ArgosView {
    return { kind: "test-plans-list" };
}
```

Et dans App() :

```typescript
useEffect(() => {
    SDK.init()
        .then(() => {
            setInitialView(getInitialView());  // pas de contribution-id mapping
            SDK.notifyLoadSucceeded();
        })
        .catch(err => {
            console.error("SDK init failed", err);
            SDK.notifyLoadFailed(err);
        });
}, []);
```

Option 2 (compatible backward, garde la logique) :

```typescript
// Single hub : argos-hub maps to test-plans-list as initial view
// CONTRIBUTION_ID_TO_SECTION removed (Sprint 2.18.3)
const DEFAULT_INITIAL_VIEW: ArgosView = { kind: "test-plans-list" };

function getInitialView(_contributionId?: string): ArgosView {
    // Sprint 2.18.3 : single hub. All contribution-ids resolve to default.
    return DEFAULT_INITIAL_VIEW;
}
```

**Recommande** : Option 1 (radical, plus propre). 
Le code devient plus simple. CONTRIBUTION_ID_TO_SECTION + Section type + sectionToInitialView
peuvent tous etre supprimes.

#### B.3 Supprimer code mort

Si Section type, CONTRIBUTION_ID_TO_SECTION, resolveSection, sectionToInitialView 
ne sont plus utilises ailleurs, SUPPRIMER les entierement.

Verifier avec :

```powershell
Select-String -Path apps\argos-extension\src\**\*.ts*,apps\argos-extension\src\**\*.tsx -Pattern "Section|CONTRIBUTION_ID_TO_SECTION|resolveSection|sectionToInitialView" -Encoding UTF8

# Si references uniquement dans App.tsx -> supprimer
# Si references dans tests ou autres files -> Sprint 2.19 deprecation
```

### Lot C -- Tests + bump + CFG (15 min)

#### C.1 Update tests existants

```powershell
# Voir les tests qui referencent les contribution ids
Get-ChildItem apps\argos-extension -Recurse -Filter "*.test.*" | ForEach-Object {
    if ((Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match "argos-hub-plans|argos-hub-cases|CONTRIBUTION_ID_TO_SECTION") {
        Write-Host "Has legacy refs: $($_.FullName)"
    }
}
```

Si tests cassent : update pour utiliser `argos-hub` ou ne plus referencer les contribution ids.

#### C.2 CFG regression test Sprint 2.18.3

```typescript
// tools/regression/CFG-2026-05-20-single-hub.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("CFG Single hub Sprint 2.18.3", () => {
    const root = resolve(__dirname, "../..");
    const manifestPath = resolve(root, "apps/argos-extension/vss-extension.json");
    
    it("manifest exists", () => {
        expect(existsSync(manifestPath)).toBe(true);
    });
    
    it("manifest has exactly 2 contributions (argos-hub + argos-coverage-panel)", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        expect(manifest.contributions).toBeDefined();
        expect(Array.isArray(manifest.contributions)).toBe(true);
        expect(manifest.contributions.length).toBe(2);
    });
    
    it("manifest contains argos-hub (single hub)", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        const hub = manifest.contributions.find((c: any) => c.id === "argos-hub");
        expect(hub).toBeDefined();
        expect(hub.type).toBe("ms.vss-web.hub");
    });
    
    it("manifest does NOT contain argos-hub-group", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        const hubGroup = manifest.contributions.find((c: any) => c.id === "argos-hub-group");
        expect(hubGroup).toBeUndefined();
    });
    
    it("manifest does NOT contain legacy sub-hubs", () => {
        const legacyIds = [
            "argos-hub-plans",
            "argos-hub-cases",
            "argos-hub-sets",
            "argos-hub-preconditions",
            "argos-hub-reports",
            "argos-hub-settings",
        ];
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        for (const id of legacyIds) {
            const found = manifest.contributions.find((c: any) => c.id === id);
            expect(found, `${id} should not exist`).toBeUndefined();
        }
    });
    
    it("argos-coverage-panel still exists (work-item-form-page)", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        const panel = manifest.contributions.find((c: any) => c.id === "argos-coverage-panel");
        expect(panel).toBeDefined();
        expect(panel.type).toBe("ms.vss-work-web.work-item-form-page");
    });
});
```

#### C.3 Bump 0.5.22 -> 0.5.23

```powershell
node tools\release\bump-fixed-version.cjs 0.5.23

$root = Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json
$vss = Get-Content apps\argos-extension\vss-extension.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Racine : $($root.name)@$($root.version)"
Write-Host "VSIX : $($vss.version)"

pnpm --filter @atconseil/regression-suite test -- CFG-2026-05-14-fixed-versioning 2>&1 | Select-Object -Last 5
```

#### C.4 Rebuild + verify VSIX content

```powershell
Remove-Item -Recurse -Force apps\argos-extension\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

pnpm --filter argosTesting build 2>&1 | Select-Object -Last 10
pnpm --filter argosTesting build:vsix 2>&1 | Select-Object -Last 5

# Inspect VSIX 0.5.23 manifest
$vsixPath = "dist\argos.vsix"
$zipPath = "$env:TEMP\argos-023-inspect.zip"
$tempDir = "$env:TEMP\vsix-023-inspect-$(Get-Random)"

Copy-Item -Path $vsixPath -Destination $zipPath -Force
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

Write-Host ""
Write-Host "=== VSIX 0.5.23 manifest verification ===" -ForegroundColor Cyan
$manifestInVsix = Get-ChildItem -Path $tempDir -Recurse -Filter "vss-extension.json" | Select-Object -First 1
if ($manifestInVsix) {
    $mf = Get-Content $manifestInVsix.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "  Version : $($mf.version) (attendu 0.5.23)"
    Write-Host "  Contributions count : $($mf.contributions.Count) (attendu 2)"
    Write-Host "  Contributions :"
    $mf.contributions | Select-Object id, type | Format-Table -AutoSize | Out-Host
}

# hub.html toujours OK avec CSS link
Write-Host ""
Write-Host "=== hub.html still loads CSS ? ===" -ForegroundColor Cyan
Get-Content "$tempDir\dist\hub\hub.html" -Encoding UTF8

Remove-Item -Recurse -Force $tempDir
Remove-Item -Force $zipPath
```

### Lot D -- Commit + push + PR (10 min)

```powershell
$commitMsg = @"
fix(extension): Sprint 2.18.3 - single hub manifest (UX cleanup)

After Sprint 2.18.2 the UI worked but two navigation menus were visible :
1. ADO native sidebar (left) with 6 Argos icons (generated by 6 sub-hubs)
2. Our custom Sidebar Argos 220px (Sprint 2.18 design system)

User confirmed via screenshot 2026-05-20 - confusing UX, doublon.

Decision : consolidate to single hub ADO entry + internal navigation via 
our Sidebar 220px.

Manifest changes (vss-extension.json) :
- REMOVED argos-hub-group (hub-group)
- REMOVED 5 sub-hubs : argos-hub-cases, argos-hub-sets, 
  argos-hub-preconditions, argos-hub-reports, argos-hub-settings
- RENAMED argos-hub-plans -> argos-hub (single hub)
- KEPT argos-coverage-panel (work-item-form-page)

Code changes (App.tsx) :
- Removed CONTRIBUTION_ID_TO_SECTION mapping
- Removed Section type (no longer needed)
- Removed resolveSection() and sectionToInitialView()
- New : getInitialView() returns DEFAULT_INITIAL_VIEW (test-plans-list)
- Navigation between sections handled entirely by useArgosRouting (Sprint 2.18)

URLs breaking change accepted (MVP) :
- OLD : /apps/hub/AlexThibaud.ArgosTesting.argos-hub-plans (and 5 others)
- NEW : /apps/hub/AlexThibaud.ArgosTesting.argos-hub (single)

Tests :
- Updated tests referencing legacy contribution ids
- CFG-2026-05-20-single-hub regression test (manifest validation)
- All Sprint 2.7-2.18.2 tests still green

Bump 0.5.22 -> 0.5.23.

After CI publish :
- Uninstall extension in BCEE-QA (force VSIX re-download)
- Reinstall from Marketplace
- Hard refresh DEMO
- Expected : single Argos entry in left ADO sidebar
- Click Argos -> opens Sidebar Argos 220px + Test Plans list

TECH-DEBT :
- TECH-DEBT-067 LIVRE : single hub architecture
- TECH-DEBT-068 NEW : URL redirect ancien argos-hub-X vers argos-hub (Sprint 2.19+)

Refs :
- Sprint 2.18 + 2.18.1 + 2.18.2 chain
- User decision 2026-05-20 14h post-lunch
"@

[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-sprint-2-18-3.txt", $commitMsg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-sprint-2-18-3.txt"
Remove-Item "$env:TEMP\commit-msg-sprint-2-18-3.txt"

git push -u origin fix/sprint-2-18-3-single-hub

# PR
$prBody = @'
## Summary

Sprint 2.18.3 -- HOTFIX double navigation menu (single hub manifest).

After Sprint 2.18.2 fixed the CSS loading, two navigation menus appeared :
- ADO native sidebar (left) : 6 icons generated by 6 sub-hubs declared in manifest
- Our custom Sidebar Argos 220px (Sprint 2.18 design system)

This sprint consolidates to a single ADO hub entry + internal navigation.

## Changes

### Manifest (vss-extension.json)
- REMOVED hub-group + 5 sub-hubs
- RENAMED argos-hub-plans -> argos-hub
- Result : 2 contributions total (argos-hub + argos-coverage-panel)

### Code (App.tsx)
- Removed CONTRIBUTION_ID_TO_SECTION mapping
- Removed Section type, resolveSection, sectionToInitialView
- New : DEFAULT_INITIAL_VIEW constant
- All navigation handled by useArgosRouting hook (Sprint 2.18)

### Breaking Change

URLs change :
- OLD : /apps/hub/AlexThibaud.ArgosTesting.argos-hub-plans
- NEW : /apps/hub/AlexThibaud.ArgosTesting.argos-hub

Acceptable for MVP. Bookmarks to old URLs will return 404.

## Tests

- CFG-2026-05-20-single-hub regression
- Updated tests referencing legacy ids
- All Sprint 2.7-2.18.2 tests still green

## After merge

1. Tag v0.5.23 + push
2. Uninstall extension in BCEE-QA
3. Reinstall
4. Hard refresh DEMO
5. Expected : single Argos entry in left ADO sidebar
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-sprint-2-18-3.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "fix(extension): Sprint 2.18.3 - single hub manifest (UX cleanup)" `
  --body-file "$env:TEMP\pr-body-sprint-2-18-3.txt"

Remove-Item "$env:TEMP\pr-body-sprint-2-18-3.txt"
```

### Lot E -- Post-merge + reinstall + test (10 min)

#### E.1 Post-merge cleanup

```powershell
git checkout main
git pull
git remote prune origin
git branch -d fix/sprint-2-18-3-single-hub 2>$null
```

#### E.2 Tag v0.5.23

```powershell
git tag -a v0.5.23 -m "Release v0.5.23 - Sprint 2.18.3 single hub manifest"
git push origin v0.5.23
```

#### E.3 CI workflows (~5-8 min)

Surveille https://github.com/AlexThibaud1976/TestVault/actions
- Publish -- Marketplace -> 0.5.23
- Publish CLI -- npm -> 0.5.23

#### E.4 Uninstall + reinstall extension

```
1. Browse https://dev.azure.com/BCEE-QA/_settings/extensions
2. "Argos Testing" -> Uninstall (PAS Disable)
3. Wait 30 sec

4. Browse https://marketplace.visualstudio.com/items?itemName=AlexThibaud.ArgosTesting
5. Verify version : 0.5.23
6. Install (BCEE-QA org)
7. Wait propagation 30-60 sec
```

#### E.5 TEST E2E FINAL

```
1. Browse https://dev.azure.com/BCEE-QA/DEMO
2. CTRL+SHIFT+R (hard refresh)

VERIFICATION 1 : sidebar ADO native (gauche)
[X] Une SEULE icone Argos visible (pas 6)
[X] Click sur l'icone Argos -> ouvre notre app

VERIFICATION 2 : app contenu
[X] Sidebar Argos 220px visible (notre code, Sprint 2.18)
[X] 6 items : Test Plans (active), Test Cases, Test Sets, Preconditions, Reports, Settings
[X] Header Test Plans + count + buttons
[X] Filter bar + table/EmptyState
[X] Design system applique partout

VERIFICATION 3 : navigation interne via notre Sidebar
- Click "Test Cases" -> ComingSoonView "Sprint 2.19"
- Click "Test Sets" -> ComingSoonView
- Click "Preconditions" -> ComingSoonView
- Click "Reports" -> ComingSoonView
- Click "Settings" -> ComingSoonView
- Click "Test Plans" -> retour list

VERIFICATION 4 : creation Test Plan (regression Sprint 2.18)
- Click "+ New Test Plan"
- Fill name "MILESTONE 0.5.23 - Single Hub"
- Click Create
- [X] Toast success
- [X] Back to list view
- [X] Test Plan visible
```

#### E.6 CHECKPOINT FINAL

Si toutes les verifications passent :

```
MILESTONE UI COMPLET ATTEINT !

12+ sprints livres en 3 jours
14 versions Marketplace (0.5.7 a 0.5.23)
Architecture COMPLETE :
  - Backend : 7 WIT install + detection + CRUD + UI hooks
  - Frontend : design system + Test Plan UI + routing
  - UX : single hub ADO + navigation interne via Sidebar Argos

Pattern reutilisable pour les 6 autres WIT (Sprint 2.19+).
```

---

## Garde-fous

### GF1 -- GF20 : standards
ASCII strict, fixed-versioning, etc.

### GF21 : NE PAS modifier TESTVAULT_SCHEMA
Constitution section 12 immutable.

### GF22 : NE PAS modifier le code Sprint 2.18 design system / views
Les fichiers design-system/, views/, hooks/ sont OK. Pas touche.

### GF23 : Backup manifest avant modification
vss-extension.json.backup-pre-2-18-3 doit etre cree au Lot A.1.

### GF24 : Verifier le manifest VSIX en sortie de Lot C.4
Compter exactement 2 contributions.
hub.html doit toujours contenir le link CSS (Sprint 2.18.2 acquis).

### GF25 : Tests Sprint 2.7-2.18.2 doivent rester verts

### GF26 : Documentation breaking change
PR description et CHANGELOG explicitement mentionner :
- URLs change
- Bookmarks anciens vont 404
- TECH-DEBT-068 pour redirect futur

---

## Validation pre-commit

```powershell
pnpm --filter argosTesting test 2>&1 | Select-Object -Last 30
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 15

pnpm turbo build --force 2>&1 | Select-Object -Last 15
pnpm turbo lint --force 2>&1 | Select-Object -Last 5
pnpm turbo typecheck --force 2>&1 | Select-Object -Last 5

node tools\regression\scan-mojibake.cjs
pnpm preflight
```

---

## Reporting utilisateur

1. **Apres Lot 0** : "Diagnostic done. 8 contributions actuelles : 1 group + 6 sub-hubs + 1 panel. Continue Lot A ?"
2. **Apres Lot A** : "Manifest refactore : 2 contributions (argos-hub + argos-coverage-panel). VSIX rebuild attendu Lot C."
3. **Apres Lot B** : "App.tsx simplifie. CONTRIBUTION_ID_TO_SECTION supprime. DEFAULT_INITIAL_VIEW utilise."
4. **Apres Lot C** : "Tests OK + VSIX 0.5.23 verifie (2 contributions + hub.html link CSS preserve)."
5. **Apres Lot D** : "PR ouverte. Apres merge, lance Lot E."

---

## Criteres de done

- [ ] Branche fix/sprint-2-18-3-single-hub creee
- [ ] vss-extension.json.backup-pre-2-18-3 sauvegarde
- [ ] vss-extension.json : 2 contributions (argos-hub + argos-coverage-panel)
- [ ] App.tsx : CONTRIBUTION_ID_TO_SECTION supprime
- [ ] App.tsx : Section type supprime ou simplifie
- [ ] App.tsx : DEFAULT_INITIAL_VIEW constant
- [ ] Code mort identifie supprime
- [ ] CFG-2026-05-20-single-hub NEW
- [ ] Tests existants updated si references aux ids legacy
- [ ] All Sprint 2.7-2.18.2 tests STILL green
- [ ] Bump 0.5.22 -> 0.5.23
- [ ] VSIX 0.5.23 manifest verifie (2 contributions, hub.html link CSS)
- [ ] CHANGELOG documente breaking change URLs
- [ ] tasks.md : TECH-DEBT-067 livre + TECH-DEBT-068 NEW
- [ ] PR ouverte avec breaking change explicite
- [ ] Post-merge cleanup
- [ ] Tag v0.5.23
- [ ] CI workflows verts
- [ ] Extension reinstallee dans BCEE-QA
- [ ] E2E : 1 SEULE icone Argos dans sidebar ADO
- [ ] E2E : Sidebar Argos 220px gere navigation interne
- [ ] E2E : Tous les 6 sections accessibles via Sidebar Argos
- [ ] E2E : Creation Test Plan toujours OK

---

## Apres ca

### Si MILESTONE FINAL ATTEINT

```
12 sprints + 3 hotfix livres en 3 jours
14 versions Marketplace
Architecture COMPLETE.
Pattern Test Plan = template pour les 6 autres WIT.

Sprint 2.19 priorites :
- Generaliser UI aux 6 autres WIT (Test Case, Test Set, Precondition,
  Test Execution, Test Case Version, Audit Log)
- Reuse design system + pattern Test Plan
- Real ADO integration : GET /classificationNodes + /iterations
- Form sections Sprint 2.18 reportees : Schedule, Notifications, Permissions
- Linked Test Cases drag-reorder
- URL redirect ancien argos-hub-X vers argos-hub (TECH-DEBT-068)
```

### Si bug residual apres Sprint 2.18.3

```
Sprint 2.19 hotfix integre avec generalisation.
Pas d'iteration infinie sur 2.18.X.
```

---

## Note importante

```
Cette session est devenue marathon mais le resultat est solide :

1. Sprint 2.18 backend : design system + Test Plan UI (mergee)
2. Sprint 2.18.1 : bump 0.5.21 republish (workaround Marketplace)
3. Sprint 2.18.2 : fix hub.html CSS link (CRITICAL bug)
4. Sprint 2.18.3 : single hub manifest (UX cleanup)

Chaque hotfix etait NECESSAIRE et chacun a son utilite long terme.
Le diagnostic etait progressif :
- 2.18.1 : "publish issue" (faux)
- 2.18.2 : "CSS not loaded" (CORRECT, root cause)
- 2.18.3 : "double menu" (UX improvement, optionnel mais propre)

Pattern decouvert : preview.html doit etre une copie EXACTE du hub.html prod
pour detecter ce type de bug avant publish. TECH-DEBT-066 critique.
```

Bon sprint final !
