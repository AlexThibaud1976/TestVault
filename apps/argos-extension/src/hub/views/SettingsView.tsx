import { Text } from "@fluentui/react-components";
import { useState } from "react";
import { AuditLogSettings } from "../AuditLogSettings.js";
import { EnvironmentSettings } from "../EnvironmentSettings.js";
import { LlmProviderSettings } from "../LlmProviderSettings.js";
import { QuotaSettings } from "../QuotaSettings.js";
import { RepoMappingSettings } from "../RepoMappingSettings.js";
import { MaxTokensSlider } from "../components/MaxTokensSlider.js";
import { Button, Input, SectionCollapsible, Select } from "../design-system/index.js";
import { useLlmConfig } from "../hooks/use-llm-config.js";
import { LlmProviderFactory } from "../llm/llm-provider-factory.js";
import {
	type LlmProviderConfig,
	type LlmProviderType,
	MAX_TOKENS_DEFAULT,
} from "../llm/llm-provider.js";
import { useServices } from "../services-context.js";
import "./wit-form-view.css";

const PROVIDER_OPTIONS = LlmProviderFactory.listAvailableProviders().map((p) => ({
	value: p.id,
	label: p.displayName,
}));

function AiConfigSection() {
	const { config, isLoading, isSaving, isTesting, testResult, save, clear, testConnection } =
		useLlmConfig();

	const [provider, setProvider] = useState<LlmProviderType>("azure-openai");
	const [endpoint, setEndpoint] = useState("");
	const [deploymentName, setDeploymentName] = useState("");
	const [maxTokens, setMaxTokens] = useState<number>(MAX_TOKENS_DEFAULT);

	const providerMeta = LlmProviderFactory.listAvailableProviders().find((p) => p.id === provider);
	const endpointPlaceholder = providerMeta?.endpointFormatHint ?? "https://...";
	const deploymentLabel = providerMeta?.deploymentNameLabel ?? "Deployment / Model Name";
	const deploymentPlaceholder = providerMeta?.deploymentNameHint ?? "";
	const [apiKey, setApiKey] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

	// Pre-fill form from saved config (run once when config loads)
	const [prefilled, setPrefilled] = useState(false);
	if (!isLoading && config && !prefilled) {
		setProvider(config.provider);
		setEndpoint(config.endpoint ?? "");
		setDeploymentName(config.deploymentName ?? "");
		setApiKey(config.apiKey);
		setMaxTokens(config.maxTokens ?? MAX_TOKENS_DEFAULT);
		setPrefilled(true);
	}

	function markDirty() {
		setIsDirty(true);
	}

	async function handleSave() {
		const cfg: LlmProviderConfig = {
			provider,
			apiKey,
			endpoint: endpoint.trim() || undefined,
			deploymentName: deploymentName.trim() || undefined,
			maxTokens,
		};
		await save(cfg);
		setIsDirty(false);
	}

	async function handleTest() {
		const cfg: LlmProviderConfig = {
			provider,
			apiKey,
			endpoint: endpoint.trim() || undefined,
			deploymentName: deploymentName.trim() || undefined,
			maxTokens,
		};
		await testConnection(cfg);
	}

	async function handleClear() {
		await clear();
		setProvider("azure-openai");
		setEndpoint("");
		setDeploymentName("");
		setApiKey("");
		setMaxTokens(MAX_TOKENS_DEFAULT);
		setIsDirty(false);
		setPrefilled(false);
	}

	const isConfigured = !!config && config.apiKey.length > 0;

	if (isLoading) {
		return <div data-testid="ai-config-loading">Loading AI configuration...</div>;
	}

	return (
		<div data-testid="ai-config-section" style={{ marginBottom: "32px", maxWidth: "600px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "4px" }}>
				AI Configuration
			</Text>
			<Text size={200} block style={{ color: "#666", marginBottom: "16px" }}>
				Argos uses AI to generate test cases. Configure your LLM provider below. Your API key is
				encrypted and stored only in your ADO account. Argos never has access to your key. Your
				queries are sent directly to your AI provider — Argos never sees your data.
			</Text>

			<div style={{ marginBottom: "12px" }}>
				<span
					data-testid="ai-config-status"
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
					{isConfigured ? `Configured: ${config.provider}` : "Not configured"}
				</span>
			</div>

			<div className="wit-form-field">
				<label className="wit-field-label" htmlFor="ai-provider">
					Provider
				</label>
				<Select
					id="ai-provider"
					value={provider}
					onChange={(e) => {
						setProvider(e.target.value as LlmProviderType);
						markDirty();
					}}
					options={PROVIDER_OPTIONS}
				/>
			</div>

			<div className="wit-form-field">
				<label className="wit-field-label" htmlFor="ai-endpoint">
					Endpoint
				</label>
				<Input
					id="ai-endpoint"
					type="text"
					value={endpoint}
					onChange={(e) => {
						setEndpoint(e.target.value);
						markDirty();
					}}
					placeholder={endpointPlaceholder}
				/>
				{provider === "azure-ai-foundry" && (
					<div style={{ marginTop: "4px", fontSize: "11px", color: "#555" }}>
						Format: https://[name].services.ai.azure.com/openai/v1 — /openai/v1 is appended
						automatically if missing.
					</div>
				)}
			</div>

			<div className="wit-form-field">
				<label className="wit-field-label" htmlFor="ai-deployment">
					{deploymentLabel}
				</label>
				<Input
					id="ai-deployment"
					type="text"
					value={deploymentName}
					onChange={(e) => {
						setDeploymentName(e.target.value);
						markDirty();
					}}
					placeholder={deploymentPlaceholder}
				/>
				<div
					data-testid="deployment-byok-hint"
					style={{ marginTop: "4px", fontSize: "11px", color: "#555" }}
				>
					Example only -- replace with your deployed model name (BYOK).
				</div>
			</div>

			<div className="wit-form-field">
				<label className="wit-field-label" htmlFor="ai-apikey">
					API Key
				</label>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<Input
						id="ai-apikey"
						type={showKey ? "text" : "password"}
						value={apiKey}
						onChange={(e) => {
							setApiKey(e.target.value);
							markDirty();
						}}
						placeholder="Your Azure OpenAI API key"
					/>
					<Button
						variant="secondary"
						size="small"
						onClick={() => setShowKey((v) => !v)}
						aria-label={showKey ? "Hide API key" : "Show API key"}
					>
						{showKey ? "Hide" : "Show"}
					</Button>
					<Button
						variant="secondary"
						size="small"
						onClick={handleTest}
						disabled={isTesting || !apiKey.trim()}
						data-testid="test-connection-button"
					>
						{isTesting ? "Testing..." : "Test"}
					</Button>
				</div>
				{testResult && (
					<div
						data-testid="test-result"
						style={{
							marginTop: "6px",
							color: testResult.valid ? "#1e7e34" : "#c62828",
							fontSize: "12px",
						}}
					>
						{testResult.valid ? "Connection successful" : `Error: ${testResult.error}`}
					</div>
				)}
			</div>

			<div
				style={{ marginTop: "20px", marginBottom: "12px" }}
				data-testid="ai-config-advanced-wrapper"
			>
				<SectionCollapsible
					title="Advanced Settings"
					subtitle="Tune max_tokens to balance generation depth, speed and cost"
					defaultOpen={false}
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="ai-max-tokens">
							Max Tokens
						</label>
						<MaxTokensSlider
							id="ai-max-tokens"
							value={maxTokens}
							onChange={(next) => {
								setMaxTokens(next);
								markDirty();
							}}
						/>
					</div>
				</SectionCollapsible>
			</div>

			<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
				<Button
					variant="primary"
					onClick={handleSave}
					disabled={isSaving || !isDirty}
					data-testid="save-config-button"
				>
					{isSaving ? "Saving..." : "Save Configuration"}
				</Button>
				{isConfigured && (
					<Button
						variant="subtle"
						onClick={handleClear}
						disabled={isSaving}
						data-testid="clear-config-button"
					>
						Clear Configuration
					</Button>
				)}
			</div>
		</div>
	);
}

export function SettingsView() {
	const {
		llmProviderService,
		environmentConfigService,
		auditLogService,
		repoMappingService,
		quotaSettingsService,
	} = useServices();

	return (
		<div data-testid="view-settings" style={{ padding: "24px", maxWidth: "800px" }}>
			<Text as="h2" size={500} weight="semibold" block style={{ marginBottom: "24px" }}>
				Settings
			</Text>

			<AiConfigSection />

			<LlmProviderSettings service={llmProviderService} isAdmin={true} />
			<div style={{ marginTop: "16px" }}>
				<EnvironmentSettings service={environmentConfigService} isAdmin={true} />
			</div>
			<div style={{ marginTop: "16px" }}>
				<AuditLogSettings service={auditLogService} isAdmin={true} />
			</div>
			<div style={{ marginTop: "16px" }}>
				<RepoMappingSettings service={repoMappingService} isAdmin={true} />
			</div>
			<div style={{ marginTop: "16px" }}>
				<QuotaSettings service={quotaSettingsService} isAdmin={true} />
			</div>
		</div>
	);
}
