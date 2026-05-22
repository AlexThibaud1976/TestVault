import { LlmProviderFactory } from "../llm/llm-provider-factory.js";
import type {
	GenerationContext,
	LlmProviderConfig,
	TestCaseSuggestion,
} from "../llm/llm-provider.js";

export interface IAiGenerationService {
	generate(config: LlmProviderConfig, context: GenerationContext): Promise<TestCaseSuggestion[]>;
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
	};
}
