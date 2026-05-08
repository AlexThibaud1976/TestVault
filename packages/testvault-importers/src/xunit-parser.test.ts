import { describe, expect, it } from "vitest";
import { parseXUnit } from "./xunit-parser.js";

const XUNIT2 = `<?xml version="1.0" encoding="UTF-8"?>
<assemblies>
  <assembly name="MyTests.dll" total="3">
    <collection name="Test collection">
      <test name="MyTests.LoginTests.CanLogin" type="MyTests.LoginTests" method="CanLogin" result="Pass"/>
      <test name="MyTests.LoginTests.CanLogout" type="MyTests.LoginTests" method="CanLogout" result="Fail">
        <failure exception-type="Xunit.Sdk.TrueException">
          <message>Assert.True() Failure</message>
        </failure>
      </test>
      <test name="MyTests.ApiTests.GetStatus" type="MyTests.ApiTests" method="GetStatus" result="Skip">
        <reason>Not implemented</reason>
      </test>
    </collection>
  </assembly>
</assemblies>`;

describe("parseXUnit", () => {
	it("parses test cases from xUnit 2 assemblies format", () => {
		const result = parseXUnit(XUNIT2);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(3);
	});

	it("sets title to method name and automationKey to full name", () => {
		const result = parseXUnit(XUNIT2);
		expect(result.items[0]?.title).toBe("CanLogin");
		expect(result.items[0]?.automationKey).toBe("MyTests.LoginTests.CanLogin");
	});

	it("includes failure message for failed tests", () => {
		const result = parseXUnit(XUNIT2);
		expect(result.items[1]?.description).toContain("Assert.True() Failure");
	});

	it("includes skip reason in description", () => {
		const result = parseXUnit(XUNIT2);
		expect(result.items[2]?.description).toContain("Not implemented");
	});

	it("sets tags from type name", () => {
		const result = parseXUnit(XUNIT2);
		expect(result.items[0]?.tags).toContain("LoginTests");
	});

	it("returns error for malformed XML", () => {
		const result = parseXUnit("<assemblies><unclosed>");
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("returns empty result for assembly with no tests", () => {
		const result = parseXUnit(
			`<assemblies><assembly name="T.dll" total="0"><collection name="C"/></assembly></assemblies>`
		);
		expect(result.items).toHaveLength(0);
	});
});
