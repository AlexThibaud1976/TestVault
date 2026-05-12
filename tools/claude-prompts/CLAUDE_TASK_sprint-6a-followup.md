# Mini-Prompt Claude Code — Sprint 6a follow-up (ALLOWED_LEGACY_NAMES)

> Coller dans Claude Code. **Sur la branche `feat/rename-testvault-types-to-argos-types` actuelle** (PR Sprint 6a non encore mergee).
> Mini-sprint chirurgical de **5-10 min** : transformer le test CFG-2026-05-13-package-naming de "2/4 failing" en "4/4 passing" en etendant `ALLOWED_LEGACY_NAMES` pour absorber les 6 packages testvault-* restants.

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] Tu es **toujours sur la branche `feat/rename-testvault-types-to-argos-types`**
- [ ] La PR n'est PAS encore mergee (sinon adapter en faisant une nouvelle branche `chore/naming-test-accept-legacy`)
- [ ] `git status` propre (working tree clean)
- [ ] Le test naming convention est actuellement 2/4 passing, 2/4 failing avec 6 violations

```powershell
git status
git branch --show-current
# Attendu : feat/rename-testvault-types-to-argos-types

pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# Attendu : 2/4 passing, 2/4 failing (6 violations dans le tableau)
```

Si tu n'es plus sur cette branche :
```powershell
git checkout feat/rename-testvault-types-to-argos-types
git pull
```

---

## Contexte

**Probleme** : le test `CFG-2026-05-13-package-naming` introduit en Sprint 6a echoue avec 6 violations restantes (les 6 packages testvault-* a renommer dans les Sprints 6b-7a). C'est documente comme "TDD progressif" dans le CHANGELOG, mais **la CI va echouer rouge** sur la PR.

**Solution validee utilisateur** : etendre `ALLOWED_LEGACY_NAMES` pour absorber explicitement les 6 packages encore a renommer. Chaque sprint suivant (6b, 6c, 6d, 6e, 6f, 7a) retirera une entree de la liste, transformant le test en **tracker visuel de la progression**.

**Resultat attendu** :
- Test naming convention : 2/4 → **4/4 passing**
- Total regression tests : 49/51 → **51/51 passing**
- CI verte → PR mergeable proprement

**Perimetre du follow-up** :
1. Modifier `tools/regression/CFG-2026-05-13-package-naming.test.ts` : etendre `ALLOWED_LEGACY_NAMES`
2. Lancer les tests pour valider 4/4 passing
3. Commit additif sur la meme branche
4. Update CHANGELOG `[0.4.9]` pour documenter le follow-up
5. Push

**Hors scope** :
- Aucune autre modification (pas de renaming, pas de modification d'autres packages, etc.)
- Pas de bump version (le 0.4.9 est deja set, on est sur la meme branche)
- Pas de modification REGISTRY (l'entree CFG-2026-05-13-package-naming reste valide, juste le contenu du test change)

---

## Etape 1 — Modifier le test

### 1.1 — Localiser le fichier

```powershell
Get-Content tools\regression\CFG-2026-05-13-package-naming.test.ts | Select-Object -First 50
```

Identifier la constante `ALLOWED_LEGACY_NAMES` (probablement vers la ligne 30-40).

### 1.2 — Etendre la constante

Remplacer :

```typescript
const ALLOWED_LEGACY_NAMES = new Set([
	// testpulse-ui-shared will be renamed in Sprint 7b
	"@atconseil/testpulse-ui-shared",
]);
```

Par :

```typescript
const ALLOWED_LEGACY_NAMES = new Set([
	// Legacy names accepted during the testvault-* -> argos-* migration wave.
	// Each future sprint will remove its entry as the package is renamed.
	// See Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4).
	"@atconseil/testvault-wit-schema", // Sprint 6b: rename to argos-wit-schema
	"@atconseil/testvault-sdk",        // Sprint 6c: rename to argos-sdk
	"@atconseil/testvault-importers",  // Sprint 6d: rename to argos-importers
	"@atconseil/testvault-exporters",  // Sprint 6e: rename to argos-exporters
	"@atconseil/testvault-gherkin",    // Sprint 6f: rename to argos-gherkin
	"@atconseil/testvault-cli",        // Sprint 7a: rename to argos-cli
	"@atconseil/testpulse-ui-shared",  // Sprint 7b: rename to argos-detection-api
]);
```

⚠ **Source ASCII strict**. Pas de caractere accentue dans les commentaires.

### 1.3 — Verifier que le commentaire JSDoc du fichier reflete le nouveau comportement

Dans l'en-tete JSDoc, ajuster la section "Lifecycle" :

```typescript
/**
 * ...
 * Lifecycle:
 *   - Sprint 6a (this test introduction): testvault-types renamed; 6 legacy names accepted
 *   - Sprint 6b: testvault-wit-schema renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6c: testvault-sdk renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6d: testvault-importers renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6e: testvault-exporters renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 6f: testvault-gherkin renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 7a: testvault-cli renamed; remove from ALLOWED_LEGACY_NAMES
 *   - Sprint 7b: testpulse-ui-shared -> argos-detection-api; remove from ALLOWED_LEGACY_NAMES
 *   - After Sprint 7b: ALLOWED_LEGACY_NAMES is empty; test enforces argos-* only
 * ...
 */
```

(Si l'en-tete existant est legerement different, adapter sans casser la structure.)

---

## Etape 2 — Reflechir sur la semantique du test 2

### 2.1 — Important : le test 2 "no @atconseil/testvault-* prefix" doit-il changer ?

Actuellement le test 2 verifie qu'**aucun** package commence par `@atconseil/testvault-`. Cette assertion va echouer tant qu'il reste des `testvault-*` non renommes, **meme s'ils sont dans `ALLOWED_LEGACY_NAMES`**.

**Decision pour le follow-up** : modifier le test 2 pour respecter aussi `ALLOWED_LEGACY_NAMES`. Sinon, le test 2 restera rouge.

Modifier le test 2 :

```typescript
it("no package may use the legacy @atconseil/testvault-* prefix (excluding allowed legacy in transition)", () => {
	const violations: string[] = [];

	for (const folder of packageFolders) {
		const pkgPath = join(PACKAGES_DIR, folder, "package.json");
		if (!existsSync(pkgPath)) continue;

		const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, "utf8"));
		if (!pkg.name) continue;

		// Skip names explicitly allowed during migration
		if (ALLOWED_LEGACY_NAMES.has(pkg.name)) continue;

		if (pkg.name.startsWith(FORBIDDEN_PREFIX)) {
			violations.push(`${folder} -> ${pkg.name}`);
		}
	}

	expect(violations).toEqual([]);
});
```

⚠ **Cette modification est critique** : sans elle, le test 2 reste rouge.

### 2.2 — Test 3 reste tel quel

Le test 3 ("approved prefixes") utilise deja `ALLOWED_LEGACY_NAMES` pour passer outre. Verifier que c'est bien le cas dans le code actuel :

```typescript
const isArgos = pkg.name.startsWith("@atconseil/argos-");
const isAllowedLegacy = ALLOWED_LEGACY_NAMES.has(pkg.name);

if (!isArgos && !isAllowedLegacy) {
    unapproved.push(`${folder} -> ${pkg.name}`);
}
```

Si oui, OK. Sinon, ajouter le check `isAllowedLegacy`.

### 2.3 — Tests 1 et 4 inchanges

Les tests "packages count" et "folder-name consistency" ne sont pas affectes.

---

## Etape 3 — Validation

```powershell
# Test naming convention specifique
pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming
# Attendu : 4/4 passing
```

⚠ **Si test toujours rouge** : verifier que la modification du test 2 a bien ete prise en compte (re-lire le fichier, verifier le `ALLOWED_LEGACY_NAMES.has(pkg.name)` au debut de la boucle).

```powershell
# Suite complete
pnpm --filter @atconseil/regression-suite test
# Attendu : 51 passing (47 + 4 du naming convention, tous verts)

# Mojibake
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED

# Lint + typecheck
pnpm turbo lint
pnpm turbo typecheck
# Attendu : tous verts
```

---

## Etape 4 — Update CHANGELOG `[0.4.9]`

Ajouter une sous-section dans l'entree `[0.4.9]` existante (ne pas creer une nouvelle entree, on est sur la meme PR) :

Localiser la section `## [0.4.9] - 2026-05-13` dans `CHANGELOG.md` et ajouter :

```markdown
### Changed (Sprint 6a follow-up)

- **`CFG-2026-05-13-package-naming` test : ALLOWED_LEGACY_NAMES etendu** pour accepter les 6 packages testvault-* encore a renommer (Sprints 6b a 7a) + le testpulse-ui-shared (Sprint 7b). Le test passe de 2/4 failing a 4/4 passing.
- **Test 2 modifie** : la verification "no testvault-* prefix" exclut maintenant les noms dans ALLOWED_LEGACY_NAMES. Le test devient un tracker visuel : chaque sprint de renaming retirera une entree de la liste, et a Sprint 7b la liste sera vide.
- **Effet** : suite regression passe de 49/51 a **51/51 passing**. CI verte sur la PR Sprint 6a.
```

Et ajuster la section "Lessons learned" :

```markdown
### Lessons learned (Sprint 6a follow-up)

- **Le TDD "rouge progressif" est un anti-pattern pour CI**. Un test qui valide une transformation multi-sprints doit etre vert a chaque etape via une liste explicite (`ALLOWED_LEGACY_NAMES`), pas via une diminution lente vers zero.
- **A retenir pour les futurs sprints de migration** : si un test regression valide une transformation echelonnee, l'introduire avec la liste complete des etapes futures inscrite explicitement. Chaque sprint suivant retire une entree.
```

---

## Etape 5 — Commit + Push

```powershell
git add tools/regression/CFG-2026-05-13-package-naming.test.ts
git add CHANGELOG.md
git status
# Verifier que seulement ces 2 fichiers sont staged

git commit `
  -m "test(regression): accept 6 remaining testvault-* legacy names (Sprint 6a follow-up)" `
  -m "" `
  -m "ALLOWED_LEGACY_NAMES extended to include the 6 packages still to be renamed:" `
  -m "- testvault-wit-schema (Sprint 6b)" `
  -m "- testvault-sdk (Sprint 6c)" `
  -m "- testvault-importers (Sprint 6d)" `
  -m "- testvault-exporters (Sprint 6e)" `
  -m "- testvault-gherkin (Sprint 6f)" `
  -m "- testvault-cli (Sprint 7a)" `
  -m "" `
  -m "Test 2 modified to skip ALLOWED_LEGACY_NAMES (prevents false-positive failures)." `
  -m "" `
  -m "Effect:" `
  -m "- CFG-2026-05-13-package-naming: 2/4 failing -> 4/4 passing" `
  -m "- Total regression tests: 49/51 -> 51/51 passing" `
  -m "- CI green on Sprint 6a PR" `
  -m "" `
  -m "Each subsequent renaming sprint (6b-7a) will remove its entry from the" `
  -m "list, making the test a visual progress tracker. After Sprint 7b, the" `
  -m "list will be empty and the test will enforce strict argos-* only naming." `
  -m "" `
  -m "Lesson: TDD red-progressive is a CI anti-pattern; prefer explicit allow-list."

git push origin feat/rename-testvault-types-to-argos-types
```

⚠ La PR existante sera mise a jour automatiquement (commit additif sur la meme branche). Pas besoin de creer une nouvelle PR.

---

## Etape 6 — Verifier la PR

Apres push :
1. Refresh la PR sur GitHub
2. Verifier que le commit additif est visible
3. Verifier que la CI **passe verte** apres re-run
4. **Merger la PR** quand CI verte

---

## Criteres de done

- [ ] `ALLOWED_LEGACY_NAMES` etendu avec 6 nouveaux noms testvault-* + commentaires sprint references
- [ ] Test 2 modifie pour respecter `ALLOWED_LEGACY_NAMES`
- [ ] JSDoc lifecycle mis a jour (8 sprints lifecycle au lieu de 6)
- [ ] `pnpm --filter @atconseil/regression-suite test CFG-2026-05-13-package-naming` → 4/4 passing
- [ ] `pnpm --filter @atconseil/regression-suite test` → 51/51 passing (au lieu de 49/51)
- [ ] `pnpm preflight` → PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm turbo lint && typecheck` → verts
- [ ] CHANGELOG `[0.4.9]` update avec section follow-up + lessons learned
- [ ] Commit additif sur la branche `feat/rename-testvault-types-to-argos-types`
- [ ] Push origin
- [ ] CI verte sur la PR
- [ ] PR mergeable

---

## Garde-fous follow-up

⚠ **Risque #1 = creer une nouvelle branche par erreur**
- On doit etre sur `feat/rename-testvault-types-to-argos-types` (la branche du Sprint 6a)
- Pas de `git checkout -b nouvelle-branche`
- Si on est sur main par erreur, `git checkout feat/rename-testvault-types-to-argos-types`

⚠ **Risque #2 = modifier autre chose que le test naming + CHANGELOG**
- TENTATION : "tant qu'on est dans le code, ajustons aussi X"
- NON. Sprint 6a follow-up = test naming et CHANGELOG uniquement.
- `git status` avant commit doit montrer seulement 2 fichiers modifies.

⚠ **Risque #3 = oublier de modifier le test 2**
- L'extension de `ALLOWED_LEGACY_NAMES` seule ne suffit pas si le test 2 ne respecte pas la liste.
- Verifier explicitement dans la boucle du test 2 : `if (ALLOWED_LEGACY_NAMES.has(pkg.name)) continue;`

⚠ **Risque #4 = oublier le test 3 (verification)**
- Le test 3 devrait deja respecter `ALLOWED_LEGACY_NAMES`, mais a verifier.
- Si non, l'ajouter aussi.

⚠ **Risque #5 = mojibake CHANGELOG**
- Source ASCII strict. Verifier scan apres modification.

---

## Reporting utilisateur

Reporter a l'utilisateur **1 moment** :
1. Apres Etape 3 (validation) : "Test naming convention 4/4 passing. Suite complete 51/51. Pret a commit + push ?"

---

Quand la PR est verte et merge-ready, dis-le-moi. Apres merge :
- Sync main local (`git checkout main && git pull`)
- Pause 5 min
- **Sprint 6b** (testvault-wit-schema → argos-wit-schema, 1 seul consommateur, beaucoup plus simple)
