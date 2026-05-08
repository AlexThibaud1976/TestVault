import type React from "react";
import { useEffect, useState } from "react";

export type WebhookTokenSummary = {
	id: string;
	label: string;
	createdAt: string;
	revoked: boolean;
};

export type CreatedTokenResult = WebhookTokenSummary & {
	secret: string;
};

export interface IWebhookAdminService {
	listTokens(): Promise<WebhookTokenSummary[]>;
	createToken(label: string): Promise<CreatedTokenResult>;
	revokeToken(id: string): Promise<void>;
}

type Props = {
	service: IWebhookAdminService;
};

type ViewState =
	| { kind: "loading" }
	| { kind: "list"; tokens: WebhookTokenSummary[] }
	| { kind: "create-form"; tokens: WebhookTokenSummary[] }
	| { kind: "secret-reveal"; tokens: WebhookTokenSummary[]; secret: string; label: string };

export function WebhookAdmin({ service }: Props): React.ReactElement {
	const [view, setView] = useState<ViewState>({ kind: "loading" });
	const [labelInput, setLabelInput] = useState("");
	const [labelError, setLabelError] = useState(false);

	useEffect(() => {
		service.listTokens().then((tokens) => setView({ kind: "list", tokens }));
	}, [service]);

	function openCreateForm() {
		const tokens =
			view.kind !== "loading" ? (view as { tokens: WebhookTokenSummary[] }).tokens : [];
		setLabelInput("");
		setLabelError(false);
		setView({ kind: "create-form", tokens });
	}

	async function submitCreate() {
		if (!labelInput.trim()) {
			setLabelError(true);
			return;
		}
		setLabelError(false);
		const result = await service.createToken(labelInput.trim());
		const tokens =
			view.kind !== "loading" ? (view as { tokens: WebhookTokenSummary[] }).tokens : [];
		const updated = [
			...tokens,
			{ id: result.id, label: result.label, createdAt: result.createdAt, revoked: false },
		];
		setView({ kind: "secret-reveal", tokens: updated, secret: result.secret, label: result.label });
	}

	async function revokeToken(id: string) {
		await service.revokeToken(id);
		const tokens =
			view.kind !== "loading" ? (view as { tokens: WebhookTokenSummary[] }).tokens : [];
		setView({ kind: "list", tokens: tokens.filter((t) => t.id !== id) });
	}

	if (view.kind === "loading") {
		return <div data-testid="webhook-admin-loading">Loading…</div>;
	}

	const tokens = (view as { tokens: WebhookTokenSummary[] }).tokens;

	return (
		<div data-testid="webhook-admin">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h2>Webhook Tokens</h2>
				<button type="button" data-testid="create-token-button" onClick={openCreateForm}>
					New token
				</button>
			</div>

			{view.kind === "create-form" && (
				<div data-testid="create-token-form">
					<label htmlFor="token-label">Label</label>
					<input
						id="token-label"
						data-testid="token-label-input"
						value={labelInput}
						onChange={(e) => setLabelInput(e.target.value)}
					/>
					{labelError && <span data-testid="label-error">Label is required</span>}
					<button
						type="button"
						data-testid="submit-create-token"
						onClick={() => void submitCreate()}
					>
						Create
					</button>
				</div>
			)}

			{view.kind === "secret-reveal" && (
				<div data-testid="token-secret-reveal">
					<strong>Token created: {view.label}</strong>
					<p>
						Copy this secret — it will not be shown again:
						<code>{view.secret}</code>
					</p>
					<button type="button" onClick={() => setView({ kind: "list", tokens })}>
						Done
					</button>
				</div>
			)}

			{tokens.length === 0 && view.kind === "list" ? (
				<p data-testid="webhook-admin-empty">No webhook tokens. Create one to get started.</p>
			) : (
				<ul>
					{tokens.map((t) => (
						<li key={t.id} data-testid={`webhook-token-${t.id}`}>
							<span>{t.label}</span>
							<span style={{ marginLeft: 8, color: "#888" }}>
								{new Date(t.createdAt).toLocaleDateString()}
							</span>
							<button
								type="button"
								data-testid={`revoke-token-${t.id}`}
								onClick={() => void revokeToken(t.id)}
								style={{ marginLeft: 8 }}
							>
								Revoke
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
