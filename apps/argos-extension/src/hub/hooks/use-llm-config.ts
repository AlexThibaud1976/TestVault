import { useCallback, useEffect, useState } from "react";
import { LlmProviderFactory } from "../llm/llm-provider-factory.js";
import type { LlmProviderConfig } from "../llm/llm-provider.js";
import { useServices } from "../services-context.js";

export function useLlmConfig() {
	const { llmConfigService } = useServices();
	const [config, setConfig] = useState<LlmProviderConfig | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let cancelled = false;
		setIsLoading(true);
		llmConfigService
			.getConfig()
			.then((cfg) => {
				if (!cancelled) {
					setConfig(cfg);
					setError(null);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [llmConfigService]);

	const save = useCallback(
		async (cfg: LlmProviderConfig) => {
			setIsSaving(true);
			try {
				await llmConfigService.setConfig(cfg);
				setConfig(cfg);
				setTestResult(null);
			} finally {
				setIsSaving(false);
			}
		},
		[llmConfigService]
	);

	const clear = useCallback(async () => {
		setIsSaving(true);
		try {
			await llmConfigService.clearConfig();
			setConfig(null);
			setTestResult(null);
		} finally {
			setIsSaving(false);
		}
	}, [llmConfigService]);

	const testConnection = useCallback(async (cfg: LlmProviderConfig) => {
		setIsTesting(true);
		setTestResult(null);
		try {
			const provider = LlmProviderFactory.create(cfg);
			const result = await provider.validateConfig();
			setTestResult(result);
			return result;
		} catch (err) {
			const result = { valid: false, error: (err as Error).message };
			setTestResult(result);
			return result;
		} finally {
			setIsTesting(false);
		}
	}, []);

	return { config, isLoading, isSaving, isTesting, testResult, error, save, clear, testConnection };
}
