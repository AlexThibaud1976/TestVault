import type { PreconditionDraft } from "@atconseil/argos-sdk";
import { useCallback, useState } from "react";
import { Badge, Button, Input, SectionCollapsible } from "../design-system/index.js";
import { useArgosCreate } from "../hooks/use-argos-create.js";
import { useServices } from "../services-context.js";
import "./wit-form-view.css";

interface PreconditionFormViewProps {
	onCancel: () => void;
	onSuccess: (id: number) => void;
	preconditionId?: number;
}

export function PreconditionFormView({
	onCancel,
	onSuccess,
	preconditionId: _preconditionId,
}: PreconditionFormViewProps) {
	const { preconditionService } = useServices();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [setup, setSetup] = useState("");
	const [cleanup, setCleanup] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	const createFn = useCallback(
		(draft: PreconditionDraft) => preconditionService.create(draft),
		[preconditionService]
	);

	const { mutate, isCreating } = useArgosCreate<PreconditionDraft>({
		kind: "Precondition",
		createFn,
		onSuccess: (result) => onSuccess(result.id),
	});

	const isValid = title.trim().length > 0;

	async function handleSubmit() {
		if (!isValid) return;
		const desc = [description.trim(), setup.trim() ? `Setup: ${setup.trim()}` : ""]
			.filter(Boolean)
			.join("\n\n");
		const draft: PreconditionDraft = {
			title: title.trim(),
			description: desc || undefined,
			tags: tags.length > 0 ? tags : undefined,
		};
		await mutate(draft).catch(() => {});
	}

	function addTag() {
		const t = tagInput.trim();
		if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
		setTagInput("");
	}

	function removeTag(t: string) {
		setTags((prev) => prev.filter((x) => x !== t));
	}

	const section1Complete = title.trim().length > 0;

	return (
		<div className="wit-form-view">
			<header className="wit-form-header">
				<div className="wit-form-header-left">
					<button
						type="button"
						className="wit-form-back-btn"
						onClick={onCancel}
						disabled={isCreating}
						aria-label="Back to list"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-hidden="true"
						>
							<path d="M10 3L5 8l5 5" />
						</svg>
					</button>
					<h1 className="wit-form-title">New Precondition</h1>
				</div>
				<div className="wit-form-header-actions">
					<Button variant="subtle" onClick={onCancel} disabled={isCreating}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={!isValid || isCreating}>
						{isCreating ? "Creating..." : "Create Precondition"}
					</Button>
				</div>
			</header>

			<div className="wit-form-body">
				<SectionCollapsible
					title="General information"
					subtitle="Name, description and tags"
					statusBadge={
						section1Complete ? (
							<Badge kind="success" dot>
								Complete
							</Badge>
						) : (
							<Badge kind="neutral" dot>
								Required
							</Badge>
						)
					}
					defaultOpen
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="pc-title">
							Name <span className="wit-field-required">*</span>
						</label>
						<Input
							id="pc-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. User logged in as admin"
							inputSize="large"
							autoFocus
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="pc-desc">
							Description <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="pc-desc"
							className="wit-textarea"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe what this precondition ensures..."
							rows={3}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="pc-tags">
							Tags <span className="wit-field-optional">Optional</span>
						</label>
						<div className="wit-tag-input-row">
							<Input
								id="pc-tags"
								type="text"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addTag();
									}
								}}
								placeholder="Type a tag and press Enter"
							/>
							<Button variant="secondary" size="small" onClick={addTag}>
								Add
							</Button>
						</div>
						{tags.length > 0 && (
							<div className="wit-tag-list">
								{tags.map((t) => (
									<button
										key={t}
										type="button"
										className="wit-tag-chip"
										onClick={() => removeTag(t)}
										aria-label={`Remove tag ${t}`}
									>
										{t}
										<span className="wit-tag-remove" aria-hidden="true">
											x
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Setup Steps"
					subtitle="Procedure to establish this precondition"
					statusBadge={
						<Badge kind="neutral" dot>
							Optional
						</Badge>
					}
					defaultOpen
				>
					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="pc-setup">
							Setup procedure
						</label>
						<textarea
							id="pc-setup"
							className="wit-textarea"
							value={setup}
							onChange={(e) => setSetup(e.target.value)}
							placeholder="Step-by-step instructions to set up this precondition..."
							rows={4}
						/>
					</div>

					<div className="wit-form-field">
						<label className="wit-field-label" htmlFor="pc-cleanup">
							Cleanup procedure <span className="wit-field-optional">Optional</span>
						</label>
						<textarea
							id="pc-cleanup"
							className="wit-textarea"
							value={cleanup}
							onChange={(e) => setCleanup(e.target.value)}
							placeholder="Steps to undo or clean up after this precondition..."
							rows={3}
						/>
					</div>
				</SectionCollapsible>

				<SectionCollapsible
					title="Used By"
					subtitle="Test cases referencing this precondition (read-only)"
					statusBadge={
						<Badge kind="neutral" dot>
							Info
						</Badge>
					}
				>
					<div className="wit-coming-soon-placeholder">
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-hidden="true"
						>
							<circle cx="8" cy="8" r="6" />
							<path d="M8 5v3l1.5 1.5" />
						</svg>
						Linked test cases will appear here once this precondition is saved.
					</div>
				</SectionCollapsible>
			</div>
		</div>
	);
}
