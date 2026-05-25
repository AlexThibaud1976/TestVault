import type { TestCaseSuggestion, TestStepSuggestion } from "./llm-provider.js";

const VALID_PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);
const VALID_COVERAGE_TYPES = new Set([
	"happy_path",
	"edge_case",
	"error_case",
	"acceptance_criterion",
]);

function isValidStep(s: unknown): s is { action: string; expected: string } {
	return (
		typeof s === "object" &&
		s !== null &&
		typeof (s as Record<string, unknown>).action === "string" &&
		typeof (s as Record<string, unknown>).expected === "string"
	);
}

function isValidSuggestion(s: unknown): s is TestCaseSuggestion {
	if (typeof s !== "object" || s === null) return false;
	const obj = s as Record<string, unknown>;
	return (
		typeof obj.title === "string" &&
		obj.title.length > 0 &&
		typeof obj.description === "string" &&
		typeof obj.priority === "string" &&
		VALID_PRIORITIES.has(obj.priority) &&
		Array.isArray(obj.steps) &&
		obj.steps.every(isValidStep) &&
		Array.isArray(obj.tags) &&
		obj.tags.every((t: unknown) => typeof t === "string") &&
		typeof obj.coverage_type === "string" &&
		VALID_COVERAGE_TYPES.has(obj.coverage_type)
	);
}

export function parseLlmResponse(content: string): TestCaseSuggestion[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error("AI response could not be parsed, retry");
	}

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!Array.isArray((parsed as Record<string, unknown>).test_cases)
	) {
		throw new Error("AI response did not contain a test_cases array");
	}

	const raw = (parsed as Record<string, unknown>).test_cases as unknown[];
	const valid = raw.filter(isValidSuggestion);

	if (valid.length === 0) {
		throw new Error("AI response contained no valid test case suggestions");
	}

	return valid;
}

// Sprint 2.22 T-2.22.2 -- parser for the steps-only generation flow.
// Accepts: { "steps": [{ "action": "...", "expected": "..." }, ...] }
export function parseStepsResponse(content: string): TestStepSuggestion[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error("AI response could not be parsed, retry");
	}

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!Array.isArray((parsed as Record<string, unknown>).steps)
	) {
		throw new Error("AI response did not contain a steps array");
	}

	const raw = (parsed as Record<string, unknown>).steps as unknown[];
	const valid = raw.filter(isValidStep);

	if (valid.length === 0) {
		throw new Error("AI response contained no valid steps");
	}

	return valid;
}
