# Argos API Reference

> Version: 1.0.0 | Cloud-Plus only | Base URL: `https://<your-functions-host>/api`

All endpoints require an Azure AD Bearer token unless marked `anonymous`. The token must belong to a member of the target ADO organization.

---

## Health

### `GET /v1/health`

Authentication: none (anonymous)

Returns the current health status of the Azure Functions host.

#### Response 200

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-08T10:00:00.000Z"
}
```

---

## LLM — Test Case Generation

### `POST /v1/llm/generate-test-cases`

Authentication: Bearer token

Generates AI test case candidates for a work item using the organization's configured BYOK LLM provider.

#### Request body

```json
{
  "orgUrl": "https://dev.azure.com/my-org",
  "userId": "user@example.com",
  "providerId": "anthropic-prod",
  "workItemTitle": "Login with SSO",
  "workItemDescription": "The user should be able to sign in using their corporate SSO credentials...",
  "params": {
    "count": 5,
    "temperature": 0.3,
    "maxTokens": 4000
  }
}
```

#### Responses

| Status | Meaning |
| --- | --- |
| 200 | Candidates generated. Body: `{ candidates: TcCandidate[], quotaRemaining: number }` |
| 400 | Invalid request (description < 50 chars, missing fields) |
| 402 | Hard quota exhausted for this user |
| 404 | Provider not configured |
| 502 | LLM returned malformed response after retry |

#### `TcCandidate` shape

```json
{
  "title": "Login with valid SSO credentials",
  "description": "Verify the happy path for SSO login",
  "steps": [
    { "action": "Navigate to login page", "expected": "Login page is displayed" },
    { "action": "Click SSO login button", "expected": "SSO provider page opens" }
  ],
  "tags": ["smoke", "auth"]
}
```

---

## Webhooks

### `POST /v1/webhooks/stripe`

Authentication: Stripe-Signature header (HMAC-SHA256)

Receives Stripe subscription lifecycle events to activate, update, or revoke Argos Cloud-Plus licenses.

Handled event types:

- `customer.subscription.created` → activates license
- `customer.subscription.updated` → updates tier / status
- `customer.subscription.deleted` → revokes license

#### Stripe webhook response 200

```json
{ "handled": true, "action": "activated", "orgUrl": "https://dev.azure.com/my-org" }
```

### `POST /v1/webhooks/bdd-sync`

Authentication: ADO webhook HMAC secret

Triggered by Azure DevOps Git push events. Synchronizes `.feature` files in the repository with TestVault Test Cases.

---

## Timer Jobs (internal)

These endpoints are not callable externally. They are Azure Functions timer triggers:

| Job | Schedule | Description |
|---|---|---|
| `quotaReset` | 1st of month, 00:00 UTC | Resets monthly AI quota counters |
| `auditRetention` | Daily, 03:00 UTC | Purges audit log entries older than configured retention |
| `flakinessDetector` | Mondays, 06:00 UTC | Computes flakiness scores for all active test cases |
