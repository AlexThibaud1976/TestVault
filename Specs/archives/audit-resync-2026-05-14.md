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

- **T-0.8 contenait 6 lignes avec caractere U+FFFD (`�`)** : corruption d'encoding ancienne, non detectee par scan-mojibake.cjs (gap heuristique). Caractere remplace par les equivalents corrects (em-dash, fleches, guillemets).

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

`scan-mojibake.cjs` ne detecte pas U+FFFD (caractere de remplacement Unicode `�`). 6 lignes dans T-0.8 contenaient ce caractere sans declenchement du scan. **Action recommandee** : etendre le scan pour signaler U+FFFD ET les caracteres de remplacement classiques.

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
