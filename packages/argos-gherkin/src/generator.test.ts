import { describe, expect, it } from "vitest";
import { generateFeature, testCasesToFeature } from "./generator.js";
import { parseFeature } from "./parser.js";
import type { ParsedScenario, ParsedStep } from "./parser.js";

const SIMPLE_SCENARIOS: ParsedScenario[] = [
	{
		title: "User logs in",
		tags: [],
		isOutline: false,
		steps: [
			{ keyword: "Given", text: "I open the app" },
			{ keyword: "When", text: "I enter my credentials" },
			{ keyword: "Then", text: "I am logged in" },
		],
	},
];

const OUTLINE_SCENARIO: ParsedScenario = {
	title: "Login variants",
	tags: [],
	isOutline: true,
	steps: [
		{ keyword: "Given", text: "I open the app" },
		{ keyword: "When", text: "I enter <username>" },
		{ keyword: "Then", text: "I see <greeting>" },
	],
	examples: {
		headers: ["username", "greeting"],
		rows: [
			["alice", "Hi Alice"],
			["bob", "Hi Bob"],
		],
	},
};

describe("generateFeature", () => {
	it("starts with Feature: header", () => {
		const out = generateFeature("Login", SIMPLE_SCENARIOS);
		expect(out.startsWith("Feature: Login")).toBe(true);
	});

	it("includes Scenario keyword and title", () => {
		const out = generateFeature("Login", SIMPLE_SCENARIOS);
		expect(out).toContain("Scenario: User logs in");
	});

	it("includes all steps", () => {
		const out = generateFeature("Login", SIMPLE_SCENARIOS);
		expect(out).toContain("Given I open the app");
		expect(out).toContain("When I enter my credentials");
		expect(out).toContain("Then I am logged in");
	});

	it("includes tags before scenario", () => {
		const base = SIMPLE_SCENARIOS[0] as ParsedScenario;
		const tagged: ParsedScenario[] = [{ ...base, tags: ["smoke", "critical"] }];
		const out = generateFeature("Login", tagged);
		expect(out).toContain("@smoke @critical");
	});

	it("uses Scenario Outline keyword for outline scenarios", () => {
		const out = generateFeature("Auth", [OUTLINE_SCENARIO]);
		expect(out).toContain("Scenario Outline: Login variants");
	});

	it("includes Examples: section for outlines", () => {
		const out = generateFeature("Auth", [OUTLINE_SCENARIO]);
		expect(out).toContain("Examples:");
	});

	it("includes Examples table headers", () => {
		const out = generateFeature("Auth", [OUTLINE_SCENARIO]);
		expect(out).toContain("| username | greeting |");
	});

	it("includes Examples table rows", () => {
		const out = generateFeature("Auth", [OUTLINE_SCENARIO]);
		expect(out).toContain("| alice | Hi Alice |");
		expect(out).toContain("| bob | Hi Bob |");
	});

	it("includes Background section when provided", () => {
		const bg: ParsedStep[] = [{ keyword: "Given", text: "I am logged in" }];
		const out = generateFeature("Cart", SIMPLE_SCENARIOS, bg);
		expect(out).toContain("Background:");
		expect(out).toContain("Given I am logged in");
	});

	it("handles multiple scenarios", () => {
		const scenarios: ParsedScenario[] = [
			{
				title: "Scenario A",
				tags: [],
				isOutline: false,
				steps: [{ keyword: "Given", text: "step A" }],
			},
			{
				title: "Scenario B",
				tags: [],
				isOutline: false,
				steps: [{ keyword: "Given", text: "step B" }],
			},
		];
		const out = generateFeature("Multi", scenarios);
		expect(out).toContain("Scenario: Scenario A");
		expect(out).toContain("Scenario: Scenario B");
	});

	it("ends with a newline", () => {
		const out = generateFeature("Login", SIMPLE_SCENARIOS);
		expect(out.endsWith("\n")).toBe(true);
	});
});

const COMPLEX = `Feature: Shopping Cart
  Background:
    Given I am logged in

  @smoke
  Scenario: Add item to cart
    Given I am on the product page
    When I click add to cart
    Then my cart count increases by 1

  Scenario Outline: Checkout variants
    Given I have <count> items in cart
    When I checkout with <method>
    Then I see <confirmation>

    Examples:
      | count | method      | confirmation |
      | 1     | credit card | Order #001   |
      | 3     | PayPal      | Order #002   |`;

describe("Round-trip (parse → generate → parse)", () => {
	it("preserves feature title", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		expect(parseFeature(gen).title).toBe(parsed.title);
	});

	it("preserves scenario count", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		expect(parseFeature(gen).scenarios).toHaveLength(parsed.scenarios.length);
	});

	it("preserves scenario titles", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		for (let i = 0; i < parsed.scenarios.length; i++) {
			expect(reparsed.scenarios[i]?.title).toBe(parsed.scenarios[i]?.title);
		}
	});

	it("preserves step count per scenario", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		for (let i = 0; i < parsed.scenarios.length; i++) {
			expect(reparsed.scenarios[i]?.steps).toHaveLength(parsed.scenarios[i]?.steps.length ?? 0);
		}
	});

	it("preserves tags", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		expect(reparsed.scenarios[0]?.tags).toEqual(parsed.scenarios[0]?.tags);
	});

	it("preserves Examples table headers", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		expect(reparsed.scenarios[1]?.examples?.headers).toEqual(
			parsed.scenarios[1]?.examples?.headers
		);
	});

	it("preserves Examples row count", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		expect(reparsed.scenarios[1]?.examples?.rows).toHaveLength(
			parsed.scenarios[1]?.examples?.rows.length ?? 0
		);
	});

	it("preserves background steps", () => {
		const parsed = parseFeature(COMPLEX);
		const gen = generateFeature(parsed.title, parsed.scenarios, parsed.background);
		const reparsed = parseFeature(gen);
		expect(reparsed.background).toHaveLength(parsed.background.length);
		expect(reparsed.background[0]).toEqual(parsed.background[0]);
	});
});

describe("testCasesToFeature", () => {
	it("bundles multiple TC gherkin under one Feature header", () => {
		const tcs = [
			{ title: "TC1", gherkin: "Feature: F\n  Scenario: TC1\n    Given step 1" },
			{ title: "TC2", gherkin: "Feature: F\n  Scenario: TC2\n    Given step 2" },
		];
		const out = testCasesToFeature("Combined", tcs);
		expect(out).toContain("Feature: Combined");
		expect(out).toContain("Scenario: TC1");
		expect(out).toContain("Scenario: TC2");
	});

	it("skips TCs without a gherkin field", () => {
		const tcs = [
			{ title: "TC1", gherkin: "Feature: F\n  Scenario: TC1\n    Given step 1" },
			{ title: "TC2" },
		];
		const out = testCasesToFeature("Combined", tcs);
		expect(out).toContain("Scenario: TC1");
		expect(out).not.toContain("Scenario: TC2");
	});

	it("produces exactly one Feature: line", () => {
		const tcs = [
			{ title: "TC1", gherkin: "Feature: A\n  Scenario: TC1\n    Given s1" },
			{ title: "TC2", gherkin: "Feature: B\n  Scenario: TC2\n    Given s2" },
		];
		const out = testCasesToFeature("Combined", tcs);
		const featureLines = out.split("\n").filter((l) => l.trimStart().startsWith("Feature:"));
		expect(featureLines).toHaveLength(1);
	});
});
