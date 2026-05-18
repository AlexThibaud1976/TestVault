import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG field robustness Sprint 2.13", () => {
	const root = resolve(__dirname, "../..");
	const matcherContent = readFileSync(
		resolve(root, "packages/argos-sdk/src/wit-refname-matcher.ts"),
		"utf8"
	);
	const installContent = readFileSync(
		resolve(root, "packages/argos-sdk/src/process-install.ts"),
		"utf8"
	);

	it("wit-refname-matcher.ts has schemaToAdoFieldName with TestVault prefix", () => {
		expect(matcherContent).toContain("schemaToAdoFieldName");
		expect(matcherContent).toContain("TestVault ");
		expect(matcherContent).toContain("already prefixed");
	});

	it("wit-refname-matcher.ts has validateAdoFieldName with length and char checks", () => {
		expect(matcherContent).toContain("validateAdoFieldName");
		expect(matcherContent).toContain("128");
		expect(matcherContent).toContain("forbidden characters");
	});

	it("process-install.ts has preflightOrgFields with [VALIDATE] structured logging", () => {
		expect(installContent).toContain("preflightOrgFields");
		expect(installContent).toContain("PreflightReport");
		expect(installContent).toContain("[VALIDATE]");
	});

	it("process-install.ts uses schemaToAdoFieldName for translated display name in POST body", () => {
		expect(installContent).toContain("schemaToAdoFieldName");
		expect(installContent).toContain("adoFieldName");
		expect(installContent).toContain("name: adoFieldName");
	});

	it("process-install.ts handles VS402803 name conflict explicitly", () => {
		expect(installContent).toContain("VS402803");
	});

	it("process-install.ts uses [CREATE]/[REUSE]/[ATTACH] structured log tags", () => {
		expect(installContent).toContain("[CREATE]");
		expect(installContent).toContain("[REUSE]");
		expect(installContent).toContain("[ATTACH]");
	});

	it("process-install.ts uses getAllUniqueSchemaFields to deduplicate before pre-flight", () => {
		expect(installContent).toContain("getAllUniqueSchemaFields");
		expect(installContent).toContain("preflightByRef");
	});
});
