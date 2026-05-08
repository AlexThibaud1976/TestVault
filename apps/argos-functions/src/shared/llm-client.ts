import { z } from "zod";

export type LlmProviderType = "anthropic" | "openai" | "azure-openai";

export interface LlmMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export interface LlmCallOptions {
	provider: LlmProviderType;
	apiKey: Buffer;
	modelId: string;
	messages: LlmMessage[];
	params: {
		temperature: number;
		maxTokens: number;
	};
	baseUrl?: string;
}

export interface LlmResponse {
	content: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
	};
}

export interface ILlmClient {
	call(opts: LlmCallOptions): Promise<LlmResponse>;
}

export const TcCandidateSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	steps: z
		.array(
			z.object({
				action: z.string(),
				expected: z.string(),
			})
		)
		.default([]),
	tags: z.array(z.string()).default([]),
});

export type TcCandidate = z.infer<typeof TcCandidateSchema>;

export const TcCandidatesResponseSchema = z.object({
	candidates: z.array(TcCandidateSchema).min(1).max(10),
});

export function parseCandidates(content: string): TcCandidate[] {
	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("No JSON object found in LLM response");
	}
	const parsed = TcCandidatesResponseSchema.parse(JSON.parse(jsonMatch[0]));
	return parsed.candidates;
}

export function buildGenerationMessages(
	workItemTitle: string,
	workItemDescription: string,
	count: number,
	systemPromptOverride?: string
): LlmMessage[] {
	const systemPrompt =
		systemPromptOverride ??
		`You are a senior QA engineer. Generate ${count} test case candidates as JSON.
Respond ONLY with a JSON object: {"candidates": [{"title": "...", "steps": [{"action": "...", "expected": "..."}], "tags": []}]}`;

	return [
		{ role: "system", content: systemPrompt },
		{
			role: "user",
			content: `Work Item: ${workItemTitle}\n\n${workItemDescription}`,
		},
	];
}
