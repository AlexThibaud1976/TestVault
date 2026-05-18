import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG CRUD refName resolver Sprint 2.16", () => {
	const root = resolve(__dirname, "../..");

	it("argos-wit-schema/src/wit-resolver.ts exists with all key symbols", () => {
		const path = resolve(root, "packages/argos-wit-schema/src/wit-resolver.ts");
		expect(existsSync(path)).toBe(true);
		const content = readFileSync(path, "utf8");
		expect(content).toContain("createWitResolver");
		expect(content).toContain("resolveAdoWitRefName");
		expect(content).toContain("translateFieldsToAdo");
		expect(content).toContain("translateFieldsFromAdo");
		expect(content).toContain("invalidateCache");
	});

	it("argos-wit-schema/src/index.ts exports createWitResolver and WitResolver", () => {
		const content = readFileSync(resolve(root, "packages/argos-wit-schema/src/index.ts"), "utf8");
		expect(content).toContain("createWitResolver");
		expect(content).toContain("WitResolver");
		expect(content).toContain("IWitTypeProvider");
		expect(content).toContain("./wit-resolver.js");
	});

	it("services.ts does not hardcode schema refNames in createWorkItem calls", () => {
		const content = readFileSync(resolve(root, "apps/argos-extension/src/hub/services.ts"), "utf8");
		// createWorkItem("TestVault.X") is the bad pattern — it uses schema refName directly
		const badPattern = /createWorkItem\s*\(\s*["']TestVault\./;
		expect(badPattern.test(content)).toBe(false);
	});

	it("services.ts uses createWitResolver for ADO refName resolution", () => {
		const content = readFileSync(resolve(root, "apps/argos-extension/src/hub/services.ts"), "utf8");
		expect(content).toContain("createWitResolver");
		expect(content).toContain("createArgosAdoClientAdapter");
	});

	it("services.ts has convenience wrappers for ALL 7 WIT", () => {
		const content = readFileSync(resolve(root, "apps/argos-extension/src/hub/services.ts"), "utf8");
		expect(content).toContain("createTestCase");
		expect(content).toContain("createTestPlan");
		expect(content).toContain("createTestSet");
		expect(content).toContain("createPrecondition");
		expect(content).toContain("createTestExecution");
		expect(content).toContain("createTestCaseVersion");
		expect(content).toContain("createAuditLog");
	});
});
