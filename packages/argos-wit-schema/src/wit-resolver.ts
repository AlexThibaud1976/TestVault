/**
 * Runtime WIT refName resolver.
 *
 * ADO generates refNames dynamically: {ProcessName}.TestVault{WitName}.
 * This service caches the schema↔ADO mapping after the first API call
 * and provides transparent translation for all CRUD operations.
 *
 * Architecture: Sprint 2.16 — single source of truth for runtime resolution.
 */

import { findSchemaWitByAdoRefName, isArgosField, schemaToAdoFieldRefName } from "./naming.js";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IWitTypeProvider {
	getWorkItemTypes(projectId: string): Promise<Array<{ referenceName: string; name: string }>>;
}

export interface WitResolver {
	/**
	 * Resolve a schema refName to its ADO refName (async, uses cache).
	 * "TestVault.TestPlan" -> "ArgosInheritedDemo.TestVaultTestPlan"
	 */
	resolveAdoWitRefName(schemaRefName: string): Promise<string>;

	/**
	 * Reverse: ADO refName -> schema refName (pure, no network call).
	 * "ArgosInheritedDemo.TestVaultTestPlan" -> "TestVault.TestPlan"
	 */
	resolveSchemaWitRefName(adoRefName: string): string | null;

	/**
	 * Translate field keys from schema to ADO refNames (for POST/PATCH bodies).
	 * { "TestVault.Priority": "High" } -> { "Custom.TestVaultPriority": "High" }
	 */
	translateFieldsToAdo(fields: Record<string, unknown>): Record<string, unknown>;

	/**
	 * Translate field keys from ADO to schema refNames (for GET responses).
	 * { "Custom.TestVaultPriority": "High" } -> { "TestVault.Priority": "High" }
	 */
	translateFieldsFromAdo(fields: Record<string, unknown>): Record<string, unknown>;

	/** Clear cache (if process changes during session). */
	invalidateCache(): void;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createWitResolver(client: IWitTypeProvider, projectId: string): WitResolver {
	let cache: Map<string, string> | null = null;

	async function ensureCache(): Promise<Map<string, string>> {
		if (cache) return cache;

		const adoWits = await client.getWorkItemTypes(projectId);
		const newCache = new Map<string, string>();

		for (const adoWit of adoWits) {
			const schemaWit = findSchemaWitByAdoRefName(adoWit.referenceName);
			if (schemaWit) {
				newCache.set(schemaWit.referenceName, adoWit.referenceName);
			}
		}

		cache = newCache;
		return cache;
	}

	return {
		async resolveAdoWitRefName(schemaRefName) {
			const map = await ensureCache();
			const adoRefName = map.get(schemaRefName);

			if (!adoRefName) {
				throw new Error(
					`[WitResolver] No ADO refName found for schema "${schemaRefName}". ` +
						`Available: ${[...map.keys()].join(", ")}`
				);
			}
			return adoRefName;
		},

		resolveSchemaWitRefName(adoRefName) {
			return findSchemaWitByAdoRefName(adoRefName)?.referenceName ?? null;
		},

		translateFieldsToAdo(fields) {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(fields)) {
				result[schemaToAdoFieldRefName(key)] = value;
			}
			return result;
		},

		translateFieldsFromAdo(fields) {
			const result: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(fields)) {
				if (isArgosField(key)) {
					result[`TestVault.${key.slice("Custom.TestVault".length)}`] = value;
				} else {
					result[key] = value;
				}
			}
			return result;
		},

		invalidateCache() {
			cache = null;
		},
	};
}
