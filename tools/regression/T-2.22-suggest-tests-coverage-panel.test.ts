// T-2.22 -- Suggest Tests from Coverage Panel widget regression guard.
//
// Sprint 2.21 part 3 added the CoveragePanelSuggestTestsFlow sub-component
// which calls useServices(). The widget entry (widgets/coverage-panel/
// index.tsx) renders CoveragePanel but does NOT wrap it in
// ServicesContext.Provider, so clicking "Suggest Tests" on a User Story
// in BCEE-QA crashed the panel with "useServices must be called inside
// ServicesProvider".
//
// Sprint 2.22 fixes the widget by mounting a ServicesContext.Provider
// around CoveragePanel with the services already constructed there.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const WIDGET_ENTRY = resolve(ROOT, "apps/argos-extension/src/widgets/coverage-panel/index.tsx");
const COVERAGE_PANEL = resolve(ROOT, "apps/argos-extension/src/hub/CoveragePanel.tsx");

describe("T-2.22 -- Suggest Tests Coverage Panel widget regression guard", () => {
	it("widget entry mounts a ServicesContext.Provider around CoveragePanel", () => {
		const src = readFileSync(WIDGET_ENTRY, "utf-8");
		// The fix wraps the rendered CoveragePanel in ServicesContext.Provider
		// so the inner CoveragePanelSuggestTestsFlow can call useServices()
		// without throwing.
		expect(src).toContain("ServicesContext.Provider");
	});

	it("widget entry constructs the testCaseService (needed for enriched display)", () => {
		const src = readFileSync(WIDGET_ENTRY, "utf-8");
		expect(src).toContain("testCaseService");
	});

	it("CoveragePanel passes the source Area Path through to the SuggestTestsDrawer flow", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		// The Area Path inheritance contract: workItemAreaPath flows to
		// CoveragePanelSuggestTestsFlow.sourceWorkItem.areaPath, which
		// initialises the in-Drawer Area Path picker.
		expect(src).toContain("workItemAreaPath");
		expect(src).toMatch(/sourceWorkItem.*areaPath|areaPath:\s*workItemAreaPath/);
	});
});
