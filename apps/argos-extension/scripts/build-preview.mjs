import { context } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const watch = process.argv.includes("--watch");

mkdirSync("dist/preview", { recursive: true });
copyFileSync("src/hub/preview.html", "dist/preview/index.html");

const ctx = await context({
	entryPoints: ["src/hub/preview.tsx"],
	bundle: true,
	platform: "browser",
	target: "es2020",
	outfile: "dist/preview/preview.js",
	sourcemap: true,
});

if (watch) {
	await ctx.watch();
	const abs = resolve("dist/preview/index.html");
	console.log(`[argos-preview] Watching for changes...`);
	console.log(`[argos-preview] Open in Chrome: file:///${abs.replace(/\\/g, "/")}`);
} else {
	await ctx.rebuild();
	await ctx.dispose();
	const abs = resolve("dist/preview/index.html");
	console.log(`[argos-preview] Built → file:///${abs.replace(/\\/g, "/")}`);
}
