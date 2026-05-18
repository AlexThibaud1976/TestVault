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
