/**
 * T-1.9 — Verify Custom Process installation on the Cloud ADO instance.
 *
 * These tests DO NOT install the process — they verify it is already installed.
 * Run the Install Wizard from the Argos Hub if any test fails with a WIT-unknown error.
 */
import { expect, test } from "../fixtures/index.js";

test.describe("Custom Process — WIT type presence", () => {
	test("TestVault.TestCase is registered in the project process", async ({ tcService }) => {
		// list() executes a WIQL query; if WIT type is unknown ADO returns 400
		const cases = await tcService.list();
		expect(Array.isArray(cases)).toBe(true);
	});

	test("TestVault.TestSet is registered in the project process", async ({ setService }) => {
		const sets = await setService.list();
		expect(Array.isArray(sets)).toBe(true);
	});

	test("TestVault.TestPlan is registered in the project process", async ({ planService }) => {
		const plans = await planService.list();
		expect(Array.isArray(plans)).toBe(true);
	});

	test("TestVault.Precondition is registered in the project process", async ({
		precondService,
	}) => {
		const preconditions = await precondService.list();
		expect(Array.isArray(preconditions)).toBe(true);
	});
});
