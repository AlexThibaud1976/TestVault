import { renderHook, waitFor } from "@testing-library/react";
import * as SDK from "azure-devops-extension-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdoContext } from "./ado-context.js";

vi.mock("azure-devops-extension-sdk");
vi.mock("azure-devops-extension-api", () => ({
	CommonServiceIds: {
		ProjectPageService: "ms.vss-tfs-web.tfs-page-data-service",
		ExtensionDataService: "ms.vss-features.extension-data-service",
	},
}));

describe("useAdoContext", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns isLoading: true initially", () => {
		vi.mocked(SDK.init).mockResolvedValue(undefined);
		vi.mocked(SDK.ready).mockResolvedValue(undefined);
		vi.mocked(SDK.getHost).mockReturnValue({
			name: "myorg",
			id: "abc",
			type: 4,
			serviceVersion: "4.0.0",
			isHosted: true,
		} as never);
		vi.mocked(SDK.getAccessToken).mockResolvedValue("token-xyz");
		vi.mocked(SDK.getService).mockResolvedValue({
			getProject: vi.fn().mockResolvedValue({ name: "MyProject", id: "p1" }),
		} as never);
		const { result } = renderHook(() => useAdoContext());
		expect(result.current.isLoading).toBe(true);
	});

	it("returns context when ADO SDK is ready", async () => {
		vi.mocked(SDK.init).mockResolvedValue(undefined);
		vi.mocked(SDK.ready).mockResolvedValue(undefined);
		vi.mocked(SDK.getHost).mockReturnValue({
			name: "myorg",
			id: "abc",
			type: 4,
			serviceVersion: "4.0.0",
			isHosted: true,
		} as never);
		vi.mocked(SDK.getAccessToken).mockResolvedValue("token-xyz");
		vi.mocked(SDK.getService).mockResolvedValue({
			getProject: vi.fn().mockResolvedValue({ name: "MyProject", id: "p1" }),
		} as never);

		const { result } = renderHook(() => useAdoContext());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.project).toBe("MyProject");
		expect(result.current.organization).toBe("myorg");
		expect(result.current.baseUrl).toBe("https://dev.azure.com/myorg");
		expect(result.current.error).toBeNull();

		// Token factory refreshes on each call
		vi.mocked(SDK.getAccessToken).mockResolvedValue("token-refreshed");
		const token = await result.current.accessTokenFactory();
		expect(token).toBe("token-refreshed");
	});

	it("returns error when ADO SDK init fails", async () => {
		vi.mocked(SDK.init).mockRejectedValue(new Error("SDK init failed"));
		const { result } = renderHook(() => useAdoContext());
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.error).toBeDefined();
		expect(result.current.error?.message).toContain("SDK init failed");
	});
});
