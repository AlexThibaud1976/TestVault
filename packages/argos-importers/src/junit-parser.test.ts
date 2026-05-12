import { describe, expect, it } from "vitest";
import { parseJUnit } from "./junit-parser.js";

const SINGLE_SUITE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="LoginTests" tests="2">
  <testcase classname="com.example.LoginTests" name="testLogin" time="0.5"/>
  <testcase classname="com.example.LoginTests" name="testLogout" time="0.3"/>
</testsuite>`;

const NESTED_SUITES = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Suite A">
    <testcase classname="A" name="test1"/>
  </testsuite>
  <testsuite name="Suite B">
    <testcase classname="B" name="test2"/>
    <testcase classname="B" name="test3"/>
  </testsuite>
</testsuites>`;

const WITH_FAILURE = `<testsuite name="T" tests="1">
  <testcase classname="com.ex.T" name="failTest">
    <failure message="Expected true but was false">Stack trace here</failure>
  </testcase>
</testsuite>`;

describe("parseJUnit", () => {
	it("parses test cases from a single testsuite", () => {
		const result = parseJUnit(SINGLE_SUITE);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]?.title).toBe("testLogin");
		expect(result.items[0]?.automationKey).toBe("com.example.LoginTests.testLogin");
	});

	it("parses test cases from nested testsuites", () => {
		const result = parseJUnit(NESTED_SUITES);
		expect(result.items).toHaveLength(3);
	});

	it("includes failure message in description", () => {
		const result = parseJUnit(WITH_FAILURE);
		expect(result.items[0]?.description).toContain("Expected true but was false");
	});

	it("sets tags from classname parts", () => {
		const result = parseJUnit(SINGLE_SUITE);
		expect(result.items[0]?.tags).toContain("LoginTests");
	});

	it("returns error for malformed XML", () => {
		const result = parseJUnit("<testsuite><unclosed>");
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("returns empty result for testsuite with no testcases", () => {
		const result = parseJUnit(`<testsuite name="Empty" tests="0"/>`);
		expect(result.items).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});
});
