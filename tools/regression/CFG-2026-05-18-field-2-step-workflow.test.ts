import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CFG field 2-step workflow (Sprint 2.12, updated Sprint 2.13)", () => {
	const root = resolve(__dirname, "../..");
	const content = readFileSync(resolve(root, "packages/argos-sdk/src/process-install.ts"), "utf8");

	it("process-install.ts has org-level field create helper", () => {
		expect(content).toContain("createFieldAtOrg");
		expect(content).toContain("/_apis/wit/fields?api-version=");
	});

	it("uses ADO_FIELD_TYPE_REST mapping with isPicklist flag", () => {
		expect(content).toContain("ADO_FIELD_TYPE_REST");
		expect(content).toContain("isPicklist");
		expect(content).toContain("picklistString");
		expect(content).toContain("picklistInteger");
	});

	it("Step 3 fields loop performs 2-step workflow (org-create then WIT-attach)", () => {
		expect(content).toContain("ETAPE A");
		expect(content).toContain("ETAPE B");
		expect(content).toContain("createFieldAtOrg");
		expect(content).toContain("attachBody");
	});

	it("install uses pre-flight before Step 3 (Sprint 2.13 extension)", () => {
		expect(content).toContain("preflightOrgFields");
		expect(content).toContain("preflightByRef");
		expect(content).toContain("[VALIDATE]");
	});
});
