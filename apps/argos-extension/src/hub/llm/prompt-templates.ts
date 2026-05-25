import type { GenerationContext, StepsGenerationContext } from "./llm-provider.js";

export const TEST_CASE_GENERATION_SYSTEM_PROMPT = `You are an expert QA test engineer assistant. Your role is to analyze user stories and generate comprehensive test cases.

For each user story, generate test cases that cover:
- Happy path scenarios (main success flow)
- Edge cases (boundary conditions, unusual inputs)
- Error cases (failure scenarios, exception handling)
- Each acceptance criterion explicitly

Output format: JSON object with this exact structure:
{
  "test_cases": [
    {
      "title": "Short descriptive title",
      "description": "What this test verifies",
      "priority": "P1",
      "steps": [
        { "action": "Step description", "expected": "Expected outcome" }
      ],
      "tags": ["@tag1", "@tag2"],
      "coverage_type": "happy_path"
    }
  ]
}

Valid priority values: P1 (critical), P2 (high), P3 (medium), P4 (low).
Valid coverage_type values: happy_path, edge_case, error_case, acceptance_criterion.

Guidelines:
- Generate 5-7 test cases per user story (configurable via context)
- Each test case must be actionable and verifiable
- Steps must be clear and concise (max 7 steps per test case)
- Tags help categorize (e.g., @auth, @payment, @ui)
- Never invent functionality not in the user story
- Focus on what to test, not how to implement
- Return ONLY the JSON object, no additional text`;

export function buildUserPrompt(context: GenerationContext): string {
	const { sourceWorkItem, targetCount } = context;
	const count = targetCount ?? 5;

	let prompt = `Generate ${count} test cases for the following ${sourceWorkItem.type}:

ID: ${sourceWorkItem.id}
Title: ${sourceWorkItem.title}

Description:
${sourceWorkItem.description || "(no description provided)"}
`;

	if (sourceWorkItem.acceptanceCriteria) {
		prompt += `
Acceptance Criteria:
${sourceWorkItem.acceptanceCriteria}
`;
	}

	prompt += `
Return ONLY the JSON object with the test_cases array, no additional text.`;

	return prompt;
}

// =============================================================================
// Sprint 2.22 T-2.22.2 -- Steps-only generation prompt
// Used by ILlmProvider.generateSteps() for the "AI Suggest Steps" button
// in TestCaseFormView. Does NOT generate title/description/tags/coverage_type.
// =============================================================================

export const STEPS_GENERATION_SYSTEM_PROMPT = `You are an expert QA test engineer assistant. Your role is to draft a sequence of test steps for an existing Test Case that the user is currently editing.

You MUST output ONLY a list of test steps in {action, expected} pairs. Do NOT generate or suggest a Test Case title, description, tags, priority or any other Test Case-level metadata. The Test Case already exists -- you are only filling its Steps section.

Output format: JSON object with this exact structure:
{
  "steps": [
    { "action": "Step description, imperative", "expected": "Expected outcome, observable" }
  ]
}

Guidelines:
- Generate the requested number of steps (default 5, range 1-15).
- Each step must be atomic, actionable, and have a verifiable expected outcome.
- Cover the happy path first, then edge cases or error scenarios where relevant.
- Be concise: each action and each expected one to two short sentences.
- Use the Test Case title and description as the primary intent.
- Use linked Work Items (User Story / Bug / Requirement) for domain context only -- do not test them, test the current Test Case.
- Never invent functionality not implied by the inputs.
- Return ONLY the JSON object, no additional text.`;

export function buildStepsUserPrompt(context: StepsGenerationContext): string {
	const tc = context.testCase;
	const count = context.targetCount ?? 5;

	let prompt = `Generate ${count} test steps for the following Test Case:

`;
	prompt += tc.title ? `Title: ${tc.title}\n` : "Title: (not yet set)\n";
	if (tc.description) {
		prompt += `\nDescription:\n${tc.description}\n`;
	}
	if (tc.tags && tc.tags.length > 0) {
		prompt += `\nTags: ${tc.tags.join(", ")}\n`;
	}
	if (tc.priority) {
		prompt += `Priority: P${tc.priority}\n`;
	}
	if (tc.areaPath) {
		prompt += `Area Path (domain hint, do not test the area itself): ${tc.areaPath}\n`;
	}

	if (context.linkedWorkItems && context.linkedWorkItems.length > 0) {
		prompt += "\nLinked Work Items (context only, do not test them directly):\n";
		for (const wi of context.linkedWorkItems) {
			prompt += `\n- ${wi.type} #${wi.id}: ${wi.title}`;
			if (wi.description) prompt += `\n  Description: ${wi.description}`;
			if (wi.acceptanceCriteria) prompt += `\n  Acceptance Criteria: ${wi.acceptanceCriteria}`;
		}
		prompt += "\n";
	}

	prompt += `
Return ONLY the JSON object with the steps array, no additional text.`;

	return prompt;
}
