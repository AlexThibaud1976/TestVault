import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BddSyncOptions } from "./bdd-sync.js";
import { processBddSync } from "./bdd-sync.js";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@atconseil/argos-sdk", () => ({
	createAdoClient: vi.fn(() => ({})),
	createTestCaseService: vi.fn(() => ({
		list: mockList,
		create: mockCreate,
		update: mockUpdate,
	})),
}));

vi.mock("@atconseil/testvault-gherkin", () => ({
	featureToTestCases: vi.fn(),
}));

const SIMPLE_FEATURE = `Feature: Login
  Scenario: User logs in
    Given I open the app
    Then I am authenticated`;

const BASE_OPTS: BddSyncOptions = {
	orgUrl: "https://dev.azure.com/acme",
	project: "MyProject",
	pat: "fake-pat",
	areaPath: "MyProject\\Auth",
	featurePaths: ["tests/auth.feature"],
};

describe("processBddSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreate.mockResolvedValue({ id: 99, title: "User logs in" });
		mockUpdate.mockResolvedValue({ id: 10, title: "User logs in" });
	});

	it("creates TC for each scenario in a .feature file (no existing TCs)", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue(SIMPLE_FEATURE);
		vi.mocked(featureToTestCases).mockReturnValue([
			{
				title: "User logs in",
				areaPath: "MyProject\\Auth",
				priority: 3,
				automationStatus: "Planned",
				gherkin: "Feature: Login\n  Scenario: User logs in\n    Given I open the app",
				steps: [{ index: 1, action: "Given I open the app", expected: "" }],
			},
		]);
		mockList.mockResolvedValue([]);

		const result = await processBddSync(BASE_OPTS);

		expect(mockCreate).toHaveBeenCalledTimes(1);
		expect(result.created).toBe(1);
	});

	it("updates TC when scenario title matches an existing TC", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue(SIMPLE_FEATURE);
		vi.mocked(featureToTestCases).mockReturnValue([
			{
				title: "User logs in",
				areaPath: "MyProject\\Auth",
				priority: 3,
				automationStatus: "Planned",
				gherkin: "Feature: Login\n  Scenario: User logs in\n    Given I open the app",
				steps: [],
			},
		]);
		mockList.mockResolvedValue([{ id: 10, title: "User logs in", areaPath: "MyProject\\Auth" }]);

		const result = await processBddSync(BASE_OPTS);

		expect(mockUpdate).toHaveBeenCalledWith(
			10,
			expect.objectContaining({ gherkin: expect.any(String) })
		);
		expect(mockCreate).not.toHaveBeenCalled();
		expect(result.updated).toBe(1);
	});

	it("handles multiple .feature files", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue(SIMPLE_FEATURE);
		vi.mocked(featureToTestCases)
			.mockReturnValueOnce([
				{
					title: "Scenario A",
					areaPath: "MyProject\\Auth",
					priority: 3,
					automationStatus: "Planned",
					gherkin: "Feature: Auth\n  Scenario: Scenario A\n    Given step",
					steps: [],
				},
			])
			.mockReturnValueOnce([
				{
					title: "Scenario B",
					areaPath: "MyProject\\Auth",
					priority: 3,
					automationStatus: "Planned",
					gherkin: "Feature: Cart\n  Scenario: Scenario B\n    Given step",
					steps: [],
				},
			]);
		mockList.mockResolvedValue([]);

		const result = await processBddSync({
			...BASE_OPTS,
			featurePaths: ["tests/auth.feature", "tests/cart.feature"],
		});

		expect(result.files).toBe(2);
		expect(mockCreate).toHaveBeenCalledTimes(2);
	});

	it("returns correct files count", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue(SIMPLE_FEATURE);
		vi.mocked(featureToTestCases).mockReturnValue([]);
		mockList.mockResolvedValue([]);

		const result = await processBddSync({
			...BASE_OPTS,
			featurePaths: ["a.feature", "b.feature", "c.feature"],
		});

		expect(result.files).toBe(3);
	});

	it("passes the correct areaPath to tcService.create", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue(SIMPLE_FEATURE);
		vi.mocked(featureToTestCases).mockReturnValue([
			{
				title: "New TC",
				areaPath: "MyProject\\QA",
				priority: 3,
				automationStatus: "Planned",
				gherkin: "...",
				steps: [],
			},
		]);
		mockList.mockResolvedValue([]);

		await processBddSync({ ...BASE_OPTS, areaPath: "MyProject\\QA" });

		expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ areaPath: "MyProject\\QA" }));
	});

	it("returns zero created and updated when all files are empty", async () => {
		const { readFileSync } = await import("node:fs");
		const { featureToTestCases } = await import("@atconseil/testvault-gherkin");
		vi.mocked(readFileSync).mockReturnValue("");
		vi.mocked(featureToTestCases).mockReturnValue([]);
		mockList.mockResolvedValue([]);

		const result = await processBddSync(BASE_OPTS);

		expect(result.created).toBe(0);
		expect(result.updated).toBe(0);
	});
});
