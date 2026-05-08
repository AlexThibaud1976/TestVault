import { describe, expect, it, vi } from "vitest";
import { createRepoMappingService } from "./repo-mapping-service.js";
import type { IDataStore, RepoMapping } from "./repo-mapping-service.js";

function makeMapping(overrides?: Partial<RepoMapping>): RepoMapping {
	return {
		id: "m-1",
		repoUrl: "https://github.com/org/repo",
		branch: "main",
		pathGlob: "src/**/*.ts",
		areaPath: "MyProject\\Area",
		...overrides,
	};
}

function makeStore(items: RepoMapping[] = []): IDataStore {
	const data: RepoMapping[] = [...items];
	return {
		getAll: vi.fn().mockResolvedValue(data),
		set: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
	};
}

describe("createRepoMappingService", () => {
	it("list returns only valid RepoMapping objects", async () => {
		const m = makeMapping();
		const store = makeStore([m, { invalid: true } as unknown as RepoMapping]);
		const svc = createRepoMappingService(store);
		const result = await svc.list();
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(m);
	});

	it("list returns empty array when store has no valid mappings", async () => {
		const svc = createRepoMappingService(makeStore());
		const result = await svc.list();
		expect(result).toHaveLength(0);
	});

	it("add calls store.set and returns the new mapping with id", async () => {
		const store = makeStore();
		const svc = createRepoMappingService(store);
		const draft = {
			repoUrl: "https://github.com/a/b",
			branch: "main",
			pathGlob: "**",
			areaPath: "P",
		};
		const result = await svc.add(draft);
		expect(result.id).toBeTruthy();
		expect(result.repoUrl).toBe(draft.repoUrl);
		expect(store.set).toHaveBeenCalledWith(
			"repo-mappings",
			expect.objectContaining({ repoUrl: draft.repoUrl })
		);
	});

	it("remove calls store.delete with the mapping id", async () => {
		const store = makeStore();
		const svc = createRepoMappingService(store);
		await svc.remove("m-1");
		expect(store.delete).toHaveBeenCalledWith("repo-mappings", "m-1");
	});

	it("sync returns stub result", async () => {
		const svc = createRepoMappingService(makeStore());
		const result = await svc.sync("m-1");
		expect(result).toEqual({ created: 0, updated: 0, deprecated: 0 });
	});
});
