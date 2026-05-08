import { describe, expect, it, vi } from "vitest";
import { getWorkItemId } from "./coverage-panel-entry.js";

const FORM_SERVICE_ID = "ms.vss-work-web.work-item-form";

vi.mock("azure-devops-extension-sdk", () => ({
	getService: vi.fn().mockResolvedValue({ getId: vi.fn().mockResolvedValue(77) }),
}));

describe("getWorkItemId", () => {
	it("delegates to the ADO work item form service", async () => {
		const { getService } = await import("azure-devops-extension-sdk");
		const id = await getWorkItemId();
		expect(id).toBe(77);
		expect(vi.mocked(getService)).toHaveBeenCalledWith(FORM_SERVICE_ID);
	});

	it("propagates rejection when the form service throws", async () => {
		const { getService } = await import("azure-devops-extension-sdk");
		vi.mocked(getService).mockRejectedValueOnce(new Error("SDK not ready"));
		await expect(getWorkItemId()).rejects.toThrow("SDK not ready");
	});
});
