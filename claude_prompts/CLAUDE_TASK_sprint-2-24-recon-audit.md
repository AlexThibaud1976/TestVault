# CLAUDE_TASK -- Sprint 2.24 / Recon + Audit (READ-ONLY)

> Cible        : Claude Code, sur le repo E:\Code\TestVault
> Date         : 2026-05-29
> Type         : RECON / AUDIT -- lecture seule. Ni Pattern A (spec patch) ni Pattern B (code).
> Source verite: les fichiers LIVE Specs/ du repo (PAS les copies chat, qui sont perimees)
> Branche      : aucune. Travail read-only sur `main` a jour. Aucun commit, aucun push, aucune PR.
> Duree estimee: 30-45 min
> Livrable     : un RAPPORT colle en retour de session (structure en fin de fichier)

---

## 1. Contexte executif

Les copies du spec-kit cote chat sont perimees : constitution v0.5.1 datee du 12 mai 2026,
ANTERIEURE au pivot no-backend (decision du 22 mai, constitution S6.0) et a CHANGE 0 / PR #96.
Elles decrivent encore les Azure Functions ATConseil comme architecture active.

Avant de scoper Sprint 2.24, on a besoin du ground truth depuis le repo, pour deux raisons :
1. Confirmer que CHANGE 0 / PR #96 a entierement purge l'architecture Azure Functions des
   4 fichiers spec-kit (aucun residu en section active).
2. Etablir le contenu REEL de la Phase 3 post-CHANGE-0 (numerotation, etat des cases) et
   distinguer le net-new du deja-cable pour le perimetre Part 2 choisi : versioning core
   = T-3.1 (liens bidirectionnels + coverage panel) + T-3.2 (snapshots TestCaseVersion)
   + T-3.4 (snapshot auto au lock du Test Plan, qui solde TECH-DEBT-T223-Snapshot).

Risque si on saute cette etape : scoper sur du sable et re-specifier du code deja livre
(exactement la lecon PF-3 du Sprint 2.23, ou Sprint 2.5d avait deja cable les WIT views).

Decision actee en chat (2026-05-29) :
- Sprint 2.24 Part 1 = T223-Routing + T223-ExecPath + release Marketplace privee v0.5.34 (gate)
- Sprint 2.24 Part 2 = versioning core T-3.1 + T-3.2 + T-3.4 ; la matrice (T-3.5/T-3.6) -> Sprint 2.25

---

## 2. Regles non-negociables pour CETTE tache

- READ-ONLY ABSOLU. Aucune modification de fichier. Aucun fix. Aucun patch spec. Aucun bump.
- Aucune branche, aucun commit, aucun `git push`, aucune PR.
- Si l'audit detecte une incoherence : la DOCUMENTER dans le rapport. NE PAS la corriger
  (la correction passera par un Pattern A separe, valide ensuite par Alexandre).
- N'inscris aucun nom de modele LLM litteral ni terme concurrent dans le rapport (regle anti-allowlist).
- Les checks ADO API / Marketplace / BCEE-QA ne sont PAS faits ici : Alexandre valide a la main.

---

## 3. Prerequis

```bash
cd E:\Code\TestVault
git checkout main
git pull --ff-only
git status            # doit etre clean
pnpm install --frozen-lockfile
```

Si `main` n'est pas clean ou que `git pull` n'est pas fast-forward : STOP, reporter l'etat, ne rien faire d'autre.

---

## 4. Workflow numerote (read-only)

### Etape 1 -- Audit de coherence du spec-kit LIVE

Si le skill `argos-coherence-audit` est installe cote Claude Code, l'utiliser sur les 4 fichiers
Specs/ (constitution.md, spec.md, plan.md, tasks.md). Sinon, executer les 7 categories a la main :

```bash
# CAT 2 -- contradictions semantiques (no-backend / Cloud-only / publisher / WIT)
#   Attendu post-CHANGE-0 : aucune mention "Azure Functions" en SECTION ACTIVE.
#   (Les entrees de changelog historiques qui DECRIVENT l'ancienne archi sont tolerees.)
grep -niE "azure function" Specs/constitution.md Specs/spec.md Specs/plan.md Specs/tasks.md

#   Publisher : Argos = AlexThibaud. ATConseil reserve a TestPulse.
grep -niE "publisher.{0,20}atconseil" Specs/*.md

#   Cloud-only : Server/TFS/VS Code uniquement en listes "hors scope" ou personas, pas comme supporte.
grep -niE "\bTFS\b|Team Foundation Server|Server 2022" Specs/*.md

#   WIT : aucune derivation de Microsoft.VSTS.WorkItemTypes.* (prefixe TestVault.* impose, S12).
grep -niE "Microsoft\.VSTS\.WorkItemTypes" Specs/*.md

# CAT 3 -- marqueurs de patch residuels (ne doivent JAMAIS etre dans les fichiers cibles)
grep -niE "^## PATCH|REMPLACER l.integralite|A AJOUTER apres|conserver le design existant" Specs/*.md

# CAT 3-bis -- artefacts CLAUDE_TASK mal places (attendu : 0 hors claude_prompts/)
find . -maxdepth 1 -name "CLAUDE_TASK_*.md" -type f
find Specs -name "CLAUDE_TASK_*.md" -type f

# CAT 4 -- changelog constitution : toute section SN.M recente a une entree changelog.
#   Verifier en particulier qu'il EXISTE une entree changelog + une section pour la decision
#   no-backend (S6.0). Si la section S6.0 existe mais sans entree changelog -> WARNING.
grep -niE "^## |^### |6\.0|client-side|no.?backend" Specs/constitution.md | head -40

# CAT 5 -- desync versions (groupe Changesets fixed)
grep -H '"version"' package.json apps/argos-extension/package.json
grep -niE "\"version\"|\"id\"" apps/argos-extension/vss-extension.json | head
git tag --list "v*" | tail -5
node tools/regression/... 2>/dev/null || true   # si un test de versioning existe, le lancer :
pnpm test tools/regression/CFG-2026-05-14-fixed-versioning.test.ts --run

# CAT 7 -- integrite allowlist
grep -rl "gpt-4" claude_prompts 2>/dev/null
node -e "const a=require('./tools/regression/allowlist.cjs'); const fs=require('fs'); a.forEach(p=>{ if(!fs.existsSync(p)) console.log('ORPHAN:',p); })"
```

Produire le verdict : CLEAN / N WARNINGS / N ERRORS, avec le contexte semantique de chaque hit
(un grep brut ne suffit pas : une mention en changelog historique est legitime, une mention en
section active est un bug).

### Etape 2 -- Ground truth Phase 3 (contenu reel post-CHANGE-0)

```bash
# Section Phase 3 reelle dans le tasks.md LIVE (numerotation + etat des cases)
grep -nE "Phase 3|^### T-3\." Specs/tasks.md
# Puis afficher la section complete Phase 3 (du titre Phase 3 au titre Phase 4)
```

Pour chacune des taches du perimetre Part 2 choisi -- T-3.1, T-3.2, T-3.4 -- relever :
- le libelle exact et l'etat de la case ([ ] ou [x]) dans le tasks.md LIVE ;
- les US/F referencees dans Specs/spec.md (US-3.1, US-3.2, US-3.3, US-3.4, F2, F3) et leur contenu actuel.

Signaler si la numerotation T-3.x du repo DIFFERE de celle des copies chat (T-3.1 liens,
T-3.2 snapshots TestCaseVersion, T-3.3 diff, T-3.4 snapshot auto au lock, T-3.5 matrice, T-3.6 export).

### Etape 3 -- Net-new vs deja-cable (le coeur de la recon)

Pour chaque tache du perimetre Part 2, grep le code pour etablir ce qui existe deja :

```bash
# T-3.1 -- liens bidirectionnels WI <-> TestCase + Coverage Panel
grep -rniE "TestedBy|Validates|Covers|linkedTestCaseIds|coverage" apps/argos-extension/src | head -40
ls apps/argos-extension/src/**/CoveragePanel* 2>/dev/null
ls apps/argos-extension/src/widgets 2>/dev/null

# T-3.2 -- snapshots TestCaseVersion (service + UI + immutabilite)
grep -rniE "TestCaseVersion|createSnapshot|listSnapshots|frozenFields|immutab" apps/argos-extension/src packages/*/src | head -40

# T-3.4 -- snapshot auto au lock du Test Plan (= TECH-DEBT-T223-Snapshot)
grep -rniE "lock.*plan|plan.*lock|lockedSnapshotIds|testCaseVersionId|Locked" apps/argos-extension/src packages/*/src | head -40

# Backlog TECH-DEBT : confirmer le lien T-3.4 <-> T223-Snapshot et reperer les items adjacents
grep -rniE "TECH-DEBT-T223|T223-Snapshot|T223-ExecPath|T223-Routing|T223-PCResolve|useArgosUpdate" Specs CHANGELOG.md docs 2>/dev/null | head -40
```

Classer chaque tache en : DEJA-CABLE / PARTIEL / NET-NEW, preuve fichier(s) a l'appui.

### Etape 4 -- Part 1 : confirmer la nature des deux blockers

```bash
# T223-Routing : Run Test + Re-run -- chercher le placeholder de routing
grep -rniE "Run Test|Re-run|rerun|routing|navigate.*test-execution" apps/argos-extension/src | head -30
# T223-ExecPath : champs TestExecution censes read-only
grep -rniE "TestExecution|readOnly|read-only|disabled" apps/argos-extension/src | grep -iE "execution" | head -30
```

Confirmer que ce sont bien des items de code au niveau repo, independants du spec-kit, et donc
attaquables en Part 1 quel que soit l'etat des specs.

---

## 5. Scenario d'echec

- `main` non clean / pull non fast-forward -> STOP, reporter, ne rien toucher.
- `pnpm install` echoue -> reporter l'erreur, ne pas contourner.
- Un test de regression lance en CAT 5 echoue -> le NOTER dans le rapport, ne pas corriger.
- L'audit trouve un ERROR (residu Azure Functions en section active, orphelin allowlist, etc.)
  -> documenter precisement (fichier:ligne + contexte), NE PAS corriger ici.

---

## 6. Ce que tu ne fais pas (anti-scope-creep)

- Aucune modification de fichier, aucun fix d'incoherence, aucun patch spec.
- Aucune implementation de la Phase 3, aucune creation de service/composant.
- Aucun bump de version, aucune branche, aucun commit, aucun push, aucune PR.
- Aucun refactor "tant qu'on y est".
- Aucun appel ADO / Marketplace / BCEE-QA.

---

## 7. Rapport final attendu (a coller en retour a Alexandre)

```markdown
# Recon Sprint 2.24 -- {date}

## A. Verdict audit coherence spec-kit LIVE
CLEAN / N WARNINGS / N ERRORS
- 3 findings les plus critiques (fichier:ligne + contexte + severite)
- Confirmation explicite : CHANGE 0 / PR #96 a-t-il purge Azure Functions des sections actives ? OUI/NON
- Constitution : la section no-backend (S6.0) existe-t-elle ? a-t-elle son entree changelog ?

## B. Ground truth Phase 3 (tasks.md LIVE)
- Numerotation reelle T-3.x (et tout ecart vs les copies chat)
- Etat des cases pour T-3.1 / T-3.2 / T-3.4
- US/F spec.md correspondantes : contenu actuel resume

## C. Net-new vs deja-cable (perimetre Part 2)
| Tache | Statut | Preuve (fichiers) | Reste a faire |
|-------|--------|-------------------|---------------|
| T-3.1 liens + coverage |  |  |  |
| T-3.2 snapshots TestCaseVersion |  |  |  |
| T-3.4 auto-snapshot au lock |  |  |  |
- Confirmation : T-3.4 == TECH-DEBT-T223-Snapshot ? OUI/NON

## D. Part 1 -- nature des blockers
- T223-Routing : localisation du placeholder, ampleur estimee
- T223-ExecPath : ou les champs ne sont pas reellement read-only

## E. Inputs pour estimation Part 2
- Estimation horaire honnete par tache, compte tenu du deja-cable
- Risques / dependances reperees
- Versions actives (package.json / vss-extension.json) + dernier tag
```

---

## 8. Cleanup de ce fichier (post-session)

Ce CLAUDE_TASK est read-only et ne genere ni branche ni merge. Apres la session :

```powershell
# Deplacer ce fichier vers claude_prompts/ (convention)
Move-Item -Path .\CLAUDE_TASK_sprint-2-24-recon-audit.md -Destination .\claude_prompts\ -Force
```

Pas d'entree allowlist necessaire : ce fichier ne contient aucun nom de modele LLM ni terme
declencheur. (A re-verifier si tu l'edites : `grep -niE "gpt-4|xray" claude_prompts\CLAUDE_TASK_sprint-2-24-recon-audit.md` doit etre vide.)
```
