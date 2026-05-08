import { describe, expect, it, vi } from "vitest";
import { createAiGlobalToggleService } from "./ai-global-toggle-service.js";

function makeStore(flagValue = false) {
	return {
		getFlag: vi.fn().mockResolvedValue(flagValue),
		setFlag: vi.fn().mockResolvedValue(undefined),
	};
}

describe("AiGlobalToggleService", () => {
	it("isEnabled returns false when flag is false", async () => {
		const svc = createAiGlobalToggleService(makeStore(false));
		expect(await svc.isEnabled()).toBe(false);
	});

	it("isEnabled returns true when flag is true", async () => {
		const svc = createAiGlobalToggleService(makeStore(true));
		expect(await svc.isEnabled()).toBe(true);
	});

	it("enable calls setFlag with true", async () => {
		const store = makeStore(false);
		const svc = createAiGlobalToggleService(store);
		await svc.enable();
		expect(vi.mocked(store.setFlag)).toHaveBeenCalledWith("ai-global-enabled", true);
	});

	it("disable calls setFlag with false", async () => {
		const store = makeStore(true);
		const svc = createAiGlobalToggleService(store);
		await svc.disable();
		expect(vi.mocked(store.setFlag)).toHaveBeenCalledWith("ai-global-enabled", false);
	});
});
