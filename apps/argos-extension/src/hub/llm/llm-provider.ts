export type LlmProviderType =
	| "azure-openai"
	| "azure-ai-foundry"
	| "anthropic"
	| "openai"
	| "mistral";

// Sprint 2.21 part 2 CHECKPOINT C -- max_tokens configuration constants.
// The slider in Settings -> Advanced lets users pick a value in
// [MAX_TOKENS_MIN, MAX_TOKENS_MAX] by steps of MAX_TOKENS_STEP. When the
// user has never opened Advanced (or a Sprint 2.21 part 1 / 2.21.1 config
// was persisted before this sprint), maxTokens is undefined and the
// providers fall back to MAX_TOKENS_DEFAULT.
export const MAX_TOKENS_DEFAULT = 4000;
export const MAX_TOKENS_MIN = 1000;
export const MAX_TOKENS_MAX = 16000;
export const MAX_TOKENS_STEP = 1000;

// Heuristic for the UI preview "X tokens -> ~Y test cases". ADDENDUM
// B-bis.1 estimates ~700 tokens per generated Test Case (title +
// description + ~5 steps + tags + envelope).
export const TOKENS_PER_TEST_CASE = 700;

export interface LlmProviderConfig {
	provider: LlmProviderType;
	apiKey: string;
	endpoint?: string;
	deploymentName?: string;
	model?: string;
	// Sprint 2.21 part 2 CHECKPOINT C -- optional. Configs persisted before
	// this sprint do NOT have this field and must keep working (fallback to
	// MAX_TOKENS_DEFAULT in the provider).
	maxTokens?: number;
}

/**
 * Compute the AbortController deadline for an LLM call as a function of
 * max_tokens. Formula: (maxTokens / 10 tokens/sec) * 1500ms (+50% safety
 * margin), clamped to [30_000ms, 300_000ms].
 *
 * The formula is intentionally conservative: most real calls will land on
 * the upper bound (300s). We prefer over-provisioning the deadline over
 * cutting a slow generation mid-flight.
 *
 * @param maxTokens optional, defaults to MAX_TOKENS_DEFAULT
 */
export function calculateTimeoutMs(maxTokens?: number): number {
	const tokens = maxTokens ?? MAX_TOKENS_DEFAULT;
	const estimatedSeconds = tokens / 10;
	const withMarginMs = estimatedSeconds * 1500;
	return Math.max(30_000, Math.min(300_000, withMarginMs));
}

/**
 * UI heuristic: estimated number of Test Cases generable with a given
 * max_tokens budget. Read by MaxTokensSlider to render the live "~5 test
 * cases" preview next to the slider value.
 */
export function estimateTestCasesCount(maxTokens: number): number {
	return Math.floor(maxTokens / TOKENS_PER_TEST_CASE);
}

/**
 * Thrown by a provider when the LLM response indicates truncation
 * (choices[0].finish_reason === "length"). The UI surfaces this as a
 * clear "Increase Max Tokens or request fewer test cases" message
 * instead of leaking the raw "AI response could not be parsed" error
 * that occurred before Sprint 2.21 part 2 (BCEE-QA bug 2026-05-22).
 */
export class LlmTruncationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmTruncationError";
	}
}

/**
 * Thrown by a provider when its fetch is aborted by the AbortController
 * deadline computed via calculateTimeoutMs(). Distinct from a generic
 * AbortError so the UI can show a targeted "reduce Max Tokens or check
 * connectivity" hint.
 */
export class LlmTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmTimeoutError";
	}
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
