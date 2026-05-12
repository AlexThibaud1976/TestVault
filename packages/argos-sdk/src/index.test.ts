import { HostType } from "azure-devops-extension-sdk";
import { describe, expect, it, vi } from "vitest";
import { detectEnvironment } from "./environment.js";

vi.mock("azure-devops-extension-sdk", () => ({
	HostType: { Unknown: 0, Deployment: 1, Enterprise: 2, Organization: 4 },
	getHost: vi.fn(),
}));

const { getHost } = await import("azure-devops-extension-sdk");

const cloudHost = {
	id: "org-guid",
	name: "myorg",
	serviceVersion: "221.0.0",
	type: HostType.Organization,
	isHosted: true,
};
const serverHost = {
	id: "coll-guid",
	name: "DefaultCollection",
	serviceVersion: "18.0.1",
	type: HostType.Organization,
	isHosted: false,
};

describe("detectEnvironment", () => {
	it("returns cloud AdoEnvironment for a hosted org", () => {
		vi.mocked(getHost).mockReturnValue(cloudHost);
		const env = detectEnvironment();
		expect(env).toEqual({ type: "cloud", orgUrl: "https://dev.azure.com/myorg" });
	});

	it("returned cloud orgUrl validates against AdoEnvironmentSchema", async () => {
		vi.mocked(getHost).mockReturnValue(cloudHost);
		const { AdoEnvironmentSchema } = await import("@atconseil/argos-types");
		const env = detectEnvironment();
		expect(() => AdoEnvironmentSchema.parse(env)).not.toThrow();
	});

	it("returns server AdoEnvironment for a non-hosted org with explicit collectionUrl", () => {
		vi.mocked(getHost).mockReturnValue(serverHost);
		const env = detectEnvironment("https://ado.company.com/DefaultCollection");
		expect(env).toEqual({
			type: "server",
			collectionUrl: "https://ado.company.com/DefaultCollection",
			version: "18.0.1",
		});
	});

	it("returned server env validates against AdoEnvironmentSchema", async () => {
		vi.mocked(getHost).mockReturnValue(serverHost);
		const { AdoEnvironmentSchema } = await import("@atconseil/argos-types");
		const env = detectEnvironment("https://ado.company.com/tfs");
		expect(() => AdoEnvironmentSchema.parse(env)).not.toThrow();
	});

	it("defaults server collectionUrl to empty string when not provided", () => {
		vi.mocked(getHost).mockReturnValue(serverHost);
		const env = detectEnvironment();
		expect(env).toMatchObject({ type: "server", version: "18.0.1", collectionUrl: "" });
	});
});
