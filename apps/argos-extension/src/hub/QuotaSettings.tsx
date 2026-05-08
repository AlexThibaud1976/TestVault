import { Button, Input, Radio, RadioGroup, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface OrgQuotaConfig {
	limitPerUser: number;
	mode: "hard" | "soft";
	feature: string;
	resetDay: number;
}

export interface IQuotaSettingsService {
	getConfig(): Promise<OrgQuotaConfig>;
	setConfig(config: OrgQuotaConfig): Promise<void>;
}

export interface QuotaSettingsProps {
	service: IQuotaSettingsService;
	isAdmin: boolean;
}

export function QuotaSettings({ service, isAdmin }: QuotaSettingsProps) {
	const [config, setConfig] = useState<OrgQuotaConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		service.getConfig().then((c) => {
			setConfig(c);
			setLoading(false);
		});
	}, [service]);

	async function handleSave() {
		if (!config) return;
		setSaving(true);
		try {
			await service.setConfig(config);
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return <div data-testid="quota-settings-loading">Loading…</div>;
	}

	if (!isAdmin) {
		return (
			<div data-testid="quota-settings">
				<div data-testid="quota-no-permission">
					You need Project Administrator permissions to manage AI quotas.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="quota-settings" style={{ padding: "24px", maxWidth: "480px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				AI Quota Configuration
			</Text>

			<Text weight="semibold" block style={{ marginBottom: "4px" }}>
				Monthly limit per user (TC generation calls)
			</Text>
			<Input
				data-testid="quota-limit-input"
				type="number"
				value={String(config?.limitPerUser ?? 100)}
				onChange={(_, d) =>
					setConfig((prev) => (prev ? { ...prev, limitPerUser: Number(d.value) } : prev))
				}
				style={{ marginBottom: "12px" }}
			/>

			<Text weight="semibold" block style={{ marginBottom: "4px" }}>
				Enforcement mode
			</Text>
			<RadioGroup
				value={config?.mode ?? "hard"}
				onChange={(_, d) =>
					setConfig((prev) => (prev ? { ...prev, mode: d.value as "hard" | "soft" } : prev))
				}
				style={{ marginBottom: "16px" }}
			>
				<Radio data-testid="quota-mode-hard" value="hard" label="Hard — block when limit reached" />
				<Radio
					data-testid="quota-mode-soft"
					value="soft"
					label="Soft — warn but allow over-limit"
				/>
			</RadioGroup>

			<Button
				appearance="primary"
				data-testid="save-quota-button"
				disabled={saving}
				onClick={handleSave}
			>
				{saving ? "Saving…" : "Save"}
			</Button>
		</div>
	);
}
