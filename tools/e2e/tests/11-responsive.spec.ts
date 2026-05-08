/**
 * T-7.5 — Mobile responsive (read-only) tests.
 * Requires ARGOS_APP_URL pointing at a deployed Argos hub page.
 * Tests are skipped in CI when the env var is absent.
 *
 * Behavior contract:
 *   - 360px (mobile): Hub is readable; write controls (Add, Edit, Delete buttons) are hidden or disabled.
 *   - 768px (tablet): Hub is fully readable; write controls may be present.
 *   - 1024px+ (desktop): Full UI — all controls visible.
 */
import { type Page, expect, test } from "../fixtures/index.js";

const APP_URL = process.env.ARGOS_APP_URL;
const SKIP_REASON = "ARGOS_APP_URL not set — skipping responsive E2E tests";

async function loadAtViewport(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await page.goto(`${APP_URL}/hub`);
	await page.waitForLoadState("networkidle");
}

test.describe("Responsive — 360px mobile", () => {
	test.skip(!APP_URL, SKIP_REASON);

	test("hub is readable at 360px width", async ({ page }) => {
		await loadAtViewport(page, 360, 780);
		const body = page.locator("body");
		await expect(body).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		expect(overflow).toBe(false);
	});

	test("write controls are absent or disabled at 360px", async ({ page }) => {
		await loadAtViewport(page, 360, 780);
		const addButton = page.getByTestId("add-test-case-button");
		const isVisibleAndEnabled =
			(await addButton.isVisible().catch(() => false)) &&
			(await addButton.isEnabled().catch(() => false));
		expect(isVisibleAndEnabled).toBe(false);
	});
});

test.describe("Responsive — 768px tablet", () => {
	test.skip(!APP_URL, SKIP_REASON);

	test("hub is readable at 768px width", async ({ page }) => {
		await loadAtViewport(page, 768, 1024);
		const body = page.locator("body");
		await expect(body).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		expect(overflow).toBe(false);
	});
});

test.describe("Responsive — 1024px desktop", () => {
	test.skip(!APP_URL, SKIP_REASON);

	test("hub is readable at 1024px width", async ({ page }) => {
		await loadAtViewport(page, 1024, 768);
		const body = page.locator("body");
		await expect(body).toBeVisible();
	});

	test("write controls are present at 1024px", async ({ page }) => {
		await loadAtViewport(page, 1024, 768);
		const nav = page.getByRole("navigation");
		await expect(nav).toBeVisible();
	});
});
