import type { WitDefinition } from "../model.js";

export const TEST_SET_WIT: WitDefinition = {
	referenceName: "TestVault.TestSet",
	displayName: "Test Set (Argos)",
	description: "Named collection of Test Cases — static list or dynamic WIQL query.",
	icon: "icon-folder",
	color: "#009ccc",
	fields: [
		{ referenceName: "System.Title", displayName: "Name", type: "string", required: true },
		{
			referenceName: "System.Description",
			displayName: "Description",
			type: "html",
			required: false,
		},
		{
			referenceName: "System.AreaPath",
			displayName: "Area Path",
			type: "treePath",
			required: true,
		},
		{ referenceName: "System.Tags", displayName: "Tags", type: "string", required: false },
		{
			referenceName: "TestVault.TestCaseIds",
			displayName: "Test Case IDs",
			type: "longText",
			required: false,
			description: "JSON-serialized number[] — static composition",
		},
		{
			referenceName: "TestVault.WiqlQuery",
			displayName: "WIQL Query",
			type: "longText",
			required: false,
			description: "Dynamic composition via WIQL; mutually exclusive with static TestCaseIds",
		},
	],
	states: [{ name: "Active", color: "#28a745", stateCategory: "InProgress" }],
	transitions: [{ from: null, to: "Active" }],
};
