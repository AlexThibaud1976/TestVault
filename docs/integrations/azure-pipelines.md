# TestVault — Azure Pipelines Task Integration

The `ArgosUploadResults` task uploads CI test results to TestVault (Argos) in Azure DevOps by matching test results to Test Cases via `automationKey`.

## Quick start

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: UseDotNet@2
    inputs:
      packageType: sdk

  - script: dotnet test --logger "junit;LogFilePath=$(Build.SourcesDirectory)/test-results.xml"
    displayName: Run tests

  - task: ArgosUploadResults@1
    displayName: Upload results to TestVault
    inputs:
      pat: $(ADO_PAT)
      orgUrl: https://dev.azure.com/my-org
      project: MyProject
      planId: "42"
      resultsFile: test-results.xml
      environment: CI
```

## Task inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `pat` | ✅ | — | Azure DevOps Personal Access Token with work item read/write |
| `orgUrl` | ✅ | — | ADO organisation URL, e.g. `https://dev.azure.com/acme` |
| `project` | ✅ | — | ADO project name |
| `planId` | ✅ | — | TestVault Test Plan work item ID |
| `resultsFile` | ✅ | — | Path to the results file. Supports JUnit `.xml`, NUnit `.xml`, xUnit `.xml`, TestNG `.xml`, Cucumber `.json` |
| `environment` | ✅ | — | Target environment name (e.g. `CI`, `Staging`) |
| `autoCreate` | — | `false` | Auto-create missing Test Cases when no match found by `automationKey` |
| `strict` | — | `false` | Fail the task if any result has no matching Test Case |
| `areaPath` | — | project root | Area path for auto-created Test Cases |

## Supported formats

| Format | Extension | Detection |
|---|---|---|
| JUnit | `.xml` | `<testsuite>` root element |
| NUnit 2/3 | `.xml` | `<test-results>` or `<test-run>` root |
| xUnit | `.xml` | `<assemblies>` root |
| TestNG | `.xml` | `<testng-results>` root |
| Cucumber JSON | `.json` | Array of feature objects |

## How matching works

Each test result is matched to a TestVault Test Case by `automationKey`:

- **JUnit**: `classname.name` (e.g. `com.example.LoginTest.testLogin`)
- **Cucumber**: `element.id` from the JSON report
- **NUnit**: `fullname` attribute
- **xUnit**: `type.method`
- **TestNG**: `classname.methodName`

Set `automationKey` on a Test Case in TestVault to enable matching. Results without a matching Test Case are counted as `unmatched` (or fail the task with `strict: true`).

## Storing the PAT securely

Never hard-code the PAT in the pipeline YAML. Store it as a secret variable:

1. In Azure DevOps, go to **Pipelines → Library → Variable groups**.
2. Create a variable group (e.g. `TestVault`) and add `ADO_PAT` as a secret.
3. Link the variable group to your pipeline and reference it as `$(ADO_PAT)`.

Alternatively, use a **service connection** or pipeline variable marked as secret in the pipeline UI.

## Example with auto-create

```yaml
- task: ArgosUploadResults@1
  displayName: Upload results to TestVault
  inputs:
    pat: $(ADO_PAT)
    orgUrl: https://dev.azure.com/acme
    project: MyProject
    planId: "42"
    resultsFile: "**/**/TEST-*.xml"
    environment: Staging
    autoCreate: true
    areaPath: "MyProject\\Team A"
```

## Example: Maven + JUnit

```yaml
steps:
  - task: Maven@4
    inputs:
      mavenPomFile: pom.xml
      goals: test
      publishJUnitResults: false

  - task: ArgosUploadResults@1
    inputs:
      pat: $(ADO_PAT)
      orgUrl: $(System.TeamFoundationCollectionUri)
      project: $(System.TeamProject)
      planId: $(TESTVAULT_PLAN_ID)
      resultsFile: target/surefire-reports/TEST-*.xml
      environment: CI
```

## Example: pytest + JUnit XML

```yaml
steps:
  - script: pytest --junitxml=test-results.xml
    displayName: Run pytest

  - task: ArgosUploadResults@1
    inputs:
      pat: $(ADO_PAT)
      orgUrl: https://dev.azure.com/acme
      project: MyProject
      planId: "42"
      resultsFile: test-results.xml
      environment: CI
```
