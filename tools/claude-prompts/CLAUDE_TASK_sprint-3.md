# Prompt Claude Code — Sprint 3 (`feat/top-level-hub-v0.3.0`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-3.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour (TECH-DEBT-005 mergé)
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 17 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

Sprint 3 est un sprint de **positionnement marketing + visibilité produit**. Il livre 4 changements coordonnés sous une seule PR :

1. **Top-level hub** : la contribution `argos-hub` est actuellement placée comme sous-hub de Boards (`ms.vss-work-web.work-hub-group`). Sprint 3 la déplace en hub top-level (`ms.vss-web.project-hub-group`), peer de Boards/Repos/Pipelines. Décision UX explicite : Argos n'est plus une feature Boards, c'est un produit transverse.

2. **Bump v0.2.0 → v0.3.0** : changement structurel d'UX (placement nav) = minor bump semver. Toutes versions package.json alignées via Changesets.

3. **Suppression des références "Xray"** dans 8 fichiers source de documentation. Argos n'est pas un clone de Xray — c'est un produit ADO-natif avec son identité propre. Comparaisons négatives → reformulation positive sur ce qu'Argos fait.

4. **Bannière Marketplace 1280×640** : asset hero pour la Marketplace (cohérent avec icône hub œil-bouclier #0C447C, tagline "AI-Native Test Management for Azure DevOps", 5 pills Test Case · Test Suite · Test Plan · AI Generation · Cloud-only).

**Hors scope Sprint 3** :
- Audit/réduction des `scopes` ADO (`vso.work_full` reste en place — sprint séparé "audit permissions")
- Rename "Test Set" → "Test Suite" dans le code source (TECH-DEBT-007 inscrit au backlog, sprint dédié avec audit sémantique préalable)
- Retrait/modification de la contribution `argos-coverage-panel` (ligne 33-41 du manifest, légitime sur work-item-form)

---

## Architecture des changements

### Modifications manifest `apps/argos-extension/vss-extension.json`

```diff
@@ Manifest racine @@
- "version": "0.2.0",
+ "version": "0.3.0",
- "categories": ["Azure Boards"],
+ "categories": ["Azure Boards", "Azure Test Plans"],
@@ Contribution argos-hub @@
- "targets": ["ms.vss-work-web.work-hub-group"],
+ "targets": ["ms.vss-web.project-hub-group"],
@@ argos-coverage-panel : INCHANGÉ @@
@@ scopes vso.work_full : INCHANGÉ (out of scope) @@
```

⚠ **IMPORTANT** : ne PAS toucher à `vso.work_full` ni à la contribution `argos-coverage-panel`. Si tu es tenté de "nettoyer" autre chose dans le manifest, **STOP** et signale.

### Suppression des références Xray

Audit pré-sprint a confirmé 8 fichiers source contenant "Xray" + 2 fichiers archives prompts à allowlister.

**Workflow par fichier** (D1=c validé) :

**Fichiers documentaires — auto-remplacement avec guidelines** :
- `apps/argos-extension/overview.md`
- `apps/argos-extension/vss-extension.json` (description / tags)
- `CLAUDE.md` (root)
- `README.md`

**Fichiers spec-kit — REPORTING obligatoire** :
- `Specs/CLAUDE.md`
- `Specs/constitution.md`
- `Specs/plan.md`
- `Specs/spec.md`

Pour chaque fichier spec-kit, **avant** de modifier, présenter à l'utilisateur :
1. Liste des occurrences avec contexte (3 lignes avant / 3 lignes après)
2. Remplacement proposé selon guidelines
3. Attendre validation explicite avant str_replace

**Fichiers archives — ALLOWLIST sans modifier** :
- `tools/claude-prompts/CLAUDE_TASK.md`
- `tools/claude-prompts/CLAUDE_TASK_sprint-2.md`

⚠ Modifier des prompts archivés = altération de l'historique méthodologique. Strictement interdit. Allowlist explicite.

### Guidelines de remplacement Xray (D2 validé)

Argos n'est PAS un clone de Xray. Tout remplacement doit refléter ce positionnement.

| Pattern original | Remplacement |
|---|---|
| "Xray-class parity" / "Xray parity" | "industrial-grade test management" / "complete test management capabilities" |
| "like Xray" / "à la Xray" | "comparable to dedicated test management platforms" |
| "Xray (Jira)" / "Xray (the Jira plugin)" | "Jira-side dedicated test plugins" |
| "competing with Xray" | "in the dedicated test management space" |
| "qualité Xray" | "qualité industrielle" |
| Comparatifs négatifs (matrices, tableaux) | Reformulation positive sur ce qu'Argos fait |
| Mentions purement nominales (sans valeur ajoutée) | Suppression / reformulation |

**STOP guideline** : si une mention Xray ne match aucun guideline (ex : nom d'une feature concrète, contexte technique non-marketing), STOP et demander.

### Bannière Marketplace

Fichier livré : `marketplace-banner.png` (1280×640, ~82KB) + `marketplace-banner.svg` (source).

À placer dans : `apps/argos-extension/static/marketplace-banner.png` + `marketplace-banner.svg`.

**Manifest** : pas d'ajout dans `vss-extension.json` (les bannières Marketplace sont configurées côté portail publisher, pas dans le manifest).

### Tests régression Sprint 3 (D4 validé)

3 nouveaux tests dans `tools/regression/` :

1. **`T-0.9-argos-top-level-placement.test.ts`** (UX-decision)
   - Vérifie que `vss-extension.json` contient une contribution avec `targets[]` = `["ms.vss-web.project-hub-group"]`
   - Vérifie qu'**aucune** contribution `argos-hub` ne pointe vers `ms.vss-work-web.work-hub-group`
   - En-tête historique référençant T-0.8 (commit `feat(extension): T-0.8 ADO-compliant manifest...` qui avait placé Argos sous Boards)

2. **`CFG-2026-05-10-top-level-hub.test.ts`**
   - Zero-tolerance : aucune occurrence de `ms.vss-work-web.work-hub-group` dans `vss-extension.json`
   - Vérifie que `version` = `0.3.0` ou supérieure
   - Vérifie que `categories` contient au moins `["Azure Boards", "Azure Test Plans"]`

3. **`CFG-2026-05-10-no-xray-references.test.ts`**
   - Zero-tolerance : scan tous fichiers `.md`/`.ts`/`.tsx`/`.json`/`.yaml`/`.yml` du repo, fail à la moindre occurrence de pattern `/\bxray\b/i`
   - Allowlist explicite :
     - `tools/regression/CFG-2026-05-10-no-xray-references.test.ts` (le test lui-même contient le pattern)
     - `tools/regression/REGISTRY.md` (entry historique)
     - `CHANGELOG.md` (mentionne "removed Xray references")
     - `tools/claude-prompts/CLAUDE_TASK.md` (archive historique)
     - `tools/claude-prompts/CLAUDE_TASK_sprint-2.md` (archive historique)
     - `tools/claude-prompts/CLAUDE_TASK_sprint-3.md` (archive du présent prompt après merge)

⚠ **Allowlist NE doit PAS** être en wildcard `tools/claude-prompts/*` — chaque prompt archivé doit être ajouté explicitement après revue. Sinon un futur prompt avec une vraie référence Xray non documentée passerait silencieusement.

---

## Étape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/top-level-hub-v0.3.0

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 17 passing
```

---

## Étape 1 — Test-first : créer les 3 tests régression (ROUGE attendu)

### 1.1 — Créer `tools/regression/T-0.9-argos-top-level-placement.test.ts`

Source 100% ASCII obligatoire. Pattern modélisé sur `CFG-2026-05-10-publisher-atconseil.test.ts`.

```typescript
/**
 * Regression test: T-0.9-argos-top-level-placement (UX-decision)
 *
 * History:
 *   2026-05-XX (T-0.8) - Argos hub placed under Boards via vss-extension.json
 *                        contribution targeting "ms.vss-work-web.work-hub-group".
 *                        Commit: "feat(extension): T-0.8 ADO-compliant manifest, hub group..."
 *                        Decision later judged suboptimal: Argos is a transverse product,
 *                        not a Boards feature.
 *   2026-05-10 (T-0.9) - Argos hub moved to top-level (peer of Boards/Repos/Pipelines)
 *                        via target "ms.vss-web.project-hub-group". Sprint 3, v0.3.0.
 *
 * What this test guards:
 *   - vss-extension.json must declare an "argos-hub" contribution
 *   - That contribution's targets[] must include "ms.vss-web.project-hub-group"
 *   - That contribution's targets[] must NOT include "ms.vss-work-web.work-hub-group"
 *
 * Rationale: a future "cleanup" or merge conflict resolution must not silently revert
 * Argos to under-Boards placement. This is a UX-decision test.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Specs/spec.md (nav-placement section), Specs/tasks.md T-0.9
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

describe("T-0.9-argos-top-level-placement regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("must declare an argos-hub contribution", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
	});

	it("argos-hub targets must include ms.vss-web.project-hub-group (top-level placement)", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
		expect(argosHub?.targets).toContain("ms.vss-web.project-hub-group");
	});

	it("argos-hub targets must NOT include ms.vss-work-web.work-hub-group (no Boards placement)", () => {
		const argosHub = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(argosHub).toBeDefined();
		expect(argosHub?.targets).not.toContain("ms.vss-work-web.work-hub-group");
	});
});
```

### 1.2 — Créer `tools/regression/CFG-2026-05-10-top-level-hub.test.ts`

```typescript
/**
 * Regression test: CFG-2026-05-10-top-level-hub
 *
 * Locks 3 invariants in vss-extension.json after Sprint 3 (v0.3.0):
 *   1. No contribution targets "ms.vss-work-web.work-hub-group" (zero tolerance)
 *   2. version >= 0.3.0
 *   3. categories includes both "Azure Boards" and "Azure Test Plans"
 *
 * Complementary to T-0.9-argos-top-level-placement (which checks the positive
 * presence of the top-level target). This test enforces zero-tolerance on the
 * absence of the legacy target across ALL contributions, not just argos-hub.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Sprint 3 (v0.3.0), tools/regression/REGISTRY.md
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
	version: string;
	categories: string[];
	contributions: Contribution[];
}

function parseSemver(v: string): [number, number, number] {
	const parts = v.split(".").map((n) => parseInt(n, 10));
	if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
		throw new Error(`Invalid semver: ${v}`);
	}
	return [parts[0], parts[1], parts[2]];
}

function gte(a: string, b: string): boolean {
	const [a1, a2, a3] = parseSemver(a);
	const [b1, b2, b3] = parseSemver(b);
	if (a1 !== b1) return a1 > b1;
	if (a2 !== b2) return a2 > b2;
	return a3 >= b3;
}

describe("CFG-2026-05-10-top-level-hub regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it("no contribution must target ms.vss-work-web.work-hub-group", () => {
		const offenders = manifest.contributions.filter((c) =>
			c.targets?.includes("ms.vss-work-web.work-hub-group"),
		);
		expect(offenders).toEqual([]);
	});

	it("version must be >= 0.3.0", () => {
		expect(gte(manifest.version, "0.3.0")).toBe(true);
	});

	it("categories must include Azure Boards and Azure Test Plans", () => {
		expect(manifest.categories).toContain("Azure Boards");
		expect(manifest.categories).toContain("Azure Test Plans");
	});
});
```

### 1.3 — Créer `tools/regression/CFG-2026-05-10-no-xray-references.test.ts`

```typescript
/**
 * Regression test: CFG-2026-05-10-no-xray-references
 *
 * Sprint 3 (v0.3.0) removed all "Xray" references from documentation files.
 * Argos is positioned as a native Azure DevOps test management product, not a
 * clone or comparison-target. Future PRs must not reintroduce comparative
 * mentions ("Xray-class", "like Xray", "à la Xray", etc.).
 *
 * Scope: all .md/.ts/.tsx/.json/.yaml/.yml files in the repo.
 * Allowlist (explicit, no wildcards): historical archives + this test itself.
 * Pattern: /\bxray\b/i (case-insensitive word boundary).
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference: Sprint 3 (v0.3.0), tools/regression/REGISTRY.md, CHANGELOG.md
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SHARED_DOC_ALLOWLIST } from "./allowlist.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const SCAN_EXTENSIONS = new Set([".md", ".ts", ".tsx", ".json", ".yaml", ".yml"]);
const EXCLUDED_DIRS = new Set([
	"node_modules", ".git", "dist", "build", "coverage",
	".turbo", ".pnpm-store", "_archive",
]);

const XRAY_TEST_SPECIFIC_ALLOWLIST: ReadonlySet<string> = new Set([
	"tools/regression/CFG-2026-05-10-no-xray-references.test.ts",
	"CHANGELOG.md",
	"tools/claude-prompts/CLAUDE_TASK.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-3.md",
]);

const XRAY_PATTERN = /\bxray\b/i;

interface XrayMatch {
	file: string;
	line: number;
	excerpt: string;
}

function* walkFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry)) continue;
			yield* walkFiles(fullPath);
		} else if (stat.isFile()) {
			const ext = entry.slice(entry.lastIndexOf("."));
			if (SCAN_EXTENSIONS.has(ext)) yield fullPath;
		}
	}
}

function isAllowlisted(relPath: string): boolean {
	return SHARED_DOC_ALLOWLIST.has(relPath) || XRAY_TEST_SPECIFIC_ALLOWLIST.has(relPath);
}

function scanFile(absolutePath: string, relPath: string): XrayMatch[] {
	if (isAllowlisted(relPath)) return [];
	const matches: XrayMatch[] = [];
	const content = readFileSync(absolutePath, "utf8");
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (XRAY_PATTERN.test(lines[i])) {
			matches.push({
				file: relPath,
				line: i + 1,
				excerpt: lines[i].trim().slice(0, 120),
			});
		}
	}
	return matches;
}

describe("CFG-2026-05-10-no-xray-references regression", () => {
	it("must not contain any Xray reference outside historical archives", () => {
		const allMatches: XrayMatch[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			allMatches.push(...scanFile(file, relPath));
		}

		if (allMatches.length > 0) {
			const sample = allMatches
				.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} -> ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${allMatches.length} Xray reference(s) outside allowlist (showing first 20):\n${sample}\n\n` +
					"Argos is positioned as a native Azure DevOps test management product, not a Xray clone.\n" +
					"Reformulate per guidelines (CHANGELOG.md Sprint 3) or add the file to allowlist if it is a historical archive.\n" +
					"See tools/regression/REGISTRY.md entry CFG-2026-05-10-no-xray-references for context.",
			);
		}
		expect(allMatches).toHaveLength(0);
	});

	it("sanity check: pattern must detect typical Xray references", () => {
		expect(XRAY_PATTERN.test("Xray-class parity")).toBe(true);
		expect(XRAY_PATTERN.test("like xray")).toBe(true);
		expect(XRAY_PATTERN.test("XRAY in caps")).toBe(true);
		expect(XRAY_PATTERN.test("X-ray with hyphen")).toBe(false); // hyphen not allowed by \b
		expect(XRAY_PATTERN.test("xrayed")).toBe(false); // word boundary
		expect(XRAY_PATTERN.test("plain text")).toBe(false);
	});
});
```

### 1.4 — Lancer les tests : ils DOIVENT échouer

```powershell
pnpm --filter @atconseil/regression-suite test T-0.9
# Attendu : 1 fail (targets actuel = work-hub-group)

pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : 3 fails (target legacy + version 0.2.0 + categories incomplete)

pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 1 fail (8 fichiers source contiennent Xray)
```

Confirme à l'utilisateur que tu vois les fails attendus avant l'étape 2.

---

## Étape 2 — Modifier `vss-extension.json`

3 modifications chirurgicales :

```diff
@@ Manifest racine @@
- "version": "0.2.0",
+ "version": "0.3.0",

- "categories": ["Azure Boards"],
+ "categories": ["Azure Boards", "Azure Test Plans"],
```

```diff
@@ Contribution argos-hub (ligne 24) @@
- "targets": ["ms.vss-work-web.work-hub-group"],
+ "targets": ["ms.vss-web.project-hub-group"],
```

⚠ **Garde-fou** : avant de modifier, ouvrir le fichier complet et vérifier qu'il n'y a **aucune autre** contribution avec `targets[]` contenant `work-hub-group` ou `work-item-form-page` mal placée. Si tu trouves quelque chose d'inattendu (ex : 3 contributions au lieu de 2, ou des targets qui ne sont ni `argos-hub` ni `argos-coverage-panel`), **STOP** et signale.

### Validation après modif

```powershell
pnpm --filter @atconseil/regression-suite test T-0.9
# Attendu : 3 passing

pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : 3 passing
```

Si l'un fail, c'est qu'une modif est mauvaise. STOP, ne pas continuer sur l'étape 3.

---

## Étape 3 — Bump versions package.json (Changesets)

Toutes les versions doivent passer 0.2.0 → 0.3.0. Utiliser Changesets pour la cohérence (cf. CLAUDE.md).

```powershell
pnpm changeset
# Choisir tous les packages affectés (apps/argos-extension principalement, + tout package.json racine)
# Type : minor
# Description : "Top-level hub placement, Marketplace v0.3.0 positioning"

pnpm changeset version
# Applique le bump à tous les package.json
```

### Validation

```powershell
# Vérifier que apps/argos-extension/package.json est bien à 0.3.0
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
# Attendu : "version": "0.3.0"

# Vérifier que vss-extension.json est aussi à 0.3.0 (déjà modifié étape 2, mais re-vérif)
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.3.0"

# Synchronisation manifest <-> package.json (régression CFG existante doit passer)
pnpm --filter @atconseil/regression-suite test
# Attendu : tous les CFG passing
```

---

## Étape 4 — Suppression des références Xray (D1=c)

### 4.1 — Audit : confirmer la liste exacte des occurrences

```powershell
Get-ChildItem -Recurse -Include *.md,*.ts,*.tsx,*.json,*.yaml,*.yml `
  -Exclude node_modules,dist,build,coverage,.turbo,.pnpm-store `
  | Select-String -Pattern "(?i)xray" `
  | Select-Object Path, LineNumber, Line `
  | Where-Object { $_.Path -notmatch "node_modules" }
```

Attendu : 8 fichiers source (overview, vss-extension.json, Specs/CLAUDE.md, constitution, plan, spec, CLAUDE.md root, README) + 2 prompts archivés.

### 4.2 — Fichiers documentaires : auto-remplacement

Pour chacun des 4 fichiers ci-dessous, lire le contenu, identifier les occurrences Xray, appliquer les guidelines (cf. section "Guidelines de remplacement" plus haut), et faire les `str_replace` :

- `apps/argos-extension/overview.md`
- `apps/argos-extension/vss-extension.json` (champs description / tags si applicable)
- `CLAUDE.md` (root)
- `README.md`

⚠ Pour `vss-extension.json` : si Xray est dans le champ `description` ou `tags`, remplacer ; ne PAS toucher aux autres champs (ils ont déjà été validés étape 2 et 3).

### 4.3 — Fichiers spec-kit : REPORTING obligatoire avant modification

Pour chacun des 4 fichiers spec-kit ci-dessous :

- `Specs/CLAUDE.md`
- `Specs/constitution.md`
- `Specs/plan.md`
- `Specs/spec.md`

**Workflow strict** :

1. Lire le fichier intégralement
2. Identifier toutes les occurrences `/xray/i`
3. Pour chaque occurrence, **présenter à l'utilisateur** :
   - Fichier + ligne
   - Contexte : 3 lignes avant + ligne match + 3 lignes après
   - Remplacement proposé (selon guidelines)
4. **Attendre validation explicite** ("OK pour fichier X" ou "modif Y au lieu de Z")
5. Une fois validé, appliquer les `str_replace`

⚠ **Ne PAS appliquer en bloc**. Chaque fichier spec-kit reçoit une revue humaine. C'est lent mais nécessaire : ces fichiers sont la source de vérité méthodologique du projet.

### 4.4 — Fichiers archives : ALLOWLIST sans modifier

```powershell
# Vérifier que les 2 prompts existent toujours
Test-Path tools\claude-prompts\CLAUDE_TASK.md
Test-Path tools\claude-prompts\CLAUDE_TASK_sprint-2.md
# Attendu : True True
```

Ces fichiers seront ajoutés à `XRAY_TEST_SPECIFIC_ALLOWLIST` du test ENC (déjà inclus dans le code de l'étape 1.3).

### 4.5 — Validation

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 2 passing
```

Si fail, le message d'erreur listera les fichiers restants. Itérer jusqu'à 0.

---

## Étape 5 — Bannière Marketplace

### 5.1 — Récupérer les fichiers livrés

L'utilisateur a téléchargé `marketplace-banner.png` (1280×640, ~82KB) et `marketplace-banner.svg` depuis le tchat. Les déplacer dans le repo :

```powershell
$found_png = @(".\marketplace-banner.png", "$HOME\Downloads\marketplace-banner.png") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found_png) {
    Move-Item -Force $found_png apps\argos-extension\static\marketplace-banner.png
    Write-Host "OK Banner PNG moved to static/"
} else {
    Write-Host "STOP: marketplace-banner.png not found"
}

$found_svg = @(".\marketplace-banner.svg", "$HOME\Downloads\marketplace-banner.svg") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found_svg) {
    Move-Item -Force $found_svg apps\argos-extension\static\marketplace-banner.svg
    Write-Host "OK Banner SVG moved to static/"
} else {
    Write-Host "STOP: marketplace-banner.svg not found"
}
```

Si l'un n'est pas trouvé → STOP et demander à l'utilisateur de re-télécharger depuis le chat.

### 5.2 — Validation taille + format

```powershell
$png = "apps\argos-extension\static\marketplace-banner.png"
if (Test-Path $png) {
    $size = (Get-Item $png).Length
    Write-Host "PNG size: $size bytes (expected ~82KB = 80000-90000)"
}
```

⚠ **Pas d'inclusion dans le manifest** `vss-extension.json` — les bannières Marketplace sont configurées côté portail publisher Microsoft, pas dans le manifest. Ne PAS ajouter de référence à la bannière dans le manifest.

---

## Étape 6 — Adapter spec-kit + CHANGELOG + README

### 6.1 — `Specs/constitution.md`

Bumper la version de la constitution (tracking interne, indépendant de la version produit) :

```diff
- v0.3.0 (Sprint 2)
+ v0.4.0 (Sprint 3)
```

Ajouter une nouvelle section dans le journal des décisions :

```markdown
## Sprint 3 (v0.3.0) — Top-level hub + positioning
- 2026-05-10 : Argos hub déplacé de sous-Boards (T-0.8) vers top-level (T-0.9). Targets manifest : `ms.vss-work-web.work-hub-group` -> `ms.vss-web.project-hub-group`. Décision UX : Argos est un produit transverse, pas une feature Boards.
- 2026-05-10 : Bump v0.2.0 -> v0.3.0 (minor, changement structurel UX).
- 2026-05-10 : Suppression des références "Xray" dans la documentation. Argos est positionné comme un produit ADO-natif avec son identité propre, pas un clone comparatif.
- 2026-05-10 : Categories Marketplace etendues : ["Azure Boards", "Azure Test Plans"].
```

### 6.2 — `Specs/tasks.md`

Ajouter une phase Sprint 3 :

```markdown
## Phase Sprint 3 — Top-level hub (v0.3.0)

### T-0.9 : Argos top-level placement
- [x] Modifier vss-extension.json : targets argos-hub -> ms.vss-web.project-hub-group
- [x] Bump version 0.2.0 -> 0.3.0
- [x] Categories : ajouter "Azure Test Plans"
- [x] Test régression T-0.9-argos-top-level-placement (UX-decision)
- [x] Test régression CFG-2026-05-10-top-level-hub (config locked)
- [x] Bannière Marketplace 1280x640 livrée dans static/

### T-0.10 : Positioning sans Xray
- [x] Audit : 8 fichiers source contenant "Xray" identifiés
- [x] Suppression / reformulation selon guidelines (cf. CHANGELOG)
- [x] Test régression CFG-2026-05-10-no-xray-references (zero-tolerance)
- [x] Allowlist : 2 prompts archivés (historiques)

### Out of scope Sprint 3 (backlog)
- TECH-DEBT-007 : rename "Test Set" -> "Test Suite" (audit sémantique préalable requis)
- Audit/réduction des scopes ADO (vso.work_full)
```

### 6.3 — `CHANGELOG.md`

Sortir le contenu `[Unreleased]` accumulé depuis Sprint 2.5a + TECH-DEBT-005 et créer la section `[0.3.0]` :

```markdown
## [0.3.0] - 2026-05-10

### Added (Sprint 3)
- **Top-level hub placement** : Argos est désormais un hub top-level dans Azure DevOps, peer de Boards/Repos/Pipelines. Manifest `vss-extension.json` modifié : la contribution `argos-hub` cible `ms.vss-web.project-hub-group` au lieu de `ms.vss-work-web.work-hub-group`.
- **Categories Marketplace** : ajout de "Azure Test Plans" en plus de "Azure Boards" pour refléter le positionnement transverse.
- **Bannière Marketplace 1280x640** : asset hero livré dans `apps/argos-extension/static/marketplace-banner.png` (et `.svg`). Design : œil-bouclier #0C447C, tagline "AI-Native Test Management for Azure DevOps".
- **3 nouveaux tests régression** :
  - `T-0.9-argos-top-level-placement` (UX-decision) : vérifie le placement top-level
  - `CFG-2026-05-10-top-level-hub` : zero-tolerance sur target legacy + version >= 0.3.0 + categories
  - `CFG-2026-05-10-no-xray-references` : zero-tolerance sur mentions Xray hors archives historiques

### Changed (Sprint 3)
- **Bump v0.2.0 -> v0.3.0** : changement structurel d'UX (placement nav) = minor bump.
- **Positioning sans Xray** : suppression des références "Xray" dans 8 fichiers source de documentation (overview, vss-extension.json, Specs/CLAUDE.md, constitution.md, plan.md, spec.md, CLAUDE.md root, README.md). Argos est positionné comme un produit ADO-natif avec son identité propre. Reformulations selon guidelines :
  - "Xray-class parity" -> "industrial-grade test management"
  - "like Xray" -> "comparable to dedicated test management platforms"
  - Comparatifs négatifs -> reformulation positive
  - 2 prompts archivés (`tools/claude-prompts/CLAUDE_TASK.md`, `CLAUDE_TASK_sprint-2.md`) allowlistés (archives historiques, non modifiés)
- **Constitution v0.3.0 -> v0.4.0** (changement structurel UX).

### Backlog (post-Sprint 3)
- **TECH-DEBT-007** : rename "Test Set" -> "Test Suite" dans le code source (transverse SDK + apps + tests + docs). Audit sémantique préalable requis (concept Argos vs Test Suite ADO native). Sprint dédié, ~3-4h.
- Sprint 2.5b : finir le wiring (Run/Coverage/Reports/Settings non-LLM).
- WIRING-CLOUD-PLUS : implémenter `IFlakinessReportService` et autres services backend.
- Audit/réduction des scopes ADO (`vso.work_full`).

### Lessons learned (Sprint 3)
- Les references comparatives (style "Xray-class") ancrent le produit comme un clone. Pour un produit qui a sa propre proposition de valeur, mieux vaut nommer ce qu'on FAIT que ce qu'on imite.
- T-0.8 (Sprint 2 ou avant) avait placé Argos sous Boards par confusion sur le manifest contribution target. Sans test régression UX-decision T-0.9, un futur merge conflict ou refacto aurait pu silencieusement re-régresser. Convention "T-X.Y pour décisions UX traçables" validée.
```

### 6.4 — `README.md`

Mise à jour cohérente avec le positionnement v0.3.0 :
- Mention top-level hub
- Mention "AI-Native Test Management for Azure DevOps"
- Suppression Xray (cf. étape 4.2)
- Mention v0.3.0 dans la section "Status" si elle existe

### 6.5 — `apps/argos-extension/overview.md`

Mise à jour cohérente (sortie Marketplace) :
- Suppression Xray (cf. étape 4.2)
- Mention top-level placement
- Section "What's new in v0.3.0" si pertinent

---

## Étape 7 — Allowlists + REGISTRY

### 7.1 — `tools/regression/allowlist.ts` ET `tools/regression/allowlist.cjs`

Ajouter dans `SHARED_DOC_ALLOWLIST` (les 2 fichiers, identique) :

```typescript
"tools/regression/T-0.9-argos-top-level-placement.test.ts",
"tools/regression/CFG-2026-05-10-top-level-hub.test.ts",
"tools/regression/CFG-2026-05-10-no-xray-references.test.ts",
```

⚠ **Crucial** : ne PAS ajouter à `XRAY_TEST_SPECIFIC_ALLOWLIST` du test no-xray (qui est local au test). Les 3 nouveaux tests vont dans le shared allowlist.

### 7.2 — `tools/regression/REGISTRY.md`

3 nouvelles entrées sous "Tests actifs" :

```markdown
| T-0.9 | 2026-05-10 | UX-decision | argos-top-level-placement | Argos hub doit pointer vers ms.vss-web.project-hub-group, pas ms.vss-work-web.work-hub-group. Sprint 3 a corrigé un placement Sprint 2 (T-0.8) qui mettait Argos sous Boards. | spec.md, tasks.md T-0.9 | AT |
| CFG-2026-05-10-top-level-hub | 2026-05-10 | Configuration | top-level-hub | Zero-tolerance sur ms.vss-work-web.work-hub-group dans tout le manifest + version >= 0.3.0 + categories ["Azure Boards", "Azure Test Plans"]. | Sprint 3 (v0.3.0) | AT |
| CFG-2026-05-10-no-xray-references | 2026-05-10 | Positioning | no-xray-references | Zero-tolerance sur mentions Xray hors archives historiques. Argos est un produit ADO-natif, pas un clone. | Sprint 3 (v0.3.0), CHANGELOG | AT |
```

### 7.3 — Cross-check ts/cjs allowlist toujours OK

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing (allowlist.test.ts cross-check)
```

---

## Étape 8 — Validation complète

```powershell
# Tous tests régression
pnpm --filter @atconseil/regression-suite test
# Attendu : 17 + 3 + 2 = 22 passing total
# Detail : 12 anciens + 5 cp1252-mojibake-map cross-check (TECH-DEBT-005)
#         + 3 T-0.9 + 3 CFG-top-level-hub + 2 CFG-no-xray-references = +8 nouveaux
# Soit 17 + 8 = 25 passing total

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check anti-regression : 0 occurrence des terms interdits historiques
Select-String -Path apps,packages,Specs,tools -Recurse -Include *.md,*.ts,*.tsx,*.json `
  -Pattern "\bgpt-4\.1\b" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne (gpt-4.1 zero hors archives)

Select-String -Path apps,packages,Specs,tools -Recurse -Include *.md,*.ts,*.tsx,*.json `
  -Pattern "Microsoft\.TeamFoundation\.Server" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne (Server 2022 zero hors archives)

Select-String -Path apps,packages,Specs,tools -Recurse -Include *.md,*.ts,*.tsx,*.json `
  -Pattern "AlexThibaud(?!1976)" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne (AlexThibaud comme publisher legacy zero hors archives ; le username GitHub AlexThibaud1976 est tolere)

# Sanity : version cohérente partout
Select-String -Path apps,packages -Recurse -Include package.json,vss-extension.json `
  -Pattern '"version"' | Select-Object -First 10
# Attendu : toutes les versions à 0.3.0 (sauf packages internes hors-périmètre s'il y en a)
```

---

## Étape 9 — Archive du prompt + commit

### 9.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-3.md", "$HOME\Downloads\CLAUDE_TASK_sprint-3.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-3.md
    Write-Host "OK Prompt archive"
}
```

### 9.2 — Vérifier que l'allowlist no-xray contient bien sprint-3.md

Le prompt présent (CLAUDE_TASK_sprint-3.md) contient le mot "Xray" plusieurs fois (guidelines, contexte). Il DOIT être dans `XRAY_TEST_SPECIFIC_ALLOWLIST` du test no-xray (déjà inclus dans le code de l'étape 1.3 — vérifier que c'est bien là).

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 2 passing (le prompt archivé est correctement allowlisté)
```

### 9.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "feat(extension): top-level hub placement + Marketplace v0.3.0 positioning" `
  -m "" `
  -m "Sprint 3 deliverables:" `
  -m "- Manifest: argos-hub targets ms.vss-web.project-hub-group (top-level, peer of Boards)" `
  -m "- Bump v0.2.0 -> v0.3.0 (minor, structural UX change)" `
  -m "- Categories: [Azure Boards, Azure Test Plans]" `
  -m "- Removed Xray references in 8 source files (Argos as native ADO product)" `
  -m "- Marketplace banner 1280x640 in apps/argos-extension/static/" `
  -m "- 3 new regression tests: T-0.9 + CFG-top-level-hub + CFG-no-xray-references" `
  -m "- 22 -> 25 regression tests passing" `
  -m "" `
  -m "Out of scope (backlog):" `
  -m "- TECH-DEBT-007: rename Test Set -> Test Suite (semantic audit required first)" `
  -m "- Sprint 2.5b: wire Run/Coverage/Reports/Settings non-LLM" `
  -m "- ADO scopes audit (vso.work_full)" `
  -m "" `
  -m "Refs: T-0.9, T-0.10, post-TECH-DEBT-005 audit"

git push -u origin feat/top-level-hub-v0.3.0
```

Puis ouvrir la PR.

---

## Critères de done

- [ ] Branche `feat/top-level-hub-v0.3.0` créée depuis main à jour
- [ ] Manifest `vss-extension.json` modifié : targets argos-hub + version 0.3.0 + categories
- [ ] **Aucune autre** modification du manifest (vso.work_full intact, argos-coverage-panel intact)
- [ ] Toutes les versions package.json bumpées à 0.3.0 via Changesets
- [ ] 8 fichiers source dexrayed (4 auto + 4 spec-kit avec validation humaine)
- [ ] 2 prompts archivés intacts (allowlistés, pas modifiés)
- [ ] Bannière `marketplace-banner.png` (~82KB) + `.svg` placés dans `apps/argos-extension/static/`
- [ ] 3 nouveaux tests régression créés, allowlistes ts/cjs synchronisées
- [ ] REGISTRY.md mis à jour avec 3 nouvelles entrées
- [ ] CHANGELOG.md `[0.3.0]` créé (sortie de `[Unreleased]`)
- [ ] Constitution v0.4.0
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 25 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` -> tous verts
- [ ] Self-check anti-régression : 0 mojibake, 0 gpt-4.1, 0 Server 2022, 0 AlexThibaud (hors archives)
- [ ] Prompt archivé dans `tools/claude-prompts/CLAUDE_TASK_sprint-3.md`
- [ ] Commit Conventional Commits, PR ouverte

---

## Garde-fous Sprint 3

⚠ **Le risque #1 = scope creep**. Tentations à STOP immédiatement :
- "Tant qu'on est dans le manifest, je vais aussi auditer les scopes" -> NON, sprint séparé
- "Tant qu'on touche les docs, je vais reformuler aussi le pricing" -> NON, hors scope
- "Tant qu'on bump, je vais migrer une dep" -> NON, sprint dédié
- "Tant qu'on dexraye, je vais renommer Test Set -> Test Suite" -> NON, TECH-DEBT-007 séparé

⚠ **Le risque #2 = casser une régression historique**. Vérifier au self-check (étape 8) que :
- gpt-4.1 (Sprint 1) n'est pas réintroduit
- Microsoft.TeamFoundation.Server (Sprint 2) n'est pas réintroduit
- AlexThibaud (Sprint 2) n'est pas réintroduit comme publisher
- Mojibake (Sprint 1.1, TECH-DEBT-005) n'est pas réintroduit

⚠ **Le risque #3 = encoding lors des modifs spec-kit**. Toutes les modifs spec.md / constitution.md / etc. doivent être faites via str_replace UTF-8 strict, JAMAIS via Set-Content PS sans flag (cf. CLAUDE.md "Encoding rules"). Si un fail ENC apparaît après une modif, recommencer avec `[IO.File]::WriteAllText($p, $c, [Text.UTF8Encoding]::new($false))` ou via str_replace.

⚠ **Reporting spec-kit (étape 4.3)** : ne pas zapper le reporting humain pour gagner du temps. Les fichiers spec-kit sont la source de vérité méthodologique. Si l'utilisateur ne répond pas, **STOP** au lieu d'auto-modifier.

⚠ **Bannière** : si les fichiers `marketplace-banner.png` / `.svg` ne sont pas trouvés au moment du déplacement (étape 5.1), STOP et demander à l'utilisateur de les re-télécharger depuis le chat. Ne PAS générer une autre bannière de remplacement.

---

Quand tous les critères de done sont cochés, dis-le-moi. On enchaînera sur Sprint 2.5b ou TECH-DEBT-007 selon ta préférence.
