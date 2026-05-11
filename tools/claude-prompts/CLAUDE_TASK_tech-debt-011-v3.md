# Prompt Claude Code — TECH-DEBT-011 v3 (`feat/preflight-manifest-check`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **méthodologique préventif** : transformer les leçons des 5 fausses prémisses Sprint 2 → 4.5 en outils réutilisables pour les sprints futurs.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, v0.4.6 mergée si applicable
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 26 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un echoue → STOP.

---

## Contexte

**5 fausses premisses identifiees Sprint 2 → 4.5** (chacune a coute un sprint + une revert/correction) :

| # | Sprint | Hypothese fausse | Decouverte |
|---|---|---|---|
| 1 | Sprint 2 | Publisher cible ATConseil existe pour Argos | Sprint 3.1 au publish |
| 2 | Sprint Marketplace prive | Argos peut etre Private | Sprint 3.2 au publish (Microsoft Public->Private interdit) |
| 3 | Sprint 3 | `ms.vss-web.project-hub-group` est un target valide | Sprint 3.4 au runtime (silent failure) |
| 4 | Sprint 4 | `iconName: ReportDocument/BarChart4/AnalyticsReport` rend | Sprint 4.1/4.3 au visuel (silent) |
| 5 | Sprint 4.4/4.5 | `icon: "static/..."` ou `icon: "asset://..."` rend pour hubs | Sprint 4.6 au F12 (treats as iconName CSS class) |

**Cause racine commune** : modifier des configurations qui dependent d'un etat externe (Marketplace) ou d'un referentiel externe (doc Microsoft) **sans valider cet etat / referentiel avant**.

**Decision produit Q1-Q5 cadrage TECH-DEBT-011 v3** :
- **Q1=c** : Livraison hybride (doc markdown + script auto + test regression)
- **Q2=mix a+c** : 5 cas specifiques rencontres + principes generaux preventifs
- **Q3=b** : Checklist appliquee **avant tout sprint manifest** (preventif amont, le plus important)
- **Q4=oui** : Test regression encodant les regles automatisables
- **Q5=d** : Tout (principe copy-paste, lien doc Microsoft, snippets vivants)

**Perimetre TECH-DEBT-011 v3** :
1. `tools/preflight/marketplace-check.md` — Checklist humaine principale
2. `tools/preflight/manifest-check.cjs` — Script validation auto + commande `pnpm preflight`
3. `tools/preflight/microsoft-docs-snippets.md` — Exemples Microsoft copy-paste (target IDs, syntaxe icon, etc.)
4. `tools/regression/CFG-2026-05-12-preflight-rules.test.ts` — Test regression encodant 6+ regles validables
5. `CLAUDE.md` root — section "Avant tout sprint manifest" pointant vers preflight
6. CHANGELOG `[0.4.7]` — lessons learned consolidees + TECH-DEBT-011 v3 RESOLU
7. Constitution v0.5.0 → v0.5.1

**Hors scope** :
- Modification du manifest `vss-extension.json` (intentionnel : TECH-DEBT-011 v3 est preventif, pas un fix)
- Toute modification fonctionnelle de l'extension
- TECH-DEBT-014 (icones ADO) — sprint dedie ulterieur
- TECH-DEBT-015 (audit monorepo) — sprint dedie ulterieur

---

## Architecture des changements

### Fichier 1 — `tools/preflight/marketplace-check.md`

Checklist humaine principale, structuree en 4 sections :

```markdown
# Pre-flight Check — Marketplace Manifest

> **Quand consulter ce document ?**
> Avant tout sprint qui touche `apps/argos-extension/vss-extension.json`. Si vous etes Claude
> qui s'apprete a generer un prompt qui modifie le manifest, **commencez ici**. Si vous etes
> humain qui ouvre un prompt manifest, **verifiez chaque section**.

## Pourquoi ce document existe

Entre Sprint 2 et Sprint 4.5 (Argos 2026-05-09 -> 2026-05-11), 5 fausses premisses ont coute
chacune un sprint plein de revert/correction. Ce document encode les lecons.

## Section 1 — Etat Marketplace (verification PORTAIL avant prompt)

A faire **avant** de proposer un changement de publisher / visibility / extensionId :

- [ ] Le publisher cible existe sur https://marketplace.visualstudio.com/manage/publishers/<publisher>
- [ ] Le PAT CI (secret `MARKETPLACE_PAT`) est associe a ce publisher (sinon mismatch a la publication)
- [ ] L'extensionId existe deja ? Sous quelle visibility (Public / Private) ?
- [ ] Si l'extension est deja publique : impossible de la repasser private (regle Microsoft).
      Soit on reste public, soit on cree un nouvel extensionId.
- [ ] Le partage org est compatible avec la cible (private + partage explicite, ou public).

**Reference** : Sprint 2 (publisher), Sprint Marketplace prive (visibility) — voir CHANGELOG [0.3.1] / [0.3.2].

## Section 2 — Cibles et types de contributions (verification DOC MICROSOFT)

A faire **avant** de proposer une valeur `targets[]` ou `type` :

- [ ] Le `type` est documente : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest
- [ ] Chaque `target` est documente et **copie-colle integralement** depuis un exemple Microsoft officiel
- [ ] Pour les references intra-extension, syntaxe relative `.<contributionId>` (point + ID court)
- [ ] Pour les references cross-extension, syntaxe complete `<publisher>.<extensionId>.<contributionId>`
- [ ] **Anti-fausse-premisse** : si vous reformulez un target ID "logiquement" (ex: `ms.vss-web.project-hub-group` au lieu de `ms.vss-web.project-hub-groups-collection`), c'est un signal d'alerte. **Re-copier l'exemple Microsoft.**

**Reference** : Sprint 3 (target invalide invente) — voir CHANGELOG [0.3.5].

## Section 3 — Icones et assets (verification SYNTAXE + INSPECTION)

A faire **avant** de proposer une valeur `iconName` ou `icon` :

- [ ] La propriete utilisee (`iconName` Fluent UI string vs `icon` asset path vs `iconAsset` full-qualified) est confirmee compatible avec le **type de contribution** cible (hub != hub-group != work-item-form-page)
- [ ] Pour `iconName` Fluent UI : la valeur est **simple, non-numerotee, non-composee descriptive**. Risque eleve sur des noms comme `BarChart4`, `ReportDocument`, `AnalyticsReport`. Preferer `View`, `List`, `Document`, `Settings`, `Code`, `Warning`, `Important`.
- [ ] **Liste de iconName confirmes rendre dans ADO sandbox post-Sprint 4** (a enrichir au fil du temps) :
  - ✅ `BulletedList`, `TestBeaker`, `FolderList`, `Warning`, `Settings`
  - ❌ `Important` (Sprint 4 - non rendu), `ReportDocument`, `BarChart4`, `AnalyticsReport`
- [ ] Pour `icon` PNG : verifier que la propriete fonctionne sur le **type de contribution** vise. Sprint 4.4/4.5 a montre que pour `ms.vss-web.hub`, `icon` est traite comme `iconName` (genere classe CSS `ms-Icon--<valeur>`). Pour `ms.vss-web.hub-group`, `icon` fonctionne (cf. Sprint 3.4 `argos-hub-group`).
- [ ] **Anti-fausse-premisse** : si une icone ne rend pas, ne pas deviner une 2eme valeur a l'aveugle. **F12 DOM inspection** d'abord pour identifier comment ADO traite la valeur (classe CSS produite, attribut style, etc.).
- [ ] Au-dela de 3 tentatives ratees sur du cosmetique, **inscrire TECH-DEBT et passer**. Voir TECH-DEBT-014.

**Reference** : Sprint 4 -> 4.6 (chaine de 5 tentatives icone Reports) — voir CHANGELOG [0.4.0]-[0.4.6].

## Section 4 — Versions, files, et autres pieges

A faire **avant** de proposer une modification de version, files, scopes, categories :

- [ ] La `version` est coherente entre `apps/argos-extension/package.json` ET `apps/argos-extension/vss-extension.json` (Changesets bump des 2)
- [ ] Aucun fichier `.svg` dans le dossier `apps/argos-extension/static/` (politique Marketplace - bloque la publication)
- [ ] Les `categories` Marketplace existent reellement (whitelist Microsoft : "Azure Boards", "Azure Test Plans", etc.)
- [ ] Les `scopes` sont minimaux (audit `vso.work_full` en cours - TECH-DEBT separe)
- [ ] Le `publisher` matche un publisher dans la whitelist `["AlexThibaud", "ATConseil"]`
- [ ] Aucun `"public": false` si extension deja publique sur Marketplace (regle Microsoft)
- [ ] `icons.default` pointe vers un PNG (asset Marketplace, pas SVG)

**Reference** : Sprint 3.3 (SVG bloque Marketplace), Sprint 3.1/3.2 (publisher + visibility), Sprint 3.4 (consistance versions).

## Decision flow

1. Si une section ci-dessus revele une incertitude → **STOP**, ne pas proposer de prompt
2. Resoudre l'incertitude (consulter doc Microsoft, portail Marketplace, F12 inspection, code source extensions Microsoft samples)
3. Mettre a jour ce document si une nouvelle lecon emerge
4. Proposer le prompt

## Lien vers les snippets Microsoft

Voir `tools/preflight/microsoft-docs-snippets.md` pour les exemples copy-paste integraux (target IDs, types contribution, syntaxe icon, etc.).

## Lien vers le script auto

`pnpm preflight` lance les verifications automatisables (versions coherentes, no SVG, publisher whitelist, etc.). Voir `tools/preflight/manifest-check.cjs`.
```

### Fichier 2 — `tools/preflight/microsoft-docs-snippets.md`

Liste vivante d'exemples Microsoft officiels copy-paste integraux :

```markdown
# Microsoft Docs Snippets — Manifest ADO

> Exemples copy-paste **integraux** depuis la doc Microsoft officielle.
> **Ne pas simplifier, ne pas reformuler.**
> Source : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

## Hub-group + Hub pattern (validated Sprint 3.4)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub

\`\`\`json
"contributions": [
    {
        "id": "sample-hub-group",
        "type": "ms.vss-web.hub-group",
        "description": "Adds a 'Samples' hub group at the project level.",
        "targets": [
            "ms.vss-web.project-hub-groups-collection"
        ],
        "properties": {
            "name": "Samples",
            "order": 100
        }
    },
    {
        "id": "hello-hub",
        "type": "ms.vss-web.hub",
        "description": "Adds a 'Hello' hub to the Samples hub group.",
        "targets": [
            ".sample-hub-group"
        ],
        "properties": {
            "name": "Hello",
            "order": 99,
            "uri": "hello-world.html"
        }
    }
]
\`\`\`

**Cles a retenir** :
- Hub-group target: `ms.vss-web.project-hub-groups-collection` (plural "groups")
- Hub-group type: `ms.vss-web.hub-group`
- Hub interne cible le hub-group via reference relative `.sample-hub-group` (point + ID court, **PAS** la syntaxe complete `publisher.extension.contributionId`)

## Hub avec iconName Fluent UI

Source: https://learn.microsoft.com/en-us/azure/devops/extend/reference/targets/overview

\`\`\`json
"properties": {
    "iconName": "Code",
    "name": "Code Hub",
    "order": 30,
    "uri": "/views/code/custom.html"
}
\`\`\`

**Note Sprint 4** : la liste exhaustive des `iconName` valides cote ADO sandbox n'est pas documentee. Les noms simples non-numerotes (View, Code, BulletedList, Settings) ont la meilleure probabilite. Voir TECH-DEBT-014.

## Hub avec icon PNG (Sprint 3.4 hub-group)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/reference/targets/overview

\`\`\`json
"properties": {
    "name": "Sample hub",
    "uri": "dist/Hub/Hub.html",
    "icon": "asset://static/sample-icon.png",
    "supportsMobile": true
}
\`\`\`

**Note Sprint 4.4/4.5** : empiriquement pour `ms.vss-web.hub` (hub internes), `icon` est traite comme `iconName` (silent failure). Pour `ms.vss-web.hub-group`, `icon` fonctionne. Verifier le type de contribution avant d'utiliser.

## Manifest publisher / visibility (validated Sprint 3.1 / 3.2)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

- `"publisher"` doit matcher un publisher dans le Marketplace ET le PAT CI doit etre associe a ce publisher
- Par defaut Marketplace = public. Pour private : `"public": false`. **Mais : impossible de downgrade Public → Private sur un extensionId existant.** Si besoin private, creer nouvel extensionId.

## Categories Marketplace valides

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

Liste partielle (a enrichir) :
- "Azure Boards"
- "Azure Test Plans"
- "Azure Repos"
- "Azure Pipelines"

## Anti-patterns identifies (Sprint 2 → 4.5)

| Anti-pattern | Sprint | Symptome |
|---|---|---|
| Inventer un target ID "logique" sans verification doc | Sprint 3 | Extension acceptee, hub silent au runtime |
| Utiliser un iconName Fluent UI numerote (BarChart4) ou compose | Sprint 4 → 4.3 | Icone vide, classe CSS `ms-Icon--<name>` non-existante |
| Utiliser `icon: "static/..."` sans prefixe ou `asset://` pour ms.vss-web.hub | Sprint 4.4/4.5 | Treats as iconName, silent failure |
| Reformuler ATConseil → AlexThibaud "logiquement" pendant rename | Sprint 2 | Publisher mismatch au publish |
| `"public": false` sans verif Marketplace state | Sprint Marketplace prive | Microsoft refus downgrade |
```

### Fichier 3 — `tools/preflight/manifest-check.cjs`

Script de validation auto, executable via `pnpm preflight` :

```javascript
#!/usr/bin/env node

/**
 * Manifest Pre-flight Check
 *
 * Validates apps/argos-extension/vss-extension.json against rules learned from
 * Sprint 2 → 4.5 false premises chain.
 *
 * Usage:
 *   node tools/preflight/manifest-check.cjs
 *   pnpm preflight                                  (via root package.json)
 *
 * Exit 0 = all checks passed
 * Exit 1 = at least one check failed (errors printed to stderr)
 *
 * History:
 *   2026-05-12 (TECH-DEBT-011 v3) - Initial implementation. Encodes 5+ rules.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "apps", "argos-extension", "package.json");
const STATIC_DIR = path.join(REPO_ROOT, "apps", "argos-extension", "static");

const PUBLISHER_WHITELIST = ["AlexThibaud", "ATConseil"];
const CATEGORIES_WHITELIST = [
	"Azure Boards",
	"Azure Test Plans",
	"Azure Repos",
	"Azure Pipelines",
	"Azure Artifacts",
];

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Rule 1: version coherence between package.json and vss-extension.json
function checkVersionCoherence(manifest, pkg) {
	if (manifest.version !== pkg.version) {
		err(`Version mismatch: manifest=${manifest.version} package.json=${pkg.version}`);
	}
}

// Rule 2: publisher in whitelist
function checkPublisher(manifest) {
	if (!PUBLISHER_WHITELIST.includes(manifest.publisher)) {
		err(`Publisher "${manifest.publisher}" not in whitelist [${PUBLISHER_WHITELIST.join(", ")}]`);
	}
}

// Rule 3: no .svg in static/ (Marketplace policy)
function checkNoSvgInStatic() {
	if (!fs.existsSync(STATIC_DIR)) {
		warn(`Static dir not found: ${STATIC_DIR}`);
		return;
	}
	const files = fs.readdirSync(STATIC_DIR);
	const svgs = files.filter((f) => f.toLowerCase().endsWith(".svg"));
	if (svgs.length > 0) {
		err(`Found SVG files in static/ (blocks Marketplace publish): ${svgs.join(", ")}`);
	}
}

// Rule 4: categories valid
function checkCategories(manifest) {
	if (!manifest.categories || manifest.categories.length === 0) {
		err("Manifest has no categories (Marketplace requires at least one)");
		return;
	}
	for (const cat of manifest.categories) {
		if (!CATEGORIES_WHITELIST.includes(cat)) {
			warn(`Category "${cat}" not in known whitelist (may still be valid)`);
		}
	}
}

// Rule 5: icons.default exists and is PNG
function checkIconsDefault(manifest) {
	const defaultIcon = manifest.icons && manifest.icons.default;
	if (!defaultIcon) {
		err("Manifest missing icons.default (Marketplace asset)");
		return;
	}
	if (!defaultIcon.toLowerCase().endsWith(".png")) {
		err(`icons.default should be a PNG, got: ${defaultIcon}`);
	}
}

// Rule 6: no Sprint 3 false premise target (ms.vss-web.project-hub-group invalid)
function checkInvalidTargets(manifest) {
	const INVALID_TARGETS = [
		"ms.vss-web.project-hub-group", // Sprint 3 false premise (singular, doesn't exist)
	];
	for (const contrib of manifest.contributions || []) {
		for (const target of contrib.targets || []) {
			if (INVALID_TARGETS.includes(target)) {
				err(`Contribution "${contrib.id}" uses invalid target "${target}" (Sprint 3 false premise — use ms.vss-web.project-hub-groups-collection for hub-group, or .<hub-group-id> for hubs)`);
			}
		}
	}
}

// Rule 7: hub-group present if any hub uses relative reference
function checkHubGroupConsistency(manifest) {
	const contribs = manifest.contributions || [];
	const hubsUsingRelative = contribs.filter((c) =>
		c.type === "ms.vss-web.hub" && (c.targets || []).some((t) => t.startsWith("."))
	);
	if (hubsUsingRelative.length === 0) return;
	// Find referenced hub-group IDs
	const referencedIds = new Set();
	for (const hub of hubsUsingRelative) {
		for (const target of hub.targets) {
			if (target.startsWith(".")) referencedIds.add(target.slice(1));
		}
	}
	const declaredHubGroups = new Set(
		contribs.filter((c) => c.type === "ms.vss-web.hub-group").map((c) => c.id)
	);
	for (const ref of referencedIds) {
		if (!declaredHubGroups.has(ref)) {
			err(`Hub references relative hub-group ".${ref}" but no hub-group contribution with id "${ref}" declared`);
		}
	}
}

// Rule 8: no "public": false alongside known-public extension
// (informational — cannot detect "known-public" from manifest alone)
function checkPublicVisibility(manifest) {
	if (manifest.public === false) {
		warn(`Manifest has "public": false. Reminder: Microsoft forbids Public → Private downgrade on existing extensionId. Verify Marketplace state before tag.`);
	}
}

// MAIN
function main() {
	console.log("Pre-flight manifest check");
	console.log(`Manifest: ${MANIFEST_PATH}`);
	console.log("");

	if (!fs.existsSync(MANIFEST_PATH)) {
		console.error(`ERROR: Manifest not found at ${MANIFEST_PATH}`);
		process.exit(1);
	}

	const manifest = readJson(MANIFEST_PATH);
	const pkg = readJson(PACKAGE_JSON_PATH);

	checkVersionCoherence(manifest, pkg);
	checkPublisher(manifest);
	checkNoSvgInStatic();
	checkCategories(manifest);
	checkIconsDefault(manifest);
	checkInvalidTargets(manifest);
	checkHubGroupConsistency(manifest);
	checkPublicVisibility(manifest);

	for (const w of warnings) console.log(`WARN: ${w}`);
	for (const e of errors) console.error(`ERROR: ${e}`);

	if (errors.length > 0) {
		console.error("");
		console.error(`Pre-flight check FAILED: ${errors.length} error(s)`);
		process.exit(1);
	}

	console.log("");
	console.log(`Pre-flight check PASSED (${warnings.length} warning(s))`);
	process.exit(0);
}

main();
```

### Fichier 4 — `tools/regression/CFG-2026-05-12-preflight-rules.test.ts`

Test regression encodant les regles validables. Source 100% ASCII.

```typescript
/**
 * Regression test: CFG-2026-05-12-preflight-rules (Configuration)
 *
 * History:
 *   2026-05-12 (TECH-DEBT-011 v3) - Initial. Encodes manifest pre-flight rules
 *                                  derived from Sprint 2 → 4.5 false premises.
 *
 * What this test guards:
 *   - Manifest version matches package.json version (coherence)
 *   - Publisher is in whitelist [AlexThibaud, ATConseil]
 *   - No SVG files in apps/argos-extension/static/ (Marketplace policy)
 *   - Categories non-empty
 *   - icons.default exists and is a PNG
 *   - No invalid targets (Sprint 3 false premise)
 *   - Hub-group consistency (every relative reference resolves)
 *
 * Rationale: encode the rules that DO NOT require human judgment, leaving
 * tools/preflight/marketplace-check.md for those that do (Marketplace state,
 * Microsoft docs validation, etc.).
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - tools/preflight/marketplace-check.md
 *   - tools/preflight/manifest-check.cjs (script equivalent, exit-coded)
 *   - REGISTRY entry CFG-2026-05-12-preflight-rules
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const PACKAGE_JSON_PATH = join(REPO_ROOT, "apps", "argos-extension", "package.json");
const STATIC_DIR = join(REPO_ROOT, "apps", "argos-extension", "static");

const PUBLISHER_WHITELIST = ["AlexThibaud", "ATConseil"];
const INVALID_TARGETS = ["ms.vss-web.project-hub-group"];

interface Contribution {
	id: string;
	type: string;
	targets?: string[];
}

interface Manifest {
	version: string;
	publisher: string;
	categories?: string[];
	icons?: { default?: string };
	contributions?: Contribution[];
	public?: boolean;
}

interface PackageJson {
	version: string;
}

describe("CFG-2026-05-12-preflight-rules regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
	const pkg: PackageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));

	it("manifest version must match package.json version", () => {
		expect(manifest.version).toBe(pkg.version);
	});

	it("publisher must be in whitelist", () => {
		expect(PUBLISHER_WHITELIST).toContain(manifest.publisher);
	});

	it("apps/argos-extension/static/ must contain no .svg files (Marketplace policy)", () => {
		if (!existsSync(STATIC_DIR)) return;
		const files = readdirSync(STATIC_DIR);
		const svgs = files.filter((f) => f.toLowerCase().endsWith(".svg"));
		expect(svgs).toEqual([]);
	});

	it("manifest categories must be non-empty", () => {
		expect(manifest.categories).toBeDefined();
		expect((manifest.categories ?? []).length).toBeGreaterThan(0);
	});

	it("icons.default must exist and be a PNG", () => {
		const defaultIcon = manifest.icons?.default;
		expect(defaultIcon).toBeDefined();
		expect(defaultIcon?.toLowerCase()).toMatch(/\.png$/);
	});

	it("no contribution must use the invalid target ms.vss-web.project-hub-group (Sprint 3 false premise)", () => {
		const offenders: string[] = [];
		for (const contrib of manifest.contributions ?? []) {
			for (const target of contrib.targets ?? []) {
				if (INVALID_TARGETS.includes(target)) {
					offenders.push(`${contrib.id} -> ${target}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("every relative hub-group reference (.<id>) must resolve to a declared hub-group", () => {
		const contribs = manifest.contributions ?? [];
		const declaredHubGroups = new Set(
			contribs.filter((c) => c.type === "ms.vss-web.hub-group").map((c) => c.id),
		);
		const unresolved: string[] = [];
		for (const contrib of contribs) {
			if (contrib.type !== "ms.vss-web.hub") continue;
			for (const target of contrib.targets ?? []) {
				if (target.startsWith(".")) {
					const ref = target.slice(1);
					if (!declaredHubGroups.has(ref)) {
						unresolved.push(`${contrib.id} -> ${target} (not declared)`);
					}
				}
			}
		}
		expect(unresolved).toEqual([]);
	});
});
```

### Fichier 5 — `CLAUDE.md` (root)

Ajouter une nouvelle section :

```markdown
## Avant tout sprint qui touche le manifest

**Quand un prompt va modifier `apps/argos-extension/vss-extension.json`**, consulter d'abord :

1. **`tools/preflight/marketplace-check.md`** — Checklist humaine (4 sections : Marketplace state, targets/types, icones, versions)
2. **`tools/preflight/microsoft-docs-snippets.md`** — Exemples Microsoft copy-paste integraux
3. **`pnpm preflight`** — Script de validation auto

Ces outils existent pour empecher la 6eme fausse premisse de la chaine (apres 5 vecues
Sprint 2 -> 4.5). Voir CHANGELOG [0.4.7] pour le contexte.

Le test regression `CFG-2026-05-12-preflight-rules` encode les regles automatisables et
echoue en CI si le manifest viole l'une d'elles. Mais il ne remplace PAS la checklist
humaine pour les regles qui demandent du jugement (verifier le portail Marketplace, valider
les exemples doc Microsoft, etc.).
```

### Fichier 6 — `package.json` root

Ajouter un script `preflight` :

```json
{
	"scripts": {
		...
		"preflight": "node tools/preflight/manifest-check.cjs",
		...
	}
}
```

### Fichier 7 — `CHANGELOG.md`

Ajouter `[0.4.7]` :

```markdown
## [0.4.7] - 2026-05-12

### Added (TECH-DEBT-011 v3 - feat/preflight-manifest-check)

- **`tools/preflight/marketplace-check.md`** — Checklist humaine principale (4 sections : Marketplace state, cibles/types contributions, icones, versions). Consultation obligatoire avant tout prompt qui touche `vss-extension.json`.
- **`tools/preflight/manifest-check.cjs`** — Script validation auto. 7 regles encodees. Commande : `pnpm preflight`. Exit 0 = pass, exit 1 = fail.
- **`tools/preflight/microsoft-docs-snippets.md`** — Exemples Microsoft copy-paste integraux (hub-group pattern, iconName Fluent UI, icon asset, publisher, categories). Source vivante anti-simplification.
- **`tools/regression/CFG-2026-05-12-preflight-rules.test.ts`** — Test regression encodant 7 regles validables (version coherence, publisher whitelist, no SVG, categories, icons.default PNG, no invalid targets, hub-group consistency). 26 → 27 tests regression.
- **`CLAUDE.md` root** — Nouvelle section "Avant tout sprint qui touche le manifest" pointant vers les 3 outils.

### Resolved (TECH-DEBT)

- **TECH-DEBT-011 v3 RESOLU** : pre-flight check Marketplace + validation target IDs Microsoft codifies en outils reutilisables. Apres 5 fausses premises Sprint 2 → 4.5, l'apprentissage est transforme en infrastructure preventive.

### Backlog inchange

- TECH-DEBT-014 — Identifier la vraie syntaxe iconName/icon supportee ADO pour `ms.vss-web.hub` (inspection samples Microsoft)
- TECH-DEBT-015 — Audit monorepo (9 packages, frontiere TestVault/TestPulse)
- Sprint 2.5b — Wiring backends Run/Coverage/Reports + Settings non-LLM
- (autres items inchanges)

### Lessons learned (TECH-DEBT-011 v3)

- **Transformer la fatigue de la chasse aux fausses premisses en outil preventif** est plus rentable a long-terme que tenter de "faire attention". Les humains et les LLM oublient. Les checklists et scripts ne. La 6eme fausse premisse sera attrapee a froid par `pnpm preflight` ou la checklist, sans coup d'un sprint perdu.
- **Hybride doc + script + test regression** : chacun couvre un angle (jugement humain + verification auto local + verification auto CI). Aucun ne suffit seul, les 3 ensemble forment un filet robuste.
- **Anti-simplification doc Microsoft** : la cause de 3 fausses premisses sur 5 etait moi qui simplifie/reformule un exemple Microsoft. La regle "copy-paste integral, ne pas reformuler" est inscrite noir sur blanc dans les snippets. C'est une discipline a maintenir.
- Bump 0.4.6 → 0.4.7 (patch : ajouts d'outils preventifs, pas de modification fonctionnelle extension).

### Constitution v0.5.0 → v0.5.1

- Entry TECH-DEBT-011 v3 RESOLU, methodologie pre-flight inscrite.
```

### Fichier 8 — `Specs/constitution.md`

Bump v0.5.0 → v0.5.1. Ajouter section :

```markdown
## TECH-DEBT-011 v3 (RESOLU - 2026-05-12)

- 2026-05-12 : Codification des 5 fausses premises Sprint 2 → 4.5 en outils preventifs reutilisables.
- 2026-05-12 : Livraison hybride :
  - `tools/preflight/marketplace-check.md` (checklist humaine, 4 sections)
  - `tools/preflight/manifest-check.cjs` (script auto, 7 regles, `pnpm preflight`)
  - `tools/preflight/microsoft-docs-snippets.md` (exemples Microsoft copy-paste anti-simplification)
  - `tools/regression/CFG-2026-05-12-preflight-rules.test.ts` (7 assertions, en CI)
- 2026-05-12 : Consultation obligatoire avant tout prompt qui touche `vss-extension.json` (Q3=b validee).
- 2026-05-12 : Le filet preventif amont attrape les fausses premises avant qu'elles coutent un sprint. Defense en profondeur secondaire : test regression CI + script local optionnel.
```

### Fichier 9 — REGISTRY

Ajouter entree `CFG-2026-05-12-preflight-rules` :

```diff
@@ Section "Tests actifs" @@
+ | CFG-2026-05-12-preflight-rules | 2026-05-12 | Configuration | preflight-rules | Encode 7 regles preflight validables : version coherence (manifest/package.json), publisher whitelist, no SVG dans static/, categories non-vides, icons.default PNG, no invalid targets (Sprint 3 false premise), hub-group consistency (refs relatives resolvent). Equivalent test du script tools/preflight/manifest-check.cjs. | TECH-DEBT-011 v3 (PR feat/preflight-manifest-check) | AT |
```

### Fichier 10 — Allowlists

Ajouter dans `allowlist.ts` ET `allowlist.cjs` (`SHARED_DOC_ALLOWLIST`) :

```typescript
"tools/regression/CFG-2026-05-12-preflight-rules.test.ts",
"tools/preflight/marketplace-check.md",
"tools/preflight/microsoft-docs-snippets.md",
"tools/preflight/manifest-check.cjs",
```

⚠ Le fichier `marketplace-check.md` contient des references a Sprint 3 / target "project-hub-group" qui pourraient declencher le test no-xray ou autres. **Verifier les allowlists specifiques** des tests anti-pattern (xray + autres).

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/preflight-manifest-check

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 26 passing
```

---

## Etape 1 — Test-first : creer CFG-2026-05-12-preflight-rules (ROUGE attendu sur certaines assertions)

### 1.1 — Creer `tools/regression/CFG-2026-05-12-preflight-rules.test.ts`

Voir "Fichier 4". Source 100% ASCII.

### 1.2 — Allowlist : mettre a jour ts ET cjs

Voir "Fichier 10". Ajouter le nouveau test + les 3 fichiers preflight.

### 1.3 — Lancer le test

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-12-preflight-rules
# Attendu : tests passing OU 1 fail si une regle viole le manifest actuel
```

**Interpretation des resultats** :
- Si tous passent : le manifest actuel respecte deja les 7 regles. PARFAIT.
- Si certains failent : c'est instructif — au moins une regle est violee. **STOP**, signaler les violations a l'utilisateur, decider si on accepte ou corrige.

Probables fails attendus dans le manifest actuel post-Sprint 4.6 :
- Possible : si le manifest a encore `"icon": "asset://static/icon-reports.png"` (le `icon` n'est pas un anti-pattern strict, juste cosmetique selon TECH-DEBT-014). Pas couvert par le test.
- Probablement tout pass.

---

## Etape 2 — Creer les 3 fichiers tools/preflight/

### 2.1 — `tools/preflight/marketplace-check.md`

Creer le fichier avec le contenu de "Fichier 1". Source 100% ASCII. Le fichier contient des references a des patterns sensibles (target IDs, iconName) qui sont **legitimes en contexte historique/anti-pattern**. **Allowlister** dans XRAY_TEST_SPECIFIC_ALLOWLIST si necessaire.

### 2.2 — `tools/preflight/microsoft-docs-snippets.md`

Idem, contenu "Fichier 2". Source ASCII strict.

### 2.3 — `tools/preflight/manifest-check.cjs`

Idem, contenu "Fichier 3". Permissions executable Unix optionnelles (Windows ignore).

### 2.4 — Tester le script

```powershell
node tools\preflight\manifest-check.cjs
# Attendu : "Pre-flight check PASSED" sur le manifest actuel
```

Si erreurs, fixer le script ou signaler les violations du manifest.

---

## Etape 3 — Ajouter script `preflight` au package.json root

```powershell
# Lire le package.json root pour identifier la section scripts
Get-Content package.json | Select-String -Pattern "scripts"
```

Ajouter dans la section `scripts` :
```json
"preflight": "node tools/preflight/manifest-check.cjs"
```

Tester :
```powershell
pnpm preflight
# Attendu : "Pre-flight check PASSED"
```

---

## Etape 4 — Update CLAUDE.md root

Voir "Fichier 5". Ajouter la section "Avant tout sprint qui touche le manifest".

---

## Etape 5 — REGISTRY + Constitution + CHANGELOG

### 5.1 — REGISTRY

Voir "Fichier 9". Ajouter l'entree CFG-2026-05-12-preflight-rules.

### 5.2 — Constitution

Voir "Fichier 8". Bump v0.5.0 → v0.5.1. Ajouter section TECH-DEBT-011 v3 RESOLU.

### 5.3 — CHANGELOG

Voir "Fichier 7". Ajouter bloc `[0.4.7]`.

### 5.4 — Bump versions (Changesets)

```powershell
pnpm changeset
# Selection : argosTesting + tout package root concerne si applicable
# Type : patch
# Description : "TECH-DEBT-011 v3 - preflight check tools and tests"

pnpm changeset version
# Bump 0.4.6 → 0.4.7
```

---

## Etape 6 — Validation complete

```powershell
# Tests regression - 27 passing attendu
pnpm --filter @atconseil/regression-suite test
# Attendu : 27 passing (26 anciens + 1 nouveau CFG-2026-05-12-preflight-rules)

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.

# Pre-flight script
pnpm preflight
# Attendu : "Pre-flight check PASSED"

# Lint + typecheck + tests apps
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : fichiers preflight presents
Test-Path tools\preflight\marketplace-check.md
Test-Path tools\preflight\microsoft-docs-snippets.md
Test-Path tools\preflight\manifest-check.cjs
# Attendu : True True True

# Self-check : test regression preflight present
Test-Path tools\regression\CFG-2026-05-12-preflight-rules.test.ts
# Attendu : True

# Self-check : script preflight registered in root package.json
Select-String -Path package.json -Pattern '"preflight"'
# Attendu : ligne avec preflight

# Self-check : CLAUDE.md updated
Select-String -Path CLAUDE.md -Pattern "preflight|marketplace-check" -SimpleMatch
# Attendu : presence

# Self-check anti-regression historique
Select-String -Path apps,packages -Recurse -Include *.json,*.md,*.ts,*.tsx -Pattern "\bgpt-4\.1\b" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG|preflight" }
# Attendu : 0 ligne

# Self-check : sprints precedents preserves
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne
```

---

## Etape 7 — Archive prompt + commit

### 7.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-011-v3.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-011-v3.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-011-v3.md
    Write-Host "OK Prompt archive"
}
```

### 7.2 — Allowlister si necessaire

Le prompt contient de nombreuses references a target IDs / iconName / patterns en contexte historique. Verifier que `pnpm --filter @atconseil/regression-suite test` reste a 27 passing. Si fail, ajouter dans allowlist ts/cjs :

```typescript
"tools/claude-prompts/CLAUDE_TASK_tech-debt-011-v3.md",
```

### 7.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "feat(preflight): TECH-DEBT-011 v3 - codify 5 false premises into preventive tools" `
  -m "" `
  -m "After 5 false premises Sprint 2 -> 4.5 (each cost a revert sprint):" `
  -m "1. Publisher inexistant (Sprint 2)" `
  -m "2. Visibility downgrade interdit (Sprint Marketplace privé)" `
  -m "3. Target ms.vss-web.project-hub-group invente (Sprint 3)" `
  -m "4. iconName Fluent UI sous-ensemble inconnu (Sprint 4)" `
  -m "5. Syntaxe icon/asset:// pour hub mal comprise (Sprint 4.4/4.5)" `
  -m "" `
  -m "Codify learnings into hybrid preventive infrastructure:" `
  -m "- tools/preflight/marketplace-check.md (human checklist, 4 sections)" `
  -m "- tools/preflight/manifest-check.cjs (auto script, 7 rules, pnpm preflight)" `
  -m "- tools/preflight/microsoft-docs-snippets.md (anti-simplification snippets)" `
  -m "- tools/regression/CFG-2026-05-12-preflight-rules.test.ts (7 assertions CI)" `
  -m "- CLAUDE.md section pointing to preflight before any manifest sprint" `
  -m "" `
  -m "Tests: 26 -> 27 regression passing." `
  -m "Constitution v0.5.0 -> v0.5.1." `
  -m "Bump 0.4.6 -> 0.4.7 (patch: preventive tooling, no functional change)." `
  -m "" `
  -m "Backlog: TECH-DEBT-011 v3 RESOLVED." `
  -m "" `
  -m "Refs: CHANGELOG [0.3.1] [0.3.2] [0.3.5] [0.4.0-0.4.6] for the 5 false premises history"

git push -u origin feat/preflight-manifest-check
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `feat/preflight-manifest-check` creee depuis main a jour
- [ ] `tools/preflight/marketplace-check.md` cree (4 sections, ASCII)
- [ ] `tools/preflight/microsoft-docs-snippets.md` cree (snippets copy-paste)
- [ ] `tools/preflight/manifest-check.cjs` cree (7 regles, exit-coded)
- [ ] `tools/regression/CFG-2026-05-12-preflight-rules.test.ts` cree (7 assertions, ASCII)
- [ ] Allowlists ts/cjs synchronisees (nouveau test + 3 fichiers preflight)
- [ ] `package.json` root : script `preflight` ajoute
- [ ] `CLAUDE.md` root : section "Avant tout sprint manifest" ajoutee
- [ ] REGISTRY : entree CFG-2026-05-12-preflight-rules ajoutee
- [ ] Constitution v0.5.0 → v0.5.1
- [ ] CHANGELOG.md `[0.4.7]` cree
- [ ] Versions package.json bumpees a 0.4.7
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] Self-check sprints precedents preserves
- [ ] Self-check anti-regression historique
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_tech-debt-011-v3.md`
- [ ] Commit Conventional Commits, PR ouverte

**Pas d'upload Marketplace necessaire** — TECH-DEBT-011 v3 est purement preventif, aucune modification fonctionnelle de l'extension.

---

## Garde-fous TECH-DEBT-011 v3

⚠ **Le risque #1 = scope creep**
- Tentation : "tant qu'on est dans le preflight, ajoutons une regle pour X / Y / Z"
- NON. Sprint cible 7 regles + 4 sections checklist. Pas plus.
- Toute nouvelle regle = nouveau sprint dedie (v0.4.8+)

⚠ **Le risque #2 = preflight trop strict (faux positifs)**
- Si le script `pnpm preflight` echoue sur le manifest actuel (post-Sprint 4.6), c'est qu'une regle est trop stricte
- Reporter a l'utilisateur, ajuster la regle (ex: passer une categorie en warning au lieu d'error)
- Le but est de prevenir, pas de bloquer

⚠ **Le risque #3 = oublier de mettre a jour les snippets Microsoft**
- `microsoft-docs-snippets.md` est une **source vivante**
- Quand un futur sprint decouvre une nouvelle regle/syntaxe Microsoft, l'inscrire dans ce fichier
- Ne pas le laisser pourrir

⚠ **Le risque #4 = test regression qui se decale dans le temps**
- Si Microsoft change la liste des targets valides ou ajoute des contraintes
- Le test peut devenir obsolete OU continuer a passer sur des cas en realite invalides
- Solution : tester `pnpm preflight` aussi lors des publications, ne pas dependre que du test regression

⚠ **Le risque #5 = source non-ASCII dans tools/preflight/**
- Les fichiers .md peuvent contenir des accents franc, ais → mojibake potentiel
- Verifier `node tools/regression/scan-mojibake.cjs` apres creation
- Si mojibake detecte, recreer avec encodage UTF-8 explicite

---

## Si une regle du test echoue sur le manifest actuel

Possible scenarios :

**Scenario A — Manifest a un anti-pattern qu'on n'avait pas detecte**
- STOP, signaler a l'utilisateur
- Decider : corriger le manifest (mini-sprint) OU relaxer la regle (preflight check trop strict)

**Scenario B — Le script preflight a un bug**
- STOP, debugger
- Re-tester sur manifest actuel apres fix

**Scenario C — Une regle est ambigue ou incorrecte**
- Reformuler la regle (le but est prevention, pas blocage stricte)
- Documenter la decision dans CHANGELOG

---

Quand tous les criteres sont valides, dis-le-moi. **TECH-DEBT-011 v3 = transformation des 5 fausses premises en infrastructure preventive durable.** Le prochain sprint manifest sera couvert.
