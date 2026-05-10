import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
	AdoForbiddenError,
	AdoNotFoundError,
	AdoRateLimitError,
	AdoServerError,
	AdoUnauthorizedError,
	type RawWorkItem,
	createAdoClient,
} from "./ado-client.js";

const BASE_URL = "https://dev.azure.com/testorg";
const PROJECT = "testproject";
const API_BASE = `${BASE_URL}/${PROJECT}/_apis/wit`;

const mockWorkItem: RawWorkItem = {
	id: 42,
	rev: 1,
	fields: {
		"System.Title": "My Test Case",
		"System.State": "Active",
		"TestVault.Priority": 3,
	},
	url: `${API_BASE}/workitems/42`,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = createAdoClient({
	baseUrl: BASE_URL,
	project: PROJECT,
	pat: "test-pat",
	timeoutMs: 500,
});

// ─── fetchWorkItem ────────────────────────────────────────────────────────────

describe("fetchWorkItem", () => {
	it("returns a RawWorkItem on success", async () => {
		server.use(http.get(`${API_BASE}/workitems/42`, () => HttpResponse.json(mockWorkItem)));
		const result = await client.fetchWorkItem(42);
		expect(result.id).toBe(42);
		expect(result.fields["System.Title"]).toBe("My Test Case");
		expect(result.rev).toBe(1);
	});

	it("throws AdoUnauthorizedError on 401", async () => {
		server.use(http.get(`${API_BASE}/workitems/1`, () => new HttpResponse(null, { status: 401 })));
		await expect(client.fetchWorkItem(1)).rejects.toThrow(AdoUnauthorizedError);
	});

	it("throws AdoForbiddenError on 403", async () => {
		server.use(http.get(`${API_BASE}/workitems/1`, () => new HttpResponse(null, { status: 403 })));
		await expect(client.fetchWorkItem(1)).rejects.toThrow(AdoForbiddenError);
	});

	it("throws AdoNotFoundError on 404", async () => {
		server.use(http.get(`${API_BASE}/workitems/99`, () => new HttpResponse(null, { status: 404 })));
		await expect(client.fetchWorkItem(99)).rejects.toThrow(AdoNotFoundError);
	});

	it("throws AdoRateLimitError on 429 and exposes retryAfterSeconds", async () => {
		server.use(
			http.get(
				`${API_BASE}/workitems/1`,
				() => new HttpResponse(null, { status: 429, headers: { "Retry-After": "60" } })
			)
		);
		const err = await client.fetchWorkItem(1).catch((e) => e);
		expect(err).toBeInstanceOf(AdoRateLimitError);
		expect((err as AdoRateLimitError).retryAfterSeconds).toBe(60);
	});

	it("throws AdoRateLimitError on 429 without Retry-After header", async () => {
		server.use(http.get(`${API_BASE}/workitems/1`, () => new HttpResponse(null, { status: 429 })));
		const err = await client.fetchWorkItem(1).catch((e) => e);
		expect(err).toBeInstanceOf(AdoRateLimitError);
		expect((err as AdoRateLimitError).retryAfterSeconds).toBeUndefined();
	});

	it("throws AdoServerError on 500", async () => {
		server.use(
			http.get(`${API_BASE}/workitems/1`, () => new HttpResponse("Internal error", { status: 500 }))
		);
		await expect(client.fetchWorkItem(1)).rejects.toThrow(AdoServerError);
	});

	it("throws AdoServerError on malformed JSON response", async () => {
		server.use(
			http.get(
				`${API_BASE}/workitems/1`,
				() =>
					new HttpResponse("<html>Server Error</html>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			)
		);
		await expect(client.fetchWorkItem(1)).rejects.toThrow(AdoServerError);
	});

	it("throws on timeout", async () => {
		server.use(
			http.get(`${API_BASE}/workitems/1`, async () => {
				await delay(2000);
				return HttpResponse.json(mockWorkItem);
			})
		);
		const shortClient = createAdoClient({
			baseUrl: BASE_URL,
			project: PROJECT,
			pat: "test-pat",
			timeoutMs: 50,
		});
		await expect(shortClient.fetchWorkItem(1)).rejects.toThrow();
	});

	it("exposes statusCode on all AdoClientErrors", async () => {
		server.use(http.get(`${API_BASE}/workitems/1`, () => new HttpResponse(null, { status: 404 })));
		const err = await client.fetchWorkItem(1).catch((e) => e);
		expect(err.statusCode).toBe(404);
	});
});

// ─── createWorkItem ───────────────────────────────────────────────────────────

describe("createWorkItem", () => {
	it("returns a RawWorkItem on success", async () => {
		server.use(
			http.post(`${API_BASE}/workitems/:type`, () =>
				HttpResponse.json({ ...mockWorkItem, id: 100 })
			)
		);
		const result = await client.createWorkItem("TestVault.TestCase", [
			{ op: "add", path: "/fields/System.Title", value: "My Test Case" },
		]);
		expect(result.id).toBe(100);
	});

	it("sends Content-Type application/json-patch+json", async () => {
		let capturedContentType: string | null = null;
		server.use(
			http.post(`${API_BASE}/workitems/:type`, ({ request }) => {
				capturedContentType = request.headers.get("content-type");
				return HttpResponse.json({ ...mockWorkItem, id: 101 });
			})
		);
		await client.createWorkItem("TestVault.TestCase", [
			{ op: "add", path: "/fields/System.Title", value: "x" },
		]);
		expect(capturedContentType).toContain("application/json-patch+json");
	});

	it("throws AdoForbiddenError on 403", async () => {
		server.use(
			http.post(`${API_BASE}/workitems/:type`, () => new HttpResponse(null, { status: 403 }))
		);
		await expect(
			client.createWorkItem("TestVault.TestCase", [
				{ op: "add", path: "/fields/System.Title", value: "x" },
			])
		).rejects.toThrow(AdoForbiddenError);
	});

	it("throws AdoServerError on malformed JSON response", async () => {
		server.use(
			http.post(
				`${API_BASE}/workitems/:type`,
				() =>
					new HttpResponse("not-json", {
						status: 200,
						headers: { "Content-Type": "application/json" },
					})
			)
		);
		await expect(
			client.createWorkItem("TestVault.TestCase", [
				{ op: "add", path: "/fields/System.Title", value: "x" },
			])
		).rejects.toThrow(AdoServerError);
	});
});

// ─── updateWorkItem ───────────────────────────────────────────────────────────

describe("updateWorkItem", () => {
	it("returns updated RawWorkItem on success", async () => {
		const updated = {
			...mockWorkItem,
			rev: 2,
			fields: { ...mockWorkItem.fields, "System.State": "Closed" },
		};
		server.use(http.patch(`${API_BASE}/workitems/42`, () => HttpResponse.json(updated)));
		const result = await client.updateWorkItem(42, [
			{ op: "replace", path: "/fields/System.State", value: "Closed" },
		]);
		expect(result.rev).toBe(2);
		expect(result.fields["System.State"]).toBe("Closed");
	});

	it("sends Content-Type application/json-patch+json", async () => {
		let capturedContentType: string | null = null;
		server.use(
			http.patch(`${API_BASE}/workitems/42`, ({ request }) => {
				capturedContentType = request.headers.get("content-type");
				return HttpResponse.json(mockWorkItem);
			})
		);
		await client.updateWorkItem(42, [
			{ op: "replace", path: "/fields/System.State", value: "Active" },
		]);
		expect(capturedContentType).toContain("application/json-patch+json");
	});

	it("throws AdoNotFoundError on 404", async () => {
		server.use(
			http.patch(`${API_BASE}/workitems/99`, () => new HttpResponse(null, { status: 404 }))
		);
		await expect(
			client.updateWorkItem(99, [{ op: "replace", path: "/fields/System.State", value: "Closed" }])
		).rejects.toThrow(AdoNotFoundError);
	});

	it("throws AdoForbiddenError on 403", async () => {
		server.use(
			http.patch(`${API_BASE}/workitems/42`, () => new HttpResponse(null, { status: 403 }))
		);
		await expect(
			client.updateWorkItem(42, [{ op: "replace", path: "/fields/System.State", value: "Closed" }])
		).rejects.toThrow(AdoForbiddenError);
	});
});

// ─── queryByWiql ─────────────────────────────────────────────────────────────

describe("queryByWiql", () => {
	it("returns array of work item IDs on success", async () => {
		server.use(
			http.post(`${API_BASE}/wiql`, () =>
				HttpResponse.json({ workItems: [{ id: 1 }, { id: 2 }, { id: 3 }] })
			)
		);
		const ids = await client.queryByWiql("SELECT [System.Id] FROM WorkItems");
		expect(ids).toEqual([1, 2, 3]);
	});

	it("returns empty array when no results", async () => {
		server.use(http.post(`${API_BASE}/wiql`, () => HttpResponse.json({ workItems: [] })));
		const ids = await client.queryByWiql("SELECT [System.Id] FROM WorkItems WHERE 1=0");
		expect(ids).toEqual([]);
	});

	it("throws AdoServerError on malformed JSON", async () => {
		server.use(http.post(`${API_BASE}/wiql`, () => new HttpResponse("not-json", { status: 200 })));
		await expect(client.queryByWiql("SELECT [System.Id] FROM WorkItems")).rejects.toThrow(
			AdoServerError
		);
	});

	it("throws AdoForbiddenError on 403", async () => {
		server.use(http.post(`${API_BASE}/wiql`, () => new HttpResponse(null, { status: 403 })));
		await expect(client.queryByWiql("SELECT [System.Id] FROM WorkItems")).rejects.toThrow(
			AdoForbiddenError
		);
	});
});

// ─── deleteWorkItem ───────────────────────────────────────────────────────────

describe("deleteWorkItem", () => {
	it("resolves void on 200", async () => {
		server.use(
			http.delete(`${API_BASE}/workitems/42`, () => new HttpResponse(null, { status: 200 }))
		);
		await expect(client.deleteWorkItem(42)).resolves.toBeUndefined();
	});

	it("resolves void on 204", async () => {
		server.use(
			http.delete(`${API_BASE}/workitems/42`, () => new HttpResponse(null, { status: 204 }))
		);
		await expect(client.deleteWorkItem(42)).resolves.toBeUndefined();
	});

	it("throws AdoNotFoundError on 404", async () => {
		server.use(
			http.delete(`${API_BASE}/workitems/99`, () => new HttpResponse(null, { status: 404 }))
		);
		await expect(client.deleteWorkItem(99)).rejects.toThrow(AdoNotFoundError);
	});

	it("throws AdoUnauthorizedError on 401", async () => {
		server.use(
			http.delete(`${API_BASE}/workitems/42`, () => new HttpResponse(null, { status: 401 }))
		);
		await expect(client.deleteWorkItem(42)).rejects.toThrow(AdoUnauthorizedError);
	});
});

// ─── tokenFactory ─────────────────────────────────────────────────────────────

describe("tokenFactory (dynamic Bearer auth)", () => {
	it("uses Bearer token from factory per request, not frozen at creation", async () => {
		let call = 0;
		const tokenFactory = vi.fn(async () => `dyn-token-${++call}`);

		const dynamicClient = createAdoClient({
			baseUrl: BASE_URL,
			project: PROJECT,
			tokenFactory,
			timeoutMs: 500,
		});

		const headers: string[] = [];
		server.use(
			http.get(`${API_BASE}/workitems/1`, ({ request }) => {
				headers.push(request.headers.get("Authorization") ?? "");
				return HttpResponse.json({ ...mockWorkItem, id: 1 });
			})
		);

		await dynamicClient.fetchWorkItem(1);
		await dynamicClient.fetchWorkItem(1);

		expect(headers[0]).toBe("Bearer dyn-token-1");
		expect(headers[1]).toBe("Bearer dyn-token-2");
		expect(tokenFactory).toHaveBeenCalledTimes(2);
	});

	it("falls back to Basic auth when only pat is given (backwards compat)", async () => {
		let capturedAuth = "";
		server.use(
			http.get(`${API_BASE}/workitems/1`, ({ request }) => {
				capturedAuth = request.headers.get("Authorization") ?? "";
				return HttpResponse.json({ ...mockWorkItem, id: 1 });
			})
		);
		await client.fetchWorkItem(1);
		expect(capturedAuth).toBe(`Basic ${btoa(":test-pat")}`);
	});
});
