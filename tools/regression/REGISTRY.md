# Regression Test Registry

Ce fichier indexe tous les tests de non-régression nommés de la suite `tools/regression/`.
Il respecte la règle constitution §10 : *"Test de non-régression nommé pour chaque bug confirmé."*

## Convention de nommage des IDs

Format : `<TYPE>-<DATE-OU-TASK>-<short-slug>`

| Préfixe | Domaine |
|---|---|
| `T-X.Y` | Tâche du plan (tasks.md) |
| `BUG-` | Bug de production confirmé |
| `CFG-` | Erreur de configuration |
| `LLM-` | Cycle de vie modèle LLM |
| `SEC-` | Problème de sécurité |
| `UX-` | Régression UI/UX |

## Tests actifs

| ID | Date ajout | Type | Slug | Protège quoi | Référence | Auteur |
|---|---|---|---|---|---|---|
| LLM-2026-05-09 | 2026-05-09 | LLM-lifecycle | gpt41-deprecation | Aucune réintroduction de `gpt-4.1` dans code/spec-kit/docs ; ce modèle a été retiré de Microsoft Foundry le 2026-04-11. Successeur retenu : `gpt-5.2`. | constitution.md §3.2.1, §11 / spec.md §generate-test-cases, §settings-wireframe | AT |
| ENC-2026-05-09 | 2026-05-09 | Encoding | spec-mojibake | Aucune occurrence de mojibake double-encoded (UTF-8 lu comme cp1252 puis re-encodé) dans les fichiers texte du repo, hors allowlist. Régression introduite pendant Sprint 1 sur `Specs/spec.md` (1010 occ) puis aggravée pendant Sprint 1.1 sur les fichiers de test régression eux-mêmes. `Specs/tasks.md` corrompu pré-existant (647 occ, antérieur à Sprint 1). Cause racine : `Set-Content` PowerShell sans flag `-Encoding utf8`. Fix : restauration depuis `1acdb46` (spec.md) + recovery algorithmique cp1252→UTF-8 (tasks.md) + reconstruction du test régression ENC en source 100% ASCII. | Sprint 1 PR #10 + audit pre-existing corruption | AT |
| CFG-2026-05-10 | 2026-05-10 | CFG-config | server2022-out-of-scope | Aucune référence à ADO Server 2022 / on-prem dans le code, spec-kit, manifeste ou docs (hors CHANGELOG.md historique, REGISTRY.md lui-même et prompts archivés). Argos est Cloud-only depuis v0.2.0 (constitution v0.3.0). Audit Sprint 2 a détecté 88 occurrences résiduelles de patterns interdits. | constitution.md v0.3.0 §1 §3.1 / tasks.md Phase 0.5 / CHANGELOG.md [0.2.0] | AT |
| CFG-2026-05-10-publisher-alexthibaud | 2026-05-10 | CFG-config | publisher-alexthibaud | Le manifest doit contenir `"publisher": "AlexThibaud"`. Locks la decision produit Sprint 3.1 : revert d'une fausse premisse Sprint 2 (ATConseil n'existe pas comme publisher pour Argos, reserve a TestPulse). Logique inversee de l'ancien test publisher-atconseil retire. | Sprint 3.1 (PR fix/revert-publisher-to-alexthibaud) | AT |
| TECH-2026-05-10-allowlist-sync | 2026-05-10 | Tooling | allowlist-sync | Empêche la divergence entre `tools/regression/allowlist.ts` et `tools/regression/allowlist.cjs` (dual-source-of-truth temporaire pour bridge ts/cjs). Le test cross-check `allowlist.test.ts` échoue si les deux listes ne sont pas identiques. | Refactor TECH-DEBT-001 / tools/regression/allowlist.test.ts | AT |
| CFG-2026-05-10-marketplace-public | 2026-05-10 | CFG-config | marketplace-public | Empeche la reintroduction de `"public": false` dans `vss-extension.json`. Argos est publie Public sur le Marketplace -- un downgrade Public->Prive est impossible chez Microsoft sans perte de l'extensionId. Sprint 3.2 : revert du Sprint Marketplace prive (fausse premisse). | vss-extension.json / Sprint 3.2 / CFG-2026-05-10-marketplace-public.test.ts | AT |

| WIRING-2026-05-10-foundations | 2026-05-10 | Wiring | foundations-core | Empeche que App.tsx revienne aux placeholders pour Plans/Cases/Sets/Preconditions/Settings-LLM. Smoke tests verifient que les composants riches (TestPlanForm, TestCaseForm, TestSetForm, PreconditionForm, LlmProviderSettings) sont effectivement rendus. | apps/argos-extension/src/hub/wiring/ | AT |
| T-0.9-argos-top-level-placement | 2026-05-10 (Sprint 3) / mis a jour Sprint 3.4 / mis a jour Sprint 4 | T-task | argos-top-level-placement | Argos placement top-level via hub-group dedie (argos-hub-group) targetant ms.vss-web.project-hub-groups-collection. Sprint 4 : au moins un hub cible .argos-hub-group (6 hubs decomposes). Sprint 3 v1 invalidee : target ms.vss-web.project-hub-group n'existait pas Microsoft (3eme fausse premisse). | spec.md, tasks.md T-0.9, T-1.0 | AT |
| CFG-2026-05-10-top-level-hub | 2026-05-10 (Sprint 3) / mis a jour Sprint 3.4 / mis a jour Sprint 4 | CFG-config | top-level-hub | Zero-tolerance sur ms.vss-work-web.work-hub-group ET ms.vss-web.project-hub-group (faux target) dans tout le manifest. Verifie aussi existence argos-hub-group type hub-group + version >= 0.3.0 + categories + au moins un hub dans le groupe. | Sprint 3 (v0.3.0), Sprint 3.4 (v0.3.5), Sprint 4 (v0.4.0) | AT |
| T-1.0-argos-multi-hubs-architecture | 2026-05-11 (Sprint 4) | T-task | argos-multi-hubs-architecture | 6 hubs independants (plans, cases, sets, preconditions, reports, settings) presentent dans le manifest avec type ms.vss-web.hub, targeting .argos-hub-group, noms corrects. Aucun hub legacy argos-hub. Exactement 6 contributions de type ms.vss-web.hub. | tasks.md T-1.0 / Sprint 4 (v0.4.0) | AT |
| CFG-2026-05-10-no-xray-references | 2026-05-10 | CFG-branding | no-xray-references | Empeche la reintroduction de references a la marque Xray dans les fichiers publics et le spec-kit. Decision 2026-05-10 : la terminologie "Xray-class" est remplacee par "industrial-grade test management". | Sprint 3 branding cleanup | AT |

| CFG-2026-05-12-preflight-rules | 2026-05-12 (TECH-DEBT-011 v3) | CFG-config | preflight-rules | 7 regles mecaniques du manifest vss-extension.json : version coherence (package.json = vss-extension.json), publisher dans whitelist [AlexThibaud, ATConseil], aucun SVG dans static/, categories non-vides, icons.default PNG, aucune contribution utilisant la target invalide ms.vss-web.project-hub-group (fausse premisse Sprint 3), toute reference relative hub-group resolue. Premier test a avoir detecte la desynchronisation 1.0.0 / 0.4.1 (PR #30 bump errone). | TECH-DEBT-011 v3 / Sprint 4.x / tools/preflight/ | AT |
| CFG-2026-05-13-package-naming | 2026-05-13 (Sprint 6a) | CFG-config | package-naming | Asserte qu'aucun package dans packages/ n'utilise le prefixe legacy @atconseil/testvault-*. 4 assertions : count packages > 0, no testvault-* prefix, approved prefixes (argos-* ou allowed legacy), folder-name consistency. Test introduit avec Sprint 6a, deviendra fully green apres Sprint 6f. testpulse-ui-shared en ALLOWED_LEGACY (renaming Sprint 7b). | Sprint 6a (PR feat/rename-testvault-types-to-argos-types) / Specs/MIGRATION-PLAN.md (TECH-DEBT-015B section 1.4) | AT |

## Tests retirés

| ID retiré | Date ajout | Date retrait | Raison | PR retrait |
|---|---|---|---|---|
| CFG-2026-05-10-publisher-atconseil | 2026-05-10 | 2026-05-10 | Renommé en CFG-2026-05-10-publisher-alexthibaud après revert Sprint 3.1. Sprint 2 était basé sur fausse prémisse : publisher ATConseil n'existe pas pour Argos (réservé à TestPulse). Logique inversée, en-tête historique préserve la trace décisionnelle. | fix/revert-publisher-to-alexthibaud |
| CFG-2026-05-10-marketplace-private | 2026-05-10 | 2026-05-10 | Renommé en CFG-2026-05-10-marketplace-public après revert Sprint 3.2. Sprint Marketplace prive était basé sur fausse prémisse : Argos v0.1.1 déjà public, Microsoft interdit le downgrade Public->Prive sans perte de l'extensionId. Logique inversée, en-tête historique préserve la trace décisionnelle. | fix/revert-marketplace-private-to-public |
