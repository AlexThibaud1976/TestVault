import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as SDK from "azure-devops-extension-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(cleanup);

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

vi.mock("@atconseil/argos-sdk", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@atconseil/argos-sdk")>();
	return {
		...mod,
		createProcessInstallService: vi.fn(() => ({
			detectInstallState: vi.fn().mockResolvedValue({
				status: "installed",
				processId: "mock-process",
				processName: "Mock Process",
				schemaVersion: "1.0.0",
			}),
			install: vi.fn().mockResolvedValue({ processId: "mock", processName: "Mock" }),
		})),
	};
});

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

	it.each([
		["AlexThibaud.ArgosTesting.argos-hub-plans", "view-plans"],
		["AlexThibaud.ArgosTesting.argos-hub-cases", "view-cases"],
		["AlexThibaud.ArgosTesting.argos-hub-sets", "view-sets"],
		["AlexThibaud.ArgosTesting.argos-hub-preconditions", "view-preconditions"],
		["AlexThibaud.ArgosTesting.argos-hub-reports", "view-reports"],
		["AlexThibaud.ArgosTesting.argos-hub-settings", "view-settings"],
	])("renders correct view for contribution %s", async (contributionId, expectedTestId) => {
		vi.mocked(SDK.getContributionId).mockReturnValue(contributionId);
		render(<App />);
		await waitFor(
			() => {
				expect(screen.getByTestId(expectedTestId)).toBeDefined();
			},
			{ timeout: 3000 }
		);
	});

	it("falls back to plans section if contributionId is unknown", async () => {
		vi.mocked(SDK.getContributionId).mockReturnValue("unknown.contribution.id");
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
		vi.mocked(SDK.getContributionId).mockReturnValue("AlexThibaud.ArgosTesting.argos-hub-plans");
		render(<App />);
		expect(screen.getByTestId("hub-loading")).toBeDefined();
	});
});
