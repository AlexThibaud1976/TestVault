import { sign, verify } from "node:crypto";

export type LicenseTier = "free" | "pro" | "enterprise";
export type LicenseState = "active" | "expired" | "invalid" | "offline-grace";

export interface LicensePayload {
	version: 1;
	orgUrl: string;
	tier: LicenseTier;
	issuedAt: string;
	expiresAt: string;
}

export interface SignedLicense {
	payload: LicensePayload;
	signature: string;
}

export interface LicenseValidationResult {
	state: LicenseState;
	tier: LicenseTier;
	gracePeriodEnds?: string;
}

export function createSignedLicense(payload: LicensePayload, privateKeyPem: string): SignedLicense {
	const data = Buffer.from(JSON.stringify(payload));
	const sig = sign(null, data, privateKeyPem);
	return { payload, signature: sig.toString("base64") };
}

export function validateLicense(
	license: SignedLicense,
	publicKeyPem: string,
	now: Date = new Date(),
	gracePeriodDays = 7
): LicenseValidationResult {
	let valid: boolean;
	try {
		valid = verify(
			null,
			Buffer.from(JSON.stringify(license.payload)),
			publicKeyPem,
			Buffer.from(license.signature, "base64")
		);
	} catch {
		return { state: "invalid", tier: "free" };
	}

	if (!valid) return { state: "invalid", tier: "free" };

	const expiresAt = new Date(license.payload.expiresAt);
	if (now <= expiresAt) {
		return { state: "active", tier: license.payload.tier };
	}

	const graceEnd = new Date(expiresAt);
	graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
	if (now <= graceEnd) {
		return {
			state: "offline-grace",
			tier: license.payload.tier,
			gracePeriodEnds: graceEnd.toISOString(),
		};
	}

	return { state: "expired", tier: "free" };
}

export class LicenseCache {
	private cachedAt: Date | null = null;
	private cachedResult: LicenseValidationResult | null = null;

	constructor(private readonly ttlMs: number) {}

	get(now: Date): LicenseValidationResult | null {
		if (!this.cachedAt || !this.cachedResult) return null;
		if (now.getTime() - this.cachedAt.getTime() >= this.ttlMs) return null;
		return this.cachedResult;
	}

	set(result: LicenseValidationResult, now: Date): void {
		this.cachedAt = now;
		this.cachedResult = result;
	}
}

export const CLOUD_VALIDATION_TTL_MS = 24 * 60 * 60 * 1000;
export const SERVER_VALIDATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
