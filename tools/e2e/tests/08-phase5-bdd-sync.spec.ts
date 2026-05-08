/**
 * T-5.6 — Phase 5 E2E: BDD round-trip (Gherkin TC ↔ .feature, manual mode).
 * Requires: ADO_CLOUD_ORG_URL, ADO_CLOUD_PROJECT, ADO_CLOUD_PAT env vars
 *           for the live-ADO describe blocks.
 * Pure tests run in CI without any env vars.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processBddSync } from "@atconseil/testvault-cli";
import {
	featureToTestCases,
	generateFeature,
	parseFeature,
	testCasesToFeature,
} from "@atconseil/testvault-gherkin";
import { expect, test } from "../fixtures/index.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
	return String(Date.now());
}

function requireEnv(name: string): string {
	const val = process.env[name];
	if (!val) throw new Error(`Required env var ${name} is not set`);
	return val;
}

const SAMPLE_FEATURE = `Feature: BDD E2E Login
  Scenario: User logs in successfully
    Given I open the login page
    When I enter valid credentials
    Then I am redirected to the dashboard

  Scenario: Invalid credentials are rejected
    Given I open the login page
    When I enter invalid credentials
    Then I see an error message`;

// ─── Pure tests (no ADO) ──────────────────────────────────────────────────────

test.describe("Phase 5 — Gherkin parsing (pure, no ADO)", () => {
	test("featureToTestCases extracts one draft per scenario with gherkin field", () => {
		const drafts = featureToTestCases(SAMPLE_FEATURE, "MyProject\\BDD");
		expect(drafts).toHaveLength(2);
		expect(drafts[0]?.title).toBe("User logs in successfully");
		expect(drafts[1]?.title).toBe("Invalid credentials are rejected");
		expect(drafts[0]?.gherkin).toContain("Feature: BDD E2E Login");
		expect(drafts[0]?.gherkin).toContain("Scenario: User logs in successfully");
	});

	test("featureToTestCases sets areaPath from parameter", () => {
		const drafts = featureToTestCases(SAMPLE_FEATURE, "MyProject\\BDD");
		expect(drafts[0]?.areaPath).toBe("MyProject\\BDD");
		expect(drafts[1]?.areaPath).toBe("MyProject\\BDD");
	});

	test("featureToTestCases maps steps to TC steps with action = keyword text", () => {
		const drafts = featureToTestCases(SAMPLE_FEATURE, "MyProject\\BDD");
		const steps = drafts[0]?.steps ?? [];
		expect(steps).toHaveLength(3);
		expect(steps[0]?.action).toBe("Given I open the login page");
		expect(steps[1]?.action).toBe("When I enter valid credentials");
		expect(steps[2]?.action).toBe("Then I am redirected to the dashboard");
	});

	test("parseFeature → generateFeature round-trip preserves scenario count", () => {
		const parsed = parseFeature(SAMPLE_FEATURE);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		expect(reparsed.scenarios).toHaveLength(parsed.scenarios.length);
	});

	test("parseFeature → generateFeature round-trip preserves scenario titles", () => {
		const parsed = parseFeature(SAMPLE_FEATURE);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		for (let i = 0; i < parsed.scenarios.length; i++) {
			expect(reparsed.scenarios[i]?.title).toBe(parsed.scenarios[i]?.title);
		}
	});

	test("parseFeature → generateFeature round-trip preserves step count", () => {
		const parsed = parseFeature(SAMPLE_FEATURE);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		for (let i = 0; i < parsed.scenarios.length; i++) {
			expect(reparsed.scenarios[i]?.steps).toHaveLength(parsed.scenarios[i]?.steps.length ?? 0);
		}
	});

	test("testCasesToFeature reconstructs valid Gherkin from TC with gherkin field", () => {
		const drafts = featureToTestCases(SAMPLE_FEATURE, "MyProject\\BDD");
		const tcs = drafts.map((d, i) => ({ id: i + 1, title: d.title, gherkin: d.gherkin }));
		const feature = testCasesToFeature("BDD E2E Login", tcs);
		expect(feature).toContain("Feature: BDD E2E Login");
		expect(feature).toContain("Scenario: User logs in successfully");
		expect(feature).toContain("Scenario: Invalid credentials are rejected");
	});

	test("testCasesToFeature omits TC without gherkin field", () => {
		const tcs = [
			{ id: 1, title: "Manual TC", gherkin: undefined },
			{ id: 2, title: "BDD TC", gherkin: "Feature: X\n  Scenario: BDD TC\n    Given step" },
		];
		const feature = testCasesToFeature("Mixed", tcs);
		expect(feature).toContain("Scenario: BDD TC");
		expect(feature).not.toContain("Scenario: Manual TC");
	});
});

// ─── Live ADO tests — processBddSync round-trip ───────────────────────────────

test.describe("Phase 5 — processBddSync round-trip (live ADO)", () => {
	test.describe.configure({ timeout: 60_000 });

	test("processBddSync creates TCs from .feature file in ADO", async ({ tcService, project }) => {
		const id = uid();
		const title1 = `E2E BDD Login ${id}`;
		const title2 = `E2E BDD Logout ${id}`;
		const feature = `Feature: BDD E2E ${id}
  Scenario: ${title1}
    Given I open the app
    Then I am logged in

  Scenario: ${title2}
    Given I am logged in
    When I click logout
    Then I am on the login page`;

		const tmpFile = join(tmpdir(), `e2e-bdd-${id}.feature`);
		writeFileSync(tmpFile, feature, "utf-8");

		const summary = await processBddSync({
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			pat: requireEnv("ADO_CLOUD_PAT"),
			areaPath: project,
			featurePaths: [tmpFile],
		});

		expect(summary.files).toBe(1);
		expect(summary.created).toBe(2);
		expect(summary.updated).toBe(0);

		// Cleanup
		const allTcs = await tcService.list({ top: 2000 });
		for (const tc of allTcs.filter((t) => t.title === title1 || t.title === title2)) {
			await tcService.delete(tc.id);
		}
	});

	test("processBddSync updates existing TC when scenario title matches", async ({
		tcService,
		project,
	}) => {
		const id = uid();
		const title = `E2E BDD Update ${id}`;

		const featureV1 = `Feature: BDD Update ${id}
  Scenario: ${title}
    Given I open the app
    Then I am logged in`;

		const featureV2 = `Feature: BDD Update ${id}
  Scenario: ${title}
    Given I open the app
    When I click login
    Then I am logged in`;

		const tmpFile = join(tmpdir(), `e2e-bdd-update-${id}.feature`);

		// First sync — creates TC
		writeFileSync(tmpFile, featureV1, "utf-8");
		const summary1 = await processBddSync({
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			pat: requireEnv("ADO_CLOUD_PAT"),
			areaPath: project,
			featurePaths: [tmpFile],
		});
		expect(summary1.created).toBe(1);
		expect(summary1.updated).toBe(0);

		// Second sync — updates TC
		writeFileSync(tmpFile, featureV2, "utf-8");
		const summary2 = await processBddSync({
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			pat: requireEnv("ADO_CLOUD_PAT"),
			areaPath: project,
			featurePaths: [tmpFile],
		});
		expect(summary2.created).toBe(0);
		expect(summary2.updated).toBe(1);

		// Cleanup
		const allTcs = await tcService.list({ top: 2000 });
		const tc = allTcs.find((t) => t.title === title);
		if (tc) await tcService.delete(tc.id);
	});

	test("TC created by processBddSync persists gherkin field retrievable via SDK", async ({
		tcService,
		project,
	}) => {
		const id = uid();
		const title = `E2E BDD Gherkin ${id}`;
		const feature = `Feature: BDD Gherkin ${id}
  Scenario: ${title}
    Given I open the app
    Then I am logged in`;

		const tmpFile = join(tmpdir(), `e2e-bdd-gherkin-${id}.feature`);
		writeFileSync(tmpFile, feature, "utf-8");

		await processBddSync({
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			pat: requireEnv("ADO_CLOUD_PAT"),
			areaPath: project,
			featurePaths: [tmpFile],
		});

		const allTcs = await tcService.list({ top: 2000 });
		const tc = allTcs.find((t) => t.title === title);
		expect(tc).toBeDefined();
		expect(tc?.gherkin).toContain(`Scenario: ${title}`);

		// Round-trip: parse retrieved gherkin back to scenarios
		const reparsed = parseFeature(tc?.gherkin ?? "");
		expect(reparsed.scenarios).toHaveLength(1);
		expect(reparsed.scenarios[0]?.title).toBe(title);
		expect(reparsed.scenarios[0]?.steps).toHaveLength(2);

		if (tc) await tcService.delete(tc.id);
	});

	test("processBddSync handles multiple .feature files without duplicating TCs", async ({
		tcService,
		project,
	}) => {
		const id = uid();
		const titleA = `E2E BDD Multi A ${id}`;
		const titleB = `E2E BDD Multi B ${id}`;

		const featureA = `Feature: BDD Multi A ${id}
  Scenario: ${titleA}
    Given I open page A`;

		const featureB = `Feature: BDD Multi B ${id}
  Scenario: ${titleB}
    Given I open page B`;

		const tmpA = join(tmpdir(), `e2e-bdd-multi-a-${id}.feature`);
		const tmpB = join(tmpdir(), `e2e-bdd-multi-b-${id}.feature`);
		writeFileSync(tmpA, featureA, "utf-8");
		writeFileSync(tmpB, featureB, "utf-8");

		const summary = await processBddSync({
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			pat: requireEnv("ADO_CLOUD_PAT"),
			areaPath: project,
			featurePaths: [tmpA, tmpB],
		});

		expect(summary.files).toBe(2);
		expect(summary.created).toBe(2);
		expect(summary.updated).toBe(0);

		// Verify no duplicate TCs were created
		const allTcs = await tcService.list({ top: 2000 });
		const matchA = allTcs.filter((t) => t.title === titleA);
		const matchB = allTcs.filter((t) => t.title === titleB);
		expect(matchA).toHaveLength(1);
		expect(matchB).toHaveLength(1);

		for (const tc of [...matchA, ...matchB]) {
			await tcService.delete(tc.id);
		}
	});
});
