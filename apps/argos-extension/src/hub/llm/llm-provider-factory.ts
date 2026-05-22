import { AzureAIFoundryProvider } from "./azure-ai-foundry-provider.js";
import { AzureOpenAIProvider } from "./azure-openai-provider.js";
import type { ILlmProvider, LlmProviderConfig } from "./llm-provider.js";

interface ProviderMeta {
	id: string;
	displayName: string;
	endpointFormatHint: string;
	deploymentNameLabel: string;
	deploymentNameHint: string;
}

const AVAILABLE_PROVIDERS: ProviderMeta[] = [
	{
		id: "azure-openai",
		displayName: "Azure OpenAI Service (classic)",
		endpointFormatHint: "https://[name].openai.azure.com",
		deploymentNameLabel: "Deployment Name",
		deploymentNameHint: "Name of your deployment in Azure OpenAI Studio",
	},
	{
		id: "azure-ai-foundry",
		displayName: "Azure AI Foundry",
		endpointFormatHint: "https://[name].services.ai.azure.com/openai/v1",
		deploymentNameLabel: "Model Name",
		deploymentNameHint: "Model name as deployed in Foundry (e.g. gpt-4o-mini)",
	},
];

export const LlmProviderFactory = {
	create(config: LlmProviderConfig): ILlmProvider {
		switch (config.provider) {
			case "azure-openai":
				return new AzureOpenAIProvider(config);
			case "azure-ai-foundry":
				return new AzureAIFoundryProvider(config);
			default:
				throw new Error(
					`Unknown LLM provider: "${config.provider}". Supported: azure-openai, azure-ai-foundry`
				);
		}
	},

	listAvailableProviders(): ProviderMeta[] {
		return AVAILABLE_PROVIDERS;
	},
};
