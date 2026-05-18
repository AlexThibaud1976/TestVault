/**
 * ADO generates WIT refNames as {ProcessName_NoSpaces}.{WitName_NoSpaces}.
 * Our schema uses "TestVault.{WitNameCamelCase}".
 *
 * Example: schema "TestVault.TestCase" + process "Argos Inherited Demo"
 *   -> ADO refName "ArgosInheritedDemo.TestVaultTestCase"
 *
 * Match rule: adoRefName must be X.TestVault{suffix}
 *   where suffix = the part after "TestVault." in the schema refName.
 */
export function isArgosWit(adoRefName: string, schemaWitRefName: string): boolean {
	const schemaParts = schemaWitRefName.split(".");
	if (schemaParts.length !== 2 || schemaParts[0] !== "TestVault") return false;
	const witNamePart = schemaParts[1]; // e.g., "TestCase"

	const adoParts = adoRefName.split(".");
	if (adoParts.length !== 2) return false;
	const adoAfterDot = adoParts[1]; // e.g., "TestVaultTestCase"

	return adoAfterDot === `TestVault${witNamePart}`;
}

/**
 * Reverse-lookup: given an ADO-generated refName, find the matching schema entry.
 */
export function findSchemaWitByAdoRefName<T extends { referenceName: string }>(
	adoRefName: string,
	schemaWits: ReadonlyArray<T>
): T | undefined {
	return schemaWits.find((w) => isArgosWit(adoRefName, w.referenceName));
}

// ─── Field refName translation (Sprint 2.11) ─────────────────────────────────
//
// ADO inherited processes force "Custom." prefix for custom field referenceNames.
// Microsoft docs: "When you add a custom field to an inherited process, Azure DevOps
// assigns it a reference name prefixed with Custom and removes any spaces."
//
// Schema field namespace : "TestVault.{FieldName}"
// ADO field namespace    : "Custom.TestVault{FieldName}"
//
// System.* and Microsoft.* fields are org/system-level and pass through unchanged.

/**
 * Translate a schema field referenceName to its ADO counterpart.
 *
 * Examples:
 *   "TestVault.Priority"              -> "Custom.TestVaultPriority"
 *   "TestVault.TestCaseRef"           -> "Custom.TestVaultTestCaseRef"
 *   "System.Title"                    -> "System.Title"
 *   "Microsoft.VSTS.Common.Priority"  -> "Microsoft.VSTS.Common.Priority"
 */
export function schemaToAdoFieldRefName(schemaFieldRefName: string): string {
	if (!schemaFieldRefName.startsWith("TestVault.")) {
		return schemaFieldRefName;
	}

	const parts = schemaFieldRefName.split(".");
	if (parts.length !== 2 || !parts[1]) {
		throw new Error(
			`Invalid schema field refName: "${schemaFieldRefName}". Expected format "TestVault.{FieldName}".`
		);
	}

	const fieldNamePart = parts[1];
	return `Custom.TestVault${fieldNamePart}`;
}

/**
 * Check if an ADO field referenceName corresponds to a given schema field entry.
 *
 * Conservative match: ADO refName must be exactly the expected translation.
 * Returns false (rather than throwing) on invalid schema refName.
 */
export function isArgosField(adoFieldRefName: string, schemaFieldRefName: string): boolean {
	try {
		const expected = schemaToAdoFieldRefName(schemaFieldRefName);
		return adoFieldRefName === expected;
	} catch {
		return false;
	}
}

/**
 * Reverse-lookup: given an ADO field refName, find the matching schema entry.
 */
export function findSchemaFieldByAdoRefName<T extends { referenceName: string }>(
	adoFieldRefName: string,
	schemaFields: ReadonlyArray<T>
): T | undefined {
	return schemaFields.find((f) => isArgosField(adoFieldRefName, f.referenceName));
}

// ─── State name translation (Sprint 2.14) ────────────────────────────────────
//
// ADO POST /workItemTypes creates a WIT with DEFAULT STATES automatically
// (New, Active, Resolved, Closed, Removed inherited from base process).
// Schema state names like "Active" or "Closed" collide with these defaults.
//
// Solution: prefix all schema state names with "TestVault " at runtime.
// Same pattern as Sprint 2.13 (field display names).
//
// Schema state name : "Active"
// ADO state name    : "TestVault Active"

/**
 * Translate a schema state name to its ADO counterpart.
 *
 * Examples:
 *   "Draft"           -> "TestVault Draft"
 *   "Active"          -> "TestVault Active"
 *   "Approved"        -> "TestVault Approved"
 *   "TestVault Done"  -> "TestVault Done"  (idempotent, no double-prefix)
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
 * Validate that an ADO state name doesn't violate ADO constraints.
 * Returns null if valid, error message string if invalid.
 */
export function validateAdoStateName(adoName: string): string | null {
	if (adoName.length > 128) {
		return `State name "${adoName}" exceeds 128 character limit`;
	}
	const FORBIDDEN = /[.,;':~\\/*|?"&%$!+=()[\]{}<>]/;
	if (FORBIDDEN.test(adoName)) {
		return `State name "${adoName}" contains forbidden characters`;
	}
	return null;
}

// ─── Field display name translation (Sprint 2.13) ────────────────────────────
//
// ADO enforces unique field NAMES across the entire organization.
// Microsoft VSTS fields already claim generic names like "Priority", "Severity", "Steps".
//
// Solution: prefix all schema display names with "TestVault " at runtime.
// Schema stays immutable (constitution §12) — translation happens here.
//
// Examples:
//   "Priority"          -> "TestVault Priority"
//   "Severity"          -> "TestVault Severity"
//   "TestVault Custom"  -> "TestVault Custom"  (idempotent)

/**
 * Translate a schema field display name to its ADO counterpart.
 *
 * Prefixes with "TestVault " to avoid collisions with Microsoft VSTS fields
 * that claim generic names org-wide. Idempotent if already prefixed.
 *
 * Throws on empty or excessively long names (>100 chars before prefix).
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

/**
 * Validate that a display name satisfies ADO field naming restrictions.
 *
 * Returns null if valid, or an error message string if invalid.
 * ADO limits: max 128 chars, no forbidden chars.
 */
export function validateAdoFieldName(adoName: string): string | null {
	if (adoName.length > 128) {
		return `Name "${adoName}" exceeds 128 character limit`;
	}
	const FORBIDDEN = /[.,;':~\\/*|?"&%$!+=()[\]{}<>]/;
	if (FORBIDDEN.test(adoName)) {
		return `Name "${adoName}" contains forbidden characters`;
	}
	return null;
}
