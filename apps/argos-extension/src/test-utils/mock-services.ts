import type {
	IPreconditionService,
	ITestCaseService,
	ITestPlanService,
	ITestSetService,
} from "@atconseil/testvault-sdk";
import { vi } from "vitest";
import type { ILlmProviderService } from "../hub/llm-provider-service.js";
import type { Services } from "../hub/services.js";

export function createMockServices(overrides?: Partial<Services>): Services {
	return {
		testPlanService: createMockTestPlanService(),
		testCaseService: createMockTestCaseService(),
		testSetService: createMockTestSetService(),
		preconditionService: createMockPreconditionService(),
		llmProviderService: createMockLlmProviderService(),
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
