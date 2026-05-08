/**
 * T-1.9 — CRUD Test Plan against Cloud ADO instance.
 */
import { AdoNotFoundError } from "@atconseil/testvault-sdk";
import { expect, test } from "../fixtures/index.js";

test.describe("Test Plan CRUD", () => {
	test("create → read → update → delete lifecycle", async ({ planService }) => {
		const uid = Date.now();
		const name = `E2E Plan ${uid}`;
		const owner = "e2e@test.local";

		const created = await planService.create({ name, owner });
		expect(created.id).toBeGreaterThan(0);
		expect(created.name).toBe(name);
		expect(created.state).toBe("Draft");

		const read = await planService.read(created.id);
		expect(read.id).toBe(created.id);

		const updated = await planService.update(created.id, { name: `${name} (updated)` });
		expect(updated.name).toBe(`${name} (updated)`);

		await planService.delete(created.id);
		await expect(planService.read(created.id)).rejects.toThrow(AdoNotFoundError);
	});

	test("create with environments — environments are persisted", async ({ planService }) => {
		const uid = Date.now();
		const created = await planService.create({
			name: `E2E Plan envs ${uid}`,
			owner: "e2e@test.local",
			environments: ["QA", "Staging"],
		});

		try {
			const read = await planService.read(created.id);
			expect(read.environments).toEqual(expect.arrayContaining(["QA", "Staging"]));
		} finally {
			await planService.delete(created.id);
		}
	});

	test("lock transitions state to Locked and update of testSetIds is rejected", async ({
		planService,
	}) => {
		const uid = Date.now();
		const created = await planService.create({
			name: `E2E Plan lock ${uid}`,
			owner: "e2e@test.local",
		});

		try {
			const locked = await planService.lock(created.id);
			expect(locked.state).toBe("Locked");

			// Composition update must be rejected
			await expect(planService.update(created.id, { testSetIds: [999] })).rejects.toThrow(
				"Test Plan is locked"
			);
		} finally {
			// Unlock before delete so state machine allows deletion
			await planService.unlock(created.id);
			await planService.delete(created.id);
		}
	});

	test("unlock transitions state back to Draft", async ({ planService }) => {
		const uid = Date.now();
		const created = await planService.create({
			name: `E2E Plan unlock ${uid}`,
			owner: "e2e@test.local",
		});

		try {
			await planService.lock(created.id);
			const unlocked = await planService.unlock(created.id);
			expect(unlocked.state).toBe("Draft");
		} finally {
			await planService.delete(created.id);
		}
	});
});
