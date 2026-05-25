import type {
	IBugCreationService,
	IEnvironmentConfigService,
	IEvidenceUploadService,
	IExtensionDataClient,
	IPreconditionService,
	ITestCaseService,
	ITestCaseVersionService,
	ITestExecutionService,
	ITestPlanService,
	ITestSetService,
	IWorkItemLinkService,
} from "@atconseil/argos-sdk";
import { vi } from "vitest";
import type { IFlakinessReportService } from "../hub/FlakinessReport.js";
import type { IQuotaSettingsService } from "../hub/QuotaSettings.js";
import type { IWebhookAdminService } from "../hub/WebhookAdmin.js";
import type { IAuditLogService } from "../hub/audit-log-service.js";
import type { IBetaFlagService } from "../hub/beta-flag-service.js";
import type { ILlmProviderService } from "../hub/llm-provider-service.js";
import type { IConnectivityService } from "../hub/offline-service.js";
import type { IRepoMappingService } from "../hub/repo-mapping-service.js";
import type { Services } from "../hub/services.js";
import type { IAdoClassificationService } from "../hub/services/ado-classification-service.js";
import type { IAdoIterationsService } from "../hub/services/ado-iterations-service.js";
import type { IAdoWorkItemsService } from "../hub/services/ado-work-items-service.js";
import type { IAiGenerationService } from "../hub/services/ai-generation-service.js";
import type { ILlmConfigService } from "../hub/services/llm-config-service.js";

export function createMockServices(overrides?: Partial<Services>): Services {
	return {
		testPlanService: createMockTestPlanService(),
		testCaseService: createMockTestCaseService(),
		testSetService: createMockTestSetService(),
		preconditionService: createMockPreconditionService(),
		llmProviderService: createMockLlmProviderService(),
		testExecutionService: createMockTestExecutionService(),
		evidenceUploadService: createMockEvidenceUploadService(),
		environmentConfigService: createMockEnvironmentConfigService(),
		bugCreationService: createMockBugCreationService(),
		testCaseVersionService: createMockTestCaseVersionService(),
		workItemLinkService: createMockWorkItemLinkService(),
		webhookAdminService: createMockWebhookAdminService(),
		auditLogService: createMockAuditLogService(),
		repoMappingService: createMockRepoMappingService(),
		betaFlagService: createMockBetaFlagService(),
		connectivityService: createMockConnectivityService(),
		quotaSettingsService: createMockQuotaSettingsService(),
		flakinessReportService: createMockFlakinessReportService(),
		extensionDataClient: createMockExtensionDataClient(),
		adoClassificationService: createMockAdoClassificationService(),
		adoIterationsService: createMockAdoIterationsService(),
		llmConfigService: createMockLlmConfigService(),
		adoWorkItemsService: createMockAdoWorkItemsService(),
		aiGenerationService: createMockAiGenerationService(),
		detectInstalled: vi.fn().mockResolvedValue(true),
		baseUrl: "https://dev.azure.com/MockOrg",
		project: "MockProject",
		organization: "MockOrg",
		...overrides,
	};
}

export function createMockTestPlanService(overrides?: Partial<ITestPlanService>): ITestPlanService {
	return {
		create: vi.fn().mockResolvedValue({}),
		read: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		lock: vi.fn().mockResolvedValue({}),
		unlock: vi.fn().mockResolvedValue({}),
		lockWithAutoSnapshot: vi.fn().mockResolvedValue({}),
		...overrides,
	} as unknown as ITestPlanService;
}

export function createMockTestCaseService(overrides?: Partial<ITestCaseService>): ITestCaseService {
	return {
		create: vi.fn().mockResolvedValue({}),
		read: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as ITestCaseService;
}

export function createMockTestSetService(overrides?: Partial<ITestSetService>): ITestSetService {
	return {
		create: vi.fn().mockResolvedValue({}),
		read: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		addTestCases: vi.fn().mockResolvedValue({}),
		removeTestCases: vi.fn().mockResolvedValue({}),
		resolveTestCaseIds: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as ITestSetService;
}

export function createMockPreconditionService(
	overrides?: Partial<IPreconditionService>
): IPreconditionService {
	return {
		create: vi.fn().mockResolvedValue({}),
		read: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		linkTestCase: vi.fn().mockResolvedValue({}),
		unlinkTestCase: vi.fn().mockResolvedValue({}),
		getForTestCase: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as IPreconditionService;
}

export function createMockLlmProviderService(
	overrides?: Partial<ILlmProviderService>
): ILlmProviderService {
	return {
		list: vi.fn().mockResolvedValue([]),
		add: vi.fn().mockResolvedValue({}),
		remove: vi.fn().mockResolvedValue(undefined),
		testConnection: vi.fn().mockResolvedValue({ success: true, message: "OK" }),
		...overrides,
	} as unknown as ILlmProviderService;
}

export function createMockTestExecutionService(
	overrides?: Partial<ITestExecutionService>
): ITestExecutionService {
	return {
		startRun: vi.fn().mockResolvedValue({ id: 1, stepResults: [], evidence: [], bugLinks: [] }),
		saveStepResult: vi.fn().mockResolvedValue({}),
		attachEvidence: vi.fn().mockResolvedValue({}),
		finalizeRun: vi.fn().mockResolvedValue({}),
		linkBug: vi.fn().mockResolvedValue({}),
		listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
		...overrides,
	} as unknown as ITestExecutionService;
}

export function createMockEvidenceUploadService(
	overrides?: Partial<IEvidenceUploadService>
): IEvidenceUploadService {
	return {
		upload: vi.fn().mockResolvedValue({ attachmentId: "mock-id", filename: "mock.png", url: "" }),
		...overrides,
	} as unknown as IEvidenceUploadService;
}

export function createMockEnvironmentConfigService(
	overrides?: Partial<IEnvironmentConfigService>
): IEnvironmentConfigService {
	return {
		getEnvironments: vi.fn().mockResolvedValue([]),
		saveEnvironments: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IEnvironmentConfigService;
}

export function createMockBugCreationService(
	overrides?: Partial<IBugCreationService>
): IBugCreationService {
	return {
		createBug: vi.fn().mockResolvedValue({ id: 999, url: "https://mock/bugs/999" }),
		...overrides,
	} as unknown as IBugCreationService;
}

export function createMockTestCaseVersionService(
	overrides?: Partial<ITestCaseVersionService>
): ITestCaseVersionService {
	return {
		createSnapshot: vi.fn().mockResolvedValue({}),
		listSnapshots: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as ITestCaseVersionService;
}

export function createMockWorkItemLinkService(
	overrides?: Partial<IWorkItemLinkService>
): IWorkItemLinkService {
	return {
		listLinks: vi.fn().mockResolvedValue([]),
		addLink: vi.fn().mockResolvedValue({}),
		removeLink: vi.fn().mockResolvedValue(undefined),
		detectOrphanLinks: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as IWorkItemLinkService;
}

export function createMockWebhookAdminService(
	overrides?: Partial<IWebhookAdminService>
): IWebhookAdminService {
	return {
		listTokens: vi.fn().mockResolvedValue([]),
		createToken: vi.fn().mockResolvedValue({
			id: "mock-id",
			label: "mock",
			createdAt: "",
			revoked: false,
			secret: "mock-secret",
		}),
		revokeToken: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IWebhookAdminService;
}

export function createMockAuditLogService(overrides?: Partial<IAuditLogService>): IAuditLogService {
	return {
		list: vi.fn().mockResolvedValue([]),
		getRetentionDays: vi.fn().mockResolvedValue(730),
		setRetentionDays: vi.fn().mockResolvedValue(undefined),
		exportCsv: vi.fn().mockResolvedValue("id,operation,actor,timestamp,oldValue,newValue"),
		...overrides,
	} as unknown as IAuditLogService;
}

export function createMockRepoMappingService(
	overrides?: Partial<IRepoMappingService>
): IRepoMappingService {
	return {
		list: vi.fn().mockResolvedValue([]),
		add: vi
			.fn()
			.mockResolvedValue({ id: "mock-id", repoUrl: "", branch: "", pathGlob: "", areaPath: "" }),
		remove: vi.fn().mockResolvedValue(undefined),
		sync: vi.fn().mockResolvedValue({ created: 0, updated: 0, deprecated: 0 }),
		...overrides,
	} as unknown as IRepoMappingService;
}

export function createMockBetaFlagService(overrides?: Partial<IBetaFlagService>): IBetaFlagService {
	return {
		isEnrolled: vi.fn().mockResolvedValue(false),
		enroll: vi.fn().mockResolvedValue(undefined),
		unenroll: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IBetaFlagService;
}

export function createMockConnectivityService(online = true): IConnectivityService {
	return {
		isOnline: vi.fn().mockReturnValue(online),
		subscribe: vi.fn().mockReturnValue(() => undefined),
	} as unknown as IConnectivityService;
}

export function createMockQuotaSettingsService(
	overrides?: Partial<IQuotaSettingsService>
): IQuotaSettingsService {
	return {
		getConfig: vi.fn().mockResolvedValue({
			limitPerUser: 100,
			mode: "soft",
			feature: "ai",
			resetDay: 1,
		}),
		setConfig: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IQuotaSettingsService;
}

export function createMockFlakinessReportService(
	overrides?: Partial<IFlakinessReportService>
): IFlakinessReportService {
	return {
		getReport: vi.fn().mockResolvedValue([]),
		markKnownFlaky: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IFlakinessReportService;
}

export function createMockAdoClassificationService(
	overrides?: Partial<IAdoClassificationService>
): IAdoClassificationService {
	return {
		getAreaPaths: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

export function createMockAdoIterationsService(
	overrides?: Partial<IAdoIterationsService>
): IAdoIterationsService {
	return {
		getIterations: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

export function createMockAiGenerationService(
	overrides?: Partial<IAiGenerationService>
): IAiGenerationService {
	return {
		generate: vi.fn().mockResolvedValue([]),
		generateSteps: vi.fn().mockResolvedValue({ steps: [], truncated: false }),
		...overrides,
	};
}

export function createMockAdoWorkItemsService(
	overrides?: Partial<IAdoWorkItemsService>
): IAdoWorkItemsService {
	return {
		search: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

export function createMockLlmConfigService(
	overrides?: Partial<ILlmConfigService>
): ILlmConfigService {
	return {
		getConfig: vi.fn().mockResolvedValue(null),
		setConfig: vi.fn().mockResolvedValue(undefined),
		clearConfig: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

export function createMockExtensionDataClient(
	overrides?: Partial<IExtensionDataClient>
): IExtensionDataClient {
	return {
		getValue: vi.fn().mockResolvedValue(undefined),
		setValue: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as IExtensionDataClient;
}
