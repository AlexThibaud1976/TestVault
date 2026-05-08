import { describe, expect, it, vi } from "vitest";
import type { IExtensionDataClient } from "./environment-config-service.js";
import { createEnvironmentConfigService } from "./environment-config-service.js";

function makeDataClient(overrides?: Partial<IExtensionDataClient>): IExtensionDataClient {
	return {
		getValue: vi.fn().mockResolvedValue(undefined),
		setValue: vi.fn().mockImplementation(async (_key, value) => value),
		...overrides,
	};
}

const ENVS = ["Dev", "QA", "Staging"];

// ─── getEnvironments ──────────────────────────────────────────────────────────

describe("getEnvironments", () => {
	it("returns the stored list", async () => {
		const client = makeDataClient({ getValue: vi.fn().mockResolvedValue(ENVS) });
		const service = createEnvironmentConfigService(client);
		expect(await service.getEnvironments()).toEqual(ENVS);
	});

	it("returns empty array when no value is stored (undefined)", async () => {
		const service = createEnvironmentConfigService(makeDataClient());
		expect(await service.getEnvironments()).toEqual([]);
	});

	it("returns empty array when stored value is null", async () => {
		const client = makeDataClient({ getValue: vi.fn().mockResolvedValue(null) });
		const service = createEnvironmentConfigService(client);
		expect(await service.getEnvironments()).toEqual([]);
	});

	it("fetches using the key 'tv-environments'", async () => {
		const client = makeDataClient();
		await createEnvironmentConfigService(client).getEnvironments();
		expect(vi.mocked(client.getValue)).toHaveBeenCalledWith("tv-environments");
	});
});

// ─── saveEnvironments ─────────────────────────────────────────────────────────

describe("saveEnvironments", () => {
	it("stores the list under key 'tv-environments'", async () => {
		const client = makeDataClient();
		await createEnvironmentConfigService(client).saveEnvironments(["Dev", "QA"]);
		expect(vi.mocked(client.setValue)).toHaveBeenCalledWith("tv-environments", ["Dev", "QA"]);
	});

	it("trims whitespace from each environment name before saving", async () => {
		const client = makeDataClient();
		await createEnvironmentConfigService(client).saveEnvironments(["  Dev  ", " QA"]);
		expect(vi.mocked(client.setValue)).toHaveBeenCalledWith("tv-environments", ["Dev", "QA"]);
	});

	it("allows saving an empty list (clearing all environments)", async () => {
		const client = makeDataClient();
		await expect(
			createEnvironmentConfigService(client).saveEnvironments([])
		).resolves.toBeUndefined();
		expect(vi.mocked(client.setValue)).toHaveBeenCalledWith("tv-environments", []);
	});

	it("throws when any environment name is blank after trimming", async () => {
		const service = createEnvironmentConfigService(makeDataClient());
		await expect(service.saveEnvironments(["Dev", "   "])).rejects.toThrow("blank");
	});

	it("throws when duplicate names exist (case-insensitive)", async () => {
		const service = createEnvironmentConfigService(makeDataClient());
		await expect(service.saveEnvironments(["Dev", "dev"])).rejects.toThrow("duplicate");
	});

	it("does NOT throw for distinct names that differ only in casing not being duplicate — case-sensitive dedup", async () => {
		// We treat "Dev" and "DEV" as duplicates (case-insensitive check)
		// But "Dev" and "dev2" are distinct — make sure we only reject true duplicates
		const client = makeDataClient();
		await expect(
			createEnvironmentConfigService(client).saveEnvironments(["Dev", "dev2", "QA"])
		).resolves.toBeUndefined();
	});
});
