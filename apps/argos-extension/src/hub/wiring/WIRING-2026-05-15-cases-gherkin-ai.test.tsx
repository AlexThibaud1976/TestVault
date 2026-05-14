import { FluentProvider, webLightTheme } from "@fluentui/react-components";
/**
 * Smoke test WIRING-2026-05-15-cases-gherkin-ai
 * Verifies that CasesView exposes:
 * - A Gherkin tab rendering GherkinEditor
 * - An AI Suggest button opening AiCandidatesModal dialog
 * Sprint 2.5d: Phase 5+6 wiring.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMockServices } from "../../test-utils/mock-services.js";
import { CasesView } from "../App.js";
import { ServicesContext } from "../services-context.js";

afterEach(cleanup);

function renderCasesView() {
	const services = createMockServices();
	render(
		<FluentProvider theme={webLightTheme}>
			<ServicesContext.Provider value={services}>
				<CasesView />
			</ServicesContext.Provider>
		</FluentProvider>
	);
	return services;
}

describe("WIRING-2026-05-15-cases-gherkin", () => {
	it("CasesView renders a Gherkin tab", async () => {
		renderCasesView();
		await waitFor(() => expect(screen.getByRole("tab", { name: "Gherkin" })).toBeDefined());
	});

	it("clicking Gherkin tab renders GherkinEditor", async () => {
		renderCasesView();
		await waitFor(() => screen.getByRole("tab", { name: "Gherkin" }));
		fireEvent.click(screen.getByRole("tab", { name: "Gherkin" }));
		await waitFor(() => expect(screen.getByTestId("gherkin-editor")).toBeDefined());
	});
});

describe("WIRING-2026-05-15-cases-ai", () => {
	it("CasesView renders an AI Suggest button", async () => {
		renderCasesView();
		await waitFor(() => expect(screen.getByRole("button", { name: "AI Suggest" })).toBeDefined());
	});

	it("clicking AI Suggest button renders ai-candidates-modal", async () => {
		renderCasesView();
		await waitFor(() => screen.getByRole("button", { name: "AI Suggest" }));
		fireEvent.click(screen.getByRole("button", { name: "AI Suggest" }));
		await waitFor(() => expect(screen.getByTestId("ai-candidates-modal")).toBeDefined());
	});
});
