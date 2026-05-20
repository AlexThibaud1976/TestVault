import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as SDK from "azure-devops-extension-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const mockProjectService = {
	getProject: vi.fn().mockResolvedValue({ name: "MockProject" }),
};

const mockExtensionDataManager = {
	getValue: vi.fn().mockResolvedValue(undefined),
	setValue: vi.fn().mockResolvedValue(undefined),
};

const mockExtensionDataService = {
	getExtensionDataManager: vi.fn().mockResolvedValue(mockExtensionDataManager),
};

vi.mock("azure-devops-extension-sdk", () => ({
	init: vi.fn(() => Promise.resolve()),
	ready: vi.fn(() => Promise.resolve()),
	getContributionId: vi.fn(),
	getHost: vi.fn(() => ({ name: "MockOrg" })),
	getService: vi.fn((serviceId: string) => {
		if (serviceId === "ms.vss-features.extension-data-service") {
			return Promise.resolve(mockExtensionDataService);
		}
		return Promise.resolve(mockProjectService);
	}),
	getAccessToken: vi.fn(() => Promise.resolve("mock-token")),
	getExtensionContext: vi.fn(() => ({ id: "mock-extension-id" })),
	notifyLoadSucceeded: vi.fn(),
	notifyLoadFailed: vi.fn(),
}));

vi.mock("azure-devops-extension-api", () => ({
	CommonServiceIds: {
		ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
		ExtensionDataService: "ms.vss-features.extension-data-service",
	},
}));

describe("App contribution-id routing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ value: [{ referenceName: "TestVault.TestCase" }] }),
			})
		);
		vi.mocked(SDK.init).mockResolvedValue(undefined);
		vi.mocked(SDK.ready).mockResolvedValue(undefined);
		vi.mocked(SDK.getHost).mockReturnValue({ name: "MockOrg" } as ReturnType<typeof SDK.getHost>);
		vi.mocked(SDK.getService).mockImplementation((serviceId: string) => {
			if (serviceId === "ms.vss-features.extension-data-service") {
				return Promise.resolve(mockExtensionDataService) as never;
			}
			return Promise.resolve(mockProjectService) as never;
		});
		vi.mocked(SDK.getAccessToken).mockResolvedValue("mock-token");
		vi.mocked(SDK.getExtensionContext).mockReturnValue({ id: "mock-extension-id" } as ReturnType<
			typeof SDK.getExtensionContext
		>);
		mockProjectService.getProject.mockResolvedValue({ name: "MockProject" });
		mockExtensionDataManager.getValue.mockResolvedValue(undefined);
		mockExtensionDataManager.setValue.mockResolvedValue(undefined);
		mockExtensionDataService.getExtensionDataManager.mockResolvedValue(mockExtensionDataManager);
	});

	it("always opens on test-plans-list (single hub, Sprint 2.18.3)", async () => {
		vi.mocked(SDK.getContributionId).mockReturnValue("AlexThibaud.ArgosTesting.argos-hub");
		render(<App />);
		await waitFor(
			() => {
				expect(screen.getByTestId("view-plans")).toBeDefined();
			},
			{ timeout: 3000 }
		);
	});

	it("opens on test-plans-list regardless of contributionId", async () => {
		vi.mocked(SDK.getContributionId).mockReturnValue("any.contribution.id");
		render(<App />);
		await waitFor(
			() => {
				expect(screen.getByTestId("view-plans")).toBeDefined();
			},
			{ timeout: 3000 }
		);
	});

	it("shows loading state before SDK init resolves", () => {
		vi.mocked(SDK.init).mockReturnValue(new Promise(() => {}));
		vi.mocked(SDK.getContributionId).mockReturnValue("AlexThibaud.ArgosTesting.argos-hub");
		render(<App />);
		expect(screen.getByTestId("hub-loading")).toBeDefined();
	});
});
