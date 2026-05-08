import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GherkinEditor } from "./GherkinEditor.js";

const VALID_GHERKIN = `Feature: Login
  Scenario: User logs in
    Given I am on the login page
    When I enter credentials
    Then I see the dashboard`;

const INVALID_GHERKIN = `Scenario: No feature
  Given something`;

afterEach(cleanup);

describe("GherkinEditor", () => {
	it("renders a textarea (test-mode editor)", () => {
		render(<GherkinEditor value="" onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-textarea")).toBeDefined();
	});

	it("displays the current value in the textarea", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		const ta = screen.getByTestId("gherkin-textarea") as HTMLTextAreaElement;
		expect(ta.value).toBe(VALID_GHERKIN);
	});

	it("calls onChange when the textarea value changes", async () => {
		const onChange = vi.fn();
		render(<GherkinEditor value="" onChange={onChange} />);
		await act(async () => {
			fireEvent.change(screen.getByTestId("gherkin-textarea"), {
				target: { value: VALID_GHERKIN },
			});
		});
		expect(onChange).toHaveBeenCalledWith(VALID_GHERKIN);
	});

	it("shows no error indicator for valid Gherkin", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		expect(screen.queryByTestId("gherkin-errors")).toBeNull();
	});

	it("shows validation errors for invalid Gherkin", () => {
		render(<GherkinEditor value={INVALID_GHERKIN} onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-errors")).toBeDefined();
	});

	it("shows scenario count for valid Gherkin", () => {
		render(<GherkinEditor value={VALID_GHERKIN} onChange={() => {}} />);
		expect(screen.getByTestId("gherkin-scenario-count").textContent).toContain("1");
	});

	it("shows placeholder text when value is empty", () => {
		render(<GherkinEditor value="" onChange={() => {}} />);
		const ta = screen.getByTestId("gherkin-textarea") as HTMLTextAreaElement;
		expect(ta.placeholder).toBeTruthy();
	});
});
