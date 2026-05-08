# Argos Operator Guide

> For administrators deploying Argos Cloud-Plus (Azure Functions) and managing ADO Server 2022 instances.
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

### ADO Server 2022

1. Download or build the VSIX as above.
2. Navigate to your TFS/ADO Server Collection Admin → **Extensions → Manage Extensions**.
3. Upload the `.vsix` file. The extension is installed at collection level.
4. The Cloud-Plus Azure Functions tier is not available on Server — only the core VSIX features apply.

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

## ADO Server 2022 — specific notes

- Process install: follow the Process Template install guide in `docs/user-guide.md`.
- No Azure Functions are required; all data lives in ADO WITs.
- AI features (BYOK LLM, flakiness detection) are **Cloud-Plus only** and will not appear in the Server UI.
- Offline mode and BDD sync are fully supported on Server.

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

---

## SBOM and security

A CycloneDX SBOM is generated on every release and attached to the GitHub Release artifact:

```bash
pnpm dlx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

Run `npm audit --audit-level=high` before any release. CI blocks merges with high/critical advisories.
