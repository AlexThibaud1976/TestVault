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

const API_VERSION = "2024-02-01";

export class AzureOpenAIProvider implements ILlmProvider {
	readonly name = "azure-openai";
	readonly displayName = "Azure OpenAI";

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
		const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${API_VERSION}`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"api-key": this.config.apiKey,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages: [{ role: "user", content: "ping" }],
					max_tokens: 5,
				}),
			});
			if (!response.ok) {
				return { valid: false, error: `HTTP ${response.status} from Azure OpenAI` };
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

		const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${API_VERSION}`;

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
			throw new Error(`LLM API error: ${response.status}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
		};

		// Sprint 2.21 part 2 -- detect truncation BEFORE parsing JSON.
		// finish_reason='length' means the model hit max_tokens; the JSON
		// envelope is necessarily incomplete and parseLlmResponse would
		// throw the opaque "AI response could not be parsed" we want to
		// avoid (BCEE-QA bug 2026-05-22).
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

		const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${API_VERSION}`;

		// Steps generation uses a smaller budget than full Test Case generation:
		// ~700 tokens cover ~5 steps. We default to 2000 (about 15 steps max)
		// and let the user override via config.maxTokens (cap at 16000 from the
		// slider). Timeout adapts to the chosen value.
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
			throw new Error(`LLM API error: ${response.status}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
		};

		const truncated = data.choices?.[0]?.finish_reason === "length";

		// For steps generation we keep the historical "truncated:true" return
		// path (the modal shows a toast) AND we also surface
		// LlmTruncationError when no usable content came back at all. This
		// preserves the Sprint 2.22 behaviour while aligning with the
		// stricter Sprint 2.21 part 2 contract for generateTestCases.
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
