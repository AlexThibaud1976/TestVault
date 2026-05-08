import { describe, expect, it } from "vitest";
import { parseCucumber } from "./cucumber-parser.js";

const BASIC = JSON.stringify([
	{
		id: "login-feature",
		name: "Login feature",
		description: "Tests for login functionality",
		elements: [
			{
				id: "login-feature;successful-login",
				name: "Successful login",
				description: "",
				type: "scenario",
				tags: [{ name: "@smoke" }, { name: "@auth" }],
				steps: [
					{ keyword: "Given ", name: "I am on the login page", result: { status: "passed" } },
					{ keyword: "When ", name: "I enter valid credentials", result: { status: "passed" } },
					{ keyword: "Then ", name: "I should see the dashboard", result: { status: "passed" } },
				],
			},
			{
				id: "login-feature;failed-login",
				name: "Failed login",
				description: "",
				type: "scenario",
				tags: [],
				steps: [
					{ keyword: "Given ", name: "I am on the login page", result: { status: "passed" } },
					{
						keyword: "When ",
						name: "I enter invalid credentials",
						result: {
							status: "failed",
							error_message: "Expected element to be visible",
						},
					},
				],
			},
		],
	},
]);

const MULTI_FEATURE = JSON.stringify([
	{
		name: "Feature A",
		elements: [{ name: "Scenario A1", type: "scenario", tags: [], steps: [] }],
	},
	{
		name: "Feature B",
		elements: [
			{ name: "Scenario B1", type: "scenario", tags: [], steps: [] },
			{ name: "Scenario B2", type: "scenario", tags: [], steps: [] },
		],
	},
]);

describe("parseCucumber", () => {
	it("parses scenarios as test cases", () => {
		const result = parseCucumber(BASIC);
		expect(result.errors).toHaveLength(0);
		expect(result.items).toHaveLength(2);
	});

	it("sets title to scenario name and automationKey to element id", () => {
		const result = parseCucumber(BASIC);
		expect(result.items[0]?.title).toBe("Successful login");
		expect(result.items[0]?.automationKey).toBe("login-feature;successful-login");
	});

	it("maps steps to ParsedTestStep with action and empty expected", () => {
		const result = parseCucumber(BASIC);
		expect(result.items[0]?.steps).toHaveLength(3);
		expect(result.items[0]?.steps?.[0]?.action).toBe("Given I am on the login page");
	});

	it("extracts tags without @ prefix", () => {
		const result = parseCucumber(BASIC);
		expect(result.items[0]?.tags).toContain("smoke");
		expect(result.items[0]?.tags).toContain("auth");
		expect(result.items[0]?.tags).not.toContain("@smoke");
	});

	it("includes feature name as a tag", () => {
		const result = parseCucumber(BASIC);
		expect(result.items[0]?.tags).toContain("Login feature");
	});

	it("includes error message in description for failed scenarios", () => {
		const result = parseCucumber(BASIC);
		expect(result.items[1]?.description).toContain("Expected element to be visible");
	});

	it("parses multiple features", () => {
		const result = parseCucumber(MULTI_FEATURE);
		expect(result.items).toHaveLength(3);
	});

	it("skips background elements", () => {
		const withBg = JSON.stringify([
			{
				name: "F",
				elements: [
					{ name: "Background setup", type: "background", tags: [], steps: [] },
					{ name: "Scenario 1", type: "scenario", tags: [], steps: [] },
				],
			},
		]);
		const result = parseCucumber(withBg);
		expect(result.items).toHaveLength(1);
	});

	it("returns error for invalid JSON", () => {
		const result = parseCucumber("not json");
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
