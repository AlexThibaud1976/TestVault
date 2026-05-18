import { describe, expect, it, vi } from "vitest";
import type { IWitTypeProvider } from "./wit-resolver.js";
import { createWitResolver } from "./wit-resolver.js";

const ALL_7_WITS = [
	"TestVault.TestCase",
	"TestVault.TestSet",
	"TestVault.TestPlan",
	"TestVault.Precondition",
	"TestVault.TestExecution",
	"TestVault.TestCaseVersion",
	"TestVault.AuditLog",
] as const;

function makeProvider(processName = "MyProcess"): IWitTypeProvider {
	return {
		getWorkItemTypes: vi.fn().mockResolvedValue([
			{ referenceName: `${processName}.TestVaultTestCase`, name: "Test Case" },
			{ referenceName: `${processName}.TestVaultTestSet`, name: "Test Set" },
			{ referenceName: `${processName}.TestVaultTestPlan`, name: "Test Plan" },
			{ referenceName: `${processName}.TestVaultPrecondition`, name: "Precondition" },
			{ referenceName: `${processName}.TestVaultTestExecution`, name: "Test Execution" },
			{ referenceName: `${processName}.TestVaultTestCaseVersion`, name: "Test Case Version" },
			{ referenceName: `${processName}.TestVaultAuditLog`, name: "Audit Log" },
			{ referenceName: "Microsoft.VSTS.WorkItemTypes.Bug", name: "Bug" },
		]),
	};
}

describe("createWitResolver", () => {
	describe("resolveAdoWitRefName", () => {
		it("resolves all 7 schema WIT refNames to ADO refNames", async () => {
			const provider = makeProvider("ArgosInheritedDemo");
			const resolver = createWitResolver(provider, "my-project");

			for (const schemaRef of ALL_7_WITS) {
				const adoRef = await resolver.resolveAdoWitRefName(schemaRef);
				expect(adoRef).toMatch(/^ArgosInheritedDemo\.TestVault/);
			}
		});

		it("maps TestVault.TestPlan to process-prefixed ADO refName", async () => {
			const resolver = createWitResolver(makeProvider("ArgosInheritedDemo"), "p");
			expect(await resolver.resolveAdoWitRefName("TestVault.TestPlan")).toBe(
				"ArgosInheritedDemo.TestVaultTestPlan"
			);
		});

		it("maps TestVault.TestCaseVersion correctly", async () => {
			const resolver = createWitResolver(makeProvider("Acme"), "p");
			expect(await resolver.resolveAdoWitRefName("TestVault.TestCaseVersion")).toBe(
				"Acme.TestVaultTestCaseVersion"
			);
		});

		it("throws a clear error for unknown schema refName", async () => {
			const resolver = createWitResolver(makeProvider(), "p");
			await expect(resolver.resolveAdoWitRefName("TestVault.Unknown")).rejects.toThrow(
				'[WitResolver] No ADO refName found for schema "TestVault.Unknown"'
			);
		});

		it("throws and lists available keys on unknown refName", async () => {
			const resolver = createWitResolver(makeProvider(), "p");
			await expect(resolver.resolveAdoWitRefName("TestVault.Missing")).rejects.toThrow(
				"Available:"
			);
		});

		it("works with custom process names", async () => {
			const resolver = createWitResolver(makeProvider("CustomerProcess"), "p");
			expect(await resolver.resolveAdoWitRefName("TestVault.TestCase")).toBe(
				"CustomerProcess.TestVaultTestCase"
			);
		});
	});

	describe("caching behaviour", () => {
		it("calls getWorkItemTypes only once across multiple resolves", async () => {
			const provider = makeProvider();
			const resolver = createWitResolver(provider, "p");

			await resolver.resolveAdoWitRefName("TestVault.TestPlan");
			await resolver.resolveAdoWitRefName("TestVault.TestCase");
			await resolver.resolveAdoWitRefName("TestVault.AuditLog");

			expect(provider.getWorkItemTypes).toHaveBeenCalledTimes(1);
		});

		it("invalidateCache forces re-fetch on next resolve", async () => {
			const provider = makeProvider();
			const resolver = createWitResolver(provider, "p");

			await resolver.resolveAdoWitRefName("TestVault.TestPlan");
			resolver.invalidateCache();
			await resolver.resolveAdoWitRefName("TestVault.TestPlan");

			expect(provider.getWorkItemTypes).toHaveBeenCalledTimes(2);
		});
	});

	describe("resolveSchemaWitRefName", () => {
		it("reverse-maps ADO refName to schema refName", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			expect(resolver.resolveSchemaWitRefName("ArgosInheritedDemo.TestVaultTestPlan")).toBe(
				"TestVault.TestPlan"
			);
		});

		it("returns null for non-Argos ADO refName", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			expect(resolver.resolveSchemaWitRefName("Microsoft.VSTS.WorkItemTypes.Bug")).toBeNull();
		});
	});

	describe("translateFieldsToAdo", () => {
		it("translates TestVault field keys to Custom.TestVault keys", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			const result = resolver.translateFieldsToAdo({
				"TestVault.Priority": "High",
				"TestVault.Environments": "Prod",
			});
			expect(result).toEqual({
				"Custom.TestVaultPriority": "High",
				"Custom.TestVaultEnvironments": "Prod",
			});
		});

		it("passes through non-TestVault fields unchanged", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			const result = resolver.translateFieldsToAdo({
				"System.Title": "My Title",
				"System.State": "Active",
			});
			expect(result).toEqual({
				"System.Title": "My Title",
				"System.State": "Active",
			});
		});

		it("handles empty fields object", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			expect(resolver.translateFieldsToAdo({})).toEqual({});
		});
	});

	describe("translateFieldsFromAdo", () => {
		it("translates Custom.TestVault keys back to TestVault schema keys", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			const result = resolver.translateFieldsFromAdo({
				"Custom.TestVaultPriority": "High",
				"Custom.TestVaultEnvironments": "Prod",
			});
			expect(result).toEqual({
				"TestVault.Priority": "High",
				"TestVault.Environments": "Prod",
			});
		});

		it("passes through non-Argos fields unchanged", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			const result = resolver.translateFieldsFromAdo({
				"System.Title": "My Title",
				"System.State": "Active",
				"Custom.TestVaultPriority": "High",
			});
			expect(result).toEqual({
				"System.Title": "My Title",
				"System.State": "Active",
				"TestVault.Priority": "High",
			});
		});

		it("handles empty fields object", () => {
			const resolver = createWitResolver(makeProvider(), "p");
			expect(resolver.translateFieldsFromAdo({})).toEqual({});
		});
	});
});
