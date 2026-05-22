// ADO Iterations service -- fetches iteration classification nodes from real ADO REST API.
// Uses GET _apis/wit/classificationNodes/Iterations?$depth=10 (no teamId required).
// Implements 1h in-memory cache per projectId.

export interface IterationNode {
	id: number;
	name: string;
	path: string;
	hasChildren: boolean;
}

export interface IAdoIterationsService {
	getIterations(projectId: string): Promise<IterationNode[]>;
}

const CACHE_TTL = 3600000; // 1 hour in ms

interface CacheEntry {
	data: IterationNode[];
	expiresAt: number;
}

interface RawClassificationNode {
	id: number;
	name: string;
	children?: RawClassificationNode[];
}

function flattenTree(node: RawClassificationNode, parentPath: string): IterationNode[] {
	const currentPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
	const result: IterationNode[] = [
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

export function createAdoIterationsService(
	baseUrl: string,
	project: string,
	tokenFactory: () => Promise<string>
): IAdoIterationsService {
	const cache = new Map<string, CacheEntry>();

	return {
		async getIterations(projectId: string): Promise<IterationNode[]> {
			const now = Date.now();
			const cached = cache.get(projectId);
			if (cached && cached.expiresAt > now) {
				return cached.data;
			}

			const url = `${baseUrl}/${encodeURIComponent(project)}/_apis/wit/classificationNodes/Iterations?$depth=10&api-version=7.1`;
			const token = await tokenFactory();
			const res = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});
			if (!res.ok) {
				throw new Error(`[AdoIterationsService] HTTP ${res.status} fetching iterations`);
			}
			const root = (await res.json()) as RawClassificationNode;
			const data = flattenTree(root, "");

			cache.set(projectId, { data, expiresAt: now + CACHE_TTL });
			return data;
		},
	};
}
