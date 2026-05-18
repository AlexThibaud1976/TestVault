import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG process-install.ts idempotency", () => {
	const root = resolve(__dirname, "../..");
	const filePath = resolve(root, "packages/argos-sdk/src/process-install.ts");

	it("file exists", () => {
		expect(existsSync(filePath)).toBe(true);
	});

	const content = readFileSync(filePath, "utf8");

	it("Step 2 fetches existing picklists before creating", () => {
		expect(content).toMatch(/existingPicklistsByName|existingLists/);
		expect(content).toContain("Reusing existing picklist");
	});

	it("Step 3 fetches existing WITs before creating", () => {
		expect(content).toMatch(/existingWitRefs|existingWitsData/);
		expect(content).toContain("already exists");
	});
});
