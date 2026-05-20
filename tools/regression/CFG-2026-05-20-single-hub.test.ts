import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG Hub-group + single hub Sprint 2.18.4", () => {
	const root = resolve(__dirname, "../..");
	const manifestPath = resolve(root, "apps/argos-extension/vss-extension.json");

	it("manifest exists", () => {
		expect(existsSync(manifestPath)).toBe(true);
	});

	it("manifest has exactly 3 contributions (argos-hub-group + argos-hub + argos-coverage-panel)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		expect(Array.isArray(manifest.contributions)).toBe(true);
		expect(manifest.contributions).toHaveLength(3);
	});

	it("manifest contains argos-hub-group (type ms.vss-web.hub-group)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const hubGroup = (manifest.contributions as { id: string; type: string }[]).find(
			(c) => c.id === "argos-hub-group"
		);
		expect(hubGroup).toBeDefined();
		expect(hubGroup?.type).toBe("ms.vss-web.hub-group");
	});

	it("argos-hub-group targets project-hub-groups-collection (top-level entry)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const hubGroup = (manifest.contributions as { id: string; targets: string[] }[]).find(
			(c) => c.id === "argos-hub-group"
		);
		expect(hubGroup?.targets).toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("manifest contains argos-hub (single hub child, type ms.vss-web.hub)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const hub = (manifest.contributions as { id: string; type: string }[]).find(
			(c) => c.id === "argos-hub"
		);
		expect(hub).toBeDefined();
		expect(hub?.type).toBe("ms.vss-web.hub");
	});

	it("argos-hub targets .argos-hub-group (relative reference, not direct collection)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const hub = (manifest.contributions as { id: string; targets: string[] }[]).find(
			(c) => c.id === "argos-hub"
		);
		expect(hub?.targets).toContain(".argos-hub-group");
		expect(hub?.targets).not.toContain("ms.vss-web.project-hub-groups-collection");
	});

	it("manifest does NOT contain legacy sub-hubs", () => {
		const legacyIds = [
			"argos-hub-plans",
			"argos-hub-cases",
			"argos-hub-sets",
			"argos-hub-preconditions",
			"argos-hub-reports",
			"argos-hub-settings",
		];
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		for (const id of legacyIds) {
			const found = (manifest.contributions as { id: string }[]).find((c) => c.id === id);
			expect(found, `${id} should not exist`).toBeUndefined();
		}
	});

	it("argos-coverage-panel still exists (work-item-form-page)", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		const panel = (manifest.contributions as { id: string; type: string }[]).find(
			(c) => c.id === "argos-coverage-panel"
		);
		expect(panel).toBeDefined();
		expect(panel?.type).toBe("ms.vss-work-web.work-item-form-page");
	});

	it("App.tsx does NOT contain CONTRIBUTION_ID_TO_SECTION", () => {
		const appPath = resolve(root, "apps/argos-extension/src/hub/App.tsx");
		const content = readFileSync(appPath, "utf8");
		expect(content).not.toContain("CONTRIBUTION_ID_TO_SECTION");
	});

	it("App.tsx does NOT contain legacy sub-hub contribution ids", () => {
		const appPath = resolve(root, "apps/argos-extension/src/hub/App.tsx");
		const content = readFileSync(appPath, "utf8");
		expect(content).not.toContain("argos-hub-plans");
		expect(content).not.toContain("argos-hub-cases");
		expect(content).not.toContain("argos-hub-settings");
	});

	it("App.tsx exports DEFAULT_INITIAL_VIEW or getInitialView (single hub routing)", () => {
		const appPath = resolve(root, "apps/argos-extension/src/hub/App.tsx");
		const content = readFileSync(appPath, "utf8");
		const hasSingleHubPattern =
			content.includes("DEFAULT_INITIAL_VIEW") || content.includes("getInitialView");
		expect(hasSingleHubPattern).toBe(true);
	});
});
