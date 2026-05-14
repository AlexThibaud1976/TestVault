/**
 * Regression test: CFG-2026-05-15-argos-cli-install-exists (Configuration)
 *
 * History:
 *   2026-05-15 (Sprint 2.6) - Initial. Asserts argos-cli install command files exist
 *                             and cli.ts imports install-command.
 *
 * What this test guards:
 *   - install-command.ts is present in packages/argos-cli/src/install/
 *   - prompts.ts is present in packages/argos-cli/src/install/
 *   - cli.ts references install-command (the sub-command is wired up)
 *
 * Rationale: after Sprint 2.5f-fix pivot (Process API not accessible from extensions),
 * argos-cli became the official installer for Custom WIT. This test prevents accidental
 * removal of the install command files.
 *
 * DO NOT delete without explicit spec-kit decision.
 *
 * Reference:
 *   - TECH-DEBT-042 (Sprint 2.6)
 *   - Specs/constitution.md section 12
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const INSTALL_DIR = join(REPO_ROOT, "packages", "argos-cli", "src", "install");

describe("CFG-2026-05-15-argos-cli-install-exists regression", () => {
	it("install-command.ts exists", () => {
		expect(existsSync(join(INSTALL_DIR, "install-command.ts"))).toBe(true);
	});

	it("prompts.ts exists", () => {
		expect(existsSync(join(INSTALL_DIR, "prompts.ts"))).toBe(true);
	});

	it("cli.ts imports install-command", () => {
		const cliPath = join(REPO_ROOT, "packages", "argos-cli", "src", "cli.ts");
		const cliContent = readFileSync(cliPath, "utf8");
		expect(cliContent).toContain("install-command");
	});
});
