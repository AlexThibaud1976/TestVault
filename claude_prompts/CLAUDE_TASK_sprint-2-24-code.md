# CLAUDE_TASK -- Sprint 2.24 / B -- Pattern B (Code, Part 1)

> Cible        : Claude Code, repo E:\Code\TestVault
> Date         : 2026-05-29
> Type         : Pattern B -- implementation TDD strict. 2 fixes bloquants + docs + bump.
> Source verite: rapport de recon 2026-05-29 (sections C/D), constitution S10.4/S10.5/S10.7
> Branche      : sprint/2.24-code (creer depuis main a jour)
> Duree estimee: 1h30 - 2h30
> Sortie       : code pret pour release v0.5.34. PAS de publish, PAS de tag, PAS de PR.

---

## 1. Contexte executif

Deux items de code bloquent la prochaine release Marketplace privee v0.5.34. Le recon les a
localises precisement (items repo-purs, independants du spec-kit) :
- **T223-Routing** : le bouton "Run Test" du TestCaseFormView retourne a la liste au lieu de
  naviguer vers une nouvelle TestExecution.
- **T223-ExecPath** : en display mode, les champs du TestExecutionFormView restent editables
  (l'immutabilite S3.5 n'est garantie que par l'absence de chemin Patch, pas au niveau input).

Risque si pas livre : on ne peut pas publier v0.5.34 (UX cassee + faille d'immutabilite UI).

Cette tache est independante de CLAUDE_TASK A (spec patch). Alexandre sequence l'ordre de merge.
NB : le wiring du snapshot auto au lock (T-3.4) n'est PAS dans ce sprint (decision en chat) -- il
chevauche le role-check Admin du Lock (differe) et sera traite separement apres la release.

---

## 2. Regles non-negociables (constitution S10)

- **TDD strict (S10.4)** : pour CHAQUE fix, le test de regression est ecrit et ROUGE d'abord,
  dans un commit separe, AVANT le commit de fix (qui le passe VERT). Jamais test+fix ensemble.
- **Numerotation des tests de regression** : NE PAS inventer. Scanner les tests existants pour
  trouver la convention et le prochain numero/nom libre (ex : grep tools/regression et les
  *.test.tsx existants). Reporter le nom choisi dans le rapport.
- Stack imposee : Vitest + msw + Biome + Testing Library. TypeScript strict.
- Conventional commits. Couverture cible 90% core / 80% UI.
- Anti-scope-creep : ne corriger QUE les 2 items. Tout code adjacent douteux -> rapport, pas fix.
- **Bump version dans un commit final dedie** (jamais dans le commit de fix).
- Pas de push, pas de PR, pas de tag, pas de publish Marketplace (Alexandre valide en BCEE-QA
  via le skill release-checklist).
- N'inscrire aucun nom de modele LLM litteral.

---

## 3. PRE-FLIGHT (avant le premier commit -- obligatoire S10.5)

```bash
cd E:\Code\TestVault
git checkout main && git pull --ff-only && git status   # clean
pnpm install --frozen-lockfile

# 1. Audit deps
pnpm audit --audit-level=high
#    HIGH/CRITICAL -> STOP + reporter. MODERATE -> logger dans le rapport, ne pas bloquer.

# 2. Baseline tests verts sur main
pnpm test --run
#    Doit etre vert avant de creer la branche. Sinon STOP + reporter.

# 3. Routes API impactees
#    T223-Routing = navigation client-side (use-argos-routing.ts), pas de nouvel appel ADO REST.
#    T223-ExecPath = desactivation d'inputs UI, pas d'appel reseau.
#    -> Lister tout appel ADO REST reellement touche (attendu : aucun). Confirmer dans le rapport.

# 4. Check modeles LLM : N/A -- ce sprint ne touche PAS la couche LLM. (Ne rien faire ici.)

git checkout -b sprint/2.24-code
```

---

## 4. Workflow (commits ordonnes TDD)

### Commit 1 -- TEST ROUGE : T223-Routing
Ecrire un test de regression (nom selon convention scannee) verifiant que cliquer "Run Test"
(`data-testid="tc-run-btn"`, TestCaseFormView.tsx:276) NAVIGUE vers le formulaire de TestExecution
avec le Test Case pre-rempli, au lieu de retourner a la liste.
Lancer -> ROUGE attendu. Commit : `test(routing): add failing regression for Run Test navigation`

### Commit 2 -- FIX VERT : T223-Routing
Ajouter `goToTestExecutionForm(caseId)` (ou equivalent selon l'API existante) dans
`use-argos-routing.ts`, puis brancher le handler du bouton "Run Test" de TestCaseFormView dessus
(remplacer `onClick={() => onSuccess(caseId)}`). Coherence avec le routing hub existant
(navigation vers la route test-execution-form, pattern deja utilise ailleurs).
Lancer -> VERT. Commit : `fix(routing): Run Test navigates to TestExecution form (T223-Routing)`

### Commit 3 -- TEST ROUGE : T223-ExecPath
Ecrire un test verifiant qu'en display mode (`isDisplayMode === true`, TestExecutionFormView.tsx:48)
les champs Test Plan ID, Test Case ID, Environment (l.216-248) et Overall/Actual result (l.266+)
sont `disabled`/`readOnly`.
Lancer -> ROUGE attendu. Commit : `test(execution): add failing regression for display-mode immutability`

### Commit 4 -- FIX VERT : T223-ExecPath
Ajouter `disabled={isDisplayMode}` (ou `readOnly` selon le composant Fluent UI) aux champs
concernes du TestExecutionFormView. Ne pas changer la logique de swap du bouton (Save -> Re-run).
Lancer -> VERT. Commit : `fix(execution): make TestExecution fields read-only in display mode (T223-ExecPath)`

### Commit 5 -- DOCUMENTATION (avant bump, obligatoire S10.2)
Mettre a jour :
- `docs/user-guide.md` : comportement "Run Test" (navigation vers execution) + champs read-only
  en consultation d'une execution passee.
- `CHANGELOG.md` : entree `## [0.5.34] - 2026-05-29` (Fixed : Run Test navigation ; TestExecution
  display-mode immutability).
- `README.md` / `docs/operator-guide.md` : seulement si une capacite advertised change (a priori non).
Commit : `docs(execution): document Run Test navigation and display-mode read-only fields`

### Commit 6 -- BUMP VERSION (commit final dedie)
Bumper TOUT le groupe Changesets fixed (15+ package.json), pas seulement 3 fichiers.
0.5.33 -> 0.5.34. Reference : `tools/regression/CFG-2026-05-14-fixed-versioning.test.ts`.
```bash
pnpm test tools/regression/CFG-2026-05-14-fixed-versioning.test.ts --run   # VERT avant commit
```
Commit : `chore(release): bump to 0.5.34`

> Le tag git et le publish Marketplace ne sont PAS faits ici. Apres merge, Alexandre lance le
> skill release-checklist (qui appelle coherence-audit) puis valide en BCEE-QA.

---

## 5. Scenario d'echec

- PRE-FLIGHT rouge (audit HIGH, baseline non verte) -> STOP, reporter, ne pas creer la branche.
- Un test ROUGE ne devient pas VERT apres le fix attendu -> NE PAS elargir le fix : reporter
  l'ecart (le composant fait peut-etre autre chose que ce que le recon a vu) et demander a Alex.
- Suppression de code impliquant un import : import de TYPE pur -> inline + documenter ;
  import de LOGIQUE/composant -> STOP + alerter Alexandre (pas de decision archi en solo).
- Le test de versioning CFG-2026-05-14 rouge apres bump -> un package.json du groupe a ete oublie.

---

## 6. Ce que tu ne fais pas

- Pas de wiring T-3.4 (snapshot auto au lock) -- sprint separe.
- Pas de role-check Admin du Lock (differe).
- Pas de modification du spec-kit (c'est CLAUDE_TASK A).
- Pas de tag, push, PR, publish Marketplace.
- Pas de refactor de code adjacent "tant qu'on y est".
- Pas de bump glisse dans un commit de fix.

---

## 7. Rapport final attendu

```markdown
# Sprint 2.24 code (Part 1) -- {date}
- Branche : sprint/2.24-code, commits 1..6 (hashes)
- PRE-FLIGHT : pnpm audit (resultat), baseline tests (vert?), routes API touchees (liste, attendu aucune)
- Noms des tests de regression crees (convention scannee)
- T223-Routing : VERT ? fichiers touches
- T223-ExecPath : VERT ? fichiers touches
- Couverture sur les fichiers touches
- Bump 0.5.34 : nombre de package.json bumpes + CFG-2026-05-14 VERT ?
- Anti-scope-creep : tout code adjacent douteux signale (sans l'avoir touche)
- PRET POUR RELEASE v0.5.34 : OUI/NON (+ etapes manuelles restantes pour Alex)
```

---

## 8. CLEANUP POST-MERGE (groupe -- v1.4)

A executer une fois A et B mergees (groupe le cleanup, pas de mini-sprint isole) :

```powershell
# 1. Deplacer les 3 CLAUDE_TASK de ce cycle vers claude_prompts/
Move-Item .\CLAUDE_TASK_sprint-2-24-recon-audit.md          .\claude_prompts\ -Force
Move-Item .\CLAUDE_TASK_sprint-2-24-coherence-spec-patch.md .\claude_prompts\ -Force
Move-Item .\CLAUDE_TASK_sprint-2-24-code.md                 .\claude_prompts\ -Force
```

```bash
# 2. Purger les 4 orphelins allowlist identifies par le recon (entrees -> fichiers absents)
#    Editer tools/regression/allowlist.cjs ET allowlist.ts : retirer les entrees pointant vers
#    Specs/CLAUDE_TASK_sprint-2-21-1-foundry.md, Specs/CLAUDE_TASK_sprint-2-21-part-2.md,
#    claude_prompts/CLAUDE_TASK_sprint-2-21-part-2.md, Specs/CLAUDE_TASK_sprint-2-22-cleanup.md
node -e "const a=require('./tools/regression/allowlist.cjs');const fs=require('fs');a.forEach(p=>{if(!fs.existsSync(p))console.log('ORPHAN restant:',p)})"
#    -> attendu : 0 orphelin restant

# 3. Aucun des 3 CLAUDE_TASK 2.24 ne contient de terme allowliste (verifie) -> pas de nouvelle entree.
grep -niE "gpt-4|xray" claude_prompts/CLAUDE_TASK_sprint-2-24-*.md   # attendu : 0

# 4. Verifier que les tests de regression restent verts apres cleanup allowlist
pnpm test tools/regression --run
```

Commit cleanup : `chore: relocate Sprint 2.24 task prompts + purge stale allowlist entries`
