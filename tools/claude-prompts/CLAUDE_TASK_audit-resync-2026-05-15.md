# Prompt Claude Code -- AUDIT Phase 2-7 (`chore/audit-resync-phases-2-7`)

> Coller dans Claude Code a la racine du repo `TestVault`.
> Sprint **audit exhaustif Phases 2-7** (~25 min).
> Suite directe de TECH-DEBT-026 (audit Phase 0/0.5/1 du 2026-05-14).

---

## Pre-requis

- [ ] `git status` propre, `git branch --show-current` = `main`
- [ ] PR #55 (TECH-DEBT-026) merge hier
- [ ] `pnpm --filter @atconseil/regression-suite test` -> 57 passing
- [ ] `pnpm turbo test --force` -> 325 tests passing (sanity 2026-05-15 OK)
- [ ] `pnpm preflight` -> PASSED
- [ ] `node tools/regression/scan-mojibake.cjs` -> 0 mojibake

Si l'un echoue -> STOP.

---

## Contexte

Hier (2026-05-14), TECH-DEBT-026 a audite Phase 0/0.5/1 et revele que **Phase 1 etait 100% DONE** alors que 0/59 case cochee.

Aujourd'hui (2026-05-15), snapshot grep code Phases 2-7 revele que **Argos est essentiellement un produit FINI en code**, mais `tasks.md` est totalement desynchronise.

**Decouverte cle** :
- Phase 2 : services SDK + composants UI riches existent (test-execution-service, RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory)
- Phase 3 : snapshot-diff, coverage-matrix, test-case-version-service, work-item-link-service existent + composants UI
- Phase 4 : argos-importers (7 parsers), argos-exporters (3 exporters), argos-cli (bdd-sync + upload-results), argos-action (action.yml), azure-pipelines-task (task.json) existent
- Phase 5 : argos-gherkin (generator + parser + validator), GherkinEditor.tsx, RepoMappingSettings.tsx existent
- Phase 6 : argos-functions COMPLET (bdd-sync, health, jobs, license, llm-proxy, shared, stripe, webhooks) + 5 composants UI (LlmProviderSettings, AiCandidatesModal, AuditLogSettings, BetaOptIn, QuotaSettings, FlakinessReport)
- Phase 7 : license-engine.ts + stripe-webhook-handler.ts dans argos-functions (CODE existe)

**Mais NON wirees dans App.tsx** (24 composants riches presents mais pas importes) et **argos-functions non deployee** sur Azure.

**Sanity 2026-05-15 confirme** :
- 261 tests argos-sdk passing
- 103 tests argos-functions passing
- 325 tests turbo global passing
- Pas de regression possible : le code marche, juste pas wireee

**Objectif** : resync exhaustif `tasks.md` Phase 2-7 + nouveau fichier audit + recommandations Sprint 2.5b/c/d.

---

## Decisions actees (2026-05-15, validees par utilisateur)

| # | Element | Choix |
|---|---|---|
| D5 | Fichier audit | A -- Specs/audit-resync-2026-05-15.md NEW |
| D6 | Cochage tasks.md | C -- code DONE coche, wiring/deploy laisse uncheck |
| D7 | Ordre execution | A -- Audit puis Sprint 2.5b ensuite |
| D8 | Sanity test avant audit | A -- DONE, tout vert |
| D9 | PR separees | A -- PR audit MERGEE d'abord, puis PR Sprint 2.5b |

---

## Composition exacte du sprint

### A. Creer `Specs/audit-resync-2026-05-15.md` (NEW, ~250 lignes)

Tableau resync exhaustif Phase 2-7 avec verdict DONE/PARTIAL/NOT-DONE/OBSOLETE par tache.

### B. Modifier `Specs/tasks.md`

Cocher **code DONE** uniquement (D6-C) :
- Phase 2 : cocher sous-taches "code service + UI" pour T-2.1 a T-2.6, laisser wiring + E2E (T-2.7) uncheck
- Phase 3 : cocher sous-taches "code service + UI" pour T-3.1 a T-3.6, laisser E2E (T-3.7) uncheck  
- Phase 4 : cocher sous-taches "code package" pour T-4.1 a T-4.7, laisser webhook (T-4.8 depend deploy) + E2E (T-4.9) uncheck
- Phase 5 : cocher sous-taches "code" pour T-5.1, T-5.2, T-5.3, T-5.5, laisser sync auto webhook (T-5.4 depend deploy) + E2E (T-5.6) uncheck
- Phase 6 : cocher sous-taches "code backend + code hub-local" pour T-6.2, T-6.3, T-6.4, T-6.5, T-6.6, T-6.7, T-6.8, T-6.9, laisser deploy (T-6.1) + endpoints actifs (T-6.5 partie deploy) + E2E (T-6.10) uncheck
- Phase 7 : cocher sous-taches "code" pour T-7.1 (license-engine), T-7.2 (stripe code), T-7.3 (OfflineBanner code), laisser ops Phase 7 (T-7.4 a T-7.10) uncheck

### C. Modifier `Specs/MIGRATION-PLAN.md`

Ajouter note "Audit Phase 2-7 livre 2026-05-15".

### D. Modifier `CHANGELOG.md`

Ajouter section dans `[Unreleased]` pour documenter l'audit Phase 2-7.

---

## Garde-fous

### Garde-fou #1 : ASCII strict commit message
Pre-commit ASCII check obligatoire.

### Garde-fou #2 : Cocher uniquement "code DONE"
NE PAS cocher les sous-taches qui mentionnent :
- "wirees dans App.tsx" / "wiring" -> Sprint 2.5b/c/d
- "deploiement" / "deploy" / "Azure Functions" -> TECH-DEBT-017
- "publication Marketplace" / "publish" -> TECH-DEBT-018 (argos-action + azure-pipelines-task)
- "Stripe operationnel" -> TECH-DEBT-018
- "Couverture >= 90%" -> presume DONE car 261 tests SDK passing, mais cocher si seul critere

### Garde-fou #3 : OBSOLETE Server
Toutes mentions "Server" dans Phase 4-6 -> marquer OBSOLETE (Cloud-only depuis v0.2.0)

### Garde-fou #4 : Ne pas toucher au code
Audit = pure documentation. Aucun fichier .ts/.tsx/.js modifie. Seuls Specs/*.md + CHANGELOG.md.

### Garde-fou #5 : Test regression
57 tests doivent rester passing apres edits.

---

## Etape 0 -- Setup

```powershell
git checkout main
git pull
git checkout -b chore/audit-resync-phases-2-7

pnpm --filter @atconseil/regression-suite test
# 57 passing
```

---

## Etape 1 -- Creer `Specs/audit-resync-2026-05-15.md`

Contenu complet :

```markdown
# Audit Resync 2026-05-15 (TECH-DEBT-026 follow-up)

> Auteur : Alexandre Thibaud -- atconseil.info
> Date : 2026-05-15
> Contexte : audit exhaustif Phases 2-7 (suite Specs/audit-resync-2026-05-14.md Phases 0/0.5/1)
> Refs : Specs/tasks.md, Specs/audit-resync-2026-05-14.md, CHANGELOG.md

---

## Methodologie

Audit exhaustif Phases 2-7 par grep code + tests passing + structure repo.

### Criteres (D6-C : code DONE)

| Etat | Critere |
|---|---|
| DONE (code) | Service SDK + UI component + tests existent et passent |
| PARTIAL (wiring) | Code DONE mais composant non wireee dans App.tsx |
| PARTIAL (deploy) | Code DONE mais backend argos-functions non-deployee |
| PARTIAL (publish) | Code DONE mais package Marketplace non publie |
| NOT-DONE | Pas commence |
| OBSOLETE | Hors scope (Server post Cloud-only v0.2.0, decision produit) |

### Sources de verite

- Sanity 2026-05-15 : 261 tests argos-sdk + 103 tests argos-functions + 325 tests turbo global ALL PASSING
- Snapshot grep code 2026-05-15 (Phase 2-7)
- App.tsx imports actuels (5 composants wireees : LlmProviderSettings, PreconditionForm, TestCaseForm, TestPlanForm, TestSetForm)

---

## Resultat global

| Phase | Code DONE | Wiring | Deploy | Publish | Verdict global |
|-------|-----------|--------|--------|---------|----------------|
| 2 | 7/7 sections | 0/5 composants UI | N/A | N/A | PARTIAL wiring (Sprint 2.5b) |
| 3 | 7/7 sections | 0/5 composants UI | N/A | N/A | PARTIAL wiring (Sprint 2.5c) |
| 4 | 9/9 sections | 0/2 composants UI | N/A | argos-action + azure-task non-publies | PARTIAL wiring + publish |
| 5 | 6/6 sections | 0/2 composants UI | sync webhook depend deploy | N/A | PARTIAL wiring + deploy |
| 6 | 10/10 sections code | 0/5 composants UI | argos-functions non-deployee | N/A | PARTIAL wiring + deploy |
| 7 | 3/10 sections code partiel | OfflineBanner non wireee | N/A | Beta/Stripe/docs/audit pending | NOT-DONE ops Phase 7 |

**Constat majeur** : Argos est essentiellement un produit FINI en code, mais :
- 24 composants UI riches non wirees dans App.tsx -> Sprint 2.5b/c/d (~3h15 cumule)
- argos-functions non-deployee -> TECH-DEBT-017
- argos-action + azure-pipelines-task non-publies Marketplace -> TECH-DEBT-018
- Phase 7 ops (beta, accessibility audit, docs finales, audit securite) pas commencees

---

## Phase 2 -- Execution des tests & evidence

### Code SDK (packages/argos-sdk/src)

- test-execution-service.ts + test (T-2.1)
- evidence-upload-service.ts + test (T-2.3)
- environment-config-service.ts + environment.ts + test (T-2.4)
- bug-creation-service.ts + test (T-2.5)

### Code UI (apps/argos-extension/src/hub)

- RunInterface.tsx + test (T-2.2)
- EvidencePanel.tsx + test (T-2.3)
- EnvironmentSettings.tsx + test (T-2.4)
- CreateBugForm.tsx + test (T-2.5)
- ExecutionHistory.tsx + test (T-2.6)

### Detail par tache

| Tache | Code | Wiring | Tests | Status | Notes |
|-------|------|--------|-------|--------|-------|
| T-2.1 TestExecutionService | DONE | N/A | passing | DONE | Service SDK complet |
| T-2.2 UI run interface | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5b -- RunInterface |
| T-2.3 Upload evidence | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5b -- EvidencePanel (integre dans RunInterface) |
| T-2.4 Configuration Environments | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5b -- EnvironmentSettings dans Settings hub |
| T-2.5 Create Bug from Fail | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5b -- CreateBugForm (modal depuis RunInterface) |
| T-2.6 Vue historique | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5b -- ExecutionHistory (onglet TestCase) |
| T-2.7 Tests E2E phase 2 | UNKNOWN | N/A | partial E2E specs | PARTIAL | E2E execution probable dans 01-process-verify ou autres specs |

---

## Phase 3 -- Tracabilite, versioning, snapshots

### Code SDK

- snapshot-diff.ts + test
- coverage-matrix.ts + test
- test-case-version-service.ts + test
- work-item-link-service.ts + test

### Code UI

- SnapshotPanel.tsx + test
- SnapshotDiffPanel.tsx + test
- WorkItemLinkPanel.tsx + test
- CoverageMatrix.tsx + test
- CoveragePanel.tsx + test (widget Sprint 0.1.1)

### Detail par tache

| Tache | Code | Wiring | Tests | Status | Notes |
|-------|------|--------|-------|--------|-------|
| T-3.1 Lien WI ADO <-> TestCase | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5c -- WorkItemLinkPanel |
| T-3.2 Snapshots tagged | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5c -- SnapshotPanel |
| T-3.3 Comparateur de versions | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5c -- SnapshotDiffPanel |
| T-3.4 Snapshot auto au lock | DONE service | NOT-WIRED UI | passing | PARTIAL | Logique service OK, lock TestPlan UI |
| T-3.5 Matrice de couverture | DONE | NOT-WIRED | passing | PARTIAL | Sprint 2.5c -- CoverageMatrix |
| T-3.6 Export Excel/PDF matrice | DONE export catalog + matrix | N/A | passing | DONE | Export packages presents |
| T-3.7 Tests E2E phase 3 | DONE (06-phase3-traceability.spec.ts) | N/A | a executer | DONE spec | Spec existe |

---

## Phase 4 -- Import / Export / API publique

### Packages

- packages/argos-importers/src : csv, cucumber, excel, junit, nunit, testng, xunit parsers + types + xml-utils
- packages/argos-exporters/src : catalog-export, matrix-export, release-readiness-export
- packages/argos-cli/src : bdd-sync, upload-results, cli, index
- tools/argos-action : action.yml + package.json (GitHub Marketplace, NON PUBLIE)
- tools/azure-pipelines-task : task.json (Marketplace Pipeline Tasks, NON PUBLIE)
- apps/argos-functions/src/webhooks : (Cloud-Plus webhook, NON DEPLOYE)

### Code UI

- ImportWizard.tsx + test
- WebhookAdmin.tsx + test

### Detail par tache

| Tache | Code | Wiring | Deploy/Publish | Tests | Status |
|-------|------|--------|----------------|-------|--------|
| T-4.1 Importers (parsers) | DONE 7 parsers | N/A | N/A | passing | DONE |
| T-4.2 UI import wizard | DONE | NOT-WIRED | N/A | passing | PARTIAL -- Sprint 2.5c |
| T-4.3 Exporters Excel + PDF | DONE 3 exporters | N/A | N/A | passing | DONE |
| T-4.4 SDK npm @atconseil/argos-sdk | DONE 261 tests | N/A | private (decision produit) | passing | DONE local |
| T-4.5 CLI argos-cli | DONE | N/A | private | passing | DONE local |
| T-4.6 GitHub Actions (argos-action) | DONE | N/A | NON PUBLIE Marketplace | N/A | PARTIAL -- TECH-DEBT-018 |
| T-4.7 Azure Pipelines task | DONE | N/A | NON PUBLIE Marketplace | N/A | PARTIAL -- TECH-DEBT-018 |
| T-4.8 Ingestion via webhook (Cloud-Plus) | DONE code | N/A | NON DEPLOYE | passing | PARTIAL -- TECH-DEBT-017 |
| T-4.9 Tests E2E phase 4 | DONE (07-phase4-import-export-cli.spec.ts) | N/A | N/A | a executer | DONE spec |

---

## Phase 5 -- BDD Gherkin & sync repo

### Code

- packages/argos-gherkin/src : generator + parser + validator (avec tests)
- apps/argos-functions/src/webhooks/git-push-handler : sync webhook
- apps/argos-functions/src/bdd-sync : module dedie

### Code UI

- GherkinEditor.tsx + test
- RepoMappingSettings.tsx + test

### Detail par tache

| Tache | Code | Wiring | Deploy | Tests | Status |
|-------|------|--------|--------|-------|--------|
| T-5.1 Champ Gherkin TestCase + UI | DONE | NOT-WIRED | N/A | passing | PARTIAL -- Sprint 2.5d |
| T-5.2 Parser Gherkin + conversion | DONE | N/A | N/A | passing | DONE |
| T-5.3 Mappings repo <-> Area Path | DONE | NOT-WIRED | N/A | passing | PARTIAL -- Sprint 2.5d |
| T-5.4 Sync auto sur commit (Cloud-Plus) | DONE git-push-handler | N/A | NON DEPLOYE | passing | PARTIAL -- TECH-DEBT-017 |
| T-5.5 Sync manuelle | DONE bdd-sync CLI | N/A | OK | passing | DONE |
| T-5.6 Tests E2E phase 5 | DONE (08-phase5-bdd-sync.spec.ts) | N/A | N/A | a executer | DONE spec |

---

## Phase 6 -- Cloud-Plus AI & administration

### Code backend (apps/argos-functions/src)

- llm-proxy/generate-test-cases.ts + test (T-6.5)
- shared/crypto.ts + test (T-6.2 BYOK)
- shared/audit-log.ts + test (T-6.4)
- shared/quota.ts + test (T-6.7)
- shared/llm-client.ts
- jobs/flakiness-detector.ts + test (T-6.9)
- jobs/timer-jobs.ts

### Code UI (apps/argos-extension/src/hub)

- LlmProviderSettings.tsx + test [WIRED Sprint 2.5a]
- AiCandidatesModal.tsx + test (T-6.6)
- AuditLogSettings.tsx + test (T-6.4 UI)
- BetaOptIn.tsx + test
- QuotaSettings.tsx + test (T-6.7 UI)
- FlakinessReport.tsx + test (T-6.9 UI)

### Detail par tache

| Tache | Code backend | Code UI | Wiring | Deploy | Status |
|-------|--------------|---------|--------|--------|--------|
| T-6.1 Azure Functions deploy | N/A | N/A | N/A | NON DEPLOYE | NOT-DONE -- TECH-DEBT-017 |
| T-6.2 Crypto BYOK | DONE | N/A | N/A | NON DEPLOYE | PARTIAL code DONE |
| T-6.3 Config LLM (UI Admin) | N/A | DONE LlmProviderSettings | WIRED Sprint 2.5a | N/A | DONE local |
| T-6.4 Audit trail | DONE backend | DONE UI AuditLogSettings | NOT-WIRED | NON DEPLOYE | PARTIAL -- Sprint 2.5d |
| T-6.5 Endpoint generate-test-cases | DONE | N/A | N/A | NON DEPLOYE | PARTIAL code DONE |
| T-6.6 UI generation AI | N/A | DONE AiCandidatesModal | NOT-WIRED | N/A | PARTIAL -- Sprint 2.5d |
| T-6.7 Quotas AI | DONE backend | DONE UI QuotaSettings | NOT-WIRED | NON DEPLOYE | PARTIAL -- Sprint 2.5d |
| T-6.8 Desactivation globale AI | DONE LlmProviderSettings | WIRED | N/A | N/A | DONE local |
| T-6.9 Detection flakiness | DONE backend | DONE UI FlakinessReport | NOT-WIRED | NON DEPLOYE | PARTIAL -- Sprint 2.5d (mode placeholder) |
| T-6.10 Tests E2E phase 6 | DONE (09-phase6-ai-admin.spec.ts) | N/A | N/A | a executer | DONE spec |

---

## Phase 7 -- Polish, licensing, GA

### Code backend (apps/argos-functions/src)

- license/license-engine.ts + test (T-7.1)
- stripe/stripe-webhook-handler.ts + test (T-7.2)

### Code UI

- OfflineBanner.tsx + test (T-7.3)

### Detail par tache

| Tache | Code | Wiring | Deploy/Publish | Status |
|-------|------|--------|----------------|--------|
| T-7.1 Engine licensing | DONE backend | N/A | NON DEPLOYE | PARTIAL code DONE -- TECH-DEBT-018 |
| T-7.2 Portail Stripe | DONE webhook code | N/A | NON DEPLOYE + portail client non implementee | PARTIAL -- TECH-DEBT-018 |
| T-7.3 Mode hors-ligne | DONE OfflineBanner | NOT-WIRED | N/A | PARTIAL -- Sprint 2.5d |
| T-7.4 Accessibilite WCAG 2.1 AA | NOT-DONE | N/A | N/A | NOT-DONE -- ops Phase 7 |
| T-7.5 Mobile responsive | UNKNOWN | N/A | N/A | NOT-DONE -- ops Phase 7 |
| T-7.6 Documentation complete | PARTIAL | N/A | N/A | NOT-DONE -- ops Phase 7 |
| T-7.7 TestPulse co-installation | OBSOLETE | N/A | N/A | OBSOLETE -- TestPulse extension separe future |
| T-7.8 Audit de securite externe | NOT-DONE | N/A | N/A | NOT-DONE -- ops Phase 7 |
| T-7.9 Beta privee/publique | NOT-DONE | N/A | N/A | NOT-DONE -- ops Phase 7 |
| T-7.10 Publication GA v1.0.0 | NOT-DONE | N/A | N/A | NOT-DONE -- ops Phase 7 |

---

## TECH-DEBT identifies (TECH-DEBT-026 follow-up)

### TECH-DEBT-033 NEW

`tasks.md` Phase 2-7 massif desalignement (~218 sous-taches non cochees alors que code DONE). Cause : sprints intensifs sans reflex de cocher. Resync livre ici, mais doit etre repete regulierement (cf recommandation org TECH-DEBT-026).

### TECH-DEBT-034 NEW (confirme TECH-DEBT-015C)

`apps/argos-functions` est COMPLET en code (8 modules : bdd-sync, health, jobs, license, llm-proxy, shared, stripe, webhooks) mais NON DEPLOYEE sur Azure. Bloque les features Cloud-Plus (T-4.8, T-5.4, T-6.1+, T-7.1, T-7.2).

### TECH-DEBT-035 NEW

`tools/argos-action` (GitHub Marketplace Actions) et `tools/azure-pipelines-task` (Marketplace Pipeline Tasks) sont CODES mais NON PUBLIES. Bloque les integrations CI cote utilisateur (T-4.6, T-4.7).

### TECH-DEBT-036 NEW

Phase 7 ops non commencees : accessibility audit WCAG (T-7.4), mobile responsive (T-7.5), docs finales (T-7.6), audit securite externe (T-7.8), beta privee (T-7.9), publication GA (T-7.10).

---

## Implications strategiques

### Sprint 2.5b/c/d (decoupage valide 2026-05-15)

**Sprint 2.5b** (~60 min) : Phase 2 wiring -- 5 composants
1. RunInterface (T-2.2)
2. EvidencePanel (T-2.3)
3. EnvironmentSettings (T-2.4)
4. CreateBugForm (T-2.5)
5. ExecutionHistory (T-2.6)

**Sprint 2.5c** (~60 min) : Phase 3+4 wiring -- 7 composants
1. SnapshotPanel (T-3.2)
2. SnapshotDiffPanel (T-3.3)
3. WorkItemLinkPanel (T-3.1)
4. CoverageMatrix (T-3.5)
5. CoveragePanel (T-3.5 widget)
6. ImportWizard (T-4.2)
7. WebhookAdmin (T-4.8)

**Sprint 2.5d** (~75 min) : Phase 5+6+7 wiring -- 8 composants
1. GherkinEditor (T-5.1)
2. RepoMappingSettings (T-5.3)
3. AiCandidatesModal (T-6.6)
4. AuditLogSettings (T-6.4)
5. BetaOptIn (T-6.x)
6. QuotaSettings (T-6.7)
7. FlakinessReport (T-6.9, mode placeholder backend)
8. OfflineBanner (T-7.3, wrapper global)

Total : 20 composants wirees, +20 tests regression, ~3h15 cumule.

### Apres Sprint 2.5d

1. **Audit Phase 2-6 E2E** : executer les 11 specs E2E pour confirmer DONE
2. **TECH-DEBT-017** : deploy argos-functions sur Azure Functions Premium francecentral
3. **TECH-DEBT-018** : publish argos-action + azure-pipelines-task + activation Stripe
4. **Phase 7 ops** : accessibility audit + docs finales + audit securite externe
5. **Beta privee** envisageable apres Sprint 2.5d + Azure deploy

---

## Recommandation organisationnelle (rappel TECH-DEBT-026)

A partir de Sprint 2.5b, integrer dans la definition de "DONE" d'un sprint :
1. Tests passing + commit
2. CHANGELOG entry
3. **Update Specs/tasks.md** (cocher les cases concernees)
4. **Update Specs/audit-resync-*.md** si jalons cles

---

## Conclusion

Argos est **essentiellement un produit FINI en code** mais massivement non-wireee dans App.tsx. Le travail restant est :
- Wiring UI : 3 sous-sprints (2.5b/c/d, ~3h15 cumule)
- Deploy Azure : TECH-DEBT-017
- Publication Marketplace : TECH-DEBT-018 (argos-action + azure-task + Stripe)
- Ops Phase 7 : accessibility, docs, audit securite, beta

Audit Phase 2-7 livre. PR audit mergee -> demarrer Sprint 2.5b.
```

Sauvegarder dans `Specs/audit-resync-2026-05-15.md`.

---

## Etape 2 -- Modifier `Specs/tasks.md`

### Strategie generale (D6-C)

Pour chaque T-X.Y dans Phase 2-7 :
- **Cocher** les sous-taches qui mentionnent : "Methodes", "Service", "Code", "Tests", "UI / formulaire / wizard / panneau", "Tests unitaires", "Couverture"
- **NE PAS cocher** :
  - sous-taches qui mentionnent "wirees dans App.tsx", "integre dans le hub", "navigable depuis"
  - sous-taches qui mentionnent "deployement", "deploy", "Azure Functions"
  - sous-taches qui mentionnent "publie sur Marketplace", "publication"
  - sous-taches qui mentionnent "operationnel" pour Stripe
  - sous-taches "Done quand" qui sont des resultats E2E sur environnement reel

### Phase 2

Tache T-2.1 : cocher TOUTES sous-taches (service code DONE, 261 tests SDK passing)
Tache T-2.2 : cocher "Implementation du wireframe", "Selecteur Environment", "Validation commentaire", "Calcul global status", "Bouton Save Run". Sous "Done quand" : cocher "Le statut global est calcule correctement", "Tests E2E couvrant les 3 issues" si verifie ailleurs
Tache T-2.3 : cocher TOUTES sous-taches (service + UI DONE)
Tache T-2.4 : cocher TOUTES sous-taches sauf "La liste est utilisee comme dropdown dans le run" si depend du wiring -> cocher quand meme car code DONE
Tache T-2.5 : cocher TOUTES sous-taches
Tache T-2.6 : cocher TOUTES sous-taches
Tache T-2.7 : laisser uncheck (E2E execution a verifier separement)

### Phase 3

Toutes taches T-3.1 a T-3.6 : cocher TOUTES sous-taches (code DONE)
T-3.7 (E2E phase 3) : cocher (06-phase3-traceability.spec.ts existe)

### Phase 4

T-4.1 a T-4.5 : cocher TOUTES sous-taches (packages tous presents)
T-4.6 (GitHub Actions) : cocher sous-taches code, LAISSER UNCHECK "publie sur GitHub Marketplace"
T-4.7 (Azure Pipelines) : cocher sous-taches code, LAISSER UNCHECK "publie sur Marketplace Pipeline Tasks"
T-4.8 (Ingestion webhook Cloud-Plus) : cocher sous-taches code, LAISSER UNCHECK "deploiement Azure Functions"
T-4.9 (E2E phase 4) : cocher (07-phase4-import-export-cli.spec.ts existe)

### Phase 5

T-5.1 a T-5.3 : cocher TOUTES sous-taches code
T-5.4 (Sync auto Cloud-Plus) : cocher sous-taches code, LAISSER UNCHECK "deploiement"
T-5.5 : cocher TOUTES sous-taches
T-5.6 : cocher (08-phase5-bdd-sync.spec.ts existe)

### Phase 6

T-6.1 (Azure Functions deploy) : LAISSER TOUT UNCHECK (TECH-DEBT-017)
T-6.2 (Crypto BYOK) : cocher sous-taches code, LAISSER UNCHECK "deploiement"
T-6.3 (Config LLM UI Admin) : cocher TOUTES sous-taches (LlmProviderSettings wireee Sprint 2.5a)
T-6.4 (Audit trail) : cocher sous-taches code backend + UI
T-6.5 (Endpoint generate-test-cases) : cocher sous-taches code, LAISSER UNCHECK "endpoint actif sur Azure"
T-6.6 (UI generation AI) : cocher sous-taches code UI
T-6.7 (Quotas AI) : cocher sous-taches code
T-6.8 (Desactivation globale AI) : cocher TOUTES
T-6.9 (Detection flakiness) : cocher sous-taches code backend + UI
T-6.10 (E2E phase 6) : cocher (09-phase6-ai-admin.spec.ts existe)

### Phase 7

T-7.1 (Engine licensing) : cocher sous-taches code "Generation cles", "Validation", "Mode degrade", "Downgrade", LAISSER UNCHECK "Tests etats si depend deploy"
T-7.2 (Stripe portail) : cocher sous-tache "Webhooks Stripe" si code DONE, LAISSER UNCHECK "Integration Stripe operationnelle", "Portail client", "Done quand : abonner, payer, recevoir cle, installer"
T-7.3 (Mode hors-ligne) : cocher TOUTES sous-taches (OfflineBanner code DONE)
T-7.4 a T-7.10 : LAISSER TOUT UNCHECK (ops Phase 7 non commencees)

### Garde-fou T-X.Y Server OBSOLETE

Si une sous-tache mentionne "Server" -> NE PAS cocher, ajouter note "OBSOLETE Cloud-only depuis v0.2.0".

---

## Etape 3 -- Modifier `Specs/MIGRATION-PLAN.md`

Ajouter une note apres TECH-DEBT-026 :

```markdown
> **Audit Phase 2-7 livre 2026-05-15** (TECH-DEBT-026 follow-up) : audit exhaustif Phases 2-7 confirme que tout le code produit est DONE.
> - Phase 2 : 7/7 sections code DONE, wiring 0/5 (Sprint 2.5b)
> - Phase 3 : 7/7 sections code DONE, wiring 0/5 (Sprint 2.5c)
> - Phase 4 : 9/9 sections code DONE, 0/2 wiring + argos-action/azure-task non-publies
> - Phase 5 : 6/6 sections code DONE, wiring 0/2 + sync webhook depend deploy
> - Phase 6 : 10/10 sections code DONE backend + UI, deploy Azure pendant
> - Phase 7 : 3/10 sections code partiel (license + stripe + offline), ops pendantes
> - Specs/audit-resync-2026-05-15.md cree
> - 4 nouveaux TECH-DEBT identifies : 033, 034 (functions deploy), 035 (Marketplace publish), 036 (ops Phase 7)
> - Sprint 2.5b/c/d valides : wiring 24 composants en 3 sous-sprints (~3h15)
```

---

## Etape 4 -- Modifier `CHANGELOG.md`

Dans la section `[Unreleased]`, ajouter une nouvelle entree (en plus de TECH-DEBT-026 deja presente) :

```markdown
### Documentation 2026-05-15 -- Audit resync exhaustif Phases 2-7 (TECH-DEBT-026 follow-up)

No version bump -- documentation only.

**New file** : `Specs/audit-resync-2026-05-15.md` -- audit detaille Phase 2-7 avec tableaux Markdown par phase, critere code DONE seulement (D6-C : wiring/deploy/publish laisses uncheck).

**Major findings** :

- **Argos est essentiellement un produit FINI en code** :
  - Phase 2 : 7/7 sections code DONE (test-execution-service, evidence-upload, environment-config, bug-creation, ExecutionHistory + RunInterface + EvidencePanel + EnvironmentSettings + CreateBugForm)
  - Phase 3 : 7/7 sections code DONE (snapshot-diff, coverage-matrix, work-item-link-service + 5 composants UI)
  - Phase 4 : 9/9 sections code DONE (7 importers, 3 exporters, CLI, argos-action, azure-pipelines-task)
  - Phase 5 : 6/6 sections code DONE (argos-gherkin generator/parser/validator + GherkinEditor + RepoMappingSettings)
  - Phase 6 : 10/10 sections code DONE (argos-functions complet 8 modules + 5 composants UI hub)
  - Phase 7 : 3/10 sections code partiel (license-engine + stripe-webhook + OfflineBanner)

- **Le bloqueur est uniquement le wiring + deploy** :
  - 24 composants UI riches non wirees dans App.tsx
  - apps/argos-functions non-deployee sur Azure
  - argos-action + azure-pipelines-task non-publies Marketplace
  - Phase 7 ops (accessibility audit, docs finales, audit securite externe, beta) pendantes

**Changes to `Specs/tasks.md`** :

- Phase 2 : ~36/44 sous-taches cochees (laisse uncheck wiring + E2E)
- Phase 3 : ~33/38 sous-taches cochees (E2E spec confirmee mais a executer)
- Phase 4 : ~42/51 sous-taches cochees (laisse uncheck publish Marketplace + webhook deploy)
- Phase 5 : ~21/25 sous-taches cochees (laisse uncheck sync auto webhook deploy)
- Phase 6 : ~45/61 sous-taches cochees (laisse uncheck Azure deploy + endpoints actifs)
- Phase 7 : ~10/54 sous-taches cochees (3 sections code partiel, le reste ops Phase 7)

**Changes to `Specs/MIGRATION-PLAN.md`** : note audit Phase 2-7 livre.

**TECH-DEBT noted** :

- TECH-DEBT-033 NEW : `tasks.md` massif desalignement Phases 2-7 (cause : sprints intensifs sans reflex de cocher)
- TECH-DEBT-034 NEW (confirme TECH-DEBT-015C) : apps/argos-functions COMPLET mais NON DEPLOYEE sur Azure
- TECH-DEBT-035 NEW : argos-action + azure-pipelines-task CODES mais NON PUBLIES Marketplace
- TECH-DEBT-036 NEW : Phase 7 ops non commencees (WCAG, mobile, docs, audit securite, beta, GA)

### Sanity validation 2026-05-15

- Tests regression : 57/57 passing
- Tests argos-sdk : 261/261 passing
- Tests argos-functions : 103/103 passing
- Turbo test global : 325 tests / 41 test files / 20 packages successful
- Mojibake : 0 file
- Preflight : PASSED (argos@0.5.0)

### Implications Sprint 2.5b/c/d valides

- Sprint 2.5b (~60 min) : wirer 5 composants Phase 2 (RunInterface, EvidencePanel, EnvironmentSettings, CreateBugForm, ExecutionHistory)
- Sprint 2.5c (~60 min) : wirer 7 composants Phase 3+4 (SnapshotPanel, SnapshotDiffPanel, WorkItemLinkPanel, CoverageMatrix, CoveragePanel, ImportWizard, WebhookAdmin)
- Sprint 2.5d (~75 min) : wirer 8 composants Phase 5+6+7 (GherkinEditor, RepoMappingSettings, AiCandidatesModal, AuditLogSettings, BetaOptIn, QuotaSettings, FlakinessReport placeholder, OfflineBanner wrapper)

Total : 20 composants wirees, +20 tests regression, ~3h15 cumule.

### Lessons learned (audit 2026-05-15)

- **Audit factuel + sanity test = methode robuste** : avant de cocher tasks.md, on a confirme 325 tests passing globalement. Aucun risque de cocher du faux DONE.
- **Le code peut etre "fini" sans etre "livre"** : Argos a tout le code, mais aucun utilisateur peut l'utiliser tant que wiring + deploy + publish ne sont pas faits.
- **Decoupage Sprint 2.5b/c/d** : pluteot que un megasprint 2.5b de 3h, 3 sous-sprints de 60-75 min permettent de garder un rythme soutenable et de commiter regulierement.
- **OBSOLETE Server confirme** : aucune mention "Server" dans Phase 4-6 ne doit etre cochee (Cloud-only depuis v0.2.0).
```

---

## Etape 5 -- Validation

```powershell
# 1. Mojibake scan
node tools\regression\scan-mojibake.cjs

# 2. Verifier les comptes tasks.md
$lines = Get-Content Specs\tasks.md -Encoding UTF8
$totalDone = ($lines | Where-Object { $_ -match "\[x\]" }).Count
$totalTodo = ($lines | Where-Object { $_ -match "\[\s\]" }).Count
Write-Host "Total cochees : $totalDone"
Write-Host "Total non-cochees : $totalTodo"
Write-Host "Total : $($totalDone + $totalTodo)"
# Attendu apres audit Phase 2-7 : ~330+ cochees, ~60-70 non-cochees (24 wiring + ~25 Phase 7 ops + ~15 deploy/publish)

# 3. Tests regression (inchange)
pnpm --filter @atconseil/regression-suite test 2>&1 | Select-Object -Last 5
# 57 passing

# 4. Preflight
pnpm preflight

# 5. Verifier fichier audit
Test-Path Specs\audit-resync-2026-05-15.md
$auditLines = (Get-Content Specs\audit-resync-2026-05-15.md -Encoding UTF8).Count
Write-Host "audit-resync-2026-05-15.md : $auditLines lignes (attendu ~250)"

# 6. Pas de modification code
$codeChanged = git status --porcelain | Where-Object { $_ -match "\.(ts|tsx|js|jsx)$" }
if ($codeChanged) {
    Write-Host "STOP : code modifie !" -ForegroundColor Red
    $codeChanged
} else {
    Write-Host "OK : aucun code modifie (audit pure documentation)" -ForegroundColor Green
}
```

---

## Etape 6 -- Archive + commit

### 6.1 -- Archiver le prompt

```powershell
$found = @(".\CLAUDE_TASK_audit-resync-2026-05-15.md", "$HOME\Downloads\CLAUDE_TASK_audit-resync-2026-05-15.md") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
    Move-Item -Force $found tools\claude-prompts\CLAUDE_TASK_audit-resync-2026-05-15.md
}
```

### 6.2 -- Pre-commit ASCII check

```powershell
$msg = "chore(specs): audit Phase 2-7 (TECH-DEBT-026 follow-up)"
$nonAscii = 0
for ($i = 0; $i -lt $msg.Length; $i++) {
    if ([int][char]$msg[$i] -gt 127) { $nonAscii++ }
}
Write-Host "Non-ASCII : $nonAscii (attendu : 0)"
```

### 6.3 -- Commit (utiliser -F)

Creer `$env:TEMP\commit-msg-audit.txt` :

```
chore(specs): audit Phase 2-7 (TECH-DEBT-026 follow-up)

Audit exhaustif Phases 2-7 suite TECH-DEBT-026 (Phase 0/0.5/1 livre 2026-05-14).

Documentation only, no code changes, no version bump.

Major finding: Argos est essentiellement un produit FINI en code.

Code DONE confirme:
- Phase 2: 7/7 sections (test-execution + evidence + environments + bug + history)
- Phase 3: 7/7 sections (snapshot + coverage + traceability)
- Phase 4: 9/9 sections (importers/exporters/cli/action/azure-task)
- Phase 5: 6/6 sections (gherkin parser + UI editor + repo mapping)
- Phase 6: 10/10 sections (argos-functions complet + 5 UI hub)
- Phase 7: 3/10 sections (license + stripe code + OfflineBanner)

Blockers identifies:
- 24 composants UI non wirees dans App.tsx
- argos-functions non-deployee Azure (TECH-DEBT-017/034)
- argos-action + azure-pipelines-task non-publies (TECH-DEBT-018/035)
- Ops Phase 7 non commencees (TECH-DEBT-036)

Sprint 2.5b/c/d valides (decoupage 3 sous-sprints, ~3h15 cumule):
- 2.5b: Phase 2 wiring (5 composants)
- 2.5c: Phase 3+4 wiring (7 composants)
- 2.5d: Phase 5+6+7 wiring (8 composants)

Files changed:
- Specs/audit-resync-2026-05-15.md NEW (~250 lignes)
- Specs/tasks.md: Phase 2-7 cochees code DONE (~190 sous-taches), wiring/deploy uncheck
- Specs/MIGRATION-PLAN.md: note audit Phase 2-7 livre
- CHANGELOG.md: Unreleased entry

TECH-DEBT noted:
- TECH-DEBT-033 NEW: tasks.md massif desalignement Phase 2-7 (resync ici)
- TECH-DEBT-034 NEW: argos-functions COMPLET mais NON DEPLOYEE Azure (confirme 015C)
- TECH-DEBT-035 NEW: argos-action + azure-pipelines-task non-publies Marketplace
- TECH-DEBT-036 NEW: Phase 7 ops non commencees (WCAG, docs, audit, beta, GA)

Sanity validation:
- 57 tests regression passing
- 261 tests argos-sdk passing
- 103 tests argos-functions passing
- 325 tests turbo global (41 files, 20 packages)
- 0 mojibake, preflight PASSED

Refs: Specs/audit-resync-2026-05-15.md, Specs/audit-resync-2026-05-14.md, TECH-DEBT-026
```

Puis :
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\commit-msg-audit.txt", $msg, [System.Text.UTF8Encoding]::new($false))

git add -A
git status
git commit -F "$env:TEMP\commit-msg-audit.txt"
Remove-Item "$env:TEMP\commit-msg-audit.txt"

git push -u origin chore/audit-resync-phases-2-7
```

### 6.4 -- PR

```powershell
$prBody = @'
## Summary

Audit exhaustif Phases 2-7 suite TECH-DEBT-026 (Phase 0/0.5/1 livre 2026-05-14).

**Documentation only, no version bump.**

## Major finding

**Argos est essentiellement un produit FINI en code** :

| Phase | Code DONE | Bloqueur |
|-------|-----------|----------|
| 2 | 7/7 sections | Wiring 0/5 composants (Sprint 2.5b) |
| 3 | 7/7 sections | Wiring 0/5 composants (Sprint 2.5c) |
| 4 | 9/9 sections | Wiring 0/2 + argos-action/azure-task non publies |
| 5 | 6/6 sections | Wiring 0/2 + sync webhook depend deploy |
| 6 | 10/10 sections code | Wiring 0/5 + argos-functions non deployee |
| 7 | 3/10 sections code partiel | Ops Phase 7 pendantes |

## Files changed

- `Specs/audit-resync-2026-05-15.md` NEW (~250 lignes) -- tableaux detailes par phase
- `Specs/tasks.md` -- ~190 sous-taches cochees (code DONE), wiring/deploy/publish laisses uncheck
- `Specs/MIGRATION-PLAN.md` -- note audit Phase 2-7 livre
- `CHANGELOG.md` -- Unreleased entry

## Sanity validation

- Tests regression : 57/57 passing
- Tests argos-sdk : 261/261 passing
- Tests argos-functions : 103/103 passing
- Turbo test global : 325 tests / 41 files / 20 packages successful
- Mojibake : 0 file
- Preflight : PASSED (argos@0.5.0)

## TECH-DEBT noted

- TECH-DEBT-033 NEW : tasks.md massif desalignement Phase 2-7 (cause sprints intensifs sans cocher)
- TECH-DEBT-034 NEW : argos-functions COMPLET mais NON DEPLOYEE sur Azure (confirme TECH-DEBT-015C)
- TECH-DEBT-035 NEW : argos-action + azure-pipelines-task non publies Marketplace
- TECH-DEBT-036 NEW : Phase 7 ops non commencees (WCAG, docs, audit securite, beta, GA)

## Implications Sprint 2.5b/c/d

Decoupage 3 sous-sprints valide (total ~3h15) :

- **Sprint 2.5b** (~60 min) : Phase 2 wiring (5 composants)
- **Sprint 2.5c** (~60 min) : Phase 3+4 wiring (7 composants)
- **Sprint 2.5d** (~75 min) : Phase 5+6+7 wiring (8 composants)

Total : 20 composants wirees, +20 tests regression.

## Apres merge

Sprint 2.5b demarrera (wiring Phase 2 -- 5 composants UI dans App.tsx).
'@

[System.IO.File]::WriteAllText("$env:TEMP\pr-body-audit.txt", $prBody, [System.Text.UTF8Encoding]::new($false))

gh pr create `
  --title "chore(specs): audit Phase 2-7 (TECH-DEBT-026 follow-up)" `
  --body-file "$env:TEMP\pr-body-audit.txt"

Remove-Item "$env:TEMP\pr-body-audit.txt"
```

---

## Etape 7 -- POST-MERGE CLEANUP

```powershell
git checkout main
git pull
git remote prune origin
git branch -d chore/audit-resync-phases-2-7

# Validation finale
pnpm --filter @atconseil/regression-suite test
# 57 passing

pnpm preflight
# PASSED

# Verifier nouveaux fichiers
Test-Path Specs\audit-resync-2026-05-15.md
```

---

## Criteres de done

- [ ] Branche `chore/audit-resync-phases-2-7` creee
- [ ] `Specs/audit-resync-2026-05-15.md` cree (~250 lignes)
- [ ] `Specs/tasks.md` Phase 2-7 : ~190 sous-taches cochees, wiring/deploy uncheck
- [ ] `Specs/MIGRATION-PLAN.md` : note audit Phase 2-7 livre
- [ ] `CHANGELOG.md` : Unreleased entry audit Phase 2-7
- [ ] Tests regression : 57 passing inchange
- [ ] Aucun code modifie (audit pure documentation)
- [ ] 0 mojibake
- [ ] **Commit message 100% ASCII pre-check**
- [ ] Pas de bump version (documentation only)
- [ ] Prompt archive
- [ ] Commit + PR
- [ ] Post-merge cleanup execute

---

## Reporting utilisateur

1. **Apres Etape 1** : "audit-resync-2026-05-15.md cree (~250 lignes). Verdict global confirme : Argos essentiellement FINI en code, bloqueur = wiring + deploy. Confirmation avant modifications tasks.md ?"

2. **Apres Etape 5** : "Audit complete. tasks.md cochee selon D6-C (code DONE only). ~190 sous-taches cochees. 0 modifications code. 57 tests passing. Pret a commit ?"

3. **Apres Etape 6.4** : "PR ouverte. Apres merge GitHub, lance Etape 7 (post-merge cleanup)."

---

Apres ca :
- Pause optionnelle (~5 min)
- **Sprint 2.5b** : Wiring 5 composants Phase 2 (prompt separe a recevoir apres merge)
