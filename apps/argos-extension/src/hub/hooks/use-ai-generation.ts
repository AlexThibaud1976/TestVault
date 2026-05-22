import { useCallback, useState } from "react";
import type {
	GenerationContext,
	LlmProviderConfig,
	TestCaseSuggestion,
} from "../llm/llm-provider.js";
import { useServices } from "../services-context.js";

export function useAiGeneration() {
	const { aiGenerationService } = useServices();
	const [suggestions, setSuggestions] = useState<TestCaseSuggestion[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const generate = useCallback(
		async (config: LlmProviderConfig, context: GenerationContext) => {
			setIsLoading(true);
			setError(null);
			setSuggestions([]);
			try {
				const results = await aiGenerationService.generate(config, context);
				setSuggestions(results);
				return results;
			} catch (err) {
				const e = err instanceof Error ? err : new Error(String(err));
				setError(e);
				throw e;
			} finally {
				setIsLoading(false);
			}
		},
		[aiGenerationService]
	);

	const reset = useCallback(() => {
		setSuggestions([]);
		setError(null);
		setIsLoading(false);
	}, []);

	return { suggestions, isLoading, error, generate, reset };
}
