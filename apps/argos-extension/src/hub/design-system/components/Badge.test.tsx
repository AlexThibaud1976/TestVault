import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./Badge.js";

afterEach(cleanup);

describe("Badge (Sprint 2.18 design system)", () => {
	it("renders neutral variant by default", () => {
		render(<Badge>Draft</Badge>);
		expect(screen.getByText("Draft").className).toContain("ds-badge-neutral");
	});

	it.each(["success", "warning", "error", "info", "neutral"] as const)(
		"renders %s variant",
		(kind) => {
			render(<Badge kind={kind}>{kind}</Badge>);
			expect(screen.getByText(kind).className).toContain(`ds-badge-${kind}`);
		}
	);

	it("renders dot indicator when dot=true", () => {
		const { container } = render(<Badge dot>Active</Badge>);
		expect(container.querySelector(".ds-badge-dot")).not.toBeNull();
	});

	it("does not render dot by default", () => {
		const { container } = render(<Badge>No dot</Badge>);
		expect(container.querySelector(".ds-badge-dot")).toBeNull();
	});

	it("renders children text", () => {
		render(<Badge kind="success">Completed</Badge>);
		expect(screen.getByText("Completed")).toBeDefined();
	});
});
