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

// Sprint 2.22 T-2.22.2 -- "AI Suggest Steps" (US-5.1.1)
// Steps-only generation: NO Test Case WIT creation, only fills the Steps
// section of the current TestCaseFormView state. Context = current form fields
// plus optionally linked Work Items (User Story / Bug / Requirement).
export interface StepsGenerationContext {
	testCase: {
		title?: string;
		description?: string;
		tags?: string[];
		priority?: 1 | 2 | 3 | 4;
		areaPath?: string;
	};
	linkedWorkItems?: Array<{
		id: number;
		type: string;
		title: string;
		description?: string;
		acceptanceCriteria?: string;
	}>;
	targetCount?: number;
}

export interface TestStepSuggestion {
	action: string;
	expected: string;
}

export interface StepsGenerationResult {
	steps: TestStepSuggestion[];
	truncated: boolean; // true when LLM finish_reason === "length"
}

export interface ILlmProvider {
	readonly name: string;
	readonly displayName: string;

	isConfigured(): boolean;
	validateConfig(): Promise<{ valid: boolean; error?: string }>;
	generateTestCases(context: GenerationContext): Promise<TestCaseSuggestion[]>;
	generateSteps(context: StepsGenerationContext): Promise<StepsGenerationResult>;
}
