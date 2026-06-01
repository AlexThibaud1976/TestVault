# TestVault WIT Schema Contract

> Version: 1.1.0 | Stability: STABLE
> Consumed by: TestPulse 2.0+

This document defines the public Custom Work Item Type contract between TestVault (Argos) and TestPulse. Any breaking change to field reference names, types, or cardinality requires a major version bump of **both** extensions and a tested migration script in `tools/migration-scripts/`.

---

## Work Item Types

### TestVault.TestCase

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Required |
| Status | TestVault.TestCase.Status | string | Draft, Ready, Deprecated |
| Priority | Microsoft.VSTS.Common.Priority | integer | 1–4 |
| Area Path | System.AreaPath | string | ADO area path |
| Precondition | TestVault.TestCase.Precondition | html | Optional setup context |
| Steps | TestVault.TestCase.Steps | html | Structured step list |
| Expected Result | TestVault.TestCase.ExpectedResult | html | |
| Automation Status | Microsoft.VSTS.Common.AutomationStatus | string | Automated / Not Automated |
| Gherkin | TestVault.TestCase.Gherkin | plainText | BDD feature text (BDD mode) |
| Tags | System.Tags | string | Semicolon-separated |

### TestVault.TestSet

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Required |
| Status | TestVault.TestSet.Status | string | Draft, Active, Closed |
| Environment | TestVault.TestSet.Environment | string | Target environment label |
| Area Path | System.AreaPath | string | ADO area path |

### TestVault.TestPlan

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Required |
| Status | TestVault.TestPlan.Status | string | Draft, Active, Completed |
| Start Date | Microsoft.VSTS.Scheduling.StartDate | dateTime | |
| Target Date | Microsoft.VSTS.Scheduling.TargetDate | dateTime | |

### TestVault.Precondition

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Required |
| Description | TestVault.Precondition.Description | html | Setup steps |
| Status | TestVault.Precondition.Status | string | Draft, Active |

### TestVault.TestExecution

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Auto-generated |
| Status | TestVault.TestExecution.Status | string | InProgress, Completed, Aborted |
| Global Status | TestVault.TestExecution.GlobalStatus | string | Pass, Fail, Blocked, NotRun |
| Environment | TestVault.TestExecution.Environment | string | |
| Started At | TestVault.TestExecution.StartedAt | dateTime | |
| Completed At | TestVault.TestExecution.CompletedAt | dateTime | |
| Step Results | TestVault.TestExecution.StepResults | plainText | JSON array of step outcomes (per-step actualResult and defectIds carried inside this JSON) |
| Duration Ms | TestVault.TestExecution.DurationMs | integer | Wall-clock duration |
| Evidence | TestVault.TestExecution.Evidence | plainText | JSON array of EvidenceRef (added 1.1.0) |
| Bug Links | TestVault.TestExecution.BugLinks | plainText | JSON array of run-level bug Work Item IDs (added 1.1.0) |
| Global Status Overridden | TestVault.TestExecution.GlobalStatusOverridden | boolean | default false; true if the global status was manually forced (added 1.1.0) |
| Previous Execution Id | TestVault.TestExecution.PreviousExecutionId | integer | Re-run lineage; references the prior execution, NULL otherwise (added 1.1.0) |

The `InProgress` / `Completed` lifecycle states (column `Status` above) are part of the
contract: a run is mutable while `InProgress` and frozen once `Completed`. Re-runs create a
new execution linked via `PreviousExecutionId` rather than mutating a completed run.

**TestPulse impact (1.0.0 -> 1.1.0, additive minor).** All four new fields are optional and
read-compatible: TestPulse continues to function unchanged and must keep handling them as
possibly-absent. To exploit the new signals, TestPulse should be informed so it can read
`GlobalStatusOverridden` (statistical quality of the global status -- distinguish a computed
global from a manually forced one) and `PreviousExecutionId` (re-run lineage, basis for flaky
analysis). No data migration of historical executions is required.

### TestVault.AuditLog

| Field | Reference Name | Type | Notes |
| --- | --- | --- | --- |
| Title | System.Title | string | Auto-generated (operation + actor) |
| Operation | TestVault.AuditLog.Operation | string | e.g. `llm.provider.add` |
| Actor | TestVault.AuditLog.Actor | string | UPN of the user |
| Old Value | TestVault.AuditLog.OldValue | plainText | Masked (last 4 chars) |
| New Value | TestVault.AuditLog.NewValue | plainText | Masked |
| Metadata | TestVault.AuditLog.Metadata | plainText | JSON key-value pairs |

AuditLog WITs are write-once and immutable after creation.

---

## Work Item Links

TestPulse reads the following ADO link types to reconstruct the test hierarchy:

| From | To | Link type | Meaning |
| --- | --- | --- | --- |
| TestPlan | TestCase | `TestVault.PlanEntry` | TC is part of plan |
| TestSet | TestCase | `TestVault.SetMember` | TC is a member of set |
| TestExecution | TestCase | `TestVault.ExecutionOf` | Execution covers this TC |
| TestCase | Precondition | `TestVault.HasPrecondition` | TC has a precondition |
| TestExecution | WorkItem (Bug) | `Microsoft.VSTS.Common.TestedBy` | Bug found during execution |

---

## Stability guarantees

- Field **reference names** (e.g. `TestVault.TestCase.Status`) will never change without a major version bump.
- Field **types** will never change without a major version bump.
- New **optional** fields may be added in minor versions; TestPulse must handle missing fields gracefully.
- WIT names prefixed `TestVault.*` are reserved for this contract. ATConseil will never introduce a `System.*` or `Microsoft.*` custom field.

---

## Version history

| Version | Date | Change |
| --- | --- | --- |
| 1.0.0 | 2026-05-08 | Initial stable release — all 7 WITs locked |
| 1.1.0 | 2026-06-01 | TestExecution: +Evidence, +BugLinks, +GlobalStatusOverridden, +PreviousExecutionId (additive, read-compatible minor). Lifecycle InProgress -> Completed documented. |

---

## Consumer API for external integrators

External tools that need to detect Argos installation, list its Custom Work Item Types, or read field metadata on an Azure DevOps instance can use the public client package **`@atconseil/argos-detection-api`** (renamed from `testpulse-ui-shared` in Sprint 7b, 2026-05-14).

This package is designed for stable, versioned consumption by **TestPulse v2.0+** and any future external integrators.

### Installation

```bash
npm install @atconseil/argos-detection-api
```

> Note: as of the Sprint 7b rebrand (2026-05-14), the package remains `private: true` in the monorepo and is not yet published on npm. Publication will be planned alongside TestPulse v2.0 readiness.

### Quick start

```ts
import {
  createArgosSchemaReader,
  ARGOS_WIT_NAMES,
  type IAdoWorkItemClient,
  type IArgosSchemaReader,
} from "@atconseil/argos-detection-api";

// Provide an ADO Work Item client implementation
const adoClient: IAdoWorkItemClient = { /* ... your impl ... */ };

const reader: IArgosSchemaReader = createArgosSchemaReader(adoClient);

// Detect if Argos is installed on a given ADO project
const installed = await reader.isArgosInstalled(orgUrl, project);

// List Argos Custom WIT types available on this project
const types = await reader.listWorkItemTypes(orgUrl, project);
// types is a subset of ARGOS_WIT_NAMES that are actually installed

// Read field metadata for a specific WIT
const fields = await reader.getFields(orgUrl, project, "TestVault.TestCase");
```

### API contract stability

| Symbol | Stability | Notes |
| --- | --- | --- |
| `ARGOS_WIT_NAMES` | STABLE | Adding a new WIT name is a minor version bump |
| `ArgosWorkItemType` | STABLE | Union type derived from `ARGOS_WIT_NAMES` |
| `ArgosWitField` | STABLE | Shape locked; new optional fields possible |
| `IArgosSchemaReader` | STABLE | Methods locked; new optional methods possible |
| `createArgosSchemaReader` | STABLE | Factory signature locked |
| `IAdoWorkItemClient` | STABLE | Consumer-provided ADO client contract |

> **Versioning rule** (constitution section 10): any breaking change to this API requires a major version bump of `@atconseil/argos-detection-api` AND a coordinated TestPulse migration plan with end-to-end tested migration scripts.

### Why "TestVault.*" prefix in WIT strings

Custom Work Item Type reference names use the technical prefix `TestVault.*` (e.g. `"TestVault.TestCase"`) even though the commercial product is **Argos**. This is intentional and locked by constitution section 3.4 + section 9 for backward compatibility: existing Argos installations have these WIT types persisted in customer Azure DevOps databases. Renaming them would break installed customers. The TypeScript identifiers were rebranded to `Argos*` in Sprint 7b, but the WIT reference strings remain `TestVault.*` indefinitely.
