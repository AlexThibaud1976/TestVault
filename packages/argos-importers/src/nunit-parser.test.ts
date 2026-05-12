import { describe, expect, it } from "vitest";
import { parseNUnit } from "./nunit-parser.js";

const NUNIT3 = `<?xml version="1.0" encoding="UTF-8"?>
<test-run id="1" testcasecount="2">
  <test-suite type="Assembly" fullname="MyTests.dll">
    <test-suite type="TestFixture" fullname="MyTests.LoginTests">
      <test-case id="1" name="CanLogin" fullname="MyTests.LoginTests.CanLogin" result="Passed"/>
      <test-case id="2" name="CanLogout" fullname="MyTests.LoginTests.CanLogout" result="Failed">
        <failure>
          <message>Expected: True But was: False</message>
        </failure>
      </test-case>
    </test-suite>
  </test-suite>
</test-run>`;

const NUNIT2 = `<?xml version="1.0" encoding="UTF-8"?>
<test-results name="MyTests" total="1">
  <test-suite name="LoginSuite">
    <results>
      <test-case name="MyTests.LoginTests.CanLogin" success="True"/>
    </results>
  </test-suite>
</test-results>`;

describe("parseNUnit", () => {
	it("parses NUnit 3 test-run format", () => {
		const result = parseNUnit(NUNIT3);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.title).toBe("CanLogin");
		expect(result.items[0]?.automationKey).toBe("MyTests.LoginTests.CanLogin");
	});

	it("includes failure message in description for failed tests", () => {
		const result = parseNUnit(NUNIT3);
		expect(result.items[1]?.description).toContain("Expected: True But was: False");
	});

	it("parses NUnit 2 test-results format", () => {
		const result = parseNUnit(NUNIT2);
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.automationKey).toBe("MyTests.LoginTests.CanLogin");
	});

	it("returns error for malformed XML", () => {
		const result = parseNUnit("<test-run><unclosed>");
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("returns empty result for run with no test-cases", () => {
		const result = parseNUnit(`<test-run testcasecount="0"/>`);
		expect(result.items).toHaveLength(0);
	});
});
