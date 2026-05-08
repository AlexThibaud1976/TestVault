# TestVault SDK Reference

> Version: 1.0.0 | Package: `@atconseil/testvault-sdk` (Apache 2.0)
> Install: `npm install @atconseil/testvault-sdk`

---

## Client setup

```typescript
import { createAdoClient } from "@atconseil/testvault-sdk";

const client = createAdoClient({
  baseUrl: "https://dev.azure.com/my-org",
  project: "MyProject",
  pat: process.env.ADO_PAT,        // Personal Access Token
});
```

`createAdoClient` also accepts an `isHosted` boolean (auto-detected via `detectEnvironment()`) to switch between Cloud and Server REST API paths.

---

## detectEnvironment

```typescript
import { detectEnvironment } from "@atconseil/testvault-sdk";

const env = await detectEnvironment();
// { isHosted: true, apiVersion: "7.1" }
```

Returns `{ isHosted: boolean; apiVersion: string }`. Uses the ADO Extension SDK `isHosted()` API when available; falls back to URL heuristics.

---

## TestCaseService

Factory: `createTestCaseService(adoClient, project)`

### `create(draft): Promise<TestVaultTestCase>`

Creates a new `TestVault.TestCase` WIT. `draft.title` is required; all other fields are optional.

```typescript
const tc = await tcService.create({
  title: "Login with valid credentials",
  status: "Draft",
  priority: 1,
  steps: [{ action: "Open login page", expected: "Page loads" }],
  tags: ["smoke", "auth"],
});
```

### `get(id): Promise<TestVaultTestCase>`

Fetches a single Test Case by WIT ID.

### `update(id, patch): Promise<TestVaultTestCase>`

Partially updates a Test Case. Only fields present in `patch` are modified.

### `delete(id): Promise<void>`

Soft-deletes the Test Case (moves to ADO Recycle Bin). Does not remove execution history.

### `list(options?): Promise<TestCasePage>`

Returns a paginated list of Test Cases.

```typescript
const page = await tcService.list({
  status: "Ready",
  areaPath: "MyProject\\QA",
  tags: ["smoke"],
  page: 1,
  pageSize: 50,
});
// page.items  → TestVaultTestCase[]
// page.total  → total matching count
```

---

## TestExecutionService

Factory: `createTestExecutionService(adoClient, project)`

### `startRun(draft): Promise<InProgressExecution>`

Creates a new execution in `InProgress` state. `environment` is required.

```typescript
const run = await execService.startRun({
  testPlanId: 10,
  testCaseId: 5,
  environment: "QA",
  source: "Manual",
});
```

### `saveStepResult(id, result): Promise<InProgressExecution>`

Appends a step result. Throws `TestExecutionImmutableError` (HTTP 403) if execution is `Completed`.

### `attachEvidence(id, evidence): Promise<InProgressExecution>`

Appends an `EvidenceRef` to the execution.

### `finalizeRun(id): Promise<TestVaultTestExecution>`

Transitions to `Completed` and calculates `globalStatus` from step results. Immutable afterwards.

#### Global status derivation

| Condition | globalStatus |
| --- | --- |
| No steps recorded | `Unexecuted` |
| Any step is `Fail` | `Fail` |
| Any step is `Blocked`, none `Fail` | `Blocked` |
| All steps are `Skipped` | `Skipped` |
| All steps are `Pass` | `Pass` |

### `linkBug(id, bugId): Promise<TestVaultTestExecution>`

Appends a Bug WIT ID to a finalized execution's `bugLinks`.

### `listExecutions(options): Promise<ExecutionPage>`

Returns paginated finalized executions for a Test Case.

---

## TestSetService

Factory: `createTestSetService(adoClient, project)`

### `create(draft) / get(id) / update(id, patch) / delete(id) / list(options?)`

Standard CRUD — same signature pattern as TestCaseService.

### `addTestCase(setId, testCaseId): Promise<void>`

Adds a Test Case to a Test Set (creates `TestVault.SetMember` link).

### `removeTestCase(setId, testCaseId): Promise<void>`

Removes the `TestVault.SetMember` link.

---

## TestPlanService

Factory: `createTestPlanService(adoClient, project)`

### `create / get / update / delete / list`

Standard CRUD.

### `addEntry(planId, testCaseId): Promise<void>`

Links a Test Case into the plan via `TestVault.PlanEntry`.

### `removeEntry(planId, testCaseId): Promise<void>`

Removes the `TestVault.PlanEntry` link.

---

## PreconditionService

Factory: `createPreconditionService(adoClient, project)`

### CRUD methods

Standard `create / get / update / delete / list` — same pattern as TestCaseService. The `description` field is HTML.

---

## TestCaseVersionService

Factory: `createTestCaseVersionService(adoClient)`

### `getVersion(testCaseId, versionId): Promise<TestCaseVersion>`

Returns a historical snapshot of a Test Case at a specific revision.

### `listVersions(testCaseId): Promise<TestCaseVersion[]>`

Returns all revisions for a Test Case, ordered newest-first.

---

## Bug creation utilities

### `buildBugDraft(exec, testCase): BugDraft`

Derives a pre-filled Bug draft from a finalized execution and its Test Case.

```typescript
const draft = buildBugDraft(finalizedExec, testCase);
// draft.title      → "[Fail] Login with valid credentials — QA"
// draft.severity   → "2 - High"
// draft.reproSteps → one block per failed step
```

### `createBugCreationService(adoClient, testExecutionService): IBugCreationService`

Returns `{ createBug(draft, executionId): Promise<{ id, url }> }`.

---

## Error types

| Error | HTTP | When |
| --- | --- | --- |
| `TestExecutionImmutableError` | 403 | Mutation on a Completed execution |
| `WorkItemNotFoundError` | 404 | WIT ID does not exist |
| `AdoAuthError` | 401 | PAT is invalid or expired |
| `AdoPermissionError` | 403 | User lacks required ADO permission |
