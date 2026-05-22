# SPRINT 2.22 — PATCH SPEC-KIT CONSOLIDÉ

> Date : vendredi 2026-05-22 (soir)
> Auteur : Claude (chat) sur instructions Alexandre Thibaud
> À appliquer dans : `E:\Code\TestVault\Specs\`

---

## CONTEXTE

Sprint 2.22 = un sprint unique qui livre **3 changements couplés** issus du test E2E de Sprint 2.21 part 1 (bouton "AI Generate" cassé sur erreur Area Path manquant) :

- **CHANGE 0** — Aligner constitution + spec + plan + tasks sur la décision stratégique "no backend / client-side only" (actée 2026-05-22).
- **CHANGE 1** — Bugfix : Area Path + Iteration Path absents de `TestCaseFormView` (régression vs `spec.md` US-1.1).
- **CHANGE 2** — Nouvelle feature US-5.1.1 "AI Suggest Steps" + déplacement du bouton "Suggest Tests" vers le Coverage Panel (conforme T-6.6 / US-5.1).

**Décisions actées dans cette session (questions Q1-Q9) :**

- Q1 : Area Path par dropdown user-choisi quand création depuis liste TC (pas de défaut hérité).
- Q2 : Area Path hérité de l'US source quand création depuis "Suggest Tests", **pré-rempli mais modifiable** dans la modal.
- Q3 : Bouton actuel `TestCaseFormView` *reste* mais avec sémantique steps-only (CHANGE 2 fusionné dans CHANGE 1).
- Q4 : Feature "AI Suggest Steps" validée.
- Q5 : Contexte LLM = title + description + tags + priority + area path + linked WIs s'il y en a.
- Q6 : Steps déjà saisis → modal "Remplacer / Compléter / Annuler".
- Q7 : Bouton désactivé sauf si (titre saisi **OU** au moins un lien exigence) → lecture souple.
- Q8 : On fait ça maintenant avant le WE.
- Q9 : T-2.21-postmortem créée avec 2 tests E2E de régression obligatoires.

---

# PARTIE A — Reprise textuelle de SPECS_PATCH_2026-05-22.md

> Ces 5 patches étaient déjà préparés. À appliquer textuellement.

## PATCH A.1 : `constitution.md` — Ajout §6.0

**AJOUTER en début de §6 ou en préambule de la section Opérations :**

```markdown
## 6.0 Architecture decision : Client-side only (acte 2026-05-22)

Argos est concu comme une extension ADO **100% client-side**, sans backend
serveur Argos heberge.

### Implications

- **API keys LLM** : stockees via ADO Extension Data Service 
  (encryption gerée par Microsoft, BYOK pattern)
- **Pas de proxy serveur** : les requetes LLM vont DIRECTEMENT 
  du client vers le provider (Azure OpenAI, Foundry, Anthropic, etc.)
- **Pas de telemetry serveur** : aucune donnee transite par un 
  serveur Argos
- **Pas de quota tracking centralise** : chaque user paie ses 
  propres calls LLM via sa cle BYOK
- **Audit trail** : conserve via WIT TestVault.AuditLog (cf. §6.3) 
  mais sans backend dedie

### Trade-offs acceptes

- **Plus** : Zero serveur cost, privacy-by-design, simplicite ops,
  scalability inherente
- **Moins** : Pas de tier "Argos hosted" (user doit fournir cle), 
  pas de quota global, audit moins puissant

### Evolution future

Un backend Argos pourrait etre ajoute en Phase 6+ (TECH-DEBT-017 
DEFERRED) si la demande emerge pour :
- Tier "Argos hosted" / "Argos free credit"
- Audit centralise multi-tenants
- Routing intelligent multi-providers

Pour l'instant : NOT IN SCOPE.

Reference : decision strategique Alexandre Thibaud vendredi 2026-05-22 
apres test E2E Sprint 2.21.1.
```

---

## PATCH A.2 : `spec.md` US-6.2 — Enrichissement

**REMPLACER l'intégralité de la section US-6.2 PAR :**

```markdown
#### US-6.2 : Configurer un fournisseur LLM (BYOK)

**En tant que** Aïcha (Admin), **je veux** ajouter ma clé API LLM 
**afin d'** activer les features AI pour mon équipe.

**Providers supportes (Sprint 2.21 a 2.21.1) :**
- Azure OpenAI Service (classique)
- Azure AI Foundry

**Providers prevus (Phase 3+) :**
- Anthropic Claude
- OpenAI direct
- Mistral AI
- Google Gemini (optional)

**Critères d'acceptation :**

- **Given** je suis Admin TestVault sur ADO Cloud, **When** je vais 
  dans Settings > AI Configuration, **Then** je peux selectionner un 
  provider parmi : Azure OpenAI Service, Azure AI Foundry. 
  (Anthropic, OpenAI, Mistral viendront en Phase 3+).

- **Given** je selectionne un provider, **Then** les labels et hints 
  des champs s'adaptent au provider (ex : "Deployment Name" pour 
  Azure OpenAI vs "Model Name" pour Foundry).

- **Given** je saisis endpoint + cle + deployment/model name, 
  **Then** je peux tester la connexion ("Test" button) qui fait un 
  call de validation light.

- **Given** la clé est invalide, **Then** un message d'erreur précis 
  s'affiche (401, 404, network, timeout) et la clé n'est pas 
  enregistrée.

- **Given** la clé est valide, **Then** elle est encryptee via ADO 
  Extension Data Service et l'événement est journalisé dans 
  `TestVault.AuditLog` avec la clé tronquée (4 derniers caractères).

- **NEW Sprint 2.21 part 2** : **Given** je clique sur "Advanced 
  Settings", **Then** je peux configurer le `max_tokens` (1000-16000, 
  defaut 4000) via slider, avec equivalence visuelle 
  "~X test cases per generation" affichee en temps reel.

- **NEW Sprint 2.21 part 2** : **Given** je configure max_tokens 
  eleve (>8000), **Then** Argos utilise un timeout dynamique adapte 
  (max 5 min) pour eviter les fetch timeout sur generations longues.

**Priorité :** 🔴 Haute

**Note architecture :** la cle API est stockee via ADO Extension 
Data Service (encryption native Microsoft). Argos n'a JAMAIS acces 
en clair a la cle. Les requetes LLM vont directement du client 
vers le provider, sans backend Argos intermediaire.
```

---

## PATCH A.3 : `spec.md` US-6.3 — Statut modifié

**REMPLACER l'intégralité de la section US-6.3 PAR :**

```markdown
#### US-6.3 : Définir des quotas AI par utilisateur

**STATUT : DEFERRED indefiniment (decision strategique 2026-05-22)**

**Raison du deferal :** Argos reste 100% client-side (cf. constitution §6.0). 
Chaque user fournit sa propre cle LLM (BYOK), donc paye ses propres calls 
au provider. Pas de tracking quota centralise necessaire.

**Si reactivation future** (Phase 6+ avec backend optionnel) :

> En tant que Aïcha, je veux limiter la consommation AI par utilisateur 
> afin de maîtriser les coûts (mode "Argos hosted" optionnel).

Implementation necessiterait :
- Backend Argos (TECH-DEBT-017 DEFERRED)
- Module crypto BYOK (T-6.2 DEFERRED)
- Quota tracking serveur
- Mode tier "Argos hosted" (vs BYOK simple)

**Priorité :** ❄️ DEFERRED (pas dans MVP, pas dans Phase 2-3-4-5)
```

---

## PATCH A.4 : `spec.md` US-6.4 — Simplifié

**REMPLACER l'intégralité de la section US-6.4 PAR :**

```markdown
#### US-6.4 : Consulter l'audit trail des opérations Admin

**STATUT : SIMPLIFIE - audit WIT-based (decision 2026-05-22)**

**En tant que** Aïcha (ou auditeur externe), **je veux** consulter 
l'historique des opérations Admin **afin de** garantir la traçabilité.

**Architecture :** audit trail via WIT `TestVault.AuditLog` 
(pas de backend dedie, cohérent avec architecture client-side §6.0).

**Critères d'acceptation :**

- **Given** une operation Admin sensible est effectuee (config LLM, 
  install process, retention update), **When** elle se termine, 
  **Then** un Work Item `TestVault.AuditLog` est cree avec :
  - Author (User ID + Display Name)
  - Timestamp UTC
  - Operation type
  - oldValueAnonymized / newValueAnonymized (cle API masquee)
  - Context metadata

- **Given** je suis Admin TestVault, **When** je vais dans 
  Settings > Audit Log, **Then** je vois la liste des AuditLog 
  WI filtrable par : auteur, date range, type d'opération.

- **Given** j'exporte le log, **Then** je peux télécharger un CSV 
  ou JSON avec la totalité des entrées sur la période sélectionnée.

- **Retention** : controle via ADO retention policies sur le WIT 
  (defaut 24 mois). Au dela : WI peuvent etre archives ou supprimes.

**Priorité :** 🟡 Moyenne (post-launch)

**Note :** version simplifiee vs ancienne version (qui prevoyait 
service AuditLogService backend). Decision : reste client-side, 
le WI cree suffit pour traçabilité.
```

---

## PATCH A.5 : `plan.md` §7 + §8 — Statut modifié

**REMPLACER l'introduction de §7 PAR :**

```markdown
## 7. Backend (Azure Functions) - DEFERRED indefiniment

**STATUT : DEFERRED (decision strategique 2026-05-22)**

Cette section etait prevue pour la Phase 6. Suite a la decision 
strategique vendredi 2026-05-22, Argos reste 100% client-side 
(cf. constitution §6.0).

**Donc :**
- Pas de deploiement Azure Functions
- Pas d'endpoint serveur Argos
- Pas de crypto BYOK side-server (T-6.2)
- Pas de routing serveur LLM (T-6.3)

**Conservation pour reference future :** si la demande emerge pour 
un mode "Argos hosted" en Phase 6+, le design ci-dessous reste valide. 
Pour l'instant : NOT IN SCOPE.

[... conserver le design existant pour reference ...]
```

**REMPLACER l'introduction de §8 PAR :**

```markdown
## 8. Module crypto BYOK - SIMPLIFIE

**STATUT : SIMPLIFIE - encryption native ADO (decision 2026-05-22)**

Cette section etait prevue pour Phase 6 avec un module crypto custom 
(AES-256-GCM + HKDF par org). Suite a la decision strategique, le 
mecanisme est simplifie :

**Approche actuelle (Sprint 2.21+) :**
- Les cles API LLM sont stockees via **ADO Extension Data Service** 
- Microsoft gere l'encryption at rest (chiffrement natif ADO)
- Argos ne voit JAMAIS la cle en clair (recuperee a la volee pour 
  chaque call LLM)
- Pas de masterkey, pas de HKDF, pas de gestion crypto custom

**Beneficies :**
- Securite garantie par Microsoft (ISO 27001, SOC 2, etc.)
- Pas de surface d'attaque crypto custom
- Pas de gestion de cles (rotation, backup)
- Conforme RGPD via ADO data residency

**Note future :** si backend Argos en Phase 6+, le design crypto 
custom redeviendrait pertinent pour transmettre les cles 
client -> serveur. Pas dans le scope actuel.
```

---

## PATCH A.6 : `tasks.md` Phase 6 — DEFERRED

**REMPLACER l'introduction Phase 6 PAR :**

```markdown
## Phase 6 - Administration & Backend (DEFERRED)

**STATUT GLOBAL : DEFERRED indefiniment (decision strategique 2026-05-22)**

Suite a la decision strategique "Argos reste 100% client-side" 
(cf. constitution §6.0), les taches T-6.1 a T-6.4 sont DEFERRED 
indefiniment.

**Pourquoi ?**
- Pas de backend = pas besoin d'Azure Functions (T-6.1)
- ADO Extension Data Service gere l'encryption (T-6.2 simplifie)
- UI LLM Provider deja livre dans Sprint 2.21 part 1+2 (T-6.3 done)
- Audit trail via WIT TestVault.AuditLog (T-6.4 simplifie)

**Statut individuel :**
- T-6.1 (Azure Functions) : ❄️ DEFERRED
- T-6.2 (Module crypto BYOK) : ❄️ SIMPLIFIE (ADO native)
- T-6.3 (UI LLM Provider) : ✅ DONE (Sprint 2.21 part 1+2)
- T-6.4 (Audit trail) : 🟡 SIMPLIFIE (WIT-based, livraison Phase 3+)

**Phase 6 originale est remplacee par :**
- Sprint 2.21 part 1 (Azure OpenAI client-side)
- Sprint 2.21.1 (Azure AI Foundry client-side)
- Sprint 2.21 part 2 (Drawer + Gherkin + max_tokens config)
- Sprint 2.22 (Bugfix + AI Suggest Steps) ← NOUVEAU, voir PARTIE E
- Sprint 3.x (Anthropic client-side)
- Sprint 3.x (Mistral client-side)
- Sprint 4.x (LLM veille architecture)

**Reactivation possible :** si demande emerge pour mode "Argos hosted" 
en Phase 6+ post-launch.
```

---

## PATCH A.7 : `tasks.md` Sprint 2.21 part 2 — Ajout

**AJOUTER après les sprints existants (avant la nouvelle entrée Sprint 2.22 de PARTIE E) :**

```markdown
### Sprint 2.21 part 2 - Drawer revision + Gherkin + Advanced settings 🔴

📚 prompt `CLAUDE_TASK_sprint-2-21-part-2.md` + ADDENDUM

**Objectif :** Trois ameliorations :
1. Edit AI suggestions via Drawer (vs basic inline)
2. Gherkin native (Given/When/Then editor)
3. NEW: max_tokens configurable + dynamic timeout

**Estimation :** 7-9h (ambitieux) ou splitter en 2.21 part 2 + 2.21 part 3

**CHECKPOINTS :**
- A : Drawer pattern (3h) - extensible Sprint 2.25+
- B : Gherkin native (2-3h) - USP "BDD Native"
- C : Advanced settings (3h) - NEW max_tokens + timeout

**Done quand :**
- [ ] AI suggestions editable via Drawer (vs inline)
- [ ] Gherkin editor in TestCaseFormView
- [ ] Settings UI : section "Advanced" avec MaxTokensSlider
- [ ] max_tokens configurable 1000-16000 (defaut 4000)
- [ ] Equivalence "tokens -> test cases" visible
- [ ] Timeout dynamique adapte (max 5 min)
- [ ] Detection truncation (finish_reason="length")
- [ ] Backward compatibility (configs sans maxTokens defaultent a 4000)
- [ ] Tests regression passent
- [ ] Bump 0.5.28.1 -> 0.5.29

**Refs :**
- Decouverte limite max_tokens=4000 lors test E2E vendredi 2026-05-22
- Decision Alex : configurable + pedagogique (Sprint 2.21 part 2)
```

---

# PARTIE B — Patches d'alignement complémentaires (omissions du SPECS_PATCH)

> Ces deux patches étaient absents du SPECS_PATCH_2026-05-22 et créent une incohérence intra-spec si non appliqués.

## PATCH B.1 : `spec.md` US-5.1 — Correction architecture + emplacement bouton

**REMPLACER l'intégralité de la section US-5.1 PAR :**

```markdown
#### US-5.1 : Générer un squelette de Test Cases depuis une exigence (BYOK)

**En tant que** Mathieu, **je veux** qu'Argos me propose un set de Test Cases 
candidats à partir d'une User Story (ou Bug, ou Requirement) **afin de** 
gagner du temps sur le drafting.

**Critères d'acceptation :**

- **Given** je suis User TestVault sur ADO Cloud, l'AI est activée par 
  l'Admin et la clé LLM BYOK est configurée, **When** je clique 
  "Suggest Tests" **dans le Coverage Panel d'une User Story / Bug / Requirement**, 
  **Then** Argos appelle directement le LLM configuré (client-side, 
  cf. constitution §6.0) avec le system prompt et le contenu du Work Item 
  source (titre, description, criteria d'acceptance).

- **Given** la génération aboutit, **Then** une preview interactive s'ouvre 
  avec 3-7 Test Cases candidats (titre, steps, expected results) que je peux 
  éditer, accepter individuellement ou en bloc, ou rejeter.

- **Given** j'accepte des Test Cases candidats, **Then** ils sont créés liés 
  à la User Story (lien `Tested By`) avec :
  - **Area Path pré-rempli** depuis le WI source, **modifiable** par 
    dropdown dans la modal de preview avant validation
  - **Iteration Path pré-rempli** depuis le WI source si présent, 
    modifiable, optionnel

- **Given** la clé LLM est invalide ou inatteignable, **Then** un message 
  clair s'affiche, l'opération est annulée, et un événement est journalisé 
  dans `TestVault.AuditLog`.

**Emplacement du bouton :** 
- Coverage Panel sur User Story / Bug / Requirement (CONFIRMÉ T-6.6).
- **PAS** dans `TestCaseFormView` (voir US-5.1.1 pour le bouton de cet écran).

**Priorité :** 🟡 Moyenne (premium feature)

**Note architecture :** depuis Sprint 2.21 part 1, l'appel LLM est 
**direct client → provider** (BYOK via ADO Extension Data Service). 
Pas de proxy Azure Functions. Voir constitution §6.0.
```

---

## PATCH B.2 : `spec.md` F1 — Correction architecture

**REMPLACER l'intégralité de la section F1 PAR :**

```markdown
### F1 — Génération AI de Test Cases depuis une exigence (BYOK)

**Description :** Argos appelle directement un LLM (configuré BYOK) 
**depuis le navigateur** pour générer des skeletons de Test Cases à partir 
du contenu d'une User Story / Bug / Requirement ADO. La clé API est lue à 
la volée depuis ADO Extension Data Service ; elle n'est jamais persistée 
en clair côté client.

**Architecture (depuis Sprint 2.21 part 1, conforme constitution §6.0) :**

```
[TestCaseFormView ou CoveragePanel]
        ↓ click "Suggest Tests"
[AiSuggestTestsModal] ──── lit clé ────► [ADO Extension Data Service]
        ↓ POST /chat/completions (direct)
[Provider LLM : Azure OpenAI / Foundry / Anthropic / etc.]
        ↓ réponse JSON candidates
[Preview UI] ──► [User accepte] ──► [ADO WIT Create + lien Tested By]
```

**Pas de backend Argos intermédiaire.** Voir constitution §6.0.

**Entrées :** Work Item ADO source (User Story, Feature, Bug, Requirement). 
System prompt configuré par l'Admin. Modèle configuré (gpt-4o, claude-opus-4-7, etc.). 
Paramètres : temperature (défaut 0.3), max_tokens (configurable 1000-16000, défaut 4000), 
nombre de TC souhaités (1-10, défaut 5).

**Sorties :** Liste de Test Cases candidats avec titre, description, 
steps (`{action, expected}[]`), tags suggérés, Area Path pré-rempli (modifiable), 
Iteration Path pré-rempli si applicable. Chaque TC est en preview éditable 
avant création.

**Règles métier :**

- L'utilisateur doit être User TestVault au minimum.
- L'AI doit être activée globalement par l'Admin (cf. US-6.5).
- L'AI key BYOK doit être configurée par l'Admin (cf. US-6.2).
- Le user prompt construit envoyé au LLM contient : titre + description 
  du Work Item, criteria d'acceptance s'ils existent. Aucune autre donnée 
  du projet n'est envoyée (pas d'exfiltration latérale).
- La réponse du LLM doit être un JSON parsable correspondant à un schéma 
  défini ; sinon retry avec un prompt de correction (max 1 retry).
- **Aucune persistance côté Argos** : prompts et réponses restent dans 
  le contexte du navigateur, jamais transmis à un serveur ATConseil.

**Cas limites :**

- LLM provider down → message clair, fallback provider tenté si configuré, 
  sinon abandon avec compteur de tokens non décrémenté.
- Réponse malformée même après retry → erreur user-friendly + log dans 
  console pour debug (jamais de log de la clé API).
- Work Item source vide ou trop court (< 50 caractères) → l'opération 
  est refusée avec message.
- **NEW Sprint 2.21 part 2** : finish_reason="length" → toast "Réponse 
  tronquée par max_tokens, augmente le réglage dans Settings".

**Note** : la génération de steps uniquement (sans création de WIT) est 
couverte par la feature F1.1 (cf. US-5.1.1).
```

---

# PARTIE C — Patch CHANGE 1 (Area Path / Iteration Path manquants)

> US-1.1 spécifie déjà Area Path et Iteration Path comme champs du formulaire. 
> Le code Sprint 2.19/2.20 a régressé. **Aucun patch de spec nécessaire** — 
> US-1.1 reste valide telle quelle. Le travail est dans `tasks.md` (PARTIE E) 
> et dans le code.

**Vérification post-application :** s'assurer que dans `spec.md` US-1.1, 
les champs suivants sont bien listés comme attendus dans le formulaire :
- Title (obligatoire)
- Description
- Steps
- Tags
- **Area Path (obligatoire, sélecteur ADO natif)**
- **Iteration Path (optionnel)**
- Priority

Si la version en place n'est pas conforme → restaurer la version d'origine 
(elle l'est dans le project knowledge actuel).

---

# PARTIE D — Patch CHANGE 2 (nouvelle US-5.1.1 "AI Suggest Steps")

## PATCH D.1 : `spec.md` — Ajout US-5.1.1

**AJOUTER dans `spec.md`, dans l'Epic 5, juste après US-5.1 et avant US-5.2 :**

```markdown
#### US-5.1.1 : Compléter les steps d'un Test Case en cours d'édition via AI (BYOK)

**En tant que** Mathieu (Dev SDET), **je veux** qu'Argos me propose des steps 
pour le Test Case que je suis en train de créer ou d'éditer **afin de** gagner 
du temps sur le drafting sans avoir à créer un nouveau WIT à chaque fois.

**Différence avec US-5.1** : US-5.1 crée des Test Cases entiers (WIT) depuis 
une exigence. US-5.1.1 **ne crée aucun WIT** — elle remplit uniquement la 
section "Steps" du Test Case en cours d'édition dans `TestCaseFormView`.

**Critères d'acceptation :**

- **Given** je suis User TestVault sur ADO Cloud, l'AI est activée par 
  l'Admin, la clé BYOK est configurée, et je suis dans `TestCaseFormView` 
  (création ou édition d'un Test Case), **When** j'ai saisi *soit* un titre 
  *soit* établi au moins un lien vers une exigence (User Story / Bug / 
  Requirement), **Then** le bouton "✨ AI Suggest Steps" est actif.

- **Given** je n'ai ni titre ni lien exigence, **Then** le bouton "AI Suggest 
  Steps" est **désactivé** avec un tooltip explicatif : *"Saisis un titre ou 
  lie une exigence pour activer la suggestion AI"*.

- **Given** je clique "AI Suggest Steps", **Then** Argos appelle directement 
  le LLM configuré (client-side, BYOK) avec un prompt système spécialisé 
  "génération de steps", en envoyant comme contexte :
  - Titre du Test Case (si saisi)
  - Description (si saisie)
  - Tags (si saisis)
  - Priority (si saisi)
  - Area Path (en hint domaine, si saisi)
  - Pour chaque exigence liée : titre + description + criteria d'acceptance

- **Given** la génération aboutit, **Then** une preview s'ouvre montrant 
  N steps proposés (paramètre user, 1-15, défaut 5) avec leur 
  `{action, expected}` chacun éditable inline.

- **Given** le formulaire ne contient **aucun step** déjà saisi, **Then** je 
  peux accepter directement les steps proposés, qui remplissent la section 
  Steps du formulaire.

- **Given** le formulaire contient **déjà des steps**, **When** je valide 
  la preview, **Then** une modal m'interroge : 
  - **Remplacer** : les steps existants sont écrasés par les nouveaux
  - **Compléter** : les nouveaux steps sont appendés à la fin des existants
  - **Annuler** : retour à la preview, rien n'est modifié

- **Given** je clique "Remplacer" ou "Compléter", **Then** la section Steps 
  du formulaire est mise à jour en mémoire (le Test Case **n'est pas encore 
  sauvegardé** dans ADO — je dois cliquer "Create Test Case" / "Save" pour 
  persister).

- **Given** la clé LLM est invalide ou le provider est down, **Then** un 
  message d'erreur user-friendly s'affiche, **les steps existants ne sont 
  pas modifiés**, et un événement est journalisé dans `TestVault.AuditLog`.

- **Given** la réponse LLM est tronquée (finish_reason="length"), **Then** 
  un avertissement s'affiche : *"Réponse tronquée par max_tokens. Augmente 
  le réglage dans Settings ou demande moins de steps."*

**Priorité :** 🔴 Haute (résout le bug Sprint 2.21 part 1 sur 
`TestCaseFormView` qui crée des WIT à tort).

**Note architecture** : appel LLM **direct client → provider** (BYOK). 
Pas de création de WIT par cette feature. Le quota tokens est partagé 
avec US-5.1 (même clé BYOK, même provider).
```

---

# PARTIE E — `tasks.md` Sprint 2.22 + T-2.21-postmortem

**AJOUTER dans `tasks.md`, après le bloc Sprint 2.21 part 2 (PATCH A.7) :**

```markdown
### Sprint 2.22 - Bugfix TestCaseFormView + AI bouton repositioning 🔴

📚 spec.md US-1.1, US-5.1 (PATCH B.1), US-5.1.1 (PATCH D.1), F1 (PATCH B.2)
📚 constitution.md §6.0
📚 Refs : test E2E Sprint 2.21 part 1 vendredi 2026-05-22 — 2 regressions decouvertes

**Objectif :** 3 livrables couplés
1. Bugfix régression Sprint 2.19/2.20 : Area Path + Iteration Path absents 
   de `TestCaseFormView` (vs US-1.1)
2. Bugfix régression Sprint 2.21 part 1 : bouton AI mal placé / mauvaise 
   sémantique dans `TestCaseFormView`
3. Nouvelle feature US-5.1.1 "AI Suggest Steps" + déplacement bouton 
   "Suggest Tests" vers Coverage Panel

**Estimation :** 6-8h

**Préconditions :**
- PATCHES PARTIE A + B + D appliqués dans Specs/
- Branche `sprint/2.22-tcform-bugfix-ai-steps` créée depuis `main`

#### T-2.22.1 — Ajouter Area Path et Iteration Path à TestCaseFormView 🔴

📚 spec.md US-1.1

- [ ] Test-first : `TestCaseFormView.test.tsx` — assertion "form renders 
      Area Path dropdown and Iteration Path dropdown"
- [ ] Test-first : assertion "save fails with clear error if Area Path empty"
- [ ] Composant : sélecteur Area Path (dropdown peuplé via API ADO 
      Classification Nodes, endpoint `_apis/wit/classificationNodes/Areas`)
- [ ] Composant : sélecteur Iteration Path (dropdown, optionnel)
- [ ] Default Area Path : vide → user choisit (Q1)
- [ ] Default Iteration Path : vide (optionnel)
- [ ] Validation client : Area Path obligatoire avant save, message clair
- [ ] Couverture test ≥ 80% (UI cible constitution §10.1)

**Done quand :**
- [ ] TestCaseFormView affiche les 2 dropdowns
- [ ] Save sans Area Path → erreur user-friendly
- [ ] Save avec Area Path → succès, WIT créé avec Area Path correct
- [ ] Tests unitaires verts

#### T-2.22.2 — Refactor bouton AI dans TestCaseFormView : sémantique "Steps only" 🔴

📚 spec.md US-5.1.1

- [ ] Test-first : `AiSuggestStepsModal.test.tsx` — flow complet
- [ ] Renommer label bouton : "AI Generate" → "✨ AI Suggest Steps"
- [ ] Nouveau composant `AiSuggestStepsModal` (ne pas réutiliser l'ancien 
      `AiGenerateModal` qui reste pour le Coverage Panel — voir T-2.22.3)
- [ ] Nouveau system prompt "steps generator" (extrait, focalisé sur 
      `{action, expected}[]` only, pas de title/description/tags génération)
- [ ] Contexte source : title + description + tags + priority + area path 
      + linked WIs (Q5)
- [ ] Activation bouton : (title saisi **OU** au moins 1 lien exigence) 
      → lecture souple (Q7)
- [ ] Désactivé + tooltip explicatif sinon
- [ ] Modal preview : N steps éditables inline (N configurable 1-15, défaut 5)
- [ ] Si steps existants → modal "Remplacer / Compléter / Annuler" (Q6)
- [ ] Pas de création de WIT (juste modification du state local du form)
- [ ] Gestion erreurs : LLM down, clé invalide, finish_reason="length"
- [ ] Tests unitaires + tests integration (msw mock LLM)

**Done quand :**
- [ ] Bouton AI Suggest Steps dans `TestCaseFormView` fonctionne
- [ ] **Aucun WIT créé** par cette action
- [ ] Erreur "Area Path manquant" n'apparaît plus (le bouton ne crée plus de WIT)
- [ ] Modal Remplacer/Compléter/Annuler fonctionne
- [ ] Tests verts, couverture ≥ 90% core / 80% UI

#### T-2.22.3 — Bouton "Suggest Tests" dans Coverage Panel 🔴

📚 spec.md US-5.1 (PATCH B.1), F1 (PATCH B.2), T-6.6 (legacy)

- [ ] Test-first : `CoveragePanel.test.tsx` — assertion "Suggest Tests 
      button visible on User Story / Bug / Requirement"
- [ ] Composant `CoveragePanel` (existant Phase 0 T-3.1) : ajouter 
      bouton "✨ Suggest Tests" en header de panel
- [ ] Click → modal `AiSuggestTestsModal` (migrer ici l'ancien 
      `AiGenerateModal` qui était dans `TestCaseFormView`)
- [ ] Source : Work Item courant (US/Bug/Requirement) sur lequel le 
      panel s'affiche — pas de picker, c'est implicite
- [ ] Modal preview : TC candidates éditables + Area Path / Iteration Path 
      pré-remplis depuis le WI source, modifiables par dropdown (Q2)
- [ ] À acceptation : création WIT(s) `TestVault.TestCase` + lien 
      `Tested By` vers WI source
- [ ] Gestion erreurs identique à T-2.22.2
- [ ] Tests unitaires + integration

**Done quand :**
- [ ] Bouton "Suggest Tests" visible et fonctionnel sur Coverage Panel
- [ ] Création TC depuis US fonctionne, lien Tested By créé
- [ ] Area Path héritée affichée et modifiable
- [ ] Tests verts

#### T-2.22.4 — Mise à jour documentation utilisateur 🟡

📚 Règle Alex : "la documentation doit être mise à jour à chaque changement"

- [ ] `docs/user-guide.md` : section "AI Features" réécrite
  - "Generate Test Cases from a Requirement" → depuis Coverage Panel
  - "Suggest Steps for current Test Case" → depuis TestCaseFormView
  - Screenshots à jour (au moins 4 nouveaux)
- [ ] `docs/operator-guide.md` : troubleshooting section
  - "AI button greyed out in Test Case form" → explication tooltip 
    (titre ou lien exigence requis)
  - "Where did the AI button go?" → expliquer le split en 2 boutons
- [ ] `README.md` racine : mise à jour features list
- [ ] `CHANGELOG.md` entry Sprint 2.22 avec **BREAKING CHANGE** note 
      (sémantique du bouton TestCaseFormView changée)

**Done quand :**
- [ ] User guide reflète exactement le nouveau comportement
- [ ] CHANGELOG documente le changement + breaking change
- [ ] README à jour

#### T-2.22.5 — Vérification dépendances + API externes 🟡

📚 constitution.md §10.3, Règle Alex : "API externes vérifiées, dépendances auditées"

- [ ] `npm audit --production` : 0 vulnerability HIGH / CRITICAL
- [ ] `npm outdated` : revue manuelle, mise à jour des deps mineures sûres
- [ ] Ping API ADO `_apis/wit/classificationNodes/Areas` : 200 OK + schéma attendu
- [ ] Ping Azure OpenAI `/openai/deployments/{id}/chat/completions` (smoke test)
- [ ] Ping Azure AI Foundry `/openai/v1/chat/completions` (smoke test)
- [ ] Vérifier dans `ARGOS_LLM_PROVIDERS_REFERENCE.md` qu'aucun modèle par défaut 
      Argos n'est marqué deprecated
- [ ] Note dans CHANGELOG si modèle deprecated détecté

**Done quand :**
- [ ] npm audit clean
- [ ] API externes vérifiées OK
- [ ] Aucun modèle deprecated dans les défauts Argos

#### T-2.22.6 — Validation E2E sur BCEE-QA / DEMO 🔴

📚 constitution.md §10.4

- [ ] Installer la nouvelle version dans BCEE-QA
- [ ] **Scenario 1** : créer un TC depuis liste → vérifier que Area Path 
      dropdown apparaît, save fonctionne avec Area Path, échoue sans
- [ ] **Scenario 2** : sur un TC en édition, cliquer "AI Suggest Steps" 
      → vérifier qu'aucun WIT n'est créé, que les steps remplissent le form
- [ ] **Scenario 3** : sur une User Story, ouvrir Coverage Panel, cliquer 
      "Suggest Tests" → vérifier création de TC avec lien Tested By
- [ ] **Scenario 4** : modal Remplacer/Compléter sur steps existants
- [ ] Captures d'écran de chaque scenario, archivées dans 
      `docs/screenshots/sprint-2.22/`

**Done quand :**
- [ ] Les 4 scenarios passent verts sur BCEE-QA
- [ ] Captures archivées
- [ ] Aucune régression vs Sprint 2.21.1 (vérif manuelle des autres features)

---

### T-2.21-postmortem - Tests de régression Sprint 2.21 part 1 🟡

📚 constitution.md §10.4, validation utilisateur Q9 (2026-05-22 soir)

**Contexte :** Sprint 2.21 part 1 a livré 2 régressions invisibles :
1. Bouton "AI Generate" mal placé dans `TestCaseFormView` (devrait être 
   dans Coverage Panel selon T-6.6 / US-5.1)
2. Area Path / Iteration Path absents de `TestCaseFormView` 
   (vs US-1.1 qui les liste comme obligatoires/optionnels)

**Cause racine :** aucun test E2E n'asserait ni l'emplacement du bouton 
ni la présence des champs Area Path / Iteration Path. Les 372+ tests unit 
mockaient l'environnement ADO et ne pouvaient pas détecter ces régressions.

**Conformément à constitution §10.4 (chaque bug confirmé en prod ajoute 
un test à la suite régression AVANT le fix — TDD strict §10.1) :**

- [ ] `tests/e2e/regression/bug-051-tcform-missing-areapath.spec.ts` :
  - Ouvrir TestCaseFormView (création nouveau TC depuis liste)
  - Asserter présence du dropdown Area Path
  - Asserter présence du dropdown Iteration Path
  - Tenter save sans Area Path → asserter erreur visible
  - Save avec Area Path → asserter WIT créé avec Area Path correct

- [ ] `tests/e2e/regression/bug-052-aibutton-wrong-placement.spec.ts` :
  - Ouvrir Coverage Panel d'une User Story
  - Asserter présence du bouton "Suggest Tests"
  - Cliquer → asserter modal `AiSuggestTestsModal` ouvre
  - Ouvrir TestCaseFormView 
  - Asserter présence du bouton "AI Suggest Steps" (sémantique steps-only)
  - Asserter que clic ne crée **AUCUN** WIT (vérif via API ADO)

- [ ] Mise à jour `TECH-DEBT-019` (E2E réel) : ajout référence à ces 2 tests
- [ ] CHANGELOG : mention de la prise en charge des régressions
- [ ] CI bloquante : ces 2 tests doivent passer pour merger sur `main`

**Done quand :**
- [ ] 2 tests E2E ajoutés dans `tests/e2e/regression/`
- [ ] CI fail si l'un des 2 tests échoue
- [ ] TECH-DEBT-019 documenté à jour

**Numérotation bug :** ajuster `bug-051` / `bug-052` selon la numérotation 
actuelle des bugs Argos. Si le dernier bug enregistré est `bug-NNN`, prendre 
`bug-NNN+1` et `bug-NNN+2`.
```

---

# PARTIE F — Workflow d'application

## Étape 1 : Backup

```powershell
cd E:\Code\TestVault\Specs
Copy-Item constitution.md constitution.md.backup-20260522-sprint-2.22
Copy-Item spec.md spec.md.backup-20260522-sprint-2.22
Copy-Item plan.md plan.md.backup-20260522-sprint-2.22
Copy-Item tasks.md tasks.md.backup-20260522-sprint-2.22
```

## Étape 2 : Appliquer les patches dans l'ordre

1. **PATCH A.1** → `constitution.md` (ajout §6.0)
2. **PATCH A.2** → `spec.md` (remplacer US-6.2)
3. **PATCH A.3** → `spec.md` (remplacer US-6.3)
4. **PATCH A.4** → `spec.md` (remplacer US-6.4)
5. **PATCH A.5** → `plan.md` (remplacer §7 + §8)
6. **PATCH A.6** → `tasks.md` (remplacer Phase 6)
7. **PATCH A.7** → `tasks.md` (ajouter Sprint 2.21 part 2)
8. **PATCH B.1** → `spec.md` (remplacer US-5.1)
9. **PATCH B.2** → `spec.md` (remplacer F1)
10. **PATCH D.1** → `spec.md` (ajouter US-5.1.1 après US-5.1)
11. **PARTIE E** → `tasks.md` (ajouter Sprint 2.22 + T-2.21-postmortem)

## Étape 3 : Vérification cohérence cross-fichiers

- [ ] Aucune mention de "via Azure Functions ATConseil" dans `spec.md` 
      (sauf dans US-6.3/6.4 DEFERRED / le commentaire de référence)
- [ ] Aucune mention de "via Azure Functions ATConseil" dans `plan.md` §7-8 
      sauf comme "design conservé pour référence future"
- [ ] US-5.1 dit explicitement "depuis le Coverage Panel"
- [ ] US-5.1.1 dit explicitement "ne crée aucun WIT"
- [ ] `tasks.md` Sprint 2.22 référence US-1.1, US-5.1, US-5.1.1, F1 
      (sections numérotées valides)

## Étape 4 : Commit

```powershell
git add Specs/
git commit -m "docs(specs): Sprint 2.22 patch consolide (no-backend alignment + AI buttons split + Area Path bugfix)

Sprint 2.22 trois livrables couples :

CHANGE 0 — Alignement no-backend (decision 2026-05-22) :
- constitution.md §6.0 : architecture client-side only
- spec.md US-6.2 : enrichi (Foundry + max_tokens)
- spec.md US-6.3 : DEFERRED (quotas via backend hors scope)
- spec.md US-6.4 : SIMPLIFIE (audit WIT-based)
- spec.md US-5.1 : alignement architecture + emplacement Coverage Panel
- spec.md F1 : reecriture architecture client-side
- plan.md §7 : DEFERRED
- plan.md §8 : SIMPLIFIE (ADO native encryption)
- tasks.md Phase 6 : DEFERRED
- tasks.md Sprint 2.21 part 2 : ajout (max_tokens)

CHANGE 1 — Bugfix Area Path/Iteration Path manquants :
- tasks.md T-2.22.1 : ajout des champs au TestCaseFormView (vs US-1.1)

CHANGE 2 — Nouvelle US-5.1.1 + repositioning bouton AI :
- spec.md US-5.1.1 : nouvelle US AI Suggest Steps
- tasks.md T-2.22.2/3/4/5/6 : implementation sprint 2.22

Post-mortem Sprint 2.21 part 1 :
- tasks.md T-2.21-postmortem : 2 tests E2E regression obligatoires
  (bug-051 Area Path, bug-052 bouton AI mal place)

Refs:
- Real-world test E2E Sprint 2.21.1 Foundry vendredi 2026-05-22
- Decision strategique no-backend (D du 2026-05-22)
- Bug E2E Sprint 2.21 part 1 sur creation TC (area_path error)
- Questions Q1-Q9 validees en session 2026-05-22 soir"
```

## Étape 5 : Push

- Vendredi soir : optionnel (à toi de voir). Le push n'est pas urgent.
- Lundi matin : push avant lancement Sprint 2.22 pour cohérence specs + code.

---

# RÉCAPITULATIF

**Patches à appliquer :** 11 patches dans 4 fichiers spec-kit.

**Fichiers modifiés :**
- `constitution.md` : +1 section (§6.0)
- `spec.md` : 6 sections modifiées/ajoutées (US-5.1, US-5.1.1 NEW, US-6.2, US-6.3, US-6.4, F1)
- `plan.md` : 2 sections modifiées (§7, §8)
- `tasks.md` : 3 sections ajoutées (Phase 6 DEFERRED, Sprint 2.21 part 2, Sprint 2.22 + T-2.21-postmortem)

**Tâches code à venir :** T-2.22.1 à T-2.22.6 + T-2.21-postmortem = 7 tâches, estimation 6-8h dev pour Sprint 2.22 + 1-2h pour postmortem.

**Tests obligatoires (TDD strict + constitution §10.4) :**
- T-2.22.1 : test-first sur `TestCaseFormView` (Area Path)
- T-2.22.2 : test-first sur `AiSuggestStepsModal`
- T-2.22.3 : test-first sur `CoveragePanel` (bouton Suggest Tests)
- T-2.21-postmortem : 2 tests E2E régression (bug-051, bug-052)

**Vérifications constitution §10.3 :**
- npm audit clean (T-2.22.5)
- API externes ADO + LLM providers pingées
- Modèles LLM non deprecated vérifiés (ARGOS_LLM_PROVIDERS_REFERENCE.md)

**Documentation à mettre à jour (règle Alex) :**
- `docs/user-guide.md`, `docs/operator-guide.md`, `README.md`, `CHANGELOG.md`

---

Fin du patch consolidé Sprint 2.22.
