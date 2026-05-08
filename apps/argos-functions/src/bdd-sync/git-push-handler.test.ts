import { describe, expect, it, vi } from "vitest";
import type {
	GitPushEvent,
	IBddMappingReader,
	IBddTcService,
	IFileReader,
} from "./git-push-handler.js";
import { handleGitPush } from "./git-push-handler.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const REPO_URL = "https://dev.azure.com/org/proj/_git/MyRepo";
const BRANCH = "main";
const AREA_PATH = "MyProject\\Auth";

const SIMPLE_FEATURE = `Feature: Login
  Scenario: User logs in
    Given I open the app
    When I enter credentials
    Then I am authenticated`;

const TWO_SCENARIO_FEATURE = `Feature: Login
  Scenario: User logs in
    Given I open the app
    Then I am authenticated

  Scenario: Admin logs in
    Given I open the admin panel
    Then I see the dashboard`;

type MappingEntry = { repoUrl: string; branch: string; pathGlob: string; areaPath: string };

function makeMapping(overrides?: Partial<MappingEntry>): MappingEntry {
	return {
		repoUrl: REPO_URL,
		branch: BRANCH,
		pathGlob: "**/*.feature",
		areaPath: AREA_PATH,
		...overrides,
	};
}

function makeMappingReader(mappings: MappingEntry[] = []): IBddMappingReader {
	return { listMappings: vi.fn().mockResolvedValue(mappings) };
}

function makeTcService(
	existing: Array<{ id: number; title: string; gherkin?: string }> = []
): IBddTcService {
	return {
		list: vi.fn().mockResolvedValue(existing),
		create: vi.fn().mockImplementation(async (d) => ({ id: 99, title: d.title })),
		update: vi.fn().mockResolvedValue(undefined),
		deprecate: vi.fn().mockResolvedValue(undefined),
	};
}

function makeFileReader(content: string = SIMPLE_FEATURE): IFileReader {
	return { read: vi.fn().mockResolvedValue(content) };
}

function pushEvent(files: GitPushEvent["changedFiles"]): GitPushEvent {
	return { repoUrl: REPO_URL, branch: BRANCH, changedFiles: files };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("handleGitPush", () => {
	it("skips non-.feature files", async () => {
		const tc = makeTcService();
		const result = await handleGitPush(
			pushEvent([{ path: "src/app.ts", changeType: "edit" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader()
		);
		expect(result.skipped).toBe(1);
		expect(tc.create).not.toHaveBeenCalled();
	});

	it("skips .feature files with no matching mapping", async () => {
		const tc = makeTcService();
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "edit" }]),
			makeMappingReader([makeMapping({ repoUrl: "https://other.example.com/repo" })]),
			tc,
			makeFileReader()
		);
		expect(result.skipped).toBe(1);
		expect(tc.create).not.toHaveBeenCalled();
	});

	it("creates one TC per scenario for a new .feature file (add)", async () => {
		const tc = makeTcService([]);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "add" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader(TWO_SCENARIO_FEATURE)
		);
		expect(result.created).toBe(2);
		expect(result.updated).toBe(0);
		expect(tc.create).toHaveBeenCalledTimes(2);
	});

	it("updates existing TCs when .feature file is edited", async () => {
		const existing = [{ id: 10, title: "User logs in", gherkin: "Feature: Login\n..." }];
		const tc = makeTcService(existing);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "edit" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader(SIMPLE_FEATURE)
		);
		expect(result.updated).toBe(1);
		expect(result.created).toBe(0);
		expect(vi.mocked(tc.update)).toHaveBeenCalledWith(
			10,
			expect.objectContaining({ gherkin: expect.any(String) })
		);
	});

	it("creates new TC when scenario is added to an existing .feature file", async () => {
		const existing = [{ id: 10, title: "User logs in", gherkin: "Feature: Login\n..." }];
		const tc = makeTcService(existing);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "edit" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader(TWO_SCENARIO_FEATURE)
		);
		expect(result.updated).toBe(1);
		expect(result.created).toBe(1);
	});

	it("deprecates TC when scenario is removed from a .feature file", async () => {
		const existing = [
			{ id: 10, title: "User logs in", gherkin: "Feature: Login\n..." },
			{ id: 11, title: "Old scenario", gherkin: "Feature: Login\n..." },
		];
		const tc = makeTcService(existing);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "edit" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader(SIMPLE_FEATURE)
		);
		expect(result.deprecated).toBe(1);
		expect(vi.mocked(tc.deprecate)).toHaveBeenCalledWith(11);
	});

	it("deprecates all gherkin TCs in area path when .feature file is deleted", async () => {
		const existing = [
			{ id: 10, title: "User logs in", gherkin: "Feature: Login\n..." },
			{ id: 11, title: "Admin logs in", gherkin: "Feature: Login\n..." },
		];
		const tc = makeTcService(existing);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "delete" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader()
		);
		expect(result.deprecated).toBe(2);
		expect(vi.mocked(tc.deprecate)).toHaveBeenCalledWith(10);
		expect(vi.mocked(tc.deprecate)).toHaveBeenCalledWith(11);
	});

	it("passes correct areaPath to service.create", async () => {
		const tc = makeTcService([]);
		await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "add" }]),
			makeMappingReader([makeMapping({ areaPath: "MyProject\\QA" })]),
			tc,
			makeFileReader(SIMPLE_FEATURE)
		);
		expect(vi.mocked(tc.create)).toHaveBeenCalledWith(
			expect.objectContaining({ areaPath: "MyProject\\QA" })
		);
	});

	it("pathGlob restricts which files are processed", async () => {
		const tc = makeTcService([]);
		const result = await handleGitPush(
			pushEvent([{ path: "src/auth.feature", changeType: "add" }]),
			makeMappingReader([makeMapping({ pathGlob: "tests/**/*.feature" })]),
			tc,
			makeFileReader(SIMPLE_FEATURE)
		);
		expect(result.skipped).toBe(1);
		expect(tc.create).not.toHaveBeenCalled();
	});

	it("does not deprecate TCs without gherkin when scenario removed", async () => {
		const existing = [
			{ id: 10, title: "Old scenario", gherkin: "Feature: Login\n..." },
			{ id: 20, title: "Manual TC" },
		];
		const tc = makeTcService(existing);
		const result = await handleGitPush(
			pushEvent([{ path: "tests/auth.feature", changeType: "edit" }]),
			makeMappingReader([makeMapping()]),
			tc,
			makeFileReader(SIMPLE_FEATURE)
		);
		expect(result.deprecated).toBe(1);
		expect(vi.mocked(tc.deprecate)).not.toHaveBeenCalledWith(20);
	});
});
