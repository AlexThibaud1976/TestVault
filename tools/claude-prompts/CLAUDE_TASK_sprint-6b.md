# Prompt Claude Code — Sprint 6b (`feat/rename-testvault-wit-schema-to-argos-wit-schema`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **renaming court** : 2eme du Groupe 1. **1 seul consommateur** identifie (`testvault-sdk`), **1 seul fichier import** (`process-install.ts`).
> Methodologie identique au Sprint 6a (template valide), mais beaucoup plus simple.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (`working tree clean`)
- [ ] `git branch --show-current` = `main`
- [ ] `git log --oneline | Select-Object -First 3` montre Sprint 6a + follow-up merged
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : 2eme sprint d'execution du renaming Groupe 1 (MIGRATION-PLAN.md). Sprint 6a (testvault-types) a etabli la methodologie. Sprint 6b applique la meme methode a `testvault-wit-schema`.

**Surface d'impact reduite** (verifie en grep terrain) :
- **1 package.json consommateur** : `packages/testvault-sdk/package.json` (champ dependencies)
- **1 fichier source import** : `packages/testvault-sdk/src/process-install.ts`
- **1 package.json a renommer** : `packages/testvault-wit-schema/package.json` (champ name)

**Cibles du renaming** :
- Dossier : `packages/testvault-wit-schema/` -> `packages/argos-wit-schema/`
- Nom npm : `@atconseil/testvault-wit-schema` -> `@atconseil/argos-wit-schema`
- Import dans `process-install.ts` : `from "@atconseil/testvault-wit-schema"` -> `from "@atconseil/argos-wit-schema"`
- Dependency dans `testvault-sdk/package.json`
- `ALLOWED_LEGACY_NAMES` dans le test naming convention : retirer l'entree

**Perimetre Sprint 6b** :
1. Rename dossier via `git mv`
2. Update `packages/argos-wit-schema/package.json` champ `name`
3. Update `packages/testvault-sdk/package.json` dependencies
4. Update import dans `packages/testvault-sdk/src/process-install.ts`
5. Retirer `"@atconseil/testvault-wit-schema"` de `ALLOWED_LEGACY_NAMES`
6. `pnpm install` (workspace refresh)
7. Validation complete (test naming reste 4/4, autres tests verts)
8. CHANGELOG + version bump 0.4.9 -> 0.4.10
9. Update MIGRATION-PLAN.md (Sprint 6b DONE)
10. Commit + PR

**Hors scope Sprint 6b** :
- Autres testvault-* (Sprints 6c-6f, 7a, 7b)
- Modification fonctionnelle du code
- Realignement versions (-> Sprint 8)
- Publication npm (-> Sprint 9)

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-wit-schema-to-argos-wit-schema

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing
```

---

## Etape 1 — Snapshot consommateurs (sanity check)

```powershell
Write-Host "=== Consommateurs package.json (excluant self) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "testvault-wit-schema" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-wit-schema"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-wit-schema') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
```

**Attendu (verifie utilisateur 2026-05-13)** :
- 1 package.json : `packages/testvault-sdk/package.json`
- 1 source : `packages/testvault-sdk/src/process-install.ts`

⚠ **Si plus que ces 2 fichiers**, STOP et reporter a l'utilisateur. Sinon, proceder.

---

## Etape 2 — Rename dossier via `git mv`

```powershell
git mv packages/testvault-wit-schema packages/argos-wit-schema
```

Verifier :
```powershell
Test-Path packages\argos-wit-schema      # Attendu : True
Test-Path packages\testvault-wit-schema  # Attendu : False
git status
# Attendu : renamed: packages/testvault-wit-schema/* -> packages/argos-wit-schema/*
```

---

## Etape 3 — Update les noms et imports

### 3.1 — `packages/argos-wit-schema/package.json`

```diff
- "name": "@atconseil/testvault-wit-schema",
+ "name": "@atconseil/argos-wit-schema",
```

⚠ **NE PAS toucher** au champ `version` (-> Sprint 8 realignement).
⚠ **NE PAS toucher** aux autres champs.

### 3.2 — `packages/testvault-sdk/package.json`

```diff
  "dependencies": {
    "@atconseil/argos-types": "workspace:*",
-   "@atconseil/testvault-wit-schema": "workspace:*",
+   "@atconseil/argos-wit-schema": "workspace:*",
    ...
  }
```

⚠ Note : argos-types est deja la (Sprint 6a). Verifier le contexte exact dans le fichier.

### 3.3 — `packages/testvault-sdk/src/process-install.ts`

```diff
- import { ... } from "@atconseil/testvault-wit-schema";
+ import { ... } from "@atconseil/argos-wit-schema";
```

⚠ **Variantes a verifier** :
- `from "@atconseil/testvault-wit-schema"`
- `from "@atconseil/testvault-wit-schema/..."` (sub-paths si existent)
- `require("@atconseil/testvault-wit-schema")` (rare)
- Type-only imports : `import type { ... } from "@atconseil/testvault-wit-schema"`

---

## Etape 4 — Update `ALLOWED_LEGACY_NAMES` dans le test naming

### 4.1 — Editer `tools/regression/CFG-2026-05-13-package-naming.test.ts`

Retirer l'entree `"@atconseil/testvault-wit-schema"` :

```diff
const ALLOWED_LEGACY_NAMES = new Set([
    // Legacy names accepted during the testvault-* -> argos-* migration wave.
    // Each future sprint will remove its entry as the package is renamed.
    // See Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4).
-   "@atconseil/testvault-wit-schema", // Sprint 6b: rename to argos-wit-schema
    "@atconseil/testvault-sdk",        // Sprint 6c: rename to argos-sdk
    "@atconseil/testvault-importers",  // Sprint 6d: rename to argos-importers
    "@atconseil/testvault-exporters",  // Sprint 6e: rename to argos-exporters
    "@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
    "@atconseil/testvault-cli",        // Sprint 7a: rename to argos-cli
    "@atconseil/testpulse-ui-shared",  // Sprint 7b: rename to argos-detection-api
]);
```

### 4.2 — Verifier que les tests restent verts

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# Attendu : 4/4 passing (5 entrees restantes dans ALLOWED_LEGACY_NAMES + testpulse)
```

---

## Etape 5 — pnpm install + validation

```powershell
pnpm install
```

Attendu : pas d'erreur. Workspace mis a jour avec `@atconseil/argos-wit-schema`.

```powershell
# Verifier le workspace
pnpm list -r --depth=0 | Select-String -Pattern "wit-schema"
# Attendu : @atconseil/argos-wit-schema (PAS testvault-wit-schema)

# Suite complete regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing

# Mojibake
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED

# Turbo
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
pnpm turbo build
# Attendu : tous verts
```

### 5.1 — Self-check RESIDUAL

```powershell
# Aucun import testvault-wit-schema reste actif (hors documentation/historique)
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-wit-schema") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Aucun package.json reste actif avec testvault-wit-schema
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-wit-schema") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Verifier que les autres testvault-* restent intacts
Get-ChildItem packages -Directory | Select-Object Name
# Attendu :
#   argos-types
#   argos-wit-schema     (NOUVEAU)
#   testpulse-ui-shared
#   testvault-cli
#   testvault-exporters
#   testvault-gherkin
#   testvault-importers
#   testvault-sdk
```

⚠ **Si RESIDUAL trouve**, STOP. Probable cause : variante d'import oubliee.

---

## Etape 6 — Update Specs et CHANGELOG

### 6.1 — Specs/MIGRATION-PLAN.md

Mettre a jour le tableau du Sprint 6b :

```diff
- | Sprint 6b | Renaming `testvault-wit-schema` -> `argos-wit-schema` | ~20 min | Faible (1 consommateur) | Apres 6a |
+ | Sprint 6b | Renaming `testvault-wit-schema` -> `argos-wit-schema` | ~20 min | Faible (1 consommateur) | **DONE 2026-05-13** |
```

### 6.2 — Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting (option simple, alignement complet -> Sprint 8)
# Type : patch
# Description : "Sprint 6b: rename @atconseil/testvault-wit-schema -> @atconseil/argos-wit-schema"

pnpm changeset version
# Attendu : bump argos-extension 0.4.9 -> 0.4.10
```

### 6.3 — CHANGELOG.md

Ajouter en haut :

```markdown
## [0.4.10] - 2026-05-13

### Changed (Sprint 6b - feat/rename-testvault-wit-schema-to-argos-wit-schema)

- **`@atconseil/testvault-wit-schema` renomme en `@atconseil/argos-wit-schema`** (2eme sprint du renaming Groupe 1).
  - Dossier : `packages/testvault-wit-schema/` -> `packages/argos-wit-schema/` (via `git mv`, historique preserve).
  - 1 consommateur interne mis a jour : `testvault-sdk` (package.json + 1 import dans `process-install.ts`).
  - Aucune modification fonctionnelle de l'extension Argos.

### Changed (Sprint 6b)

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : retire `"@atconseil/testvault-wit-schema"` de `ALLOWED_LEGACY_NAMES`. La liste contient maintenant 6 entrees restantes (sdk, importers, exporters, gherkin, cli, testpulse-ui-shared).
- Le test naming convention reste 4/4 passing (le retrait d'une entree autorisee + la disparition effective du nom du repo se compensent).

### Notes (Sprint 6b)

- Sprint court (~20 min). Surface d'impact minimale : 1 consommateur, 1 fichier source.
- Methodologie identique au Sprint 6a (template valide).
- `git mv` pour preserver l'historique git.
- Bump 0.4.9 -> 0.4.10 (patch : renaming sans changement fonctionnel).

### Backlog

- **Sprint 6c NEXT** : Renaming `testvault-sdk` -> `argos-sdk` (4 consommateurs : argos-extension, argos-functions, testvault-cli, testvault-exporters)
- Sprint 6d, 6e, 6f : importers, exporters, gherkin (parallele possible apres 6c)
- (autres items inchanges)

### Lessons learned (Sprint 6b)

- **Template Sprint 6a re-applique avec succes** sur un cas simple (1 consommateur). La methode `git mv` + grep snapshot + update package.json + update imports + retire ALLOWED_LEGACY_NAMES fonctionne.
- **Verification terrain avant le sprint** (grep des consommateurs reels) reste plus fiable que confiance dans la doc seule.
```

---

## Etape 7 — Archive prompt + commit

### 7.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6b.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6b.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6b.md
}
```

### 7.2 — Commit

```powershell
git add -A
git status
# Verifier que les fichiers attendus sont staged :
#   - renamed: packages/testvault-wit-schema/* -> packages/argos-wit-schema/*
#   - modified: packages/argos-wit-schema/package.json (name field)
#   - modified: packages/testvault-sdk/package.json (dependency)
#   - modified: packages/testvault-sdk/src/process-install.ts (import)
#   - modified: tools/regression/CFG-2026-05-13-package-naming.test.ts (ALLOWED_LEGACY_NAMES)
#   - modified: Specs/MIGRATION-PLAN.md (DONE marker)
#   - modified: CHANGELOG.md ([0.4.10])
#   - .changeset/*.md
#   - tools/claude-prompts/CLAUDE_TASK_sprint-6b.md

git commit `
  -m "feat(packages): rename @atconseil/testvault-wit-schema -> @atconseil/argos-wit-schema (Sprint 6b)" `
  -m "" `
  -m "2nd sprint of the testvault-* -> argos-* renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Changes:" `
  -m "- Folder: packages/testvault-wit-schema/ -> packages/argos-wit-schema/ (git mv)" `
  -m "- npm name: @atconseil/testvault-wit-schema -> @atconseil/argos-wit-schema" `
  -m "- 1 internal consumer updated: testvault-sdk (package.json + process-install.ts)" `
  -m "" `
  -m "TDD: ALLOWED_LEGACY_NAMES in CFG-2026-05-13-package-naming reduced from 7" `
  -m "to 6 entries. Test remains 4/4 passing." `
  -m "" `
  -m "No functional changes to Argos extension." `
  -m "Bump 0.4.9 -> 0.4.10 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)"

git push -u origin feat/rename-testvault-wit-schema-to-argos-wit-schema
```

PR.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-wit-schema-to-argos-wit-schema` creee depuis main a jour
- [ ] Snapshot consommateurs verifie : 1 consommateur seulement (testvault-sdk)
- [ ] Dossier renomme via `git mv` : `packages/argos-wit-schema/`
- [ ] `package.json` du package : `"name": "@atconseil/argos-wit-schema"`
- [ ] `testvault-sdk/package.json` dependency mise a jour
- [ ] Import dans `process-install.ts` mis a jour
- [ ] `ALLOWED_LEGACY_NAMES` : entree testvault-wit-schema retiree
- [ ] Aucun import RESIDUAL `@atconseil/testvault-wit-schema` dans le code
- [ ] `pnpm install` passe sans erreur
- [ ] `pnpm turbo lint && typecheck && test && build` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` 0 mojibake
- [ ] Test naming convention : 4/4 passing
- [ ] Suite regression : 51/51 passing
- [ ] MIGRATION-PLAN.md : Sprint 6b marque DONE
- [ ] CHANGELOG `[0.4.10]` cree
- [ ] Bump 0.4.9 -> 0.4.10 via Changesets
- [ ] Prompt archive dans `tools/claude-prompts/`
- [ ] Commit + PR

**Pas d'upload Marketplace necessaire** — pas de changement fonctionnel.

---

## Garde-fous Sprint 6b

⚠ **Le risque #1 = oublier de retirer ALLOWED_LEGACY_NAMES**
- Si on renomme `testvault-wit-schema` mais on laisse l'entree dans `ALLOWED_LEGACY_NAMES`, le test reste vert mais la liste devient obsolete.
- Verifier explicitement le fichier test apres modification.

⚠ **Le risque #2 = import dans process-install.ts oublie**
- 1 seul fichier import identifie en snapshot. Si la modification est oubliee, le typecheck va echouer.
- Self-check RESIDUAL doit montrer 0 ligne.

⚠ **Le risque #3 = scope creep**
- TENTATION : "1 sprint court, autant en faire 2 d'un coup..."
- NON. Sprint 6b = wit-schema uniquement. testvault-sdk = Sprint 6c dedie.

⚠ **Le risque #4 = cache typecheck**
- Si `pnpm turbo typecheck` echoue alors que les imports semblent corrects : `pnpm turbo typecheck --force` ou suppression `.turbo/` cache.

⚠ **Le risque #5 = workflows CI hardcodes**
- `.github/workflows/*.yml` pourraient mentionner `testvault-wit-schema` (peu probable mais a verifier).
- `Select-String -Path .github\workflows\*.yml -Pattern "testvault-wit-schema"` doit retourner 0 ligne.

---

## Reporting utilisateur

Reporter a l'utilisateur **2 moments** :

1. **Apres Etape 1** (snapshot) :
   > "Snapshot : 1 consommateur (testvault-sdk/package.json + process-install.ts). Conforme MONOREPO.md. Confirmation avant `git mv` ?"

2. **Apres Etape 5** (validation post-renaming) :
   > "Renaming complet. 0 RESIDUAL, tests 51/51, test naming 4/4 (ALLOWED_LEGACY_NAMES = 6 entrees). Pret a commit ?"

---

Quand commit + PR ouverte, dis-le-moi. **Pause 5 min optionnelle** puis Sprint 6c (testvault-sdk → argos-sdk, 4 consommateurs, risque moyen).
