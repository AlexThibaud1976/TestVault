// T-2.22 -- TestCase display regression guard (Sprint 2.22).
//
// Sprint 2.22 extracts the inline steps CRUD of TestCaseFormView into a
// dedicated StepsEditor component (move up / move down support added).
// This regression guard is structural only (no JSX, no jsdom).
// Behavioural coverage lives in apps/argos-extension/src/hub/components/
// StepsEditor/StepsEditor.test.tsx.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const COMPONENT_DIR = resolve(ROOT, "apps/argos-extension/src/hub/components/StepsEditor");
const COMPONENT_FILE = resolve(COMPONENT_DIR, "StepsEditor.tsx");
const INDEX_FILE = resolve(COMPONENT_DIR, "index.ts");
const COMPONENT_TEST = resolve(COMPONENT_DIR, "StepsEditor.test.tsx");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");

describe("T-2.22 -- StepsEditor regression guard", () => {
	it("StepsEditor.tsx exists in components/StepsEditor/", () => {
		expect(existsSync(COMPONENT_FILE)).toBe(true);
	});

	it("StepsEditor index.ts exists and re-exports the component", () => {
		expect(existsSync(INDEX_FILE)).toBe(true);
		const src = readFileSync(INDEX_FILE, "utf-8");
		expect(src).toContain("StepsEditor");
	});

	it("StepsEditor.tsx exports the StepsEditor component", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		expect(src).toMatch(/export\s+function\s+StepsEditor/);
	});

	it("StepsEditor exposes the documented action surface (add, remove, edit, reorder)", () => {
		const src = readFileSync(COMPONENT_FILE, "utf-8");
		// Reorder is the new capability added in Sprint 2.22.
		expect(src).toMatch(/move.?up|moveUp|reorder/i);
		expect(src).toMatch(/move.?down|moveDown/i);
	});

	it("StepsEditor.test.tsx exists alongside the component", () => {
		expect(existsSync(COMPONENT_TEST)).toBe(true);
	});

	it("TestCaseFormView consumes the new StepsEditor component", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toContain("StepsEditor");
	});
});
