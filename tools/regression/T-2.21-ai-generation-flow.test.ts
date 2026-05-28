import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 AI generation flow regression -- migrated for Sprint 2.21 part 3 +
// TECH-DEBT-T2213-B.
//
// History:
//   - Sprint 2.21 part 1 introduced AiGenerateModal.
//   - Sprint 2.22 split it into AiSuggestTestsModal (Coverage Panel) +
//     AiSuggestStepsModal (Test Case form).
//   - Sprint 2.21 part 3 replaced AiSuggestTestsModal with the multi-step
//     SuggestTestsDrawer in the Coverage Panel.
//   - TECH-DEBT-T2213-B (this sprint) deletes AiSuggestTestsModal +
//     ReplaceOrAppendModal as dead code. This test is migrated to the
//     Drawer surface so the deletion is safe.
//
// AiSuggestStepsModal stays alive (still used by TestCaseFormView for
// the select+generate+preview phases before delegating to
// SuggestStepsDrawer).

const ROOT = resolve(__dirname, "../..");
const SUGGEST_TESTS_DRAWER = resolve(
	ROOT,
	"apps/argos-extension/src/hub/components/SuggestTestsDrawer/SuggestTestsDrawer.tsx"
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

describe("T-2.21 AI generation flow (post Sprint 2.21 part 3 + TECH-DEBT-T2213-B)", () => {
	it("SuggestTestsDrawer.tsx exists (Sprint 2.21 part 3 replacement for AiSuggestTestsModal)", () => {
		const src = readFileSync(SUGGEST_TESTS_DRAWER, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("SuggestTestsDrawer exports the SuggestTestsDrawer component", () => {
		const src = readFileSync(SUGGEST_TESTS_DRAWER, "utf-8");
		expect(src).toContain("SuggestTestsDrawer");
	});

	it("SuggestTestsDrawer exposes the Accept All / Accept Selected / Dismiss action surface", () => {
		const src = readFileSync(SUGGEST_TESTS_DRAWER, "utf-8");
		expect(src).toContain("Accept All");
		expect(src).toContain("Accept Selected");
		expect(src).toMatch(/Dismiss/);
	});

	it("AiSuggestStepsModal.tsx exists (steps-only flow, still active)", () => {
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

	it("TestCaseFormView has AI Suggest Steps button (Sprint 2.22 steps-only refactor)", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AI Suggest Steps");
	});

	it("TestCaseFormView imports AiSuggestStepsModal (steps-only)", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AiSuggestStepsModal");
	});

	it("CoveragePanel imports SuggestTestsDrawer (Sprint 2.21 part 3 migration)", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toContain("SuggestTestsDrawer");
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
