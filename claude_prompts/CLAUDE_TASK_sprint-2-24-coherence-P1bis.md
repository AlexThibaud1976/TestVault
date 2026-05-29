# CLAUDE_TASK -- Sprint 2.24 / A-bis (P1-bis) -- amendement de 86ef9dc

> Cible        : Claude Code, repo E:\Code\TestVault
> Date         : 2026-05-29
> Type         : Pattern A (suite) -- spec-kit uniquement. AMENDEMENT du commit existant.
> Branche      : sprint/2.24-spec-patch (DEJA creee ; commit 86ef9dc en place, NON pushe)
> Duree estimee: 15-20 min
> Resultat     : commit 86ef9dc amende (toujours UN seul commit atomique). Pas de push, pas de PR.

---

## 1. Contexte

Le rapport de A a confirme que l'ERROR principal (proxy LLM §3.2.1 vs §6.0) est resolu, mais
a liste 4 residus Azure Functions en SECTION ACTIVE, non couverts par P1-P6 (CC a respecte la
consigne "reporter plutot que trancher"). Alexandre a tranche : on les solde maintenant, en
amendant le commit existant pour rester atomique. Objectif : 100% de reconciliation no-backend,
zero residu actif qui repasserait en rouge a l'audit externe T-7.8.

---

## 2. Regles

- Spec-kit uniquement (constitution.md, plan.md). Aucun code, test, package.json, allowlist.
- AMENDER 86ef9dc (`git commit --amend`), ne PAS creer un 2e commit. Toujours atomique.
- Localiser chaque section PAR SON CONTENU (les numeros de ligne ci-dessous sont indicatifs,
  post-P1-P6, et peuvent avoir bouge).
- Reporter au lieu de deviner si une section differe de la description.

---

## 3. Prerequis

```bash
cd E:\Code\TestVault
git status                      # doit etre sur sprint/2.24-spec-patch, HEAD = 86ef9dc, clean
git log -1 --oneline            # confirmer 86ef9dc
```

---

## 4. Les 4 corrections

### B1 -- constitution §2 Stack (~l.58) : preserver Node 22, DEFERRER la clause Azure Functions
Ligne actuelle (en substance) : "MUST Node.js 22 LTS pour les outils de build, le CLI, et les
Azure Functions Cloud-Plus ...".
- **GARDER** l'exigence `MUST Node.js 22 LTS` -- elle reste justifiee par les outils de build,
  le CLI, le SDK et l'exigence du SDK ADO (cf. changelog v0.2.3). NE PAS l'affaiblir.
- Retirer / requalifier la seule mention "Azure Functions Cloud-Plus" comme dependance DEFERRED
  (ex : "... et, lorsque le backend Cloud-Plus DEFERRED sera implemente, les Azure Functions").
- Critere : la mention Node 22 reste un MUST inconditionnel ; la mention Azure Functions devient
  conditionnelle/DEFERRED.

### B2 -- constitution §11 checklist GA (~l.394) : dependance Azure Functions -> conditionnelle DEFERRED
Item actuel (en substance) : "Verification des API externes ... necessite deploiement Azure
Functions + cles reelles".
- Requalifier : la verification des API externes ne gate la GA QUE si/quand le backend Cloud-Plus
  (DEFERRED) est implemente. Tant que Cloud-Plus est DEFERRED, cet item est non applicable / N/A.
- Ne pas supprimer l'item ; le rendre conditionnel et coherent avec §6.0 + §3.2 DEFERRED.

### B3 -- plan.md §8 CI/CD (~l.1092) : step "Deploy Azure Functions" -> DEFERRED
- Annoter / bannieriser le step "Deploy Azure Functions (Cloud-Plus)" comme DEFERRED, coherent
  avec plan.md §7 (deja DEFERRED) et le pipeline OpenAPI §6.3 (deja DEFERRED via P5).

### B4 -- constitution §3.2 en-tete bloc (~l.105) : annotation cosmetique
- Annoter explicitement l'en-tete "Cloud-Plus (Azure Functions ATConseil)" avec `(DEFERRED)`.
  La banniere DEFERRED en tete de §3.2 le couvre deja, mais l'annotation leve toute ambiguite
  au survol.

---

## 5. Post-flight (avant amend)

```bash
grep -niE "azure function" Specs/constitution.md Specs/plan.md
```
Attendu : chaque occurrence restante est SOIT en changelog, SOIT dans un bloc/banniere DEFERRED,
SOIT dans la TOC / arborescence monorepo de plan.md. AUCUNE en chemin actif inconditionnel
(plus de checklist GA ni de step CI non-DEFERRED).

```bash
grep -niE "Node\.js 22|Node 22" Specs/constitution.md
```
Attendu : l'exigence MUST Node 22 est toujours presente et inconditionnelle.

---

## 6. Amend + rapport

```bash
git add Specs/constitution.md Specs/plan.md
git commit --amend
#  -> conserver le message existant et lui AJOUTER une ligne dans le corps :
#     "- P1-bis: defer residual Azure Functions in constitution S2/S11 + plan S8; annotate S3.2 header"
git log -1 --stat              # verifier que c'est toujours UN commit (86ef9dc remplace)
```

Rapport attendu :
- 4 corrections : statut (applique / reporte) + section reelle touchee
- Sortie des 2 grep post-flight
- Confirmation : MUST Node 22 intact ? OUI/NON
- Confirmation : commit unique (amend OK, pas de 2e commit) ? OUI/NON

---

## 7. Ce que tu ne fais pas

- Pas de 2e commit (amend uniquement). Pas de push, pas de PR, pas de tag.
- Pas d'affaiblissement de l'exigence Node 22.
- Pas de suppression du concept Cloud-Plus (on DEFERRE, on ne nie pas).
- Aucun code / test / package.json / allowlist.

## 8. Cleanup post-merge (groupe avec A)

Apres merge de A, deplacer les briefs A + A-bis vers claude_prompts/ (aucune entree allowlist
necessaire -- zero terme declencheur) :
```powershell
Move-Item .\CLAUDE_TASK_sprint-2-24-coherence-spec-patch.md .\claude_prompts\ -Force
Move-Item .\CLAUDE_TASK_sprint-2-24-coherence-P1bis.md       .\claude_prompts\ -Force
```
