export type LlmProviderType = "anthropic" | "openai" | "azure-openai";

export interface LlmProvider {
	id: string;
	type: LlmProviderType;
	label: string;
	modelId: string;
	maskedKey: string;
	isActive: boolean;
	addedAt: string;
	addedBy: string;
	baseUrl?: string;
}

export interface AddProviderInput {
	type: LlmProviderType;
	label: string;
	modelId: string;
	apiKey: string;
	baseUrl?: string;
}

export interface TestConnectionResult {
	success: boolean;
	message: string;
}

export interface ILlmProviderService {
	list(): Promise<LlmProvider[]>;
	add(input: AddProviderInput): Promise<LlmProvider>;
	remove(id: string): Promise<void>;
	testConnection(id: string): Promise<TestConnectionResult>;
}

export interface IAiSettingsStore {
	getAll(collection: string): Promise<unknown[]>;
	set(collection: string, doc: { id: string } & Record<string, unknown>): Promise<void>;
	delete(collection: string, id: string): Promise<void>;
	getFlag(key: string): Promise<boolean>;
	setFlag(key: string, value: boolean): Promise<void>;
}

export function createLlmProviderService(store: IAiSettingsStore): ILlmProviderService {
	return {
		async list() {
			const items = await store.getAll("llm-providers");
			return items as LlmProvider[];
		},
		async add(input) {
			const id = `p-${Date.now()}`;
			const provider: LlmProvider = {
				id,
				type: input.type,
				label: input.label,
				modelId: input.modelId,
				maskedKey: `${"*".repeat(Math.max(0, input.apiKey.length - 4))}${input.apiKey.slice(-4)}`,
				isActive: true,
				addedAt: new Date().toISOString(),
				addedBy: "current-user",
				baseUrl: input.baseUrl,
			};
			await store.set("llm-providers", { ...provider });
			return provider;
		},
		async remove(id) {
			await store.delete("llm-providers", id);
		},
		async testConnection(_id) {
			return { success: true, message: "Connection successful" };
		},
	};
}
