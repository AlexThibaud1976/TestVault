/**
 * T-1.9 — CRUD Test Set against Cloud ADO instance.
 */
import { AdoNotFoundError } from "@atconseil/argos-sdk";
import { expect, test } from "../fixtures/index.js";

test.describe("Test Set CRUD", () => {
	test("create → read → update → delete lifecycle", async ({ setService, project }) => {
		const uid = Date.now();
		const name = `E2E Set ${uid}`;

		const created = await setService.create({ name, areaPath: project });
		expect(created.id).toBeGreaterThan(0);
		expect(created.name).toBe(name);

		const read = await setService.read(created.id);
		expect(read.id).toBe(created.id);

		const updated = await setService.update(created.id, { name: `${name} (updated)` });
		expect(updated.name).toBe(`${name} (updated)`);

		await setService.delete(created.id);
		await expect(setService.read(created.id)).rejects.toThrow(AdoNotFoundError);
	});

	test("addTestCases and removeTestCases persist correctly", async ({
		tcService,
		setService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E TC for Set ${uid}`, areaPath: project });
		const set = await setService.create({ name: `E2E Set addTC ${uid}`, areaPath: project });

		try {
			// Add
			await setService.addTestCases(set.id, [tc.id]);
			const afterAdd = await setService.read(set.id);
			expect(afterAdd.testCaseIds).toContain(tc.id);

			// Remove
			await setService.removeTestCases(set.id, [tc.id]);
			const afterRemove = await setService.read(set.id);
			expect(afterRemove.testCaseIds).not.toContain(tc.id);
		} finally {
			await setService.delete(set.id);
			await tcService.delete(tc.id);
		}
	});

	test("delete does NOT delete contained TCs", async ({ tcService, setService, project }) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E TC isolation ${uid}`, areaPath: project });
		const set = await setService.create({ name: `E2E Set isolation ${uid}`, areaPath: project });

		try {
			await setService.addTestCases(set.id, [tc.id]);
			await setService.delete(set.id);

			// TC must still exist
			const stillThere = await tcService.read(tc.id);
			expect(stillThere.id).toBe(tc.id);
		} finally {
			await tcService.delete(tc.id);
		}
	});
});
