#!/usr/bin/env node

/**
 * Manifest Pre-flight Check
 *
 * Validates apps/argos-extension/vss-extension.json against rules learned from
 * Sprint 2 -> 4.5 false premises chain.
 *
 * Usage:
 *   node tools/preflight/manifest-check.cjs
 *   pnpm preflight                                  (via root package.json)
 *
 * Exit 0 = all checks passed
 * Exit 1 = at least one check failed (errors printed to stderr)
 *
 * History:
 *   2026-05-12 (TECH-DEBT-011 v3) - Initial implementation. Encodes 7 rules.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "apps", "argos-extension", "vss-extension.json");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "apps", "argos-extension", "package.json");
const STATIC_DIR = path.join(REPO_ROOT, "apps", "argos-extension", "static");

const PUBLISHER_WHITELIST = ["AlexThibaud", "ATConseil"];
const CATEGORIES_WHITELIST = [
	"Azure Boards",
	"Azure Test Plans",
	"Azure Repos",
	"Azure Pipelines",
	"Azure Artifacts",
];

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Rule 1: version coherence between package.json and vss-extension.json
function checkVersionCoherence(manifest, pkg) {
	if (manifest.version !== pkg.version) {
		err(`Version mismatch: manifest=${manifest.version} package.json=${pkg.version}`);
	}
}

// Rule 2: publisher in whitelist
function checkPublisher(manifest) {
	if (!PUBLISHER_WHITELIST.includes(manifest.publisher)) {
		err(`Publisher "${manifest.publisher}" not in whitelist [${PUBLISHER_WHITELIST.join(", ")}]`);
	}
}

// Rule 3: no .svg in static/ (Marketplace policy)
function checkNoSvgInStatic() {
	if (!fs.existsSync(STATIC_DIR)) {
		warn(`Static dir not found: ${STATIC_DIR}`);
		return;
	}
	const files = fs.readdirSync(STATIC_DIR);
	const svgs = files.filter((f) => f.toLowerCase().endsWith(".svg"));
	if (svgs.length > 0) {
		err(`Found SVG files in static/ (blocks Marketplace publish): ${svgs.join(", ")}`);
	}
}

// Rule 4: categories valid
function checkCategories(manifest) {
	if (!manifest.categories || manifest.categories.length === 0) {
		err("Manifest has no categories (Marketplace requires at least one)");
		return;
	}
	for (const cat of manifest.categories) {
		if (!CATEGORIES_WHITELIST.includes(cat)) {
			warn(`Category "${cat}" not in known whitelist (may still be valid)`);
		}
	}
}

// Rule 5: icons.default exists and is PNG
function checkIconsDefault(manifest) {
	const defaultIcon = manifest.icons && manifest.icons.default;
	if (!defaultIcon) {
		err("Manifest missing icons.default (Marketplace asset)");
		return;
	}
	if (!defaultIcon.toLowerCase().endsWith(".png")) {
		err(`icons.default should be a PNG, got: ${defaultIcon}`);
	}
}

// Rule 6: no Sprint 3 false premise target (ms.vss-web.project-hub-group invalid)
function checkInvalidTargets(manifest) {
	const INVALID_TARGETS = [
		"ms.vss-web.project-hub-group", // Sprint 3 false premise (singular, doesn't exist)
	];
	for (const contrib of manifest.contributions || []) {
		for (const target of contrib.targets || []) {
			if (INVALID_TARGETS.includes(target)) {
				err(`Contribution "${contrib.id}" uses invalid target "${target}" (Sprint 3 false premise -- use ms.vss-web.project-hub-groups-collection for hub-group, or .<hub-group-id> for hubs)`);
			}
		}
	}
}

// Rule 7: hub-group present if any hub uses relative reference
function checkHubGroupConsistency(manifest) {
	const contribs = manifest.contributions || [];
	const hubsUsingRelative = contribs.filter((c) =>
		c.type === "ms.vss-web.hub" && (c.targets || []).some((t) => t.startsWith("."))
	);
	if (hubsUsingRelative.length === 0) return;
	const referencedIds = new Set();
	for (const hub of hubsUsingRelative) {
		for (const target of hub.targets) {
			if (target.startsWith(".")) referencedIds.add(target.slice(1));
		}
	}
	const declaredHubGroups = new Set(
		contribs.filter((c) => c.type === "ms.vss-web.hub-group").map((c) => c.id)
	);
	for (const ref of referencedIds) {
		if (!declaredHubGroups.has(ref)) {
			err(`Hub references relative hub-group ".${ref}" but no hub-group contribution with id "${ref}" declared`);
		}
	}
}

// Rule 8 (warning only): no "public": false alongside known-public extension
function checkPublicVisibility(manifest) {
	if (manifest.public === false) {
		warn(`Manifest has "public": false. Reminder: Microsoft forbids Public -> Private downgrade on existing extensionId. Verify Marketplace state before tag.`);
	}
}

// MAIN
function main() {
	console.log("Pre-flight manifest check");
	console.log(`Manifest: ${MANIFEST_PATH}`);
	console.log("");

	if (!fs.existsSync(MANIFEST_PATH)) {
		console.error(`ERROR: Manifest not found at ${MANIFEST_PATH}`);
		process.exit(1);
	}

	const manifest = readJson(MANIFEST_PATH);
	const pkg = readJson(PACKAGE_JSON_PATH);

	checkVersionCoherence(manifest, pkg);
	checkPublisher(manifest);
	checkNoSvgInStatic();
	checkCategories(manifest);
	checkIconsDefault(manifest);
	checkInvalidTargets(manifest);
	checkHubGroupConsistency(manifest);
	checkPublicVisibility(manifest);

	for (const w of warnings) console.log(`WARN: ${w}`);
	for (const e of errors) console.error(`ERROR: ${e}`);

	if (errors.length > 0) {
		console.error("");
		console.error(`Pre-flight check FAILED: ${errors.length} error(s)`);
		process.exit(1);
	}

	console.log("");
	console.log(`Pre-flight check PASSED (${warnings.length} warning(s))`);
	process.exit(0);
}

main();
