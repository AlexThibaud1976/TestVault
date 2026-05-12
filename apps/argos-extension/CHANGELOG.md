# argos-extension

## 0.4.9

### Patch Changes

- Sprint 6a: rename @atconseil/testvault-types -> @atconseil/argos-types

## 0.4.8

### Patch Changes

- Sprint 5a/5b cleanup: remove testvault-ui placeholder + dist/vsix-debug root artifacts

## 2.0.0

### Major Changes

- "Fix Reports icon: add asset:// prefix"

## 1.0.0

### Major Changes

- Try AnalyticsReport iconName for Reports hub (BarChart4 didnt render)

## 0.4.1

### Patch Changes

- Fix icon names for Preconditions and Reports hubs (Sprint 4 visual fix)

## 0.4.0

### Minor Changes

- Sprint 4: multi-hubs native ADO architecture (6 separate hubs via SDK.getContributionId() routing)

## 0.3.5

### Patch Changes

- Fix top-level placement via dedicated hub-group (Microsoft official pattern)

## 0.3.4

### Patch Changes

- fix(manifest): revert public:false — Marketplace public status locked (Sprint 3.2)
- Updated dependencies
  - @atconseil/testvault-exporters@0.3.2
  - @atconseil/testvault-gherkin@0.3.2
  - @atconseil/testvault-importers@0.3.2
  - @atconseil/testvault-sdk@0.3.2
  - @atconseil/testvault-types@0.3.2

## 0.3.1

### Patch Changes

- Revert publisher to AlexThibaud (Sprint 2 false premise). Fixes v0.3.0 CI publication failure caused by publisher mismatch between manifest and Marketplace account.
- Updated dependencies
  - @atconseil/testvault-exporters@0.3.1
  - @atconseil/testvault-gherkin@0.3.1
  - @atconseil/testvault-importers@0.3.1
  - @atconseil/testvault-sdk@0.3.1
  - @atconseil/testvault-types@0.3.1

## 0.3.0

### Minor Changes

- Top-level hub placement, Marketplace v0.3.0 positioning: Argos hub moved to ms.vss-web.project-hub-group (peer of Boards/Repos/Pipelines), categories extended to Azure Boards + Azure Test Plans, third-party branding removed from public-facing files.

### Patch Changes

- Updated dependencies
  - @atconseil/testvault-exporters@0.3.0
  - @atconseil/testvault-gherkin@0.3.0
  - @atconseil/testvault-importers@0.3.0
  - @atconseil/testvault-sdk@0.3.0
  - @atconseil/testvault-types@0.3.0
