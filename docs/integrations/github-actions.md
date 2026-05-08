# TestVault — GitHub Actions Integration

The `atconseil/testvault-action` composite action uploads CI test results to TestVault (Argos) in Azure DevOps by matching test results to Test Cases via `automationKey`.

## Quick start

```yaml
# .github/workflows/test-and-upload.yml
name: Test and upload results

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: mvn test  # or pytest, dotnet test, go test, etc.

      - name: Upload results to TestVault
        uses: atconseil/testvault-action@v1
        with:
          pat: ${{ secrets.ADO_PAT }}
          org-url: https://dev.azure.com/my-org
          project: MyProject
          plan-id: "42"
          results-file: target/surefire-reports/TEST-*.xml
          environment: CI
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `pat` | ✅ | — | Azure DevOps Personal Access Token with work item read/write |
| `org-url` | ✅ | — | ADO organisation URL, e.g. `https://dev.azure.com/acme` |
| `project` | ✅ | — | ADO project name |
| `plan-id` | ✅ | — | TestVault Test Plan work item ID |
| `results-file` | ✅ | — | Path to the results file. Supports JUnit `.xml`, NUnit `.xml`, xUnit `.xml`, TestNG `.xml`, Cucumber `.json` |
| `environment` | ✅ | — | Target environment name (e.g. `CI`, `Staging`) |
| `auto-create` | — | `false` | Auto-create missing Test Cases when no match found by `automationKey` |
| `strict` | — | `false` | Fail the action if any result has no matching Test Case |
| `area-path` | — | project root | Area path for auto-created Test Cases |
| `cli-version` | — | `latest` | Version of `@atconseil/testvault-cli` to install |

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

Set `automationKey` on a Test Case in TestVault to enable matching. Results without a matching Test Case are counted as `unmatched` (or fail with `--strict`).

## Example with auto-create

```yaml
- uses: atconseil/testvault-action@v1
  with:
    pat: ${{ secrets.ADO_PAT }}
    org-url: https://dev.azure.com/acme
    project: MyProject
    plan-id: "42"
    results-file: test-results.xml
    environment: CI
    auto-create: true
    area-path: "MyProject\\Team A"
```
