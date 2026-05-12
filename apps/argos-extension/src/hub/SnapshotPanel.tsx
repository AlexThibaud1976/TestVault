import type { ITestCaseVersionService, TestVaultTestCaseVersion } from "@atconseil/argos-sdk";
import { SnapshotNameConflictError } from "@atconseil/argos-sdk";
import type { TestVaultTestCase } from "@atconseil/argos-types";
import { Button, Text, Textarea } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface SnapshotPanelProps {
	testCase: TestVaultTestCase;
	service: ITestCaseVersionService;
}

export function SnapshotPanel({ testCase, service }: SnapshotPanelProps) {
	const [snapshots, setSnapshots] = useState<TestVaultTestCaseVersion[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [comment, setComment] = useState("");
	const [nameError, setNameError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		void service.listSnapshots(testCase.id).then(setSnapshots);
	}, [service, testCase.id]);

	async function reload() {
		const updated = await service.listSnapshots(testCase.id);
		setSnapshots(updated);
	}

	function handleOpenForm() {
		setName("");
		setComment("");
		setNameError(null);
		setShowForm(true);
	}

	async function handleSubmit() {
		if (!name.trim()) {
			setNameError("Snapshot name is required");
			return;
		}
		setNameError(null);
		setSubmitting(true);
		try {
			await service.createSnapshot(testCase, {
				name: name.trim(),
				comment,
				parentTestCaseId: testCase.id,
			});
			setShowForm(false);
			await reload();
		} catch (err) {
			if (err instanceof SnapshotNameConflictError) {
				setNameError(err.message);
			} else {
				throw err;
			}
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div data-testid="snapshot-panel" style={{ padding: "16px" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "12px",
				}}
			>
				<Text weight="semibold">Snapshots</Text>
				{!showForm && (
					<Button
						data-testid="create-snapshot-button"
						appearance="primary"
						size="small"
						onClick={handleOpenForm}
					>
						Create Snapshot
					</Button>
				)}
			</div>

			{showForm && (
				<div
					data-testid="snapshot-form"
					style={{
						padding: "12px",
						border: "1px solid #e0e0e0",
						borderRadius: "4px",
						marginBottom: "16px",
					}}
				>
					<div style={{ marginBottom: "8px" }}>
						<label htmlFor="snapshot-name" style={{ display: "block", marginBottom: "4px" }}>
							Name
						</label>
						<input
							id="snapshot-name"
							data-testid="snapshot-name-input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							style={{ width: "100%", padding: "4px 6px", boxSizing: "border-box" }}
							placeholder="e.g. v1.0"
						/>
						{nameError && (
							<div
								data-testid="snapshot-name-error"
								style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
							>
								{nameError}
							</div>
						)}
					</div>
					<div style={{ marginBottom: "8px" }}>
						<label htmlFor="snapshot-comment" style={{ display: "block", marginBottom: "4px" }}>
							Comment (optional)
						</label>
						<Textarea
							id="snapshot-comment"
							data-testid="snapshot-comment-input"
							value={comment}
							onChange={(_, d) => setComment(d.value)}
							rows={2}
							resize="vertical"
							style={{ width: "100%" }}
						/>
					</div>
					<div style={{ display: "flex", gap: "8px" }}>
						<Button
							data-testid="snapshot-submit"
							appearance="primary"
							size="small"
							disabled={submitting}
							onClick={() => void handleSubmit()}
						>
							{submitting ? "Creating…" : "Create"}
						</Button>
						<Button
							data-testid="snapshot-cancel"
							appearance="secondary"
							size="small"
							onClick={() => setShowForm(false)}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{snapshots.length === 0 ? (
				<div data-testid="snapshots-empty" style={{ color: "#666" }}>
					No snapshots yet.
				</div>
			) : (
				<ul style={{ listStyle: "none", padding: 0 }}>
					{snapshots.map((s) => (
						<li
							key={s.id}
							data-testid={`snapshot-item-${s.id}`}
							style={{
								padding: "8px 0",
								borderBottom: "1px solid #f0f0f0",
								display: "flex",
								gap: "12px",
								alignItems: "center",
							}}
						>
							<span style={{ fontWeight: 600 }}>{s.name}</span>
							<span style={{ color: "#666", fontSize: "12px" }}>
								{new Date(s.createdAt).toLocaleDateString()} — {s.createdBy}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
