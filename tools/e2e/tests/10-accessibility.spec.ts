/**
 * T-7.4 — WCAG 2.1 AA accessibility tests.
 * Requires ARGOS_APP_URL pointing at a deployed Argos hub page.
 * Uses @axe-core/playwright for automated accessibility analysis.
 * Tests are skipped in CI when the env var is absent.
 *
 * Manual screen-reader testing checklist (validated by Alexandre):
 *   [ ] Hub navigation announces page titles via aria-label
 *   [ ] All interactive controls are reachable via Tab key
 *   [ ] '?' keyboard shortcut opens the help overlay
 *   [ ] All images have alt text or aria-hidden
 *   [ ] Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large)
 *   [ ] Focus ring is always visible
 *   [ ] Error messages are announced via role="alert" or aria-live
 */
import { expect, test } from "../fixtures/index.js";

const APP_URL = process.env.ARGOS_APP_URL;
const SKIP_REASON = "ARGOS_APP_URL not set — skipping accessibility E2E tests";

test.describe("WCAG 2.1 AA — hub main view", () => {
	test.skip(!APP_URL, SKIP_REASON);

	test("no critical axe violations on hub load", async ({ page }) => {
		const { default: AxeBuilder } = await import("@axe-core/playwright");
		await page.goto(`${APP_URL}/hub`);
		await page.waitForLoadState("networkidle");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
		expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
	});

	test("no serious axe violations on hub load", async ({ page }) => {
		const { default: AxeBuilder } = await import("@axe-core/playwright");
		await page.goto(`${APP_URL}/hub`);
		await page.waitForLoadState("networkidle");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
		expect(results.violations.filter((v) => v.impact === "serious")).toHaveLength(0);
	});

	test("keyboard: Tab reaches main nav items", async ({ page }) => {
		await page.goto(`${APP_URL}/hub`);
		await page.keyboard.press("Tab");
		const focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
		expect(["link", "button", "tab", "menuitem"]).toContain(focused);
	});

	test("keyboard: ? opens help overlay", async ({ page }) => {
		await page.goto(`${APP_URL}/hub`);
		await page.keyboard.press("?");
		const helpOverlay = page.getByRole("dialog");
		await expect(helpOverlay).toBeVisible({ timeout: 3000 });
	});

	test("all images have alt text or aria-hidden", async ({ page }) => {
		await page.goto(`${APP_URL}/hub`);
		const violations = await page.evaluate(() => {
			const imgs = Array.from(document.querySelectorAll("img"));
			return imgs
				.filter((img) => !img.alt && img.getAttribute("aria-hidden") !== "true")
				.map((img) => img.outerHTML);
		});
		expect(violations).toHaveLength(0);
	});
});

test.describe("WCAG 2.1 AA — AI admin settings", () => {
	test.skip(!APP_URL, SKIP_REASON);

	test("no critical axe violations on LLM provider settings page", async ({ page }) => {
		const { default: AxeBuilder } = await import("@axe-core/playwright");
		await page.goto(`${APP_URL}/hub/settings/ai`);
		await page.waitForLoadState("networkidle");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
		expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
	});
});
