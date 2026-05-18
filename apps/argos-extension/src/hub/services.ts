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
import { isArgosWit } from "@atconseil/argos-wit-schema";
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

export function buildServices(ctx: AdoContext): Services {
	// ADO WIT client: tokenFactory ensures Bearer token is refreshed on each API call
	const adoClient: IAdoClient = createAdoClient({
		baseUrl: ctx.baseUrl,
		project: ctx.project,
		tokenFactory: ctx.accessTokenFactory,
	});

	// LLM settings: User-scoped extension data (BYOK — each user has their own credentials)
	const dataClient = createExtensionDataClient();
	const aiStore = createAiSettingsStore(dataClient);
	const llmProviderService = createLlmProviderService(aiStore);

	const testExecutionService = createTestExecutionService(adoClient, ctx.project);

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
		testPlanService: createTestPlanService(adoClient, ctx.project),
		testCaseService: createTestCaseService(adoClient, ctx.project),
		testSetService: createTestSetService(adoClient, ctx.project),
		preconditionService: createPreconditionService(adoClient, ctx.project),
		llmProviderService,
		testExecutionService,
		evidenceUploadService: createEvidenceUploadService(adoClient, testExecutionService),
		environmentConfigService: createEnvironmentConfigService(dataClient),
		bugCreationService: createBugCreationService(adoClient, testExecutionService),
		testCaseVersionService: createTestCaseVersionService(adoClient),
		workItemLinkService: createWorkItemLinkService(adoClient),
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
