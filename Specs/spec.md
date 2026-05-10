# Spécification — TestVault (Argos) v1.0

> Version 0.1.0 — 8 mai 2026
> Spécification fonctionnelle détaillée
> Auteur : Alexandre Thibaud — atconseil.info
> Référence constitution : `constitution.md` v0.2.2

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Personas](#2-personas)
3. [Epics & User Stories](#3-epics--user-stories)
4. [Features Détaillées](#4-features-détaillées)
5. [Flux Utilisateur](#5-flux-utilisateur)
6. [Modèles de Données](#6-modèles-de-données)
7. [Wireframes](#7-wireframes)
8. [Positionnement Différentiel](#8-positionnement-différentiel)
9. [Exigences Non-Fonctionnelles](#9-exigences-non-fonctionnelles)

---

## 1. Vue d'Ensemble

### Problème

Les équipes QA sur Azure DevOps disposent aujourd'hui de **Microsoft Test Plans natifs** (rudimentaire pour la gestion sérieuse) ou doivent recourir à **Azure Test Plans** (licence dédiée, ~52 €/user/mois, fonctionnellement limité face à Xray sur Jira). Aucune extension du Marketplace ne couvre aujourd'hui le périmètre complet de Xray (référentiel, exécution, traçabilité, BDD, versioning, intégration CI/CD, reporting) avec une vraie expérience moderne.

Conséquence : les équipes ADO sérieuses sur la qualité **migrent vers Jira+Xray** (perte d'intégration native ADO + Repos + Pipelines) ou bricolent avec des Excel partagés et des outils tiers non intégrés. Les organisations ayant choisi ADO Server pour des raisons de souveraineté sont d'autant plus pénalisées car peu d'outils QA modernes supportent l'on-premises.

### Solution

**TestVault** (commercialisé sous le nom **Argos** sur le Visual Studio Marketplace, par le publisher **ATConseil**) est l'extension de test management qui apporte l'expérience Xray à l'écosystème Azure DevOps, avec parité fonctionnelle stricte Cloud / Server 2022 et stockage Work Items natif pour la souveraineté des données.

**Promesse de valeur en 5 points :**

1. **Référence ouverte** : Custom Work Items lisibles même sans l'extension installée.
2. **Parité Cloud/Server** : aucune fonctionnalité cœur n'est exclusive à un environnement.
3. **Pricing -30% vs Xray Cloud** + Free tier sans CB pour évaluation sérieuse.
4. **AI BYOK** : les features AI utilisent les clés LLM du client, jamais les nôtres.
5. **Reporting riche** via TestPulse co-installable, déjà éprouvé sur le marché.

### Périmètre

**Inclus dans v1 :**

- Référentiel : Test Cases, Test Plans, Test Sets, Preconditions (CRUD complet, clonage, templates)
- Exécution manuelle : statuts (Pass/Fail/Blocked/Unexecuted/Skipped), steps détaillés, evidence multi-fichiers, environments configurables
- Traçabilité bidirectionnelle Work Items ADO ↔ Test Cases, matrice de couverture exigences
- Versioning par snapshots taggés (immutable, comparable)
- Import : CSV, Excel, JUnit XML, NUnit XML, xUnit, TestNG, Cucumber JSON
- Export : Excel, PDF
- BDD/Gherkin : champ structuré dans le TestCase + sync optionnelle vers `.feature` files dans Azure Repos
- Recherche WIQL + index local côté client + filtres rapides
- Intégrations CI/CD : Azure Pipelines & GitHub Actions first-class ; Jenkins, GitLab CI, CircleCI via formats standard
- API publique : SDK npm `@atconseil/testvault-sdk` + CLI `testvault-cli`
- Cloud-Plus (Cloud uniquement) : génération AI de Test Cases (BYOK), détection AI de flakiness (BYOK), webhooks CI externes, jobs planifiés
- Administration : rôles Admin/User/Reader hérités d'ADO, audit trail immutable, configuration fine LLM
- Wizard d'installation du Custom Process Inheritance

**Hors périmètre v1 (roadmap v2+) :**

- Multi-organisation cross-org consolidée dans l'UI (le SDK le permet déjà)
- Test exploratoire avec session recording
- Performance / load testing (Microsoft Azure Load Testing reste l'option)
- Test mobile cross-device (App Center, BrowserStack restent les options)
- Custom dashboards Argos (déléguer à TestPulse)
- ADO Server 2020 (fin de mainstream, hors scope par décision constitution §1)

---

## 2. Personas

### 2.1 Aïcha — Test Manager

| | |
|---|---|
| **Profil** | 38 ans, 12 ans d'XP en QA dont 5 en management. Travaille pour une banque européenne avec ADO Server 2022 on-prem (souveraineté réglementaire). Manage une équipe de 8 testeurs (2 SDET, 6 manuels). Fluent en SQL, à l'aise avec WIQL, allergique au code TypeScript. |
| **Besoin principal** | Avoir une vue consolidée et fiable de l'état de couverture qualité de chaque release, pouvoir réorganiser rapidement les Test Plans selon les sprints. |
| **Frustration** | Microsoft Test Plans natifs sont visuellement datés et limités sur la traçabilité. Les Excel partagés deviennent ingérables au-delà de 200 Test Cases. La banque a refusé Xray Cloud (données hors UE), Xray DC est cher et non intégré ADO. |
| **Objectif** | Maintenir une matrice de couverture vivante des exigences réglementaires, exporter des rapports de release-readiness pour le COMEX, garantir la traçabilité auditable. |
| **Fréquence d'usage** | Quotidienne (3-5h/jour pendant les phases de release) |
| **Rôle TestVault** | Admin TestVault (Project Administrator dans ADO) |

### 2.2 Mathieu — Dev SDET / Automatisation

| | |
|---|---|
| **Profil** | 29 ans, ingénieur logiciel orienté qualité (SDET). Travaille pour une startup SaaS sur ADO Cloud. Écrit des tests Cypress/Playwright et du Cucumber/Gherkin. Vit dans VS Code et le terminal. À l'aise avec GitHub Actions, npm, et l'API REST ADO. |
| **Besoin principal** | Que les résultats automatisés de ses pipelines remontent automatiquement dans le référentiel de tests, avec une bonne traçabilité vers les User Stories. Détecter rapidement les tests flaky qui font perdre du temps à l'équipe. |
| **Frustration** | Les résultats CI partent dans des artefacts JUnit XML que personne ne consulte vraiment. Les bugs causés par des tests flaky sont blâmés à tort sur le code. Aucun outil ne dialogue proprement avec ADO Boards depuis sa CI. |
| **Objectif** | Automatiser la chaîne "TestCase → exécution CI → rapport → bug filed → traçabilité Work Item". Tirer parti d'AI pour générer des skeletons de TestCases à partir de User Stories. |
| **Fréquence d'usage** | Plusieurs fois par jour (interactions courtes : check status, upload résultats, recherche TC) |
| **Rôle TestVault** | User TestVault (Contributor dans ADO) |

### 2.3 Patricia — VP Quality

| | |
|---|---|
| **Profil** | 52 ans, VP Quality dans un groupe industriel coté. Reporte au CTO. Pas hands-on sur l'outillage. Lit des dashboards, parle aux Test Managers et au COMEX. Niveau Excel poussé, lecture de PDF. |
| **Besoin principal** | KPI consolidés de qualité : taux de couverture des exigences critiques, défauts ouverts par criticité, vélocité QA, dette de tests. |
| **Frustration** | Les rapports remontent en Excel artisanaux d'un Test Manager différent par équipe, formats hétérogènes, agrégation manuelle douloureuse. |
| **Objectif** | Avoir un dashboard exécutif unique et fiable accessible à la demande, exportable en PDF pour les Codir. Identifier les zones de risque produit. |
| **Fréquence d'usage** | Hebdomadaire (revue qualité) + ponctuellement avant Codir |
| **Rôle TestVault** | Reader TestVault (Reader dans ADO) ; consomme principalement TestPulse |

---

## 3. Epics & User Stories

### Epic 1 — Référentiel de tests

> Constituer et maintenir l'arborescence de Test Cases, Test Sets, Test Plans, Preconditions du projet.

#### US-1.1 : Créer un Test Case

**En tant que** Mathieu (Dev SDET), **je veux** créer un Test Case structuré (titre, description, steps, expected results, tags, area path) **afin de** documenter un cas de test exécutable.

**Critères d'acceptation (Given/When/Then) :**

- **Given** je suis User TestVault sur un projet ADO, **When** je clique "New Test Case" depuis le hub Argos, **Then** un formulaire s'ouvre avec champs : Title (obligatoire, max 255 caractères), Description (markdown, max 32 KB), Steps (liste ordonnée d'objets `{action, expected}`), Tags (multi-valeur), Area Path (sélecteur ADO natif), Iteration Path (optionnel), Priority (1-4).
- **Given** un Test Case est en édition, **When** j'ajoute un step, **Then** je peux réordonner par drag & drop et chaque step accepte du markdown dans l'action et le résultat attendu.
- **Given** je sauvegarde un Test Case sans titre, **Then** le formulaire affiche une erreur "Title is required" et n'enregistre pas.
- **Given** un Test Case est sauvegardé, **When** je consulte la vue Work Item ADO native, **Then** le Test Case apparaît avec tous ses champs custom et son historique d'audit.

**Priorité :** 🔴 Haute

#### US-1.2 : Organiser des Test Cases dans un Test Set

**En tant que** Aïcha (Test Manager), **je veux** regrouper des Test Cases dans un Test Set thématique **afin de** structurer le référentiel par fonctionnalité ou risque.

**Critères d'acceptation :**

- **Given** je suis Admin ou User TestVault, **When** je crée un Test Set, **Then** je peux y ajouter des Test Cases par sélection multiple, par WIQL query sauvegardée, ou par drag-and-drop depuis l'arborescence.
- **Given** un Test Case appartient à plusieurs Test Sets, **Then** la modification du Test Case se reflète immédiatement dans tous les Test Sets qui le référencent (lien, pas copie).
- **Given** je supprime un Test Set, **Then** les Test Cases qu'il contenait ne sont pas supprimés (le Test Set est un agrégat, pas un conteneur).

**Priorité :** 🔴 Haute

#### US-1.3 : Créer un Test Plan basé sur des Test Sets et des Test Cases

**En tant que** Aïcha, **je veux** assembler un Test Plan ciblé sur une release ou un sprint **afin de** suivre l'effort de test pour cette livraison.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** je crée un Test Plan, **Then** je définis : Name, Description, Iteration Path (sprint cible), Owner, Test Sets inclus, Test Cases supplémentaires, Environments cibles (multi-sélection depuis liste configurée par Admin).
- **Given** un Test Plan est figé pour exécution, **When** je clique "Lock", **Then** un snapshot des versions actuelles de chaque Test Case est créé automatiquement (cf. US-4.1) ; toute modification ultérieure d'un Test Case ne se répercute pas dans ce Test Plan.
- **Given** un Test Plan est verrouillé, **When** un User tente de modifier sa composition, **Then** l'action est refusée avec message "Test Plan locked. Unlock to modify (Admin only)".

**Priorité :** 🔴 Haute

#### US-1.4 : Cloner un Test Plan d'un projet à un autre

**En tant que** Aïcha, **je veux** cloner un Test Plan vers un autre projet ADO **afin de** réutiliser un patron de test entre équipes.

**Critères d'acceptation :**

- **Given** un Test Plan source existe, **When** je clique "Clone to project...", **Then** je sélectionne le projet ADO cible (limité aux projets sur lesquels j'ai droit Contributor), je confirme, et un nouveau Test Plan est créé avec ses Test Cases (clonés ou linkés selon mon choix) dans le projet cible.
- **Given** le clonage est en cours sur >100 Test Cases, **Then** une progress bar affiche l'avancement et le clonage est annulable.
- **Given** un Test Case avec un snapshot référencé est cloné, **Then** seule la dernière version est clonée (les anciens snapshots ne migrent pas).

**Priorité :** 🟡 Moyenne

#### US-1.5 : Définir et lier des Preconditions

**En tant que** Mathieu, **je veux** définir des Preconditions réutilisables et les lier à plusieurs Test Cases **afin d'** éviter de dupliquer les états de setup dans chaque test.

**Critères d'acceptation :**

- **Given** je suis User TestVault, **When** je crée une Precondition, **Then** je définis : Title, Description (markdown), Tags. Je peux la lier à N Test Cases via le lien typed `precondition-of`.
- **Given** je consulte un Test Case avec une Precondition liée, **Then** la Precondition apparaît en pré-amble dans la vue d'exécution.

**Priorité :** 🟢 Basse

---

### Epic 2 — Exécution & Evidence

> Exécuter manuellement les tests, capturer les résultats, attacher les preuves.

#### US-2.1 : Exécuter manuellement un Test Case et capturer les résultats step par step

**En tant que** Mathieu, **je veux** dérouler un Test Case avec son interface dédiée **afin de** capturer un Pass/Fail/Blocked/Skipped sur chaque step et un statut global.

**Critères d'acceptation :**

- **Given** je suis User TestVault et un Test Plan m'est assigné, **When** je clique "Run" sur un Test Case du Test Plan, **Then** une interface dédiée s'ouvre montrant : Precondition (si liée), liste des steps avec checkbox de statut individuel (Pass/Fail/Blocked/Skipped), zone de commentaire par step, zone d'evidence par step.
- **Given** je marque un step en Fail, **When** je sauvegarde la run, **Then** un commentaire est obligatoire (validation UI) ; à défaut, l'enregistrement est refusé.
- **Given** tous les steps sont en Pass, **Then** le statut global du Test Case dans cette execution est automatiquement Pass. Si au moins un step est Fail, le statut global est Fail. Si au moins un step est Blocked sans aucun Fail, le statut global est Blocked.
- **Given** une exécution est terminée, **Then** elle est immutable et un nouvel essai requiert de "Re-run" (qui crée une nouvelle exécution liée à la précédente).

**Priorité :** 🔴 Haute

#### US-2.2 : Attacher de l'evidence (screenshots, logs, vidéos) à une exécution

**En tant que** Mathieu, **je veux** attacher des fichiers de preuve à une exécution **afin de** documenter ce qui a été observé.

**Critères d'acceptation :**

- **Given** je suis dans l'interface d'exécution, **When** je clique "Add evidence" sur un step ou globalement, **Then** je peux uploader : images (PNG, JPG, GIF, max 10 MB), documents (PDF, max 25 MB), logs texte (TXT, LOG, max 5 MB), vidéos (MP4, WEBM, max 100 MB). Le stockage utilise l'API Attachments ADO native.
- **Given** un fichier dépasse la limite de taille, **Then** un message clair indique la limite et le type accepté.
- **Given** une evidence est uploadée, **Then** elle est visible dans le détail de l'exécution avec preview pour les images, lecteur intégré pour les vidéos, et lien de téléchargement pour les autres.

**Priorité :** 🔴 Haute

#### US-2.3 : Sélectionner un Environment cible avant exécution

**En tant que** Aïcha, **je veux** que chaque exécution soit associée à un Environment (Dev, QA, Staging, Prod) **afin de** distinguer les résultats par environnement.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > Environments, **Then** je peux ajouter, modifier, supprimer des environments (string libres : "Dev", "QA-EU", "Staging-US", "Prod-DR").
- **Given** un User démarre une exécution, **When** l'interface de run s'ouvre, **Then** un sélecteur d'Environment est obligatoire (dropdown limité à la liste configurée).
- **Given** je consulte un historique d'exécutions d'un Test Case, **Then** je peux filtrer par Environment et voir les statuts par environment côte à côte.

**Priorité :** 🔴 Haute

---

### Epic 3 — Traçabilité & Versioning

> Lier les Test Cases aux exigences ADO et figer les versions à des moments-clés.

#### US-3.1 : Lier un Test Case à des Work Items (User Story, Bug, Requirement)

**En tant que** Aïcha, **je veux** lier un Test Case aux Work Items qu'il couvre **afin de** maintenir une matrice de traçabilité exigences ↔ tests.

**Critères d'acceptation :**

- **Given** je suis User TestVault sur un Test Case, **When** je clique "Link Work Item", **Then** je sélectionne un type de lien (`Tested By`, `Validates`, `Covers`) et un Work Item via la recherche standard ADO. Le lien est bidirectionnel.
- **Given** un Work Item lié est supprimé dans ADO, **Then** le lien est marqué orphelin dans le Test Case et signalé visuellement.
- **Given** je consulte une User Story dans ADO, **Then** un panneau "Test Coverage" affiche les Test Cases liés et leur statut d'exécution le plus récent par environment.

**Priorité :** 🔴 Haute

#### US-3.2 : Consulter la matrice de couverture exigences

**En tant que** Patricia, **je veux** une matrice montrant la couverture de chaque exigence par les Test Cases **afin de** identifier les zones à risque non testées.

**Critères d'acceptation :**

- **Given** je suis Reader TestVault ou plus, **When** j'ouvre la "Traceability Matrix" depuis le hub, **Then** je vois un tableau croisant Work Items (exigences) × Test Cases avec dans chaque cellule : nombre d'exécutions, dernier statut, dernière date.
- **Given** j'applique des filtres (Area Path, Tags, statut d'exécution, environment), **Then** la matrice se met à jour instantanément ou avec spinner si > 1000 cellules.
- **Given** j'exporte la matrice, **Then** je peux la télécharger en Excel (format `.xlsx`) ou PDF, avec mise en forme conditionnelle (rouge = Fail, vert = Pass, gris = Unexecuted).

**Priorité :** 🔴 Haute

#### US-3.3 : Créer un snapshot d'un Test Case

**En tant que** Aïcha, **je veux** figer la version actuelle d'un Test Case sous un nom (`v1.0`, `Sprint-12`, `Release-2025-Q4`) **afin de** garantir l'immutabilité de ce qui a été testé pour cette release.

**Critères d'acceptation :**

- **Given** je suis Admin ou User TestVault sur un Test Case, **When** je clique "Create Snapshot", **Then** je saisis un nom unique (par Test Case parent) et un commentaire optionnel. Un Custom WI `TestCaseVersion` est créé avec une copie immutable des champs.
- **Given** un snapshot existe, **When** je tente de le modifier, **Then** l'UI refuse l'opération et affiche "Snapshot is immutable".
- **Given** je consulte un Test Case, **Then** je vois la liste de ses snapshots avec date, auteur, et un bouton "Compare with current".
- **Given** je clique "Compare with current", **Then** un diff visuel s'affiche montrant les champs modifiés (titre, description, steps ajoutés/modifiés/supprimés, tags).

**Priorité :** 🔴 Haute

#### US-3.4 : Snapshot automatique au lock d'un Test Plan

**En tant que** Aïcha, **je veux** qu'un Test Plan verrouillé fige automatiquement les versions actuelles de ses Test Cases **afin de** ne pas polluer le référentiel avec des snapshots manuels.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault et un Test Plan est en édition, **When** je clique "Lock", **Then** pour chaque Test Case du plan sans snapshot existant à l'identique, un snapshot auto-nommé `{TestPlanName}-Lock-{YYYYMMDD}` est créé. Le Test Plan référence ce snapshot, pas le Test Case parent.
- **Given** un Admin a configuré l'opt-out de cette feature, **Then** le lock du Test Plan ne crée pas de snapshot (l'admin assume).

**Priorité :** 🟡 Moyenne

---

### Epic 4 — Import / Export / CI

> Faire entrer et sortir les données du système, intégrer les pipelines CI.

#### US-4.1 : Importer des Test Cases depuis CSV ou Excel

**En tant que** Aïcha, **je veux** importer un fichier Excel de Test Cases existants **afin de** migrer notre patrimoine sans tout ressaisir.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** j'ouvre l'import wizard et je dépose un fichier `.csv` ou `.xlsx`, **Then** un mapping interactif des colonnes vers les champs TestVault est proposé (auto-détection si headers standards : Title, Steps, etc.).
- **Given** le fichier contient 5000 lignes, **When** je lance l'import, **Then** une progress bar s'affiche et l'import se fait par batches de 200 (limite WIQL respectée). En cas d'erreur ligne par ligne, un rapport d'erreurs téléchargeable est produit.
- **Given** des doublons sont détectés (matching par titre + Area Path), **Then** je suis prompté pour : ignorer / mettre à jour / créer en doublon.

**Priorité :** 🔴 Haute

#### US-4.2 : Importer des résultats d'exécution depuis JUnit XML / Cucumber JSON

**En tant que** Mathieu, **je veux** que ma pipeline GitHub Actions remonte les résultats JUnit XML dans Argos **afin de** alimenter automatiquement le rapport.

**Critères d'acceptation :**

- **Given** je dispose d'un PAT et d'un fichier `junit.xml`, **When** j'exécute `testvault-cli upload-results --plan {planId} --file junit.xml --environment QA`, **Then** le CLI parse le XML, mappe chaque `<testcase>` vers un Test Case (matching par fully-qualified name ou tag custom `argos-id`), et crée des Test Executions avec les statuts correspondants.
- **Given** un test case du XML n'a pas de correspondance dans Argos, **Then** une option `--auto-create` permet de créer le Test Case en mode squelette (titre + reference XML) ; sinon il est skippé avec warning.
- **Given** le format est Cucumber JSON, **Then** la même logique s'applique avec mapping scenario → Test Case Gherkin.

**Priorité :** 🔴 Haute

#### US-4.3 : Recevoir des résultats CI en push via webhook (Cloud-Plus)

**En tant que** Mathieu (équipe Cloud), **je veux** que ma CI Jenkins poste directement les résultats à Argos sans passer par mon CLI **afin de** simplifier l'intégration.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault sur ADO Cloud, **When** je configure un webhook receiver dans Argos > Cloud-Plus > Webhooks, **Then** une URL unique est générée (ex: `https://api.argos.atconseil.io/v1/webhooks/{token}`) et un secret HMAC partagé est fourni.
- **Given** ma pipeline CI poste un payload JSON ou XML signé HMAC-SHA256, **When** la signature est valide, **Then** les résultats sont ingérés et apparaissent dans le Test Plan ciblé (paramètre URL `?planId=...`) sous 30 secondes.
- **Given** la signature est invalide, **Then** le payload est rejeté (401) et l'événement est journalisé dans `TestVaultAuditLog`.

**Priorité :** 🟡 Moyenne

#### US-4.4 : Exporter un Test Plan en PDF de release-readiness

**En tant que** Patricia, **je veux** un PDF synthétique d'un Test Plan **afin de** le présenter en Codir.

**Critères d'acceptation :**

- **Given** je suis Reader TestVault sur un Test Plan, **When** je clique "Export PDF", **Then** un PDF de 3-10 pages est généré avec : page de garde (logo ATConseil/Argos, nom du plan, date, owner), résumé exécutif (% pass/fail/blocked/unexecuted, par environment, par area path), liste des Test Cases avec dernier statut, anomalies critiques (Fail status), couverture des exigences.
- **Given** le projet a un logo custom configuré par l'Admin, **Then** le logo client remplace celui d'Argos sur la page de garde.

**Priorité :** 🟡 Moyenne

#### US-4.5 : Synchroniser les feature files Gherkin avec Azure Repos

**En tant que** Mathieu, **je veux** que mes `.feature` files dans Azure Repos soient automatiquement liés aux Test Cases Argos **afin d'** éviter la duplication.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault et j'ai configuré le mapping `repo:branch:path` vers un Area Path Argos, **When** un commit modifie un `.feature` file, **Then** un job (Cloud-Plus) ou un manuel sync (Server) crée/met à jour les Test Cases correspondants par scénario, conservant le contenu Gherkin dans le champ `gherkin` du Test Case.
- **Given** un scénario est supprimé du fichier, **Then** le Test Case correspondant est marqué "Deprecated" (champ d'état) et non supprimé automatiquement.

**Priorité :** 🟡 Moyenne

---

### Epic 5 — Cloud-Plus (AI BYOK & Jobs)

> Features Cloud-uniquement nécessitant un backend Azure Functions.

#### US-5.1 : Générer un squelette de Test Cases depuis une User Story (BYOK)

**En tant que** Mathieu, **je veux** qu'Argos me propose un set de Test Cases candidats à partir d'une User Story **afin de** gagner du temps sur le drafting.

**Critères d'acceptation :**

- **Given** je suis User TestVault sur ADO Cloud, l'AI est activée par l'Admin et la clé LLM BYOK est configurée, **When** je clique "Suggest Tests" sur une User Story dans la coverage panel, **Then** Argos appelle le LLM configuré (via Azure Functions ATConseil) avec le system prompt de l'Admin et le contenu de la User Story (titre, description, criteria d'acceptance).
- **Given** la génération aboutit, **Then** une preview interactive s'ouvre avec 3-7 Test Cases candidats (titre, steps, expected results) que je peux éditer, accepter individuellement ou en bloc, ou rejeter.
- **Given** j'accepte des Test Cases candidats, **Then** ils sont créés liés à la User Story (lien `Tested By`) et le quota AI mensuel de l'utilisateur est décrémenté.
- **Given** la clé LLM est invalide ou le quota est dépassé, **Then** un message clair s'affiche, l'opération est annulée, et un événement est journalisé.

**Priorité :** 🟡 Moyenne (premium feature)

#### US-5.2 : Détecter les Test Cases flaky (BYOK)

**En tant que** Mathieu, **je veux** identifier automatiquement les Test Cases dont les résultats varient sans changement de code **afin de** prioriser leur stabilisation.

**Critères d'acceptation :**

- **Given** je suis User TestVault et la feature est activée par l'Admin, **When** j'ouvre le rapport "Flakiness Detection", **Then** un job Cloud-Plus analyse les N dernières exécutions (configurable, défaut 50) de chaque Test Case par environment et calcule un score de flakiness (% de variation).
- **Given** le score d'un TC dépasse un seuil (configurable, défaut 15%), **Then** il est listé avec son score, ses dernières exécutions visibles, et une recommandation AI (générée via le LLM BYOK) sur les causes probables (timing, ordre des tests, dépendance externe).
- **Given** je marque un TC comme "Known Flaky", **Then** il sort du rapport jusqu'à ce que je relance manuellement l'analyse.

**Priorité :** 🟢 Basse (feature de polish)

---

### Epic 6 — Administration & Permissions

> Configuration de l'extension par les Admins, audit, gouvernance LLM.

#### US-6.1 : Installer le Custom Process Inheritance via wizard

**En tant que** Aïcha (Admin TestVault) installant Argos pour la première fois, **je veux** un wizard guidé pour créer le Custom Process **afin de** ne pas avoir à manipuler manuellement l'API Process d'ADO.

**Critères d'acceptation :**

- **Given** je suis Org/Collection Admin et j'installe Argos, **When** je clique "Get Started" pour la première fois, **Then** un wizard détecte les permissions admin requises et propose de créer un nouveau process inheritor (ou en sélectionner un existant) en l'enrichissant avec les Custom WIT TestVault.
- **Given** je n'ai pas les droits requis, **Then** le wizard explique précisément quelle permission manque et comment la demander, sans tenter l'opération qui échouerait.
- **Given** un process avec un schéma TestVault existe déjà (réinstallation), **Then** le wizard détecte la version du schéma et propose : ne rien faire / mettre à jour / créer un nouveau process.

**Priorité :** 🔴 Haute

#### US-6.2 : Configurer un fournisseur LLM (BYOK)

**En tant que** Aïcha (Admin), **je veux** ajouter ma clé API Azure OpenAI **afin d'** activer les features AI pour mon équipe.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault sur ADO Cloud, **When** je vais dans Settings > AI Providers, **Then** je peux ajouter un provider parmi : Anthropic, OpenAI, Azure OpenAI. Pour Azure OpenAI je saisis : endpoint, deployment name, API version, clé. La clé est testée immédiatement (call de validation light) et chiffrée au repos.
- **Given** la clé est invalide, **Then** un message d'erreur précis s'affiche (401, 404, network) et la clé n'est pas enregistrée.
- **Given** la clé est valide, **Then** elle est enregistrée chiffrée et l'événement est journalisé dans `TestVaultAuditLog` avec la clé tronquée (4 derniers caractères).
- **Given** plusieurs providers sont configurés, **Then** je peux assigner un provider par feature AI (TC generation, flakiness detection) et configurer un fallback.

**Priorité :** 🔴 Haute

#### US-6.3 : Définir des quotas AI par utilisateur

**En tant que** Aïcha, **je veux** limiter la consommation AI par utilisateur **afin de** maîtriser les coûts BYOK auprès de mon fournisseur LLM.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > AI Quotas, **Then** je définis : quota mensuel par user (en nombre d'appels OU en tokens estimés), seuil d'alerte (défaut 80%), et action au dépassement (block hard / soft warning).
- **Given** un user atteint 80% de son quota, **Then** une notification UI lui apparaît à sa prochaine action AI.
- **Given** un user atteint 100% en mode block, **Then** les features AI sont désactivées pour lui jusqu'au reset mensuel ; un user en mode warning continue mais avec bandeau persistant.

**Priorité :** 🟡 Moyenne

#### US-6.4 : Consulter l'audit trail des opérations Admin

**En tant que** Aïcha (ou auditeur externe), **je veux** consulter l'historique de toutes les opérations sensibles **afin de** garantir la traçabilité réglementaire.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > Audit Log, **Then** je vois la liste des `TestVaultAuditLog` filtrable par : auteur, date range, type d'opération, area path concerné. Pagination par 50.
- **Given** j'exporte le log, **Then** je peux télécharger un CSV ou JSON avec la totalité des entrées sur la période sélectionnée.
- **Given** la rétention configurée est de 24 mois, **Then** les entrées plus anciennes sont purgées (et la purge elle-même est loggée).

**Priorité :** 🔴 Haute

#### US-6.5 : Désactiver globalement l'AI au niveau organisation

**En tant que** Aïcha (en réponse à un audit RSSI), **je veux** désactiver d'un toggle toutes les features AI **afin de** stopper instantanément tout appel sortant.

**Critères d'acceptation :**

- **Given** je suis Admin TestVault, **When** je clique "Disable AI globally", **Then** une confirmation est demandée, et après validation tous les boutons AI dans l'UI deviennent désactivés/cachés en moins de 5 secondes pour tous les users.
- **Given** une opération AI est en cours, **Then** elle est annulée proprement (pas de fuite de données).
- **Given** la désactivation a été effectuée, **Then** l'événement est journalisé avec horodatage et auteur.

**Priorité :** 🔴 Haute

---

## 4. Features Détaillées

### F1 — Génération AI de Test Cases (BYOK)

**Description :** Argos appelle un LLM (configuré BYOK) pour générer des skeletons de Test Cases à partir du contenu d'une User Story ADO. La génération passe par les Azure Functions ATConseil (proxy d'orchestration) pour ne jamais exposer la clé API au navigateur.

**Entrées :** Work Item ADO source (User Story, Feature, Bug). System prompt configuré par l'Admin. Modèle configuré (claude-opus-4-7, gpt-5.2, etc.). Paramètres : temperature (défaut 0.3), max_tokens (défaut 4000), nombre de TC souhaités (1-10, défaut 5).

**Sorties :** Liste de Test Cases candidats avec titre, description, steps (`{action, expected}[]`), tags suggérés. Chaque TC est en preview éditable avant création.

**Règles métier :**

- L'utilisateur doit être User TestVault au minimum.
- L'AI doit être activée globalement par l'Admin (cf. US-6.5).
- Le quota mensuel de l'utilisateur ne doit pas être épuisé.
- Le user prompt construit envoyé au LLM contient : titre + description du Work Item, criteria d'acceptance s'ils existent. Aucune autre donnée du projet n'est envoyée (pas d'exfiltration latérale).
- La réponse du LLM doit être un JSON parsable correspondant à un schéma défini ; sinon retry avec un prompt de correction (max 1 retry).
- Aucune persistance Kisskool : le prompt complet et la réponse ne sortent pas du contexte d'exécution Azure Functions, sauf cache TTL ≤ 1h pour déduplication.

**Cas limites :**

- LLM provider down → message clair, fallback provider tenté si configuré, sinon abandon avec compteur de quota non décrémenté.
- Réponse malformée même après retry → erreur user-friendly + log technique pour debug.
- Work Item source vide ou trop court (< 50 caractères) → l'opération est refusée avec message.
- Quota atteint en cours d'opération → l'opération en cours se termine, les suivantes sont bloquées.

---

### F2 — Versioning par snapshots taggés

**Description :** Capture immutable de l'état d'un Test Case à un instant donné, sous la forme d'un Custom WI `TestCaseVersion` lié au TC parent. Permet de référencer une version précise dans un Test Plan figé.

**Entrées :** Test Case source. Nom du snapshot (unique par TC parent). Commentaire optionnel.

**Sorties :** Custom WI `TestCaseVersion` immutable avec snapshot complet des champs du TC à l'instant T.

**Règles métier :**

- Création explicite par utilisateur (jamais automatique sur sauvegarde).
- Création automatique opt-in au lock d'un Test Plan (cf. US-3.4).
- Le nom du snapshot doit être unique parmi les snapshots du même TC parent. Sensible à la casse.
- Une fois créé, immutable : aucun champ modifiable. Tentatives de modification sont refusées par les API et l'UI.
- Suppression interdite si une `TestExecution` archivée référence ce snapshot.

**Cas limites :**

- Test Case parent supprimé : les snapshots restent (orphelins) ; ils sont marqués "Orphan" dans l'UI mais conservent toute leur info.
- Migration de schéma majeure (vX → vX+1) : les anciens snapshots sont migrés en mode "best effort" avec rapport ; les champs disparus sont conservés en attribut legacy.
- Diff entre 2 snapshots ou snapshot vs current : implémenté côté client (algo de diff sur steps : LCS).

---

### F3 — Matrice de couverture des exigences

**Description :** Tableau croisé Work Items (User Stories, Bugs, Requirements) × Test Cases avec dans chaque cellule l'état d'exécution le plus récent par environment.

**Entrées :** Filtres : Area Path, Tags, Iteration Path, Environment, statut d'exécution.

**Sorties :** Tableau interactif paginé. Export Excel (mise en forme conditionnelle) ou PDF.

**Règles métier :**

- Les liens pris en compte : `Tested By`, `Validates`, `Covers` (entre User Story/Bug/Requirement et Test Case).
- Une cellule vide signifie : pas de lien établi (l'exigence n'est pas couverte par ce TC).
- Couleurs : vert (Pass), rouge (Fail), orange (Blocked), gris (Unexecuted), jaune (Skipped).
- Performance : si > 10 000 cellules, l'affichage utilise un virtual scrolling et l'export Excel se fait via un job de fond (Cloud-Plus) avec notification.

**Cas limites :**

- Plus de 100 000 Test Cases dans le scope : l'affichage warne, propose de filtrer, et l'export complet est refusé (suggérer le SDK pour les besoins programmatic).
- Work Items à l'état "Removed" dans ADO : exclus par défaut, optionnels via filtre.

---

### F4 — Wizard d'installation du Custom Process

**Description :** Au premier lancement de l'extension, un wizard guide l'Admin pour créer/sélectionner un Process Inheritance ADO et y injecter les Custom WIT requis.

**Étapes :**

1. Détection des permissions (Org/Collection Admin requis).
2. Choix : créer un nouveau Process Inheritance (depuis Agile, Scrum, ou CMMI) ou sélectionner un existant à enrichir.
3. Aperçu des Custom WIT qui seront créés/modifiés : `TestVault.TestCase`, `TestVault.TestPlan`, `TestVault.TestSet`, `TestVault.TestExecution`, `TestVault.Precondition`, `TestVault.TestCaseVersion`, `TestVault.TestVaultAuditLog`. Liste des champs custom et états.
4. Confirmation et exécution (appel API Process ADO).
5. Affectation du process aux projets cibles (multi-sélection).
6. Vérification post-install (smoke check).

**Cas limites :**

- Permission manquante : wizard arrêté avec message précis et lien vers la doc Microsoft.
- Conflit de nom (un process custom avec même nom existe) : prompt de renommage ou réutilisation.
- Reinstall avec schéma plus récent : détection version, proposition de migration documentée.

---

### F5 — Configuration LLM par l'Admin

**Description :** Interface Admin pour gérer les fournisseurs LLM, les modèles par feature, les system prompts, les quotas. Voir wireframe §7.

**Sections du panneau :**

- **Providers** : ajout/suppression Anthropic / OpenAI / Azure OpenAI. Saisie de la clé API. Bouton "Test connection".
- **Features** : pour chaque feature AI (TC Generation, Flakiness Detection), assigner un provider + modèle + paramètres (temperature, max_tokens, top_p) + provider de fallback.
- **Prompts** : édition des system prompts par feature, avec preview. Versioning des prompts (rollback possible).
- **Quotas** : par utilisateur, par projet, mensuels, en nombre d'appels ou en tokens. Mode hard/soft.
- **Global toggle** : on/off de toutes les features AI.

**Règles métier :**

- Toute opération est journalisée dans `TestVaultAuditLog`.
- Les clés API ne sont jamais affichées en clair (uniquement les 4 derniers caractères).
- Validation côté serveur : un provider doit avoir au moins 1 feature assignée pour être considéré actif.

---

## 5. Flux Utilisateur

### Flux 1 — Création d'un Test Plan

1. Aïcha clique sur l'onglet "Argos" du projet ADO.
2. Le système affiche le hub avec les sections : Test Plans, Test Cases, Test Sets, Reports, Settings.
3. Aïcha clique "New Test Plan".
4. Le système ouvre un formulaire : Name, Description, Iteration Path, Owner, Test Sets à inclure (sélection multiple), Test Cases supplémentaires (recherche + ajout), Environments cibles (multi-sélect).
5. Aïcha remplit, clique "Create".
6. Le système crée le `TestVault.TestPlan` Work Item, lie les Test Cases via `contains`, et redirige vers la vue détaillée.
7. **Résultat :** Test Plan visible avec sa composition, statut "Draft" et bouton "Lock for execution".

### Flux 2 — Exécution manuelle d'un Test Case avec evidence

1. Mathieu clique sur "Argos > My Test Plans" et sélectionne un plan en cours.
2. Le système affiche la liste des Test Cases avec leur statut courant par environment.
3. Mathieu clique "Run" sur un TC, sélectionne l'environment "QA".
4. Le système ouvre l'interface de run : preconditions affichées en haut, steps numérotés à droite, zone evidence à gauche.
5. Mathieu coche Pass/Fail/Blocked sur chaque step, ajoute des commentaires.
6. À l'étape 3, il observe un bug : il clique "Add evidence", capture un screenshot, l'upload (drag & drop).
7. Le système upload via API Attachments ADO native, affiche la preview, lie l'evidence au step 3.
8. Mathieu coche le step 3 en Fail, écrit le commentaire (obligatoire), continue.
9. Tous les steps marqués, Mathieu clique "Save Run".
10. Le système crée un `TestVault.TestExecution`, calcule le statut global (Fail), affiche un toast "Run saved. Status: Fail.".
11. Optionnel : Mathieu clique "Create Bug from Failure" pour créer un Work Item Bug ADO pré-rempli avec les detailes de la run.
12. **Résultat :** TestExecution archivée et immutable, bug ADO créé et lié, statut visible dans le Test Plan.

### Flux 3 — Import de résultats CI (JUnit XML)

1. Mathieu commit un push, GitHub Actions exécute la suite Cypress.
2. Étape finale du workflow : `npx @atconseil/testvault-cli upload-results --plan ${{ vars.PLAN_ID }} --file ./reports/junit.xml --environment QA --pat ${{ secrets.AZURE_DEVOPS_PAT }}`.
3. Le CLI parse le XML, identifie 47 testcases.
4. Pour chaque testcase, le CLI cherche le TC Argos correspondant (matching par fully-qualified name → champ custom `TestVault.AutomationKey`).
5. 45 matches trouvés, 2 non trouvés.
6. Le CLI crée 45 `TestVault.TestExecution` avec les statuts du XML, lie les Test Cases au Test Plan ciblé.
7. Pour les 2 non trouvés, le CLI loggue un warning et termine avec exit code 0 (sauf si `--strict` est spécifié).
8. Mathieu vérifie dans Argos UI que les exécutions sont bien apparues dans le Test Plan.
9. **Résultat :** Test Plan mis à jour avec 45 nouveaux résultats automatisés, traçables par environment et timestamp CI.

### Flux 4 — Génération du rapport TestPulse

1. Patricia clique sur "TestPulse" dans la nav ADO (extension co-installée).
2. TestPulse interroge le projet ADO via WIQL pour récupérer les `TestVault.*` Work Items (contrat schéma documenté).
3. TestPulse affiche un dashboard exécutif : KPIs de couverture, burndown de tests, distribution des Fails par area path, top 10 des bugs ouverts, tendance sur 30 jours.
4. Patricia filtre sur "Last release: Sprint-12".
5. Le dashboard se met à jour. Patricia clique "Export executive PDF".
6. TestPulse génère un PDF de 5 pages avec la mise en forme exécutive standard.
7. Patricia télécharge, transmet au COMEX.
8. **Résultat :** Reporting consolidé délivré sans intervention Test Manager.

---

## 6. Modèles de Données

### Custom Work Item Types (préfixe technique `TestVault.*` — cf. constitution §3.1)

```typescript
interface TestVaultTestCase {
  // Champs ADO standards
  id: number;
  title: string;
  description: string; // markdown, max 32 KB
  state: 'Design' | 'Ready' | 'Active' | 'Closed' | 'Deprecated';
  areaPath: string;
  iterationPath: string;
  tags: string[];
  assignedTo?: string;

  // Champs custom TestVault
  steps: TestStep[];
  priority: 1 | 2 | 3 | 4;
  automationStatus: 'Manual' | 'Planned' | 'Automated';
  automationKey?: string; // pour le mapping CI (fully-qualified name)
  gherkin?: string; // contenu BDD si applicable
  preconditionLinks: number[]; // Work Item IDs des Preconditions liées
  estimatedDuration?: number; // minutes

  // Audit
  createdBy: string;
  createdAt: string; // ISO 8601 UTC
  modifiedBy: string;
  modifiedAt: string;
}

interface TestStep {
  index: number;
  action: string; // markdown
  expected: string; // markdown
}

interface TestVaultTestCaseVersion {
  // Snapshot immutable d'un TestVaultTestCase
  id: number;
  parentTestCaseId: number;
  snapshotName: string; // unique par parent
  comment?: string;
  snapshotAt: string; // ISO UTC
  snapshotBy: string;

  // Copie figée des champs du parent au moment du snapshot
  frozenFields: TestVaultTestCase; // snapshot complet
}

interface TestVaultTestPlan {
  id: number;
  name: string;
  description: string;
  state: 'Draft' | 'Locked' | 'Closed';
  iterationPath: string;
  owner: string;
  environments: string[]; // string libres validés contre la liste configurée
  testSetIds: number[];
  additionalTestCaseIds: number[];
  lockedSnapshotIds?: number[]; // si state = Locked, snapshots utilisés
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
}

interface TestVaultTestSet {
  id: number;
  name: string;
  description: string;
  areaPath: string;
  tags: string[];
  testCaseIds: number[]; // composition statique
  wiqlQuery?: string; // composition dynamique alternative
}

interface TestVaultPrecondition {
  id: number;
  title: string;
  description: string; // markdown
  tags: string[];
  linkedTestCaseIds: number[]; // bidirectionnel
}

interface TestVaultTestExecution {
  id: number;
  testPlanId: number;
  testCaseId: number;
  testCaseVersionId?: number; // si plan locked, référence le snapshot
  environment: string;
  globalStatus: 'Pass' | 'Fail' | 'Blocked' | 'Unexecuted' | 'Skipped';
  stepResults: TestStepResult[];
  evidence: EvidenceRef[];
  executedBy: string;
  executedAt: string;
  durationSeconds?: number;
  bugLinks: number[]; // Work Item IDs des bugs créés
  source: 'Manual' | 'CI' | 'Webhook';
  ciMetadata?: {
    pipelineRunId: string;
    pipelineUrl: string;
    rawPayloadHash: string;
  };
  immutable: true; // une exécution sauvegardée n'est jamais modifiée
}

interface TestStepResult {
  stepIndex: number;
  status: 'Pass' | 'Fail' | 'Blocked' | 'Skipped';
  comment?: string;
  evidenceIds: string[]; // refs vers les attachments
}

interface EvidenceRef {
  attachmentId: string; // ID natif ADO
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface TestVaultAuditLog {
  id: number;
  actorUserId: string;
  actorDisplayName: string;
  timestampUtc: string;
  operation:
    | 'llm.provider.add'
    | 'llm.provider.update'
    | 'llm.provider.remove'
    | 'llm.feature.assign'
    | 'llm.prompt.update'
    | 'llm.quota.update'
    | 'llm.global.toggle'
    | 'license.update'
    | 'process.install'
    | 'process.update'
    | 'webhook.create'
    | 'webhook.delete'
    | 'feature_flag.update'
    | 'retention.update';
  oldValueAnonymized?: string; // jamais clé API en clair
  newValueAnonymized?: string;
  contextMetadata: Record<string, string>;
  immutable: true;
}
```

### ExtensionDataService (configuration légère, jamais données métier)

```typescript
interface OrgConfig {
  llmProviders: LLMProviderConfig[];
  llmFeatureMapping: { feature: string; providerId: string; modelId: string; params: ModelParams }[];
  llmGlobalEnabled: boolean;
  llmQuotas: { perUserMonthly: number; mode: 'hard' | 'soft'; alertThresholdPct: number };
  retentionDays: { audit: number; testExecutions: number; snapshots: number };
  featureFlags: Record<string, boolean>;
  licenseKey: string; // chiffré
  customLogoUrl?: string;
}

interface LLMProviderConfig {
  id: string;
  type: 'anthropic' | 'openai' | 'azure-openai';
  apiKeyEncrypted: string; // AES-256
  apiKeyMaskedSuffix: string; // "...wxyz" pour affichage
  endpoint?: string; // pour Azure OpenAI
  deploymentName?: string;
  apiVersion?: string;
  createdAt: string;
  createdBy: string;
}

interface ProjectConfig {
  environments: string[];
  defaultEnvironment?: string;
  bddSyncMappings: { repoUrl: string; branch: string; pathGlob: string; areaPath: string }[];
  ciIntegrations: { type: 'webhook'; token: string; planIdDefault?: number }[];
}

interface UserPreferences {
  defaultProjectId?: string;
  uiDensity: 'compact' | 'comfortable';
  shownTutorials: string[];
  recentTestPlans: number[];
}
```

---

## 7. Wireframes

### 7.1 Hub Argos (vue projet)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Azure DevOps  >  ProjetX  >  Argos                            🔍 ?  │
├──────────────┬──────────────────────────────────────────────────────┤
│              │  ┌──────────────────────────────────────────────┐    │
│ ▾ Argos      │  │  Test Plans actifs (8)         [+ New Plan]  │    │
│   ▸ Plans    │  │  ─────────────────────────────────────────   │    │
│   ▸ Cases    │  │  📋 Sprint-14 Release    Owner: Aïcha   85%  │    │
│   ▸ Sets     │  │  📋 Reg-Auth-2025-Q4     Owner: Mathieu 100% │    │
│   ▸ Precond. │  │  📋 Hotfix-Pay-Bug-1234  Owner: Aïcha   42%  │    │
│   ▸ Reports  │  │  ...                                          │    │
│              │  └──────────────────────────────────────────────┘    │
│ ▾ TestPulse  │                                                      │
│   ▸ Dashbrd  │  ┌──────────────────────────────────────────────┐    │
│   ▸ Trends   │  │  Recently failed (last 24h)                   │    │
│              │  │  ─────────────────────────────────────────    │    │
│ ▾ Settings   │  │  ❌ TC-1234 Login OAuth  by GH Actions  QA    │    │
│   ▸ AI       │  │  ❌ TC-2891 Cart redir   by Aïcha       Stg   │    │
│   ▸ Audit    │  │  ⚠️  TC-3401 Flaky?      auto-detected  QA    │    │
│   ▸ License  │  └──────────────────────────────────────────────┘    │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 7.2 Vue détaillée d'un Test Plan

```
┌─────────────────────────────────────────────────────────────────────┐
│ Argos > Test Plans > Sprint-14 Release             [Lock] [Export▾] │
├─────────────────────────────────────────────────────────────────────┤
│ Owner: Aïcha   Iter: Sprint-14   Envs: Dev, QA, Staging   State: ●  │
│ Coverage: 85% (138/162 executed)  Pass: 122  Fail: 12  Blocked: 4   │
├─────────────────────────────────────────────────────────────────────┤
│  Filter: [Area Path ▾] [Tag ▾] [Status ▾] [Env: QA ▾]    [Search🔍] │
│                                                                     │
│  Test Case                          Status   Last run    Env  Run▶  │
│  ─────────────────────────────────────────────────────────────────  │
│  ✅ TC-1100 Login w/ valid creds    Pass     2h ago     QA    [▶]   │
│  ❌ TC-1101 Login w/ invalid creds  Fail     1h ago     QA    [▶]   │
│  ⏸  TC-1102 Login OAuth Microsoft   Blocked  3h ago     QA    [▶]   │
│  ⚪ TC-1103 Logout cleanup          Unexec   —          —     [▶]   │
│  ✅ TC-1104 Pwd reset email flow    Pass     CI 30m ago QA    [▶]   │
│  ...                                                                │
│                                                            [1 ▾ /14]│
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Interface d'exécution manuelle

```
┌─────────────────────────────────────────────────────────────────────┐
│ Run: TC-1101 Login w/ invalid creds   Plan: Sprint-14   Env: QA ▾   │
├──────────────────────────────────┬──────────────────────────────────┤
│ ▶ Precondition                   │  Evidence                         │
│   User has no active session.    │  ┌──────────────────────────┐    │
│   App in clean state.            │  │ + Drop files or click    │    │
│                                  │  │   to upload              │    │
│ ▾ Steps (3)                      │  └──────────────────────────┘    │
│ ──────────────────────────────── │                                   │
│ 1. ✅ Open login page            │  📎 screenshot-step3.png 145 KB  │
│    Action: GET /login            │                                   │
│    Expected: 200 OK              │                                   │
│    Comment: ___________________  │                                   │
│                                  │                                   │
│ 2. ✅ Enter wrong password       │                                   │
│    Action: type "badpass" + Sub  │                                   │
│    Expected: error message       │                                   │
│                                  │                                   │
│ 3. ❌ Verify error displayed     │                                   │
│    Action: read element #err     │                                   │
│    Expected: "Invalid creds"     │                                   │
│    Comment: Got "Server err 500" │                                   │
│                                  │                                   │
│ ──────────────────────────────── │                                   │
│ Global: ❌ FAIL (1 step failed)  │                                   │
│ [Save Run]  [Cancel]  [+ Bug]    │                                   │
└──────────────────────────────────┴──────────────────────────────────┘
```

### 7.4 Settings — AI Providers & Features

```
┌─────────────────────────────────────────────────────────────────────┐
│ Argos Settings > AI                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ⚠ AI globally [ ENABLED ] (org-wide toggle)                        │
│                                                                     │
│  ▾ Providers (BYOK)                          [+ Add Provider]       │
│  ──────────────────────────────────────────────────────────────     │
│  • Anthropic (default)              key: ...wxyz   ✅ tested        │
│  • Azure OpenAI Enterprise (eu-w)   key: ...kr8s   ✅ tested        │
│                                                                     │
│  ▾ Feature Mapping                                                  │
│  ──────────────────────────────────────────────────────────────     │
│  • TC Generation:    Provider [Anthropic ▾]  Model [opus-4.7 ▾]     │
│                      Temp [0.3]  Max tokens [4000]   [Edit prompt]  │
│  • Flakiness AI:     Provider [Az OpenAI ▾]  Model [gpt-5.2 ▾]      │
│                      Temp [0.1]  Max tokens [2000]   [Edit prompt]  │
│                                                                     │
│  ▾ Quotas                                                           │
│  ──────────────────────────────────────────────────────────────     │
│  Per user / month:  [100] calls   Mode: [hard ▾]   Alert: [80%]     │
│                                                                     │
│                                                       [Save]        │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.5 Matrice de couverture exigences

```
┌─────────────────────────────────────────────────────────────────────┐
│ Argos > Reports > Traceability Matrix          [Export▾]            │
├─────────────────────────────────────────────────────────────────────┤
│  Filters: Area [Auth ▾]  Iter [Sprint-14 ▾]  Env [QA ▾]  [Apply]    │
│                                                                     │
│  Coverage: 87% (62/71 requirements covered by ≥1 passing TC)        │
├─────────────────────────────────────────────────────────────────────┤
│ Requirement\TC      TC-1100  TC-1101  TC-1102  TC-1103   TC-1104    │
│ ───────────────────────────────────────────────────────────────────│
│ US-2401 Login        ✅       ❌       ⏸                            │
│ US-2402 Logout                                  ⚪                  │
│ US-2403 Password                                          ✅        │
│ Bug-2891 OAuth bug   ✅       ❌                                    │
│ Req-SOX-04 Audit                                ⚪        ✅        │
│ ...                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Positionnement Différentiel

| Critère | **TestVault (Argos)** | **Xray (Jira)** | **Microsoft Test Plans natifs** | **Azure Test Plans (premium)** |
|---|---|---|---|---|
| Plateforme | ADO Cloud + Server 2022 | Jira Cloud + DC | ADO Cloud + Server (rudimentaire) | ADO Cloud uniquement |
| Stockage des données | Work Items natifs ADO (souverain) | Custom Jira issues | Test Plans natifs ADO | Test Plans natifs ADO |
| Souveraineté Server on-prem | ✅ | ✅ Xray DC (~très cher) | ✅ | ❌ |
| Référentiel TC / Plans / Sets | ✅ Complet | ✅ Référence | ⚠️ Limité (pas de Sets) | ✅ |
| Versioning par snapshots | ✅ Snapshots taggés | ✅ Test Versions | ❌ | ❌ |
| BDD / Gherkin natif + sync repo | ✅ | ✅ | ❌ | ❌ |
| Import CSV/Excel | ✅ | ✅ | ⚠️ Limité | ⚠️ Limité |
| Import JUnit/NUnit/xUnit/Cucumber | ✅ | ✅ | ⚠️ Partiel via Pipelines | ⚠️ Partiel |
| API publique + SDK + CLI | ✅ Open-source | ✅ Propriétaire | ⚠️ API ADO seule | ⚠️ API ADO seule |
| AI génération de TC | ✅ BYOK | ⚠️ Beta | ❌ | ❌ |
| AI flakiness detection | ✅ BYOK | ❌ | ❌ | ❌ |
| Reporting riche | ✅ via TestPulse | ✅ Dashboards Xray | ⚠️ Basique | ⚠️ Basique |
| Pricing Cloud (1 user) | ~18 €/mois Pro + Free tier | ~25-30 $/mois Cloud | inclus ADO Basic | ~52 €/mois |
| Pricing Server (1 user, perpétuel) | ~250 € + 20%/an | Xray DC ~très cher | inclus ADO Server | n/a |
| Free tier | ✅ 5 users / 500 TC | ❌ | ✅ inclus ADO | ❌ |

**Différenciateurs majeurs de TestVault (Argos) :**

1. **Le seul** qui couvre Cloud ET Server 2022 avec un VSIX unique, parité fonctionnelle stricte sur le cœur.
2. **Le seul** ADO-native avec versioning par snapshots et BDD/Gherkin natif synchronisé.
3. **Le seul** avec AI BYOK sur ADO (souveraineté des clés, pas de coût LLM mutualisé).
4. **Pricing Cloud -30% vs Xray** + Free tier sans CB pour évaluation sérieuse.
5. **Reporting via TestPulse** déjà publié et éprouvé sur le marché ADO.

---

## 9. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|---|---|
| Performance | cf. constitution §4 (CRUD < 500ms p95, plan < 3s p95, init < 2s) |
| Browsers supportés | Edge, Chrome, Firefox, Safari (2 dernières versions majeures) |
| Accessibilité | WCAG 2.1 AA pour les écrans principaux (hub, plans, run, traceability), WCAG 2.1 A pour les écrans Settings (utilisés par Admins technophiles) |
| Internationalisation | UI en anglais en v1. Architecture i18n prête (next-intl ou équivalent). FR + EN en v1.1. ES, DE, JA en v2. |
| Densité d'information | 2 modes (compact / confortable) configurables par user (préférence persistée) |
| Latence LLM | cf. constitution §4 (streaming dès 1er token, < 2s pour la 1ère réponse) |
| Hors-ligne | Mode lecture seule en cas de perte de connectivité ADO ; toute écriture est queueée et signalée à l'utilisateur |
| Accessibilité clavier | Tous les écrans navigables au clavier, raccourcis clavier documentés (`?` pour les afficher) |
| Mobile responsive | Hub et plans consultables en lecture sur mobile/tablette ; édition désactivée sur petit écran (< 768px) en v1 |
| Logging client | Pas de console.log en production, logs côté Cloud-Plus avec niveau (debug, info, warn, error), pas de PII |
| Erreurs visibles | Tout error dialog inclut un correlation ID copiable pour le support |
| Documentation | README.md + docs/user-guide.md + docs/api-reference.md (générée OpenAPI) + docs/sdk-reference.md, en synchronisation CI-bloquante (cf. constitution §10.2) |

---

> 📝 **Cross-references :** voir `constitution.md` v0.2.2 pour les contraintes immuables. `plan.md` (à venir) pour l'architecture technique. `tasks.md` (à venir) pour le découpage en phases d'implémentation.

> ⚠️ Toute modification de ce document requiert l'approbation explicite d'Alexandre Thibaud (ATConseil — atconseil.info).
