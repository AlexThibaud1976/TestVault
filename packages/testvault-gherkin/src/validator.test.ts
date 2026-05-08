import { describe, expect, it } from "vitest";
import { validateGherkin } from "./validator.js";

const VALID_MINIMAL = `Feature: Login
  Scenario: User logs in
    Given I am on the login page
    When I enter valid credentials
    Then I am redirected to the dashboard`;

const VALID_TWO_SCENARIOS = `Feature: Shopping Cart
  Scenario: Add item
    Given the cart is empty
    When I add a product
    Then the cart has 1 item

  Scenario: Remove item
    Given the cart has 1 item
    When I remove the product
    Then the cart is empty`;

const VALID_OUTLINE = `Feature: Search
  Scenario Outline: Search by keyword
    Given I search for "<keyword>"
    Then I see "<result>"
    Examples:
      | keyword | result |
      | apple   | Apple  |
      | banana  | Banana |`;

const VALID_WITH_BACKGROUND = `Feature: Authentication
  Background:
    Given the app is running

  Scenario: Login
    When I log in
    Then I see the dashboard`;

const VALID_WITH_TAGS = `@smoke @regression
Feature: Login

  @critical
  Scenario: Valid login
    Given I am on the login page
    When I enter valid credentials
    Then I am redirected to the dashboard`;

const VALID_WITH_AND_BUT = `Feature: Form validation
  Scenario: Multiple field errors
    Given I open the form
    When I submit without a title
    And I submit without an email
    Then I see two errors
    But the form is not closed`;

describe("validateGherkin", () => {
	it("returns valid=true and scenarioCount=1 for a minimal valid feature", () => {
		const result = validateGherkin(VALID_MINIMAL);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.scenarioCount).toBe(1);
	});

	it("counts multiple scenarios", () => {
		const result = validateGherkin(VALID_TWO_SCENARIOS);
		expect(result.valid).toBe(true);
		expect(result.scenarioCount).toBe(2);
	});

	it("accepts Scenario Outline with Examples", () => {
		const result = validateGherkin(VALID_OUTLINE);
		expect(result.valid).toBe(true);
		expect(result.scenarioCount).toBe(1);
	});

	it("accepts Background keyword", () => {
		const result = validateGherkin(VALID_WITH_BACKGROUND);
		expect(result.valid).toBe(true);
	});

	it("accepts tags on Feature and Scenario lines", () => {
		const result = validateGherkin(VALID_WITH_TAGS);
		expect(result.valid).toBe(true);
	});

	it("accepts And and But step keywords", () => {
		const result = validateGherkin(VALID_WITH_AND_BUT);
		expect(result.valid).toBe(true);
	});

	it("returns error for empty string", () => {
		const result = validateGherkin("");
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("returns error when Feature keyword is missing", () => {
		const noFeature = "Scenario: Login\n  Given I open the app\n  Then I see the login page";
		const result = validateGherkin(noFeature);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.toLowerCase().includes("feature"))).toBe(true);
	});

	it("returns error when no scenarios are present", () => {
		const result = validateGherkin("Feature: Empty feature\n");
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.toLowerCase().includes("scenario"))).toBe(true);
		expect(result.scenarioCount).toBe(0);
	});

	it("returns error when a scenario has no steps", () => {
		const noSteps = "Feature: Login\n  Scenario: User logs in\n";
		const result = validateGherkin(noSteps);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.toLowerCase().includes("step"))).toBe(true);
	});

	it("returns error for Scenario Outline missing Examples", () => {
		const noExamples = `Feature: Search
  Scenario Outline: Search
    Given I search for "<keyword>"
    Then I see "<result>"`;
		const result = validateGherkin(noExamples);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.message.toLowerCase().includes("example"))).toBe(true);
	});

	it("includes line number in errors", () => {
		const result = validateGherkin("Scenario: Login\n  Given I open the app\n");
		expect(result.errors[0]?.line).toBeGreaterThan(0);
	});

	it("returns scenarioCount=0 for invalid input", () => {
		const result = validateGherkin("not gherkin at all");
		expect(result.scenarioCount).toBe(0);
	});
});
