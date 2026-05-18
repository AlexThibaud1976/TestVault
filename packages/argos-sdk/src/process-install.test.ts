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

// Default org-level field handlers (Sprint 2.12) — overridden per test when needed.
// Default: GET -> 404 (field does not exist), POST -> 201 (created).
const server = setupServer(
	http.get(`${ORG_FIELDS_URL}/:refName`, () => new HttpResponse(null, { status: 404 })),
	http.post(ORG_FIELDS_URL, () =>
		HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 })
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

// ─── Sprint 2.12 field 2-step workflow ───────────────────────────────────────

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

	it("calls GET org-level field before creating (field not exists -> creates)", async () => {
		let orgGetCount = 0;
		let orgPostCount = 0;

		// Override defaults: GET -> 404, POST -> 201
		server.use(
			http.get(`${ORG_FIELDS_URL}/:refName`, () => {
				orgGetCount++;
				return new HttpResponse(null, { status: 404 });
			}),
			http.post(ORG_FIELDS_URL, () => {
				orgPostCount++;
				return HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 201 });
			})
		);
		setupBase();

		await makeService().install({ processName: "TestVault - Agile", baseProcess: "Agile" });

		// One GET per unique field per WIT (many fields across 7 WITs)
		expect(orgGetCount).toBeGreaterThan(0);
		// One POST per field that doesn't exist
		expect(orgPostCount).toBeGreaterThan(0);
	});

	it("skips org-level create when field already exists (GET -> 200)", async () => {
		let orgPostCount = 0;

		// Override: GET -> 200 (all fields exist), POST should not be called
		server.use(
			http.get(`${ORG_FIELDS_URL}/:refName`, () =>
				HttpResponse.json({ referenceName: "Custom.TestVaultX" }, { status: 200 })
			),
			http.post(ORG_FIELDS_URL, () => {
				orgPostCount++;
				return HttpResponse.json({}, { status: 201 });
			})
		);
		setupBase();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		expect(orgPostCount).toBe(0);
		expect(steps.some((m) => m.includes("Reusing existing org-level field"))).toBe(true);
	});

	it("treats 409 from org-level create as success (attach still proceeds)", async () => {
		let attachCount = 0;

		// setupBase first (lower priority), then overrides prepend on top (higher priority)
		setupBase();
		server.use(
			http.get(`${ORG_FIELDS_URL}/:refName`, () => new HttpResponse(null, { status: 404 })),
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

	it("logs Creating/Reusing/Attached messages per field", async () => {
		setupBase();

		const steps: string[] = [];
		await makeService().install({
			processName: "TestVault - Agile",
			baseProcess: "Agile",
			onProgress: (s) => steps.push(s.message),
		});

		expect(steps.some((m) => m.includes("Creating org-level field Custom."))).toBe(true);
		expect(steps.some((m) => m.includes("Attached") && m.includes("Custom."))).toBe(true);
	});
});
