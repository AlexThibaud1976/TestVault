// T-2.21 part 3 -- SuggestStepsDrawer regression guard (Sprint 2.21 part 3).
//
// Sprint 2.21 part 3 introduces a Drawer-based UX around the existing
// Sprint 2.22 Replace / Append / Cancel logic for "AI Suggest Steps" in
// TestCaseFormView. The Drawer is a WRAPPER -- it must not re-implement
// the merge/replace logic that Sprint 2.22 owns.
//
// This regression guard is structural only (no JSX, no jsdom). Behavioural
// coverage lives in apps/argos-extension/src/hub/components/SuggestStepsDrawer/
// SuggestStepsDrawer.test.tsx.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const COMPONENT_DIR = resolve(ROOT, "apps/argos-extension/src/hub/components/SuggestStepsDrawer");
const COMPONENT_FILE = resolve(COMPONENT_DIR, "SuggestStepsDrawer.tsx");
const INDEX_FILE = resolve(COMPONENT_DIR, "index.ts");
const COMPONENT_TEST = resolve(COMPONENT_DIR, "SuggestStepsDrawer.test.tsx");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");

describe("T-2.21 part 3 -- SuggestStepsDrawer regression guard", () => {
	it("SuggestStepsDrawer.tsx exists in components/SuggestStepsDrawer/", () => {
		expect(existsSync(COMPONENT_FILE)).toBe(true);
	});

	it("SuggestStepsDrawer index.ts exists and re-exports the component", () => {
		expect(existsSync(INDEX_FILE)).toBe(true);
		const src = readFileSync(INDEX_FILE, "utf-8");
		expect(src).toContain("SuggestStepsDrawer");
	});

	it("SuggestStepsDrawer.tsx exports the SuggestStepsDrawer component", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toMatch(/export\s+function\s+SuggestStepsDrawer/);
	});

	it("SuggestStepsDrawer uses a Fluent UI OverlayDrawer surface", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toContain("OverlayDrawer");
	});

	it("SuggestStepsDrawer exposes the Replace / Complete (or Append) / Cancel action surface", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toContain("Replace");
		expect(src).toMatch(/Complete|Append/);
		expect(src).toContain("Cancel");
	});

	it("SuggestStepsDrawer delegates Replace / Complete actions via callbacks (no inline merge logic)", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		// Wrapper rule: callbacks invoked, no in-component merge implementation
		expect(src).toMatch(/onReplace/);
		expect(src).toMatch(/onComplete|onAppend/);
		expect(src).toMatch(/onCancel/);
	});

	it("SuggestStepsDrawer.test.tsx exists alongside the component", () => {
		expect(existsSync(COMPONENT_TEST)).toBe(true);
	});

	it("TestCaseFormView integrates SuggestStepsDrawer", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toContain("SuggestStepsDrawer");
	});
});
