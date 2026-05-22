export type LlmProviderType =
	| "azure-openai"
	| "azure-ai-foundry"
	| "anthropic"
	| "openai"
	| "mistral";

export interface LlmProviderConfig {
	provider: LlmProviderType;
	apiKey: string;
	endpoint?: string;
	deploymentName?: string;
	model?: string;
}

export interface TestCaseSuggestion {
	title: string;
	description: string;
	priority: "P1" | "P2" | "P3" | "P4";
	steps: Array<{
		action: string;
		expected: string;
	}>;
	tags: string[];
	coverage_type: "happy_path" | "edge_case" | "error_case" | "acceptance_criterion";
}

export interface GenerationContext {
	sourceWorkItem: {
		id: number;
		type: string;
		title: string;
		description: string;
		acceptanceCriteria?: string;
	};
	targetCount?: number;
	coverageTypes?: string[];
}

export interface ILlmProvider {
	readonly name: string;
	readonly displayName: string;

	isConfigured(): boolean;
	validateConfig(): Promise<{ valid: boolean; error?: string }>;
	generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]>;
}
