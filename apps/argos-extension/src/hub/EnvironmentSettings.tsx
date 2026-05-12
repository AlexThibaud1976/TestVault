import type { IEnvironmentConfigService } from "@atconseil/argos-sdk";
import { Button, Input, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface EnvironmentSettingsProps {
	service: IEnvironmentConfigService;
	isAdmin: boolean;
}

export function EnvironmentSettings({ service, isAdmin }: EnvironmentSettingsProps) {
	const [environments, setEnvironments] = useState<string[]>([]);
	const [newEnv, setNewEnv] = useState("");
	const [nameError, setNameError] = useState(false);
	const [duplicateError, setDuplicateError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		service.getEnvironments().then((envs) => {
			setEnvironments(envs);
			setLoading(false);
		});
	}, [service]);

	function handleAdd() {
		const trimmed = newEnv.trim();
		if (!trimmed) {
			setNameError(true);
			setDuplicateError(false);
			return;
		}
		const isDuplicate = environments.some((e) => e.toLowerCase() === trimmed.toLowerCase());
		if (isDuplicate) {
			setDuplicateError(true);
			setNameError(false);
			return;
		}
		setNameError(false);
		setDuplicateError(false);
		setEnvironments((prev) => [...prev, trimmed]);
		setNewEnv("");
		setSaved(false);
	}

	function handleRemove(name: string) {
		setEnvironments((prev) => prev.filter((e) => e !== name));
		setSaved(false);
	}

	async function handleSave() {
		setSaving(true);
		setSaved(false);
		try {
			await service.saveEnvironments(environments);
			setSaved(true);
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return <div data-testid="env-settings-loading">Loading…</div>;
	}

	if (!isAdmin) {
		return (
			<div data-testid="env-settings">
				<div data-testid="no-permission-message">
					You need Project Administrator permissions to manage environments.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="env-settings" style={{ padding: "24px", maxWidth: "480px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				Environments
			</Text>

			{environments.length === 0 ? (
				<div data-testid="env-empty-message" style={{ color: "#888", marginBottom: "16px" }}>
					No environments configured yet.
				</div>
			) : (
				<ul data-testid="env-list" style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}>
					{environments.map((env) => (
						<li
							key={env}
							data-testid={`env-item-${env}`}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "6px",
							}}
						>
							<Text style={{ flex: 1 }}>{env}</Text>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-env-${env}`}
								onClick={() => handleRemove(env)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}

			<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
				<Input
					data-testid="new-env-input"
					placeholder="e.g. QA-EU"
					value={newEnv}
					onChange={(_, d) => {
						setNewEnv(d.value);
						setNameError(false);
						setDuplicateError(false);
					}}
					style={{ flex: 1 }}
				/>
				<Button data-testid="add-env-button" onClick={handleAdd}>
					Add
				</Button>
			</div>

			{nameError && (
				<div data-testid="env-name-error" style={{ color: "red", marginBottom: "8px" }}>
					Environment name is required.
				</div>
			)}
			{duplicateError && (
				<div data-testid="env-duplicate-error" style={{ color: "red", marginBottom: "8px" }}>
					This environment already exists.
				</div>
			)}

			<div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
				<Button
					appearance="primary"
					data-testid="save-env-button"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Saving…" : "Save"}
				</Button>
				{saved && (
					<span data-testid="save-confirmation" style={{ color: "green" }}>
						Saved.
					</span>
				)}
			</div>
		</div>
	);
}
