import { LlmProviderFactory } from "../llm/llm-provider-factory.js";
import type { LlmProviderConfig } from "../llm/llm-provider.js";

interface LlmConfigStatusProps {
	config: LlmProviderConfig | null;
	isLoading?: boolean;
}

export function LlmConfigStatus({ config, isLoading }: LlmConfigStatusProps) {
	if (isLoading) {
		return (
			<span
				data-testid="llm-config-status"
				style={{
					display: "inline-block",
					padding: "2px 10px",
					borderRadius: "12px",
					fontSize: "12px",
					background: "#f5f5f5",
					color: "#666",
				}}
			>
				Loading...
			</span>
		);
	}

	const isConfigured = !!config && config.apiKey.trim().length > 0;
	const providerDisplayName = isConfigured
		? (LlmProviderFactory.listAvailableProviders().find((p) => p.id === config.provider)
				?.displayName ?? config.provider)
		: "";
	const label = isConfigured
		? `${providerDisplayName}${config.deploymentName ? ` (${config.deploymentName})` : ""}`
		: "Not configured";

	return (
		<span
			data-testid="llm-config-status"
			style={{
				display: "inline-block",
				padding: "2px 10px",
				borderRadius: "12px",
				fontSize: "12px",
				fontWeight: 600,
				background: isConfigured ? "#e6f4ea" : "#fce8e6",
				color: isConfigured ? "#1e7e34" : "#c62828",
			}}
		>
			{isConfigured ? `Configured: ${label}` : label}
		</span>
	);
}
