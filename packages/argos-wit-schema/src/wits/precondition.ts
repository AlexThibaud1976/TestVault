import type { WitDefinition } from "../model.js";

export const PRECONDITION_WIT: WitDefinition = {
	referenceName: "TestVault.Precondition",
	displayName: "Precondition (Argos)",
	description: "Prerequisite state or action required before executing linked Test Cases.",
	icon: "icon-settings",
	color: "#e60017",
	fields: [
		{ referenceName: "System.Title", displayName: "Title", type: "string", required: true },
		{
			referenceName: "System.Description",
			displayName: "Description",
			type: "html",
			required: false,
		},
		{ referenceName: "System.Tags", displayName: "Tags", type: "string", required: false },
		{
			referenceName: "TestVault.LinkedTestCaseIds",
			displayName: "Linked Test Case IDs",
			type: "longText",
			required: false,
			description: "JSON-serialized number[] — bidirectional link to Test Cases",
		},
	],
	states: [
		{ name: "Active", color: "#28a745", stateCategory: "InProgress" },
		{ name: "Deprecated", color: "#6c757d", stateCategory: "Completed" },
	],
	transitions: [
		{ from: null, to: "Active" },
		{ from: "Active", to: "Deprecated" },
	],
};
