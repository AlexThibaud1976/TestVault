import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterChip } from "./FilterChip.js";

afterEach(cleanup);

describe("FilterChip (Sprint 2.18 design system)", () => {
	it("renders children", () => {
		render(<FilterChip>Status: All</FilterChip>);
		expect(screen.getByText("Status: All")).toBeDefined();
	});

	it("uses a button element", () => {
		render(<FilterChip>Tag</FilterChip>);
		expect(screen.getByRole("button")).toBeDefined();
	});

	it("adds ds-filter-chip-active class when active=true", () => {
		render(<FilterChip active>Active</FilterChip>);
		expect(screen.getByRole("button").className).toContain("active");
	});

	it("does not have active class when active=false", () => {
		render(<FilterChip active={false}>Inactive</FilterChip>);
		expect(screen.getByRole("button").className).not.toContain("active");
	});

	it("fires onClick when clicked", async () => {
		const onClick = vi.fn();
		render(<FilterChip onClick={onClick}>Click</FilterChip>);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("renders without onClick prop (static chip)", () => {
		render(<FilterChip>Static</FilterChip>);
		expect(screen.getByRole("button")).toBeDefined();
	});
});
