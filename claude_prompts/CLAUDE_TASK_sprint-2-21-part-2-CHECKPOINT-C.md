# CLAUDE_TASK : Sprint 2.21 part 2 — Code implementation

> **Cible :** Claude Code
> **Date de génération :** 2026-05-25 (lundi, 15h30)
> **Auteur du task :** Claude (chat) sur instructions Alexandre Thibaud
> **Source de vérité :** `Specs/spec.md` (US-5.1 / F1 AI generation), `Specs/tasks.md` (Sprint 2.21 part 2), `Specs/constitution.md` §10.4 (TDD strict) + §6.0 (no-backend), `Specs/CLAUDE_TASK_sprint-2-21-part-2-ADDENDUM.md` (référence détaillée du CHECKPOINT C)
> **Durée estimée :** 3-4h dev
> **Branche cible :** `sprint/2.21-part-2`

---

## 1. CONTEXTE EXÉCUTIF

Sprint 2.21 part 2 livre **un seul checkpoint** (split décidé lundi 2026-05-25) :

**CHECKPOINT C — Advanced AI Settings (max_tokens configurable + timeout dynamique + truncation detection)**

Pourquoi ce sprint :
- Bug observé en prod (instance privée Alex BCEE-QA) le vendredi 2026-05-22 : génération de 10 Test Cases échoue silencieusement avec `max_tokens=4000` hard-coded (~7 TCs max effectif). Réponse tronquée → JSON malformed → "Parse error" incompréhensible pour l'utilisateur.
- Décision Alex 2026-05-22 : solution **configurable + pédagogique** (slider UI avec équivalence tokens → TCs visibles).
- Stratégie produit BYOK : Argos ne **préconise pas** de modèle par défaut ; placeholder UI uniquement pour exemple, l'utilisateur **doit** explicitement saisir son modèle.

Ce sprint **NE TOUCHE PAS** :
- Drawer pattern pour AI suggestions → Sprint 2.21 part 3
- Gherkin native editor → Sprint 2.21 part 3
- Migration modèle par défaut Argos → TECH-DEBT-053 (à créer dans ce sprint, à traiter plus tard)
- Reformulation test régression `LLM-2026-05-09-gpt41-deprecation` → TECH-DEBT-053
- Clarification doc `ARGOS_LLM_PROVIDERS_REFERENCE.md` → TECH-DEBT-053
- Manifeste `vss-extension.json` (sauf bump version)
- Schéma WIT, licensing, OAuth

---

## 2. RÈGLES NON-NÉGOCIABLES

### TDD strict (constitution §10.4 — règle déjà en vigueur)

**Tout bug confirmé en prod ajoute un test à la suite régression AVANT le fix.** Ordre obligatoire :

1. Écrire les tests d'intégration régression (rouges, qui échouent contre le code actuel) → **Commit 1**
2. Implémenter les fixes qui font passer ces tests au vert → **Commits suivants**
3. Vérifier qu'au moins **un commit intermédiaire dans l'historique git montre les tests rouges** avant le passage au vert.

**Si un test passe au vert AVANT que le fix correspondant ait été commité, c'est que le test ne teste pas ce qu'il prétend tester.** Abort, retravaille.

### Stack de tests imposée (plan.md §9)

- **Tests d'intégration** : Vitest + React Testing Library + msw (Mock Service Worker) pour mocker les appels LLM.
- **Tests unitaires** : Vitest seul.
- **PAS de Playwright** dans ce sprint (cf. TECH-DEBT-052, à monter avant Phase 7 T-7.9).

### Stack technique du projet (rappel)

- TypeScript 5.5+ strict mode
- React 18+
- Fluent UI 2 (`@fluentui/react-components`)
- pnpm workspaces + Turborepo
- Biome pour lint+format (PAS ESLint, PAS Prettier)
- Conventional commits

### Couverture cible (constitution §10.1)

- **90% core / 80% UI**, bloquant en CI
- Vérification via `pnpm turbo test --coverage`

### Pas de scope creep

- Pas de refactor de code adjacent qui semble perfectible — signaler dans rapport, ne pas toucher.
- Pas de bump de version pour fonctionnalité non spécifiée.
- Pas de modif `Specs/` SAUF ajout TECH-DEBT-053 dans `tasks.md` (commit doc, voir étape 8).
- Pas de modif `ARGOS_LLM_PROVIDERS_REFERENCE.md` (TECH-DEBT-053 à part).

### Pas de push, pas de PR

- Tu **ne pousses pas** sur `origin`.
- Tu **n'ouvres pas** de PR.
- Alexandre fait à la main après revue du rapport final.

---

## 3. PRÉREQUIS

- [ ] Tu es sur `main`, à jour avec `origin/main` (HEAD attendu : `9292163` ou plus récent)
- [ ] `git status` propre
- [ ] Version actuelle = `0.5.29` (trio lié : `package.json`, `apps/argos-extension/package.json`, `apps/argos-extension/vss-extension.json`)
- [ ] `Specs/tasks.md` contient bien `### Sprint 2.21 part 2` avec mention CHECKPOINT C
- [ ] `Specs/CLAUDE_TASK_sprint-2-21-part-2-ADDENDUM.md` accessible dans le repo (référence pour le scope détaillé) — **NB** : ce fichier est dans `claude_prompts/`, PAS dans `Specs/` (déplacé lors du cleanup 2026-05-25)

Si l'un de ces prérequis échoue → abort + rapport.

---

## 4. WORKFLOW

### ÉTAPE 0 — Setup branche

```bash
git checkout main
git pull origin main
git checkout -b sprint/2.21-part-2
```

Vérifie immédiatement :
```bash
git log --oneline -5  # doit montrer 9292163 ou plus récent
node -p "require('./package.json').version"  # 0.5.29
```

### ÉTAPE 1 — Reconnaissance code base (lecture seule, ~30 min)

Tu lis et tu cartographies, **tu ne modifies rien**.

#### 1.1 Localiser les fichiers à modifier

```bash
# Provider LLM Azure OpenAI
find apps/argos-extension/src/hub/llm -name "azure-openai-provider.ts"
find apps/argos-extension/src/hub/llm -name "azure-ai-foundry-provider.ts"
find apps/argos-extension/src/hub/llm -name "llm-provider.ts"

# Service de config LLM
find apps/argos-extension/src -name "llm-config-service.ts" -o -name "LlmConfigService.ts"

# Settings UI
find apps/argos-extension/src/hub/views -name "SettingsView.tsx"
```

Documente dans le rapport final section "Reconnaissance" :
- Chemin exact de chaque fichier
- Présence (ou absence) actuelle d'un champ `maxTokens` dans la config
- Présence (ou absence) actuelle d'un placeholder `gpt-4.1-mini` dans `SettingsView.tsx`
- Pattern de mock LLM actuel dans les tests existants (`tools/regression/T-2.21-*.test.ts`)

#### 1.2 Identifier la numérotation bugs régression

```bash
ls apps/argos-extension/src/__tests__/regression/ 2>/dev/null | grep "^bug-" | sort
ls tools/regression/ 2>/dev/null | grep "^bug-" | sort
```

Trouve le plus grand `bug-NNN` actuel. Pour ce sprint, tu vas créer **bug-{NNN+1}** (truncation max_tokens, le bug E2E vendredi 22 mai).

#### 1.3 Observer le pattern conventional commits

```bash
git log --oneline -20
```

Note dans rapport : conventional commits en **français** ou **anglais** ? Suis le pattern observé.

#### 1.4 Vérifier la valeur actuelle hard-coded de max_tokens

```bash
grep -rn "max_tokens" apps/argos-extension/src/hub/llm/
grep -rn "maxTokens" apps/argos-extension/src/hub/llm/
```

Note la valeur trouvée. Documente dans rapport. **Attendu : 4000 hard-coded** (selon diagnostic 2026-05-22).

### ÉTAPE 2 — Commit 1 : tests d'intégration régression (RED)

> **Objectif** : démontrer que les régressions existent. Les tests doivent **échouer** contre le code actuel.

#### 2.1 Test régression bug-{NNN+1} : truncation max_tokens

Chemin : `apps/argos-extension/src/__tests__/regression/bug-{NNN+1}-aigeneration-truncation-maxtokens.integration.test.tsx`

(Note : adapte le préfixe et le suffixe selon le pattern du repo. Le pattern observé en Sprint 2.22 était `bug-NNN-{slug}.integration.test.tsx`)

Comportement attendu en pseudo-code :

```typescript
describe("Bug {NNN+1} — AI generation truncation with max_tokens=4000", () => {
  // Setup : mock un appel Azure OpenAI/Foundry qui retourne finish_reason="length"
  // Le mock doit simuler une réponse tronquée d'un appel à 10 Test Cases avec max_tokens=4000

  it("should display clear truncation error when finish_reason='length' is returned", async () => {
    // Render AI generation flow
    // User asks for 10 Test Cases with default config (no maxTokens set)
    // Mock provider returns truncated response with finish_reason="length"
    // Assert : error message visible contains "max_tokens" or "truncation" or "Increase Max Tokens"
    // Assert : error message does NOT contain raw "Parse error" or "JSON malformed"
  });

  it("should NOT silently fail with parse error on truncation", async () => {
    // Same setup
    // Assert : no "Parse error" raw exception leaks to user
  });

  it("should respect configured maxTokens from LlmConfigService", async () => {
    // Setup: LlmConfigService returns config with maxTokens=8000
    // Trigger AI generation
    // Assert : the fetch payload contains "max_tokens": 8000 (NOT 4000)
  });
});
```

#### 2.2 Test régression : backward compatibility configs sans maxTokens

Chemin : `tools/regression/T-2.21-part-2-max-tokens-backward-compat.test.ts`

```typescript
describe("T-2.21-part-2 — max_tokens backward compatibility", () => {
  it("Sprint 2.21 part 1 configs (no maxTokens field) default to 4000", async () => {
    const legacyConfig = {
      provider: "azure-openai" as const,
      apiKey: "legacy-test-key",
      endpoint: "https://legacy.openai.azure.com",
      deploymentName: "gpt-4o-mini",
      // NO maxTokens field — config saved before Sprint 2.21 part 2
    };

    const provider = LlmProviderFactory.create(legacyConfig);
    expect(provider).toBeDefined();
    // Verify that internal max_tokens used is 4000 (the default fallback)
  });

  it("Sprint 2.21.1 Foundry configs (no maxTokens field) default to 4000", async () => {
    const foundryConfig = {
      provider: "azure-ai-foundry" as const,
      apiKey: "foundry-test-key",
      endpoint: "https://test.services.ai.azure.com/openai/v1",
      deploymentName: "gpt-4.1-mini",
      // NO maxTokens field
    };

    const provider = LlmProviderFactory.create(foundryConfig);
    expect(provider).toBeDefined();
  });
});
```

#### 2.3 Test régression : dynamic timeout

Chemin : `tools/regression/T-2.21-part-2-timeout-dynamic.test.ts`

```typescript
describe("T-2.21-part-2 — dynamic timeout calculation", () => {
  it("calculates 30s minimum timeout (cap inferior)", () => {
    // maxTokens=1000 → estimated=100s, withMargin=150s → capped to 30s minimum? NO, 150s > 30s
    // Use maxTokens=100 instead: estimated=10s, withMargin=15s → capped to 30s minimum
    // Actually re-check formula: (maxTokens/10)*1500ms = (1000/10)*1500 = 150_000ms = 150s
    // For 30s min cap: need maxTokens such that (maxTokens/10)*1500 < 30000 → maxTokens < 200
    // Edge case test with very low maxTokens
  });

  it("calculates 300s maximum timeout (cap superior)", () => {
    // maxTokens=16000 → estimated=1600s, withMargin=2400s → capped to 300s max
  });

  it("calculates intermediate timeout correctly", () => {
    // maxTokens=8000 → estimated=800s, withMargin=1200s → capped to 300s
    // maxTokens=4000 → estimated=400s, withMargin=600s → capped to 300s
    // Re-verify formula with the spec from ADDENDUM:
    //   estimatedSeconds = maxTokens / 10
    //   withMarginMs = estimatedSeconds * 1500  // +50% security margin
    //   bounds: [30_000, 300_000]
  });

  it("uses default 4000 maxTokens when config has no maxTokens", () => {
    // Default fallback test
  });

  it("aborts fetch when timeout is reached (AbortController)", async () => {
    // Mock a fetch that never resolves
    // Trigger generation with low maxTokens (fast timeout)
    // Assert : fetch is aborted with AbortError
    // Assert : user-facing error mentions timeout
  });
});
```

#### 2.4 Lancer les tests et confirmer qu'ils sont rouges

```bash
pnpm --filter argos-extension test -- bug-
pnpm --filter @atconseil/regression-suite test -- T-2.21-part-2-
```

**Tu DOIS voir des échecs.** Si tout est vert → les tests ne testent pas ce qu'ils devraient. Abort, retravaille.

#### 2.5 Commit 1

```bash
git add apps/argos-extension/src/__tests__/regression/ \
       tools/regression/T-2.21-part-2-max-tokens-backward-compat.test.ts \
       tools/regression/T-2.21-part-2-timeout-dynamic.test.ts

git commit -m "test(regression): add bug-{NNN+1} + T-2.21-part-2 max_tokens/timeout tests (RED)

TDD strict per constitution §10.4: regression tests added BEFORE fix.

Tests added:
- bug-{NNN+1}-aigeneration-truncation-maxtokens (UI integration)
  Demonstrates the truncation bug observed in BCEE-QA E2E test on
  2026-05-22 when generating 10 Test Cases with max_tokens=4000 hard-coded.

- T-2.21-part-2-max-tokens-backward-compat (provider unit)
  Verifies that Sprint 2.21 part 1 and 2.21.1 configs without maxTokens
  field still work (defaulting to 4000).

- T-2.21-part-2-timeout-dynamic (provider unit)
  Verifies the timeout calculation formula and AbortController behavior.

All tests currently FAIL against main. They will be made GREEN by
subsequent commits implementing Sprint 2.21 part 2 CHECKPOINT C.

Refs:
- spec.md US-5.1 / F1 (AI generation)
- tasks.md Sprint 2.21 part 2
- constitution.md §10.4 (TDD strict)
- claude_prompts/CLAUDE_TASK_sprint-2-21-part-2-ADDENDUM.md
- E2E bug 2026-05-22 BCEE-QA (10 TCs fail with max_tokens=4000)"
```

### ÉTAPE 3 — Commit 2 : LlmProviderConfig + provider changes (GREEN partial)

> **Objectif** : faire passer au vert `T-2.21-part-2-max-tokens-backward-compat` et `T-2.21-part-2-timeout-dynamic`.

#### 3.1 Étendre `LlmProviderConfig`

Fichier : `apps/argos-extension/src/hub/llm/llm-provider.ts`

```typescript
// Constants à exporter
export const MAX_TOKENS_DEFAULT = 4000;
export const MAX_TOKENS_MIN = 1000;
export const MAX_TOKENS_MAX = 16000;
export const MAX_TOKENS_STEP = 1000;
export const TOKENS_PER_TEST_CASE = 700; // heuristique indicative (ADDENDUM B-bis.1)

export interface LlmProviderConfig {
  provider: "azure-openai" | "azure-ai-foundry";
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion?: string;

  // NEW Sprint 2.21 part 2 (CHECKPOINT C)
  maxTokens?: number;
}

/**
 * Calcule le timeout dynamique pour un appel LLM en fonction de max_tokens.
 *
 * Formule : (maxTokens / 10 tokens/sec) * 1500ms (+50% marge sécurité)
 * Bornes : [30_000ms, 300_000ms]
 *
 * Exemples :
 *  - maxTokens=4000  → 600s avant clamp → 300s effectif (cap haut)
 *  - maxTokens=8000  → 1200s avant clamp → 300s effectif (cap haut)
 *  - maxTokens=200   → 30s avant clamp → 30s effectif (cap bas)
 *
 * NB : la formule ADDENDUM est conservatrice. La majorité des appels réels
 * tomberont sur le cap supérieur (300s). C'est intentionnel : on préfère
 * over-provisionner le timeout que voir des fetch coupés.
 */
export function calculateTimeoutMs(maxTokens?: number): number {
  const tokens = maxTokens ?? MAX_TOKENS_DEFAULT;
  const estimatedSeconds = tokens / 10;
  const withMarginMs = estimatedSeconds * 1500;
  return Math.max(30_000, Math.min(300_000, withMarginMs));
}

/**
 * Estime le nombre de Test Cases générables avec un max_tokens donné.
 * Heuristique : ~700 tokens par TC (ADDENDUM B-bis.1).
 */
export function estimateTestCasesCount(maxTokens: number): number {
  return Math.floor(maxTokens / TOKENS_PER_TEST_CASE);
}
```

#### 3.2 Modifier `azure-openai-provider.ts`

Points de modification :
- Lire `this.config.maxTokens ?? MAX_TOKENS_DEFAULT` au lieu de `4000` hard-coded
- Utiliser `calculateTimeoutMs(this.config.maxTokens)` pour le `setTimeout` de l'`AbortController`
- Détecter `response.choices[0].finish_reason === "length"` et throw une erreur explicite

```typescript
// Exemple de l'appel
const controller = new AbortController();
const timeoutMs = calculateTimeoutMs(this.config.maxTokens);
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(url, {
    method: "POST",
    headers: { "api-key": this.config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: this.config.maxTokens ?? MAX_TOKENS_DEFAULT,
      response_format: { type: "json_object" },
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  // CHECKPOINT C — Truncation detection
  if (choice?.finish_reason === "length") {
    throw new LlmTruncationError(
      "Response truncated (max_tokens reached). " +
      "Increase Max Tokens in Settings or request fewer test cases."
    );
  }

  return choice?.message?.content ?? "";
} catch (err) {
  clearTimeout(timeoutId);
  if (err instanceof Error && err.name === "AbortError") {
    throw new LlmTimeoutError(
      `LLM call timed out after ${Math.round(timeoutMs / 1000)}s. ` +
      "Consider reducing Max Tokens or check network connectivity."
    );
  }
  throw err;
}
```

Crée si nécessaire `LlmTruncationError` et `LlmTimeoutError` dans `llm-provider.ts` (classes d'erreur typées pour faciliter le handling UI).

#### 3.3 Modifier `azure-ai-foundry-provider.ts`

Mêmes modifications que `azure-openai-provider.ts` (formats API compatibles, juste l'endpoint diffère).

#### 3.4 Lancer les tests

```bash
pnpm --filter @atconseil/regression-suite test -- T-2.21-part-2-max-tokens-backward-compat
pnpm --filter @atconseil/regression-suite test -- T-2.21-part-2-timeout-dynamic
```

Les **2 tests doivent passer au vert**. Le test bug-{NNN+1} reste rouge (UI pas encore implémentée).

#### 3.5 Commit 2

```bash
git add apps/argos-extension/src/hub/llm/

git commit -m "feat(extension): T-2.21-part-2 — extend LlmProviderConfig with maxTokens

CHECKPOINT C of Sprint 2.21 part 2 (max_tokens configurable).

Changes:
- LlmProviderConfig: optional maxTokens field (default 4000 if undefined)
- Constants exported: MAX_TOKENS_DEFAULT/MIN/MAX/STEP, TOKENS_PER_TEST_CASE
- calculateTimeoutMs(maxTokens): formula (maxTokens/10)*1500ms, bounds [30s, 300s]
- estimateTestCasesCount(maxTokens): heuristic for UI display (~700 tokens/TC)
- AzureOpenAIProvider: reads config.maxTokens, dynamic timeout via AbortController
- AzureAIFoundryProvider: same changes (compatible API format)
- LlmTruncationError + LlmTimeoutError: typed errors for clear UI handling
- Truncation detection via finish_reason='length' check

Tests now GREEN (were RED in commit 1):
- T-2.21-part-2-max-tokens-backward-compat (configs without maxTokens default to 4000)
- T-2.21-part-2-timeout-dynamic (calculation + bounds + AbortController)

Test bug-{NNN+1} still RED (UI integration not yet implemented).

Refs:
- spec.md US-5.1 / F1
- tasks.md Sprint 2.21 part 2 CHECKPOINT C
- claude_prompts/CLAUDE_TASK_sprint-2-21-part-2-ADDENDUM.md B-bis.1 + B-bis.2"
```

### ÉTAPE 4 — Commit 3 : MaxTokensSlider component + SettingsView (GREEN final)

> **Objectif** : faire passer au vert le test `bug-{NNN+1}`.

#### 4.1 Créer le composant `MaxTokensSlider.tsx`

Chemin : `apps/argos-extension/src/hub/components/MaxTokensSlider.tsx`

Spécifications :
- Slider Fluent UI 2 (utilise `<Slider>` natif si disponible, sinon construit à partir de `<input type="range">` stylé)
- Range 1000-16000, step 1000
- Affiche en temps réel : `{value} tokens` + `~ {estimateTestCasesCount(value)} test cases`
- Hint : "Higher = more tests but slower & costlier. Default 4000 works for most cases (~5-7 test cases)."

#### 4.2 Modifier `SettingsView.tsx`

Points de modification (selon Q1 décidée 2026-05-25 = Interprétation A) :

1. **Placeholder HTML pur sur le champ "Model Name / Deployment Name"** :
```tsx
<Input
  value={deploymentName}
  onChange={(_, data) => setDeploymentName(data.value)}
  placeholder="gpt-4.1-mini"
/>
<Caption1 className="field-hint">
  Example only — replace with your deployed model name (BYOK).
</Caption1>
```

⚠️ **IMPORTANT** : c'est un `placeholder` HTML, **PAS** une valeur initiale du state. Si l'utilisateur ne tape rien, `deploymentName` reste vide. C'est intentionnel (stratégie BYOK pure, pas de "default Argos").

2. **Section "Advanced Settings" collapsible** avec :
   - Toggle button (chevron `>` quand fermé, `v` quand ouvert)
   - Fermée par défaut
   - Contient `<MaxTokensSlider>` connecté au state local `maxTokens`
   - State initialisé via `existingConfig?.maxTokens ?? MAX_TOKENS_DEFAULT`

3. **handleSave** : inclure `maxTokens` dans le payload sauvegardé via `LlmConfigService`

#### 4.3 Lancer tous les tests

```bash
pnpm --filter argos-extension test
pnpm --filter @atconseil/regression-suite test
pnpm turbo test  # vérifier zéro régression sur le reste
```

**Tous les tests doivent passer au vert.** Le test `bug-{NNN+1}` aussi.

#### 4.4 Commit 3

```bash
git add apps/argos-extension/src/hub/components/MaxTokensSlider.tsx \
       apps/argos-extension/src/hub/views/SettingsView.tsx

git commit -m "feat(extension): T-2.21-part-2 — Advanced Settings UI with MaxTokensSlider

CHECKPOINT C of Sprint 2.21 part 2 (UI layer).

Changes:
- New MaxTokensSlider.tsx: range 1000-16000 (step 1000), real-time
  display of estimated test cases count, hint with default explanation.
- SettingsView.tsx: 'Advanced Settings' collapsible section (closed by
  default) containing MaxTokensSlider.
- SettingsView.tsx: 'Model Name' field now uses HTML placeholder
  'gpt-4.1-mini' for guidance only (Interprétation A: BYOK strategy,
  no default value pre-filled). Caption explicit: 'Example only —
  replace with your deployed model name (BYOK).'
- LlmConfigService payload now includes maxTokens on save.

Test bug-{NNN+1} now GREEN (was RED in commit 1).

UX rationale:
- Power users access via Advanced section (collapsed default = no noise
  for 95% of users keeping default 4000).
- Pedagogy integrated: tokens → test cases equivalence visible in real time.
- No silent defaults: model name placeholder is clearly labeled 'example only'.

Refs:
- spec.md US-5.1 / F1
- tasks.md Sprint 2.21 part 2 CHECKPOINT C
- Decision Q1 2026-05-25 (placeholder HTML, no pre-filled value)"
```

### ÉTAPE 5 — Commit 4 : Documentation update

Fichiers à mettre à jour :

#### 5.1 `docs/user-guide.md`

Ajouter une section "Advanced AI Settings" sous la doc AI Generation existante :
- Capture/description du slider
- Tableau équivalence tokens → test cases (extrait ADDENDUM B-bis.1)
- Note sur le placeholder "Example only" du model name (BYOK clarification)

#### 5.2 `docs/operator-guide.md`

Section troubleshooting :
- Symptôme "Response truncated (max_tokens reached)" → action : augmenter le slider Max Tokens
- Symptôme "LLM call timed out after Xs" → action : réduire Max Tokens ou vérifier connectivité
- Note : le timeout dynamique cap à 5 min, donc pour les modèles très lents avec max_tokens=16000, l'appel peut être interrompu

#### 5.3 `README.md`

Aucune mise à jour majeure (le README est haut niveau). Ajouter une bullet dans la liste features si pertinent.

#### 5.4 `CHANGELOG.md`

Sous `## [0.5.30] - 2026-05-XX` :

```markdown
## [0.5.30] - 2026-05-XX

### Added
- **AI Settings — Advanced section** : configurable `max_tokens` slider (1000-16000) for AI test case generation. Default 4000 (~5-7 TCs).
- **Pedagogy integrated** : real-time display of estimated test cases count based on max_tokens.
- **Dynamic timeout** : LLM call timeout adapts to max_tokens (30s minimum, 5min maximum) via AbortController.
- **Truncation detection** : explicit error message when `finish_reason='length'` is returned (no more silent "Parse error").
- **Settings UI clarification** : "Model Name" field now shows placeholder example "gpt-4.1-mini" with caption "Example only — replace with your deployed model name (BYOK)". No pre-filled default (aligned with BYOK strategy).

### Fixed
- **bug-{NNN+1}** : Truncation bug observed in BCEE-QA on 2026-05-22 — 10 Test Cases generation failed silently with hard-coded `max_tokens=4000`. Now configurable + explicit truncation error.

### Backward Compatibility
- Sprint 2.21 part 1 and 2.21.1 configs without `maxTokens` field continue to work (default to 4000 transparently). No migration required.
```

#### 5.5 Commit 4

```bash
git add docs/user-guide.md docs/operator-guide.md README.md CHANGELOG.md

git commit -m "docs: T-2.21-part-2 — user-guide, operator-guide, README, CHANGELOG

Documents Sprint 2.21 part 2 CHECKPOINT C changes:
- user-guide.md: new 'Advanced AI Settings' section with tokens→TCs table
- operator-guide.md: troubleshooting Truncation + Timeout errors
- README.md: feature list update
- CHANGELOG.md: v0.5.30 entry (Added + Fixed + Backward Compat sections)

Refs:
- tasks.md T-2.21-part-2 (CHECKPOINT C)
- Alex rule: 'documentation mise à jour à chaque changement'"
```

### ÉTAPE 6 — Commit 5 : Audit deps + LLM models check (constitution §10.5)

```bash
pnpm audit --audit-level=high
pnpm outdated
```

Examine les résultats :
- 0 vulnérabilité HIGH ou CRITICAL → OK
- Sinon : STOP, ne pas livrer, signaler à Alexandre.

**Note vérification LLM models (selon règle Alex 2026-05-22)** : ce sprint ne change pas le modèle par défaut Argos (TECH-DEBT-053 séparée). Mais vérifier dans le rapport final que `gpt-4.1-mini` (utilisé en placeholder UI et en test Alex sur Foundry) est toujours disponible chez Microsoft Foundry. Pas besoin d'appel API actif — juste un statement dans le rapport.

Commit même si rien à update (allow-empty pour traçabilité) :

```bash
git commit --allow-empty -m "chore(deps): T-2.21-part-2 — audit + outdated review for Sprint 2.21 part 2

pnpm audit --audit-level=high: clean (0 vulnerabilities)
pnpm outdated: [résumé des deps trouvées, ou 'no significant updates']

LLM models check (per Alex rule 2026-05-22):
- Sprint scope = max_tokens config only, no model migration.
- TECH-DEBT-053 created in this sprint for default model strategy.
- gpt-4.1-mini placeholder (UI example only) verified stable on
  Microsoft Foundry tenant per Alex pre-sprint check.

Refs:
- constitution.md §10.5 (deps + vulnerabilities)
- tasks.md T-2.21-part-2"
```

### ÉTAPE 7 — Commit 6 : Ajout TECH-DEBT-053 dans tasks.md

> **Objectif** : tracer la décision actée en session chat 2026-05-25 sur la migration future du modèle par défaut Argos, sans Pattern A séparé.

#### 7.1 Modifier `Specs/tasks.md`

Ajouter dans la section TECH-DEBT (ou créer-la si absente), avant ou après le bloc Sprint 2.21 part 2 :

```markdown
### TECH-DEBT-053 — Migration modèle par défaut Argos (clarification stratégie BYOK)
**Priorité :** 🟡 Moyenne
**Découverte :** Session chat 2026-05-25 (cohérence specs LLM post-Sprint 2.21 part 2)

**Contexte :**
- Argos suit une stratégie BYOK pure : le client apporte SA clé ET SON modèle. Aucun modèle n'est "préconisé" par Argos.
- Actuellement `gpt-4.1-mini` apparaît dans le code provider (utilisé pour les tests Alex sur Foundry) et est cité dans `ARGOS_LLM_PROVIDERS_REFERENCE.md` parfois comme "recommandé", parfois listé comme deprecated.
- Le test régression `LLM-2026-05-09-gpt41-deprecation.test.ts` interdit toute mention de `gpt-4.1` (avec allowlist).
- Sprint 2.21 part 2 a ajouté un placeholder UI clair "Example only — replace with your model" pour respecter la stratégie BYOK. Mais le code et la doc restent à clarifier.

**Action :**
- Clarifier dans `ARGOS_LLM_PROVIDERS_REFERENCE.md` la distinction "modèles utilisés pour tests internes" vs "modèles recommandés à l'utilisateur" (probablement : Argos ne recommande **aucun** modèle, juste documente ce qui est compatible).
- Reformuler le test régression `LLM-2026-05-09-gpt41-deprecation` : autoriser le code provider et les tests internes à mentionner `gpt-4.1-mini` (allowlist déjà partielle), mais maintenir l'interdiction dans la doc utilisateur et les messages d'erreur affichés à l'utilisateur final.
- Vérifier que `azure-ai-foundry-provider.ts` et `azure-openai-provider.ts` n'ont aucune valeur "default model" qui pourrait être perçue comme préconisation Argos.

**Estimation :** 1-2h
**Sprint cible :** À planifier — soit Sprint 2.21 part 4, soit avant Sprint 4.x (LLM veille architecture).
**Refs :**
- Session chat 2026-05-25 (Q-bonus 1/2/3 actées par Alexandre Thibaud)
- Sprint 2.21 part 2 placeholder UI (commit XXX)
```

#### 7.2 Commit 6

```bash
git add Specs/tasks.md

git commit -m "docs(specs): T-2.21-part-2 — add TECH-DEBT-053 (default model clarification)

Acted during session chat 2026-05-25 (Q-bonus 1/2/3 with Alexandre Thibaud).

TECH-DEBT-053 traces the future work needed to clarify Argos BYOK
strategy regarding 'default models': Argos doesn't recommend any
specific model, but current code and docs still mention gpt-4.1-mini
in ways that could be perceived as a recommendation.

Sprint 2.21 part 2 partially addressed this via the UI placeholder
clarification (commit XXX 'Example only — replace with your deployed
model name (BYOK)'). The remaining work (doc clarification + test
regression reformulation) is parked for a future sprint.

No code change in this commit. Integrated in the Sprint 2.21 part 2
doc commit per session decision Option 1 (vs separate Pattern A).

Refs:
- Session chat 2026-05-25
- tasks.md Sprint 2.21 part 2
- ARGOS_LLM_PROVIDERS_REFERENCE.md (to clarify in future sprint)
- tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts (to reformulate)"
```

### ÉTAPE 8 — Commit 7 : Version bump (DERNIER commit)

Bump dans tous les fichiers du trio lié + packages indépendants impactés :

```bash
# Trio lié (constitution §1.3 + plan.md §1.3)
# - package.json (racine)
# - apps/argos-extension/package.json
# - apps/argos-extension/vss-extension.json
```

Mettre à jour CHANGELOG.md avec la date finale (remplacer `2026-05-XX` par la date du jour) et `[0.5.30]` confirmé.

```bash
git add package.json apps/argos-extension/package.json apps/argos-extension/vss-extension.json CHANGELOG.md

git commit -m "chore(release): bump 0.5.29 → 0.5.30 (Sprint 2.21 part 2)

Sprint 2.21 part 2 — CHECKPOINT C only (max_tokens configurable +
timeout dynamique + truncation detection + UI placeholder clarification).

Drawer + Gherkin native deferred to Sprint 2.21 part 3 (decision 2026-05-25,
to keep PR scope tight and observe in BCEE-QA before continuing).

Minor bump justified: new user-facing UI feature (Advanced Settings section,
MaxTokensSlider component) + bugfix bug-{NNN+1} truncation behavior.

Refs:
- spec.md US-5.1 / F1
- tasks.md Sprint 2.21 part 2 CHECKPOINT C
- CHANGELOG.md [0.5.30]"
```

---

## 5. SCÉNARIO D'ÉCHEC

Si un commit ne fait pas passer le test attendu au vert :

1. `git status` pour voir l'état
2. `pnpm test --reporter verbose {filtre}` pour les détails
3. Analyser, corriger (code ou test si ce dernier était mal écrit)
4. Re-tenter

**Pas plus de 3 tentatives** sur un même commit avant rapport d'échec partiel et stop.

Cas spéciaux :
- **Si Vitest échoue avec un timeout** lors du test `T-2.21-part-2-timeout-dynamic` (test du timeout lui-même) : c'est un cas méta-test. Probablement il faut mocker `setTimeout` avec `vi.useFakeTimers()`. À traiter dans le test, pas dans le code provider.
- **Si le placeholder HTML ne s'affiche pas** dans le test d'intégration : vérifier que le composant Fluent UI 2 utilisé supporte bien `placeholder` (Input vs TextField — l'API a évolué entre Fluent UI 1 et 2). Documenter dans le rapport.

---

## 6. CE QUE TU NE FAIS PAS

- ❌ Tu ne touches pas à `Specs/spec.md`, `Specs/plan.md`, `Specs/constitution.md`
- ❌ Tu ne touches à `Specs/tasks.md` QUE pour ajouter TECH-DEBT-053 dans le commit 6 (pas de modif autre)
- ❌ Tu ne touches pas au schéma WIT (`testvault-wit-schema/`)
- ❌ Tu ne touches pas au manifeste `vss-extension.json` SAUF pour le bump de version (commit 7)
- ❌ Tu ne pousses pas sur `origin` ni n'ouvres de PR
- ❌ Tu ne refactores pas de code adjacent qui te semble douteux — signaler dans rapport
- ❌ Tu ne crées pas de TECH-DEBT autonome — TECH-DEBT-053 acté en session chat, reste à traiter à part
- ❌ Tu n'ajoutes pas le Drawer pattern (Sprint 2.21 part 3)
- ❌ Tu n'ajoutes pas Gherkin native editor (Sprint 2.21 part 3)
- ❌ Tu ne migres pas le modèle par défaut (TECH-DEBT-053)
- ❌ Tu ne reformules pas le test régression `LLM-2026-05-09-gpt41-deprecation` (TECH-DEBT-053)

---

## 7. RAPPORT FINAL ATTENDU

Fichier `sprint-2.21-part-2-code-report.md` à la racine (NON commité, juste pour Alexandre) :

1. **Statut global** : ✅ SUCCESS / ❌ FAILED
2. **Reconnaissance code base** :
   - Chemins exacts des fichiers modifiés
   - Numérotation `bug-NNN+1` utilisée
   - Pattern conventional commits observé (français / anglais)
   - Valeur actuelle hard-coded de `max_tokens` confirmée
3. **Commits créés** : liste SHA + résumé (7 commits attendus)
4. **Couverture finale** : `pnpm turbo test --coverage` output (extension + regression suite)
5. **Tests régression** : confirmation bug-{NNN+1}, T-2.21-part-2-* verts
6. **pnpm audit** : output
7. **LLM models check** : confirmation gpt-4.1-mini toujours disponible Foundry (selon vérif Alex pré-sprint)
8. **Anomalies relevées** :
   - Code douteux non touché (scope creep prevention)
   - Choix de design pris sans guidance claire (notamment composant Slider Fluent UI 2 si pas dispo natif)
   - Tout mismatch entre l'ADDENDUM et la réalité du code
9. **Validation BCEE-QA manuelle (Alex)** : liste scenarios à valider
   - Configurer max_tokens=8000 dans Settings, générer 10 TCs → success attendu
   - Configurer max_tokens=1000, générer 1 TC → success rapide attendu
   - Configurer max_tokens=16000, générer 20 TCs → success avec ~3 min attendu (ne pas paniquer)
   - Sans config maxTokens (backward compat) → fonctionne comme avant (4000)
   - Truncation : provoquer en demandant 15 TCs avec max_tokens=4000 → message d'erreur clair (PAS "Parse error")
10. **Instructions PR** :
    ```
    git push -u origin sprint/2.21-part-2
    Ouvrir PR sur main avec :
      Titre : "feat(extension): Sprint 2.21 part 2 — Advanced AI Settings (max_tokens config)"
      Description : référencer tasks.md Sprint 2.21 part 2 CHECKPOINT C, et la question
                   non-regression check requise par le template.
    ```

---

## 8. CLEANUP POST-MERGE (à exécuter par Alexandre après merge PR sur main)

> ⚠️ NON exécuté par Claude Code. Listé ici pour rappel — Alexandre lance après merge.

Déplacer les artefacts `CLAUDE_TASK_*.md` de Sprint 2.21 part 2 vers `claude_prompts/` pour garder `Specs/` propre.

```powershell
cd E:\Code\TestVault

if (-not (Test-Path claude_prompts)) {
    New-Item -ItemType Directory -Path claude_prompts | Out-Null
}

$candidates = @()
$candidates += Get-ChildItem -Path . -Filter "CLAUDE_TASK_*.md" -ErrorAction SilentlyContinue
$candidates += Get-ChildItem -Path Specs -Filter "CLAUDE_TASK_*.md" -ErrorAction SilentlyContinue

if ($candidates.Count -eq 0) {
    Write-Host "OK : Aucun CLAUDE_TASK_*.md a deplacer."
} else {
    foreach ($file in $candidates) {
        $destination = Join-Path "claude_prompts" $file.Name
        if (Test-Path $destination) {
            Write-Warning "ATTENTION : $($file.Name) existe deja dans claude_prompts/ -- skip"
        } else {
            Move-Item -Path $file.FullName -Destination $destination
            Write-Host "Deplace : $($file.FullName) => $destination"
        }
    }
}

Write-Host ""
Write-Host "Etat final claude_prompts/ :"
Get-ChildItem claude_prompts -Filter "CLAUDE_TASK_*.md" | Select-Object Name, LastWriteTime
```

Si des fichiers ont bougé :

```powershell
git status
git add .
git commit -m "chore: move CLAUDE_TASK sprint 2.21 part 2 files to claude_prompts/"
git push
```

⚠️ **Note encoding** : ce bloc PowerShell est en ASCII strict (sans accents, sans emoji) pour compatibilité PowerShell 5.1 + 7+ (leçon apprise session 2026-05-25, cf. `/CLAUDE.md` racine "Encoding rules").

---

## FIN

Si tu vas jusqu'au rapport final sans abort, Sprint 2.21 part 2 CHECKPOINT C est implémenté.

L'étape 8 (cleanup post-merge) est à lancer manuellement par Alexandre après merge de la PR sur main.
