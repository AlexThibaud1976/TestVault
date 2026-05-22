// ADO Area Path service -- fetches classification nodes from real ADO REST API.
// Uses GET _apis/wit/classificationNodes/Areas?$depth=5 (no teamId required).
// Implements 1h in-memory cache per projectId.

export interface AreaPathNode {
	id: number;
	name: string;
	path: string;
	hasChildren: boolean;
}

export interface IAdoClassificationService {
	getAreaPaths(projectId: string): Promise<AreaPathNode[]>;
}

const CACHE_TTL = 3600000; // 1 hour in ms

interface CacheEntry {
	data: AreaPathNode[];
	expiresAt: number;
}

interface RawClassificationNode {
	id: number;
	name: string;
	children?: RawClassificationNode[];
}

function flattenTree(node: RawClassificationNode, parentPath: string): AreaPathNode[] {
	const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
	const result: AreaPathNode[] = [
		{
			id: node.id,
			name: node.name,
			path: currentPath,
			hasChildren: (node.children?.length ?? 0) > 0,
		},
	];
	if (node.children) {
		for (const child of node.children) {
			result.push(...flattenTree(child, currentPath));
		}
	}
	return result;
}

export function createAdoClassificationService(
	baseUrl: string,
	project: string,
	tokenFactory: () => Promise<string>
): IAdoClassificationService {
	const cache = new Map<string, CacheEntry>();

	return {
		async getAreaPaths(projectId: string): Promise<AreaPathNode[]> {
			const now = Date.now();
			const cached = cache.get(projectId);
			if (cached && cached.expiresAt > now) {
				return cached.data;
			}

			const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/wit/classificationNodes/Areas?$depth=5&api-version=7.1`;
			const token = await tokenFactory();
			const res = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});
			if (!res.ok) {
				throw new Error(`[AdoClassificationService] HTTP ${res.status} fetching area paths`);
			}
			const root = (await res.json()) as RawClassificationNode;
			const data = flattenTree(root, "");

			cache.set(projectId, { data, expiresAt: now + CACHE_TTL });
			return data;
		},
	};
}
