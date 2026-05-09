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

## Tests retirés

_(à remplir au cas par cas, avec date de retrait et justification)_
