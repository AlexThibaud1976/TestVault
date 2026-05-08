import {
	type HttpRequest,
	type HttpResponseInit,
	type InvocationContext,
	app,
} from "@azure/functions";
import { z } from "zod";
import type { ILlmClient } from "../shared/llm-client.js";
import type { IQuotaStore } from "../shared/quota.js";
import { handleGenerateTestCases } from "./generate-test-cases.js";
import type { IProviderConfigStore } from "./generate-test-cases.js";

const RequestSchema = z.object({
	orgUrl: z.string().url(),
	userId: z.string().min(1),
	providerId: z.string().min(1),
	workItemTitle: z.string().min(1),
	workItemDescription: z.string(),
	params: z
		.object({
			temperature: z.number().min(0).max(1).default(0.3),
			maxTokens: z.number().int().positive().default(4000),
			count: z.number().int().min(1).max(10).default(5),
		})
		.default({}),
	systemPromptOverride: z.string().optional(),
});

let _providerStore: IProviderConfigStore | undefined;
let _quotaStore: IQuotaStore | undefined;
let _llmClient: ILlmClient | undefined;
let _masterKey: Buffer | undefined;

export function setLlmServices(
	providerStore: IProviderConfigStore,
	quotaStore: IQuotaStore,
	llmClient: ILlmClient,
	masterKey: Buffer
): void {
	_providerStore = providerStore;
	_quotaStore = quotaStore;
	_llmClient = llmClient;
	_masterKey = masterKey;
}

async function generateTestCasesHandler(
	req: HttpRequest,
	_ctx: InvocationContext
): Promise<HttpResponseInit> {
	if (!_providerStore || !_quotaStore || !_llmClient || !_masterKey) {
		return { status: 503, jsonBody: { error: "Service not configured" } };
	}
	let body: z.infer<typeof RequestSchema>;
	try {
		body = RequestSchema.parse(await req.json());
	} catch {
		return { status: 400, jsonBody: { error: "Invalid request body" } };
	}

	const result = await handleGenerateTestCases(
		body,
		_providerStore,
		_quotaStore,
		_llmClient,
		_masterKey
	);
	return {
		status: result.status,
		jsonBody:
			result.status === 200
				? { candidates: result.candidates, quotaRemaining: result.quotaRemaining }
				: { error: result.error },
	};
}

app.http("generateTestCases", {
	methods: ["POST"],
	route: "v1/llm/generate-test-cases",
	authLevel: "anonymous",
	handler: generateTestCasesHandler,
});
