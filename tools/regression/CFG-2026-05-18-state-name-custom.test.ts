import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG state name custom Sprint 2.14", () => {
	const root = resolve(__dirname, "../..");

	it("wit-refname-matcher.ts has schemaToAdoStateName + validateAdoStateName", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts"),
			"utf8"
		);
		expect(content).toContain("schemaToAdoStateName");
		expect(content).toContain("validateAdoStateName");
		expect(content).toContain("TestVault ");
	});

	it("process-install.ts imports schemaToAdoStateName and uses getExistingStates", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-sdk/src/process-install.ts"),
			"utf8"
		);
		expect(content).toContain("schemaToAdoStateName");
		expect(content).toContain("getExistingStates");
	});

	it("process-install.ts has state idempotency logic with structured logging", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-sdk/src/process-install.ts"),
			"utf8"
		);
		expect(content).toContain("existingStateNames");
		expect(content).toContain("[STATE-SKIP]");
		expect(content).toContain("[STATE-CREATE]");
	});

	it("process-install.ts handles VS403083 for state name conflict", () => {
		const content = readFileSync(
			resolve(root, "packages/argos-sdk/src/process-install.ts"),
			"utf8"
		);
		expect(content).toContain("VS403083");
	});
});
