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
| CFG-2026-05-10 | 2026-05-10 | CFG-config | publisher-atconseil | Le champ `publisher` de `apps/argos-extension/vss-extension.json` doit être exactement `ATConseil`. Audit Sprint 2 a détecté que le champ était `AlexThibaud` (nom de compte GitHub, pas le publisher Marketplace). Le publisher incorrect bloque la publication VSIX sur le Marketplace. | constitution.md §3.1 / vss-extension.json / CHANGELOG.md [0.2.0] | AT |

## Tests retirés

_(à remplir au cas par cas, avec date de retrait et justification)_
