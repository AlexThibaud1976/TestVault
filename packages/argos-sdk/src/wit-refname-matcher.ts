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
