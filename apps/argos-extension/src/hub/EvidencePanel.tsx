import type { EvidenceRef } from "@atconseil/argos-types";
import { Button, Text } from "@fluentui/react-components";
import { useRef } from "react";

export interface EvidencePanelProps {
	evidence: EvidenceRef[];
	onFileSelected: (file: File) => void;
	uploading?: boolean;
	error?: string;
}

function isImage(contentType: string): boolean {
	return contentType.startsWith("image/");
}

function isVideo(contentType: string): boolean {
	return contentType.startsWith("video/");
}

export function EvidencePanel({ evidence, onFileSelected, uploading, error }: EvidencePanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) onFileSelected(file);
		e.target.value = "";
	}

	return (
		<div>
			<input
				ref={inputRef}
				data-testid="evidence-file-input"
				type="file"
				accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.log,.mp4,.webm"
				style={{ display: "none" }}
				onChange={handleChange}
			/>

			<Button
				data-testid="evidence-add-button"
				appearance="secondary"
				size="small"
				onClick={() => inputRef.current?.click()}
				disabled={uploading}
			>
				Add evidence
			</Button>

			{uploading && (
				<span data-testid="evidence-uploading" style={{ marginLeft: "8px", color: "#888" }}>
					Uploading…
				</span>
			)}

			{error && (
				<div data-testid="evidence-error" style={{ color: "red", marginTop: "8px" }}>
					{error}
				</div>
			)}

			{evidence.length > 0 && (
				<ul style={{ listStyle: "none", padding: 0, marginTop: "12px" }}>
					{evidence.map((ref) => (
						<li
							key={ref.attachmentId}
							data-testid={`evidence-item-${ref.attachmentId}`}
							style={{ marginBottom: "8px" }}
						>
							{isImage(ref.contentType) ? (
								<img
									data-testid={`evidence-preview-${ref.attachmentId}`}
									src={ref.url ?? ""}
									alt={ref.filename}
									style={{ maxWidth: "100%", maxHeight: "120px", display: "block" }}
								/>
							) : isVideo(ref.contentType) ? (
								<video
									data-testid={`evidence-video-${ref.attachmentId}`}
									src={ref.url ?? ""}
									controls
									style={{ maxWidth: "100%", maxHeight: "120px" }}
								>
									<track kind="captions" />
								</video>
							) : (
								<a
									data-testid={`evidence-link-${ref.attachmentId}`}
									href={ref.url ?? "#"}
									download={ref.filename}
								>
									{ref.filename}
								</a>
							)}
							<Text size={200} style={{ display: "block", color: "#666" }}>
								{ref.filename} ({(ref.sizeBytes / 1024).toFixed(1)} KB)
							</Text>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
