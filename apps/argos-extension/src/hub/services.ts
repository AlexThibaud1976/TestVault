import {
	type IAdoClient,
	type IBugCreationService,
	type IEnvironmentConfigService,
	type IEvidenceUploadService,
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
import type { IWebhookAdminService } from "./WebhookAdmin.js";
import { createAiSettingsStore } from "./ai-settings-store-adapter.js";
import { createExtensionDataClient } from "./extension-data-store.js";
import { type ILlmProviderService, createLlmProviderService } from "./llm-provider-service.js";
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
	project: string;
	organization: string;
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
		project: ctx.project,
		organization: ctx.organization,
	};
}
