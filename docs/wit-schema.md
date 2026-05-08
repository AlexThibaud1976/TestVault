# TestVault WIT Schema Contract

> Version: 1.0.0 | Stability: STABLE
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
| Step Results | TestVault.TestExecution.StepResults | plainText | JSON array of step outcomes |
| Duration Ms | TestVault.TestExecution.DurationMs | integer | Wall-clock duration |

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
