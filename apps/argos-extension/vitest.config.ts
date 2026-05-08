import { defineConfig } from "vitest/config";

export default defineConfig({
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
