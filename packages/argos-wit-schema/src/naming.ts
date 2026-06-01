/**
 * Naming utilities for translating between TESTVAULT_SCHEMA refNames
 * and Azure DevOps inherited process refNames.
 *
 * Source of truth: this package owns the schema, so it owns the naming rules.
 * Consumers (argos-sdk, argos-detection-api, argos-extension) import from here.
 *
 * ADO inherited process naming rules:
 *   WIT refName  : {ProcessName}.TestVault{WitName}   (e.g. "ArgosInheritedDemo.TestVaultTestCase")
 *   Field refName: Custom.TestVault{FieldName}         (e.g. "Custom.TestVaultPriority")
 *   Field name   : "TestVault {DisplayName}"           (e.g. "TestVault Priority")
 *   State name   : "TestVault {StateName}"             (e.g. "TestVault Active")
 */

import { TESTVAULT_SCHEMA } from "./schema.js";

// ─── WIT refName translation ──────────────────────────────────────────────────

/**
 * Compute the ADO refName suffix for a schema WIT.
 * "TestVault.TestCase" -> "TestVaultTestCase"
 * (the {processName} prefix is dynamic per process)
 */
export function schemaWitRefNameToAdoSuffix(schemaRefName: string): string {
	if (!schemaRefName.startsWith("TestVault.")) {
		throw new Error(`Schema WIT refName must start with "TestVault.": "${schemaRefName}"`);
	}
	return `TestVault${schemaRefName.substring("TestVault.".length)}`;
}

/**
 * Check if an ADO refName belongs to an Argos WIT (any of the 7 schema WITs).
 * Uses suffix matching since the {ProcessName} prefix is dynamic.
 *
 * @example
 *   isArgosWit("ArgosInheritedDemo.TestVaultTestCase") -> true
 *   isArgosWit("MyProcess.TestVaultTestPlan")          -> true
 *   isArgosWit("TestVault.TestCase")                   -> true  (schema direct)
 *   isArgosWit("Microsoft.VSTS.WorkItemTypes.Bug")     -> false
 */
export function isArgosWit(adoRefName: string): boolean {
	if (!adoRefName) return false;

	// Direct schema refName (for tests / internal use)
	if (adoRefName.startsWith("TestVault.")) {
		return TESTVAULT_SCHEMA.wits.some((w) => w.referenceName === adoRefName);
	}

	// ADO refName: check if suffix matches one of our WITs
	return TESTVAULT_SCHEMA.wits.some((w) => {
		const suffix = schemaWitRefNameToAdoSuffix(w.referenceName);
		return adoRefName.endsWith(`.${suffix}`);
	});
}

/**
 * Find the schema WIT corresponding to an ADO-generated refName.
 * Returns undefined if no match.
 */
export function findSchemaWitByAdoRefName(
	adoRefName: string
): (typeof TESTVAULT_SCHEMA.wits)[number] | undefined {
	if (!adoRefName) return undefined;

	// Direct schema refName
	if (adoRefName.startsWith("TestVault.")) {
		return TESTVAULT_SCHEMA.wits.find((w) => w.referenceName === adoRefName);
	}

	// ADO refName: suffix match
	return TESTVAULT_SCHEMA.wits.find((w) => {
		const suffix = schemaWitRefNameToAdoSuffix(w.referenceName);
		return adoRefName.endsWith(`.${suffix}`);
	});
}

// ─── Field refName translation (Sprint 2.11) ─────────────────────────────────

/**
 * Translate a schema field refName to its ADO counterpart.
 * "TestVault.Priority"             -> "Custom.TestVaultPriority"
 * "System.Title"                   -> "System.Title"   (pass-through)
 * "Microsoft.VSTS.Common.Priority" -> unchanged        (pass-through)
 */
export function schemaToAdoFieldRefName(schemaRefName: string): string {
	if (!schemaRefName.startsWith("TestVault.")) {
		return schemaRefName;
	}
	return `Custom.TestVault${schemaRefName.substring("TestVault.".length)}`;
}

/**
 * Check if an ADO field refName is one of ours (starts with "Custom.TestVault").
 */
export function isArgosField(adoFieldRefName: string): boolean {
	return adoFieldRefName.startsWith("Custom.TestVault");
}

// ─── Field display name translation (Sprint 2.13) ────────────────────────────

/**
 * Translate a schema field display name to its ADO counterpart.
 * "Priority"          -> "TestVault Priority"
 * "TestVault Priority"-> "TestVault Priority"  (idempotent)
 */
export function schemaToAdoFieldName(schemaDisplayName: string): string {
	if (!schemaDisplayName || schemaDisplayName.trim().length === 0) {
		throw new Error("Empty schema field display name");
	}
	if (schemaDisplayName.length > 100) {
		throw new Error(`Schema field display name too long (>100 chars): "${schemaDisplayName}"`);
	}
	if (schemaDisplayName.startsWith("TestVault ")) {
		return schemaDisplayName;
	}
	return `TestVault ${schemaDisplayName}`;
}

// ─── State name translation (Sprint 2.14) ────────────────────────────────────

/**
 * Translate a schema state name to its ADO counterpart.
 * "Active"          -> "TestVault Active"
 * "TestVault Active"-> "TestVault Active"  (idempotent)
 */
export function schemaToAdoStateName(schemaStateName: string): string {
	if (!schemaStateName || schemaStateName.trim().length === 0) {
		throw new Error("Empty schema state name");
	}
	if (schemaStateName.length > 100) {
		throw new Error(`Schema state name too long (>100 chars): "${schemaStateName}"`);
	}
	if (schemaStateName.startsWith("TestVault ")) {
		return schemaStateName;
	}
	return `TestVault ${schemaStateName}`;
}

/**
 * Reverse-translate an ADO state name back to its schema counterpart.
 * "TestVault Active" -> "Active"
 * "Active"           -> "Active"  (idempotent on already-stripped names)
 */
export function schemaFromAdoStateName(adoStateName: string): string {
	const PREFIX = "TestVault ";
	if (adoStateName.startsWith(PREFIX)) {
		return adoStateName.slice(PREFIX.length);
	}
	return adoStateName;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const ADO_NAME_FORBIDDEN = /[.,;':~\\/*|?"&%$!+=()[\]{}<>]/;

/** Returns null if valid, error message if invalid. */
export function validateAdoFieldName(adoName: string): string | null {
	if (adoName.length > 128) {
		return `Name "${adoName}" exceeds 128 character limit`;
	}
	if (ADO_NAME_FORBIDDEN.test(adoName)) {
		return `Name "${adoName}" contains forbidden characters`;
	}
	return null;
}

/** Same rules as fields. Returns null if valid, error message if invalid. */
export function validateAdoStateName(adoName: string): string | null {
	return validateAdoFieldName(adoName);
}
