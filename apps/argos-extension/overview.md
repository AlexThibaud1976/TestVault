# Argos — Test Management for Azure DevOps

**Argos** brings Xray-class test management natively into Azure DevOps, using Custom Work Items so your test data stays in your own ADO instance.

## Features

- **Test Cases & Test Sets** — create, organize, and tag test cases as native ADO work items
- **Test Plans & Execution** — plan releases, run tests, record pass/fail/blocked per environment
- **Requirements Coverage Matrix** — link test cases to User Stories and Bugs, visualize coverage at a glance
- **AI-assisted generation** — generate test case candidates from work item descriptions (BYOK: Anthropic, OpenAI, or Azure OpenAI)
- **Import / Export** — import from CSV, Excel, JUnit, NUnit, xUnit, TestNG, Cucumber; export to Excel and PDF
- **BDD / Gherkin sync** — keep feature files in Git in sync with ADO test cases via webhook
- **ADO Cloud + Server 2022** — same feature set on both

## Data sovereignty

All test data is stored as native Custom Work Items in your ADO project. Nothing is sent to ATConseil servers except anonymous telemetry (extension version, operation duration).

## Getting started

1. Install the extension from the Marketplace
2. Open any ADO project → **Argos** hub in the left navigation
3. Follow the setup wizard to install the Custom Work Item types into your process

## Support

- Documentation: [atconseil.info/argos](https://atconseil.info/argos)
- Issues: [github.com/AlexThibaud1976/TestVault](https://github.com/AlexThibaud1976/TestVault/issues)
