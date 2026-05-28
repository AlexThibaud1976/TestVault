import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestStepSuggestion } from "../../llm/llm-provider.js";
import { SuggestStepsDrawer } from "./SuggestStepsDrawer.js";

afterEach(cleanup);

function withFluent(node: React.ReactNode) {
	return <FluentProvider theme={webLightTheme}>{node}</FluentProvider>;
}

function makeSteps(n: number): TestStepSuggestion[] {
	return Array.from({ length: n }, (_, i) => ({
		action: `Action ${i + 1}`,
		expected: `Expected ${i + 1}`,
	}));
}

describe("SuggestStepsDrawer -- wraps Sprint 2.22 Replace/Complete/Cancel logic", () => {
	it("is hidden when isOpen=false", () => {
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen={false}
					generatedSteps={makeSteps(3)}
					hasExistingSteps
					onReplace={vi.fn()}
					onComplete={vi.fn()}
					onCancel={vi.fn()}
				/>
			)
		);
		expect(screen.queryByTestId("suggest-steps-drawer")).toBeNull();
	});

	it("renders Drawer surface and the generated steps list when isOpen=true", () => {
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={makeSteps(2)}
					hasExistingSteps
					onReplace={vi.fn()}
					onComplete={vi.fn()}
					onCancel={vi.fn()}
				/>
			)
		);
		expect(screen.getByTestId("suggest-steps-drawer")).toBeDefined();
		expect(screen.getByText("Action 1")).toBeDefined();
		expect(screen.getByText("Action 2")).toBeDefined();
	});

	it("Replace action invokes onReplace callback once and onCancel/onComplete are not called", () => {
		const onReplace = vi.fn();
		const onComplete = vi.fn();
		const onCancel = vi.fn();
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={makeSteps(3)}
					hasExistingSteps
					onReplace={onReplace}
					onComplete={onComplete}
					onCancel={onCancel}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-steps-replace"));
		expect(onReplace).toHaveBeenCalledTimes(1);
		expect(onComplete).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("Complete action invokes onComplete callback once when existing steps are present", () => {
		const onReplace = vi.fn();
		const onComplete = vi.fn();
		const onCancel = vi.fn();
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={makeSteps(2)}
					hasExistingSteps
					onReplace={onReplace}
					onComplete={onComplete}
					onCancel={onCancel}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-steps-complete"));
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onReplace).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("Cancel action invokes onCancel callback once and no merge callback fires", () => {
		const onReplace = vi.fn();
		const onComplete = vi.fn();
		const onCancel = vi.fn();
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={makeSteps(1)}
					hasExistingSteps
					onReplace={onReplace}
					onComplete={onComplete}
					onCancel={onCancel}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-steps-cancel"));
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onReplace).not.toHaveBeenCalled();
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("hides the Complete action when hasExistingSteps=false (Insert-only mode)", () => {
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={makeSteps(2)}
					hasExistingSteps={false}
					onReplace={vi.fn()}
					onComplete={vi.fn()}
					onCancel={vi.fn()}
				/>
			)
		);
		// Complete is hidden when there are no existing steps to keep.
		expect(screen.queryByTestId("suggest-steps-complete")).toBeNull();
		// Replace is rebadged "Insert" but the testid stays stable.
		expect(screen.getByTestId("suggest-steps-replace")).toBeDefined();
	});

	it("renders generation error when errorMessage is provided", () => {
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={[]}
					hasExistingSteps
					errorMessage="LLM timeout"
					onReplace={vi.fn()}
					onComplete={vi.fn()}
					onCancel={vi.fn()}
				/>
			)
		);
		expect(screen.getByTestId("suggest-steps-error").textContent).toContain("LLM timeout");
	});

	it("renders generating placeholder when isGenerating is true", () => {
		render(
			withFluent(
				<SuggestStepsDrawer
					isOpen
					generatedSteps={[]}
					hasExistingSteps
					isGenerating
					onReplace={vi.fn()}
					onComplete={vi.fn()}
					onCancel={vi.fn()}
				/>
			)
		);
		expect(screen.getByTestId("suggest-steps-generating")).toBeDefined();
		// Action buttons are not shown until generation completes
		expect(screen.queryByTestId("suggest-steps-replace")).toBeNull();
		expect(screen.queryByTestId("suggest-steps-complete")).toBeNull();
	});
});
