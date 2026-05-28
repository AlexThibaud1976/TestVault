import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Step, StepsEditor } from "./StepsEditor.js";

afterEach(cleanup);

function withFluent(node: React.ReactNode) {
	return <FluentProvider theme={webLightTheme}>{node}</FluentProvider>;
}

function makeStep(id: number, action: string, expected = `expected ${id}`): Step {
	return { id, action, expected };
}

describe("StepsEditor -- Sprint 2.22 extraction of TestCaseFormView inline CRUD", () => {
	it("renders one row per step with index numbering", () => {
		const steps = [makeStep(1, "Click login"), makeStep(2, "Enter password")];
		render(withFluent(<StepsEditor steps={steps} onChange={vi.fn()} />));
		expect(screen.getByTestId("step-row-0")).toBeDefined();
		expect(screen.getByTestId("step-row-1")).toBeDefined();
	});

	it("Add Step appends an empty step to the list via onChange", () => {
		const onChange = vi.fn();
		render(withFluent(<StepsEditor steps={[makeStep(1, "Click")]} onChange={onChange} />));
		fireEvent.click(screen.getByTestId("step-add-btn"));
		expect(onChange).toHaveBeenCalledTimes(1);
		const updated = onChange.mock.calls[0]?.[0] as Step[];
		expect(updated).toHaveLength(2);
		expect(updated[1]?.action).toBe("");
	});

	it("editing action field forwards new value through onChange", () => {
		const onChange = vi.fn();
		render(withFluent(<StepsEditor steps={[makeStep(1, "old")]} onChange={onChange} />));
		fireEvent.change(screen.getByTestId("step-action-0"), { target: { value: "new" } });
		expect(onChange).toHaveBeenCalled();
		const updated = onChange.mock.calls.at(-1)?.[0] as Step[];
		expect(updated[0]?.action).toBe("new");
	});

	it("editing expected field forwards new value through onChange", () => {
		const onChange = vi.fn();
		render(withFluent(<StepsEditor steps={[makeStep(1, "act")]} onChange={onChange} />));
		fireEvent.change(screen.getByTestId("step-expected-0"), { target: { value: "Result OK" } });
		const updated = onChange.mock.calls.at(-1)?.[0] as Step[];
		expect(updated[0]?.expected).toBe("Result OK");
	});

	it("Remove deletes the targeted step from the list", () => {
		const onChange = vi.fn();
		const steps = [makeStep(1, "A"), makeStep(2, "B"), makeStep(3, "C")];
		render(withFluent(<StepsEditor steps={steps} onChange={onChange} />));
		fireEvent.click(screen.getByTestId("step-remove-btn-1"));
		const updated = onChange.mock.calls[0]?.[0] as Step[];
		expect(updated).toHaveLength(2);
		expect(updated.map((s) => s.action)).toEqual(["A", "C"]);
	});

	it("Remove is hidden when only one step remains (must keep at least one row)", () => {
		render(withFluent(<StepsEditor steps={[makeStep(1, "only")]} onChange={vi.fn()} />));
		expect(screen.queryByTestId("step-remove-btn-0")).toBeNull();
	});

	it("Move Up swaps step with previous step", () => {
		const onChange = vi.fn();
		const steps = [makeStep(1, "A"), makeStep(2, "B"), makeStep(3, "C")];
		render(withFluent(<StepsEditor steps={steps} onChange={onChange} />));
		fireEvent.click(screen.getByTestId("step-move-up-btn-1"));
		const updated = onChange.mock.calls[0]?.[0] as Step[];
		expect(updated.map((s) => s.action)).toEqual(["B", "A", "C"]);
	});

	it("Move Up is disabled on the first row", () => {
		render(
			withFluent(<StepsEditor steps={[makeStep(1, "A"), makeStep(2, "B")]} onChange={vi.fn()} />)
		);
		const btn = screen.getByTestId("step-move-up-btn-0") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it("Move Down swaps step with next step", () => {
		const onChange = vi.fn();
		const steps = [makeStep(1, "A"), makeStep(2, "B"), makeStep(3, "C")];
		render(withFluent(<StepsEditor steps={steps} onChange={onChange} />));
		fireEvent.click(screen.getByTestId("step-move-down-btn-0"));
		const updated = onChange.mock.calls[0]?.[0] as Step[];
		expect(updated.map((s) => s.action)).toEqual(["B", "A", "C"]);
	});

	it("Move Down is disabled on the last row", () => {
		render(
			withFluent(<StepsEditor steps={[makeStep(1, "A"), makeStep(2, "B")]} onChange={vi.fn()} />)
		);
		const btn = screen.getByTestId("step-move-down-btn-1") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	it("readOnly mode hides Add / Remove / Move buttons", () => {
		render(
			withFluent(
				<StepsEditor steps={[makeStep(1, "A"), makeStep(2, "B")]} onChange={vi.fn()} readOnly />
			)
		);
		expect(screen.queryByTestId("step-add-btn")).toBeNull();
		expect(screen.queryByTestId("step-remove-btn-0")).toBeNull();
		expect(screen.queryByTestId("step-move-up-btn-1")).toBeNull();
		expect(screen.queryByTestId("step-move-down-btn-0")).toBeNull();
	});
});
