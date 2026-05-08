import { describe, expect, it } from "vitest";
import { buildTestCaseQuery, buildWiqlQuery } from "./wiql.js";

describe("buildWiqlQuery", () => {
	it("builds a basic SELECT from a project", () => {
		const q = buildWiqlQuery("MyProject");
		expect(q).toContain("SELECT");
		expect(q).toContain("FROM WorkItems");
		expect(q).toContain("MyProject");
	});

	it("filters by work item type when provided", () => {
		const q = buildWiqlQuery("P", { workItemType: "TestVault.TestCase" });
		expect(q).toContain("[System.WorkItemType] = 'TestVault.TestCase'");
	});

	it("filters by state when provided", () => {
		const q = buildWiqlQuery("P", { state: "Active" });
		expect(q).toContain("[System.State] = 'Active'");
	});

	it("filters by a single tag", () => {
		const q = buildWiqlQuery("P", { tags: ["smoke"] });
		expect(q).toContain("smoke");
		expect(q).toContain("[System.Tags]");
	});

	it("filters by multiple tags using CONTAINS", () => {
		const q = buildWiqlQuery("P", { tags: ["smoke", "auth"] });
		expect(q).toContain("smoke");
		expect(q).toContain("auth");
	});

	it("includes asOf clause when provided", () => {
		const q = buildWiqlQuery("P", { asOf: "2025-01-01" });
		expect(q).toContain("ASOF '2025-01-01'");
	});

	it("includes custom fields in SELECT when provided", () => {
		const q = buildWiqlQuery("P", {
			fields: ["System.Id", "System.Title", "TestVault.AutomationKey"],
		});
		expect(q).toContain("System.Id");
		expect(q).toContain("System.Title");
		expect(q).toContain("TestVault.AutomationKey");
	});

	it("always includes System.Id and System.TeamProject in output", () => {
		const q = buildWiqlQuery("P");
		expect(q).toContain("System.Id");
	});

	it("scopes to team project", () => {
		const q = buildWiqlQuery("AcmeCorp");
		expect(q).toContain("[System.TeamProject] = 'AcmeCorp'");
	});
});

describe("buildTestCaseQuery", () => {
	it("pre-sets WorkItemType to TestVault.TestCase", () => {
		const q = buildTestCaseQuery("P");
		expect(q).toContain("[System.WorkItemType] = 'TestVault.TestCase'");
	});

	it("allows additional filters on top of the preset type", () => {
		const q = buildTestCaseQuery("P", { state: "Active", tags: ["regression"] });
		expect(q).toContain("[System.State] = 'Active'");
		expect(q).toContain("regression");
	});
});
