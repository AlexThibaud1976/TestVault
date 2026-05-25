import { describe, expect, it } from "vitest";
import {
	LlmTimeoutError,
	LlmTruncationError,
	MAX_TOKENS_DEFAULT,
	MAX_TOKENS_MAX,
	MAX_TOKENS_MIN,
	MAX_TOKENS_STEP,
	TOKENS_PER_TEST_CASE,
	calculateTimeoutMs,
	estimateTestCasesCount,
} from "./llm-provider.js";

// Sprint 2.21 part 2 CHECKPOINT C -- behavioural unit tests for the public
// surface of llm-provider.ts. Source-scan counterparts live in
// tools/regression/T-2.21-part-2-max-tokens-surface.test.ts.

describe("max_tokens constants (Sprint 2.21 part 2)", () => {
	it("MAX_TOKENS_DEFAULT = 4000", () => {
		expect(MAX_TOKENS_DEFAULT).toBe(4000);
	});

	it("MAX_TOKENS_MIN = 1000", () => {
		expect(MAX_TOKENS_MIN).toBe(1000);
	});

	it("MAX_TOKENS_MAX = 16000", () => {
		expect(MAX_TOKENS_MAX).toBe(16000);
	});

	it("MAX_TOKENS_STEP = 1000", () => {
		expect(MAX_TOKENS_STEP).toBe(1000);
	});

	it("TOKENS_PER_TEST_CASE is a positive finite number", () => {
		expect(typeof TOKENS_PER_TEST_CASE).toBe("number");
		expect(TOKENS_PER_TEST_CASE).toBeGreaterThan(0);
		expect(Number.isFinite(TOKENS_PER_TEST_CASE)).toBe(true);
	});

	it("MIN <= DEFAULT <= MAX (range invariant)", () => {
		expect(MAX_TOKENS_MIN).toBeLessThanOrEqual(MAX_TOKENS_DEFAULT);
		expect(MAX_TOKENS_DEFAULT).toBeLessThanOrEqual(MAX_TOKENS_MAX);
	});

	it("(MAX - MIN) is a multiple of STEP", () => {
		expect((MAX_TOKENS_MAX - MAX_TOKENS_MIN) % MAX_TOKENS_STEP).toBe(0);
	});
});

describe("calculateTimeoutMs", () => {
	it("clamps to 30_000ms minimum for very low maxTokens", () => {
		// 100 tokens -> 10s estimated -> 15s with margin -> clamped UP to 30_000
		expect(calculateTimeoutMs(100)).toBe(30_000);
	});

	it("clamps to 300_000ms maximum for high maxTokens", () => {
		// 16000 tokens -> 1600s estimated -> 2400s with margin -> clamped DOWN to 300_000
		expect(calculateTimeoutMs(16000)).toBe(300_000);
	});

	it("clamps to 300_000ms for the default (4000)", () => {
		expect(calculateTimeoutMs(4000)).toBe(300_000);
	});

	it("uses MAX_TOKENS_DEFAULT when maxTokens is undefined", () => {
		expect(calculateTimeoutMs(undefined)).toBe(calculateTimeoutMs(MAX_TOKENS_DEFAULT));
	});

	it("returns a finite value within [30_000, 300_000] for all valid inputs", () => {
		for (const t of [1000, 2000, 4000, 8000, 12000, 16000]) {
			const ms = calculateTimeoutMs(t);
			expect(Number.isFinite(ms)).toBe(true);
			expect(ms).toBeGreaterThanOrEqual(30_000);
			expect(ms).toBeLessThanOrEqual(300_000);
		}
	});

	it("is monotonically non-decreasing across the valid range", () => {
		const samples = [200, 500, 1000, 2000, 4000, 8000, 16000].map(calculateTimeoutMs);
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] as number);
		}
	});
});

describe("estimateTestCasesCount", () => {
	it("returns at least 5 test cases for the default max_tokens (4000)", () => {
		expect(estimateTestCasesCount(4000)).toBeGreaterThanOrEqual(5);
	});

	it("scales with maxTokens (8000 yields more than 2000)", () => {
		expect(estimateTestCasesCount(8000)).toBeGreaterThan(estimateTestCasesCount(2000));
	});

	it("returns a positive integer", () => {
		const count = estimateTestCasesCount(4000);
		expect(Number.isInteger(count)).toBe(true);
		expect(count).toBeGreaterThan(0);
	});

	it("returns a sensible upper estimate for 16000 tokens", () => {
		// Heuristic: ~700 tokens per TC -> ~22 TCs for 16000.
		// We just bound it loosely to avoid pinning the heuristic constant here.
		const count = estimateTestCasesCount(16000);
		expect(count).toBeGreaterThan(10);
		expect(count).toBeLessThan(40);
	});
});

describe("LlmTruncationError", () => {
	it("is an Error subclass", () => {
		const err = new LlmTruncationError("Response truncated");
		expect(err).toBeInstanceOf(Error);
	});

	it("has discriminating name 'LlmTruncationError'", () => {
		const err = new LlmTruncationError("x");
		expect(err.name).toBe("LlmTruncationError");
	});

	it("preserves the caller-supplied message", () => {
		const err = new LlmTruncationError("Response truncated, increase Max Tokens");
		expect(err.message).toContain("truncated");
	});
});

describe("LlmTimeoutError", () => {
	it("is an Error subclass", () => {
		const err = new LlmTimeoutError("LLM call timed out");
		expect(err).toBeInstanceOf(Error);
	});

	it("has discriminating name 'LlmTimeoutError'", () => {
		const err = new LlmTimeoutError("x");
		expect(err.name).toBe("LlmTimeoutError");
	});

	it("preserves the caller-supplied message", () => {
		const err = new LlmTimeoutError("LLM call timed out after 30s");
		expect(err.message).toContain("timed out");
	});
});

describe("LlmTruncationError vs LlmTimeoutError", () => {
	it("are distinct classes with different names", () => {
		const trunc = new LlmTruncationError("t");
		const timeout = new LlmTimeoutError("t");
		expect(trunc.name).not.toBe(timeout.name);
		expect(trunc).not.toBeInstanceOf(LlmTimeoutError);
		expect(timeout).not.toBeInstanceOf(LlmTruncationError);
	});
});
