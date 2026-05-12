import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
	type IProcessInstallService,
	type InstallProgressStep,
	ProcessInstallError,
	ProcessPermissionError,
	createProcessInstallService,
} from "./process-install.js";

const ORG_URL = "https://dev.azure.com/testorg";
const BASE = `${ORG_URL}/_apis/work/processes`;

const ALL_WIT_REFS = [
	"TestVault.TestCase",
	"TestVault.TestPlan",
	"TestVault.TestSet",
	"TestVault.Precondition",
	"TestVault.TestExecution",
	"TestVault.TestCaseVersion",
	"TestVault.AuditLog",
];

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeService(): IProcessInstallService {
	return createProcessInstallService({
		orgUrl: ORG_URL,
		getAuthHeader: () => Promise.resolve("Basic dGVzdA=="),
		timeoutMs: 500,
	});
}

// ─── detectInstallState ───────────────────────────────────────────────────────

describe("detectInstallState", () => {
	it("returns not-installed when no TestVault process exists", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({ value: [{ typeId: "sys-1", name: "Agile", description: "" }] })
			)
		);
		const state = await makeService().detectInstallState();
		expect(state.status).toBe("not-installed");
	});

	it("returns installed when all 7 WITs are present", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({
					value: [
						{
							typeId: "tv-guid",
							name: "TestVault - Agile",
							description: '{"testvault-schema":"1.0.0"}',
						},
					],
				})
			),
			http.get(`${BASE}/tv-guid/workItemTypes`, () =>
				HttpResponse.json({ value: ALL_WIT_REFS.map((ref) => ({ referenceName: ref })) })
			)
		);
		const state = await makeService().detectInstallState();
		expect(state.status).toBe("installed");
		if (state.status === "installed") {
			expect(state.processId).toBe("tv-guid");
			expect(state.processName).toBe("TestVault - Agile");
			expect(state.schemaVersion).toBe("1.0.0");
		}
	});

	it("returns partial when only some WITs are present", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({
					value: [
						{
							typeId: "tv-guid",
							name: "TestVault - Agile",
							description: '{"testvault-schema":"1.0.0"}',
						},
					],
				})
			),
			http.get(`${BASE}/tv-guid/workItemTypes`, () =>
				HttpResponse.json({
					value: [{ referenceName: "TestVault.TestCase" }, { referenceName: "TestVault.TestPlan" }],
				})
			)
		);
		const state = await makeService().detectInstallState();
		expect(state.status).toBe("partial");
		if (state.status === "partial") {
			expect(state.missingWitRefs).toHaveLength(5);
			expect(state.missingWitRefs).toContain("TestVault.TestSet");
		}
	});

	it("throws ProcessInstallError on non-403 API failure", async () => {
		server.use(http.get(BASE, () => new HttpResponse(null, { status: 500 })));
		await expect(makeService().detectInstallState()).rejects.toThrow(ProcessInstallError);
	});

	it("throws ProcessPermissionError on 403", async () => {
		server.use(http.get(BASE, () => new HttpResponse(null, { status: 403 })));
		await expect(makeService().detectInstallState()).rejects.toThrow(ProcessPermissionError);
	});
});

// ─── install ──────────────────────────────────────────────────────────────────

describe("install", () => {
	function setupInstallHandlers(_overrides?: Parameters<typeof http.post>[1]) {
		let witCount = 0;

		server.use(
			// Create process
			http.post(BASE, () =>
				HttpResponse.json({ typeId: "new-proc-guid", name: "TestVault - Agile" }, { status: 201 })
			),
			// Create picklists
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			// Create WITs
			http.post(`${BASE}/new-proc-guid/workItemTypes`, () => {
				witCount++;
				return HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 });
			}),
			// Add fields
			http.post(
				new RegExp(`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes\\/.+\\/fields`),
				() => HttpResponse.json({}, { status: 200 })
			),
			// Add states
			http.post(
				new RegExp(`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes\\/.+\\/states`),
				() => HttpResponse.json({}, { status: 201 })
			)
		);

		return { getWitCount: () => witCount };
	}

	it("returns processId and processName on success", async () => {
		setupInstallHandlers();
		const result = await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
		});
		expect(result.processId).toBe("new-proc-guid");
		expect(result.processName).toBe("TestVault - Agile");
	});

	it("creates exactly 7 WITs", async () => {
		const { getWitCount } = setupInstallHandlers();
		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });
		expect(getWitCount()).toBe(7);
	});

	it("throws ProcessPermissionError on 403 during process creation", async () => {
		server.use(http.post(BASE, () => new HttpResponse(null, { status: 403 })));
		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).rejects.toThrow(ProcessPermissionError);
	});

	it("throws ProcessInstallError on 500 during process creation", async () => {
		server.use(http.post(BASE, () => new HttpResponse(null, { status: 500 })));
		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).rejects.toThrow(ProcessInstallError);
	});

	it("calls onProgress at key phases", async () => {
		setupInstallHandlers();
		const steps: InstallProgressStep[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s),
		});
		expect(steps.some((s) => s.phase === "creating-process")).toBe(true);
		expect(steps.some((s) => s.phase === "creating-picklists")).toBe(true);
		expect(steps.some((s) => s.phase === "creating-wits")).toBe(true);
		expect(steps.at(-1)?.phase).toBe("done");
	});

	it("sends the correct baseProcess GUID when creating the process", async () => {
		// Use object wrapper — TypeScript cannot narrow object property mutations through async callbacks
		const cap: { body: Record<string, unknown> } = { body: {} };
		server.use(
			http.post(BASE, async ({ request }) => {
				cap.body = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ typeId: "new-proc-guid", name: "TestVault - Scrum" },
					{ status: 201 }
				);
			}),
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			http.post(
				new RegExp(`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes(.*)?`),
				() => HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 })
			),
			http.post(
				new RegExp(
					`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes\\/.+\\/(fields|states)`
				),
				() => HttpResponse.json({}, { status: 200 })
			)
		);
		await makeService().install({ processName: "TestVault - Scrum", baseProcess: "Scrum" });
		expect(cap.body.parentProcessTypeId).toBe("6b724908-ef14-45cf-84f8-768b5384da45");
	});

	it("embeds schema version in process description", async () => {
		const cap: { body: Record<string, unknown> } = { body: {} };
		server.use(
			http.post(BASE, async ({ request }) => {
				cap.body = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(
					{ typeId: "new-proc-guid", name: "TestVault - Agile" },
					{ status: 201 }
				);
			}),
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			http.post(
				new RegExp(`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes(.*)?`),
				() => HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 })
			),
			http.post(
				new RegExp(
					`${BASE.replace(/\//g, "\\/")}\\/new-proc-guid\\/workItemTypes\\/.+\\/(fields|states)`
				),
				() => HttpResponse.json({}, { status: 200 })
			)
		);
		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });
		const desc = JSON.parse(cap.body.description as string) as { "testvault-schema": string };
		expect(desc["testvault-schema"]).toMatch(/^\d+\.\d+\.\d+$/);
	});
});
