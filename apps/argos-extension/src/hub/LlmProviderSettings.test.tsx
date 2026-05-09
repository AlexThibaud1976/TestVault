import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LlmProviderSettings } from "./LlmProviderSettings.js";
import type { ILlmProviderService, LlmProvider } from "./llm-provider-service.js";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeProvider(overrides?: Partial<LlmProvider>): LlmProvider {
	return {
		id: "p1",
		type: "anthropic",
		label: "Claude Production",
		modelId: "claude-haiku-4-5-20251001",
		maskedKey: "****1234",
		isActive: true,
		addedAt: "2026-01-01T00:00:00Z",
		addedBy: "admin",
		...overrides,
	};
}

function makeService(
	providers: LlmProvider[] = [],
	overrides?: Partial<ILlmProviderService>
): ILlmProviderService {
	return {
		list: vi.fn().mockResolvedValue(providers),
		add: vi.fn().mockImplementation(async (input) => ({
			id: "new-p",
			type: input.type,
			label: input.label,
			modelId: input.modelId,
			maskedKey: `****${input.apiKey.slice(-4)}`,
			isActive: true,
			addedAt: new Date().toISOString(),
			addedBy: "admin",
		})),
		remove: vi.fn().mockResolvedValue(undefined),
		testConnection: vi.fn().mockResolvedValue({ success: true, message: "Connection successful" }),
		...overrides,
	};
}

describe("LlmProviderSettings", () => {
	it("shows loading state initially", () => {
		render(<LlmProviderSettings service={makeService()} isAdmin />);
		expect(screen.getByTestId("llm-provider-loading")).toBeDefined();
	});

	it("renders provider list after load", async () => {
		const p = makeProvider();
		render(<LlmProviderSettings service={makeService([p])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId(`llm-provider-${p.id}`)).toBeDefined());
	});

	it("shows empty state when no providers", async () => {
		render(<LlmProviderSettings service={makeService([])} isAdmin />);
		await waitFor(() => expect(screen.getByTestId("llm-provider-empty")).toBeDefined());
	});

	it("shows no-permission when isAdmin=false", async () => {
		render(<LlmProviderSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => expect(screen.getByTestId("llm-provider-no-permission")).toBeDefined());
	});

	it("does not show add button when isAdmin=false", async () => {
		render(<LlmProviderSettings service={makeService()} isAdmin={false} />);
		await waitFor(() => screen.getByTestId("llm-provider-no-permission"));
		expect(screen.queryByTestId("add-provider-button")).toBeNull();
	});

	it("shows label-error when Add is clicked with empty label", async () => {
		const user = userEvent.setup();
		render(<LlmProviderSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("add-provider-button"));
		await user.click(screen.getByTestId("add-provider-button"));
		expect(screen.getByTestId("label-error")).toBeDefined();
	});

	it("shows api-key-error when Add is clicked with missing API key", async () => {
		const user = userEvent.setup();
		render(<LlmProviderSettings service={makeService()} isAdmin />);
		await waitFor(() => screen.getByTestId("add-provider-button"));
		await user.type(screen.getByTestId("provider-label-input"), "My Claude");
		await user.type(screen.getByTestId("provider-model-input"), "claude-haiku-4-5-20251001");
		await user.click(screen.getByTestId("add-provider-button"));
		expect(screen.getByTestId("api-key-error")).toBeDefined();
	});

	it("calls service.add with correct fields", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("add-provider-button"));
		await user.type(screen.getByTestId("provider-label-input"), "My Claude");
		await user.type(screen.getByTestId("provider-model-input"), "claude-haiku-4-5-20251001");
		await user.type(screen.getByTestId("provider-api-key-input"), "sk-ant-test-1234");
		await user.click(screen.getByTestId("add-provider-button"));
		await waitFor(() =>
			expect(vi.mocked(service.add)).toHaveBeenCalledWith(
				expect.objectContaining({ label: "My Claude", modelId: "claude-haiku-4-5-20251001" })
			)
		);
	});

	it("newly added provider appears in list", async () => {
		const service = makeService();
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId("add-provider-button"));
		await user.type(screen.getByTestId("provider-label-input"), "New Provider");
		await user.type(screen.getByTestId("provider-model-input"), "gpt-5.2");
		await user.type(screen.getByTestId("provider-api-key-input"), "sk-openai-1234");
		await user.click(screen.getByTestId("add-provider-button"));
		await waitFor(() => expect(screen.getByTestId("llm-provider-new-p")).toBeDefined());
	});

	it("calls service.remove when remove button is clicked", async () => {
		const p = makeProvider();
		const service = makeService([p]);
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`remove-provider-${p.id}`));
		await user.click(screen.getByTestId(`remove-provider-${p.id}`));
		await waitFor(() => expect(vi.mocked(service.remove)).toHaveBeenCalledWith(p.id));
	});

	it("removed provider disappears from list", async () => {
		const p = makeProvider();
		const service = makeService([p]);
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`remove-provider-${p.id}`));
		await user.click(screen.getByTestId(`remove-provider-${p.id}`));
		await waitFor(() => expect(screen.queryByTestId(`llm-provider-${p.id}`)).toBeNull());
	});

	it("calls service.testConnection when Test is clicked", async () => {
		const p = makeProvider();
		const service = makeService([p]);
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`test-provider-${p.id}`));
		await user.click(screen.getByTestId(`test-provider-${p.id}`));
		await waitFor(() => expect(vi.mocked(service.testConnection)).toHaveBeenCalledWith(p.id));
	});

	it("shows test result badge after Test completes", async () => {
		const p = makeProvider();
		const service = makeService([p]);
		const user = userEvent.setup();
		render(<LlmProviderSettings service={service} isAdmin />);
		await waitFor(() => screen.getByTestId(`test-provider-${p.id}`));
		await user.click(screen.getByTestId(`test-provider-${p.id}`));
		await waitFor(() => expect(screen.getByTestId(`test-result-${p.id}`)).toBeDefined());
	});
});
