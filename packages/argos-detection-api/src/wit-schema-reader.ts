export const ARGOS_WIT_NAMES = [
	"TestVault.TestCase",
	"TestVault.TestSet",
	"TestVault.TestPlan",
	"TestVault.Precondition",
	"TestVault.TestExecution",
	"TestVault.TestPlanEntry",
	"TestVault.AuditLog",
] as const;

export type ArgosWorkItemType = (typeof ARGOS_WIT_NAMES)[number];

export interface ArgosWitField {
	referenceName: string;
	name: string;
	type: "string" | "integer" | "double" | "boolean" | "dateTime" | "html" | "plainText";
	readOnly: boolean;
}

export interface IArgosSchemaReader {
	listWorkItemTypes(orgUrl: string, project: string): Promise<ArgosWorkItemType[]>;
	getFields(orgUrl: string, project: string, witName: ArgosWorkItemType): Promise<ArgosWitField[]>;
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

export function createArgosSchemaReader(client: IAdoWorkItemClient): IArgosSchemaReader {
	return {
		async listWorkItemTypes(orgUrl, project) {
			const all = await client.listWorkItemTypeNames(orgUrl, project);
			return all.filter((n): n is ArgosWorkItemType =>
				(ARGOS_WIT_NAMES as readonly string[]).includes(n)
			);
		},

		async getFields(orgUrl, project, witName) {
			const raw = await client.getWorkItemTypeFields(orgUrl, project, witName);
			return raw.map((f) => ({
				referenceName: f.referenceName,
				name: f.name,
				type: f.type as ArgosWitField["type"],
				readOnly: f.readOnly,
			}));
		},

		async isArgosInstalled(orgUrl, project) {
			const types = await this.listWorkItemTypes(orgUrl, project);
			return types.includes("TestVault.TestCase");
		},
	};
}
