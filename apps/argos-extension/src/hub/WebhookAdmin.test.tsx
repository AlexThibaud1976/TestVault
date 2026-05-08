import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IWebhookAdminService, WebhookTokenSummary } from "./WebhookAdmin.js";
import { WebhookAdmin } from "./WebhookAdmin.js";

const TOKEN_A: WebhookTokenSummary = {
	id: "aaa-111",
	label: "Jenkins CI",
	createdAt: "2026-01-15T10:00:00.000Z",
	revoked: false,
};

const TOKEN_B: WebhookTokenSummary = {
	id: "bbb-222",
	label: "GitHub Actions",
	createdAt: "2026-02-01T08:00:00.000Z",
	revoked: false,
};

function makeSvc(tokens: WebhookTokenSummary[] = []): IWebhookAdminService {
	return {
		listTokens: vi.fn().mockResolvedValue(tokens),
		createToken: vi.fn().mockResolvedValue({
			...TOKEN_A,
			id: "new-333",
			secret: "super-secret-value",
		}),
		revokeToken: vi.fn().mockResolvedValue(undefined),
	};
}

describe("WebhookAdmin", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("shows loading state initially", () => {
		render(<WebhookAdmin service={makeSvc()} />);
		expect(screen.getByTestId("webhook-admin-loading")).toBeDefined();
	});

	it("shows empty state when no tokens exist", async () => {
		render(<WebhookAdmin service={makeSvc([])} />);
		await waitFor(() => screen.getByTestId("webhook-admin-empty"));
		expect(screen.getByTestId("webhook-admin-empty")).toBeDefined();
	});

	it("renders token list after load", async () => {
		render(<WebhookAdmin service={makeSvc([TOKEN_A, TOKEN_B])} />);
		await waitFor(() => screen.getByTestId("webhook-token-aaa-111"));
		expect(screen.getByTestId("webhook-token-aaa-111").textContent).toContain("Jenkins CI");
		expect(screen.getByTestId("webhook-token-bbb-222").textContent).toContain("GitHub Actions");
	});

	it("opens create form on button click", async () => {
		render(<WebhookAdmin service={makeSvc()} />);
		await waitFor(() => screen.getByTestId("create-token-button"));
		await act(async () => {
			fireEvent.click(screen.getByTestId("create-token-button"));
		});
		expect(screen.getByTestId("create-token-form")).toBeDefined();
	});

	it("shows generated secret after token creation", async () => {
		const svc = makeSvc();
		render(<WebhookAdmin service={svc} />);
		await waitFor(() => screen.getByTestId("create-token-button"));
		await act(async () => {
			fireEvent.click(screen.getByTestId("create-token-button"));
		});
		fireEvent.change(screen.getByTestId("token-label-input"), {
			target: { value: "Jenkins CI" },
		});
		await act(async () => {
			fireEvent.click(screen.getByTestId("submit-create-token"));
		});
		await waitFor(() => screen.getByTestId("token-secret-reveal"));
		expect(screen.getByTestId("token-secret-reveal").textContent).toContain("super-secret-value");
	});

	it("calls revokeToken when Revoke button is clicked", async () => {
		const svc = makeSvc([TOKEN_A]);
		render(<WebhookAdmin service={svc} />);
		await waitFor(() => screen.getByTestId("revoke-token-aaa-111"));
		await act(async () => {
			fireEvent.click(screen.getByTestId("revoke-token-aaa-111"));
		});
		await waitFor(() => expect(svc.revokeToken).toHaveBeenCalledWith("aaa-111"));
	});

	it("removes revoked token from list", async () => {
		const svc = makeSvc([TOKEN_A]);
		render(<WebhookAdmin service={svc} />);
		await waitFor(() => screen.getByTestId("revoke-token-aaa-111"));
		await act(async () => {
			fireEvent.click(screen.getByTestId("revoke-token-aaa-111"));
		});
		await waitFor(() => {
			expect(screen.queryByTestId("webhook-token-aaa-111")).toBeNull();
		});
	});

	it("validates that label is required before submit", async () => {
		render(<WebhookAdmin service={makeSvc()} />);
		await waitFor(() => screen.getByTestId("create-token-button"));
		await act(async () => {
			fireEvent.click(screen.getByTestId("create-token-button"));
		});
		await act(async () => {
			fireEvent.click(screen.getByTestId("submit-create-token"));
		});
		expect(screen.getByTestId("create-token-form")).toBeDefined();
		expect(screen.queryByTestId("token-secret-reveal")).toBeNull();
	});
});
