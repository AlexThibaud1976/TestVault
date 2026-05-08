import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("dist/hub", { recursive: true });
mkdirSync("dist/widgets/coverage-panel", { recursive: true });

copyFileSync("src/hub/hub.html", "dist/hub/hub.html");
copyFileSync(
	"src/widgets/coverage-panel/index.html",
	"dist/widgets/coverage-panel/index.html"
);

const sharedOptions = {
	bundle: true,
	platform: "browser",
	target: "es2020",
};

await Promise.all([
	build({
		...sharedOptions,
		entryPoints: ["src/hub/index.tsx"],
		outfile: "dist/hub/hub.js",
	}),
	build({
		...sharedOptions,
		entryPoints: ["src/widgets/coverage-panel/index.tsx"],
		outfile: "dist/widgets/coverage-panel/index.js",
	}),
]);
