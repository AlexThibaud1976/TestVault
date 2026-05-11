# Prompt Claude Code — TECH-DEBT-015B (`docs/migration-plan`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **documentaire stratégique** : produire `Specs/MIGRATION-PLAN.md` qui documente les décisions architecturales validées et le plan de migration, basé sur `Specs/MONOREPO.md` (TECH-DEBT-015A).

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, TECH-DEBT-015A mergé
- [ ] `Specs/MONOREPO.md` existe et est a jour
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce document** : TECH-DEBT-015A a inventorie le monorepo. 5 surprises majeures ont emerge :
1. `testpulse-ui-shared` = en realite API publique TestPulse↔Argos (nom trompeur, contient un WIT schema reader)
2. `testvault-cli` = futur outil utilisateurs Argos pour pipelines CI (a publier npm, pas encore publie)
3. `testvault-ui` = placeholder vide (a supprimer)
4. `argos-functions` = backend Azure Functions non deploye (gap spec-kit -> 015C)
5. Versioning desaligne : tous packages a 0.3.2, argos-extension a 0.4.7

**Decisions strategiques validees** (utilisateur 2026-05-12) :

- **Q1=a** : `testpulse-ui-shared` est l'API publique TestPulse↔Argos par design. A renommer + publier npm.
- **Q2=b** : `testvault-cli` est destine aux utilisateurs Argos. A renommer + publier npm (sprint dedie futur).
- **Q3=c** : Stripe = prototype, pas pris au serieux. Reconnaissance dans 015C.
- **Q4=b** : argos-functions = code local non deploye. Gap spec-kit -> 015C.
- **Q5=C-hybride** : Versioning par groupe (3 couches : interne unifiee, publique independante, backend independante).
- **Q-localisation** : `testpulse-ui-shared` (futur `argos-detection-api`) reste dans repo TestVault.

**Perimetre TECH-DEBT-015B** :
1. Produire `Specs/MIGRATION-PLAN.md` : decisions + plan de migration documentes
2. **AUCUNE execution** : pas de renaming reel, pas de modification du code, pas de bump version
3. Le document servira de reference pour les sprints d'execution futurs (chaque sprint touchera 1-2 packages a la fois)

**Hors scope TECH-DEBT-015B** :
- Execution du renaming (sprints dedies futurs : Sprint 5a, 5b, etc.)
- Reconnaissance des gaps spec-kit Phase 0 (-> 015C qui suit immediatement)
- Decision pricing/Stripe (-> TECH-DEBT-016 separe)
- Plan de deploiement argos-functions (-> TECH-DEBT-017 a inscrire en 015C)
- Modifications fonctionnelles

---

## Architecture du document `Specs/MIGRATION-PLAN.md`

```markdown
# Monorepo TestVault — Plan de Migration

> Document strategique : decisions architecturales validees + plan de migration.
> Genere dans le cadre de TECH-DEBT-015B (2026-05-12).
> Base sur l'inventaire factuel : `Specs/MONOREPO.md`.
> **Aucune execution dans ce document** — les sprints d'execution sont planifies separement.

## Resume executif

Le monorepo TestVault contient actuellement 9 packages prefixes `testvault-*` et `testpulse-ui-shared` dont les noms ne refletent plus la realite produit. **Decision** : renommer le portfolio en `argos-*` (cohenrence avec le produit Argos), supprimer le code mort, formaliser l'API publique TestPulse↔Argos, et adopter une strategie de versioning hybride par groupe.

## 1. Decisions architecturales validees

### 1.1 Couplage Argos ↔ TestPulse : Pattern A (faible)

- Argos et TestPulse sont **2 produits independants** publies sur le Marketplace ADO sous des publishers distincts (AlexThibaud / ATConseil).
- **Aucun couplage code en runtime** entre les 2 produits.
- TestPulse externe (autre repo Github) utilise une **API publique** pour detecter si Argos est installe dans l'organisation et lire les WIT Argos.
- Cette API publique = le package actuellement nomme `@atconseil/testpulse-ui-shared`, a renommer.

### 1.2 Strategie de versioning : C-hybride (par groupe)

Trois groupes de versioning :

**Groupe 1 — Couche interne argos-extension (versions unifiees)**
Packages bumpes en meme temps que `argos-extension` :
- `argos-sdk` (ex-`testvault-sdk`)
- `argos-types` (ex-`testvault-types`)
- `argos-importers` (ex-`testvault-importers`)
- `argos-exporters` (ex-`testvault-exporters`)
- `argos-gherkin` (ex-`testvault-gherkin`)
- `argos-wit-schema` (ex-`testvault-wit-schema`)

**Groupe 2 — Couche publique (versions independantes, publication npm)**
- `argos-cli` (ex-`testvault-cli`) — outil utilisateurs pour pipelines CI
- `argos-detection-api` (ex-`testpulse-ui-shared`) — API publique TestPulse↔Argos

**Groupe 3 — Backend (versions independantes, deploiement Azure separe)**
- `argos-functions` (deja nomme ainsi)

**Implementation Changesets** : configuration `fixed` pour Groupe 1, `independent` pour Groupes 2 et 3. A formaliser dans `.changeset/config.json` lors du sprint d'execution.

### 1.3 Localisation `argos-detection-api`

Le package reste dans le repo TestVault (monorepo). Pas d'extraction vers un repo dedie.

**Justification** : monorepo plus simple a gouverner pour un projet solo. La publication npm decouple suffisamment les consommateurs externes (TestPulse, autres).

### 1.4 Nommage cible des packages

| Nom actuel | Nom cible | Groupe | private | Statut publication |
|---|---|---|---|---|
| `@atconseil/testvault-sdk` | `@atconseil/argos-sdk` | 1 (interne) | false | Pas publie npm (futur publication possible) |
| `@atconseil/testvault-types` | `@atconseil/argos-types` | 1 (interne) | false | Pas publie npm |
| `@atconseil/testvault-importers` | `@atconseil/argos-importers` | 1 (interne) | true | N/A |
| `@atconseil/testvault-exporters` | `@atconseil/argos-exporters` | 1 (interne) | true | N/A |
| `@atconseil/testvault-gherkin` | `@atconseil/argos-gherkin` | 1 (interne) | false | Pas publie npm |
| `@atconseil/testvault-wit-schema` | `@atconseil/argos-wit-schema` | 1 (interne) | true | N/A |
| `@atconseil/testvault-cli` | `@atconseil/argos-cli` | 2 (publique) | false | A publier npm (sprint dedie futur) |
| `@atconseil/testpulse-ui-shared` | `@atconseil/argos-detection-api` | 2 (publique) | true → false | A publier npm (sprint dedie futur) |
| `@atconseil/testvault-ui` | (supprime) | N/A | N/A | N/A |
| `argos-functions` | `argos-functions` (inchange) | 3 (backend) | true | N/A |
| `argosTesting` (apps/argos-extension) | `argosTesting` (inchange) | N/A | false | Marketplace VSIX |

**Note** : `argosTesting` (package.json `name` de l'extension) **reste inchange** car il est lie a l'extensionId Marketplace qui ne peut plus etre renomme apres publication initiale.

### 1.5 Repo Github : TestVault

Le repo Github garde son nom actuel `AlexThibaud1976/TestVault`. Pas de renommage du repo.

**Justification** : TestVault devient le nom technique du **monorepo Argos** (frontend + internes + CLI + API publique + backend). Renommer le repo casserait les URL externes, les CI workflows, les references doc. Cout/benefice defavorable.

### 1.6 Suppression de code mort

- `@atconseil/testvault-ui` : a supprimer (placeholder vide `export {}`, zero consommateur)
- `dist/` et `vsix-debug-3.2/` a la racine : a nettoyer (artefacts de debug, pas references dans `pnpm-workspace.yaml`)
- `apps/docs-site` : statut a clarifier (vide, scripts placeholders)

### 1.7 Apps/docs-site

Statut clarifie : placeholder cree en anticipation d'un futur site de doc. **Decision differee** : conserver tel quel pour l'instant (sera repris si un site de doc devient prioritaire). Inscrire au backlog comme TECH-DEBT-019 si besoin.

## 2. Mapping de migration detaille

### 2.1 Renommage Groupe 1 (couche interne)

Sequence d'execution recommandee (de la racine vers les consommateurs) :

```
Phase 1 : testvault-types -> argos-types
  (consommateurs : tous les autres packages)
  Impact : tous les autres package.json + tous les imports
  
Phase 2 : testvault-wit-schema -> argos-wit-schema
  (consommateur : argos-sdk uniquement)
  Impact : 1 package.json + imports dans argos-sdk

Phase 3 : testvault-sdk -> argos-sdk
  (consommateurs : argos-exporters, argos-cli, argos-extension, argos-functions)
  Impact : 4 package.json + leurs imports

Phase 4 : testvault-importers -> argos-importers
  (consommateurs : argos-extension, argos-cli, argos-functions)
  Impact : 3 package.json + leurs imports

Phase 5 : testvault-exporters -> argos-exporters
  (consommateurs : argos-extension, argos-cli)
  Impact : 2 package.json + leurs imports

Phase 6 : testvault-gherkin -> argos-gherkin
  (consommateurs : argos-extension, argos-cli, argos-functions)
  Impact : 3 package.json + leurs imports
```

Chaque phase = un sprint d'execution court (~30 min) avec :
- Rename du dossier `packages/testvault-X` → `packages/argos-X`
- Update du `name` dans son `package.json`
- Update des consommateurs (package.json dependencies + imports)
- `pnpm install` pour reflechir le workspace
- Tests regression + lint + typecheck + build
- Commit + PR

**Sequence recommandee** : descendante (types → wit-schema → sdk → importers, exporters, gherkin). Ainsi chaque phase ne casse rien : les consommateurs sont mis a jour apres que leurs deps sont renommees.

### 2.2 Renommage Groupe 2 (couche publique)

- **`testvault-cli` → `argos-cli`** : sprint dedie. Au-dela du renommage, inclut la decision de publication npm (semver initiale, README, npm publish workflow).
- **`testpulse-ui-shared` → `argos-detection-api`** : sprint dedie. Inclut clarification de l'API publique (TypeScript types exportes, README documentant l'usage par TestPulse externe), decision publication npm.

### 2.3 Code mort

- `testvault-ui` : sprint trivial de suppression (1 commit, ~10 min).

### 2.4 Versioning realignement

Sprint dedie post-renaming :
- Decider la version initiale du Groupe 1 unified (option : tout passer en 0.4.x pour aligner avec argos-extension, ou tout reset en 1.0.0).
- Decider les versions initiales Groupe 2 (probable 0.1.0 ou 1.0.0 pour la premiere publication npm).
- Configurer `.changeset/config.json` : mode `fixed` pour Groupe 1, `independent` pour Groupes 2/3.

## 3. Plan d'execution (sprints futurs)

Le plan suivant fragmente la migration en sprints courts et testables. **Aucun de ces sprints n'est execute dans 015B** — ce sont des reservations pour les sessions futures.

| Sprint propose | Effort | Risque | Sequence |
|---|---|---|---|
| Sprint 5a — Suppression testvault-ui | ~10 min | Tres faible | Premier |
| Sprint 5b — Cleanup dist/ et vsix-debug a la racine | ~10 min | Tres faible | Premier |
| Sprint 6a — Renaming testvault-types → argos-types | ~30 min | Moyen (consommateurs partout) | Apres 5a/5b |
| Sprint 6b — Renaming testvault-wit-schema → argos-wit-schema | ~20 min | Faible (1 consommateur) | Apres 6a |
| Sprint 6c — Renaming testvault-sdk → argos-sdk | ~30 min | Moyen (4 consommateurs) | Apres 6b |
| Sprint 6d — Renaming testvault-importers → argos-importers | ~20 min | Faible | Apres 6c |
| Sprint 6e — Renaming testvault-exporters → argos-exporters | ~20 min | Faible | Apres 6c |
| Sprint 6f — Renaming testvault-gherkin → argos-gherkin | ~20 min | Faible | Apres 6c |
| Sprint 7a — Renaming testvault-cli → argos-cli | ~30 min | Faible (zero consommateur interne) | Apres Groupe 1 termine |
| Sprint 7b — Renaming testpulse-ui-shared → argos-detection-api | ~30 min | Faible | Apres Groupe 1 termine |
| Sprint 8 — Realignement versioning + Changesets config | ~30 min | Moyen | Apres tous renaming |
| Sprint 9 (futur) — Publication npm argos-cli et argos-detection-api | ~1h | Moyen (config CI, semver, README) | Quand pret commercial |

**Total renaming + cleanup** : ~5h sur sprints courts. Pas obligatoire de tout faire d'un coup — peut s'etaler sur plusieurs jours/semaines.

## 4. Garde-fous pour les sprints d'execution

Chaque sprint de renaming doit respecter :

1. **Sprint atomique** : un sprint = un package renomme, pas plusieurs en chaine
2. **TDD** : test regression mis a jour AVANT le renaming pour echouer, puis passe apres
3. **Cross-check pre-flight** : `pnpm preflight` doit passer apres chaque sprint
4. **Tests CI verts** : lint + typecheck + tests applicatifs apres chaque sprint
5. **CHANGELOG** : entry par sprint avec mapping ancien/nouveau
6. **REGISTRY** : update des entrees mentionnant les anciens noms
7. **Allowlists** : tous les chemins mentionnant les anciens noms doivent etre updated
8. **No SVG, no mojibake, no scope creep** : disciplines habituelles

## 5. Risques identifies

| Risque | Mitigation |
|---|---|
| Imports oublies dans le code | grep exhaustif `@atconseil/testvault-` avant commit |
| Workspace pnpm casse apres renommage | `pnpm install` apres chaque rename + verification `pnpm list` |
| Allowlists obsoletes (chemins anciens) | Update systematique allowlist.ts/cjs apres chaque rename |
| Test regression qui mentionne ancien nom | Update T-* / CFG-* qui mentionnent testvault- |
| Constitution / spec-kit reference ancien nom | Update Specs/*.md systematique |
| `tools/preflight/marketplace-check.md` mentionne testvault- | A updater une fois renaming termine |
| Build CI casse par chemin hardcode | Verifier turbo.json, GitHub Actions workflows |

## 6. Decisions reportees (a documenter ailleurs)

- **TECH-DEBT-016** (deja inscrit) : Strategie pricing Argos
- **TECH-DEBT-017 NEW** (a inscrire en 015C) : Plan de deploiement argos-functions
- **TECH-DEBT-018 NEW** (a inscrire en 015C) : Decision Stripe (garder/supprimer/refondre)
- **TECH-DEBT-019 NEW** (a inscrire en 015C) : Statut apps/docs-site (vide actuellement)

## 7. Annexe — Versions actuelles

Etat 2026-05-12 :
- Packages internes (Groupe 1) : tous a `0.3.2`
- argos-extension : `0.4.7`
- argos-functions : `0.3.2`
- docs-site : `0.3.2`

Post-realignement (Sprint 8 propose) :
- A decider lors du sprint 8 : option 1) tout aligner sur la version argos-extension du moment, option 2) reset Groupe 1 a `1.0.0` pour marquer la stabilite API.
```

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b docs/migration-plan

pnpm install
```

---

## Etape 1 — Lire MONOREPO.md pour referencer

```powershell
Get-Content Specs\MONOREPO.md | Select-Object -First 50
```

Comprendre la structure du document amont pour pouvoir s'y referer.

---

## Etape 2 — Rediger Specs/MIGRATION-PLAN.md

Sur la base du squelette fourni en "Architecture du document" ci-dessus.

### 2.1 — Structure obligatoire

7 sections principales :
1. Resume executif
2. Decisions architecturales validees (7 sous-sections)
3. Mapping de migration detaille (4 sous-sections)
4. Plan d'execution (sprints futurs)
5. Garde-fous
6. Risques identifies
7. Decisions reportees
+ Annexe versions

### 2.2 — Source ASCII strict

Le document doit etre en **ASCII strict** ou UTF-8 propre (verifiable via `node tools/regression/scan-mojibake.cjs`).

### 2.3 — Aucun execution

**ZERO modification de code, package.json, manifest, etc.** Le document est pur planification. Si tu te surprends a vouloir lancer `git mv` ou modifier un `name` dans un package.json, STOP — c'est hors scope 015B.

### 2.4 — Reporting utilisateur

Reporter a l'utilisateur a 2 moments :
1. **Apres Etape 1** : "J'ai lu MONOREPO.md. Voici la structure que je vais ecrire dans MIGRATION-PLAN.md, validation avant rediger ?"
2. **Apres Etape 2** : "Document redige (~10KB attendu). Voici les decisions principales documentees, validation avant commit ?"

---

## Etape 3 — Validation

```powershell
# Fichier present et de taille raisonnable
Test-Path Specs\MIGRATION-PLAN.md
(Get-Item Specs\MIGRATION-PLAN.md).Length
# Attendu : > 10KB (document substantiel)

# Aucune modification de code (sauf le doc lui-meme)
git diff --stat
# Attendu : seulement Specs/MIGRATION-PLAN.md

# Tests regression passing
pnpm --filter @atconseil/regression-suite test
# Attendu : 27 passing

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file with mojibake

# Pre-flight
pnpm preflight
# Attendu : Pre-flight check PASSED
```

### Allowlister si necessaire

Si un test regression echoue sur ce fichier (mots-cles "testvault-", "ATConseil", "publisher", etc. en contexte historique), allowlister dans `allowlist.ts` ET `allowlist.cjs` :

```typescript
"Specs/MIGRATION-PLAN.md",
```

---

## Etape 4 — Archive prompt + commit

### 4.1 — Archiver

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-015b.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-015b.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-015b.md
}
```

### 4.2 — Commit

```powershell
git add -A
git status

git commit `
  -m "docs(monorepo): migration plan (TECH-DEBT-015B)" `
  -m "" `
  -m "Produces Specs/MIGRATION-PLAN.md documenting validated architectural" `
  -m "decisions and migration plan based on Specs/MONOREPO.md (015A)." `
  -m "" `
  -m "Key decisions:" `
  -m "- Pattern A (TestPulse <-> Argos loose coupling via public API)" `
  -m "- Hybrid versioning strategy (3 groups: internal unified, public independent, backend independent)" `
  -m "- Rename portfolio testvault-* -> argos-* (7 packages, all non-published npm = safe)" `
  -m "- Rename testpulse-ui-shared -> argos-detection-api (true purpose: TestPulse <-> Argos detection)" `
  -m "- Delete testvault-ui (empty placeholder, zero consumers)" `
  -m "- Reserve sprints for execution (5a, 5b, 6a-6f, 7a-7b, 8, 9)" `
  -m "" `
  -m "No code execution in this sprint — pure documentation." `
  -m "" `
  -m "Refs: Specs/MONOREPO.md (015A inventory), upcoming 015C (Phase 0 gaps)."

git push -u origin docs/migration-plan
```

Puis ouvrir la PR.

---

## Criteres de done

- [ ] Branche `docs/migration-plan` creee depuis main a jour
- [ ] `Specs/MIGRATION-PLAN.md` cree, >10KB, structure complete (7 sections + annexe)
- [ ] Toutes les decisions Q1-Q5 + Q-localisation documentees
- [ ] Mapping ancien-nouveau pour 9 packages
- [ ] Sequence d'execution recommandee (Sprints 5a a 9)
- [ ] Garde-fous + risques + decisions reportees
- [ ] **Aucune modification de code** (git diff --stat = seulement le doc)
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm preflight` → PASSED
- [ ] Prompt archive dans `tools/claude-prompts/`
- [ ] Commit + PR

---

## Garde-fous TECH-DEBT-015B

⚠ **Le risque #1 = passer a l'execution**
- TENTATION : "tant qu'on a le plan, autant commencer Sprint 5a..."
- NON. 015B = pure documentation. L'execution est dans des sprints dedies futurs.
- Si Claude Code se met a faire `git mv` ou modifier un package.json, STOP immediat.

⚠ **Le risque #2 = nouvelle decision non-validee**
- Le document doit refleter les decisions deja prises (Q1-Q5 + Q-localisation).
- Si une nouvelle question emerge pendant la redaction (ex: "que faire des tests qui mentionnent testvault-"), reporter a l'utilisateur AVANT d'inscrire une decision dans le document.

⚠ **Le risque #3 = oublier 015C**
- 015C suit immediatement 015B (meme session utilisateur).
- Les TECH-DEBT-017/018/019 doivent etre inscrits dans la section 6 "Decisions reportees" pour que 015C les reprenne.

⚠ **Le risque #4 = scope creep vers spec-kit Phase 0**
- 015B ne documente pas le gap Phase 0 spec-kit (Stripe/Functions/etc.). C'est 015C.
- Mentionner brievement dans section 6 "Decisions reportees" sans elaborer.

⚠ **Le risque #5 = mojibake**
- Document long avec caracteres potentiels. Verifier ASCII strict.

---

Quand le document est produit, valide, et commit prepare, dis-le-moi. **Vraie pause de 10 min** avant 015C.
