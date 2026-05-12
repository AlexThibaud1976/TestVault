# Prompt Claude Code — Sprint 6a (`feat/rename-testvault-types-to-argos-types`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **renaming** : premier du Groupe 1 (couche interne). Le plus risque a cause des 10 consommateurs de `testvault-types`.
> **TDD-first** : creer un test "naming convention" avant le renaming (Q1=a valide par utilisateur).
> **git mv** pour preserver l'historique (Q2=a valide par utilisateur).

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre (`working tree clean`)
- [ ] `git branch` indique `main`
- [ ] `git log --oneline | Select-Object -First 1` montre Sprint 5a+5b mergé
- [ ] `pnpm --filter @atconseil/regression-suite test` → 47 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce sprint** : TECH-DEBT-015B (MIGRATION-PLAN.md) a planifie le renaming du portfolio `testvault-*` -> `argos-*`. Le Sprint 6a est le **premier sprint d'execution**, attaquant la racine de toutes les dependances : `@atconseil/testvault-types`.

**Caracteristiques du sprint** :
- **Le plus risque du Groupe 1** : 10 consommateurs identifies (MONOREPO.md carte des dependances)
- **Methodologie set pour 6b-6f** : la facon dont on procede ici devient le template des autres
- **TDD-first** : on cree un test regression "naming convention" qui echouera tant que `testvault-types` existe, puis on le rend vert via le renaming

**10 consommateurs de `@atconseil/testvault-types`** (depuis MONOREPO.md) :
1. testvault-wit-schema
2. testvault-sdk
3. testvault-importers
4. testvault-exporters (via testvault-sdk dependency tree)
5. testvault-gherkin (a verifier - MONOREPO.md dit "aucune dependance interne" pour gherkin)
6. testvault-ui (SUPPRIME en Sprint 5a -> retire du compte)
7. testvault-cli
8. testpulse-ui-shared
9. argos-extension
10. argos-functions

**Recompte apres Sprint 5a** : **9 consommateurs reels** (testvault-ui supprime).

**Cibles du renaming** :
- Dossier : `packages/testvault-types/` -> `packages/argos-types/`
- Nom npm : `@atconseil/testvault-types` -> `@atconseil/argos-types`
- Imports dans le code : `from "@atconseil/testvault-types"` -> `from "@atconseil/argos-types"`
- Dependencies dans package.json : `"@atconseil/testvault-types"` -> `"@atconseil/argos-types"`
- References dans `Specs/*.md`, `CLAUDE.md`, `tools/preflight/*.md` (anti-patterns historiques OK, mais imports actifs a updater)

**Perimetre Sprint 6a** :
1. Creer test regression `CFG-2026-05-13-package-naming.test.ts` (TDD : echec attendu avant renaming)
2. Rename dossier via `git mv` (preserver historique)
3. Update `packages/argos-types/package.json` champ `name`
4. Update les 9 consommateurs (package.json + imports source)
5. `pnpm install` (workspace refresh)
6. Verifier test naming devient vert (47 -> 48 passing)
7. Validation complete (lint, typecheck, test apps, build)
8. CHANGELOG + version bump
9. Commit + PR

**Hors scope Sprint 6a** :
- Renaming d'autres packages (testvault-wit-schema, testvault-sdk, etc. -> Sprints 6b-6f)
- Modification fonctionnelle du code
- Update du test E2E si reference les noms (a verifier mais probablement pas)
- Realignement des versions (-> Sprint 8)
- Publication npm (-> Sprint 9)

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/rename-testvault-types-to-argos-types

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 47 passing
```

---

## Etape 1 — TDD : Creer test naming convention (ROUGE attendu)

### 1.1 — Creer `tools/regression/CFG-2026-05-13-package-naming.test.ts`

Source 100% ASCII strict.

```typescript
/**
 * Regression test: CFG-2026-05-13-package-naming (Configuration)
 *
 * History:
 *   2026-05-13 (Sprint 6a) - Initial. Asserts that no package in packages/
 *                            uses the legacy "testvault-*" prefix.
 *
 * What this test guards:
 *   - All packages in packages/ must use the "argos-*" or "argos-detection-api" prefix
 *   - Legacy "testvault-*" prefix is forbidden (migration planned in Sprints 6a-7b)
 *   - Allows the historical "testpulse-ui-shared" (will be renamed in Sprint 7b)
 *
 * Rationale: codify the naming convention from MIGRATION-PLAN.md to prevent
 * reintroduction of legacy "testvault-*" names in future packages.
 *
 * Lifecycle:
 *   - Sprint 6a (this test introduction): testvault-types renamed → 1 fewer violation
 *   - Sprints 6b-6f: 5 other testvault-* renamed → 0 violations
 *   - Sprint 7b: testpulse-ui-shared renamed to argos-detection-api → no impact on this test
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/MIGRATION-PLAN.md (TECH-DEBT-015B, section 1.4 Nommage cible)
 *   - REGISTRY entry CFG-2026-05-13-package-naming
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

const FORBIDDEN_PREFIX = "@atconseil/testvault-";
const ALLOWED_LEGACY_NAMES = new Set([
	// testpulse-ui-shared will be renamed in Sprint 7b
	"@atconseil/testpulse-ui-shared",
]);

interface PackageJson {
	name?: string;
	version?: string;
}

describe("CFG-2026-05-13-package-naming regression", () => {
	const packageFolders = existsSync(PACKAGES_DIR)
		? readdirSync(PACKAGES_DIR, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name)
		: [];

	it("packages/ directory must contain at least one package", () => {
		expect(packageFolders.length).toBeGreaterThan(0);
	});

	it("no package may use the legacy @atconseil/testvault-* prefix (migration in progress)", () => {
		const violations: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			if (pkg.name.startsWith(FORBIDDEN_PREFIX)) {
				violations.push(`${folder} -> ${pkg.name}`);
			}
		}

		expect(violations).toEqual([]);
	});

	it("packages must use approved prefixes (argos-* or allowed legacy)", () => {
		const unapproved: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			const isArgos = pkg.name.startsWith("@atconseil/argos-");
			const isAllowedLegacy = ALLOWED_LEGACY_NAMES.has(pkg.name);

			if (!isArgos && !isAllowedLegacy) {
				unapproved.push(`${folder} -> ${pkg.name}`);
			}
		}

		expect(unapproved).toEqual([]);
	});

	it("folder name must match the package name suffix (consistency)", () => {
		const mismatches: string[] = [];

		for (const folder of packageFolders) {
			const pkgPath = join(PACKAGES_DIR, folder, "package.json");
			if (!existsSync(pkgPath)) continue;

			const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
			if (!pkg.name) continue;

			// Extract suffix after @atconseil/
			const suffix = pkg.name.replace(/^@atconseil\//, "");
			if (suffix !== folder) {
				mismatches.push(`folder "${folder}" but name "${pkg.name}"`);
			}
		}

		expect(mismatches).toEqual([]);
	});
});
```

### 1.2 — Allowlister le nouveau test

Edit `tools/regression/allowlist.ts` ET `tools/regression/allowlist.cjs` (`SHARED_DOC_ALLOWLIST`) :

```typescript
"tools/regression/CFG-2026-05-13-package-naming.test.ts",
```

### 1.3 — Verifier que le test echoue (TDD rouge)

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
```

**Attendu** :
- Test 1 (packages count) : passe
- Test 2 (no testvault- prefix) : **ECHOUE** (8 violations attendues)
- Test 3 (approved prefixes) : **ECHOUE** (toutes les testvault-*)
- Test 4 (folder/name consistency) : passe probablement (consistent meme si legacy)

⚠ **Si le test 2 ne montre PAS exactement 8 violations** (=testvault-cli, testvault-exporters, testvault-gherkin, testvault-importers, testvault-sdk, testvault-types, testvault-wit-schema, + testpulse-ui-shared est ALLOWED), STOP et signaler.

**Rappel** : testpulse-ui-shared est dans `ALLOWED_LEGACY_NAMES`, donc 7 violations testvault-* (et non 8). Recompte : testvault-cli, exporters, gherkin, importers, sdk, types, wit-schema = **7 violations attendues** dans test 2.

### 1.4 — Reporter a l'utilisateur

> "Test naming convention cree (4 assertions). Test 2 echoue avec 7 violations testvault-*, test 3 echoue identiquement. Tests 1 et 4 passent. C'est le comportement TDD attendu (rouge). Confirmation avant de proceder au renaming ?"

---

## Etape 2 — Renaming `testvault-types` → `argos-types`

### 2.1 — Lister les consommateurs avant modification (snapshot)

```powershell
# Snapshot des consommateurs pour comparaison post-renaming
Write-Host "=== Consommateurs actuels de @atconseil/testvault-types ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match '"@atconseil/testvault-types"') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Imports source ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '@atconseil/testvault-types') {
        Write-Host "  $($_.FullName)" -ForegroundColor Yellow
    }
}
```

⚠ **Reporter le snapshot a l'utilisateur** avant de continuer.

Attendu (selon MONOREPO.md) :
- `packages/testvault-wit-schema/package.json`
- `packages/testvault-sdk/package.json`
- `packages/testvault-importers/package.json`
- `packages/testvault-exporters/package.json` (verifier - depend de sdk pas types directement ?)
- `packages/testvault-cli/package.json`
- `packages/testpulse-ui-shared/package.json`
- `apps/argos-extension/package.json`
- `apps/argos-functions/package.json`
- Imports : varies dans les fichiers .ts

### 2.2 — Rename via `git mv`

```powershell
git mv packages/testvault-types packages/argos-types
```

Verifier :
```powershell
Test-Path packages\argos-types     # Attendu : True
Test-Path packages\testvault-types # Attendu : False

# Verifier que git track le rename
git status
# Attendu : renamed: packages/testvault-types/* -> packages/argos-types/*
```

### 2.3 — Update `packages/argos-types/package.json`

Modifier le champ `name` :

```diff
- "name": "@atconseil/testvault-types",
+ "name": "@atconseil/argos-types",
```

⚠ **NE PAS toucher** au champ `version` (-> Sprint 8 realignement).
⚠ **NE PAS toucher** aux autres champs (description, scripts, etc.).

### 2.4 — Update les 9 consommateurs (package.json)

Pour chaque consommateur identifie en 2.1 :

```diff
  "dependencies": {
-   "@atconseil/testvault-types": "workspace:*",
+   "@atconseil/argos-types": "workspace:*",
    ...
  }
```

Fichiers a modifier (a confirmer via le snapshot 2.1) :
- `packages/testvault-wit-schema/package.json`
- `packages/testvault-sdk/package.json`
- `packages/testvault-importers/package.json`
- `packages/testvault-exporters/package.json` (si depend directement)
- `packages/testvault-gherkin/package.json` (si depend directement)
- `packages/testvault-cli/package.json`
- `packages/testpulse-ui-shared/package.json`
- `apps/argos-extension/package.json`
- `apps/argos-functions/package.json`

⚠ **PRECAUTION** : utiliser `str_replace` precis sur chaque fichier, ne PAS regex-replace globalement (risque de toucher des references documentaires dans CHANGELOG ou Specs).

### 2.5 — Update les imports source

Pour chaque fichier .ts/.tsx/.js identifie en 2.1, remplacer :

```diff
- import { ... } from "@atconseil/testvault-types";
+ import { ... } from "@atconseil/argos-types";
```

⚠ **Inclure les variantes** :
- `from "@atconseil/testvault-types"`
- `from "@atconseil/testvault-types/..."` (sub-paths si existent)
- `require("@atconseil/testvault-types")` (rare mais possible)

### 2.6 — pnpm install

```powershell
pnpm install
```

Attendu : pas d'erreur, le workspace est mis a jour avec le nouveau nom `@atconseil/argos-types`.

Verifier :
```powershell
pnpm list -r --depth=0 | Select-String -Pattern "argos-types"
# Attendu : presence
pnpm list -r --depth=0 | Select-String -Pattern "testvault-types"
# Attendu : 0 ligne
```

---

## Etape 3 — Verifier que le test TDD devient vert

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
```

**Attendu** :
- Test 1 (packages count) : passe
- Test 2 (no testvault- prefix) : **passe TOUJOURS PAS** (6 violations restantes : cli, exporters, gherkin, importers, sdk, wit-schema)
- Test 3 (approved prefixes) : **passe TOUJOURS PAS** (idem)
- Test 4 (folder/name consistency) : passe

⚠ **Important** : le test 2 va echouer encore avec 6 violations. **C'est attendu** apres Sprint 6a (seul types renomme). Les violations diminueront a chaque sprint 6b-6f.

**Recadrer la logique TDD pour ce contexte** : le test echouera completement vert seulement apres Sprint 6f. Pour Sprint 6a, le critere de "vert" est :
- ✅ Le nombre de violations a **diminue** de 7 a 6 (un de moins, celui de types)
- ✅ La violation specifique `testvault-types` n'apparait plus

Reformuler en TDD adaptive :
```typescript
// Dans le test, on peut documenter que ce test va se "remplir" progressivement
// Apres Sprint 6f, expect(violations).toEqual([]) sera definitivement vrai
```

**Alternative methodologique** : avoir un sous-test specifique pour testvault-types qui devient vert apres 6a, puis ajouter d'autres sous-tests pour 6b-6f. Mais ca complique. Plus simple : laisser le test global "echouer encore" jusqu'a Sprint 6f.

**Decision pour Sprint 6a** : on ne fait PAS de modification du test apres le renaming. Le test naming convention reste avec ses 6 violations restantes. Le **vrai** TDD est :
- AVANT renaming : 7 violations (testvault-types incluse)
- APRES renaming : 6 violations (testvault-types disparue)

C'est la **decrease** qui valide le sprint, pas le passage a 0.

⚠ **Reporter a l'utilisateur** : "Test naming convention apres renaming : 6 violations restantes (types disparue, 6 autres testvault-* attendus pour Sprints 6b-6f). C'est attendu."

---

## Etape 4 — Validation complete

```powershell
# Tests regression - 47 + 4 nouveaux = 51 (mais ceux du naming echouent partiellement)
pnpm --filter @atconseil/regression-suite test
# Attendu :
#   - 11 tests passent comme avant (47)
#   - CFG-2026-05-13-package-naming : 2/4 passing, 2/4 failing (attendu)
#   - Total : 49/51 passing
```

⚠ **Adapter le critere de "vert"** : pour Sprint 6a, le test naming convention a 2/4 failing est ATTENDU. C'est documente. Le sprint sera "vert" definitif a Sprint 6f.

### 4.1 — Autres validations

```powershell
# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED

# Lint + typecheck + tests apps
pnpm turbo lint
# Attendu : pas d'erreur

pnpm turbo typecheck
# Attendu : pas d'erreur (TypeScript resout @atconseil/argos-types correctement)

pnpm turbo test
# Attendu : tous verts

pnpm turbo build
# Attendu : tous verts

# Workspace coherent
pnpm list -r --depth=0 | Select-String -Pattern "@atconseil/(argos|testvault)" -SimpleMatch
# Attendu : @atconseil/argos-types ET 7 testvault-* restants (cli, exporters, gherkin, importers, sdk, wit-schema + testpulse-ui-shared)
```

### 4.2 — Self-checks anti-regression

```powershell
# Aucun import testvault-types reste actif (hors documentation/historique)
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.cjs,*.mjs -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules|\\dist\\" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "@atconseil/testvault-types") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Aucun package.json reste actif avec testvault-types
Get-ChildItem -Recurse -Filter package.json -Path packages,apps | Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "@atconseil/testvault-types") {
        Write-Host "RESIDUAL: $($_.FullName)" -ForegroundColor Red
    }
}
# Attendu : 0 ligne RESIDUAL

# Verifier que les autres testvault-* sont preserves
Get-ChildItem packages -Directory | Select-Object Name
# Attendu (7 packages restants) :
#   argos-types         (NOUVEAU)
#   testpulse-ui-shared
#   testvault-cli
#   testvault-exporters
#   testvault-gherkin
#   testvault-importers
#   testvault-sdk
#   testvault-wit-schema

# Sprints precedents preserves
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"
```

⚠ **Si une ligne RESIDUAL apparait**, STOP. Soit un import a ete oublie, soit un consommateur insoupconne existe.

---

## Etape 5 — Update Specs et tools

### 5.1 — Specs/MIGRATION-PLAN.md

Mettre a jour le tableau du Sprint 6a (section 3) :

```diff
- | Sprint 6a | Renaming `testvault-types` -> `argos-types` | ~45 min | Eleve (10 consommateurs) | Apres 5a/5b |
+ | Sprint 6a | Renaming `testvault-types` -> `argos-types` | ~45 min | Eleve (9 consommateurs) | **DONE 2026-05-13** |
```

### 5.2 — Specs/constitution.md (si reference)

Verifier que la constitution ne fait pas reference a `testvault-types` autrement que dans l'historique (ou autoriser les references historiques explicites).

### 5.3 — tools/preflight/marketplace-check.md

Pas affecte (le manifest ne reference pas les packages internes par nom).

### 5.4 — tools/regression/REGISTRY.md

Ajouter une entree pour CFG-2026-05-13-package-naming :

```markdown
| CFG-2026-05-13-package-naming | 2026-05-13 | Configuration | package-naming | Asserte qu'aucun package dans packages/ n'utilise le prefixe legacy @atconseil/testvault-*. 4 assertions (count, no-testvault, approved-prefixes, folder-name-consistency). Test introduit avec Sprint 6a, deviendra fully green apres Sprint 6f. testpulse-ui-shared en ALLOWED_LEGACY (renaming Sprint 7b). | Sprint 6a (PR feat/rename-testvault-types-to-argos-types) | AT |
```

### 5.5 — Allowlists (rappel)

Verifier que `tools/regression/CFG-2026-05-13-package-naming.test.ts` est bien dans allowlist.ts ET allowlist.cjs (deja fait en Etape 1.2).

---

## Etape 6 — Bump version (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting + tous les packages affectes (argos-types est nouveau, les consommateurs ont leurs imports changes)
# Type : patch
# Description : "Sprint 6a: rename @atconseil/testvault-types -> @atconseil/argos-types"

pnpm changeset version
# Attendu : bump argos-extension 0.4.8 -> 0.4.9
```

⚠ **Decision sur les packages internes** : selon strategie C-hybride (MIGRATION-PLAN.md 1.2), les packages Groupe 1 sont supposes etre bumpes ensemble. Mais la config `.changeset/config.json` n'a pas encore le mode `fixed` (Sprint 8 futur). Pour Sprint 6a :
- Option simple : bump argos-extension uniquement (patch), laisser packages internes a leur 0.3.2
- Option rigoureuse : bump argos-extension + tous les packages affectes en patch

**Recommandation** : option simple pour Sprint 6a (eviter scope creep). Le realignement complet sera Sprint 8.

---

## Etape 7 — CHANGELOG entry

Ajouter en haut de `CHANGELOG.md` :

```markdown
## [0.4.9] - 2026-05-13

### Changed (Sprint 6a - feat/rename-testvault-types-to-argos-types)

- **`@atconseil/testvault-types` renomme en `@atconseil/argos-types`** (premier sprint du renaming Groupe 1, MIGRATION-PLAN.md section 1.4).
  - Dossier : `packages/testvault-types/` -> `packages/argos-types/` (via `git mv`, historique preserve).
  - 9 consommateurs internes mis a jour : testvault-wit-schema, testvault-sdk, testvault-importers, testvault-exporters, testvault-gherkin, testvault-cli, testpulse-ui-shared, argos-extension, argos-functions.
  - Aucune modification fonctionnelle de l'extension Argos.

### Added (Sprint 6a)

- **`tools/regression/CFG-2026-05-13-package-naming.test.ts`** : test regression naming convention. 4 assertions :
  - Au moins 1 package dans packages/
  - Aucun package avec prefixe `@atconseil/testvault-*` (sera fully green apres Sprint 6f)
  - Tous les packages avec prefixe approuve (`@atconseil/argos-*` ou allowed legacy)
  - Consistance nom-dossier
- Le test compte actuellement 6 violations attendues (6 packages testvault-* restants) qui disparaitront Sprints 6b a 6f.

### Notes (Sprint 6a)

- Sprint le plus risque du renaming Groupe 1 (9 consommateurs).
- Methodologie TDD-first appliquee : test naming convention cree avant renaming pour validation par decrease des violations.
- `git mv` utilise pour preserver l'historique git des fichiers.
- Bump 0.4.8 -> 0.4.9 (patch : renaming sans changement fonctionnel utilisateur).

### Backlog

- **Sprint 6b NEXT** : Renaming `testvault-wit-schema` -> `argos-wit-schema` (1 consommateur, faible risque)
- Sprint 6c : Renaming `testvault-sdk` -> `argos-sdk` (4 consommateurs)
- Sprints 6d, 6e, 6f : importers, exporters, gherkin (parallele possible apres 6c)
- (autres items inchanges)

### Lessons learned (Sprint 6a)

- **TDD-first sur naming convention** : creer le test avant la transformation rend la progression mesurable. Le test passe progressivement du rouge total au vert total au fil des Sprints 6b-6f.
- **`git mv` sur Windows PowerShell** fonctionne correctement pour les renames lowercase (testvault- -> argos-). Pas de probleme de sensibilite casse.
- **Snapshot des consommateurs AVANT le renaming** permet de comparer apres et detecter tout import oublie.
```

---

## Etape 8 — Archive prompt + commit

### 8.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-6a.md", "$HOME\Downloads\CLAUDE_TASK_sprint-6a.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-6a.md
}
```

### 8.2 — Verifier allowlist

```powershell
pnpm --filter @atconseil/regression-suite test
# Verifier que les tests passent (modulo 2/4 attendus failing du naming convention)
# Si autre test echoue, allowlister tools/claude-prompts/CLAUDE_TASK_sprint-6a.md
```

### 8.3 — Commit

```powershell
git add -A
git status
# Verifier que les fichiers attendus sont staged :
#   - renamed: packages/testvault-types/* -> packages/argos-types/*
#   - modified: 9 consommateurs (package.json + imports)
#   - new file: tools/regression/CFG-2026-05-13-package-naming.test.ts
#   - modified: tools/regression/allowlist.ts + allowlist.cjs
#   - modified: tools/regression/REGISTRY.md
#   - modified: Specs/MIGRATION-PLAN.md
#   - modified: CHANGELOG.md
#   - .changeset/*.md

git commit `
  -m "feat(packages): rename @atconseil/testvault-types -> @atconseil/argos-types (Sprint 6a)" `
  -m "" `
  -m "First sprint of the testvault-* -> argos-* renaming wave (MIGRATION-PLAN.md)." `
  -m "" `
  -m "Changes:" `
  -m "- Folder: packages/testvault-types/ -> packages/argos-types/ (git mv)" `
  -m "- npm name: @atconseil/testvault-types -> @atconseil/argos-types" `
  -m "- 9 internal consumers updated (package.json + imports)" `
  -m "" `
  -m "TDD: Added CFG-2026-05-13-package-naming regression test (4 assertions)" `
  -m "that will progressively turn green over Sprints 6a-6f as more packages" `
  -m "are renamed." `
  -m "" `
  -m "No functional changes to Argos extension." `
  -m "Bump 0.4.8 -> 0.4.9 (patch: rename only)." `
  -m "" `
  -m "Refs: Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4)" `
  -m "      Specs/MONOREPO.md (TECH-DEBT-015A consumers map)"

git push -u origin feat/rename-testvault-types-to-argos-types
```

Puis PR.

---

## Criteres de done

- [ ] Branche `feat/rename-testvault-types-to-argos-types` creee depuis main a jour
- [ ] Test regression `CFG-2026-05-13-package-naming.test.ts` cree (4 assertions)
- [ ] Allowlists ts + cjs synchronisees
- [ ] AVANT renaming : 7 violations testvault-* (rouge TDD)
- [ ] Dossier renomme via `git mv` : `packages/argos-types/`
- [ ] `package.json` du package : `"name": "@atconseil/argos-types"`
- [ ] 9 consommateurs updates : package.json (deps) + imports source
- [ ] APRES renaming : 6 violations testvault-* (1 de moins, types disparue)
- [ ] Aucun import RESIDUAL `@atconseil/testvault-types` dans le code
- [ ] `pnpm install` passe sans erreur
- [ ] `pnpm turbo lint && typecheck && test && build` tous verts
- [ ] `pnpm preflight` PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` 0 mojibake
- [ ] REGISTRY entree CFG-2026-05-13-package-naming
- [ ] MIGRATION-PLAN.md : Sprint 6a marque DONE
- [ ] CHANGELOG `[0.4.9]` cree
- [ ] Bump 0.4.8 -> 0.4.9 via Changesets
- [ ] Prompt archive dans `tools/claude-prompts/`
- [ ] Commit + PR

**Pas d'upload Marketplace necessaire** — pas de changement fonctionnel.

---

## Garde-fous Sprint 6a

⚠ **Le risque #1 = import oublie**
- 9 consommateurs identifies, mais le snapshot 2.1 peut en rater (ex: import dynamic, alias workspace, lazy require).
- Self-check post-renaming (Etape 4.2) doit montrer 0 RESIDUAL.
- Si RESIDUAL trouve, STOP et fixer avant de continuer.

⚠ **Le risque #2 = casse de typecheck**
- TypeScript peut continuer a "voir" l'ancien nom via cache `.turbo/` ou `tsconfig.tsbuildinfo`.
- Si `pnpm turbo typecheck` echoue, essayer `pnpm turbo typecheck --force` pour invalider le cache.
- En dernier recours : `pnpm clean` (si script defini) ou suppression manuelle des `dist/` et `tsconfig.tsbuildinfo`.

⚠ **Le risque #3 = pnpm workspace cassee**
- Apres `git mv`, `pnpm install` doit reflechir le workspace.
- Si erreurs `ERR_PNPM_RECURSIVE_NOT_FOUND` ou similaires, verifier que `pnpm-workspace.yaml` capture toujours `packages/*` (le glob doit suffire, pas besoin de modification).

⚠ **Le risque #4 = scope creep vers autres testvault-***
- TENTATION : "tant qu'on est dans le renaming, on fait aussi wit-schema..."
- NON. Sprint 6a = types uniquement. wit-schema = Sprint 6b dedie.
- Si une modification s'echappe vers un autre package, REVERTER et faire un sprint dedie.

⚠ **Le risque #5 = test naming convention 100% rouge sans diminution**
- Si APRES renaming le test naming convention montre TOUJOURS 7 violations (au lieu de 6), c'est que le renaming n'a pas marche.
- Probable cause : changement de nom dans package.json oublie, ou mauvais dossier renomme.

⚠ **Le risque #6 = workflows CI cassent**
- `.github/workflows/*.yml` peuvent reference des paths. Verifier que rien ne hardcode `packages/testvault-types/`.
- `Select-String -Path .github\workflows\*.yml -Pattern "testvault-types"` doit retourner 0 ligne.

⚠ **Le risque #7 = .changeset/config.json reference l'ancien nom**
- Si Changesets a un mode `fixed` config existant, verifier qu'il n'enumere pas `@atconseil/testvault-types`.
- (Probablement pas le cas a ce stade, mais verifier.)

---

## Reporting utilisateur

Reporter a l'utilisateur **3 moments critiques** :

1. **Apres Etape 1.3** (test TDD rouge cree) :
   > "Test CFG-2026-05-13-package-naming cree. Resultats actuels : 2/4 passing, 2/4 failing avec 7 violations testvault-*. C'est le TDD rouge attendu. Confirmation pour proceder au renaming ?"

2. **Apres Etape 2.1** (snapshot consommateurs) :
   > "Voici les 9 fichiers references trouves : [liste]. Snapshot fige. Confirmation avant `git mv` et update ?"

3. **Apres Etape 4** (validation post-renaming) :
   > "Renaming complet. Validation : 0 RESIDUAL, lint/typecheck/test/build OK. Test naming convention : 2/4 passing, 2/4 failing avec 6 violations (au lieu de 7 - types disparue). Pret a commit ?"

---

Quand le commit est prepare et la PR ouverte, dis-le-moi. Pause optionnelle, puis Sprint 6b (testvault-wit-schema, plus simple : 1 consommateur seulement).
