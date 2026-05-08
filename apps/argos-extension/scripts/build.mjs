import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("dist/hub", { recursive: true });
copyFileSync("src/hub/hub.html", "dist/hub/hub.html");

await build({
	entryPoints: ["src/hub/index.tsx"],
	bundle: true,
	outfile: "dist/hub/hub.js",
	platform: "browser",
	target: "es2020",
});
