# Prompt Claude Code — Sprint 3.1 (`fix/revert-publisher-to-alexthibaud`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-3.1.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, Sprint 3 mergé, tag `v0.3.0` poussé mais publication CI a échoué
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 25 passing (12 anciens + 5 cp1252 + 8 nouveaux Sprint 3)
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

**Sprint 3.1 corrige une erreur méthodologique de Sprint 2.**

Sprint 2 a appliqué un changement `publisher: AlexThibaud -> ATConseil` dans le manifest Marketplace, en pensant que c'etait une "correction". La capture d'ecran du portail Marketplace publisher (verifiee 2026-05-10) prouve que c'etait au contraire une erreur :

- Le publisher historique d'Argos est `AlexThibaud` (Argos v0.1.1 deja publiee sous ce nom, 2 jours avant Sprint 3)
- Le publisher `ATConseil` est dedie a TestPulse (autre produit), pas a Argos
- Le PAT Marketplace (secret `MARKETPLACE_PAT` cote GitHub Actions) appartient au publisher AlexThibaud
- La publication v0.3.0 a echoue avec : `Publisher ID 'ATConseil' provided in the extension manifest should match the publisher ID 'AlexThibaud' under which you are trying to publish`

Decision produit (validee 2026-05-10) : **Argos reste sous publisher AlexThibaud, ATConseil est reserve a TestPulse**.

**Perimetre Sprint 3.1** :
1. Revert du publisher dans le manifest : `ATConseil -> AlexThibaud`
2. Test regression : rename + invert logic du test actuel `CFG-2026-05-10-publisher-atconseil.test.ts` pour locker AlexThibaud
3. Bump v0.3.0 -> v0.3.1 (patch : corrige une publication failed, pas une feature)
4. Documentation honnete (CHANGELOG, constitution, REGISTRY) tracant le revert et la fausse premisse de Sprint 2

**Hors scope Sprint 3.1** :
- **Workspaces npm/pnpm `@atconseil/*`** : c'est un scope npm interne pour le monorepo, totalement independant du publisher Marketplace. **Ne PAS y toucher**.
- **Banniere Marketplace "by ATConseil --- atconseil.info"** : reste inchangee. Argos est un projet de la marque ATConseil (entreprise / portfolio), publie pour des raisons techniques sous le publisher Marketplace personnel AlexThibaud. Pattern courant (ex : Microsoft a des extensions publiees sous "ms-vscode" mais brandees "Visual Studio").
- **Toute mention ATConseil dans le code applicatif** : non liee au publisher Marketplace, reste en place.
- **Migration future Argos vers publisher ATConseil** : projet separe (TECH-DEBT-010 inscrit au backlog).

---

## Architecture des changements

### Modification 1 — `apps/argos-extension/vss-extension.json`

```diff
- "version": "0.3.0",
+ "version": "0.3.1",
- "publisher": "ATConseil",
+ "publisher": "AlexThibaud",
```

⚠ **Aucune autre modification du manifest**. Surtout pas de retour aux targets `work-hub-group` (Sprint 3 top-level placement reste valide), pas de retrait de `Azure Test Plans` des categories, pas de touche aux scopes ni a la banniere ni aux icones.

### Modification 2 — Test regression (Q3=a : rename + invert)

**Renommer** : `tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts` -> `tools/regression/CFG-2026-05-10-publisher-alexthibaud.test.ts`

**Inverser la logique** : verifier que `publisher = AlexThibaud`, rejeter `ATConseil` dans le manifest.

**En-tete historique enrichi** :

```typescript
/**
 * Regression test: CFG-2026-05-10-publisher-alexthibaud
 *
 * History:
 *   pre-Sprint-2 - Argos manifest publisher = "AlexThibaud" (correct)
 *   Sprint 2 (2026-05-10, PR feat/cloud-only-v0.2.0) - publisher changed
 *                AlexThibaud -> ATConseil, framed as a "correction".
 *                Test CFG-2026-05-10-publisher-atconseil added to lock ATConseil.
 *                BASED ON FALSE PREMISE: ATConseil publisher does not exist for
 *                Argos on the Marketplace. AlexThibaud is the historical and
 *                only valid publisher for Argos. ATConseil is reserved for the
 *                TestPulse product.
 *   Sprint 3 (2026-05-10) - Top-level hub + bump v0.3.0 + Marketplace banner.
 *                v0.3.0 tag pushed, CI publication FAILED with mismatch error
 *                "Publisher ID 'ATConseil' should match 'AlexThibaud'".
 *   Sprint 3.1 (2026-05-10, this PR) - Revert publisher to AlexThibaud.
 *                Test renamed + inverted to lock AlexThibaud as the publisher.
 *                Old name CFG-2026-05-10-publisher-atconseil retired (entry in
 *                REGISTRY "Tests retires" section).
 *
 * What this test guards:
 *   - vss-extension.json must have "publisher": "AlexThibaud"
 *   - Manifest must NOT contain "ATConseil" as publisher value
 *
 * Rationale: prevents accidental re-introduction of the Sprint 2 mistake.
 *
 * DO NOT delete without explicit spec-kit decision and updated REGISTRY entry.
 *
 * Reference: Specs/spec.md, REGISTRY.md (CFG-2026-05-10-publisher-alexthibaud + retired entry)
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
	publisher: string;
}

describe("CFG-2026-05-10-publisher-alexthibaud regression", () => {
	const raw = readFileSync(MANIFEST_PATH, "utf8");
	const manifest: Manifest = JSON.parse(raw);

	it("publisher must be AlexThibaud", () => {
		expect(manifest.publisher).toBe("AlexThibaud");
	});

	it("must reject ATConseil as publisher anywhere in manifest", () => {
		expect(raw).not.toMatch(/"publisher"\s*:\s*"ATConseil"/);
	});
});
```

### Modification 3 — REGISTRY entry

Dans `tools/regression/REGISTRY.md` :

**Section "Tests actifs"** :
- Modifier l'entree CFG-2026-05-10-publisher-atconseil pour devenir CFG-2026-05-10-publisher-alexthibaud (nouveau slug, nouvelle description tracant le revert).

**Section "Tests retires"** (a creer si elle n'existe pas) :
```markdown
| CFG-2026-05-10-publisher-atconseil | 2026-05-10 | 2026-05-10 | Renomme en CFG-2026-05-10-publisher-alexthibaud apres revert Sprint 3.1 (Sprint 2 etait base sur fausse premisse : publisher ATConseil n'existe pas pour Argos, reserve a TestPulse). Logique inversee, en-tete historique preserve la trace. | Sprint 3.1 (revert), PR fix/revert-publisher-to-alexthibaud |
```

### Modification 4 — Allowlists (allowlist.ts ET allowlist.cjs)

Remplacer `"tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts"` par `"tools/regression/CFG-2026-05-10-publisher-alexthibaud.test.ts"` dans `SHARED_DOC_ALLOWLIST` (les deux fichiers).

### Modification 5 — `Specs/constitution.md`

Trouver la section "Sprint 2" ou similaire, et **enrichir l'entree historique** sans effacer la trace de la decision Sprint 2 (transparence) :

```markdown
## Sprint 2 (v0.2.0)
- Publisher Marketplace : tentative de changement AlexThibaud -> ATConseil. **Decision retrospectivement annulee Sprint 3.1 : la premisse etait fausse.** Le publisher ATConseil n'existe pas pour Argos (il est reserve a TestPulse). Argos reste sous publisher AlexThibaud. Voir Sprint 3.1 et CHANGELOG [0.3.1].
- (autres entrees Sprint 2 inchangees : Server 2022 retire, Cloud-only, etc.)

## Sprint 3.1 (v0.3.1)
- 2026-05-10 : Revert publisher Marketplace ATConseil -> AlexThibaud. Decision produit confirmee : Argos sous AlexThibaud (publisher historique, deja publie v0.1.1), TestPulse sous ATConseil (autre produit). Test regression CFG-2026-05-10-publisher-atconseil renomme + logique inversee en CFG-2026-05-10-publisher-alexthibaud. La banniere Marketplace conserve "by ATConseil --- atconseil.info" : Argos reste un projet de la marque, publie pour raisons techniques sous le publisher personnel.
```

Bump constitution v0.4.0 -> v0.4.1.

### Modification 6 — `CHANGELOG.md`

Sous `[Unreleased]` (ou nouveau bloc `[0.3.1]`) :

```markdown
## [0.3.1] - 2026-05-10

### Fixed (Sprint 3.1 - fix/revert-publisher-to-alexthibaud)

- **Revert publisher Marketplace : ATConseil -> AlexThibaud**. Sprint 2 avait change le publisher en pensant que c'etait une "correction", mais la premisse etait fausse :
  - AlexThibaud est le publisher historique d'Argos (v0.1.1 deja publiee 2 jours avant Sprint 3)
  - ATConseil est reserve a TestPulse, pas a Argos
  - Le PAT `MARKETPLACE_PAT` (secret CI) appartient au publisher AlexThibaud
  - La publication v0.3.0 a echoue avec mismatch error
- **Test regression renomme** : `CFG-2026-05-10-publisher-atconseil.test.ts` -> `CFG-2026-05-10-publisher-alexthibaud.test.ts`. Logique inversee pour locker AlexThibaud. En-tete historique preserve la trace de la decision Sprint 2 et de son revert.
- **Allowlistes ts/cjs** mises a jour pour le nouveau nom.
- **REGISTRY** : entree retiree pour publisher-atconseil + nouvelle entree pour publisher-alexthibaud.
- **Constitution v0.4.0 -> v0.4.1** (correction methodologique tracee).
- Bump version 0.3.0 -> 0.3.1 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.1)

- **TECH-DEBT-010** : si decision portfolio future de migrer Argos vers le publisher ATConseil, projet separe necessitant creation publisher cote Marketplace + verification Microsoft + transfert/republication. Pas urgent.
- (autres items backlog inchanges : TECH-DEBT-007, Sprint 2.5b, WIRING-CLOUD-PLUS, audit scopes ADO)

### Lessons learned (Sprint 3.1)

- **Avant tout changement de publisher Marketplace**, verifier que le publisher cible existe cote Marketplace ET que le PAT CI a les droits. Sprint 2 a manque cette verification = 5 sprints plus tard, decouverte de la fausse premisse au moment du publish.
- **Test regression "false-premise"** : un test peut locker une mauvaise decision avec autant de rigueur qu'une bonne. Pattern de revert : rename + invert logic + en-tete historique enrichi (cf. skill regression-registry). Ne pas supprimer le test, sinon perte de la lecon.
- **Banniere et publisher peuvent diverger** : "by ATConseil" sur la banniere + publisher Marketplace AlexThibaud = pattern legitime quand la marque commerciale et le publisher technique sont distincts.
```

### Modification 7 — `apps/argos-extension/overview.md` (si concerne)

Si le fichier mentionne explicitement le publisher (probable mention legacy "publisher: AlexThibaud" ou pendant Sprint 2 update vers "ATConseil"), corriger en `AlexThibaud`. Sinon ne rien toucher.

### Modification 8 — `README.md` (si concerne)

Idem overview.md : corriger les mentions "publisher" si presentes. **Ne pas toucher** aux mentions ATConseil non liees au publisher (ex : "atconseil.info" dans une section contact, references a l'entreprise).

### Modification 9 — Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Choisir apps/argos-extension (et tout package.json a aligner)
# Type : patch
# Description : "Revert publisher to AlexThibaud (Sprint 2 false premise)"

pnpm changeset version
```

Cible : tous les `version` -> `0.3.1`.

---

## Etape 0 - Setup branche

```powershell
git checkout main
git pull
git checkout -b fix/revert-publisher-to-alexthibaud

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing (etat post-Sprint 3)
```

---

## Etape 1 - Test-first : modifier le test regression existant (ROUGE attendu)

Avant de toucher au manifest, **commencer par le test** qui doit fail sur le manifest actuel (qui contient encore ATConseil).

### 1.1 - Renommer le fichier de test

```powershell
git mv tools\regression\CFG-2026-05-10-publisher-atconseil.test.ts tools\regression\CFG-2026-05-10-publisher-alexthibaud.test.ts
```

### 1.2 - Reecrire le contenu du test

Remplacer integralement par le contenu fourni dans la section "Modification 2" ci-dessus (en-tete historique + 2 it).

⚠ **Source 100% ASCII** (cf. CLAUDE.md). Aucun caractere non-ASCII dans ce fichier (le `--` dans l'en-tete historique = double-tiret ASCII, pas em-dash Unicode).

### 1.3 - Lancer le test : il DOIT echouer

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-publisher-alexthibaud
```

**Attendu** : 2 fails (le manifest actuel contient encore "ATConseil" comme publisher, donc les 2 assertions echouent).

Confirme a l'utilisateur que tu vois le fail attendu avant l'etape 2.

### 1.4 - Allowlist : mettre a jour ts ET cjs

Editer `tools/regression/allowlist.ts` ET `tools/regression/allowlist.cjs`. Dans `SHARED_DOC_ALLOWLIST` :

```diff
- "tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts",
+ "tools/regression/CFG-2026-05-10-publisher-alexthibaud.test.ts",
```

### 1.5 - Verifier que le cross-check ts/cjs passe

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing (cross-check ts/cjs)
```

---

## Etape 2 - Modifier `vss-extension.json`

3 modifications chirurgicales :

```diff
- "version": "0.3.0",
+ "version": "0.3.1",
- "publisher": "ATConseil",
+ "publisher": "AlexThibaud",
```

⚠ **Garde-fou STOP** : avant la modification, verifier que **rien d'autre** dans le manifest ne mentionne "ATConseil". Si tu trouves un autre champ qui contient "ATConseil" (ex : tags, description, sponsorUrl), **STOP** et signale.

```powershell
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "ATConseil" -SimpleMatch
# Attendu apres modif : 0 ligne (sauf si un champ legitime non-publisher contient "ATConseil")
```

⚠ **Ne PAS toucher** :
- Les targets manifest (`ms.vss-web.project-hub-group` reste, Sprint 3 valide)
- Les categories (`["Azure Boards", "Azure Test Plans"]` reste)
- Les scopes (vso.work_full reste, audit separe)
- Les references aux assets (`marketplace-banner.png`, `argos-hub.svg`, etc.)

### Validation apres modif

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-publisher-alexthibaud
# Attendu : 2 passing (le test inverse passe maintenant que le manifest est correct)

# Tous les autres CFG doivent toujours passer
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing total (rien n'est casse)
```

Si l'un fail, STOP, ne pas continuer.

---

## Etape 3 - Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Choisir tous les packages affectes (apps/argos-extension, root, autres si applicable)
# Type : patch
# Description : "Revert publisher to AlexThibaud (Sprint 2 false premise)"

pnpm changeset version
# Applique le bump 0.3.0 -> 0.3.1 a tous les package.json concernes
```

### Validation

```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
# Attendu : "version": "0.3.1"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.3.1"

# Synchronisation package <-> manifest
pnpm --filter @atconseil/regression-suite test
# Attendu : tous CFG passing
```

---

## Etape 4 - Mettre a jour REGISTRY

Editer `tools/regression/REGISTRY.md` :

### 4.1 - Section "Tests actifs"

Modifier l'entree CFG-2026-05-10-publisher pour refleter le nouveau nom + nouvelle description :

```diff
- | CFG-2026-05-10-publisher-atconseil | 2026-05-10 | Configuration | publisher-atconseil | Le manifest doit contenir "ATConseil" comme publisher (correction Sprint 2 vs legacy AlexThibaud). | Sprint 2 (PR feat/cloud-only-v0.2.0) | AT |
+ | CFG-2026-05-10-publisher-alexthibaud | 2026-05-10 | Configuration | publisher-alexthibaud | Le manifest doit contenir "AlexThibaud" comme publisher. Locks la decision produit Sprint 3.1 (revert d'une fausse premisse Sprint 2). | Sprint 3.1 (PR fix/revert-publisher-to-alexthibaud) | AT |
```

### 4.2 - Section "Tests retires" (creer si absente)

```markdown
## Tests retires

| ID retire | Date ajout | Date retrait | Raison | PR retrait |
|---|---|---|---|---|
| CFG-2026-05-10-publisher-atconseil | 2026-05-10 | 2026-05-10 | Renomme en CFG-2026-05-10-publisher-alexthibaud apres revert Sprint 3.1. Sprint 2 etait base sur fausse premisse : publisher ATConseil n'existe pas pour Argos (reserve a TestPulse). Logique inversee, en-tete historique preserve la trace decisionnelle. | fix/revert-publisher-to-alexthibaud |
```

---

## Etape 5 - Mettre a jour la documentation spec-kit

### 5.1 - `Specs/constitution.md`

Voir contenu en "Modification 5" ci-dessus. Bump constitution v0.4.0 -> v0.4.1.

### 5.2 - `Specs/spec.md` et `Specs/plan.md`

Si l'un mentionne explicitement le publisher Marketplace (probablement Sprint 2 a touche), corriger ATConseil -> AlexThibaud **dans ce contexte uniquement**.

⚠ **Ne PAS toucher** aux mentions ATConseil non liees au publisher Marketplace (ex : si le spec dit "support email atconseil.info", c'est legitime).

Workflow pour spec.md / plan.md : 
1. Lire le fichier
2. Identifier les occurrences "ATConseil" 
3. Pour chaque occurrence, presenter a l'utilisateur le contexte (3 lignes avant + ligne match + 3 lignes apres) et le remplacement propose
4. Attendre validation explicite avant str_replace

---

## Etape 6 - Mettre a jour CHANGELOG + README + overview

### 6.1 - `CHANGELOG.md`

Ajouter le bloc `[0.3.1]` avec contenu defini en "Modification 6" ci-dessus.

⚠ **Inscrire TECH-DEBT-010 au backlog** dans la section Backlog du CHANGELOG.

### 6.2 - `README.md`

```powershell
Select-String -Path README.md -Pattern "publisher|ATConseil"
```

Si le README mentionne le publisher, corriger ATConseil -> AlexThibaud. Sinon, ne rien toucher. Les autres mentions ATConseil (site, contact, marque) restent.

### 6.3 - `apps/argos-extension/overview.md`

Idem. Si mention publisher -> corriger. Sinon ne rien toucher.

---

## Etape 7 - Validation complete

```powershell
# Tous tests regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing (12 anciens + 5 cp1252 + 8 nouveaux Sprint 3, dont CFG-publisher-alexthibaud renomme)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : 0 occurrence de "ATConseil" comme publisher Marketplace
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "ATConseil" -SimpleMatch
# Attendu : 0 ligne

# Self-check anti-regression historique
Select-String -Path apps,packages -Recurse -Include *.json,*.md,*.ts,*.tsx -Pattern "\bgpt-4\.1\b" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne

# Self-check : aucun reliquat top-level Sprint 3 perdu
Get-ChildItem -Recurse -Include *.json -Path apps `
  | Where-Object { $_.FullName -notmatch "node_modules" } `
  | Select-String -Pattern "work-hub-group"
# Attendu : 0 ligne (Sprint 3 top-level toujours actif)

# Self-check : workspaces @atconseil/* preserves
Select-String -Path packages,apps -Recurse -Include package.json -Pattern "@atconseil/" `
  | Select-Object -First 5
# Attendu : presence des @atconseil/* (regression-suite, testvault-sdk, etc.)
# Si 0 ligne -> PROBLEME : les workspaces ont ete touches par erreur. STOP.
```

---

## Etape 8 - Archive du prompt + commit

### 8.1 - Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-3.1.md", "$HOME\Downloads\CLAUDE_TASK_sprint-3.1.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-3.1.md
    Write-Host "OK Prompt archive"
}
```

### 8.2 - Allowlister le prompt archive

Le prompt `CLAUDE_TASK_sprint-3.1.md` contient les mots "ATConseil", "publisher" et autres patterns. Il doit etre dans **les deux** allowlists (deja le cas via `SHARED_DOC_ALLOWLIST` qui inclut `tools/claude-prompts/*` ? Verifier en lisant `allowlist.ts`).

Si une allowlist explicite est requise, ajouter dans `SHARED_DOC_ALLOWLIST` (allowlist.ts ET allowlist.cjs) :

```typescript
"tools/claude-prompts/CLAUDE_TASK_sprint-3.1.md",
```

Et dans le test no-xray (`CFG-2026-05-10-no-xray-references.test.ts`) la `XRAY_TEST_SPECIFIC_ALLOWLIST` n'a pas a etre touchee (ce prompt ne mentionne pas Xray).

### 8.3 - Verifier les allowlists

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing
```

### 8.4 - Commit

```powershell
git add -A
git status

git commit `
  -m "fix(extension): revert publisher to AlexThibaud (Sprint 2 false premise)" `
  -m "" `
  -m "Sprint 3.1 corrects a methodological mistake from Sprint 2:" `
  -m "- Sprint 2 changed publisher AlexThibaud -> ATConseil as a 'correction'" `
  -m "- The premise was wrong: ATConseil is reserved for TestPulse, not Argos" `
  -m "- Argos historical publisher is AlexThibaud (v0.1.1 already published)" `
  -m "- v0.3.0 publication failed with publisher mismatch error" `
  -m "" `
  -m "Changes:" `
  -m "- Manifest: publisher AlexThibaud + version 0.3.1" `
  -m "- Test renamed: CFG-2026-05-10-publisher-atconseil -> publisher-alexthibaud" `
  -m "- Test logic inverted to lock AlexThibaud + reject ATConseil" `
  -m "- REGISTRY: retired entry + new entry, history preserved" `
  -m "- CHANGELOG [0.3.1] documents the revert and lessons learned" `
  -m "- Constitution v0.4.0 -> v0.4.1" `
  -m "" `
  -m "Out of scope (preserved):" `
  -m "- Workspaces @atconseil/* (npm scope, not Marketplace publisher)" `
  -m "- Marketplace banner 'by ATConseil' (brand vs publisher distinction)" `
  -m "- Sprint 3 top-level hub placement (still active)" `
  -m "- Sprint 3 no-xray-references (still active)" `
  -m "" `
  -m "Backlog: TECH-DEBT-010 inscribed for future ATConseil migration if needed" `
  -m "" `
  -m "Refs: Sprint 2 PR feat/cloud-only-v0.2.0, Sprint 3 PR feat/top-level-hub-v0.3.0"

git push -u origin fix/revert-publisher-to-alexthibaud
```

Puis ouvrir la PR.

### 8.5 - Apres merge : re-tag pour declencher republication

```powershell
git checkout main
git pull
# Verifier que le merge est bien la
git log -1 --oneline
# Attendu : "fix(extension): revert publisher to AlexThibaud..."

# Tag annote ASCII-safe (PAS d'em-dash dans le message PowerShell)
git tag -a v0.3.1 -m "Argos v0.3.1: revert publisher to AlexThibaud, republication"

# Push du tag -> declenche le workflow Publish
git push origin v0.3.1
```

Surveille https://github.com/AlexThibaud1976/TestVault/actions

---

## Critères de done

- [ ] Branche `fix/revert-publisher-to-alexthibaud` creee depuis main a jour
- [ ] Test regression renomme : ancien fichier supprime, nouveau cree avec en-tete historique enrichi
- [ ] Manifest `vss-extension.json` : publisher = `AlexThibaud`, version = `0.3.1`, **rien d'autre touche**
- [ ] Allowlists ts ET cjs synchronisees (cross-check passe)
- [ ] REGISTRY : entree retiree pour publisher-atconseil + nouvelle entree pour publisher-alexthibaud
- [ ] CHANGELOG.md `[0.3.1]` cree avec section Fixed/Backlog/Lessons learned
- [ ] Constitution v0.4.0 -> v0.4.1 avec entrees Sprint 2 enrichie + Sprint 3.1
- [ ] Versions package.json bumpees a 0.3.1 via Changesets
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 25 passing (12 anciens + 5 cp1252 + 8 Sprint 3, dont test renomme)
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` -> tous verts
- [ ] Self-check : 0 ATConseil dans `vss-extension.json` (publisher uniquement, banniere conservee)
- [ ] Self-check : 0 reliquat anti-regression (gpt-4.1, work-hub-group, mojibake)
- [ ] Self-check : workspaces `@atconseil/*` preserves
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-3.1.md`
- [ ] Commit Conventional Commits, PR ouverte

Apres merge :
- [ ] Tag v0.3.1 cree et pousse
- [ ] Workflow Publish-Marketplace declenche
- [ ] Verification portail publisher : Argos v0.3.1 sous AlexThibaud, statut "Validated" ou "Validating"

---

## Garde-fous Sprint 3.1

⚠ **Le risque #1 = effacer la trace historique au lieu de la preserver**
- Le test regression doit etre **renomme** (`git mv`), pas supprime puis recree from scratch
- L'en-tete historique doit raconter Sprint 2 -> Sprint 3.1 honnetement (la fausse premisse + le revert)
- L'entree REGISTRY ne doit pas effacer la trace : section "Tests retires" + nouvelle entree active

⚠ **Le risque #2 = scope creep** (revert publisher devient revert tout Sprint 2/3)
- Le revert touche **uniquement le publisher**
- Sprint 3 top-level placement reste actif
- Sprint 3 no-xray-references reste actif
- Sprint 2 Cloud-only / retrait Server 2022 reste actif
- Banniere reste avec "by ATConseil" (decision Q1=a)

⚠ **Le risque #3 = casser les workspaces @atconseil/***
- C'est un scope npm interne, **totalement orthogonal** au publisher Marketplace
- Le test self-check etape 7 verifie leur preservation
- Si un str_replace touche `@atconseil/regression-suite` ou `@atconseil/testvault-sdk` -> STOP immediat

⚠ **Le risque #4 = re-introduire un mojibake dans un commit message PowerShell**
- Le `tag -m "..."` Sprint 3 a produit `ÔÇö` au lieu de `--`
- Pour le tag v0.3.1 : utiliser **uniquement ASCII** dans le message (`--` = double-tiret, pas em-dash)

⚠ **Le risque #5 = oublier le bump version**
- Manifest version, package.json versions, CHANGELOG header, constitution version : tous doivent etre alignes
- Test self-check etape 7 verifie la coherence

---

## Si quelque chose devie

- Si `Select-String -Pattern "ATConseil" -SimpleMatch` sur le manifest retourne autre chose que le `publisher` -> STOP, signale
- Si un test applicatif casse -> STOP, c'est inattendu (revert ciblé)
- Si le workflow Publish-Marketplace echoue avec un autre type d'erreur que l'ancienne -> STOP, screenshot, debug
- Si la publication v0.3.1 fait apparaitre Argos comme "Public" alors qu'il devrait etre "Private" (Sprint marketplace privé) -> verifier `"public": false` dans le manifest

---

Quand tous les criteres sont coches et la publication v0.3.1 confirmee sur le portail, dis-le-moi. Pause.
