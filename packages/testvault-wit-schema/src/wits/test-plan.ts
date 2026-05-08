import type { WitDefinition } from "../model.js";

export const TEST_PLAN_WIT: WitDefinition = {
	referenceName: "TestVault.TestPlan",
	displayName: "Test Plan (Argos)",
	description: "Groups Test Sets and individual Test Cases for a release or sprint.",
	icon: "icon-list",
	color: "#773b93",
	fields: [
		{ referenceName: "System.Title", displayName: "Name", type: "string", required: true },
		{
			referenceName: "System.Description",
			displayName: "Description",
			type: "html",
			required: false,
		},
		{
			referenceName: "System.IterationPath",
			displayName: "Iteration",
			type: "treePath",
			required: false,
		},
		{ referenceName: "System.AssignedTo", displayName: "Owner", type: "identity", required: true },
		{
			referenceName: "TestVault.Environments",
			displayName: "Environments",
			type: "longText",
			required: false,
			description: "JSON-serialized string[] of environment names",
		},
		{
			referenceName: "TestVault.TestSetIds",
			displayName: "Test Set IDs",
			type: "longText",
			required: false,
			description: "JSON-serialized number[] of linked Test Set WI IDs",
		},
		{
			referenceName: "TestVault.AdditionalTestCaseIds",
			displayName: "Additional Test Case IDs",
			type: "longText",
			required: false,
			description: "JSON-serialized number[] of individual TC WI IDs outside any set",
		},
		{
			referenceName: "TestVault.LockedSnapshotIds",
			displayName: "Locked Snapshot IDs",
			type: "longText",
			required: false,
			description: "JSON-serialized number[] of TestCaseVersion IDs used when plan is Locked",
		},
		{
			referenceName: "TestVault.StartDate",
			displayName: "Start Date",
			type: "dateTime",
			required: false,
		},
		{
			referenceName: "TestVault.EndDate",
			displayName: "End Date",
			type: "dateTime",
			required: false,
		},
	],
	states: [
		{ name: "Draft", color: "#b2b2b2", stateCategory: "Proposed" },
		{ name: "Locked", color: "#007acc", stateCategory: "InProgress" },
		{ name: "Closed", color: "#393939", stateCategory: "Completed" },
	],
	transitions: [
		{ from: null, to: "Draft" },
		{ from: "Draft", to: "Locked" },
		{ from: "Locked", to: "Closed" },
		{ from: "Closed", to: "Draft" },
	],
};
