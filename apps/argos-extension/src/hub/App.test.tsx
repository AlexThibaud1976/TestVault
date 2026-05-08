import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(cleanup);

vi.mock("azure-devops-extension-sdk", () => ({
	init: vi.fn(),
	ready: vi.fn(() => Promise.resolve()),
}));

describe("Argos Hub", () => {
	it("renders the sidebar nav", () => {
		render(<App />);
		expect(screen.getByTestId("nav-plans")).toBeDefined();
		expect(screen.getByTestId("nav-cases")).toBeDefined();
		expect(screen.getByTestId("nav-sets")).toBeDefined();
		expect(screen.getByTestId("nav-preconditions")).toBeDefined();
		expect(screen.getByTestId("nav-reports")).toBeDefined();
	});

	it("shows the active plans and recently-failed panels by default", () => {
		render(<App />);
		expect(screen.getByTestId("active-plans-panel")).toBeDefined();
		expect(screen.getByTestId("recently-failed-panel")).toBeDefined();
	});

	it("navigates to Cases view on nav click", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByTestId("nav-cases"));
		expect(screen.getByTestId("view-cases")).toBeDefined();
		expect(screen.queryByTestId("active-plans-panel")).toBeNull();
	});

	it("navigates to Sets view on nav click", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByTestId("nav-sets"));
		expect(screen.getByTestId("view-sets")).toBeDefined();
	});

	it("navigates to Preconditions view on nav click", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByTestId("nav-preconditions"));
		expect(screen.getByTestId("view-preconditions")).toBeDefined();
	});

	it("navigates to Reports view on nav click", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByTestId("nav-reports"));
		expect(screen.getByTestId("view-reports")).toBeDefined();
	});

	it("navigates back to Plans view when Plans nav is clicked", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByTestId("nav-cases"));
		await user.click(screen.getByTestId("nav-plans"));
		expect(screen.getByTestId("active-plans-panel")).toBeDefined();
	});
});
