import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(here, "..");

/**
 * Pure naming contract for the packaged VSIX (exported for the regression test).
 *
 * Target: `apps/argos-extension/release/ArgosTesting-{version}.vsix`.
 * It MUST stay out of `dist/`: the manifest `files` glob packages `dist/`, so a
 * `.vsix` written there would be recursively bundled into the next release.
 */
export function getVsixOutputPath(version) {
	return `release/ArgosTesting-${version}.vsix`;
}

function main() {
	const pkg = JSON.parse(readFileSync(resolve(extRoot, "package.json"), "utf8"));
	const out = getVsixOutputPath(pkg.version);
	mkdirSync(resolve(extRoot, "release"), { recursive: true });
	// shell:true so the platform resolves tfx(.cmd) on Windows.
	execFileSync(
		"tfx",
		["extension", "create", "--manifest-globs", "vss-extension.json", "--output-path", out],
		{ cwd: extRoot, stdio: "inherit", shell: true },
	);
	console.log("VSIX cree :", out);
}

// Only run main() when invoked directly; importing the module (e.g. from the
// test) must not trigger tfx.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
