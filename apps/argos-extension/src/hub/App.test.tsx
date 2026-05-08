import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

afterEach(cleanup);

vi.mock("azure-devops-extension-sdk", () => ({
	init: vi.fn(),
	ready: vi.fn(() => Promise.resolve()),
}));

describe("Argos Hub", () => {
	it("renders the Argos heading", () => {
		render(<App />);
		expect(screen.getByRole("heading", { name: /argos/i })).toBeDefined();
	});

	it("renders the coming soon message", () => {
		render(<App />);
		expect(screen.getByText(/coming soon/i)).toBeDefined();
	});
});
