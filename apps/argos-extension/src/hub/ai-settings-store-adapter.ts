import type { IExtensionDataClient } from "@atconseil/testvault-sdk";
import type { IAiSettingsStore } from "./llm-provider-service.js";

type StoredDoc = { id: string } & Record<string, unknown>;

/**
 * Adapts IExtensionDataClient (getValue/setValue) to IAiSettingsStore
 * (getAll/set/delete/getFlag/setFlag). Collections are stored as arrays
 * keyed by collection name; flags are stored as individual boolean values.
 */
export function createAiSettingsStore(client: IExtensionDataClient): IAiSettingsStore {
	async function readCollection(collection: string): Promise<StoredDoc[]> {
		return (await client.getValue<StoredDoc[]>(collection)) ?? [];
	}

	return {
		async getAll(collection) {
			return readCollection(collection);
		},

		async set(collection, doc) {
			const existing = await readCollection(collection);
			const updated = [...existing.filter((d) => d.id !== doc.id), doc];
			await client.setValue(collection, updated);
		},

		async delete(collection, id) {
			const existing = await readCollection(collection);
			const updated = existing.filter((d) => d.id !== id);
			await client.setValue(collection, updated);
		},

		async getFlag(key) {
			return (await client.getValue<boolean>(key)) ?? false;
		},

		async setFlag(key, value) {
			await client.setValue(key, value);
		},
	};
}
