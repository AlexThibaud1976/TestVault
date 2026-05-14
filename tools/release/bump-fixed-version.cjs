#!/usr/bin/env node
/**
 * Bump version of all fixed-mode packages in the argos monorepo.
 * Usage: node tools/release/bump-fixed-version.cjs <new-version>
 * Example: node tools/release/bump-fixed-version.cjs 0.5.2
 *
 * Bumps these 14 packages + vss-extension.json:
 * - package.json (root)
 * - apps/argos-extension/package.json
 * - apps/argos-functions/package.json
 * - apps/docs-site/package.json
 * - packages/argos-types/package.json
 * - packages/argos-wit-schema/package.json
 * - packages/argos-sdk/package.json
 * - packages/argos-importers/package.json
 * - packages/argos-exporters/package.json
 * - packages/argos-cli/package.json
 * - packages/argos-detection-api/package.json
 * - packages/argos-gherkin/package.json
 * - tools/azure-pipelines-task/package.json
 * - tools/e2e/package.json
 * + apps/argos-extension/vss-extension.json (string version field)
 *
 * Does NOT bump:
 * - tools/argos-action/ (no package.json, just action.yml)
 * - tools/regression/package.json (regression-suite, HORS GROUPE fixed mode)
 *
 * Refs: TECH-DEBT-037 (Sprint 2.5b CI fail lesson)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FIXED_PACKAGES = [
	"package.json",
	"apps/argos-extension/package.json",
	"apps/argos-functions/package.json",
	"apps/docs-site/package.json",
	"packages/argos-types/package.json",
	"packages/argos-wit-schema/package.json",
	"packages/argos-sdk/package.json",
	"packages/argos-importers/package.json",
	"packages/argos-exporters/package.json",
	"packages/argos-cli/package.json",
	"packages/argos-detection-api/package.json",
	"packages/argos-gherkin/package.json",
	"tools/azure-pipelines-task/package.json",
	"tools/e2e/package.json",
];

const VSS_EXTENSION = "apps/argos-extension/vss-extension.json";

function parseArgs() {
	const newVersion = process.argv[2];
	if (!newVersion || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(newVersion)) {
		console.error("Usage: node bump-fixed-version.cjs <semver>");
		console.error("Example: node bump-fixed-version.cjs 0.5.2");
		process.exit(1);
	}
	return newVersion;
}

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
	fs.writeFileSync(p, JSON.stringify(data, null, "\t") + "\n", "utf8");
}

function bumpPackageJson(filePath, newVersion) {
	const pkg = readJson(filePath);
	const oldVersion = pkg.version;
	pkg.version = newVersion;
	writeJson(filePath, pkg);
	console.log(`  [v] ${pkg.name}: ${oldVersion} -> ${newVersion} (${filePath})`);
}

function bumpVssExtension(filePath, newVersion) {
	const manifest = readJson(filePath);
	const oldVersion = manifest.version;
	manifest.version = newVersion;
	writeJson(filePath, manifest);
	console.log(`  [v] vss-extension.json: ${oldVersion} -> ${newVersion}`);
}

function main() {
	const newVersion = parseArgs();
	console.log(
		`\nBumping ${FIXED_PACKAGES.length} packages + vss-extension.json to ${newVersion}\n`
	);

	let count = 0;
	for (const pkgPath of FIXED_PACKAGES) {
		const fullPath = path.resolve(process.cwd(), pkgPath);
		if (!fs.existsSync(fullPath)) {
			console.warn(`  [!] SKIP: ${pkgPath} (not found)`);
			continue;
		}
		bumpPackageJson(fullPath, newVersion);
		count++;
	}

	const vssPath = path.resolve(process.cwd(), VSS_EXTENSION);
	if (fs.existsSync(vssPath)) {
		bumpVssExtension(vssPath, newVersion);
		count++;
	}

	console.log(`\nDONE. ${count} files updated to ${newVersion}.\n`);
	console.log(
		"Reminder: run 'pnpm preflight' and 'pnpm --filter @atconseil/regression-suite test' to validate.\n"
	);
}

main();
