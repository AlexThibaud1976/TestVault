import {
	type HttpRequest,
	type HttpResponseInit,
	type InvocationContext,
	app,
} from "@azure/functions";
import { handleStripeWebhook } from "./stripe-webhook-handler.js";
import type { ILicenseStore, IStripeSignatureVerifier } from "./stripe-webhook-handler.js";

let _licenseStore: ILicenseStore | undefined;
let _verifier: IStripeSignatureVerifier | undefined;

export function setStripeServices(store: ILicenseStore, verifier: IStripeSignatureVerifier): void {
	_licenseStore = store;
	_verifier = verifier;
}

async function stripeWebhookHandler(
	req: HttpRequest,
	ctx: InvocationContext
): Promise<HttpResponseInit> {
	if (!_licenseStore || !_verifier) {
		return { status: 503, jsonBody: { error: "Service not configured" } };
	}

	const signature = req.headers.get("Stripe-Signature") ?? "";
	const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
	const rawBody = await req.text();

	try {
		const result = await handleStripeWebhook(rawBody, signature, secret, _verifier, _licenseStore);
		return { status: 200, jsonBody: result };
	} catch (err) {
		ctx.warn(`Stripe webhook rejected: ${err instanceof Error ? err.message : "unknown"}`);
		return { status: 400, jsonBody: { error: "Webhook verification failed" } };
	}
}

app.http("stripeWebhook", {
	methods: ["POST"],
	route: "v1/webhooks/stripe",
	authLevel: "anonymous",
	handler: stripeWebhookHandler,
});
