# Prompt Claude Code — Sprint 2 (`feat/cloud-only-v0.2.0`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-2.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis méthodologiques (CHECKLIST AVANT DE COMMENCER)

Avant le moindre changement, vérifier :

- [ ] `git status` propre (pas de modifs en cours)
- [ ] `git checkout main && git pull` — branche `main` à jour
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 4 passing (2 LLM + 2 ENC). Si fail → STOP, base instable
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. Si fail → STOP
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts. Sinon → STOP

Si l'un de ces checks échoue, **NE PAS COMMENCER** Sprint 2. Sprint 1.1 doit être complètement digéré sur main avant.

---

## Contexte

L'audit du 2026-05-09 a identifié plusieurs incohérences structurelles dans le repo qui s'accumulent depuis le début :

1. **Server 2022 déclaré sans test** : `vss-extension.json` cible `Microsoft.TeamFoundation.Server` mais aucun environnement on-prem n'est testé (violation constitution §10 TDD)
2. **Publisher incorrect** : manifest declare `AlexThibaud` au lieu de la valeur attendue par la constitution `ATConseil`
3. **Versions désynchronisées** : root `0.0.0` / extension `0.0.1` / manifest `0.1.1` / CHANGELOG mention fictive `[1.0.0]`
4. **CHANGELOG chronologie cassée** : entrée `[1.0.0] 2026-05-08` placée avant `[0.1.1] 2026-05-09`
5. **`tasks.md` non-aligné réalité** : checkboxes Phase 0-7 cochées mais composants UI riches (40+) écrits sans wiring dans `App.tsx` qui n'affiche que des stubs
6. **README casing** : `readme.md` lowercase, Marketplace attend `README.md`
7. **Hub `argos-hub` sans icône** : contribution déclarée sans `properties.iconUrl`, fallback par défaut visuel pauvre
8. **Pas de bannière Marketplace** : page de l'extension a un rendu pauvre par défaut

**Décision utilisateur (2026-05-10)** : Server 2022 sortie du scope (option A — pas d'environnement on-prem disponible pour respecter §10 TDD). Bump cohérent vers v0.2.0 avec icône Argos finale (option B — œil-bouclier).

**Périmètre Sprint 2** : refonte structurelle de la spec-kit + manifest + tooling pour passer Cloud-only proprement, en respectant strictement la convention TDD du repo. Aucune modif de code applicatif (le code est déjà BYOM/Cloud — c'était la doc et le manifest qui étaient incohérents).

---

## Objectif

Sur une nouvelle branche `feat/cloud-only-v0.2.0`, livrer une PR qui :

1. **Constitution v0.2.4 → v0.3.0** (bump major spec-kit) : retire toutes mentions Server 2022
2. **Manifest v0.1.1 → v0.2.0** : retire `Microsoft.TeamFoundation.Server`, fix publisher `ATConseil`, ajoute `properties.iconUrl` au hub
3. **Versions alignées** : root `0.0.0` / extension `0.0.1` / manifest `0.1.1` → tous à `0.2.0` via Changesets
4. **README** : casing fix `readme.md` → `README.md` + section Cloud-only explicite + suppression mentions Server
5. **`apps/argos-extension/overview.md`** : description Marketplace cohérente
6. **CLAUDE.md racine** : retire Server 2022 du "What this project is"
7. **`tasks.md` resync** : décocher tout sauf Phase 0, ajouter phase "Dette d'intégration" pour wiring `App.tsx` ↔ composants riches existants
8. **CHANGELOG** : entrée `[0.2.0] — 2026-05-10` propre + chronologie réparée
9. **Icônes Argos** : hub SVG (currentColor) + Marketplace PNG 128×128
10. **2 tests régression nommés** : `CFG-2026-05-10-server2022-out-of-scope.test.ts` et `CFG-2026-05-10-publisher-atconseil.test.ts` (source 100% ASCII, biome-clean dès le départ)

---

## Étape 0 — Création de branche + récupération des assets

### 0.1 — Branche

```powershell
git checkout main
git pull
git checkout -b feat/cloud-only-v0.2.0
```

### 0.2 — Assets icônes à placer

L'utilisateur a téléchargé 3 fichiers depuis Claude.ai :
- `argos-hub.svg` — icône hub ADO (currentColor pour theme awareness)
- `marketplace-icon.svg` — version source SVG colorée
- `marketplace-icon.png` — export 128×128 pour le manifest

À placer aux emplacements suivants (créer le dossier `static/` si absent) :

```powershell
# Vérifier que le dossier static existe
New-Item -ItemType Directory -Force apps\argos-extension\static | Out-Null

# Déplacer les 3 fichiers depuis ~\Downloads\ (ou autre emplacement où l'utilisateur les a téléchargés)
$candidates = @("$HOME\Downloads", "$HOME\Desktop", ".")
foreach ($name in @('argos-hub.svg', 'marketplace-icon.svg', 'marketplace-icon.png')) {
    $found = $candidates | ForEach-Object { Join-Path $_ $name } | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) {
        Move-Item -Force $found "apps\argos-extension\static\$name"
        Write-Host "OK $name placé dans apps\argos-extension\static\"
    } else {
        Write-Host "MANQUE $name — l'utilisateur doit le placer manuellement"
    }
}

# Vérifier
Get-ChildItem apps\argos-extension\static\
```

Si l'un des 3 fichiers manque → STOP, signaler à l'utilisateur quel fichier télécharger.

### 0.3 — Vérification non-régression baseline

```powershell
# Verifier que le repo est sain avant de commencer
pnpm install
node tools\regression\scan-mojibake.cjs
pnpm --filter @atconseil/regression-suite test
```

Tous doivent être verts (4/4 + 0 mojibake). Sinon STOP.

---

## Étape 1 — Test-first : créer les 2 tests régression CFG-* (ROUGE attendu)

Avant toute modif, écrire les tests qui détectent les violations qu'on va corriger. Ils **doivent** échouer maintenant.

### Convention de source

⚠ **TOUS les fichiers `tools/regression/*` doivent être source 100% ASCII** (cf. `CLAUDE.md` racine, section "Encoding rules").

Référence d'exemple : `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` (déjà mergé, biome-clean, ASCII pur).

### 1.1 — Créer `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`

```typescript
/**
 * Test régression : CFG-2026-05-10-server2022-out-of-scope
 *
 * Contexte
 * --------
 * Décision utilisateur 2026-05-10 (Sprint 2) : Server 2022 sort du scope du produit.
 * Justification : aucun environnement on-prem disponible pour respecter constitution §10
 * (test E2E obligatoire avant déclaration de support). Le projet devient Cloud-only.
 *
 * Ce test garde contre toute réintroduction silencieuse de Server 2022 dans la
 * spec-kit, la doc, ou le manifest de l'extension.
 *
 * Périmètre : tous les fichiers sources et de spec hors archive. La mention dans
 * CHANGELOG.md (récit historique de la décision) et dans les prompts archivés
 * `tools/claude-prompts/` est légitime → allowlistée.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const SCAN_EXTENSIONS = new Set([
	".md", ".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs",
	".json", ".yaml", ".yml", ".txt",
]);

const EXCLUDED_DIRS = new Set([
	"node_modules", ".git", "dist", "build", "out", "coverage",
	".turbo", ".pnpm-store", ".next", ".nuxt", "_archive",
]);

const ALLOWED_FILES = new Set([
	"CHANGELOG.md",
	"tools/regression/REGISTRY.md",
	"tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-1.1.md",
	"tools/claude-prompts/CLAUDE_TASK_sprint-2.md",
	"tools/claude-prompts/README.md",
]);

const FORBIDDEN_PATTERNS: RegExp[] = [
	/Microsoft\.TeamFoundation\.Server/,
	/\bServer\s*20(?:1[5-9]|2[0-5])\b/,
	/\bAzure\s*DevOps\s*Server\b/,
	/\bon[-\s]prem(?:ise|ises)?\b/i,
];

interface Match {
	file: string;
	line: number;
	pattern: string;
	excerpt: string;
}

function* walkFiles(dir: string): Generator<string> {
	let entries: import("node:fs").Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue;
			yield* walkFiles(full);
		} else if (entry.isFile()) {
			const ext = entry.name.includes(".")
				? entry.name.slice(entry.name.lastIndexOf("."))
				: "";
			if (SCAN_EXTENSIONS.has(ext)) yield full;
		}
	}
}

function scanFile(absolutePath: string, relPath: string): Match[] {
	if (ALLOWED_FILES.has(relPath)) return [];
	let content: string;
	try {
		content = readFileSync(absolutePath, "utf8");
	} catch {
		return [];
	}
	const matches: Match[] = [];
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		for (const pattern of FORBIDDEN_PATTERNS) {
			if (pattern.test(line)) {
				matches.push({
					file: relPath,
					line: i + 1,
					pattern: pattern.source,
					excerpt: line.trim().slice(0, 120),
				});
				break;
			}
		}
	}
	return matches;
}

describe("CFG-2026-05-10 server-2022-out-of-scope guard", () => {
	it("must not contain any Server 2022 / on-prem reference outside allowlist", () => {
		const all: Match[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			all.push(...scanFile(file, relPath));
		}
		if (all.length > 0) {
			const sample = all
				.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} [${m.pattern}] => ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${all.length} forbidden Server-2022 / on-prem reference(s):\n${sample}\n\nDecision 2026-05-10 (Sprint 2): TestVault is Cloud-only.\nSee tools/regression/REGISTRY.md entry CFG-2026-05-10-server2022.`,
			);
		}
		expect(all).toHaveLength(0);
	});

	it("must verify the test patterns can detect typical Server-2022 mentions", () => {
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Microsoft.TeamFoundation.Server"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Azure DevOps Server 2022"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("on-premise deployment"))).toBe(true);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("on prem"))).toBe(true);

		// Sanity inverse
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("Azure DevOps Cloud"))).toBe(false);
		expect(FORBIDDEN_PATTERNS.some((p) => p.test("dev.azure.com"))).toBe(false);
	});
});
```

### 1.2 — Créer `tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts`

```typescript
/**
 * Test régression : CFG-2026-05-10-publisher-atconseil
 *
 * Contexte
 * --------
 * La constitution §X exige que le publisher Marketplace de l'extension Argos soit
 * "ATConseil" (le compte Marketplace officiel d'Alexandre Thibaud / atconseil.info).
 * Le manifest initial contenait "AlexThibaud" — incohérent et corrigé Sprint 2.
 *
 * Ce test garantit qu'aucune régression silencieuse ne réintroduit l'ancien publisher.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const EXPECTED_PUBLISHER = "ATConseil";

interface Manifest {
	publisher?: string;
	[k: string]: unknown;
}

describe("CFG-2026-05-10 publisher-atconseil guard", () => {
	it("vss-extension.json publisher must be ATConseil", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.publisher).toBe(EXPECTED_PUBLISHER);
	});

	it("must reject the legacy publisher name AlexThibaud anywhere in manifest", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		expect(raw).not.toMatch(/"publisher"\s*:\s*"AlexThibaud"/);
	});
});
```

### 1.3 — Lancer les tests : ils DOIVENT échouer

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10
```

**Attendu** : 2 tests fail (un pour Server 2022, un pour publisher), 2 sanity checks pass.

Confirme à l'utilisateur que tu vois les fails attendus avant de continuer à l'étape 2.

### 1.4 — Vérifier biome AVANT d'aller plus loin

```powershell
npx biome check tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts
```

Si erreurs biome : `npx biome check --write` puis re-vérifier. Les nouveaux tests **doivent** être biome-clean pour passer le pre-commit hook (cf. leçons Sprint 1.1).

### 1.5 — Mettre à jour les allowlists des tests existants

Les nouveaux tests CFG-* sont des nouveaux fichiers à allowlister dans :
- `tools/regression/scan-mojibake.cjs` → ajouter dans `ALLOWED`
- `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` → ajouter dans `ALLOWED_FILES`

Les CFG-tests ne contiennent pas de mojibake (source ASCII pur), donc ces ajouts sont préventifs (un futur fix d'edge case pourrait nécessiter d'allowlister, autant être proactif). Ajouter aussi `tools/claude-prompts/CLAUDE_TASK_sprint-2.md` (qui sera créé en fin de sprint via archive).

⚠ **TECH-DEBT-001 noté** : à terme, ces 3 allowlists doivent être factorisées en `tools/regression/allowlist.ts`. Pas dans le scope Sprint 2, mais à backlog.

---

## Étape 2 — Manifest `vss-extension.json`

### 2.1 — Localiser le manifest

```powershell
Get-Content apps\argos-extension\vss-extension.json | Select-Object -First 30
```

### 2.2 — Modifications

Trois changements à faire dans `apps/argos-extension/vss-extension.json` :

**A. Publisher** : `"AlexThibaud"` → `"ATConseil"`

**B. Targets** : retirer l'élément qui contient `Microsoft.TeamFoundation.Server`. Garder uniquement `Microsoft.VisualStudio.Services.Cloud` (ou équivalent Cloud).

```diff
  "targets": [
    {
      "id": "Microsoft.VisualStudio.Services.Cloud"
-   },
-   {
-     "id": "Microsoft.TeamFoundation.Server"
    }
  ]
```

**C. Version** : `"0.1.1"` → `"0.2.0"`

**D. Hub icon** : ajouter `properties.iconUrl` au hub `argos-hub` :

```diff
  {
    "id": "argos-hub",
    "type": "ms.vss-web.hub",
    "properties": {
      "name": "Argos",
+     "iconUrl": "static/argos-hub.svg",
      ...
    }
  }
```

**E. Icons** (manifest-level, si pas déjà présent) :

```diff
+ "icons": {
+   "default": "static/marketplace-icon.png"
+ }
```

### 2.3 — Validation manifest

```powershell
# Vérifier que le JSON parse
node -e "console.log(JSON.parse(require('fs').readFileSync('apps/argos-extension/vss-extension.json', 'utf8')).publisher)"
# Attendu : ATConseil

# Vérifier que les fichiers icônes référencés existent
Test-Path apps\argos-extension\static\argos-hub.svg
Test-Path apps\argos-extension\static\marketplace-icon.png
# Attendu : True, True

# Re-tester
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10
# Attendu : le test publisher-atconseil passe maintenant ; le test server2022 fail toujours (autres fichiers à corriger)
```

---

## Étape 3 — Constitution v0.2.4 → v0.3.0

### 3.1 — Localiser les sections concernées

```powershell
Select-String -Path Specs\constitution.md -Pattern "Server 2022|on-prem|TeamFoundation|0\.2\.4" -Context 1,1
```

### 3.2 — Modifications à appliquer

**A. Header version** : `v0.2.4` → `v0.3.0`

**B. §1 (Scope produit)** : retirer la mention "Cloud + Server 2022" → "Cloud-only (Azure DevOps Services)". Ajouter une note historique :

```markdown
> **Note (Sprint 2 — 2026-05-10)** : Server 2022 retiré du scope. Justification : 
> aucun environnement on-prem disponible pour respecter §10 (TDD obligatoire avant 
> déclaration de support). Voir CHANGELOG `[0.2.0]` et test régression 
> `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`.
```

**C. §3.1 (Architecture)** : retirer "single VSIX Cloud+Server" → "Single VSIX targeting Azure DevOps Services (Cloud)"

**D. §10 (TDD)** : ajuster "tests E2E sur Cloud+Server" → "tests E2E sur Cloud uniquement"

**E. §11 (Release checklist)** : retirer toute case Server 2022. Ajouter :

```markdown
- [ ] Manifest `publisher` = `ATConseil` ✓ (cf. test régression CFG-2026-05-10-publisher-atconseil)
- [ ] Manifest `targets[]` ne contient plus `Microsoft.TeamFoundation.Server` ✓ (cf. test régression CFG-2026-05-10-server2022)
- [ ] Hub `argos-hub` a `properties.iconUrl` pointant vers `static/argos-hub.svg`
- [ ] `icons.default` pointe vers `static/marketplace-icon.png` (128×128)
```

**F. Section "Changelog interne constitution"** : ajouter en tête

```markdown
### v0.3.0 — 2026-05-10

- **BREAKING** : Server 2022 retiré du scope (Cloud-only)
- Manifest publisher fixé à `ATConseil`
- Hub Argos a une icône (œil-bouclier)
- Tests régression CFG-* ajoutés
```

### 3.3 — Édition

⚠ **Méthode d'édition obligatoire pour `constitution.md`** : `str_replace` ou `edit_file` Claude Code. **JAMAIS** `Set-Content` PowerShell (cf. CLAUDE.md "Encoding rules").

### 3.4 — Vérifier

```powershell
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

pnpm --filter @atconseil/regression-suite test
# Attendu : LLM (2/2), ENC (2/2), CFG-publisher (2/2). CFG-server2022 fail TOUJOURS.
```

---

## Étape 4 — Specs/spec.md, plan.md, tasks.md

### 4.1 — `Specs/spec.md`

Recherche et remplace les mentions Server 2022 :

```powershell
Select-String -Path Specs\spec.md -Pattern "Server 2022|on-prem|TeamFoundation"
```

Pour chaque match : reformuler ou supprimer selon contexte. Pas de scope creep — ne touche que ce qui mentionne Server.

### 4.2 — `Specs/plan.md`

Idem. Cibler §3.1 (architecture) et toute section discutant les targets.

### 4.3 — `Specs/tasks.md` — RESYNC COMPLET ⚠ gros morceau

C'est la partie la plus volumineuse. La situation actuelle :
- Toutes les Phases 0-7 sont cochées comme "done" dans `tasks.md`
- En réalité, 40+ composants UI sont écrits avec des `.test.tsx` mais **non wirés dans `App.tsx`** qui ne montre que des stubs
- Donc tasks.md ment sur l'état réel du projet

**Action** :

**A. Décocher toutes les checkboxes Phase 1 à Phase 7** (reset à `[ ]`)

**B. Garder Phase 0 cochée** (bootstrap effectivement fait : repo, tooling, monorepo)

**C. Ajouter une nouvelle phase** entre Phase 0 et Phase 1 :

```markdown
## Phase 0.5 — Dette d'intégration (Sprint 2.5 ?)

Conséquence de l'audit 2026-05-09 : les composants UI riches existent (40+ fichiers
React + .test.tsx) mais ne sont pas wirés dans `App.tsx`. La Phase 0.5 corrige
ça avant de poursuivre les développements neufs de Phase 1.

- [ ] T-0.5.1 — Inventaire des composants riches non-wirés
- [ ] T-0.5.2 — `apps/argos-extension/src/hub/App.tsx` : remplacer les stubs par les composants riches existants (Plans, Cases, Sets, Preconditions, Reports, AI-Config, Audit log, Settings)
- [ ] T-0.5.3 — Tests de wiring (composant rendu réellement vs stub)
- [ ] T-0.5.4 — Vérifier accessibility (aria-* sur la sidebar, focus management)
- [ ] T-0.5.5 — Mettre à jour `apps/argos-extension/overview.md` avec screenshots du hub réel
```

**D. Mettre à jour la phase Release dont les checkboxes Server 2022 doivent être supprimées**

**E. Ajouter une note d'en-tête** :

```markdown
> **Resync 2026-05-10 (Sprint 2)** : Cette liste a été déchekée pour refléter
> l'état réel du projet, qui est en Phase 0 (bootstrap + tooling). Les composants
> UI riches existent en code mais ne sont pas intégrés dans `App.tsx` (Phase 0.5).
```

⚠ **Encoding** : `tasks.md` était corrompu pré-Sprint-1, restauré Sprint 1.1. Les modifs Sprint 2 doivent **impérativement** passer par les outils Claude Code (str_replace, edit_file), **JAMAIS** par PowerShell Set-Content. Sinon recorruption garantie.

---

## Étape 5 — README, CLAUDE.md, overview.md

### 5.1 — README casing fix

```powershell
# Renommer readme.md → README.md
git mv readme.md README.md
```

⚠ Sur Windows, le système de fichier est case-insensitive par défaut. `git mv` peut nécessiter une étape intermédiaire :

```powershell
# Si git mv direct ne fonctionne pas
git mv readme.md readme-tmp.md
git mv readme-tmp.md README.md
```

### 5.2 — README — édit contenu

- Retirer toute mention Server 2022
- Ajouter une section "## Compatibility" explicite :

```markdown
## Compatibility

**Argos targets Azure DevOps Services (Cloud) only.** Azure DevOps Server 2022 / 2023 / 
on-premise variants are out of scope as of v0.2.0 — see CHANGELOG and constitution v0.3.0.
```

### 5.3 — `CLAUDE.md` racine — section "What this project is"

Vérifier qu'il n'y a plus mention Server 2022.

### 5.4 — `apps/argos-extension/overview.md` (description Marketplace)

Réécrire la description Marketplace pour refléter Cloud-only et mettre en avant les features. Utiliser un ton produit (pas dev) puisque c'est ce que les acheteurs verront.

```markdown
# Argos — Test Management for Azure DevOps

The Xray experience, native to ADO. Cases, Plans, Coverage, AI BYOK.

## Features

- **Test Plans & Test Cases** — full lifecycle, gherkin-aware
- **Test Sets & Preconditions** — reusable building blocks
- **Coverage & Traceability** — link to Work Items, see real-time coverage
- **AI-assisted generation** — bring your own LLM key (Anthropic / OpenAI / Azure)
- **Cloud-only** — built for Azure DevOps Services
- **Free tier** — full features for individual use

## Pricing

- Free for individual users
- Team / Enterprise tiers available — see [atconseil.info](https://atconseil.info)
```

---

## Étape 6 — Versions alignées (Changesets)

### 6.1 — État actuel

```powershell
# Lister les versions actuelles
Get-Content package.json | Select-String '"version"'
Get-Content apps\argos-extension\package.json | Select-String '"version"'
Get-Content apps\argos-extension\vss-extension.json | Select-String '"version"'
```

Attendu :
- root : `0.0.0`
- extension : `0.0.1`
- manifest (déjà fait étape 2) : `0.2.0`

### 6.2 — Aligner via Changesets

Si Changesets est installé (vérifier `.changeset/`) :

```powershell
pnpm changeset
# Sélectionner les packages concernés, choisir minor (0.0.0 → 0.2.0 nécessite minor + une étape manuelle car saut)
```

Si Changesets ne supporte pas le saut, faire manuellement :

```powershell
# Editer chaque package.json pour passer à 0.2.0
# (utiliser str_replace, jamais Set-Content)
```

Tous les `package.json` du monorepo doivent avoir `"version": "0.2.0"` à la fin de cette étape (ou rester à leur version interne si c'est une stratégie semver indépendante par package — vérifier avec l'utilisateur si doute).

### 6.3 — Vérification

```powershell
# Toutes les versions doivent être alignées
Get-ChildItem -Recurse -Filter package.json -File | Where-Object { $_.FullName -notmatch 'node_modules' } | ForEach-Object { 
    $v = (Get-Content $_.FullName | ConvertFrom-Json).version
    Write-Host "$v $($_.FullName.Replace($PWD.Path, '.'))"
}
```

---

## Étape 7 — CHANGELOG

### 7.1 — Réparer la chronologie cassée

L'audit a noté que `[1.0.0] 2026-05-08` apparaissait avant `[0.1.1] 2026-05-09`. À supprimer ou réordonner.

### 7.2 — Ajouter l'entrée [0.2.0]

```markdown
## [0.2.0] — 2026-05-10

### BREAKING

- **Server 2022 / on-premise hors scope** : Argos est désormais Cloud-only.
  Justification : aucun environnement on-prem testable, violation §10 TDD.
  - Retrait `Microsoft.TeamFoundation.Server` du `vss-extension.json` `targets[]`
  - Constitution bumped to v0.3.0
  - Test régression `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`

### Fixed

- Manifest publisher corrigé : `AlexThibaud` → `ATConseil` (cohérence avec compte Marketplace officiel)
  - Test régression `tools/regression/CFG-2026-05-10-publisher-atconseil.test.ts`
- README casing : `readme.md` → `README.md` (Marketplace requirement)
- Versions alignées : root, extension, manifest tous à 0.2.0
- CHANGELOG chronologie réparée (entrée fictive `[1.0.0]` retirée)
- `tasks.md` resync : décoché Phase 1-7 pour refléter l'état réel (composants riches non wirés dans App.tsx)

### Added

- Icône Argos hub (`apps/argos-extension/static/argos-hub.svg`) — œil-bouclier, theme-aware via currentColor
- Icône Marketplace (`apps/argos-extension/static/marketplace-icon.png`) — 128×128 PNG, version SVG source incluse
- Phase 0.5 "Dette d'intégration" ajoutée à `tasks.md` (wiring App.tsx ↔ composants existants)
- 2 tests régression nommés (CFG-2026-05-10-*)
- Description Marketplace `apps/argos-extension/overview.md` refondue (ton produit, Cloud-only)

### TECH-DEBT noted (Sprint 3+)

- TECH-DEBT-001 : factoriser allowlists communes des tests régression dans `tools/regression/allowlist.ts`
- Phase 0.5 : wiring App.tsx ↔ composants riches (40+ fichiers)
```

---

## Étape 8 — Validation complète

```powershell
# 1. Tests régression — TOUS doivent passer
pnpm --filter @atconseil/regression-suite test
# Attendu : 8 passing (2 LLM + 2 ENC + 2 CFG-server2022 + 2 CFG-publisher)

# 2. Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake. CLEAN.

# 3. Lint + typecheck + tests applicatifs
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts attendus

# 4. Manifest valide
node -e "JSON.parse(require('fs').readFileSync('apps/argos-extension/vss-extension.json', 'utf8'))"
# Pas d'erreur = JSON valide

# 5. Versions alignées
Get-ChildItem -Recurse -Filter package.json -File | Where-Object { $_.FullName -notmatch 'node_modules' } | ForEach-Object { 
    $v = (Get-Content $_.FullName | ConvertFrom-Json).version
    Write-Host "$v $($_.FullName.Replace($PWD.Path, '.'))"
}
# Attendu : tous à 0.2.0 (ou versions internes cohérentes selon stratégie monorepo)

# 6. Sanity inverse — réintroduire un Server 2022 doit faire fail le test
"Microsoft.TeamFoundation.Server" | Out-File -Append README.md -Encoding utf8NoBOM
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-server2022
# Attendu : 1 fail
# Retirer
$content = Get-Content README.md -Raw
$content = $content -replace "Microsoft\.TeamFoundation\.Server\r?\n?", ""
[IO.File]::WriteAllText("$PWD\README.md", $content, [Text.UTF8Encoding]::new($false))
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-server2022
# Attendu : 2 passing
```

---

## Étape 9 — Archive du prompt + REGISTRY

### 9.1 — Archiver ce prompt

```powershell
# Le fichier CLAUDE_TASK_sprint-2.md doit être copié dans tools/claude-prompts/
# (l'utilisateur l'a placé là où il l'a téléchargé — probablement à la racine ou ~/Downloads)
$found = @(".\CLAUDE_TASK_sprint-2.md", "$HOME\Downloads\CLAUDE_TASK_sprint-2.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-2.md
    Write-Host "OK Prompt archivé"
} else {
    Write-Host "MANQUE: l'utilisateur doit copier CLAUDE_TASK_sprint-2.md dans tools/claude-prompts/ avant le commit"
}
```

### 9.2 — Mettre à jour `tools/regression/REGISTRY.md`

Ajouter 2 nouvelles lignes après l'entrée ENC-2026-05-09 :

```markdown
| CFG-2026-05-10-server2022 | 2026-05-10 | Configuration | server2022-out-of-scope | Aucune réintroduction de Server 2022 / on-prem dans la spec-kit, doc, ou manifest. Décision Sprint 2 (Cloud-only). | constitution v0.3.0, vss-extension.json | AT |
| CFG-2026-05-10-publisher | 2026-05-10 | Configuration | publisher-atconseil | Le publisher Marketplace doit rester `ATConseil`. Erreur initiale `AlexThibaud` corrigée Sprint 2. | vss-extension.json | AT |
```

---

## Étape 10 — Commit + PR

**Avant le commit, demande-moi confirmation avec le diff complet.**

Si l'utilisateur dit OK :

```powershell
git add -A
git status
# Vérifier qu'aucun fichier parasite n'est traîné

git commit `
  -m "feat(extension): cloud-only v0.2.0 — retire Server 2022, fix publisher, add Argos icons" `
  -m "" `
  -m "BREAKING: Server 2022 / on-premise out of scope (no testable env, constitution §10 TDD)" `
  -m "" `
  -m "- vss-extension.json: remove Microsoft.TeamFoundation.Server target" `
  -m "- vss-extension.json: publisher AlexThibaud -> ATConseil" `
  -m "- vss-extension.json: bump 0.1.1 -> 0.2.0" `
  -m "- vss-extension.json: add hub iconUrl + manifest icons.default" `
  -m "- Constitution v0.2.4 -> v0.3.0 (Cloud-only)" `
  -m "- README casing fix (readme.md -> README.md) + Compatibility section" `
  -m "- tasks.md resync: uncheck Phase 1-7 (reflect actual state) + add Phase 0.5 (integration debt)" `
  -m "- Add 2 regression tests (CFG-2026-05-10-server2022, CFG-2026-05-10-publisher)" `
  -m "- Add Argos icons: hub (SVG, currentColor) + Marketplace (PNG 128x128)" `
  -m "- CHANGELOG [0.2.0]" `
  -m "- All package.json versions aligned to 0.2.0" `
  -m "" `
  -m "Refs: audit 2026-05-09, decision 2026-05-10"

git push -u origin feat/cloud-only-v0.2.0
```

Si lint-staged refoule, **`--no-verify` est légitime** seulement si tu as déjà validé manuellement biome/lint/typecheck/tests à l'étape 8.

Puis ouvrir la PR avec un body informatif (utiliser le contenu CHANGELOG `[0.2.0]` comme base).

---

## Critères de done

- [ ] Branche `feat/cloud-only-v0.2.0` créée depuis `main` à jour
- [ ] `vss-extension.json` : publisher = `ATConseil`, pas de `TeamFoundation.Server`, version = `0.2.0`, hub a `iconUrl`, manifest a `icons.default`
- [ ] 3 fichiers icônes en place dans `apps/argos-extension/static/`
- [ ] Constitution bumped à v0.3.0, mention Server 2022 retirée partout
- [ ] `Specs/spec.md`, `Specs/plan.md`, `Specs/tasks.md` cohérents avec Cloud-only
- [ ] `tasks.md` resync : Phase 1-7 décochées, Phase 0.5 ajoutée
- [ ] `readme.md` → `README.md` (casing) avec section Compatibility
- [ ] `apps/argos-extension/overview.md` refondu (ton produit)
- [ ] `CHANGELOG.md` : entrée `[0.2.0]` propre, chronologie réparée
- [ ] Toutes versions `package.json` alignées à `0.2.0`
- [ ] 2 nouveaux tests régression CFG-* (source ASCII, biome-clean, vitest passing)
- [ ] Allowlists des 3 fichiers (LLM-test, ENC-test, scan-mojibake.cjs) mises à jour
- [ ] REGISTRY.md : 2 nouvelles entrées CFG-*
- [ ] `tools/claude-prompts/CLAUDE_TASK_sprint-2.md` archivé
- [ ] `pnpm --filter @atconseil/regression-suite test` → 8 passing
- [ ] `pnpm turbo test` → tous verts
- [ ] `pnpm turbo lint && pnpm turbo typecheck` → 0 erreur
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file. CLEAN.
- [ ] Commit Conventional Commits avec breaking change documenté
- [ ] PR ouverte avec body informatif

---

## Garde-fous spéciaux Sprint 2

⚠ **Encoding** : tasks.md est sensible (a déjà été corrompu 2 fois). Toutes modifs via Claude Code natif, JAMAIS via Set-Content PS.

⚠ **Scope creep** : si tu trouves d'autres incohérences pendant le travail (ex: un autre fichier qui mentionne v0.1.1, ou une variable d'environnement Server-related dans les workflows GitHub), **STOP et signale**. Ne pas auto-élargir le périmètre. Soit on étend Sprint 2, soit on planifie Sprint 2.5.

⚠ **Tests CFG dès l'étape 1 (TDD strict)** : ne PAS commencer par modifier le manifest. Commencer par écrire les tests qui échouent, puis appliquer les modifs qui les font passer. Conformément à constitution §10.

⚠ **Allowlist du test CFG-server2022** : la regex `/\bon[-\s]prem(?:ise|ises)?\b/i` est large et risque de matcher des mentions légitimes futures. Si elle fait fail un fichier où `on-prem` apparaît dans un contexte inoffensif (ex: un commentaire historique légitime dans constitution.md), allowliste explicitement ce fichier. Pas de relâchement de la regex.

---

## Si quelque chose dévie du plan

- Si `pnpm install` ou les tests baseline (étape 0.3) échouent → STOP, signaler
- Si plus de 2 fichiers mentionnent Server 2022 hors `vss-extension.json` + spec-kit → STOP, examiner avec l'utilisateur
- Si Changesets refuse le saut 0.0.0 → 0.2.0 → demander à l'utilisateur la stratégie
- Si l'icône Marketplace ne s'affiche pas correctement à la validation locale (npm pack ou similaire) → STOP

---

## Ressources

- Spec Marketplace icons : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest
- vss-extension.json reference : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

Quand c'est appliqué et 8/8 tests régression verts + tous tests applicatifs verts, dis-le-moi. Sprint 3 (Argos top-level hub) pourra alors démarrer sur une base saine et propre.
