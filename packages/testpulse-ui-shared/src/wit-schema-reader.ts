export const TESTVAULT_WIT_NAMES = [
	"TestVault.TestCase",
	"TestVault.TestSet",
	"TestVault.TestPlan",
	"TestVault.Precondition",
	"TestVault.TestExecution",
	"TestVault.TestPlanEntry",
	"TestVault.AuditLog",
] as const;

export type TestVaultWorkItemType = (typeof TESTVAULT_WIT_NAMES)[number];

export interface TestVaultWitField {
	referenceName: string;
	name: string;
	type: "string" | "integer" | "double" | "boolean" | "dateTime" | "html" | "plainText";
	readOnly: boolean;
}

export interface ITestVaultSchemaReader {
	listWorkItemTypes(orgUrl: string, project: string): Promise<TestVaultWorkItemType[]>;
	getFields(
		orgUrl: string,
		project: string,
		witName: TestVaultWorkItemType
	): Promise<TestVaultWitField[]>;
	isArgosInstalled(orgUrl: string, project: string): Promise<boolean>;
}

export interface IAdoWorkItemClient {
	listWorkItemTypeNames(orgUrl: string, project: string): Promise<string[]>;
	getWorkItemTypeFields(
		orgUrl: string,
		project: string,
		typeName: string
	): Promise<Array<{ referenceName: string; name: string; type: string; readOnly: boolean }>>;
}

export function createTestVaultSchemaReader(client: IAdoWorkItemClient): ITestVaultSchemaReader {
	return {
		async listWorkItemTypes(orgUrl, project) {
			const all = await client.listWorkItemTypeNames(orgUrl, project);
			return all.filter((n): n is TestVaultWorkItemType =>
				(TESTVAULT_WIT_NAMES as readonly string[]).includes(n)
			);
		},

		async getFields(orgUrl, project, witName) {
			const raw = await client.getWorkItemTypeFields(orgUrl, project, witName);
			return raw.map((f) => ({
				referenceName: f.referenceName,
				name: f.name,
				type: f.type as TestVaultWitField["type"],
				readOnly: f.readOnly,
			}));
		},

		async isArgosInstalled(orgUrl, project) {
			const types = await this.listWorkItemTypes(orgUrl, project);
			return types.includes("TestVault.TestCase");
		},
	};
}
