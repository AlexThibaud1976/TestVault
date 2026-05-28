// Monaco editor requires browser APIs (Worker, ResizeObserver, etc.) that
// jsdom does not provide. We mock @monaco-editor/react with a minimal
// textarea-like surface that still exposes value/onChange so behaviour
// tests stay meaningful.
import { vi } from "vitest";

vi.mock("@monaco-editor/react", () => ({
	default: ({
		value,
		onChange,
		onMount,
	}: {
		value?: string;
		onChange?: (v: string | undefined) => void;
		onMount?: () => void;
	}) => {
		// React import is implicit through the test runtime; we use raw JSX.
		return (
			<textarea
				data-testid="gherkin-monaco"
				value={value ?? ""}
				onChange={(e) => onChange?.(e.target.value)}
				ref={() => onMount?.()}
			/>
		);
	},
}));

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GherkinEditor } from "./GherkinEditor.js";

const VALID_GHERKIN = `Feature: Login
  Scenario: User logs in
    Given I am on the login page
    When I enter credentials
    Then I see the dashboard`;

const INVALID_GHERKIN = `Scenario: No feature
  Given something`;

afterEach(cleanup);

describe("GherkinEditor (Monaco-based, Sprint 2.21 part 3)", () => {
	it("renders a Monaco editor for the TestVault.Gherkin field", () => {
		render(<GherkinEditor value="" onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-monaco")).toBeDefined();
	});

	it("displays the current value in the Monaco editor", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		const editor = screen.getByTestId("gherkin-monaco") as HTMLTextAreaElement;
		expect(editor.value).toBe(VALID_GHERKIN);
	});

	it("calls onChange when the editor value changes", async () => {
		const onChange = vi.fn();
		render(<GherkinEditor value="" onChange={onChange} />);
		await act(async () => {
			fireEvent.change(screen.getByTestId("gherkin-monaco"), {
				target: { value: VALID_GHERKIN },
			});
		});
		expect(onChange).toHaveBeenCalledWith(VALID_GHERKIN);
	});

	it("preserves validateGherkin: no error indicator for valid Gherkin", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		expect(screen.queryByTestId("gherkin-errors")).toBeNull();
	});

	it("preserves validateGherkin: shows errors for invalid Gherkin", () => {
		render(<GherkinEditor value={INVALID_GHERKIN} onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-errors")).toBeDefined();
	});

	it("preserves validateGherkin: shows scenario count for valid Gherkin", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-scenario-count").textContent).toContain("1");
	});

	it("backward-compat: empty field renders Monaco editor without crashing", () => {
		render(<GherkinEditor value="" onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-monaco")).toBeDefined();
	});

	it("backward-compat: plain-text Gherkin content (pre-Monaco TCs) renders unchanged", () => {
		const plainText = "Free-form text without Gherkin keywords";
		render(<GherkinEditor value={plainText} onChange={() => {}} />);
		const editor = screen.getByTestId("gherkin-monaco") as HTMLTextAreaElement;
		expect(editor.value).toBe(plainText);
	});

	it("renders a Gherkin syntax hint placeholder/help text", () => {
		render(<GherkinEditor value="" onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-hint")).toBeDefined();
	});
});
