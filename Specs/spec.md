# SpÃ©cification â€” TestVault (Argos) v1.0

> Version 0.1.0 â€” 8 mai 2026
> SpÃ©cification fonctionnelle dÃ©taillÃ©e
> Auteur : Alexandre Thibaud â€” atconseil.info
> RÃ©fÃ©rence constitution : `constitution.md` v0.2.2

---

## Table des MatiÃ¨res

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Personas](#2-personas)
3. [Epics & User Stories](#3-epics--user-stories)
4. [Features DÃ©taillÃ©es](#4-features-dÃ©taillÃ©es)
5. [Flux Utilisateur](#5-flux-utilisateur)
6. [ModÃ¨les de DonnÃ©es](#6-modÃ¨les-de-donnÃ©es)
7. [Wireframes](#7-wireframes)
8. [Positionnement DiffÃ©rentiel](#8-positionnement-diffÃ©rentiel)
9. [Exigences Non-Fonctionnelles](#9-exigences-non-fonctionnelles)

---

## 1. Vue d'Ensemble

### ProblÃ¨me

Les Ã©quipes QA sur Azure DevOps disposent aujourd'hui de **Microsoft Test Plans natifs** (rudimentaire pour la gestion sÃ©rieuse) ou doivent recourir Ã  **Azure Test Plans** (licence dÃ©diÃ©e, ~52 â‚¬/user/mois, fonctionnellement limitÃ© face Ã  Xray sur Jira). Aucune extension du Marketplace ne couvre aujourd'hui le pÃ©rimÃ¨tre complet de Xray (rÃ©fÃ©rentiel, exÃ©cution, traÃ§abilitÃ©, BDD, versioning, intÃ©gration CI/CD, reporting) avec une vraie expÃ©rience moderne.

ConsÃ©quence : les Ã©quipes ADO sÃ©rieuses sur la qualitÃ© **migrent vers Jira+Xray** (perte d'intÃ©gration native ADO + Repos + Pipelines) ou bricolent avec des Excel partagÃ©s et des outils tiers non intÃ©grÃ©s. Les organisations ayant choisi ADO Server pour des raisons de souverainetÃ© sont d'autant plus pÃ©nalisÃ©es car peu d'outils QA modernes supportent l'on-premises.

### Solution

**TestVault** (commercialisÃ© sous le nom **Argos** sur le Visual Studio Marketplace, par le publisher **ATConseil**) est l'extension de test management qui apporte l'expÃ©rience Xray Ã  l'Ã©cosystÃ¨me Azure DevOps, avec paritÃ© fonctionnelle stricte Cloud / Server 2022 et stockage Work Items natif pour la souverainetÃ© des donnÃ©es.

**Promesse de valeur en 5 points :**

1. **RÃ©fÃ©rence ouverte** : Custom Work Items lisibles mÃªme sans l'extension installÃ©e.
2. **ParitÃ© Cloud/Server** : aucune fonctionnalitÃ© cÅ“ur n'est exclusive Ã  un environnement.
3. **Pricing -30% vs Xray Cloud** + Free tier sans CB pour Ã©valuation sÃ©rieuse.
4. **AI BYOK** : les features AI utilisent les clÃ©s LLM du client, jamais les nÃ´tres.
5. **Reporting riche** via TestPulse co-installable, dÃ©jÃ  Ã©prouvÃ© sur le marchÃ©.

### PÃ©rimÃ¨tre

**Inclus dans v1 :**

- RÃ©fÃ©rentiel : Test Cases, Test Plans, Test Sets, Preconditions (CRUD complet, clonage, templates)
- ExÃ©cution manuelle : statuts (Pass/Fail/Blocked/Unexecuted/Skipped), steps dÃ©taillÃ©s, evidence multi-fichiers, environments configurables
- TraÃ§abilitÃ© bidirectionnelle Work Items ADO â†” Test Cases, matrice de couverture exigences
- Versioning par snapshots taggÃ©s (immutable, comparable)
- Import : CSV, Excel, JUnit XML, NUnit XML, xUnit, TestNG, Cucumber JSON
- Export : Excel, PDF
- BDD/Gherkin : champ structurÃ© dans le TestCase + sync optionnelle vers `.feature` files dans Azure Repos
- Recherche WIQL + index local cÃ´tÃ© client + filtres rapides
- IntÃ©grations CI/CD : Azure Pipelines & GitHub Actions first-class ; Jenkins, GitLab CI, CircleCI via formats standard
- API publique : SDK npm `@atconseil/testvault-sdk` + CLI `testvault-cli`
- Cloud-Plus (Cloud uniquement) : gÃ©nÃ©ration AI de Test Cases (BYOK), dÃ©tection AI de flakiness (BYOK), webhooks CI externes, jobs planifiÃ©s
- Administration : rÃ´les Admin/User/Reader hÃ©ritÃ©s d'ADO, audit trail immutable, configuration fine LLM
- Wizard d'installation du Custom Process Inheritance

**Hors pÃ©rimÃ¨tre v1 (roadmap v2+) :**

- Multi-organisation cross-org consolidÃ©e dans l'UI (le SDK le permet dÃ©jÃ )
- Test exploratoire avec session recording
- Performance / load testing (Microsoft Azure Load Testing reste l'option)
- Test mobile cross-device (App Center, BrowserStack restent les options)
- Custom dashboards Argos (dÃ©lÃ©guer Ã  TestPulse)
- ADO Server 2020 (fin de mainstream, hors scope par dÃ©cision constitution Â§1)

---

## 2. Personas

### 2.1 AÃ¯cha â€” Test Manager

| | |
|---|---|
| **Profil** | 38 ans, 12 ans d'XP en QA dont 5 en management. Travaille pour une banque europÃ©enne avec ADO Server 2022 on-prem (souverainetÃ© rÃ©glementaire). Manage une Ã©quipe de 8 testeurs (2 SDET, 6 manuels). Fluent en SQL, Ã  l'aise avec WIQL, allergique au code TypeScript. |
| **Besoin principal** | Avoir une vue consolidÃ©e et fiable de l'Ã©tat de couverture qualitÃ© de chaque release, pouvoir rÃ©organiser rapidement les Test Plans selon les sprints. |
| **Frustration** | Microsoft Test Plans natifs sont visuellement datÃ©s et limitÃ©s sur la traÃ§abilitÃ©. Les Excel partagÃ©s deviennent ingÃ©rables au-delÃ  de 200 Test Cases. La banque a refusÃ© Xray Cloud (donnÃ©es hors UE), Xray DC est cher et non intÃ©grÃ© ADO. |
| **Objectif** | Maintenir une matrice de couverture vivante des exigences rÃ©glementaires, exporter des rapports de release-readiness pour le COMEX, garantir la traÃ§abilitÃ© auditable. |
| **FrÃ©quence d'usage** | Quotidienne (3-5h/jour pendant les phases de release) |
| **RÃ´le TestVault** | Admin TestVault (Project Administrator dans ADO) |

### 2.2 Mathieu â€” Dev SDET / Automatisation

| | |
|---|---|
| **Profil** | 29 ans, ingÃ©nieur logiciel orientÃ© qualitÃ© (SDET). Travaille pour une startup SaaS sur ADO Cloud. Ã‰crit des tests Cypress/Playwright et du Cucumber/Gherkin. Vit dans VS Code et le terminal. Ã€ l'aise avec GitHub Actions, npm, et l'API REST ADO. |
| **Besoin principal** | Que les rÃ©sultats automatisÃ©s de ses pipelines remontent automatiquement dans le rÃ©fÃ©rentiel de tests, avec une bonne traÃ§abilitÃ© vers les User Stories. DÃ©tecter rapidement les tests flaky qui font perdre du temps Ã  l'Ã©quipe. |
| **Frustration** | Les rÃ©sultats CI partent dans des artefacts JUnit XML que personne ne consulte vraiment. Les bugs causÃ©s par des tests flaky sont blÃ¢mÃ©s Ã  tort sur le code. Aucun outil ne dialogue proprement avec ADO Boards depuis sa CI. |
| **Objectif** | Automatiser la chaÃ®ne "TestCase â†’ exÃ©cution CI â†’ rapport â†’ bug filed â†’ traÃ§abilitÃ© Work Item". Tirer parti d'AI pour gÃ©nÃ©rer des skeletons de TestCases Ã  partir de User Stories. |
| **FrÃ©quence d'usage** | Plusieurs fois par jour (interactions courtes : check status, upload rÃ©sultats, recherche TC) |
| **RÃ´le TestVault** | User TestVault (Contributor dans ADO) |

### 2.3 Patricia â€” VP Quality

| | |
|---|---|
| **Profil** | 52 ans, VP Quality dans un groupe industriel cotÃ©. Reporte au CTO. Pas hands-on sur l'outillage. Lit des dashboards, parle aux Test Managers et au COMEX. Niveau Excel poussÃ©, lecture de PDF. |
| **Besoin principal** | KPI consolidÃ©s de qualitÃ© : taux de couverture des exigences critiques, dÃ©fauts ouverts par criticitÃ©, vÃ©locitÃ© QA, dette de tests. |
| **Frustration** | Les rapports remontent en Excel artisanaux d'un Test Manager diffÃ©rent par Ã©quipe, formats hÃ©tÃ©rogÃ¨nes, agrÃ©gation manuelle douloureuse. |
| **Objectif** | Avoir un dashboard exÃ©cutif unique et fiable accessible Ã  la demande, exportable en PDF pour les Codir. Identifier les zones de risque produit. |
| **FrÃ©quence d'usage** | Hebdomadaire (revue qualitÃ©) + ponctuellement avant Codir |
| **RÃ´le TestVault** | Reader TestVault (Reader dans ADO) ; consomme principalement TestPulse |

---

## 3. Epics & User Stories

### Epic 1 â€” RÃ©fÃ©rentiel de tests

> Constituer et maintenir l'arborescence de Test Cases, Test Sets, Test Plans, Preconditions du projet.

#### US-1.1 : CrÃ©er un Test Case

**En tant que** Mathieu (Dev SDET), **je veux** crÃ©er un Test Case structurÃ© (titre, description, steps, expected results, tags, area path) **afin de** documenter un cas de test exÃ©cutable.

**CritÃ¨res d'acceptation (Given/When/Then) :**

- **Given** je suis User TestVault sur un projet ADO, **When** je clique "New Test Case" depuis le hub Argos, **Then** un formulaire s'ouvre avec champs : Title (obligatoire, max 255 caractÃ¨res), Description (markdown, max 32 KB), Steps (liste ordonnÃ©e d'objets `{action, expected}`), Tags (multi-valeur), Area Path (sÃ©lecteur ADO natif), Iteration Path (optionnel), Priority (1-4).
- **Given** un Test Case est en Ã©dition, **When** j'ajoute un step, **Then** je peux rÃ©ordonner par drag & drop et chaque step accepte du markdown dans l'action et le rÃ©sultat attendu.
- **Given** je sauvegarde un Test Case sans titre, **Then** le formulaire affiche une erreur "Title is required" et n'enregistre pas.
- **Given** un Test Case est sauvegardÃ©, **When** je consulte la vue Work Item ADO native, **Then** le Test Case apparaÃ®t avec tous ses champs custom et son historique d'audit.

**PrioritÃ© :** ðŸ”´ Haute

#### US-1.2 : Organiser des Test Cases dans un Test Set

**En tant que** AÃ¯cha (Test Manager), **je veux** regrouper des Test Cases dans un Test Set thÃ©matique **afin de** structurer le rÃ©fÃ©rentiel par fonctionnalitÃ© ou risque.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin ou User TestVault, **When** je crÃ©e un Test Set, **Then** je peux y ajouter des Test Cases par sÃ©lection multiple, par WIQL query sauvegardÃ©e, ou par drag-and-drop depuis l'arborescence.
- **Given** un Test Case appartient Ã  plusieurs Test Sets, **Then** la modification du Test Case se reflÃ¨te immÃ©diatement dans tous les Test Sets qui le rÃ©fÃ©rencent (lien, pas copie).
- **Given** je supprime un Test Set, **Then** les Test Cases qu'il contenait ne sont pas supprimÃ©s (le Test Set est un agrÃ©gat, pas un conteneur).

**PrioritÃ© :** ðŸ”´ Haute

#### US-1.3 : CrÃ©er un Test Plan basÃ© sur des Test Sets et des Test Cases

**En tant que** AÃ¯cha, **je veux** assembler un Test Plan ciblÃ© sur une release ou un sprint **afin de** suivre l'effort de test pour cette livraison.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** je crÃ©e un Test Plan, **Then** je dÃ©finis : Name, Description, Iteration Path (sprint cible), Owner, Test Sets inclus, Test Cases supplÃ©mentaires, Environments cibles (multi-sÃ©lection depuis liste configurÃ©e par Admin).
- **Given** un Test Plan est figÃ© pour exÃ©cution, **When** je clique "Lock", **Then** un snapshot des versions actuelles de chaque Test Case est crÃ©Ã© automatiquement (cf. US-4.1) ; toute modification ultÃ©rieure d'un Test Case ne se rÃ©percute pas dans ce Test Plan.
- **Given** un Test Plan est verrouillÃ©, **When** un User tente de modifier sa composition, **Then** l'action est refusÃ©e avec message "Test Plan locked. Unlock to modify (Admin only)".

**PrioritÃ© :** ðŸ”´ Haute

#### US-1.4 : Cloner un Test Plan d'un projet Ã  un autre

**En tant que** AÃ¯cha, **je veux** cloner un Test Plan vers un autre projet ADO **afin de** rÃ©utiliser un patron de test entre Ã©quipes.

**CritÃ¨res d'acceptation :**

- **Given** un Test Plan source existe, **When** je clique "Clone to project...", **Then** je sÃ©lectionne le projet ADO cible (limitÃ© aux projets sur lesquels j'ai droit Contributor), je confirme, et un nouveau Test Plan est crÃ©Ã© avec ses Test Cases (clonÃ©s ou linkÃ©s selon mon choix) dans le projet cible.
- **Given** le clonage est en cours sur >100 Test Cases, **Then** une progress bar affiche l'avancement et le clonage est annulable.
- **Given** un Test Case avec un snapshot rÃ©fÃ©rencÃ© est clonÃ©, **Then** seule la derniÃ¨re version est clonÃ©e (les anciens snapshots ne migrent pas).

**PrioritÃ© :** ðŸŸ¡ Moyenne

#### US-1.5 : DÃ©finir et lier des Preconditions

**En tant que** Mathieu, **je veux** dÃ©finir des Preconditions rÃ©utilisables et les lier Ã  plusieurs Test Cases **afin d'** Ã©viter de dupliquer les Ã©tats de setup dans chaque test.

**CritÃ¨res d'acceptation :**

- **Given** je suis User TestVault, **When** je crÃ©e une Precondition, **Then** je dÃ©finis : Title, Description (markdown), Tags. Je peux la lier Ã  N Test Cases via le lien typed `precondition-of`.
- **Given** je consulte un Test Case avec une Precondition liÃ©e, **Then** la Precondition apparaÃ®t en prÃ©-amble dans la vue d'exÃ©cution.

**PrioritÃ© :** ðŸŸ¢ Basse

---

### Epic 2 â€” ExÃ©cution & Evidence

> ExÃ©cuter manuellement les tests, capturer les rÃ©sultats, attacher les preuves.

#### US-2.1 : ExÃ©cuter manuellement un Test Case et capturer les rÃ©sultats step par step

**En tant que** Mathieu, **je veux** dÃ©rouler un Test Case avec son interface dÃ©diÃ©e **afin de** capturer un Pass/Fail/Blocked/Skipped sur chaque step et un statut global.

**CritÃ¨res d'acceptation :**

- **Given** je suis User TestVault et un Test Plan m'est assignÃ©, **When** je clique "Run" sur un Test Case du Test Plan, **Then** une interface dÃ©diÃ©e s'ouvre montrant : Precondition (si liÃ©e), liste des steps avec checkbox de statut individuel (Pass/Fail/Blocked/Skipped), zone de commentaire par step, zone d'evidence par step.
- **Given** je marque un step en Fail, **When** je sauvegarde la run, **Then** un commentaire est obligatoire (validation UI) ; Ã  dÃ©faut, l'enregistrement est refusÃ©.
- **Given** tous les steps sont en Pass, **Then** le statut global du Test Case dans cette execution est automatiquement Pass. Si au moins un step est Fail, le statut global est Fail. Si au moins un step est Blocked sans aucun Fail, le statut global est Blocked.
- **Given** une exÃ©cution est terminÃ©e, **Then** elle est immutable et un nouvel essai requiert de "Re-run" (qui crÃ©e une nouvelle exÃ©cution liÃ©e Ã  la prÃ©cÃ©dente).

**PrioritÃ© :** ðŸ”´ Haute

#### US-2.2 : Attacher de l'evidence (screenshots, logs, vidÃ©os) Ã  une exÃ©cution

**En tant que** Mathieu, **je veux** attacher des fichiers de preuve Ã  une exÃ©cution **afin de** documenter ce qui a Ã©tÃ© observÃ©.

**CritÃ¨res d'acceptation :**

- **Given** je suis dans l'interface d'exÃ©cution, **When** je clique "Add evidence" sur un step ou globalement, **Then** je peux uploader : images (PNG, JPG, GIF, max 10 MB), documents (PDF, max 25 MB), logs texte (TXT, LOG, max 5 MB), vidÃ©os (MP4, WEBM, max 100 MB). Le stockage utilise l'API Attachments ADO native.
- **Given** un fichier dÃ©passe la limite de taille, **Then** un message clair indique la limite et le type acceptÃ©.
- **Given** une evidence est uploadÃ©e, **Then** elle est visible dans le dÃ©tail de l'exÃ©cution avec preview pour les images, lecteur intÃ©grÃ© pour les vidÃ©os, et lien de tÃ©lÃ©chargement pour les autres.

**PrioritÃ© :** ðŸ”´ Haute

#### US-2.3 : SÃ©lectionner un Environment cible avant exÃ©cution

**En tant que** AÃ¯cha, **je veux** que chaque exÃ©cution soit associÃ©e Ã  un Environment (Dev, QA, Staging, Prod) **afin de** distinguer les rÃ©sultats par environnement.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > Environments, **Then** je peux ajouter, modifier, supprimer des environments (string libres : "Dev", "QA-EU", "Staging-US", "Prod-DR").
- **Given** un User dÃ©marre une exÃ©cution, **When** l'interface de run s'ouvre, **Then** un sÃ©lecteur d'Environment est obligatoire (dropdown limitÃ© Ã  la liste configurÃ©e).
- **Given** je consulte un historique d'exÃ©cutions d'un Test Case, **Then** je peux filtrer par Environment et voir les statuts par environment cÃ´te Ã  cÃ´te.

**PrioritÃ© :** ðŸ”´ Haute

---

### Epic 3 â€” TraÃ§abilitÃ© & Versioning

> Lier les Test Cases aux exigences ADO et figer les versions Ã  des moments-clÃ©s.

#### US-3.1 : Lier un Test Case Ã  des Work Items (User Story, Bug, Requirement)

**En tant que** AÃ¯cha, **je veux** lier un Test Case aux Work Items qu'il couvre **afin de** maintenir une matrice de traÃ§abilitÃ© exigences â†” tests.

**CritÃ¨res d'acceptation :**

- **Given** je suis User TestVault sur un Test Case, **When** je clique "Link Work Item", **Then** je sÃ©lectionne un type de lien (`Tested By`, `Validates`, `Covers`) et un Work Item via la recherche standard ADO. Le lien est bidirectionnel.
- **Given** un Work Item liÃ© est supprimÃ© dans ADO, **Then** le lien est marquÃ© orphelin dans le Test Case et signalÃ© visuellement.
- **Given** je consulte une User Story dans ADO, **Then** un panneau "Test Coverage" affiche les Test Cases liÃ©s et leur statut d'exÃ©cution le plus rÃ©cent par environment.

**PrioritÃ© :** ðŸ”´ Haute

#### US-3.2 : Consulter la matrice de couverture exigences

**En tant que** Patricia, **je veux** une matrice montrant la couverture de chaque exigence par les Test Cases **afin de** identifier les zones Ã  risque non testÃ©es.

**CritÃ¨res d'acceptation :**

- **Given** je suis Reader TestVault ou plus, **When** j'ouvre la "Traceability Matrix" depuis le hub, **Then** je vois un tableau croisant Work Items (exigences) Ã— Test Cases avec dans chaque cellule : nombre d'exÃ©cutions, dernier statut, derniÃ¨re date.
- **Given** j'applique des filtres (Area Path, Tags, statut d'exÃ©cution, environment), **Then** la matrice se met Ã  jour instantanÃ©ment ou avec spinner si > 1000 cellules.
- **Given** j'exporte la matrice, **Then** je peux la tÃ©lÃ©charger en Excel (format `.xlsx`) ou PDF, avec mise en forme conditionnelle (rouge = Fail, vert = Pass, gris = Unexecuted).

**PrioritÃ© :** ðŸ”´ Haute

#### US-3.3 : CrÃ©er un snapshot d'un Test Case

**En tant que** AÃ¯cha, **je veux** figer la version actuelle d'un Test Case sous un nom (`v1.0`, `Sprint-12`, `Release-2025-Q4`) **afin de** garantir l'immutabilitÃ© de ce qui a Ã©tÃ© testÃ© pour cette release.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin ou User TestVault sur un Test Case, **When** je clique "Create Snapshot", **Then** je saisis un nom unique (par Test Case parent) et un commentaire optionnel. Un Custom WI `TestCaseVersion` est crÃ©Ã© avec une copie immutable des champs.
- **Given** un snapshot existe, **When** je tente de le modifier, **Then** l'UI refuse l'opÃ©ration et affiche "Snapshot is immutable".
- **Given** je consulte un Test Case, **Then** je vois la liste de ses snapshots avec date, auteur, et un bouton "Compare with current".
- **Given** je clique "Compare with current", **Then** un diff visuel s'affiche montrant les champs modifiÃ©s (titre, description, steps ajoutÃ©s/modifiÃ©s/supprimÃ©s, tags).

**PrioritÃ© :** ðŸ”´ Haute

#### US-3.4 : Snapshot automatique au lock d'un Test Plan

**En tant que** AÃ¯cha, **je veux** qu'un Test Plan verrouillÃ© fige automatiquement les versions actuelles de ses Test Cases **afin de** ne pas polluer le rÃ©fÃ©rentiel avec des snapshots manuels.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault et un Test Plan est en Ã©dition, **When** je clique "Lock", **Then** pour chaque Test Case du plan sans snapshot existant Ã  l'identique, un snapshot auto-nommÃ© `{TestPlanName}-Lock-{YYYYMMDD}` est crÃ©Ã©. Le Test Plan rÃ©fÃ©rence ce snapshot, pas le Test Case parent.
- **Given** un Admin a configurÃ© l'opt-out de cette feature, **Then** le lock du Test Plan ne crÃ©e pas de snapshot (l'admin assume).

**PrioritÃ© :** ðŸŸ¡ Moyenne

---

### Epic 4 â€” Import / Export / CI

> Faire entrer et sortir les donnÃ©es du systÃ¨me, intÃ©grer les pipelines CI.

#### US-4.1 : Importer des Test Cases depuis CSV ou Excel

**En tant que** AÃ¯cha, **je veux** importer un fichier Excel de Test Cases existants **afin de** migrer notre patrimoine sans tout ressaisir.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** j'ouvre l'import wizard et je dÃ©pose un fichier `.csv` ou `.xlsx`, **Then** un mapping interactif des colonnes vers les champs TestVault est proposÃ© (auto-dÃ©tection si headers standards : Title, Steps, etc.).
- **Given** le fichier contient 5000 lignes, **When** je lance l'import, **Then** une progress bar s'affiche et l'import se fait par batches de 200 (limite WIQL respectÃ©e). En cas d'erreur ligne par ligne, un rapport d'erreurs tÃ©lÃ©chargeable est produit.
- **Given** des doublons sont dÃ©tectÃ©s (matching par titre + Area Path), **Then** je suis promptÃ© pour : ignorer / mettre Ã  jour / crÃ©er en doublon.

**PrioritÃ© :** ðŸ”´ Haute

#### US-4.2 : Importer des rÃ©sultats d'exÃ©cution depuis JUnit XML / Cucumber JSON

**En tant que** Mathieu, **je veux** que ma pipeline GitHub Actions remonte les rÃ©sultats JUnit XML dans Argos **afin de** alimenter automatiquement le rapport.

**CritÃ¨res d'acceptation :**

- **Given** je dispose d'un PAT et d'un fichier `junit.xml`, **When** j'exÃ©cute `testvault-cli upload-results --plan {planId} --file junit.xml --environment QA`, **Then** le CLI parse le XML, mappe chaque `<testcase>` vers un Test Case (matching par fully-qualified name ou tag custom `argos-id`), et crÃ©e des Test Executions avec les statuts correspondants.
- **Given** un test case du XML n'a pas de correspondance dans Argos, **Then** une option `--auto-create` permet de crÃ©er le Test Case en mode squelette (titre + reference XML) ; sinon il est skippÃ© avec warning.
- **Given** le format est Cucumber JSON, **Then** la mÃªme logique s'applique avec mapping scenario â†’ Test Case Gherkin.

**PrioritÃ© :** ðŸ”´ Haute

#### US-4.3 : Recevoir des rÃ©sultats CI en push via webhook (Cloud-Plus)

**En tant que** Mathieu (Ã©quipe Cloud), **je veux** que ma CI Jenkins poste directement les rÃ©sultats Ã  Argos sans passer par mon CLI **afin de** simplifier l'intÃ©gration.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault sur ADO Cloud, **When** je configure un webhook receiver dans Argos > Cloud-Plus > Webhooks, **Then** une URL unique est gÃ©nÃ©rÃ©e (ex: `https://api.argos.atconseil.io/v1/webhooks/{token}`) et un secret HMAC partagÃ© est fourni.
- **Given** ma pipeline CI poste un payload JSON ou XML signÃ© HMAC-SHA256, **When** la signature est valide, **Then** les rÃ©sultats sont ingÃ©rÃ©s et apparaissent dans le Test Plan ciblÃ© (paramÃ¨tre URL `?planId=...`) sous 30 secondes.
- **Given** la signature est invalide, **Then** le payload est rejetÃ© (401) et l'Ã©vÃ©nement est journalisÃ© dans `TestVaultAuditLog`.

**PrioritÃ© :** ðŸŸ¡ Moyenne

#### US-4.4 : Exporter un Test Plan en PDF de release-readiness

**En tant que** Patricia, **je veux** un PDF synthÃ©tique d'un Test Plan **afin de** le prÃ©senter en Codir.

**CritÃ¨res d'acceptation :**

- **Given** je suis Reader TestVault sur un Test Plan, **When** je clique "Export PDF", **Then** un PDF de 3-10 pages est gÃ©nÃ©rÃ© avec : page de garde (logo ATConseil/Argos, nom du plan, date, owner), rÃ©sumÃ© exÃ©cutif (% pass/fail/blocked/unexecuted, par environment, par area path), liste des Test Cases avec dernier statut, anomalies critiques (Fail status), couverture des exigences.
- **Given** le projet a un logo custom configurÃ© par l'Admin, **Then** le logo client remplace celui d'Argos sur la page de garde.

**PrioritÃ© :** ðŸŸ¡ Moyenne

#### US-4.5 : Synchroniser les feature files Gherkin avec Azure Repos

**En tant que** Mathieu, **je veux** que mes `.feature` files dans Azure Repos soient automatiquement liÃ©s aux Test Cases Argos **afin d'** Ã©viter la duplication.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault et j'ai configurÃ© le mapping `repo:branch:path` vers un Area Path Argos, **When** un commit modifie un `.feature` file, **Then** un job (Cloud-Plus) ou un manuel sync (Server) crÃ©e/met Ã  jour les Test Cases correspondants par scÃ©nario, conservant le contenu Gherkin dans le champ `gherkin` du Test Case.
- **Given** un scÃ©nario est supprimÃ© du fichier, **Then** le Test Case correspondant est marquÃ© "Deprecated" (champ d'Ã©tat) et non supprimÃ© automatiquement.

**PrioritÃ© :** ðŸŸ¡ Moyenne

---

### Epic 5 â€” Cloud-Plus (AI BYOK & Jobs)

> Features Cloud-uniquement nÃ©cessitant un backend Azure Functions.

#### US-5.1 : GÃ©nÃ©rer un squelette de Test Cases depuis une User Story (BYOK)

**En tant que** Mathieu, **je veux** qu'Argos me propose un set de Test Cases candidats Ã  partir d'une User Story **afin de** gagner du temps sur le drafting.

**CritÃ¨res d'acceptation :**

- **Given** je suis User TestVault sur ADO Cloud, l'AI est activÃ©e par l'Admin et la clÃ© LLM BYOK est configurÃ©e, **When** je clique "Suggest Tests" sur une User Story dans la coverage panel, **Then** Argos appelle le LLM configurÃ© (via Azure Functions ATConseil) avec le system prompt de l'Admin et le contenu de la User Story (titre, description, criteria d'acceptance).
- **Given** la gÃ©nÃ©ration aboutit, **Then** une preview interactive s'ouvre avec 3-7 Test Cases candidats (titre, steps, expected results) que je peux Ã©diter, accepter individuellement ou en bloc, ou rejeter.
- **Given** j'accepte des Test Cases candidats, **Then** ils sont crÃ©Ã©s liÃ©s Ã  la User Story (lien `Tested By`) et le quota AI mensuel de l'utilisateur est dÃ©crÃ©mentÃ©.
- **Given** la clÃ© LLM est invalide ou le quota est dÃ©passÃ©, **Then** un message clair s'affiche, l'opÃ©ration est annulÃ©e, et un Ã©vÃ©nement est journalisÃ©.

**PrioritÃ© :** ðŸŸ¡ Moyenne (premium feature)

#### US-5.2 : DÃ©tecter les Test Cases flaky (BYOK)

**En tant que** Mathieu, **je veux** identifier automatiquement les Test Cases dont les rÃ©sultats varient sans changement de code **afin de** prioriser leur stabilisation.

**CritÃ¨res d'acceptation :**

- **Given** je suis User TestVault et la feature est activÃ©e par l'Admin, **When** j'ouvre le rapport "Flakiness Detection", **Then** un job Cloud-Plus analyse les N derniÃ¨res exÃ©cutions (configurable, dÃ©faut 50) de chaque Test Case par environment et calcule un score de flakiness (% de variation).
- **Given** le score d'un TC dÃ©passe un seuil (configurable, dÃ©faut 15%), **Then** il est listÃ© avec son score, ses derniÃ¨res exÃ©cutions visibles, et une recommandation AI (gÃ©nÃ©rÃ©e via le LLM BYOK) sur les causes probables (timing, ordre des tests, dÃ©pendance externe).
- **Given** je marque un TC comme "Known Flaky", **Then** il sort du rapport jusqu'Ã  ce que je relance manuellement l'analyse.

**PrioritÃ© :** ðŸŸ¢ Basse (feature de polish)

---

### Epic 6 â€” Administration & Permissions

> Configuration de l'extension par les Admins, audit, gouvernance LLM.

#### US-6.1 : Installer le Custom Process Inheritance via wizard

**En tant que** AÃ¯cha (Admin TestVault) installant Argos pour la premiÃ¨re fois, **je veux** un wizard guidÃ© pour crÃ©er le Custom Process **afin de** ne pas avoir Ã  manipuler manuellement l'API Process d'ADO.

**CritÃ¨res d'acceptation :**

- **Given** je suis Org/Collection Admin et j'installe Argos, **When** je clique "Get Started" pour la premiÃ¨re fois, **Then** un wizard dÃ©tecte les permissions admin requises et propose de crÃ©er un nouveau process inheritor (ou en sÃ©lectionner un existant) en l'enrichissant avec les Custom WIT TestVault.
- **Given** je n'ai pas les droits requis, **Then** le wizard explique prÃ©cisÃ©ment quelle permission manque et comment la demander, sans tenter l'opÃ©ration qui Ã©chouerait.
- **Given** un process avec un schÃ©ma TestVault existe dÃ©jÃ  (rÃ©installation), **Then** le wizard dÃ©tecte la version du schÃ©ma et propose : ne rien faire / mettre Ã  jour / crÃ©er un nouveau process.

**PrioritÃ© :** ðŸ”´ Haute

#### US-6.2 : Configurer un fournisseur LLM (BYOK)

**En tant que** AÃ¯cha (Admin), **je veux** ajouter ma clÃ© API Azure OpenAI **afin d'** activer les features AI pour mon Ã©quipe.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault sur ADO Cloud, **When** je vais dans Settings > AI Providers, **Then** je peux ajouter un provider parmi : Anthropic, OpenAI, Azure OpenAI. Pour Azure OpenAI je saisis : endpoint, deployment name, API version, clÃ©. La clÃ© est testÃ©e immÃ©diatement (call de validation light) et chiffrÃ©e au repos.
- **Given** la clÃ© est invalide, **Then** un message d'erreur prÃ©cis s'affiche (401, 404, network) et la clÃ© n'est pas enregistrÃ©e.
- **Given** la clÃ© est valide, **Then** elle est enregistrÃ©e chiffrÃ©e et l'Ã©vÃ©nement est journalisÃ© dans `TestVaultAuditLog` avec la clÃ© tronquÃ©e (4 derniers caractÃ¨res).
- **Given** plusieurs providers sont configurÃ©s, **Then** je peux assigner un provider par feature AI (TC generation, flakiness detection) et configurer un fallback.

**PrioritÃ© :** ðŸ”´ Haute

#### US-6.3 : DÃ©finir des quotas AI par utilisateur

**En tant que** AÃ¯cha, **je veux** limiter la consommation AI par utilisateur **afin de** maÃ®triser les coÃ»ts BYOK auprÃ¨s de mon fournisseur LLM.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > AI Quotas, **Then** je dÃ©finis : quota mensuel par user (en nombre d'appels OU en tokens estimÃ©s), seuil d'alerte (dÃ©faut 80%), et action au dÃ©passement (block hard / soft warning).
- **Given** un user atteint 80% de son quota, **Then** une notification UI lui apparaÃ®t Ã  sa prochaine action AI.
- **Given** un user atteint 100% en mode block, **Then** les features AI sont dÃ©sactivÃ©es pour lui jusqu'au reset mensuel ; un user en mode warning continue mais avec bandeau persistant.

**PrioritÃ© :** ðŸŸ¡ Moyenne

#### US-6.4 : Consulter l'audit trail des opÃ©rations Admin

**En tant que** AÃ¯cha (ou auditeur externe), **je veux** consulter l'historique de toutes les opÃ©rations sensibles **afin de** garantir la traÃ§abilitÃ© rÃ©glementaire.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** je vais dans Settings > Audit Log, **Then** je vois la liste des `TestVaultAuditLog` filtrable par : auteur, date range, type d'opÃ©ration, area path concernÃ©. Pagination par 50.
- **Given** j'exporte le log, **Then** je peux tÃ©lÃ©charger un CSV ou JSON avec la totalitÃ© des entrÃ©es sur la pÃ©riode sÃ©lectionnÃ©e.
- **Given** la rÃ©tention configurÃ©e est de 24 mois, **Then** les entrÃ©es plus anciennes sont purgÃ©es (et la purge elle-mÃªme est loggÃ©e).

**PrioritÃ© :** ðŸ”´ Haute

#### US-6.5 : DÃ©sactiver globalement l'AI au niveau organisation

**En tant que** AÃ¯cha (en rÃ©ponse Ã  un audit RSSI), **je veux** dÃ©sactiver d'un toggle toutes les features AI **afin de** stopper instantanÃ©ment tout appel sortant.

**CritÃ¨res d'acceptation :**

- **Given** je suis Admin TestVault, **When** je clique "Disable AI globally", **Then** une confirmation est demandÃ©e, et aprÃ¨s validation tous les boutons AI dans l'UI deviennent dÃ©sactivÃ©s/cachÃ©s en moins de 5 secondes pour tous les users.
- **Given** une opÃ©ration AI est en cours, **Then** elle est annulÃ©e proprement (pas de fuite de donnÃ©es).
- **Given** la dÃ©sactivation a Ã©tÃ© effectuÃ©e, **Then** l'Ã©vÃ©nement est journalisÃ© avec horodatage et auteur.

**PrioritÃ© :** ðŸ”´ Haute

---

## 4. Features DÃ©taillÃ©es

### F1 â€” GÃ©nÃ©ration AI de Test Cases (BYOK)

**Description :** Argos appelle un LLM (configurÃ© BYOK) pour gÃ©nÃ©rer des skeletons de Test Cases Ã  partir du contenu d'une User Story ADO. La gÃ©nÃ©ration passe par les Azure Functions ATConseil (proxy d'orchestration) pour ne jamais exposer la clÃ© API au navigateur.

**EntrÃ©es :** Work Item ADO source (User Story, Feature, Bug). System prompt configurÃ© par l'Admin. ModÃ¨le configurÃ© (claude-opus-4-7, gpt-5.2, etc.). ParamÃ¨tres : temperature (dÃ©faut 0.3), max_tokens (dÃ©faut 4000), nombre de TC souhaitÃ©s (1-10, dÃ©faut 5).

**Sorties :** Liste de Test Cases candidats avec titre, description, steps (`{action, expected}[]`), tags suggÃ©rÃ©s. Chaque TC est en preview Ã©ditable avant crÃ©ation.

**RÃ¨gles mÃ©tier :**

- L'utilisateur doit Ãªtre User TestVault au minimum.
- L'AI doit Ãªtre activÃ©e globalement par l'Admin (cf. US-6.5).
- Le quota mensuel de l'utilisateur ne doit pas Ãªtre Ã©puisÃ©.
- Le user prompt construit envoyÃ© au LLM contient : titre + description du Work Item, criteria d'acceptance s'ils existent. Aucune autre donnÃ©e du projet n'est envoyÃ©e (pas d'exfiltration latÃ©rale).
- La rÃ©ponse du LLM doit Ãªtre un JSON parsable correspondant Ã  un schÃ©ma dÃ©fini ; sinon retry avec un prompt de correction (max 1 retry).
- Aucune persistance Kisskool : le prompt complet et la rÃ©ponse ne sortent pas du contexte d'exÃ©cution Azure Functions, sauf cache TTL â‰¤ 1h pour dÃ©duplication.

**Cas limites :**

- LLM provider down â†’ message clair, fallback provider tentÃ© si configurÃ©, sinon abandon avec compteur de quota non dÃ©crÃ©mentÃ©.
- RÃ©ponse malformÃ©e mÃªme aprÃ¨s retry â†’ erreur user-friendly + log technique pour debug.
- Work Item source vide ou trop court (< 50 caractÃ¨res) â†’ l'opÃ©ration est refusÃ©e avec message.
- Quota atteint en cours d'opÃ©ration â†’ l'opÃ©ration en cours se termine, les suivantes sont bloquÃ©es.

---

### F2 â€” Versioning par snapshots taggÃ©s

**Description :** Capture immutable de l'Ã©tat d'un Test Case Ã  un instant donnÃ©, sous la forme d'un Custom WI `TestCaseVersion` liÃ© au TC parent. Permet de rÃ©fÃ©rencer une version prÃ©cise dans un Test Plan figÃ©.

**EntrÃ©es :** Test Case source. Nom du snapshot (unique par TC parent). Commentaire optionnel.

**Sorties :** Custom WI `TestCaseVersion` immutable avec snapshot complet des champs du TC Ã  l'instant T.

**RÃ¨gles mÃ©tier :**

- CrÃ©ation explicite par utilisateur (jamais automatique sur sauvegarde).
- CrÃ©ation automatique opt-in au lock d'un Test Plan (cf. US-3.4).
- Le nom du snapshot doit Ãªtre unique parmi les snapshots du mÃªme TC parent. Sensible Ã  la casse.
- Une fois crÃ©Ã©, immutable : aucun champ modifiable. Tentatives de modification sont refusÃ©es par les API et l'UI.
- Suppression interdite si une `TestExecution` archivÃ©e rÃ©fÃ©rence ce snapshot.

**Cas limites :**

- Test Case parent supprimÃ© : les snapshots restent (orphelins) ; ils sont marquÃ©s "Orphan" dans l'UI mais conservent toute leur info.
- Migration de schÃ©ma majeure (vX â†’ vX+1) : les anciens snapshots sont migrÃ©s en mode "best effort" avec rapport ; les champs disparus sont conservÃ©s en attribut legacy.
- Diff entre 2 snapshots ou snapshot vs current : implÃ©mentÃ© cÃ´tÃ© client (algo de diff sur steps : LCS).

---

### F3 â€” Matrice de couverture des exigences

**Description :** Tableau croisÃ© Work Items (User Stories, Bugs, Requirements) Ã— Test Cases avec dans chaque cellule l'Ã©tat d'exÃ©cution le plus rÃ©cent par environment.

**EntrÃ©es :** Filtres : Area Path, Tags, Iteration Path, Environment, statut d'exÃ©cution.

**Sorties :** Tableau interactif paginÃ©. Export Excel (mise en forme conditionnelle) ou PDF.

**RÃ¨gles mÃ©tier :**

- Les liens pris en compte : `Tested By`, `Validates`, `Covers` (entre User Story/Bug/Requirement et Test Case).
- Une cellule vide signifie : pas de lien Ã©tabli (l'exigence n'est pas couverte par ce TC).
- Couleurs : vert (Pass), rouge (Fail), orange (Blocked), gris (Unexecuted), jaune (Skipped).
- Performance : si > 10 000 cellules, l'affichage utilise un virtual scrolling et l'export Excel se fait via un job de fond (Cloud-Plus) avec notification.

**Cas limites :**

- Plus de 100 000 Test Cases dans le scope : l'affichage warne, propose de filtrer, et l'export complet est refusÃ© (suggÃ©rer le SDK pour les besoins programmatic).
- Work Items Ã  l'Ã©tat "Removed" dans ADO : exclus par dÃ©faut, optionnels via filtre.

---

### F4 â€” Wizard d'installation du Custom Process

**Description :** Au premier lancement de l'extension, un wizard guide l'Admin pour crÃ©er/sÃ©lectionner un Process Inheritance ADO et y injecter les Custom WIT requis.

**Ã‰tapes :**

1. DÃ©tection des permissions (Org/Collection Admin requis).
2. Choix : crÃ©er un nouveau Process Inheritance (depuis Agile, Scrum, ou CMMI) ou sÃ©lectionner un existant Ã  enrichir.
3. AperÃ§u des Custom WIT qui seront crÃ©Ã©s/modifiÃ©s : `TestVault.TestCase`, `TestVault.TestPlan`, `TestVault.TestSet`, `TestVault.TestExecution`, `TestVault.Precondition`, `TestVault.TestCaseVersion`, `TestVault.TestVaultAuditLog`. Liste des champs custom et Ã©tats.
4. Confirmation et exÃ©cution (appel API Process ADO).
5. Affectation du process aux projets cibles (multi-sÃ©lection).
6. VÃ©rification post-install (smoke check).

**Cas limites :**

- Permission manquante : wizard arrÃªtÃ© avec message prÃ©cis et lien vers la doc Microsoft.
- Conflit de nom (un process custom avec mÃªme nom existe) : prompt de renommage ou rÃ©utilisation.
- Reinstall avec schÃ©ma plus rÃ©cent : dÃ©tection version, proposition de migration documentÃ©e.

---

### F5 â€” Configuration LLM par l'Admin

**Description :** Interface Admin pour gÃ©rer les fournisseurs LLM, les modÃ¨les par feature, les system prompts, les quotas. Voir wireframe Â§7.

**Sections du panneau :**

- **Providers** : ajout/suppression Anthropic / OpenAI / Azure OpenAI. Saisie de la clÃ© API. Bouton "Test connection".
- **Features** : pour chaque feature AI (TC Generation, Flakiness Detection), assigner un provider + modÃ¨le + paramÃ¨tres (temperature, max_tokens, top_p) + provider de fallback.
- **Prompts** : Ã©dition des system prompts par feature, avec preview. Versioning des prompts (rollback possible).
- **Quotas** : par utilisateur, par projet, mensuels, en nombre d'appels ou en tokens. Mode hard/soft.
- **Global toggle** : on/off de toutes les features AI.

**RÃ¨gles mÃ©tier :**

- Toute opÃ©ration est journalisÃ©e dans `TestVaultAuditLog`.
- Les clÃ©s API ne sont jamais affichÃ©es en clair (uniquement les 4 derniers caractÃ¨res).
- Validation cÃ´tÃ© serveur : un provider doit avoir au moins 1 feature assignÃ©e pour Ãªtre considÃ©rÃ© actif.

---

## 5. Flux Utilisateur

### Flux 1 â€” CrÃ©ation d'un Test Plan

1. AÃ¯cha clique sur l'onglet "Argos" du projet ADO.
2. Le systÃ¨me affiche le hub avec les sections : Test Plans, Test Cases, Test Sets, Reports, Settings.
3. AÃ¯cha clique "New Test Plan".
4. Le systÃ¨me ouvre un formulaire : Name, Description, Iteration Path, Owner, Test Sets Ã  inclure (sÃ©lection multiple), Test Cases supplÃ©mentaires (recherche + ajout), Environments cibles (multi-sÃ©lect).
5. AÃ¯cha remplit, clique "Create".
6. Le systÃ¨me crÃ©e le `TestVault.TestPlan` Work Item, lie les Test Cases via `contains`, et redirige vers la vue dÃ©taillÃ©e.
7. **RÃ©sultat :** Test Plan visible avec sa composition, statut "Draft" et bouton "Lock for execution".

### Flux 2 â€” ExÃ©cution manuelle d'un Test Case avec evidence

1. Mathieu clique sur "Argos > My Test Plans" et sÃ©lectionne un plan en cours.
2. Le systÃ¨me affiche la liste des Test Cases avec leur statut courant par environment.
3. Mathieu clique "Run" sur un TC, sÃ©lectionne l'environment "QA".
4. Le systÃ¨me ouvre l'interface de run : preconditions affichÃ©es en haut, steps numÃ©rotÃ©s Ã  droite, zone evidence Ã  gauche.
5. Mathieu coche Pass/Fail/Blocked sur chaque step, ajoute des commentaires.
6. Ã€ l'Ã©tape 3, il observe un bug : il clique "Add evidence", capture un screenshot, l'upload (drag & drop).
7. Le systÃ¨me upload via API Attachments ADO native, affiche la preview, lie l'evidence au step 3.
8. Mathieu coche le step 3 en Fail, Ã©crit le commentaire (obligatoire), continue.
9. Tous les steps marquÃ©s, Mathieu clique "Save Run".
10. Le systÃ¨me crÃ©e un `TestVault.TestExecution`, calcule le statut global (Fail), affiche un toast "Run saved. Status: Fail.".
11. Optionnel : Mathieu clique "Create Bug from Failure" pour crÃ©er un Work Item Bug ADO prÃ©-rempli avec les detailes de la run.
12. **RÃ©sultat :** TestExecution archivÃ©e et immutable, bug ADO crÃ©Ã© et liÃ©, statut visible dans le Test Plan.

### Flux 3 â€” Import de rÃ©sultats CI (JUnit XML)

1. Mathieu commit un push, GitHub Actions exÃ©cute la suite Cypress.
2. Ã‰tape finale du workflow : `npx @atconseil/testvault-cli upload-results --plan ${{ vars.PLAN_ID }} --file ./reports/junit.xml --environment QA --pat ${{ secrets.AZURE_DEVOPS_PAT }}`.
3. Le CLI parse le XML, identifie 47 testcases.
4. Pour chaque testcase, le CLI cherche le TC Argos correspondant (matching par fully-qualified name â†’ champ custom `TestVault.AutomationKey`).
5. 45 matches trouvÃ©s, 2 non trouvÃ©s.
6. Le CLI crÃ©e 45 `TestVault.TestExecution` avec les statuts du XML, lie les Test Cases au Test Plan ciblÃ©.
7. Pour les 2 non trouvÃ©s, le CLI loggue un warning et termine avec exit code 0 (sauf si `--strict` est spÃ©cifiÃ©).
8. Mathieu vÃ©rifie dans Argos UI que les exÃ©cutions sont bien apparues dans le Test Plan.
9. **RÃ©sultat :** Test Plan mis Ã  jour avec 45 nouveaux rÃ©sultats automatisÃ©s, traÃ§ables par environment et timestamp CI.

### Flux 4 â€” GÃ©nÃ©ration du rapport TestPulse

1. Patricia clique sur "TestPulse" dans la nav ADO (extension co-installÃ©e).
2. TestPulse interroge le projet ADO via WIQL pour rÃ©cupÃ©rer les `TestVault.*` Work Items (contrat schÃ©ma documentÃ©).
3. TestPulse affiche un dashboard exÃ©cutif : KPIs de couverture, burndown de tests, distribution des Fails par area path, top 10 des bugs ouverts, tendance sur 30 jours.
4. Patricia filtre sur "Last release: Sprint-12".
5. Le dashboard se met Ã  jour. Patricia clique "Export executive PDF".
6. TestPulse gÃ©nÃ¨re un PDF de 5 pages avec la mise en forme exÃ©cutive standard.
7. Patricia tÃ©lÃ©charge, transmet au COMEX.
8. **RÃ©sultat :** Reporting consolidÃ© dÃ©livrÃ© sans intervention Test Manager.

---

## 6. ModÃ¨les de DonnÃ©es

### Custom Work Item Types (prÃ©fixe technique `TestVault.*` â€” cf. constitution Â§3.1)

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
  preconditionLinks: number[]; // Work Item IDs des Preconditions liÃ©es
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

  // Copie figÃ©e des champs du parent au moment du snapshot
  frozenFields: TestVaultTestCase; // snapshot complet
}

interface TestVaultTestPlan {
  id: number;
  name: string;
  description: string;
  state: 'Draft' | 'Locked' | 'Closed';
  iterationPath: string;
  owner: string;
  environments: string[]; // string libres validÃ©s contre la liste configurÃ©e
  testSetIds: number[];
  additionalTestCaseIds: number[];
  lockedSnapshotIds?: number[]; // si state = Locked, snapshots utilisÃ©s
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
  testCaseVersionId?: number; // si plan locked, rÃ©fÃ©rence le snapshot
  environment: string;
  globalStatus: 'Pass' | 'Fail' | 'Blocked' | 'Unexecuted' | 'Skipped';
  stepResults: TestStepResult[];
  evidence: EvidenceRef[];
  executedBy: string;
  executedAt: string;
  durationSeconds?: number;
  bugLinks: number[]; // Work Item IDs des bugs crÃ©Ã©s
  source: 'Manual' | 'CI' | 'Webhook';
  ciMetadata?: {
    pipelineRunId: string;
    pipelineUrl: string;
    rawPayloadHash: string;
  };
  immutable: true; // une exÃ©cution sauvegardÃ©e n'est jamais modifiÃ©e
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
  oldValueAnonymized?: string; // jamais clÃ© API en clair
  newValueAnonymized?: string;
  contextMetadata: Record<string, string>;
  immutable: true;
}
```

### ExtensionDataService (configuration lÃ©gÃ¨re, jamais donnÃ©es mÃ©tier)

```typescript
interface OrgConfig {
  llmProviders: LLMProviderConfig[];
  llmFeatureMapping: { feature: string; providerId: string; modelId: string; params: ModelParams }[];
  llmGlobalEnabled: boolean;
  llmQuotas: { perUserMonthly: number; mode: 'hard' | 'soft'; alertThresholdPct: number };
  retentionDays: { audit: number; testExecutions: number; snapshots: number };
  featureFlags: Record<string, boolean>;
  licenseKey: string; // chiffrÃ©
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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Azure DevOps  >  ProjetX  >  Argos                            ðŸ” ?  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚              â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚ â–¾ Argos      â”‚  â”‚  Test Plans actifs (8)         [+ New Plan]  â”‚    â”‚
â”‚   â–¸ Plans    â”‚  â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€   â”‚    â”‚
â”‚   â–¸ Cases    â”‚  â”‚  ðŸ“‹ Sprint-14 Release    Owner: AÃ¯cha   85%  â”‚    â”‚
â”‚   â–¸ Sets     â”‚  â”‚  ðŸ“‹ Reg-Auth-2025-Q4     Owner: Mathieu 100% â”‚    â”‚
â”‚   â–¸ Precond. â”‚  â”‚  ðŸ“‹ Hotfix-Pay-Bug-1234  Owner: AÃ¯cha   42%  â”‚    â”‚
â”‚   â–¸ Reports  â”‚  â”‚  ...                                          â”‚    â”‚
â”‚              â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚ â–¾ TestPulse  â”‚                                                      â”‚
â”‚   â–¸ Dashbrd  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚   â–¸ Trends   â”‚  â”‚  Recently failed (last 24h)                   â”‚    â”‚
â”‚              â”‚  â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€    â”‚    â”‚
â”‚ â–¾ Settings   â”‚  â”‚  âŒ TC-1234 Login OAuth  by GH Actions  QA    â”‚    â”‚
â”‚   â–¸ AI       â”‚  â”‚  âŒ TC-2891 Cart redir   by AÃ¯cha       Stg   â”‚    â”‚
â”‚   â–¸ Audit    â”‚  â”‚  âš ï¸  TC-3401 Flaky?      auto-detected  QA    â”‚    â”‚
â”‚   â–¸ License  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 7.2 Vue dÃ©taillÃ©e d'un Test Plan

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Argos > Test Plans > Sprint-14 Release             [Lock] [Exportâ–¾] â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Owner: AÃ¯cha   Iter: Sprint-14   Envs: Dev, QA, Staging   State: â—  â”‚
â”‚ Coverage: 85% (138/162 executed)  Pass: 122  Fail: 12  Blocked: 4   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Filter: [Area Path â–¾] [Tag â–¾] [Status â–¾] [Env: QA â–¾]    [SearchðŸ”] â”‚
â”‚                                                                     â”‚
â”‚  Test Case                          Status   Last run    Env  Runâ–¶  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  âœ… TC-1100 Login w/ valid creds    Pass     2h ago     QA    [â–¶]   â”‚
â”‚  âŒ TC-1101 Login w/ invalid creds  Fail     1h ago     QA    [â–¶]   â”‚
â”‚  â¸  TC-1102 Login OAuth Microsoft   Blocked  3h ago     QA    [â–¶]   â”‚
â”‚  âšª TC-1103 Logout cleanup          Unexec   â€”          â€”     [â–¶]   â”‚
â”‚  âœ… TC-1104 Pwd reset email flow    Pass     CI 30m ago QA    [â–¶]   â”‚
â”‚  ...                                                                â”‚
â”‚                                                            [1 â–¾ /14]â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 7.3 Interface d'exÃ©cution manuelle

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Run: TC-1101 Login w/ invalid creds   Plan: Sprint-14   Env: QA â–¾   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â–¶ Precondition                   â”‚  Evidence                         â”‚
â”‚   User has no active session.    â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚   App in clean state.            â”‚  â”‚ + Drop files or click    â”‚    â”‚
â”‚                                  â”‚  â”‚   to upload              â”‚    â”‚
â”‚ â–¾ Steps (3)                      â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚                                   â”‚
â”‚ 1. âœ… Open login page            â”‚  ðŸ“Ž screenshot-step3.png 145 KB  â”‚
â”‚    Action: GET /login            â”‚                                   â”‚
â”‚    Expected: 200 OK              â”‚                                   â”‚
â”‚    Comment: ___________________  â”‚                                   â”‚
â”‚                                  â”‚                                   â”‚
â”‚ 2. âœ… Enter wrong password       â”‚                                   â”‚
â”‚    Action: type "badpass" + Sub  â”‚                                   â”‚
â”‚    Expected: error message       â”‚                                   â”‚
â”‚                                  â”‚                                   â”‚
â”‚ 3. âŒ Verify error displayed     â”‚                                   â”‚
â”‚    Action: read element #err     â”‚                                   â”‚
â”‚    Expected: "Invalid creds"     â”‚                                   â”‚
â”‚    Comment: Got "Server err 500" â”‚                                   â”‚
â”‚                                  â”‚                                   â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚                                   â”‚
â”‚ Global: âŒ FAIL (1 step failed)  â”‚                                   â”‚
â”‚ [Save Run]  [Cancel]  [+ Bug]    â”‚                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 7.4 Settings â€” AI Providers & Features

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Argos Settings > AI                                                 â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  âš  AI globally [ ENABLED ] (org-wide toggle)                        â”‚
â”‚                                                                     â”‚
â”‚  â–¾ Providers (BYOK)                          [+ Add Provider]       â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€     â”‚
â”‚  â€¢ Anthropic (default)              key: ...wxyz   âœ… tested        â”‚
â”‚  â€¢ Azure OpenAI Enterprise (eu-w)   key: ...kr8s   âœ… tested        â”‚
â”‚                                                                     â”‚
â”‚  â–¾ Feature Mapping                                                  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€     â”‚
â”‚  â€¢ TC Generation:    Provider [Anthropic â–¾]  Model [opus-4.7 â–¾]     â”‚
â”‚                      Temp [0.3]  Max tokens [4000]   [Edit prompt]  â”‚
â”‚  â€¢ Flakiness AI:     Provider [Az OpenAI â–¾]  Model [gpt-5.2 â–¾]      â”‚
â”‚                      Temp [0.1]  Max tokens [2000]   [Edit prompt]  â”‚
â”‚                                                                     â”‚
â”‚  â–¾ Quotas                                                           â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€     â”‚
â”‚  Per user / month:  [100] calls   Mode: [hard â–¾]   Alert: [80%]     â”‚
â”‚                                                                     â”‚
â”‚                                                       [Save]        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 7.5 Matrice de couverture exigences

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Argos > Reports > Traceability Matrix          [Exportâ–¾]            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Filters: Area [Auth â–¾]  Iter [Sprint-14 â–¾]  Env [QA â–¾]  [Apply]    â”‚
â”‚                                                                     â”‚
â”‚  Coverage: 87% (62/71 requirements covered by â‰¥1 passing TC)        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Requirement\TC      TC-1100  TC-1101  TC-1102  TC-1103   TC-1104    â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚ US-2401 Login        âœ…       âŒ       â¸                            â”‚
â”‚ US-2402 Logout                                  âšª                  â”‚
â”‚ US-2403 Password                                          âœ…        â”‚
â”‚ Bug-2891 OAuth bug   âœ…       âŒ                                    â”‚
â”‚ Req-SOX-04 Audit                                âšª        âœ…        â”‚
â”‚ ...                                                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 8. Positionnement DiffÃ©rentiel

| CritÃ¨re | **TestVault (Argos)** | **Xray (Jira)** | **Microsoft Test Plans natifs** | **Azure Test Plans (premium)** |
|---|---|---|---|---|
| Plateforme | ADO Cloud + Server 2022 | Jira Cloud + DC | ADO Cloud + Server (rudimentaire) | ADO Cloud uniquement |
| Stockage des donnÃ©es | Work Items natifs ADO (souverain) | Custom Jira issues | Test Plans natifs ADO | Test Plans natifs ADO |
| SouverainetÃ© Server on-prem | âœ… | âœ… Xray DC (~trÃ¨s cher) | âœ… | âŒ |
| RÃ©fÃ©rentiel TC / Plans / Sets | âœ… Complet | âœ… RÃ©fÃ©rence | âš ï¸ LimitÃ© (pas de Sets) | âœ… |
| Versioning par snapshots | âœ… Snapshots taggÃ©s | âœ… Test Versions | âŒ | âŒ |
| BDD / Gherkin natif + sync repo | âœ… | âœ… | âŒ | âŒ |
| Import CSV/Excel | âœ… | âœ… | âš ï¸ LimitÃ© | âš ï¸ LimitÃ© |
| Import JUnit/NUnit/xUnit/Cucumber | âœ… | âœ… | âš ï¸ Partiel via Pipelines | âš ï¸ Partiel |
| API publique + SDK + CLI | âœ… Open-source | âœ… PropriÃ©taire | âš ï¸ API ADO seule | âš ï¸ API ADO seule |
| AI gÃ©nÃ©ration de TC | âœ… BYOK | âš ï¸ Beta | âŒ | âŒ |
| AI flakiness detection | âœ… BYOK | âŒ | âŒ | âŒ |
| Reporting riche | âœ… via TestPulse | âœ… Dashboards Xray | âš ï¸ Basique | âš ï¸ Basique |
| Pricing Cloud (1 user) | ~18 â‚¬/mois Pro + Free tier | ~25-30 $/mois Cloud | inclus ADO Basic | ~52 â‚¬/mois |
| Pricing Server (1 user, perpÃ©tuel) | ~250 â‚¬ + 20%/an | Xray DC ~trÃ¨s cher | inclus ADO Server | n/a |
| Free tier | âœ… 5 users / 500 TC | âŒ | âœ… inclus ADO | âŒ |

**DiffÃ©renciateurs majeurs de TestVault (Argos) :**

1. **Le seul** qui couvre Cloud ET Server 2022 avec un VSIX unique, paritÃ© fonctionnelle stricte sur le cÅ“ur.
2. **Le seul** ADO-native avec versioning par snapshots et BDD/Gherkin natif synchronisÃ©.
3. **Le seul** avec AI BYOK sur ADO (souverainetÃ© des clÃ©s, pas de coÃ»t LLM mutualisÃ©).
4. **Pricing Cloud -30% vs Xray** + Free tier sans CB pour Ã©valuation sÃ©rieuse.
5. **Reporting via TestPulse** dÃ©jÃ  publiÃ© et Ã©prouvÃ© sur le marchÃ© ADO.

---

## 9. Exigences Non-Fonctionnelles

| CatÃ©gorie | Exigence |
|---|---|
| Performance | cf. constitution Â§4 (CRUD < 500ms p95, plan < 3s p95, init < 2s) |
| Browsers supportÃ©s | Edge, Chrome, Firefox, Safari (2 derniÃ¨res versions majeures) |
| AccessibilitÃ© | WCAG 2.1 AA pour les Ã©crans principaux (hub, plans, run, traceability), WCAG 2.1 A pour les Ã©crans Settings (utilisÃ©s par Admins technophiles) |
| Internationalisation | UI en anglais en v1. Architecture i18n prÃªte (next-intl ou Ã©quivalent). FR + EN en v1.1. ES, DE, JA en v2. |
| DensitÃ© d'information | 2 modes (compact / confortable) configurables par user (prÃ©fÃ©rence persistÃ©e) |
| Latence LLM | cf. constitution Â§4 (streaming dÃ¨s 1er token, < 2s pour la 1Ã¨re rÃ©ponse) |
| Hors-ligne | Mode lecture seule en cas de perte de connectivitÃ© ADO ; toute Ã©criture est queueÃ©e et signalÃ©e Ã  l'utilisateur |
| AccessibilitÃ© clavier | Tous les Ã©crans navigables au clavier, raccourcis clavier documentÃ©s (`?` pour les afficher) |
| Mobile responsive | Hub et plans consultables en lecture sur mobile/tablette ; Ã©dition dÃ©sactivÃ©e sur petit Ã©cran (< 768px) en v1 |
| Logging client | Pas de console.log en production, logs cÃ´tÃ© Cloud-Plus avec niveau (debug, info, warn, error), pas de PII |
| Erreurs visibles | Tout error dialog inclut un correlation ID copiable pour le support |
| Documentation | README.md + docs/user-guide.md + docs/api-reference.md (gÃ©nÃ©rÃ©e OpenAPI) + docs/sdk-reference.md, en synchronisation CI-bloquante (cf. constitution Â§10.2) |

---

> ðŸ“ **Cross-references :** voir `constitution.md` v0.2.2 pour les contraintes immuables. `plan.md` (Ã  venir) pour l'architecture technique. `tasks.md` (Ã  venir) pour le dÃ©coupage en phases d'implÃ©mentation.

> âš ï¸ Toute modification de ce document requiert l'approbation explicite d'Alexandre Thibaud (ATConseil â€” atconseil.info).
