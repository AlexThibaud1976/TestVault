# Prompt Claude Code — Sprint 3.2 (`fix/revert-marketplace-private-to-public`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-3.2.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, Sprint 3.1 mergé, tag `v0.3.1` poussé mais publication CI a échoué
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 25 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

**Sprint 3.2 corrige une deuxieme erreur methodologique** apres Sprint 3.1 (publisher).

Le Sprint Marketplace prive (`feat/marketplace-private`, merge avant Sprint 3) a configure le manifest Argos en `"public": false` pour limiter l'audience pendant le developpement. La premisse non validee : Argos pouvait etre rendu prive.

La capture d'ecran du portail Marketplace publisher (verifiee 2026-05-10) prouve qu'Argos v0.1.1 etait deja **Public** depuis 2 jours sous le publisher AlexThibaud. La regle Microsoft : **une extension qui a ete rendue publique ne peut pas etre repassee en privee**.

Apres le tag v0.3.1 (Sprint 3.1 publisher revert reussi), la publication CI a echoue avec :
```
error: 'An extension that was made public can't be changed to private.'
```

Decision produit (validee 2026-05-10) : **Argos reste Public**. Decision pragmatique :
- Argos est deja public depuis v0.1.1, downgrade impossible techniquement
- L'utilisateur ne fait pas de promotion/marketing, donc faible risque d'installation indesiree
- Cohenrence avec une extension portfolio "vue par hasard" plutot que "deploiement enterprise contraint"

**Perimetre Sprint 3.2** :
1. Retirer `"public": false` du manifest (defaut Marketplace = public)
2. Renommer + inverser logique des 3 tests CFG-2026-05-10-marketplace-private
3. Update REGISTRY (retire + nouveau)
4. Update CLAUDE.md "Marketplace publication strategy" section
5. Documentation honnete (CHANGELOG, constitution) tracant le revert
6. Inscrire **TECH-DEBT-011** : pre-flight check Marketplace avant tout sprint qui touche manifest publisher/visibility
7. Bump v0.3.1 -> v0.3.2 (patch)
8. Re-tag v0.3.2 pour declencher republication

**Hors scope Sprint 3.2 (a preserver)** :
- Sprint 3 top-level placement (`project-hub-group`)
- Sprint 3.1 publisher AlexThibaud
- Sprint 3 no-xray-references
- Workspaces npm `@atconseil/*` (scope monorepo)
- Banniere Marketplace "by ATConseil" (decision portfolio)

---

## Architecture des changements

### Modification 1 — `apps/argos-extension/vss-extension.json`

```diff
- "version": "0.3.1",
+ "version": "0.3.2",
```

```diff
@@ Retirer la cle "public": false @@
- "public": false,
```

(Microsoft Marketplace : par defaut une extension est publique, donc l'absence de la cle equivaut a public. Plus propre que `"public": true` explicite.)

⚠ **Aucune autre modification du manifest**. Specifiquement :
- Pas de retour aux targets `work-hub-group` (Sprint 3 top-level reste)
- Pas de retour au publisher ATConseil (Sprint 3.1 reste)
- Pas de touche aux scopes (`vso.work_full` reste, audit separe)
- Pas de touche aux assets (banniere, icones)

### Modification 2 — Test regression (rename + invert logic)

**Renommer** : `tools/regression/CFG-2026-05-10-marketplace-private.test.ts` -> `tools/regression/CFG-2026-05-10-marketplace-public.test.ts`

**Inverser les 3 assertions** :

```typescript
/**
 * Regression test: CFG-2026-05-10-marketplace-public
 *
 * History:
 *   pre-Sprint Marketplace prive - Argos v0.1.1 published as PUBLIC on the
 *                Marketplace under AlexThibaud publisher (2026-05-08).
 *   Sprint Marketplace prive (PR feat/marketplace-private) - manifest changed
 *                to "public": false to restrict audience during development.
 *                Test CFG-2026-05-10-marketplace-private added to lock private.
 *                BASED ON FALSE PREMISE: an extension already published as
 *                Public cannot be downgraded to Private (Microsoft Marketplace
 *                rule). The Sprint Marketplace prive change passed locally
 *                because tests check the manifest, not the Marketplace state.
 *   Sprint 3 (2026-05-10) - Top-level hub + bump v0.3.0. Tag v0.3.0 pushed,
 *                CI publication FAILED (publisher mismatch ATConseil/AlexThibaud).
 *   Sprint 3.1 (2026-05-10) - Publisher revert ATConseil -> AlexThibaud.
 *                Tag v0.3.1 pushed, CI publication FAILED again with:
 *                "An extension that was made public can't be changed to private."
 *   Sprint 3.2 (2026-05-10, this PR) - Revert "public": false. Argos stays
 *                Public (cohenrence with v0.1.1, low risk per product owner).
 *                Test renamed + inverted to lock Public visibility.
 *                Old name CFG-2026-05-10-marketplace-private retired.
 *
 * What this test guards:
 *   - vss-extension.json must NOT contain "public": false
 *   - The manifest defaults to public visibility (Marketplace default)
 *   - Sanity: positive check that no private flag is set
 *
 * Rationale: prevents accidental re-introduction of the Sprint Marketplace
 * prive mistake. An extension already published as Public cannot be set to
 * Private without losing the existing extensionId and creating a new one.
 *
 * DO NOT delete without explicit spec-kit decision and updated REGISTRY entry.
 *
 * Reference: Specs/spec.md, REGISTRY.md (CFG-2026-05-10-marketplace-public + retired entry)
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");

interface Manifest {
	public?: boolean;
}

describe("CFG-2026-05-10-marketplace-public regression", () => {
	const raw = readFileSync(MANIFEST_PATH, "utf8");
	const manifest: Manifest = JSON.parse(raw);

	it("manifest must NOT contain a 'public': false key", () => {
		expect(raw).not.toMatch(/"public"\s*:\s*false/);
	});

	it("manifest 'public' field, if present, must be true", () => {
		if (manifest.public !== undefined) {
			expect(manifest.public).toBe(true);
		} else {
			// Absent -> defaults to public (Marketplace default behavior). OK.
			expect(manifest.public).toBeUndefined();
		}
	});

	it("manifest must NOT contain galleryFlags 'Private' (legacy syntax)", () => {
		expect(raw).not.toMatch(/"galleryFlags"\s*:\s*\[[^\]]*"Private"[^\]]*\]/);
	});
});
```

⚠ **Source 100% ASCII** (cf. CLAUDE.md). Aucun caractere non-ASCII.

### Modification 3 — REGISTRY

Dans `tools/regression/REGISTRY.md` :

**Section "Tests actifs"** : remplacer l'entree marketplace-private par marketplace-public :
```diff
- | CFG-2026-05-10-marketplace-private | 2026-05-10 | Configuration | marketplace-private | Le manifest doit avoir "public": false (Sprint Marketplace prive). | feat/marketplace-private | AT |
+ | CFG-2026-05-10-marketplace-public | 2026-05-10 | Configuration | marketplace-public | Le manifest ne doit PAS contenir "public": false. Argos est Public (impossibilite de downgrade Microsoft + decision portfolio Sprint 3.2). | Sprint 3.2 (PR fix/revert-marketplace-private-to-public) | AT |
```

**Section "Tests retires"** : ajouter une nouvelle ligne :
```markdown
| CFG-2026-05-10-marketplace-private | 2026-05-10 | 2026-05-10 | Renomme en CFG-2026-05-10-marketplace-public apres revert Sprint 3.2. Sprint Marketplace prive etait base sur fausse premisse : Argos v0.1.1 etait deja publique sur le Marketplace, downgrade impossible (regle Microsoft). | fix/revert-marketplace-private-to-public |
```

### Modification 4 — Allowlists (allowlist.ts ET allowlist.cjs)

```diff
- "tools/regression/CFG-2026-05-10-marketplace-private.test.ts",
+ "tools/regression/CFG-2026-05-10-marketplace-public.test.ts",
```

### Modification 5 — `CLAUDE.md` (root)

Editer la section "Marketplace publication strategy" (creee pendant Sprint Marketplace prive) :

```diff
@@ Section "Marketplace publication strategy" @@
- Argos est publie en mode prive sur le Marketplace ADO :
- - vss-extension.json : "public": false (syntaxe moderne Microsoft 2026)
- - Partage explicite avec l'org cible (ex: bcee-qa) via portail publisher
- - Test regression CFG-2026-05-10-marketplace-private (3 assertions zero-tolerance)
+ Argos est publie en mode public sur le Marketplace ADO :
+ - vss-extension.json : pas de "public": false (Marketplace default = public)
+ - Visible sur https://marketplace.visualstudio.com (recherche "Argos")
+ - Test regression CFG-2026-05-10-marketplace-public (3 assertions zero-tolerance)
+ - Pas de promotion active : risque d'installation accidentelle limite
+ - Note : Argos a ete tente en prive Sprint Marketplace prive, revert Sprint 3.2 car v0.1.1 etait deja Public et la regle Microsoft interdit le downgrade. Voir CHANGELOG [0.3.2] et REGISTRY entry retiree.
```

### Modification 6 — `Specs/constitution.md`

Trouver section "Sprint Marketplace prive" (ou similaire) et **enrichir l'entree historique** :

```markdown
## Sprint Marketplace prive (entree retrospectivement annulee Sprint 3.2)
- 2026-05-10 : Tentative de basculer Argos en private via "public": false. **Decision retrospectivement annulee.** Argos v0.1.1 etait deja Public sur le Marketplace ; la regle Microsoft interdit le downgrade Public -> Private. Le sprint a passe localement parce que les tests verifient le manifest, pas l'etat Marketplace. Voir Sprint 3.2 et CHANGELOG [0.3.2].

## Sprint 3.2 (v0.3.2)
- 2026-05-10 : Revert "public": false. Argos reste Public sur le Marketplace. Decision pragmatique du product owner : pas de promotion active, risque d'installation accidentelle limite, coherence avec v0.1.1 deja publique. Test regression marketplace-private renomme + logique inversee en marketplace-public.
- 2026-05-10 : **TECH-DEBT-011 inscrit** : pre-flight check Marketplace state requis avant tout sprint qui touche manifest publisher/visibility (lecon des 2 fausses premisses Sprint 2 et Sprint Marketplace prive en chaine).
```

Bump constitution v0.4.1 -> v0.4.2.

### Modification 7 — `CHANGELOG.md`

Ajouter le bloc `[0.3.2]` :

```markdown
## [0.3.2] - 2026-05-10

### Fixed (Sprint 3.2 - fix/revert-marketplace-private-to-public)

- **Revert "public": false du manifest**. Sprint Marketplace prive avait configure Argos en private, mais la premisse etait fausse :
  - Argos v0.1.1 etait deja Public sur le Marketplace depuis 2 jours sous publisher AlexThibaud
  - Microsoft Marketplace interdit le downgrade Public -> Private (regle plateforme)
  - Le sprint a passe localement parce que les tests verifient le manifest, pas l'etat Marketplace
  - Tag v0.3.1 (Sprint 3.1) a echoue avec : "An extension that was made public can't be changed to private."
- **Decision portfolio** : Argos reste Public. Pas de promotion active = risque d'installation accidentelle limite, coherence v0.1.1.
- **Test regression renomme** : CFG-2026-05-10-marketplace-private -> CFG-2026-05-10-marketplace-public. 3 assertions inversees (verify NOT private). En-tete historique preserve la trace.
- **Allowlistes ts/cjs** synchronisees pour le nouveau nom.
- **REGISTRY** : entree marketplace-private retiree + nouvelle entree marketplace-public.
- **CLAUDE.md** : section "Marketplace publication strategy" mise a jour (prive -> public).
- **Constitution v0.4.1 -> v0.4.2**.
- Bump version 0.3.1 -> 0.3.2 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.2)

- **TECH-DEBT-011 (NOUVEAU)** : Pre-flight check Marketplace avant tout sprint qui touche manifest publisher/visibility. Verifier sur le portail https://marketplace.visualstudio.com/manage/publishers/<publisher> que :
  - Le publisher cible existe et est associe au PAT CI
  - L'extensionId existe deja ou est libre
  - La visibility actuelle (Public/Private) permet le changement souhaite
  - Le partage org est compatible avec la cible
- **TECH-DEBT-010** (de Sprint 3.1) : migration future Argos vers ATConseil si decision portfolio.
- (autres items inchanges : TECH-DEBT-007, Sprint 2.5b, WIRING-CLOUD-PLUS, audit scopes ADO)

### Lessons learned (Sprint 3.2)

- **2eme fausse premisse en chaine** apres Sprint 3.1 (publisher). Pattern : modifier des configurations qui dependent d'un etat externe (Marketplace) sans verifier cet etat. Cause racine : tests internes (unit/regression) ne suffisent pas pour les sprints "publication". Necessite des pre-flight checks externes.
- **Microsoft Marketplace n'autorise pas le downgrade Public -> Private** sur un extensionId existant. Si on a vraiment besoin d'une version privee d'une extension deja publique, la seule solution est de creer un NOUVEL extensionId (anti-pattern long-terme : 2 extensions sur le Marketplace pour le meme produit).
- **Pattern revert UX-decision applique 2eme fois** : rename + invert + en-tete historique enrichi (cf. skill regression-registry). Pattern desormais teste sur publisher ET visibility.
```

### Modification 8 — `apps/argos-extension/overview.md` et `README.md`

Verifier si l'un mentionne "private" / "internal use only" / "limited audience" lie au mode prive. Si oui, corriger (le mode public ouvre l'audience). Si non, ne rien toucher.

```powershell
Select-String -Path apps\argos-extension\overview.md, README.md -Pattern "private|internal use|limited|restricted"
```

### Modification 9 — Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Type : patch
# Description : "Revert marketplace private to public (Microsoft downgrade rule)"

pnpm changeset version
```

Cible : tous les `version` -> `0.3.2`.

---

## Etape 0 - Setup branche

```powershell
git checkout main
git pull
git checkout -b fix/revert-marketplace-private-to-public

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing (etat post-Sprint 3.1)
```

---

## Etape 1 - Test-first : modifier le test regression existant (ROUGE attendu)

### 1.1 - Renommer le fichier

```powershell
git mv tools\regression\CFG-2026-05-10-marketplace-private.test.ts tools\regression\CFG-2026-05-10-marketplace-public.test.ts
```

### 1.2 - Reecrire le contenu

Remplacer integralement par le contenu defini en "Modification 2" ci-dessus.

### 1.3 - Lancer le test : il DOIT echouer

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-public
```

**Attendu** : 1 ou 2 fails (le manifest contient encore `"public": false`, donc l'assertion 1 echoue). 

Confirme a l'utilisateur que tu vois les fails attendus avant l'etape 2.

### 1.4 - Allowlist : mettre a jour ts ET cjs

```diff
- "tools/regression/CFG-2026-05-10-marketplace-private.test.ts",
+ "tools/regression/CFG-2026-05-10-marketplace-public.test.ts",
```

### 1.5 - Verifier le cross-check

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing
```

---

## Etape 2 - Modifier `vss-extension.json`

```diff
- "public": false,
```

```diff
- "version": "0.3.1",
+ "version": "0.3.2",
```

⚠ **Garde-fou STOP** : verifier qu'il n'y a pas une syntaxe legacy `"galleryFlags": ["Private", ...]` qui aurait du etre retiree aussi pendant Sprint Marketplace prive. Si tu trouves cette cle, **STOP** et signale.

```powershell
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "galleryFlags|public" -SimpleMatch
# Attendu apres modif : 0 ligne avec "public": false, pas de galleryFlags Private
```

⚠ **Ne PAS toucher** :
- targets (`project-hub-group` reste, Sprint 3 valide)
- categories (`["Azure Boards", "Azure Test Plans"]` reste)
- publisher (`AlexThibaud` reste, Sprint 3.1 valide)
- scopes, banniere, icones

### Validation apres modif

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-public
# Attendu : 3 passing

pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing total (rien casse, dont Sprint 3 + 3.1 toujours actifs)
```

---

## Etape 3 - Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Type : patch
# Description : "Revert marketplace private to public (Microsoft downgrade rule)"

pnpm changeset version
```

### Validation versions

```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.3.2"
```

---

## Etape 4 - Mettre a jour REGISTRY

Voir "Modification 3" pour le contenu exact.

---

## Etape 5 - Mettre a jour la documentation

### 5.1 - `CLAUDE.md` (root)

Voir "Modification 5" pour le contenu exact.

### 5.2 - `Specs/constitution.md`

Voir "Modification 6". Bump constitution v0.4.1 -> v0.4.2.

### 5.3 - `Specs/spec.md` et `Specs/plan.md`

Si l'un mentionne explicitement "private" / "marketplace prive" comme strategie, **REPORTING obligatoire** (workflow Sprint 3) :
1. Lire le fichier
2. Lister occurrences
3. Presenter contexte + remplacement propose
4. Attendre validation utilisateur

⚠ **Ne PAS toucher** aux mentions "private" non liees a la visibility Marketplace (ex : "private API", "private members" dans du code).

### 5.4 - `apps/argos-extension/overview.md` et `README.md`

Si mention de "private" / "internal" / "limited audience" liee a la visibility Marketplace, corriger. Sinon ne rien toucher.

### 5.5 - CHANGELOG.md

Voir "Modification 7" pour le contenu exact, avec section Backlog mettant TECH-DEBT-011 en haut (nouvelle dette importante).

---

## Etape 6 - Validation complete

```powershell
# Tous tests regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing (test renomme inclus)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : 0 occurrence "public": false
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne

# Self-check Sprint 3 toujours actif (top-level placement)
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "project-hub-group"
# Attendu : 1 ligne avec project-hub-group

Get-ChildItem -Recurse -Include *.json -Path apps `
  | Where-Object { $_.FullName -notmatch "node_modules" } `
  | Select-String -Pattern "work-hub-group"
# Attendu : 0 ligne (pas de retour a Sprint pre-3)

# Self-check Sprint 3.1 toujours actif (publisher AlexThibaud)
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"ATConseil"' -SimpleMatch
# Attendu : 0 ligne (pas de retour Sprint 2)

# Self-check Sprint 3 no-xray toujours actif
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 2 passing

# Self-check workspaces @atconseil/* preserves
Select-String -Path packages,apps -Recurse -Include package.json -Pattern "@atconseil/" `
  | Select-Object -First 5
# Attendu : presence des @atconseil/*

# Self-check anti-regression historique
Select-String -Path apps,packages -Recurse -Include *.json,*.md,*.ts,*.tsx -Pattern "\bgpt-4\.1\b" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne

Get-ChildItem -Recurse -Include *.json -Path apps `
  | Where-Object { $_.FullName -notmatch "node_modules" } `
  | Select-String -Pattern "Microsoft\.TeamFoundation\.Server"
# Attendu : 0 ligne

# Banniere preservee (mention ATConseil legitime)
Test-Path apps\argos-extension\static\marketplace-banner.png
Test-Path apps\argos-extension\static\marketplace-banner.svg
# Attendu : True True
```

---

## Etape 7 - Archive du prompt + commit

### 7.1 - Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-3.2.md", "$HOME\Downloads\CLAUDE_TASK_sprint-3.2.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-3.2.md
    Write-Host "OK Prompt archive"
}
```

### 7.2 - Allowlister le prompt archive

Ajouter dans **les deux** allowlists (allowlist.ts ET allowlist.cjs) si pas deja couvert par un wildcard explicite :

```typescript
"tools/claude-prompts/CLAUDE_TASK_sprint-3.2.md",
```

Pour le test no-xray (`XRAY_TEST_SPECIFIC_ALLOWLIST`), ce prompt ne contient aucune mention Xray, donc rien a ajouter.

### 7.3 - Verifier les allowlists

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing
```

### 7.4 - Commit

```powershell
git add -A
git status

git commit `
  -m "fix(extension): revert marketplace private to public (Microsoft downgrade rule)" `
  -m "" `
  -m "Sprint 3.2 corrects a 2nd false premise after Sprint 3.1:" `
  -m "- Sprint Marketplace prive set 'public': false to restrict audience" `
  -m "- Premise was wrong: Argos v0.1.1 was already Public on the Marketplace" `
  -m "- Microsoft rule forbids Public -> Private downgrade on existing extensionId" `
  -m "- v0.3.1 publish failed with: 'An extension that was made public...'" `
  -m "" `
  -m "Decision: Argos stays Public. No active promotion = low risk." `
  -m "" `
  -m "Changes:" `
  -m "- Manifest: removed 'public': false, version 0.3.2" `
  -m "- Test renamed: CFG-2026-05-10-marketplace-private -> marketplace-public" `
  -m "- 3 assertions inverted to lock Public visibility" `
  -m "- REGISTRY: retired entry + new entry, history preserved" `
  -m "- CLAUDE.md: 'Marketplace publication strategy' updated" `
  -m "- CHANGELOG [0.3.2] documents the revert and lessons learned" `
  -m "- Constitution v0.4.1 -> v0.4.2" `
  -m "" `
  -m "Out of scope (preserved):" `
  -m "- Sprint 3 top-level hub placement (project-hub-group)" `
  -m "- Sprint 3.1 publisher AlexThibaud" `
  -m "- Sprint 3 no-xray-references" `
  -m "- Workspaces @atconseil/*, marketplace banner brand" `
  -m "" `
  -m "Backlog: TECH-DEBT-011 inscribed (pre-flight Marketplace check)" `
  -m "" `
  -m "Refs: feat/marketplace-private (Sprint Marketplace prive), Sprint 3, 3.1"

git push -u origin fix/revert-marketplace-private-to-public
```

Puis ouvrir la PR.

### 7.5 - Apres merge : re-tag pour declencher republication

```powershell
git checkout main
git pull
git log -1 --oneline

# Tag annote ASCII-safe
git tag -a v0.3.2 -m "Argos v0.3.2: revert marketplace private to public, republication"

git push origin v0.3.2
```

Surveille https://github.com/AlexThibaud1976/TestVault/actions

---

## Critères de done

- [ ] Branche `fix/revert-marketplace-private-to-public` creee depuis main a jour
- [ ] Test renomme : ancien fichier supprime, nouveau cree avec en-tete historique enrichi
- [ ] Manifest : `"public": false` retire, version `0.3.2`, **rien d'autre touche**
- [ ] Allowlists ts ET cjs synchronisees
- [ ] REGISTRY : entree retiree marketplace-private + nouvelle entree marketplace-public
- [ ] CLAUDE.md section "Marketplace publication strategy" mise a jour
- [ ] CHANGELOG.md `[0.3.2]` cree
- [ ] Constitution v0.4.1 -> v0.4.2
- [ ] Versions package.json bumpees a 0.3.2 via Changesets
- [ ] **TECH-DEBT-011 inscrit** dans CHANGELOG Backlog
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 25 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` -> tous verts
- [ ] Self-check Sprint 3 (top-level) preserve
- [ ] Self-check Sprint 3.1 (publisher AlexThibaud) preserve
- [ ] Self-check Sprint 3 (no-xray) preserve
- [ ] Self-check workspaces @atconseil/* preserves
- [ ] Self-check banniere preservee
- [ ] Self-check anti-regression historique (gpt-4.1, Server 2022, mojibake)
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-3.2.md`
- [ ] Commit Conventional Commits, PR ouverte

Apres merge :
- [ ] Tag v0.3.2 cree et pousse
- [ ] Workflow Publish-Marketplace declenche
- [ ] Verification portail publisher : Argos v0.3.2 sous AlexThibaud, statut "Validated"
- [ ] Argos installable depuis Marketplace public dans BCEE-QA
- [ ] Premier coup d'oeil produit : top-level hub OK dans BCEE-QA

---

## Garde-fous Sprint 3.2

⚠ **Le risque #1 = effacer la trace historique** (idem Sprint 3.1)
- Test regression renomme via `git mv`, pas supprime
- En-tete historique trace Sprint Marketplace prive -> Sprint 3.2 honnetement
- REGISTRY garde la section "Tests retires"

⚠ **Le risque #2 = scope creep / chained reverts**
- Le revert touche **uniquement la visibility Marketplace** (`"public": false`)
- Sprint 3 top-level placement reste actif
- Sprint 3.1 publisher AlexThibaud reste actif
- Sprint 3 no-xray-references reste actif
- Sprint 2 Cloud-only reste actif
- Banniere "by ATConseil" preservee

⚠ **Le risque #3 = casser les workspaces @atconseil/***
- Self-check etape 6 verifie leur preservation explicitement

⚠ **Le risque #4 = mojibake commit message PowerShell**
- Tag v0.3.2 : message **ASCII-only**, pas d'em-dash

⚠ **Le risque #5 = casser Sprint 3 ou Sprint 3.1 par accident**
- Self-checks etape 6 verifient explicitement chaque sprint precedent
- Si l'un fail -> STOP, signale, c'est inattendu

⚠ **Le risque #6 = oublier d'inscrire TECH-DEBT-011**
- C'est la lecon principale de cette chaine d'erreurs
- Doit apparaitre dans CHANGELOG Backlog ET dans constitution Sprint 3.2 entry

---

## Si la publication v0.3.2 echoue encore

Cela signifierait qu'il y a une **3eme fausse premisse** non detectee. Probables suspects :
- Une autre cle manifest incompatible (categories, scopes, targets)
- Un quota / restriction sur le PAT
- Un probleme de validation Marketplace post-creation

Dans ce cas : **STOP**, copie l'erreur exacte, ne pas tenter une 4eme correction sans diagnostic. Pause et reprise demain a tete reposee.

---

Quand tous les criteres sont coches et la publication v0.3.2 confirmee sur le portail, dis-le-moi. **Vraie pause.**
