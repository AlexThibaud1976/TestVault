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
		// TODO T-1.9: ADO Server 2022 instance pending — uncomment when argos-test-server.atconseil.io is ready
		// { name: "server", use: { baseURL: process.env["ADO_SERVER_ORG_URL"] } },
	],
});
