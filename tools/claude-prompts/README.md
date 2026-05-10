# Claude Code prompts

Archive des prompts donnés à Claude Code pour chaque sprint.

## Convention de nommage

`CLAUDE_TASK_<sprint-id>.md` — un prompt par sprint, archivé après merge de la PR correspondante.

## Pourquoi conserver

1. **Reproductibilité** — un nouveau contributeur peut comprendre comment chaque sprint a été appliqué
2. **Audit méthodologique** — trace écrite des décisions données à Claude Code, en complément du CHANGELOG (le *quoi*) et des commit messages (le *pourquoi*)
3. **Postmortem** — si un bug est introduit pendant un sprint, le prompt original aide à reconstruire le raisonnement

## Allowlist des tests régression

Ces prompts peuvent légitimement contenir :
- Des références à des modèles LLM dépréciés (mentions historiques nécessaires) → allowlist dans `tools/regression/LLM-*-deprecation.test.ts`
- Des patterns mojibake (références documentaires) → allowlist dans `tools/regression/ENC-*-mojibake.test.ts`

**L'allowlist est explicite, jamais en wildcard** : chaque prompt archivé est ajouté individuellement après revue. Ainsi un futur prompt avec un vrai bug (réintroduction d'un modèle déprécié, corruption d'encoding réelle) n'est pas masqué.