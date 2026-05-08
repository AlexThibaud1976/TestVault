import { app, output } from "@azure/functions";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { processQueueMessage } from "./queue-processor.js";
import type { IWebhookTokenService } from "./token-service.js";
import { handleWebhookRequest } from "./webhook-handler.js";
import type { QueuePayload } from "./webhook-handler.js";

// tokenService is injected at startup from functions host bootstrap
let _tokenService: IWebhookTokenService;
export function setTokenService(svc: IWebhookTokenService): void {
	_tokenService = svc;
}

async function webhookHttpTrigger(
	request: HttpRequest,
	context: InvocationContext
): Promise<HttpResponseInit> {
	const tokenId = request.params.tokenId;
	if (!tokenId) return { status: 400, body: "Missing token" };

	const signature = request.headers.get("x-hub-signature-256") ?? undefined;
	const bodyBuffer = Buffer.from(await request.arrayBuffer());
	const contentType = request.headers.get("content-type") ?? "application/xml";

	const enqueue = async (payload: QueuePayload) => {
		context.extraOutputs.set(webhookQueueOutput, JSON.stringify(payload));
	};

	const result = await handleWebhookRequest(
		tokenId,
		signature,
		bodyBuffer,
		contentType,
		_tokenService,
		enqueue
	);

	if (result.status === "rejected") {
		context.warn(`Webhook rejected: ${result.reason}`);
		return { status: 401, jsonBody: result };
	}
	return { status: 202, jsonBody: result };
}

const webhookQueueOutput = output.storageQueue({
	queueName: "testvault-webhook-payloads",
	connection: "AzureWebJobsStorage",
});

app.http("webhookIngest", {
	methods: ["POST"],
	authLevel: "anonymous",
	route: "v1/webhooks/{tokenId}",
	extraOutputs: [webhookQueueOutput],
	handler: webhookHttpTrigger,
});

app.storageQueue("webhookQueueProcessor", {
	queueName: "testvault-webhook-payloads",
	connection: "AzureWebJobsStorage",
	handler: async (message: unknown) => {
		const payload = JSON.parse(String(message)) as QueuePayload;
		await processQueueMessage(payload, _tokenService);
	},
});
