# Prompt Claude Code — Sprint 1 (`fix/llm-models-deprecation`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-1.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage — les règles TDD, conventional commits, spec-kit, doc-lockstep, non-régression sont donc déjà chargées et n'ont pas besoin d'être répétées ici.

---

## Contexte

Audit du **2026-05-09** a identifié que `gpt-4.1` est cité comme modèle exemple/par défaut dans la spec-kit, alors qu'il est :

- Retiré de Microsoft Foundry depuis le **11 avril 2026** (auto-upgrade Standard depuis le 9 mars 2026)
- Retiré de ChatGPT le 13 février 2026
- Shutdown final API OpenAI direct prévu le 14 octobre 2026

→ La case `[x] modèles LLM par défaut actifs au 2026-05-08 ✓` de la constitution §11 était **factuellement fausse** au moment de son cochage.

**Décision utilisateur (2026-05-09)** : remplacer toutes les occurrences `gpt-4.1` par `gpt-5.2` (le plus récent, recommandé OpenAI pour creative use cases comme la génération de test cases).

**Périmètre Sprint 1** : strictement documentaire (4 occurrences en spec-kit) + nouveau package `tools/regression/` qui empêche la réintroduction. **Aucune modif de code applicatif** (le code est BYOM, c'est le client qui choisit son `modelId` au runtime).

---

## Objectif

Sur une nouvelle branche `fix/llm-models-deprecation`, livrer une PR qui :

1. Remplace `gpt-4.1` par `gpt-5.2` dans `Specs/constitution.md` et `Specs/spec.md`
2. Crée le package `tools/regression/` avec un test nommé qui empêche la réintroduction
3. Met à jour `CHANGELOG.md` sous `[Unreleased]`
4. Fait passer tous les tests existants + le nouveau test régression

---

## Étape 0 — Sanity check de l'environnement

Avant toute modification, vérifie :

- Tu es sur la branche `main` à jour
- `pnpm install` passe
- `pnpm turbo test` passe en l'état (baseline avant modifs)
- Compte les occurrences à modifier :
  ```bash
  grep -rnE '\bgpt-4\.1\b' Specs/ docs/ apps/ packages/ tools/ --include='*.md' --include='*.ts' --include='*.tsx' --include='*.json' --include='*.yaml'
  ```
  **Attendu : exactement 4 occurrences** :
  - `Specs/constitution.md:118`
  - `Specs/constitution.md:342`
  - `Specs/spec.md:443`
  - `Specs/spec.md:896`

  Si tu en trouves un nombre différent, **STOP** et signale-le-moi avant de continuer.

---

## Étape 1 — Test-first : écrire le test régression AVANT les modifs

Crée le package `tools/regression/` avec ces 4 fichiers :

### `tools/regression/package.json`

```json
{
	"name": "@atconseil/regression-suite",
	"version": "0.1.0",
	"private": true,
	"type": "module",
	"scripts": {
		"test": "vitest run",
		"typecheck": "tsc --noEmit"
	},
	"devDependencies": {
		"@types/node": "^22.0.0",
		"typescript": "^5.7.0",
		"vitest": "^3.1.0"
	}
}
```

### `tools/regression/tsconfig.json`

```json
{
	"extends": "../../tsconfig.base.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "."
	},
	"include": ["**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

### `tools/regression/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
		testTimeout: 30_000,
		include: ["**/*.test.ts"],
	},
});
```

### `tools/regression/REGISTRY.md`

Crée un index avec une seule entrée pour démarrer (tableau à 7 colonnes : `ID`, `Date ajout`, `Type`, `Slug`, `Protège quoi`, `Référence`, `Auteur`). Première ligne :

```
| LLM-2026-05-09 | 2026-05-09 | LLM-lifecycle | gpt41-deprecation | Aucune réintroduction de `gpt-4.1` dans code/spec-kit/docs ; ce modèle a été retiré de Microsoft Foundry le 2026-04-11. Successeur retenu : `gpt-5.2`. | constitution.md §3.2.1, §11 / spec.md §generate-test-cases, §settings-wireframe | AT |
```

Ajoute en tête une intro qui rappelle :
- La convention de nommage `<TYPE>-<DATE-OU-TASK>-<short-slug>` avec les types `T-X.Y`, `BUG-`, `CFG-`, `LLM-`, `SEC-`, `UX-`
- Que cette suite respecte la règle constitution §10 *"Test de non-régression nommé pour chaque bug confirmé"*
- Une section "Tests retirés" vide (à remplir au cas par cas)

### `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts`

Test vitest avec :
- Un en-tête JSDoc structuré documentant l'historique (Microsoft Foundry retirement 2026-04-11, décision utilisateur 2026-05-09 → `gpt-5.2`), le périmètre du test (allowlist de fichiers où `gpt-4.1` peut apparaître pour raisons historiques), et l'avertissement *"Ne PAS supprimer sans nouvelle décision spec-kit"*
- Un import `fs`, `path`, `node:url` pour scanner le repo depuis `tools/regression/` (remonte 2 niveaux via `import.meta.url`)
- Un set `SCAN_EXTENSIONS` = `.md, .ts, .tsx, .js, .jsx, .json, .yaml, .yml`
- Un set `EXCLUDED_DIRS` = `node_modules, .git, dist, build, coverage, .turbo, .pnpm-store, _archive`
- Un set `ALLOWED_FILES` = `CHANGELOG.md`, `tools/regression/REGISTRY.md`, `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts`
- Une regex `FORBIDDEN_PATTERN = /\bgpt-4\.1(?:-mini|-nano)?\b/g` (word boundary + variantes mini/nano)
- Un walker récursif qui scan les fichiers et collecte les matches `{file, line, content}`
- Deux tests :
  1. `must not contain any reference to gpt-4.1 outside CHANGELOG/REGISTRY/this test` : `expect(matches).toHaveLength(0)`. Si fail, throw une `Error` avec un message lisible qui liste fichier:ligne:contenu et propose `gpt-5/5.1/5.2` comme remplacement
  2. `must verify the test itself can find the pattern (sanity check)` : valide que la regex match `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano` mais PAS `gpt-4.10`, `gpt-5.2`, `claude-opus-4-7`

**Lance le test : il DOIT échouer maintenant** (les 4 occurrences sont encore là). C'est le rouge du TDD. Confirme-moi que tu vois bien 4 matches avant de passer à l'étape 2.

---

## Étape 2 — Modifications spec-kit

### `Specs/constitution.md` ligne 118

```diff
- - Choix du modèle (claude-opus-4-7, claude-sonnet-4-6, gpt-4.1, etc.)
+ - Choix du modèle (claude-opus-4-7, claude-sonnet-4-6, gpt-5.2, etc.)
```

### `Specs/constitution.md` ligne 342 (release checklist §11)

⚠ **Attention** : la note explicative finale ne doit PAS contenir le terme `gpt-4.1` littéral, sinon ton propre test régression va échouer (sauf si tu mets cette ligne dans l'allowlist, mais c'est moins propre — préfère reformuler).

```diff
- - [x] Vérification que les modèles LLM par défaut sont supportés — modèles en code : `claude-sonnet-4-6`, `claude-haiku-4-5`, `gpt-4.1` ; actifs au 2026-05-08 ✓
+ - [x] Vérification que les modèles LLM par défaut sont supportés — modèles cités dans la doc : `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gpt-5.2` ; tous actifs au 2026-05-09 ✓ (mise à jour suite à retraite du modèle OpenAI précédemment cité, retiré de Microsoft Foundry le 11 avril 2026 ; cf. test régression `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts` et CHANGELOG `[Unreleased]`)
```

### `Specs/spec.md` ligne 443

```diff
- **Entrées :** Work Item ADO source (User Story, Feature, Bug). System prompt configuré par l'Admin. Modèle configuré (claude-opus-4-7, gpt-4.1, etc.). Paramètres : ...
+ **Entrées :** Work Item ADO source (User Story, Feature, Bug). System prompt configuré par l'Admin. Modèle configuré (claude-opus-4-7, gpt-5.2, etc.). Paramètres : ...
```

### `Specs/spec.md` ligne 896 (wireframe ASCII)

⚠ Garde l'alignement de l'art ASCII — `gpt-4.1` et `gpt-5.2` font 7 caractères, les barres `│` doivent rester alignées.

```diff
- │  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-4.1 ▾]      │
+ │  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-5.2 ▾]      │
```

---

## Étape 3 — CHANGELOG

Sous la section `## [Unreleased]` existante, **remplace** la ligne `- (post-0.1.1 work tracked here)` par :

```markdown
### Fixed (Sprint 1 — 2026-05-09 — fix/llm-models-deprecation)

- **Modèles LLM dépréciés dans la doc** : remplacement de toutes les références à `gpt-4.1` par `gpt-5.2` dans `Specs/constitution.md` (§3.2.1 et §11) et `Specs/spec.md` (description feature TC generation et wireframe Settings). `gpt-4.1` a été retiré de Microsoft Foundry le 2026-04-11 ; la case checklist §11 cochée "actifs au 2026-05-08 ✓" était factuellement fausse à la date où elle a été cochée.
- **Date de validation checklist §11** corrigée : 2026-05-08 → 2026-05-09 avec note explicative.

### Added (Sprint 1)

- **Suite de tests de non-régression** dans `tools/regression/` :
  - Premier test : `LLM-2026-05-09-gpt41-deprecation.test.ts` (scan du repo, échoue si `gpt-4.1` est réintroduit)
  - `tools/regression/REGISTRY.md` — registry des tests régression nommés (cf. constitution §10 "test de non-régression nommé pour chaque bug confirmé")
  - Convention de nommage : `<TYPE>-<DATE-OU-TASK>-<short-slug>`

- (post-Sprint-1 work tracked here)
```

`CHANGELOG.md` est dans l'allowlist du test régression — la mention `gpt-4.1` ici reste autorisée.

---

## Étape 4 — Validation

```bash
# Le test régression DOIT passer maintenant (vert)
pnpm install
pnpm --filter @atconseil/regression-suite test

# Tous les tests existants doivent rester verts (pas d'impact)
pnpm turbo test

# Lint + typecheck
pnpm turbo lint
pnpm turbo typecheck

# Aucune occurrence gpt-4.1 hors allowlist
grep -rnE '\bgpt-4\.1\b' Specs/ docs/ apps/ packages/ \
  --include='*.md' --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules
# Attendu : 0 résultat (CHANGELOG.md et tools/regression/ ne sont pas dans le grep)
```

Sanity check inverse (optionnel mais recommandé) :

```bash
# Réintroduire gpt-4.1 quelque part de manière temporaire
echo "Use gpt-4.1 model" >> Specs/spec.md

# Le test doit FAIL avec un message clair pointant la ligne
pnpm --filter @atconseil/regression-suite test
# Attendu : 1 failed, message mentionne Specs/spec.md:XXX

# Retirer la réintroduction
sed -i '/Use gpt-4.1 model/d' Specs/spec.md

# Le test repasse vert
pnpm --filter @atconseil/regression-suite test
```

---

## Étape 5 — Commit + PR

**Avant le commit, demande-moi confirmation avec le diff complet.**

Si je dis OK :

```bash
git add Specs/constitution.md Specs/spec.md CHANGELOG.md tools/regression/
git status                # vérifier qu'aucun autre fichier n'est traîné par erreur

git commit -m "fix(spec): replace deprecated gpt-4.1 with gpt-5.2 in spec-kit

- gpt-4.1 retired from Microsoft Foundry 2026-04-11 (auto-upgrade since 2026-03-09)
- Replace with gpt-5.2 (decision 2026-05-09: latest, recommended for creative)
- Update constitution §11 checklist date to 2026-05-09
- Add regression test tools/regression/LLM-2026-05-09-gpt41-deprecation
- Add tools/regression/REGISTRY.md per skill regression-registry conventions
- Update CHANGELOG.md [Unreleased]

Refs: skill llm-model-currency (audit 2026-05-09)"

git push -u origin fix/llm-models-deprecation
```

Puis crée la PR avec `gh pr create` ou via l'UI GitHub. Body : pointe vers la section `[Unreleased]` du CHANGELOG et `tools/regression/REGISTRY.md` pour le contexte.

---

## Critères de done (à valider AVANT de me dire "fini")

- [ ] Branche `fix/llm-models-deprecation` créée depuis `main` à jour
- [ ] 0 occurrence de `\bgpt-4\.1\b` dans `Specs/`, `apps/`, `packages/`, `docs/`
- [ ] `tools/regression/` créé avec 5 fichiers (test, REGISTRY, package.json, tsconfig, vitest.config)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 2 tests passing
- [ ] Sanity inverse vérifié (test échoue si gpt-4.1 réintroduit)
- [ ] `pnpm turbo test` (tous workspaces) → tous verts, pas de régression
- [ ] `pnpm turbo lint && pnpm turbo typecheck` → 0 erreur
- [ ] CHANGELOG `[Unreleased]` mis à jour avec sections `Fixed (Sprint 1)` et `Added (Sprint 1)`
- [ ] Commit avec format Conventional Commits (sujet ≤ 72 chars)
- [ ] PR ouverte avec body informatif

---

## Si quelque chose dévie du plan

- Si tu trouves d'autres occurrences que les 4 listées → **STOP**, fais-le moi savoir, on décide ensemble si c'est dans le scope du Sprint 1 ou pas.
- Si un test existant casse à cause de ces modifs → **STOP**, c'est inattendu (les modifs sont purement documentaires + nouveau package isolé).
- Si `pnpm install` introduit une nouvelle vulnérabilité ou warning → signale-le mais continue (Sprint 1 ne touche pas aux deps applicatives).
- Si tu hésites sur la reformulation de la note ligne 342 → applique exactement ce que j'ai écrit ci-dessus, c'est validé en sandbox.

---

## Ressources externes (si besoin de re-vérifier les dates)

- https://platform.openai.com/docs/deprecations
- https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements
- https://openai.com/index/retiring-gpt-4o-and-older-models/

Bon courage. Quand c'est appliqué et tests verts, dis-le-moi et je lance Sprint 2.
