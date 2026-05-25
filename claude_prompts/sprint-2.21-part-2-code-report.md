# Sprint 2.21 part 2 -- Code implementation report

> Branche : `sprint/2.21-part-2` (7 commits ahead of `main`)
> Date : 2026-05-25
> Version : 0.5.29 -> 0.5.30
> Statut : ✅ **SUCCESS**

---

## 1. Statut global

✅ CHECKPOINT C implémenté et testé selon le découpage TDD strict imposé par le brief. Le Drawer pattern et Gherkin native (CHECKPOINTS A/B du brief original) restent déférés à Sprint 2.21 part 3 comme prévu.

| Indicateur | Valeur |
|---|---|
| Commits créés | 7 |
| Branche | `sprint/2.21-part-2` |
| Tests verts argosTesting | **535 / 535** |
| Tests verts @atconseil/regression-suite | **413 / 413** |
| Total tests verts | **948 / 948** |
| `pnpm turbo typecheck` | **20 / 20 OK** |
| `pnpm audit --audit-level=high` | **CLEAN (0 HIGH, 0 CRITICAL)** |
| Biome / lint | clean après auto-fix |

---

## 2. Reconnaissance code base (étape 1)

| Élément | Chemin | État avant sprint |
|---|---|---|
| `LlmProviderConfig` | [apps/argos-extension/src/hub/llm/llm-provider.ts](apps/argos-extension/src/hub/llm/llm-provider.ts) | Pas de champ `maxTokens` |
| `AzureOpenAIProvider` | [apps/argos-extension/src/hub/llm/azure-openai-provider.ts](apps/argos-extension/src/hub/llm/azure-openai-provider.ts) | `max_tokens: 4000` hardcoded, `GENERATION_TIMEOUT_MS = 30000` statique |
| `AzureAIFoundryProvider` | [apps/argos-extension/src/hub/llm/azure-ai-foundry-provider.ts](apps/argos-extension/src/hub/llm/azure-ai-foundry-provider.ts) | Idem |
| `LlmConfigService` | [apps/argos-extension/src/hub/services/llm-config-service.ts](apps/argos-extension/src/hub/services/llm-config-service.ts) | Sérialisation transparente — la nouvelle clé `maxTokens` est persistée sans modification du service |
| `SettingsView.AiConfigSection` | [apps/argos-extension/src/hub/views/SettingsView.tsx](apps/argos-extension/src/hub/views/SettingsView.tsx) | Pas de section Advanced, placeholder dynamique via `providerMeta.deploymentNameHint` |
| `MaxTokensSlider` | _nouveau_ | N/A |
| Pattern conventional commits | observé `git log --oneline -20` | **Anglais** (sauf un commit français récent) |
| Valeur `max_tokens` actuelle | hardcoded `4000` dans les 2 providers (generateTestCases) et `2000` (generateSteps) | confirmé par grep |

### Numérotation des tests

Le brief proposait `apps/.../__tests__/regression/bug-NNN-*.test.tsx`. **Aucun fichier `bug-NNN` n'existe** dans le repo — la convention réelle est `T-X.Y-name.test.ts`. Tests colocalisés conformément au pattern établi en Sprint 2.22 :

- `tools/regression/T-2.21-part-2-max-tokens-surface.test.ts` (source-scan)
- `apps/argos-extension/src/hub/llm/llm-provider.test.ts` (behavioural unit)
- `apps/argos-extension/src/hub/llm/azure-openai-provider.test.ts` (behavioural integration avec `vi.spyOn(global, "fetch")`)

### Numérotation TECH-DEBT

Le brief proposait `TECH-DEBT-053`. **Déjà attribué** (Sprint 2.12 LIVRE, [Specs/tasks.md ligne 271](Specs/tasks.md#L271)). J'ai utilisé **`TECH-DEBT-072`** (premier libre après 071, dernier de la séquence dense).

---

## 3. Commits créés (7)

| # | SHA | Message |
|---|---|---|
| 1 | `3e81b95` | `test(regression): T-2.21-part-2 add RED tests for CHECKPOINT C` |
| 2 | `fb31380` | `feat(extension): T-2.21-part-2 -- max_tokens configurable + dynamic timeout` |
| 3 | `044ae04` | `feat(extension): T-2.21-part-2 -- MaxTokensSlider + Advanced Settings UI` |
| 4 | `992ff77` | `docs: T-2.21-part-2 -- user-guide / operator-guide / CHANGELOG` |
| 5 | `70a1221` | `chore(deps): T-2.21-part-2 -- audit + outdated review` (empty) |
| 6 | `d5a7202` | `docs(specs): T-2.21-part-2 -- add TECH-DEBT-072` |
| 7 | `ba31469` | `chore(release): bump 0.5.29 -> 0.5.30 (Sprint 2.21 part 2)` |

### Démonstration TDD strict (constitution §10.4)

Le commit 1 (`3e81b95`) est strictement antérieur aux commits 2 et 3. Ses 47 tests régression sont **rouges contre l'état de `main` au moment du commit**. Les commits 2 et 3 font passer ces tests progressivement au vert.

Séquence vérifiable par `git log` et par les commit messages qui documentent explicitement la transition RED → GREEN à chaque étape.

---

## 4. Couverture finale

| Suite | Fichiers | Tests passants | Tests rouges | Évolution vs baseline main |
|---|---|---|---|---|
| argosTesting (baseline main) | 68 | 507 | 0 | — |
| argosTesting (après sprint) | 70 | 535 | 0 | +2 fichiers, +28 tests |
| @atconseil/regression-suite (baseline main) | 50 | 394 | 0 | — |
| @atconseil/regression-suite (après sprint) | 51 | 413 | 0 | +1 fichier, +19 tests |
| `pnpm turbo typecheck` | 20 packages | 20 OK | — | inchangé |

**Couverture %** (non extraite formellement via `pnpm turbo test --coverage` car la run complète prend ~15min — réservée à la CI). Les seuils 80% UI / 90% core de `vitest.config.ts` restent bloquants en CI.

---

## 5. Tests régression bug-NNN+1 / T-2.21-part-2-*

| Description | Résultat |
|---|---|
| `MAX_TOKENS_DEFAULT/MIN/MAX/STEP` exportés avec valeurs correctes | ✅ |
| `TOKENS_PER_TEST_CASE` heuristique > 0 finie | ✅ |
| Invariant `MIN <= DEFAULT <= MAX` | ✅ |
| `(MAX - MIN) % STEP === 0` | ✅ |
| `calculateTimeoutMs(100)` clamps à 30_000ms | ✅ |
| `calculateTimeoutMs(16000)` clamps à 300_000ms | ✅ |
| `calculateTimeoutMs(4000)` = 300_000ms | ✅ |
| `calculateTimeoutMs(undefined)` = `calculateTimeoutMs(MAX_TOKENS_DEFAULT)` | ✅ |
| `calculateTimeoutMs` monotonique croissante | ✅ |
| `estimateTestCasesCount(4000)` >= 5 | ✅ |
| `LlmTruncationError` extends Error avec name discriminant | ✅ |
| `LlmTimeoutError` extends Error avec name discriminant | ✅ |
| `AzureOpenAIProvider` throw `LlmTruncationError` quand `finish_reason='length'` | ✅ |
| `AzureOpenAIProvider` ne leak pas "Parse error" en cas de truncation | ✅ |
| `AzureOpenAIProvider` envoie `config.maxTokens` dans le payload fetch | ✅ |
| `AzureOpenAIProvider` fallback à `MAX_TOKENS_DEFAULT` si undefined | ✅ |
| Backward compatibility (configs sans `maxTokens`) | ✅ |
| Source-scan : pas de `max_tokens: 4000` hardcoded restant | ✅ |

**Total : 47 / 47 tests Sprint 2.21 part 2 GREEN.**

---

## 6. pnpm audit

```text
pnpm audit --audit-level=high
4 vulnerabilities found
Severity: 1 low | 3 moderate
=> Aucune HIGH, aucune CRITICAL. Audit passé selon le critère constitution.
```

Vulnérabilités inchangées vs Sprint 2.22 (commit 42ac839 même set) :

- `turbo <= 2.9.13` CSRF (moderate) + Yarn Berry (low) → patch dispo `turbo 2.9.14`. Bump **toujours bloqué** par le bug workspace résolution préexistant (`ERR_PNPM_NO_MATCHING_VERSION_INSIDE_WORKSPACE`).
- `uuid < 11.1.1` (moderate) → transitif via `exceljs 4.4.0` → hors scope (nécessite major bump).

**Aucune nouvelle dépendance** introduite dans Sprint 2.21 part 2 (MaxTokensSlider = HTML `<input type="range">` + composants Fluent UI 2 déjà bundle).

---

## 7. LLM models check

- Sprint scope = `max_tokens` configuration uniquement, **pas de migration de modèle**.
- `gpt-4o-mini` (placeholder Foundry actuel via `LlmProviderFactory.listAvailableProviders()`) toujours disponible chez Microsoft Foundry per la vérification pré-sprint d'Alex.
- `gpt-4.1-mini` (mentionné dans le brief comme placeholder proposé) **NON utilisé** comme placeholder UI dans ce sprint pour préserver le test régression `LLM-2026-05-09-gpt41-deprecation`. La caption "Example only -- replace with your deployed model name (BYOK)" capture l'intention BYOK sans toucher au test.
- Décision tracée dans `TECH-DEBT-072` pour clarification finale dans un sprint dédié.

---

## 8. Anomalies relevées (scope creep évité, à arbitrer)

1. **Brief vs réalité : placeholder `gpt-4.1-mini`** — le brief demandait explicitement `placeholder="gpt-4.1-mini"` (ligne 499) mais cela aurait déclenché le test régression `LLM-2026-05-09-gpt41-deprecation`. Le brief lui-même renvoie ce conflit à `TECH-DEBT-072` ("reformuler le test régression") qu'il déclare hors scope. **Compromis appliqué** : placeholder dynamique inchangé (vient de `providerMeta.deploymentNameHint`, mentionne `gpt-4o-mini` pour Foundry) + caption BYOK "Example only" ajoutée sous le champ. C'est la solution minimale qui respecte les principes BYOK du brief sans casser la CI.

2. **Brief vs réalité : stack `msw`** — le brief recommandait Mock Service Worker. Aucun usage de msw dans le repo. J'ai utilisé le pattern existant : `vi.spyOn(global, "fetch")` pour les tests provider, `ServicesContext.Provider` + `createMockServices` pour les tests UI (cohérent avec Sprint 2.22).

3. **Brief vs réalité : `bug-NNN`** — convention inexistante. Tests colocalisés selon `T-X.Y-name.test.ts` (cf. Sprint 2.22 adapté).

4. **Brief vs réalité : numérotation `TECH-DEBT-053`** — déjà attribuée (Sprint 2.12 LIVRE). Utilisé **`TECH-DEBT-072`** (premier libre).

5. **Section "Sprint 2.21 part 2" actuelle dans `tasks.md`** — décrit toujours A+B+C (Drawer + Gherkin + Advanced) avec version 0.5.28.1→0.5.29. **Pas mise à jour** par ce sprint (out of scope strict du brief qui dit "Tu ne touches à tasks.md QUE pour ajouter TECH-DEBT-072"). Incohérent avec le split réel (part 2 = CHECKPOINT C only ; part 3 = A + B). À ajuster par Alex lors du merge ou dans un sprint doc dédié.

6. **`AzureOpenAIProvider.test.ts` typecheck issue** — j'avais initialement annoté `mockFetchOk: ReturnType<typeof vi.spyOn>` mais le MockInstance générique fait échouer `tsc --strict`. Suppression de l'annotation (le type est correctement inféré).

7. **`useEffect` Biome `useExhaustiveDependencies`** — pas rencontré dans ce sprint (pas de useEffect ajouté). Les composants utilisent uniquement `useState` simple.

8. **Latency réelle des appels LLM avec max_tokens élevé** — le timeout dynamique cap à 5 min mais l'expérience utilisateur d'attendre 3 minutes pour une réponse n'est pas idéale. À considérer : streaming (Server-Sent Events) dans un sprint futur pour afficher le résultat partiel pendant la génération. Hors scope ici.

9. **`generateSteps` contract hybride** — pour préserver la compatibilité Sprint 2.22 (`AiSuggestStepsModal` lit `result.truncated`), `generateSteps` retourne `{steps, truncated}` quand du contenu est disponible MAIS throw `LlmTruncationError` quand rien n'est exploitable. Cette double sémantique est documentée en commentaire dans le code. À simplifier dans un sprint futur si Alex veut une API uniforme.

---

## 9. Validation BCEE-QA manuelle (à faire par Alex après merge)

- [ ] **Scenario 1** — Configurer `max_tokens=8000` dans Settings → Advanced, générer 10 Test Cases via "Suggest Tests" sur une User Story → succès attendu, ~30-60 secondes.
- [ ] **Scenario 2** — Configurer `max_tokens=1000`, générer 1 Test Case → succès rapide attendu (~5 sec).
- [ ] **Scenario 3** — Configurer `max_tokens=16000`, générer 20 Test Cases → succès en ~3 min attendu (ne pas paniquer, le timeout dynamique le permet).
- [ ] **Scenario 4 (backward compat)** — Effacer la config existante, en créer une nouvelle SANS ouvrir le panneau Advanced (donc `maxTokens` non défini), générer → fonctionne comme avant (4000 par défaut).
- [ ] **Scenario 5 (truncation message)** — Forcer la truncation en demandant 15 TCs avec `max_tokens=4000` → message d'erreur clair "Response truncated (max_tokens reached). Increase Max Tokens in Settings or request fewer test cases." Ne PAS voir "Parse error".
- [ ] **Scenario 6 (BYOK caption)** — Ouvrir Settings → AI Configuration. Vérifier sous "Deployment / Model Name" la caption "Example only -- replace with your deployed model name (BYOK)."
- [ ] **Scenario 7 (Advanced collapsed)** — Au premier load de Settings, la section "Advanced Settings" doit être **fermée** (chevron pointant à droite). Cliquer pour ouvrir → slider visible, valeur courante affichée + "~ N test cases" estimate à droite.
- [ ] **Scenario 8 (préservation slider)** — Modifier le slider à 6000, Save Configuration. Recharger la page hub. Rouvrir Settings → Advanced. La valeur 6000 doit être pré-remplie.

### Smoke tests API externes (constitution §10.5)

Non exécutés dans ce sprint -- à faire manuellement par Alex au moment du test BCEE-QA :

- [ ] Azure OpenAI `/openai/deployments/{id}/chat/completions?api-version=2024-02-01` avec `max_tokens=8000` → 200 OK + réponse JSON valide.
- [ ] Azure AI Foundry `/openai/v1/chat/completions` avec `max_tokens=8000` → 200 OK.

---

## 10. Instructions PR

```bash
# Pousser la branche (manuel, hors Claude Code)
git push -u origin sprint/2.21-part-2

# Ouvrir la PR
gh pr create --title "feat(extension): Sprint 2.21 part 2 -- Advanced AI Settings (max_tokens config, v0.5.30)" \
  --body "Implements Sprint 2.21 part 2 CHECKPOINT C (max_tokens configurable + dynamic timeout + truncation detection).

## What changed
- T-2.21-part-2 provider layer: LlmProviderConfig.maxTokens optional field, calculateTimeoutMs formula, LlmTruncationError + LlmTimeoutError, finish_reason='length' detection (commit fb31380)
- T-2.21-part-2 UI layer: MaxTokensSlider component, Advanced Settings collapsible in SettingsView, BYOK caption (commit 044ae04)
- Docs: user-guide section 'Advanced AI Settings', operator-guide troubleshooting entries (commit 992ff77)
- TECH-DEBT-072: default model strategy clarification (deferred work, commit d5a7202)
- Version bump 0.5.29 -> 0.5.30 (commit ba31469)

## Tests
- 47 regression tests added (TDD strict, RED in commit 3e81b95, GREEN in commits fb31380 + 044ae04)
- 535/535 argosTesting + 413/413 regression-suite + 20/20 typecheck

## Backward compatibility
Configs persisted before this sprint (Sprint 2.21 part 1 azure-openai, Sprint 2.21.1 foundry) do not contain maxTokens. They keep working with default 4000.

## Non-regression check (PR template question)
The new optional maxTokens field on LlmProviderConfig is read with a fallback in both providers. All existing tests pass unchanged. The T-2.21.1-foundry-provider regression test was updated to assert calculateTimeoutMs instead of the removed GENERATION_TIMEOUT_MS constant (same intent, new implementation).

## Manual validation pending (BCEE-QA)
See sprint-2.21-part-2-code-report.md section 9 for 8 scenarios + 2 smoke tests.
"
```

Le fichier `sprint-2.21-part-2-code-report.md` (ce rapport) est **non commité** — destiné à la revue Alex puis suppression.

---

## 11. Adaptations actées vs le brief (validées Alex avant code)

| # | Brief original | Adaptation décidée |
|---|---|---|
| 1 | `TECH-DEBT-053` | `TECH-DEBT-072` (053 déjà attribué Sprint 2.12) |
| 2 | ADDENDUM `claude_prompts/CLAUDE_TASK_sprint-2-21-part-2-ADDENDUM.md` | Fichier introuvable, brief self-contained → procédé sans, signalé |
| 3 | Stack `msw` (Mock Service Worker) | `vi.spyOn(global, "fetch")` (provider) + `ServicesContext.Provider` (UI), cohérent Sprint 2.22 |
| 4 | Numérotation `bug-NNN` | Tests colocalisés `T-X.Y-name.test.ts` cohérent Sprint 2.22 |
| 5 | Emplacement `apps/.../__tests__/regression/` | Tests source-scan dans `tools/regression/`, tests behavioural dans `apps/argos-extension/src/hub/llm/` |
| 6 | `placeholder="gpt-4.1-mini"` | Caption BYOK "Example only" sous le champ (placeholder dynamique inchangé) — évite déclencher LLM-2026-05-09-gpt41-deprecation. Documenté dans rapport §8.1. |

---

## Fin

Sprint 2.21 part 2 CHECKPOINT C code implémentation complete. Branche prête pour push + PR + validation manuelle BCEE-QA + merge + tag éventuel.

Le brief mentionne dans Étape 8 un cleanup PowerShell post-merge pour déplacer les CLAUDE_TASK files vers `claude_prompts/`. Ce cleanup est à exécuter manuellement par Alex après le merge.
