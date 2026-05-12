import type { IWorkItemLinkService, WiLinkType, WorkItemLink } from "@atconseil/argos-sdk";
import { Button, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";

export interface WorkItemLinkPanelProps {
	testCaseId: number;
	service: IWorkItemLinkService;
}

const LINK_TYPES: WiLinkType[] = ["TestVault.TestedBy", "TestVault.Validates", "TestVault.Covers"];

export function WorkItemLinkPanel({ testCaseId, service }: WorkItemLinkPanelProps) {
	const [links, setLinks] = useState<WorkItemLink[]>([]);
	const [orphanIds, setOrphanIds] = useState<Set<number>>(new Set());
	const [addInput, setAddInput] = useState("");
	const [addType, setAddType] = useState<WiLinkType>("TestVault.TestedBy");
	const [addError, setAddError] = useState<string | null>(null);

	useEffect(() => {
		void service.listLinks(testCaseId).then(setLinks);
	}, [service, testCaseId]);

	async function reload() {
		const updated = await service.listLinks(testCaseId);
		setLinks(updated);
	}

	async function handleAdd() {
		const id = Number(addInput);
		if (!Number.isInteger(id) || id <= 0 || addInput.trim() === "") {
			setAddError("Enter a valid Work Item ID");
			return;
		}
		setAddError(null);
		await service.addLink(testCaseId, id, addType);
		setAddInput("");
		await reload();
	}

	async function handleRemove(link: WorkItemLink) {
		await service.removeLink(testCaseId, link.targetId, link.linkType);
		await reload();
	}

	async function handleDetectOrphans() {
		const orphans = await service.detectOrphanLinks(testCaseId);
		setOrphanIds(new Set(orphans.map((o) => o.targetId)));
	}

	return (
		<div data-testid="link-panel" style={{ padding: "16px" }}>
			<Text weight="semibold" block style={{ marginBottom: "12px" }}>
				Work Item Links
			</Text>

			{links.length === 0 ? (
				<div data-testid="links-empty" style={{ color: "#666", marginBottom: "12px" }}>
					No linked Work Items.
				</div>
			) : (
				<ul style={{ listStyle: "none", padding: 0, marginBottom: "12px" }}>
					{links.map((link) => (
						<li
							key={`${link.targetId}-${link.linkType}`}
							data-testid={`link-item-${link.targetId}`}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								padding: "6px 0",
								borderBottom: "1px solid #f0f0f0",
							}}
						>
							<span style={{ fontWeight: "semibold" }}>#{link.targetId}</span>
							<span style={{ color: "#666", fontSize: "12px" }}>
								{link.linkType.replace("TestVault.", "")}
							</span>
							{orphanIds.has(link.targetId) && (
								<span
									data-testid={`link-item-${link.targetId}-orphan`}
									style={{
										color: "orange",
										fontSize: "11px",
										background: "#fff3e0",
										padding: "2px 6px",
										borderRadius: "4px",
									}}
								>
									Orphan
								</span>
							)}
							<Button
								data-testid={`remove-link-${link.targetId}`}
								appearance="subtle"
								size="small"
								onClick={() => void handleRemove(link)}
							>
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}

			<div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
				<input
					data-testid="add-link-input"
					type="text"
					value={addInput}
					onChange={(e) => setAddInput(e.target.value)}
					placeholder="Work Item ID"
					style={{ width: "120px", padding: "4px 6px" }}
				/>
				<select
					data-testid="add-link-type"
					value={addType}
					onChange={(e) => setAddType(e.target.value as WiLinkType)}
				>
					{LINK_TYPES.map((t) => (
						<option key={t} value={t}>
							{t.replace("TestVault.", "")}
						</option>
					))}
				</select>
				<Button
					data-testid="add-link-button"
					appearance="primary"
					size="small"
					onClick={() => void handleAdd()}
				>
					Add
				</Button>
			</div>

			{addError && (
				<div
					data-testid="add-link-error"
					style={{ color: "red", fontSize: "12px", marginBottom: "8px" }}
				>
					{addError}
				</div>
			)}

			<Button
				data-testid="detect-orphans-button"
				appearance="secondary"
				size="small"
				onClick={() => void handleDetectOrphans()}
			>
				Detect Orphans
			</Button>
		</div>
	);
}
