import type { IWorkItemLinkService, WiLinkType, WorkItemLink } from "@atconseil/argos-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkItemLinkPanel } from "./WorkItemLinkPanel.js";

afterEach(cleanup);

function makeLink(targetId: number, linkType: WiLinkType, isOrphan = false): WorkItemLink {
	return {
		targetId,
		targetUrl: `https://dev.azure.com/org/Proj/_apis/wit/workitems/${targetId}`,
		linkType,
		isOrphan,
	};
}

function makeService(overrides?: Partial<IWorkItemLinkService>): IWorkItemLinkService {
	return {
		listLinks: vi
			.fn()
			.mockResolvedValue([makeLink(10, "TestVault.TestedBy"), makeLink(20, "TestVault.Validates")]),
		addLink: vi.fn().mockResolvedValue(undefined),
		removeLink: vi.fn().mockResolvedValue(undefined),
		detectOrphanLinks: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

describe("WorkItemLinkPanel", () => {
	it("calls listLinks on mount with the testCaseId", async () => {
		const service = makeService();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(vi.mocked(service.listLinks)).toHaveBeenCalledWith(42));
	});

	it("renders a link-item for each returned link", async () => {
		const service = makeService();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(screen.getByTestId("link-item-10")).toBeDefined());
		expect(screen.getByTestId("link-item-20")).toBeDefined();
	});

	it("each link item shows the target WI ID and link type", async () => {
		const service = makeService();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(screen.getByTestId("link-item-10")).toBeDefined());
		expect(screen.getByTestId("link-item-10").textContent).toContain("10");
		expect(screen.getByTestId("link-item-10").textContent).toContain("TestedBy");
	});

	it("shows links-empty when no links are returned", async () => {
		const service = makeService({ listLinks: vi.fn().mockResolvedValue([]) });
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(screen.getByTestId("links-empty")).toBeDefined());
	});

	it("clicking remove-link calls removeLink with correct args then reloads", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(screen.getByTestId("remove-link-10")).toBeDefined());
		await user.click(screen.getByTestId("remove-link-10"));
		await waitFor(() =>
			expect(vi.mocked(service.removeLink)).toHaveBeenCalledWith(42, 10, "TestVault.TestedBy")
		);
		expect(vi.mocked(service.listLinks)).toHaveBeenCalledTimes(2);
	});

	it("typing a WI ID and clicking Add calls addLink then reloads", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await user.type(screen.getByTestId("add-link-input"), "99");
		await user.selectOptions(screen.getByTestId("add-link-type"), "TestVault.Covers");
		await user.click(screen.getByTestId("add-link-button"));
		await waitFor(() =>
			expect(vi.mocked(service.addLink)).toHaveBeenCalledWith(42, 99, "TestVault.Covers")
		);
		expect(vi.mocked(service.listLinks)).toHaveBeenCalledTimes(2);
	});

	it("shows add-link-error when input is not a valid number", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await user.type(screen.getByTestId("add-link-input"), "abc");
		await user.click(screen.getByTestId("add-link-button"));
		expect(screen.getByTestId("add-link-error")).toBeDefined();
		expect(vi.mocked(service.addLink)).not.toHaveBeenCalled();
	});

	it("clears the input after successful add", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await user.type(screen.getByTestId("add-link-input"), "55");
		await user.click(screen.getByTestId("add-link-button"));
		await waitFor(() => expect(vi.mocked(service.addLink)).toHaveBeenCalled());
		expect((screen.getByTestId("add-link-input") as HTMLInputElement).value).toBe("");
	});

	it("clicking detect-orphans-button calls detectOrphanLinks and shows orphan badge", async () => {
		const service = makeService({
			detectOrphanLinks: vi.fn().mockResolvedValue([makeLink(10, "TestVault.TestedBy", true)]),
		});
		const user = userEvent.setup();
		render(<WorkItemLinkPanel testCaseId={42} service={service} />);
		await waitFor(() => expect(screen.getByTestId("link-item-10")).toBeDefined());
		await user.click(screen.getByTestId("detect-orphans-button"));
		await waitFor(() => expect(screen.getByTestId("link-item-10-orphan")).toBeDefined());
	});
});
