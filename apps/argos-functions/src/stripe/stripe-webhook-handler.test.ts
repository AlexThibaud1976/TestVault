import { describe, expect, it, vi } from "vitest";
import { handleStripeWebhook } from "./stripe-webhook-handler.js";
import type {
	ILicenseStore,
	IStripeSignatureVerifier,
	StoredLicense,
	StripeSubscriptionEvent,
} from "./stripe-webhook-handler.js";

function makeVerifier(valid = true): IStripeSignatureVerifier {
	return { verify: vi.fn().mockReturnValue(valid) };
}

function makeLicenseStore(): ILicenseStore {
	return {
		get: vi.fn().mockResolvedValue(undefined),
		set: vi.fn().mockResolvedValue(undefined),
		revoke: vi.fn().mockResolvedValue(undefined),
	};
}

function makeEvent(
	type: StripeSubscriptionEvent["type"],
	overrides?: Partial<StripeSubscriptionEvent["data"]["object"]>
): string {
	const event: StripeSubscriptionEvent = {
		type,
		data: {
			object: {
				id: "sub_123",
				status: "active",
				metadata: { orgUrl: "https://dev.azure.com/acme", tier: "pro" },
				current_period_end: 1893456000,
				...overrides,
			},
		},
	};
	return JSON.stringify(event);
}

describe("handleStripeWebhook", () => {
	it("throws when signature verification fails", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(false);
		await expect(
			handleStripeWebhook(
				makeEvent("customer.subscription.created"),
				"bad-sig",
				"secret",
				verifier,
				store
			)
		).rejects.toThrow("Invalid Stripe webhook signature");
	});

	it("subscription.created → activates license with correct orgUrl and tier", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		const result = await handleStripeWebhook(
			makeEvent("customer.subscription.created"),
			"sig",
			"secret",
			verifier,
			store
		);
		expect(result.action).toBe("activated");
		expect(result.handled).toBe(true);
		expect(result.orgUrl).toBe("https://dev.azure.com/acme");
		expect(vi.mocked(store.set)).toHaveBeenCalledWith(
			"https://dev.azure.com/acme",
			expect.objectContaining({ tier: "pro", status: "active" })
		);
	});

	it("subscription.updated → updates license", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		const result = await handleStripeWebhook(
			makeEvent("customer.subscription.updated", {
				metadata: { orgUrl: "https://dev.azure.com/acme", tier: "enterprise" },
			}),
			"sig",
			"secret",
			verifier,
			store
		);
		expect(result.action).toBe("updated");
	});

	it("subscription.deleted → revokes license", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		const result = await handleStripeWebhook(
			makeEvent("customer.subscription.deleted", { status: "canceled" }),
			"sig",
			"secret",
			verifier,
			store
		);
		expect(result.action).toBe("revoked");
		expect(vi.mocked(store.revoke)).toHaveBeenCalledWith("https://dev.azure.com/acme");
	});

	it("past_due subscription stores status=past_due", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		await handleStripeWebhook(
			makeEvent("customer.subscription.updated", { status: "past_due" }),
			"sig",
			"secret",
			verifier,
			store
		);
		expect(vi.mocked(store.set)).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ status: "past_due" })
		);
	});

	it("event without orgUrl metadata returns skipped", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		const event: StripeSubscriptionEvent = {
			type: "customer.subscription.created",
			data: {
				object: {
					id: "sub_456",
					status: "active",
					metadata: { orgUrl: "", tier: "pro" },
					current_period_end: 1893456000,
				},
			},
		};
		const result = await handleStripeWebhook(
			JSON.stringify(event),
			"sig",
			"secret",
			verifier,
			store
		);
		expect(result.action).toBe("skipped");
		expect(result.handled).toBe(false);
	});

	it("currentPeriodEnd is stored as ISO string", async () => {
		const store = makeLicenseStore();
		const verifier = makeVerifier(true);
		await handleStripeWebhook(
			makeEvent("customer.subscription.created", { current_period_end: 1893456000 }),
			"sig",
			"secret",
			verifier,
			store
		);
		const setCall = vi.mocked(store.set).mock.calls[0];
		const stored = setCall?.[1] as StoredLicense;
		expect(stored.currentPeriodEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
