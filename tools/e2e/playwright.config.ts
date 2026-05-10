import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	timeout: 60_000,
	retries: 1,
	reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
	projects: [
		{
			name: "cloud",
			use: {
				baseURL: process.env.ADO_CLOUD_ORG_URL,
			},
		},
		// Cloud-only since v0.2.0 — no self-hosted target
	],
});
