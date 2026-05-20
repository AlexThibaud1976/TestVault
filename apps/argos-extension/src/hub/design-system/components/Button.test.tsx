import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button.js";

afterEach(cleanup);

describe("Button (Sprint 2.18 design system)", () => {
	it("renders primary variant by default", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-primary");
	});

	it("renders secondary variant", () => {
		render(<Button variant="secondary">Cancel</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-secondary");
	});

	it("renders subtle variant", () => {
		render(<Button variant="subtle">Subtle</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-subtle");
	});

	it("renders danger variant", () => {
		render(<Button variant="danger">Delete</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-danger");
	});

	it("renders medium size by default", () => {
		render(<Button>Medium</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-medium");
	});

	it("renders small size", () => {
		render(<Button size="small">Small</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-small");
	});

	it("renders large size", () => {
		render(<Button size="large">Large</Button>);
		expect(screen.getByRole("button").className).toContain("ds-btn-large");
	});

	it("fires onClick when enabled", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Click</Button>);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire onClick when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button onClick={onClick} disabled>
				Disabled
			</Button>
		);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("renders icon slot when icon prop provided", () => {
		const { container } = render(<Button icon={<span data-testid="icon" />}>With icon</Button>);
		expect(container.querySelector(".ds-btn-icon")).not.toBeNull();
	});
});
