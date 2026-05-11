# Prompt Claude Code — Sprint 4 (`feat/multi-hubs-architecture`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-4.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour (Sprint 3.4 mergé)
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 25 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file with mojibake. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] Sprint 3.4 publie : Argos visible top-level dans BCEE-QA avec icone

Si l'un echoue → STOP.

---

## Contexte

**Sprint 4 transforme l'architecture Argos d'un hub monolithique vers une architecture multi-hubs native ADO.**

**Etat actuel post-Sprint 3.4** :
- 1 hub-group top-level (`argos-hub-group`) — peer de Boards/Repos/Pipelines/Test Plans
- 1 hub interne (`argos-hub`, nom display "Test Management") — rendu par App.tsx
- App.tsx contient un **sous-menu interne custom** (Plans/Cases/Sets/Precond./Reports/Settings) avec switch-case

**Probleme UX** : ce sous-menu interne (capture BCEE-QA actuelle) ne ressemble pas a la nav native ADO (style Test Plans : icones Fluent UI, sub-hubs natifs, etat actif visuel par ADO). Argos a l'air "bricole" a cote des features natives.

**Architecture cible** : pattern Microsoft officiel "un hub-group + N hubs internes". Test Plans natif Microsoft fait pareil (Test plans / Progress report / Parameters / Configurations / Runs / Exploratory sessions). Argos doit suivre le meme pattern.

**Doc Microsoft validee** (2026-04-03, sources `learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub` + `azure-devops-extension-sdk` package reference) :
- Plusieurs hubs peuvent cibler le meme hub-group via `.argos-hub-group` (reference relative)
- Propriete `iconName` accepte des valeurs Fluent UI string (ex: "Code", "TestBeaker"). Documente : "Use the icon or iconName property in your contribution to display an icon"
- `SDK.getContributionId()` retourne l'ID complet du hub qui a active le frame (ex: `AlexThibaud.ArgosTesting.argos-hub-plans`). Idiom officiel pour le routing multi-hubs partageant un meme HTML

**Architecture finale Sprint 4** :

```
argos-hub-group (Sprint 3.4, inchange)
├── argos-hub-plans          name: "Test Plans"      iconName: "BulletedList"
├── argos-hub-cases          name: "Test Cases"      iconName: "TestBeaker"
├── argos-hub-sets           name: "Test Sets"       iconName: "FolderList"
├── argos-hub-preconditions  name: "Preconditions"   iconName: "Important"
├── argos-hub-reports        name: "Reports"         iconName: "ReportDocument"
└── argos-hub-settings       name: "Settings"        iconName: "Settings"
```

Tous les hubs pointent vers le **meme** `uri: "dist/hub/hub.html"`. App.tsx fait `SDK.getContributionId()` au mount pour determiner quelle section afficher.

**Perimetre Sprint 4** :
1. Remplacer la contribution `argos-hub` (singulier) par 6 contributions `argos-hub-<section>` (Plans, Cases, Sets, Preconditions, Reports, Settings)
2. Refactor `App.tsx` : remplacer le state interne `[currentSection, setCurrentSection]` par une derivation depuis `SDK.getContributionId()`
3. Supprimer le sous-menu interne actuel d'App.tsx (les boutons Plans/Cases/Sets/Settings rendus en HTML) — c'est ADO qui rend la nav maintenant
4. Garder le switch-case existant qui rend les vues (`<PlansView />`, `<CasesView />`, etc.) — il devient pilote par `getContributionId()` au lieu d'un click handler interne
5. Update test regression T-0.9-argos-top-level-placement : checker que les 6 hubs existent + targent `.argos-hub-group`
6. Update CFG-2026-05-10-top-level-hub : assertions coherentes avec multi-hubs
7. **Nouveau test** : `T-1.0-argos-multi-hubs-architecture` (UX-decision, lock l'architecture 6 hubs)
8. Bump v0.3.5 → v0.4.0 (**minor** : changement structurel UX visible)
9. CHANGELOG `[0.4.0]` avec architecture + lessons learned
10. Constitution v0.4.3 → v0.5.0 (bump minor coherent avec produit)

**Hors scope Sprint 4** :
- Modification du contenu des views (`<PlansView />`, `<CasesView />`, etc.) — Sprint 2.5b couvre le wiring Run/Coverage/Reports/Settings non-LLM
- Renommage du concept "Test Set" → "Test Suite" (TECH-DEBT-007 audit semantique requis)
- Implementation IFlakinessReportService (WIRING-CLOUD-PLUS, dependance Reports)
- TECH-DEBT-011 v2 (pre-flight check Marketplace) — sprint dedie ulterieur

---

## Architecture des changements

### Modification 1 — `apps/argos-extension/vss-extension.json`

```diff
@@ Manifest racine @@
- "version": "0.3.5",
+ "version": "0.4.0",
```

```diff
@@ Section contributions @@
  "contributions": [
    {
      "id": "argos-hub-group",
      "type": "ms.vss-web.hub-group",
      ...inchange Sprint 3.4
    },
-   {
-     "id": "argos-hub",
-     "type": "ms.vss-web.hub",
-     "description": "Argos Test Management Hub",
-     "targets": [".argos-hub-group"],
-     "properties": {
-       "name": "Test Management",
-       "order": 10,
-       "uri": "dist/hub/hub.html",
-       "icon": "static/argos-hub.png"
-     }
-   },
+   {
+     "id": "argos-hub-plans",
+     "type": "ms.vss-web.hub",
+     "description": "Test Plans management — organize test execution campaigns.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Test Plans",
+       "iconName": "BulletedList",
+       "order": 10,
+       "uri": "dist/hub/hub.html"
+     }
+   },
+   {
+     "id": "argos-hub-cases",
+     "type": "ms.vss-web.hub",
+     "description": "Test Cases — define reusable test scenarios.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Test Cases",
+       "iconName": "TestBeaker",
+       "order": 20,
+       "uri": "dist/hub/hub.html"
+     }
+   },
+   {
+     "id": "argos-hub-sets",
+     "type": "ms.vss-web.hub",
+     "description": "Test Sets — group related test cases for batch execution.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Test Sets",
+       "iconName": "FolderList",
+       "order": 30,
+       "uri": "dist/hub/hub.html"
+     }
+   },
+   {
+     "id": "argos-hub-preconditions",
+     "type": "ms.vss-web.hub",
+     "description": "Preconditions — define prerequisites for test execution.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Preconditions",
+       "iconName": "Important",
+       "order": 40,
+       "uri": "dist/hub/hub.html"
+     }
+   },
+   {
+     "id": "argos-hub-reports",
+     "type": "ms.vss-web.hub",
+     "description": "Reports — execution results, coverage, flakiness analysis.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Reports",
+       "iconName": "ReportDocument",
+       "order": 50,
+       "uri": "dist/hub/hub.html"
+     }
+   },
+   {
+     "id": "argos-hub-settings",
+     "type": "ms.vss-web.hub",
+     "description": "Settings — AI/LLM configuration, audit log, repository mapping.",
+     "targets": [".argos-hub-group"],
+     "properties": {
+       "name": "Settings",
+       "iconName": "Settings",
+       "order": 60,
+       "uri": "dist/hub/hub.html"
+     }
+   },
    {
      "id": "argos-coverage-panel",
      ...inchange (legitime sur work-item-form)
    }
  ]
```

⚠ **Aucune autre modification** du manifest. Notamment :
- `publisher: AlexThibaud` reste (Sprint 3.1)
- Pas de `"public": false` (Sprint 3.2)
- `id: ArgosTesting` reste
- `categories: ["Azure Boards", "Azure Test Plans"]` reste
- `argos-hub-group` properties inchangees (name "Argos", order 450, icon "static/argos-hub.png")
- `argos-coverage-panel` inchange

### Modification 2 — Refactor `apps/argos-extension/src/hub/App.tsx`

**Architecture cible** : derivation de la section depuis `SDK.getContributionId()`, suppression du menu interne.

**Mapping contribution-ID → section** :

```typescript
import * as SDK from "azure-devops-extension-sdk";

type Section = "plans" | "cases" | "sets" | "preconditions" | "reports" | "settings";

// Full contribution IDs (publisher.extension.contribution-id format)
const CONTRIBUTION_ID_TO_SECTION: Record<string, Section> = {
	"AlexThibaud.ArgosTesting.argos-hub-plans": "plans",
	"AlexThibaud.ArgosTesting.argos-hub-cases": "cases",
	"AlexThibaud.ArgosTesting.argos-hub-sets": "sets",
	"AlexThibaud.ArgosTesting.argos-hub-preconditions": "preconditions",
	"AlexThibaud.ArgosTesting.argos-hub-reports": "reports",
	"AlexThibaud.ArgosTesting.argos-hub-settings": "settings",
};

const DEFAULT_SECTION: Section = "plans";

function resolveSection(contributionId: string | undefined): Section {
	if (!contributionId) return DEFAULT_SECTION;
	return CONTRIBUTION_ID_TO_SECTION[contributionId] ?? DEFAULT_SECTION;
}
```

**Pattern d'init** :

```typescript
function App() {
	const [section, setSection] = useState<Section>(DEFAULT_SECTION);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		SDK.init().then(() => {
			const contributionId = SDK.getContributionId();
			setSection(resolveSection(contributionId));
			setIsReady(true);
			SDK.notifyLoadSucceeded();
		}).catch((err) => {
			console.error("SDK init failed", err);
			SDK.notifyLoadFailed(err);
		});
	}, []);

	if (!isReady) {
		return <div data-testid="hub-loading">Loading...</div>;
	}

	// Switch-case existant inchange — uniquement pilote par `section` au lieu de state interne
	switch (section) {
		case "plans": return <PlansView />;
		case "cases": return <CasesView />;
		case "sets": return <SetsView />;
		case "preconditions": return <PreconditionsView />;
		case "reports": return <ReportsView />;
		case "settings": return <SettingsView />;
	}
}
```

**Suppression du menu interne** :

L'App.tsx actuel a probablement un menu en sidebar/header avec les boutons (Plans, Cases, Sets, etc.). **Le supprimer entierement** — c'est ADO qui rend la nav.

⚠ **Garde-fou** : si tu vois des composants comme `<HubNav />`, `<SectionMenu />`, `<SidebarMenu />` ou des boutons en mappage avec setSection() handlers, supprime-les. Mais **STOP** si tu vois des composants qui font autre chose que la nav (ex: un menu de filtres, un menu d'actions globales). Demande avant de supprimer.

### Modification 3 — Tests applicatifs

Les tests applicatifs de `App.tsx` (s'il y en a) doivent etre mis a jour :
- Mock de `SDK.getContributionId()` retournant un ID specifique pour chaque scenario
- Verifications que la bonne view est rendue selon l'ID

Pattern recommande (`apps/argos-extension/src/hub/App.test.tsx`) :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import * as SDK from "azure-devops-extension-sdk";
import { App } from "./App";

vi.mock("azure-devops-extension-sdk", () => ({
	init: vi.fn(() => Promise.resolve()),
	getContributionId: vi.fn(),
	notifyLoadSucceeded: vi.fn(),
	notifyLoadFailed: vi.fn(),
}));

describe("App contribution-id routing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(SDK.init).mockResolvedValue(undefined);
	});

	it.each([
		["AlexThibaud.ArgosTesting.argos-hub-plans", "view-plans"],
		["AlexThibaud.ArgosTesting.argos-hub-cases", "view-cases"],
		["AlexThibaud.ArgosTesting.argos-hub-sets", "view-sets"],
		["AlexThibaud.ArgosTesting.argos-hub-preconditions", "view-preconditions"],
		["AlexThibaud.ArgosTesting.argos-hub-reports", "view-reports"],
		["AlexThibaud.ArgosTesting.argos-hub-settings", "view-settings"],
	])("renders correct view for contribution %s", async (contributionId, expectedTestId) => {
		vi.mocked(SDK.getContributionId).mockReturnValue(contributionId);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
		});
	});

	it("falls back to plans section if contributionId is unknown", async () => {
		vi.mocked(SDK.getContributionId).mockReturnValue("unknown.id");
		render(<App />);
		await waitFor(() => {
			expect(screen.getByTestId("view-plans")).toBeInTheDocument();
		});
	});
});
```

⚠ Verifier que les views existantes ont bien des `data-testid` correspondants. Si non, les ajouter (changement mineur de chaque `*View.tsx`).

### Modification 4 — Nouveau test regression

**`tools/regression/T-1.0-argos-multi-hubs-architecture.test.ts`** :

```typescript
/**
 * Regression test: T-1.0-argos-multi-hubs-architecture (UX-decision)
 *
 * History:
 *   2026-05-10 (Sprint 3) - Argos hub single monolithic contribution (argos-hub)
 *                rendering an internal switch-case menu in App.tsx.
 *   2026-05-11 (Sprint 3.4) - Hub-group dedicated created (argos-hub-group),
 *                argos-hub still single, navigation internal still custom.
 *   2026-05-11 (T-1.0, Sprint 4) - Architecture multi-hubs native ADO. Single
 *                argos-hub replaced by 6 hubs internes:
 *                  argos-hub-plans, argos-hub-cases, argos-hub-sets,
 *                  argos-hub-preconditions, argos-hub-reports, argos-hub-settings
 *                All target .argos-hub-group via relative reference.
 *                App.tsx derives section from SDK.getContributionId() instead
 *                of internal state. Internal navigation menu removed.
 *                Visual parity with native Test Plans achieved.
 *
 * What this test guards:
 *   - 6 hubs internes exist : plans, cases, sets, preconditions, reports, settings
 *   - All target ".argos-hub-group" (relative reference)
 *   - All have type "ms.vss-web.hub"
 *   - No more singular "argos-hub" contribution (replaced by the 6 above)
 *   - argos-hub-group still exists (Sprint 3.4 preserved)
 *   - Display names follow long format: "Test Plans", "Test Cases", etc.
 *
 * Rationale: prevents accidental return to monolithic single-hub OR partial
 * split (e.g. only 3 hubs instead of 6). Architecture native parity with
 * Test Plans must remain stable.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - Specs/spec.md, Specs/tasks.md T-1.0
 *   - REGISTRY entry T-1.0-argos-multi-hubs-architecture
 *   - Microsoft docs: hub-group + hub pattern, getContributionId() SDK function
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
	properties?: { name?: string };
}

interface Manifest {
	contributions: Contribution[];
}

const EXPECTED_HUBS: Array<{ id: string; name: string }> = [
	{ id: "argos-hub-plans", name: "Test Plans" },
	{ id: "argos-hub-cases", name: "Test Cases" },
	{ id: "argos-hub-sets", name: "Test Sets" },
	{ id: "argos-hub-preconditions", name: "Preconditions" },
	{ id: "argos-hub-reports", name: "Reports" },
	{ id: "argos-hub-settings", name: "Settings" },
];

describe("T-1.0-argos-multi-hubs-architecture regression", () => {
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	it.each(EXPECTED_HUBS)(
		"must declare hub '$id' with display name '$name'",
		({ id, name }) => {
			const hub = manifest.contributions.find((c) => c.id === id);
			expect(hub).toBeDefined();
			expect(hub?.type).toBe("ms.vss-web.hub");
			expect(hub?.targets).toContain(".argos-hub-group");
			expect(hub?.properties?.name).toBe(name);
		},
	);

	it("must NOT declare the legacy singular argos-hub (Sprint 3.4 monolithic)", () => {
		const legacy = manifest.contributions.find((c) => c.id === "argos-hub");
		expect(legacy).toBeUndefined();
	});

	it("argos-hub-group must still exist (Sprint 3.4 preserved)", () => {
		const hubGroup = manifest.contributions.find((c) => c.id === "argos-hub-group");
		expect(hubGroup).toBeDefined();
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("must have exactly 6 ms.vss-web.hub contributions (one per section)", () => {
		const hubs = manifest.contributions.filter((c) => c.type === "ms.vss-web.hub");
		expect(hubs).toHaveLength(6);
	});
});
```

⚠ Source 100% ASCII (cf. CLAUDE.md). Allowlist a faire dans `allowlist.ts` ET `allowlist.cjs`.

### Modification 5 — Mise a jour `T-0.9-argos-top-level-placement.test.ts`

Le test existant a une assertion sur l'existence de `argos-hub`. Cette assertion doit etre **retiree** (le hub singulier n'existe plus).

```diff
- it("must declare an argos-hub contribution", () => {
-     const hub = manifest.contributions.find((c) => c.id === "argos-hub");
-     expect(hub).toBeDefined();
- });
-
- it("argos-hub must target .argos-hub-group (relative reference)", () => {
-     const hub = manifest.contributions.find((c) => c.id === "argos-hub");
-     expect(hub?.targets).toContain(".argos-hub-group");
- });

+ it("at least one hub must target .argos-hub-group (relative reference, Sprint 4 multi-hubs)", () => {
+     const hubs = manifest.contributions.filter((c) => c.targets?.includes(".argos-hub-group"));
+     expect(hubs.length).toBeGreaterThanOrEqual(1);
+ });
```

**Enrichir l'en-tete historique** avec Sprint 4 :

```typescript
/**
 * History:
 *   ...
 *   2026-05-11 (T-0.9 v2, Sprint 3.4) - Architecture refondee : hub-group dedie.
 *   2026-05-11 (T-0.9 v3, Sprint 4) - Architecture multi-hubs. Argos-hub
 *                singulier supprime au profit de 6 hubs internes. Voir T-1.0.
 */
```

### Modification 6 — Mise a jour `CFG-2026-05-10-top-level-hub.test.ts`

Le test verifie `argos-hub-group` + faux targets exclus. Reste essentiellement valide post-Sprint 4. L'assertion sur l'existence de `argos-hub-group` (type hub-group) reste OK. Pas de modification structurelle.

Mais ajout d'une **assertion preventive** : verifier qu'au moins un hub cible le hub-group (sinon le hub-group serait vide, defaut UX).

```diff
+ it("argos-hub-group must contain at least one hub (no empty hub-group)", () => {
+     const hubs = manifest.contributions.filter((c) => c.targets?.includes(".argos-hub-group"));
+     expect(hubs.length).toBeGreaterThanOrEqual(1);
+ });
```

### Modification 7 — REGISTRY

```diff
@@ Section "Tests actifs" @@
+ | T-1.0 | 2026-05-11 | UX-decision | argos-multi-hubs-architecture | 6 hubs internes (plans, cases, sets, preconditions, reports, settings) targant .argos-hub-group. Architecture native parity avec Test Plans Microsoft. Hub singulier argos-hub supprime. | spec.md, tasks.md T-1.0 | AT |

- | T-0.9 | ... | Argos placement top-level via hub-group dedie ... cible .argos-hub-group ...  |
+ | T-0.9 | 2026-05-10 (Sprint 3) / Sprint 3.4 / Sprint 4 | UX-decision | argos-top-level-placement | Argos placement top-level via hub-group dedie. Au moins un hub cible .argos-hub-group (apres Sprint 4 il y en a 6). | spec.md, tasks.md T-0.9 | AT |

- | CFG-2026-05-10-top-level-hub | ... |
+ | CFG-2026-05-10-top-level-hub | 2026-05-10 / Sprint 3.4 / Sprint 4 | Configuration | top-level-hub | Zero-tolerance faux targets + hub-group existe + au moins 1 hub cible le hub-group. | Sprint 3, 3.4, 4 | AT |
```

### Modification 8 — Constitution

Bump v0.4.3 → v0.5.0 (minor — changement structurel architecture).

```markdown
## Sprint 4 (v0.4.0) — Architecture multi-hubs native ADO

- 2026-05-11 : Refonte architecture nav. Hub monolithique `argos-hub` remplace par 6 hubs internes ciblant `.argos-hub-group` (Plans, Cases, Sets, Preconditions, Reports, Settings).
- 2026-05-11 : Visual parity avec Test Plans natif Microsoft. Chaque hub a son icon Fluent UI (`iconName` property) : BulletedList, TestBeaker, FolderList, Important, ReportDocument, Settings.
- 2026-05-11 : App.tsx refactore : section derivee de `SDK.getContributionId()` au mount. Sous-menu interne supprime (ADO rend la nav nativement).
- 2026-05-11 : Bump v0.3.5 → v0.4.0 (minor : changement structurel UX visible).
- 2026-05-11 : Constitution v0.4.3 → v0.5.0 (alignment produit).

### Lessons learned Sprint 4

- **Pattern Microsoft idiomatique** : multi-hubs partageant un meme HTML, route via `SDK.getContributionId()`. Plus DRY que `getConfiguration().section` (redondance entre `id` et `properties.section`). Documente par Microsoft, utilise par leurs propres extensions.
- **Suppression du menu interne** : etait redondant des que la nav ADO native rend les hubs. Garder les deux = double-nav (laid + confusant). Le retirer = code plus propre + UX coherente.
- **iconName Fluent UI** : pas de liste exhaustive documentee Microsoft mais les valeurs courantes (Code, BulletedList, TestBeaker, etc.) sont supportees. **A iterer visuellement post-deploy** si les choix initiaux ne plaisent pas.
```

### Modification 9 — CHANGELOG

```markdown
## [0.4.0] - 2026-05-11

### Added (Sprint 4 - feat/multi-hubs-architecture)

- **Architecture multi-hubs native ADO** : le hub monolithique `argos-hub` est remplace par 6 hubs internes :
  - `argos-hub-plans` (Test Plans, iconName BulletedList)
  - `argos-hub-cases` (Test Cases, iconName TestBeaker)
  - `argos-hub-sets` (Test Sets, iconName FolderList)
  - `argos-hub-preconditions` (Preconditions, iconName Important)
  - `argos-hub-reports` (Reports, iconName ReportDocument)
  - `argos-hub-settings` (Settings, iconName Settings)
- Tous targant `.argos-hub-group` (reference relative). Pattern Microsoft officiel "un hub-group + N hubs internes" (meme pattern que Test Plans natif Microsoft : Test plans / Progress report / Parameters / Configurations / Runs / Exploratory sessions).
- **Visual parity Test Plans natif** : icones Fluent UI standard, etat actif rendu par ADO, sub-nav native (plus de menu interne custom).
- **Nouveau test regression T-1.0-argos-multi-hubs-architecture** (UX-decision) : 8 assertions verifiant existence et configuration des 6 hubs + absence du hub monolithique legacy.

### Changed (Sprint 4)

- **App.tsx refactore** : section derivee de `SDK.getContributionId()` au mount au lieu d'un state interne pilote par menu interne. Pattern Microsoft idiomatique.
- **Suppression du menu interne** (sub-nav HTML custom rendue par App.tsx). ADO rend la nav nativement maintenant.
- **T-0.9-argos-top-level-placement** : 2 assertions sur `argos-hub` singulier remplacees par 1 assertion plus souple "au moins un hub cible le hub-group". En-tete historique enrichi Sprint 4.
- **CFG-2026-05-10-top-level-hub** : ajout assertion "hub-group must contain at least one hub" (anti-empty-hub-group).
- **Bump v0.3.5 → v0.4.0** (minor : changement structurel UX visible).
- **Constitution v0.4.3 → v0.5.0**.

### Backlog (post-Sprint 4)

- **TECH-DEBT-013 NEW** est **RESOLU par ce sprint**. Inscrit comme done dans REGISTRY/backlog tracking.
- Sprint 2.5b — Wiring backends Run/Coverage/Reports + Settings non-LLM (le contenu des 6 views, pas leur nav)
- TECH-DEBT-007 — Audit semantique Test Set vs Test Suite (avec maintenant la nav qui dit "Test Sets", la question terminologique devient plus visible)
- TECH-DEBT-011 v2 — Pre-flight check Marketplace + validation target IDs Microsoft docs
- (autres items inchanges)

### Lessons learned (Sprint 4)

- **Visual parity native** = enorme gain UX pour un cout architectural raisonnable. Argos passe de "extension qui bricole sa nav" a "produit qui respecte les patterns ADO". Premiere impression utilisateur considerablement amelioree.
- **`SDK.getContributionId()` est l'idiom Microsoft** pour le routing multi-hubs partageant un meme HTML. Plus DRY que `getConfiguration().section`. Pattern utilise par les extensions Microsoft elles-memes.
- **Test Set vs Test Suite** : la nav qui dit "Test Sets" rend visible la terminologie inhabituelle (vs ADO natif "Test Suites"). Pression UX sur TECH-DEBT-007. Question a re-trancher quand on y arrive.
```

### Modification 10 — `apps/argos-extension/overview.md` et `README.md`

Si l'un mentionne explicitement "hub" / "menu" / "navigation" / "Plans/Cases/Sets" comme section, mise a jour. Workflow REPORTING avant modification (validation utilisateur si modifs spec-kit).

```powershell
Select-String -Path apps\argos-extension\overview.md, README.md -Pattern "hub|menu|navigation|Plans|Cases" 
```

### Modification 11 — Bump versions (Changesets)

```powershell
pnpm changeset
# Type : minor (changement structurel UX visible)
# Description : "Multi-hubs architecture matching Test Plans native pattern"

pnpm changeset version
# Bump 0.3.5 → 0.4.0
```

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b feat/multi-hubs-architecture

pnpm install
pnpm --filter @atconseil/regression-suite test
# Attendu : 25 passing
```

---

## Etape 1 — Test-first : creer T-1.0 (ROUGE attendu)

### 1.1 — Creer `tools/regression/T-1.0-argos-multi-hubs-architecture.test.ts`

Voir "Modification 4" pour le contenu complet. Source 100% ASCII.

### 1.2 — Allowlist (allowlist.ts + .cjs)

Ajouter dans `SHARED_DOC_ALLOWLIST` (les 2 fichiers) :
```typescript
"tools/regression/T-1.0-argos-multi-hubs-architecture.test.ts",
```

### 1.3 — Lancer le test : il DOIT echouer

```powershell
pnpm --filter @atconseil/regression-suite test T-1.0
# Attendu : 8 fails (les 6 hubs n'existent pas encore, hub singulier existe encore, hubs count = 1)
```

Confirme a l'utilisateur que tu vois les fails attendus avant l'etape 2.

### 1.4 — Mettre a jour T-0.9 et CFG-top-level-hub

Voir "Modification 5" et "Modification 6". Lancer :

```powershell
pnpm --filter @atconseil/regression-suite test T-0.9
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : quelques fails car les assertions sur argos-hub singulier ne passent plus encore
```

---

## Etape 2 — Modifier `vss-extension.json`

### 2.1 — Lire manifest actuel

```powershell
Get-Content apps\argos-extension\vss-extension.json
```

Confirme avec l'utilisateur que tu vas :
- Supprimer la contribution `argos-hub` singuliere
- Ajouter 6 contributions `argos-hub-<section>` 
- Conserver `argos-hub-group` et `argos-coverage-panel` inchanges
- Bumper version 0.3.5 → 0.4.0

### 2.2 — Appliquer les modifications

Voir "Modification 1". 

⚠ **Garde-fou STOP** :
- Ne PAS toucher au publisher, id, scopes, categories, banniere, icones
- Ne PAS toucher a `argos-hub-group` ni `argos-coverage-panel`
- Si tu vois autre chose d'inattendu dans le manifest qui pourrait etre affecte, STOP

### 2.3 — Validation manifest

```powershell
pnpm --filter @atconseil/regression-suite test T-1.0
# Attendu : 8 passing

pnpm --filter @atconseil/regression-suite test T-0.9
# Attendu : passing (3 assertions, dont la nouvelle "au moins 1 hub")

pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-top-level-hub
# Attendu : passing (dont la nouvelle "non-empty hub-group")

pnpm --filter @atconseil/regression-suite test
# Attendu : 25 + 1 (T-1.0) = 26 passing total
```

Si l'un fail, STOP, ne pas continuer.

---

## Etape 3 — Refactor `App.tsx`

### 3.1 — Lire `apps/argos-extension/src/hub/App.tsx` pour comprendre la structure actuelle

```powershell
Get-Content apps\argos-extension\src\hub\App.tsx
```

Comprendre :
- Comment le state actuel `[currentSection, setCurrentSection]` est gere
- Quels composants rendent le menu interne (probablement quelque chose comme `<HubNav onChange={setCurrentSection} />`)
- Quels sont les `data-testid` actuels des views

### 3.2 — Reporter a l'utilisateur

Avant tout refactor structurant, presenter :
- Le code actuel relevant (lignes du state + lignes du menu interne)
- Le code cible apres refactor
- La liste des composants/lignes a supprimer

Attendre validation explicite.

### 3.3 — Appliquer le refactor

- Ajouter le `CONTRIBUTION_ID_TO_SECTION` mapping + `resolveSection()` helper
- Modifier le useEffect d'init pour faire `SDK.init().then(() => setSection(resolveSection(SDK.getContributionId())))`
- Supprimer le menu interne (composants nav internes)
- Conserver le switch-case sur `section` qui rend les views

⚠ **Ne PAS toucher** aux composants `<PlansView />`, `<CasesView />`, etc. — ils sont hors scope Sprint 4.

⚠ **STOP si** tu identifies du code qui ne semble pas etre "juste de la nav" : un menu d'actions globales, un breadcrumb, un user menu, etc. Demande avant de supprimer.

### 3.4 — Verifier les data-testid

Les 6 views doivent avoir des `data-testid="view-<section>"` pour les tests applicatifs :
- PlansView : `data-testid="view-plans"`
- CasesView : `data-testid="view-cases"`
- SetsView : `data-testid="view-sets"`
- PreconditionsView : `data-testid="view-preconditions"`
- ReportsView : `data-testid="view-reports"`
- SettingsView : `data-testid="view-settings"`

Si certains manquent, ajouter (changement mineur, juste un attribut HTML).

### 3.5 — Creer/mettre a jour le test applicatif

Voir "Modification 3" pour le contenu du `apps/argos-extension/src/hub/App.test.tsx`. Ce test n'est PAS dans `tools/regression/` (test applicatif, pas regression), donc dans `apps/argos-extension/`.

Si un test App.test.tsx existait deja, le mettre a jour avec ces mocks. Sinon le creer.

```powershell
pnpm --filter argos-extension test
# Attendu : tests passing, dont les 7 nouveaux (6 sections + 1 fallback)
```

---

## Etape 4 — Bump versions (Changesets)

```powershell
pnpm changeset
# Type : minor
# Description : "Multi-hubs architecture matching Test Plans native pattern"

pnpm changeset version
# Bump 0.3.5 → 0.4.0
```

Validation :
```powershell
Select-String -Path apps\argos-extension\package.json -Pattern '"version"'
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"version"'
# Attendu : "version": "0.4.0"
```

---

## Etape 5 — REGISTRY + Constitution + CHANGELOG

### 5.1 — REGISTRY

Voir "Modification 7".

### 5.2 — Constitution

Voir "Modification 8". Bump v0.4.3 → v0.5.0.

### 5.3 — CHANGELOG

Voir "Modification 9". Section `[0.4.0]`.

### 5.4 — overview.md / README.md

Workflow REPORTING (cf. "Modification 10"). Si occurrences, presenter contexte, attendre validation, appliquer.

---

## Etape 6 — Validation complete

```powershell
# Tests regression
pnpm --filter @atconseil/regression-suite test
# Attendu : 26 passing (25 anciens + 1 nouveau T-1.0)
# Detail : T-0.9 reste a 6 assertions (1 modifiee), CFG-top-level-hub passe a 6 assertions (1 ajoutee), T-1.0 = 8 assertions

# Tests applicatifs
pnpm --filter argos-extension test
# Attendu : tous passing dont 7 nouveaux sur App.tsx

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.

# Lint + typecheck + tous tests apps
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# Self-check : pas de hub singulier residuel
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"id"\s*:\s*"argos-hub"' -SimpleMatch
# Attendu : 0 ligne (le hub singulier doit etre supprime ; les hubs nommes argos-hub-plans, argos-hub-cases ne matchent pas le pattern exact)

# Self-check : les 6 hubs presents
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"id"\s*:\s*"argos-hub-(plans|cases|sets|preconditions|reports|settings)"'
# Attendu : 6 lignes

# Self-check : Sprint 3.4 architecture preservee
Select-String -Path apps\argos-extension\vss-extension.json -Pattern "argos-hub-group" -SimpleMatch
# Attendu : presence argos-hub-group

# Self-check : Sprint 3.1 publisher preserve
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"publisher"'
# Attendu : "publisher": "AlexThibaud"

# Self-check : Sprint 3.2 visibility preserve (pas de "public": false)
Select-String -Path apps\argos-extension\vss-extension.json -Pattern '"public"\s*:\s*false'
# Attendu : 0 ligne

# Self-check : Sprint 3 no-xray preserve
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-no-xray-references
# Attendu : 2 passing

# Self-check : workspaces @atconseil/* preserves
Select-String -Path packages,apps -Recurse -Include package.json -Pattern "@atconseil/" `
  | Select-Object -First 5
# Attendu : presence

# Self-check anti-regression historique
Select-String -Path apps,packages -Recurse -Include *.json,*.md,*.ts,*.tsx -Pattern "\bgpt-4\.1\b" `
  | Where-Object { $_.Path -notmatch "node_modules|claude-prompts|REGISTRY|CHANGELOG" }
# Attendu : 0 ligne
```

---

## Etape 7 — Build + Package + Upload manuel

### 7.1 — Build

```powershell
pnpm --filter argos-extension build
```

### 7.2 — Package VSIX

```powershell
cd apps\argos-extension
npx tfx extension create --manifest-globs vss-extension.json --output-path ../../dist/argos.vsix
cd ..\..
```

Doit afficher :
```
- VSIX: ...\dist\argos.vsix
- Extension ID: ArgosTesting
- Extension Version: 0.4.0
- Publisher: AlexThibaud
```

### 7.3 — Inspection rapide

```powershell
Copy-Item dist\argos.vsix dist\argos-test.zip -Force
Expand-Archive dist\argos-test.zip -DestinationPath dist\argos-test-content -Force

# Verifier version
Get-Content dist\argos-test-content\extension.vsixmanifest | Select-String -Pattern "Version=|Publisher="
# Attendu : Version="0.4.0" Publisher="AlexThibaud"

# Listing rapide (pas de SVG)
Get-ChildItem dist\argos-test-content\static\ | Select-Object Name
# Attendu : argos-hub.png, marketplace-banner.png, marketplace-icon.png

Remove-Item dist\argos-test.zip, dist\argos-test-content -Recurse -Force
```

### 7.4 — Upload manuel depuis le portail

1. https://marketplace.visualstudio.com/manage/publishers/AlexThibaud
2. Click sur `ArgosTesting`
3. "..." → "Update" / "New version"
4. Upload `dist\argos.vsix` (0.4.0)
5. Attendre "Validated"
6. Reload page projet BCEE-QA
7. **Verifier** : nav Argos top-level → click → sous-menu native ADO avec 6 hubs (Test Plans / Test Cases / Test Sets / Preconditions / Reports / Settings) chacun avec son icone Fluent UI
8. **Verifier** : click sur chaque hub → la view correspondante s'affiche

Si l'un fail (un hub absent, icone manquante, mauvaise view rendue), STOP, capture, on debug.

---

## Etape 8 — Archive prompt + commit

### 8.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_sprint-4.md", "$HOME\Downloads\CLAUDE_TASK_sprint-4.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_sprint-4.md
    Write-Host "OK Prompt archive"
}
```

### 8.2 — Allowlister si necessaire

Tester :
```powershell
pnpm --filter @atconseil/regression-suite test
# Si 26 passing -> prompt archive OK (deja couvert par allowlist ou pas de match interdit)
# Si fail sur prompt archive -> ajouter dans allowlist.ts + .cjs :
#   "tools/claude-prompts/CLAUDE_TASK_sprint-4.md"
```

### 8.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "feat(extension): multi-hubs architecture matching Test Plans native pattern (Sprint 4)" `
  -m "" `
  -m "Architecture refactor: single argos-hub -> 6 internal hubs targeting" `
  -m ".argos-hub-group via relative reference. Visual parity with native" `
  -m "Test Plans navigation pattern." `
  -m "" `
  -m "6 hubs added (replacing legacy argos-hub):" `
  -m "- argos-hub-plans         (Test Plans, BulletedList icon)" `
  -m "- argos-hub-cases         (Test Cases, TestBeaker icon)" `
  -m "- argos-hub-sets          (Test Sets, FolderList icon)" `
  -m "- argos-hub-preconditions (Preconditions, Important icon)" `
  -m "- argos-hub-reports       (Reports, ReportDocument icon)" `
  -m "- argos-hub-settings      (Settings, Settings icon)" `
  -m "" `
  -m "App.tsx refactor:" `
  -m "- Section derived from SDK.getContributionId() at mount" `
  -m "- Internal navigation menu removed (ADO renders nav natively)" `
  -m "- Switch-case rendering preserved (PlansView / CasesView / etc.)" `
  -m "" `
  -m "Tests:" `
  -m "- New T-1.0-argos-multi-hubs-architecture (UX-decision, 8 assertions)" `
  -m "- T-0.9 updated: assertion on legacy argos-hub removed, replaced by" `
  -m "  'at least one hub targets .argos-hub-group'" `
  -m "- CFG-top-level-hub: new assertion 'non-empty hub-group'" `
  -m "- App.test.tsx: 7 new tests (6 sections + fallback)" `
  -m "" `
  -m "Out of scope (preserved):" `
  -m "- Sprint 3.4 argos-hub-group (hub-group inchange)" `
  -m "- Sprint 3.1 publisher AlexThibaud" `
  -m "- Sprint 3.2 visibility public" `
  -m "- Sprint 3 no-xray-references, banniere, Test Plans category" `
  -m "- Views content (PlansView, CasesView, etc. inchanges)" `
  -m "" `
  -m "Bump 0.3.5 -> 0.4.0 (minor: structural UX change)" `
  -m "Constitution v0.4.3 -> v0.5.0" `
  -m "" `
  -m "Backlog: TECH-DEBT-013 RESOLVED by this sprint." `
  -m "" `
  -m "Refs: Microsoft docs add-hub, getContributionId SDK"

git push -u origin feat/multi-hubs-architecture
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `feat/multi-hubs-architecture` creee depuis main a jour
- [ ] Test T-1.0 cree (8 assertions, source ASCII)
- [ ] Allowlists ts/cjs synchronisees pour T-1.0
- [ ] T-0.9 mis a jour (1 assertion modifiee, en-tete historique enrichi Sprint 4)
- [ ] CFG-2026-05-10-top-level-hub mis a jour (1 nouvelle assertion non-empty)
- [ ] Manifest : 6 hubs ajoutes, argos-hub singulier supprime, version 0.4.0
- [ ] **Aucune autre modification du manifest** (publisher, id, scopes, categories, hub-group, coverage-panel intacts)
- [ ] App.tsx refactore : getContributionId + suppression menu interne
- [ ] data-testid coherents sur les 6 views
- [ ] App.test.tsx : 7 nouveaux tests applicatifs
- [ ] Versions package.json bumpees a 0.4.0
- [ ] REGISTRY : nouvelle entree T-1.0 + entrees T-0.9 et CFG enrichies
- [ ] CHANGELOG.md `[0.4.0]` cree
- [ ] Constitution v0.4.3 → v0.5.0
- [ ] `pnpm --filter @atconseil/regression-suite test` → 26 passing
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts
- [ ] Self-check Sprint 3.4 (argos-hub-group) preserve
- [ ] Self-check Sprint 3.1 / 3.2 / 3 preserves
- [ ] Self-check anti-regression historique
- [ ] Prompt archive dans `tools/claude-prompts/CLAUDE_TASK_sprint-4.md`
- [ ] Build OK + VSIX 0.4.0 + inspection sans SVG
- [ ] Commit Conventional Commits, PR ouverte

Apres merge :
- [ ] Upload manuel VSIX 0.4.0 depuis portail
- [ ] Validation Marketplace
- [ ] Reload BCEE-QA
- [ ] **Verification visuelle** : 6 hubs natifs sous Argos avec icones, style identique a Test Plans
- [ ] **Verification fonctionnelle** : click sur chaque hub rend la bonne view

---

## Garde-fous Sprint 4

⚠ **Le risque #1 = casser le routage**
- Le mapping `CONTRIBUTION_ID_TO_SECTION` doit etre EXACT. Le publisher est `AlexThibaud`, l'extension est `ArgosTesting` (note : PascalCase, pas kebab-case).
- Format full ID : `AlexThibaud.ArgosTesting.argos-hub-plans` (case-sensitive).
- Si le mapping est faux, tous les hubs tomberont sur le fallback (Plans).

⚠ **Le risque #2 = supprimer trop de code dans App.tsx**
- Le menu interne disparait, OK
- MAIS si App.tsx contient autre chose que la nav (breadcrumb, user info, global actions), garder
- Reporter a l'utilisateur avant de supprimer du code dont la fonction n'est pas claire

⚠ **Le risque #3 = scope creep vers les views**
- Sprint 4 ne touche PAS aux composants `<PlansView />`, `<CasesView />`, etc.
- Tentation : "tant qu'on touche App.tsx, on cleane aussi les views". NON. Sprint dedie (Sprint 2.5b).

⚠ **Le risque #4 = mauvais iconName**
- Microsoft ne documente pas la liste exhaustive des iconName valides
- Les valeurs choisies (BulletedList, TestBeaker, FolderList, Important, ReportDocument, Settings) sont raisonnables mais a iterer visuellement
- Si une icone n'apparait pas en BCEE-QA apres deploy, ce n'est pas un fail Sprint 4 — c'est un iconName invalide qui se remplace dans un mini-PR ulterieur

⚠ **Le risque #5 = oublier de retirer le menu interne**
- Si on garde le menu interne ET les hubs natifs ADO : double-nav, laid, confusant
- Self-check etape 6 a verifier visuellement post-deploy

⚠ **Le risque #6 = mojibake commit message PowerShell**
- Tag eventuel : message **ASCII-only**

---

## Si le sous-menu ADO n'apparait pas apres deploy

1. **Reload page projet** (Ctrl+F5 pour hard reload, ADO cache les contributions)
2. **Reinstaller l'extension** dans BCEE-QA (parfois ADO ne re-scan pas les nouvelles contributions)
3. **F12 console** : chercher erreurs sur contribution IDs, 404 sur uri
4. **Inspecter le VSIX uploade** : confirmer que les 6 contributions sont bien dans le manifest packagé

Si apres ces 4 etapes le sous-menu reste invisible, STOP, screenshot + console errors, debug ensemble.

---

Quand les 6 hubs sont visibles dans la nav ADO avec leurs icones, et que chaque click rend la bonne view, dis-le-moi. **Sprint 4 = victoire visuelle majeure.**
