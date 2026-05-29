# CLAUDE_TASK -- Sprint 2.24 / A -- Pattern A (Spec Patch)

> Cible        : Claude Code, repo E:\Code\TestVault
> Date         : 2026-05-29
> Type         : Pattern A -- modification spec-kit uniquement. AUCUN code produit/touche.
> Source verite: les fichiers LIVE Specs/ + le rapport de recon du 2026-05-29
> Branche      : sprint/2.24-spec-patch (creer depuis main a jour)
> Duree estimee: 1h - 1h30
> Commit       : UN SEUL commit atomique. Pas de push, pas de PR (Alexandre valide a la main).

---

## 1. Contexte executif

L'audit de coherence du 2026-05-29 a leve 1 ERROR + warnings : CHANGE 0 / PR #96 n'a purge
l'architecture Azure Functions qu'a moitie. plan.md S7 (DEFERRED) et spec.md US-5.1 ont ete
corriges, mais la constitution reste auto-contradictoire : S3.2 / S3.2.1 / S3.3 / S3.4 decrivent
encore les Azure Functions ATConseil comme proxy LLM ACTIF, alors que S6.0 acte le client-side
direct sans proxy. Cette tache termine la reconciliation no-backend et solde le drift residuel.

Risque si pas livre : la "bill of rights" du projet reste auto-contradictoire (echec garanti a
l'audit externe T-7.8) et les prochains scopes repartent sur des specs incoherentes.

Cette tache NE bloque PAS la release v0.5.34 (items code purs, voir CLAUDE_TASK B). Elle peut
tourner en parallele ; Alexandre sequence l'ordre de merge.

Decision actee en chat (2026-05-29) : le snapshot auto au lock du Test Plan est **opt-out**
(defaut = creation ON, l'Admin peut desactiver). Raison : le Lock doit figer une baseline
immuable ; un defaut opt-in laisserait un plan "locked" pointer vers des TC vivants. US-3.4
(criteres d'acceptation) prime sur le one-liner F2 -> c'est F2/spec.md:678 qu'on corrige.

---

## 2. Regles non-negociables

- Pattern A pur : on ne touche QUE constitution.md, spec.md, plan.md, tasks.md (Specs/).
- AUCUN fichier de code, AUCUN test, AUCUN package.json, AUCUNE allowlist (-> CLAUDE_TASK B).
- UN SEUL commit atomique en fin de tache. Pas de push, pas de PR.
- Conserver l'intention des sections : on ne SUPPRIME pas le concept Cloud-Plus, on le marque
  explicitement DEFERRED (coherent avec le traitement deja applique a plan.md S7).
- Ne reformuler que ce qui est liste ci-dessous. Pas de refactor de prose "tant qu'on y est".
- N'inscrire aucun nom de modele LLM litteral.

---

## 3. Prerequis

```bash
cd E:\Code\TestVault
git checkout main && git pull --ff-only && git status   # doit etre clean
cp Specs/constitution.md Specs/constitution.md.bak
cp Specs/spec.md Specs/spec.md.bak
cp Specs/plan.md Specs/plan.md.bak
cp Specs/tasks.md Specs/tasks.md.bak
git checkout -b sprint/2.24-spec-patch
```

> Les .bak sont des filets de securite locaux ; les supprimer en fin de tache (cf. section 8).

---

## 4. Patches (lire la section LIVE avant chaque edition)

### P1 -- constitution S3.2 / S3.2.1 / S3.3 / S3.4 : reconcilier sur S6.0 (l'ERROR)

Lire les sections live, puis reconcilier l'architecture LLM/donnees sur le client-side direct
deja acte en S6.0 (appels LLM client -> provider directement, BYOK, aucun proxy serveur).

- S3.2.1 (l.124) : la phrase "les appels LLM passent par les Azure Functions ATConseil
  (proxy d'orchestration)" doit etre remplacee par la realite client-side : l'appel LLM part
  directement du client vers le provider configure (BYOK), la cle n'est jamais exposee cote
  serveur car il n'y a pas de serveur. Renvoyer a S6.0.
- S3.2 (backend "Cloud-Plus" presente comme actif) : marquer explicitement le concept Cloud-Plus
  comme **DEFERRED / non implemente** (meme statut que plan.md S7), pas comme architecture active.
- S3.3 (Azure Table Storage l.149, transit ephemere l.152) et S3.4 (endpoints REST Azure
  Functions l.157) : memes -> rattacher au bloc DEFERRED ou retirer du normatif actif.

**Critere d'acceptation (post-flight)** : aucune section NORMATIVE ACTIVE de constitution.md ne
presente les Azure Functions comme chemin LLM/donnees actif. Les seules occurrences tolerees sont
en changelog historique ou dans un bloc explicitement DEFERRED.

### P2 -- constitution : entree changelog pour S6.0 (no-backend)

Ajouter en tete (bloc changelog) une entree datee 2026-05-22 documentant la decision no-backend
S6.0 (client-side only, appels LLM directs, suppression du proxy Azure Functions du chemin actif).
Format identique aux entrees existantes (`> **Changelog vX.Y.Z** : ... -- 2026-05-22.`).
Choisir le numero de version coherent avec la sequence existante (la derniere entree presente).

### P3 -- spec.md:340 : en-tete Epic 5 perime

Retirer "necessitant un backend Azure Functions" de l'en-tete de l'Epic 5. L'en-tete doit etre
coherent avec US-5.1 (deja corrigee en client-side direct juste en dessous, spec.md:378-380).

### P4 -- spec.md : resoudre opt-in/opt-out en faveur de opt-OUT

US-3.4 (l.261-268) dit opt-out ; F2 (l.475) et spec.md:678 disent opt-in : contradiction.
Decision actee : **opt-out** (defaut = snapshot cree au lock ; l'Admin peut desactiver).
- Corriger F2 (l.475) et spec.md:678 pour dire opt-out, alignes sur US-3.4.
- Verifier le data-model autour de l.664/693 (lockedSnapshotIds / testCaseVersionId) : pas de
  changement de schema attendu, juste coherence de la prose.

### P5 -- plan.md S6.3 : pipeline OpenAPI depuis Azure Functions

l.631-633 : "OpenAPI generee depuis le code des Azure Functions" + publication CI. Rattacher
explicitement au backend DEFERRED (coherent avec S7 deja DEFERRED), ou retirer du chemin actif.

### P6 -- tasks.md : fiabiliser les cases sur-declarees + publisher historique

- **T-3.4** : la case est [x] mais la logique n'est branchee qu'au niveau SDK (lockWithAutoSnapshot
  existe et est testee) ; l'UI appelle encore le lock() simple -> en runtime, locker un plan ne cree
  AUCUN snapshot. Ne PAS mentir : annoter T-3.4 d'une note explicite
  "[SDK done ; wiring UI en cours -- Sprint 2.24 code]" sans pretendre le runtime complet.
  (Le wiring effectif est une tache code separee, pas ici.)
- **tasks.md:91** (T-0.1, tache completee) : decrit publisher=ATConseil. Annoter
  "(corrige en AlexThibaud au Sprint 3.1)" plutot que reecrire l'historique.

---

## 5. Post-flight (verifications avant commit)

```bash
# Azure Functions : plus aucune occurrence en section active (seules changelog/DEFERRED tolerees)
grep -niE "azure function" Specs/constitution.md Specs/spec.md Specs/plan.md
# -> inspecter chaque hit : doit etre changelog OU dans un bloc marque DEFERRED. Sinon, corriger.

# opt-in residuel : doit etre coherent opt-out partout
grep -niE "opt-in|opt-out|opt in|opt out" Specs/spec.md

# en-tete Epic 5 nettoye
grep -niE "backend Azure Functions" Specs/spec.md   # attendu : 0

# changelog S6.0 present
grep -niE "6\.0|no.?backend|client-side" Specs/constitution.md | head

# marqueurs de patch residuels (ne doivent jamais apparaitre)
grep -niE "^## PATCH|REMPLACER l.integralite|A AJOUTER apres" Specs/*.md   # attendu : 0
```

Si un grep "azure function" renvoie une ligne en section active non DEFERRED -> la corriger avant commit.

---

## 6. Scenario d'echec

- main non clean / pull non fast-forward -> STOP, reporter, ne rien faire.
- Une section live differe trop de la description (structure inattendue) -> NE PAS deviner :
  reporter la divergence dans le rapport et demander a Alexandre avant d'editer cette section.
- Doute sur la frontiere "actif vs DEFERRED" d'une phrase -> reporter, ne pas trancher seul.

---

## 7. Ce que tu ne fais pas

- Aucun fichier de code, test, package.json, vss-extension.json, allowlist.
- Aucun bump de version, aucun tag, aucun push, aucune PR.
- Aucune suppression du concept Cloud-Plus (on le DEFERRE, on ne le nie pas).
- Aucune implementation du wiring T-3.4 (c'est du code -> tache separee).
- Aucun refactor de prose hors des 6 patches listes.

---

## 8. Rapport final attendu

```markdown
# Spec Patch Sprint 2.24 (coherence) -- {date}
- Branche : sprint/2.24-spec-patch (1 commit : {hash})
- P1..P6 : statut par patch (applique / partiel + raison / reporte pour validation)
- Post-flight : sortie des 5 grep (azure function / opt / Epic5 / changelog / marqueurs)
- ERROR constitution resolu ? OUI/NON (si NON : quelle section reste a valider avec Alex)
- Divergences live vs description rencontrees (le cas echeant)
- .bak supprimes ? OUI/NON
```

Message de commit (unique) :
```
docs(spec-kit): finalize no-backend reconciliation + coherence drift cleanup

- constitution S3.2/S3.2.1/S3.3/S3.4 reconciled to S6.0 (client-side direct, Cloud-Plus DEFERRED)
- add changelog entry for S6.0 no-backend decision (2026-05-22)
- spec.md Epic 5 header + F2/opt-out aligned to US-3.4
- plan.md S6.3 OpenAPI pipeline marked DEFERRED
- tasks.md T-3.4 annotated (SDK done, UI wiring pending); T-0.1 publisher note
```

## 9. Cleanup post-session

```powershell
Remove-Item Specs\constitution.md.bak, Specs\spec.md.bak, Specs\plan.md.bak, Specs\tasks.md.bak -ErrorAction SilentlyContinue
# Le deplacement de CE fichier vers claude_prompts/ est groupe dans le cleanup de CLAUDE_TASK B.
```
