import type { IAdoClient, RawWorkItem, WorkItemFieldPatch } from "@atconseil/argos-sdk";
import { createWitResolver } from "@atconseil/argos-wit-schema";
import { describe, expect, it, vi } from "vitest";
import type { AdoContext } from "./ado-context.js";
import {
	buildServices,
	createArgosWorkItem,
	createAuditLog,
	createPrecondition,
	createTestCase,
	createTestCaseVersion,
	createTestExecution,
	createTestPlan,
	createTestSet,
} from "./services.js";

vi.mock("azure-devops-extension-sdk");
vi.mock("azure-devops-extension-api", () => ({
	CommonServiceIds: {
		ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
		ExtensionDataService: "ms.vss-features.extension-data-service",
	},
}));
vi.mock("./extension-data-store.js", () => ({
	createExtensionDataClient: () => ({
		getValue: vi.fn().mockResolvedValue(undefined),
		setValue: vi.fn().mockResolvedValue(undefined),
	}),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PROCESS = "ArgosInheritedDemo";

function makeAdoWits() {
	return [
		{ referenceName: `${PROCESS}.TestVaultTestCase`, name: "Test Case" },
		{ referenceName: `${PROCESS}.TestVaultTestPlan`, name: "Test Plan" },
		{ referenceName: `${PROCESS}.TestVaultTestSet`, name: "Test Set" },
		{ referenceName: `${PROCESS}.TestVaultPrecondition`, name: "Precondition" },
		{ referenceName: `${PROCESS}.TestVaultTestExecution`, name: "Test Execution" },
		{ referenceName: `${PROCESS}.TestVaultTestCaseVersion`, name: "Test Case Version" },
		{ referenceName: `${PROCESS}.TestVaultAuditLog`, name: "Audit Log" },
	];
}

function makeResolver() {
	return createWitResolver({ getWorkItemTypes: vi.fn().mockResolvedValue(makeAdoWits()) }, "proj");
}

function makeAdoClient(): IAdoClient {
	const raw: RawWorkItem = { id: 42, rev: 1, fields: {}, url: "" };
	return {
		createWorkItem: vi.fn().mockResolvedValue(raw),
		fetchWorkItem: vi.fn().mockResolvedValue(raw),
		updateWorkItem: vi.fn().mockResolvedValue(raw),
		deleteWorkItem: vi.fn().mockResolvedValue(undefined),
		queryByWiql: vi.fn().mockResolvedValue([]),
		uploadAttachment: vi.fn().mockResolvedValue({ id: "x", url: "u" }),
	};
}

// ─── createArgosWorkItem ───────────────────────────────────────────────────────

describe("createArgosWorkItem", () => {
	it("resolves schema WIT refName to ADO refName before calling createWorkItem", async () => {
		const client = makeAdoClient();
		const resolver = makeResolver();
		await createArgosWorkItem(client, resolver, "TestVault.TestPlan", []);
		expect(client.createWorkItem).toHaveBeenCalledWith(`${PROCESS}.TestVaultTestPlan`, []);
	});

	it("translates /fields/TestVault.X patches to /fields/Custom.TestVaultX", async () => {
		const client = makeAdoClient();
		const resolver = makeResolver();
		const patches: WorkItemFieldPatch[] = [
			{ op: "add", path: "/fields/TestVault.Priority", value: "High" },
			{ op: "add", path: "/fields/System.Title", value: "My Plan" },
		];
		await createArgosWorkItem(client, resolver, "TestVault.TestPlan", patches);
		expect(client.createWorkItem).toHaveBeenCalledWith(`${PROCESS}.TestVaultTestPlan`, [
			{ op: "add", path: "/fields/Custom.TestVaultPriority", value: "High" },
			{ op: "add", path: "/fields/System.Title", value: "My Plan" },
		]);
	});
});

// ─── Convenience wrappers for all 7 WIT (Sprint 2.16) ─────────────────────────

describe("convenience wrappers — all 7 WIT use ADO refNames", () => {
	const wrappers = [
		{ name: "createTestCase", fn: createTestCase, suffix: "TestVaultTestCase" },
		{ name: "createTestPlan", fn: createTestPlan, suffix: "TestVaultTestPlan" },
		{ name: "createTestSet", fn: createTestSet, suffix: "TestVaultTestSet" },
		{ name: "createPrecondition", fn: createPrecondition, suffix: "TestVaultPrecondition" },
		{ name: "createTestExecution", fn: createTestExecution, suffix: "TestVaultTestExecution" },
		{
			name: "createTestCaseVersion",
			fn: createTestCaseVersion,
			suffix: "TestVaultTestCaseVersion",
		},
		{ name: "createAuditLog", fn: createAuditLog, suffix: "TestVaultAuditLog" },
	] as const;

	for (const { name, fn, suffix } of wrappers) {
		it(`${name} calls createWorkItem with ADO refName ${PROCESS}.${suffix}`, async () => {
			const client = makeAdoClient();
			const resolver = makeResolver();
			await fn(client, resolver, []);
			expect(client.createWorkItem).toHaveBeenCalledWith(`${PROCESS}.${suffix}`, []);
		});
	}

	it("all 7 wrappers produce distinct ADO refNames", async () => {
		const client = makeAdoClient();
		const resolver = makeResolver();
		await createTestCase(client, resolver, []);
		await createTestPlan(client, resolver, []);
		await createTestSet(client, resolver, []);
		await createPrecondition(client, resolver, []);
		await createTestExecution(client, resolver, []);
		await createTestCaseVersion(client, resolver, []);
		await createAuditLog(client, resolver, []);

		expect(client.createWorkItem).toHaveBeenCalledTimes(7);
		const types = (client.createWorkItem as ReturnType<typeof vi.fn>).mock.calls.map(
			(c: unknown[]) => c[0] as string
		);
		expect(new Set(types).size).toBe(7);
	});
});

// ─── buildServices ────────────────────────────────────────────────────────────

describe("buildServices", () => {
	it("returns all services initialized from the ado context", () => {
		const ctx: AdoContext = {
			accessTokenFactory: vi.fn().mockResolvedValue("token-abc"),
			project: "MyProject",
			organization: "myorg",
			baseUrl: "https://dev.azure.com/myorg",
			isLoading: false,
			error: null,
		};
		const services = buildServices(ctx);

		expect(services.testPlanService).toBeDefined();
		expect(services.testCaseService).toBeDefined();
		expect(services.testSetService).toBeDefined();
		expect(services.preconditionService).toBeDefined();
		expect(services.llmProviderService).toBeDefined();
		expect(services.project).toBe("MyProject");
		expect(services.organization).toBe("myorg");
	});

	it("passes project name to context fields", () => {
		const ctx: AdoContext = {
			accessTokenFactory: vi.fn().mockResolvedValue("token-abc"),
			project: "AlphaProject",
			organization: "myorg",
			baseUrl: "https://dev.azure.com/myorg",
			isLoading: false,
			error: null,
		};
		const services = buildServices(ctx);
		expect(services.project).toBe("AlphaProject");
	});
});
