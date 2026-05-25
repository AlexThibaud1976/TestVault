import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 AI generation flow regression -- UPDATED for Sprint 2.22.
// Sprint 2.22 split the legacy AiGenerateModal into:
//   - AiSuggestTestsModal (Coverage Panel of US/Bug/Requirement, T-2.22.3)
//   - AiSuggestStepsModal (Test Case form, steps-only, T-2.22.2)
// WorkItemPicker was removed (source is now implicit).
// This test guards the modern surface; the old surface is covered by
// the CHANGELOG and the Sprint 2.22 commit history.

const ROOT = resolve(__dirname, "../..");
const AI_SUGGEST_TESTS_MODAL = resolve(
	ROOT,
	"apps/argos-extension/src/hub/components/AiSuggestTestsModal.tsx"
);
const AI_SUGGEST_STEPS_MODAL = resolve(
	ROOT,
	"apps/argos-extension/src/hub/components/AiSuggestStepsModal.tsx"
);
const SUGGESTION_CARD = resolve(
	ROOT,
	"apps/argos-extension/src/hub/components/AiSuggestionCard.tsx"
);
const LLM_STATUS = resolve(ROOT, "apps/argos-extension/src/hub/components/LlmConfigStatus.tsx");
const USE_AI_GEN = resolve(ROOT, "apps/argos-extension/src/hub/hooks/use-ai-generation.ts");
const USE_WORK_ITEMS = resolve(ROOT, "apps/argos-extension/src/hub/hooks/use-ado-work-items.ts");
const AI_GEN_SERVICE = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/ai-generation-service.ts"
);
const WORK_ITEMS_SERVICE = resolve(
	ROOT,
	"apps/argos-extension/src/hub/services/ado-work-items-service.ts"
);
const TC_FORM = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");
const COVERAGE_PANEL = resolve(ROOT, "apps/argos-extension/src/hub/CoveragePanel.tsx");
const SETTINGS_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/SettingsView.tsx");

describe("T-2.21 AI generation flow (post Sprint 2.22)", () => {
	it("AiSuggestTestsModal.tsx exists (Sprint 2.22 replacement for AiGenerateModal)", () => {
		const src = readFileSync(AI_SUGGEST_TESTS_MODAL, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("AiSuggestTestsModal exports AiSuggestTestsModal component", () => {
		const src = readFileSync(AI_SUGGEST_TESTS_MODAL, "utf-8");
		expect(src).toContain("AiSuggestTestsModal");
	});

	it("AiSuggestTestsModal has the suggestions -> create flow", () => {
		const src = readFileSync(AI_SUGGEST_TESTS_MODAL, "utf-8");
		expect(src).toContain("Generate suggestions");
		expect(src).toContain("Create");
	});

	it("AiSuggestStepsModal.tsx exists (Sprint 2.22 steps-only flow)", () => {
		const src = readFileSync(AI_SUGGEST_STEPS_MODAL, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("AiSuggestStepsModal exports AiSuggestStepsModal component", () => {
		const src = readFileSync(AI_SUGGEST_STEPS_MODAL, "utf-8");
		expect(src).toContain("AiSuggestStepsModal");
	});

	it("AiSuggestionCard.tsx exists", () => {
		const src = readFileSync(SUGGESTION_CARD, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("AiSuggestionCard exports AiSuggestionCard", () => {
		const src = readFileSync(SUGGESTION_CARD, "utf-8");
		expect(src).toContain("AiSuggestionCard");
	});

	it("LlmConfigStatus.tsx exists", () => {
		const src = readFileSync(LLM_STATUS, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("use-ai-generation.ts exports useAiGeneration", () => {
		const src = readFileSync(USE_AI_GEN, "utf-8");
		expect(src).toContain("useAiGeneration");
	});

	it("use-ai-generation.ts returns isLoading and error", () => {
		const src = readFileSync(USE_AI_GEN, "utf-8");
		expect(src).toContain("isLoading");
		expect(src).toContain("error");
	});

	it("use-ado-work-items.ts exports useAdoWorkItems", () => {
		const src = readFileSync(USE_WORK_ITEMS, "utf-8");
		expect(src).toContain("useAdoWorkItems");
	});

	it("use-ado-work-items.ts returns isLoading and error", () => {
		const src = readFileSync(USE_WORK_ITEMS, "utf-8");
		expect(src).toContain("isLoading");
		expect(src).toContain("error");
	});

	it("ai-generation-service.ts exports IAiGenerationService", () => {
		const src = readFileSync(AI_GEN_SERVICE, "utf-8");
		expect(src).toContain("IAiGenerationService");
	});

	it("ai-generation-service.ts exports createAiGenerationService", () => {
		const src = readFileSync(AI_GEN_SERVICE, "utf-8");
		expect(src).toContain("createAiGenerationService");
	});

	it("ado-work-items-service.ts exports IAdoWorkItemsService", () => {
		const src = readFileSync(WORK_ITEMS_SERVICE, "utf-8");
		expect(src).toContain("IAdoWorkItemsService");
	});

	it("ado-work-items-service.ts exports createAdoWorkItemsService", () => {
		const src = readFileSync(WORK_ITEMS_SERVICE, "utf-8");
		expect(src).toContain("createAdoWorkItemsService");
	});

	it("ado-work-items-service.ts exports WorkItemResult", () => {
		const src = readFileSync(WORK_ITEMS_SERVICE, "utf-8");
		expect(src).toContain("WorkItemResult");
	});

	it("TestCaseFormView has AI Suggest Steps button (Sprint 2.22 sem-only refactor)", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AI Suggest Steps");
	});

	it("TestCaseFormView imports AiSuggestStepsModal (steps-only)", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AiSuggestStepsModal");
	});

	it("CoveragePanel imports AiSuggestTestsModal (Sprint 2.22 repositioning)", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toContain("AiSuggestTestsModal");
	});

	it("CoveragePanel exposes the 'Suggest Tests' button", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toContain("Suggest Tests");
	});

	it("SettingsView.tsx exists", () => {
		const src = readFileSync(SETTINGS_VIEW, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("SettingsView has AI Configuration section", () => {
		const src = readFileSync(SETTINGS_VIEW, "utf-8");
		expect(src).toContain("AI Configuration");
	});
});
