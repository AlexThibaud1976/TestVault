/**
 * T-4.9 — Phase 4 E2E: Import / Export / CLI upload-results.
 * Requires: ADO_CLOUD_ORG_URL, ADO_CLOUD_PROJECT, ADO_CLOUD_PAT env vars.
 * Each test is self-contained and cleans up after itself.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processUploadResults } from "@atconseil/testvault-cli";
import {
	exportCatalogToExcel,
	exportCatalogToPdf,
	exportReleaseReadinessToExcel,
	exportReleaseReadinessToPdf,
} from "@atconseil/testvault-exporters";
import {
	parseCsv,
	parseCucumber,
	parseJUnit,
	parseNUnit,
	parseXUnit,
} from "@atconseil/testvault-importers";
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

// ─── Importers — format parsing (pure, no ADO) ────────────────────────────────

test.describe("Phase 4 — Importer format coverage", () => {
	test("JUnit XML parser extracts automationKey from classname.name", () => {
		const xml = `<testsuite>
      <testcase name="login" classname="com.example.LoginTest"/>
      <testcase name="logout" classname="com.example.LoginTest">
        <failure message="assertion failed"/>
      </testcase>
    </testsuite>`;
		const result = parseJUnit(xml);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.automationKey).toBe("com.example.LoginTest.login");
		expect(result.items[1]?.description).toContain("assertion failed");
	});

	test("NUnit 3 XML parser extracts automationKey from fullname", () => {
		const xml = `<test-run><test-suite><test-case fullname="MyNS.LoginTests.Login" result="Passed"/></test-suite></test-run>`;
		const result = parseNUnit(xml);
		expect(result.items[0]?.automationKey).toBe("MyNS.LoginTests.Login");
	});

	test("xUnit XML parser extracts type.method automationKey", () => {
		const xml = `<assemblies><assembly><collection>
      <test name="MyNS.LoginTests.Login" type="MyNS.LoginTests" method="Login" result="Pass"/>
    </collection></assembly></assemblies>`;
		const result = parseXUnit(xml);
		expect(result.items[0]?.automationKey).toBe("MyNS.LoginTests.Login");
	});

	test("Cucumber JSON parser extracts element id as automationKey", () => {
		const json = JSON.stringify([
			{
				id: "login-feature",
				name: "Login",
				elements: [
					{
						id: "login-feature;user-logs-in",
						name: "User logs in",
						steps: [{ result: { status: "passed" } }],
					},
				],
			},
		]);
		const result = parseCucumber(json);
		expect(result.items[0]?.automationKey).toBe("login-feature;user-logs-in");
	});

	test("CSV parser handles semicolon delimiter and optional columns", () => {
		const csv =
			"title;automationKey;tags\nLogin test;com.example.LoginTest;smoke\nLogout test;com.example.LogoutTest;";
		const result = parseCsv(csv);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.automationKey).toBe("com.example.LoginTest");
		expect(result.items[0]?.tags).toContain("smoke");
	});
});

// ─── Exporters — pure output checks (no ADO) ──────────────────────────────────

test.describe("Phase 4 — Exporter output checks", () => {
	const catalogItems = [
		{
			id: 1,
			title: "Login test",
			description: "Verify user can log in",
			steps: [{ action: "Enter credentials", expected: "Dashboard shows" }],
			tags: ["smoke"],
			automationKey: "com.example.LoginTest",
		},
		{ id: 2, title: "Logout test", tags: ["smoke"] },
	];

	test("exportCatalogToExcel returns a non-empty ArrayBuffer", () => {
		const buf = exportCatalogToExcel(catalogItems);
		expect(buf.byteLength).toBeGreaterThan(100);
	});

	test("exportCatalogToPdf returns HTML containing item titles", () => {
		const html = exportCatalogToPdf(catalogItems);
		expect(html).toContain("Login test");
		expect(html).toContain("Logout test");
		expect(html).toContain("Enter credentials");
	});

	test("exportCatalogToPdf embeds logo when logoDataUri provided", () => {
		const html = exportCatalogToPdf(catalogItems, {
			logoDataUri: "data:image/png;base64,abc",
			title: "My Catalog",
		});
		expect(html).toContain("data:image/png;base64,abc");
		expect(html).toContain("My Catalog");
	});

	test("exportReleaseReadinessToExcel returns a non-empty ArrayBuffer", () => {
		const report = {
			planTitle: "Sprint 1",
			environment: "CI",
			items: [
				{ testCaseId: 1, testCaseTitle: "Login", status: "Pass" },
				{ testCaseId: 2, testCaseTitle: "Logout", status: "Fail" },
			],
		};
		const buf = exportReleaseReadinessToExcel(report);
		expect(buf.byteLength).toBeGreaterThan(100);
	});

	test("exportReleaseReadinessToPdf includes pass rate", () => {
		const report = {
			planTitle: "Sprint 1",
			items: [
				{ testCaseId: 1, testCaseTitle: "Login", status: "Pass" },
				{ testCaseId: 2, testCaseTitle: "Logout", status: "Fail" },
			],
		};
		const html = exportReleaseReadinessToPdf(report);
		expect(html).toContain("50%");
		expect(html).toContain("Sprint 1");
	});
});

// ─── CLI upload-results — requires live ADO ───────────────────────────────────

test.describe("Phase 4 — CLI upload-results (live ADO)", () => {
	test.describe.configure({ timeout: 30_000 });

	test("upload JUnit XML creates matched executions against existing TCs", async ({
		tcService,
		planService,
		project,
	}) => {
		const id = uid();
		const automationKey = `e2e.Phase4UploadTest.run${id}`;

		const tc = await tcService.create({
			title: `E2E Upload TC ${id}`,
			areaPath: project,
			automationKey,
		});

		const plan = await planService.create({
			name: `E2E Upload Plan ${id}`,
			owner: "e2e@test.local",
			environments: ["E2E"],
		});

		// Write a JUnit XML with a passing result for that automationKey
		const junit = `<testsuite><testcase name="run${id}" classname="e2e.Phase4UploadTest"/></testsuite>`;
		const tmpFile = join(tmpdir(), `e2e-upload-${id}.xml`);
		writeFileSync(tmpFile, junit, "utf-8");

		const summary = await processUploadResults({
			file: tmpFile,
			planId: plan.id,
			environment: "E2E",
			pat: requireEnv("ADO_CLOUD_PAT"),
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
		});

		expect(summary.matched).toBe(1);
		expect(summary.unmatched).toBe(0);

		// Cleanup
		await tcService.delete(tc.id);
		await planService.delete(plan.id);
	});

	test("upload with autoCreate=true creates missing TCs and uploads", async ({
		tcService,
		planService,
		project,
	}) => {
		const id = uid();
		const automationKey = `e2e.Phase4AutoCreate.run${id}`;

		const plan = await planService.create({
			name: `E2E AutoCreate Plan ${id}`,
			owner: "e2e@test.local",
			environments: ["E2E"],
		});

		const junit = `<testsuite><testcase name="run${id}" classname="e2e.Phase4AutoCreate"/></testsuite>`;
		const tmpFile = join(tmpdir(), `e2e-autocreate-${id}.xml`);
		writeFileSync(tmpFile, junit, "utf-8");

		const summary = await processUploadResults({
			file: tmpFile,
			planId: plan.id,
			environment: "E2E",
			pat: requireEnv("ADO_CLOUD_PAT"),
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
			autoCreate: true,
			areaPath: project,
		});

		expect(summary.created).toBe(1);
		expect(summary.matched).toBe(0);

		// Cleanup created TC
		const allTcs = await tcService.list({ top: 2000 });
		const created = allTcs.find((t) => t.automationKey === automationKey);
		if (created) await tcService.delete(created.id);
		await planService.delete(plan.id);
	});

	test("upload Cucumber JSON matches on element.id automationKey", async ({
		tcService,
		planService,
		project,
	}) => {
		const id = uid();
		const automationKey = `e2e-phase4;cucumber-${id}`;

		const tc = await tcService.create({
			title: `E2E Cucumber TC ${id}`,
			areaPath: project,
			automationKey,
		});

		const plan = await planService.create({
			name: `E2E Cucumber Plan ${id}`,
			owner: "e2e@test.local",
			environments: ["E2E"],
		});

		const cucumber = JSON.stringify([
			{
				id: "e2e-phase4",
				name: "Phase 4",
				elements: [
					{
						id: `e2e-phase4;cucumber-${id}`,
						name: `Cucumber ${id}`,
						steps: [{ result: { status: "passed" } }],
					},
				],
			},
		]);
		const tmpFile = join(tmpdir(), `e2e-cucumber-${id}.json`);
		writeFileSync(tmpFile, cucumber, "utf-8");

		const summary = await processUploadResults({
			file: tmpFile,
			planId: plan.id,
			environment: "E2E",
			pat: requireEnv("ADO_CLOUD_PAT"),
			orgUrl: requireEnv("ADO_CLOUD_ORG_URL"),
			project,
		});

		expect(summary.matched).toBe(1);

		await tcService.delete(tc.id);
		await planService.delete(plan.id);
	});
});
