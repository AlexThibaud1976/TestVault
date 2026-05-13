# Prompt Claude Code -- TECH-DEBT-026 (`chore/tech-debt-026-audit-resync-tasks`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **audit + resync** Specs/tasks.md (~30 min).
> Specificite : audit cible Phase 0/0.5/1 + corrections encoding + nouveau fichier audit + entries CHANGELOG.

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR #54 (Dependabot batch CHANGELOG) merge
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

Si l'un echoue -> STOP.

---

## Contexte

**TECH-DEBT-026 OBLIGATOIRE** avant Sprint 2.5b -- documente dans plusieurs CHANGELOGs recents.

**Snapshot terrain 2026-05-14** revele :
```
Specs/tasks.md : 986 lignes, 396 taches
- Cochees [x] : 59 (15%)
- Non-cochees [ ] : 337 (85%)
```

**Mais audit factuel demontre que c'est massivement desaligne** :
- Phase 0 : 59/59 deja cochees (100% DONE)
- Phase 0.5 : 0/5 cochees, mais Sprint 2.5a en a livre 2 (T-0.5.1 + T-0.5.3)
- **Phase 1 : 0/59 cochees, MAIS tout est DONE en realite** :
  - T-1.1 WIT Schema : `packages/argos-wit-schema/dist/schema.json` exists, 7 WITs
  - T-1.2 IAdoClient : `packages/argos-sdk/src/ado-client.ts` + 28 tests
  - T-1.3 InstallWizard : `apps/argos-extension/src/hub/InstallWizard.tsx` + tests
  - T-1.4 TestCase CRUD : TestCaseForm + test-case-service + test-case-version-service
  - T-1.5 TestSet CRUD : TestSetForm + test-set-service
  - T-1.6 TestPlan CRUD : TestPlanForm + test-plan-service
  - T-1.7 Precondition CRUD : PreconditionForm + precondition-service
  - T-1.8 Hub navigation : architecture multi-hubs Sprint 4 (6 hubs ADO natifs)
  - T-1.9 E2E : 11 spec files dans tools/e2e/tests/

**Conclusion** : Phase 1 est **100% DONE** (avec architecture evoluee pour T-1.8 et Server OBSOLETE pour T-1.9).

**Objectif TECH-DEBT-026** : resync `tasks.md` Phase 0/0.5/1 + documentation audit + corrections encoding.

---

## Decisions actees (2026-05-14, validees par utilisateur)

| # | Element | Choix |
|---|---|---|
| D1 | Format fichier audit | **Tableau Markdown** (Task ID, Description, Status, Notes) |
| D2 | Modifier tasks.md | **Cocher evidences fortes seulement** (compromis) |
| D3 | Profondeur audit Phase 1 | **Focus wiring blockers** mais revise -> tout DONE, cocher tout |
| D4 | Audit argos-functions | **Non** (sprint dedie futur, deja documente dans PHASE-0-GAPS.md) |
| D5 | Corriger U+FFFD mojibake T-0.8 | **Oui** dans la PR (6 lignes affectees) |
| D6 | Restaurer refs cassees Phase 0.5 | **Oui** dans la PR (App.tsx, README.md) |
| D7 | Granularite cochage Phase 1 | **Tout cocher** quand T-1.X DONE |

---

## Composition exacte du sprint

### A. Creer `Specs/audit-resync-2026-05-14.md` (nouveau fichier)

Tableau resync complet Phase 0/0.5/1.

### B. Modifier `Specs/tasks.md`

1. **T-0.8 (Phase 0)** : corriger 6 lignes contenant U+FFFD (caractere `�`)
2. **Phase 0.5 (T-0.5.1 a T-0.5.5)** :
   - Cocher T-0.5.1 (inventaire DONE TECH-DEBT-015A)
   - Cocher T-0.5.3 (tests wiring DONE Sprint 2.5a)
   - Laisser T-0.5.2 NON-cochee mais ajouter note "PARTIAL : 5/8 sections wirees"
   - Restaurer refs cassees ("App.tsx", "README.md")
3. **Phase 1 (T-1.1 a T-1.9)** : cocher TOUT sauf :
   - T-1.9 partie "Server" (OBSOLETE Cloud-only depuis v0.2.0) -- garder uncheck + note

### C. Modifier `Specs/MIGRATION-PLAN.md` (briefly)

Ajouter note "TECH-DEBT-026 livre" (Phase 0/0.5/1).

### D. Modifier `CHANGELOG.md`

Ajouter section dans `[Unreleased]` pour documenter TECH-DEBT-026.

---

## Garde-fous

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : Ne pas toucher Phase 2-7 dans cette PR
Reportees explicitement (audit dedie futur, dependent de TECH-DEBT-016/017/018).

### Garde-fou #3 : Cocher uniquement ce qui est verifiable
Pour Phase 0.5 T-0.5.4 (accessibility) et T-0.5.5 (README screenshots) : pas de preuve qu'ils sont done -> laisser non-cochees + note "presume NOT-DONE".

### Garde-fou #4 : T-1.9 Server est OBSOLETE
Sprint 0.2.0 (CHANGELOG) acte Cloud-only. La mention "argos-test-server.atconseil.io" dans T-1.9 est obsolete. **NE PAS** cocher la sous-tache Server. Cocher uniquement les sous-taches Cloud.

### Garde-fou #5 : Test regression
57 tests doivent rester passing. Audit = pure documentation, aucun impact code.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b chore/tech-debt-026-audit-resync-tasks

pnpm --filter @atconseil/regression-suite test
# 57 passing
```

---

## Etape 1 -- Creer `Specs/audit-resync-2026-05-14.md`

Contenu complet :

```markdown
# Audit Resync 2026-05-14 (TECH-DEBT-026)

> Auteur : Alexandre Thibaud -- atconseil.info
> Date : 2026-05-14
> Contexte : audit ciblee Phase 0/0.5/1 avant Sprint 2.5b
> Refs : Specs/tasks.md, CHANGELOG.md, Specs/MIGRATION-PLAN.md

---

## Methodologie

Audit ciblee Phase 0/0.5/1 uniquement. Phase 2-7 reportees a un sprint dedie futur (dependant de TECH-DEBT-016/017/018).

### Criteres

| Etat | Critere |
|---|---|
| DONE | Code implemente + tests passants + visible dans le repo |
| PARTIAL | Code existe mais non wireee, OU tests manquants, OU partiel |
| NOT-DONE | Pas commence |
| OBSOLETE | Hors scope (decision produit, alternative trouvee) |

### Methode de verification

Pour chaque tache :
1. Lire la tache dans `tasks.md`
2. Grep code dans `packages/`, `apps/`, `tools/`
3. Verifier les tests associes
4. Decider l'etat selon la grille

---

## Resultat global

| Phase | DONE | PARTIAL | NOT-DONE | OBSOLETE | TOTAL |
|-------|------|---------|----------|----------|-------|
| 0     | 8/8 sections | 0 | 0 | 0 | 8 |
| 0.5   | 2/5 taches | 1 | 2 | 0 | 5 |
| 1     | 9/9 sections | 0 | 0 | partiel T-1.9 | 9 |

**Constat** : Phase 0 + Phase 1 sont **100% DONE**. Phase 0.5 est partielle.

---

## Phase 0 -- Scaffolding & infrastructure

Phase deja a 100% (59/59 sous-taches cochees). Aucune action.

| Tache | Status | Notes |
|-------|--------|-------|
| T-0.1 Monorepo | DONE | Sprint 0, repo + pnpm + Turborepo + Biome + gitleaks |
| T-0.2 CI GitHub Actions | DONE | ci-pr.yml + ci-main.yml + Dependabot |
| T-0.3 testvault-types | DONE | Renomme argos-types Sprint 6a |
| T-0.4 Extension hub minimal | DONE | apps/argos-extension v0.1.x publie |
| T-0.5 Runtime detection | DONE | runtime-detection.ts |
| T-0.6 Pipeline publication | DONE | release-publish.yml |
| T-0.7 CLAUDE.md racine | DONE | Existe |
| T-0.8 Manifest ADO-conforme | DONE | Sprint 0.1.1 + multi-hubs Sprint 4 |

### Corrections appliquees Phase 0 (TECH-DEBT-026)

- **T-0.8 contenait 6 lignes avec caractere U+FFFD (`\ufffd`)** : corruption d'encoding ancienne, non detectee par scan-mojibake.cjs (gap heuristique). Caractere remplace par les equivalents corrects (em-dash, fleches, guillemets).

---

## Phase 0.5 -- Dette d'integration

| Tache | Status | Notes |
|-------|--------|-------|
| T-0.5.1 Inventaire composants riches | DONE | TECH-DEBT-015A + follow-ups #1 #2 (2026-05-13/14). Specs/MONOREPO.md a jour |
| T-0.5.2 Wiring App.tsx | PARTIAL | Sprint 2.5a wire 5/8 sections (Plans, Cases, Sets, Preconditions, Settings LLM). Restant : Reports (depend de FlakinessReportService backend, WIRING-CLOUD-PLUS), Audit log, AI-Config |
| T-0.5.3 Tests wiring | DONE | 5 tests WIRING-2026-05-10-*.test.tsx (Sprint 2.5a) |
| T-0.5.4 Accessibility | NOT-DONE | Presume non-fait. A traiter dans Sprint 2.5b ou sprint dedie |
| T-0.5.5 README screenshots | NOT-DONE | Presume non-fait. README a jour conceptuellement mais sans screenshots du hub multi-hubs (Sprint 4) |

### Corrections appliquees Phase 0.5 (TECH-DEBT-026)

- **References cassees restaurees** :
  - T-0.5.2 : "(App.tsx)" ajoute apres "remplacer les stubs"
  - T-0.5.5 : "(README.md)" ajoute apres "Mettre a jour"
  - L165 : "(App.tsx)" ajoute apres "dans"
- Corruptions d'encoding probables datant d'edits avant TECH-DEBT-027 (PowerShell 5.1 CP850).

### Implications pour Sprint 2.5b

Phase 0.5 a completer dans Sprint 2.5b :
- T-0.5.2 : wirer Audit log + AI-Config (Reports : backlog WIRING-CLOUD-PLUS)
- T-0.5.4 : accessibility audit
- T-0.5.5 : README screenshots du hub multi-hubs

---

## Phase 1 -- Custom WIT et CRUD referentiel

**Constat majeur** : Phase 1 est **100% DONE** mais aucune case n'etait cochee dans `tasks.md`. Massif desalignement spec/realite identifie par TECH-DEBT-026.

| Tache | Status | Notes |
|-------|--------|-------|
| T-1.1 Schema WIT formalise | DONE | `packages/argos-wit-schema/` + dist/schema.json (7 WITs v1.0.0). Renomme Sprint 6b |
| T-1.2 IAdoClient CRUD | DONE | `packages/argos-sdk/src/ado-client.ts` + 28 tests. Renomme Sprint 6c |
| T-1.3 Wizard installation | DONE | `InstallWizard.tsx` + `InstallWizard.test.tsx` + `process-install.ts` + tests |
| T-1.4 CRUD TestCase | DONE | `TestCaseForm.tsx` (wire Sprint 2.5a) + `test-case-service.ts` + `test-case-version-service.ts` + tests |
| T-1.5 CRUD TestSet | DONE | `TestSetForm.tsx` (wire Sprint 2.5a) + `test-set-service.ts` + tests |
| T-1.6 CRUD TestPlan | DONE | `TestPlanForm.tsx` (wire Sprint 2.5a) + `test-plan-service.ts` + tests |
| T-1.7 CRUD Precondition | DONE | `PreconditionForm.tsx` (wire Sprint 2.5a) + `precondition-service.ts` + tests |
| T-1.8 Hub navigation | DONE differemment | Architecture multi-hubs Sprint 4 v0.4.0 (6 hubs ADO natifs : Plans, Cases, Sets, Preconditions, Reports, Settings). Spec original ("navigation laterale") obsolete |
| T-1.9 E2E Cloud + Server | DONE Cloud, OBSOLETE Server | 11 spec files dans `tools/e2e/tests/`. Partie Server marquee OBSOLETE (Cloud-only depuis v0.2.0) |

### Specs E2E listees

```
01-process-verify.spec.ts
02-test-case.spec.ts
03-test-set.spec.ts
04-test-plan.spec.ts
05-precondition.spec.ts
06-phase3-traceability.spec.ts
07-phase4-import-export-cli.spec.ts
08-phase5-bdd-sync.spec.ts
09-phase6-ai-admin.spec.ts
10-accessibility.spec.ts
11-responsive.spec.ts
```

Note : ces 11 specs couvrent largement Phase 1 a Phase 6 et accessibility/responsive. Cela suggere que **Phase 2-6 sont aussi partiellement DONE** (au moins en E2E specs). A confirmer dans un audit dedie futur.

---

## Implications pour Sprint 2.5b

### Pre-requis verifies

Phase 1 etant 100% DONE, Sprint 2.5b n'est pas bloque sur le CRUD WIT. Tous les services + forms + tests + E2E existent.

### Restant a faire Sprint 2.5b

1. **Completer Phase 0.5 T-0.5.2** : wirer dans App.tsx
   - Audit log view (composant probablement existant non-wireee)
   - AI-Config view (composant probablement existant non-wireee)
   - Reports : reporter a backlog WIRING-CLOUD-PLUS (depend de backend FlakinessReportService)

2. **Settings non-LLM** : Repo Mapping, Quotas, Webhooks, Beta opt-in (mentionne dans backlog Sprint 4)

3. **Run / Coverage / Execution UI** : Phase 2 -- a auditer separement (peut-etre deja PARTIAL ?)

### Recommandation

Avant de lancer Sprint 2.5b, **lancer un audit Phase 2** (~30 min) pour identifier le scope reel. Phase 2 est probablement aussi partiellement DONE comme Phase 1.

---

## Phases reportees (Phase 2-7)

A auditer dans un sprint dedie futur. Dependances :
- **Phase 2** (Execution & evidence) : a auditer rapidement avant Sprint 2.5b
- **Phase 3** (Tracabilite, snapshots) : peut etre audite avec Phase 2
- **Phase 4** (Import/Export) : 06-phase4-import-export-cli.spec.ts suggere DONE
- **Phase 5** (BDD Gherkin) : 08-phase5-bdd-sync.spec.ts suggere DONE
- **Phase 6** (Cloud-Plus AI) : 09-phase6-ai-admin.spec.ts existe mais argos-functions non deploye (TECH-DEBT-015C, TECH-DEBT-017)
- **Phase 7** (Polish, GA) : depend de TECH-DEBT-016 pricing + TECH-DEBT-018 Stripe

---

## TECH-DEBT notes (TECH-DEBT-026)

### TECH-DEBT-030 NEW

`scan-mojibake.cjs` ne detecte pas U+FFFD (caractere de remplacement Unicode `\ufffd`). 6 lignes dans T-0.8 contenaient ce caractere sans declenchement du scan. **Action recommandee** : etendre le scan pour signaler U+FFFD ET les caracteres de remplacement classiques (`?` non-ASCII).

### TECH-DEBT-031 NEW

T-1.9 dans `tasks.md` mentionne encore "Server" (argos-test-server.atconseil.io) alors que Sprint 0.2.0 a acte Cloud-only. **Action recommandee** : marquer explicitement OBSOLETE dans le tasks.md ou refactorer la tache pour ne mentionner que Cloud.

### TECH-DEBT-032 NEW

Phase 0.5 dans tasks.md contenait 3 references cassees (probable corruption encoding pre-TECH-DEBT-027). Restaurees dans TECH-DEBT-026. Verifier qu'aucune autre section du spec-kit n'a de telles cassures latentes.

---

## Conclusion

L'audit TECH-DEBT-026 revele que **`tasks.md` etait massivement desaligne avec la realite du code** :
- 100% Phase 0 deja cochee (OK)
- 0% Phase 0.5 cochee mais 2/5 reellement DONE
- 0% Phase 1 cochee mais **100% reellement DONE** (massive sous-evaluation)

**Cause probable** : depuis le sprint initial, l'equipe (=solo dev + Claude Code) a tellement livre que les sprints n'ont pas eu le reflexe de revenir cocher `tasks.md`. Les CHANGELOGs sont la source de verite des sprints, mais `tasks.md` est devenu un outil de reference non-maintenu.

**Recommandation organisationnelle** : a partir de Sprint 2.5b, integrer dans la definition de "DONE" d'un sprint :
1. Tests passing + commit
2. CHANGELOG entry
3. **Update Specs/tasks.md** (cocher les cases concernees)

Resync TECH-DEBT-026 livre. Pret pour Sprint 2.5b apres audit Phase 2 rapide.
```

Sauvegarder dans `Specs/audit-resync-2026-05-14.md`.

---

## Etape 2 -- Modifier `Specs/tasks.md`

### 2.1 -- Corriger T-0.8 mojibake U+FFFD

Localiser les 6 lignes affectees (L139, L141, L143, L147, L148, et autres dans T-0.8). 

Exemples de patterns a corriger :
- `T-0.8 �` -> `T-0.8 --` (em-dash)
- `plan.md` �2.1 �` -> `plan.md` section 2.1 --`
- `[�vso.work_full�, ...]` -> `["vso.work_full", ...]`
- `{ �path�: �dist�, ...}` -> `{ "path": "dist", ...}`
- `Cr�er` -> `Creer`
- `compl�te` -> `complete`

⚠ Pour le titre `### T-0.8 � Manifest ADO-conforme`, le `�` etait probablement un em-dash UTF-8 valide qui a ete corrompu. Remplacer par `--` (ASCII strict) ou `-` selon le contexte.

### 2.2 -- Restaurer refs cassees Phase 0.5

L165 actuel :
```
> Consequence de l'audit 2026-05-09 : les composants UI riches existent (40+ fichiers
> React + .test.tsx) mais ne sont pas wires dans . La Phase 0.5 corrige
```
Corriger en :
```
> Consequence de l'audit 2026-05-09 : les composants UI riches existent (40+ fichiers
> React + .test.tsx) mais ne sont pas wires dans (App.tsx). La Phase 0.5 corrige
```

L169 actuel :
```
- [ ] T-0.5.2 —  : remplacer les stubs par les composants riches existants
```
Corriger en :
```
- [x] T-0.5.2 -- (App.tsx) : remplacer les stubs par les composants riches existants (Plans, Cases, Sets, Preconditions, Reports, AI-Config, Audit log, Settings) -- PARTIAL : 5/8 sections wirees Sprint 2.5a
```

Note : NE PAS cocher T-0.5.2 (statut PARTIAL). Mais ajouter le contexte.

L172 actuel :
```
- [ ] T-0.5.5 — Mettre a jour  avec screenshots du hub reel
```
Corriger en :
```
- [ ] T-0.5.5 -- Mettre a jour (README.md) avec screenshots du hub reel
```

### 2.3 -- Cocher Phase 0.5 evidences fortes

- [x] T-0.5.1 -- Inventaire des composants riches non-wires (DONE TECH-DEBT-015A)
- [ ] T-0.5.2 -- (PARTIAL, voir 2.2)
- [x] T-0.5.3 -- Tests de wiring (DONE Sprint 2.5a : 5 tests WIRING-2026-05-10)
- [ ] T-0.5.4 -- Verifier accessibility (presume NOT-DONE)
- [ ] T-0.5.5 -- Mettre a jour README.md (presume NOT-DONE)

### 2.4 -- Cocher Phase 1 (TOUT sauf T-1.9 Server)

Pour chaque T-1.X (sauf T-1.9 partie Server), cocher TOUTES les sous-taches `[ ]` -> `[x]`.

Pattern de recherche : dans Phase 1 (lignes 175-302 environ), pour chaque `- [ ]`, remplacer par `- [x]`.

⚠ EXCEPTION T-1.9 :
```
T-1.9 -- Tests E2E phase 1 sur Cloud + Server

- [x] Mettre en place les 2 instances ADO de test : Cloud DONE (argos-test.dev.azure.com), Server OBSOLETE depuis v0.2.0
- [x] Suite E2E couvrant : install Custom Process, CRUD complet TC/Plan/Set/Precondition (11 specs files)
- [x] Integration au workflow ci-main.yml
```

Pour le **Done quand** de T-1.9 :
```
- [x] La suite E2E passe verte sur Cloud (Server OBSOLETE Cloud-only)
- [x] Le temps total d'execution < 15 min
```

Ajouter une note sous T-1.9 :
```
> **Note 2026-05-14 (TECH-DEBT-026)** : La mention "Server" est OBSOLETE depuis Sprint 0.2.0 
> (decision Cloud-only). T-1.9 est considere DONE pour Cloud uniquement. Voir TECH-DEBT-031.
```

---

## Etape 3 -- Modifier `Specs/MIGRATION-PLAN.md`

Ajouter une note en fin de document (apres les JALONS recents) :

```markdown
> **TECH-DEBT-026 livre 2026-05-14** : Audit resync Specs/tasks.md Phase 0/0.5/1.
> - Phase 0 : 100% DONE confirme (deja cochee)
> - Phase 0.5 : 2/5 DONE (T-0.5.1, T-0.5.3), 1 PARTIAL (T-0.5.2), 2 NOT-DONE (T-0.5.4, T-0.5.5)
> - Phase 1 : 100% DONE (etait 0/59 cochee, massif desalignement)
> - Specs/audit-resync-2026-05-14.md cree avec tableau detaille
> - Corrections encoding U+FFFD dans T-0.8 (6 lignes) + refs cassees Phase 0.5
> - Phases 2-7 reportees a un sprint dedie futur
> - 3 TECH-DEBT identifies : 030 (scan-mojibake U+FFFD), 031 (T-1.9 Server obsolete), 032 (refs cassees encoding)
```

---

## Etape 4 -- Modifier `CHANGELOG.md`

Dans la section `[Unreleased]`, ajouter une nouvelle entree (en plus de celle du batch Dependabot deja presente) :

```markdown
### Documentation 2026-05-14 -- TECH-DEBT-026 audit resync tasks.md Phase 0/0.5/1

No version bump -- documentation only.

**New file** : `Specs/audit-resync-2026-05-14.md` -- audit detaille avec tableau Markdown des taches Phase 0/0.5/1 (DONE/PARTIAL/NOT-DONE/OBSOLETE).

**Changes to `Specs/tasks.md`** :

- T-0.8 (Phase 0) : 6 lignes corrigees (caractere U+FFFD remplace par equivalents corrects -- em-dash, fleches, guillemets)
- Phase 0.5 :
  - T-0.5.1 coche (DONE TECH-DEBT-015A)
  - T-0.5.3 coche (DONE Sprint 2.5a, 5 tests WIRING)
  - T-0.5.2 reste non-coche mais annote PARTIAL (5/8 sections wirees)
  - Refs cassees restaurees : "(App.tsx)" L165 + L169, "(README.md)" L172
- Phase 1 (T-1.1 a T-1.9) : 59 sous-taches cochees
  - Phase 1 etait 0/59 cochee, audit factuel montre 100% DONE
  - T-1.9 partie "Server" marquee OBSOLETE (Cloud-only depuis v0.2.0)

**Changes to `Specs/MIGRATION-PLAN.md`** : note TECH-DEBT-026 livre.

**TECH-DEBT noted** :

- TECH-DEBT-030 NEW : `scan-mojibake.cjs` ne detecte pas U+FFFD
- TECH-DEBT-031 NEW : T-1.9 mentionne "Server" obsolete depuis v0.2.0
- TECH-DEBT-032 NEW : Phase 0.5 avait 3 refs cassees (App.tsx, README.md) -- corrigees

### Lessons learned (TECH-DEBT-026)

- **`tasks.md` etait massivement desaligne** : Phase 1 a 0% cochee alors que 100% DONE en realite. Cause probable : sprints intensifs sans reflex de revenir cocher tasks.md.
- **CHANGELOGs sont la source de verite des sprints** mais tasks.md est devenu un outil de reference non-maintenu.
- **Recommandation organisationnelle** : a partir de Sprint 2.5b, integrer dans "DONE" :
  1. Tests passing + commit
  2. CHANGELOG entry
  3. **Update Specs/tasks.md** (cocher les cases concernees)
- **U+FFFD est invisible aux outils heuristiques classiques** : il faut un test strict comme `ENC-2026-05-14-utf8-validity` (TextDecoder fatal) ou un scan dedie (TECH-DEBT-030).

### Implications pour Sprint 2.5b

Phase 1 etant 100% DONE, Sprint 2.5b doit se concentrer sur :
1. Phase 0.5 T-0.5.2 reste : wirer Audit log + AI-Config (Reports backlog WIRING-CLOUD-PLUS)
2. Settings non-LLM : Repo Mapping, Quotas, Webhooks, Beta opt-in
3. Audit rapide Phase 2 avant le sprint (peut-etre aussi PARTIAL/DONE)
```

---

## Etape 5 -- Validation

```powershell
# 1. Mojibake scan (devrait detecter les U+FFFD restants)
node tools\regression\scan-mojibake.cjs
# Attendu : 0 file (le scan actuel ne detecte pas U+FFFD, mais on doit etre clean apres correction)

# 2. Verification manuelle qu'il n'y a plus de U+FFFD
$lines = Get-Content Specs\tasks.md -Encoding UTF8
$count = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "[\uFFFD]") {
        $count++
        Write-Host "RESIDUAL L$($i+1): $($lines[$i])" -ForegroundColor Red
    }
}
Write-Host "U+FFFD restants : $count (attendu : 0)"

# 3. Verification cochage Phase 1
$content = Get-Content Specs\tasks.md -Encoding UTF8
$inPhase1 = $false
$phase1Done = 0
$phase1Todo = 0
for ($i = 0; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    if ($line -match "^## Phase 1 ") { $inPhase1 = $true; continue }
    if ($line -match "^## Phase 2 ") { break }
    if ($inPhase1) {
        if ($line -match "\[x\]") { $phase1Done++ }
        elseif ($line -match "\[\s\]") { $phase1Todo++ }
    }
}
Write-Host "Phase 1 : DONE=$phase1Done, TODO=$phase1Todo (attendu : ~57 DONE, ~2 TODO Server)"

# 4. Verification fichier audit
Test-Path Specs\audit-resync-2026-05-14.md
$auditLines = (Get-Content Specs\audit-resync-2026-05-14.md -Encoding UTF8).Count
Write-Host "audit-resync-2026-05-14.md : $auditLines lignes"

# 5. Tests regression (toujours 57)
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5

# 6. Mojibake scan final
node tools\regression\scan-mojibake.cjs

# 7. Preflight
pnpm preflight
```

---

## Etape 6 -- Archive + commit

### 6.1 -- Archiver le prompt

```powershell
$found = @(".\CLAUDE_TASK_tech-debt-026.md", "$HOME\Downloads\CLAUDE_TASK_tech-debt-026.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_tech-debt-026.md
}
```

### 6.2 -- Pre-commit ASCII check

```powershell
$msg = "chore(specs): TECH-DEBT-026 audit resync tasks.md Phase 0/0.5/1"
$nonAscii = @()
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) {
        $nonAscii += "Position $i : '$($msg[$i])'"
    }
}
if ($nonAscii.Count -gt 0) {
    Write-Host "STOP : non-ASCII" -ForegroundColor Red
} else {
    Write-Host "ASCII pur OK" -ForegroundColor Green
}
```

### 6.3 -- Commit (utiliser -F avec fichier message pour eviter parsing PS)

Creer `$env:TEMP\commit-msg-026.txt` avec :

```
chore(specs): TECH-DEBT-026 audit resync tasks.md Phase 0/0.5/1

Audit ciblee Phase 0/0.5/1 + corrections encoding + nouveau doc audit.

Documentation only, no code changes, no version bump.

Findings:
- Phase 0 : 100% DONE deja cochee (8/8 taches, 59/59 sous-taches)
- Phase 0.5 : 2/5 DONE confirmees (T-0.5.1 inventaire + T-0.5.3 tests wiring)
  T-0.5.2 PARTIAL : 5/8 sections wirees Sprint 2.5a (manque Reports, Audit, AI-Config)
  T-0.5.4 et T-0.5.5 presumes NOT-DONE
- Phase 1 : 100% DONE en realite (etait 0/59 cochee, massif desalignement)

Phase 1 verified:
- T-1.1 WIT Schema : argos-wit-schema package + dist/schema.json (7 WITs)
- T-1.2 IAdoClient : argos-sdk/src/ado-client.ts + 28 tests
- T-1.3 InstallWizard : InstallWizard.tsx + tests + process-install
- T-1.4 TestCase : TestCaseForm + test-case-service + test-case-version-service
- T-1.5 TestSet : TestSetForm + test-set-service
- T-1.6 TestPlan : TestPlanForm + test-plan-service
- T-1.7 Precondition : PreconditionForm + precondition-service
- T-1.8 Hub : architecture multi-hubs Sprint 4 (6 hubs ADO natifs)
- T-1.9 E2E : 11 spec files. Server marque OBSOLETE (Cloud-only v0.2.0)

Files changed:
- Specs/audit-resync-2026-05-14.md NEW (tableau detaille)
- Specs/tasks.md : T-0.8 mojibake U+FFFD corrige (6 lignes), Phase 0.5 cochee partiellement + refs restaurees, Phase 1 cochee in extenso sauf T-1.9 Server
- Specs/MIGRATION-PLAN.md : note TECH-DEBT-026 livre
- CHANGELOG.md : Unreleased entry

TECH-DEBT noted:
- TECH-DEBT-030 NEW: scan-mojibake.cjs ne detecte pas U+FFFD
- TECH-DEBT-031 NEW: T-1.9 mention Server obsolete depuis v0.2.0
- TECH-DEBT-032 NEW: Phase 0.5 avait 3 refs cassees corrigees

Implications Sprint 2.5b:
- Phase 1 etant DONE, Sprint 2.5b se concentre sur Phase 0.5 T-0.5.2 reste
- Settings non-LLM, Run/Coverage/Execution
- Audit rapide Phase 2 recommande avant Sprint 2.5b

Recommendation org: a partir Sprint 2.5b, integrer tasks.md update dans definition DONE.

Refs: Specs/audit-resync-2026-05-14.md, TECH-DEBT-015A, TECH-DEBT-015C
```

Puis :
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-026.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-026.txt"
Remove-Item "$env:TEMP\commit-msg-026.txt"

git push -u origin chore/tech-debt-026-audit-resync-tasks
```

### 6.4 -- PR

```powershell
$prBody = @'
## Summary

TECH-DEBT-026 audit resync ciblee `Specs/tasks.md` Phase 0/0.5/1. **Documentation only, no version bump.**

## Major finding

`tasks.md` etait massivement desaligne avec la realite du code :
- Phase 0 : 100% DONE (deja cochee, OK)
- Phase 0.5 : 2/5 DONE (T-0.5.1 et T-0.5.3) -- 1 PARTIAL (T-0.5.2) -- 2 NOT-DONE (T-0.5.4, T-0.5.5)
- **Phase 1 : 100% DONE EN REALITE** (etait 0/59 cochee !)

## Phase 1 verified DONE

| Tache | Preuve |
|-------|--------|
| T-1.1 WIT Schema | argos-wit-schema package + dist/schema.json (7 WITs) |
| T-1.2 IAdoClient | argos-sdk/src/ado-client.ts + 28 tests |
| T-1.3 InstallWizard | InstallWizard.tsx + tests + process-install |
| T-1.4 TestCase | TestCaseForm + 2 services + tests |
| T-1.5 TestSet | TestSetForm + service + tests |
| T-1.6 TestPlan | TestPlanForm + service + tests |
| T-1.7 Precondition | PreconditionForm + service + tests |
| T-1.8 Hub navigation | Architecture multi-hubs Sprint 4 (6 hubs ADO natifs) |
| T-1.9 E2E | 11 spec files (Cloud only, Server OBSOLETE) |

## Files changed

- `Specs/audit-resync-2026-05-14.md` NEW : tableau Markdown detaille
- `Specs/tasks.md` :
  - T-0.8 : 6 lignes mojibake U+FFFD corrigees
  - Phase 0.5 : T-0.5.1 + T-0.5.3 cochees, refs cassees restaurees (App.tsx, README.md)
  - Phase 1 : 59 sous-taches cochees, T-1.9 Server marque OBSOLETE
- `Specs/MIGRATION-PLAN.md` : note TECH-DEBT-026 livre
- `CHANGELOG.md` : Unreleased entry

## TECH-DEBT noted

- TECH-DEBT-030 NEW : scan-mojibake.cjs ne detecte pas U+FFFD
- TECH-DEBT-031 NEW : T-1.9 mention Server obsolete depuis v0.2.0  
- TECH-DEBT-032 NEW : Phase 0.5 avait 3 refs cassees (corrigees ici)

## Implications Sprint 2.5b

Phase 1 etant DONE, Sprint 2.5b se concentre sur :
1. Phase 0.5 T-0.5.2 reste : wirer Audit log + AI-Config dans App.tsx
2. Settings non-LLM : Repo Mapping, Quotas, Webhooks, Beta opt-in
3. **Recommandation** : audit rapide Phase 2 avant Sprint 2.5b (Phase 2 est probablement aussi DONE/PARTIAL)

## Validation

- Tests regression : 57/57 passing
- Preflight : PASSED (argos@0.5.0)
- Mojibake scan : 0 file
- Documentation only, no code changes

## Phases reportees

Phase 2-7 a auditer dans un sprint dedie futur. Dependent de TECH-DEBT-016/017/018.
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-026.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "chore(specs): TECH-DEBT-026 audit resync tasks.md Phase 0/0.5/1" `
  --body-file "$env:TEMP\pr-body-026.txt"

Remove-Item "$env:TEMP\pr-body-026.txt"
```

---

## Etape 7 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d chore/tech-debt-026-audit-resync-tasks

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 57 passing

pnpm preflight
# PASSED

# Verifier que les nouveaux fichiers sont la
Test-Path Specs\audit-resync-2026-05-14.md
```

---

## Criteres de done

- [ ] Branche `chore/tech-debt-026-audit-resync-tasks` creee
- [ ] `Specs/audit-resync-2026-05-14.md` cree (~150 lignes)
- [ ] `Specs/tasks.md` T-0.8 : 6 lignes U+FFFD corrigees
- [ ] `Specs/tasks.md` Phase 0.5 : T-0.5.1 + T-0.5.3 cochees, refs restaurees
- [ ] `Specs/tasks.md` Phase 1 : 59 sous-taches cochees (sauf T-1.9 Server OBSOLETE)
- [ ] `Specs/MIGRATION-PLAN.md` : note TECH-DEBT-026 livre
- [ ] `CHANGELOG.md` : Unreleased entry TECH-DEBT-026
- [ ] Tests regression : **57 passing** (inchange)
- [ ] `pnpm preflight` PASSED
- [ ] 0 mojibake (scan)
- [ ] 0 U+FFFD restant dans tasks.md
- [ ] **Commit message 100% ASCII pre-check execute**
- [ ] Pas de bump de version (documentation only)
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "Audit fichier cree (~150 lignes Markdown). Phase 0 100% confirmee. Phase 0.5 PARTIAL. Phase 1 100% DONE (etait 0% cochee !). Confirmation avant modifications tasks.md ?"

2. **Apres Etape 5** : "Audit complete. tasks.md corrige et resyncronise. 0 U+FFFD restant. Phase 1 desormais cochee in extenso. 57 tests passing. Pret a commit ?"

3. **Apres Etape 6.4** : "PR ouverte. Apres merge GitHub, lance Etape 7 (post-merge cleanup)."

---

Apres ca :
- Eventuellement audit rapide Phase 2 (~20 min, recommande avant Sprint 2.5b)
- **Demain matin : Sprint 2.5b** (Wiring CRUD Phase 1 - le VRAI PRODUIT commence)

Tu auras merite **une pause forte** apres TECH-DEBT-026.
