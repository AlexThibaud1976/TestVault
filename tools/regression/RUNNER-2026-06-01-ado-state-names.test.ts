import {
	type IAdoClient,
	type RawWorkItem,
	type WorkItemFieldPatch,
	createTestExecutionService,
} from "@atconseil/argos-sdk";
import type { TestStepResult } from "@atconseil/argos-types";
import { describe, expect, it } from "vitest";

/**
 * ADO state name translation guard (Runner 0.6.0 / B5).
 *
 * ADO stores displayNames in System.WorkItemType WIQL queries and translated
 * state names (prefixed "TestVault ") in System.State. Using bare schema names
 * breaks creates (wrong state value) and WIQL queries (0 results).
 *
 * This guard locks three invariants:
 *   1. startRun writes System.State = "TestVault InProgress" (not "InProgress").
 *   2. startRun includes System.Title (required by ADO for any WI create).
 *   3. listExecutions WIQL uses "TestVault Test Execution" (not "TestVault.TestExecution").
 *
 * Regression pattern: capturing fake IAdoClient, same as RUNNER-2026-06-01-schema-service-field-guard.
 */

function makeCapturingClient(): {
	client: IAdoClient;
	created: Array<{ type: string; patches: WorkItemFieldPatch[] }>;
	wiql: string[];
} {
	const created: Array<{ type: string; patches: WorkItemFieldPatch[] }> = [];
	const wiql: string[] = [];
	const store = new Map<number, RawWorkItem>();
	let nextId = 2000;

	function apply(wi: RawWorkItem, patches: WorkItemFieldPatch[]): void {
		for (const p of patches) {
			if (!p.path.startsWith("/fields/")) continue;
			const ref = p.path.slice("/fields/".length);
			if (p.op === "remove") delete wi.fields[ref];
			else wi.fields[ref] = p.value;
		}
	}

	const client: IAdoClient = {
		async createWorkItem(type, patches) {
			const id = nextId++;
			const wi: RawWorkItem = {
				id,
				rev: 1,
				fields: { "System.State": "TestVault Completed", "TestVault.GlobalStatus": "Pass" },
				url: `wi/${id}`,
			};
			apply(wi, patches);
			created.push({ type, patches: [...patches] });
			store.set(id, wi);
			return { ...wi, fields: { ...wi.fields } };
		},
		async updateWorkItem(id, patches) {
			const wi = store.get(id) ?? {
				id,
				rev: 1,
				fields: { "System.State": "TestVault Completed", "TestVault.GlobalStatus": "Pass" },
				url: `wi/${id}`,
			};
			apply(wi, patches);
			store.set(id, wi);
			return { ...wi, fields: { ...wi.fields } };
		},
		async fetchWorkItem(id) {
			const wi = store.get(id) ?? {
				id,
				rev: 1,
				fields: { "System.State": "TestVault Completed", "TestVault.GlobalStatus": "Pass" },
				url: `wi/${id}`,
			};
			return { ...wi, fields: { ...wi.fields } };
		},
		async deleteWorkItem() {},
		async queryByWiql(q) {
			wiql.push(q);
			return [];
		},
		async uploadAttachment() {
			return { id: "att-1", url: "att/1" };
		},
	};

	return { client, created, wiql };
}

describe("RUNNER-2026-06-01-ado-state-names", () => {
	it("startRun writes System.State = 'TestVault InProgress' (not bare 'InProgress')", async () => {
		const { client, created } = makeCapturingClient();
		const svc = createTestExecutionService(client, "proj");
		await svc.startRun({ testPlanId: 1, testCaseId: 2, environment: "QA", source: "Manual" });
		const patches = created[0]?.patches ?? [];
		const statePatch = patches.find((p) => p.path === "/fields/System.State");
		expect(
			statePatch?.value,
			"startRun must write the ADO-translated state name, not the bare schema name"
		).toBe("TestVault InProgress");
	});

	it("startRun includes System.Title (required for ADO WI creation)", async () => {
		const { client, created } = makeCapturingClient();
		const svc = createTestExecutionService(client, "proj");
		await svc.startRun({ testPlanId: 1, testCaseId: 5, environment: "QA", source: "Manual" });
		const patches = created[0]?.patches ?? [];
		const titlePatch = patches.find((p) => p.path === "/fields/System.Title");
		expect(titlePatch, "System.Title patch must be present in startRun").toBeDefined();
		expect(typeof titlePatch?.value).toBe("string");
		expect((titlePatch?.value as string).length).toBeGreaterThan(0);
	});

	it("listExecutions WIQL uses displayName 'TestVault Test Execution' (not 'TestVault.TestExecution')", async () => {
		const { client, wiql } = makeCapturingClient();
		const svc = createTestExecutionService(client, "proj");
		await svc.listExecutions({ testCaseId: 5 });
		const query = wiql[0] ?? "";
		expect(query, "WIQL must use the ADO WIT displayName (no dot notation)").toContain(
			"TestVault Test Execution"
		);
		expect(query).not.toContain("TestVault.TestExecution");
	});

	it("startRun + finalizeRun full cycle uses translated state names", async () => {
		const step: TestStepResult = { stepIndex: 0, status: "Pass", defectIds: [], evidenceIds: [] };
		const { client, created } = makeCapturingClient();
		const svc = createTestExecutionService(client, "proj");
		const run = await svc.startRun({
			testPlanId: 1,
			testCaseId: 2,
			environment: "QA",
			source: "Manual",
		});
		await svc.saveStepResult(run.id, step);
		await svc.finalizeRun(run.id);
		// startRun must have written "TestVault InProgress"
		const startPatches = created[0]?.patches ?? [];
		expect(startPatches.find((p) => p.path === "/fields/System.State")?.value).toBe(
			"TestVault InProgress"
		);
		// No bare "InProgress", "Completed", or "Aborted" must appear in any System.State patch
		for (const record of created) {
			for (const p of record.patches) {
				if (p.path === "/fields/System.State") {
					expect(
						p.value,
						`System.State patch must be prefixed with "TestVault " — found bare value: ${String(p.value)}`
					).toMatch(/^TestVault /);
				}
			}
		}
	});
});
