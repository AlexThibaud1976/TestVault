# argos-extension

## 0.4.15

### Patch Changes

- Sprint 6h: rename @atconseil/testvault-e2e to @atconseil/argos-e2e (package name + CI workflow). Option A: tools/e2e/ folder unchanged.

## 0.4.14

### Patch Changes

- Sprint 6f - rename @atconseil/testvault-gherkin to @atconseil/argos-gherkin (6th and last Groupe 1 rename in packages/).

## 0.4.13

### Patch Changes

- Sprint 6e: rename @atconseil/testvault-exporters -> @atconseil/argos-exporters

## 0.4.12

### Patch Changes

- Sprint 6d: rename @atconseil/testvault-importers -> @atconseil/argos-importers

## 0.4.11

### Patch Changes

- Sprint 6c: rename @atconseil/testvault-sdk -> @atconseil/argos-sdk (5 consumers, 47 source files)
- Updated dependencies
  - @atconseil/argos-sdk@0.3.4
  - @atconseil/testvault-exporters@0.3.3

## 0.4.10

### Patch Changes

- Sprint 6b: rename @atconseil/testvault-wit-schema -> @atconseil/argos-wit-schema

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
