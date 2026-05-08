const API_VERSION = "7.1";
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Error types ──────────────────────────────────────────────────────────────

export class AdoClientError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string
	) {
		super(message);
		this.name = "AdoClientError";
	}
}

export class AdoUnauthorizedError extends AdoClientError {
	constructor(message = "ADO request unauthorized — check PAT or OAuth token") {
		super(401, message);
		this.name = "AdoUnauthorizedError";
	}
}

export class AdoForbiddenError extends AdoClientError {
	constructor(message = "ADO request forbidden — insufficient permissions") {
		super(403, message);
		this.name = "AdoForbiddenError";
	}
}

export class AdoNotFoundError extends AdoClientError {
	constructor(message = "ADO resource not found") {
		super(404, message);
		this.name = "AdoNotFoundError";
	}
}

export class AdoRateLimitError extends AdoClientError {
	constructor(
		public readonly retryAfterSeconds?: number,
		message = "ADO rate limit exceeded"
	) {
		super(429, message);
		this.name = "AdoRateLimitError";
	}
}

export class AdoServerError extends AdoClientError {
	constructor(message = "ADO server error") {
		super(500, message);
		this.name = "AdoServerError";
	}
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface WorkItemRelation {
	rel: string;
	url: string;
	attributes?: Record<string, unknown>;
}

export interface RawWorkItem {
	id: number;
	rev: number;
	fields: Record<string, unknown>;
	url: string;
	relations?: WorkItemRelation[];
}

export interface WorkItemFieldPatch {
	op: "add" | "replace" | "remove";
	path: string;
	value?: unknown;
}

export interface IAdoClient {
	fetchWorkItem(id: number): Promise<RawWorkItem>;
	createWorkItem(type: string, fields: WorkItemFieldPatch[]): Promise<RawWorkItem>;
	updateWorkItem(id: number, fields: WorkItemFieldPatch[]): Promise<RawWorkItem>;
	deleteWorkItem(id: number): Promise<void>;
	queryByWiql(wiql: string): Promise<number[]>;
	uploadAttachment(
		filename: string,
		content: Uint8Array,
		contentType: string
	): Promise<{ id: string; url: string }>;
}

export interface AdoClientConfig {
	/** e.g. "https://dev.azure.com/myorg" (cloud) or "https://server/collection" (server) */
	baseUrl: string;
	project: string;
	pat: string;
	timeoutMs?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAuthHeader(pat: string): string {
	return `Basic ${btoa(`:${pat}`)}`;
}

async function throwForStatus(response: Response): Promise<void> {
	if (response.ok) return;

	const body = await response.text().catch(() => "");

	switch (response.status) {
		case 401:
			throw new AdoUnauthorizedError(body || undefined);
		case 403:
			throw new AdoForbiddenError(body || undefined);
		case 404:
			throw new AdoNotFoundError(body || undefined);
		case 429: {
			const retryAfter = response.headers.get("Retry-After");
			throw new AdoRateLimitError(retryAfter !== null ? Number(retryAfter) : undefined);
		}
		default:
			throw new AdoServerError(body || undefined);
	}
}

async function parseJsonBody(response: Response): Promise<RawWorkItem> {
	const text = await response.text();
	try {
		return JSON.parse(text) as RawWorkItem;
	} catch {
		throw new AdoServerError(`Invalid JSON response: ${text.slice(0, 100)}`);
	}
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAdoClient(config: AdoClientConfig): IAdoClient {
	const { baseUrl, project, pat, timeoutMs = DEFAULT_TIMEOUT_MS } = config;
	const baseApiUrl = `${baseUrl}/${encodeURIComponent(project)}/_apis/wit`;
	const defaultHeaders: Record<string, string> = {
		Authorization: buildAuthHeader(pat),
		Accept: "application/json",
	};

	async function doFetch(url: string, init?: RequestInit): Promise<Response> {
		const signal = AbortSignal.timeout(timeoutMs);
		return fetch(url, {
			...init,
			signal,
			headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
		});
	}

	return {
		async fetchWorkItem(id) {
			const res = await doFetch(
				`${baseApiUrl}/workitems/${id}?$expand=all&api-version=${API_VERSION}`
			);
			await throwForStatus(res);
			return parseJsonBody(res);
		},

		async createWorkItem(type, fields) {
			const res = await doFetch(
				`${baseApiUrl}/workitems/${encodeURIComponent(`$${type}`)}?api-version=${API_VERSION}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json-patch+json" },
					body: JSON.stringify(fields),
				}
			);
			await throwForStatus(res);
			return parseJsonBody(res);
		},

		async updateWorkItem(id, fields) {
			const res = await doFetch(`${baseApiUrl}/workitems/${id}?api-version=${API_VERSION}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json-patch+json" },
				body: JSON.stringify(fields),
			});
			await throwForStatus(res);
			return parseJsonBody(res);
		},

		async deleteWorkItem(id) {
			const res = await doFetch(`${baseApiUrl}/workitems/${id}?api-version=${API_VERSION}`, {
				method: "DELETE",
			});
			await throwForStatus(res);
		},

		async queryByWiql(wiql) {
			const res = await doFetch(`${baseApiUrl}/wiql?api-version=${API_VERSION}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query: wiql }),
			});
			await throwForStatus(res);
			const text = await res.text();
			try {
				const data = JSON.parse(text) as { workItems: Array<{ id: number }> };
				return data.workItems.map((wi) => wi.id);
			} catch {
				throw new AdoServerError(`Invalid JSON response: ${text.slice(0, 100)}`);
			}
		},

		async uploadAttachment(filename, content, _contentType) {
			const res = await doFetch(
				`${baseApiUrl}/attachments?fileName=${encodeURIComponent(filename)}&api-version=${API_VERSION}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/octet-stream" },
					body: content,
				}
			);
			await throwForStatus(res);
			const text = await res.text();
			try {
				return JSON.parse(text) as { id: string; url: string };
			} catch {
				throw new AdoServerError(`Invalid JSON response: ${text.slice(0, 100)}`);
			}
		},
	};
}
