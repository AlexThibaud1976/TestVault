# Skills Roadmap — Argos / TestVault

> Document de référence pour piloter l'installation des skills Claude.ai dédiés au projet Argos. Ce document est consulté automatiquement par le skill `argos-sprint-task-generator` au début de chaque session pour rappeler les skills à installer/utiliser.
>
> **À déposer dans** : `Specs/SKILLS_ROADMAP.md` du repo TestVault.
>
> **Dernière mise à jour** : 2026-05-25

---

## Vue d'ensemble

8 skills identifiés pour le projet Argos, déclenchés par jalon de roadmap. Approche just-in-time : installer chaque skill **au moment où il devient utile**, pas en avance.

| Skill | Statut | Déclencheur | Priorité |
|---|---|---|---|
| `argos-sprint-task-generator` | ✅ v1.2 | Maintenant (avant Sprint 2.21 part 2) | 🔴 Critique |
| `argos-coherence-audit` | ✅ v1.1 | Avant prochain Pattern A | 🔴 Critique |
| `argos-release-checklist` | ✅ v1.0 | Avant prochaine release (Sprint 2.22 publish ?) | 🔴 Critique |
| `argos-llm-veille` | ⏳ À construire | Sprint 4.x (transition Option A → B) | 🟡 Moyenne |
| `argos-decision-tracker` | ⏳ À construire | Avant Phase 7 T-7.8 (audit sécurité externe) | 🟡 Moyenne |
| `argos-cfg-test-generator` | ⏳ À construire | À la demande (pas urgent) | 🟢 Basse |
| `argos-wit-contract-verifier` | ⏳ À construire | Avant Phase 7 T-7.7 (TestPulse co-install) | 🟡 Moyenne |
| `argos-brand-guidelines` | ⏳ À construire | Quand marketing actif (Sprint 3.x commercial layer) | 🟡 Moyenne |

---

## Détail par skill

### 1. `argos-sprint-task-generator`

**Statut** : ✅ Construit (v1.0 du 2026-05-25).

**Quoi** : génère les fichiers `CLAUDE_TASK_*.md` pour Claude Code selon deux patterns — Spec Patch (modif spec-kit) et Code Implementation (TDD strict).

**Quand installer** : **maintenant**, avant le prochain sprint Argos avec Claude Code.

**Triggers automatiques** :
- "génère un CLAUDE_TASK"
- "prépare le sprint X.Y"
- "j'attaque Sprint X.Y"
- "code pour Sprint"
- "spec patch pour"
- "patch consolidé"

**Indicateurs d'usage** : à chaque sprint Argos (estimé 15-20 sprints d'ici GA → 15-20 utilisations).

**Évolution prévue** :
- v1.1 (auto) : intègre le check skills automatique selon ce ROADMAP
- v1.2 (si demande) : intégrer un Pattern C "Refactor" pour les sprints purement techniques

---

### 2. `argos-coherence-audit`

**Statut** : ✅ Construit (v1.0 du 2026-05-25).

**Quoi** : audite la cohérence inter-fichiers du spec-kit Argos. Détecte références orphelines, contradictions sémantiques (no-backend, Cloud-only, Publisher), marqueurs de patch résiduels, désynchronisation versions, spec↔code light check.

**Quand installer** : **avant le prochain Pattern A**. Sera utilisé en complément du sprint-task-generator pour valider chaque patch spec avant commit.

**Triggers automatiques** :
- "audit cohérence"
- "vérifie le spec-kit"
- "check les références"
- "avant de pousser le patch"
- "audit pré-PR"

**Indicateurs d'usage** : à chaque Pattern A (estimé 5-8 fois d'ici GA) + 1 fois avant Phase 7 T-7.8.

**Évolution prévue** :
- v1.1 : ajouter de nouvelles règles d'audit à mesure que de nouvelles décisions stratégiques sont actées
- v1.2 : appeler ce skill comme dépendance dans `argos-release-checklist`

---

### 3. `argos-release-checklist`

**Statut** : ✅ Construit (v1.0 du 2026-05-25).

**Quoi** : orchestre une release Argos de bout en bout — pré-flight, build, publish Marketplace, publish npm, tag, monitoring 24h. Couvre les 5 types de release (patch / minor / npm isolé / coordonnée / hotfix).

**Quand installer** : **avant la prochaine publication Marketplace**. Probablement Sprint 2.22 si Alex publie 0.5.29 cette semaine.

**Triggers automatiques** :
- "prépare release v"
- "release checklist"
- "on publie"
- "publish Marketplace"
- "release dry-run"

**Indicateurs d'usage** : 1-2 fois par mois minimum (cadence cible).

**Évolution prévue** :
- v1.1 : intégration CI/CD GitHub Actions (Phase 7)
- v1.2 : automatisation partielle des smoke tests

---

### 4. `argos-llm-veille`

**Statut** : ⏳ À construire.

**Quoi** : automatise la veille mensuelle sur les modèles LLM. Check deprecation, nouveaux modèles, pricing. Génère un rapport mensuel via `web_search` sur les pages docs Azure OpenAI / Foundry / Anthropic / OpenAI / Mistral.

**Quand construire** : **Sprint 4.x** (post-launch, transition Option A → Option B selon `ARGOS_LLM_PROVIDERS_REFERENCE.md` partie D).

**Pourquoi pas maintenant** : Option A (veille manuelle 15 min/mois) suffit. Trop tôt = sur-ingénierie.

**Estimation effort** : 3-4h de construction.

**Triggers à anticiper** :
- "veille LLM"
- "modèles deprecated"
- "rapport mensuel LLM"

**Pré-requis avant construction** :
- Avoir un format de rapport stable (à itérer en Option A pendant 2-3 mois)
- Avoir une cadence d'usage claire (mensuel)

---

### 5. `argos-decision-tracker`

**Statut** : ⏳ À construire.

**Quoi** : structure les 81+ décisions actées (D58-D81+ et au-delà) éparpillées dans les changelogs `constitution.md` vers un `Specs/decisions.md` propre au format ADR (Architecture Decision Record).

**Quand construire** : **avant Phase 7 T-7.8** (audit sécurité externe). L'auditeur va exiger cette traçabilité.

**Estimation effort** : 2h pour le skill + 4-6h pour la migration des décisions existantes.

**Triggers à anticiper** :
- "tracker la décision"
- "décision actée"
- "ADR"
- "décisions stratégiques"

**Pré-requis avant construction** :
- Inventaire des décisions existantes (peut être fait en parallèle)

---

### 6. `argos-cfg-test-generator`

**Statut** : ⏳ À construire.

**Quoi** : génère le squelette d'un test régression `CFG-YYYY-MM-DD-{slug}.test.ts` à partir d'une description de bug. Pattern déjà stable, skill = automatisation.

**Quand construire** : **à la demande**. Pas urgent — le pattern est simple à reproduire à la main.

**Estimation effort** : 1h.

**Indicateurs déclencheurs** :
- Si on fait > 3 tests CFG dans le même sprint → c'est qu'il est temps de construire le skill
- Si Alex demande explicitement

---

### 7. `argos-wit-contract-verifier`

**Statut** : ⏳ À construire.

**Quoi** : vérifie que le contrat WIT TestVault ↔ TestPulse reste compatible. Valide que `testvault-wit-schema/` n'a pas de breaking change vs la version contractée dans `docs/wit-schema.md`.

**Quand construire** : **avant Phase 7 T-7.7** (TestPulse co-installation testée). C'est l'USP intégration TestPulse — un changement involontaire = breaking change pour TestPulse.

**Estimation effort** : 2-3h.

**Triggers à anticiper** :
- "vérifier contrat WIT"
- "compat TestPulse"
- "schema WIT évolution"

**Pré-requis** :
- `docs/wit-schema.md` doit avoir une version stable et versionnée
- Tests TestPulse doivent exister

---

### 8. `argos-brand-guidelines`

**Statut** : ⏳ À construire.

**Quoi** : encode les couleurs, polices, ton de voix Argos pour assurer la cohérence des supports marketing (landing page argos.io, page Marketplace pro, décks commerciaux, blog posts).

**Quand construire** : **quand le marketing devient actif**, Sprint 3.x commercial layer (mois 5-6 post-aujourd'hui selon ARGOS_STRATEGIE_COMMERCIALE.md).

**Estimation effort** : 2h pour le skill + travail design en amont (que tu peux faire avec un designer ou Claude).

**Pré-requis** :
- Décider du brand kit (couleurs primaires, secondaires, polices, logos)
- Décider du ton de voix (B2B sérieux ? B2B accessible ?)

---

## Routine de rappel (manuelle, déclenchée par Alex)

Cette section décrit la routine que le skill `argos-sprint-task-generator` exécute automatiquement à chaque session.

### Au début de chaque session (Claude.ai)

Quand le skill `argos-sprint-task-generator` est activé, il :
1. Lit ce fichier `Specs/SKILLS_ROADMAP.md`
2. Identifie les skills non encore installés avec statut "à installer maintenant"
3. **Rappelle à Alexandre** dans la première réponse de la session : *"💡 Skill `X` toujours pas installé alors qu'il aurait été utile depuis {date}. Veux-tu l'installer maintenant ?"*

### Au moment d'un jalon de roadmap

Quand un sprint contient une référence à un jalon d'installation (ex: Sprint 3.x → llm-veille), le skill rappelle :
*"⏰ Tu attaques Sprint X.Y qui devait déclencher la construction du skill `Y` selon SKILLS_ROADMAP. Tu veux que je le construise maintenant ?"*

### À chaque release Marketplace

Si `argos-release-checklist` est utilisé, il vérifie au début que `argos-coherence-audit` est installé (dépendance forte). Sinon il interrompt et demande installation préalable.

---

## Mise à jour de ce ROADMAP

### Quand mettre à jour
- À chaque construction d'un nouveau skill : marquer ✅ Construit + date
- À chaque installation : noter dans l'historique en bas
- À chaque évolution majeure d'un skill : bump v1.0 → v1.1 + note évolution
- À chaque nouveau besoin identifié : ajouter à la liste (vérifier d'abord qu'aucun existant ne couvre)

### Qui peut mettre à jour
- Alexandre Thibaud : libre (c'est son projet)
- Claude (chat) : sur demande explicite d'Alexandre, jamais de manière autonome

---

## Historique des installations

| Date | Skill | Action | Version | Commentaire |
|---|---|---|---|---|
| 2026-05-25 | argos-sprint-task-generator | Construit | v1.0 | Initial — Pattern A + Pattern B |
| 2026-05-25 | argos-coherence-audit | Construit | v1.0 | Initial — 6 catégories d'audit |
| 2026-05-25 | argos-release-checklist | Construit | v1.0 | Initial — 5 types de release |
| 2026-05-25 | argos-sprint-task-generator | Patch | v1.1 | Ajout étape 0 — check SKILLS_ROADMAP automatique |
| 2026-05-25 | argos-sprint-task-generator | Patch | v1.2 | Ajout section cleanup post-merge obligatoire dans tout CLAUDE_TASK (PowerShell pour déplacer `CLAUDE_TASK_*.md` vers `claude_prompts/`) |
| 2026-05-25 | argos-coherence-audit | Patch | v1.1 | Ajout catégorie 3-bis — détection des `CLAUDE_TASK_*.md` mal placés (cohérent avec sprint-task-generator v1.2) |
| ... | ... | ... | ... | À compléter au fil de l'eau |

---

## Anti-patterns

❌ Construire un skill "en avance" sans usage clair → sur-ingénierie, risque de réécrire au moment d'usage.

❌ Cumuler 5+ skills sans les installer → bruit, perd la valeur du progressive disclosure.

❌ Modifier un skill sans bumper sa version → désynchronisation entre la version sur disque et ce ROADMAP.

❌ Construire un skill très spécifique à un sprint unique → mieux vaut un CLAUDE_TASK ad-hoc qu'un skill jetable.

❌ Oublier de désinstaller un skill obsolète → pollution du contexte au fil du temps.
