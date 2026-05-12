import type { BugDraft, IBugCreationService } from "@atconseil/argos-sdk";
import { Button, Text, Textarea } from "@fluentui/react-components";
import { useState } from "react";

export interface CreateBugFormProps {
	draft: BugDraft;
	service: IBugCreationService;
	executionId: number;
	onCreated?: (bugId: number) => void;
	onCancelled?: () => void;
}

const SEVERITY_OPTIONS = ["1 - Critical", "2 - High", "3 - Medium", "4 - Low"];

export function CreateBugForm({
	draft,
	service,
	executionId,
	onCreated,
	onCancelled,
}: CreateBugFormProps) {
	const [title, setTitle] = useState(draft.title);
	const [reproSteps, setReproSteps] = useState(draft.reproSteps);
	const [severity, setSeverity] = useState(draft.severity);
	const [submitting, setSubmitting] = useState(false);
	const [createdId, setCreatedId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		setSubmitting(true);
		setError(null);
		try {
			const updatedDraft: BugDraft = {
				...draft,
				title,
				reproSteps,
				severity,
			};
			const result = await service.createBug(updatedDraft, executionId);
			setCreatedId(result.id);
			onCreated?.(result.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Bug creation failed");
		} finally {
			setSubmitting(false);
		}
	}

	if (createdId !== null) {
		return (
			<div data-testid="create-bug-success" style={{ padding: "16px" }}>
				Bug #{createdId} created successfully.
			</div>
		);
	}

	return (
		<div style={{ padding: "16px", maxWidth: "560px" }}>
			<Text size={500} weight="semibold" block style={{ marginBottom: "16px" }}>
				Create Bug from Failure
			</Text>

			<div style={{ marginBottom: "12px" }}>
				<label htmlFor="bug-title" style={{ display: "block", marginBottom: "4px" }}>
					Title
				</label>
				<input
					id="bug-title"
					data-testid="create-bug-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					style={{ width: "100%", padding: "6px", boxSizing: "border-box" }}
				/>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<label htmlFor="bug-severity" style={{ display: "block", marginBottom: "4px" }}>
					Severity
				</label>
				<select
					id="bug-severity"
					data-testid="create-bug-severity"
					value={severity}
					onChange={(e) => setSeverity(e.target.value)}
				>
					{SEVERITY_OPTIONS.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</div>

			<div style={{ marginBottom: "12px" }}>
				<label htmlFor="bug-repro" style={{ display: "block", marginBottom: "4px" }}>
					Repro Steps
				</label>
				<Textarea
					id="bug-repro"
					data-testid="create-bug-repro"
					value={reproSteps}
					onChange={(_, d) => setReproSteps(d.value)}
					rows={6}
					resize="vertical"
					style={{ width: "100%" }}
				/>
			</div>

			{error && (
				<div data-testid="create-bug-error" style={{ color: "red", marginBottom: "12px" }}>
					{error}
				</div>
			)}

			<div style={{ display: "flex", gap: "8px" }}>
				<Button
					appearance="primary"
					data-testid="create-bug-submit"
					onClick={handleSubmit}
					disabled={submitting}
				>
					{submitting ? "Creating…" : "Create Bug"}
				</Button>
				<Button
					appearance="secondary"
					data-testid="create-bug-cancel"
					onClick={onCancelled}
					disabled={submitting}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}
