import {
	type IAdoClient,
	type IPreconditionService,
	type ITestCaseService,
	type ITestPlanService,
	type ITestSetService,
	createAdoClient,
	createPreconditionService,
	createTestCaseService,
	createTestPlanService,
	createTestSetService,
} from "@atconseil/testvault-sdk";
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

	return {
		testPlanService: createTestPlanService(adoClient, ctx.project),
		testCaseService: createTestCaseService(adoClient, ctx.project),
		testSetService: createTestSetService(adoClient, ctx.project),
		preconditionService: createPreconditionService(adoClient, ctx.project),
		llmProviderService,
		project: ctx.project,
		organization: ctx.organization,
	};
}
