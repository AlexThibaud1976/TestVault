# Phase 0 -- Gaps Spec-Kit vs Realite

> Document analytique : analyse honnete des ecarts entre `Specs/spec.md` / `Specs/tasks.md` Phase 0
> et la realite du code au 2026-05-12.
> Genere dans le cadre de TECH-DEBT-015C.
> Base sur `Specs/MONOREPO.md` (015A) et `Specs/MIGRATION-PLAN.md` (015B).
> **Aucune modification du code ou des specs** -- ce document est purement analytique.
> Les decisions correctives sont referencees vers TECH-DEBT-016/017/018/019.

---

## Resume executif

Le repo `apps/argos-functions` contient un backend Azure Functions complet (8 modules, ~25 fichiers TS)
dont **tous les modules sont mentionnes dans le spec-kit** -- mais en Phase 4, 6, ou 7, alors que le
projet est actuellement en Phase 0 (taches T-0.1 a T-0.9 completees) / debut Phase 1.

Le gap n'est donc pas une implementation hors-spec totale, mais une **implementation en avance sur le plan** :
le code existe plusieurs phases avant les tasks qui le preconisent. Cette situation cree une asymetrie entre
le code present dans le repo et la realite du deploiement : l'extension Argos publiee (v0.4.7) utilise
exclusivement l'API Azure DevOps directement, sans appeler aucun endpoint du backend.

Ce document analyse les gaps, caracterise chaque module, et inscrit des TECH-DEBT pour les decisions futures.

**Verification effectuee** : lecture de `Specs/spec.md` et `Specs/tasks.md` le 2026-05-12.

---

## 1. Inventaire des gaps

### 1.1 Modules argos-functions vs spec-kit

| Module | Contenu | Ref spec.md | Ref tasks.md | Phase planifiee | Deploye |
|---|---|---|---|---|---|
| `webhooks/` | webhook-handler, token-service, queue-processor | US-4.3 "Recevoir des resultats CI en push via webhook" | T-4.8 "Endpoint POST /v1/webhooks/{token}" | **Phase 4** | Non |
| `bdd-sync/` | git-push-handler | Implicit dans "Synchronisation BDD" | T-4.x (git.push webhook, Phase 4) | **Phase 4** | Non |
| `health/` | health-handler | Non mentionne explicitement | Non mentionne | Standard infrastructure | Non |
| `jobs/` | flakiness-detector, timer-jobs | spec.md §flakiness AI detection (BYOK) | T-6.9 "Detection de flakiness" | **Phase 6** | Non |
| `llm-proxy/` | generate-test-cases | spec.md §AI generation TC, §F5 LLM proxy Azure Functions | T-6.5 "Endpoint POST /v1/llm/generate-test-cases" | **Phase 6** | Non |
| `license/` | license-engine | spec.md : `licenseKey` (AppConfig), `license.update` (AuditOperation) | Pas de task Phase 0-6 ; implique Phase 7 | **Phase 7 implicite** | Non |
| `stripe/` | stripe-webhook-handler | tasks.md T-7.2 "Portail Stripe + portail client" | T-7.2 "Webhooks Stripe pour activer/desactiver les licences" | **Phase 7** | Non (spike) |
| `shared/` | audit-log, crypto, quota, llm-client, version | constitution AES-256-GCM, spec.md quotas, audit-log WIT | Infrastructure transverse aux phases 4-7 | N/A | Non |

**Synthese** :
- Tous les modules (sauf `health/`) sont references dans le spec-kit, mais en Phase 4 a 7.
- Le projet est en Phase 0 complete / Phase 1 debut (T-1.x en cours).
- Le backend anticipe donc de **3 a 7 phases** le plan documente.
- `health/` est de l'infrastructure standard (endpoint de liveness/readiness), sans equivalence spec.

### 1.2 Discrepance avec le deploiement reel

L'extension Argos publiee sur Marketplace (v0.4.7) **n'appelle aucun endpoint** du backend `argos-functions`.
L'extension utilise exclusivement l'API Azure DevOps directement via `azure-devops-extension-api` v4.x.

Consequence : du point de vue d'un utilisateur Argos en production au 2026-05-12 :
- Les 8 modules d'`argos-functions` sont invisibles et inactifs.
- Le LLM proxy n'est pas accessible.
- Les webhooks CI ne peuvent pas etre configures.
- La detection de flakiness n'est pas disponible.
- Stripe n'est pas en production.

**Cette situation ne constitue pas un probleme de stabilite** -- l'extension fonctionne comme prevu
pour ses fonctionnalites actuelles (Phase 0 + Phase 1 en cours). C'est une dette de documentation.

### 1.3 Pourquoi cette situation

Le backend `argos-functions` a ete developpe en anticipation des phases futures du produit :
- Phase 4 : integration CI via webhooks (feature plannifiee)
- Phase 6 : integration LLM BYOK (feature plannifiee, deja mentionnee dans le spec)
- Phase 7 : monetisation via Stripe (feature plannifiee)

Ce travail d'anticipation a de la valeur : le code est present, les interfaces sont definies, la
structure des modules est pensee. La consequence negative est que le gap entre le code et le
deploiement rend le repo visuellement plus avance qu'il n'est fonctionnellement.

### 1.4 Modules Phase 0 effectivement en production

Pour clarifier le perimetre de ce qui fonctionne reellement :

| Composant | Deploye | Version |
|---|---|---|
| `apps/argos-extension` (VSIX) | Oui (Marketplace AlexThibaud) | 0.4.7 |
| Hub group Argos (6 hubs) | Oui (via VSIX) | 0.4.7 |
| Coverage panel (work item form) | Oui (via VSIX) | 0.4.7 |
| `apps/argos-functions` (backend) | Non | 0.3.2 (local seulement) |
| Publication npm (`argos-sdk`, `argos-types`, etc.) | Non | 0.3.2 |

---

## 2. TECH-DEBT inscrits

### 2.1 TECH-DEBT-017 : Plan de deploiement argos-functions

**Description** : Decision a prendre sur le sort d'`apps/argos-functions`. Trois options :

- **a) Deployer en l'etat** : configuration Azure (Premium plan, francecentral), CI deploy workflow,
  variables d'environnement (Key Vault, MARKETPLACE_PAT, etc.), tests d'integration contre Azure live,
  monitoring Application Insights. Effort estime : 1-2 semaines.

- **b) Garder en developpement interne** : exclure du perimetre Marketplace actuel, continuer a
  developper les modules en local jusqu'a ce qu'une Phase 4 ou 6 soit commencee officiellement.

- **c) Supprimer** : si la roadmap ne prevoit pas de backend dans le court/moyen terme, le supprimer
  pour clarifier le repo. Les modules pourraient etre re-crees a partir des specs Phase 4/6 quand le
  moment vient.

**Priorite** : Moyenne (ne bloque pas les phases 1-3)
**Dependances** : TECH-DEBT-016 (pricing strategy) et TECH-DEBT-018 (Stripe decision)
**Sprint dedie** : ~2-4h de cadrage + decision

### 2.2 TECH-DEBT-018 : Decision Stripe (garder / supprimer / refondre)

**Description** : Le module `apps/argos-functions/src/stripe/` contient un `stripe-webhook-handler`.
Confirmation utilisateur (2026-05-12) : "prototype, pas pris au serieux". Options :

- **a) Garder le spike** : conserver comme reference pour la future Phase 7 de monetisation.
  Avantage : le travail d'exploration n'est pas perdu. Inconvenient : un futur collaborateur
  peut croire que Stripe est actif.

- **b) Supprimer** : supprimer `src/stripe/` et sa reference dans l'index. Cela peut etre
  re-implemente proprement lors du Sprint T-7.2 quand la decision pricing (TECH-DEBT-016)
  sera prise. Effort : ~10-15 min.

- **c) Refondre Phase 1** : hors scope immediatement -- a prendre apres TECH-DEBT-016.

**Priorite** : Faible (code isole, pas de surface publique)
**Dependances** : TECH-DEBT-016 (pricing strategy determine si Stripe est la solution retenue)
**Sprint dedie** : 15-30 min pour decision + execution (si b, trivial)

### 2.3 TECH-DEBT-019 : Statut apps/docs-site

**Description** : `apps/docs-site` est un placeholder vide (aucun `src/`, tous les scripts = `echo`).
Le dossier `docs/` a la racine est distinct et non inspecte dans ce sprint. Options :

- **a) Supprimer `apps/docs-site`** : le dossier occupe un slot dans `apps/*` mais ne produit
  rien. Avantage : repo plus clair. Inconvenient : a re-creer si un site doc devient priorite.

- **b) Implementer un vrai site de documentation** : Docusaurus, Astro, ou autre. A faire quand
  la documentation utilisateur devient prioritaire (probable avant Phase 7 / publication commerciale).

- **c) Garder en placeholder** : maintenir le slot pour ne pas casser le pattern `apps/*`.

**Priorite** : Tres faible (zero impact sur l'extension ou les utilisateurs)
**Sprint dedie** : 5-10 min pour suppression (option a) OU 2-4h pour implementation (option b)

### 2.4 TECH-DEBT-016 : Strategie pricing Argos (deja inscrit)

Rappel : la decision sur le modele de pricing Argos (freemium ? 18 EUR/mois ? tiered ?)
est en attente depuis la session du 2026-05-12. Cette decision conditionne TECH-DEBT-017
(deploiement backend) et TECH-DEBT-018 (Stripe).

Non instruite dans 015C.

---

## 3. Impact sur la roadmap

### 3.1 Court terme (Phase 1 en cours)

Le gap n'est **pas un blocker** pour la Phase 1 (Custom WIT CRUD) ni pour la stabilite actuelle
de l'extension Argos. L'extension fonctionne en mode frontend pur, sans dependance backend.

Recommandation : continuer les phases 1-3 sans toucher `argos-functions`, sauf si TECH-DEBT-018
est tranche (suppression Stripe possible en 15 min et non-bloquante).

### 3.2 Moyen terme (avant Phase 4)

Avant de :
- **Ajouter du nouveau code dans `argos-functions`** : verifier que le module existe dans le
  spec-kit de la phase en cours. Ne pas creer de code hors-spec supplementaire sans inscription
  au spec-kit et approbation.
- **Communiquer publiquement sur les fonctionnalites Argos** : s'assurer que les features
  mentionnees dans les communications correspondent a ce qui est reellement deploye.
- **Commencer Phase 4** (webhooks CI) : traiter d'abord TECH-DEBT-017 pour decider si les
  modules existants sont deployes en l'etat ou refondus.

### 3.3 Long terme (avant commercialisation Phase 7)

Quand les TECH-DEBT-016/017/018 seront tranches :
- Mettre a jour `Specs/spec.md` : inscrire une **Phase 1-bis** ou **Phase 2** couvrant
  le deploiement Azure Functions et ses pre-requis (infrastructure, securite, monitoring).
- Lier les tasks `Specs/tasks.md` (T-6.1 et suivantes) aux modules `argos-functions`
  effectivement deployes.
- Aligner les tests E2E sur les endpoints actifs.

---

## 4. Action immediate

**Aucune modification de code ou de spec dans ce sprint.**

Ce document est une reconnaissance honnete de la situation. Les decisions correctives sont
reservees aux TECH-DEBT-016, 017, 018, 019 detailles ci-dessus.

L'etape suivante recommandee : merger ce document (PR 015C), puis prendre les TECH-DEBT dans
l'ordre de leur impact sur la roadmap commerciale (016 en premier, car il conditionne 017 et 018).

---

## 5. Note pour les contributeurs

Si tu decouvres `apps/argos-functions` et te demandes pourquoi ce backend existe :

1. **Le backend est du code anticipe.** Il a ete developpe en avance sur les phases 4-7 du plan.
   Ce n'est pas une erreur -- c'est de la R&D preparatoire.

2. **L'extension Argos publiee (Marketplace v0.4.7+) n'utilise pas ce backend.**
   Elle appelle directement l'API Azure DevOps via `azure-devops-extension-api`.

3. **Avant d'ajouter du code dans `argos-functions`** : verifier dans `Specs/tasks.md` que le
   module est dans la phase en cours. Si non, inscrire d'abord une task dans le spec-kit.

4. **Avant de deployer `argos-functions` sur Azure** : lire TECH-DEBT-017. Il y a un plan de
   cadrage a faire avant d'ouvrir des ressources Azure.

5. **Le module Stripe** (`src/stripe/`) est un prototype (confirmation 2026-05-12). Ne pas
   l'integrer dans un flux de paiement en production sans traiter TECH-DEBT-018 au prealable.

---

## References

- `Specs/MONOREPO.md` (TECH-DEBT-015A) -- source de l'inventaire des modules argos-functions
- `Specs/MIGRATION-PLAN.md` (TECH-DEBT-015B) -- plan de renaming ; TECH-DEBT-017/018/019 y sont references
- `Specs/spec.md` -- spec fonctionnel : US-4.3 (webhooks), §AI, §flakiness, §LLM (Phases 4, 6, 7)
- `Specs/tasks.md` -- tasks : T-4.8, T-6.1, T-6.5, T-6.9, T-7.2 (Phases 4, 6, 7)
- `Specs/constitution.md` -- AES-256-GCM, BYOK, HKDF-SHA256 (architecture securite backend)
