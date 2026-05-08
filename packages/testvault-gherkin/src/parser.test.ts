import { describe, expect, it } from "vitest";
import { featureToTestCases, parseFeature } from "./parser.js";

const SIMPLE = `Feature: Login
  Scenario: User logs in
    Given I open the app
    When I enter my credentials
    Then I am logged in`;

const MULTI = `Feature: Search
  Scenario: Basic search
    Given I am on the search page
    When I type "hello"
    Then I see results

  Scenario: Empty search
    Given I am on the search page
    When I submit empty search
    Then I see "no results"`;

const OUTLINE = `Feature: Auth
  Scenario Outline: Login variants
    Given I open the app
    When I enter <username> and <password>
    Then I see <greeting>

    Examples:
      | username | password | greeting |
      | alice    | secret   | Hi Alice |
      | bob      | password | Hi Bob   |`;

const BACKGROUND = `Feature: Cart
  Background:
    Given I am logged in
    And I have an empty cart

  Scenario: Add item
    When I add an item
    Then my cart has 1 item`;

const TAGS = `Feature: Smoke
  @smoke @critical
  Scenario: Critical login
    Given I open the app
    Then I see the login form`;

const AND_BUT = `Feature: Form
  Scenario: Form validation
    Given I open the form
    And I leave all fields empty
    When I click submit
    But the form is not submitted
    Then I see error messages`;

describe("parseFeature", () => {
	it("extracts feature title", () => {
		const result = parseFeature(SIMPLE);
		expect(result.title).toBe("Login");
	});

	it("extracts scenario titles", () => {
		const result = parseFeature(MULTI);
		expect(result.scenarios).toHaveLength(2);
		expect(result.scenarios[0]!.title).toBe("Basic search");
		expect(result.scenarios[1]!.title).toBe("Empty search");
	});

	it("extracts steps from a scenario", () => {
		const result = parseFeature(SIMPLE);
		const steps = result.scenarios[0]!.steps;
		expect(steps).toHaveLength(3);
		expect(steps[0]).toEqual({ keyword: "Given", text: "I open the app" });
		expect(steps[1]).toEqual({ keyword: "When", text: "I enter my credentials" });
		expect(steps[2]).toEqual({ keyword: "Then", text: "I am logged in" });
	});

	it("extracts background steps", () => {
		const result = parseFeature(BACKGROUND);
		expect(result.background).toHaveLength(2);
		expect(result.background[0]).toEqual({ keyword: "Given", text: "I am logged in" });
		expect(result.background[1]).toEqual({ keyword: "And", text: "I have an empty cart" });
	});

	it("returns empty background when no Background block", () => {
		const result = parseFeature(SIMPLE);
		expect(result.background).toHaveLength(0);
	});

	it("extracts tags on scenarios", () => {
		const result = parseFeature(TAGS);
		expect(result.scenarios[0]!.tags).toEqual(["smoke", "critical"]);
	});

	it("returns empty tags array when scenario has no tags", () => {
		const result = parseFeature(SIMPLE);
		expect(result.scenarios[0]!.tags).toEqual([]);
	});

	it("marks Scenario Outline as isOutline = true", () => {
		const result = parseFeature(OUTLINE);
		expect(result.scenarios[0]!.isOutline).toBe(true);
	});

	it("marks plain Scenario as isOutline = false", () => {
		const result = parseFeature(SIMPLE);
		expect(result.scenarios[0]!.isOutline).toBe(false);
	});

	it("extracts Examples table headers and rows", () => {
		const result = parseFeature(OUTLINE);
		const ex = result.scenarios[0]!.examples!;
		expect(ex.headers).toEqual(["username", "password", "greeting"]);
		expect(ex.rows).toHaveLength(2);
		expect(ex.rows[0]).toEqual(["alice", "secret", "Hi Alice"]);
		expect(ex.rows[1]).toEqual(["bob", "password", "Hi Bob"]);
	});

	it("extracts And and But steps", () => {
		const result = parseFeature(AND_BUT);
		const steps = result.scenarios[0]!.steps;
		expect(steps).toHaveLength(5);
		expect(steps[1]).toEqual({ keyword: "And", text: "I leave all fields empty" });
		expect(steps[3]).toEqual({ keyword: "But", text: "the form is not submitted" });
	});

	it("ignores comment lines", () => {
		const withComment = `Feature: Login
  # this is a comment
  Scenario: Log in
    # another comment
    Given I open the app
    Then I am done`;
		const result = parseFeature(withComment);
		expect(result.scenarios[0]!.steps).toHaveLength(2);
	});
});

describe("featureToTestCases", () => {
	it("creates one TestCaseDraft per scenario", () => {
		const tcs = featureToTestCases(MULTI, "MyProject\\Auth");
		expect(tcs).toHaveLength(2);
	});

	it("sets title from scenario title", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		expect(tcs[0]!.title).toBe("User logs in");
	});

	it("sets gherkin field containing Feature and Scenario keywords", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		expect(tcs[0]!.gherkin).toContain("Feature: Login");
		expect(tcs[0]!.gherkin).toContain("Scenario: User logs in");
	});

	it("converts Gherkin steps to TC steps with action = 'keyword text'", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		const steps = tcs[0]!.steps!;
		expect(steps).toHaveLength(3);
		expect(steps[0]).toEqual({ index: 1, action: "Given I open the app", expected: "" });
		expect(steps[1]).toEqual({ index: 2, action: "When I enter my credentials", expected: "" });
	});

	it("sets automationStatus to Planned", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		expect(tcs[0]!.automationStatus).toBe("Planned");
	});

	it("sets areaPath from parameter", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		expect(tcs[0]!.areaPath).toBe("MyProject\\Auth");
	});

	it("sets priority to 3", () => {
		const tcs = featureToTestCases(SIMPLE, "MyProject\\Auth");
		expect(tcs[0]!.priority).toBe(3);
	});

	it("preserves tags in gherkin field for tagged scenarios", () => {
		const tcs = featureToTestCases(TAGS, "MyProject\\Auth");
		expect(tcs[0]!.gherkin).toContain("@smoke");
		expect(tcs[0]!.gherkin).toContain("@critical");
	});
});
