import type {
	GenerationContext,
	ILlmProvider,
	LlmProviderConfig,
	StepsGenerationContext,
	StepsGenerationResult,
	TestCaseSuggestion,
} from "./llm-provider.js";
import {
	STEPS_GENERATION_SYSTEM_PROMPT,
	TEST_CASE_GENERATION_SYSTEM_PROMPT,
	buildStepsUserPrompt,
	buildUserPrompt,
} from "./prompt-templates.js";
import { parseLlmResponse, parseStepsResponse } from "./test-case-schema.js";

const GENERATION_TIMEOUT_MS = 30000;

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

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

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
					max_tokens: 4000,
				}),
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeout);
		}

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
			choices?: Array<{ message?: { content?: string } }>;
		};

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

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

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
					max_tokens: 2000,
				}),
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeout);
		}

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

		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error("AI response could not be parsed, retry");
		}

		const steps = parseStepsResponse(content);
		const truncated = data.choices?.[0]?.finish_reason === "length";
		return { steps, truncated };
	}
}
