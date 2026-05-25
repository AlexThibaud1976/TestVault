import { LlmProviderFactory } from "../llm/llm-provider-factory.js";
import type {
	GenerationContext,
	LlmProviderConfig,
	StepsGenerationContext,
	StepsGenerationResult,
	TestCaseSuggestion,
} from "../llm/llm-provider.js";

export interface IAiGenerationService {
	generate(config: LlmProviderConfig, context: GenerationContext): Promise<TestCaseSuggestion[]>;
	// Sprint 2.22 T-2.22.2: steps-only generation for the "AI Suggest Steps"
	// button. Does NOT create any WIT; the caller updates local form state only.
	generateSteps(
		config: LlmProviderConfig,
		context: StepsGenerationContext
	): Promise<StepsGenerationResult>;
}

export function createAiGenerationService(): IAiGenerationService {
	return {
		async generate(
			config: LlmProviderConfig,
			context: GenerationContext
		): Promise<TestCaseSuggestion[]> {
			const provider = LlmProviderFactory.create(config);
			if (!provider.isConfigured()) {
				throw new Error("Verify your API key in Settings");
			}
			return provider.generateTestCases(context);
		},
		async generateSteps(
			config: LlmProviderConfig,
			context: StepsGenerationContext
		): Promise<StepsGenerationResult> {
			const provider = LlmProviderFactory.create(config);
			if (!provider.isConfigured()) {
				throw new Error("Verify your API key in Settings");
			}
			return provider.generateSteps(context);
		},
	};
}
