import { describe, expect, it, vi } from "vitest";
import { createBetaFlagService } from "./beta-flag-service.js";

function makeStore(initial?: boolean) {
	const data = new Map<string, boolean>();
	if (initial !== undefined) data.set("beta-enrolled", initial);
	return {
		getFlag: vi.fn(async (key: string) => data.get(key)),
		setFlag: vi.fn(async (key: string, value: boolean) => {
			data.set(key, value);
		}),
	};
}

describe("createBetaFlagService", () => {
	it("isEnrolled returns false when flag not set", async () => {
		const svc = createBetaFlagService(makeStore());
		expect(await svc.isEnrolled()).toBe(false);
	});

	it("isEnrolled returns true when flag is true", async () => {
		const svc = createBetaFlagService(makeStore(true));
		expect(await svc.isEnrolled()).toBe(true);
	});

	it("isEnrolled returns false when flag is explicitly false", async () => {
		const svc = createBetaFlagService(makeStore(false));
		expect(await svc.isEnrolled()).toBe(false);
	});

	it("enroll calls setFlag with beta-enrolled=true", async () => {
		const store = makeStore();
		const svc = createBetaFlagService(store);
		await svc.enroll();
		expect(store.setFlag).toHaveBeenCalledWith("beta-enrolled", true);
	});

	it("unenroll calls setFlag with beta-enrolled=false", async () => {
		const store = makeStore(true);
		const svc = createBetaFlagService(store);
		await svc.unenroll();
		expect(store.setFlag).toHaveBeenCalledWith("beta-enrolled", false);
	});
});
