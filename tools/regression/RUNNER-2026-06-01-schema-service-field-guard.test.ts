import {
	type IAdoClient,
	type RawWorkItem,
	type WorkItemFieldPatch,
	createTestExecutionService,
} from "@atconseil/argos-sdk";
import type { EvidenceRef, TestStepResult } from "@atconseil/argos-types";
import { TEST_EXECUTION_WIT } from "@atconseil/argos-wit-schema";
import { describe, expect, it } from "vitest";

/**
 * Cross-package guard: the schema <-> service contract for TestExecution.
 *
 * Context: bug TFS1535 came from `startRun` writing `TestVault.Evidence`,
 * `TestVault.BugLinks` and `System.State = InProgress`, none of which were
 * declared in the TestExecution WIT schema. The work item could not be created.
 *
 * Invariant locked here (runtime, no source parsing): every `TestVault.*` field
 * reference name and every `System.State` value that the TestExecution service
 * writes through an ADO client MUST be declared in `TEST_EXECUTION_WIT`
 * (fields[].referenceName / states[].name). A capturing fake ADO client records
 * every patch the service emits across the full lifecycle, then we diff what was
 * written against what the schema declares.
 *
 * Targeted at TestExecution for this increment; the capture+diff shape is
 * generic enough to extend to other services later.
 */

function makeCapturingClient(): { client: IAdoClient; captured: WorkItemFieldPatch[] } {
	const captured: WorkItemFieldPatch[] = [];
	const store = new Map<number, RawWorkItem>();
	let nextId = 1000;

	function apply(wi: RawWorkItem, patches: WorkItemFieldPatch[]): void {
		for (const p of patches) {
			captured.push(p);
			if (!p.path.startsWith("/fields/")) continue;
			const ref = p.path.slice("/fields/".length);
			if (p.op === "remove") delete wi.fields[ref];
			else wi.fields[ref] = p.value;
		}
	}

	const client: IAdoClient = {
		async createWorkItem(_type, patches) {
			const id = nextId++;
			const wi: RawWorkItem = { id, rev: 1, fields: {}, url: `wi/${id}` };
			apply(wi, patches);
			store.set(id, wi);
			return { ...wi, fields: { ...wi.fields } };
		},
		async updateWorkItem(id, patches) {
			const wi = store.get(id);
			if (!wi) throw new Error(`unknown work item ${id}`);
			wi.rev += 1;
			apply(wi, patches);
			return { ...wi, fields: { ...wi.fields } };
		},
		async fetchWorkItem(id) {
			const wi = store.get(id);
			if (!wi) throw new Error(`unknown work item ${id}`);
			return { ...wi, fields: { ...wi.fields } };
		},
		async deleteWorkItem() {},
		async queryByWiql() {
			return [];
		},
		async uploadAttachment() {
			return { id: "att-1", url: "att/1" };
		},
	};

	return { client, captured };
}

describe("RUNNER-2026-06-01-schema-service-field-guard", () => {
	it("declares every TestVault.* field and System.State the service writes", async () => {
		const { client, captured } = makeCapturingClient();
		const svc = createTestExecutionService(client, "proj");

		// Exercise the full lifecycle: InProgress (mutable) -> Completed -> bug link.
		const run = await svc.startRun({
			testPlanId: 1,
			testCaseId: 2,
			environment: "QA",
			source: "Manual",
		});
		const step: TestStepResult = { stepIndex: 0, status: "Pass", evidenceIds: [] };
		await svc.saveStepResult(run.id, step);
		const evidence: EvidenceRef = {
			attachmentId: "att-1",
			filename: "shot.png",
			contentType: "image/png",
			sizeBytes: 10,
			uploadedAt: "2026-06-01T00:00:00.000Z",
		};
		await svc.attachEvidence(run.id, evidence);
		await svc.finalizeRun(run.id);
		await svc.linkBug(run.id, 999);

		// Also exercise the abort branch so System.State=Aborted is captured.
		const run2 = await svc.startRun({
			testPlanId: 3,
			testCaseId: 4,
			environment: "Dev",
			source: "Manual",
		});
		await svc.abortRun(run2.id);

		const declaredFields = new Set(TEST_EXECUTION_WIT.fields.map((f) => f.referenceName));
		const declaredStates = new Set(TEST_EXECUTION_WIT.states.map((s) => s.name));

		const writtenFields = new Set<string>();
		const writtenStates = new Set<string>();
		for (const p of captured) {
			if (!p.path.startsWith("/fields/")) continue;
			const ref = p.path.slice("/fields/".length);
			if (ref === "System.State") {
				if (typeof p.value === "string") writtenStates.add(p.value);
			} else if (ref.startsWith("TestVault.")) {
				writtenFields.add(ref);
			}
		}

		const undeclaredFields = [...writtenFields].filter((r) => !declaredFields.has(r)).sort();
		const undeclaredStates = [...writtenStates].filter((s) => !declaredStates.has(s)).sort();

		expect(
			undeclaredFields,
			`Service writes TestVault.* fields absent from TEST_EXECUTION_WIT: ${undeclaredFields.join(", ")}`
		).toEqual([]);
		expect(
			undeclaredStates,
			`Service writes System.State values absent from TEST_EXECUTION_WIT: ${undeclaredStates.join(", ")}`
		).toEqual([]);
	});
});
