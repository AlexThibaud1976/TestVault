# Changelog

All notable changes to TestVault (Argos) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.4.0] - 2026-05-11

### Added (Sprint 4 - feat/multi-hubs-architecture)

- **Architecture multi-hubs native ADO (TECH-DEBT-013 resolu).** Le hub monolithique `argos-hub` est eclate en 6 hubs ADO independants :
  - `argos-hub-plans` — Test Plans (icone BulletedList, order 10)
  - `argos-hub-cases` — Test Cases (icone TestBeaker, order 20)
  - `argos-hub-sets` — Test Sets (icone FolderList, order 30)
  - `argos-hub-preconditions` — Preconditions (icone Important, order 40)
  - `argos-hub-reports` — Reports (icone ReportDocument, order 50)
  - `argos-hub-settings` — Settings (icone Settings, order 60)
- **Routing via `SDK.getContributionId()`** (pattern officiel Microsoft) : chaque hub partage `dist/hub/hub.html` et App.tsx choisit la vue a rendre selon le contributionId retourne par le SDK. Tableau `CONTRIBUTION_ID_TO_SECTION` avec full IDs (`AlexThibaud.ArgosTesting.argos-hub-*`) case-sensitive.
- **Test regression `T-1.0-argos-multi-hubs-architecture.test.ts`** : 9 assertions verifiant la presence des 6 hubs, leur type, leur target, leurs noms, l'absence du legacy `argos-hub`, le count exact de 6 hubs `ms.vss-web.hub`.
- **App.tsx refactored** : suppression sidebar nav (NAV_ITEMS, MainContent), ajout `HubContent` switch + 6 view components exportes (`PlansView`, `CasesView`, `SetsView`, `PreconditionsView`, `ReportsView`, `SettingsView`), loading state `hub-loading` preserve.
- **WIRING tests mis a jour** : les 5 tests importaient `MainContent` + cliquaient sur `nav-*`. Migres vers import direct du view component correspondant, sans interaction nav.
- **App.test.tsx** : 8 tests (6 routing + 1 fallback + 1 loading), SDK mock complet (`init`, `ready`, `getContributionId`, `getHost`, `getService`, `getAccessToken`, `getExtensionContext`, `notifyLoadSucceeded`, `notifyLoadFailed`), mock `getService` discriminant par serviceId pour supporter `IExtensionDataService`.

### Changed

- `vss-extension.json` : version 0.3.5 -> 0.4.0, contribution `argos-hub` (singulier) remplacee par 6 contributions.
- `apps/argos-extension/src/hub/index.tsx` : simplification (SDK.init retire, App gere l'initialisation).
- **T-0.9-argos-top-level-placement** : mise a jour assertions (pattern multi-hubs).
- **CFG-2026-05-10-top-level-hub** : ajout assertion "au moins 1 hub dans argos-hub-group".
- **Constitution v0.4.3 -> v0.5.0** avec Sprint 4 section.

### Backlog (post-Sprint 4)

- **Reports hub** : placeholder actuel ("requires backend service not yet implemented"). Implementation complete FlakinessReportService (WIRING-CLOUD-PLUS backlog).
- **Settings hub** : Audit Log, Repo Mapping, Quotas, Webhooks, Beta opt-in (Sprint 2.5b backlog).
- **E2E validation** sur instance ADO Cloud reelle : verifier que les 6 hubs apparaissent bien dans la nav Argos (T-e2e-1.0).
- (autres items backlog inchanges : TECH-DEBT-007, TECH-DEBT-010, TECH-DEBT-012, scopes ADO audit)

### Lessons learned (Sprint 4)

- **Mock complet obligatoire** : quand un composant React utilise `ServicesProvider` (qui cree de vrais services), tous les SDK calls effectues par ces services doivent etre mockes, pas seulement les calls directs dans la suite de test. La chaine `SettingsView -> LlmProviderSettings -> llmProviderService.list() -> SDK.getExtensionContext()` l'illustre.
- **WIRING tests = contrat architecture** : ces tests ont revele exactement ce qui changeait (MainContent -> views independantes, nav supprimee). Les mettre a jour avant de toucher App.tsx aurait ete le flow TDD ideal.
- **`iconName` vs `icon`** : confirme que `iconName` (FluentUI icon name) est la syntaxe correcte pour les hubs dans `vss-extension.json` (utilisee ici pour les 6 hubs).

---

## [0.3.5] - 2026-05-11

### Fixed (Sprint 3.4 - fix/hub-group-architecture)

- **3eme fausse premisse de la chaine identifiee et corrigee.** Sprint 3 utilisait `ms.vss-web.project-hub-group` comme target pour le hub top-level, un ID que j'avais invente sans verification doc Microsoft. ADO accepte les targets non-existants au manifest validation (silent), mais au runtime aucun hub-group ne correspond -> le hub n'apparait nulle part dans la nav.
- **Architecture corrigee via pattern officiel Microsoft** (docs: learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub) :
  - Ajout contribution `argos-hub-group` (type `ms.vss-web.hub-group`) targetant `ms.vss-web.project-hub-groups-collection`
  - Modification contribution `argos-hub` : target devient `.argos-hub-group` (reference relative obligatoire pour cross-contribution dans la meme extension)
  - Hub-group order = 450 (apres Test Plans natif)
  - Icone Argos placee sur le hub-group top-level (visible dans la nav laterale, peer de Boards/Repos)
  - Nom hub interne : "Test Management" (au lieu de "ArgosTesting", coherent avec positionnement marketing)
- **Propriete `iconUrl` -> `icon`** : alignement sur la propriete standard documentee Microsoft. `iconUrl` etait un nom non-officiel qui marchait parfois mais n'est pas garanti.
- **Tests regression mis a jour** :
  - `T-0.9-argos-top-level-placement` : 7 assertions (existence hub-group, type hub-group, target collection, existence hub, target relative, exclusion 2 faux targets historiques)
  - `CFG-2026-05-10-top-level-hub` : 2 nouvelles assertions (hub-group existe + target faux exclu)
  - En-tetes historiques enrichis pour tracer Sprint 3 v1 (invalidee) et Sprint 3.4 v2 (validee)
- **Constitution v0.4.2 -> v0.4.3** avec lessons learned.
- **TECH-DEBT-011 v2 enrichi** : pre-flight check inclut "validation target IDs via doc Microsoft officielle" (clef manquante Sprint 3).
- Bump version 0.3.4 -> 0.3.5 (patch).

### Backlog (post-Sprint 3.4)

- **TECH-DEBT-013 (NOUVEAU)** : eclater le hub Argos monolithique en plusieurs hubs internes (Test Cases, Test Plans, Coverage, Reports, Settings). Profite maintenant que le hub-group existe. Sprint dedie ~2-3h.
- **TECH-DEBT-012** : extension test ENC a `.yml` (mojibake dans publish-marketplace.yml + commit messages PowerShell).
- (autres items backlog inchanges : TECH-DEBT-007 Test Set/Suite, Sprint 2.5b wiring, WIRING-CLOUD-PLUS, scopes ADO audit, TECH-DEBT-010 ATConseil migration)

### Lessons learned (Sprint 3.4)

- **3eme fausse premisse en 24h** apres publisher (Sprint 3.1) et visibility (Sprint 3.2). Pattern stable : modifier des targets/configs dependant d'un referentiel externe (doc Microsoft, etat Marketplace) sans valider ce referentiel. TECH-DEBT-011 v2 doit etre prioritaire post-Sprint 3.4.
- **Validation doc avant prompt** : cette fois, validation Microsoft docs effectuee AVANT redaction du Sprint 3.4 prompt. Resultat : la syntaxe `<publisher>.<extensionId>.<contributionId>` que j'avais proposee la veille etait incorrecte pour les references intra-extension -- la doc requiert `.<contributionId>` (point + ID court). Sans la validation prealable, Sprint 3.4 aurait introduit une 4eme fausse premisse.
- **Architecture hub-group dedie** est plus puissante qu'un hub direct top-level (qui n'existe pas chez Microsoft de toute facon) : permet d'ajouter plusieurs hubs internes au sein du meme groupe Argos. Decoulage potentiel (TECH-DEBT-013) : Test Cases / Test Plans / Coverage / Reports / Settings comme hubs separes au lieu d'un App.tsx monolithique.

---

## [0.3.2] — 2026-05-10

### Fixed (Sprint 3.2 — fix/revert-marketplace-private-to-public)

- **Revert `"public": false` du manifest Argos**. Le Sprint "Marketplace prive" avait ajoute ce champ sur une fausse premisse :
  - Argos v0.1.1 etait deja publie en mode Public sur le Marketplace (2026-05-08)
  - Microsoft interdit le downgrade Public->Prive sur une extension existante sans perte de l'extensionId
  - La publication v0.3.1 avait echoue avec : `"An extension that was made public can't be changed to private."`
  - Le champ `"public": false` est retire du manifest ; l'absence du champ = Public par defaut (comportement Marketplace)
- **Test regression renomme** : `CFG-2026-05-10-marketplace-private.test.ts` -> `CFG-2026-05-10-marketplace-public.test.ts`. Logique inversee : verifie que `"public": false` n'est PAS present et que `galleryFlags: ["Private"]` n'existe pas. En-tete historique preserves la trace du Sprint Marketplace prive et de son revert.
- **Allowlists ts/cjs** mises a jour pour le nouveau nom.
- **REGISTRY** : entree retiree pour marketplace-private + nouvelle entree active pour marketplace-public.
- **Constitution v0.4.1 -> v0.4.2** (correction methodologique tracee).
- **CLAUDE.md** (root) : section "Marketplace publication strategy" mise a jour — mode public, publisher AlexThibaud, test guard-rail renomme.
- Bump version 0.3.1 -> 0.3.2 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.2)

- **TECH-DEBT-011** : si decision produit de restreindre l'acces a une audience specifique, evaluer les options Microsoft (organisation-scoped sharing sans changer la visibilite publique) plutot qu'un downgrade Public->Prive.

### Lessons learned (Sprint 3.2)

- **Microsoft Marketplace est irreversible sur la visibilite** : une extension publiee Public ne peut pas etre passee en Prive sans creer une nouvelle extension avec un nouvel extensionId. Verifier le status courant avant tout changement de visibilite.
- **Chaine de fausses premises** : Sprint 2 (publisher), Sprint "Marketplace prive" (visibilite), Sprint 3 (publisher + visibilite) ont tous cumule des fausses premises. Pattern : tester manuellement sur Marketplace sandbox avant de coder/locker un test de regression.
- **Test regression "false-premise"** (meme lecon que Sprint 3.1) : rename + invert + en-tete historique + REGISTRY retire. Ne pas supprimer.

---

## [0.3.1] — 2026-05-10

### Fixed (Sprint 3.1 — fix/revert-publisher-to-alexthibaud)

- **Revert publisher Marketplace : ATConseil -> AlexThibaud**. Sprint 2 avait change le publisher en pensant que c'etait une "correction", mais la premisse etait fausse :
  - AlexThibaud est le publisher historique d'Argos (v0.1.1 deja publiee 2 jours avant Sprint 3)
  - ATConseil est reserve a TestPulse, pas a Argos
  - Le PAT `MARKETPLACE_PAT` (secret CI) appartient au publisher AlexThibaud
  - La publication v0.3.0 a echoue avec mismatch error : `Publisher ID 'ATConseil' should match 'AlexThibaud'`
- **Test regression renomme** : `CFG-2026-05-10-publisher-atconseil.test.ts` -> `CFG-2026-05-10-publisher-alexthibaud.test.ts`. Logique inversee pour locker AlexThibaud. En-tete historique preserve la trace de la decision Sprint 2 et de son revert.
- **Allowlists ts/cjs** mises a jour pour le nouveau nom.
- **REGISTRY** : entree retiree pour publisher-atconseil + nouvelle entree active pour publisher-alexthibaud.
- **Constitution v0.4.0 -> v0.4.1** (correction methodologique tracee).
- **Spec-kit** (constitution, plan, spec) : toutes les occurrences du publisher Marketplace corrigees en `AlexThibaud`. Les references ATConseil non liees au publisher (marque, Azure Functions, portail) restent inchangees.
- Bump version 0.3.0 -> 0.3.1 (patch : corrige une publication failed sans changement de feature).

### Backlog (post-Sprint 3.1)

- **TECH-DEBT-010** : si decision portfolio future de migrer Argos vers le publisher ATConseil, projet separe necessitant creation publisher cote Marketplace + verification Microsoft + transfert/republication. Pas urgent.

### Lessons learned (Sprint 3.1)

- **Avant tout changement de publisher Marketplace**, verifier que le publisher cible existe cote Marketplace ET que le PAT CI a les droits. Sprint 2 a manque cette verification.
- **Test regression "false-premise"** : un test peut locker une mauvaise decision avec autant de rigueur qu'une bonne. Pattern de revert : rename + invert logic + en-tete historique enrichi. Ne pas supprimer le test, sinon perte de la lecon.
- **Banniere et publisher peuvent diverger** : "by ATConseil" sur la banniere + publisher Marketplace AlexThibaud = pattern legitime quand la marque commerciale et le publisher technique sont distincts.

---

## [0.3.0] — 2026-05-10

### Added (Sprint 3 — 2026-05-10 — feat/top-level-hub-v0.3.0)

- **Argos hub repositionné au niveau projet** : contribution `argos-hub` cible desormais `ms.vss-web.project-hub-group` (hub racine ADO, au meme niveau que Boards/Repos/Pipelines) au lieu du groupe Boards. L'onglet Argos est maintenant un hub de premier niveau visible dans toutes les sections du projet.
- **Categories Marketplace etendues** : `"categories": ["Azure Boards", "Azure Test Plans"]` (etait `["Azure Boards"]` uniquement).
- **Banniere Marketplace 1280x640** : `static/marketplace-banner.png` + `static/marketplace-banner.svg` ajoutes et references dans `vss-extension.json` via `content.screenshots`.
- **References Xray supprimees** des fichiers publics (`overview.md`, `vss-extension.json`, `CLAUDE.md`, `README.md`) et du spec-kit (`Specs/CLAUDE.md`, `Specs/constitution.md`, `Specs/plan.md`, `Specs/spec.md`). Terminologie remplacee : "industrial-grade test management" / "outils Jira-natifs".
- **3 tests de regression** ajoutes : `T-0.9-argos-top-level-placement.test.ts`, `CFG-2026-05-10-top-level-hub.test.ts`, `CFG-2026-05-10-no-xray-references.test.ts`.
- **Versions 0.3.0** : 13 packages workspace bumpes depuis 0.2.0 via Changesets (minor bump).

### Refactored (TECH-DEBT-005 — 2026-05-10 — refactor/enc-pattern-coverage)

- **Patterns mojibake elargis** : extraction de la table cp1252 -> Unicode dans `tools/regression/cp1252-mojibake-map.ts` (+ pendant CommonJS `.cjs`). Generation programmatique des patterns mojibake pour 3 categories de longueur UTF-8 (2-byte = accentues Latin, 3-byte = punctuation Unicode, 4-byte = emojis).
- **Coverage amelioree** : nouveaux cas desormais detectes -- trademark (mojibake `â„¢`), euro (mojibake `â‚¬`), en-dash, dagger, grinning-face emoji. Aucun faux positif sur les cas de texte propre testes.
- **Test cross-check `cp1252-mojibake-map.test.ts`** ajoute pour empecher la divergence ts/cjs (5 assertions : char list identique, char class identique, regex source identique, count = 59, trademark/euro inclus).
- **`scan-mojibake.cjs` et `fix-mojibake.cjs` refactes** : utilisent desormais `buildMojibakePatterns()` depuis la table programmatique au lieu des patterns litteraux incomplets.
- **Aucune nouvelle entree REGISTRY** : amelioration de couverture du test ENC-2026-05-09 existant, pas un nouveau perimetre.
- 12 -> 17 tests regression passing (12 anciens + 5 nouveaux cross-check).

### Added (Sprint 2.5a — 2026-05-10 — feat/wiring-foundations-core)

- **ADO Extension SDK bridge** : hook `useAdoContext` recupere token, project, organization depuis le SDK 4.x. Token factory rafraichi a chaque appel API (decision robuste — pas un token fige au mount).
- **`tokenFactory` dans `createAdoClient`** (SDK patch) : `AdoClientConfig` accepte desormais `tokenFactory?: () => Promise<string>` en complement du `pat` statique. Retro-compatible. Chaque appel API utilise un Bearer token frais. Test de non-regression documente dans `ado-client.test.ts` (28 tests au total).
- **Services factory** : `buildServices(adoCtx)` construit tous les services SDK + hub-local en un objet unique injecte via React Context (`ServicesProvider` + `useServices`).
- **`IExtensionDataClient` bridge** : `createExtensionDataClient()` adapte l'ADO Extension Data Service avec User scope (BYOK — chaque utilisateur a ses propres credentials LLM).
- **`IAiSettingsStore` adapter explicite** : `createAiSettingsStore(client)` convertit le contrat `getValue/setValue` vers `getAll/set/delete/getFlag/setFlag` sans cast unsafe.
- **Wiring 5 sections App.tsx** : Plans -> TestPlanForm, Cases -> TestCaseForm, Sets -> TestSetForm, Preconditions -> PreconditionForm, Settings (LLM) -> LlmProviderSettings.
- **Reports** : placeholder explicite avec reference backlog WIRING-CLOUD-PLUS (FlakinessReportService non implemente Sprint 2.5a).
- **Mock services factory** : `apps/argos-extension/src/test-utils/mock-services.ts` reutilisable pour tests d'integration futurs.
- **Smoke tests niveau 1** : 5 tests `WIRING-2026-05-10-*.test.tsx` qui verifient que chaque section rend le composant riche, pas le placeholder.
- **Vitest alias** `azure-devops-extension-api` -> stub local (package AMD incompatible jsdom ; stub expose uniquement les types necessaires aux tests).
- **REGISTRY.md** : ajout entree `WIRING-2026-05-10-foundations`.

### Hors scope Sprint 2.5a (backlog Sprint 2.5b)

- Reports (FlakinessReport orphelin), Run/Coverage/Execution, Wizards, Settings non-LLM (Audit/Repo/Quota/Webhook/Beta).

### Added (mini-Sprint Marketplace Private — 2026-05-10 — feat/marketplace-private)

- **`vss-extension.json` flag `"public": false`** : l'extension Argos est publiée sur le Marketplace en mode privé. Accessible uniquement à l'organisation Azure DevOps `bcee-qa` (à partager via portail publisher au moment de la première publication).
- **Test régression `CFG-2026-05-10-marketplace-private`** : 3 assertions zero-tolerance (`public === false`, `public !== true`, `galleryFlags` ne contient pas `"Public"`).
- **Justification** : Argos est un outil interne BCEE-QA pour l'instant. Bascule vers public possible ultérieurement (commercialisation) — nécessitera de retirer `"public": false` ET de mettre à jour le test régression (changement de stratégie produit explicite, pas un accident).

### Refactored (TECH-DEBT-001 — 2026-05-10 — refactor/regression-allowlist)

- **Factorisation des allowlists communes** : extraction des fichiers méthodologiques partagés (CHANGELOG, REGISTRY, prompts archivés) dans `tools/regression/allowlist.ts` (+ pendant CommonJS `allowlist.cjs`). Les 3 tests régression `*.test.ts` (LLM, ENC, CFG-server2022) et le script `scan-mojibake.cjs` importent désormais cette source unique.
- **Test cross-check `tools/regression/allowlist.test.ts`** ajouté pour empêcher la divergence entre `allowlist.ts` et `allowlist.cjs`.
- **`tsconfig.json` regression** : ajout de `allowImportingTsExtensions + noEmit` pour permettre les imports `.ts` locaux entre tests.
- Aucun changement fonctionnel : les 8 tests régression précédents restent 8 passing + 1 nouveau cross-check = **9 total**.

### Fixed (Sprint 1 — 2026-05-09 — fix/llm-models-deprecation)

- **Modèles LLM dépréciés dans la doc** : remplacement de toutes les références à `gpt-4.1` par `gpt-5.2` dans `Specs/constitution.md` (§3.2.1 et §11) et `Specs/spec.md` (description feature TC generation et wireframe Settings). `gpt-4.1` a été retiré de Microsoft Foundry le 2026-04-11 ; la case checklist §11 cochée "actifs au 2026-05-08 ✓" était factuellement fausse à la date où elle a été cochée.
- **Date de validation checklist §11** corrigée : 2026-05-08 → 2026-05-09 avec note explicative.
- **Modèles LLM dépréciés dans les tests applicatifs** : remplacement de `gpt-4.1` par `gpt-5.2` dans `apps/argos-extension/src/hub/llm-provider-service.test.ts` et `LlmProviderSettings.test.tsx` (2 occurrences découvertes hors périmètre initial ; incluses dans Sprint 1 suite à décision 2026-05-09).

### Added (Sprint 1)

- **Suite de tests de non-régression** dans `tools/regression/` :
  - Premier test : `LLM-2026-05-09-gpt41-deprecation.test.ts` (scan du repo, échoue si `gpt-4.1` est réintroduit)
  - `tools/regression/REGISTRY.md` — registry des tests régression nommés (cf. constitution §10 "test de non-régression nommé pour chaque bug confirmé")
  - Convention de nommage : `<TYPE>-<DATE-OU-TASK>-<short-slug>`

### Fixed (Sprint 1.1 — 2026-05-09 — fix/sprint1-encoding-mojibake)

- **Encoding `Specs/spec.md` (régression Sprint 1, 1010 occurrences)** : restauré depuis le commit pré-Sprint-1 `1acdb46` + ré-application des modifs `gpt-4.1` → `gpt-5.2` du Sprint 1.
- **Encoding `Specs/tasks.md` (corruption pré-existante au repo, 647 occurrences)** : recovery algorithmique via round-trip cp1252 → UTF-8 (le fichier était déjà corrompu avant Sprint 1, donc pas de version git propre à restaurer).
- **Allowlists désynchronisées** : 3 fichiers (`LLM-test`, `ENC-test`, `scan-mojibake.cjs`) maintenaient chacun leur propre allowlist, oublis fréquents lors d'ajouts. À refactoriser en Sprint 2 (TECH-DEBT-001).

### Added (Sprint 1.1)

- **Test régression `ENC-2026-05-09-spec-mojibake`** dans `tools/regression/` — zero-tolerance, source 100% ASCII (escapes Unicode dans les regex), immunisé à la corruption d'encoding qu'il détecte.
- **Outil `tools/regression/scan-mojibake.cjs`** — audit standalone du repo, retourne fichier:occurrences trié.
- **Outil `tools/regression/fix-mojibake.cjs`** — recovery algorithmique cp1252 → UTF-8 réutilisable pour fichiers corrompus sans source git propre.
- **Archive `tools/claude-prompts/`** — prompts Claude Code archivés par sprint (`CLAUDE_TASK_sprint-1.md`, `CLAUDE_TASK_sprint-1.1.md`) + `README.md` documentant la convention.
- **Garde-fou méthodologique dans `CLAUDE.md`** — section "Encoding rules" déconseillant `Set-Content` PS sans flag, recommandant Git Bash / WSL / outils Claude Code.

### Lessons learned (Sprint 1.1)

- Cause racine identifiée : `Set-Content` PowerShell sans flag `-Encoding utf8` (PS 5.1 Windows défaut = cp1252).
- L'incident s'est reproduit pendant Sprint 1.1 lui-même (test ENC corrompu pendant ses propres éditions). Solution adoptée : test source 100% ASCII via escapes Unicode `\uXXXX`.
- Allowlists séparées entre 3 fichiers sont fragiles → factoriser au Sprint 2.

---

## [0.2.0] — 2026-05-10

### BREAKING

- **Cloud-only** : Argos est désormais Cloud-only. Retrait de `Microsoft.TeamFoundation.Server` du tableau `targets[]`. Constitution bumped to v0.3.0. Test de régression `CFG-2026-05-10-server2022-out-of-scope.test.ts` ajouté pour prévenir toute réintroduction.

### Fixed

- **Manifest publisher** : `AlexThibaud` → `ATConseil`. Test de régression `CFG-2026-05-10-publisher-atconseil.test.ts` ajouté.
- **README casing** : `readme.md` → `README.md` (git mv two-step pour filesystem Windows case-insensitive).
- **Versions alignées** : root `package.json`, `apps/argos-extension/package.json` et `vss-extension.json` tous à `0.2.0` (étaient à `0.0.0` / `0.0.1` / `0.1.0` selon le fichier).
- **CHANGELOG chronologie** : entrée fictive `[1.0.0] — 2026-05-08` retirée (décrivait les Phases 1-7 non encore implémentées ; `tasks.md` les montre toutes non cochées).
- **`tasks.md` resync** : version `0.1.0` → `0.1.1`, cases `[x]` Phase 1-7 décochées, ajout Phase 0.5 "Dette d'intégration".

### Added

- **Icônes** : `apps/argos-extension/static/argos-hub.svg` (icône onglet hub) et `apps/argos-extension/static/marketplace-icon.png` (icône Marketplace 128 × 128 px).
- **Phase 0.5 "Dette d'intégration"** dans `Specs/tasks.md` : 5 tâches (T-0.5.1 – T-0.5.5) documentant le wiring manquant App.tsx ↔ composants riches (40+ fichiers).
- **2 tests de régression** dans `tools/regression/` : `CFG-2026-05-10-server2022-out-of-scope.test.ts` et `CFG-2026-05-10-publisher-atconseil.test.ts`.
- **`overview.md` refondu** : ton produit, Cloud-only, liste de features à jour.

### TECH-DEBT noted (Sprint 3+)

- `TECH-DEBT-001` : factoriser les trois allowlists séparées en `tools/regression/allowlist.ts`.
- Phase 0.5 : wiring `App.tsx` ↔ composants riches (40+ fichiers) à réaliser avant la sortie des fonctionnalités Phase 1.

---

## [0.1.1] — 2026-05-09

### Fixed

- **Manifest ADO hub group** — contribution `argos-hub` pointait vers `ms.vss-web.project-hub-group` (Project hub) au lieu de `ms.vss-work-web.work-hub-group` (Boards tab). L'onglet Argos apparaît maintenant correctement dans la section Boards (T-0.8).
- **Coverage panel URI** — le panneau Work Item Form pointait vers `dist/hub/hub.html` au lieu de `dist/widgets/coverage-panel/index.html`, son propre point d'entrée React dédié.
- **Scopes Marketplace** — ajout des permissions manquantes : `vso.work_full`, `vso.profile`, `vso.code`, `vso.extension.data_write`, `vso.identity` (alignement plan §2.1).
- **Server 2022 target** — ajout de `Microsoft.TeamFoundation.Server [18.0,)` dans `targets` pour déclarer le support ADO Server 2022.

### Added

- Point d'entrée dédié `dist/widgets/coverage-panel/` — bundle React autonome pour le panneau Test Coverage sur les Work Item Forms.
