import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// T-2.20 No mock data regression.
// Prevents reintroduction of MOCK_AREA_PATHS / MOCK_ITERATIONS in views/.

const ROOT = resolve(__dirname, "../..");
const FORM_VIEW = resolve(
	ROOT,
	"apps/argos-extension/src/hub/views/test-plans/TestPlanFormView.tsx"
);
const MOCK_DATA = resolve(ROOT, "apps/argos-extension/src/hub/views/_mock-data.ts");
const VIEWS_DIR = resolve(ROOT, "apps/argos-extension/src/hub/views");

function collectTsxFiles(dir: string): string[] {
	const results: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectTsxFiles(full));
		} else if (/\.(ts|tsx)$/.test(entry.name)) {
			results.push(full);
		}
	}
	return results;
}

describe("T-2.20 No mock data regression", () => {
	it("TestPlanFormView does not import MOCK_ITERATIONS", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).not.toContain("MOCK_ITERATIONS");
		expect(source).not.toContain("MOCK_AREA_PATHS");
	});

	it("_mock-data.ts does not export MOCK_AREA_PATHS or MOCK_ITERATIONS", () => {
		const source = readFileSync(MOCK_DATA, "utf-8");
		expect(source).not.toContain("export const MOCK_AREA_PATHS");
		expect(source).not.toContain("export const MOCK_ITERATIONS");
	});

	it("no file in views/ imports or exports MOCK_AREA_PATHS or MOCK_ITERATIONS", () => {
		const files = collectTsxFiles(VIEWS_DIR);
		for (const file of files) {
			const content = readFileSync(file, "utf-8");
			// Check for actual usage (import/export), not documentary comments
			expect(content, `${file} must not import/export MOCK_AREA_PATHS`).not.toMatch(
				/(?:import|export)\s[^;]*MOCK_AREA_PATHS/
			);
			expect(content, `${file} must not import/export MOCK_ITERATIONS`).not.toMatch(
				/(?:import|export)\s[^;]*MOCK_ITERATIONS/
			);
		}
	});

	it("TestPlanFormView uses IterationPicker component", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toContain("IterationPicker");
	});

	it("TestPlanFormView uses AreaPathPicker component", () => {
		const source = readFileSync(FORM_VIEW, "utf-8");
		expect(source).toContain("AreaPathPicker");
	});
});
