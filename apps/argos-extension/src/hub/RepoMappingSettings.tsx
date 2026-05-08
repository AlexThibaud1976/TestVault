import { Button, Input, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type {
	IRepoMappingService,
	RepoMapping,
	SyncMappingResult,
} from "./repo-mapping-service.js";

export interface RepoMappingSettingsProps {
	service: IRepoMappingService;
	isAdmin: boolean;
}

type FormState = {
	repoUrl: string;
	branch: string;
	pathGlob: string;
	areaPath: string;
};

const DEFAULT_FORM: FormState = {
	repoUrl: "",
	branch: "main",
	pathGlob: "**/*.feature",
	areaPath: "",
};

export function RepoMappingSettings({ service, isAdmin }: RepoMappingSettingsProps) {
	const [mappings, setMappings] = useState<RepoMapping[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState<FormState>(DEFAULT_FORM);
	const [repoUrlError, setRepoUrlError] = useState(false);
	const [areaPathError, setAreaPathError] = useState(false);
	const [adding, setAdding] = useState(false);
	const [syncingId, setSyncingId] = useState<string | null>(null);
	const [syncResults, setSyncResults] = useState<Map<string, SyncMappingResult>>(new Map());

	useEffect(() => {
		service.list().then((ms) => {
			setMappings(ms);
			setLoading(false);
		});
	}, [service]);

	async function handleAdd() {
		const repoUrl = form.repoUrl.trim();
		const areaPath = form.areaPath.trim();
		let hasError = false;

		if (!repoUrl) {
			setRepoUrlError(true);
			hasError = true;
		} else {
			setRepoUrlError(false);
		}

		if (!areaPath) {
			setAreaPathError(true);
			hasError = true;
		} else {
			setAreaPathError(false);
		}

		if (hasError) return;

		setAdding(true);
		try {
			const added = await service.add({
				repoUrl,
				branch: form.branch || "main",
				pathGlob: form.pathGlob || "**/*.feature",
				areaPath,
			});
			setMappings((prev) => [...prev, added]);
			setForm(DEFAULT_FORM);
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(id: string) {
		setMappings((prev) => prev.filter((m) => m.id !== id));
		await service.remove(id);
	}

	async function handleSync(id: string) {
		setSyncingId(id);
		try {
			const result = await service.sync(id);
			setSyncResults((prev) => new Map(prev).set(id, result));
		} finally {
			setSyncingId(null);
		}
	}

	if (loading) {
		return <div data-testid="repo-mapping-loading">Loading…</div>;
	}

	if (!isAdmin) {
		return (
			<div data-testid="repo-mapping-settings">
				<div data-testid="no-permission-message">
					You need Project Administrator permissions to manage BDD repository mappings.
				</div>
			</div>
		);
	}

	return (
		<div data-testid="repo-mapping-settings" style={{ padding: "24px", maxWidth: "640px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				BDD Repository Mappings
			</Text>

			{mappings.length === 0 ? (
				<div data-testid="repo-mapping-empty" style={{ color: "#888", marginBottom: "16px" }}>
					No repository mappings configured yet.
				</div>
			) : (
				<ul
					data-testid="repo-mapping-list"
					style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}
				>
					{mappings.map((m) => (
						<li
							key={m.id}
							data-testid={`repo-mapping-${m.id}`}
							style={{
								border: "1px solid #e0e0e0",
								borderRadius: "4px",
								padding: "8px 12px",
								marginBottom: "6px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<div style={{ flex: 1 }}>
								<Text block size={300}>
									{m.repoUrl}
								</Text>
								<Text block size={200} style={{ color: "#666" }}>
									{m.branch} · {m.pathGlob} → {m.areaPath}
								</Text>
								{syncResults.has(m.id) && (
									<Text data-testid={`sync-result-${m.id}`} size={200} style={{ color: "#28a745" }}>
										{`Sync done — +${syncResults.get(m.id)?.created ?? 0} created, ${syncResults.get(m.id)?.updated ?? 0} updated`}
									</Text>
								)}
							</div>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`sync-mapping-${m.id}`}
								disabled={syncingId === m.id}
								onClick={() => handleSync(m.id)}
							>
								{syncingId === m.id ? "Syncing…" : "Sync Now"}
							</Button>
							<Button
								size="small"
								appearance="subtle"
								data-testid={`remove-mapping-${m.id}`}
								onClick={() => handleRemove(m.id)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}

			<Text weight="semibold" block style={{ marginBottom: "8px" }}>
				Add mapping
			</Text>

			<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
				<Input
					data-testid="repo-url-input"
					placeholder="Repository URL"
					value={form.repoUrl}
					onChange={(_, d) => {
						setForm((p) => ({ ...p, repoUrl: d.value }));
						setRepoUrlError(false);
					}}
				/>
				{repoUrlError && (
					<div data-testid="repo-url-error" style={{ color: "red", fontSize: 12 }}>
						Repository URL is required.
					</div>
				)}

				<div style={{ display: "flex", gap: "8px" }}>
					<Input
						data-testid="branch-input"
						placeholder="Branch"
						value={form.branch}
						onChange={(_, d) => setForm((p) => ({ ...p, branch: d.value }))}
						style={{ flex: 1 }}
					/>
					<Input
						data-testid="path-glob-input"
						placeholder="Path glob"
						value={form.pathGlob}
						onChange={(_, d) => setForm((p) => ({ ...p, pathGlob: d.value }))}
						style={{ flex: 1 }}
					/>
				</div>

				<Input
					data-testid="area-path-input"
					placeholder="Area Path (e.g. MyProject\\Auth)"
					value={form.areaPath}
					onChange={(_, d) => {
						setForm((p) => ({ ...p, areaPath: d.value }));
						setAreaPathError(false);
					}}
				/>
				{areaPathError && (
					<div data-testid="area-path-error" style={{ color: "red", fontSize: 12 }}>
						Area Path is required.
					</div>
				)}
			</div>

			<Button
				appearance="primary"
				data-testid="add-mapping-button"
				onClick={handleAdd}
				disabled={adding}
			>
				{adding ? "Adding…" : "Add Mapping"}
			</Button>
		</div>
	);
}
