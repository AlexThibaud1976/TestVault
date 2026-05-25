import {
	type GenerationContext,
	type ILlmProvider,
	type LlmProviderConfig,
	LlmTimeoutError,
	LlmTruncationError,
	MAX_TOKENS_DEFAULT,
	type StepsGenerationContext,
	type StepsGenerationResult,
	type TestCaseSuggestion,
	calculateTimeoutMs,
} from "./llm-provider.js";
import {
	STEPS_GENERATION_SYSTEM_PROMPT,
	TEST_CASE_GENERATION_SYSTEM_PROMPT,
	buildStepsUserPrompt,
	buildUserPrompt,
} from "./prompt-templates.js";
import { parseLlmResponse, parseStepsResponse } from "./test-case-schema.js";

/**
 * Normalize an Azure AI Foundry endpoint URL.
 * Accepts endpoints with or without trailing slash, with or without /openai/v1 suffix,
 * and with optional /api/projects/{project} prefix.
 * Returns a clean URL ending with /openai/v1 (no trailing slash).
 */
export function normalizeFoundryEndpoint(endpoint: string): string {
	let url = endpoint.trim();
	if (url.endsWith("/")) {
		url = url.slice(0, -1);
	}
	if (!url.endsWith("/openai/v1")) {
		if (!url.includes("/openai/v1")) {
			url = `${url}/openai/v1`;
		}
	}
	return url;
}

export class AzureAIFoundryProvider implements ILlmProvider {
	readonly name = "azure-ai-foundry";
	readonly displayName = "Azure AI Foundry";

	constructor(private readonly config: LlmProviderConfig) {}

	isConfigured(): boolean {
		return (
			!!this.config.apiKey &&
			this.config.apiKey.trim().length > 0 &&
			!!this.config.endpoint &&
			this.config.endpoint.trim().length > 0 &&
			!!this.config.deploymentName &&
			this.config.deploymentName.trim().length > 0
		);
	}

	async validateConfig(): Promise<{ valid: boolean; error?: string }> {
		if (!this.isConfigured()) {
			return { valid: false, error: "Missing apiKey, endpoint or deploymentName" };
		}
		const url = `${normalizeFoundryEndpoint(this.config.endpoint ?? "")}/chat/completions`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"api-key": this.config.apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.config.deploymentName,
					messages: [{ role: "user", content: "ping" }],
					max_tokens: 5,
				}),
			});
			if (!response.ok) {
				return { valid: false, error: `HTTP ${response.status} from Azure AI Foundry` };
			}
			return { valid: true };
		} catch (err) {
			return { valid: false, error: (err as Error).message };
		}
	}

	async generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]> {
		if (!this.isConfigured()) {
			throw new Error("Verify your API key in Settings");
		}

		const url = `${normalizeFoundryEndpoint(this.config.endpoint ?? "")}/chat/completions`;

		const maxTokens = this.config.maxTokens ?? MAX_TOKENS_DEFAULT;
		const timeoutMs = calculateTimeoutMs(this.config.maxTokens);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				headers: {
					"api-key": this.config.apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.config.deploymentName,
					messages: [
						{ role: "system", content: TEST_CASE_GENERATION_SYSTEM_PROMPT },
						{ role: "user", content: buildUserPrompt(context) },
					],
					response_format: { type: "json_object" },
					temperature: 0.7,
					max_tokens: maxTokens,
				}),
				signal: controller.signal,
			});
		} catch (err) {
			clearTimeout(timeout);
			if (err instanceof Error && err.name === "AbortError") {
				throw new LlmTimeoutError(
					`LLM call timed out after ${Math.round(timeoutMs / 1000)}s. Reduce Max Tokens in Settings or check network connectivity.`
				);
			}
			throw err;
		}
		clearTimeout(timeout);

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw new Error("Verify your API key in Settings");
			}
			if (response.status === 429) {
				throw new Error("Too many requests, retry in 60 seconds");
			}
			throw new Error(`Foundry API error: ${response.status}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
		};

		// Sprint 2.21 part 2 -- detect truncation BEFORE parsing JSON
		// (BCEE-QA bug 2026-05-22). See azure-openai-provider for the
		// detailed rationale -- Foundry shares the same OpenAI v1 envelope.
		if (data.choices?.[0]?.finish_reason === "length") {
			throw new LlmTruncationError(
				"Response truncated (max_tokens reached). Increase Max Tokens in Settings or request fewer test cases."
			);
		}

		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error("AI response could not be parsed, retry");
		}

		return parseLlmResponse(content);
	}

	async generateSteps(context: StepsGenerationContext): Promise<StepsGenerationResult> {
		if (!this.isConfigured()) {
			throw new Error("Verify your API key in Settings");
		}

		const url = `${normalizeFoundryEndpoint(this.config.endpoint ?? "")}/chat/completions`;

		const STEPS_DEFAULT = 2000;
		const maxTokens = this.config.maxTokens ?? STEPS_DEFAULT;
		const timeoutMs = calculateTimeoutMs(this.config.maxTokens);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				headers: {
					"api-key": this.config.apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.config.deploymentName,
					messages: [
						{ role: "system", content: STEPS_GENERATION_SYSTEM_PROMPT },
						{ role: "user", content: buildStepsUserPrompt(context) },
					],
					response_format: { type: "json_object" },
					temperature: 0.5,
					max_tokens: maxTokens,
				}),
				signal: controller.signal,
			});
		} catch (err) {
			clearTimeout(timeout);
			if (err instanceof Error && err.name === "AbortError") {
				throw new LlmTimeoutError(
					`LLM call timed out after ${Math.round(timeoutMs / 1000)}s. Reduce Max Tokens in Settings or check network connectivity.`
				);
			}
			throw err;
		}
		clearTimeout(timeout);

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw new Error("Verify your API key in Settings");
			}
			if (response.status === 429) {
				throw new Error("Too many requests, retry in 60 seconds");
			}
			throw new Error(`Foundry API error: ${response.status}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
		};

		const truncated = data.choices?.[0]?.finish_reason === "length";

		// Same hybrid contract as AzureOpenAIProvider.generateSteps: preserve
		// the Sprint 2.22 truncated:true return path when content is partial,
		// but throw LlmTruncationError when nothing usable came back.
		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			if (truncated) {
				throw new LlmTruncationError(
					"Response truncated (max_tokens reached). Increase Max Tokens in Settings or request fewer steps."
				);
			}
			throw new Error("AI response could not be parsed, retry");
		}

		const steps = parseStepsResponse(content);
		return { steps, truncated };
	}
}
