import { describe, expect, it, vi } from "vitest";
import type { AdoContext } from "./ado-context.js";
import { buildServices } from "./services.js";

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
