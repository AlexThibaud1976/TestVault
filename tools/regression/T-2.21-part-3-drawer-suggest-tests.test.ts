// T-2.21 part 3 -- SuggestTestsDrawer regression guard (Sprint 2.21 part 3).
//
// Sprint 2.21 part 3 introduces a Drawer-based UX for the "Suggest Tests"
// flow in Coverage Panel. The Drawer wraps the multi-step generation flow
// (select count + paths -> generating -> review suggestions with Accept All
// / Accept Selected / Dismiss + per-TC edit).
//
// This regression guard is structural only (no JSX, no jsdom). Behavioural
// coverage lives in apps/argos-extension/src/hub/components/SuggestTestsDrawer/
// SuggestTestsDrawer.test.tsx. The intent of this guard is to detect silent
// removal or relocation of the Drawer surface in future refactors.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const COMPONENT_DIR = resolve(ROOT, "apps/argos-extension/src/hub/components/SuggestTestsDrawer");
const COMPONENT_FILE = resolve(COMPONENT_DIR, "SuggestTestsDrawer.tsx");
const INDEX_FILE = resolve(COMPONENT_DIR, "index.ts");
const COMPONENT_TEST = resolve(COMPONENT_DIR, "SuggestTestsDrawer.test.tsx");
const COVERAGE_PANEL = resolve(ROOT, "apps/argos-extension/src/hub/CoveragePanel.tsx");

describe("T-2.21 part 3 -- SuggestTestsDrawer regression guard", () => {
	it("SuggestTestsDrawer.tsx exists in components/SuggestTestsDrawer/", () => {
		expect(existsSync(COMPONENT_FILE)).toBe(true);
	});

	it("SuggestTestsDrawer index.ts exists and re-exports the component", () => {
		expect(existsSync(INDEX_FILE)).toBe(true);
		const src = readFileSync(INDEX_FILE, "utf-8");
		expect(src).toContain("SuggestTestsDrawer");
	});

	it("SuggestTestsDrawer.tsx exports the SuggestTestsDrawer component", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toMatch(/export\s+function\s+SuggestTestsDrawer/);
	});

	it("SuggestTestsDrawer uses a Fluent UI OverlayDrawer surface", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toContain("OverlayDrawer");
	});

	it("SuggestTestsDrawer exposes the documented action surface", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		// Multi-step drawer: select count + areaPath, generating spinner,
		// review with Accept Selected / Accept All / Dismiss
		expect(src).toContain("Accept Selected");
		expect(src).toContain("Accept All");
		expect(src).toMatch(/Dismiss|Cancel/);
	});

	it("SuggestTestsDrawer.test.tsx exists alongside the component", () => {
		expect(existsSync(COMPONENT_TEST)).toBe(true);
	});

	it("CoveragePanel.tsx integrates SuggestTestsDrawer (replaces AiSuggestTestsModal)", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toContain("SuggestTestsDrawer");
	});
});
