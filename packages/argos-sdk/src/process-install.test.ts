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
import { schemaToAdoFieldName, schemaToAdoFieldRefName } from "./wit-refname-matcher.js";

const ORG_URL = "https://dev.azure.com/testorg";
const BASE = `${ORG_URL}/_apis/work/processes`;
const ORG_FIELDS_URL = `${ORG_URL}/_apis/wit/fields`;

// ADO generates refNames as {ProcessName}.TestVault{WitName} — use realistic mocks
const ALL_WIT_REFS = [
	"MockProcess.TestVaultTestCase",
	"MockProcess.TestVaultTestPlan",
	"MockProcess.TestVaultTestSet",
	"MockProcess.TestVaultPrecondition",
	"MockProcess.TestVaultTestExecution",
	"MockProcess.TestVaultTestCaseVersion",
	"MockProcess.TestVaultAuditLog",
];

// Default org-level field handlers — overridden per test when needed.
// Sprint 2.13: pre-flight list GET returns empty (all fields to create by default).
// Sprint 2.12: per-field POST returns 201 (created).
// Sprint 2.14: GET states returns empty by default (fresh WIT has no custom states yet).
const server = setupServer(
	http.get(ORG_FIELDS_URL, () => HttpResponse.json({ value: [] })),
	http.get(`${ORG_FIELDS_URL}/:refName`, () => new HttpResponse(null, { status: 404 })),
	http.post(ORG_FIELDS_URL, () =>
		HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 })
	),
	http.get(new RegExp(`${BASE.replace(/\//g, "\\/")}\\/.+\\/workItemTypes\\/.+\\/states`), () =>
		HttpResponse.json({ value: [] })
	)
);

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

	it("returns installed when all 7 WITs are present and version is current", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({
					value: [
						{
							typeId: "tv-guid",
							name: "TestVault - Agile",
							description: '{"testvault-schema":"1.1.0"}',
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
			expect(state.schemaVersion).toBe("1.1.0");
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
					value: [
						{ referenceName: "MockProcess.TestVaultTestCase" },
						{ referenceName: "MockProcess.TestVaultTestPlan" },
					],
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

	// Runner 0.6.0 B3 -- needs-upgrade tests
	it("returns needs-upgrade when installed version is older than current schema", async () => {
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
		expect(state.status).toBe("needs-upgrade");
		if (state.status === "needs-upgrade") {
			expect(state.processId).toBe("tv-guid");
			expect(state.processName).toBe("TestVault - Agile");
			expect(state.schemaVersion).toBe("1.0.0");
			expect(state.expectedVersion).toBe("1.1.0");
		}
	});

	it("returns installed (not needs-upgrade) when version equals current schema", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({
					value: [
						{
							typeId: "tv-guid",
							name: "TestVault - Agile",
							description: '{"testvault-schema":"1.1.0"}',
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
	});

	it("returns installed (not needs-upgrade) when installed version is ahead of current schema", async () => {
		server.use(
			http.get(BASE, () =>
				HttpResponse.json({
					value: [
						{
							typeId: "tv-guid",
							name: "TestVault - Agile",
							description: '{"testvault-schema":"2.0.0"}',
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
			// GET existing picklists (Step 2 init — empty on fresh install)
			http.get(`${ORG_URL}/_apis/work/processes/lists`, () => HttpResponse.json({ value: [] })),
			// Create picklists
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			// GET existing WITs in new process (Step 3 init — empty on fresh install)
			http.get(`${BASE}/new-proc-guid/workItemTypes`, () => HttpResponse.json({ value: [] })),
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
			http.get(`${ORG_URL}/_apis/work/processes/lists`, () => HttpResponse.json({ value: [] })),
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			http.get(`${BASE}/new-proc-guid/workItemTypes`, () => HttpResponse.json({ value: [] })),
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
			http.get(`${ORG_URL}/_apis/work/processes/lists`, () => HttpResponse.json({ value: [] })),
			http.post(`${ORG_URL}/_apis/work/processes/lists`, () =>
				HttpResponse.json({ id: "pl-guid" }, { status: 201 })
			),
			http.get(`${BASE}/new-proc-guid/workItemTypes`, () => HttpResponse.json({ value: [] })),
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

// ─── Sprint 2.8 idempotency ───────────────────────────────────────────────────

describe("Sprint 2.8 idempotency", () => {
	const PROC = "new-proc-guid";
	const LISTS_URL = `${ORG_URL}/_apis/work/processes/lists`;
	const fieldsRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/fields`
	);
	const statesRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/states`
	);

	describe("picklists", () => {
		it("reuses existing picklist by name (no POST for matched name)", async () => {
			let picklistPostCount = 0;
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () =>
					HttpResponse.json({
						value: [{ id: "list-existing-priority", name: "TestVault-Priority" }],
					})
				),
				http.post(LISTS_URL, () => {
					picklistPostCount++;
					return HttpResponse.json({ id: `pl-${picklistPostCount}` }, { status: 201 });
				}),
				http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
				http.post(`${BASE}/${PROC}/workItemTypes`, () =>
					HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 })
				),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			const steps: string[] = [];
			await makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			});

			expect(steps.some((m) => m.includes('Reusing existing picklist "TestVault-Priority"'))).toBe(
				true
			);
			expect(steps.some((m) => m.includes('Creating picklist "TestVault-Priority"'))).toBe(false);
		});

		it("creates new picklist if name not in existing list", async () => {
			let picklistPostCount = 0;
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
				http.post(LISTS_URL, () => {
					picklistPostCount++;
					return HttpResponse.json({ id: `pl-${picklistPostCount}` }, { status: 201 });
				}),
				http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
				http.post(`${BASE}/${PROC}/workItemTypes`, () =>
					HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 })
				),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			const steps: string[] = [];
			await makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			});

			expect(picklistPostCount).toBeGreaterThan(0);
			expect(steps.some((m) => m.startsWith('Creating picklist "TestVault-'))).toBe(true);
			expect(steps.some((m) => m.startsWith("Reusing"))).toBe(false);
		});

		it("mixes reuse and create in same install", async () => {
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () =>
					HttpResponse.json({
						value: [{ id: "list-existing-priority", name: "TestVault-Priority" }],
					})
				),
				http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-new" }, { status: 201 })),
				http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
				http.post(`${BASE}/${PROC}/workItemTypes`, () =>
					HttpResponse.json({ referenceName: "TestVault.TestCase" }, { status: 201 })
				),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			const steps: string[] = [];
			await makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			});

			expect(steps.some((m) => m.includes("Reusing"))).toBe(true);
			expect(steps.some((m) => m.startsWith('Creating picklist "'))).toBe(true);
		});
	});

	describe("wits", () => {
		it("skips WIT if already exists in process (via ADO pattern match)", async () => {
			let witPostCount = 0;
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
				http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
				// ADO-format refName returned by GET /workItemTypes
				http.get(`${BASE}/${PROC}/workItemTypes`, () =>
					HttpResponse.json({ value: [{ referenceName: "SomeProcess.TestVaultTestCase" }] })
				),
				http.post(`${BASE}/${PROC}/workItemTypes`, () => {
					witPostCount++;
					return HttpResponse.json(
						{ referenceName: "SomeProcess.TestVaultTestPlan" },
						{ status: 201 }
					);
				}),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			const steps: string[] = [];
			await makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			});

			// TestCase skipped (pattern match) -> only 6 WIT POSTs
			expect(witPostCount).toBe(6);
			expect(
				steps.some(
					(m) =>
						m.includes("Skipping") && m.includes("already exists as SomeProcess.TestVaultTestCase")
				)
			).toBe(true);
		});

		it("creates all WITs if none exist in process", async () => {
			let witPostCount = 0;
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
				http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
				http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
				http.post(`${BASE}/${PROC}/workItemTypes`, () => {
					witPostCount++;
					return HttpResponse.json(
						{ referenceName: "SomeProcess.TestVaultTestCase" },
						{ status: 201 }
					);
				}),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });
			expect(witPostCount).toBe(7);
		});

		it("mixes skip and create in same install", async () => {
			let witPostCount = 0;
			server.use(
				http.post(BASE, () =>
					HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
				),
				http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
				http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
				http.get(`${BASE}/${PROC}/workItemTypes`, () =>
					HttpResponse.json({
						value: [
							// ADO-format refNames
							{ referenceName: "SomeProcess.TestVaultTestCase" },
							{ referenceName: "SomeProcess.TestVaultTestPlan" },
							{ referenceName: "System.Epic" }, // non-TestVault, filtered out
						],
					})
				),
				http.post(`${BASE}/${PROC}/workItemTypes`, () => {
					witPostCount++;
					return HttpResponse.json(
						{ referenceName: "SomeProcess.TestVaultTestSet" },
						{ status: 201 }
					);
				}),
				http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
				http.post(statesRegex, () => HttpResponse.json({}, { status: 200 }))
			);

			const steps: string[] = [];
			await makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			});

			// 2 TestVault WITs skipped via pattern match, 5 created; System.Epic ignored
			expect(witPostCount).toBe(5);
			expect(
				steps.filter((m) => m.includes("Skipping") && m.includes("already exists as"))
			).toHaveLength(2);
		});
	});
});

// ─── Sprint 2.12 field 2-step workflow (updated for Sprint 2.13 pre-flight) ──

describe("Sprint 2.12 field 2-step workflow", () => {
	const PROC = "new-proc-guid";
	const LISTS_URL = `${ORG_URL}/_apis/work/processes/lists`;
	const fieldsRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/fields`
	);
	const statesRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/states`
	);

	function setupBase() {
		server.use(
			http.post(BASE, () =>
				HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
			),
			http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
			http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
			http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
			http.post(`${BASE}/${PROC}/workItemTypes`, () =>
				HttpResponse.json({ referenceName: `${PROC}.TestVaultTestCase` }, { status: 201 })
			),
			http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
			http.post(statesRegex, () => HttpResponse.json({}, { status: 201 }))
		);
	}

	it("creates fields when pre-flight finds none in org", async () => {
		let orgPostCount = 0;

		// Default: list GET returns empty (all fields to create)
		server.use(
			http.post(ORG_FIELDS_URL, () => {
				orgPostCount++;
				return HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 });
			})
		);
		setupBase();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		// Pre-flight returned empty -> all fields classified as "create"
		expect(orgPostCount).toBeGreaterThan(0);
		expect(steps.some((m) => m.includes("[CREATE] org-level field Custom."))).toBe(true);
	});

	it("reuses field when pre-flight finds it in org by refName", async () => {
		// Pre-flight returns one specific field (Priority)
		const priorityRefName = schemaToAdoFieldRefName("TestVault.Priority");
		const priorityName = schemaToAdoFieldName("Priority");
		server.use(
			http.get(ORG_FIELDS_URL, () =>
				HttpResponse.json({
					value: [{ referenceName: priorityRefName, name: priorityName, type: "integer" }],
				})
			)
		);
		setupBase();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		// Priority field should be reused (no POST for it), others still created
		expect(
			steps.some((m) => m.includes("[REUSE] org-level field") && m.includes(priorityRefName))
		).toBe(true);
	});

	it("treats 409 from org-level create as success (attach still proceeds)", async () => {
		let attachCount = 0;

		// setupBase first (lower priority), then overrides prepend on top (higher priority)
		setupBase();
		server.use(
			http.post(ORG_FIELDS_URL, () => new HttpResponse(null, { status: 409 })),
			http.post(fieldsRegex, () => {
				attachCount++;
				return HttpResponse.json({}, { status: 200 });
			})
		);

		// Should not throw; attach proceeds normally
		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).resolves.toBeDefined();

		expect(attachCount).toBeGreaterThan(0);
	});

	it("logs [CREATE]/[REUSE]/[ATTACH] structured messages per field", async () => {
		setupBase();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		expect(steps.some((m) => m.includes("[CREATE] org-level field Custom."))).toBe(true);
		expect(steps.some((m) => m.startsWith("  [ATTACH]"))).toBe(true);
	});
});

// ─── Sprint 2.13 robust field creation (pre-flight + translated names) ────────

describe("Sprint 2.13 robust field creation", () => {
	const PROC = "new-proc-guid";
	const LISTS_URL = `${ORG_URL}/_apis/work/processes/lists`;
	const fieldsRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/fields`
	);
	const statesRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/states`
	);

	function setupBase2() {
		server.use(
			http.post(BASE, () =>
				HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
			),
			http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
			http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
			http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
			http.post(`${BASE}/${PROC}/workItemTypes`, () =>
				HttpResponse.json({ referenceName: `${PROC}.TestVaultTestCase` }, { status: 201 })
			),
			http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 })),
			http.post(statesRegex, () => HttpResponse.json({}, { status: 201 }))
		);
	}

	it("creates field with translated display name (TestVault prefix)", async () => {
		const bodies: Array<Record<string, unknown>> = [];
		server.use(
			http.post(ORG_FIELDS_URL, async ({ request }) => {
				bodies.push((await request.json()) as Record<string, unknown>);
				return HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 });
			})
		);
		setupBase2();

		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });

		// All org-level create bodies should have names starting with "TestVault "
		expect(bodies.length).toBeGreaterThan(0);
		expect(bodies.every((b) => typeof b.name === "string" && b.name.startsWith("TestVault "))).toBe(
			true
		);
	});

	it("pre-flight classifies field as reuse when refName exists with compatible type", async () => {
		const priorityRef = schemaToAdoFieldRefName("TestVault.Priority");
		const priorityName = schemaToAdoFieldName("Priority");

		server.use(
			http.get(ORG_FIELDS_URL, () =>
				HttpResponse.json({
					value: [{ referenceName: priorityRef, name: priorityName, type: "integer" }],
				})
			)
		);
		setupBase2();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		// Priority field should be reused, not created
		expect(steps.some((m) => m.includes("[REUSE]") && m.includes(priorityRef))).toBe(true);
	});

	it("pre-flight fails-fast when name conflict detected (different refName)", async () => {
		const priorityRef = schemaToAdoFieldRefName("TestVault.Priority");
		const priorityName = schemaToAdoFieldName("Priority");

		server.use(
			http.get(ORG_FIELDS_URL, () =>
				HttpResponse.json({
					value: [
						{
							referenceName: "Microsoft.VSTS.Common.Priority",
							name: priorityName,
							type: "integer",
						},
					],
				})
			)
		);
		setupBase2();

		// Pre-flight detects name "TestVault Priority" used by Microsoft field -> CONFLICT
		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).rejects.toThrow(ProcessInstallError);

		void priorityRef; // referenced for type safety
	});

	it("pre-flight fails-fast when type mismatch detected on reuse", async () => {
		const priorityRef = schemaToAdoFieldRefName("TestVault.Priority");
		const priorityName = schemaToAdoFieldName("Priority");

		server.use(
			http.get(ORG_FIELDS_URL, () =>
				HttpResponse.json({
					value: [
						// Same refName but wrong type (string instead of integer for picklistInteger)
						{ referenceName: priorityRef, name: priorityName, type: "string" },
					],
				})
			)
		);
		setupBase2();

		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).rejects.toThrow(ProcessInstallError);
	});

	it("treats 409 on attach as idempotent success", async () => {
		setupBase2();
		server.use(http.post(fieldsRegex, () => new HttpResponse(null, { status: 409 })));

		// 409 on attach = field already attached, should not throw
		await expect(
			makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" })
		).resolves.toBeDefined();
	});

	it("emits [VALIDATE] pre-flight log before Step 3", async () => {
		setupBase2();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		expect(steps.some((m) => m.includes("[VALIDATE]") && m.includes("Pre-flight"))).toBe(true);
	});
});

// ─── Sprint 2.14 robust state creation ───────────────────────────────────────

describe("Sprint 2.14 -- robust state creation", () => {
	const PROC = "new-proc-guid";
	const LISTS_URL = `${ORG_URL}/_apis/work/processes/lists`;
	const fieldsRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/fields`
	);
	const statesUrl = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${PROC}\\/workItemTypes\\/.+\\/states`
	);

	function setupBase3() {
		server.use(
			http.post(BASE, () =>
				HttpResponse.json({ typeId: PROC, name: "TestVault - Agile" }, { status: 201 })
			),
			http.get(LISTS_URL, () => HttpResponse.json({ value: [] })),
			http.post(LISTS_URL, () => HttpResponse.json({ id: "pl-guid" }, { status: 201 })),
			http.get(`${BASE}/${PROC}/workItemTypes`, () => HttpResponse.json({ value: [] })),
			http.post(`${BASE}/${PROC}/workItemTypes`, () =>
				HttpResponse.json({ referenceName: `${PROC}.TestVaultTestCase` }, { status: 201 })
			),
			http.post(fieldsRegex, () => HttpResponse.json({}, { status: 200 }))
		);
	}

	it("creates state with translated name 'TestVault Active'", async () => {
		const statePostBodies: Array<Record<string, unknown>> = [];
		server.use(
			http.get(statesUrl, () =>
				HttpResponse.json({
					value: [
						{ id: "s1", name: "New", color: "b2b2b2", stateCategory: "Proposed" },
						{ id: "s2", name: "Active", color: "007acc", stateCategory: "InProgress" },
					],
				})
			),
			http.post(statesUrl, async ({ request }) => {
				statePostBodies.push((await request.json()) as Record<string, unknown>);
				return HttpResponse.json({}, { status: 201 });
			})
		);
		setupBase3();

		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });

		// Schema state "Active" should be translated to "TestVault Active"
		expect(statePostBodies.some((b) => b.name === "TestVault Active")).toBe(true);
		// Raw "Active" should never be POSTed
		expect(statePostBodies.every((b) => b.name !== "Active")).toBe(true);
	});

	it("skips state creation if translated name already exists in WIT", async () => {
		let statePostCount = 0;
		// Pre-populate ALL translated state names that appear across any WIT in the schema
		server.use(
			http.get(statesUrl, () =>
				HttpResponse.json({
					value: [
						{ id: "s1", name: "TestVault Active", color: "28a745", stateCategory: "InProgress" },
						{ id: "s2", name: "TestVault Closed", color: "393939", stateCategory: "Completed" },
						{ id: "s3", name: "TestVault Completed", color: "393939", stateCategory: "Completed" },
						{ id: "s4", name: "TestVault Deprecated", color: "6c757d", stateCategory: "Completed" },
						{ id: "s5", name: "TestVault Design", color: "b2b2b2", stateCategory: "Proposed" },
						{ id: "s6", name: "TestVault Draft", color: "b2b2b2", stateCategory: "Proposed" },
						{ id: "s7", name: "TestVault Locked", color: "007acc", stateCategory: "InProgress" },
						{ id: "s8", name: "TestVault Ready", color: "007acc", stateCategory: "Proposed" },
						{
							id: "s9",
							name: "TestVault InProgress",
							color: "007acc",
							stateCategory: "InProgress",
						},
						{ id: "s10", name: "TestVault Aborted", color: "a4262c", stateCategory: "Removed" },
					],
				})
			),
			http.post(statesUrl, () => {
				statePostCount++;
				return HttpResponse.json({}, { status: 201 });
			})
		);
		setupBase3();

		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });

		// All states already exist -> no POST should be made
		expect(statePostCount).toBe(0);
	});

	it("emits [VALIDATE] with count of default states", async () => {
		server.use(
			http.get(statesUrl, () =>
				HttpResponse.json({
					value: [
						{ id: "s1", name: "New", color: "b2b2b2", stateCategory: "Proposed" },
						{ id: "s2", name: "Active", color: "007acc", stateCategory: "InProgress" },
						{ id: "s3", name: "Resolved", color: "ff9d00", stateCategory: "Resolved" },
						{ id: "s4", name: "Closed", color: "393939", stateCategory: "Completed" },
						{ id: "s5", name: "Removed", color: "d0d0d0", stateCategory: "Completed" },
					],
				})
			),
			http.post(statesUrl, () => HttpResponse.json({}, { status: 201 }))
		);
		setupBase3();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		expect(steps.some((m) => m.includes("[VALIDATE]") && m.includes("5 default states"))).toBe(
			true
		);
	});

	it("treats 409 on state POST as idempotent success", async () => {
		server.use(
			http.get(statesUrl, () => HttpResponse.json({ value: [] })),
			http.post(statesUrl, () => new HttpResponse(null, { status: 409 }))
		);
		setupBase3();

		const steps: string[] = [];
		// Should NOT throw
		await expect(
			makeService().install({
				processName: "TestVault - Agile",
				baseProcess: "Agile",
				onProgress: (s) => steps.push(s.message),
			})
		).resolves.toBeDefined();
		expect(steps.some((m) => m.includes("[STATE-SKIP]") && m.includes("409 conflict"))).toBe(true);
	});

	it("emits [STATE-CREATE] and [STATE-SKIP] structured logs", async () => {
		server.use(
			http.get(statesUrl, () =>
				HttpResponse.json({
					value: [
						{ id: "s1", name: "TestVault Design", color: "b2b2b2", stateCategory: "Proposed" },
					],
				})
			),
			http.post(statesUrl, () => HttpResponse.json({}, { status: 201 }))
		);
		setupBase3();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		// "Design" already exists as "TestVault Design" -> SKIP
		expect(steps.some((m) => m.includes("[STATE-SKIP]") && m.includes("TestVault Design"))).toBe(
			true
		);
		// Other states (Ready, Active, Closed, Deprecated) -> CREATE
		expect(steps.some((m) => m.includes("[STATE-CREATE]"))).toBe(true);
	});
});

// ─── upgradeSchema (Runner 0.6.0 B3) ──────────────────────────────────────────

describe("upgradeSchema", () => {
	const UPGRADE_PROC = "upgrade-proc-guid";
	const upgradeWitsUrl = `${BASE}/${UPGRADE_PROC}/workItemTypes`;
	const upgradeWitFieldsRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${UPGRADE_PROC}\\/workItemTypes\\/.+\\/fields`
	);
	const upgradeStatesRegex = new RegExp(
		`${BASE.replace(/\//g, "\\/")}\\/${UPGRADE_PROC}\\/workItemTypes\\/.+\\/states`
	);
	const upgradeProcUrl = `${BASE.replace(/\//g, "\\/")}\\/${UPGRADE_PROC}`;

	function setupUpgradeBase(existingWitFields: string[] = [], existingStates: string[] = []) {
		server.use(
			// WITs present in the process
			http.get(upgradeWitsUrl, () =>
				HttpResponse.json({
					value: ALL_WIT_REFS.map((ref) => ({ referenceName: ref })),
				})
			),
			// Org-level fields (empty by default -> all need creating)
			http.get(ORG_FIELDS_URL, () => HttpResponse.json({ value: [] })),
			http.post(ORG_FIELDS_URL, () =>
				HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 })
			),
			// WIT-level fields already attached
			http.get(upgradeWitFieldsRegex, () =>
				HttpResponse.json({
					value: existingWitFields.map((ref) => ({ referenceName: ref })),
				})
			),
			// POST attach field to WIT
			http.post(upgradeWitFieldsRegex, () => HttpResponse.json({}, { status: 200 })),
			// States
			http.get(upgradeStatesRegex, () =>
				HttpResponse.json({
					value: existingStates.map((n) => ({ id: "s1", name: n, color: "007acc", stateCategory: "InProgress" })),
				})
			),
			http.post(upgradeStatesRegex, () => HttpResponse.json({}, { status: 201 })),
			// PATCH process description (marker update)
			http.patch(new RegExp(upgradeProcUrl + "\\?"), () => HttpResponse.json({}))
		);
	}

	it("attaches a missing field to an existing WIT", async () => {
		let attachCount = 0;
		setupUpgradeBase([], []);
		server.use(
			http.post(upgradeWitFieldsRegex, () => {
				attachCount++;
				return HttpResponse.json({}, { status: 200 });
			})
		);
		await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(attachCount).toBeGreaterThan(0);
	});

	it("skips attaching a field that is already present on the WIT", async () => {
		let attachCount = 0;
		// Pre-populate every TestVault.* field as already attached
		const allFieldRefs = TESTVAULT_SCHEMA.wits
			.flatMap((w) => w.fields)
			.filter((f) => f.referenceName.startsWith("TestVault."))
			.map((f) => {
				const parts = f.referenceName.split(".");
				return `Custom.TestVault${parts[1]}`;
			});
		setupUpgradeBase(allFieldRefs, []);
		server.use(
			http.post(upgradeWitFieldsRegex, () => {
				attachCount++;
				return HttpResponse.json({}, { status: 200 });
			})
		);
		await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(attachCount).toBe(0);
	});

	it("creates a missing state", async () => {
		let statePostCount = 0;
		setupUpgradeBase([], []);
		server.use(
			http.post(upgradeStatesRegex, () => {
				statePostCount++;
				return HttpResponse.json({}, { status: 201 });
			})
		);
		await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(statePostCount).toBeGreaterThan(0);
	});

	it("skips creating a state that already exists", async () => {
		// Pre-populate ALL translated state names for ALL WITs
		const allStateNames = TESTVAULT_SCHEMA.wits
			.flatMap((w) => w.states)
			.map((s) => `TestVault ${s.name}`);
		let statePostCount = 0;
		setupUpgradeBase([], allStateNames);
		server.use(
			http.post(upgradeStatesRegex, () => {
				statePostCount++;
				return HttpResponse.json({}, { status: 201 });
			})
		);
		await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(statePostCount).toBe(0);
	});

	it("updates the schema version marker via PATCH", async () => {
		let patchBody: Record<string, unknown> | null = null;
		setupUpgradeBase([], []);
		server.use(
			http.patch(new RegExp(upgradeProcUrl + "\\?"), async ({ request }) => {
				patchBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json({});
			})
		);
		const result = await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(patchBody).not.toBeNull();
		const desc = JSON.parse((patchBody?.description as string) ?? "{}") as {
			"testvault-schema": string;
		};
		expect(desc["testvault-schema"]).toBe("1.1.0");
		expect(result.markerUpdated).toBe(true);
	});

	it("returns correct fieldsAdded, statesAdded counts", async () => {
		// Use empty existing fields/states so everything is added
		setupUpgradeBase([], []);
		const result = await makeService().upgradeSchema({ processId: UPGRADE_PROC });
		expect(result.fieldsAdded).toBeGreaterThan(0);
		expect(result.statesAdded).toBeGreaterThan(0);
		expect(result.processId).toBe(UPGRADE_PROC);
	});

	it("does not throw when a WIT is missing from the process", async () => {
		server.use(
			// Only one WIT present (TestCase) — all others absent
			http.get(upgradeWitsUrl, () =>
				HttpResponse.json({
					value: [{ referenceName: "MockProcess.TestVaultTestCase" }],
				})
			),
			http.get(ORG_FIELDS_URL, () => HttpResponse.json({ value: [] })),
			http.post(ORG_FIELDS_URL, () =>
				HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 })
			),
			http.get(upgradeWitFieldsRegex, () => HttpResponse.json({ value: [] })),
			http.post(upgradeWitFieldsRegex, () => HttpResponse.json({}, { status: 200 })),
			http.get(upgradeStatesRegex, () => HttpResponse.json({ value: [] })),
			http.post(upgradeStatesRegex, () => HttpResponse.json({}, { status: 201 })),
			http.patch(new RegExp(upgradeProcUrl + "\\?"), () => HttpResponse.json({}))
		);
		await expect(makeService().upgradeSchema({ processId: UPGRADE_PROC })).resolves.toBeDefined();
	});
});
