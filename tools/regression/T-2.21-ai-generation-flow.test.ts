import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.21 AI generation flow regression.
// Ensures all components, hooks and services for the AI generation flow exist.

const ROOT = resolve(__dirname, "../..");
const AI_MODAL = resolve(ROOT, "apps/argos-extension/src/hub/components/AiGenerateModal.tsx");
const WORK_ITEM_PICKER = resolve(
	ROOT,
	"apps/argos-extension/src/hub/components/WorkItemPicker.tsx"
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
const SETTINGS_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/SettingsView.tsx");

describe("T-2.21 AI generation flow", () => {
	it("AiGenerateModal.tsx exists", () => {
		const src = readFileSync(AI_MODAL, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("AiGenerateModal exports AiGenerateModal component", () => {
		const src = readFileSync(AI_MODAL, "utf-8");
		expect(src).toContain("AiGenerateModal");
	});

	it("AiGenerateModal has 2-step flow (select source + suggestions)", () => {
		const src = readFileSync(AI_MODAL, "utf-8");
		expect(src).toContain("Generate suggestions");
		expect(src).toContain("Create");
	});

	it("WorkItemPicker.tsx exists", () => {
		const src = readFileSync(WORK_ITEM_PICKER, "utf-8");
		expect(src.length).toBeGreaterThan(0);
	});

	it("WorkItemPicker exports WorkItemPicker", () => {
		const src = readFileSync(WORK_ITEM_PICKER, "utf-8");
		expect(src).toContain("WorkItemPicker");
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

	it("TestCaseFormView has AI Generate button", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AI Generate");
	});

	it("TestCaseFormView imports AiGenerateModal", () => {
		const src = readFileSync(TC_FORM, "utf-8");
		expect(src).toContain("AiGenerateModal");
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
