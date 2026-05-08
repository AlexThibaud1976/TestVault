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

---

For architecture and technical details, see `plan.md` in the spec-kit.
