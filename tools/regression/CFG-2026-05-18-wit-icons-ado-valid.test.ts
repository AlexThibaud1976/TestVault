import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG WIT icons ADO valid", () => {
	const root = resolve(__dirname, "../..");
	const witsDir = resolve(root, "packages/argos-wit-schema/src/wits");
	const witFiles = [
		"audit-log.ts",
		"precondition.ts",
		"test-case-version.ts",
		"test-case.ts",
		"test-execution.ts",
		"test-plan.ts",
		"test-set.ts",
	];

	it("argos-wit-schema index.test.ts contains ADO icon validation tests", () => {
		const path = resolve(root, "packages/argos-wit-schema/src/index.test.ts");
		expect(existsSync(path)).toBe(true);
		const content = readFileSync(path, "utf8");
		expect(content).toContain("ADO icon validation");
		expect(content).toContain("ADO_VALID_ICONS");
	});

	it("no WIT uses dash-format icon (icon-xxx)", () => {
		for (const file of witFiles) {
			const content = readFileSync(resolve(witsDir, file), "utf8");
			const match = content.match(/icon:\s*"icon-[a-z-]+"/);
			expect(match, `${file} still uses dash-format icon`).toBeNull();
		}
	});

	it("all WITs use underscore-format icon (icon_xxx)", () => {
		for (const file of witFiles) {
			const content = readFileSync(resolve(witsDir, file), "utf8");
			const match = content.match(/icon:\s*"icon_[a-z_]+"/);
			expect(match, `${file} missing valid icon (icon_xxx)`).not.toBeNull();
		}
	});
});
