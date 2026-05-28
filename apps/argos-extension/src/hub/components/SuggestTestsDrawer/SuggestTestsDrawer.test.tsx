import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TestCaseSuggestion } from "../../llm/llm-provider.js";
import { SuggestTestsDrawer } from "./SuggestTestsDrawer.js";

afterEach(cleanup);

function withFluent(node: React.ReactNode) {
	return <FluentProvider theme={webLightTheme}>{node}</FluentProvider>;
}

function makeSuggestion(title: string, stepCount = 2): TestCaseSuggestion {
	return {
		title,
		description: `Description for ${title}`,
		priority: "P2",
		coverage_type: "happy_path",
		tags: [],
		steps: Array.from({ length: stepCount }, (_, i) => ({
			action: `Action ${i + 1} of ${title}`,
			expected: `Expected ${i + 1}`,
		})),
	};
}

describe("SuggestTestsDrawer -- review phase behaviour", () => {
	it("is hidden when isOpen=false", () => {
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen={false}
					suggestions={[makeSuggestion("Login OK")]}
					onAccept={vi.fn()}
					onDismiss={vi.fn()}
				/>
			)
		);
		expect(screen.queryByTestId("suggest-tests-drawer")).toBeNull();
	});

	it("renders the Drawer surface when isOpen=true", () => {
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("Login OK")]}
					onAccept={vi.fn()}
					onDismiss={vi.fn()}
				/>
			)
		);
		expect(screen.getByTestId("suggest-tests-drawer")).toBeDefined();
	});

	it("displays the list of generated suggestions with title and step count", () => {
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("Login OK", 3), makeSuggestion("Login KO", 2)]}
					onAccept={vi.fn()}
					onDismiss={vi.fn()}
				/>
			)
		);
		expect(screen.getByText(/Login OK/)).toBeDefined();
		expect(screen.getByText(/Login KO/)).toBeDefined();
		// Step count visible somewhere in the card
		expect(screen.getAllByText(/3 steps|3 step/).length).toBeGreaterThan(0);
	});

	it("Accept All forwards every suggestion to onAccept", async () => {
		const onAccept = vi.fn().mockResolvedValue(undefined);
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("A"), makeSuggestion("B"), makeSuggestion("C")]}
					onAccept={onAccept}
					onDismiss={vi.fn()}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-tests-accept-all"));
		await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
		const arg = onAccept.mock.calls[0]?.[0] as TestCaseSuggestion[];
		expect(arg).toHaveLength(3);
		expect(arg.map((s) => s.title)).toEqual(["A", "B", "C"]);
	});

	it("Accept Selected forwards only checked suggestions to onAccept", async () => {
		const onAccept = vi.fn().mockResolvedValue(undefined);
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("A"), makeSuggestion("B"), makeSuggestion("C")]}
					onAccept={onAccept}
					onDismiss={vi.fn()}
				/>
			)
		);
		// Default is "all selected" -- uncheck the middle one
		fireEvent.click(screen.getByTestId("suggest-test-checkbox-1"));
		fireEvent.click(screen.getByTestId("suggest-tests-accept-selected"));
		await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
		const arg = onAccept.mock.calls[0]?.[0] as TestCaseSuggestion[];
		expect(arg.map((s) => s.title)).toEqual(["A", "C"]);
	});

	it("Dismiss calls onDismiss and does not call onAccept", () => {
		const onAccept = vi.fn();
		const onDismiss = vi.fn();
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("A")]}
					onAccept={onAccept}
					onDismiss={onDismiss}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-tests-dismiss"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onAccept).not.toHaveBeenCalled();
	});

	it("editing a suggestion title before accepting forwards the edited value", async () => {
		const onAccept = vi.fn().mockResolvedValue(undefined);
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("Original")]}
					onAccept={onAccept}
					onDismiss={vi.fn()}
				/>
			)
		);
		// Toggle edit mode on the first card and change the title
		fireEvent.click(screen.getByTestId("suggest-test-edit-btn-0"));
		const titleInput = screen.getByTestId("suggest-test-title-input-0") as HTMLInputElement;
		fireEvent.change(titleInput, { target: { value: "Edited" } });
		fireEvent.click(screen.getByTestId("suggest-test-save-btn-0"));
		fireEvent.click(screen.getByTestId("suggest-tests-accept-all"));
		await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
		const arg = onAccept.mock.calls[0]?.[0] as TestCaseSuggestion[];
		expect(arg[0]?.title).toBe("Edited");
	});

	it("disables Accept buttons while a creation is in flight", async () => {
		let resolveCreate: (() => void) | null = null;
		const onAccept = vi.fn().mockImplementation(
			() =>
				new Promise<void>((res) => {
					resolveCreate = res;
				})
		);
		render(
			withFluent(
				<SuggestTestsDrawer
					isOpen
					suggestions={[makeSuggestion("A")]}
					onAccept={onAccept}
					onDismiss={vi.fn()}
				/>
			)
		);
		fireEvent.click(screen.getByTestId("suggest-tests-accept-all"));
		await waitFor(() => {
			const btn = screen.getByTestId("suggest-tests-accept-all") as HTMLButtonElement;
			expect(btn.disabled).toBe(true);
		});
		resolveCreate?.();
	});
});
