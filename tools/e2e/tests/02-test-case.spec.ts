/**
 * T-1.9 — CRUD Test Case against Cloud ADO instance.
 * Each test is self-contained: creates, reads, updates, then deletes its own WI.
 */
import { AdoNotFoundError } from "@atconseil/argos-sdk";
import { expect, test } from "../fixtures/index.js";

test.describe("Test Case CRUD", () => {
	test("create → read → update → delete lifecycle", async ({ tcService, project }) => {
		const uid = Date.now();
		const title = `E2E TC ${uid}`;
		const areaPath = project;

		// Create
		const created = await tcService.create({ title, areaPath });
		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe(title);

		// Read
		const read = await tcService.read(created.id);
		expect(read.id).toBe(created.id);
		expect(read.title).toBe(title);

		// Update
		const updated = await tcService.update(created.id, {
			title: `${title} (updated)`,
		});
		expect(updated.title).toBe(`${title} (updated)`);

		// Delete
		await tcService.delete(created.id);

		// Verify deletion
		await expect(tcService.read(created.id)).rejects.toThrow(AdoNotFoundError);
	});

	test("create with steps — steps are persisted and returned", async ({ tcService, project }) => {
		const uid = Date.now();
		const steps = [
			{ index: 0, action: "Navigate to login page", expected: "Login form visible" },
			{ index: 1, action: "Enter invalid credentials", expected: "Error message shown" },
		];

		const created = await tcService.create({
			title: `E2E TC steps ${uid}`,
			areaPath: project,
			steps,
		});

		try {
			const read = await tcService.read(created.id);
			expect(read.steps).toHaveLength(2);
			const first = read.steps[0];
			expect(first?.action).toBe("Navigate to login page");
		} finally {
			await tcService.delete(created.id);
		}
	});

	test("list returns created TC", async ({ tcService, project }) => {
		const uid = Date.now();
		const title = `E2E TC list ${uid}`;

		const created = await tcService.create({ title, areaPath: project });

		try {
			const listed = await tcService.list();
			const found = listed.find((tc) => tc.id === created.id);
			expect(found).toBeDefined();
			expect(found?.title).toBe(title);
		} finally {
			await tcService.delete(created.id);
		}
	});
});
