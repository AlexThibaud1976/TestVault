# Prompt Claude Code — Sprint 5a + 5b (`chore/cleanup-dead-code`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **combiné** : Sprint 5a (suppression `packages/testvault-ui`) + Sprint 5b (cleanup dossiers racine `dist/` et `vsix-debug-3.2/`).
> Echauffement matinal post-pause : 2 micro-sprints atomiques mais regroupes pour un seul cycle PR.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (working tree clean)
- [ ] `git checkout main && git pull` — branche `main` à jour
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 47 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : TECH-DEBT-015A a identifie 3 elements morts/orphelins dans le repo :
1. `packages/testvault-ui` — package placeholder vide (`src/index.ts` = `export {}`), zero consommateur interne
2. `dist/` a la racine — artefact de build/debug non reference dans `pnpm-workspace.yaml`
3. `vsix-debug-3.2/` a la racine — artefact de debug Sprint 3.2, plus utilise

**Decision validee** (TECH-DEBT-015B, Specs/MIGRATION-PLAN.md sections 1.6 et 2.3) : supprimer ces 3 elements.

**Risque** : faible. Pas de consommateur, pas d'usage en CI, pas de reference externe.

**Perimetre Sprint 5a+5b** :
1. Supprimer `packages/testvault-ui` (dossier complet)
2. Supprimer `dist/` a la racine
3. Supprimer `vsix-debug-3.2/` a la racine
4. Mettre a jour `.gitignore` si necessaire (s'assurer que `dist/` et `vsix-debug-*` sont exclus)
5. Verifier qu'aucun consommateur interne ne reference `@atconseil/testvault-ui` (devrait etre vide, mais a confirmer)
6. CHANGELOG entry `[0.4.8]` ou patch suivant
7. Bump version (patch cosmetique : pas de changement fonctionnel utilisateur)

**Hors scope** :
- Toute autre modification (manifest, code source, autres packages)
- Renaming `testvault-*` → `argos-*` (-> Sprint 6a)
- Toute modification fonctionnelle de l'extension

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b chore/cleanup-dead-code

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 47 passing
```

---

## Etape 1 — Sprint 5a : Suppression `packages/testvault-ui`

### 1.1 — Verifier absence de consommateurs internes

```powershell
# Verifier qu'aucun package.json ne reference @atconseil/testvault-ui
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-ui") {
        Write-Host "FOUND in $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 occurrence

# Verifier qu'aucun import code ne le reference
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-ui") {
        Write-Host "FOUND in $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 occurrence
```

⚠ **STOP si une occurrence est trouvee**. MONOREPO.md affirme qu'aucun consommateur n'existe, mais si quelque chose est trouve, c'est une nouvelle decouverte a signaler avant de proceder.

### 1.2 — Verifier le contenu actuel du package

```powershell
# Confirmer le contenu attendu : seul src/index.ts avec export {}
Get-ChildItem packages\testvault-ui -Recurse -File | Where-Object { $_.FullName -notmatch "node_modules" } | Select-Object FullName

Get-Content packages\testvault-ui\src\index.ts
# Attendu : export {}
```

### 1.3 — Suppression

```powershell
# Supprimer le dossier complet via git
git rm -r packages/testvault-ui
```

### 1.4 — Verifier pnpm-workspace.yaml

```powershell
Get-Content pnpm-workspace.yaml
# Attendu : packages: ['apps/*', 'packages/*', 'tools/*']
# Aucune mention explicite de testvault-ui (inclus via glob packages/*)
# RIEN A MODIFIER ici
```

---

## Etape 2 — Sprint 5b : Cleanup `dist/` et `vsix-debug-3.2/` racine

### 2.1 — Verifier le contenu actuel

```powershell
# Lister le contenu de dist/ a la racine
if (Test-Path dist) {
    Get-ChildItem dist | Select-Object Name, Length, LastWriteTime
}

# Lister le contenu de vsix-debug-3.2/ a la racine
if (Test-Path vsix-debug-3.2) {
    Get-ChildItem vsix-debug-3.2 | Select-Object Name, Length, LastWriteTime
}
```

⚠ **Observation** : si `dist/` contient des fichiers recents importants (un VSIX en cours de packaging), STOP et reporter a l'utilisateur. Sinon, c'est de l'artefact a nettoyer.

### 2.2 — Suppression

```powershell
# Supprimer les deux dossiers
if (Test-Path dist) {
    git rm -rf dist 2>$null
    # Si dist/ n'est pas tracke par git (gitignore), utiliser Remove-Item
    if (Test-Path dist) {
        Remove-Item -Recurse -Force dist
    }
}

if (Test-Path vsix-debug-3.2) {
    git rm -rf vsix-debug-3.2 2>$null
    if (Test-Path vsix-debug-3.2) {
        Remove-Item -Recurse -Force vsix-debug-3.2
    }
}
```

### 2.3 — Verifier .gitignore

```powershell
Get-Content .gitignore
```

S'assurer que ces patterns sont presents (ajouter s'ils manquent) :
```
# Build artifacts
dist/
**/dist/
*.vsix

# Debug artifacts
vsix-debug-*/
```

Si modification de `.gitignore` necessaire :
```powershell
# Lire le contenu actuel
$gitignore = Get-Content .gitignore -Raw

# Ajouter les patterns manquants si absents
if ($gitignore -notmatch "vsix-debug-") {
    Add-Content .gitignore "`n# Debug artifacts`nvsix-debug-*/"
}
```

⚠ **Garde-fou** : verifier que `apps/*/dist/` ou `packages/*/dist/` (build outputs des packages) restent fonctionnels. Le pattern `**/dist/` les exclura du git tracking, ce qui est correct. Mais s'assurer que les commandes `pnpm build` puis `pnpm pack` continuent de fonctionner.

---

## Etape 3 — Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting uniquement (espace pour cocher, entree)
# Type : patch
# Description : "Sprint 5a/5b cleanup: remove testvault-ui placeholder + dist/vsix-debug root artifacts"

pnpm changeset version
# Attendu : bump argos-extension 0.4.7 -> 0.4.8
```

Verifier :
```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"' | Select-Object -First 1
# Attendu : "version": "0.4.8"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"' | Select-Object -First 1
# Attendu : "version": "0.4.8"
```

---

## Etape 4 — CHANGELOG entry

Ajouter en haut de `CHANGELOG.md`, sous la derniere entree `[0.4.7]` :

```markdown
## [0.4.8] - 2026-05-13

### Removed (Sprint 5a + 5b - chore/cleanup-dead-code)

- **`packages/testvault-ui`** : suppression du package placeholder vide identifie dans TECH-DEBT-015A (`src/index.ts` contenait uniquement `export {}`, zero consommateur interne dans le repo). Decision validee dans `Specs/MIGRATION-PLAN.md` section 1.6.
- **`dist/`** a la racine : suppression de l'artefact de build/debug non reference dans `pnpm-workspace.yaml`. Le `.gitignore` est mis a jour si necessaire pour exclure les futurs artefacts similaires.
- **`vsix-debug-3.2/`** a la racine : suppression de l'artefact de debug Sprint 3.2, plus utilise. Idem `.gitignore`.

### Notes (Sprint 5a + 5b)

- Sprint d'echauffement matinal post-pause : 2 micro-sprints atomiques regroupes en une seule PR (`chore/cleanup-dead-code`).
- Aucune modification fonctionnelle de l'extension Argos.
- Bump 0.4.7 -> 0.4.8 (patch : nettoyage, pas de changement utilisateur).
- Tests regression : 47 passing (inchange, code mort supprime sans test associe).

### Lessons learned (Sprint 5a + 5b)

- **`testvault-ui` a vecu 6+ mois en placeholder** sans qu'aucun sprint ne le notifie. C'est typiquement le genre de code mort qu'un audit periodique (TECH-DEBT-015) doit detecter.
- **`dist/` a la racine etait probablement un VSIX manuellement copie pour debug** lors d'un sprint anterieur. Ces artefacts doivent rester dans `apps/argos-extension/dist/` ou un dossier dedie, pas a la racine.

### Backlog

- **Sprint 6a NEXT** : Renaming `testvault-types` -> `argos-types` (premier sprint du renaming Groupe 1, le plus risque a cause de ses 10 consommateurs)
- (autres items inchanges)
```

---

## Etape 5 — Validation complete

```powershell
# Tests regression - toujours 47 passing
pnpm --filter @atconseil/regression-suite test
# Attendu : 47 passing

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED

# Lint + typecheck + tests apps
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Workspace pnpm coherent
pnpm install
# Attendu : pas d'erreur sur testvault-ui manquant

pnpm list -r --depth=0 | Select-String -Pattern "testvault-ui"
# Attendu : 0 ligne (le package n'existe plus)

# Self-checks suppression
Test-Path packages\testvault-ui
# Attendu : False

Test-Path dist
# Attendu : False

Test-Path vsix-debug-3.2
# Attendu : False

# Self-check : pnpm-workspace.yaml inchange
Get-Content pnpm-workspace.yaml
# Attendu : 3 lignes (apps/*, packages/*, tools/*)

# Self-check : sprints precedents preserves
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne

# Self-check : autres testvault-* intacts (Sprint 6a viendra plus tard)
Get-ChildItem packages -Directory | Select-Object Name
# Attendu :
#   testpulse-ui-shared
#   testvault-cli
#   testvault-exporters
#   testvault-gherkin
#   testvault-importers
#   testvault-sdk
#   testvault-types
#   testvault-wit-schema
# (PAS de testvault-ui)
```

---

## Etape 6 — Archive prompt + commit

### 6.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-5ab.md", "$HOME\Downloads\CLAUDE_TASK_sprint-5ab.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-5ab.md
}
```

### 6.2 — Verifier allowlist

```powershell
pnpm --filter @atconseil/regression-suite test
# Si 47 passing -> OK
# Sinon allowlister tools/claude-prompts/CLAUDE_TASK_sprint-5ab.md dans allowlist.ts + .cjs
```

### 6.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "chore(cleanup): remove testvault-ui placeholder + dist/vsix-debug root artifacts (Sprint 5a+5b)" `
  -m "" `
  -m "Sprint 5a — Remove packages/testvault-ui:" `
  -m "- Placeholder package with src/index.ts = export {} (zero implementation)" `
  -m "- Zero internal consumers (verified via grep on all package.json + source files)" `
  -m "- Identified in TECH-DEBT-015A, decision validated in MIGRATION-PLAN.md section 1.6" `
  -m "" `
  -m "Sprint 5b — Cleanup root artifacts:" `
  -m "- dist/ at repo root (build artifact not referenced in pnpm-workspace.yaml)" `
  -m "- vsix-debug-3.2/ (Sprint 3.2 debug artifact, no longer used)" `
  -m "- .gitignore updated to exclude future similar artifacts" `
  -m "" `
  -m "No functional changes to Argos extension. Tests: 47 passing (unchanged)." `
  -m "" `
  -m "Bump 0.4.7 -> 0.4.8 (patch: cleanup, no user-facing change)" `
  -m "" `
  -m "Refs: Specs/MONOREPO.md (015A), Specs/MIGRATION-PLAN.md (015B sections 1.6, 2.3)"

git push -u origin chore/cleanup-dead-code
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `chore/cleanup-dead-code` creee depuis main a jour
- [ ] `packages/testvault-ui` **supprime** (`Test-Path` returns False)
- [ ] `dist/` racine **supprime** (`Test-Path` returns False)
- [ ] `vsix-debug-3.2/` racine **supprime** (`Test-Path` returns False)
- [ ] `.gitignore` mis a jour si necessaire (patterns `dist/`, `vsix-debug-*/`)
- [ ] Verification : zero consommateur interne de `@atconseil/testvault-ui` (grep)
- [ ] `pnpm-workspace.yaml` **inchange** (3 lignes glob)
- [ ] Bump versions `0.4.7` -> `0.4.8` via Changesets
- [ ] CHANGELOG `[0.4.8]` cree
- [ ] **AUCUNE autre modification** (manifest, code source, autres packages)
- [ ] `pnpm install` passe sans erreur
- [ ] `pnpm --filter @atconseil/regression-suite test` → 47 passing
- [ ] `pnpm preflight` → PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm turbo lint && typecheck && test` → tous verts
- [ ] Self-checks preserves (publisher, public, autres testvault-* intacts)
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-5ab.md`
- [ ] Commit Conventional Commits, PR ouverte

**Pas d'upload Marketplace necessaire** — pas de changement fonctionnel. Le bump version sert juste a tracer l'historique CHANGELOG.

---

## Garde-fous Sprint 5a + 5b

⚠ **Le risque #1 = decouvrir un consommateur insoupconne de `testvault-ui`**
- 015A affirme zero consommateur. Si grep trouve quelque chose, c'est une nouvelle decouverte.
- **STOP**, signaler a l'utilisateur, decider : 1) renommer consommateur, 2) garder testvault-ui, 3) autre.

⚠ **Le risque #2 = `dist/` racine contient un VSIX qui sert encore**
- Verifier la date de modification + le contenu avant suppression.
- Si VSIX recent, STOP et demander a l'utilisateur s'il faut le preserver (le sauver dans `apps/argos-extension/dist/` ou ailleurs).

⚠ **Le risque #3 = scope creep**
- TENTATION : "tant qu'on cleanup, supprimons aussi apps/docs-site placeholder..."
- NON. `apps/docs-site` est traite par TECH-DEBT-019 dans un sprint dedie ulterieur.
- TENTATION : "tant qu'on touche pnpm-workspace.yaml..."
- NON, on n'y touche PAS dans 5a+5b. Aucun changement de glob.

⚠ **Le risque #4 = casser le build CI**
- Verifier que `apps/argos-extension/dist/` continue d'etre genere par `pnpm build`.
- Verifier que le workflow `publish-marketplace.yml` ne reference pas `dist/` racine.

```powershell
Select-String -Path .github\workflows\*.yml -Pattern "(^|\W)dist(/|\W)" -SimpleMatch
# Verifier que toutes les references sont dans apps/argos-extension/dist/ ou similaire,
# PAS dist/ racine direct
```

Si une reference au `dist/` racine est trouvee dans un workflow, STOP et corriger en pointant vers le bon chemin.

⚠ **Le risque #5 = mojibake dans CHANGELOG**
- Verifier `scan-mojibake.cjs` apres modification CHANGELOG.

---

## Reporting utilisateur

Reporter a l'utilisateur 2 moments :
1. **Apres Etape 1.1** (verification consommateurs testvault-ui) : "Voici les resultats du grep. Aucun consommateur trouve [ou si trouve : voici les fichiers]. Confirmation avant suppression ?"
2. **Apres Etape 2.1** (verification contenu dist/ + vsix-debug-3.2/) : "Voici le contenu de ces dossiers : [listing]. Confirmation avant suppression ?"

---

Quand les criteres sont valides et le commit prepare, dis-le-moi. Apres merge :
- Pause optionnelle 5 min
- **Sprint 6a** (renaming testvault-types -> argos-types) — le plus risque du renaming
