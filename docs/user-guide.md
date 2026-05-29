# Argos User Guide

> Version: 0.0.1-preview | Status: Work in progress

---

## Test Set / Test Plan / Precondition / Test Execution (Sprint 2.23 -- v0.5.33)

Sprint 2.23 closes the T-0.5.2 wiring : the four remaining Work Item types now have edit mode (Test Set / Test Plan / Precondition) or display-only mode (Test Execution).

### Edit a Test Set

Opening a Test Set from the **Sets** list now populates the form with the existing name, description, tags and linked Test Case ids. The submit button reads **Update Test Set** and persists changes via `testSetService.update`. Inline TC composition (input + Add button) is unchanged from earlier sprints.

### Lock / Unlock a Test Plan

A **Lock** button appears on Draft Test Plans (edit mode). Clicking it transitions the plan state to **Locked** via `testPlanService.lock`. A locked plan :

- Shows an **Unlock** button in place of Lock (Admin-only at the SDK level; the role check in the UI is deferred).
- Disables the **Save changes** button.
- Renders a notice : *"Test Plan locked. Unlock to modify (Admin only)."*

Automatic snapshot creation on Lock (US-4.1) remains deferred to Phase 3 (TestCaseVersions). The Lock here only changes the WIT state.

### Edit a Precondition

Same pattern as Test Set / Test Case : open from the **Precond.** list, the form fetches the existing Precondition and exposes an **Update Precondition** button.

### Preconditions listed on a Test Case

When a Test Case opened in edit mode has `TestVault.PreconditionLinks` set (JSON `number[]` field), the form renders a read-only **Preconditions** section listing the linked precondition ids. Resolving each precondition title is left to a follow-up sprint.

### Run a Test Case and view past executions

A **Run Test** button is visible on the Test Case form in edit mode. Clicking it navigates to a fresh Test Execution form **pre-filled with the current Test Case** (the Test Case ID field is populated automatically), so you can record a run without re-typing the id.

Opening an existing Test Execution shows it in **display-only mode** (constitution §3.5 immutability) :

- All fields — Test Plan ID, Test Case ID, Environment, Overall result, Actual result and Notes — are read-only (disabled), in addition to step results and global status.
- A **Re-run** button creates a brand-new Test Execution for the same Test Case. The previous record stays intact.

The global status (`Pass` / `Fail` / `Blocked` / `Skipped` / `Unexecuted`) is computed from the step results via the SDK helper `computeGlobalStatus` (rules : `Fail` wins over `Blocked`, `Skipped` only when every step is Skipped, otherwise `Pass`).

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

The **argos-coverage-panel** widget appears on User Story, Bug, and Requirement Work Item forms. It shows all Test Cases that have a `TestedBy`, `Validates`, or `Covers` link back to the current Work Item, alongside rich row metadata.

Since Sprint 2.22 (v0.5.32) each row exposes:

| Column | Source field | Notes |
| --- | --- | --- |
| Test Case | `System.Id` + `System.Title` | Hydrated from `testCaseService.read`. Falls back to id-only when no Services context is available. |
| State | `System.State` | Design / Ready / Active / Closed / Deprecated. |
| Priority | `TestVault.Priority` | P1 (Critical) -> P4 (Trivial). |
| Steps | `TestVault.Steps` length | Count of editable steps. |
| Assigned | `System.AssignedTo` | "-" when unassigned. |
| Latest Status | `TestVault.TestExecution.GlobalStatus` | Pass / Fail / Blocked / Skipped / `No executions`. |

Sprint 2.22 also widened the link types the panel recognises: in addition to the Argos custom relations (`TestVault.TestedBy`, `TestVault.Validates`, `TestVault.Covers`), Test Cases linked through the **standard ADO "Tested By" relation type** (`Microsoft.VSTS.Common.TestedBy-Forward`) now appear in the panel too. Reverse links and unrelated link types are ignored.

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

Since Sprint 2.21 part 3, the review surface is a **side Drawer** instead of a full-screen dialog. The Drawer slides in from the right edge and hosts all three phases of the flow (configure → generate → review).

1. Choose how many Test Cases to generate (3, 5, 7 or 10).
2. The **Area Path** and **Iteration Path** are pre-filled from the source Work Item but can be changed via the dropdowns.
3. Click **Generate suggestions**. After a few seconds, the Drawer body switches to a list of candidate Test Cases. Edit titles and descriptions inline via the **Edit** button on each card. Toggle the checkbox to deselect any candidate you do not want.
4. In the Drawer footer, three actions are available:
   - **Accept Selected (N)** — creates only the checked candidates and closes the Drawer.
   - **Accept All** — creates every candidate, regardless of the checkbox state.
   - **Dismiss** — closes the Drawer without creating anything.
5. Each created candidate is persisted as a `TestVault.TestCase` Work Item and linked back to the source via a **Tested By** relation.

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

If the form already contains steps, Argos opens a **side Drawer** (introduced in Sprint 2.21 part 3) that previews the generated steps and offers three footer actions:

- **Replace** — replaces every existing step with the generated ones.
- **Complete** — keeps the existing steps and appends the generated ones after them.
- **Cancel** — closes the Drawer with no modification.

When the form has no existing steps, the Drawer skips the choice and the **Replace** button is rebadged **Insert** for clarity. The merge logic itself is the same as it was in Sprint 2.22 — only the surface has changed.

### Editing a Test Case (Test Case form, edit mode)

Since Sprint 2.22 (v0.5.32), the Test Case form supports both **create mode** (no Test Case id) and **edit mode** (when you open an existing Test Case from the Cases list or from the Coverage Panel). In edit mode:

- The form fetches the existing Work Item via `testCaseService.read` and pre-fills every field: title, description, priority, tags, area path, iteration path, steps, BDD / Gherkin content.
- A loading placeholder is shown during the fetch (`Loading Test Case #N...`).
- If the fetch fails (Work Item deleted, permission denied, etc.), the form shows a user-facing error message with a **Back to list** button instead of an empty form.
- The submit button label switches to **Update Test Case** and the form calls `testCaseService.update` on save.

### Editing Test Case steps (Move Up / Move Down)

The **Test Steps** section is powered by the new `StepsEditor` component (Sprint 2.22). Each step has:

- An **Action** field (free text).
- An **Expected** field (free text).
- A **Move Up** arrow (disabled on the first step).
- A **Move Down** arrow (disabled on the last step).
- A **Remove (x)** button (hidden when only one step remains, so the form always keeps at least one row).

Use **+ Add Step** at the bottom of the list to append an empty step.

### BDD / Gherkin editor (Test Case form)

Each Test Case now exposes a **BDD / Gherkin** collapsible section in the form. It is powered by a Monaco code editor (the same engine that backs VS Code) configured with the **Gherkin syntax hint** above the editor: *"Gherkin syntax supported (Feature / Scenario / Given / When / Then / And)"*.

- The editor stores its content in the `TestVault.Gherkin` field of the Test Case.
- Backward compatibility: any plain text already stored before Sprint 2.21 part 3 renders unchanged.
- Validation is live: a green caption *"N scenario(s) -- valid"* appears below the editor when the content parses cleanly, and per-line errors show up if the Gherkin grammar is broken.
- The editor is read-only when the Test Case is locked (`Closed` / shipped versions).
- The full Azure Repos sync flow described under US-4.5 is **not** included in this sprint -- the editor is local to the Test Case form.

### Errors and limits

| Scenario | What you see |
| --- | --- |
| LLM key invalid or expired | *"Verify your API key in Settings"* |
| Provider down or timeout | *"LLM provider did not respond"* |
| Response truncated by `max_tokens` | Toast: *"Response truncated by max_tokens. Increase the setting or ask for fewer steps."* |
| AI not configured at all | Banner: *"AI is not configured. Go to Settings to add your LLM credentials."* |

Every AI call is journalled in `TestVault.AuditLog`. The API key is **never** logged: only the last four characters appear in audit entries.

### Advanced AI Settings — `max_tokens`

Open **Settings → AI Configuration → Advanced Settings** (collapsed by default). The **Max Tokens** slider controls the upper bound of tokens the LLM may emit per call. Higher values let the model generate more (or longer) test cases per call, at the cost of speed and tokens billed by your provider.

| Max Tokens | Approximate output | Typical latency on Azure OpenAI gpt-4o-mini |
| --- | --- | --- |
| 1 000 | ~1 test case | a few seconds |
| 2 000 | ~2–3 test cases | a few seconds |
| **4 000 (default)** | **~5–7 test cases** | **~5–15 seconds** |
| 8 000 | ~10–12 test cases | ~30 seconds |
| 16 000 | ~20+ test cases | up to ~3 minutes |

The slider also shows the live "~N test cases" estimate next to the current value so you can pick a budget without leaving the page.

**Default behaviour**: configurations saved before Sprint 2.21 part 2 (i.e. without a `maxTokens` field) keep working with the default of 4 000. No migration is needed.

**Truncation handling**: if the LLM hits the token budget mid-response, Argos detects it (`finish_reason='length'`) and shows a clear error inviting you to raise the slider or request fewer test cases. The cryptic "Parse error" that older builds leaked in this case (BCEE-QA bug 2026-05-22) is gone.

**Timeout handling**: the AbortController deadline adapts to the chosen `max_tokens` (from 30 seconds for very small budgets up to a hard cap of 5 minutes). If the LLM does not respond within the deadline, you get a clear "LLM call timed out after Xs" error suggesting either lowering the slider or checking network connectivity.

### BYOK note on the deployment / model name field

Argos does **not** ship a default model. The placeholder shown next to the **Deployment / Model Name** field is an example only — replace it with your own deployed model. The caption "Example only -- replace with your deployed model name (BYOK)" was added in Sprint 2.21 part 2 to make this unambiguous.

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
