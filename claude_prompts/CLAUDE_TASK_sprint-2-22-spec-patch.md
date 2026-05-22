# CLAUDE_TASK : Apply Sprint 2.22 spec-kit patch

> **Cible :** Claude Code  
> **Date de génération :** vendredi 2026-05-22  
> **Source de vérité :** `Specs/SPRINT_2.22_SPEC_PATCH.md` (à déposer dans le repo avant exécution)  
> **Auteur du task :** Claude (chat) sur instructions Alexandre Thibaud  
> **Durée estimée :** 20-30 min

---

## CONTEXTE

Sprint 2.22 = appliquer **11 patches markdown** à 4 fichiers spec-kit :
- `Specs/constitution.md`
- `Specs/spec.md`
- `Specs/plan.md`
- `Specs/tasks.md`

Ce sprint **ne modifie pas le code**. Il aligne uniquement les specs sur la décision stratégique "no-backend" (actée 2026-05-22) + ajoute la nouvelle US-5.1.1 "AI Suggest Steps" + spécifie les tâches Sprint 2.22 / postmortem Sprint 2.21.

Les patches eux-mêmes sont décrits dans `Specs/SPRINT_2.22_SPEC_PATCH.md`. **Ce CLAUDE_TASK te dit comment les appliquer mécaniquement.**

---

## RÈGLES NON-NÉGOCIABLES

1. **No creative reformatting.** Tu copies textuellement les contenus markdown fournis dans `SPRINT_2.22_SPEC_PATCH.md`. Tu ne reformulles pas, tu ne corriges pas la syntaxe, tu n'ajoutes pas de commentaires de ton cru. Si tu vois quelque chose qui te semble mal écrit, tu **rapportes** à la fin, tu ne corriges pas.

2. **No code changes.** Tu modifies **uniquement** des fichiers `.md` dans `Specs/`. Si une instruction t'amène à toucher du code, **STOP et abort**.

3. **No version bump.** Tu ne touches pas à `package.json` ni aux versions des packages. Les bumps de version sont gérés ailleurs.

4. **Pre-flight checks obligatoires.** Avant chaque patch, tu vérifies que la section cible existe dans le fichier. Si elle a déjà été modifiée (ne matche pas l'état attendu), tu **abort** et rapportes.

5. **Single commit at the end.** Pas de commit intermédiaire. Si l'un des 11 patches échoue, tu fais `git restore` sur les fichiers modifiés et tu rapportes l'échec — pas d'état hybride.

6. **Backups d'abord.** Avant de toucher quoi que ce soit, tu fais une copie des 4 fichiers avec suffixe `.backup-20260522-sprint-2.22`.

7. **Dry-run mental d'abord.** Lis intégralement `Specs/SPRINT_2.22_SPEC_PATCH.md` avant de commencer. Si tu trouves une contradiction ou une instruction floue, **abort et rapporte** avant d'écrire la moindre ligne.

---

## PRÉREQUIS

Avant de lancer ce task :

- [ ] Tu es sur la branche `main`, à jour avec `origin/main`
- [ ] `git status` est propre (pas de modifs non commitées)
- [ ] Le fichier `Specs/SPRINT_2.22_SPEC_PATCH.md` est présent à la racine `Specs/` du repo
- [ ] Les 4 fichiers cibles existent : `Specs/constitution.md`, `Specs/spec.md`, `Specs/plan.md`, `Specs/tasks.md`

Si l'un de ces prérequis n'est pas rempli, **abort et rapporte**.

---

## WORKFLOW

### ÉTAPE 1 — Préparation

1. Créer une branche dédiée :
   ```bash
   git checkout -b sprint/2.22-spec-patch
   ```

2. Lire intégralement `Specs/SPRINT_2.22_SPEC_PATCH.md`.

3. Lire intégralement les 4 fichiers cibles. Construire une carte mentale de leur structure actuelle (sections, sous-sections).

4. Backup :
   ```bash
   cp Specs/constitution.md Specs/constitution.md.backup-20260522-sprint-2.22
   cp Specs/spec.md Specs/spec.md.backup-20260522-sprint-2.22
   cp Specs/plan.md Specs/plan.md.backup-20260522-sprint-2.22
   cp Specs/tasks.md Specs/tasks.md.backup-20260522-sprint-2.22
   ```

5. Vérifier que les backups sont écrits (taille > 0).

---

### ÉTAPE 2 — Application des 11 patches

> **Important :** Applique les patches dans l'ordre listé ci-dessous. Cet ordre minimise les conflits de référence entre patches (les patches qui ajoutent du contenu après une section existante doivent venir après les patches qui modifient cette section).

#### Patch 1 — `constitution.md` PATCH A.1 (ajout §6.0)

- **Précondition** : la section `## 6. ` (Operations ou similaire) existe dans `constitution.md`. Si elle a déjà un sous-titre `## 6.0`, **abort**.
- **Action** : insérer le bloc markdown `## 6.0 Architecture decision : Client-side only` (depuis `SPRINT_2.22_SPEC_PATCH.md` PARTIE A § PATCH A.1) **juste après** le header `## 6.` et avant la première sous-section existante.
- **Postcondition** : `grep "^## 6.0 Architecture decision" constitution.md` renvoie 1 occurrence.

#### Patch 2 — `spec.md` PATCH A.2 (remplacer US-6.2)

- **Précondition** : la section `#### US-6.2 : Configurer un fournisseur LLM (BYOK)` existe dans `spec.md`. Délimitation : du header `#### US-6.2` jusqu'au prochain `#### ` ou `### ` (Epic) ou `---`.
- **Action** : remplacer toute cette section par le bloc fourni dans PATCH A.2.
- **Postcondition** : `grep "NEW Sprint 2.21 part 2" spec.md` renvoie au moins 2 occurrences (les 2 critères max_tokens). La mention "via Azure Functions ATConseil" dans cette section a disparu.

#### Patch 3 — `spec.md` PATCH A.3 (remplacer US-6.3)

- **Précondition** : la section `#### US-6.3 : Définir des quotas AI par utilisateur` existe.
- **Action** : remplacement complet par le bloc PATCH A.3.
- **Postcondition** : `grep "DEFERRED indefiniment" spec.md` renvoie au moins 1 occurrence dans la section US-6.3.

#### Patch 4 — `spec.md` PATCH A.4 (remplacer US-6.4)

- **Précondition** : la section `#### US-6.4 : Consulter l'audit trail` existe.
- **Action** : remplacement complet par le bloc PATCH A.4.
- **Postcondition** : `grep "SIMPLIFIE - audit WIT-based" spec.md` renvoie 1 occurrence.

#### Patch 5 — `plan.md` PATCH A.5 (remplacer §7 + §8 intro)

- **Précondition** : les sections `## 7.` et `## 8.` existent dans `plan.md`.
- **Action** : remplacer **uniquement l'introduction** (premier paragraphe + sous-titres immédiats) de §7 et §8 par les blocs fournis. **Conserver le contenu technique existant après l'intro** (le patch dit `[... conserver le design existant pour reference ...]`).
- **Postcondition** : `grep "DEFERRED indefiniment" plan.md` renvoie au moins 1 occurrence dans §7. `grep "SIMPLIFIE - encryption native ADO" plan.md` renvoie 1 occurrence dans §8.

#### Patch 6 — `tasks.md` PATCH A.6 (remplacer Phase 6 intro)

- **Précondition** : la section `## Phase 6` existe dans `tasks.md`.
- **Action** : remplacer **uniquement l'introduction** de Phase 6 (avant la première sous-tâche `### T-6.1`) par le bloc fourni. **Conserver les sous-tâches T-6.1 à T-6.x** mais ajouter un statut "❄️ DEFERRED" ou "✅ DONE" ou "🟡 SIMPLIFIE" en début de chaque sous-tâche selon le mapping donné dans PATCH A.6.
- **Postcondition** : `grep "STATUT GLOBAL : DEFERRED" tasks.md` renvoie 1 occurrence.

#### Patch 7 — `tasks.md` PATCH A.7 (ajout Sprint 2.21 part 2)

- **Précondition** : aucune section nommée `### Sprint 2.21 part 2` n'existe encore dans `tasks.md`.
- **Action** : insérer le bloc `### Sprint 2.21 part 2 - Drawer revision + Gherkin + Advanced settings 🔴` **après** Phase 6 et **avant** Phase 7 (ou à la fin du fichier si Phase 7 n'existe pas).
- **Postcondition** : `grep "### Sprint 2.21 part 2" tasks.md` renvoie 1 occurrence.

#### Patch 8 — `spec.md` PATCH B.1 (remplacer US-5.1)

- **Précondition** : la section `#### US-5.1 : Générer un squelette de Test Cases` existe.
- **Action** : remplacement complet par le bloc PATCH B.1.
- **Postcondition** : 
  - `grep "via Azure Functions ATConseil" spec.md` renvoie 0 occurrence dans la section US-5.1.
  - `grep "depuis le Coverage Panel" spec.md` renvoie au moins 1 occurrence dans US-5.1.

#### Patch 9 — `spec.md` PATCH B.2 (remplacer F1)

- **Précondition** : la section `### F1 — Génération AI de Test Cases (BYOK)` existe.
- **Action** : remplacement complet par le bloc PATCH B.2 (nouveau titre `### F1 — Génération AI de Test Cases depuis une exigence (BYOK)`).
- **Postcondition** : 
  - `grep "via Azure Functions ATConseil" spec.md` renvoie 0 occurrence dans la section F1.
  - `grep "Architecture (depuis Sprint 2.21 part 1" spec.md` renvoie 1 occurrence.

#### Patch 10 — `spec.md` PATCH D.1 (ajout US-5.1.1)

- **Précondition** : la section `#### US-5.1 :` existe (déjà patchée à l'étape 8). La section `#### US-5.1.1` n'existe pas encore.
- **Action** : insérer le bloc `#### US-5.1.1 : Compléter les steps d'un Test Case en cours d'édition via AI (BYOK)` (depuis PARTIE D PATCH D.1) **juste après** la fin de US-5.1 et **avant** le début de US-5.2.
- **Postcondition** : 
  - `grep "#### US-5.1.1" spec.md` renvoie 1 occurrence.
  - L'ordre est bien US-5.1 → US-5.1.1 → US-5.2 dans le fichier.

#### Patch 11 — `tasks.md` PARTIE E (ajout Sprint 2.22 + T-2.21-postmortem)

- **Précondition** : aucune section nommée `### Sprint 2.22` n'existe encore. Aucune section `### T-2.21-postmortem` n'existe encore.
- **Action** : insérer les blocs Sprint 2.22 + T-2.21-postmortem (depuis PARTIE E) **après** Sprint 2.21 part 2 (inséré à l'étape 7) et **avant** Phase 7 (ou à la fin du fichier).
- **Postcondition** :
  - `grep "### Sprint 2.22" tasks.md` renvoie 1 occurrence.
  - `grep "T-2.21-postmortem" tasks.md` renvoie au moins 1 occurrence.
  - `grep "T-2.22.6" tasks.md` renvoie au moins 1 occurrence.

---

### ÉTAPE 3 — Vérifications post-patch globales

Lance les checks suivants. **Tous doivent passer**, sinon abort.

```bash
# 1. Aucune référence "Azure Functions ATConseil" en dehors des sections DEFERRED
grep -n "Azure Functions ATConseil" Specs/spec.md | grep -v "DEFERRED" | grep -v "reference future" | grep -v "design conservé"
# Attendu : aucune ligne

# 2. La section §6.0 de la constitution existe
grep -n "## 6.0 Architecture decision" Specs/constitution.md
# Attendu : 1 ligne

# 3. La nouvelle US-5.1.1 existe et a le bon titre
grep -n "#### US-5.1.1 : Compléter les steps" Specs/spec.md
# Attendu : 1 ligne

# 4. Le Sprint 2.22 est dans tasks.md
grep -n "### Sprint 2.22" Specs/tasks.md
# Attendu : 1 ligne

# 5. T-2.21-postmortem est dans tasks.md
grep -n "T-2.21-postmortem" Specs/tasks.md
# Attendu : au moins 1 ligne

# 6. Aucun marqueur de patch oublié dans les fichiers
grep -rn "PATCH A\|PATCH B\|PATCH D\|PATCH E\|\[... conserver" Specs/ --include="*.md" | grep -v ".backup-" | grep -v "SPRINT_2.22_SPEC_PATCH.md"
# Attendu : aucune ligne (sinon tu as collé le markdown de description du patch au lieu du contenu cible)

# 7. Cohérence : tasks.md Sprint 2.22 référence des sections qui existent
grep -n "spec.md US-5.1.1" Specs/tasks.md
# Attendu : référence valide
grep -n "#### US-5.1.1" Specs/spec.md
# Attendu : 1 ligne
```

Si un seul de ces checks rapporte un résultat inattendu :

```bash
git restore Specs/constitution.md Specs/spec.md Specs/plan.md Specs/tasks.md
```

Et écris un **rapport d'échec** détaillé : quel check a échoué, quelle ligne ramène l'output, quelle hypothèse est cassée. Pas de commit.

---

### ÉTAPE 4 — Commit unique

Une fois tous les checks verts :

```bash
# Supprimer les backups (gardés dans .gitignore donc pas commités, mais on les enlève proprement)
rm Specs/constitution.md.backup-20260522-sprint-2.22
rm Specs/spec.md.backup-20260522-sprint-2.22
rm Specs/plan.md.backup-20260522-sprint-2.22
rm Specs/tasks.md.backup-20260522-sprint-2.22

# Verifier git status
git status
# Attendu : 4 fichiers modifiés dans Specs/, optionnellement SPRINT_2.22_SPEC_PATCH.md ajouté

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

**Ne pas push automatiquement.** Push manuel par Alexandre lundi.

---

### ÉTAPE 5 — Rapport final

Écris dans la conversation (ou dans un fichier `sprint-2.22-spec-patch-report.md` à la racine du repo) :

1. **Statut global** : ✅ SUCCESS ou ❌ FAILED
2. **Patches appliqués** : liste des 11 patches avec ✅ / ❌
3. **Checks post-patch** : liste des 7 vérifications avec résultat
4. **Branche** : `sprint/2.22-spec-patch`
5. **Hash du commit** : sha1 court
6. **Stats** : nombre de lignes ajoutées / supprimées par fichier
7. **Anomalies relevées** : 
   - As-tu trouvé du contenu existant qui te semblait incohérent ou daté ?
   - As-tu trouvé des références orphelines (sections qui pointent vers du contenu qui n'existe pas) ?
   - As-tu eu besoin d'improviser sur une instruction floue ? Si oui, où ?
8. **Instructions push** :
   ```
   Pour pousser cette branche :
   git push -u origin sprint/2.22-spec-patch
   Puis ouvrir une PR sur main.
   ```

---

## SCÉNARIO D'ÉCHEC ATTENDU

Si une précondition échoue (par exemple US-6.3 a déjà été modifié localement et ne match pas l'état attendu) :

1. `git restore Specs/constitution.md Specs/spec.md Specs/plan.md Specs/tasks.md`
2. `git checkout main` (abandon de la branche)
3. `git branch -D sprint/2.22-spec-patch`
4. Restaurer les backups :
   ```bash
   mv Specs/constitution.md.backup-20260522-sprint-2.22 Specs/constitution.md
   mv Specs/spec.md.backup-20260522-sprint-2.22 Specs/spec.md
   mv Specs/plan.md.backup-20260522-sprint-2.22 Specs/plan.md
   mv Specs/tasks.md.backup-20260522-sprint-2.22 Specs/tasks.md
   ```
5. Rapporter en détail à Alexandre quelle précondition a échoué et sur quel fichier.

---

## CE QUE TU NE FAIS PAS

- ❌ Tu ne touches pas au code (`src/`, `apps/`, `packages/`)
- ❌ Tu ne touches pas à `package.json` ni aux versions
- ❌ Tu ne pousses pas sur `origin`
- ❌ Tu n'ouvres pas de PR
- ❌ Tu ne lances aucun test
- ❌ Tu ne reformulles pas le contenu fourni dans `SPRINT_2.22_SPEC_PATCH.md`
- ❌ Tu n'inventes pas de numéros de bug (le `bug-051` et `bug-052` dans le patch sont des **placeholders** — laisser tel quel, Alex ajustera)

---

## FIN

Si tu vas jusqu'à l'étape 5 sans abort, le sprint patch est appliqué. Alex prendra le relais lundi pour push + lancer le Sprint 2.22 code.
