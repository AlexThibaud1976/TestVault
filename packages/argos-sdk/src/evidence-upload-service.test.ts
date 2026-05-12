import { describe, expect, it, vi } from "vitest";
import type { IAdoClient } from "./ado-client.js";
import {
	EvidenceSizeLimitError,
	EvidenceTypeError,
	createEvidenceUploadService,
} from "./evidence-upload-service.js";
import type { ITestExecutionService, InProgressExecution } from "./test-execution-service.js";

const inProgressExec: InProgressExecution = {
	id: 99,
	testPlanId: 10,
	testCaseId: 42,
	environment: "QA",
	stepResults: [],
	evidence: [],
	bugLinks: [],
	source: "Manual",
	executedBy: "tester@example.com",
};

function makeAdoClient(overrides?: Partial<IAdoClient>): IAdoClient {
	return {
		fetchWorkItem: vi.fn(),
		createWorkItem: vi.fn(),
		updateWorkItem: vi.fn(),
		deleteWorkItem: vi.fn(),
		queryByWiql: vi.fn(),
		uploadAttachment: vi.fn().mockResolvedValue({
			id: "att-123",
			url: "https://dev.azure.com/org/_apis/wit/attachments/att-123",
		}),
		...overrides,
	};
}

function makeExecService(overrides?: Partial<ITestExecutionService>): ITestExecutionService {
	return {
		startRun: vi.fn(),
		saveStepResult: vi.fn(),
		attachEvidence: vi.fn().mockResolvedValue(inProgressExec),
		finalizeRun: vi.fn(),
		linkBug: vi.fn(),
		listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
		...overrides,
	};
}

const MB = 1024 * 1024;

function fakeFile(name: string, sizeBytes: number, type: string): File {
	const file = Object.create(File.prototype) as File;
	Object.defineProperties(file, {
		name: { value: name, configurable: true },
		size: { value: sizeBytes, configurable: true },
		type: { value: type, configurable: true },
		arrayBuffer: {
			value: async () => new ArrayBuffer(1), // minimal allocation
			configurable: true,
		},
	});
	return file;
}

// ─── upload — happy path ──────────────────────────────────────────────────────

describe("upload — happy path", () => {
	it("calls uploadAttachment with filename and raw bytes", async () => {
		const adoClient = makeAdoClient();
		const service = createEvidenceUploadService(adoClient, makeExecService());
		await service.upload(99, fakeFile("screenshot.png", 1000, "image/png"));
		expect(vi.mocked(adoClient.uploadAttachment)).toHaveBeenCalledWith(
			"screenshot.png",
			expect.any(Uint8Array),
			"image/png"
		);
	});

	it("calls attachEvidence with constructed EvidenceRef", async () => {
		const execService = makeExecService();
		const service = createEvidenceUploadService(makeAdoClient(), execService);
		await service.upload(99, fakeFile("screenshot.png", 1000, "image/png"));
		expect(vi.mocked(execService.attachEvidence)).toHaveBeenCalledWith(
			99,
			expect.objectContaining({
				attachmentId: "att-123",
				filename: "screenshot.png",
				contentType: "image/png",
				sizeBytes: 1000,
			})
		);
	});

	it("returns EvidenceRef with attachmentId and url from upload response", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		const ref = await service.upload(99, fakeFile("shot.png", 500, "image/png"));
		expect(ref.attachmentId).toBe("att-123");
		expect(ref.url).toBe("https://dev.azure.com/org/_apis/wit/attachments/att-123");
	});

	it("passes stepIndex through to EvidenceRef", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		const ref = await service.upload(99, fakeFile("shot.png", 500, "image/png"), 1);
		expect(ref.stepIndex).toBe(1);
	});

	it("EvidenceRef.stepIndex is undefined when not provided", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		const ref = await service.upload(99, fakeFile("shot.png", 500, "image/png"));
		expect(ref.stepIndex).toBeUndefined();
	});

	it("accepts .jpg extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("photo.jpg", 500, "image/jpeg"))
		).resolves.toBeDefined();
	});

	it("accepts .jpeg extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("photo.jpeg", 500, "image/jpeg"))
		).resolves.toBeDefined();
	});

	it("accepts .gif extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(service.upload(99, fakeFile("anim.gif", 500, "image/gif"))).resolves.toBeDefined();
	});

	it("accepts .pdf extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("report.pdf", MB, "application/pdf"))
		).resolves.toBeDefined();
	});

	it("accepts .txt extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("log.txt", 1000, "text/plain"))
		).resolves.toBeDefined();
	});

	it("accepts .log extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("app.log", 1000, "text/plain"))
		).resolves.toBeDefined();
	});

	it("accepts .mp4 extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(service.upload(99, fakeFile("demo.mp4", MB, "video/mp4"))).resolves.toBeDefined();
	});

	it("accepts .webm extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("demo.webm", MB, "video/webm"))
		).resolves.toBeDefined();
	});

	it("accepts PNG at exactly the 10 MB limit", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("shot.png", 10 * MB, "image/png"))
		).resolves.toBeDefined();
	});
});

// ─── upload — type validation ─────────────────────────────────────────────────

describe("upload — type validation", () => {
	it("throws EvidenceTypeError for unsupported .exe extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("malware.exe", 100, "application/octet-stream"))
		).rejects.toThrow(EvidenceTypeError);
	});

	it("throws EvidenceTypeError for unsupported .docx extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(
				99,
				fakeFile(
					"report.docx",
					100,
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
				)
			)
		).rejects.toThrow(EvidenceTypeError);
	});

	it("EvidenceTypeError message includes the rejected extension", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(service.upload(99, fakeFile("bad.exe", 100, ""))).rejects.toThrow("exe");
	});
});

// ─── upload — size validation ─────────────────────────────────────────────────

describe("upload — size validation", () => {
	it("throws EvidenceSizeLimitError for PNG over 10 MB", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(service.upload(99, fakeFile("big.png", 10 * MB + 1, "image/png"))).rejects.toThrow(
			EvidenceSizeLimitError
		);
	});

	it("throws EvidenceSizeLimitError for PDF over 25 MB", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("big.pdf", 25 * MB + 1, "application/pdf"))
		).rejects.toThrow(EvidenceSizeLimitError);
	});

	it("throws EvidenceSizeLimitError for TXT over 5 MB", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(service.upload(99, fakeFile("big.txt", 5 * MB + 1, "text/plain"))).rejects.toThrow(
			EvidenceSizeLimitError
		);
	});

	it("throws EvidenceSizeLimitError for MP4 over 100 MB", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("big.mp4", 100 * MB + 1, "video/mp4"))
		).rejects.toThrow(EvidenceSizeLimitError);
	});

	it("EvidenceSizeLimitError message includes the limit in MB", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		const err = await service
			.upload(99, fakeFile("big.png", 10 * MB + 1, "image/png"))
			.catch((e: unknown) => e);
		expect(err).toBeInstanceOf(EvidenceSizeLimitError);
		expect(String(err)).toMatch(/10\s*MB/);
	});

	it("does not throw for LOG at exactly the 5 MB limit", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		await expect(
			service.upload(99, fakeFile("app.log", 5 * MB, "text/plain"))
		).resolves.toBeDefined();
	});
});

// ─── uploadedAt ───────────────────────────────────────────────────────────────

describe("upload — uploadedAt", () => {
	it("sets uploadedAt to a valid ISO datetime string", async () => {
		const service = createEvidenceUploadService(makeAdoClient(), makeExecService());
		const ref = await service.upload(99, fakeFile("shot.png", 100, "image/png"));
		expect(() => new Date(ref.uploadedAt)).not.toThrow();
		expect(ref.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});
