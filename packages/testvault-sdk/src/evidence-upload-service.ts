import type { EvidenceRef } from "@atconseil/testvault-types";
import type { IAdoClient } from "./ado-client.js";
import type { ITestExecutionService } from "./test-execution-service.js";

const MB = 1024 * 1024;

type EvidenceRule = {
	extensions: string[];
	maxBytes: number;
	label: string;
};

const EVIDENCE_RULES: EvidenceRule[] = [
	{ extensions: ["png", "jpg", "jpeg", "gif"], maxBytes: 10 * MB, label: "10 MB" },
	{ extensions: ["pdf"], maxBytes: 25 * MB, label: "25 MB" },
	{ extensions: ["txt", "log"], maxBytes: 5 * MB, label: "5 MB" },
	{ extensions: ["mp4", "webm"], maxBytes: 100 * MB, label: "100 MB" },
];

export class EvidenceTypeError extends Error {
	constructor(extension: string) {
		super(
			`Unsupported file type ".${extension}". Accepted: PNG, JPG, GIF, PDF, TXT, LOG, MP4, WEBM`
		);
		this.name = "EvidenceTypeError";
	}
}

export class EvidenceSizeLimitError extends Error {
	constructor(extension: string, limit: string) {
		super(`File ".${extension}" exceeds the ${limit} size limit`);
		this.name = "EvidenceSizeLimitError";
	}
}

export interface IEvidenceUploadService {
	upload(executionId: number, file: File, stepIndex?: number): Promise<EvidenceRef>;
}

function getExtension(filename: string): string {
	return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function createEvidenceUploadService(
	adoClient: IAdoClient,
	testExecutionService: ITestExecutionService
): IEvidenceUploadService {
	return {
		async upload(executionId, file, stepIndex) {
			const ext = getExtension(file.name);
			const rule = EVIDENCE_RULES.find((r) => r.extensions.includes(ext));
			if (!rule) throw new EvidenceTypeError(ext);
			if (file.size > rule.maxBytes) throw new EvidenceSizeLimitError(ext, rule.label);

			const buffer = await file.arrayBuffer();
			const content = new Uint8Array(buffer);
			const { id, url } = await adoClient.uploadAttachment(
				file.name,
				content,
				file.type || "application/octet-stream"
			);

			const ref: EvidenceRef = {
				attachmentId: id,
				filename: file.name,
				contentType: file.type || "application/octet-stream",
				sizeBytes: file.size,
				uploadedAt: new Date().toISOString(),
				stepIndex,
				url,
			};

			await testExecutionService.attachEvidence(executionId, ref);
			return ref;
		},
	};
}
