# Microsoft Docs Snippets -- Manifest ADO

> Exemples copy-paste **integraux** depuis la doc Microsoft officielle.
> **Ne pas simplifier, ne pas reformuler.**
> Source : https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

## Hub-group + Hub pattern (validated Sprint 3.4)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-hub

```json
"contributions": [
    {
        "id": "sample-hub-group",
        "type": "ms.vss-web.hub-group",
        "description": "Adds a 'Samples' hub group at the project level.",
        "targets": [
            "ms.vss-web.project-hub-groups-collection"
        ],
        "properties": {
            "name": "Samples",
            "order": 100
        }
    },
    {
        "id": "hello-hub",
        "type": "ms.vss-web.hub",
        "description": "Adds a 'Hello' hub to the Samples hub group.",
        "targets": [
            ".sample-hub-group"
        ],
        "properties": {
            "name": "Hello",
            "order": 99,
            "uri": "hello-world.html"
        }
    }
]
```

**Cles a retenir** :
- Hub-group target: `ms.vss-web.project-hub-groups-collection` (plural "groups")
- Hub-group type: `ms.vss-web.hub-group`
- Hub interne cible le hub-group via reference relative `.sample-hub-group`
  (point + ID court, **PAS** la syntaxe complete `publisher.extension.contributionId`)

## Hub avec iconName Fluent UI

Source: https://learn.microsoft.com/en-us/azure/devops/extend/reference/targets/overview

```json
"properties": {
    "iconName": "Code",
    "name": "Code Hub",
    "order": 30,
    "uri": "/views/code/custom.html"
}
```

**Note Sprint 4** : la liste exhaustive des `iconName` valides cote ADO sandbox n'est pas documentee.
Les noms simples non-numerotes (View, Code, BulletedList, Settings) ont la meilleure probabilite.
Voir TECH-DEBT-014 pour la methode d'inspection F12.

**Confirmes OK** : BulletedList, TestBeaker, FolderList, Warning, Settings
**Confirmes KO** : ReportDocument, BarChart4, AnalyticsReport, Important (Sprint 4 -> 4.6)

## Hub avec icon PNG (valide pour hub-group, pas pour hub interne)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/reference/targets/overview

```json
"properties": {
    "name": "Sample hub",
    "uri": "dist/Hub/Hub.html",
    "icon": "asset://static/sample-icon.png",
    "supportsMobile": true
}
```

**Note Sprint 4.4/4.5** : empiriquement pour `ms.vss-web.hub` (hub internes), `icon` est traite
comme `iconName` (silent failure, classe CSS `ms-Icon--<valeur>`).
Pour `ms.vss-web.hub-group`, `icon` fonctionne.
Verifier le type de contribution avant d'utiliser.

## Manifest publisher / visibility (validated Sprint 3.1 / 3.2)

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

- `"publisher"` doit matcher un publisher dans le Marketplace ET le PAT CI doit etre associe a ce publisher
- Par defaut Marketplace = public. Pour private : `"public": false`.
  **Mais : impossible de downgrade Public -> Private sur un extensionId existant.**
  Si besoin private, creer nouvel extensionId.

## Categories Marketplace valides

Source: https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest

Liste partielle (a enrichir) :
- "Azure Boards"
- "Azure Test Plans"
- "Azure Repos"
- "Azure Pipelines"
- "Azure Artifacts"

## Anti-patterns identifies (Sprint 2 -> 4.5)

| Anti-pattern | Sprint | Symptome |
|---|---|---|
| Inventer un target ID "logique" sans verification doc | Sprint 3 | Extension acceptee, hub silent au runtime |
| Utiliser un iconName Fluent UI numerote (BarChart4) ou compose (ReportDocument) | Sprint 4 -> 4.3 | Icone vide, classe CSS ms-Icon--<name> non-existante |
| Utiliser `icon: "static/..."` sans prefixe ou `asset://` pour ms.vss-web.hub | Sprint 4.4/4.5 | Treats as iconName, silent failure |
| Reformuler ATConseil -> AlexThibaud "logiquement" pendant rename | Sprint 2 | Publisher mismatch au publish |
| `"public": false` sans verif Marketplace state | Sprint Marketplace prive | Microsoft refus downgrade |
| Changeset major au lieu de patch | Sprint chore/close-reports-icon-search | package.json passe 0.4.6 -> 1.0.0, vss-extension.json desynchronise |
