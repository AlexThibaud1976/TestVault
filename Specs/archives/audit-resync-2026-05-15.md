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
