// T-2.21 part 3 -- GherkinEditor Monaco migration regression guard
// (Sprint 2.21 part 3, T-5.1).
//
// Sprint 2.21 part 3 migrates the existing GherkinEditor.tsx textarea
// implementation to a Monaco-based editor (@monaco-editor/react). The
// existing field-level validation from @atconseil/argos-gherkin
// (validateGherkin -- scenarioCount + errors) is preserved underneath
// Monaco -- migration MUST stay backward-compatible with existing
// plain-text Gherkin already stored in TestVault.Gherkin.
//
// This regression guard is structural only (no JSX, no jsdom).
// Behavioural coverage lives in apps/argos-extension/src/hub/
// GherkinEditor.test.tsx (Monaco mock + unit tests).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const GHERKIN_EDITOR = resolve(ROOT, "apps/argos-extension/src/hub/GherkinEditor.tsx");
const TC_FORM_VIEW = resolve(ROOT, "apps/argos-extension/src/hub/views/TestCaseFormView.tsx");
const PKG_JSON = resolve(ROOT, "apps/argos-extension/package.json");

describe("T-2.21 part 3 -- GherkinEditor Monaco migration regression guard", () => {
	it("GherkinEditor.tsx still exists at the historical path", () => {
		expect(existsSync(GHERKIN_EDITOR)).toBe(true);
	});

	it("GherkinEditor imports @monaco-editor/react (Monaco-based editor)", () => {
		const src = readFileSync(GHERKIN_EDITOR, "utf-8");
		expect(src).toContain("@monaco-editor/react");
	});

	it("GherkinEditor preserves validateGherkin from @atconseil/argos-gherkin (backward compat)", () => {
		const src = readFileSync(GHERKIN_EDITOR, "utf-8");
		expect(src).toContain("@atconseil/argos-gherkin");
		expect(src).toContain("validateGherkin");
	});

	it("GherkinEditor exports the GherkinEditor component and GherkinEditorProps type", () => {
		const src = readFileSync(GHERKIN_EDITOR, "utf-8");
		expect(src).toMatch(/export\s+function\s+GherkinEditor/);
		expect(src).toMatch(/export\s+(type|interface)\s+GherkinEditorProps/);
	});

	it("package.json declares @monaco-editor/react + monaco-editor dependencies", () => {
		const pkg = JSON.parse(readFileSync(PKG_JSON, "utf-8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@monaco-editor/react"]).toBeDefined();
		expect(pkg.dependencies?.["monaco-editor"]).toBeDefined();
	});

	it("TestCaseFormView integrates GherkinEditor (new Gherkin field on create view)", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		expect(src).toContain("GherkinEditor");
	});

	it("TestCaseFormView wires the Gherkin field into the TestCaseDraft payload", () => {
		const src = readFileSync(TC_FORM_VIEW, "utf-8");
		// The draft submitted to testCaseService.create now carries the gherkin field.
		expect(src).toMatch(/gherkin/);
	});
});
