import { decryptApiKey } from "../shared/crypto.js";
import type { EncryptedApiKey } from "../shared/crypto.js";
import {
	type ILlmClient,
	type LlmProviderType,
	type TcCandidate,
	buildGenerationMessages,
	parseCandidates,
} from "../shared/llm-client.js";
import { type IQuotaStore, checkAndDecrementQuota } from "../shared/quota.js";

export interface ProviderConfig {
	id: string;
	type: LlmProviderType;
	modelId: string;
	apiKeyEncrypted: EncryptedApiKey;
	baseUrl?: string;
}

export interface IProviderConfigStore {
	get(orgUrl: string, providerId: string): Promise<ProviderConfig | undefined>;
}

export interface LlmGenerateRequest {
	orgUrl: string;
	userId: string;
	providerId: string;
	workItemTitle: string;
	workItemDescription: string;
	params: {
		temperature: number;
		maxTokens: number;
		count: number;
	};
	systemPromptOverride?: string;
}

export interface LlmGenerateResult {
	status: 200 | 400 | 402 | 404 | 502;
	candidates?: TcCandidate[];
	quotaRemaining?: number;
	error?: string;
}

export async function handleGenerateTestCases(
	request: LlmGenerateRequest,
	providerStore: IProviderConfigStore,
	quotaStore: IQuotaStore,
	llmClient: ILlmClient,
	masterKey: Buffer
): Promise<LlmGenerateResult> {
	const { orgUrl, userId, providerId, workItemTitle, workItemDescription, params } = request;

	if (workItemDescription.length < 50) {
		return { status: 400, error: "Work item description too short (minimum 50 characters)" };
	}

	const quota = await checkAndDecrementQuota({
		orgUrl,
		userId,
		feature: "tc-generation",
		store: quotaStore,
	});
	if (!quota.allowed) {
		return { status: 402, error: "QUOTA_EXCEEDED" };
	}

	const provider = await providerStore.get(orgUrl, providerId);
	if (!provider) {
		return { status: 404, error: `Provider '${providerId}' not found` };
	}

	const apiKey = decryptApiKey(provider.apiKeyEncrypted, orgUrl, masterKey);
	try {
		const messages = buildGenerationMessages(
			workItemTitle,
			workItemDescription,
			params.count,
			request.systemPromptOverride
		);

		let candidates: TcCandidate[] | undefined;
		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await llmClient.call({
				provider: provider.type,
				apiKey,
				modelId: provider.modelId,
				messages,
				params: { temperature: params.temperature, maxTokens: params.maxTokens },
				baseUrl: provider.baseUrl,
			});
			try {
				candidates = parseCandidates(response.content);
				break;
			} catch {
				if (attempt === 1) {
					return { status: 502, error: "LLM returned malformed response after retry" };
				}
			}
		}

		return {
			status: 200,
			candidates: candidates ?? [],
			quotaRemaining: quota.remaining,
		};
	} finally {
		apiKey.fill(0);
	}
}
