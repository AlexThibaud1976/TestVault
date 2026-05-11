# Prompt Claude Code — Mini-Sprint 4.1 (`fix/icon-names-preconditions-reports`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-4.1.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Mini-sprint cosmétique court (~15-20 min).

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour (Sprint 4 mergé)
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 26 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un echoue → STOP.

---

## Contexte

Sprint 4 a deploye une architecture multi-hubs native ADO (6 hubs internes ciblant `.argos-hub-group`). Validation visuelle BCEE-QA : architecture OK, 4 icones sur 6 rendues correctement.

**2 icones non rendues** :
- Preconditions : `iconName: "Important"` → pas affichee
- Reports : `iconName: "ReportDocument"` → pas affichee

**Cause probable** : ADO sandbox ne charge qu'un sous-ensemble de Fluent UI Icons. Microsoft documente la propriete `iconName` mais pas la liste exhaustive des valeurs valides. Les noms testes Sprint 4 venaient d'estimations raisonnables, pas d'une liste validee.

**Decision** : remplacer ces 2 `iconName` par des alternatives plus universellement supportees.

**Choix valides Sprint 4.1** :
- Preconditions : `Warning` (semantiquement proche de "preconditions a respecter / avertissement utilisateur", nom court Fluent UI courant)
- Reports : `BarChart4` (visualisation analytics standard, exactement le pattern Reports)

**Perimetre Sprint 4.1** :
1. Modifier 2 `iconName` dans le manifest
2. Bump v0.4.0 → v0.4.1 (patch — cosmetique, pas de feature)
3. CHANGELOG entry courte
4. Aucun test regression n'est modifie (T-1.0 verifie l'existence et le nom des hubs, pas leur iconName)
5. Build + package + upload manuel + validation visuelle BCEE-QA

**Hors scope** :
- Toute autre modif manifest (publisher, scopes, categories, hub-group, coverage-panel, 4 autres hubs intacts)
- Modifications App.tsx (architecture multi-hubs Sprint 4 stable)
- Modifications tests regression (existants verifient name/type/targets, pas iconName)

---

## Modifications

### Modification 1 — `apps/argos-extension/vss-extension.json`

```diff
@@ Manifest racine @@
- "version": "0.4.0",
+ "version": "0.4.1",
```

```diff
@@ Contribution argos-hub-preconditions @@
  {
    "id": "argos-hub-preconditions",
    "type": "ms.vss-web.hub",
    "description": "Preconditions — define prerequisites for test execution.",
    "targets": [".argos-hub-group"],
    "properties": {
      "name": "Preconditions",
-     "iconName": "Important",
+     "iconName": "Warning",
      "order": 40,
      "uri": "dist/hub/hub.html"
    }
  }
```

```diff
@@ Contribution argos-hub-reports @@
  {
    "id": "argos-hub-reports",
    "type": "ms.vss-web.hub",
    "description": "Reports — execution results, coverage, flakiness analysis.",
    "targets": [".argos-hub-group"],
    "properties": {
      "name": "Reports",
-     "iconName": "ReportDocument",
+     "iconName": "BarChart4",
      "order": 50,
      "uri": "dist/hub/hub.html"
    }
  }
```

⚠ **Aucune autre modification** du manifest. Specifiquement :
- Les 4 autres `iconName` (BulletedList, TestBeaker, FolderList, Settings) restent — ils fonctionnent
- Tous les autres champs (publisher, id, scopes, categories, banniere, hub-group, autres hubs, coverage-panel) restent

### Modification 2 — Bump versions (Changesets)

```powershell
pnpm changeset
# Type : patch
# Description : "Fix icon names for Preconditions and Reports hubs (Sprint 4 visual fix)"

pnpm changeset version
# Bump 0.4.0 → 0.4.1
```

### Modification 3 — CHANGELOG

```markdown
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
```

### Modification 4 — `Specs/constitution.md`

Pas de bump (cosmetique mineur). Ajouter juste une ligne dans la section Sprint 4 ou apres :

```markdown
- 2026-05-11 (Sprint 4.1) : iconName Preconditions/Reports corriges (Important → Warning, ReportDocument → BarChart4) apres validation visuelle BCEE-QA post-Sprint 4.
```

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b fix/icon-names-preconditions-reports

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 26 passing
```

---

## Etape 1 — Modifier le manifest

### 1.1 — Lire manifest actuel

```powershell
Get-Content apps\argos-extension\vss-extension.json
```

Reperer les 2 lignes `iconName` a modifier (Preconditions ligne ~XX et Reports ligne ~XX selon la structure post-Sprint 4).

### 1.2 — Appliquer 3 str_replace

1. `"iconName": "Important"` → `"iconName": "Warning"` (dans la contribution argos-hub-preconditions)
2. `"iconName": "ReportDocument"` → `"iconName": "BarChart4"` (dans la contribution argos-hub-reports)
3. `"version": "0.4.0"` → `"version": "0.4.1"` (au niveau racine du manifest)

⚠ **Garde-fou STOP** :
- Si tu trouves plusieurs occurrences de `"iconName": "Important"` ou `"iconName": "ReportDocument"`, STOP et signale (architecturalement impossible mais possible bug humain)
- Si tu ne trouves pas exactement ces 2 valeurs, STOP — Sprint 4 a peut-etre utilise des noms differents que ce que je crois

### 1.3 — Validation

```powershell
# Verifier les nouveaux iconName
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"iconName"'
# Attendu : 6 lignes
#   "iconName": "BulletedList"     (Plans)
#   "iconName": "TestBeaker"       (Cases)
#   "iconName": "FolderList"       (Sets)
#   "iconName": "Warning"          (Preconditions) NOUVEAU
#   "iconName": "BarChart4"        (Reports) NOUVEAU
#   "iconName": "Settings"         (Settings)

# Plus aucune trace des anciens noms
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"Important"|"ReportDocument"' -SimpleMatch
# Attendu : 0 ligne

# Version a 0.4.1
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.4.1"
```

---

## Etape 2 — Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Type : patch
# Description : "Fix icon names for Preconditions and Reports hubs (Sprint 4 visual fix)"

pnpm changeset version
```

Validation :
```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
# Attendu : "version": "0.4.1"
```

---

## Etape 3 — CHANGELOG + Constitution

Voir Modifications 3 et 4 ci-dessus.

⚠ **Pas de mise a jour REGISTRY** (aucun test regression modifie) ni de mise a jour tests (T-1.0 verifie pas iconName).

---

## Etape 4 — Validation complete

```powershell
# Tests regression - toujours 26 passing
pnpm --filter @atconseil/regression-suite test
# Attendu : 26 passing (rien n'a change cote tests)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.

# Lint + typecheck + tests apps
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : les 6 iconName sont presents
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"iconName"'
# Attendu : 6 lignes (4 inchangees + 2 nouvelles)

# Self-check : pas de regression sur les autres sprints
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne

Select-String -Path apps\argos-extension\vss-extension.json -Pattern "argos-hub-group" -SimpleMatch
# Attendu : presence

# Self-check : les 6 hubs internes intacts
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"id"\s*:\s*"argos-hub-(plans|cases|sets|preconditions|reports|settings)"'
# Attendu : 6 lignes
```

---

## Etape 5 — Build + Package + Upload manuel

### 5.1 — Build

```powershell
pnpm --filter argos-extension build
```

### 5.2 — Package VSIX

```powershell
cd apps\argos-extension
npx tfx extension create --manifest-globs vss-extension.json --output-path ../../dist/argos.vsix
cd ..\..
```

Attendu :
```
- VSIX: ...\dist\argos.vsix
- Extension ID: ArgosTesting
- Extension Version: 0.4.1
- Publisher: AlexThibaud
```

### 5.3 — Inspection rapide

```powershell
Copy-Item dist\argos.vsix dist\argos-test.zip -Force
Expand-Archive dist\argos-test.zip -DestinationPath dist\argos-test-content -Force
Get-Content dist\argos-test-content\extension.vsixmanifest | Select-String -Pattern "Version="
# Attendu : Version="0.4.1"
Remove-Item dist\argos-test.zip, dist\argos-test-content -Recurse -Force
```

### 5.4 — Upload manuel depuis le portail

1. https://marketplace.visualstudio.com/manage/publishers/AlexThibaud
2. Click sur ArgosTesting
3. "..." → "Update" / "New version"
4. Upload `dist\argos.vsix` (0.4.1)
5. Attendre "Validated"
6. Reload page projet BCEE-QA (Ctrl+F5 hard reload)
7. **Verification visuelle** : nav Argos → les 6 hubs ont **tous** une icone

Si l'une des 2 nouvelles icones (Warning ou BarChart4) ne s'affiche pas, STOP, capture, on diagnostique. Sinon Sprint 4.1 = victoire cosmetique.

---

## Etape 6 — Archive prompt + commit

### 6.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-4.1.md", "$HOME\Downloads\CLAUDE_TASK_sprint-4.1.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-4.1.md
    Write-Host "OK Prompt archive"
}
```

### 6.2 — Verifier allowlist

```powershell
pnpm --filter @atconseil/regression-suite test
# Si 26 passing -> OK
# Sinon allowlister tools/claude-prompts/CLAUDE_TASK_sprint-4.1.md dans allowlist.ts + .cjs
```

### 6.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "fix(extension): icon names for Preconditions and Reports hubs (Sprint 4.1 cosmetic)" `
  -m "" `
  -m "Sprint 4 deployed 6 hubs but 2 iconName values were not rendered by ADO:" `
  -m "- Preconditions: Important -> Warning" `
  -m "- Reports: ReportDocument -> BarChart4" `
  -m "" `
  -m "Cause: ADO sandbox loads only a subset of Fluent UI Icons; Sprint 4" `
  -m "values were reasonable estimates without exhaustive Microsoft list." `
  -m "" `
  -m "No regression test modified (T-1.0 verifies name/type/targets, not iconName)." `
  -m "Validation: visual check in BCEE-QA after upload." `
  -m "" `
  -m "Out of scope (preserved):" `
  -m "- 4 other iconName (BulletedList, TestBeaker, FolderList, Settings)" `
  -m "- Architecture multi-hubs Sprint 4" `
  -m "- All other manifest fields" `
  -m "" `
  -m "Bump 0.4.0 -> 0.4.1 (patch cosmetic)"

git push -u origin fix/icon-names-preconditions-reports
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `fix/icon-names-preconditions-reports` creee depuis main a jour
- [ ] Manifest : 2 iconName modifies (Important → Warning, ReportDocument → BarChart4) + version 0.4.1
- [ ] **Aucune autre modification** du manifest
- [ ] Versions package.json bumpees a 0.4.1 via Changesets
- [ ] CHANGELOG.md `[0.4.1]` cree
- [ ] Constitution : ligne ajoutee dans section Sprint 4
- [ ] **Pas de modification de tests regression** (intentionnel : iconName est cosmetique)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 26 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] Self-check : 6 iconName presents, pas de reliquat des anciens noms
- [ ] Self-check Sprint 3.1 / 3.2 / 3 / 3.4 / 4 preserves
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-4.1.md`
- [ ] Build OK + VSIX 0.4.1
- [ ] Commit Conventional Commits, PR ouverte

Apres merge :
- [ ] Upload manuel VSIX 0.4.1 depuis portail
- [ ] Validation Marketplace
- [ ] Reload BCEE-QA (Ctrl+F5)
- [ ] **Verification visuelle** : 6 hubs ont tous une icone (Test Plans, Test Cases, Test Sets, Preconditions, Reports, Settings)

---

## Si l'une des 2 nouvelles icones ne rend pas

1. **F12 console BCEE-QA** : chercher erreurs sur `iconName` ou warnings
2. **Tester un autre nom** :
   - Preconditions : `Warning` → `AlertSolid` → `Lightbulb` → `Info`
   - Reports : `BarChart4` → `ReportLibrary` → `AnalyticsReport` → `Chart`
3. **Inspecter une extension ADO open-source qui affiche bien ces icones** : repo `microsoft/azure-devops-extension-sample` ou recherche GitHub.

C'est un fix cosmetique, pas un blocker. Si apres 2-3 essais on ne trouve pas, on accepte l'absence d'icone et on inscrit TECH-DEBT-014 "iconName Fluent UI : compiler la vraie liste Microsoft via inspection des extensions natives".

---

Quand les 6 hubs ont leurs icones dans BCEE-QA, dis-le-moi. Sprint 4 + 4.1 = visual parity complete avec Test Plans natif.
