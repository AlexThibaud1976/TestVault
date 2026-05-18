import { describe, expect, it, vi } from "vitest";
import { ARGOS_WIT_NAMES, createArgosSchemaReader } from "./wit-schema-reader.js";
import type { IAdoWorkItemClient } from "./wit-schema-reader.js";

// ADO generates refNames as {ProcessName}.TestVault{WitName} — not the schema names directly
const ADO_WIT_NAMES = [
	"SomeProcess.TestVaultTestCase",
	"SomeProcess.TestVaultTestSet",
	"SomeProcess.TestVaultTestPlan",
	"SomeProcess.TestVaultPrecondition",
	"SomeProcess.TestVaultTestExecution",
	"SomeProcess.TestVaultTestPlanEntry",
	"SomeProcess.TestVaultAuditLog",
];

function makeClient(overrides?: Partial<IAdoWorkItemClient>): IAdoWorkItemClient {
	return {
		listWorkItemTypeNames: vi.fn().mockResolvedValue([...ADO_WIT_NAMES, "System.Bug"]),
		getWorkItemTypeFields: vi.fn().mockResolvedValue([
			{ referenceName: "TestVault.TestCase.Title", name: "Title", type: "string", readOnly: false },
			{
				referenceName: "TestVault.TestCase.Status",
				name: "Status",
				type: "string",
				readOnly: false,
			},
		]),
		...overrides,
	};
}

describe("createArgosSchemaReader", () => {
	it("listWorkItemTypes returns only TestVault.* types", async () => {
		const reader = createArgosSchemaReader(makeClient());
		const types = await reader.listWorkItemTypes("https://dev.azure.com/org", "project");
		expect(types.every((t) => t.startsWith("TestVault."))).toBe(true);
		expect(types).not.toContain("System.Bug");
	});

	it("listWorkItemTypes includes all 7 TestVault WIT names when present", async () => {
		const reader = createArgosSchemaReader(makeClient());
		const types = await reader.listWorkItemTypes("https://dev.azure.com/org", "project");
		expect(types).toHaveLength(ARGOS_WIT_NAMES.length);
	});

	it("isArgosInstalled returns true when TestVault.TestCase is present", async () => {
		const reader = createArgosSchemaReader(makeClient());
		const installed = await reader.isArgosInstalled("https://dev.azure.com/org", "project");
		expect(installed).toBe(true);
	});

	it("isArgosInstalled returns false when TestVault.TestCase is absent", async () => {
		const client = makeClient({
			listWorkItemTypeNames: vi.fn().mockResolvedValue(["System.Bug", "System.Task"]),
		});
		const reader = createArgosSchemaReader(client);
		const installed = await reader.isArgosInstalled("https://dev.azure.com/org", "project");
		expect(installed).toBe(false);
	});

	it("getFields maps raw fields to ArgosWitField shape", async () => {
		const reader = createArgosSchemaReader(makeClient());
		const fields = await reader.getFields(
			"https://dev.azure.com/org",
			"project",
			"TestVault.TestCase"
		);
		expect(fields[0]).toEqual({
			referenceName: "TestVault.TestCase.Title",
			name: "Title",
			type: "string",
			readOnly: false,
		});
	});

	it("listWorkItemTypes returns empty array when no TestVault types installed", async () => {
		const client = makeClient({
			listWorkItemTypeNames: vi.fn().mockResolvedValue(["System.Bug"]),
		});
		const reader = createArgosSchemaReader(client);
		const types = await reader.listWorkItemTypes("https://dev.azure.com/org", "project");
		expect(types).toHaveLength(0);
	});
});
