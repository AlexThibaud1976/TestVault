// ADO Work Items service -- searches for User Stories, Bugs and Requirements via WIQL.
// Uses POST _apis/wit/wiql then GET _apis/wit/workitems for field details.

export interface WorkItemResult {
	id: number;
	type: string;
	title: string;
	description: string;
	acceptanceCriteria?: string;
}

export interface IAdoWorkItemsService {
	search(query: string, types: string[]): Promise<WorkItemResult[]>;
}

const DEFAULT_TYPES = ["User Story", "Bug", "Requirement"];
const MAX_RESULTS = 50;

const FIELDS = [
	"System.Id",
	"System.Title",
	"System.WorkItemType",
	"System.Description",
	"Microsoft.VSTS.Common.AcceptanceCriteria",
].join(",");

interface WiqlResult {
	workItems: Array<{ id: number; url: string }>;
}

interface WitBatchResult {
	value: Array<{
		id: number;
		fields: Record<string, string | undefined>;
	}>;
}

export function createAdoWorkItemsService(
	baseUrl: string,
	project: string,
	tokenFactory: () => Promise<string>
): IAdoWorkItemsService {
	async function authHeaders() {
		const token = await tokenFactory();
		return {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	return {
		async search(query: string, types: string[] = DEFAULT_TYPES): Promise<WorkItemResult[]> {
			const headers = await authHeaders();

			const typeList = types.map((t) => `'${t}'`).join(", ");
			const titleFilter = query.trim()
				? `AND [System.Title] CONTAINS '${query.trim().replace(/'/g, "''")}'`
				: "";
			const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' AND [System.WorkItemType] IN (${typeList}) AND [System.State] <> 'Closed' ${titleFilter} ORDER BY [System.ChangedDate] DESC`;

			const wiqlUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/wit/wiql?$top=${MAX_RESULTS}&api-version=7.1`;
			const wiqlRes = await fetch(wiqlUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({ query: wiql }),
			});
			if (!wiqlRes.ok) {
				throw new Error(`[AdoWorkItemsService] WIQL HTTP ${wiqlRes.status}`);
			}

			const wiqlData = (await wiqlRes.json()) as WiqlResult;
			const ids = wiqlData.workItems.slice(0, MAX_RESULTS).map((w) => w.id);
			if (ids.length === 0) return [];

			const batchUrl = `${baseUrl}/_apis/wit/workitems?ids=${ids.join(",")}&fields=${FIELDS}&api-version=7.1`;
			const batchRes = await fetch(batchUrl, { headers });
			if (!batchRes.ok) {
				throw new Error(`[AdoWorkItemsService] batch fetch HTTP ${batchRes.status}`);
			}

			const batchData = (await batchRes.json()) as WitBatchResult;
			return batchData.value.map((item) => ({
				id: item.id,
				type: item.fields["System.WorkItemType"] ?? "",
				title: item.fields["System.Title"] ?? "",
				description: item.fields["System.Description"] ?? "",
				acceptanceCriteria: item.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] ?? undefined,
			}));
		},
	};
}
