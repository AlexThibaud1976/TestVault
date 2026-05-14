import type {
	IBugCreationService,
	IEnvironmentConfigService,
	IEvidenceUploadService,
	IPreconditionService,
	ITestCaseService,
	ITestCaseVersionService,
	ITestExecutionService,
	ITestPlanService,
	ITestSetService,
	IWorkItemLinkService,
} from "@atconseil/argos-sdk";
import { vi } from "vitest";
import type { IWebhookAdminService } from "../hub/WebhookAdmin.js";
import type { ILlmProviderService } from "../hub/llm-provider-service.js";
import type { Services } from "../hub/services.js";

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
