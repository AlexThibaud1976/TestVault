import { createHmac, timingSafeEqual } from "node:crypto";
import type { IWebhookTokenService } from "./token-service.js";

export type QueuePayload = {
	tokenId: string;
	body: string; // base64-encoded raw body
	contentType: string;
};

export type WebhookHandleResult =
	| { status: "queued"; tokenId: string }
	| { status: "rejected"; reason: string };

function validateHmacSignature(secret: string, body: Buffer, signature: string): boolean {
	const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
	try {
		return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
	} catch {
		return false;
	}
}

export async function handleWebhookRequest(
	tokenId: string,
	signature: string | undefined,
	body: Buffer,
	contentType: string,
	tokenService: IWebhookTokenService,
	enqueue: (payload: QueuePayload) => Promise<void>
): Promise<WebhookHandleResult> {
	const token = await tokenService.get(tokenId);
	if (!token) return { status: "rejected", reason: "token_not_found" };
	if (token.revokedAt) return { status: "rejected", reason: "token_revoked" };

	if (!signature) return { status: "rejected", reason: "missing_signature" };
	if (!validateHmacSignature(token.secret, body, signature)) {
		return { status: "rejected", reason: "invalid_signature" };
	}

	const payload: QueuePayload = {
		tokenId,
		body: body.toString("base64"),
		contentType,
	};
	await enqueue(payload);
	return { status: "queued", tokenId };
}
