# Prompt Claude Code — TECH-DEBT-015C (`docs/phase-0-gaps`)

> Coller dans Claude Code à la racine du repo `TestVault`.
> Sprint **documentaire** : produire `Specs/PHASE-0-GAPS.md` qui reconnait honnetement les gaps entre `Specs/spec.md` Phase 0 et la realite du code, sur la base de `Specs/MONOREPO.md` (TECH-DEBT-015A).

---

## Pré-requis (CHECKLIST AVANT DE COMMENCER)

- [ ] `git status` propre
- [ ] `git checkout main && git pull` — branche `main` à jour, TECH-DEBT-015B mergé
- [ ] `Specs/MONOREPO.md` existe (genere par 015A)
- [ ] `Specs/MIGRATION-PLAN.md` existe (genere par 015B)
- [ ] `pnpm install` passe
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `pnpm preflight` → "Pre-flight check PASSED"
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake

Si l'un echoue → STOP.

---

## Contexte

**Pourquoi ce document** : TECH-DEBT-015A a revele que `apps/argos-functions` contient 8 modules backend (webhooks, BDD sync, health, jobs, llm-proxy, **license**, **Stripe**, shared) dont plusieurs **ne sont pas mentionnes dans `Specs/spec.md` ou `Specs/tasks.md` Phase 0**.

**Reponses utilisateur 2026-05-12** :
- Q3=c : Stripe = prototype/spike, pas pris au serieux
- Q4=b : argos-functions = code local, pas deploye en prod

**Implication** : le repo contient du code reel (~25 fichiers TS prod) qui n'est :
- Pas dans le spec-kit Phase 0
- Pas deploye en prod
- Pas teste dans la chaine CI argos-extension (decouple)

Ce n'est **pas un probleme grave** (c'est de la R&D / spike), mais c'est une **dette de documentation** : un futur Claude / collaborateur qui ouvre le repo doit savoir distinguer "code production effectif" de "code spike". Aujourd'hui, sans documentation explicite, **le code spike a l'air en prod**.

**Decision** : documenter honnetement le gap via `Specs/PHASE-0-GAPS.md` + inscrire TECH-DEBT-017/018/019.

**Perimetre TECH-DEBT-015C** :
1. Produire `Specs/PHASE-0-GAPS.md` : analyse honnete des gaps spec-kit Phase 0 vs realite
2. Inscrire 3 nouvelles TECH-DEBT au backlog (CHANGELOG + REGISTRY si applicable)
3. **AUCUNE modification de code**, **AUCUNE modification de spec.md/tasks.md** (la mise a jour des specs est un sprint dedie ulterieur)

**Hors scope TECH-DEBT-015C** :
- Update de `Specs/spec.md` ou `Specs/tasks.md` (changement de Phase 0, ajout de tasks T-XX) -> sprint dedie futur
- Deploiement argos-functions -> TECH-DEBT-017 dedie
- Decision Stripe go/no-go -> TECH-DEBT-018 dedie
- Decision pricing Argos -> TECH-DEBT-016 separe (deja inscrit)
- Execution renaming -> sprints 5a-9 (definis dans 015B)

---

## Architecture du document `Specs/PHASE-0-GAPS.md`

```markdown
# Phase 0 — Gaps Spec-Kit vs Realite

> Document analytique : analyse honnete des ecarts entre `Specs/spec.md` / `Specs/tasks.md` Phase 0 et la realite du code au 2026-05-12.
> Genere dans le cadre de TECH-DEBT-015C.
> Base sur `Specs/MONOREPO.md` (015A).
> **Aucune modification du code ou des specs** — ce document est purement analytique. Les decisions correctives sont referenes vers TECH-DEBT-016/017/018/019.

## Resume executif

Le repo `apps/argos-functions` contient un backend Azure Functions complet (8 modules, ~25 fichiers TS) dont **plusieurs composants ne figurent pas dans le spec-kit Phase 0** et **ne sont pas deployes en production**. Cette situation cree une asymetrie entre l'effort de developpement investi et la documentation officielle du produit. Ce document analyse les gaps et inscrit des TECH-DEBT pour les decisions futures.

## 1. Inventaire des gaps

### 1.1 Modules argos-functions vs spec-kit

| Module argos-functions | Reference spec.md / tasks.md | Statut deploiement | Categorie gap |
|---|---|---|---|
| `webhooks/` (webhook-handler, token-service, queue-processor) | A verifier dans spec.md | Code local, pas deploye | Implementation hors-spec |
| `bdd-sync/` (git-push-handler) | A verifier dans spec.md | Code local, pas deploye | Implementation hors-spec |
| `health/` (health-handler) | Standard endpoint Azure Functions | Code local, pas deploye | Infrastructure |
| `jobs/` (flakiness-detector, timer-jobs) | A verifier dans spec.md | Code local, pas deploye | Implementation hors-spec |
| `llm-proxy/` (generate-test-cases) | A verifier dans spec.md | Code local, pas deploye | Implementation hors-spec |
| `license/` (license-engine) | Probablement absent de spec.md Phase 0 | Code local, pas deploye | Implementation hors-spec |
| **`stripe/` (stripe-webhook-handler)** | **Absent de spec.md Phase 0 (confirme utilisateur)** | **Spike / prototype** | **Hors-spec total** |
| `shared/` (audit-log, crypto, quota, llm-client, version) | Standard utilitaires | N/A | Infrastructure |

**A verifier en pratique** : ouvrir `Specs/spec.md` et `Specs/tasks.md` pour confirmer la liste des modules effectivement mentionnes. Ce tableau est une hypothese a valider.

### 1.2 Discrepancy avec deploiement reel

- L'extension Argos publiee sur Marketplace (v0.4.7) **n'appelle aucun endpoint** du backend `argos-functions`.
- L'extension utilise exclusivement l'API Azure DevOps directement (via `azure-devops-extension-api`).
- Les modules LLM proxy, license engine, webhooks, Stripe, etc. sont donc **du code mort effectif** du point de vue utilisateur final au 2026-05-12.

### 1.3 Pourquoi cette situation

Hypothese (a confirmer avec l'utilisateur si necessaire) :
- Le backend argos-functions a ete developpe en parallele de l'extension, en anticipation d'une Phase 1 ou Phase 2 du produit (monetisation, IA serveur-side, integrations).
- Stripe = experimentation pour explorer la facturation.
- License engine = anticipation d'un modele freemium / payant.
- LLM proxy = anticipation d'une integration IA centralisee plutot que key user-side.

Aucun de ces choix n'est **errone** — c'est du travail anticipe utile. Mais le **gap documentation** rend le repo confus pour un observateur externe.

## 2. TECH-DEBT inscrits

### 2.1 TECH-DEBT-017 NEW : Plan de deploiement argos-functions

**Description** : Decision a prendre sur le sort d'argos-functions :
- a) Deployer en l'etat sur Azure (effort estime : 1-2 semaines incluant configuration, tests d'integration, monitoring)
- b) Garder en developpement interne, exclure du Marketplace pour l'instant
- c) Supprimer si la roadmap ne necessite pas de backend

**Priorite** : Moyenne (depend de la roadmap commerciale Argos)
**Sprint dedie** : oui, ~2-4h de cadrage + plan deploiement
**Dependances** : TECH-DEBT-016 (pricing strategy) et TECH-DEBT-018 (Stripe go/no-go)

### 2.2 TECH-DEBT-018 NEW : Decision Stripe (garder/supprimer/refondre)

**Description** : Le module `argos-functions/src/stripe/` contient un webhook handler Stripe (spike, pas pris au serieux selon utilisateur). Decisions possibles :
- a) Garder le spike comme reference pour une future Phase de monetisation
- b) Supprimer pour eviter la confusion (peut etre re-implementee plus tard si besoin)
- c) Refondre proprement avec spec-kit Phase 1 (Stripe integration plan, test cases, securite)

**Priorite** : Faible (pas un blocker court terme, le code est isole)
**Sprint dedie** : ~15-30 min pour decision + execution
**Dependances** : TECH-DEBT-016 (pricing strategy fixe la position globale sur la monetisation)

### 2.3 TECH-DEBT-019 NEW : Statut apps/docs-site

**Description** : `apps/docs-site` est un placeholder vide (aucun `src/`, scripts echo). 3 options :
- a) Supprimer (pas utilise)
- b) Implementer un vrai site de doc (Docusaurus, Astro, etc.) avec Phase 1
- c) Garder placeholder en attente d'une decision future

**Priorite** : Tres faible (zero impact actuellement)
**Sprint dedie** : 5-10 min pour suppression OU sprint dedie 2-3h pour implementation

### 2.4 TECH-DEBT-016 (deja inscrit precedemment) : Strategie pricing Argos

Rappel : decision sur le pricing Argos (18€ ? autre ? tiered ?) est en attente depuis la session du 2026-05-12. Connecte a TECH-DEBT-017 et 018.

## 3. Impact sur la roadmap

### 3.1 Court terme (semaines a venir)

- Le gap n'est **pas un blocker** pour la stabilite de l'extension Argos actuelle.
- L'extension fonctionne en mode "frontend pur" sans dependance backend.

### 3.2 Moyen terme

Avant de :
- Implementer un nouveau module dans `argos-functions` → consulter ce document, ne pas creer de nouveau code hors-spec sans inscription au spec-kit
- Communiquer publiquement sur Argos backend → clarifier ce qui est reellement deploye vs spike

### 3.3 Long terme

Lorsque le produit Argos sera commercialise et que les TECH-DEBT-016/017/018 seront tranches :
- Mettre a jour `Specs/spec.md` avec une **Phase 1** explicite couvrant le backend
- Lier `Specs/tasks.md` aux modules argos-functions
- Aligner les tests E2E sur les modules effectivement deployes

## 4. Action immediate

Aucune. Ce document est une **reconnaissance honnete** de la situation. Les decisions correctives sont reservees aux TECH-DEBT-016/017/018/019.

## 5. Note pour les contributeurs (presents et futurs)

Si tu lis ce document apres avoir decouvert `apps/argos-functions` et te demandes "pourquoi ce backend existe-t-il ?" :

1. Le backend est **du code anticipe**, principalement non deploye.
2. L'extension Argos publiee (Marketplace v0.4.7+) **n'utilise pas ce backend**.
3. Si tu veux contribuer a argos-functions, **demande d'abord** : le module en question est-il dans la roadmap court terme ? Sinon, ce sont des heures de travail perdues.
4. Si tu veux deployer argos-functions sur Azure, **lis TECH-DEBT-017** avant — il y a un plan a faire.
```

---

## Etape 0 — Setup branche

```powershell
git checkout main
git pull
git checkout -b docs/phase-0-gaps

pnpm install
```

---

## Etape 1 — Verifier le contenu spec-kit Phase 0

```powershell
# Lire spec.md pour identifier ce qui est dans Phase 0
Get-Content Specs\spec.md | Select-String -Pattern "Phase 0|Phase 1|argos-functions|webhook|Stripe|LLM|license" -Context 2,2 | Select-Object -First 100

# Idem pour tasks.md
Get-Content Specs\tasks.md | Select-String -Pattern "Phase 0|Phase 1|argos-functions|backend|webhook|Stripe|LLM|license" -Context 2,2 | Select-Object -First 100
```

**Note** : Si le spec-kit est tres long, identifier juste les sections pertinentes. Le but est de confirmer/preciser le tableau 1.1 du document `PHASE-0-GAPS.md`.

### 1.1 — Reporter a l'utilisateur

Apres lecture, reporter :
> "J'ai parcouru spec.md et tasks.md. Voici les modules `argos-functions` mentionnes :
> - [liste]
> 
> Voici les modules **absents** :
> - [liste]
> 
> Confirmation avant rediger le document avec ce tableau detaille ?"

---

## Etape 2 — Rediger Specs/PHASE-0-GAPS.md

Sur la base du squelette ci-dessus.

### 2.1 — Structure obligatoire

5 sections :
1. Resume executif
2. Inventaire des gaps (tableau detaille)
3. TECH-DEBT inscrits (017, 018, 019, rappel 016)
4. Impact roadmap (3 horizons : court, moyen, long)
5. Action immediate (aucune) + note contributeurs

### 2.2 — Tone

**Honnete et analytique, pas accusatoire.** Le but est de documenter la realite, pas de critiquer le travail fait.

Phrases a privilegier :
- "Le module X n'est pas mentionne dans spec.md, situation a clarifier"
- "Le backend est du code anticipe utile"

Phrases a eviter :
- "Le module X aurait du etre documente"
- "C'est une erreur de ne pas avoir specifie"

### 2.3 — Source ASCII strict

Verifier mojibake en fin.

### 2.4 — Aucune modification de code

Sprint **purement documentaire**. Aucune modification de spec.md, tasks.md, package.json, code source, manifest.

### 2.5 — Reporting

3 moments de reporting utilisateur :
1. Apres Etape 1 (verification spec-kit)
2. Apres draft du tableau 1.1 (avant inscrire les TECH-DEBT 017/018/019)
3. Apres redaction complete (avant commit)

---

## Etape 3 — Update CHANGELOG + REGISTRY pour les TECH-DEBT

### 3.1 — CHANGELOG.md

Ajouter une entree `[0.4.8]` ou bloc dans `[Unreleased]` (selon convention du repo) :

```markdown
## [0.4.8] - 2026-05-12

### Added (TECH-DEBT-015C - docs/phase-0-gaps)

- **`Specs/PHASE-0-GAPS.md`** — Document analytique honnete des ecarts entre `Specs/spec.md` Phase 0 et la realite du code (8 modules `argos-functions`, dont Stripe et license engine, non mentionnes dans le spec-kit ; backend non deploye au 2026-05-12).

### Backlog enrichi

- **TECH-DEBT-017 NEW** : Plan de deploiement argos-functions (decision a/b/c sur le sort du backend, ~2-4h cadrage)
- **TECH-DEBT-018 NEW** : Decision Stripe (garder spike / supprimer / refondre Phase 1)
- **TECH-DEBT-019 NEW** : Statut apps/docs-site (placeholder vide a clarifier)
- Rappel **TECH-DEBT-016** : Strategie pricing Argos (deja inscrit precedemment)

### Lessons learned (015C)

- **Code anticipe non documente = dette latente**. Le backend argos-functions est un effort R&D solide mais non integre au spec-kit, ce qui cree de la confusion. La leçon : tout nouveau module ajoute au repo (meme experimental) merite une mention courte dans spec.md, meme juste pour dire "exploration Phase 1, non-deploye".
- **015A + 015B + 015C** consolidees livrent une vision claire du monorepo : inventaire + plan de migration + reconnaissance gaps. Base solide pour les sprints d'execution.
```

### 3.2 — REGISTRY (si entree applicable)

Pas de nouveau test regression dans 015C (sprint purement documentaire). Pas d'update REGISTRY.

---

## Etape 4 — Validation

```powershell
# Fichier present
Test-Path Specs\PHASE-0-GAPS.md
(Get-Item Specs\PHASE-0-GAPS.md).Length
# Attendu : > 5KB

# CHANGELOG mis a jour
Select-String -Path CHANGELOG.md -Pattern "TECH-DEBT-015C|TECH-DEBT-017|TECH-DEBT-018|TECH-DEBT-019"
# Attendu : presence des 4 mentions

# Aucune modification de code
git diff --stat
# Attendu : seulement Specs/PHASE-0-GAPS.md et CHANGELOG.md

# Tests passing
pnpm --filter @atconseil/regression-suite test
# Attendu : 27 passing

# Mojibake clean
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file

# Pre-flight
pnpm preflight
# Attendu : PASSED
```

### Allowlister si necessaire

Si test echoue : ajouter `Specs/PHASE-0-GAPS.md` dans allowlist.ts/cjs.

---

## Etape 5 — Archive prompt + commit

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-015c.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-015c.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-015c.md
}

git add -A
git status

git commit `
  -m "docs(spec-kit): Phase 0 gaps analysis (TECH-DEBT-015C)" `
  -m "" `
  -m "Produces Specs/PHASE-0-GAPS.md analyzing honestly the gap between" `
  -m "Specs/spec.md Phase 0 and the reality of the code in apps/argos-functions:" `
  -m "" `
  -m "- 8 backend modules exist (webhooks, BDD sync, health, jobs, llm-proxy," `
  -m "  license, Stripe, shared) but not all are mentioned in spec.md / tasks.md" `
  -m "- The backend is not deployed in production (extension uses ADO API directly)" `
  -m "- Stripe module is a spike/prototype (per user confirmation 2026-05-12)" `
  -m "" `
  -m "Inscribes 3 new TECH-DEBT for future decisions:" `
  -m "- TECH-DEBT-017: Plan deployment argos-functions" `
  -m "- TECH-DEBT-018: Stripe go/no-go decision" `
  -m "- TECH-DEBT-019: apps/docs-site placeholder status" `
  -m "" `
  -m "No code or spec modifications — purely analytical documentation." `
  -m "" `
  -m "Refs: Specs/MONOREPO.md (015A inventory), Specs/MIGRATION-PLAN.md (015B)"

git push -u origin docs/phase-0-gaps
```

PR.

---

## Criteres de done

- [ ] Branche `docs/phase-0-gaps` creee depuis main a jour
- [ ] `Specs/PHASE-0-GAPS.md` cree (>5KB, 5 sections)
- [ ] Tableau 1.1 detaille avec modules argos-functions vs spec-kit
- [ ] TECH-DEBT-017, 018, 019 documentes dans le document + dans CHANGELOG
- [ ] Rappel TECH-DEBT-016 dans le document
- [ ] CHANGELOG.md `[0.4.8]` ou `[Unreleased]` mis a jour
- [ ] **Aucune modification** de spec.md, tasks.md, code, manifest
- [ ] `pnpm --filter @atconseil/regression-suite test` → 27 passing
- [ ] `node tools/regression/scan-mojibake.cjs` → 0 mojibake
- [ ] `pnpm preflight` → PASSED
- [ ] Prompt archive dans `tools/claude-prompts/`
- [ ] Commit + PR

---

## Garde-fous TECH-DEBT-015C

⚠ **Le risque #1 = modifier spec.md / tasks.md**
- TENTATION : "tant qu'on est dans les specs, autant ajouter les modules manquants a spec.md..."
- NON. Sprint **analytique**. La mise a jour des specs est un sprint dedie ulterieur (probablement quand TECH-DEBT-017/018 seront tranches).

⚠ **Le risque #2 = ton accusatoire**
- Pas de blame du travail fait. Le code anticipe est utile.
- Documenter factuellement, ouvrir des decisions futures, ne pas juger.

⚠ **Le risque #3 = trop de detail technique**
- Le document doit etre LISIBLE par un humain qui ouvre le repo demain.
- Pas besoin de detailler chaque ligne de code argos-functions.
- Reste haut-niveau (modules, finalites).

⚠ **Le risque #4 = oublier le contexte 015A et 015B**
- 015C doit referencer 015A (`Specs/MONOREPO.md` source de l'inventaire) et 015B (`Specs/MIGRATION-PLAN.md` pour les TECH-DEBT renaming).
- Cross-references explicites dans le document.

⚠ **Le risque #5 = mojibake**
- Discipline habituelle. Verifier avec scan-mojibake en fin.

---

Quand le document est produit, valide, et commit prepare, dis-le-moi.

**Session intense : 015A + 015B + 015C livres aujourd'hui = base methodologique exceptionnelle.** Apres 015C : vraie pause + mockups GUI optionnels.
