# Prompt Claude Code — Sprint 3.4 (`fix/hub-group-architecture`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-3.4.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 25 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

**Sprint 3.4 corrige la 3eme fausse premisse de la chaine (apres Sprint 3.1 publisher et Sprint 3.2 visibility).**

Sprint 3 avait declare un hub Argos targetant `ms.vss-web.project-hub-group`, un target inexistant chez Microsoft (invente sans verification doc officielle). L'extension est installee et active dans BCEE-QA mais le hub n'apparait pas dans la nav ADO.

**Cause racine** : Microsoft n'expose pas de target permettant a un hub `ms.vss-web.hub` de se placer **directement** top-level peer de Boards/Repos. Le pattern officiel pour creer une entree top-level dans la nav d'un projet ADO est :

1. Creer un **hub-group** (`ms.vss-web.hub-group`) ciblant `ms.vss-web.project-hub-groups-collection` (le conteneur officiel des hub-groups au niveau projet)
2. Creer un ou plusieurs **hubs** (`ms.vss-web.hub`) ciblant ce hub-group via une reference relative `.<hub-group-id>`

**Doc Microsoft validee** (2026-04-03, source `learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub`) :
- Target `ms.vss-web.project-hub-groups-collection` existe pour les hub-groups projet
- Type `ms.vss-web.hub-group` est le type officiel pour creer un hub-group
- Syntaxe relative `.<contributionId>` (point + ID court) est obligatoire pour les references cross-contribution **dans la meme extension** (la syntaxe complete `<publisher>.<extensionId>.<contributionId>` est utilisee pour cibler des contributions d'**autres** extensions)

**Architecture cible** :

```
ms.vss-web.project-hub-groups-collection (conteneur projet)
  |
  +- ms.vss-work-web.work-hub-group        (Boards, natif)
  +- ms.vss-test-web.test-hub-group        (Test Plans, natif)
  +- ms.vss-code-web.code-hub-group        (Repos, natif)
  +- ms.vss-build-web.build-release-hub-group (Pipelines, natif)
  +- AlexThibaud.ArgosTesting.argos-hub-group (Argos, ton hub-group)
       |
       +- argos-hub (Test Management, ton hub interne)
```

**Perimetre Sprint 3.4** :
1. Ajouter contribution `argos-hub-group` (type hub-group, target project-hub-groups-collection)
2. Modifier contribution `argos-hub` : target devient `.argos-hub-group` (reference relative)
3. Aligner propriete `iconUrl` -> `icon` (standard Microsoft) sur les 2 contributions
4. Order = 450 pour `argos-hub-group` (apres Test Plans natif, coherence semantique)
5. Update test regression T-0.9 + CFG-top-level-hub avec la nouvelle architecture
6. Enrichir TECH-DEBT-011 : pre-flight check inclut desormais "validation target IDs via doc Microsoft"
7. Bump v0.3.4 -> v0.3.5 (patch)
8. CHANGELOG avec lessons learned + 3eme fausse premisse documentee
9. Re-package + upload manuel (le workflow CI sera utilise au prochain sprint quand les tags git seront alignes)

**Hors scope Sprint 3.4** (a preserver) :
- Sprint 3.1 publisher AlexThibaud
- Sprint 3.2 visibility public (extension privee partagee org via portail)
- Sprint 3 no-xray-references + bannière + Test Plans category
- Workspaces npm `@atconseil/*`
- ExtensionId `ArgosTesting` (rename Sprint 3.x post-publication, non-revertable)
- L'eclatement futur du hub en plusieurs hubs internes (Test Cases, Coverage, etc.) → TECH-DEBT-013 separe

---

## Architecture des changements

### Modification 1 — `apps/argos-extension/vss-extension.json`

```diff
@@ Manifest racine @@
- "version": "0.3.4",
+ "version": "0.3.5",
```

```diff
@@ Contributions section @@
  "contributions": [
+   {
+     "id": "argos-hub-group",
+     "type": "ms.vss-web.hub-group",
+     "description": "Argos hub group (top-level peer of Boards, Repos, Pipelines, Test Plans).",
+     "targets": ["ms.vss-web.project-hub-groups-collection"],
+     "properties": {
+       "name": "Argos",
+       "order": 450,
+       "icon": "static/argos-hub.png"
+     }
+   },
    {
      "id": "argos-hub",
      "type": "ms.vss-web.hub",
      "description": "Argos Test Management Hub",
-     "targets": ["ms.vss-web.project-hub-group"],
+     "targets": [".argos-hub-group"],
      "properties": {
-       "name": "ArgosTesting",
+       "name": "Test Management",
        "order": 80,
        "uri": "dist/hub/hub.html",
-       "iconUrl": "static/argos-hub.png"
+       "icon": "static/argos-hub.png"
      }
    },
    {
      "id": "argos-coverage-panel",
      ...inchange (legitime sur work-item-form)
    }
  ]
```

⚠ **Aucune autre modification** du manifest. Notamment :
- `publisher: AlexThibaud` reste (Sprint 3.1)
- Pas de `"public": false` (Sprint 3.2)
- `categories: ["Azure Boards", "Azure Test Plans"]` reste (Sprint 3)
- `id: "ArgosTesting"` reste (rename post-publication, non-revertable)
- Scopes restent (vso.work_full, etc. — audit separe)

### Modification 2 — Tests regression mis a jour

**`tools/regression/T-0.9-argos-top-level-placement.test.ts`** : refonte des assertions + en-tete historique enrichi.

```typescript
/**
 * Regression test: T-0.9-argos-top-level-placement (UX-decision)
 *
 * History:
 *   2026-05-XX (T-0.8) - Argos hub placed under Boards via vss-extension.json
 *                        contribution targeting "ms.vss-work-web.work-hub-group".
 *                        Decision later judged suboptimal: Argos is a transverse
 *                        product, not a Boards feature.
 *   2026-05-10 (T-0.9 v1, Sprint 3) - Argos hub moved to top-level via target
 *                        "ms.vss-web.project-hub-group". FAUSSE PREMISSE: ce
 *                        target n'existe pas chez Microsoft. L'extension est
 *                        acceptee a l'upload (Microsoft ne valide pas les
 *                        target IDs) mais le hub n'apparait pas dans la nav
 *                        ADO au runtime (silent failure).
 *   2026-05-11 (T-0.9 v2, Sprint 3.4) - Architecture refondee : creation d'un
 *                        hub-group dedie (argos-hub-group) targetant le vrai
 *                        conteneur Microsoft "ms.vss-web.project-hub-groups-collection".
 *                        Le hub interne (argos-hub) cible le hub-group via
 *                        reference relative ".argos-hub-group".
 *
 * What this test guards (Sprint 3.4 version):
 *   - vss-extension.json must declare an "argos-hub-group" contribution
 *   - That contribution must be of type "ms.vss-web.hub-group"
 *   - Its targets[] must include "ms.vss-web.project-hub-groups-collection"
 *   - vss-extension.json must declare an "argos-hub" contribution
 *   - That contribution must target ".argos-hub-group" (relative reference)
 *   - No contribution must target the invalid "ms.vss-web.project-hub-group"
 *     (Sprint 3 false premise guard)
 *
 * Rationale: prevents accidental return to under-Boards placement OR to the
 * invalid "project-hub-group" target. Architecture must remain top-level via
 * a dedicated hub-group following Microsoft's official pattern.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/spec.md, Specs/tasks.md T-0.9
 *   - Microsoft docs: https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub
 *   - REGISTRY entries: T-0.9 (active), CFG-2026-05-10-top-level-hub (active)
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");

interface Contribution {
	id: string;
	type: string;
	targets: string[];
}

interface Manifest {
	contributions: Contribution[];
}

describe("T-0.9-argos-top-level-placement regression (Sprint 3.4 architecture)", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("must declare an argos-hub-group contribution", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
	});

	it("argos-hub-group must be of type ms.vss-web.hub-group", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
	});

	it("argos-hub-group must target ms.vss-web.project-hub-groups-collection", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("must declare an argos-hub contribution", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub).toBeDefined();
	});

	it("argos-hub must target .argos-hub-group (relative reference)", () => {
		const hub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(hub?.targets).toContain(".argos-hub-group");
	});

	it("no contribution must target the invalid ms.vss-web.project-hub-group (Sprint 3 false premise guard)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-web.project-hub-group"),
		);
		expect(offenders).toEqual([]);
	});

	it("no contribution must target ms.vss-work-web.work-hub-group (no Boards placement)", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-work-web.work-hub-group"),
		);
		expect(offenders).toEqual([]);
	});
});
```

**`tools/regression/CFG-2026-05-10-top-level-hub.test.ts`** : 1 assertion modifiee + 1 ajoutee.

```diff
- it("no contribution must target ms.vss-work-web.work-hub-group", () => {
-     const offenders = manifest.contributions.filter((c) =>
-         c.targets?.includes("ms.vss-work-web.work-hub-group"),
-     );
-     expect(offenders).toEqual([]);
- });
+ it("no contribution must target ms.vss-work-web.work-hub-group (no Boards placement)", () => {
+     const offenders = manifest.contributions.filter((c) =>
+         c.targets?.includes("ms.vss-work-web.work-hub-group"),
+     );
+     expect(offenders).toEqual([]);
+ });
+
+ it("no contribution must target the invalid ms.vss-web.project-hub-group (Sprint 3 false premise guard)", () => {
+     const offenders = manifest.contributions.filter((c) =>
+         c.targets?.includes("ms.vss-web.project-hub-group"),
+     );
+     expect(offenders).toEqual([]);
+ });
+
+ it("manifest must declare an argos-hub-group contribution of type hub-group", () => {
+     const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
+     expect(hubGroup).toBeDefined();
+     expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
+ });
```

L'assertion sur `work-hub-group` reste active (anti-regression vers T-0.8). L'assertion `version >= 0.3.0` et `categories` restent inchangees.

### Modification 3 — REGISTRY

Dans `tools/regression/REGISTRY.md` :

**Section "Tests actifs"** : enrichir l'entree T-0.9 et CFG-top-level-hub pour refleter Sprint 3.4 :

```diff
- | T-0.9 | 2026-05-10 | UX-decision | argos-top-level-placement | Argos hub doit pointer vers ms.vss-web.project-hub-group, pas ms.vss-work-web.work-hub-group. ... | spec.md, tasks.md T-0.9 | AT |
+ | T-0.9 | 2026-05-10 (Sprint 3) / mis a jour Sprint 3.4 | UX-decision | argos-top-level-placement | Argos placement top-level via hub-group dedie (argos-hub-group) targetant ms.vss-web.project-hub-groups-collection. Hub interne (argos-hub) cible .argos-hub-group (reference relative). Sprint 3 v1 invalidee : target ms.vss-web.project-hub-group n'existait pas Microsoft (3eme fausse premisse). | spec.md, tasks.md T-0.9 | AT |

- | CFG-2026-05-10-top-level-hub | 2026-05-10 | Configuration | top-level-hub | Zero-tolerance sur ms.vss-work-web.work-hub-group dans tout le manifest + version >= 0.3.0 + categories. | Sprint 3 (v0.3.0) | AT |
+ | CFG-2026-05-10-top-level-hub | 2026-05-10 (Sprint 3) / mis a jour Sprint 3.4 | Configuration | top-level-hub | Zero-tolerance sur ms.vss-work-web.work-hub-group ET ms.vss-web.project-hub-group (faux target) dans tout le manifest. Verifie aussi existence argos-hub-group type hub-group + version >= 0.3.0 + categories. | Sprint 3 (v0.3.0), Sprint 3.4 (v0.3.5) | AT |
```

Pas de nouvelle entree "Tests retires" cette fois — les tests ne sont pas renommes, juste mis a jour. La trace historique est dans les en-tetes des fichiers de test.

### Modification 4 — Constitution

Dans `Specs/constitution.md`, ajouter une nouvelle section :

```markdown
## Sprint 3.4 (v0.3.5) — Architecture hub-group dedie
- 2026-05-11 : Refonte architecture top-level placement. Sprint 3 utilisait `ms.vss-web.project-hub-group` comme target, un ID invente sans verification doc Microsoft (3eme fausse premisse de la chaine). L'extension etait installee dans BCEE-QA mais le hub n'apparaissait pas (silent failure runtime ADO).
- 2026-05-11 : Architecture validee via doc Microsoft officielle (learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub) :
  - Hub-group `argos-hub-group` (type `ms.vss-web.hub-group`) targetant le vrai conteneur `ms.vss-web.project-hub-groups-collection`
  - Hub interne `argos-hub` targetant `.argos-hub-group` (syntaxe reference relative obligatoire pour cross-contribution dans la meme extension)
  - Architecture extensible : on peut ajouter des hubs internes au hub-group plus tard (Test Cases, Coverage, Reports, etc.)
- 2026-05-11 : `iconUrl` -> `icon` (alignement propriete standard Microsoft).
- 2026-05-11 : Order hub-group = 450 (apres Test Plans natif, coherence semantique).
- 2026-05-11 : **TECH-DEBT-011 v2 enrichi** : pre-flight check inclut desormais "validation target IDs via doc Microsoft officielle" (3eme fausse premisse aurait ete attrapee).
```

Bump constitution v0.4.2 -> v0.4.3.

### Modification 5 — CHANGELOG

```markdown
## [0.3.5] - 2026-05-11

### Fixed (Sprint 3.4 - fix/hub-group-architecture)

- **3eme fausse premisse de la chaine identifiee et corrigee.** Sprint 3 utilisait `ms.vss-web.project-hub-group` comme target pour le hub top-level, un ID que j'avais invente sans verification doc Microsoft. ADO accepte les targets non-existants au manifest validation (silent), mais au runtime aucun hub-group ne correspond → le hub n'apparait nulle part dans la nav.
- **Architecture corrigee via pattern officiel Microsoft** (docs: learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub) :
  - Ajout contribution `argos-hub-group` (type `ms.vss-web.hub-group`) targetant `ms.vss-web.project-hub-groups-collection`
  - Modification contribution `argos-hub` : target devient `.argos-hub-group` (reference relative obligatoire pour cross-contribution dans la meme extension)
  - Hub-group order = 450 (apres Test Plans natif)
  - Icone Argos placee sur le hub-group top-level (visible dans la nav laterale, peer de Boards/Repos)
  - Nom hub interne : "Test Management" (au lieu de "ArgosTesting", coherent avec positionnement marketing)
- **Propriete `iconUrl` -> `icon`** : alignement sur la propriete standard documentee Microsoft. `iconUrl` etait un nom non-officiel qui marchait parfois mais n'est pas garanti.
- **Tests regression mis a jour** :
  - `T-0.9-argos-top-level-placement` : 7 assertions (existence hub-group, type hub-group, target collection, existence hub, target relative, exclusion 2 faux targets historiques)
  - `CFG-2026-05-10-top-level-hub` : 2 nouvelles assertions (hub-group existe + target faux exclu)
  - En-tetes historiques enrichis pour tracer Sprint 3 v1 (invalidee) et Sprint 3.4 v2 (validee)
- **Constitution v0.4.2 -> v0.4.3** avec lessons learned.
- **TECH-DEBT-011 v2 enrichi** : pre-flight check inclut "validation target IDs via doc Microsoft officielle" (clef manquante Sprint 3).
- Bump version 0.3.4 -> 0.3.5 (patch).

### Backlog (post-Sprint 3.4)

- **TECH-DEBT-013 (NOUVEAU)** : eclater le hub Argos monolithique en plusieurs hubs internes (Test Cases, Test Plans, Coverage, Reports, Settings). Profite maintenant que le hub-group existe. Sprint dedie ~2-3h.
- **TECH-DEBT-012** : extension test ENC a `.yml` (mojibake dans publish-marketplace.yml + commit messages PowerShell).
- (autres items backlog inchanges : TECH-DEBT-007 Test Set/Suite, Sprint 2.5b wiring, WIRING-CLOUD-PLUS, scopes ADO audit, TECH-DEBT-010 ATConseil migration)

### Lessons learned (Sprint 3.4)

- **3eme fausse premisse en 24h** apres publisher (Sprint 3.1) et visibility (Sprint 3.2). Pattern stable : modifier des targets/configs dependant d'un referentiel externe (doc Microsoft, etat Marketplace) sans valider ce referentiel. TECH-DEBT-011 v2 doit etre prioritaire post-Sprint 3.4.
- **Validation doc avant prompt** : cette fois, validation Microsoft docs effectuee AVANT redaction du Sprint 3.4 prompt. Resultat : la syntaxe `<publisher>.<extensionId>.<contributionId>` que j'avais proposee la veille etait incorrecte pour les references intra-extension — la doc requiert `.<contributionId>` (point + ID court). Sans la validation prealable, Sprint 3.4 aurait introduit une 4eme fausse premisse.
- **Architecture hub-group dedie** est plus puissante qu'un hub direct top-level (qui n'existe pas chez Microsoft de toute facon) : permet d'ajouter plusieurs hubs internes au sein du meme groupe Argos. Decoulage potentiel (TECH-DEBT-013) : Test Cases / Test Plans / Coverage / Reports / Settings comme hubs separes au lieu d'un App.tsx monolithique.
```

### Modification 6 — `apps/argos-extension/overview.md` et `README.md`

Si l'un mentionne le placement nav ou l'architecture hub, mise a jour. Sinon ne rien toucher.

```powershell
Select-String -Path apps\argos-extension\overview.md,README.md -Pattern "hub|top-level|nav"
```

Workflow : si occurrences, REPORTING avant modification (validation utilisateur).

### Modification 7 — Bump versions (Changesets)

```powershell
pnpm changeset
# Choisir apps/argos-extension + tout package.json a aligner
# Type : patch
# Description : "Fix top-level placement via dedicated hub-group (Microsoft official pattern)"

pnpm changeset version
# Bump 0.3.4 -> 0.3.5
```

---

## Etape 0 - Setup branche

```powershell
git checkout main
git pull
git checkout -b fix/hub-group-architecture

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing
```

---

## Etape 1 - Test-first : mettre a jour T-0.9 (ROUGE attendu)

Avant de toucher au manifest, **mettre a jour le test** qui doit fail sur le manifest actuel (qui contient encore `ms.vss-web.project-hub-group`).

### 1.1 - Reecrire `tools/regression/T-0.9-argos-top-level-placement.test.ts`

Remplacer integralement par le contenu en "Modification 2" ci-dessus. ⚠ Source 100% ASCII (cf. CLAUDE.md).

### 1.2 - Lancer le test : il DOIT echouer

```powershell
pnpm --filter @atconseil/regression-suite test T-0.9
# Attendu : 4-5 fails (hub-group inexistant, hub target encore project-hub-group, etc.)
```

Confirme a l'utilisateur que tu vois les fails attendus avant l'etape 2.

### 1.3 - Mettre a jour aussi `CFG-2026-05-10-top-level-hub.test.ts`

Ajouter les 2 assertions de la "Modification 2" (faux target exclu + hub-group existe). Lancer :

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : 2 fails (le hub-group n'existe pas encore + faux target encore present)
```

---

## Etape 2 - Modifier `vss-extension.json`

### 2.1 - Lire le manifest actuel pour reperer la structure exacte

```powershell
Get-Content apps\argos-extension\vss-extension.json
```

Confirme avec l'utilisateur que tu vas :
- Ajouter une contribution `argos-hub-group` **avant** `argos-hub` (ordre logique : groupe parent avant hub enfant)
- Modifier `argos-hub.targets` : `["ms.vss-web.project-hub-group"]` -> `[".argos-hub-group"]`
- Modifier `argos-hub.properties.iconUrl` -> `icon`
- Modifier `argos-hub.properties.name` : `"ArgosTesting"` -> `"Test Management"`
- Modifier `version` : `0.3.4` -> `0.3.5`

### 2.2 - Appliquer les modifications

⚠ **Garde-fou STOP** : ne PAS toucher a :
- `publisher: AlexThibaud`
- `id: ArgosTesting`
- `categories`
- `scopes`
- `argos-coverage-panel` (contribution inchangee)
- Tout autre champ non liste ci-dessus

### 2.3 - Validation apres modif

```powershell
pnpm --filter @atconseil/regression-suite test T-0.9
# Attendu : 7 passing

pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : 5 passing (3 originaux + 2 nouveaux)

pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing total (rien n'est casse)
```

Si l'un fail, STOP, ne pas continuer.

---

## Etape 3 - Bump versions package.json (Changesets)

```powershell
pnpm changeset
# Type : patch
# Description : "Fix top-level placement via dedicated hub-group (Microsoft official pattern)"

pnpm changeset version
```

### Validation

```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
# Attendu : "version": "0.3.5"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.3.5"
```

---

## Etape 4 - Update REGISTRY + Constitution + CHANGELOG

### 4.1 - REGISTRY.md

Modifier les entrees T-0.9 et CFG-2026-05-10-top-level-hub selon "Modification 3" ci-dessus.

### 4.2 - Specs/constitution.md

Ajouter la section Sprint 3.4 (cf. "Modification 4"). Bump v0.4.2 -> v0.4.3.

### 4.3 - CHANGELOG.md

Ajouter le bloc `[0.3.5]` (cf. "Modification 5"). **Inscrire TECH-DEBT-013 (eclatement hubs) au backlog**.

### 4.4 - overview.md / README.md (REPORTING si concerne)

Workflow : 
1. Lire les fichiers
2. Si mention placement nav / architecture hub, presenter contexte (3 lignes avant/apres)
3. Attendre validation utilisateur avant modification
4. Si aucune mention concernee → skip

---

## Etape 5 - Validation complete

```powershell
# Tous tests regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing (T-0.9 passe de 3 a 7 assertions, CFG-top-level-hub passe de 3 a 5)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.

# Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : Sprint 3.1 publisher AlexThibaud preserve
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"ATConseil"' -SimpleMatch
# Attendu : 0 ligne

# Self-check : Sprint 3.2 visibility public preserve (pas de "public": false)
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne

# Self-check : Sprint 3.4 architecture correcte
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "argos-hub-group|hub-group|project-hub-groups-collection"
# Attendu : presence argos-hub-group + project-hub-groups-collection + .argos-hub-group

Select-String -Path apps\argos-extension\vss-extension.json -Pattern "project-hub-group(?!s)"
# Attendu : 0 ligne (le faux target Sprint 3 n'est plus la)

# Self-check : Sprint 3 no-xray-references preserve
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 2 passing

# Self-check : workspaces @atconseil/* preserves
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
```

---

## Etape 6 - Build + Package + Upload manuel

### 6.1 - Build

```powershell
pnpm --filter argos-extension build
# Doit reussir
```

### 6.2 - Package VSIX

```powershell
cd apps\argos-extension
npx tfx extension create --manifest-globs vss-extension.json --output-path ../../dist/argos.vsix
cd ..\..
```

Doit afficher quelque chose comme :
```
- VSIX: ...\dist\argos.vsix
- Extension ID: ArgosTesting
- Extension Version: 0.3.5
- Publisher: AlexThibaud
```

### 6.3 - Inspection rapide du VSIX

```powershell
Copy-Item dist\argos.vsix dist\argos-test.zip -Force
Expand-Archive dist\argos-test.zip -DestinationPath dist\argos-test-content -Force

# Verifier le manifest packagé (le vsixmanifest généré par tfx)
Get-Content dist\argos-test-content\extension.vsixmanifest | Select-String -Pattern "Version=|Publisher="
# Attendu : Version="0.3.5" Publisher="AlexThibaud"

# Liste rapide des assets
Get-ChildItem dist\argos-test-content -Recurse | Select-Object Name | Format-Table

# Cleanup
Remove-Item dist\argos-test.zip, dist\argos-test-content -Recurse -Force
```

⚠ **Garde-fou : aucun fichier .svg ne doit etre dans le VSIX** (politique Marketplace, lecon Sprint 3.x). Si tu vois un .svg, STOP, signale.

### 6.4 - Upload manuel depuis le portail

1. Aller sur https://marketplace.visualstudio.com/manage/publishers/AlexThibaud
2. Click sur ArgosTesting
3. Bouton "..." → "Update" / "New version"
4. Upload `dist\argos.vsix`
5. Confirmer
6. Attendre "Validating" → "Validated"
7. **Reload la page projet BCEE-QA** dans ADO (ou re-installer si besoin)
8. **Verifier que Argos apparait dans la nav top-level** avec son icone, peer de Boards/Repos/Pipelines/Test Plans

Si Argos n'apparait toujours pas apres reload, STOP, prends une capture, on debug ensemble.

---

## Etape 7 - Archive du prompt + commit

### 7.1 - Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-3.4.md", "$HOME\Downloads\CLAUDE_TASK_sprint-3.4.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-3.4.md
    Write-Host "OK Prompt archive"
}
```

### 7.2 - Allowlister le prompt

Verifier si necessaire (le prompt mentionne des patterns interdits dans contexte historique uniquement) :

```powershell
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing toujours, prompt archive ne casse rien
```

Si fail sur prompt archive, ajouter dans allowlist.ts ET allowlist.cjs :
```typescript
"tools/claude-prompts/CLAUDE_TASK_sprint-3.4.md",
```

### 7.3 - Commit

```powershell
git add -A
git status

git commit `
  -m "fix(extension): top-level placement via dedicated hub-group (Microsoft official pattern)" `
  -m "" `
  -m "Sprint 3.4 corrects the 3rd false premise in the chain:" `
  -m "- Sprint 3 used 'ms.vss-web.project-hub-group' target (invented ID)" `
  -m "- ADO accepts non-existent targets at manifest validation (silent)" `
  -m "- At runtime no matching hub-group exists -> hub never appears in nav" `
  -m "" `
  -m "Architecture fixed via Microsoft official pattern (validated against docs):" `
  -m "- Added 'argos-hub-group' contribution (type ms.vss-web.hub-group)" `
  -m "- Targets ms.vss-web.project-hub-groups-collection (real Microsoft container)" `
  -m "- Modified 'argos-hub' to target .argos-hub-group (relative reference)" `
  -m "- Aligned iconUrl -> icon (standard Microsoft property)" `
  -m "- Renamed hub display 'ArgosTesting' -> 'Test Management'" `
  -m "" `
  -m "Tests updated:" `
  -m "- T-0.9-argos-top-level-placement: 3 -> 7 assertions, history enriched" `
  -m "- CFG-2026-05-10-top-level-hub: 3 -> 5 assertions" `
  -m "" `
  -m "Out of scope (preserved):" `
  -m "- Sprint 3.1 publisher AlexThibaud" `
  -m "- Sprint 3.2 visibility public" `
  -m "- Sprint 3 no-xray-references, banniere, Test Plans category" `
  -m "- ExtensionId ArgosTesting (rename post-publication non-revertable)" `
  -m "" `
  -m "Backlog: TECH-DEBT-011 v2 enriched (validate target IDs via Microsoft docs)" `
  -m "Backlog: TECH-DEBT-013 NEW (split monolithic hub into multiple internal hubs)" `
  -m "" `
  -m "Refs: Sprint 3 PR feat/top-level-hub-v0.3.0, doc Microsoft add-hub"

git push -u origin fix/hub-group-architecture
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `fix/hub-group-architecture` creee depuis main a jour
- [ ] Test T-0.9 reecrit avec 7 assertions + en-tete historique enrichi
- [ ] Test CFG-2026-05-10-top-level-hub enrichi de 2 nouvelles assertions
- [ ] Manifest : ajout `argos-hub-group` + modif `argos-hub.targets` + `iconUrl`->`icon` + name + version 0.3.5
- [ ] **Aucune autre modification du manifest** (publisher, scopes, categories, coverage-panel intacts)
- [ ] Versions package.json bumpees a 0.3.5 via Changesets
- [ ] REGISTRY entries T-0.9 et CFG-top-level-hub enrichies (pas de retire cette fois)
- [ ] CHANGELOG.md `[0.3.5]` cree avec Fixed/Backlog/Lessons learned
- [ ] Constitution v0.4.2 -> v0.4.3
- [ ] **TECH-DEBT-013 inscrit** dans CHANGELOG Backlog (split hubs)
- [ ] **TECH-DEBT-011 v2 enrichi** : validation target IDs via doc Microsoft
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 25 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` -> tous verts
- [ ] Self-check Sprint 3.1 (publisher AlexThibaud) preserve
- [ ] Self-check Sprint 3.2 (no "public": false) preserve
- [ ] Self-check Sprint 3 (no-xray) preserve
- [ ] Self-check workspaces @atconseil/* preserves
- [ ] Self-check anti-regression historique
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-3.4.md`
- [ ] Build OK + VSIX package OK + inspection sans SVG
- [ ] Commit Conventional Commits, PR ouverte

Apres merge :
- [ ] Upload manuel du VSIX 0.3.5 depuis portail AlexThibaud
- [ ] Validation Marketplace "Validated"
- [ ] Reload page projet BCEE-QA
- [ ] **Argos visible dans nav top-level** avec icone, peer de Boards/Repos/Pipelines/Test Plans
- [ ] Click sur Argos → hub "Test Management" charge correctement

---

## Garde-fous Sprint 3.4

⚠ **Le risque #1 = oublier l'ordre des contributions**
- `argos-hub-group` doit etre ajoute AVANT `argos-hub` dans le tableau `contributions`
- Logique : parent avant enfant. tfx-cli ne se plaint pas mais c'est plus lisible.

⚠ **Le risque #2 = mauvaise syntaxe reference relative**
- `.argos-hub-group` (point + ID court) pour cross-contribution dans la MEME extension
- **PAS** `AlexThibaud.ArgosTesting.argos-hub-group` (syntaxe pour cibler une AUTRE extension)
- C'est la difference confirmee par la doc Microsoft hier soir.

⚠ **Le risque #3 = casser un sprint precedent par accident**
- Self-checks etape 5 verifient explicitement chaque sprint precedent
- Si l'un fail → STOP immediat

⚠ **Le risque #4 = scope creep vers TECH-DEBT-013**
- Tentation : "tant qu'on touche au hub, on eclate en plusieurs hubs"
- NON. Sprint 3.4 ajoute UN seul hub-group + UN seul hub interne.
- L'eclatement est TECH-DEBT-013 sprint dedie.

⚠ **Le risque #5 = mojibake commit message PowerShell**
- Tag eventuel : message **ASCII-only**, pas d'em-dash dans `-m`

---

## Si la publication v0.3.5 ne montre toujours pas le hub apres ces corrections

STOP. C'est qu'il y a une 4eme fausse premisse ou un bug ADO. Diagnostics possibles dans cet ordre :

1. **Inspection manifest packagé** (le `vss-extension.json` du VSIX correspond bien au source ?)
2. **F12 console ADO** sur le projet BCEE-QA → erreurs JS, 404 sur hub.html, contribution non resolue
3. **Re-install l'extension** dans BCEE-QA (parfois ADO cache les vieilles contributions)
4. **Tester sur une nouvelle org ADO** (eliminer pollution etat BCEE-QA)

Ne pas tenter une 5eme correction a l'aveugle. Diagnostic propre, puis decision.

---

Quand le hub est visible top-level dans BCEE-QA, dis-le-moi. **Vraie victoire** apres 4 jours de fausses premisses corrigees. On choisira ensuite la suite (TECH-DEBT-011 v2 ? TECH-DEBT-013 split hubs ? Sprint 2.5b wiring ?).
