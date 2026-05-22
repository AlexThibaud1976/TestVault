import type { GenerationContext } from "./llm-provider.js";

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
