# TestVault SDK Reference

> Generated from TypeScript types. Updated on each release.
> Full TypeDoc output will be auto-generated during Phase 4 development.

---

## TestExecutionService

Factory: `createTestExecutionService(adoClient, project)`

Manages `TestVault.TestExecution` Work Items. Executions are **immutable once finalized** — any mutation after `finalizeRun()` throws `TestExecutionImmutableError` (HTTP 403).

### Methods

#### `startRun(draft: ExecutionDraft): Promise<InProgressExecution>`

Creates a new execution in `InProgress` state. Requires `environment` to be non-blank.

```typescript
const run = await executionService.startRun({
  testPlanId: 10,
  testCaseId: 5,
  environment: "QA",          // required
  source: "Manual",           // optional — defaults to "Manual"
  testCaseVersionId: 42,      // optional — for locked Test Plans
});
```

#### `saveStepResult(id, result): Promise<InProgressExecution>`

Appends a `TestStepResult` to the execution. Throws `TestExecutionImmutableError` if already `Completed`.

#### `attachEvidence(id, evidence): Promise<InProgressExecution>`

Appends an `EvidenceRef` (already uploaded via the ADO Attachments API) to the execution. Throws `TestExecutionImmutableError` if already `Completed`.

#### `finalizeRun(id): Promise<TestVaultTestExecution>`

Transitions the execution to `Completed`, calculates `globalStatus` from all step results, and returns the immutable `TestVaultTestExecution`. Throws `TestExecutionImmutableError` if already `Completed`.

**Global status derivation:**

| Condition | globalStatus |
| --- | --- |
| No steps recorded | `Unexecuted` |
| Any step is `Fail` | `Fail` |
| Any step is `Blocked`, none `Fail` | `Blocked` |
| All steps are `Skipped` | `Skipped` |
| All steps are `Pass` | `Pass` |

#### `linkBug(id, bugId): Promise<TestVaultTestExecution>`

Appends a Bug Work Item ID to the `bugLinks` array of a **finalized** execution. Throws if the execution is still `InProgress`.

### Error types

| Error | HTTP | When |
| --- | --- | --- |
| `TestExecutionImmutableError` | 403 | Mutation attempted on a `Completed` execution |

#### `listExecutions(options): Promise<ExecutionPage>`

Returns a paginated list of finalized executions for a Test Case.

```typescript
const page = await executionService.listExecutions({
    testCaseId: 42,
    environment: "QA",      // optional
    status: "Fail",         // optional
    from: "2026-05-01",     // optional ISO date
    to: "2026-05-31",       // optional ISO date
    page: 1,                // default: 1
    pageSize: 20,           // default: 20
});
// page.items  → TestVaultTestExecution[]
// page.total  → total matching items (for pagination)
```

---

## Bug creation

### `buildBugDraft(exec, testCase): BugDraft`

Derives a pre-filled `BugDraft` from a finalized `TestVaultTestExecution` and its `TestVaultTestCase`. Only failed steps are included in `reproSteps`.

```typescript
const draft = buildBugDraft(finalizedExec, testCase);
// draft.title     → "[Fail] {testCase.title} — {environment}"
// draft.severity  → "2 - High"
// draft.reproSteps → one block per failed step (action, expected, observed comment)
```

### `createBugCreationService(adoClient, testExecutionService): IBugCreationService`

Returns an `IBugCreationService` with:

#### `createBug(draft, executionId): Promise<{ id: number; url: string }>`

1. Creates a Bug Work Item via `adoClient.createWorkItem("Bug", patches)`.
2. Fetches the Test Execution WI (`adoClient.fetchWorkItem(executionId)`) to obtain its URL.
3. Adds a `System.LinkTypes.Related` relation from Bug → Test Execution.
4. Calls `testExecutionService.linkBug(executionId, bugId)` for the reverse link.
5. Returns `{ id, url }` of the created Bug WI.
