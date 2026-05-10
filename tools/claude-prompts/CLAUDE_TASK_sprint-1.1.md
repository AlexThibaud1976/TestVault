# Prompt Claude Code — Sprint 1.1 (`fix/spec-encoding-mojibake`)

> Coller dans Claude Code à la racine du repo `TestVault`, ou via `claude < CLAUDE_TASK_sprint-1.1.md`.
> Claude Code lira automatiquement `CLAUDE.md` racine et `Specs/CLAUDE.md` au démarrage. Règles TDD/commits/spec-kit/non-régression déjà chargées.

---

## Contexte

L'audit post-Sprint-1 (2026-05-09) a révélé une **régression d'encodage critique** sur `Specs/spec.md` :

- **331 occurrences de mojibake double-encoded** : `Ã©` au lieu de `é`, `ðŸ"´` au lieu de `🔴`, `â€"` au lieu de `—`, `Ã¨`, `Ãª`, `âœ…`, etc.
- Cause : pendant l'application du Sprint 1, un éditeur ou outil intermédiaire a lu `spec.md` (UTF-8) en l'interprétant comme Latin-1, puis l'a re-sauvé en UTF-8. Chaque caractère multi-octets UTF-8 est devenu plusieurs caractères Latin-1, eux-mêmes ré-encodés en UTF-8.
- Le fichier est techniquement valide (`UTF-8 with BOM`) mais son contenu est illisible pour les humains. Toute édition future risque d'aggraver la corruption.

**Périmètre Sprint 1.1** : strictement correctif, focalisé sur l'encoding. **Aucune modification fonctionnelle** au-delà de la re-application des changements gpt-4.1 → gpt-5.2 du Sprint 1 sur le spec.md restauré.

---

## Objectif

Sur une nouvelle branche `fix/spec-encoding-mojibake`, livrer une PR qui :

1. Restaure `Specs/spec.md` à un état UTF-8 propre (depuis le commit pré-Sprint-1)
2. Réapplique les 2 modifs `gpt-4.1 → gpt-5.2` du Sprint 1 (lignes 443 et 896) sur le spec.md restauré
3. Ajoute un test régression `ENC-2026-05-09-spec-mojibake.test.ts` qui empêche toute future régression d'encodage
4. Met à jour `tools/regression/REGISTRY.md` et `CHANGELOG.md`
5. Tous les tests verts, ZÉRO occurrence de mojibake dans le repo

---

## Étape 0 — Sanity check (baseline)

Avant toute modification, vérifie l'état réel du repo.

### 0.1 — Identifier le commit pré-Sprint-1

```bash
git checkout main && git pull
git log --oneline -n 10
```

Tu dois trouver dans l'historique récent (dans cet ordre du plus récent au plus ancien) :

1. `Merge pull request #10 from AlexThibaud1976/fix/llm-models-deprecation`
2. `fix(ci): use needs context to gate e2e-cloud on ADO_CLOUD_PAT secret`
3. `fix(spec): replace deprecated gpt-4.1 with gpt-5.2 in spec-kit` ← **commit Sprint 1**
4. `feat(extension): T-0.8 ADO-compliant manifest, hub group & coverage-p…` ← **commit pré-Sprint-1, contient le bon spec.md**

Capture le SHA du commit #4 :
```bash
PRE_SPRINT1_SHA=$(git log --oneline | grep -E "feat\(extension\): T-0\.8" | head -1 | awk '{print $1}')
echo "Pre-Sprint-1 SHA: $PRE_SPRINT1_SHA"
```

Si tu ne trouves pas exactement ce message de commit ou que `PRE_SPRINT1_SHA` est vide → **STOP**, signale-le-moi.

### 0.2 — Confirmer le mojibake actuel sur main

```bash
file Specs/spec.md
# Attendu : "UTF-8 (with BOM) text" — le BOM seul n'est pas le problème, c'est le contenu

grep -cE 'Ã[©¨ª¢¨ ®´¹§Š]|â€[""™˜""]|ðŸ|â€¢|â–|âœ' Specs/spec.md
# Attendu : >= 100 (chez moi 331). Si 0, la situation a déjà été corrigée → STOP, dis-le-moi
```

### 0.3 — Confirmer que la version pré-Sprint-1 est PROPRE

```bash
# Extraire spec.md du commit pré-Sprint-1 dans un tmp pour vérification
git show $PRE_SPRINT1_SHA:Specs/spec.md > /tmp/spec-pre-sprint1.md

file /tmp/spec-pre-sprint1.md
# Attendu : "UTF-8 text" (sans BOM, ou avec BOM peu importe — l'important c'est l'absence de mojibake)

grep -cE 'Ã[©¨ª¢¨ ®´¹§Š]|â€[""™˜""]|ðŸ|â€¢|â–|âœ' /tmp/spec-pre-sprint1.md
# Attendu : 0 (le fichier source était propre avant Sprint 1)
```

Si le pre-Sprint-1 spec.md a aussi du mojibake → **STOP** : la régression est plus ancienne que prévu, on doit remonter plus loin dans l'historique. Signale-le-moi.

### 0.4 — Baseline tests

```bash
pnpm install
pnpm turbo test
# Attendu : tous verts (Sprint 1 a été mergé, le test régression LLM passe)
```

---

## Étape 1 — Test-first : créer le test régression encoding (ROUGE attendu)

Avant la moindre modif sur spec.md, écris le test qui détecte le mojibake. Il **doit** échouer maintenant (puisque le mojibake est encore présent).

### 1.1 — Créer `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts`

Structure attendue (vitest, modélisée sur le test LLM existant `LLM-2026-05-09-gpt41-deprecation.test.ts`) :

```typescript
/**
 * Test régression : ENC-2026-05-09-spec-mojibake
 *
 * Contexte historique
 * -------------------
 * Pendant l'application du Sprint 1 (PR fix/llm-models-deprecation, mergée 2026-05-09),
 * le fichier Specs/spec.md a subi une régression d'encodage : 331 occurrences de mojibake
 * double-encoded (UTF-8 lu comme Latin-1 puis re-écrit en UTF-8). Caractères typiques
 * observés : `Ã©` (é), `Ã¨` (è), `Ã ` (à), `Ã®` (î), `Ã´` (ô), `Ã¹` (ù), `Ã§` (ç),
 * `âœ…` (✅), `âŒ` (❌), `ðŸ"´` (🔴), `ðŸ"‹` (📋), `â€"` (—), `â€™` (').
 *
 * Cause probable : éditeur ou outil intermédiaire qui a deviné Latin-1 sur la présence d'un BOM,
 * lu le fichier dans cet encoding faux, puis sauvegardé en UTF-8.
 *
 * Sprint 1.1 a restauré spec.md depuis le commit pré-Sprint-1 et ajouté ce garde-fou.
 * Périmètre : tous les fichiers texte du repo (.md, .ts, .tsx, .js, .jsx, .json, .yaml, .yml, .txt).
 * Allowlist : ce test lui-même + REGISTRY.md (références historiques nécessaires aux patterns).
 * Seuil : 0 occurrence (zéro tolérance ; le seuil est dur car même 1 occurrence indique une corruption).
 *
 * NE PAS supprimer ce test sans nouvelle décision spec-kit.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const SCAN_EXTENSIONS = new Set([
	".md", ".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml", ".txt",
]);

const EXCLUDED_DIRS = new Set([
	"node_modules", ".git", "dist", "build", "coverage",
	".turbo", ".pnpm-store", "_archive",
]);

const ALLOWED_FILES = new Set([
	"tools/regression/REGISTRY.md",
	"tools/regression/ENC-2026-05-09-spec-mojibake.test.ts",
]);

// Patterns mojibake typiques d'un double-encoding latin-1 → utf-8 sur du français + emoji.
// Chaque pattern correspond à une lettre française accentuée ou un emoji corrompu.
const MOJIBAKE_PATTERNS: RegExp[] = [
	/Ã[©¨ª¢¨ ®´¹§ŠÂÆ]/,     // é è ê â à î ô ù ç Š Â Æ corrompus
	/â€[""™˜""¦"]/,         // — ' ' " " … " corrompus
	/ðŸ[""'¦§]/,             // emojis 🔴 📋 corrompus
	/âœ[…Œ]/,                // ✅ ❌ corrompus
	/â–[¶¾]/,                // ▶ ▾ corrompus
	/â¸/,                    // ⏸ corrompu
	/âšª/,                   // ⚪ corrompu
	/â¤/,                    // ⤸ etc.
];

interface MojibakeMatch {
	file: string;
	line: number;
	pattern: string;
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

function scanFile(absolutePath: string, relPath: string): MojibakeMatch[] {
	if (ALLOWED_FILES.has(relPath)) return [];
	const matches: MojibakeMatch[] = [];
	const content = readFileSync(absolutePath, "utf8");
	const lines = content.split("\n");
	for (let i = 0; i < lines.length; i++) {
		for (const pattern of MOJIBAKE_PATTERNS) {
			if (pattern.test(lines[i])) {
				matches.push({
					file: relPath,
					line: i + 1,
					pattern: pattern.source,
					excerpt: lines[i].trim().slice(0, 120),
				});
				break; // 1 match par ligne suffit
			}
		}
	}
	return matches;
}

describe("ENC-2026-05-09-spec-mojibake regression", () => {
	it("must not contain any mojibake double-encoding pattern in repo files", () => {
		const allMatches: MojibakeMatch[] = [];
		for (const file of walkFiles(REPO_ROOT)) {
			const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/");
			allMatches.push(...scanFile(file, relPath));
		}

		if (allMatches.length > 0) {
			const sample = allMatches.slice(0, 20)
				.map((m) => `  ${m.file}:${m.line} [${m.pattern}] → ${m.excerpt}`)
				.join("\n");
			throw new Error(
				`Found ${allMatches.length} mojibake double-encoding occurrence(s) (showing first 20):\n${sample}\n\n` +
				"This indicates a UTF-8 file was read as Latin-1 and re-saved as UTF-8 (or similar).\n" +
				"Restore the file from a clean source (git history, original) and re-apply changes carefully.\n" +
				"See tools/regression/REGISTRY.md entry ENC-2026-05-09 for context.",
			);
		}
		expect(allMatches).toHaveLength(0);
	});

	it("must verify the test patterns can detect typical mojibake (sanity check)", () => {
		// Sanity : les patterns matchent du mojibake évident
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("SpÃ©cification"))).toBe(true);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("ðŸ"´"))).toBe(true);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("â€" Auteur"))).toBe(true);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("âœ… valide"))).toBe(true);

		// Sanity inverse : du français propre ne match PAS
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("Spécification détaillée"))).toBe(false);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("✅ Test passé"))).toBe(false);
		expect(MOJIBAKE_PATTERNS.some((p) => p.test("Description — auteur"))).toBe(false);
	});
});
```

### 1.2 — Lancer le test : il DOIT échouer

```bash
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
```

**Attendu** : 1 test fail (mojibake detection sur Specs/spec.md), 1 test pass (sanity patterns).

Le message d'erreur doit montrer 20 premières occurrences avec fichier:ligne:pattern. Confirme-moi que tu vois ça avant de passer à l'étape 2.

---

## Étape 2 — Restaurer `Specs/spec.md` depuis le commit pré-Sprint-1

```bash
# Tu as déjà PRE_SPRINT1_SHA depuis l'étape 0.1
git show $PRE_SPRINT1_SHA:Specs/spec.md > Specs/spec.md

# Vérifier l'encoding
file Specs/spec.md
# Attendu : "UTF-8 text" (peu importe BOM ou pas)

# Vérifier 0 mojibake
grep -cE 'Ã[©¨ª¢¨ ®´¹§Š]|â€["™˜]|ðŸ|âœ|â–' Specs/spec.md
# Attendu : 0
```

⚠ **Important** : utilise `git show <sha>:path` (qui écrit en pipe binaire propre), **pas** `git checkout <sha> -- Specs/spec.md` qui pourrait passer par un working-tree filter. Le `>` redirection écrit les bytes exactement tels que stockés dans git.

---

## Étape 3 — Réappliquer les 2 modifs gpt-4.1 → gpt-5.2 du Sprint 1

Le spec.md restauré est dans son état pré-Sprint-1 : il contient encore `gpt-4.1`. Il faut réappliquer les changements du Sprint 1 :

### 3.1 — Confirmer les 2 lignes à modifier

```bash
grep -nE '\bgpt-4\.1\b' Specs/spec.md
# Attendu : exactement 2 lignes :
#   443:**Entrées :** ... Modèle configuré (claude-opus-4-7, gpt-4.1, etc.) ...
#   896:│  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-4.1 ▾]      │
```

Si tu ne trouves pas exactement 2 lignes ou si les numéros diffèrent, **STOP**, signale-le-moi.

### 3.2 — Modification ligne 443

```diff
- **Entrées :** Work Item ADO source (User Story, Feature, Bug). System prompt configuré par l'Admin. Modèle configuré (claude-opus-4-7, gpt-4.1, etc.). Paramètres : ...
+ **Entrées :** Work Item ADO source (User Story, Feature, Bug). System prompt configuré par l'Admin. Modèle configuré (claude-opus-4-7, gpt-5.2, etc.). Paramètres : ...
```

### 3.3 — Modification ligne 896 (wireframe ASCII, garde l'alignement)

```diff
- │  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-4.1 ▾]      │
+ │  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-5.2 ▾]      │
```

`gpt-4.1` et `gpt-5.2` font 7 caractères tous les deux → l'art ASCII reste aligné.

### 3.4 — Vérifier

```bash
grep -nE '\bgpt-4\.1\b' Specs/spec.md
# Attendu : 0

# Vérifier 0 mojibake
grep -cE 'Ã[©¨ª¢¨ ®´¹§Š]|â€["™˜]|ðŸ|âœ|â–' Specs/spec.md
# Attendu : 0

# Vérifier que le test régression LLM passe toujours
pnpm --filter @atconseil/regression-suite test LLM-2026-05-09
# Attendu : 2 passing
```

---

## Étape 4 — Mettre à jour REGISTRY et CHANGELOG

### 4.1 — `tools/regression/REGISTRY.md`

Ajoute une nouvelle entrée dans le tableau, sous l'entrée `LLM-2026-05-09` :

```markdown
| ENC-2026-05-09 | 2026-05-09 | Encoding | spec-mojibake | Aucune occurrence de mojibake double-encoded (UTF-8 lu comme Latin-1 puis re-encodé) dans les fichiers texte du repo. Régression introduite pendant Sprint 1 sur `Specs/spec.md` (331 occurrences) ; détectée par audit post-Sprint-1 et corrigée Sprint 1.1 par restauration depuis commit pré-Sprint-1. | spec.md (Sprint 1 — PR #10) | AT |
```

### 4.2 — `CHANGELOG.md` sous `[Unreleased]`

Ajoute juste après les sections Sprint 1 existantes (avant la ligne `- (post-Sprint-1 work tracked here)`) :

```markdown
### Fixed (Sprint 1.1 — 2026-05-09 — fix/spec-encoding-mojibake)

- **Encoding `Specs/spec.md` (régression critique)** : restauration depuis le commit pré-Sprint-1 (`feat(extension): T-0.8 ...`) suivie de la ré-application des modifications `gpt-4.1 → gpt-5.2` du Sprint 1. 331 occurrences de mojibake double-encoded (`Ã©`, `Ã¨`, `ðŸ"´`, `âœ…`, etc.) éliminées. Cause probable : un éditeur ou outil intermédiaire pendant Sprint 1 a interprété le BOM UTF-8 comme du Latin-1, lu et re-sauvé. Le fichier était techniquement valide UTF-8 mais illisible.

### Added (Sprint 1.1)

- **Test régression `ENC-2026-05-09-spec-mojibake`** dans `tools/regression/` : scan tous les `.md`/`.ts`/`.tsx`/`.js`/`.jsx`/`.json`/`.yaml`/`.yml`/`.txt` du repo et échoue à la moindre occurrence de patterns mojibake typiques. Garantit qu'aucune corruption d'encoding silencieuse ne pourra repasser sans alerte. Allowlist : `tools/regression/REGISTRY.md` et le test lui-même (références historiques nécessaires aux patterns).
- **Entrée `ENC-2026-05-09` au REGISTRY**.
```

---

## Étape 5 — Validation complète

```bash
# Test régression encoding doit passer (vert)
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
# Attendu : 2 passing

# Test régression LLM doit toujours passer
pnpm --filter @atconseil/regression-suite test LLM-2026-05-09
# Attendu : 2 passing

# Tous les tests régression
pnpm --filter @atconseil/regression-suite test
# Attendu : 4 passing (2 LLM + 2 ENC)

# Tous les tests du monorepo
pnpm turbo test
# Attendu : tous verts, aucune régression sur les tests applicatifs

# Lint + typecheck
pnpm turbo lint
pnpm turbo typecheck
# Attendu : 0 erreur

# Sanity inverse : si on réintroduit du mojibake, le test fail
echo "Test mojibake : SpÃ©cification corrompue" >> Specs/spec.md
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
# Attendu : 1 fail avec message clair pointant Specs/spec.md

# Retirer la réintroduction
sed -i '/Test mojibake : SpÃ©cification corrompue/d' Specs/spec.md
pnpm --filter @atconseil/regression-suite test ENC-2026-05-09
# Attendu : 2 passing
```

---

## Étape 6 — Commit + PR

**Avant le commit, demande-moi confirmation avec le diff complet** (en particulier le diff de `Specs/spec.md` qui sera massif — c'est attendu, c'est le re-encoding propre de tout le fichier).

Si je dis OK :

```bash
git add Specs/spec.md tools/regression/ENC-2026-05-09-spec-mojibake.test.ts \
        tools/regression/REGISTRY.md CHANGELOG.md
git status                # vérifier qu'aucun autre fichier n'est traîné par erreur

git commit -m "fix(spec): restore spec.md UTF-8 encoding, add mojibake regression test

- 331 mojibake occurrences eliminated in Specs/spec.md
- Restored from pre-Sprint-1 commit, re-applied gpt-4.1 -> gpt-5.2 changes
- Added ENC-2026-05-09-spec-mojibake regression test (zero-tolerance)
- Updated tools/regression/REGISTRY.md
- Updated CHANGELOG.md [Unreleased]

Refs: post-Sprint-1 audit (2026-05-09)"

git push -u origin fix/spec-encoding-mojibake
gh pr create --base main \
  --title "fix(spec): restore spec.md UTF-8 encoding + mojibake regression test" \
  --body "$(cat <<'EOF'
## Contexte

Audit post-Sprint-1 a détecté 331 occurrences de mojibake double-encoded sur \`Specs/spec.md\`,
introduites pendant l'application du Sprint 1 (PR #10).

## Changements

- Restauration de \`Specs/spec.md\` depuis le commit pré-Sprint-1 (UTF-8 propre)
- Re-application des modifs \`gpt-4.1 → gpt-5.2\` du Sprint 1 (lignes 443 et 896)
- Nouveau test régression \`ENC-2026-05-09-spec-mojibake\` (zero-tolerance, scan tout le repo)
- Update REGISTRY.md et CHANGELOG.md

## Validation

- \`pnpm --filter @atconseil/regression-suite test\` → 4 passing (2 LLM + 2 ENC)
- \`pnpm turbo test\` → tous verts
- \`grep mojibake Specs/spec.md\` → 0
- \`grep -E '\\bgpt-4\\.1\\b' Specs/\` → 0

## Refs

- post-Sprint-1 audit (2026-05-09)
- tools/regression/REGISTRY.md entry ENC-2026-05-09
EOF
)"
```

---

## Critères de done (à valider avant de me dire "fini")

- [ ] Branche `fix/spec-encoding-mojibake` créée depuis `main` à jour
- [ ] `Specs/spec.md` restauré : 0 mojibake, 0 occurrence de `gpt-4.1`, encoding UTF-8 propre
- [ ] `tools/regression/ENC-2026-05-09-spec-mojibake.test.ts` créé avec 2 tests
- [ ] `pnpm --filter @atconseil/regression-suite test` → 4 passing
- [ ] Sanity inverse vérifié (réintroduction de mojibake → fail propre)
- [ ] `pnpm turbo test` (tous workspaces) → tous verts
- [ ] `pnpm turbo lint && pnpm turbo typecheck` → 0 erreur
- [ ] REGISTRY.md mis à jour avec entrée ENC-2026-05-09
- [ ] CHANGELOG.md `[Unreleased]` mis à jour avec sections `Fixed (Sprint 1.1)` et `Added (Sprint 1.1)`
- [ ] Commit Conventional Commits, PR ouverte avec body informatif

---

## Garde-fous spéciaux Sprint 1.1

⚠ **Le risque #1 de ce sprint = re-corrompre l'encoding pendant l'édition.**

- Les modifs ligne 443 et 896 doivent être faites avec `str_replace` ou équivalent qui **lit et écrit en UTF-8 strict**, pas avec un éditeur qui pourrait deviner Latin-1.
- **Ne pas ouvrir spec.md** dans un éditeur GUI externe entre la restauration (étape 2) et le commit (étape 6). Tout doit se faire via les outils Claude Code qui lisent/écrivent en UTF-8.
- Après la modif, vérifie immédiatement avec `file Specs/spec.md` et le grep mojibake.

⚠ **Si le test régression encoding fail après tes modifs**, c'est que l'éditeur a re-corrompu spec.md. Stratégie : recommencer l'étape 2 (restaurer depuis git) et utiliser `sed -i` pour les modifs lignes 443 et 896 plutôt que str_replace, en s'assurant que le locale est UTF-8 :

```bash
LC_ALL=en_US.UTF-8 sed -i 's/gpt-4\.1/gpt-5.2/g' Specs/spec.md
```

⚠ **Si tu trouves du mojibake dans d'autres fichiers que spec.md**, signale-le-moi avant de les corriger. On veut éviter d'élargir le scope.

---

## Si quelque chose dévie du plan

- Si le SHA pré-Sprint-1 ne se trouve pas → STOP
- Si le spec.md pré-Sprint-1 a aussi du mojibake → STOP (la régression est plus ancienne)
- Si autres fichiers contiennent du mojibake → STOP, signale
- Si un test applicatif casse → STOP, c'est inattendu (le contenu sémantique de spec.md ne change pas)

Quand c'est appliqué et tous tests verts, dis-le-moi. Sprint 2 (Constitution Cloud-only + bump v0.3.0) pourra alors démarrer sur une base saine.
