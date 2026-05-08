import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { IWebhookTokenService, WebhookToken } from "./token-service.js";
import { handleWebhookRequest } from "./webhook-handler.js";

const TOKEN: WebhookToken = {
	id: "tok-1",
	secret: "my-secret-key-abcdef",
	label: "Jenkins CI",
	adoPat: "pat123",
	orgUrl: "https://dev.azure.com/acme",
	project: "MyProject",
	planId: "42",
	environment: "CI",
	createdAt: "2026-01-01T00:00:00.000Z",
};

function makeSig(secret: string, body: Buffer): string {
	return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function makeTokenSvc(token: WebhookToken | undefined): IWebhookTokenService {
	return {
		create: vi.fn(),
		list: vi.fn(),
		get: vi.fn().mockResolvedValue(token),
		revoke: vi.fn(),
	} as unknown as IWebhookTokenService;
}

describe("handleWebhookRequest", () => {
	const body = Buffer.from("<testsuite><testcase name='a' classname='b'/></testsuite>");
	const validSig = makeSig(TOKEN.secret, body);
	const enqueue = vi.fn().mockResolvedValue(undefined);

	it("rejects if token not found", async () => {
		const result = await handleWebhookRequest(
			"missing",
			validSig,
			body,
			"application/xml",
			makeTokenSvc(undefined),
			enqueue
		);
		expect(result.status).toBe("rejected");
		expect(result).toMatchObject({ reason: "token_not_found" });
	});

	it("rejects if token is revoked", async () => {
		const revoked: WebhookToken = { ...TOKEN, revokedAt: "2026-02-01T00:00:00.000Z" };
		const result = await handleWebhookRequest(
			"tok-1",
			validSig,
			body,
			"application/xml",
			makeTokenSvc(revoked),
			enqueue
		);
		expect(result.status).toBe("rejected");
		expect(result).toMatchObject({ reason: "token_revoked" });
	});

	it("rejects if signature header is missing", async () => {
		const result = await handleWebhookRequest(
			"tok-1",
			undefined,
			body,
			"application/xml",
			makeTokenSvc(TOKEN),
			enqueue
		);
		expect(result.status).toBe("rejected");
		expect(result).toMatchObject({ reason: "missing_signature" });
	});

	it("rejects if signature is invalid", async () => {
		const result = await handleWebhookRequest(
			"tok-1",
			"sha256=badhash",
			body,
			"application/xml",
			makeTokenSvc(TOKEN),
			enqueue
		);
		expect(result.status).toBe("rejected");
		expect(result).toMatchObject({ reason: "invalid_signature" });
	});

	it("queues payload when token and signature are valid", async () => {
		const enq = vi.fn().mockResolvedValue(undefined);
		const result = await handleWebhookRequest(
			"tok-1",
			validSig,
			body,
			"application/xml",
			makeTokenSvc(TOKEN),
			enq
		);
		expect(result.status).toBe("queued");
		expect(enq).toHaveBeenCalledOnce();
	});

	it("enqueues base64-encoded body with tokenId and contentType", async () => {
		const enq = vi.fn().mockResolvedValue(undefined);
		await handleWebhookRequest(
			"tok-1",
			validSig,
			body,
			"application/xml",
			makeTokenSvc(TOKEN),
			enq
		);
		expect(enq).toHaveBeenCalledWith({
			tokenId: "tok-1",
			body: body.toString("base64"),
			contentType: "application/xml",
		});
	});
});
