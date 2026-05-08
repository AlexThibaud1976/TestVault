import { describe, expect, it } from "vitest";
import { parseTestNG } from "./testng-parser.js";

const TESTNG = `<?xml version="1.0" encoding="UTF-8"?>
<testng-results total="3" passed="2" failed="1" skipped="0">
  <suite name="MySuite">
    <test name="LoginTest">
      <class name="com.example.LoginTests">
        <test-method name="canLogin" status="PASS" signature="canLogin()"/>
        <test-method name="canLogout" status="FAIL" signature="canLogout()">
          <exception class="java.lang.AssertionError">
            <message>Expected: true</message>
          </exception>
        </test-method>
      </class>
    </test>
    <test name="ApiTest">
      <class name="com.example.ApiTests">
        <test-method name="getStatus" status="PASS" signature="getStatus()"/>
      </class>
    </test>
  </suite>
</testng-results>`;

describe("parseTestNG", () => {
	it("parses test methods from TestNG XML", () => {
		const result = parseTestNG(TESTNG);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(3);
	});

	it("sets title to method name and automationKey to fully qualified name", () => {
		const result = parseTestNG(TESTNG);
		expect(result.items[0]?.title).toBe("canLogin");
		expect(result.items[0]?.automationKey).toBe("com.example.LoginTests.canLogin");
	});

	it("includes exception message for failed tests", () => {
		const result = parseTestNG(TESTNG);
		expect(result.items[1]?.description).toContain("Expected: true");
	});

	it("sets tags from class name", () => {
		const result = parseTestNG(TESTNG);
		expect(result.items[0]?.tags).toContain("LoginTests");
	});

	it("returns error for malformed XML", () => {
		const result = parseTestNG("<testng-results><unclosed>");
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("returns empty result for empty testng-results", () => {
		const result = parseTestNG(`<testng-results total="0" passed="0" failed="0" skipped="0"/>`);
		expect(result.items).toHaveLength(0);
	});
});
