import {
	type IAdoClient,
	type IBugCreationService,
	type IEnvironmentConfigService,
	type IEvidenceUploadService,
	type IExtensionDataClient,
	type IPreconditionService,
	type ITestCaseService,
	type ITestCaseVersionService,
	type ITestExecutionService,
	type ITestPlanService,
	type ITestSetService,
	type IWorkItemLinkService,
	type RawWorkItem,
	type WorkItemFieldPatch,
	createAdoClient,
	createBugCreationService,
	createEnvironmentConfigService,
	createEvidenceUploadService,
	createPreconditionService,
	createTestCaseService,
	createTestCaseVersionService,
	createTestExecutionService,
	createTestPlanService,
	createTestSetService,
	createWorkItemLinkService,
} from "@atconseil/argos-sdk";
import {
	type IWitTypeProvider,
	type WitResolver,
	createWitResolver,
	isArgosWit,
	schemaToAdoFieldRefName,
} from "@atconseil/argos-wit-schema";
import type { IFlakinessReportService } from "./FlakinessReport.js";
import type { IQuotaSettingsService } from "./QuotaSettings.js";
import type { IWebhookAdminService } from "./WebhookAdmin.js";
import { createAiSettingsStore } from "./ai-settings-store-adapter.js";
import type { IAuditLogService } from "./audit-log-service.js";
import { createAuditLogService } from "./audit-log-service.js";
import type { IBetaFlagService } from "./beta-flag-service.js";
import { createBetaFlagService } from "./beta-flag-service.js";
import { createExtensionDataClient } from "./extension-data-store.js";
import { type ILlmProviderService, createLlmProviderService } from "./llm-provider-service.js";
import type { IConnectivityService } from "./offline-service.js";
import { createBrowserConnectivityService } from "./offline-service.js";
import type { IRepoMappingService } from "./repo-mapping-service.js";
import { createRepoMappingService } from "./repo-mapping-service.js";
export type { AdoContext } from "./ado-context.js";
import type { AdoContext } from "./ado-context.js";

export interface Services {
	testPlanService: ITestPlanService;
	testCaseService: ITestCaseService;
	testSetService: ITestSetService;
	preconditionService: IPreconditionService;
	llmProviderService: ILlmProviderService;
	testExecutionService: ITestExecutionService;
	evidenceUploadService: IEvidenceUploadService;
	environmentConfigService: IEnvironmentConfigService;
	bugCreationService: IBugCreationService;
	testCaseVersionService: ITestCaseVersionService;
	workItemLinkService: IWorkItemLinkService;
	webhookAdminService: IWebhookAdminService;
	auditLogService: IAuditLogService;
	repoMappingService: IRepoMappingService;
	betaFlagService: IBetaFlagService;
	connectivityService: IConnectivityService;
	quotaSettingsService: IQuotaSettingsService;
	flakinessReportService: IFlakinessReportService;
	extensionDataClient: IExtensionDataClient;
	detectInstalled: () => Promise<boolean>;
	baseUrl: string;
	project: string;
	organization: string;
}

async function checkArgosInstalled(
	orgUrl: string,
	project: string,
	accessTokenFactory: () => Promise<string>
): Promise<boolean> {
	const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wit/workitemtypes?api-version=7.1`;
	try {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${await accessTokenFactory()}`,
				Accept: "application/json",
			},
		});
		if (!res.ok) return false;
		const data = (await res.json()) as { value: Array<{ referenceName: string }> };
		return data.value.some((t) => isArgosWit(t.referenceName));
	} catch {
		return false;
	}
}

// ─── WitResolver infrastructure ───────────────────────────────────────────────

function makeWitTypeProvider(
	orgUrl: string,
	project: string,
	tokenFactory: () => Promise<string>
): IWitTypeProvider {
	return {
		async getWorkItemTypes() {
			const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/wit/workitemtypes?api-version=7.1`;
			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${await tokenFactory()}`, Accept: "application/json" },
			});
			if (!res.ok) throw new Error(`[WitTypeProvider] HTTP ${res.status}`);
			const data = (await res.json()) as { value: Array<{ referenceName: string; name: string }> };
			return data.value;
		},
	};
}

function createArgosAdoClientAdapter(inner: IAdoClient, resolver: WitResolver): IAdoClient {
	function translatePatches(patches: WorkItemFieldPatch[]): WorkItemFieldPatch[] {
		return patches.map((patch) =>
			patch.path.startsWith("/fields/TestVault.")
				? {
						...patch,
						path: `/fields/${schemaToAdoFieldRefName(patch.path.slice("/fields/".length))}`,
					}
				: patch
		);
	}
	return {
		async createWorkItem(type: string, fields: WorkItemFieldPatch[]): Promise<RawWorkItem> {
			return inner.createWorkItem(
				await resolver.resolveAdoWitRefName(type),
				translatePatches(fields)
			);
		},
		async fetchWorkItem(id: number): Promise<RawWorkItem> {
			const raw = await inner.fetchWorkItem(id);
			return { ...raw, fields: resolver.translateFieldsFromAdo(raw.fields) };
		},
		async updateWorkItem(id: number, fields: WorkItemFieldPatch[]): Promise<RawWorkItem> {
			return inner.updateWorkItem(id, translatePatches(fields));
		},
		deleteWorkItem: (id) => inner.deleteWorkItem(id),
		queryByWiql: (wiql) => inner.queryByWiql(wiql),
		uploadAttachment: (f, c, t) => inner.uploadAttachment(f, c, t),
	};
}

// ─── Convenience wrappers for all 7 WIT ───────────────────────────────────────
// Schema refNames are translated to ADO refNames transparently by the adapter.

export async function createArgosWorkItem(
	adoClient: IAdoClient,
	resolver: WitResolver,
	schemaWitRefName: string,
	patches: WorkItemFieldPatch[]
): Promise<RawWorkItem> {
	const adoType = await resolver.resolveAdoWitRefName(schemaWitRefName);
	const translated = patches.map((patch) =>
		patch.path.startsWith("/fields/TestVault.")
			? {
					...patch,
					path: `/fields/${schemaToAdoFieldRefName(patch.path.slice("/fields/".length))}`,
				}
			: patch
	);
	return adoClient.createWorkItem(adoType, translated);
}

export const createTestCase = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.TestCase", patches);

export const createTestPlan = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.TestPlan", patches);

export const createTestSet = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.TestSet", patches);

export const createPrecondition = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.Precondition", patches);

export const createTestExecution = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.TestExecution", patches);

export const createTestCaseVersion = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.TestCaseVersion", patches);

export const createAuditLog = (
	adoClient: IAdoClient,
	resolver: WitResolver,
	patches: WorkItemFieldPatch[]
) => createArgosWorkItem(adoClient, resolver, "TestVault.AuditLog", patches);

// ─── Services factory ─────────────────────────────────────────────────────────

export function buildServices(ctx: AdoContext): Services {
	// ADO WIT client: tokenFactory ensures Bearer token is refreshed on each API call
	const adoClient: IAdoClient = createAdoClient({
		baseUrl: ctx.baseUrl,
		project: ctx.project,
		tokenFactory: ctx.accessTokenFactory,
	});

	// WitResolver: translates schema refNames (TestVault.X) to ADO refNames (ProcessName.TestVaultX)
	const witProvider = makeWitTypeProvider(ctx.baseUrl, ctx.project, ctx.accessTokenFactory);
	const witResolver = createWitResolver(witProvider, ctx.project);
	const resolvedAdoClient = createArgosAdoClientAdapter(adoClient, witResolver);

	// LLM settings: User-scoped extension data (BYOK — each user has their own credentials)
	const dataClient = createExtensionDataClient();
	const aiStore = createAiSettingsStore(dataClient);
	const llmProviderService = createLlmProviderService(aiStore);

	const testExecutionService = createTestExecutionService(resolvedAdoClient, ctx.project);

	const webhookAdminServiceStub: IWebhookAdminService = {
		listTokens: () => Promise.resolve([]),
		createToken: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
		revokeToken: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
	};

	const quotaSettingsServiceStub: IQuotaSettingsService = {
		getConfig: () =>
			Promise.resolve({ limitPerUser: 100, mode: "soft" as const, feature: "ai", resetDay: 1 }),
		setConfig: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
	};

	const flakinessReportServiceStub: IFlakinessReportService = {
		getReport: () => Promise.resolve([]),
		markKnownFlaky: () => Promise.reject(new Error("Azure Functions not deployed (TECH-DEBT-017)")),
	};

	return {
		testPlanService: createTestPlanService(resolvedAdoClient, ctx.project),
		testCaseService: createTestCaseService(resolvedAdoClient, ctx.project),
		testSetService: createTestSetService(resolvedAdoClient, ctx.project),
		preconditionService: createPreconditionService(resolvedAdoClient, ctx.project),
		llmProviderService,
		testExecutionService,
		evidenceUploadService: createEvidenceUploadService(resolvedAdoClient, testExecutionService),
		environmentConfigService: createEnvironmentConfigService(dataClient),
		bugCreationService: createBugCreationService(resolvedAdoClient, testExecutionService),
		testCaseVersionService: createTestCaseVersionService(resolvedAdoClient),
		workItemLinkService: createWorkItemLinkService(resolvedAdoClient),
		webhookAdminService: webhookAdminServiceStub,
		auditLogService: createAuditLogService({
			getAll: (c) => aiStore.getAll(c),
			set: (c, doc) => aiStore.set(c, doc),
			get: async (collection, id) => {
				const all = await aiStore.getAll(collection);
				return (all as Array<{ id: string }>).find((d) => d.id === id);
			},
		}),
		repoMappingService: createRepoMappingService(aiStore),
		betaFlagService: createBetaFlagService(aiStore),
		connectivityService: createBrowserConnectivityService(),
		quotaSettingsService: quotaSettingsServiceStub,
		flakinessReportService: flakinessReportServiceStub,
		extensionDataClient: dataClient,
		detectInstalled: () => checkArgosInstalled(ctx.baseUrl, ctx.project, ctx.accessTokenFactory),
		baseUrl: ctx.baseUrl,
		project: ctx.project,
		organization: ctx.organization,
	};
}
