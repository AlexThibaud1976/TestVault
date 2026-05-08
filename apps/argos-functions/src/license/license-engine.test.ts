import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSignedLicense, validateLicense } from "./license-engine.js";
import type { LicensePayload } from "./license-engine.js";

function makeKeyPair() {
	return generateKeyPairSync("ed25519", {
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});
}

function makePayload(overrides?: Partial<LicensePayload>): LicensePayload {
	return {
		version: 1,
		orgUrl: "https://dev.azure.com/test-org",
		tier: "pro",
		issuedAt: "2026-01-01T00:00:00Z",
		expiresAt: "2027-01-01T00:00:00Z",
		...overrides,
	};
}

describe("createSignedLicense + validateLicense", () => {
	it("active: valid license not yet expired returns state=active and correct tier", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ tier: "pro" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.state).toBe("active");
		expect(result.tier).toBe("pro");
	});

	it("expired: license past expiresAt and past grace window returns state=expired, tier=free", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ expiresAt: "2026-01-10T00:00:00Z" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-02-01T00:00:00Z"), 7);
		expect(result.state).toBe("expired");
		expect(result.tier).toBe("free");
	});

	it("offline-grace: license expired within grace window returns state=offline-grace with gracePeriodEnds", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ expiresAt: "2026-01-10T00:00:00Z" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-01-14T00:00:00Z"), 7);
		expect(result.state).toBe("offline-grace");
		expect(result.tier).toBe("pro");
		expect(result.gracePeriodEnds).toBeDefined();
	});

	it("gracePeriodEnds is expiresAt + gracePeriodDays", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ expiresAt: "2026-01-10T00:00:00Z" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-01-14T00:00:00Z"), 7);
		expect(result.gracePeriodEnds).toBe("2026-01-17T00:00:00.000Z");
	});

	it("invalid: tampered payload signature mismatch returns state=invalid", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload();
		const signed = createSignedLicense(payload, privateKey);
		const tampered = {
			...signed,
			payload: { ...signed.payload, tier: "enterprise" as const },
		};
		const result = validateLicense(tampered, publicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.state).toBe("invalid");
		expect(result.tier).toBe("free");
	});

	it("invalid: wrong public key returns state=invalid", () => {
		const { privateKey } = makeKeyPair();
		const { publicKey: wrongPublicKey } = makeKeyPair();
		const payload = makePayload();
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, wrongPublicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.state).toBe("invalid");
	});

	it("invalid: corrupted signature string returns state=invalid", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload();
		const signed = createSignedLicense(payload, privateKey);
		const corrupted = { ...signed, signature: "AAAAAAAAAAAAAAAA" };
		const result = validateLicense(corrupted, publicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.state).toBe("invalid");
	});

	it("enterprise tier is preserved in active license", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ tier: "enterprise" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.tier).toBe("enterprise");
	});

	it("free tier license is valid and returns tier=free when active", () => {
		const { privateKey, publicKey } = makeKeyPair();
		const payload = makePayload({ tier: "free" });
		const signed = createSignedLicense(payload, privateKey);
		const result = validateLicense(signed, publicKey, new Date("2026-06-01T00:00:00Z"));
		expect(result.state).toBe("active");
		expect(result.tier).toBe("free");
	});
});

describe("LicenseCache", () => {
	it("caches validation result for TTL duration", async () => {
		const { LicenseCache } = await import("./license-engine.js");
		const cache = new LicenseCache(1000);
		const result = { state: "active" as const, tier: "pro" as const };
		cache.set(result, new Date("2026-01-01T00:00:00Z"));
		expect(cache.get(new Date("2026-01-01T00:00:00.500Z"))).toEqual(result);
	});

	it("returns null when TTL has elapsed", async () => {
		const { LicenseCache } = await import("./license-engine.js");
		const cache = new LicenseCache(1000);
		const result = { state: "active" as const, tier: "pro" as const };
		cache.set(result, new Date("2026-01-01T00:00:00Z"));
		expect(cache.get(new Date("2026-01-01T00:00:02Z"))).toBeNull();
	});

	it("returns null when never set", async () => {
		const { LicenseCache } = await import("./license-engine.js");
		const cache = new LicenseCache(1000);
		expect(cache.get(new Date())).toBeNull();
	});
});
