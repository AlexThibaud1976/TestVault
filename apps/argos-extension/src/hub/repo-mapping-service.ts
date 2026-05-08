export type RepoMapping = {
	id: string;
	repoUrl: string;
	branch: string;
	pathGlob: string;
	areaPath: string;
};

export type SyncMappingResult = { created: number; updated: number; deprecated: number };

export interface IRepoMappingService {
	list(): Promise<RepoMapping[]>;
	add(mapping: Omit<RepoMapping, "id">): Promise<RepoMapping>;
	remove(id: string): Promise<void>;
	sync(id: string): Promise<SyncMappingResult>;
}

export interface IDataStore {
	getAll(collection: string): Promise<unknown[]>;
	set(collection: string, doc: RepoMapping): Promise<void>;
	delete(collection: string, id: string): Promise<void>;
}

const COLLECTION = "repo-mappings";

function isRepoMapping(v: unknown): v is RepoMapping {
	return (
		typeof v === "object" &&
		v !== null &&
		typeof (v as RepoMapping).id === "string" &&
		typeof (v as RepoMapping).repoUrl === "string"
	);
}

function uuid(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createRepoMappingService(store: IDataStore): IRepoMappingService {
	return {
		async list() {
			const docs = await store.getAll(COLLECTION);
			return docs.filter(isRepoMapping);
		},

		async add(mapping) {
			const doc: RepoMapping = { ...mapping, id: uuid() };
			await store.set(COLLECTION, doc);
			return doc;
		},

		async remove(id) {
			await store.delete(COLLECTION, id);
		},

		async sync(_id) {
			// Runtime implementation posts to the Azure Function endpoint.
			// The host wires this up at bootstrap; the factory returns a no-op stub.
			return { created: 0, updated: 0, deprecated: 0 };
		},
	};
}
