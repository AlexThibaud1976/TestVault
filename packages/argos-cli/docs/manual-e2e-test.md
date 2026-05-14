# Manual E2E Test -- argos install

This document describes how to test the `argos install` command on a real Azure DevOps instance.

## Prerequisites

- Real Azure DevOps Cloud organization (with admin access)
- Test project (separate from production)
- Personal Access Token (PAT) with "Process (Read & manage)" scope
- Node.js 20+ installed locally

## Test scenarios

### Scenario 1: Not installed -> Full install

```bash
# Use a fresh project that has never had Argos installed
npx @atconseil/argos-cli install \
  --org-url https://dev.azure.com/myorg \
  --project "TestProject" \
  --pat <YOUR_PAT> \
  --base-process Agile \
  --process-name "Argos Inherited Agile Test"
```

Expected:
- Detection: "not-installed"
- Confirmation prompt -> y
- Progress: creating-process, creating-picklists, creating-wits (7 WIT)
- Final: "[OK] Installation complete!"
- In ADO portal: new process visible at Organization Settings > Process

### Scenario 2: Partial -> Sync schema

Pre-condition: install partial schema manually (e.g., remove a WIT from process via ADO portal).

```bash
npx @atconseil/argos-cli install --pat <YOUR_PAT> --org-url ... --project ...
```

Expected:
- Detection: "partial"
- Lists missing WIT refs
- Confirmation -> y
- Re-installs missing WITs

### Scenario 3: Already installed -> No-op

```bash
npx @atconseil/argos-cli install --pat <YOUR_PAT> --org-url ... --project ...
```

Expected:
- Detection: "installed" (schema version matches)
- Message: "[OK] Argos already installed (...). Nothing to do."
- Exit code 0

### Scenario 4: Permission error

Run with a PAT missing "Process (Read & manage)" scope.

Expected:
- Exit code 2 or 3
- Clear error message about PAT scope

## Post-install verification in extension

1. Refresh Argos extension on instance ADO
2. Wizard "Get Started" -> Detection -> "Argos installed in this project"
3. Click "Go to dashboard"
4. Create Test Case -> should succeed (no more VS402323)
