import type { WitDefinition } from "../model.js";

export const TEST_CASE_VERSION_WIT: WitDefinition = {
	referenceName: "TestVault.TestCaseVersion",
	displayName: "TestVault Test Case Version",
	description: "Immutable snapshot of a Test Case at a specific point in time.",
	icon: "icon_ribbon",
	color: "#5c2d91",
	isImmutableAfterCreate: true,
	fields: [
		{ referenceName: "System.Title", displayName: "Snapshot Name", type: "string", required: true },
		{
			referenceName: "TestVault.ParentTestCaseId",
			displayName: "Parent Test Case ID",
			type: "integer",
			required: true,
		},
		{
			referenceName: "TestVault.SnapshotName",
			displayName: "Version Label",
			type: "string",
			required: true,
			description: "Human-readable label, unique per parent Test Case",
		},
		{
			referenceName: "TestVault.Comment",
			displayName: "Comment",
			type: "string",
			required: false,
		},
		{
			referenceName: "TestVault.SnapshotAt",
			displayName: "Snapshot Date",
			type: "dateTime",
			required: true,
		},
		{
			referenceName: "TestVault.SnapshotBy",
			displayName: "Snapshot By",
			type: "string",
			required: true,
		},
		{
			referenceName: "TestVault.FrozenFields",
			displayName: "Frozen Fields",
			type: "longText",
			required: true,
			description: "JSON-serialized TestVaultTestCase snapshot",
		},
	],
	states: [{ name: "Active", color: "#5c2d91", stateCategory: "InProgress" }],
	transitions: [{ from: null, to: "Active" }],
};
