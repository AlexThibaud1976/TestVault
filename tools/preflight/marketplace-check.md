# Pre-flight Check -- Marketplace Manifest

> **Quand consulter ce document ?**
> Avant tout sprint qui touche `apps/argos-extension/vss-extension.json`. Si vous etes Claude
> qui s'apprete a generer un prompt qui modifie le manifest, **commencez ici**. Si vous etes
> humain qui ouvre un prompt manifest, **verifiez chaque section**.

## Pourquoi ce document existe

Entre Sprint 2 et Sprint 4.5 (Argos 2026-05-09 -> 2026-05-11), 5 fausses premisses ont coute
chacune un sprint plein de revert/correction. Ce document encode les lecons.

## Section 1 -- Etat Marketplace (verification PORTAIL avant prompt)

A faire **avant** de proposer un changement de publisher / visibility / extensionId :

- [ ] Le publisher cible existe sur https://marketplace.visualstudio.com/manage/publishers/<publisher>
- [ ] Le PAT CI (secret `MARKETPLACE_PAT`) est associe a ce publisher (sinon mismatch a la publication)
- [ ] L'extensionId existe deja ? Sous quelle visibility (Public / Private) ?
- [ ] Si l'extension est deja publique : impossible de la repasser private (regle Microsoft).
      Soit on reste public, soit on cree un nouvel extensionId.
- [ ] Le partage org est compatible avec la cible (private + partage explicite, ou public).

**Reference** : Sprint 2 (publisher), Sprint Marketplace prive (visibility) -- voir CHANGELOG [0.3.1] / [0.3.2].

## Section 2 -- Cibles et types de contributions (verification DOC MICROSOFT)

A faire **avant** de proposer une valeur `targets[]` ou `type` :

- [ ] Le `type` est documente : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest
- [ ] Chaque `target` est documente et **copie-colle integralement** depuis un exemple Microsoft officiel
- [ ] Pour les references intra-extension, syntaxe relative `.<contributionId>` (point + ID court)
- [ ] Pour les references cross-extension, syntaxe complete `<publisher>.<extensionId>.<contributionId>`
- [ ] **Anti-fausse-premisse** : si vous reformulez un target ID "logiquement" (ex: `ms.vss-web.project-hub-group`
      au lieu de `ms.vss-web.project-hub-groups-collection`), c'est un signal d'alerte. **Re-copier l'exemple Microsoft.**

**Reference** : Sprint 3 (target invalide invente) -- voir CHANGELOG [0.3.5].

## Section 3 -- Icones et assets (verification SYNTAXE + INSPECTION)

A faire **avant** de proposer une valeur `iconName` ou `icon` :

- [ ] La propriete utilisee (`iconName` Fluent UI string vs `icon` asset path vs `iconAsset` full-qualified)
      est confirmee compatible avec le **type de contribution** cible (hub != hub-group != work-item-form-page)
- [ ] Pour `iconName` Fluent UI : la valeur est **simple, non-numerotee, non-composee descriptive**.
      Risque eleve sur des noms comme `BarChart4`, `ReportDocument`, `AnalyticsReport`.
      Preferer `View`, `List`, `Document`, `Settings`, `Code`, `Warning`, `Important`.
- [ ] **Liste de iconName confirmes rendre dans ADO sandbox post-Sprint 4** (a enrichir au fil du temps) :
  - OK : `BulletedList`, `TestBeaker`, `FolderList`, `Warning`, `Settings`
  - KO : `Important` (Sprint 4), `ReportDocument`, `BarChart4`, `AnalyticsReport`
- [ ] Pour `icon` PNG : verifier que la propriete fonctionne sur le **type de contribution** vise.
      Sprint 4.4/4.5 a montre que pour `ms.vss-web.hub`, `icon` est traite comme `iconName`
      (genere classe CSS `ms-Icon--<valeur>`). Pour `ms.vss-web.hub-group`, `icon` fonctionne
      (cf. Sprint 3.4 `argos-hub-group`).
- [ ] **Anti-fausse-premisse** : si une icone ne rend pas, ne pas deviner une 2eme valeur a l'aveugle.
      **F12 DOM inspection** d'abord pour identifier comment ADO traite la valeur
      (classe CSS produite, attribut style, etc.).
- [ ] Au-dela de 3 tentatives ratees sur du cosmetique, **inscrire TECH-DEBT et passer**.
      Voir TECH-DEBT-014.

**Reference** : Sprint 4 -> 4.6 (chaine de 5 tentatives icone Reports) -- voir CHANGELOG [0.4.0]-[0.4.6].

## Section 4 -- Versions, files, et autres pieges

A faire **avant** de proposer une modification de version, files, scopes, categories :

- [ ] La `version` est coherente entre `apps/argos-extension/package.json` ET
      `apps/argos-extension/vss-extension.json` (Changesets bump des 2, ou correction manuelle)
- [ ] Aucun fichier `.svg` dans le dossier `apps/argos-extension/static/` (politique Marketplace - bloque la publication)
- [ ] Les `categories` Marketplace existent reellement (whitelist Microsoft : "Azure Boards", "Azure Test Plans", etc.)
- [ ] Les `scopes` sont minimaux (audit `vso.work_full` en cours - TECH-DEBT separe)
- [ ] Le `publisher` matche un publisher dans la whitelist `["AlexThibaud", "ATConseil"]`
- [ ] Aucun `"public": false` si extension deja publique sur Marketplace (regle Microsoft)
- [ ] `icons.default` pointe vers un PNG (asset Marketplace, pas SVG)
- [ ] Lancer `pnpm preflight` (script auto) pour les regles mecaniques

**Reference** : Sprint 3.3 (SVG bloque Marketplace), Sprint 3.1/3.2 (publisher + visibility),
Sprint 3.4 (consistance versions), Sprint 4 -> 4.6 (versions package.json / vss-extension.json
non synchronisees -- TECH-DEBT-011 v3 root cause).

## Decision flow

1. Si une section ci-dessus revele une incertitude => **STOP**, ne pas proposer de prompt
2. Resoudre l'incertitude (consulter doc Microsoft, portail Marketplace, F12 inspection,
   code source extensions Microsoft samples)
3. Mettre a jour ce document si une nouvelle lecon emerge
4. Proposer le prompt

## Liens

- `tools/preflight/microsoft-docs-snippets.md` -- exemples Microsoft copy-paste anti-simplification
- `pnpm preflight` -- script auto (7 regles mecaniques, exit 0 = pass)
- `tools/regression/CFG-2026-05-12-preflight-rules.test.ts` -- test CI equivalent
