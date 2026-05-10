import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// azure-devops-extension-api ships as AMD (define/require), which is not
			// supported in the jsdom test environment. This alias redirects all test
			// imports to a lightweight stub that exports only what tests need.
			"azure-devops-extension-api": resolve(
				__dirname,
				"src/__mocks__/azure-devops-extension-api.ts"
			),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/hub/**", "src/widgets/**"],
			exclude: [
				"src/hub/index.tsx",
				"src/hub/**/*.test.*",
				"src/hub/**/*.spec.*",
				"src/widgets/**/index.tsx",
				"src/widgets/**/*.test.*",
				"src/widgets/**/*.spec.*",
			],
			thresholds: {
				functions: 80,
				statements: 80,
				branches: 80,
				lines: 80,
			},
		},
	},
});
