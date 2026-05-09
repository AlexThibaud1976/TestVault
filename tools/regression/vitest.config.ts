import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
		testTimeout: 30_000,
		include: ["**/*.test.ts"],
	},
});
