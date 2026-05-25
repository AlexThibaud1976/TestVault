# Argos Operator Guide

> For administrators deploying Argos Cloud-Plus (Azure Functions) on Azure DevOps Services.
> Version: 1.0.0

---

## Prerequisites

- Azure subscription with contributor access
- ADO organization with Process Administrator rights
- Node.js 22 LTS + pnpm 9 on the build machine
- Azure CLI (`az`) authenticated
- `tfx-cli` for VSIX packaging: `npm install -g tfx-cli`

---

## Installing the VSIX extension

### ADO Cloud

1. Download the latest `argos-*.vsix` from the [GitHub Releases](https://github.com/AlexThibaud1976/TestVault/releases) page or build from source:

   ```bash
   pnpm install
   pnpm --filter argos-extension build:vsix
   ```

2. In your ADO organization, go to **Organization Settings → Extensions → Browse Marketplace** and search for **Argos** (publisher: ATConseil), or upload the VSIX manually under **Manage Extensions → Upload**.

3. Grant access to projects where Argos should be active.

---

## Deploying Azure Functions (Cloud-Plus)

### Infrastructure setup

```bash
# Create resource group and Function App (Premium plan, francecentral)
az group create --name argos-prod-rg --location francecentral
az functionapp create \
  --name argos-functions-prod \
  --resource-group argos-prod-rg \
  --plan argos-premium-plan \
  --runtime node \
  --runtime-version 22 \
  --functions-version 4 \
  --storage-account argosstorageprod
```

### Required environment variables

Set these in **Function App → Configuration → Application settings**:

| Variable | Description |
| --- | --- |
| `AZURE_KEY_VAULT_URL` | URL of the Key Vault holding `ArgosLlmMasterKey` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `ADO_WEBHOOK_SECRET` | HMAC secret for ADO Git push webhooks |
| `LICENSE_PUBLIC_KEY_PEM` | Ed25519 public key PEM for license validation |
| `ARGOS_FUNCTIONS_URL` | Public URL of this Function App (for health checks) |

### Key Vault secrets

Create the following secrets in Azure Key Vault:

```bash
az keyvault secret set --vault-name argos-kv-prod \
  --name ArgosLlmMasterKey \
  --value "<32-byte-hex-encoded-random-value>"
```

Assign the Function App's managed identity `Key Vault Secrets User` role on the vault.

### Deploying

```bash
pnpm turbo build --filter=argos-functions
cd apps/argos-functions
func azure functionapp publish argos-functions-prod
```

### Health check

```bash
curl https://argos-functions-prod.azurewebsites.net/api/v1/health
# Expected: {"status":"ok","version":"1.0.0","timestamp":"..."}
```

---

## BYOK LLM Configuration

Project Administrators configure LLM providers through the Argos hub:

1. Navigate to **Hub → Settings → AI Configuration**.
2. Click **Add Provider** and select the provider type (Anthropic / OpenAI / Azure OpenAI).
3. Enter the Model ID and API key. The key is encrypted with AES-256-GCM (HKDF-SHA256 per-org key, master key in Key Vault) before storage. Only the last 4 characters are shown after saving.
4. Set the monthly quota limit and enforcement mode (Hard / Soft).
5. Use **Test Connection** to verify the key is valid before saving.

The customer's API key **never leaves the Azure Functions host in plaintext** and is wiped from memory immediately after each call (`buffer.fill(0)`).

---

## Quota management

Monthly quotas reset on the 1st of each month UTC (timer trigger `quotaReset`).

- **Hard mode**: requests are blocked once the limit is reached.
- **Soft mode**: requests are allowed over the limit with a warning.

Administrators can reset a user's quota manually via the Quota Settings panel.

---

## Audit log retention

Default retention: **730 days** (2 years). Minimum enforced: **90 days**.

The `auditRetention` timer job runs daily at 03:00 UTC and purges entries older than the configured retention period.

To change retention:

1. Navigate to **Hub → Settings → Audit Log**.
2. Update the **Retention (days)** field and click **Save**.

---

---

## Troubleshooting

### Extension not appearing in hub

- Verify the extension is **installed and enabled** for the project.
- Check that the user has at least **Contributor** permissions on the project.
- Clear the browser extension cache: press `Ctrl+Shift+R` on the hub page.

### Azure Functions returning 503

- Check the Function App is running: `az functionapp show --name argos-functions-prod --resource-group argos-prod-rg --query state`.
- Verify `setLlmServices()` is called in the Function App startup (`src/index.ts`).
- Confirm Key Vault access: the managed identity must have `Key Vault Secrets User` role.

### LLM returns 502

- The LLM provider returned a malformed response after 2 attempts.
- Verify the Model ID is correct and the API key has sufficient permissions.
- Check the provider's status page for outages.

### Flakiness scores not updating

- The `flakinessDetector` job runs Mondays at 06:00 UTC. Manual trigger: `func start --functions flakinessDetector` in a local dev environment.
- Verify `IFlakinessDataSource` is correctly wired at Function App startup.

### AI button greyed out in the Test Case form

The **✨ AI Suggest Steps** button in the Test Case form is intentionally disabled until the user provides enough context to make a useful prompt. To enable it, either:

- enter a Test Case **Title**, or
- add at least one **linked requirement** (User Story / Bug / Requirement) in the **Linked Items** section.

The tooltip on the disabled button states this explicitly. This behaviour is the spec-kit decision Q7 (lenient activation: title OR link).

### Where did the AI button go? (Sprint 2.22 migration)

Argos splits AI assistance into two surfaces depending on intent:

- **Generating new Test Cases from a requirement** uses the **✨ Suggest Tests** button on the **Argos Coverage Panel** of a User Story, Bug, or Requirement (right-side tab on the Work Item form).
- **Drafting steps for the Test Case currently being edited** uses the **✨ AI Suggest Steps** button inside the Test Case form's Steps section.

Before Sprint 2.22 the same button existed in the Test Case form for both intents and would silently create Test Case Work Items on click -- which failed because the form did not yet collect an Area Path. The button has been split (US-5.1 vs US-5.1.1) and the broken create flow removed. See `docs/user-guide.md` (AI assistance) for the full BREAKING CHANGE note.

---

## SBOM and security

A CycloneDX SBOM is generated on every release and attached to the GitHub Release artifact:

```bash
pnpm dlx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

Run `npm audit --audit-level=high` before any release. CI blocks merges with high/critical advisories.

---

## ADO Extension Contribution Points

This section documents the exact ADO hub groups and contribution targets used by Argos, to prevent regressions when updating `vss-extension.json`.

### Hub contribution — Boards tab

| Field | Value |
|---|---|
| Contribution type | `ms.vss-web.hub` |
| Target | `ms.vss-work-web.work-hub-group` |
| URI | `dist/hub/hub.html` |

**Why `ms.vss-work-web.work-hub-group` and not `ms.vss-web.project-hub-group`?**

`ms.vss-web.project-hub-group` places the hub in the top-level Project navigation (alongside Repos, Pipelines, etc.). `ms.vss-work-web.work-hub-group` places it inside **Boards** — the correct location for a test management tool that is work-item-centric. Using the wrong group causes the tab to appear in the wrong section or not at all.

### Coverage panel contribution — Work Item Form page

| Field | Value |
|---|---|
| Contribution type | `ms.vss-work-web.work-item-form-page` |
| Target | `ms.vss-work-web.work-item-form` |
| URI | `dist/widgets/coverage-panel/index.html` |

The coverage panel is a **separate bundle** from the main hub. Its entry point (`src/widgets/coverage-panel/index.tsx`) initializes the ADO SDK independently, retrieves the current work item ID via the Work Item Form Service (`ms.vss-work-web.work-item-form`), and renders the `CoveragePanel` React component.

Pointing this contribution at `dist/hub/hub.html` (the main hub bundle) would load the full Argos application inside a narrow work item form panel — visually broken and functionally wrong.

### Declared scopes and why each is needed

| Scope | Reason |
|---|---|
| `vso.work_full` | CRUD on Test Cases, Test Plans, Preconditions, Test Executions (Custom WITs) + Attachments for evidence |
| `vso.profile` | Retrieve current user identity for audit logging and execution attribution |
| `vso.code` | Read Gherkin feature files from Azure Repos (BDD sync feature) |
| `vso.extension.data_write` | ExtensionDataService — stores lightweight config (LLM provider, quota, repo mappings) at org scope |
| `vso.identity` | Resolve ADO groups for role derivation (Admin / Contributor / Reader) |

### Manifest targets

`vss-extension.json` declares `Microsoft.VisualStudio.Services.Cloud` as the sole target. This restricts the extension to Azure DevOps Services (Cloud) only, per constitution v0.3.0 §1.
