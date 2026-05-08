import { Badge, Button, Input, Option, Select, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type {
	AddProviderInput,
	ILlmProviderService,
	LlmProvider,
	LlmProviderType,
} from "./llm-provider-service.js";

export interface LlmProviderSettingsProps {
	service: ILlmProviderService;
	isAdmin: boolean;
}

type FormState = {
	type: LlmProviderType;
	label: string;
	modelId: string;
	apiKey: string;
	baseUrl: string;
};

const DEFAULT_FORM: FormState = {
	type: "anthropic",
	label: "",
	modelId: "",
	apiKey: "",
	baseUrl: "",
};

export function LlmProviderSettings({ service, isAdmin }: LlmProviderSettingsProps) {
	const [providers, setProviders] = useState<LlmProvider[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState<FormState>(DEFAULT_FORM);
	const [adding, setAdding] = useState(false);
	const [testingId, setTestingId] = useState<string | null>(null);
	const [testResults, setTestResults] = useState<Map<string, string>>(new Map());
	const [apiKeyError, setApiKeyError] = useState(false);
	const [labelError, setLabelError] = useState(false);
	const [modelIdError, setModelIdError] = useState(false);

	useEffect(() => {
		service.list().then((ps) => {
			setProviders(ps);
			setLoading(false);
		});
	}, [service]);

	async function handleAdd() {
		let hasError = false;
		if (!form.label.trim()) {
			setLabelError(true);
			hasError = true;
		} else {
			setLabelError(false);
		}
		if (!form.modelId.trim()) {
			setModelIdError(true);
			hasError = true;
		} else {
			setModelIdError(false);
		}
		if (!form.apiKey.trim()) {
			setApiKeyError(true);
			hasError = true;
		} else {
			setApiKeyError(false);
		}
		if (hasError) return;

		setAdding(true);
		try {
			const input: AddProviderInput = {
				type: form.type,
				label: form.label.trim(),
				modelId: form.modelId.trim(),
				apiKey: form.apiKey.trim(),
				baseUrl: form.baseUrl.trim() || undefined,
			};
			const added = await service.add(input);
			setProviders((prev) => [...prev, added]);
			setForm(DEFAULT_FORM);
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(id: string) {
		setProviders((prev) => prev.filter((p) => p.id !== id));
		await service.remove(id);
	}

	async function handleTest(id: string) {
		setTestingId(id);
		try {
			const result = await service.testConnection(id);
			setTestResults((prev) => new Map(prev).set(id, result.success ? "ok" : result.message));
		} finally {
			setTestingId(null);
		}
	}

	if (loading) {
		return <div data-testid="llm-provider-loading">Loading…</div>;
	}

	if (!isAdmin) {
		return (
			<div data-testid="llm-provider-settings">
				<div data-testid="llm-provider-no-permission">
					You need Project Administrator permissions to manage AI providers.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="llm-provider-settings" style={{ padding: "24px", maxWidth: "700px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				AI Provider Configuration
			</Text>

			{providers.length === 0 ? (
				<div data-testid="llm-provider-empty" style={{ color: "#888", marginBottom: "16px" }}>
					No AI providers configured yet.
				</div>
			) : (
				<ul
					data-testid="llm-provider-list"
					style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}
				>
					{providers.map((p) => (
						<li
							key={p.id}
							data-testid={`llm-provider-${p.id}`}
							style={{
								border: "1px solid #e0e0e0",
								borderRadius: "4px",
								padding: "10px 12px",
								marginBottom: "6px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<div style={{ flex: 1 }}>
								<Text block size={300} weight="semibold">
									{p.label}
								</Text>
								<Text block size={200} style={{ color: "#666" }}>
									{p.type} · {p.modelId} · ···{p.maskedKey.slice(-4)}
								</Text>
								{testResults.has(p.id) && (
									<Badge
										data-testid={`test-result-${p.id}`}
										color={testResults.get(p.id) === "ok" ? "success" : "danger"}
										size="small"
									>
										{testResults.get(p.id) === "ok" ? "Connected" : testResults.get(p.id)}
									</Badge>
								)}
							</div>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`test-provider-${p.id}`}
								disabled={testingId === p.id}
								onClick={() => handleTest(p.id)}
							>
								{testingId === p.id ? "Testing…" : "Test"}
							</Button>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-provider-${p.id}`}
								onClick={() => handleRemove(p.id)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}

			<Text weight="semibold" block style={{ marginBottom: "8px" }}>
				Add provider
			</Text>

			<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
				<Select
					data-testid="provider-type-select"
					value={form.type}
					onChange={(_, d) => setForm((p) => ({ ...p, type: d.value as LlmProviderType }))}
				>
					<Option value="anthropic">Anthropic (Claude)</Option>
					<Option value="openai">OpenAI (GPT)</Option>
					<Option value="azure-openai">Azure OpenAI</Option>
				</Select>

				<Input
					data-testid="provider-label-input"
					placeholder="Label (e.g. Claude Production)"
					value={form.label}
					onChange={(_, d) => {
						setForm((p) => ({ ...p, label: d.value }));
						setLabelError(false);
					}}
				/>
				{labelError && (
					<div data-testid="label-error" style={{ color: "red", fontSize: 12 }}>
						Label is required.
					</div>
				)}

				<Input
					data-testid="provider-model-input"
					placeholder="Model ID (e.g. claude-haiku-4-5-20251001)"
					value={form.modelId}
					onChange={(_, d) => {
						setForm((p) => ({ ...p, modelId: d.value }));
						setModelIdError(false);
					}}
				/>
				{modelIdError && (
					<div data-testid="model-id-error" style={{ color: "red", fontSize: 12 }}>
						Model ID is required.
					</div>
				)}

				<Input
					data-testid="provider-api-key-input"
					type="password"
					placeholder="API Key"
					value={form.apiKey}
					onChange={(_, d) => {
						setForm((p) => ({ ...p, apiKey: d.value }));
						setApiKeyError(false);
					}}
				/>
				{apiKeyError && (
					<div data-testid="api-key-error" style={{ color: "red", fontSize: 12 }}>
						API Key is required.
					</div>
				)}

				{form.type === "azure-openai" && (
					<Input
						data-testid="provider-base-url-input"
						placeholder="Azure OpenAI endpoint URL"
						value={form.baseUrl}
						onChange={(_, d) => setForm((p) => ({ ...p, baseUrl: d.value }))}
					/>
				)}
			</div>

			<Button
				appearance="primary"
				data-testid="add-provider-button"
				onClick={handleAdd}
				disabled={adding}
			>
				{adding ? "Adding…" : "Add Provider"}
			</Button>
		</div>
	);
}
