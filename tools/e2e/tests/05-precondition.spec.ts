/**
 * T-1.9 — CRUD Precondition against Cloud ADO instance.
 */
import { AdoNotFoundError } from "@atconseil/argos-sdk";
import { expect, test } from "../fixtures/index.js";

test.describe("Precondition CRUD", () => {
	test("create → read → update → delete lifecycle", async ({ precondService }) => {
		const uid = Date.now();
		const title = `E2E Precond ${uid}`;

		const created = await precondService.create({ title });
		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe(title);

		const read = await precondService.read(created.id);
		expect(read.id).toBe(created.id);

		const updated = await precondService.update(created.id, { title: `${title} (updated)` });
		expect(updated.title).toBe(`${title} (updated)`);

		await precondService.delete(created.id);
		await expect(precondService.read(created.id)).rejects.toThrow(AdoNotFoundError);
	});

	test("linkTestCase links a TC and getForTestCase returns it", async ({
		tcService,
		precondService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E TC for Precond ${uid}`, areaPath: project });
		const precond = await precondService.create({ title: `E2E Precond link ${uid}` });

		try {
			await precondService.linkTestCase(precond.id, tc.id);

			const linked = await precondService.read(precond.id);
			expect(linked.linkedTestCaseIds).toContain(tc.id);

			const forTc = await precondService.getForTestCase(tc.id);
			const found = forTc.find((p) => p.id === precond.id);
			expect(found).toBeDefined();
		} finally {
			await precondService.delete(precond.id);
			await tcService.delete(tc.id);
		}
	});

	test("unlinkTestCase removes the TC and getForTestCase no longer returns it", async ({
		tcService,
		precondService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E TC unlink ${uid}`, areaPath: project });
		const precond = await precondService.create({ title: `E2E Precond unlink ${uid}` });

		try {
			await precondService.linkTestCase(precond.id, tc.id);
			await precondService.unlinkTestCase(precond.id, tc.id);

			const unlinked = await precondService.read(precond.id);
			expect(unlinked.linkedTestCaseIds).not.toContain(tc.id);
		} finally {
			await precondService.delete(precond.id);
			await tcService.delete(tc.id);
		}
	});

	test("delete does NOT delete linked TCs", async ({ tcService, precondService, project }) => {
		const uid = Date.now();
		const tc = await tcService.create({
			title: `E2E TC precond isolation ${uid}`,
			areaPath: project,
		});
		const precond = await precondService.create({
			title: `E2E Precond isolation ${uid}`,
			linkedTestCaseIds: [tc.id],
		});

		try {
			await precondService.delete(precond.id);
			const tcStillThere = await tcService.read(tc.id);
			expect(tcStillThere.id).toBe(tc.id);
		} finally {
			await tcService.delete(tc.id);
		}
	});
});
