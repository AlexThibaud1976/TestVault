# Prompt Claude Code — mini-Sprint Marketplace Privé (`feat/marketplace-private`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_marketplace-private.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage.
> Règles TDD/commits/spec-kit/non-régression et **règle d'encoding (Set-Content PS interdit, source ASCII-only pour tools/regression/)** déjà chargées.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, TECH-DEBT-001 mergé
- [ ] `pnpm --filter @atconseil/regression-suite test` → 9 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 file. CLEAN.
- [ ] `pnpm turbo lint && pnpm turbo typecheck && pnpm turbo test` → tous verts

Si l'un échoue → STOP.

---

## Contexte

Décision utilisateur 2026-05-10 : **Argos sera publiée sur le Marketplace Visual Studio en mode "private"**, accessible uniquement à l'organisation Azure DevOps `bcee-qa`.

**Justification** : Argos est un outil interne de l'organisation BCEE-QA. Pas d'usage public envisagé à ce stade. Garder l'option de basculer en public ultérieurement (commercialisation).

**Mécanisme Microsoft** : selon la doc officielle Marketplace ADO 2026 ([learn.microsoft.com](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest)), il faut ajouter `"public": false` au top-level du `vss-extension.json`. Par défaut, toutes les extensions sont privées (visible uniquement par le publisher et les organisations explicitement partagées). Le partage à `bcee-qa` se fera ensuite via le portail publisher au moment de la première publication (étape future, pas dans ce sprint).

**Note technique** : il existe aussi un attribut historique `"galleryFlags": ["Private"]` (ancienne syntaxe). La doc officielle 2026 utilise `"public": false`. On adopte la syntaxe moderne mais on documente la prudence dans le commit message.

**Périmètre Sprint** : strictement minimal — un seul fichier modifié (`vss-extension.json`), un test régression pour empêcher la régression vers public, doc associée. Pas de modif fonctionnelle du code.

---

## Objectif

Sur une nouvelle branche `feat/marketplace-private`, livrer une PR qui :

1. Ajoute `"public": false` au `vss-extension.json` (zéro autre modif sur ce fichier)
2. Ajoute un test régression `CFG-2026-05-10-marketplace-private.test.ts` (zero-tolerance sur la valeur)
3. Documente dans le CHANGELOG, REGISTRY, CLAUDE.md (note méthodologique sur la stratégie de distribution)
4. Tous les tests passent + sanity inverse vérifié

---

## Étape 1 — Test-first : créer le test régression (ROUGE attendu)

⚠ **Source 100% ASCII** (cf. CLAUDE.md "Encoding rules").

### 1.1 — Créer `tools/regression/CFG-2026-05-10-marketplace-private.test.ts`

```typescript
/**
 * Test regression : CFG-2026-05-10-marketplace-private
 *
 * Context
 * -------
 * User decision 2026-05-10: Argos is published as a PRIVATE Marketplace extension,
 * accessible only to the bcee-qa Azure DevOps organization (and any other org
 * explicitly shared with via the publisher portal).
 *
 * This test is a zero-tolerance guard against accidental public exposure: if
 * vss-extension.json's "public" field is missing, true, or anything other than
 * the literal boolean false, the test fails.
 *
 * Microsoft official syntax (2026 docs): top-level "public": false.
 * Legacy "galleryFlags": ["Private"] is also accepted by tfx-cli but the modern
 * docs use "public" — we adopt the modern syntax.
 *
 * Why this matters: a single accidental edit of "public": true (or removal of the
 * field, since the default in some legacy contexts was public-by-default) could
 * publish the extension to the entire Marketplace audience. Catastrophic privacy
 * leak.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");

interface Manifest {
	public?: boolean;
	galleryFlags?: string[];
	[k: string]: unknown;
}

describe("CFG-2026-05-10 marketplace-private guard", () => {
	it("vss-extension.json must explicitly set public: false", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.public).toBe(false);
	});

	it("vss-extension.json must NOT set public: true under any circumstance", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		expect(parsed.public).not.toBe(true);
	});

	it("if galleryFlags is present, it must NOT contain Public", () => {
		const raw = readFileSync(MANIFEST_PATH, "utf8");
		const parsed: Manifest = JSON.parse(raw);
		if (parsed.galleryFlags) {
			expect(parsed.galleryFlags).not.toContain("Public");
		}
	});
});
```

### 1.2 — Allowlister le nouveau test

Ajouter `"tools/regression/CFG-2026-05-10-marketplace-private.test.ts"` au `SHARED_DOC_ALLOWLIST` dans **les deux** fichiers :
- `tools/regression/allowlist.ts`
- `tools/regression/allowlist.cjs`

⚠ Si l'un des 2 est oublié, le test cross-check `allowlist.test.ts` va fail. C'est volontaire (filet de sécurité).

### 1.3 — Lancer les tests : doivent fail

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-private
```

**Attendu** : 3 tests fail (manifest n'a pas encore `"public": false`).

Confirme à l'utilisateur que tu vois les fails attendus avant de continuer.

### 1.4 — Biome check

```powershell
npx biome check tools/regression/CFG-2026-05-10-marketplace-private.test.ts
# Attendu : Found 0 errors
```

Si erreurs : `--write` puis re-vérifier.

---

## Étape 2 — Modifier `vss-extension.json`

### 2.1 — Ajouter `"public": false`

Localiser le fichier et ajouter le champ après `"version"` (ou tout autre emplacement top-level cohérent) :

```diff
  {
    "manifestVersion": 1,
    "id": "argos",
    "publisher": "ATConseil",
    "version": "0.2.0",
+   "public": false,
    "name": "Argos",
    ...
  }
```

⚠ **Édition obligatoire via Claude Code natif** (str_replace, edit_file). **JAMAIS** Set-Content PS.

### 2.2 — Vérifier le JSON

```powershell
node -e "const m = JSON.parse(require('fs').readFileSync('apps/argos-extension/vss-extension.json', 'utf8')); console.log('public:', m.public); console.log('galleryFlags:', m.galleryFlags || '(none)');"
# Attendu :
#   public: false
#   galleryFlags: (none)
```

### 2.3 — Tests régression doivent passer maintenant

```powershell
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-private
# Attendu : 3 passing
```

---

## Étape 3 — Documentation

### 3.1 — REGISTRY

Ajouter une entrée dans `tools/regression/REGISTRY.md` :

```markdown
| CFG-2026-05-10-marketplace-private | 2026-05-10 | Configuration | marketplace-private | Empêche que `vss-extension.json` soit accidentellement publié en mode public. Décision Sprint 2026-05-10 : Argos est privée, accessible uniquement à l'org `bcee-qa`. | vss-extension.json `public` field | AT |
```

### 3.2 — CHANGELOG

Sous `[Unreleased]` :

```markdown
### Added (mini-Sprint Marketplace Private — 2026-05-10 — feat/marketplace-private)

- **`vss-extension.json` flag `"public": false`** : l'extension Argos est publiée sur le Marketplace en mode privé. Accessible uniquement à l'organisation Azure DevOps `bcee-qa` (à partager via portail publisher au moment de la première publication).
- **Test régression `CFG-2026-05-10-marketplace-private`** : 3 assertions zero-tolerance (public === false, public !== true, galleryFlags ne contient pas "Public").
- **Justification** : Argos est un outil interne BCEE-QA pour l'instant. Bascule vers public possible ultérieurement (commercialisation), nécessitera de retirer `"public": false` ET de mettre à jour le test régression (changement de stratégie produit explicite, pas un accident).
```

### 3.3 — `CLAUDE.md` racine

Ajouter une section :

```markdown
## Marketplace publication strategy

L'extension Argos est publiée sur le Marketplace Visual Studio en mode **privé**.

### Configuration

- `apps/argos-extension/vss-extension.json` contient `"public": false` (top-level)
- Distribution accessible uniquement aux organisations Azure DevOps explicitement partagées via le portail Marketplace publisher
- Organisation cible actuelle : `bcee-qa`

### Workflow de publication (à exécuter manuellement par AT)

1. Build le VSIX : `pnpm --filter argos-extension build` (ou équivalent)
2. Package : `tfx extension create --manifest-globs vss-extension.json`
3. Publier : `tfx extension publish --vsix <fichier.vsix> --token <PAT>`
4. Aller sur https://marketplace.visualstudio.com/manage/publishers/ATConseil
5. Cliquer "Share/Unshare" sur l'extension Argos
6. Ajouter l'organisation `bcee-qa` dans la liste des partages

### Garde-fou anti-régression

Le test `tools/regression/CFG-2026-05-10-marketplace-private.test.ts` empêche que `"public": false` disparaisse silencieusement. **Pour passer en public** (décision produit explicite à l'avenir) : retirer le champ + retirer/désactiver ce test régression dans la même PR, avec justification dans le commit message.
```

---

## Étape 4 — Validation complète

```powershell
# 1. Tous les tests régression — 12 passing attendus (9 + 3 nouveaux)
pnpm --filter @atconseil/regression-suite test
# Attendu : 12 passing

# 2. Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file. CLEAN.

# 3. Lint + typecheck + apps tests
pnpm turbo lint
pnpm turbo typecheck
pnpm turbo test
# Tous verts

# 4. Manifest valide
node -e "JSON.parse(require('fs').readFileSync('apps/argos-extension/vss-extension.json', 'utf8'))"
# Pas d'erreur

# 5. Sanity inverse — passer public à true doit faire fail le test
$manifest = Get-Content apps\argos-extension\vss-extension.json -Raw
$manifestModified = $manifest -replace '"public":\s*false', '"public": true'
[IO.File]::WriteAllText("$PWD\apps\argos-extension\vss-extension.json", $manifestModified, [Text.UTF8Encoding]::new($false))
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-private
# Attendu : 2 fail (sur les 3 assertions, 1 reste passant grâce à galleryFlags absent)

# Restaurer
[IO.File]::WriteAllText("$PWD\apps\argos-extension\vss-extension.json", $manifest, [Text.UTF8Encoding]::new($false))
pnpm --filter @atconseil/regression-suite test CFG-2026-05-10-marketplace-private
# Attendu : 3 passing
```

---

## Étape 5 — Archive du prompt + commit

### 5.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_marketplace-private.md", "$HOME\Downloads\CLAUDE_TASK_marketplace-private.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_marketplace-private.md
}
```

### 5.2 — Allowlister le prompt archivé

Ajouter `"tools/claude-prompts/CLAUDE_TASK_marketplace-private.md"` dans **les 2** allowlists (`allowlist.ts` ET `allowlist.cjs`).

⚠ Si tu oublies l'un des 2 → cross-check fail. Filet de sécurité TECH-DEBT-001.

Re-vérifier après ajout :

```powershell
pnpm --filter @atconseil/regression-suite test allowlist
# Attendu : 1 passing (cross-check OK)
```

### 5.3 — Commit

```powershell
git add -A
git status

git commit `
  -m "feat(marketplace): publish Argos as private extension (bcee-qa only)" `
  -m "" `
  -m "- vss-extension.json: add public: false (modern Microsoft syntax 2026)" `
  -m "- Add CFG-2026-05-10-marketplace-private regression test (3 assertions, zero-tolerance)" `
  -m "- CLAUDE.md: Marketplace publication strategy section" `
  -m "- CHANGELOG, REGISTRY updated" `
  -m "" `
  -m "Argos is internal to BCEE-QA. Going public will require explicit decision +" `
  -m "removal of public: false + update of regression test in same PR." `
  -m "" `
  -m "Refs: user decision 2026-05-10"

git push -u origin feat/marketplace-private
```

Puis ouvrir la PR.

---

## Critères de done

- [ ] Branche `feat/marketplace-private` créée depuis `main` à jour
- [ ] `vss-extension.json` : `"public": false` ajouté au top-level
- [ ] `tools/regression/CFG-2026-05-10-marketplace-private.test.ts` créé, source ASCII, biome-clean
- [ ] Allowlists `allowlist.ts` ET `allowlist.cjs` mises à jour (pour le test ET le prompt archivé)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 12 passing
- [ ] Sanity inverse vérifié (public: true → 2 fails ; restauration → 3 passing)
- [ ] `pnpm turbo test`, `turbo lint`, `turbo typecheck` → tous verts
- [ ] `CLAUDE.md` racine : section "Marketplace publication strategy"
- [ ] CHANGELOG, REGISTRY mis à jour
- [ ] Commit Conventional Commits, PR ouverte

---

## Garde-fous

⚠ **Pas de scope creep** : ce mini-sprint touche UNIQUEMENT la privacy Marketplace. Pas de bump version. Pas de modif d'icône. Pas de tasks.md update.

⚠ **`public: false` est une décision produit, pas technique** : le test régression empêche son retrait silencieux. Pour basculer public à l'avenir : décision explicite + commit dédié + update du test, **pas un side-effect d'un autre changement**.

⚠ **Si tu trouves d'autres fichiers où le mot "public" apparaît au sens Marketplace** (ex: dans la doc, README, etc.), signale-les avant de modifier. Le test régression actuel ne couvre QUE le manifest — étendre la couverture est une décision séparée.

---

## Notes pour la première publication réelle

(Ne fait PAS partie de ce sprint, mais pour mémoire)

Quand AT décidera de publier Argos pour la première fois sur le Marketplace, il devra :

1. Créer un PAT Azure DevOps avec le scope "Marketplace (publish)"
2. Installer tfx-cli : `npm install -g tfx-cli`
3. Build + package + publish (cf. section dans CLAUDE.md)
4. Aller sur https://marketplace.visualstudio.com/manage/publishers/ATConseil
5. Cliquer sur Argos → ⋯ → "Share/Unshare"
6. Ajouter `bcee-qa` (slug exact, pas le nom affiché)
7. Vérifier dans BCEE-QA → Organization Settings → Extensions que Argos apparaît bien

---

Quand 12/12 tests passing + sanity inverse OK + tous tests applicatifs verts, dis-le-moi. Sprint 2.5a (wiring composants core : Plans, Cases, Sets) pourra alors démarrer.
