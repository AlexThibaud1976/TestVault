// T-2.22 -- Coverage Panel data layer regression guard (Sprint 2.22).
//
// Sprint 2.22 widens the listLinks() filter in argos-sdk so the Coverage
// Panel picks up Test Cases linked via native ADO relations (TestedBy
// forward) instead of only Argos custom relations (WI_LINK_TYPE_ATTR
// custom attribute). The Coverage Panel UI is also enriched with title,
// state, priority, assigned, and step count -- previously only id +
// linkType + latestStatus were rendered.
//
// Structural guard only.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const LINK_SERVICE = resolve(ROOT, "packages/argos-sdk/src/work-item-link-service.ts");
const COVERAGE_PANEL = resolve(ROOT, "apps/argos-extension/src/hub/CoveragePanel.tsx");

describe("T-2.22 -- Coverage Panel data layer regression guard", () => {
	it("listLinks recognises native ADO TestedBy-Forward relations", () => {
		const src = readFileSync(LINK_SERVICE, "utf-8");
		// The widened filter must explicitly accept the native rel string.
		expect(src).toMatch(/Microsoft\.VSTS\.Common\.TestedBy-Forward/);
	});

	it("listLinks still recognises the legacy Argos custom attribute path", () => {
		const src = readFileSync(LINK_SERVICE, "utf-8");
		expect(src).toContain("WI_LINK_TYPE_ATTR");
	});

	it("CoveragePanel renders Test Case title for each linked TC", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toMatch(/coverage-row-title|tc-title/);
	});

	it("CoveragePanel renders Test Case priority, state, and steps count", () => {
		const src = readFileSync(COVERAGE_PANEL, "utf-8");
		expect(src).toMatch(/priority/i);
		expect(src).toMatch(/state/i);
		expect(src).toMatch(/step/i);
	});
});
