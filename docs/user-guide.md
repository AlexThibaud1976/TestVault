# Argos User Guide

> Version: 0.0.1-preview | Status: Work in progress

---

## Phase 1 — Referential CRUD

The hub exposes five navigation sections: **Plans**, **Cases**, **Sets**, **Precond.** (Preconditions), and **Reports**. The default view shows active Test Plans and recently-failed executions.

All CRUD operations for Test Cases, Test Sets, Test Plans, and Preconditions are available from the sidebar. Each entity maps to a native ADO Custom Work Item (`TestVault.*`).

---

## Phase 2 — Executing tests

### Running a Test Case

1. Navigate to a Test Plan → click **Run** on a Test Case.
2. Select the target **Environment** (required).
3. For each step, set a status: Pass / Fail / Blocked / Skipped. A comment is required if any step is Fail.
4. Optionally attach evidence (screenshots, logs, videos) per step or globally.
5. Click **Save Run** to finalize. The run becomes immutable immediately.

### Execution lifecycle

| State | Description |
| --- | --- |
| `InProgress` | Run has been started; step results can still be saved. |
| `Completed` | Run has been finalized. No further changes allowed except linking bugs. |

### Global status derivation

The global status is calculated automatically from step results when a run is finalized:

| Condition | Global Status |
| --- | --- |
| No steps recorded | `Unexecuted` |
| Any step is `Fail` | `Fail` |
| Any step is `Blocked`, none are `Fail` | `Blocked` |
| All steps are `Skipped` | `Skipped` |
| All steps are `Pass` | `Pass` |

### Linking a Bug

After a run is finalized with a **Fail** global status, the **Create Bug from Failure** button appears. Clicking it opens an inline form pre-filled with:

- **Title** — `[Fail] {Test Case title} — {Environment}`
- **Severity** — defaults to `2 - High` (editable)
- **Repro Steps** — auto-generated from each failed step's action, expected value, and observed comment

On submission the Bug Work Item is created in ADO and bidirectionally linked: a `System.LinkTypes.Related` relation from the Bug to the Test Execution WI, and a `linkBug` entry on the execution record. Cancel closes the form and returns to the saved-run view.

### Execution history

The `ExecutionHistory` component displays a paginated list of all finalized executions for a given Test Case. Features:

- **Filters** — environment (dropdown limited to configured environments), global status, from/to date range; applied by clicking **Apply Filters**
- **Environment matrix** — a summary row showing the latest status per environment for the current page
- **Pagination** — 20 results per page; Previous / Next controls appear when `total > 20`

Each row shows: date, environment, global status, bug count, and executed-by user.

### Immutability guarantee

A finalized execution (`System.State = Completed`) cannot be modified. Any attempt to call `saveStepResult` or `attachEvidence` on a completed execution returns a `403 Forbidden` error (`TestExecutionImmutableError`). To re-test, use **Re-run** which creates a new linked execution.

---

## Phase 3 — Traceability

### Work Item links on a Test Case

On the Test Case form, the **Work Item Links** panel (`WorkItemLinkPanel`) lets you link ADO Work Items bidirectionally. Three semantic link types are available:

| Type | Meaning |
| --- | --- |
| `TestedBy` | This TC tests the linked Work Item |
| `Validates` | This TC validates the linked requirement |
| `Covers` | This TC covers the linked feature |

Links are stored as `System.LinkTypes.Related` ADO relations with a `TestVault.LinkType` attribute. Because ADO related links are bidirectional, the link also appears on the target Work Item.

**Orphan detection** — click **Detect Orphans** to check which linked Work Items have been deleted. Orphans are highlighted with an orange badge.

### Test Coverage panel (User Story / Bug / Requirement)

The **argos-coverage-panel** widget appears on User Story, Bug, and Requirement Work Item forms. It shows all Test Cases that have a `TestedBy`, `Validates`, or `Covers` link back to the current Work Item, alongside the latest execution status per Test Case.

---

### Tagged Snapshots (Test Case versions)

The **Snapshots** panel on a Test Case lets you freeze a named, immutable copy of the current Test Case at any point in time.

- Click **Create Snapshot**, enter a name (e.g. `v1.0`) and an optional comment, then click **Create**.
- Each snapshot stores the title, description, steps, and tags at creation time.
- Snapshot names must be unique per Test Case — a duplicate name returns an error inline.
- Snapshots are immutable (`System.State = Frozen`): once created they cannot be edited.

### Version diff (side-by-side comparison)

Select any two snapshots and click **Compare** to open the `SnapshotDiffPanel`. It shows:

- **Title / Description** — changed values side-by-side (red = before, green = after).
- **Tags** — removed tags in red, added tags in green.
- **Steps** — a side-by-side table computed by LCS (Longest Common Subsequence); equal rows are neutral, removed rows are highlighted red, added rows are highlighted green.

### Requirements Coverage Matrix

The **Coverage Matrix** (`CoverageMatrix` component) shows a cross-table of Work Items (rows) × Test Cases (columns). Each cell displays the latest execution status for the corresponding TC:

- **Green** — latest execution is `Pass`
- **Red** — latest execution is `Fail`
- **Amber** — latest execution is `Blocked`
- **Blue** — TC is linked but has no execution yet
- **—** — TC is not linked to this Work Item

An **Environment** filter dropdown narrows cells to a specific environment. The matrix only shows WIs that have at least one linked TC, and only TC columns that are referenced by a link.

Use **Export Excel** to download a colour-coded `.xlsx` file (SheetJS), or **Export PDF** to open a printable HTML version in a new tab.

### Auto-snapshot on Test Plan lock

When a Test Plan transitions to **Locked** state via `lockWithAutoSnapshot`, Argos automatically creates one snapshot per Test Case in the plan (from all referenced Test Sets and `additionalTestCaseIds`). The snapshot names follow the pattern `auto-lock-{planId}-{tcId}`. The resulting snapshot IDs are stored in `TestVault.LockedSnapshotIds` on the plan Work Item, ensuring executions run against an immutable version of each Test Case.

---

For architecture and technical details, see `plan.md` in the spec-kit.

---

## AI assistance (BYOK)

Argos exposes two distinct AI entry points, each scoped to a clearly different intent. Both call the configured LLM provider directly from the browser (no Argos backend, no proxy). Customers always Bring Their Own Key (BYOK) and the key never leaves their ADO tenant.

> **BREAKING CHANGE (Sprint 2.22)** — The AI button inside the Test Case form **no longer creates Test Cases**. To generate Test Cases from a requirement, use the **Suggest Tests** button on the Coverage Panel of a User Story, Bug, or Requirement. The button inside the Test Case form has been renamed **AI Suggest Steps** and only fills the Steps section of the Test Case being edited.

### Generate Test Cases from a Requirement — Coverage Panel

Open a **User Story**, **Bug**, or **Requirement** Work Item in ADO. In the **Argos Coverage Panel** (right-side tab on the Work Item form), click **✨ Suggest Tests**.

1. Choose how many Test Cases to generate (3, 5, 7 or 10).
2. The **Area Path** and **Iteration Path** are pre-filled from the source Work Item but can be changed via the dropdowns.
3. Click **Generate suggestions**. After a few seconds, a preview lists the candidate Test Cases. Edit titles, descriptions, steps and tags inline. Toggle the checkbox to deselect any candidate you do not want.
4. Click **Create N selected**. Each candidate is persisted as a `TestVault.TestCase` Work Item and linked back to the source via a **Tested By** relation.

The Suggest Tests button is **only** visible on User Story, Bug and Requirement. On other Work Item types (Test Case, Task, Epic, etc.), the button is hidden.

### Suggest Steps for the current Test Case — Test Case form

When you are creating or editing a Test Case from the Argos hub, the **✨ AI Suggest Steps** button (in the Test Steps section) generates a draft list of steps for the Test Case you are currently editing. **It does not create any new Test Case Work Item.** The result fills the Steps section of the form in memory; you still need to click **Create Test Case** / **Save** to persist.

The button activates as soon as you have either:

- entered a **Title** for the Test Case, **or**
- added at least one **linked requirement** (User Story / Bug / Requirement) in the Linked Items section.

If neither is set, the button is disabled with the tooltip *"Set a title or link a requirement to enable AI suggestions"*.

After clicking the button:

- Choose the number of steps (1–15, default 5) and click **Generate**.
- Review and edit each `{action, expected}` pair inline.
- Click **Accept**.

If the form already contains steps, Argos asks whether to **Replace existing**, **Append to existing**, or **Cancel** before applying the changes. Cancel returns to the form with no modification.

### Errors and limits

| Scenario | What you see |
| --- | --- |
| LLM key invalid or expired | *"Verify your API key in Settings"* |
| Provider down or timeout | *"LLM provider did not respond"* |
| Response truncated by `max_tokens` | Toast: *"Response truncated by max_tokens. Increase the setting or ask for fewer steps."* |
| AI not configured at all | Banner: *"AI is not configured. Go to Settings to add your LLM credentials."* |

Every AI call is journalled in `TestVault.AuditLog`. The API key is **never** logged: only the last four characters appear in audit entries.

---

## Phase 4 — Import / Export / CLI

### Importing Test Cases

The **Import** wizard (accessible from Settings or the Cases list) accepts the following formats:

| Format | Extension | Notes |
| --- | --- | --- |
| CSV | `.csv` | Auto-detects comma or semicolon delimiter. Columns: `title` (required), `description`, `steps` (JSON array), `tags` (`;`-separated), `automationKey` |
| Excel | `.xlsx` | Same columns as CSV, first sheet used |
| JUnit XML | `.xml` | Maps each `<testcase>` to a TC; `classname.name` becomes `automationKey` |
| NUnit XML | `.xml` | Supports NUnit 2 (`test-results`) and NUnit 3 (`test-run`) formats |
| xUnit XML | `.xml` | Maps each `<test>` element; `type.method` becomes `automationKey` |
| TestNG XML | `.xml` | Maps each `<test-method>`; `class.method` becomes `automationKey` |
| Cucumber JSON | `.json` | Maps each `scenario` to a TC; steps mapped to `action` fields |

Steps are carried over when the source format includes step-level data (Cucumber, CSV/Excel with JSON steps column).

The `automationKey` field enables matching when uploading CI results — a test result with the same `automationKey` as an existing TC will update that TC's latest execution status rather than creating a duplicate.

### CI / CD integration

Upload results from any CI system using the `argos` CLI, the `atconseil/argos-action` GitHub Action, or the `ArgosUploadResults` Azure Pipelines task. All three accept the same test result formats listed above and share the same matching logic. See `docs/integrations/` for quick-start examples.

### Webhook ingestion (Cloud-Plus)

Webhook tokens allow external CI systems (Jenkins, TeamCity, Bamboo, etc.) to push test results to Argos without installing the CLI.

#### Setting up a webhook token

1. Open **Settings → Webhook Tokens** (Admin-only).
2. Click **New token**, enter a label, and click **Create**.
3. Copy the displayed **secret** — it will never be shown again.
4. Record the generated **endpoint URL**: `https://<your-functions-host>/api/v1/webhooks/<token-id>`

#### Configuring the CI job

Sign each POST request with an HMAC-SHA256 signature using the secret:

```bash
# Example: curl with HMAC signature
BODY=$(cat test-results.xml)
SIG="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$TOKEN_SECRET" | awk '{print $2}')"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/xml" \
  -H "X-Hub-Signature-256: $SIG" \
  --data-binary "$BODY"
```

The endpoint accepts the same formats as the import wizard (JUnit, NUnit, xUnit, TestNG, Cucumber JSON). The payload is processed asynchronously via a queue — the endpoint returns `202 Accepted` immediately.

#### Revoking a token

Open **Settings → Webhook Tokens**, find the token, and click **Revoke**. Revoked tokens are rejected immediately; no restart required.
