import type { LicenseTier } from "../license/license-engine.js";

export type StripeEventType =
	| "customer.subscription.created"
	| "customer.subscription.updated"
	| "customer.subscription.deleted";

export interface StripeSubscriptionEvent {
	type: StripeEventType;
	data: {
		object: {
			id: string;
			status: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
			metadata: {
				orgUrl: string;
				tier: LicenseTier;
			};
			current_period_end: number;
		};
	};
}

export interface StoredLicense {
	orgUrl: string;
	tier: LicenseTier;
	stripeSubscriptionId: string;
	status: "active" | "canceled" | "past_due";
	currentPeriodEnd: string;
}

export interface ILicenseStore {
	get(orgUrl: string): Promise<StoredLicense | undefined>;
	set(orgUrl: string, license: StoredLicense): Promise<void>;
	revoke(orgUrl: string): Promise<void>;
}

export interface IStripeSignatureVerifier {
	verify(payload: string, signature: string, secret: string): boolean;
}

export interface StripeWebhookResult {
	handled: boolean;
	action: "activated" | "updated" | "revoked" | "skipped";
	orgUrl?: string;
}

export async function handleStripeWebhook(
	rawBody: string,
	signature: string,
	webhookSecret: string,
	verifier: IStripeSignatureVerifier,
	licenseStore: ILicenseStore
): Promise<StripeWebhookResult> {
	if (!verifier.verify(rawBody, signature, webhookSecret)) {
		throw new Error("Invalid Stripe webhook signature");
	}

	const event = JSON.parse(rawBody) as StripeSubscriptionEvent;
	const sub = event.data.object;
	const { orgUrl, tier } = sub.metadata;

	if (!orgUrl || !tier) {
		return { handled: false, action: "skipped" };
	}

	if (event.type === "customer.subscription.deleted" || sub.status === "canceled") {
		await licenseStore.revoke(orgUrl);
		return { handled: true, action: "revoked", orgUrl };
	}

	if (
		event.type === "customer.subscription.created" ||
		event.type === "customer.subscription.updated"
	) {
		const storedStatus =
			sub.status === "active" || sub.status === "trialing"
				? "active"
				: sub.status === "past_due"
					? "past_due"
					: "canceled";

		await licenseStore.set(orgUrl, {
			orgUrl,
			tier,
			stripeSubscriptionId: sub.id,
			status: storedStatus,
			currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
		});

		const action = event.type === "customer.subscription.created" ? "activated" : "updated";
		return { handled: true, action, orgUrl };
	}

	return { handled: false, action: "skipped" };
}
