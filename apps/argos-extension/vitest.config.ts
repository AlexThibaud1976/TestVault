import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/hub/**"],
			exclude: ["src/hub/index.tsx", "src/hub/**/*.test.*", "src/hub/**/*.spec.*"],
			thresholds: {
				functions: 80,
				statements: 80,
				branches: 80,
				lines: 80,
			},
		},
	},
});
