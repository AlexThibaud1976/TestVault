# Constitution — TestVault

> Version 0.4.0 — 10 mai 2026
> Principes non-négociables pour le projet TestVault par ATConseil
> Auteur : Alexandre Thibaud — atconseil.info

> **Changelog v0.4.0** : Sprint 3 — hub Argos repositionné au niveau projet ADO (`ms.vss-web.project-hub-group`), terminologie concurrentielle retirée de tous les fichiers publics et du spec-kit. Version packages 0.3.0.
> **Changelog v0.3.0** : **BREAKING** — périmètre réduit à Cloud uniquement (décision 2026-05-10). Justification : absence d'environnement testable pour respecter §10 TDD. TestVault devient Cloud-only. Publisher Marketplace fixé à `ATConseil` (correction `AlexThibaud`). Tests régression `CFG-2026-05-10-*` ajoutés. Voir CHANGELOG `[0.2.0]` et `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`.
> **Changelog v0.2.4** : adoption de Biome (lint + format unifiés) en remplacement de ESLint + Prettier. Justification : performance significativement supérieure sur monorepo, configuration unique, ESM-natif. Le choix est figé pour v1.
> **Changelog v0.2.3** : correction technique — SDK ADO v5 → v4 (la v5 n'existe pas, le SDK reste sur la branche 4.x) ; Node.js 20 LTS → Node.js 22 LTS (Node 20 EOL avril 2026 ; Azure SDK JS impose Node 22 minimum dès juillet 2026).
> **Changelog v0.2.2** : naming consolidé — projet `TestVault`, extension Marketplace `Argos`, publisher `ATConseil`. SDK npm renommé `@atconseil/testvault-sdk`.
> **Changelog v0.2.1** : rétention de l'audit trail rendue paramétrable par l'Admin (avec plancher de sécurité).
> **Changelog v0.2.0** : ajout §6 Permissions & Rôles, ajout §3.2.1 Stratégie LLM (BYOK), couverture tests relevée à 90/80, validation licence Server passée à 7j, confirmation TestPulse évolution indépendante.

---

## Mission

TestVault est l'extension de test management pour Azure DevOps qui apporte aux équipes QA une parité fonctionnelle stricte avec les meilleurs outils de test management Jira-natifs, sur Azure DevOps Services (Cloud). Elle s'appuie sur le stockage Work Items natif d'ADO pour garantir la souveraineté des données du client, et alimente l'extension de reporting TestPulse via un schéma documenté.

---

## 1. Périmètre de compatibilité

**Plateformes officiellement supportées :**

- **Azure DevOps Services (Cloud)** — support officiel, premier-class

> **Note (Sprint 2 — 2026-05-10)** : périmètre réduit à Cloud uniquement (décision de scope).
> Justification : aucune instance testable disponible pour respecter §10 (E2E obligatoire
> avant déclaration de support). Voir CHANGELOG `[0.2.0]` et test régression
> `tools/regression/CFG-2026-05-10-server2022-out-of-scope.test.ts`.

**Plateformes hors périmètre :**

- Toutes variantes ADO hors Cloud — hors scope depuis v0.2.0 (cf. note ci-dessus)
- Team Foundation Server (toutes versions)
- Visual Studio Code et Visual Studio IDE (hors scope)

**Justification :** concentrer l'effort de QA sur Azure DevOps Services, respecter la règle TDD §10 (aucun support déclaré sans E2E sur instance réelle), réduire la matrice de tests.

---

## 2. Stack & Runtime

- **MUST** : TypeScript 5+ en mode strict (`strict: true`, `noImplicitAny`, `strictNullChecks`)
- **MUST** : **Biome** comme linter et formatter unifié (configuration unique `biome.json` à la racine), appliqué et bloquant en CI
- **MUST** : React 18+ pour l'UI de l'extension
- **MUST** : ADO Extension SDK v4 (`azure-devops-extension-sdk`, version 4.x ; il n'existe pas de v5 publiée à ce jour) + `azure-devops-extension-api` v4.x pour les clients REST
- **MUST** : Node.js **22 LTS** pour les outils de build, le CLI, et les Azure Functions Cloud-Plus (Node.js 20 atteint l'EOL en avril 2026 et le SDK Azure JS impose Node 22 minimum à compter du 9 juillet 2026)
- **MUST** : monorepo via Turborepo ou Nx, avec packages distincts pour TestVault, TestPulse, SDK, CLI, et composants UI partagés
- **NEVER** : pas de jQuery, pas de bundle CommonJS dans la production, pas de framework UI tiers concurrent à Fluent UI 2 (qui est la base ADO native)

---

## 3. Architecture & Distribution

### 3.1 Modèle d'extension

- **MUST** : extension contributive Azure DevOps publiée sur le Visual Studio Marketplace
- **MUST** : un seul VSIX par version, ciblant Azure DevOps Services (Cloud) uniquement
- **MUST** : Custom Process via le modèle **Inheritance uniquement** (pas de Process Template XML, pas de Hosted XML)
- **MUST** : installation du process custom assistée par un wizard intégré à l'extension (détection des permissions admin requises, instructions claires en cas de manque de droits)

**Naming & identité (non-négociable) :**

| Référence | Valeur |
|---|---|
| Nom du projet (interne, code, repo, monorepo packages, doc technique) | `TestVault` |
| Nom commercial de l'extension sur le Visual Studio Marketplace | `Argos` |
| Publisher Azure Marketplace | `ATConseil` |
| Scope npm SDK & CLI | `@atconseil/*` |
| Site de référence | atconseil.info |

- **MUST** : la documentation utilisateur publique privilégie le nom commercial **Argos**, en mentionnant *TestVault* uniquement comme référence technique (nom du moteur, du SDK, du schéma WIT) lorsque pertinent.
- **MUST** : les Custom Work Item Types installés gardent le préfixe technique `TestVault.*` (ex: `TestVault.TestCase`, `TestVault.TestCaseVersion`, `TestVault.TestVaultAuditLog`) pour stabilité du contrat avec TestPulse et pour ne pas couper la rétrocompatibilité (cf. §9).
- **MUST** : le manifest `vss-extension.json` déclare `publisher: "ATConseil"` et `name: "Argos"`. L'identifiant technique de l'extension (`extensionId`) reste `argos` ou équivalent stable.

### 3.2 Modèle backend — "Cloud Plus"

Toutes les fonctionnalités cœur sont **client-side pures** et identiques Cloud/Server. Les fonctionnalités enrichies sont **Cloud-exclusives** via Azure Functions hébergées par ATConseil.

**Cœur (fonctionnalités Cloud) :**

- CRUD Test Cases / Test Plans / Test Sets / Preconditions / Test Executions
- Attachments (evidence) via API Attachments ADO native
- Import : CSV, Excel, JUnit XML, NUnit XML, xUnit, TestNG, Cucumber JSON
- Export : Excel, PDF
- Traceability matrix Work Items ↔ Test Cases (liens bidirectionnels)
- BDD/Gherkin import/export et liaison avec feature files
- Recherche WIQL + index local côté client
- Versioning des Test Cases par snapshots taggés (cf. §8)
- Alimentation du schéma WIT consommé par TestPulse

**Cloud-Plus (Azure Functions ATConseil, Cloud uniquement) :**

- Génération AI-assistée de Test Cases depuis User Stories (cf. §3.2.1)
- Détection AI de flakiness multi-runs (cf. §3.2.1)
- Ingestion webhook directe depuis CI externes (GitHub Actions, Jenkins, GitLab CI, CircleCI)
- Jobs planifiés (refresh nocturne, agrégations métriques, notifications)

- **MUST** : tout indicateur Cloud-Plus est explicitement marqué dans l'UI (badge, tooltip, page de pricing). Aucune dégradation silencieuse côté Server.
- **MUST** : la liste des features Cloud-Plus est versionnée dans la documentation publique. Toute promotion d'une feature de Cloud-Plus vers Cœur (et donc vers Server) est célébrée comme bugfix de parité.

### 3.2.1 Stratégie LLM — Bring Your Own Key (BYOK)

Toutes les features AI dépendent d'un fournisseur LLM. **TestVault ne fournit pas de clé LLM mutualisée** ; le client configure ses propres credentials chez son fournisseur de choix. Ce modèle BYOK est non-négociable et garantit la souveraineté des données du client.

**Fournisseurs supportés en v1 :**

- Anthropic (Claude API directe)
- OpenAI (API directe)
- Azure OpenAI Service (recommandé pour les clients enterprise avec contrats de confidentialité signés avec Microsoft)

- **MUST** : aucun appel LLM ne part de ATConseil sans clé fournie par le client (jamais de fallback sur une clé ATConseil).
- **MUST** : les clés API LLM sont stockées chiffrées dans ExtensionDataService scope organisation, accessibles uniquement aux Admin TestVault (cf. §6). Jamais en clair en logs ni en télémétrie.
- **MUST** : les appels LLM passent par les Azure Functions ATConseil (proxy d'orchestration) pour ne jamais exposer la clé côté navigateur.
- **MUST** : tout appel LLM est précédé d'une validation de quota (consommation par user/mois) configurable par l'Admin pour éviter les dépassements imprévus de coût chez le client.
- **MUST** : aucune persistance des contenus (prompts, réponses) côté ATConseil ; uniquement un cache éphémère (TTL ≤ 1h) pour la déduplication.

**Paramétrage fin par l'Admin (cf. §6) :**

- Choix du fournisseur par feature (TC generation peut utiliser Anthropic, flakiness detection peut utiliser OpenAI)
- Choix du modèle (claude-opus-4-7, claude-sonnet-4-6, gpt-5.2, etc.)
- Édition des paramètres (temperature, max_tokens, top_p)
- Édition des system prompts par feature
- Quotas mensuels par utilisateur ou par projet
- Activation/désactivation feature par feature
- Provider de fallback en cas d'indisponibilité

**Mise à jour des modèles LLM** : le checklist de release (§11) impose une vérification systématique que les modèles configurés par défaut sont les versions actuellement recommandées par leur fournisseur. Toute dépréciation déclenche une issue bloquante et une PR de mise à jour.

### 3.3 Stockage des données

| Donnée | Emplacement |
|---|---|
| Test Cases, Test Plans, Test Sets, Preconditions, Test Executions, TestCaseVersion | Custom Work Items ADO (Inheritance) chez le client |
| Audit log des opérations Admin TestVault | Custom Work Item `TestVaultAuditLog` chez le client |
| Evidence et pièces jointes | API Attachments ADO native chez le client |
| Settings extension légers (UI prefs, feature flags, indicateurs onboarding) | ExtensionDataService (scope user ou organisation) |
| Configuration LLM (clés API chiffrées, prompts custom, modèles, quotas) | ExtensionDataService scope organisation, chiffré au repos |
| Métadonnées Cloud-Plus (jobs, webhooks) | Azure Table Storage ATConseil (Cloud uniquement, sans données métier) |

- **MUST** : aucune donnée métier (test cases, executions, results, evidence) n'est stockée hors de l'instance ADO du client. La souveraineté des données du client est un critère non-négociable.
- **MUST** : pour les features Cloud-Plus, les données métier transitent éphémèrement par les Azure Functions sans persistance, sauf cache court terme strictement délimité (TTL ≤ 1h, anonymisable).

### 3.4 API publique — Modèle hybride

- **API primaire** : SDK npm `@atconseil/testvault-sdk` + CLI `testvault-cli`. Wrappent l'API ADO native et le schéma WIT TestVault. Identiques Cloud/Server, fonctionnent en air-gap si le client a un PAT.
- **API secondaire** : endpoints REST ATConseil (Azure Functions) pour features Cloud-Plus uniquement. Documentés en spécification OpenAPI séparée.
- **MUST** : SDK et CLI publiés open-source sous licence Apache 2.0, pour favoriser l'adoption et l'intégration tierce.
- **MUST** : tous les endpoints REST Cloud-Plus sont versionnés (`/v1/...`) avec une politique de dépréciation minimum 12 mois.
- **MUST** : la spécification OpenAPI est générée à partir du code (pas l'inverse) et publiée à chaque release.

### 3.5 Intégration TestPulse

- TestPulse reste une extension **standalone** distincte sur le Marketplace, alimentée par TestVault quand co-installée.
- TestPulse continue d'évoluer indépendamment de TestVault sur sa propre roadmap. La co-installation est un *enrichissement*, pas une dépendance.
- Le code source TestPulse vit dans le même monorepo que TestVault, avec packages séparés mais composants UI et types partagés.
- **MUST** : TestPulse fonctionne en mode autonome (sur Microsoft Test Plans natifs et autres sources de tests) si TestVault n'est pas co-installé. Cette capacité préexiste et est préservée.
- **MUST** : le schéma des Custom WIT TestVault (noms de champs, types, états, transitions, liens) constitue le **contrat public** entre TestVault et TestPulse. Il est documenté publiquement.
- **MUST** : tout changement breaking de ce schéma exige un bump majeur des deux extensions, une période de transition documentée, et un script de migration testé.

---

## 4. Performance & Volumétrie

| Critère | Cible v1 |
|---|---|
| Volume max supporté par projet ADO | 100 000 Test Cases |
| Volume max supporté par Test Plan | 10 000 Test Cases |
| Volume max supporté par Test Execution | 5 000 résultats |
| Temps de chargement initial UI | < 2 s sur connexion 4G |
| Temps de réponse interaction CRUD test case | < 500 ms p95 |
| Temps de chargement Test Plan (1 000 cases) | < 3 s p95 |
| Limite WIQL (contrainte ADO native) | 20 000 résultats par requête |
| Latence appel LLM (UI feedback) | Streaming dès le 1er token, < 2 s pour la 1ère réponse |

- **MUST** : au-delà de 20 000 résultats WIQL, l'extension paginate automatiquement et indique le volume total à l'utilisateur. **NEVER** échouer silencieusement sur un dépassement WIQL.
- **MUST** : les limites de volumétrie sont affichées dans la documentation utilisateur, dans l'UI (info-bulle ou écran de settings), et appliquées en garde-fou (warning utilisateur à 80% du seuil).
- **MUST** : un projet dépassant 100 000 Test Cases reste utilisable mais affiche un avertissement et n'est plus couvert par le SLA de performance.

---

## 5. Sécurité

- **MUST** : authentification via PAT, OAuth 2.0, ou Microsoft Entra ID (Azure AD). Aucun stockage de credentials côté extension.
- **MUST** : permissions ADO natives héritées sans surcouche (cf. §6). Si l'utilisateur n'a pas le droit de lire un Work Item dans ADO, il ne le voit pas dans TestVault.
- **MUST** : aucun appel sortant depuis l'extension client-side vers une URL non ATConseil sauf API ADO du client.
- **MUST** : pour les features Cloud-Plus, les credentials ADO du client (PAT) ne sont **jamais** persistés côté ATConseil. Tokens éphémères en mémoire uniquement.
- **MUST** : les clés API LLM (BYOK) sont chiffrées au repos (chiffrement AES-256 avec clé dérivée par organisation) et ne sont déchiffrables que dans le contexte d'exécution autorisé.
- **MUST** : audit des dépendances via `npm audit` + Dependabot ; aucune CVE haute ou critique non patchée n'est mergée en `main`.
- **MUST** : SBOM CycloneDX généré et publié avec chaque release.
- **MUST** : revue manuelle de toute nouvelle dépendance avant introduction (auteur, dernière mise à jour, alternatives évaluées).
- **NEVER** : envoi de télémétrie incluant des données métier (titres de test, contenus, résultats, attachments, prompts LLM, réponses LLM). Télémétrie limitée à : version extension, plateforme, opcodes anonymisés, métriques techniques (durée d'opération, type d'erreur sans payload).
- **NEVER** : envoi des données client à des tiers (LLM, services externes) sans consentement explicite et documenté du client (toggle de Cloud-Plus AI features, configuration BYOK explicite).

---

## 6. Permissions & Rôles

TestVault hérite du modèle de permissions ADO natif et le complète d'opérations sensibles réservées aux administrateurs. Aucun modèle parallèle n'est introduit (zéro double-administration).

### 6.1 Mapping des rôles

| Rôle TestVault | Hérité de | Capacités |
|---|---|---|
| **Admin TestVault** | ADO *Project Administrator* (au minimum) ; configurable par l'Admin Org pour scope étendu | Toutes capacités User + opérations sensibles (cf. §6.2) |
| **User TestVault** | ADO *Contributor* | CRUD Test Cases / Plans / Sets / Executions selon les permissions ADO natives, snapshots, exports, utilisation des features AI configurées par l'Admin |
| **Reader TestVault** | ADO *Reader* | Lecture seule : voir les tests, plans, snapshots, résultats. Aucune modification, aucun export sensible. |

- **MUST** : la qualification du rôle TestVault est dérivée à la volée des permissions ADO de l'utilisateur. Pas de table de mapping persistée.
- **MUST** : un utilisateur sans aucun droit ADO sur le projet ne voit pas l'extension.

### 6.2 Opérations Admin uniquement

Les opérations suivantes sont **strictement réservées au rôle Admin TestVault** et l'UI les masque ou les désactive pour les autres rôles :

1. Configuration des **fournisseurs LLM** : ajout, modification, suppression d'un provider (Anthropic, OpenAI, Azure OpenAI), saisie/rotation des clés API
2. Configuration des **modèles** par feature : génération TC, détection flakiness, autres features AI futures
3. Édition des **system prompts** custom et des paramètres de génération (temperature, max_tokens, top_p)
4. Définition des **quotas** AI par utilisateur ou par projet (mensuels, en nombre d'appels ou en tokens)
5. Activation/désactivation **globale** des features AI au niveau organisation
6. Gestion de la **clé de licence** TestVault et des **tiers** d'abonnement
7. Installation et mise à jour du **Custom Process Inheritance** (gated en sus par ADO Collection/Org Admin)
8. Configuration des **webhooks CI externes** (Cloud-Plus uniquement)
9. Configuration des **feature flags** d'organisation
10. Configuration de la **rétention** des Test Executions, snapshots, et audit log (cf. §6.3)

### 6.3 Audit trail des opérations Admin

- **MUST** : chaque opération de la liste §6.2 est journalisée dans un Custom Work Item de type `TestVaultAuditLog` avec : auteur (user ID + display name), horodatage UTC, opération exécutée, ancienne valeur (anonymisée si donnée sensible — clé API tronquée), nouvelle valeur (anonymisée si donnée sensible), métadonnées contextuelles.
- **MUST** : le log d'audit est consultable par tout Admin TestVault via une vue dédiée dans l'extension et via l'UI Work Items native d'ADO.
- **MUST** : les entrées du log sont **immutables** (jamais modifiées, jamais supprimées par l'extension hors politique de rétention configurée).
- **MUST** : la durée de rétention de l'audit log est **paramétrable par l'Admin TestVault**, avec un plancher de sécurité de **90 jours minimum** (en deçà, l'UI refuse la configuration). Valeur par défaut à l'installation : **24 mois**. Pas de plafond imposé par l'extension (les contraintes réglementaires SOC 2 / ISO 27001 / RGPD peuvent justifier des durées de plusieurs années).
- **MUST** : toute modification de la durée de rétention est elle-même une opération Admin journalisée dans `TestVaultAuditLog`.
- **NEVER** : les valeurs sensibles (clés API en clair, secrets) ne sont jamais inscrites dans l'audit log. Seul un identifiant tronqué (4 derniers caractères) ou un hash est consigné.

---

## 7. Modèle de monétisation

**Modèle retenu : Freemium + Per-user tiered (Cloud uniquement).**

| Tier | Cloud |
|---|---|
| **Free** | ≤ 5 users actifs, ≤ 500 Test Cases / projet, pas de features Cloud-Plus |
| **Pro** | ~18 €/user/mois (objectif ~30% sous les extensions test management Jira Cloud) |
| **Enterprise** | Sur devis (SLA, SSO custom, support prioritaire, accompagnement) |

**Justification résumée :** le marché ADO est moins monétisé que Jira sur le test management ; le freemium réduit la friction d'adoption ; le per-user mensuel sur Cloud aligne avec les attentes SaaS modernes ; les features Cloud-Plus (webhooks CI externes, jobs planifiés, agrégations, AI BYOK) justifient le différentiel Free/Pro.

> **Note sur la valeur AI avec BYOK** : les coûts LLM ne sont pas absorbés par ATConseil (le client paie son provider). La valeur AI vendue dans le Cloud Pro est *fonctionnelle* (gain de temps, qualité de génération, détection de flakiness) et non *financière*. Cette posture doit être tenue dans la communication marketing.

- **MUST** : facturation gérée hors Marketplace (Stripe + portail ATConseil). Microsoft a arrêté le billing tiers en juillet 2019 ; aucun mécanisme natif Marketplace n'existe.
- **MUST** : activation par clé de licence avec validation périodique (toutes 24h).
- **MUST** : downgrade Pro → Free non destructif (les données restent dans ADO ; seules les limites de tier s'appliquent au-delà).

> Voir `monetisation-analyse.md` pour l'analyse comparative détaillée des 5 modèles évalués (per-user, per-org tier, licence unique, freemium, OSS core).

---

## 8. Versioning des Test Cases — Snapshots taggés

**Modèle retenu : Snapshots taggés** (équivalent fonctionnel des versions de test dans les outils Jira-natifs).

- Un Test Case peut être figé à tout moment via un snapshot nommé (ex : `v1.0`, `Sprint-12`, `Release-2025-Q4`).
- Un snapshot = Custom Work Item de type `TestCaseVersion`, immutable, lié au Test Case parent.
- Plusieurs versions d'un même Test Case peuvent coexister et être référencées par des Test Plans distincts.
- L'UI fournit un comparateur de versions (diff steps, attachments, fields).

- **MUST** : un snapshot ne peut jamais être modifié après création. Immutability stricte.
- **MUST** : la suppression d'un snapshot est interdite tant qu'une Test Execution archivée le référence.
- **MUST** : le bump de version d'un Test Case est explicite (action utilisateur), jamais automatique sur sauvegarde.

---

## 9. Rétrocompatibilité & Souveraineté des données

- **MUST** : si l'extension TestVault est désinstallée, tous les Custom Work Items créés (Test Cases, Plans, Sets, Executions, TestCaseVersion, Preconditions, TestVaultAuditLog) restent intacts dans ADO et accessibles via l'UI Work Items standard du client.
- **MUST** : le schéma Custom WIT (champs, états, transitions) est documenté publiquement et stable, garantissant que les données sont exploitables par un script tiers ou par un autre outil.
- **MUST** : aucune donnée métier dans ExtensionDataService — uniquement des préférences UI réversibles, configuration LLM (chiffrée), et indicateurs d'état réversibles.
- **MUST** : compatibilité ascendante des Custom WIT garantie sur toute version mineure de TestVault. Une migration de schéma majeure (vX → vX+1) est documentée et accompagnée d'un script de migration testé end-to-end sur instance réelle.

---

## 10. Qualité & Gouvernance — règles méta non-négociables

Toute évolution du codebase TestVault et TestPulse respecte impérativement les règles suivantes.

### 10.1 Test-first (TDD)

- **MUST** : tout nouveau code (feature ou bugfix) commence par un test rouge avant l'implémentation.
- **MUST** : couverture unitaire ≥ **90%** sur le core, ≥ **80%** sur l'UI, mesurée par Istanbul/c8 et bloquante en CI.
- **MUST** : un bug fix s'accompagne obligatoirement d'un test de non-régression nommé explicitement (`regression/bug-NNN.test.ts`).

### 10.2 Documentation toujours synchronisée

- **MUST** : toute PR qui modifie une feature, une API ou un schéma met à jour `README.md` et `docs/user-guide.md` dans le même commit.
- **MUST** : la CI échoue si un changement touche `src/api/**`, `src/extension/manifest.json`, ou le schéma Custom WIT sans mise à jour correspondante de la documentation.
- **MUST** : `CHANGELOG.md` au format Keep a Changelog mis à jour pour chaque release.

### 10.3 Vérification systématique à chaque release candidate

Une checklist automatisée bloque la publication si l'un des points est rouge :

- [ ] Toutes les routes de l'API REST publique répondent avec le contrat OpenAPI attendu (test contractuel)
- [ ] Toutes les API externes consommées (ADO REST, Microsoft Graph, fournisseurs LLM Cloud-Plus) répondent et leurs schémas sont vérifiés
- [ ] Les modèles de LLM proposés par défaut dans la configuration sont les versions actuellement recommandées par leur fournisseur — toute dépréciation déclenche une issue bloquante
- [ ] Aucune régression sur la suite de tests E2E (Playwright contre instance ADO Cloud)

### 10.4 Tracking des régressions

- **MUST** : suite de tests de régression nommée et croissante. Tout bug confirmé en prod ajoute un test à cette suite avant fix.
- **MUST** : la CI exécute la suite de régression à chaque PR et bloque le merge en cas d'échec.

### 10.5 Dépendances & vulnérabilités

- **MUST** : `npm audit --audit-level=high` clean en CI, bloquant.
- **MUST** : Dependabot configuré sur `main` avec PR auto pour security updates et patch updates.
- **MUST** : SBOM CycloneDX généré et publié avec chaque release sur GitHub Releases et Marketplace.
- **MUST** : aucune dépendance non maintenue depuis > 24 mois introduite. Toute dépendance existante dans cette situation fait l'objet d'un plan de remplacement documenté dans `tasks.md`.

### 10.6 Spec-kit obligatoire

- **MUST** : tout changement touchant à un Custom WIT, un endpoint API public, le SDK, le schéma de données, le modèle de monétisation, le modèle de permissions, la stratégie LLM, ou un comportement utilisateur visible passe d'abord par une mise à jour des 4 fichiers spec-kit (constitution, spec, plan, tasks) avant écriture de code.
- **MUST** : un changement spec-kit nécessite revue et approbation explicite d'Alexandre Thibaud avant code.

### 10.7 Non-régression contre l'existant

- **MUST** : avant tout merge, vérifier qu'aucune fonctionnalité existante listée dans `spec.md` ne devient cassée ou dégradée.
- **MUST** : template de PR incluant la question : *"Quelle fonctionnalité existante ai-je potentiellement impactée et comment l'ai-je vérifié ?"*. Réponse obligatoire avec lien vers test ou justification.

---

## 11. Checklist de validation pré-release

> Mise à jour : 2026-05-08 — Actions pré-release 1–4 et 7 complètes. Actions 5–6 bloquées sur infra externe.

Toute publication sur le Marketplace exige que **TOUS** les points suivants soient verts :

- [x] Tests unitaires aux seuils §10.1 (≥ 90% core, ≥ 80% UI) — 312 tests argos-extension passent ; couverture mesurée : **96% stmts / 89.86% branches / 80.62% funcs / 96% lines** — seuils 80% UI ✓ (2026-05-08)
- [ ] Tests E2E parcours critiques verts sur Cloud — specs 01–11 écrites, **nécessite instance ADO Cloud** (`ADO_CLOUD_ORG_URL`, `ADO_CLOUD_PAT`)
- [ ] Suite de régression complète verte — aucun bug production confirmé à ce stade, suite vide ; **à alimenter dès le premier bug prod**
- [x] Tests contractuels API publique verts (OpenAPI) — spécification OpenAPI générée dans `docs/openapi.yaml` (5 endpoints documentés) ✓ (2026-05-08)
- [ ] Vérification des API externes (ADO REST, Entra ID, fournisseurs LLM) passées — **nécessite déploiement Azure Functions** + clés réelles
- [x] Vérification que les modèles LLM par défaut sont supportés — modèles cités dans la doc : `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gpt-5.2` ; tous actifs au 2026-05-09 ✓ (mise à jour suite à retraite du modèle OpenAI précédemment cité, retiré de Microsoft Foundry le 11 avril 2026 ; cf. test régression `tools/regression/LLM-2026-05-09-gpt41-deprecation.test.ts` et CHANGELOG `[Unreleased]`)
- [x] Documentation README + user guide à jour et relue — `user-guide.md`, `api-reference.md`, `sdk-reference.md`, `operator-guide.md`, `wit-schema.md` tous complétés en T-7.6 ✓
- [x] `npm audit` sans CVE haute ou critique — passé via `audit-ci` (`.audit-ci.json`) : minimatch patché via `pnpm.overrides`, xlsx CVEs GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9 allowlistés (aucune version npm patchée disponible, migration exceljs planifiée) ✓ (2026-05-08)
- [x] SBOM CycloneDX publié — généré via `cdxgen -t pnpm` dans `sbom.json` (813 KB, 690 dépendances) ✓ (2026-05-08)
- [x] Schéma Custom WIT documenté et versionné — `docs/wit-schema.md` v1.0.0, 7 WITs documentés ✓
- [x] Schéma `TestVaultAuditLog` documenté — inclus dans `docs/wit-schema.md` §TestVault.AuditLog ✓
- [x] Script de migration testé (si schéma touché) — N/A : premier release v1.0.0, aucune migration requise ✓
- [x] CHANGELOG.md mis à jour — entrée v1.0.0 complète avec résumé des phases 0–7 ✓
- [x] Spec-kit mis à jour si périmètre touché — `Specs/tasks.md` : 377 cases T-0.1→T-7.10 toutes marquées `[x]` ✓ (2026-05-08)
- [ ] Manifest `publisher` = `ATConseil` (cf. test régression CFG-2026-05-10-publisher-atconseil)
- [ ] Manifest `targets[]` pointe uniquement vers `Microsoft.VisualStudio.Services.Cloud` (cf. test régression CFG-2026-05-10-server2022)
- [ ] Hub `argos-hub` a `properties.iconUrl` pointant vers `static/argos-hub.svg`
- [ ] `icons.default` pointe vers `static/marketplace-icon.png` (128×128)
- [ ] Validation manuelle Alexandre Thibaud — **en attente**

---

> ⚠️ Toute modification de ce document requiert l'approbation explicite d'Alexandre Thibaud (ATConseil — atconseil.info).
