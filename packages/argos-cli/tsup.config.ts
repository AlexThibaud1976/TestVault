import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		cli: "src/cli.ts",
		index: "src/index.ts",
	},
	format: ["esm"],
	target: "node20",
	platform: "node",
	clean: true,
	sourcemap: true,
	dts: false,
	splitting: false,
	bundle: true,
	banner: {
		js: `import { createRequire } from "module"; const require = createRequire(import.meta.url);`,
	},
	noExternal: [
		"@atconseil/argos-sdk",
		"@atconseil/argos-types",
		"@atconseil/argos-wit-schema",
		"@atconseil/argos-importers",
		"@atconseil/argos-exporters",
		"@atconseil/argos-gherkin",
	],
	external: ["commander"],
});
