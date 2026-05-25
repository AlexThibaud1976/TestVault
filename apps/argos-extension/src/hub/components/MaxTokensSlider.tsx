import {
	MAX_TOKENS_DEFAULT,
	MAX_TOKENS_MAX,
	MAX_TOKENS_MIN,
	MAX_TOKENS_STEP,
	estimateTestCasesCount,
} from "../llm/llm-provider.js";

interface MaxTokensSliderProps {
	value: number;
	onChange: (next: number) => void;
	id?: string;
}

/**
 * Slider in Settings > Advanced for the LLM max_tokens budget.
 *
 * Sprint 2.21 part 2 CHECKPOINT C: pedagogy integrated. The user sees the
 * live equivalence "X tokens -> ~Y test cases" so they can pick a sane value
 * without having to read external docs. Bound by MAX_TOKENS_MIN / MAX in
 * steps of MAX_TOKENS_STEP. Defaults to MAX_TOKENS_DEFAULT.
 */
export function MaxTokensSlider({ value, onChange, id }: MaxTokensSliderProps) {
	const safe = Number.isFinite(value)
		? Math.min(MAX_TOKENS_MAX, Math.max(MAX_TOKENS_MIN, value))
		: MAX_TOKENS_DEFAULT;
	const estimatedTcs = estimateTestCasesCount(safe);

	return (
		<div data-testid="max-tokens-slider">
			<div
				style={{
					display: "flex",
					alignItems: "baseline",
					justifyContent: "space-between",
					gap: "16px",
					marginBottom: "6px",
				}}
			>
				<span
					data-testid="max-tokens-value"
					style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
				>
					{safe} tokens
				</span>
				<span data-testid="max-tokens-estimate" style={{ fontSize: "12px", color: "#555" }}>
					~ {estimatedTcs} test case{estimatedTcs === 1 ? "" : "s"}
				</span>
			</div>
			<input
				id={id}
				data-testid="max-tokens-input"
				type="range"
				min={MAX_TOKENS_MIN}
				max={MAX_TOKENS_MAX}
				step={MAX_TOKENS_STEP}
				value={safe}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: "100%" }}
			/>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "11px",
					color: "#777",
					marginTop: "2px",
				}}
			>
				<span>{MAX_TOKENS_MIN}</span>
				<span>{MAX_TOKENS_MAX}</span>
			</div>
			<div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
				Higher = more test cases per call but slower and costlier. The default ({MAX_TOKENS_DEFAULT}
				) covers most cases (~{estimateTestCasesCount(MAX_TOKENS_DEFAULT)} test cases).
			</div>
		</div>
	);
}
