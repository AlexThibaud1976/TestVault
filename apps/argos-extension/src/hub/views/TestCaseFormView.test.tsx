import type { ITestCaseService, TestCaseDraft } from "@atconseil/argos-sdk";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockAdoClassificationService,
	createMockAdoIterationsService,
	createMockAiGenerationService,
	createMockLlmConfigService,
	createMockServices,
	createMockTestCaseService,
} from "../../test-utils/mock-services.js";
import { ToastProvider } from "../components/Toast.js";
import { ServicesContext } from "../services-context.js";
import { TestCaseFormView } from "./TestCaseFormView.js";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const AREA_PATHS = [
	{ id: 1, name: "MockProject", path: "MockProject", hasChildren: true },
	{ id: 2, name: "Auth", path: "MockProject\\Auth", hasChildren: false },
	{ id: 3, name: "Billing", path: "MockProject\\Billing", hasChildren: false },
];

const ITERATIONS = [
	{ id: 10, name: "MockProject", path: "MockProject", hasChildren: true },
	{ id: 11, name: "Sprint 1", path: "MockProject\\Sprint 1", hasChildren: false },
	{ id: 12, name: "Sprint 2", path: "MockProject\\Sprint 2", hasChildren: false },
];

const LLM_CONFIG = {
	provider: "azure-openai" as const,
	apiKey: "test-key-1234",
	endpoint: "https://example.openai.azure.com",
	deploymentName: "gpt-4o",
};

interface RenderOptions {
	testCaseService?: ITestCaseService;
	aiGenerate?: () => Promise<unknown>;
	getConfig?: () => Promise<unknown>;
}

function renderForm(opts: RenderOptions = {}) {
	const services = createMockServices({
		adoClassificationService: createMockAdoClassificationService({
			getAreaPaths: vi.fn().mockResolvedValue(AREA_PATHS),
		}),
		adoIterationsService: createMockAdoIterationsService({
			getIterations: vi.fn().mockResolvedValue(ITERATIONS),
		}),
		testCaseService: opts.testCaseService ?? createMockTestCaseService(),
		aiGenerationService: createMockAiGenerationService({
			generate: opts.aiGenerate
				? (vi.fn(opts.aiGenerate) as unknown as ReturnType<
						typeof createMockAiGenerationService
					>["generate"])
				: vi.fn().mockResolvedValue([]),
		}),
		llmConfigService: createMockLlmConfigService({
			getConfig: opts.getConfig
				? (vi.fn(opts.getConfig) as unknown as ReturnType<
						typeof createMockLlmConfigService
					>["getConfig"])
				: vi.fn().mockResolvedValue(LLM_CONFIG),
		}),
	});

	const onCancel = vi.fn();
	const onSuccess = vi.fn();
	render(
		<ServicesContext.Provider value={services}>
			<ToastProvider>
				<TestCaseFormView onCancel={onCancel} onSuccess={onSuccess} />
			</ToastProvider>
		</ServicesContext.Provider>
	);
	return { services, onCancel, onSuccess };
}

// =============================================================================
// T-2.22.1 — Sprint 2.19/2.20 regression: Area Path + Iteration Path absents
// Spec: spec.md US-1.1
// =============================================================================

describe("T-2.22.1 -- TestCaseFormView Area Path + Iteration Path (Sprint 2.19/2.20 regression)", () => {
	it("renders an Area Path field", async () => {
		renderForm();
		await waitFor(() => {
			// Area Path label must be visible (form field, not 'Coming Soon' placeholder)
			const all = screen.queryAllByText(/Area Path/i);
			const labelMatch = all.find((el) => el.tagName === "LABEL");
			expect(labelMatch).toBeDefined();
		});
	});

	it("renders an Iteration Path field", async () => {
		renderForm();
		await waitFor(() => {
			const all = screen.queryAllByText(/Iteration Path/i);
			const labelMatch = all.find((el) => el.tagName === "LABEL");
			expect(labelMatch).toBeDefined();
		});
	});

	it("Area Path is required: save without Area Path does NOT call testCaseService.create", async () => {
		const user = userEvent.setup();
		const createMock = vi.fn().mockResolvedValue({ id: 1 });
		renderForm({
			testCaseService: createMockTestCaseService({ create: createMock }),
		});

		// Fill title so the save button is enabled
		const titleInput = screen.getByPlaceholderText(/Login with valid credentials/i);
		await user.type(titleInput, "My test case");

		// Click save without setting an Area Path
		const saveButton = screen.getByRole("button", { name: /Create Test Case/i });
		await user.click(saveButton);

		// Should NOT have called create (current main calls it with areaPath:"")
		expect(createMock).not.toHaveBeenCalled();
	});

	it("save with Area Path passes the selected path to testCaseService.create", async () => {
		const user = userEvent.setup();
		const createMock = vi.fn().mockResolvedValue({ id: 1 });
		renderForm({
			testCaseService: createMockTestCaseService({ create: createMock }),
		});

		// Wait for area paths to load
		await waitFor(() => {
			expect(screen.getAllByText(/MockProject\\Auth/).length).toBeGreaterThan(0);
		});

		const titleInput = screen.getByPlaceholderText(/Login with valid credentials/i);
		await user.type(titleInput, "My test case");

		// Find the Area Path select element and select an option
		const areaSelect = (await screen.findByLabelText(/Area Path/i)) as HTMLSelectElement;
		await user.selectOptions(areaSelect, "MockProject\\Auth");

		const saveButton = screen.getByRole("button", { name: /Create Test Case/i });
		await user.click(saveButton);

		await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
		const draftArg = createMock.mock.calls[0]?.[0] as TestCaseDraft;
		expect(draftArg.areaPath).toBe("MockProject\\Auth");
	});

	it("Iteration Path is optional: save without Iteration Path still succeeds", async () => {
		const user = userEvent.setup();
		const createMock = vi.fn().mockResolvedValue({ id: 1 });
		renderForm({
			testCaseService: createMockTestCaseService({ create: createMock }),
		});

		await waitFor(() => {
			expect(screen.getAllByText(/MockProject\\Auth/).length).toBeGreaterThan(0);
		});

		const titleInput = screen.getByPlaceholderText(/Login with valid credentials/i);
		await user.type(titleInput, "My TC");

		const areaSelect = (await screen.findByLabelText(/Area Path/i)) as HTMLSelectElement;
		await user.selectOptions(areaSelect, "MockProject\\Auth");

		// Leave Iteration Path empty
		const saveButton = screen.getByRole("button", { name: /Create Test Case/i });
		await user.click(saveButton);

		await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
		const draftArg = createMock.mock.calls[0]?.[0] as TestCaseDraft;
		expect(draftArg.areaPath).toBe("MockProject\\Auth");
		// iterationPath either undefined or empty -- both acceptable for optional field
		expect(!draftArg.iterationPath || draftArg.iterationPath === "").toBe(true);
	});
});

// =============================================================================
// T-2.22.2 -- Sprint 2.21 part 1 regression: AI button wrong placement / wrong semantics
// Spec: spec.md US-5.1.1
// =============================================================================

describe("T-2.22.2 -- TestCaseFormView AI Suggest Steps (Sprint 2.21 part 1 regression)", () => {
	it("button label is 'AI Suggest Steps' (not 'AI Generate')", async () => {
		renderForm();
		await waitFor(() => {
			// Old label must be gone
			expect(screen.queryByRole("button", { name: /^AI Generate$/i })).toBeNull();
			// New label must be present
			expect(screen.getByRole("button", { name: /AI Suggest Steps/i })).toBeDefined();
		});
	});

	it("AI Suggest Steps is disabled when no title and no linked requirement", async () => {
		renderForm();
		const btn = (await screen.findByRole("button", {
			name: /AI Suggest Steps/i,
		})) as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it("AI Suggest Steps is enabled when title is set", async () => {
		const user = userEvent.setup();
		renderForm();
		const titleInput = screen.getByPlaceholderText(/Login with valid credentials/i);
		await user.type(titleInput, "My TC");
		const btn = (await screen.findByRole("button", {
			name: /AI Suggest Steps/i,
		})) as HTMLButtonElement;
		expect(btn.disabled).toBe(false);
	});

	it("clicking AI Suggest Steps does NOT call testCaseService.create (no WIT creation)", async () => {
		const user = userEvent.setup();
		const createMock = vi.fn().mockResolvedValue({ id: 1 });
		renderForm({
			testCaseService: createMockTestCaseService({ create: createMock }),
			aiGenerate: () =>
				Promise.resolve([
					{
						title: "AI suggested TC",
						description: "Generated",
						priority: "P2",
						steps: [{ action: "Step A action", expected: "Step A expected" }],
						tags: ["ai"],
						coverage_type: "happy_path",
					},
				]),
		});

		const titleInput = screen.getByPlaceholderText(/Login with valid credentials/i);
		await user.type(titleInput, "My TC");

		const btn = await screen.findByRole("button", { name: /AI Suggest Steps/i });
		await user.click(btn);

		// Allow modal LLM call + render to settle
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Critical assertion: NO Test Case creation API call must have been issued
		expect(createMock).not.toHaveBeenCalled();
	});
});
