import type { IExtensionDataClient } from "@atconseil/argos-sdk";
import type { LlmProviderConfig } from "../llm/llm-provider.js";

const LLM_CONFIG_KEY = "argos:llm:active-config";

export interface ILlmConfigService {
	getConfig(): Promise<LlmProviderConfig | null>;
	setConfig(config: LlmProviderConfig): Promise<void>;
	clearConfig(): Promise<void>;
}

export function createLlmConfigService(dataClient: IExtensionDataClient): ILlmConfigService {
	return {
		async getConfig(): Promise<LlmProviderConfig | null> {
			const value = await dataClient.getValue<LlmProviderConfig>(LLM_CONFIG_KEY);
			return value ?? null;
		},

		async setConfig(config: LlmProviderConfig): Promise<void> {
			await dataClient.setValue(LLM_CONFIG_KEY, config);
		},

		async clearConfig(): Promise<void> {
			await dataClient.setValue(LLM_CONFIG_KEY, null as unknown as LlmProviderConfig);
		},
	};
}
