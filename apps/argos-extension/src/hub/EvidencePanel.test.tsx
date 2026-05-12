import type { EvidenceRef } from "@atconseil/argos-types";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvidencePanel } from "./EvidencePanel.js";

afterEach(cleanup);

const NOW = "2026-05-08T12:00:00.000Z";

function makeRef(overrides?: Partial<EvidenceRef>): EvidenceRef {
	return {
		attachmentId: "att-abc",
		filename: "screenshot.png",
		contentType: "image/png",
		sizeBytes: 4096,
		uploadedAt: NOW,
		url: "https://dev.azure.com/org/_apis/wit/attachments/att-abc",
		...overrides,
	};
}

describe("EvidencePanel", () => {
	it("renders Add evidence button", () => {
		render(<EvidencePanel evidence={[]} onFileSelected={vi.fn()} />);
		expect(screen.getByTestId("evidence-add-button")).toBeDefined();
	});

	it("calls onFileSelected when file is chosen via input", async () => {
		const onFileSelected = vi.fn();
		const user = userEvent.setup();
		render(<EvidencePanel evidence={[]} onFileSelected={onFileSelected} />);
		const input = screen.getByTestId("evidence-file-input") as HTMLInputElement;
		const file = new File(["data"], "shot.png", { type: "image/png" });
		await user.upload(input, file);
		expect(onFileSelected).toHaveBeenCalledWith(file);
	});

	it("shows error message when error prop is set", () => {
		render(
			<EvidencePanel evidence={[]} onFileSelected={vi.fn()} error="File too large (max 10 MB)" />
		);
		expect(screen.getByTestId("evidence-error").textContent).toMatch(/too large/i);
	});

	it("does NOT show error element when error prop is absent", () => {
		render(<EvidencePanel evidence={[]} onFileSelected={vi.fn()} />);
		expect(screen.queryByTestId("evidence-error")).toBeNull();
	});

	it("shows uploading indicator when uploading=true", () => {
		render(<EvidencePanel evidence={[]} onFileSelected={vi.fn()} uploading />);
		expect(screen.getByTestId("evidence-uploading")).toBeDefined();
	});

	it("does NOT show uploading indicator when uploading=false", () => {
		render(<EvidencePanel evidence={[]} onFileSelected={vi.fn()} />);
		expect(screen.queryByTestId("evidence-uploading")).toBeNull();
	});

	it("renders image preview <img> for PNG evidence", () => {
		const ref = makeRef({ filename: "shot.png", contentType: "image/png" });
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		const img = screen.getByTestId(`evidence-preview-${ref.attachmentId}`);
		expect(img.tagName.toLowerCase()).toBe("img");
		expect((img as HTMLImageElement).src).toContain(ref.url);
	});

	it("renders image preview for JPG evidence", () => {
		const ref = makeRef({
			attachmentId: "att-jpg",
			filename: "photo.jpg",
			contentType: "image/jpeg",
		});
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		expect(screen.getByTestId("evidence-preview-att-jpg")).toBeDefined();
	});

	it("renders video player <video> for MP4 evidence", () => {
		const ref = makeRef({
			attachmentId: "att-mp4",
			filename: "demo.mp4",
			contentType: "video/mp4",
		});
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		const video = screen.getByTestId("evidence-video-att-mp4");
		expect(video.tagName.toLowerCase()).toBe("video");
	});

	it("renders video player for WEBM evidence", () => {
		const ref = makeRef({
			attachmentId: "att-webm",
			filename: "demo.webm",
			contentType: "video/webm",
		});
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		expect(screen.getByTestId("evidence-video-att-webm")).toBeDefined();
	});

	it("renders download link <a> for PDF evidence", () => {
		const ref = makeRef({
			attachmentId: "att-pdf",
			filename: "report.pdf",
			contentType: "application/pdf",
		});
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		const link = screen.getByTestId("evidence-link-att-pdf");
		expect(link.tagName.toLowerCase()).toBe("a");
		expect((link as HTMLAnchorElement).href).toContain(ref.url);
	});

	it("renders download link for TXT evidence", () => {
		const ref = makeRef({
			attachmentId: "att-txt",
			filename: "app.log",
			contentType: "text/plain",
		});
		render(<EvidencePanel evidence={[ref]} onFileSelected={vi.fn()} />);
		expect(screen.getByTestId("evidence-link-att-txt")).toBeDefined();
	});

	it("renders item container for each evidence entry", () => {
		const refs = [
			makeRef({ attachmentId: "att-1", filename: "a.png", contentType: "image/png" }),
			makeRef({ attachmentId: "att-2", filename: "b.pdf", contentType: "application/pdf" }),
		];
		render(<EvidencePanel evidence={refs} onFileSelected={vi.fn()} />);
		expect(screen.getByTestId("evidence-item-att-1")).toBeDefined();
		expect(screen.getByTestId("evidence-item-att-2")).toBeDefined();
	});

	it("renders nothing for empty evidence array (no item containers)", () => {
		render(<EvidencePanel evidence={[]} onFileSelected={vi.fn()} />);
		expect(screen.queryByTestId(/^evidence-item-/)).toBeNull();
	});
});
