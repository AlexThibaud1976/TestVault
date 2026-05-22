import { AzureOpenAIProvider } from "./azure-openai-provider.js";
import type { ILlmProvider, LlmProviderConfig } from "./llm-provider.js";

export const LlmProviderFactory = {
	create(config: LlmProviderConfig): ILlmProvider {
		switch (config.provider) {
			case "azure-openai":
				return new AzureOpenAIProvider(config);
			default:
				throw new Error(`Unknown LLM provider: "${config.provider}". Supported: azure-openai`);
		}
	},
};
